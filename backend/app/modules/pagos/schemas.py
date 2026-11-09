import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.api_model import ApiModel
from app.models.enums import PaymentStatus


class PaymentSummaryOut(ApiModel):
    """Último intento de pago de un pedido o alquiler."""

    status: PaymentStatus
    reference: str
    payment_method_type: str | None = None
    status_message: str | None = None
    approved_at: datetime | None = None


class InvoiceRefOut(ApiModel):
    id: uuid.UUID
    number: str
    issued_at: datetime


class PaymentStartIn(ApiModel):
    order_id: uuid.UUID | None = None
    rental_id: uuid.UUID | None = None


class PaymentStartOut(ApiModel):
    checkout_url: str
    reference: str
    expires_at: datetime
    sandbox: bool
    provider: Literal["wompi", "simulado", "manual"]


class PaymentVerifyIn(ApiModel):
    transaction_id: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9-]+$")


class PaymentResultOut(ApiModel):
    status: PaymentStatus
    reference: str
    target: Literal["pedido", "alquiler"]
    order_id: uuid.UUID | None = None
    rental_id: uuid.UUID | None = None
    payment_method_type: str | None = None
    status_message: str | None = None
    invoice: InvoiceRefOut | None = None
    # Pago aprobado que no se pudo aplicar (p. ej. el plazo ya había vencido): requiere reembolso.
    requires_refund: bool = False


class PaymentConfigOut(ApiModel):
    enabled: bool
    sandbox: bool
    window_minutes: int
    # Pasarela en uso: Wompi cuando tiene llaves; si no, la simulada (solo desarrollo y demo).
    provider: Literal["wompi", "simulado", "manual"] | None = None


class SimulationOut(ApiModel):
    """Datos que muestra la pasarela simulada antes de aprobar o rechazar."""

    reference: str
    amount: int
    status: PaymentStatus
    target: Literal["pedido", "alquiler"]
    description: str
    expires_at: datetime | None = None


class ManualPaymentOut(ApiModel):
    """Lo que ve el cliente para pagar por transferencia o contra entrega."""

    reference: str
    amount: int
    status: PaymentStatus
    target: Literal["pedido", "alquiler"]
    target_id: uuid.UUID
    expires_at: datetime | None = None
    instructions: str


class SimulationDecisionIn(ApiModel):
    decision: Literal["approved", "declined"]


class SimulationDecisionOut(ApiModel):
    transaction_id: str
