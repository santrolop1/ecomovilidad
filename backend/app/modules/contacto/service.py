"""Mensajes de contacto: los deja cualquiera, sin sesión, con límite de envíos."""

import uuid
from datetime import timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import NotFoundError, TooManyRequestsError
from app.core.security import hash_token
from app.models import ContactMessage
from app.modules.admin import repository as repo
from app.modules.admin.common import PAGE_SIZE
from app.modules.admin.schemas import Page
from app.modules.contacto.schemas import ContactAck, ContactMessageIn, ContactMessageOut, ContactStatus
from app.modules.inventario.reservations import now_utc

WINDOW = timedelta(hours=1)
MAX_PER_EMAIL = 3
MAX_PER_IP = 10
LIMIT_MESSAGE = "Recibimos varios mensajes tuyos. Inténtalo de nuevo más tarde."


def _recent(db: Session, column, value: str) -> int:
    since = now_utc() - WINDOW
    return (
        db.scalar(
            select(func.count()).select_from(ContactMessage).where(column == value, ContactMessage.created_at > since)
        )
        or 0
    )


def create_message(db: Session, data: ContactMessageIn, ip: str | None) -> ContactAck:
    email = data.email.lower()
    ip_hash = hash_token(ip) if ip else None
    if _recent(db, ContactMessage.email, email) >= MAX_PER_EMAIL:
        raise TooManyRequestsError(LIMIT_MESSAGE)
    if ip_hash and _recent(db, ContactMessage.ip_hash, ip_hash) >= MAX_PER_IP:
        raise TooManyRequestsError(LIMIT_MESSAGE)
    message = ContactMessage(
        full_name=data.full_name,
        email=email,
        phone=data.phone,
        topic=data.topic,
        message=data.message,
        policy_version=get_settings().privacy_policy_version,
        ip_hash=ip_hash,
        created_at=now_utc(),
    )
    db.add(message)
    db.commit()
    return ContactAck(id=message.id)


def _out(message: ContactMessage) -> ContactMessageOut:
    return ContactMessageOut(
        id=message.id,
        full_name=message.full_name,
        email=message.email,
        phone=message.phone,
        topic=message.topic,
        message=message.message,
        status=message.status,
        created_at=message.created_at,
    )


def list_messages(db: Session, *, page: int, query: str | None, state: ContactStatus | None) -> Page[ContactMessageOut]:
    stmt = select(ContactMessage).order_by(ContactMessage.created_at.desc(), ContactMessage.id)
    if state:
        stmt = stmt.where(ContactMessage.status == state)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(
            or_(
                ContactMessage.full_name.ilike(like),
                ContactMessage.email.ilike(like),
                ContactMessage.message.ilike(like),
            )
        )
    rows, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    return Page(items=[_out(m) for m in rows], total=total, page=page, page_size=PAGE_SIZE)


def set_status(db: Session, message_id: uuid.UUID, status: ContactStatus) -> ContactMessageOut:
    message = db.get(ContactMessage, message_id)
    if message is None:
        raise NotFoundError("El mensaje no existe.")
    message.status = status
    db.commit()
    return _out(message)
