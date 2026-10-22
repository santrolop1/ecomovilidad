import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.modules.carrito import service
from app.modules.carrito.schemas import AddCartItemIn, CartOut, UpdateCartItemIn

router = APIRouter(prefix="/cart", tags=["carrito"])


@router.get("", response_model=CartOut, response_model_exclude_none=True)
def get_cart(user: CurrentUser, db: DbSession):
    return service.get_cart(db, user)


@router.post("/items", response_model=CartOut, response_model_exclude_none=True)
def add_item(data: AddCartItemIn, user: CurrentUser, db: DbSession):
    return service.add_item(db, user, data)


@router.patch("/items/{item_id}", response_model=CartOut, response_model_exclude_none=True)
def update_item(item_id: uuid.UUID, data: UpdateCartItemIn, user: CurrentUser, db: DbSession):
    return service.update_item(db, user, item_id, data)


@router.delete("/items/{item_id}", response_model=CartOut, response_model_exclude_none=True)
def remove_item(item_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return service.remove_item(db, user, item_id)
