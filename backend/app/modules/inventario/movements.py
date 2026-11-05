"""Registro de entradas y salidas (CU-13). Quien llama ya bloqueó la fila de inventario."""

import uuid

from sqlalchemy.orm import Session

from app.models import Inventory, InventoryMovement
from app.models.enums import MovementKind


def record_movement(
    db: Session,
    inventory: Inventory,
    kind: MovementKind,
    quantity: int,
    *,
    reason: str | None = None,
    user_id: uuid.UUID | None = None,
    order_id: uuid.UUID | None = None,
) -> None:
    """Anota un cambio ya aplicado a `inventory.total_quantity`. No hace commit."""
    if quantity == 0:
        return
    db.add(
        InventoryMovement(
            inventory=inventory,
            kind=kind,
            quantity=quantity,
            balance_after=inventory.total_quantity,
            reason=reason,
            user_id=user_id,
            order_id=order_id,
        )
    )
