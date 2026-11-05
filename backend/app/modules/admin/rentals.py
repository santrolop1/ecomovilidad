import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Rental, RentalUnit, User
from app.models.enums import MaintenanceLogKind, RentalStatus, RentalUnitStatus
from app.modules.admin import repository as repo
from app.modules.admin.common import PAGE_SIZE
from app.modules.admin.payments import payments_for
from app.modules.admin.schemas import AdminRentalOut, Page
from app.modules.alquiler import maintenance
from app.modules.alquiler.models import HOLDING_STATUSES
from app.modules.alquiler.schemas import RentalUnitOut
from app.modules.inventario.reservations import now_utc
from app.modules.pagos.queries import payment_info
from app.modules.reembolsos.service import latest_request, refund_out

# Pagado → entregado → devuelto. Un alquiler pagado no se cancela aquí: requiere reembolso (CU-15).
ALLOWED_TRANSITIONS: dict[RentalStatus, set[RentalStatus]] = {
    RentalStatus.PENDING: {RentalStatus.CANCELLED},
    RentalStatus.CONFIRMED: {RentalStatus.ACTIVE},
    RentalStatus.ACTIVE: {RentalStatus.COMPLETED},
    RentalStatus.COMPLETED: set(),
    RentalStatus.CANCELLED: set(),
}
LABELS = {
    RentalStatus.PENDING: "pendiente de pago",
    RentalStatus.CONFIRMED: "pagado",
    RentalStatus.ACTIVE: "entregado",
    RentalStatus.COMPLETED: "devuelto",
    RentalStatus.CANCELLED: "cancelado",
}


def _to_out(db: Session, rental: Rental, user: User, *, detail: bool) -> AdminRentalOut:
    info = payment_info(db, rental_ids=[rental.id]).get(rental.id) if detail else None
    return AdminRentalOut(
        id=rental.id,
        status=rental.status,
        user_email=user.email,
        user_name=f"{user.first_name} {user.last_name}",
        product_name=rental.product.name,
        branch_name=rental.branch.name,
        unit_code=rental.unit.code if rental.unit else None,
        start_at=rental.start_at,
        end_at=rental.end_at,
        price=rental.price,
        created_at=rental.created_at,
        payments=payments_for(db, rental_id=rental.id) if detail else [],
        refund_request=refund_out(latest_request(db, rental_id=rental.id)) if detail else None,
        invoice=info.invoice if info else None,
        allowed_transitions=sorted(ALLOWED_TRANSITIONS[RentalStatus(rental.status)]),
    )


def list_rentals(db: Session, *, page: int, status: RentalStatus | None) -> Page[AdminRentalOut]:
    stmt = select(Rental).order_by(Rental.start_at.desc())
    if status:
        stmt = stmt.where(Rental.status == status)
    rentals, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_([r.user_id for r in rentals])))}
    return Page(
        items=[_to_out(db, r, users[r.user_id], detail=False) for r in rentals],
        total=total,
        page=page,
        page_size=PAGE_SIZE,
    )


def get_rental(db: Session, rental_id: uuid.UUID) -> AdminRentalOut:
    rental = db.scalars(select(Rental).where(Rental.id == rental_id)).unique().one_or_none()
    if rental is None:
        raise NotFoundError("El alquiler no existe.")
    return _to_out(db, rental, db.get(User, rental.user_id), detail=True)


def change_status(db: Session, rental_id: uuid.UUID, new_status: RentalStatus) -> None:
    rental = db.scalars(select(Rental).where(Rental.id == rental_id).with_for_update(of=Rental)).unique().one_or_none()
    if rental is None:
        raise NotFoundError("El alquiler no existe.")
    current = RentalStatus(rental.status)
    if new_status == current:
        return
    if new_status not in ALLOWED_TRANSITIONS[current]:
        if current == RentalStatus.CONFIRMED and new_status == RentalStatus.CANCELLED:
            raise ConflictError("Un alquiler pagado no se puede cancelar aquí: requiere reembolso (pendiente, CU-15).")
        raise ConflictError(f"Un alquiler {LABELS[current]} no puede pasar a {LABELS[new_status]}.")
    rental.status = new_status
    db.commit()


def list_units(db: Session) -> list[RentalUnitOut]:
    now = now_utc()
    next_start = dict(
        db.execute(
            select(Rental.rental_unit_id, func.min(Rental.start_at))
            .where(Rental.status.in_(HOLDING_STATUSES), Rental.end_at > now)
            .group_by(Rental.rental_unit_id)
        ).all()
    )
    units = db.scalars(select(RentalUnit).order_by(RentalUnit.code)).unique()
    return [
        RentalUnitOut(
            id=u.id,
            code=u.code,
            status=u.status,
            product_id=u.product_id,
            product_name=u.product.name,
            branch_id=u.branch_id,
            branch_name=u.branch.name,
            is_demo=u.is_demo,
            next_rental_start=next_start.get(u.id),
            usage_unit=u.usage_unit,
            usage_value=float(u.usage_value),
            service_threshold=u.service_threshold,
            usage_percent=int(maintenance.usage_ratio(u) * 100),
            service_alert=maintenance.service_alert(u),
        )
        for u in units
    ]


def get_unit(db: Session, unit_id: uuid.UUID) -> RentalUnitOut:
    unit = next((u for u in list_units(db) if u.id == unit_id), None)
    if unit is None:
        raise NotFoundError("La unidad no existe.")
    return unit


def set_unit_status(db: Session, unit_id: uuid.UUID, status: RentalUnitStatus, user_id: uuid.UUID) -> RentalUnitOut:
    unit = maintenance.lock_unit(db, unit_id)
    previous = RentalUnitStatus(unit.status)
    if status == RentalUnitStatus.OPERATIONAL and maintenance.usage_ratio(unit) >= maintenance.BLOCK_RATIO:
        raise ConflictError("La unidad llegó a su límite de uso: registra el mantenimiento para que vuelva a operar.")
    if status != RentalUnitStatus.OPERATIONAL:
        pending = db.scalar(
            select(func.count(Rental.id)).where(
                Rental.rental_unit_id == unit.id, Rental.status.in_(HOLDING_STATUSES), Rental.end_at > now_utc()
            )
        )
        if pending:
            raise ConflictError("La unidad tiene alquileres vigentes. Termínalos o cancélalos antes de retirarla.")
    unit.status = status
    if status != previous:
        if status == RentalUnitStatus.MAINTENANCE:
            maintenance.log(db, unit, MaintenanceLogKind.STARTED, user_id)
        elif previous == RentalUnitStatus.MAINTENANCE:
            maintenance.log(
                db, unit, MaintenanceLogKind.FINISHED, user_id, note=f"Pasa a {status.value} sin reiniciar el uso."
            )
    db.commit()
    return get_unit(db, unit.id)
