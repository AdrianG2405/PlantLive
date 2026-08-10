import json
import os
from urllib.error import HTTPError, URLError
import urllib.request


class EmailDeliveryError(RuntimeError):
    pass


def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return False
    payload = {
        "from": os.getenv("EMAIL_FROM", "PlantLive <onboarding@resend.dev>"),
        "reply_to": os.getenv("EMAIL_REPLY_TO", "plantlivesupport@gmail.com"),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "PlantLive/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20):
            return True
    except HTTPError as error:
        try:
            payload = json.loads(error.read().decode())
            detail = payload.get("message") or payload.get("name") or f"HTTP {error.code}"
        except Exception:
            detail = f"HTTP {error.code}"
        raise EmailDeliveryError(f"Resend: {detail}") from error
    except URLError as error:
        raise EmailDeliveryError("No se pudo conectar con Resend") from error


def send_password_reset(to: str, token: str) -> bool:
    url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')}/restablecer?token={token}"
    return send_email(
        to,
        "Recupera tu acceso a PlantLive",
        f"""<div style="font-family:Arial;color:#173126;max-width:560px;margin:auto">
        <h1>Recupera tu acceso</h1>
        <p>Hemos recibido una solicitud para cambiar tu contraseña de PlantLive.</p>
        <p><a href="{url}" style="display:inline-block;background:#123f31;color:white;padding:12px 18px;border-radius:9px;text-decoration:none">Crear nueva contraseña</a></p>
        <p>Este enlace caduca en 30 minutos. Si no lo solicitaste, puedes ignorar este mensaje.</p>
        </div>""",
    )


def send_email_verification(to: str, token: str) -> bool:
    url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')}/verificar-email?token={token}"
    return send_email(
        to,
        "Verifica tu correo de PlantLive",
        f"""<div style="font-family:Arial;color:#173126;max-width:560px;margin:auto">
        <h1>Confirma tu correo</h1>
        <p>Solo falta un paso para activar tu jardín en PlantLive.</p>
        <p><a href="{url}" style="display:inline-block;background:#123f31;color:white;padding:12px 18px;border-radius:9px;text-decoration:none">Verificar mi correo</a></p>
        <p>Este enlace caduca en 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
        </div>""",
    )
