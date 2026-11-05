import uuid
from datetime import date

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.modules.pedidos import schedule, service
from app.modules.pedidos.schemas import OrderCreateIn, OrderOut, TimeSlotOut
from app.modules.reembolsos import service as refunds
from app.modules.reembolsos.schemas import RefundRequestIn, RefundRequestOut

router = APIRouter(prefix="/orders", tags=["pedidos"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED, response_model_exclude_none=True)
def create_order(data: OrderCreateIn, user: CurrentUser, db: DbSession):
    return service.create_order(db, user, data)


@router.get("", response_model=list[OrderOut], response_model_exclude_none=True)
def list_orders(user: CurrentUser, db: DbSession):
    return service.list_orders(db, user)


@router.get("/time-slots", response_model=list[TimeSlotOut])
def list_time_slots(db: DbSession, date: date, branch_id: uuid.UUID | None = None):
    return schedule.list_slots(db, date, branch_id)


@router.get("/{order_id}", response_model=OrderOut, response_model_exclude_none=True)
def get_order(order_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return service.get_order(db, user, order_id)


@router.post("/{order_id}/cancel", response_model=OrderOut, response_model_exclude_none=True)
def cancel_order(order_id: uuid.UUID, user: CurrentUser, db: DbSession):
    """El cliente cancela un pedido sin pagar (se libera el inventario)."""
    refunds.cancel_order(db, user, order_id)
    return service.get_order(db, user, order_id)


@router.post("/{order_id}/refund-request", response_model=RefundRequestOut, status_code=status.HTTP_201_CREATED)
def request_order_refund(order_id: uuid.UUID, data: RefundRequestIn, user: CurrentUser, db: DbSession):
    """El cliente pide el reembolso de un pedido pagado y aún no entregado."""
    return refunds.request_refund(db, user, data.reason, order_id=order_id)
