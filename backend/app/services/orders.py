"""Pedidos con control de inventario transaccional.

- Crear (`pending`): las unidades pasan de disponibles a reservadas en UNA
  sucursal (la elegida para recoger, o la primera con stock completo).
- Confirmar (`confirmed`): sin cambio de inventario. Hoy lo hace un
  administrador; con pagos lo hará la pasarela.
- Cancelar (`cancelled`): las reservadas vuelven a estar disponibles.
- Completar (`completed`): las reservadas salen del inventario (vendidas).
Sin pagos reales en esta fase.
"""

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Inventory, Order, OrderItem, User
from app.models.enums import SERVICE_AREA_CITIES, BranchService, CartStatus, FulfillmentMethod, OrderStatus
from app.repositories import orders as repo
from app.repositories.branches import get_active_branch
from app.repositories.carts import get_active_cart
from app.repositories.catalog import get_products
from app.schemas.order import OrderCreateIn, OrderItemOut, OrderOut

from .errors import ConflictError, NotFoundError, ServiceError

BOGOTA = ZoneInfo("America/Bogota")
# Franjas de entrega y recogida (RF 7.1). La capacidad por franja es trabajo pendiente.
TIME_SLOTS = {
    "slot-08": "08:00-10:00",
    "slot-10": "10:00-12:00",
    "slot-12": "12:00-14:00",
    "slot-14": "14:00-16:00",
    "slot-16": "16:00-18:00",
}
SHIPPING_COST = 0  # El SRS no define tarifas de envío.

ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.COMPLETED: set(),
}
STATUS_LABELS = {
    OrderStatus.PENDING: "pendiente",
    OrderStatus.CONFIRMED: "confirmado",
    OrderStatus.CANCELLED: "cancelado",
    OrderStatus.COMPLETED: "completado",
}


def to_order_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        status=order.status,
        subtotal=order.subtotal,
        shipping_cost=order.shipping_cost,
        total=order.total,
        branch_id=order.branch_id,
        fulfillment_method=order.fulfillment_method,
        scheduled_date=order.scheduled_date,
        time_slot=order.time_slot,
        payment_method=order.payment_method,
        created_at=order.created_at,
        items=[
            OrderItemOut(
                product_id=i.product_id,
                name=i.product.name,
                quantity=i.quantity,
                unit_price=i.unit_price,
                subtotal=i.subtotal,
            )
            for i in order.items
        ],
    )


def _validate_schedule(data: OrderCreateIn) -> None:
    if data.fulfillment.date < datetime.now(BOGOTA).date():
        raise ServiceError("La fecha de entrega no puede ser anterior a hoy.")
    if data.fulfillment.time_slot_id not in TIME_SLOTS:
        raise ServiceError("La franja horaria no es válida.")
    city = data.fulfillment.city
    if data.fulfillment.method == FulfillmentMethod.DELIVERY and city not in SERVICE_AREA_CITIES:
        raise ServiceError("Solo hacemos domicilios en Bucaramanga, Floridablanca, Girón y Piedecuesta.")


def _choose_branch(
    data: OrderCreateIn, quantities: dict[uuid.UUID, int], stock: dict[uuid.UUID, dict[uuid.UUID, Inventory]]
) -> uuid.UUID:
    def has_all(branch_id: uuid.UUID) -> bool:
        return all(
            (inv := stock[pid].get(branch_id)) is not None and inv.available_quantity >= qty
            for pid, qty in quantities.items()
        )

    if data.fulfillment.method == FulfillmentMethod.PICKUP:
        branch_id = data.fulfillment.branch_id
        if branch_id is None:
            raise ServiceError("Elige la sucursal de recogida.")
        if not has_all(branch_id):
            raise ConflictError("La sucursal elegida no tiene unidades suficientes. Prueba con otra sucursal.")
        return branch_id

    # Domicilio: primera sucursal (orden estable) con todas las unidades.
    # Pendiente: elegir la más cercana con PostGIS cuando haya geocodificación.
    candidates = sorted({b for per_branch in stock.values() for b in per_branch})
    for branch_id in candidates:
        if has_all(branch_id):
            return branch_id
    raise ConflictError("No hay unidades suficientes en una misma sucursal para este pedido.")


