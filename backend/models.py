from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

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
    email_notifications = Column(Boolean, default=False, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    ai_consent = Column(Boolean, default=False, nullable=False)


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
