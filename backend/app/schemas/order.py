from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator, model_validator

from app.models.cart import MAX_QUANTITY_PER_ITEM
from app.models.enums import FulfillmentMethod, OrderStatus, PaymentMethod

from .auth import PHONE_PATTERN
from .base import ApiModel


class OrderItemIn(ApiModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_ITEM)


class CustomerIn(ApiModel):
    full_name: str = Field(min_length=3, max_length=160)
    email: EmailStr
    phone: str = Field(pattern=PHONE_PATTERN)
    document_type: Literal["CC", "CE", "NIT", "PAS"]
    document_number: str = Field(pattern=r"^[A-Za-z0-9-]{5,20}$")

    @field_validator("full_name")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()


class FulfillmentIn(ApiModel):
    method: FulfillmentMethod
    address: str | None = Field(default=None, max_length=160)
    city: str | None = Field(default=None, max_length=40)
    branch_id: uuid.UUID | None = None
    date: date
    time_slot_id: str = Field(max_length=20)

    @model_validator(mode="after")
    def check_method(self) -> FulfillmentIn:
        if self.method == FulfillmentMethod.DELIVERY and not (self.address and self.city):
            raise ValueError("El domicilio requiere dirección y ciudad.")
        if self.method == FulfillmentMethod.PICKUP and not self.branch_id:
            raise ValueError("La recogida requiere una sucursal.")
        return self


class OrderCreateIn(ApiModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=20)
    customer: CustomerIn
    fulfillment: FulfillmentIn
    payment_method: PaymentMethod
    data_consent: Literal[True]
    # Versión de la política que vio el cliente (Ley 1581). Opcional; si llega debe ser la vigente.
    policy_version: str | None = Field(default=None, max_length=20)


class OrderItemOut(ApiModel):
    product_id: uuid.UUID
    slug: str
    name: str
    image_url: str | None = None
    quantity: int
    unit_price: int
    subtotal: int


class OrderOut(ApiModel):
    id: uuid.UUID
    status: OrderStatus
    subtotal: int
    shipping_cost: int
    total: int
    item_count: int
    branch_id: uuid.UUID
    branch_name: str
    branch_city: str
    branch_address: str
    fulfillment_method: FulfillmentMethod
    delivery_address: str | None = None
    delivery_city: str | None = None
    scheduled_date: date
    time_slot: str
    payment_method: PaymentMethod
    contact_name: str
    contact_email: str
    contact_phone: str
    items: list[OrderItemOut]
    created_at: datetime
    updated_at: datetime
