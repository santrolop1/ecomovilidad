"""Envío de correos. Con SMTP_HOST se envían por SMTP. Sin él, en desarrollo el
mensaje se escribe en el log del servidor (`docker compose logs api`); fuera de
desarrollo NO se escribe en ningún lado (no hay forma de filtrar tokens) y se
registra un error."""

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage as MimeMessage
from typing import Protocol

from app.core.config import Settings, get_settings

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


class SmtpEmailSender:
    """Envía por SMTP. Un fallo del proveedor no debe tumbar la operación del cliente."""

    TIMEOUT_S = 10

    def __init__(self, settings: Settings):
        self.settings = settings

    def send(self, message: EmailMessage) -> None:
        settings = self.settings
        mime = MimeMessage()
        mime["From"] = settings.smtp_from
        mime["To"] = message.to
        mime["Subject"] = message.subject
        mime.set_content(message.body)
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=self.TIMEOUT_S) as server:
                if settings.smtp_starttls:
                    server.starttls()
                if settings.smtp_user:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(mime)
        except (OSError, smtplib.SMTPException):
            logger.exception("No se pudo enviar el correo '%s'.", message.subject)


class UnconfiguredEmailSender:
    def send(self, message: EmailMessage) -> None:
        logger.error("No hay proveedor de correo configurado: no se envió '%s'.", message.subject)


def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.smtp_host:
        return SmtpEmailSender(settings)
    if settings.environment == "development":
        return DevelopmentEmailSender()
    return UnconfiguredEmailSender()
