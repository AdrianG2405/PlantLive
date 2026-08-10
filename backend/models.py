from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint

from database import Base


class Planta(Base):
    __tablename__ = "plantas"
    id = Column(Integer, primary_key=True, index=True)
    nombre_comun = Column(String, nullable=False)
    nombre_cientifico = Column(String, nullable=True)
    categoria = Column(String, nullable=True)
    descripcion = Column(Text, nullable=True)
    imagen = Column(String, nullable=True)


class MiPlanta(Base):
    """Tabla antigua conservada para no destruir datos locales existentes."""
    __tablename__ = "mis_plantas"
    id = Column(Integer, primary_key=True, index=True)
    planta_id = Column(Integer, nullable=False)
    usuario_id = Column(Integer, nullable=False, default=1)
    fecha_añadida = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserPlant(Base):
    __tablename__ = "user_plants"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class DiagnosisHistory(Base):
    __tablename__ = "diagnosis_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    plant_name = Column(String(255), nullable=True)
    symptoms = Column(Text, nullable=True)
    response = Column(Text, nullable=False)
    provider = Column(String(80), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CareEvent(Base):
    __tablename__ = "care_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    plant_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String(40), nullable=False)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    timezone = Column(String(80), default="Europe/Madrid", nullable=False)
    reminder_hour = Column(Integer, default=9, nullable=False)
    reminder_minute = Column(Integer, default=0, nullable=False)
    email_notifications = Column(Boolean, default=False, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    ai_consent = Column(Boolean, default=False, nullable=False)
    weather_enabled = Column(Boolean, default=False, nullable=False)
    weather_latitude = Column(String(30), nullable=True)
    weather_longitude = Column(String(30), nullable=True)
    weather_location = Column(String(120), nullable=True)


class CustomTask(Base):
    __tablename__ = "custom_tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    plant_id = Column(Integer, nullable=True, index=True)
    title = Column(String(120), nullable=False)
    task_type = Column(String(40), default="inspection", nullable=False)
    due_date = Column(String(10), nullable=False)
    recurrence_days = Column(Integer, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ApiUsage(Base):
    __tablename__ = "api_usage"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    operation = Column(String(40), nullable=False)
    provider = Column(String(80), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LegalAcceptance(Base):
    __tablename__ = "legal_acceptances"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    version = Column(String(20), nullable=False)
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"
    __table_args__ = (UniqueConstraint("user_id", "reminder_key", "sent_on", name="uq_notification_delivery"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    reminder_key = Column(String(180), nullable=False)
    sent_on = Column(String(10), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserFeedback(Base):
    __tablename__ = "user_feedback"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    feedback_type = Column(String(40), nullable=False, index=True)
    reference = Column(String(120), nullable=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
