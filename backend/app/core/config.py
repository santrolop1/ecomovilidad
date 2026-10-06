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


@lru_cache
def get_settings() -> Settings:
    return Settings()
