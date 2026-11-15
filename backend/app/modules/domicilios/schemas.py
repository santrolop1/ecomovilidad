from __future__ import annotations

import base64
import binascii
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.core.api_model import ApiModel
from app.models.enums import DeliveryCarrier, DeliveryProof, DeliveryStatus

PNG_PREFIX = "data:image/png;base64,"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
MAX_SIGNATURE_CHARS = 300_000


class DeliveryEventOut(ApiModel):
    status: DeliveryStatus
    note: str | None = None
    created_at: datetime


class CustomerDeliveryOut(ApiModel):
    """Lo que ve el dueño del pedido: incluye el código para recibir."""

    status: DeliveryStatus
    tracking_token: str
    carrier: DeliveryCarrier = DeliveryCarrier.COURIER
    confirmation_code: str | None = None
    qr_image: str | None = None
    courier_name: str | None = None
    delivered_at: datetime | None = None
    failure_reason: str | None = None
    # Dron: cuándo liberó el paquete y si el cliente ya puede confirmar que lo recibió.
    dropped_at: datetime | None = None
    drop_distance_m: int | None = None
    can_confirm_receipt: bool = False
    events: list[DeliveryEventOut]


class TrackingPositionOut(ApiModel):
    lat: float
    lng: float
    updated_at: datetime


class TrackingOut(ApiModel):
    """Enlace público: sin dirección, nombre del cliente ni código."""

    status: DeliveryStatus
    carrier: DeliveryCarrier = DeliveryCarrier.COURIER
    courier_first_name: str | None = None
    city: str | None = None
    branch_name: str
    scheduled_date: date
    time_slot: str
    delivered_at: datetime | None = None
    position: TrackingPositionOut | None = None
    events: list[DeliveryEventOut]


class CourierOut(ApiModel):
    id: uuid.UUID
    name: str
    phone: str
    is_active: bool
    open_deliveries: int = 0


class CourierCreateIn(ApiModel):
    name: str = Field(min_length=3, max_length=120)
    phone: str = Field(pattern=r"^\+?[\d\s()-]{7,20}$")


class CourierUpdateIn(ApiModel):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    phone: str | None = Field(default=None, pattern=r"^\+?[\d\s()-]{7,20}$")
    is_active: bool | None = None


class AdminDeliverySummaryOut(ApiModel):
    id: uuid.UUID
    order_id: uuid.UUID
    status: DeliveryStatus
    carrier: DeliveryCarrier
    # Nombre del domiciliario o código del dron.
    courier_name: str | None
    contact_name: str
    delivery_city: str | None
    branch_name: str
    scheduled_date: date
    time_slot: str
    updated_at: datetime


class AdminDeliveryOut(AdminDeliverySummaryOut):
    courier_id: uuid.UUID | None
    contact_phone: str
    delivery_address: str | None
    tracking_token: str
    proof_method: DeliveryProof | None
    signer_name: str | None
    signature_image: str | None
    failure_reason: str | None
    delivered_at: datetime | None
    events: list[DeliveryEventOut]
    allowed_transitions: list[DeliveryStatus]
    can_validate: bool
    can_assign: bool
    drone_device_id: uuid.UUID | None = None
    destination_latitude: float | None = None
    destination_longitude: float | None = None
    drop_latitude: float | None = None
    drop_longitude: float | None = None
    drop_distance_m: int | None = None
    dropped_at: datetime | None = None
    customer_confirmed_at: datetime | None = None
    can_record_drop: bool = False
    # Pasado el plazo sin reclamo del cliente, la evidencia del dron basta para cerrar.
    can_close_with_drone_evidence: bool = False


class AssignCourierIn(ApiModel):
    courier_id: uuid.UUID


class AssignDroneIn(ApiModel):
    """El dron necesita el punto exacto de entrega: el GPS lo usa para probar la entrega."""

    drone_device_id: uuid.UUID
    destination_latitude: float = Field(ge=-90, le=90)
    destination_longitude: float = Field(ge=-180, le=180)


class DeliveryStatusIn(ApiModel):
    status: DeliveryStatus
    note: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def failure_needs_reason(self) -> DeliveryStatusIn:
        if self.status == DeliveryStatus.FAILED and len((self.note or "").strip()) < 3:
            raise ValueError("Escribe por qué falló la entrega.")
        return self


class DeliveryValidationIn(ApiModel):
    method: Literal["qr", "firma", "dron"]
    code: str | None = Field(default=None, max_length=6)
    signer_name: str | None = Field(default=None, min_length=3, max_length=120)
    signature_image: str | None = Field(default=None, max_length=MAX_SIGNATURE_CHARS)

    @field_validator("signature_image")
    @classmethod
    def must_be_png(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.startswith(PNG_PREFIX):
            raise ValueError("La firma debe ser una imagen PNG.")
        try:
            raw = base64.b64decode(value[len(PNG_PREFIX) :], validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("La firma no es válida.") from error
        if not raw.startswith(PNG_MAGIC):
            raise ValueError("La firma debe ser una imagen PNG.")
        return value

    @model_validator(mode="after")
    def proof_is_complete(self) -> DeliveryValidationIn:
        if self.method == "qr" and not self.code:
            raise ValueError("Escribe o escanea el código del cliente.")
        if self.method == "firma" and not (self.signer_name and self.signature_image):
            raise ValueError("La firma requiere el nombre de quien recibe y su trazo.")
        return self


class DropAck(ApiModel):
    """Respuesta al dron cuando avisa que liberó el paquete."""

    dropped_at: datetime
    distance_m: int
