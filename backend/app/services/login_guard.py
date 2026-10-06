"""Límite de intentos de inicio de sesión (fuerza bruta) sobre PostgreSQL.

Límites (ventana deslizante de 15 minutos):
- 5 intentos fallidos por cuenta (correo): protege cada cuenta aunque el
  atacante cambie de IP.
- 30 intentos fallidos por IP: frena la prueba de muchas cuentas desde un
  mismo origen. Solo se aplica si la IP del cliente es confiable: conexión
  directa, o X-Forwarded-For enviado por un proxy de confianza
  (TRUSTED_PROXIES). Si la llamada llega desde el servidor de Next.js sin IP
  del navegador, este límite se omite: si no, los fallos de TODOS los
  usuarios sumarían en la misma IP y bloquearían el inicio de sesión.

La respuesta es la misma exista o no la cuenta. Un inicio exitoso borra los
fallos de esa cuenta. Los registros de más de 24 h se eliminan.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.security import hash_token
from app.models import LoginAttempt

from .errors import TooManyRequestsError

WINDOW = timedelta(minutes=15)
MAX_FAILURES_PER_ACCOUNT = 5
MAX_FAILURES_PER_IP = 30
RETENTION = timedelta(hours=24)
BLOCKED_MESSAGE = "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo."


def _email_key(email: str) -> str:
    return hash_token(email.strip().lower())


def _failures(db: Session, since: datetime, **filters: str) -> int:
    stmt = (
        select(func.count())
        .select_from(LoginAttempt)
        .where(LoginAttempt.succeeded.is_(False), LoginAttempt.created_at > since)
    )
    for column, value in filters.items():
        stmt = stmt.where(getattr(LoginAttempt, column) == value)
    return db.scalar(stmt) or 0


def ensure_allowed(db: Session, email: str, ip: str, *, check_ip: bool = True) -> None:
    since = datetime.now(UTC) - WINDOW
    if _failures(db, since, email_hash=_email_key(email)) >= MAX_FAILURES_PER_ACCOUNT:
        raise TooManyRequestsError(BLOCKED_MESSAGE)
    if check_ip and _failures(db, since, ip_address=ip) >= MAX_FAILURES_PER_IP:
        raise TooManyRequestsError(BLOCKED_MESSAGE)


def record(db: Session, email: str, ip: str, succeeded: bool) -> None:
    key = _email_key(email)
    if succeeded:
        db.execute(delete(LoginAttempt).where(LoginAttempt.email_hash == key, LoginAttempt.succeeded.is_(False)))
    db.add(LoginAttempt(email_hash=key, ip_address=ip[:45], succeeded=succeeded))
    db.execute(delete(LoginAttempt).where(LoginAttempt.created_at < datetime.now(UTC) - RETENTION))
