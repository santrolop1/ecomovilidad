import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.order import OrderCreateIn, OrderOut
from app.services import orders as service

router = APIRouter(prefix="/orders", tags=["pedidos"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED, response_model_exclude_none=True)
def create_order(data: OrderCreateIn, user: CurrentUser, db: DbSession):
    return service.create_order(db, user, data)


@router.get("", response_model=list[OrderOut], response_model_exclude_none=True)
def list_orders(user: CurrentUser, db: DbSession):
    return service.list_orders(db, user)


@router.get("/{order_id}", response_model=OrderOut, response_model_exclude_none=True)
def get_order(order_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return service.get_order(db, user, order_id)
