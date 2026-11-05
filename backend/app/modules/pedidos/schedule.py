"""Franjas de entrega y recogida con cupo real por sucursal (RF 7.1, CU-06).

Cada sucursal atiende `slot_capacity` pedidos por franja. Ocupan cupo todos los
pedidos no cancelados; uno que se cancela o vence lo devuelve.
"""

import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import Branch, Order
from app.models.enums import OrderStatus

BOGOTA = ZoneInfo("America/Bogota")
TIME_SLOTS = {
    "slot-08": ("08:00", "10:00", "8:00 a. m. – 10:00 a. m."),
    "slot-10": ("10:00", "12:00", "10:00 a. m. – 12:00 m."),
    "slot-12": ("12:00", "14:00", "12:00 m. – 2:00 p. m."),
    "slot-14": ("14:00", "16:00", "2:00 p. m. – 4:00 p. m."),
    "slot-16": ("16:00", "18:00", "4:00 p. m. – 6:00 p. m."),
}


def slot_has_passed(day: date, slot_id: str, now: datetime | None = None) -> bool:
    """Una franja de hoy ya no se ofrece cuando empezó."""
    now = now or datetime.now(BOGOTA)
    return day < now.date() or (day == now.date() and TIME_SLOTS[slot_id][0] <= now.strftime("%H:%M"))


def lock_slot(db: Session, day: date, slot_id: str) -> None:
    """Serializa los pedidos de una misma franja hasta el fin de la transacción:
    dos clientes no pueden tomar a la vez el último cupo."""
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"slot:{day.isoformat()}:{slot_id}"})


def slot_usage(db: Session, day: date) -> dict[tuple[uuid.UUID, str], int]:
    """Pedidos que ocupan cupo ese día, por (sucursal, franja)."""
    rows = db.execute(
        select(Order.branch_id, Order.time_slot, func.count())
        .where(Order.scheduled_date == day, Order.status != OrderStatus.CANCELLED)
        .group_by(Order.branch_id, Order.time_slot)
    )
    return {(branch_id, slot): int(count) for branch_id, slot, count in rows}


def full_branches(db: Session, day: date, slot_id: str) -> set[uuid.UUID]:
    usage = slot_usage(db, day)
    return {
        branch_id
        for branch_id, capacity in db.execute(select(Branch.id, Branch.slot_capacity))
        if usage.get((branch_id, slot_id), 0) >= capacity
    }


def list_slots(db: Session, day: date, branch_id: uuid.UUID | None) -> list[dict]:
    """Con sucursal: su cupo. Sin ella (domicilio): basta una sucursal activa con cupo."""
    stmt = select(Branch.id, Branch.slot_capacity).where(Branch.is_active)
    if branch_id:
        stmt = stmt.where(Branch.id == branch_id)
    branches = db.execute(stmt).all()
    usage = slot_usage(db, day)
    return [
        {
            "id": slot_id,
            "label": label,
            "start": start,
            "end": end,
            "available": not slot_has_passed(day, slot_id)
            and any(usage.get((b_id, slot_id), 0) < capacity for b_id, capacity in branches),
        }
        for slot_id, (start, end, label) in TIME_SLOTS.items()
    ]
