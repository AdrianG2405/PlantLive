from pathlib import Path
import logging
import json
import hashlib
import html
import os
import re
import secrets
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text

load_dotenv(Path(__file__).with_name(".env"))
logger = logging.getLogger("plantlive")

from ai_service import buscar_plantas_con_ia, crear_ficha_planta, diagnosticar_imagen, preguntar_a_plantlive
from auth import create_session, get_current_user, hash_password, verify_password
from database import Base, apply_compatible_schema_updates, engine, get_db
from hybrid_ai_service import advanced_ai_configured, buscar_plantas_avanzado, crear_ficha_avanzada, diagnosticar_avanzado, gemini_configured, preguntar_avanzado
from models import ApiUsage, AuthSession, CareEvent, CustomTask, DiagnosisHistory, EmailVerificationToken, LegalAcceptance, NotificationDelivery, PasswordResetToken, Planta, PushSubscription, User, UserFeedback, UserPlant, UserSettings
from storage_service import UPLOAD_DIR, delete_plant_photo, save_plant_photo
from email_service import EmailDeliveryError, send_email, send_email_verification, send_password_reset
from notification_worker import run_once as send_due_notifications, send_test_push

Base.metadata.create_all(bind=engine)
apply_compatible_schema_updates()
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="PlantLive API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_buckets: dict[str, deque] = defaultdict(deque)


def enforce_rate_limit(request: Request, action: str, maximum: int, window_seconds: int = 900) -> None:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    address = forwarded or (request.client.host if request.client else "unknown")
    key, now = f"{action}:{address}", time.monotonic()
    bucket = rate_buckets[key]
    while bucket and bucket[0] <= now - window_seconds:
        bucket.popleft()
    if len(bucket) >= maximum:
        raise HTTPException(429, "Demasiados intentos. Espera unos minutos y vuelve a intentarlo")
    bucket.append(now)


@app.middleware("http")
async def public_security(request: Request, call_next):
    request_id, started = uuid.uuid4().hex[:12], time.monotonic()
    content_length = int(request.headers.get("content-length", "0") or 0)
    if content_length > 12 * 1024 * 1024:
        return JSONResponse(status_code=413, content={"detail": "La solicitud es demasiado grande"})
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Error no controlado [%s] %s %s", request_id, request.method, request.url.path)
        response = JSONResponse(status_code=500, content={"detail": "Error interno", "requestId": request_id})
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), geolocation=(), microphone=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith(("/auth", "/user")) else "no-cache"
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(round((time.monotonic() - started) * 1000))
    return response


def extract_diagnosed_plant(response: str) -> dict | None:
    section = re.search(
        r"IDENTIFICACI[ÓO]N\s*:?\s*(.*?)(?=\n\s*LO QUE VEO\s*:|LO QUE VEO\s*:|$)",
        response or "",
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not section:
        return None
    text = section.group(1).replace("**", "").strip()
    common = re.search(r"nombre com[úu]n\s*:?\s*([^\n.;]+)", text, re.IGNORECASE)
    scientific = re.search(r"nombre cient[íi]fico\s*:?\s*([^\n.;]+)", text, re.IGNORECASE)
    if common and scientific:
        common_name = common.group(1).strip()
        scientific_name = scientific.group(1).strip()
        return {
            "nombreComun": common_name,
            "nombreCientifico": scientific_name,
            "displayName": f"{common_name} ({scientific_name})"[:255],
        }
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    first_line = re.split(r"\s*Confianza\s*:", first_line, flags=re.IGNORECASE)[0].strip(" .;-")
    parenthesized = re.match(r"(.+?)\s*\(([^()]+)\)\s*$", first_line)
    if parenthesized:
        common_name, scientific_name = (item.strip() for item in parenthesized.groups())
        return {
            "nombreComun": common_name,
            "nombreCientifico": scientific_name,
            "displayName": f"{common_name} ({scientific_name})"[:255],
        }
    return {"nombreComun": first_line[:255], "nombreCientifico": "", "displayName": first_line[:255]} if first_line else None


def extract_diagnosed_plant_name(response: str) -> str | None:
    return (extract_diagnosed_plant(response) or {}).get("displayName")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "plantlive-api",
        "version": os.getenv("RENDER_GIT_COMMIT", "local")[:7],
    }


@app.get("/ready")
def readiness(db: Session = Depends(get_db)):
    db.execute(sql_text("SELECT 1"))
    return {"status": "ready", "database": "ok"}


