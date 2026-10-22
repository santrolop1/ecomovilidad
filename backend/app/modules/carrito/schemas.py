import uuid
from datetime import datetime

from pydantic import Field

from app.core.api_model import ApiModel
from app.modules.carrito.models import MAX_QUANTITY_PER_ITEM
from app.modules.catalogo.schemas import ImageOut


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
    # Hasta cuándo están apartadas las unidades (hora del servidor, RF 6.2).
    reserved_until: datetime | None = None


class CartOut(ApiModel):
    id: uuid.UUID
    items: list[CartItemOut]
    updated_at: datetime
    reservation_minutes: int
    # Hora del servidor: el cliente corrige la diferencia de reloj del contador.
    server_time: datetime
    # Productos retirados en esta solicitud porque su reserva venció.
    expired_items: list[str] = []


class AddCartItemIn(ApiModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_ITEM)


class UpdateCartItemIn(ApiModel):
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_ITEM)
