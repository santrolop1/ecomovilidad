"""Valores permitidos, compartidos por modelos (CHECK) y esquemas (validación)."""

from enum import StrEnum


class CartStatus(StrEnum):
    ACTIVE = "active"
    CONVERTED = "converted"
    ABANDONED = "abandoned"


class OrderStatus(StrEnum):
    PENDING = "pending"  # creado; unidades reservadas a la espera del pago
    PAID = "paid"  # pago aprobado por la pasarela; unidades descontadas y factura emitida
    CONFIRMED = "confirmed"  # histórico: pedidos confirmados a mano antes de los pagos
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class AssetKind(StrEnum):
    BIKE = "bicicleta"
    SCOOTER = "patineta"
    DRONE = "dron"
    DELIVERY = "domicilio"


class DeliveryStatus(StrEnum):
    CREATED = "creado"  # pedido pagado, sin domiciliario
    ASSIGNED = "asignado"
    PICKING_UP = "en_recogida"
    IN_TRANSIT = "en_transito"
    DELIVERED = "entregado"  # validada con código QR o firma
    FAILED = "fallido"


class DeliveryProof(StrEnum):
    QR = "qr"
    SIGNATURE = "firma"


class MovementKind(StrEnum):
    INITIAL = "saldo_inicial"  # unidades que ya existían al empezar el registro
    IN = "entrada"  # el panel aumenta las unidades físicas
    OUT = "salida"  # el panel reduce las unidades físicas (daño, pérdida, traslado…)
    SALE = "venta"  # pago aprobado: las unidades salen del inventario
    RETURN = "devolucion"  # reembolso: las unidades vendidas vuelven


class RentalStatus(StrEnum):
    PENDING = "pending"  # unidad apartada a la espera del pago
    CONFIRMED = "confirmed"  # pagado
    ACTIVE = "active"  # entregado al cliente
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FulfillmentMethod(StrEnum):
    DELIVERY = "domicilio"
    PICKUP = "recogida"


class PaymentMethod(StrEnum):
    PSE = "pse"
    CARD = "tarjeta"
    WALLET = "billetera"


class ConsentPurpose(StrEnum):
    REGISTRATION = "registro"
    ORDER = "pedido"
    RENTAL = "alquiler"


class PaymentStatus(StrEnum):
    """Mismos estados que una transacción de Wompi, en minúsculas."""

    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    VOIDED = "voided"
    ERROR = "error"


class RentalUnitStatus(StrEnum):
    OPERATIONAL = "operativo"
    MAINTENANCE = "mantenimiento"
    RETIRED = "retirado"


class RentalRateUnit(StrEnum):
    HOUR = "hora"
    DAY = "dia"


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
