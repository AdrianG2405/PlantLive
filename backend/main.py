from pathlib import Path
import logging
import json
import hashlib
import os
import secrets
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

load_dotenv(Path(__file__).with_name(".env"))
logger = logging.getLogger("plantlive")

from ai_service import buscar_plantas_con_ia, crear_ficha_planta, diagnosticar_imagen, preguntar_a_plantlive
from auth import create_session, get_current_user, hash_password, verify_password
from database import Base, engine, get_db
from hybrid_ai_service import advanced_ai_configured, diagnosticar_avanzado
from models import ApiUsage, AuthSession, CareEvent, CustomTask, DiagnosisHistory, PasswordResetToken, Planta, PushSubscription, User, UserPlant, UserSettings
from storage_service import UPLOAD_DIR, delete_plant_photo, save_plant_photo
from email_service import send_password_reset
from notification_worker import run_once as send_due_notifications

Base.metadata.create_all(bind=engine)
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="PlantLive API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": "plantlive-api"}


@app.post("/internal/send-reminders")
def trigger_reminders(x_cron_secret: str | None = Header(default=None)):
    expected = os.getenv("CRON_SECRET")
    if not expected or not secrets.compare_digest(x_cron_secret or "", expected):
        raise HTTPException(403, "Acceso no permitido")
    return {"sent": send_due_notifications()}


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "notificationsEnabled": user.notifications_enabled,
    }


def get_or_create_settings(db: Session, user_id: int) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@app.post("/auth/register")
def register(datos: dict, db: Session = Depends(get_db)):
    name = datos.get("name", "").strip()
    email = datos.get("email", "").strip().lower()
    password = datos.get("password", "")
    if len(name) < 2 or "@" not in email or len(password) < 8:
        raise HTTPException(400, "Revisa el nombre, email y contraseña (mínimo 8 caracteres)")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "Ya existe una cuenta con ese email")
    user = User(name=name, email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_session(db, user.id), "user": public_user(user)}


@app.post("/auth/login")
def login(datos: dict, db: Session = Depends(get_db)):
    email = datos.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(datos.get("password", ""), user.password_hash):
        raise HTTPException(401, "Email o contraseña incorrectos")
    return {"token": create_session(db, user.id), "user": public_user(user)}


@app.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return public_user(user)


@app.get("/user/settings")
def get_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = get_or_create_settings(db, user.id)
    return {
        "timezone": item.timezone,
        "reminderHour": item.reminder_hour,
        "emailNotifications": item.email_notifications,
        "pushNotifications": item.push_notifications,
        "aiConsent": item.ai_consent,
    }


@app.patch("/user/settings")
def update_settings(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = get_or_create_settings(db, user.id)
    mappings = {
        "timezone": "timezone", "reminderHour": "reminder_hour",
        "emailNotifications": "email_notifications",
        "pushNotifications": "push_notifications", "aiConsent": "ai_consent",
    }
    for source, target in mappings.items():
        if source in datos:
            setattr(item, target, datos[source])
    db.commit()
    return get_settings(db, user)


@app.post("/auth/logout")
def logout(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    del user
    token_hash = hashlib.sha256(authorization[7:].encode()).hexdigest()
    db.query(AuthSession).filter(AuthSession.token_hash == token_hash).delete()
    db.commit()
    return {"ok": True}


@app.post("/auth/forgot-password")
def forgot_password(datos: dict, db: Session = Depends(get_db)):
    email = datos.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()
    response = {"message": "Si la cuenta existe, recibirás instrucciones para recuperar el acceso."}
    if not user:
        return response
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(minutes=30),
    ))
    db.commit()
    if os.getenv("RESEND_API_KEY"):
        try:
            send_password_reset(user.email, token)
        except Exception:
            logger.exception("No se pudo enviar el correo de recuperación")
    elif os.getenv("ENVIRONMENT", "development") == "development":
        response["developmentToken"] = token
    return response


@app.post("/auth/reset-password")
def reset_password(datos: dict, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(datos.get("token", "").encode()).hexdigest()
    row = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.expires_at > datetime.utcnow(),
        PasswordResetToken.used.is_(False),
    ).first()
    password = datos.get("password", "")
    if not row or len(password) < 8:
        raise HTTPException(400, "Enlace inválido o contraseña demasiado corta")
    user = db.query(User).filter(User.id == row.user_id).first()
    user.password_hash = hash_password(password)
    row.used = True
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    return {"message": "Contraseña actualizada. Ya puedes iniciar sesión."}


