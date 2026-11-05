"""Importa todos los modelos para registrar sus tablas en Base.metadata."""

from app.modules.alquiler.models import Rental, RentalRate, RentalUnit
from app.modules.autenticacion.models import User, UserSession
from app.modules.autenticacion.security_records import ConsentRecord, LoginAttempt, PasswordResetToken
from app.modules.carrito.models import Cart, CartItem
from app.modules.catalogo.models import Category, Product
from app.modules.inventario.models import Inventory, InventoryMovement
from app.modules.inventario.reservation_models import CartReservation
from app.modules.pagos.models import Invoice, Payment, PaymentEvent, RefundRequest
from app.modules.pedidos.models import Order, OrderItem
from app.modules.sucursales.models import Branch

__all__ = [
    "Branch",
    "Cart",
    "CartItem",
    "CartReservation",
    "ConsentRecord",
    "Category",
    "Inventory",
    "InventoryMovement",
    "Invoice",
    "LoginAttempt",
    "Order",
    "OrderItem",
    "PasswordResetToken",
    "Payment",
    "PaymentEvent",
    "Product",
    "RefundRequest",
    "Rental",
    "RentalRate",
    "RentalUnit",
    "User",
    "UserSession",
]