@app.post("/internal/send-reminders")
def trigger_reminders(x_cron_secret: str | None = Header(default=None)):
    expected = os.getenv("CRON_SECRET")
    if not expected or not secrets.compare_digest(x_cron_secret or "", expected):
        raise HTTPException(403, "Acceso no permitido")
    return send_due_notifications()


def public_user(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "notificationsEnabled": user.notifications_enabled,
        "emailVerified": user.email_verified,
    }


def issue_verification(db: Session, user: User) -> bool:
    raw_token = secrets.token_urlsafe(32)
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.used.is_(False),
    ).update({"used": True})
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(hours=24),
    ))
    db.commit()
    return send_email_verification(user.email, raw_token)

def valid_new_password(password: str) -> bool:
    return len(password) >= 8


def valid_registration_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.com", email, flags=re.IGNORECASE))


def get_or_create_settings(db: Session, user_id: int) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@app.post("/auth/register")
def register(datos: dict, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "register", 8, 3600)
    name = datos.get("name", "").strip()
    email = datos.get("email", "").strip().lower()
    password = datos.get("password", "")
    if datos.get("acceptLegal") is not True:
        raise HTTPException(400, "Debes aceptar la privacidad y las condiciones de uso")
    if len(name) < 2:
        raise HTTPException(400, "Escribe un nombre de al menos 2 caracteres")
    if not valid_registration_email(email):
        raise HTTPException(400, "Escribe un correo válido terminado en .com, por ejemplo nombre@gmail.com")
    if not valid_new_password(password):
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "Ya existe una cuenta con ese email")
    user = User(name=name, email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(LegalAcceptance(user_id=user.id, version="2026-07-31"))
    db.commit()
    try:
        sent = issue_verification(db, user)
    except EmailDeliveryError as error:
        logger.warning("No se pudo enviar verificación a %s: %s", email, error)
        sent = False
    return {"verificationRequired": True, "email": user.email, "emailSent": sent}


@app.post("/auth/resend-verification")
def resend_verification(datos: dict, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "resend-verification", 4, 3600)
    user = db.query(User).filter(User.email == datos.get("email", "").strip().lower()).first()
    if user and not user.email_verified:
        try:
            issue_verification(db, user)
        except EmailDeliveryError as error:
            logger.warning("No se pudo reenviar verificación: %s", error)
    return {"message": "Si la cuenta está pendiente, recibirás un nuevo enlace"}


@app.post("/auth/verify-email")
def verify_email(datos: dict, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(datos.get("token", "").encode()).hexdigest()
    token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.used.is_(False),
        EmailVerificationToken.expires_at > datetime.utcnow(),
    ).first()
    if not token:
        raise HTTPException(400, "El enlace no es válido o ha caducado")
    user = db.query(User).filter(User.id == token.user_id).first()
    user.email_verified = True
    token.used = True
    db.commit()
    return {"token": create_session(db, user.id), "user": public_user(db, user)}


@app.post("/auth/login")
def login(datos: dict, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "login", 12, 900)
    email = datos.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(datos.get("password", ""), user.password_hash):
        raise HTTPException(401, "Email o contraseña incorrectos")
    if not user.email_verified:
        raise HTTPException(403, "Verifica tu correo antes de iniciar sesión")
    return {"token": create_session(db, user.id), "user": public_user(db, user)}


@app.get("/auth/me")
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return public_user(db, user)


@app.get("/user/settings")
def get_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = get_or_create_settings(db, user.id)
    return {
        "timezone": item.timezone,
        "reminderHour": item.reminder_hour,
        "reminderMinute": item.reminder_minute,
        "emailNotifications": item.email_notifications,
        "pushNotifications": item.push_notifications,
        "aiConsent": item.ai_consent,
        "weatherEnabled": item.weather_enabled,
        "weatherLatitude": item.weather_latitude,
        "weatherLongitude": item.weather_longitude,
        "weatherLocation": item.weather_location,
    }


@app.patch("/user/settings")
def update_settings(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = get_or_create_settings(db, user.id)
    if "timezone" in datos:
        try:
            ZoneInfo(str(datos["timezone"]))
        except ZoneInfoNotFoundError as error:
            raise HTTPException(400, "Zona horaria no válida") from error
    if "reminderHour" in datos and not 0 <= int(datos["reminderHour"]) <= 23:
        raise HTTPException(400, "La hora debe estar entre 0 y 23")
    if "reminderMinute" in datos and not 0 <= int(datos["reminderMinute"]) <= 59:
        raise HTTPException(400, "Los minutos deben estar entre 0 y 59")
    mappings = {
        "timezone": "timezone", "reminderHour": "reminder_hour", "reminderMinute": "reminder_minute",
        "emailNotifications": "email_notifications",
        "pushNotifications": "push_notifications", "aiConsent": "ai_consent",
        "weatherEnabled": "weather_enabled", "weatherLatitude": "weather_latitude",
        "weatherLongitude": "weather_longitude", "weatherLocation": "weather_location",
    }
    for source, target in mappings.items():
        if source in datos:
            setattr(item, target, datos[source])
    db.commit()
    return get_settings(db, user)


@app.get("/user/export")
def export_user_data(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plants = db.query(UserPlant).filter(UserPlant.user_id == user.id).all()
    diagnoses = db.query(DiagnosisHistory).filter(DiagnosisHistory.user_id == user.id).all()
    care = db.query(CareEvent).filter(CareEvent.user_id == user.id).all()
    tasks = db.query(CustomTask).filter(CustomTask.user_id == user.id).all()
    feedback = db.query(UserFeedback).filter(UserFeedback.user_id == user.id).all()
    return {
        "exportedAt": datetime.utcnow().isoformat() + "Z",
        "account": public_user(db, user),
        "settings": get_settings(db, user),
        "plants": [{"serverId": row.id, **json.loads(row.data)} for row in plants],
        "diagnoses": [{
            "plantName": row.plant_name,
            "symptoms": row.symptoms,
            "response": row.response,
            "createdAt": row.created_at.isoformat(),
        } for row in diagnoses],
        "careEvents": [{
            "plantId": row.plant_id,
            "type": row.event_type,
            "notes": row.notes,
            "completedAt": row.completed_at.isoformat(),
        } for row in care],
        "tasks": [{
            "plantId": row.plant_id,
            "title": row.title,
            "type": row.task_type,
            "dueDate": row.due_date,
            "completed": row.completed,
        } for row in tasks],
        "feedback": [{"type": row.feedback_type, "rating": row.rating, "comment": row.comment, "createdAt": row.created_at.isoformat()} for row in feedback],
    }


@app.delete("/user/account")
def delete_account(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if datos.get("confirmation") != "ELIMINAR" or not verify_password(datos.get("password", ""), user.password_hash):
        raise HTTPException(400, "Confirmación o contraseña incorrectas")
    plants = db.query(UserPlant).filter(UserPlant.user_id == user.id).all()
    for row in plants:
        for photo_url in (json.loads(row.data).get("gallery") or []):
            try:
                delete_plant_photo(photo_url, user.id)
            except Exception:
                logger.exception("No se pudo eliminar una fotografía de la cuenta")
    for model in (
        PushSubscription, NotificationDelivery, UserFeedback, ApiUsage, CareEvent, CustomTask, DiagnosisHistory,
        UserPlant, UserSettings, EmailVerificationToken, LegalAcceptance, PasswordResetToken, AuthSession,
    ):
        db.query(model).filter(model.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"ok": True}


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


@app.post("/auth/change-password")
def change_password(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    current_password = datos.get("currentPassword", "")
    new_password = datos.get("newPassword", "")
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(400, "La contraseña actual no es correcta")
    if not valid_new_password(new_password):
        raise HTTPException(400, "La nueva contraseña debe tener al menos 8 caracteres")
    user.password_hash = hash_password(new_password)
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    return {"message": "Contraseña actualizada. Vuelve a iniciar sesión."}


@app.post("/auth/logout-all")
def logout_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    return {"ok": True}


@app.post("/auth/forgot-password")
def forgot_password(datos: dict, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "forgot", 5, 3600)
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
    if not row or not valid_new_password(password):
        raise HTTPException(400, "Enlace inválido o contraseña poco segura")
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


@app.post("/user/test-notification")
def test_notification(user: User = Depends(get_current_user)):
    result = send_test_push(user.id)
    if not result["subscriptions"]:
        raise HTTPException(409, "No hay ningún dispositivo conectado. Activa los avisos en Mis plantas.")
    if not result["sent"]:
        raise HTTPException(502, "La notificación no pudo enviarse. Revisa las claves VAPID.")
    return result


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
def preguntar(
    datos: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pregunta = datos.get("pregunta", "").strip()
    if not pregunta:
        raise HTTPException(400, "Escribe una pregunta")
    if len(pregunta) > 800:
        raise HTTPException(400, "La pregunta es demasiado larga")
    imagen = datos.get("imagen")
    if imagen:
        if not isinstance(imagen, str) or len(imagen) > 8 * 1024 * 1024:
            raise HTTPException(400, "La imagen es demasiado grande")
        imagen = imagen.split(",", 1)[1] if "," in imagen else imagen
    today = datetime.utcnow().date()
    daily_limit = int(os.getenv("DAILY_CHAT_LIMIT", "40"))
    used = db.query(ApiUsage).filter(
        ApiUsage.user_id == user.id,
        ApiUsage.operation == "chat",
        ApiUsage.created_at >= datetime.combine(today, datetime.min.time()),
    ).count()
    if used >= daily_limit:
        raise HTTPException(429, "Has alcanzado el límite diario de preguntas")
    try:
        if gemini_configured():
            respuesta = preguntar_avanzado(
                pregunta,
                datos.get("planta"),
                datos.get("contexto"),
                datos.get("historial"),
                imagen,
            )
            provider = "Gemini"
        elif os.getenv("ENABLE_LOCAL_AI", "").lower() in {"1", "true", "yes"}:
            respuesta = preguntar_a_plantlive(pregunta, datos.get("planta"), datos.get("contexto"), imagen)
            provider = "Ollama local"
        else:
            raise RuntimeError("El asistente botánico no está configurado")
        db.add(ApiUsage(user_id=user.id, operation="chat", provider=provider))
        db.commit()
        return {"respuesta": respuesta}
    except Exception as error:
        raise HTTPException(502, f"No se pudo responder: {error}") from error


@app.post("/plantas/buscar-ia")
def buscar_planta_ia(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    consulta = datos.get("consulta", "").strip()
    if len(consulta) < 2:
        raise HTTPException(400, "Escribe el nombre de una planta")
    try:
        resultados = buscar_plantas_avanzado(consulta) if gemini_configured() else buscar_plantas_con_ia(consulta)
        return {"resultados": resultados}
    except (ValueError, RuntimeError) as error:
        raise HTTPException(502, str(error)) from error


@app.post("/plantas/ficha-ia")
def ficha_planta_ia(
    datos: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    nombre_cientifico = datos.get("nombreCientifico", "").strip()
    if not nombre_cientifico:
        raise HTTPException(400, "Falta el nombre científico")
    today = datetime.utcnow().date()
    used = db.query(ApiUsage).filter(
        ApiUsage.user_id == user.id,
        ApiUsage.operation == "care_profile",
        ApiUsage.created_at >= datetime.combine(today, datetime.min.time()),
    ).count()
    if used >= int(os.getenv("DAILY_CARE_PROFILE_LIMIT", "30")):
        raise HTTPException(429, "Has alcanzado el límite diario de fichas de cuidados")
    try:
        if gemini_configured():
            result = crear_ficha_avanzada(
                nombre_cientifico,
                datos.get("nombreComun"),
                datos.get("contexto"),
                datos.get("imagenes"),
            )
            provider = "Gemini"
        else:
            if os.getenv("ENABLE_LOCAL_AI", "").lower() not in {"1", "true", "yes"}:
                raise RuntimeError("La generación de cuidados no está configurada")
            result = crear_ficha_planta(nombre_cientifico, datos.get("nombreComun"))
            provider = "Ollama local"
        db.add(ApiUsage(user_id=user.id, operation="care_profile", provider=provider))
        db.commit()
        return result
    except (ValueError, RuntimeError) as error:
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
        elif os.getenv("ENABLE_LOCAL_AI", "").lower() in {"1", "true", "yes"}:
            respuesta = diagnosticar_imagen(imagenes, datos.get("planta"), datos.get("sintomas"))
        else:
            raise RuntimeError(
                "El análisis con IA no está configurado. "
                "Añade PLANT_ID_API_KEY y GEMINI_API_KEY en Render."
            )
        identified_details = extract_diagnosed_plant(respuesta)
        identified_plant = datos.get("planta") or (identified_details or {}).get("displayName")
        db.add(DiagnosisHistory(
            user_id=user.id,
            plant_name=identified_plant,
            symptoms=datos.get("sintomas"),
            response=respuesta,
            provider=provider,
        ))
        db.add(ApiUsage(user_id=user.id, operation="diagnosis", provider=provider))
        db.commit()
        return {
            "respuesta": respuesta,
            "plantName": identified_plant,
            "identifiedPlant": identified_details,
        }
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
    if db.query(UserPlant).filter(UserPlant.user_id == user.id).count() >= 300:
        raise HTTPException(429, "Has alcanzado el límite de plantas por cuenta")
    if not str(datos.get("nombreComun", "")).strip() or not str(datos.get("nombreCientifico", "")).strip():
        raise HTTPException(400, "La planta necesita nombre común y científico")
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
        "id": row.id,
        "plantName": row.plant_name or extract_diagnosed_plant_name(row.response),
        "symptoms": row.symptoms,
        "response": row.response,
        "createdAt": row.created_at.isoformat(),
    } for row in rows]


@app.get("/user/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    plants = db.query(UserPlant).filter(UserPlant.user_id == user.id).all()
    schedule = []
    plant_names = {}
    for row in plants:
        data = json.loads(row.data)
        plant_names[row.id] = data.get("nickname") or data.get("nombreComun") or "Tu planta"
        for field, label in (("nextWater", "Riego"), ("nextFeed", "Abonado")):
            if data.get(field):
                schedule.append({"plantId": row.id, "plant": plant_names[row.id], "type": label, "date": data[field]})
    tasks = db.query(CustomTask).filter(
        CustomTask.user_id == user.id,
        CustomTask.completed.is_(False),
    ).all()
    for task in tasks:
        schedule.append({
            "plantId": task.plant_id,
            "plant": plant_names.get(task.plant_id, "Tarea general"),
            "type": task.title,
            "date": task.due_date,
        })
    schedule.sort(key=lambda item: item["date"])
    due = [item for item in schedule if item["date"] <= today]
    upcoming = [item for item in schedule if item["date"] > today]
    diagnoses = db.query(DiagnosisHistory).filter(DiagnosisHistory.user_id == user.id).count()
    care = db.query(CareEvent).filter(CareEvent.user_id == user.id).count()
    return {"name": user.name, "plantCount": len(plants), "diagnosisCount": diagnoses, "careCount": care, "due": due[:8], "upcoming": upcoming[:8]}


@app.get("/user/tasks")
def list_tasks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(CustomTask).filter(CustomTask.user_id == user.id).order_by(CustomTask.due_date).all()
    return [{"id": r.id, "plantId": r.plant_id, "title": r.title, "type": r.task_type, "dueDate": r.due_date, "recurrenceDays": r.recurrence_days, "completed": r.completed} for r in rows]


@app.post("/user/tasks")
def create_task(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not datos.get("title") or not datos.get("dueDate"):
        raise HTTPException(400, "Título y fecha son obligatorios")
    try:
        datetime.strptime(datos["dueDate"], "%Y-%m-%d")
    except (TypeError, ValueError) as error:
        raise HTTPException(400, "La fecha no es válida") from error
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


@app.post("/user/feedback")
def save_feedback(datos: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    feedback_type = datos.get("type")
    rating = datos.get("rating")
    allowed_ratings = {"diagnosis", "care", "chat"}
    open_comments = {"idea", "bug", "general"}
    if feedback_type not in allowed_ratings | open_comments or (feedback_type in allowed_ratings and rating not in {-1, 1}) or (feedback_type in open_comments and rating != 0):
        raise HTTPException(400, "Valoración no válida")
    comment = str(datos.get("comment", ""))[:1000] or None
    db.add(UserFeedback(
        user_id=user.id,
        feedback_type=feedback_type,
        reference=str(datos.get("reference", ""))[:120] or None,
        rating=rating,
        comment=comment,
    ))
    db.commit()
    if feedback_type in open_comments and comment and os.getenv("RESEND_API_KEY"):
        try:
            send_email(
                os.getenv("SUPPORT_EMAIL", "plantlivesupport@gmail.com"),
                f"Nuevo comentario de PlantLive: {feedback_type}",
                f"<div style='font-family:Arial'><h2>Nuevo comentario</h2><p><b>Tipo:</b> {html.escape(feedback_type)}</p><p><b>Usuario:</b> {html.escape(user.email)}</p><p><b>Página:</b> {html.escape(str(datos.get('reference', ''))[:120])}</p><p>{html.escape(comment)}</p></div>",
            )
        except Exception:
            logger.exception("No se pudo enviar el comentario a soporte")
    return {"ok": True}


@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.email != os.getenv("ADMIN_EMAIL"):
        raise HTTPException(403, "Acceso restringido")
    return {"users": db.query(User).count(), "plants": db.query(UserPlant).count(), "diagnoses": db.query(DiagnosisHistory).count(), "usageToday": db.query(ApiUsage).filter(ApiUsage.created_at >= datetime.combine(datetime.utcnow().date(), datetime.min.time())).count(), "negativeFeedback": db.query(UserFeedback).filter(UserFeedback.rating == -1).count()}
