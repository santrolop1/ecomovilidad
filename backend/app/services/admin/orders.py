import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Order
from app.models.enums import OrderStatus
from app.repositories import admin as repo
from app.schemas.admin import AdminOrderDetailOut, AdminOrderItemOut, AdminOrderSummaryOut, OrderUserOut, Page
from app.services.errors import NotFoundError
from app.services.orders import ALLOWED_TRANSITIONS
from app.services.payments.queries import PaymentInfo, payment_info

from .common import PAGE_SIZE
from .payments import payments_for


def order_summary(order: Order, item_count: int) -> AdminOrderSummaryOut:
    return AdminOrderSummaryOut(
        id=order.id,
        status=order.status,
        total=order.total,
        item_count=item_count,
        contact_name=order.contact_name,
        user_email=order.user.email,
        fulfillment_method=order.fulfillment_method,
        branch_name=order.branch.name,
        scheduled_date=order.scheduled_date,
        created_at=order.created_at,
    )


def summaries(db: Session, orders: list[Order]) -> list[AdminOrderSummaryOut]:
    counts = repo.order_item_counts(db, [o.id for o in orders])
    return [order_summary(o, counts.get(o.id, 0)) for o in orders]


def list_orders(db: Session, *, page: int, query: str | None, status: OrderStatus | None) -> Page[AdminOrderSummaryOut]:
    stmt = select(Order).options(selectinload(Order.user)).order_by(Order.created_at.desc())
    if status:
        stmt = stmt.where(Order.status == status)
    if query:
        stmt = repo.order_search(stmt, query)
    orders, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    return Page(items=summaries(db, orders), total=total, page=page, page_size=PAGE_SIZE)


def get_order(db: Session, order_id: uuid.UUID) -> AdminOrderDetailOut:
    order = (
        db.scalars(
            select(Order).where(Order.id == order_id).options(selectinload(Order.items), selectinload(Order.user))
        )
        .unique()
        .one_or_none()
    )
    if order is None:
        raise NotFoundError("El pedido no existe.")
    summary = order_summary(order, sum(i.quantity for i in order.items))
    return AdminOrderDetailOut(
        **summary.model_dump(),
        subtotal=order.subtotal,
        shipping_cost=order.shipping_cost,
        payment_method=order.payment_method,
        payment_expires_at=order.payment_expires_at if order.status == OrderStatus.PENDING else None,
        payments=payments_for(db, order_id=order.id),
        invoice=payment_info(db, order_ids=[order.id]).get(order.id, PaymentInfo(None, None)).invoice,
        delivery_address=order.delivery_address,
        delivery_city=order.delivery_city,
        time_slot=order.time_slot,
        contact_email=order.contact_email,
        contact_phone=order.contact_phone,
        document_type=order.document_type,
        document_number=order.document_number,
        branch_id=order.branch_id,
        branch_city=order.branch.city,
        user=OrderUserOut.model_validate(order.user),
        items=[
            AdminOrderItemOut(
                product_id=i.product_id,
                name=i.product.name,
                sku=i.product.sku,
                quantity=i.quantity,
                unit_price=i.unit_price,
                subtotal=i.subtotal,
            )
            for i in order.items
        ],
        updated_at=order.updated_at,
        allowed_transitions=sorted(ALLOWED_TRANSITIONS[OrderStatus(order.status)]),
    )
