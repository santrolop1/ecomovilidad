"""Pedidos con control de inventario transaccional y pago en línea.

- Crear (`pending`): las unidades pasan de disponibles a reservadas en UNA
  sucursal (la elegida para recoger, o la primera con stock completo) y se abre
  un plazo para pagar (`payment_expires_at`).
- Pagar (`paid`): lo aplica la pasarela (ver services/payments). Las
  reservadas salen del inventario (vendidas) y se emite la factura.
- Vencer sin pago o cancelar (`cancelled`): las reservadas vuelven a estar disponibles.
- Completar (`completed`): entregado o recogido. Si ya se pagó, el inventario no cambia.
- `confirmed` es histórico (pedidos confirmados a mano antes de los pagos).
"""

import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models import Inventory, Order, OrderItem, User
from app.models.enums import (
    SERVICE_AREA_CITIES,
    BranchService,
    CartStatus,
    ConsentPurpose,
    FulfillmentMethod,
    OrderStatus,
)
from app.repositories import orders as repo
from app.repositories.branches import get_active_branch
from app.repositories.carts import get_active_cart
from app.repositories.catalog import get_products
from app.schemas.order import OrderCreateIn, OrderItemOut, OrderOut

from . import consent, reservations
from .errors import ConflictError, NotFoundError, ServiceError
from .payments.queries import PaymentInfo, payment_info

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

# Transiciones que puede hacer un administrador. "Pagado" solo lo pone la
# pasarela, y un pedido pagado no se cancela aquí: requiere reembolso (CU-15).
ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CANCELLED},
    OrderStatus.PAID: {OrderStatus.COMPLETED},
    OrderStatus.CONFIRMED: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.COMPLETED: set(),
}
STATUS_LABELS = {
    OrderStatus.PENDING: "pendiente de pago",
    OrderStatus.PAID: "pagado",
    OrderStatus.CONFIRMED: "confirmado",
    OrderStatus.CANCELLED: "cancelado",
    OrderStatus.COMPLETED: "completado",
}