@app.post("/user/push-subscriptions")
def save_push_subscription(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    keys = datos.get("keys") or {}
    if not datos.get("endpoint") or not keys.get("p256dh") or not keys.get("auth"):
        raise HTTPException(400, "Suscripción push incompleta")
    row = db.query(PushSubscription).filter(PushSubscription.endpoint == datos["endpoint"]).first()
    if row:
        row.user_id, row.p256dh, row.auth = user.id, keys["p256dh"], keys["auth"]
    else:
        db.add(PushSubscription(user_id=user.id, endpoint=datos["endpoint"], p256dh=keys["p256dh"], auth=keys["auth"]))
    db.commit()
    return {"ok": True}


@app.post("/user/photos")
async def upload_user_photo(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    allowed = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Formato no permitido")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "La fotografía no puede superar 5 MB")
    try:
        return {"url": save_plant_photo(content, user.id, allowed[file.content_type])}
    except Exception as error:
        logger.exception("No se pudo guardar la fotografía")
        raise HTTPException(502, "No se pudo guardar la fotografía") from error


@app.delete("/user/photos")
def remove_user_photo(datos: dict, user: User = Depends(get_current_user)):
    delete_plant_photo(datos.get("url", ""), user.id)
    return {"ok": True}


@app.get("/")
def inicio():
    return {"mensaje": "PlantLive API funcionando 🌱"}


@app.post("/preguntar")
def preguntar(datos: dict):
    pregunta = datos.get("pregunta", "").strip()
    if not pregunta:
        raise HTTPException(400, "Escribe una pregunta")
    return {"respuesta": preguntar_a_plantlive(pregunta, datos.get("planta"), datos.get("contexto"))}


@app.post("/plantas/buscar-ia")
def buscar_planta_ia(datos: dict):
    consulta = datos.get("consulta", "").strip()
    if len(consulta) < 2:
        raise HTTPException(400, "Escribe el nombre de una planta")
    try:
        return {"resultados": buscar_plantas_con_ia(consulta)}
    except ValueError as error:
        raise HTTPException(502, str(error)) from error


@app.post("/plantas/ficha-ia")
def ficha_planta_ia(datos: dict):
    nombre_cientifico = datos.get("nombreCientifico", "").strip()
    if not nombre_cientifico:
        raise HTTPException(400, "Falta el nombre científico")
    try:
        return crear_ficha_planta(nombre_cientifico, datos.get("nombreComun"))
    except ValueError as error:
        raise HTTPException(502, str(error)) from error


@app.post("/diagnosticar")
def diagnosticar(
    datos: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    imagenes = datos.get("imagenes") or ([datos.get("imagen")] if datos.get("imagen") else [])
    if not imagenes or len(imagenes) > 4:
        raise HTTPException(400, "Selecciona entre 1 y 4 fotografías")
    imagenes = [item.split(",", 1)[1] if "," in item else item for item in imagenes]
    today = datetime.utcnow().date()
    daily_limit = int(os.getenv("DAILY_DIAGNOSIS_LIMIT", "20"))
    used = db.query(ApiUsage).filter(
        ApiUsage.user_id == user.id,
        ApiUsage.operation == "diagnosis",
        ApiUsage.created_at >= datetime.combine(today, datetime.min.time()),
    ).count()
    if used >= daily_limit:
        raise HTTPException(429, "Has alcanzado el límite diario de diagnósticos")
    settings = get_or_create_settings(db, user.id)
    if advanced_ai_configured() and not settings.ai_consent:
        raise HTTPException(403, "Acepta el análisis externo en Ajustes o desactiva las claves externas")
    provider = "Gemma 3 local"
    try:
        if advanced_ai_configured():
            try:
                respuesta = diagnosticar_avanzado(imagenes, datos.get("planta"), datos.get("sintomas"))
                provider = "Plant.id + Gemini"
            except Exception as advanced_error:
                logger.warning("Análisis avanzado no disponible: %s", advanced_error)
                raise RuntimeError(
                    "El servicio de análisis externo no está disponible. "
                    "Comprueba GEMINI_API_KEY y GEMINI_MODEL en Render."
                ) from advanced_error
        elif os.getenv("ENVIRONMENT", "development").lower() == "production":
            raise RuntimeError(
                "El análisis con IA no está configurado en Render. "
                "Añade PLANT_ID_API_KEY y GEMINI_API_KEY."
            )
        else:
            respuesta = diagnosticar_imagen(imagenes, datos.get("planta"), datos.get("sintomas"))
        db.add(DiagnosisHistory(
            user_id=user.id,
            plant_name=datos.get("planta"),
            symptoms=datos.get("sintomas"),
            response=respuesta,
            provider=provider,
        ))
        db.add(ApiUsage(user_id=user.id, operation="diagnosis", provider=provider))
        db.commit()
        return {"respuesta": respuesta, "provider": provider}
    except Exception as error:
        raise HTTPException(502, f"No se pudo analizar la imagen: {error}") from error


@app.get("/plantas")
def obtener_plantas(db: Session = Depends(get_db)):
    return db.query(Planta).all()


@app.get("/user/plants")
def user_plants(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(UserPlant).filter(UserPlant.user_id == user.id).all()
    return [{"serverId": row.id, **json.loads(row.data)} for row in rows]


@app.post("/user/plants")
def add_user_plant(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = UserPlant(user_id=user.id, data=json.dumps(datos, ensure_ascii=False))
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"serverId": row.id, **datos}


@app.patch("/user/plants/{plant_id}")
def update_user_plant(plant_id: int, datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(UserPlant).filter(UserPlant.id == plant_id, UserPlant.user_id == user.id).first()
    if not row:
        raise HTTPException(404, "Planta no encontrada")
    current = json.loads(row.data)
    current.update(datos)
    row.data = json.dumps(current, ensure_ascii=False)
    row.updated_at = datetime.utcnow()
    db.commit()
    return {"serverId": row.id, **current}


@app.delete("/user/plants/{plant_id}")
def delete_user_plant(plant_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(UserPlant).filter(UserPlant.id == plant_id, UserPlant.user_id == user.id).first()
    if not row:
        raise HTTPException(404, "Planta no encontrada")
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.get("/user/plants/{plant_id}/care")
def care_history(plant_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plant = db.query(UserPlant).filter(UserPlant.id == plant_id, UserPlant.user_id == user.id).first()
    if not plant:
        raise HTTPException(404, "Planta no encontrada")
    rows = db.query(CareEvent).filter(
        CareEvent.user_id == user.id, CareEvent.plant_id == plant_id
    ).order_by(CareEvent.completed_at.desc()).limit(100).all()
    return [{"id": row.id, "type": row.event_type, "notes": row.notes, "completedAt": row.completed_at.isoformat()} for row in rows]


@app.post("/user/plants/{plant_id}/care")
def add_care_event(plant_id: int, datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plant = db.query(UserPlant).filter(UserPlant.id == plant_id, UserPlant.user_id == user.id).first()
    event_type = datos.get("type", "").strip()
    allowed = {"water", "fertilize", "prune", "repot", "treatment", "inspection"}
    if not plant or event_type not in allowed:
        raise HTTPException(400, "Evento de cuidado no válido")
    row = CareEvent(user_id=user.id, plant_id=plant_id, event_type=event_type, notes=datos.get("notes"))
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "type": row.event_type, "notes": row.notes, "completedAt": row.completed_at.isoformat()}


@app.get("/user/diagnoses")
def diagnosis_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(DiagnosisHistory).filter(
        DiagnosisHistory.user_id == user.id
    ).order_by(DiagnosisHistory.created_at.desc()).limit(50).all()
    return [{
        "id": row.id, "plantName": row.plant_name, "symptoms": row.symptoms,
        "response": row.response, "provider": row.provider,
        "createdAt": row.created_at.isoformat(),
    } for row in rows]


@app.get("/user/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    plants = db.query(UserPlant).filter(UserPlant.user_id == user.id).all()
    due = []
    for row in plants:
        data = json.loads(row.data)
        for field, label in (("nextWater", "Riego"), ("nextFeed", "Abonado")):
            if data.get(field) and data[field] <= today:
                due.append({"plantId": row.id, "plant": data.get("nickname") or data.get("nombreComun"), "type": label, "date": data[field]})
    diagnoses = db.query(DiagnosisHistory).filter(DiagnosisHistory.user_id == user.id).count()
    care = db.query(CareEvent).filter(CareEvent.user_id == user.id).count()
    return {"name": user.name, "plantCount": len(plants), "diagnosisCount": diagnoses, "careCount": care, "due": due[:8]}


@app.get("/user/tasks")
def list_tasks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(CustomTask).filter(CustomTask.user_id == user.id).order_by(CustomTask.due_date).all()
    return [{"id": r.id, "plantId": r.plant_id, "title": r.title, "type": r.task_type, "dueDate": r.due_date, "recurrenceDays": r.recurrence_days, "completed": r.completed} for r in rows]


@app.post("/user/tasks")
def create_task(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not datos.get("title") or not datos.get("dueDate"):
        raise HTTPException(400, "Título y fecha son obligatorios")
    row = CustomTask(user_id=user.id, plant_id=datos.get("plantId"), title=datos["title"][:120], task_type=datos.get("type", "inspection"), due_date=datos["dueDate"], recurrence_days=datos.get("recurrenceDays"))
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "title": row.title, "dueDate": row.due_date, "type": row.task_type}


@app.patch("/user/tasks/{task_id}")
def update_task(task_id: int, datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(CustomTask).filter(CustomTask.id == task_id, CustomTask.user_id == user.id).first()
    if not row:
        raise HTTPException(404, "Tarea no encontrada")
    if "completed" in datos:
        row.completed = bool(datos["completed"])
    db.commit()
    return {"ok": True}


@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.email != os.getenv("ADMIN_EMAIL"):
        raise HTTPException(403, "Acceso restringido")
    return {"users": db.query(User).count(), "plants": db.query(UserPlant).count(), "diagnoses": db.query(DiagnosisHistory).count(), "usageToday": db.query(ApiUsage).filter(ApiUsage.created_at >= datetime.combine(datetime.utcnow().date(), datetime.min.time())).count()}
