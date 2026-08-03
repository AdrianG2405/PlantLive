"""Envía recordatorios respetando hora local y evitando duplicados."""
import json
import logging
import os
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from zoneinfo import ZoneInfo

from pywebpush import webpush

from database import SessionLocal
from email_service import send_email as send_resend_email
from models import CustomTask, NotificationDelivery, PushSubscription, User, UserPlant, UserSettings

logger = logging.getLogger("plantlive.notifications")


def send_push(subscription: PushSubscription, title: str, body: str) -> None:
    webpush(
        subscription_info={
            "endpoint": subscription.endpoint,
            "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
        },
        data=json.dumps({"title": title, "body": body, "url": "/calendario"}),
        vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
        vapid_claims={"sub": os.getenv("VAPID_SUBJECT", "mailto:admin@plantlive.es")},
    )


def send_email(user: User, title: str, body: str) -> bool:
    if os.getenv("RESEND_API_KEY"):
        return send_resend_email(user.email, title, f"<h2>{title}</h2><p>{body}</p>")
    if not os.getenv("SMTP_HOST"):
        return False
    message = EmailMessage()
    message["Subject"], message["From"], message["To"] = title, os.environ["SMTP_FROM"], user.email
    message.set_content(body)
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587"))) as client:
        client.starttls()
        client.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        client.send_message(message)
    return True


def send_test_push(user_id: int) -> dict[str, int]:
    db, sent, failed = SessionLocal(), 0, 0
    try:
        subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
        for subscription in subscriptions:
            try:
                send_push(
                    subscription,
                    "PlantLive · Notificación de prueba",
                    "Los avisos están conectados correctamente.",
                )
                sent += 1
            except Exception:
                failed += 1
                logger.exception("Falló la prueba push de la suscripción %s", subscription.id)
        return {"sent": sent, "failed": failed, "subscriptions": len(subscriptions)}
    finally:
        db.close()


def run_once() -> dict[str, int]:
    db, sent, failed = SessionLocal(), 0, 0
    try:
        now_utc = datetime.now(timezone.utc)
        for settings in db.query(UserSettings).all():
            try:
                local_now = now_utc.astimezone(ZoneInfo(settings.timezone))
            except Exception:
                local_now = now_utc.astimezone(ZoneInfo("Europe/Madrid"))
            current_minutes = local_now.hour * 60 + local_now.minute
            preferred_minutes = settings.reminder_hour * 60 + (settings.reminder_minute or 0)
            if current_minutes < preferred_minutes:
                continue
            user = db.query(User).filter(User.id == settings.user_id).first()
            if not user:
                continue
            today = local_now.date().isoformat()
            reminders = []
            tasks = db.query(CustomTask).filter(
                CustomTask.user_id == user.id,
                CustomTask.completed.is_(False),
                CustomTask.due_date <= today,
            ).all()
            reminders.extend((f"task:{task.id}", task.title) for task in tasks)
            for plant in db.query(UserPlant).filter(UserPlant.user_id == user.id).all():
                try:
                    data = json.loads(plant.data)
                except (TypeError, json.JSONDecodeError):
                    failed += 1
                    logger.exception("Datos inválidos en la planta %s", plant.id)
                    continue
                name = data.get("nickname") or data.get("nombreComun") or "Tu planta"
                if data.get("nextWater") and data["nextWater"] <= today:
                    reminders.append((f"water:{plant.id}:{data['nextWater']}", f"Revisa el riego de {name}"))
                if data.get("nextFeed") and data["nextFeed"] <= today:
                    reminders.append((f"feed:{plant.id}:{data['nextFeed']}", f"Es momento de abonar {name}"))
            for reminder_key, reminder in reminders:
                if db.query(NotificationDelivery).filter(
                    NotificationDelivery.user_id == user.id,
                    NotificationDelivery.reminder_key == reminder_key,
                    NotificationDelivery.sent_on == today,
                ).first():
                    continue
                title, delivered_now = "PlantLive · Cuidado pendiente", False
                if settings.push_notifications and os.getenv("VAPID_PRIVATE_KEY"):
                    for subscription in db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all():
                        try:
                            send_push(subscription, title, reminder)
                            sent += 1
                            delivered_now = True
                        except Exception:
                            failed += 1
                            logger.exception("No se pudo enviar el aviso push de la suscripción %s", subscription.id)
                            continue
                if settings.email_notifications and os.getenv("EMAIL_REMINDERS_ENABLED", "false").lower() == "true":
                    try:
                        if send_email(user, title, reminder):
                            sent += 1
                            delivered_now = True
                    except Exception:
                        failed += 1
                        logger.exception("No se pudo enviar el recordatorio por correo al usuario %s", user.id)
                if delivered_now:
                    db.add(NotificationDelivery(user_id=user.id, reminder_key=reminder_key, sent_on=today))
            db.commit()
        return {"sent": sent, "failed": failed}
    finally:
        db.close()


if __name__ == "__main__":
    print(json.dumps(run_once()))
