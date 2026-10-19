"""Evidencia del consentimiento de tratamiento de datos (Ley 1581)."""

import uuid

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ConsentRecord
from app.models.enums import ConsentPurpose

from .errors import ConflictError


def current_policy_version() -> str:
    return get_settings().privacy_policy_version


def ensure_current_policy(version: str | None) -> None:
    """Si el cliente informa la versión que vio, debe ser la vigente."""
    if version is not None and version != current_policy_version():
        raise ConflictError(
            "La política de tratamiento de datos se actualizó. Recarga la página, revísala y acéptala de nuevo."
        )


def record_consent(
    db: Session,
    user_id: uuid.UUID,
    purpose: ConsentPurpose,
    order_id: uuid.UUID | None = None,
    rental_id: uuid.UUID | None = None,
) -> ConsentRecord:
    record = ConsentRecord(
        user_id=user_id,
        purpose=purpose,
        policy_version=current_policy_version(),
        order_id=order_id,
        rental_id=rental_id,
    )
    db.add(record)
    return record
