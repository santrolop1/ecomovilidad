"""Mantenimiento preventivo de la flota (CU-12, RF 3.1 a 3.3).

Cada unidad acumula uso (km u horas de vuelo). Al llegar al 90 % del umbral sale
de la oferta sola. Volver a operar exige registrar el mantenimiento, que deja el
uso en cero. Todo queda en una bitácora que la base de datos no deja modificar.
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import MaintenanceLog, RentalUnit
from app.models.enums import MaintenanceLogKind, RentalUnitStatus
from app.modules.alquiler.schemas import MaintenanceLogOut

BLOCK_RATIO = Decimal("0.9")
WARNING_RATIO = Decimal("0.75")


def usage_ratio(unit: RentalUnit) -> Decimal:
    return Decimal(unit.usage_value) / unit.service_threshold


def service_alert(unit: RentalUnit) -> str:
    ratio = usage_ratio(unit)
    if ratio >= BLOCK_RATIO:
        return "bloqueado"
    return "proximo" if ratio >= WARNING_RATIO else "ok"


def lock_unit(db: Session, unit_id: uuid.UUID) -> RentalUnit:
    unit = (
        db.scalars(select(RentalUnit).where(RentalUnit.id == unit_id).with_for_update(of=RentalUnit))
        .unique()
        .one_or_none()
    )
    if unit is None:
        raise NotFoundError("La unidad no existe.")
    return unit


def log(
    db: Session,
    unit: RentalUnit,
    kind: MaintenanceLogKind,
    user_id: uuid.UUID | None,
    *,
    note: str | None = None,
    delta: Decimal | None = None,
) -> None:
    db.add(
        MaintenanceLog(
            unit_id=unit.id, kind=kind, usage_delta=delta, usage_after=unit.usage_value, note=note, user_id=user_id
        )
    )


def _block_if_due(db: Session, unit: RentalUnit, user_id: uuid.UUID) -> None:
    """RF 3.2. Una unidad retirada sigue retirada."""
    if usage_ratio(unit) >= BLOCK_RATIO and unit.status == RentalUnitStatus.OPERATIONAL:
        unit.status = RentalUnitStatus.MAINTENANCE
        log(db, unit, MaintenanceLogKind.AUTO_BLOCK, user_id, note="Llegó al 90 % del umbral: sale de la oferta.")


def record_usage(db: Session, unit_id: uuid.UUID, amount: float, note: str | None, user_id: uuid.UUID) -> None:
    unit = lock_unit(db, unit_id)
    delta = Decimal(str(round(amount, 1)))
    unit.usage_value = Decimal(unit.usage_value) + delta
    log(db, unit, MaintenanceLogKind.USAGE, user_id, note=note, delta=delta)
    _block_if_due(db, unit, user_id)
    db.commit()


def set_threshold(db: Session, unit_id: uuid.UUID, threshold: int, user_id: uuid.UUID) -> None:
    unit = lock_unit(db, unit_id)
    unit.service_threshold = threshold
    log(db, unit, MaintenanceLogKind.THRESHOLD, user_id, note=f"Nuevo umbral: {threshold} {unit.usage_unit}")
    _block_if_due(db, unit, user_id)
    db.commit()


def finish_maintenance(db: Session, unit_id: uuid.UUID, note: str, user_id: uuid.UUID) -> None:
    """El taller terminó: el uso vuelve a cero y la unidad regresa a la oferta."""
    unit = lock_unit(db, unit_id)
    if unit.status != RentalUnitStatus.MAINTENANCE:
        raise ConflictError("La unidad no está en mantenimiento.")
    unit.usage_value = Decimal(0)
    unit.status = RentalUnitStatus.OPERATIONAL
    log(db, unit, MaintenanceLogKind.FINISHED, user_id, note=note.strip())
    db.commit()


def list_log(db: Session, unit_id: uuid.UUID) -> list[MaintenanceLogOut]:
    if db.get(RentalUnit, unit_id) is None:
        raise NotFoundError("La unidad no existe.")
    entries = db.scalars(
        select(MaintenanceLog)
        .where(MaintenanceLog.unit_id == unit_id)
        .order_by(MaintenanceLog.created_at.desc(), MaintenanceLog.id)
    )
    return [
        MaintenanceLogOut(
            id=e.id,
            kind=e.kind,
            usage_delta=float(e.usage_delta) if e.usage_delta is not None else None,
            usage_after=float(e.usage_after),
            note=e.note,
            user_name=f"{e.user.first_name} {e.user.last_name}" if e.user else None,
            created_at=e.created_at,
        )
        for e in entries
    ]
