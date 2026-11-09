from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno (o de backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: PostgresDsn
    # Orígenes que pueden llamar a la API desde el navegador (el frontend de Next.js).
    cors_origins: list[str] = ["http://localhost:3000"]
    # En producción siempre True (cookies solo por HTTPS).
    cookie_secure: bool = False
    session_ttl_hours: int = Field(default=24 * 7, ge=1, le=24 * 30)
    # Sin definir se comporta como producción: nada de pasarela simulada ni enlaces en el log.
    environment: str = "production"
    # URL pública del frontend (enlaces en correos de recuperación).
    frontend_url: str = "http://localhost:3000"
    password_reset_ttl_minutes: int = Field(default=30, ge=5, le=24 * 60)
    # Versión vigente de la política de tratamiento de datos (Ley 1581).
    privacy_policy_version: str = "2026-10-06"
    # Proxies de confianza (CIDR) cuyo X-Forwarded-For se acepta como IP del cliente.
    trusted_proxies: list[str] = []

    # Pasarela de pagos: "auto" usa Wompi si están sus cuatro llaves y, si no, en
    # desarrollo, la pasarela SIMULADA (página de pruebas sin cobro real). "wompi"
    # o "simulado" la fijan. La simulada nunca funciona con ENVIRONMENT=production.
    # "manual": el cliente paga por transferencia o contra entrega y un
    # administrador confirma el pago en el panel; no requiere pasarela.
    payment_provider: Literal["auto", "wompi", "simulado", "manual"] = "auto"
    # Cómo pagar con el proveedor manual: cuenta, Nequi, punto de pago…
    payment_instructions: str = ""
    # Pagos con Wompi. Las llaves NUNCA van en el repositorio (backend/.env o el entorno).
    wompi_public_key: str = ""
    wompi_private_key: str = ""
    wompi_events_secret: str = ""
    wompi_integrity_secret: str = ""
    wompi_api_url: str = "https://sandbox.wompi.co/v1"
    wompi_checkout_url: str = "https://checkout.wompi.co/p/"
    # Minutos para pagar un pedido o alquiler antes de que se cancele y libere lo apartado.
    payment_window_minutes: int = Field(default=30, ge=10, le=24 * 60)

    # Facturación (sin resolución DIAN: el documento lo indica).
    invoice_prefix: str = "EMV"
    invoice_vat_percent: int = Field(default=19, ge=0, le=100)
    company_name: str = "EcoMovilidad Colombia S.A.S."
    # Vacío hasta tener el NIT real; la factura muestra "pendiente".
    company_nit: str = ""

    # Correo por SMTP. Sin SMTP_HOST no se envían correos.
    smtp_host: str = ""
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True

    # Días que se conserva el historial de posiciones GPS.
    gps_retention_days: int = Field(default=90, ge=1, le=3650)

    @property
    def wompi_configured(self) -> bool:
        return all(
            (self.wompi_public_key, self.wompi_private_key, self.wompi_events_secret, self.wompi_integrity_secret)
        )

    @property
    def active_payment_provider(self) -> Literal["wompi", "simulado", "manual"] | None:
        """Pasarela en uso, o None si no hay ninguna disponible (pagos → 503)."""
        if self.payment_provider == "manual":
            return "manual"
        if self.payment_provider == "wompi" or (self.payment_provider == "auto" and self.wompi_configured):
            return "wompi" if self.wompi_configured else None
        if self.environment == "production":
            return None  # la pasarela simulada nunca acepta "pagos" en producción
        if self.payment_provider == "simulado" or self.environment == "development":
            return "simulado"
        return None

    @property
    def payments_enabled(self) -> bool:
        return self.active_payment_provider is not None

    @property
    def payments_sandbox(self) -> bool:
        """Sin dinero real: llaves de pruebas de Wompi o pasarela simulada."""
        if self.active_payment_provider == "simulado":
            return True
        return self.wompi_public_key.startswith("pub_test_")


@lru_cache
def get_settings() -> Settings:
    return Settings()
