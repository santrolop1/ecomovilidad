import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import NotFoundError
from app.models import Delivery, Order
from app.models.enums import DeliveryStatus
from app.modules.admin import repository as repo
from app.modules.admin.common import PAGE_SIZE
from app.modules.admin.schemas import Page
from app.modules.domicilios.schemas import AdminDeliveryOut, AdminDeliverySummaryOut, DeliveryEventOut
from app.modules.domicilios.service import ASSIGNABLE, TRANSITIONS


def _summary(delivery: Delivery) -> AdminDeliverySummaryOut:
    order = delivery.order
    return AdminDeliverySummaryOut(
        id=delivery.id,
        order_id=delivery.order_id,
        status=delivery.status,
        courier_name=delivery.courier.name if delivery.courier else None,
        contact_name=order.contact_name,
        delivery_city=order.delivery_city,
        branch_name=order.branch.name,
        scheduled_date=order.scheduled_date,
        time_slot=order.time_slot,
        updated_at=delivery.updated_at,
    )


def list_deliveries(
    db: Session, *, page: int, query: str | None, status: DeliveryStatus | None
) -> Page[AdminDeliverySummaryOut]:
    stmt = (
        select(Delivery)
        .join(Order, Order.id == Delivery.order_id)
        .options(selectinload(Delivery.order))
        .order_by(Order.scheduled_date.desc(), Order.time_slot.desc(), Delivery.id)
    )
    if status:
        stmt = stmt.where(Delivery.status == status)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(or_(Order.contact_name.ilike(like), Order.delivery_city.ilike(like)))
    rows, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    return Page(items=[_summary(d) for d in rows], total=total, page=page, page_size=PAGE_SIZE)


def get_delivery(db: Session, delivery_id: uuid.UUID) -> AdminDeliveryOut:
    delivery = db.scalar(
        select(Delivery)
        .where(Delivery.id == delivery_id)
        .options(selectinload(Delivery.order), selectinload(Delivery.events))
    )
    if delivery is None:
        raise NotFoundError("El domicilio no existe.")
    order = delivery.order
    status = DeliveryStatus(delivery.status)
    return AdminDeliveryOut(
        **_summary(delivery).model_dump(),
        courier_id=delivery.courier_id,
        contact_phone=order.contact_phone,
        delivery_address=order.delivery_address,
        tracking_token=delivery.tracking_token,
        proof_method=delivery.proof_method,
        signer_name=delivery.signer_name,
        signature_image=delivery.signature_image,
        failure_reason=delivery.failure_reason,
        delivered_at=delivery.delivered_at,
        events=[DeliveryEventOut(status=e.status, note=e.note, created_at=e.created_at) for e in delivery.events],
        allowed_transitions=sorted(TRANSITIONS[status]),
        can_validate=status == DeliveryStatus.IN_TRANSIT,
        can_assign=status in ASSIGNABLE,
    )
