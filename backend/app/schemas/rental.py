import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.enums import RentalRateUnit, RentalStatus, RentalUnitStatus

from .base import ApiModel
from .order import CustomerIn
from .payment import InvoiceRefOut, PaymentSummaryOut
from .refund import RefundRequestOut


class RentalRateOut(ApiModel):
    unit: RentalRateUnit
    price: int


class RentalOfferBranchOut(ApiModel):
    branch_id: uuid.UUID
    branch_slug: str
    branch_name: str
    branch_city: str
    # Unidades en servicio (no en mantenimiento ni retiradas). La disponibilidad
    # para unas fechas concretas se calcula con la cotización.
    units: int


class RentalOfferOut(ApiModel):
    product_id: uuid.UUID
    slug: str
    name: str
    category: str
    short_description: str
    image_url: str | None = None
    rates: list[RentalRateOut]
    branches: list[RentalOfferBranchOut]


class RentalPeriodIn(ApiModel):
    branch_id: uuid.UUID
    start_at: datetime
    end_at: datetime


class RentalQuoteOut(ApiModel):
    price: int
    hours: int
    pricing: Literal["hora", "dia"]
    available_units: int


class RentalCreateIn(RentalPeriodIn):
    product_id: uuid.UUID
    customer: CustomerIn
    data_consent: Literal[True]
    policy_version: str | None = Field(default=None, max_length=20)


class RentalOut(ApiModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_slug: str | None = None
    product_name: str
    image_url: str | None = None
    branch_id: uuid.UUID
    branch_name: str
    branch_city: str | None = None
    branch_address: str | None = None
    unit_code: str | None = None
    start_at: datetime
    end_at: datetime
    status: RentalStatus
    price: int
    payment_expires_at: datetime | None = None
    payment: PaymentSummaryOut | None = None
    invoice: InvoiceRefOut | None = None
    refund_request: RefundRequestOut | None = None
    created_at: datetime | None = None


class RentalUnitOut(ApiModel):
    id: uuid.UUID
    code: str
    status: RentalUnitStatus
    product_id: uuid.UUID
    product_name: str
    branch_id: uuid.UUID
    branch_name: str
    is_demo: bool
    # Próximo alquiler vigente (pagado o por pagar) de la unidad.
    next_rental_start: datetime | None = None


class RentalUnitStatusIn(ApiModel):
    status: RentalUnitStatus
