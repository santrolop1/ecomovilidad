"""Valores permitidos, compartidos por modelos (CHECK) y esquemas (validación)."""

from enum import StrEnum


class CartStatus(StrEnum):
    ACTIVE = "active"
    CONVERTED = "converted"
    ABANDONED = "abandoned"


class OrderStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class RentalStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FulfillmentMethod(StrEnum):
    DELIVERY = "domicilio"
    PICKUP = "recogida"


class PaymentMethod(StrEnum):
    PSE = "pse"
    CARD = "tarjeta"
    WALLET = "billetera"


class BranchService(StrEnum):
    SALE = "venta"
    RENTAL = "alquiler"
    MAINTENANCE = "mantenimiento"
    PICKUP = "recogida"
    RETURN = "devolucion"


# Alcance operativo: área metropolitana de Bucaramanga.
SERVICE_AREA_CITIES = ("Bucaramanga", "Floridablanca", "Girón", "Piedecuesta")


def sql_in(values: tuple[str, ...] | type[StrEnum]) -> str:
    """Lista SQL para constraints CHECK: ('a', 'b')."""
    items = [v.value for v in values] if isinstance(values, type) else list(values)
    return "(" + ", ".join(f"'{item}'" for item in items) + ")"
