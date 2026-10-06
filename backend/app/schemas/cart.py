import uuid
from datetime import datetime

from pydantic import Field

from app.models.cart import MAX_QUANTITY_PER_ITEM

from .base import ApiModel
from .catalog import ImageOut


class CartItemOut(ApiModel):
    id: uuid.UUID
    product_id: uuid.UUID
    slug: str
    name: str
    brand: str
    image: ImageOut | None = None
    unit_price: int
    quantity: int
    max_quantity: int


class CartOut(ApiModel):
    id: uuid.UUID
    items: list[CartItemOut]
    updated_at: datetime


class AddCartItemIn(ApiModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_ITEM)


class UpdateCartItemIn(ApiModel):
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_ITEM)