def create_order(db: Session, user: User, data: OrderCreateIn) -> OrderOut:
    _validate_schedule(data)

    quantities: dict[uuid.UUID, int] = {}
    for item in data.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    products = get_products(db, list(quantities))
    missing = set(quantities) - set(products)
    if missing:
        raise NotFoundError("Uno de los productos ya no está disponible.")

    # Bloqueo de inventario hasta el commit: dos pedidos no pueden vender la misma unidad.
    stock: dict[uuid.UUID, dict[uuid.UUID, Inventory]] = {pid: {} for pid in quantities}
    for inv in repo.lock_inventory(db, list(quantities)):
        stock[inv.product_id][inv.branch_id] = inv

    branch_id = _choose_branch(data, quantities, stock)
    branch = get_active_branch(db, branch_id)
    if branch is None:
        raise NotFoundError("La sucursal no existe.")
    if data.fulfillment.method == FulfillmentMethod.PICKUP and BranchService.PICKUP not in branch.services:
        raise ServiceError("Esa sucursal no ofrece recogida de pedidos.")

    order_items = []
    for pid, qty in quantities.items():
        inv = stock[pid][branch_id]
        inv.available_quantity -= qty
        inv.reserved_quantity += qty
        price = products[pid].price  # precio del catálogo, nunca el que envía el cliente
        order_items.append(OrderItem(product_id=pid, quantity=qty, unit_price=price, subtotal=price * qty))

    subtotal = sum(i.subtotal for i in order_items)
    customer, fulfillment = data.customer, data.fulfillment
    order = Order(
        user_id=user.id,
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        shipping_cost=SHIPPING_COST,
        total=subtotal + SHIPPING_COST,
        branch_id=branch_id,
        fulfillment_method=fulfillment.method,
        delivery_address=fulfillment.address if fulfillment.method == FulfillmentMethod.DELIVERY else None,
        delivery_city=fulfillment.city if fulfillment.method == FulfillmentMethod.DELIVERY else None,
        scheduled_date=fulfillment.date,
        time_slot=fulfillment.time_slot_id,
        payment_method=data.payment_method,
        contact_name=customer.full_name,
        contact_email=customer.email.lower(),
        contact_phone=customer.phone,
        document_type=customer.document_type,
        document_number=customer.document_number,
        items=order_items,
    )
    db.add(order)

    # El carrito se convierte en pedido: el usuario empieza uno nuevo.
    cart = get_active_cart(db, user.id, for_update=True)
    if cart:
        cart.status = CartStatus.CONVERTED

    db.commit()
    db.refresh(order)
    return to_order_out(order)


def list_orders(db: Session, user: User) -> list[OrderOut]:
    return [to_order_out(o) for o in repo.list_user_orders(db, user.id)]


def get_order(db: Session, user: User, order_id: uuid.UUID) -> OrderOut:
    order = repo.get_user_order(db, user.id, order_id)
    if order is None:  # 404 también si es de otro usuario: no revela su existencia
        raise NotFoundError("El pedido no existe.")
    return to_order_out(order)


def change_status(db: Session, order_id: uuid.UUID, new_status: OrderStatus) -> None:
    """Cambia el estado aplicando el efecto en inventario en la misma transacción."""
    order = (
        db.scalars(
            select(Order).where(Order.id == order_id).options(selectinload(Order.items)).with_for_update(of=Order)
        )
        .unique()
        .one_or_none()
    )
    if order is None:
        raise NotFoundError("El pedido no existe.")
    current = OrderStatus(order.status)
    if new_status == current:
        return
    if new_status not in ALLOWED_TRANSITIONS[current]:
        raise ConflictError(f"Un pedido {STATUS_LABELS[current]} no puede pasar a {STATUS_LABELS[new_status]}.")

    if new_status in (OrderStatus.CANCELLED, OrderStatus.COMPLETED):
        rows = {
            inv.product_id: inv
            for inv in repo.lock_inventory(db, [i.product_id for i in order.items])
            if inv.branch_id == order.branch_id
        }
        for item in order.items:
            inv = rows.get(item.product_id)
            if inv is None or inv.reserved_quantity < item.quantity:
                raise ConflictError("El inventario reservado de este pedido no coincide. Revisa las existencias.")
            inv.reserved_quantity -= item.quantity
            if new_status == OrderStatus.CANCELLED:
                inv.available_quantity += item.quantity  # vuelve a estar a la venta
            else:
                inv.total_quantity -= item.quantity  # sale físicamente del inventario

    order.status = new_status
    db.commit()