def to_order_out(order: Order, info: PaymentInfo | None = None) -> OrderOut:
    return OrderOut(
        id=order.id,
        status=order.status,
        subtotal=order.subtotal,
        shipping_cost=order.shipping_cost,
        total=order.total,
        item_count=sum(i.quantity for i in order.items),
        branch_id=order.branch_id,
        branch_name=order.branch.name,
        branch_city=order.branch.city,
        branch_address=order.branch.address,
        fulfillment_method=order.fulfillment_method,
        delivery_address=order.delivery_address,
        delivery_city=order.delivery_city,
        scheduled_date=order.scheduled_date,
        time_slot=order.time_slot,
        payment_method=order.payment_method,
        payment_expires_at=order.payment_expires_at if order.status == OrderStatus.PENDING else None,
        payment=info.payment if info else None,
        invoice=info.invoice if info else None,
        contact_name=order.contact_name,
        contact_email=order.contact_email,
        contact_phone=order.contact_phone,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[
            OrderItemOut(
                product_id=i.product_id,
                slug=i.product.slug,
                name=i.product.name,
                image_url=i.product.image_url,
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
    data: OrderCreateIn,
    quantities: dict[uuid.UUID, int],
    stock: dict[uuid.UUID, dict[uuid.UUID, Inventory]],
    preference: dict[uuid.UUID, int],
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

    # Domicilio: primero la sucursal donde el carrito tenía apartadas más unidades.
    # Pendiente: elegir la más cercana con PostGIS cuando haya geocodificación.
    candidates = sorted(
        {b for per_branch in stock.values() for b in per_branch}, key=lambda b: (-preference.get(b, 0), str(b))
    )
    for branch_id in candidates:
        if has_all(branch_id):
            return branch_id
    raise ConflictError("No hay unidades suficientes en una misma sucursal para este pedido.")


def create_order(db: Session, user: User, data: OrderCreateIn) -> OrderOut:
    """Convierte el carrito reservado en pedido, en UNA transacción:

    1. Bloquea el carrito, sus reservas y el inventario (mismo orden que el carrito).
    2. Si alguna reserva venció, la libera y rechaza el pedido (el cliente revisa el carrito).
    3. Devuelve las unidades de la reserva temporal y, sin soltar los bloqueos,
       las vuelve a apartar para el pedido: nunca cuentan dos veces ni quedan libres.
    """
    _validate_schedule(data)
    consent.ensure_current_policy(data.policy_version)

    quantities: dict[uuid.UUID, int] = {}
    for item in data.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    cart = get_active_cart(db, user.id, for_update=True)
    if cart is None or not cart.items:
        raise ConflictError("Tu carrito está vacío o su reserva venció. Agrega los productos de nuevo.")
    expired = reservations.purge_cart(db, cart)
    if expired:
        db.commit()  # la liberación se conserva aunque el pedido se rechace
        raise ConflictError(
            f"La reserva de {', '.join(expired)} venció y lo quitamos del carrito. Revísalo antes de confirmar."
        )
    if {i.product_id: i.quantity for i in cart.items} != quantities:
        raise ConflictError("Tu carrito cambió. Revísalo antes de confirmar el pedido.")

    products = get_products(db, list(quantities))
    if set(quantities) - set(products):
        raise NotFoundError("Uno de los productos ya no está disponible.")

    stock: dict[uuid.UUID, dict[uuid.UUID, Inventory]] = {pid: {} for pid in quantities}
    for inv in repo.lock_inventory(db, list(quantities)):
        stock[inv.product_id][inv.branch_id] = inv

    # Reserva temporal → libre (en memoria, filas bloqueadas): preferencia de sucursal.
    preference: dict[uuid.UUID, int] = {}
    for item in cart.items:
        for reservation in item.reservations:
            inv = reservation.inventory
            inv.reserved_quantity -= reservation.quantity
            inv.available_quantity += reservation.quantity
            preference[inv.branch_id] = preference.get(inv.branch_id, 0) + reservation.quantity
        item.reservations.clear()

    branch_id = _choose_branch(data, quantities, stock, preference)
    branch = get_active_branch(db, branch_id)
    if branch is None:
        raise NotFoundError("La sucursal no existe.")
    if data.fulfillment.method == FulfillmentMethod.PICKUP and BranchService.PICKUP not in branch.services:
        raise ServiceError("Esa sucursal no ofrece recogida de pedidos.")

    # Libre → reserva del pedido.
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
        payment_expires_at=reservations.now_utc() + timedelta(minutes=get_settings().payment_window_minutes),
        contact_name=customer.full_name,
        contact_email=customer.email.lower(),
        contact_phone=customer.phone,
        document_type=customer.document_type,
        document_number=customer.document_number,
        items=order_items,
    )
    db.add(order)
    db.flush()
    consent.record_consent(db, user.id, ConsentPurpose.ORDER, order_id=order.id)

    # El carrito se convierte en pedido: el usuario empieza uno nuevo.
    cart.status = CartStatus.CONVERTED

    db.commit()
    db.refresh(order)
    return to_order_out(order)


def list_orders(db: Session, user: User) -> list[OrderOut]:
    from .refunds import latest_request, refund_out

    orders = repo.list_user_orders(db, user.id)
    info = payment_info(db, order_ids=[o.id for o in orders])
    return [
        to_order_out(o, info.get(o.id)).model_copy(
            update={"refund_request": refund_out(latest_request(db, order_id=o.id))}
        )
        for o in orders
    ]


def get_order(db: Session, user: User, order_id: uuid.UUID) -> OrderOut:
    order = repo.get_user_order(db, user.id, order_id)
    if order is None:  # 404 también si es de otro usuario: no revela su existencia
        raise NotFoundError("El pedido no existe.")
    from .refunds import latest_request, refund_out

    out = to_order_out(order, payment_info(db, order_ids=[order.id]).get(order.id))
    return out.model_copy(update={"refund_request": refund_out(latest_request(db, order_id=order.id))})


def _locked_order_stock(db: Session, order: Order) -> dict[uuid.UUID, Inventory]:
    """Bloquea las filas de inventario del pedido en su sucursal y verifica que
    sigan teniendo apartadas sus unidades."""
    rows = {
        inv.product_id: inv
        for inv in repo.lock_inventory(db, [i.product_id for i in order.items])
        if inv.branch_id == order.branch_id
    }
    for item in order.items:
        inv = rows.get(item.product_id)
        if inv is None or inv.reserved_quantity < item.quantity:
            raise ConflictError("El inventario reservado de este pedido no coincide. Revisa las existencias.")
    return rows


def release_order_stock(db: Session, order: Order) -> None:
    """Reservadas → disponibles (pedido cancelado o vencido sin pago)."""
    rows = _locked_order_stock(db, order)
    for item in order.items:
        rows[item.product_id].reserved_quantity -= item.quantity
        rows[item.product_id].available_quantity += item.quantity


def settle_order_stock(db: Session, order: Order) -> None:
    """Reservadas → fuera del inventario (vendidas). Una sola vez por pedido."""
    if order.stock_settled_at is not None:
        return
    rows = _locked_order_stock(db, order)
    for item in order.items:
        rows[item.product_id].reserved_quantity -= item.quantity
        rows[item.product_id].total_quantity -= item.quantity
    order.stock_settled_at = reservations.now_utc()


def restock_order(db: Session, order: Order) -> None:
    """Pedido pagado que se reembolsa sin entregar: las unidades vendidas vuelven al inventario."""
    if order.stock_settled_at is None:
        return
    rows = {
        inv.product_id: inv
        for inv in repo.lock_inventory(db, [i.product_id for i in order.items])
        if inv.branch_id == order.branch_id
    }
    for item in order.items:
        inv = rows.get(item.product_id)
        if inv is None:
            raise ConflictError("No encontramos el inventario de este pedido en su sucursal.")
        inv.total_quantity += item.quantity
        inv.available_quantity += item.quantity
    order.stock_settled_at = None


def lock_order(db: Session, order_id: uuid.UUID) -> Order | None:
    return (
        db.scalars(
            select(Order).where(Order.id == order_id).options(selectinload(Order.items)).with_for_update(of=Order)
        )
        .unique()
        .one_or_none()
    )


def change_status(db: Session, order_id: uuid.UUID, new_status: OrderStatus) -> None:
    """Cambio de estado del panel, con su efecto en inventario en la misma transacción."""
    order = lock_order(db, order_id)
    if order is None:
        raise NotFoundError("El pedido no existe.")
    current = OrderStatus(order.status)
    if new_status == current:
        return
    if new_status not in ALLOWED_TRANSITIONS[current]:
        if current == OrderStatus.PAID and new_status == OrderStatus.CANCELLED:
            raise ConflictError("Un pedido pagado no se puede cancelar aquí: requiere reembolso (pendiente, CU-15).")
        raise ConflictError(f"Un pedido {STATUS_LABELS[current]} no puede pasar a {STATUS_LABELS[new_status]}.")

    if new_status == OrderStatus.CANCELLED:
        release_order_stock(db, order)
    elif new_status == OrderStatus.COMPLETED:
        settle_order_stock(db, order)  # no hace nada si el pago ya lo descontó

    order.status = new_status
    db.commit()
