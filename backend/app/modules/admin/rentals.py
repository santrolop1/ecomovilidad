import uuid
from decimal import Decimal

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

# Pagado → entregado (salida registrada) → devuelto (entrada registrada).
# Un alquiler pagado no se cancela aquí: requiere reembolso (CU-15).
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


def _name(db: Session, user_id: uuid.UUID | None) -> str | None:
    user = db.get(User, user_id) if user_id else None
    return f"{user.first_name} {user.last_name}" if user else None


def _other_rental_out(db: Session, rental: Rental) -> Rental | None:
    """Otro alquiler con la misma unidad que salió y no ha vuelto."""
    if rental.rental_unit_id is None:
        return None
    return (
        db.scalars(
            select(Rental).where(
                Rental.rental_unit_id == rental.rental_unit_id,
                Rental.status == RentalStatus.ACTIVE,
                Rental.id != rental.id,
            )
        )
        .unique()
        .first()
    )


def check_out_blocker(db: Session, rental: Rental) -> str | None:
    unit = rental.unit
    if unit is not None and not maintenance.can_operate(unit):
        return f"La unidad {unit.code} requiere mantenimiento: no puede salir."
    if _other_rental_out(db, rental) is not None:
        return f"La unidad {unit.code} aún no ha vuelto a la sucursal con el cliente anterior."
    return None


def _to_out(db: Session, rental: Rental, user: User, *, detail: bool) -> AdminRentalOut:
    info = payment_info(db, rental_ids=[rental.id]).get(rental.id) if detail else None
    blocker = check_out_blocker(db, rental) if detail and rental.status == RentalStatus.CONFIRMED else None
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
        usage_unit=rental.unit.usage_unit if rental.unit else None,
        checked_out_at=rental.checked_out_at,
        checked_out_by_name=_name(db, rental.checked_out_by) if detail else None,
        returned_at=rental.returned_at,
        returned_by_name=_name(db, rental.returned_by) if detail else None,
        return_usage=float(rental.return_usage) if rental.return_usage is not None else None,
        can_check_out=rental.status == RentalStatus.CONFIRMED and blocker is None,
        can_check_in=rental.status == RentalStatus.ACTIVE,
        check_out_blocker=blocker,
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


def _lock_rental(db: Session, rental_id: uuid.UUID) -> Rental:
    rental = db.scalars(select(Rental).where(Rental.id == rental_id).with_for_update(of=Rental)).unique().one_or_none()
    if rental is None:
        raise NotFoundError("El alquiler no existe.")
    return rental


def _check_out(db: Session, rental: Rental, user_id: uuid.UUID | None, note: str | None) -> None:
    """La sucursal entrega el vehículo: desde ahora la unidad aparece como no disponible."""
    if rental.status != RentalStatus.CONFIRMED:
        raise ConflictError("Solo sale un alquiler pagado que aún no se ha entregado.")
    if rental.rental_unit_id is not None:
        maintenance.lock_unit(db, rental.rental_unit_id)
    blocker = check_out_blocker(db, rental)
    if blocker:
        raise ConflictError(blocker)
    rental.status = RentalStatus.ACTIVE
    rental.checked_out_at = now_utc()
    rental.checked_out_by = user_id


def _check_in(db: Session, rental: Rental, user_id: uuid.UUID | None, usage: float | None, note: str | None) -> None:
    """La sucursal recibe el vehículo y anota el uso; puede mandarlo a mantenimiento."""
    if rental.status != RentalStatus.ACTIVE:
        raise ConflictError("Solo se recibe un vehículo que salió con el cliente.")
    rental.status = RentalStatus.COMPLETED
    rental.returned_at = now_utc()
    rental.returned_by = user_id
    if rental.checked_out_at is None:  # alquileres entregados antes del registro de salida
        rental.checked_out_at = rental.returned_at
    if usage is not None:
        rental.return_usage = Decimal(str(round(usage, 1)))
    if rental.rental_unit_id is not None and usage:
        unit = maintenance.lock_unit(db, rental.rental_unit_id)
        detail = f" · {note.strip()}" if note and note.strip() else ""
        maintenance.add_usage(db, unit, usage, f"Devolución del alquiler{detail}", user_id)


def check_out(db: Session, rental_id: uuid.UUID, user_id: uuid.UUID, note: str | None = None) -> None:
    rental = _lock_rental(db, rental_id)
    _check_out(db, rental, user_id, note)
    db.commit()


def check_in(db: Session, rental_id: uuid.UUID, user_id: uuid.UUID, usage: float, note: str | None = None) -> None:
    rental = _lock_rental(db, rental_id)
    _check_in(db, rental, user_id, usage, note)
    db.commit()


def change_status(
    db: Session, rental_id: uuid.UUID, new_status: RentalStatus, user_id: uuid.UUID | None = None
) -> None:
    rental = _lock_rental(db, rental_id)
    current = RentalStatus(rental.status)
    if new_status == current:
        return
    if new_status not in ALLOWED_TRANSITIONS[current]:
        if current == RentalStatus.CONFIRMED and new_status == RentalStatus.CANCELLED:
            raise ConflictError("Un alquiler pagado no se puede cancelar aquí: requiere reembolso (pendiente, CU-15).")
        raise ConflictError(f"Un alquiler {LABELS[current]} no puede pasar a {LABELS[new_status]}.")
    if new_status == RentalStatus.ACTIVE:
        _check_out(db, rental, user_id, None)
    elif new_status == RentalStatus.COMPLETED:
        _check_in(db, rental, user_id, None, None)
    else:
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
    out = {
        r.rental_unit_id: r
        for r in db.scalars(
            select(Rental).where(Rental.status == RentalStatus.ACTIVE, Rental.rental_unit_id.is_not(None))
        ).unique()
    }
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
            service_interval_days=u.service_interval_days,
            last_service_at=u.last_service_at,
            next_service_at=maintenance.next_service_at(u),
            days_to_service=maintenance.days_to_service(u, now),
            service_reason=maintenance.service_reason(u),
            availability=_availability(u, out.get(u.id)),
            current_rental_id=out[u.id].id if u.id in out else None,
            checked_out_at=out[u.id].checked_out_at if u.id in out else None,
            expected_return_at=out[u.id].end_at if u.id in out else None,
        )
        for u in units
    ]


def _availability(unit: RentalUnit, rental_out: Rental | None) -> str:
    if unit.status == RentalUnitStatus.RETIRED:
        return "retirada"
    if rental_out is not None:
        return "fuera"
    return "disponible" if maintenance.can_operate(unit) else "mantenimiento"


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
    if status == RentalUnitStatus.OPERATIONAL and maintenance.service_overdue(unit):
        raise ConflictError(
            "Venció la revisión periódica de la unidad: registra el mantenimiento para que vuelva a operar."
        )
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
