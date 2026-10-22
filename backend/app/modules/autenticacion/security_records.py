"""Registros de seguridad y cumplimiento: recuperación de contraseña,
intentos de inicio de sesión y evidencia de consentimiento (Ley 1581)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKey
from app.models.enums import ConsentPurpose, sql_in


class PasswordResetToken(UUIDPrimaryKey, Base):
    """Token de un solo uso. Solo se guarda su hash SHA-256."""

    __tablename__ = "password_reset_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LoginAttempt(UUIDPrimaryKey, Base):
    """Intento de inicio de sesión fallido o exitoso, para limitar fuerza bruta.

    El correo se guarda como hash (no hace falta conocerlo para contar).
    """

    __tablename__ = "login_attempts"
    __table_args__ = (
        Index("ix_login_attempts_email_created", "email_hash", "created_at"),
        Index("ix_login_attempts_ip_created", "ip_address", "created_at"),
    )

    email_hash: Mapped[str] = mapped_column(String(64))
    ip_address: Mapped[str] = mapped_column(String(45))
    succeeded: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ConsentRecord(UUIDPrimaryKey, Base):
    """Evidencia de la autorización de tratamiento de datos (Ley 1581).

    Inmutable: se inserta, nunca se actualiza. Guarda quién, cuándo, para qué
    y qué versión de la política aceptó.
    """

    __tablename__ = "consent_records"
    __table_args__ = (
        CheckConstraint(f"purpose IN {sql_in(ConsentPurpose)}", name="valid_purpose"),
        CheckConstraint("purpose <> 'pedido' OR order_id IS NOT NULL", name="order_consent_has_order"),
        CheckConstraint("purpose <> 'alquiler' OR rental_id IS NOT NULL", name="rental_consent_has_rental"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    purpose: Mapped[str] = mapped_column(String(20))
    policy_version: Mapped[str] = mapped_column(String(20))
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"))
    rental_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rentals.id", ondelete="RESTRICT"))
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
