"""Mantenimiento preventivo de la flota (CU-12, RF 3.1 a 3.3).

Cada unidad acumula uso (km u horas de vuelo). Al llegar al 90 % del umbral sale
de la oferta sola. Además, cada unidad tiene una revisión periódica: pasado su
plazo (90 días; 60 los drones) tampoco se ofrece, aunque casi no se haya usado.
Volver a operar exige registrar el mantenimiento, que deja el uso en cero y
reinicia el plazo. Todo queda en una bitácora que la base de datos no deja
modificar.
"""

import math
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import MaintenanceLog, RentalUnit
from app.models.enums import MaintenanceLogKind, RentalUnitStatus
from app.modules.alquiler.schemas import MaintenanceLogOut
from app.modules.inventario.reservations import now_utc

BLOCK_RATIO = Decimal("0.9")
WARNING_RATIO = Decimal("0.75")
WARNING_DAYS = 7


def usage_ratio(unit: RentalUnit) -> Decimal:
    return Decimal(unit.usage_value) / unit.service_threshold


def next_service_at(unit: RentalUnit) -> datetime:
    return unit.last_service_at + timedelta(days=unit.service_interval_days)


def days_to_service(unit: RentalUnit, now: datetime | None = None) -> int:
    """Días que faltan para la revisión periódica (negativo si ya venció)."""
    return math.floor((next_service_at(unit) - (now or now_utc())).total_seconds() / 86_400)


def service_overdue(unit: RentalUnit, now: datetime | None = None) -> bool:
    return (now or now_utc()) >= next_service_at(unit)


def service_alert(unit: RentalUnit) -> str:
    ratio = usage_ratio(unit)
    if ratio >= BLOCK_RATIO or service_overdue(unit):
        return "bloqueado"
    return "proximo" if ratio >= WARNING_RATIO or days_to_service(unit) <= WARNING_DAYS else "ok"


def service_reason(unit: RentalUnit) -> str | None:
    """Por qué necesita taller, en palabras del panel."""
    if usage_ratio(unit) >= BLOCK_RATIO:
        return "Llegó al 90 % del uso permitido."
    days = days_to_service(unit)
    if service_overdue(unit):
        return "Venció la revisión periódica."
    if usage_ratio(unit) >= WARNING_RATIO:
        return "Se acerca al límite de uso."
    if days <= WARNING_DAYS:
        return f"Revisión periódica en {days} días." if days != 1 else "Revisión periódica mañana."
    return None


def due_by_time() -> ColumnElement[bool]:
    """Condición SQL: la revisión periódica ya venció."""
    return RentalUnit.last_service_at + func.make_interval(0, 0, 0, RentalUnit.service_interval_days) <= func.now()


def can_operate(unit: RentalUnit) -> bool:
    return unit.status == RentalUnitStatus.OPERATIONAL and usage_ratio(unit) < BLOCK_RATIO and not service_overdue(unit)


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


def block_if_due(db: Session, unit: RentalUnit, user_id: uuid.UUID | None) -> None:
    """RF 3.2, por uso o por tiempo. Una unidad retirada sigue retirada."""
    if unit.status != RentalUnitStatus.OPERATIONAL:
        return
    if usage_ratio(unit) >= BLOCK_RATIO:
        unit.status = RentalUnitStatus.MAINTENANCE
        log(db, unit, MaintenanceLogKind.AUTO_BLOCK, user_id, note="Llegó al 90 % del umbral: sale de la oferta.")
    elif service_overdue(unit):
        unit.status = RentalUnitStatus.MAINTENANCE
        log(db, unit, MaintenanceLogKind.AUTO_BLOCK, user_id, note="Venció la revisión periódica: sale de la oferta.")


def add_usage(db: Session, unit: RentalUnit, amount: float, note: str | None, user_id: uuid.UUID) -> None:
    """Suma uso sin confirmar la transacción (lo usan el registro manual y la devolución)."""
    delta = Decimal(str(round(amount, 1)))
    unit.usage_value = Decimal(unit.usage_value) + delta
    log(db, unit, MaintenanceLogKind.USAGE, user_id, note=note, delta=delta)
    block_if_due(db, unit, user_id)


def record_usage(db: Session, unit_id: uuid.UUID, amount: float, note: str | None, user_id: uuid.UUID) -> None:
    unit = lock_unit(db, unit_id)
    add_usage(db, unit, amount, note, user_id)
    db.commit()


def set_threshold(db: Session, unit_id: uuid.UUID, threshold: int, user_id: uuid.UUID) -> None:
    unit = lock_unit(db, unit_id)
    unit.service_threshold = threshold
    log(db, unit, MaintenanceLogKind.THRESHOLD, user_id, note=f"Nuevo umbral: {threshold} {unit.usage_unit}")
    block_if_due(db, unit, user_id)
    db.commit()


def set_interval(db: Session, unit_id: uuid.UUID, days: int, user_id: uuid.UUID) -> None:
    """Cada cuántos días toca la revisión periódica. Si ya venció con el nuevo plazo, sale de la oferta."""
    unit = lock_unit(db, unit_id)
    unit.service_interval_days = days
    log(db, unit, MaintenanceLogKind.THRESHOLD, user_id, note=f"Revisión periódica cada {days} días")
    block_if_due(db, unit, user_id)
    db.commit()


def finish_maintenance(db: Session, unit_id: uuid.UUID, note: str, user_id: uuid.UUID) -> None:
    """El taller terminó: el uso vuelve a cero y la unidad regresa a la oferta."""
    unit = lock_unit(db, unit_id)
    if unit.status != RentalUnitStatus.MAINTENANCE:
        raise ConflictError("La unidad no está en mantenimiento.")
    unit.usage_value = Decimal(0)
    unit.last_service_at = now_utc()
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
