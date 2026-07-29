"""Envía una ronda de recordatorios pendientes.

En producción, ejecutar diariamente con cron, EventBridge o un scheduler.
"""
import json
import os
import smtplib
from datetime import date
from email.message import EmailMessage

from pywebpush import WebPushException, webpush

from database import SessionLocal
from models import CustomTask, PushSubscription, User, UserPlant, UserSettings
from email_service import send_email as send_resend_email


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


def send_email(user: User, title: str, body: str) -> None:
    if os.getenv("RESEND_API_KEY"):
        send_resend_email(user.email, title, f"<h2>{title}</h2><p>{body}</p>")
        return
    if not os.getenv("SMTP_HOST"):
        return
    message = EmailMessage()
    message["Subject"], message["From"], message["To"] = title, os.environ["SMTP_FROM"], user.email
    message.set_content(body)
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587"))) as client:
        client.starttls()
        client.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        client.send_message(message)


def run_once() -> int:
    db, sent = SessionLocal(), 0
    try:
        tasks = db.query(CustomTask).filter(CustomTask.completed.is_(False), CustomTask.due_date <= date.today().isoformat()).all()
        reminders = [(task.user_id, task.title) for task in tasks]
        for plant in db.query(UserPlant).all():
            data = json.loads(plant.data)
            name = data.get("nickname") or data.get("nombreComun") or "Tu planta"
            if data.get("nextWater") and data["nextWater"] <= date.today().isoformat():
                reminders.append((plant.user_id, f"Revisa el riego de {name}"))
            if data.get("nextFeed") and data["nextFeed"] <= date.today().isoformat():
                reminders.append((plant.user_id, f"Es momento de abonar {name}"))
        for user_id, reminder in reminders:
            user = db.query(User).filter(User.id == user_id).first()
            settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
            if not user or not settings:
                continue
            title, body = "PlantLive · Cuidado pendiente", reminder
            if settings.push_notifications and os.getenv("VAPID_PRIVATE_KEY"):
                for subscription in db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all():
                    try:
                        send_push(subscription, title, body)
                        sent += 1
                    except WebPushException:
                        continue
            if settings.email_notifications:
                send_email(user, title, body)
        return sent
    finally:
        db.close()


if __name__ == "__main__":
    print(f"{run_once()} notificaciones enviadas")
