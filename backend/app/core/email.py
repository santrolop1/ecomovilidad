"""Envío de correos. Aún no hay proveedor de correo: en desarrollo el mensaje
se escribe en el log del servidor (`docker compose logs api`). Fuera de
desarrollo NO se escribe el enlace en ningún lado (no hay forma de filtrar
tokens) y se registra una advertencia."""

import logging
from dataclasses import dataclass
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger("ecomovilidad.email")


@dataclass
class EmailMessage:
    to: str
    subject: str
    body: str


class EmailSender(Protocol):
    def send(self, message: EmailMessage) -> None: ...


class DevelopmentEmailSender:
    """SOLO DESARROLLO: imprime el correo en el log."""

    def send(self, message: EmailMessage) -> None:
        logger.warning("[CORREO DE DESARROLLO] para=%s asunto=%s\n%s", message.to, message.subject, message.body)


class UnconfiguredEmailSender:
    def send(self, message: EmailMessage) -> None:
        logger.error("No hay proveedor de correo configurado: no se envió '%s'.", message.subject)


def get_email_sender() -> EmailSender:
    if get_settings().environment == "development":
        return DevelopmentEmailSender()
    return UnconfiguredEmailSender()
