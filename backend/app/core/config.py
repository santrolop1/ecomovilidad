from functools import lru_cache

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno (o de backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: PostgresDsn = Field(
        default=PostgresDsn("postgresql+psycopg://ecomovilidad:CAMBIAR@localhost:5433/ecomovilidad")
    )
    # Orígenes que pueden llamar a la API desde el navegador (el frontend de Next.js).
    cors_origins: list[str] = ["http://localhost:3000"]
    # En producción siempre True (cookies solo por HTTPS).
    cookie_secure: bool = False
    session_ttl_hours: int = Field(default=24 * 7, ge=1, le=24 * 30)
    environment: str = "development"
    # URL pública del frontend (enlaces en correos de recuperación).
    frontend_url: str = "http://localhost:3000"
    password_reset_ttl_minutes: int = Field(default=30, ge=5, le=24 * 60)
    # Versión vigente de la política de tratamiento de datos (Ley 1581).
    privacy_policy_version: str = "2026-10-06"
    # Proxies de confianza (CIDR) cuyo X-Forwarded-For se acepta como IP del cliente.
    trusted_proxies: list[str] = []


@lru_cache
def get_settings() -> Settings:
    return Settings()
