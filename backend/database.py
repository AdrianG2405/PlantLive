import os
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DEFAULT_DB = Path(__file__).with_name("plantlive.db").as_posix()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB}")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)

engine_options: dict[str, Any] = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def apply_compatible_schema_updates() -> None:
    """Añade columnas compatibles a bases creadas antes de una actualización."""
    inspector = inspect(engine)
    if inspector.has_table("user_settings"):
        columns = {column["name"] for column in inspector.get_columns("user_settings")}
    else:
        columns = set()
    if columns and "reminder_minute" not in columns:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE user_settings ADD COLUMN reminder_minute INTEGER NOT NULL DEFAULT 0"
            ))
    if columns:
        setting_additions = {
            "weather_enabled": "BOOLEAN NOT NULL DEFAULT FALSE",
            "weather_latitude": "VARCHAR(30)",
            "weather_longitude": "VARCHAR(30)",
            "weather_location": "VARCHAR(120)",
        }
        for column_name, definition in setting_additions.items():
            if column_name not in columns:
                with engine.begin() as connection:
                    connection.execute(text(f"ALTER TABLE user_settings ADD COLUMN {column_name} {definition}"))
    if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "email_verified" not in user_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE"
                ))


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
