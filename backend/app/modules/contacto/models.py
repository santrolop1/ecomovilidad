from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKey


class ContactMessage(UUIDPrimaryKey, Base):
    """Mensaje del formulario. La IP se guarda solo como hash, para limitar abusos."""

    __tablename__ = "contact_messages"
    __table_args__ = (
        CheckConstraint("status IN ('nuevo', 'atendido')", name="valid_status"),
        Index("ix_contact_messages_ip_hash_created_at", "ip_hash", "created_at"),
        Index("ix_contact_messages_email_created_at", "email", "created_at"),
    )

    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(20))
    topic: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(String(2000))
    status: Mapped[str] = mapped_column(String(10), default="nuevo", server_default="nuevo", index=True)
    # Evidencia de la autorización de tratamiento de datos (Ley 1581).
    policy_version: Mapped[str] = mapped_column(String(20))
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
