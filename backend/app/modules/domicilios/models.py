from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import DeliveryCarrier, DeliveryProof, DeliveryStatus, sql_in

if TYPE_CHECKING:
    from app.modules.pedidos.models import Order
    from app.modules.telemetria.models import GpsDevice


class Courier(UUIDPrimaryKey, Timestamps, Base):
    """Domiciliario. No inicia sesión: el panel registra su avance."""

    __tablename__ = "couriers"

    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class Delivery(UUIDPrimaryKey, Timestamps, Base):
    """Domicilio de un pedido pagado (RF 5.3)."""

    __tablename__ = "deliveries"
    __table_args__ = (
        CheckConstraint(f"status IN {sql_in(DeliveryStatus)}", name="valid_status"),
        CheckConstraint(f"proof_method IS NULL OR proof_method IN {sql_in(DeliveryProof)}", name="valid_proof"),
        CheckConstraint("status <> 'entregado' OR proof_method IS NOT NULL", name="delivered_requires_proof"),
        CheckConstraint(f"carrier IN {sql_in(DeliveryCarrier)}", name="valid_carrier"),
        # Lo lleva un domiciliario o un dron, nunca los dos.
        CheckConstraint("carrier = 'dron' OR drone_device_id IS NULL", name="courier_without_drone"),
        CheckConstraint("carrier = 'domiciliario' OR courier_id IS NULL", name="drone_without_courier"),
        # Un dron solo vuela con punto de entrega, y su prueba exige que haya liberado el paquete.
        CheckConstraint(
            "drone_device_id IS NULL OR (destination_latitude IS NOT NULL AND destination_longitude IS NOT NULL)",
            name="drone_requires_destination",
        ),
        CheckConstraint(
            "proof_method IS DISTINCT FROM 'dron' OR dropped_at IS NOT NULL", name="drone_proof_requires_drop"
        ),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), unique=True)
    courier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("couriers.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(20), default=DeliveryStatus.CREATED, server_default="creado", index=True)
    # Enlace público de seguimiento: quien lo tiene ve el avance, nunca datos personales.
    tracking_token: Mapped[str] = mapped_column(String(64), unique=True)
    # Código que el cliente muestra (QR) al recibir. El panel no lo ve: lo pide.
    confirmation_code: Mapped[str] = mapped_column(String(6))
    proof_method: Mapped[str | None] = mapped_column(String(10))
    signer_name: Mapped[str | None] = mapped_column(String(120))
    signature_image: Mapped[str | None] = mapped_column(Text)
    failure_reason: Mapped[str | None] = mapped_column(String(300))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Domicilio con dron: el dron (un dispositivo GPS) y el punto exacto de entrega.
    carrier: Mapped[str] = mapped_column(
        String(15), default=DeliveryCarrier.COURIER, server_default=DeliveryCarrier.COURIER
    )
    drone_device_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("gps_devices.id", ondelete="RESTRICT"), index=True
    )
    destination_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    destination_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    # Evidencia del dron: dónde y cuándo liberó el paquete, a cuántos metros del destino.
    drop_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    drop_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    drop_distance_m: Mapped[int | None] = mapped_column(Integer)
    dropped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    customer_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped[Order] = relationship()
    courier: Mapped[Courier | None] = relationship(lazy="joined")
    drone: Mapped[GpsDevice | None] = relationship(lazy="joined")
    events: Mapped[list[DeliveryEvent]] = relationship(
        back_populates="delivery",
        cascade="all, delete-orphan",
        order_by="DeliveryEvent.created_at, DeliveryEvent.id",
    )


class DeliveryEvent(UUIDPrimaryKey, Base):
    """Historial de estados. Solo se agregan filas."""

    __tablename__ = "delivery_events"

    delivery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deliveries.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    note: Mapped[str | None] = mapped_column(String(300))
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    delivery: Mapped[Delivery] = relationship(back_populates="events")
