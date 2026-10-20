"""Alquiler de vehículos de la flota (CU-04).

1. El cliente elige vehículo, sucursal y periodo; el backend verifica que la
   sucursal esté abierta al recoger y al devolver, y que haya una unidad libre.
2. Al confirmar, se aparta una unidad concreta (`pending`) por el plazo de pago.
   Las unidades se bloquean con SELECT … FOR UPDATE y, además, la base de datos
   impide dos alquileres vigentes cruzados sobre la misma unidad (restricción de
   exclusión): dos clientes simultáneos nunca reciben la misma unidad.
3. El pago aprobado lo confirma (`confirmed`); sin pago a tiempo se cancela y
   la unidad queda libre. En el panel: entregado (`active`) y devuelto (`completed`).
"""

import math
import uuid
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Branch, Product, Rental, RentalRate, RentalUnit, User
from app.models.enums import BranchService, ConsentPurpose, RentalRateUnit, RentalStatus, RentalUnitStatus
from app.models.rental import HOLDING_STATUSES
from app.repositories import rentals as repo
from app.schemas.rental import (
    RentalCreateIn,
    RentalOfferBranchOut,
    RentalOfferOut,
    RentalOut,
    RentalPeriodIn,
    RentalQuoteOut,
    RentalRateOut,
)

from . import consent
from .errors import ConflictError, NotFoundError, ServiceError
from .payments.queries import PaymentInfo, payment_info
from .reservations import now_utc

BOGOTA = ZoneInfo("America/Bogota")
MIN_LEAD = timedelta(minutes=30)
MAX_ADVANCE = timedelta(days=60)
MIN_DURATION = timedelta(hours=1)
MAX_DURATION = timedelta(days=14)
# Etiquetas de horario de las sucursales → días de la semana (0 = lunes). Los
# festivos no se distinguen: se aplica el horario del día de la semana.
DAY_LABELS = {
    "lunes a viernes": (0, 1, 2, 3, 4),
    "lunes a sábado": (0, 1, 2, 3, 4, 5),
    "sábados": (5,),
    "domingos y festivos": (6,),
    "domingos": (6,),
}
DAY_NAMES = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")


# ── Oferta ──────────────────────────────────────────────────────────────────


def _rates(db: Session, product_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, int]]:
    rates: dict[uuid.UUID, dict[str, int]] = {}
    for rate in db.scalars(select(RentalRate).where(RentalRate.product_id.in_(product_ids))):
        rates.setdefault(rate.product_id, {})[rate.unit] = rate.price
    return rates


def list_offers(db: Session) -> list[RentalOfferOut]:
    """Productos con tarifa y unidades en servicio, por sucursal activa con alquiler."""
    rows = db.execute(
        select(RentalUnit.product_id, Branch, func.count(RentalUnit.id))
        .join(Branch, Branch.id == RentalUnit.branch_id)
        .where(
            RentalUnit.status == RentalUnitStatus.OPERATIONAL,
            Branch.is_active,
            Branch.services.contains([BranchService.RENTAL]),
        )
        .group_by(RentalUnit.product_id, Branch.id)
        .order_by(Branch.city, Branch.name)
    ).all()
    branches: dict[uuid.UUID, list[RentalOfferBranchOut]] = {}
    for product_id, branch, units in rows:
        branches.setdefault(product_id, []).append(
            RentalOfferBranchOut(
                branch_id=branch.id,
                branch_slug=branch.slug,
                branch_name=branch.name,
                branch_city=branch.city,
                units=units,
            )
        )
    rates = _rates(db, list(branches))
    products = db.scalars(
        select(Product).where(Product.id.in_(list(rates)), Product.is_active).order_by(Product.name)
    ).unique()
    return [
        RentalOfferOut(
            product_id=p.id,
            slug=p.slug,
            name=p.name,
            category=p.category.slug,
            short_description=p.short_description,
            image_url=p.image_url,
            rates=[RentalRateOut(unit=unit, price=price) for unit, price in sorted(rates[p.id].items())],
            branches=branches[p.id],
        )
        for p in products
    ]


# ── Validación y precio ─────────────────────────────────────────────────────


def _opening_window(branch: Branch, day: datetime) -> tuple[time, time] | None:
    weekday = day.weekday()
    for entry in branch.opening_hours or []:
        if weekday in DAY_LABELS.get(str(entry.get("days", "")).strip().lower(), ()):
            return time.fromisoformat(entry["opens"]), time.fromisoformat(entry["closes"])
    return None


def _check_open(branch: Branch, moment: datetime, action: str) -> None:
    local = moment.astimezone(BOGOTA)
    window = _opening_window(branch, local)
    if window is None:
        raise ServiceError(
            f"La sucursal {branch.name} no abre los {DAY_NAMES[local.weekday()]}: elige otro día para {action}."
        )
    opens, closes = window
    if not opens <= local.time() <= closes:
        raise ServiceError(f"Para {action}, {branch.name} atiende ese día de {opens:%H:%M} a {closes:%H:%M}.")


def _validate_period(branch: Branch, start: datetime, end: datetime) -> None:
    if start.tzinfo is None or end.tzinfo is None:
        raise ServiceError("Las fechas deben incluir la zona horaria.")
    for moment in (start, end):
        if moment.second or moment.microsecond or moment.minute not in (0, 30):
            raise ServiceError("Las horas de recogida y devolución van en punto o y media.")
    now = now_utc()
    if start < now + MIN_LEAD:
        raise ServiceError("La recogida debe ser al menos 30 minutos después de ahora.")
    if start > now + MAX_ADVANCE:
        raise ServiceError("Solo se puede reservar con hasta 60 días de anticipación.")
    if end - start < MIN_DURATION:
        raise ServiceError("El alquiler mínimo es de una hora.")
    if end - start > MAX_DURATION:
        raise ServiceError("El alquiler máximo es de 14 días.")
    _check_open(branch, start, "recoger")
    _check_open(branch, end, "devolver")


def price_for(rates: dict[str, int], start: datetime, end: datetime) -> tuple[int, int, str]:
    """(precio, horas cobradas, tarifa usada). Se cobra la opción más barata:
    horas completas a tarifa por hora, o días completos (24 h) a tarifa diaria."""
    hours = math.ceil((end - start).total_seconds() / 3600)
    options: list[tuple[int, str]] = []
    if RentalRateUnit.HOUR in rates:
        options.append((hours * rates[RentalRateUnit.HOUR], "hora"))
    if RentalRateUnit.DAY in rates:
        options.append((math.ceil(hours / 24) * rates[RentalRateUnit.DAY], "dia"))
    if not options:
        raise ServiceError("Este vehículo no tiene tarifa de alquiler.")
    price, pricing = min(options)
    return price, hours, pricing


def _offer(db: Session, product_id: uuid.UUID, branch_id: uuid.UUID) -> tuple[Product, Branch, dict[str, int]]:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise NotFoundError("El vehículo no existe.")
    rates = _rates(db, [product_id]).get(product_id)
    if not rates:
        raise NotFoundError("Este vehículo no se alquila.")
    branch = db.get(Branch, branch_id)
    if branch is None or not branch.is_active or BranchService.RENTAL not in branch.services:
        raise NotFoundError("Esa sucursal no ofrece alquiler.")
    return product, branch, rates


def _free_units(
    db: Session, product_id: uuid.UUID, branch_id: uuid.UUID, start: datetime, end: datetime, *, lock: bool
):
    stmt = (
        select(RentalUnit)
        .where(
            RentalUnit.product_id == product_id,
            RentalUnit.branch_id == branch_id,
            RentalUnit.status == RentalUnitStatus.OPERATIONAL,
        )
        .order_by(RentalUnit.code)
    )
    if lock:
        stmt = stmt.with_for_update(of=RentalUnit)
    units = list(db.scalars(stmt).unique())
    busy = set(
        db.scalars(
            select(Rental.rental_unit_id).where(
                Rental.rental_unit_id.in_([u.id for u in units]),
                Rental.status.in_(HOLDING_STATUSES),
                Rental.start_at < end,
                Rental.end_at > start,
            )
        )
    )
    return [u for u in units if u.id not in busy]


def quote(db: Session, product_id: uuid.UUID, data: RentalPeriodIn) -> RentalQuoteOut:
    product, branch, rates = _offer(db, product_id, data.branch_id)
    _validate_period(branch, data.start_at, data.end_at)
    price, hours, pricing = price_for(rates, data.start_at, data.end_at)
    free = _free_units(db, product.id, branch.id, data.start_at, data.end_at, lock=False)
    return RentalQuoteOut(price=price, hours=hours, pricing=pricing, available_units=len(free))


# ── Reservar ────────────────────────────────────────────────────────────────


def to_rental_out(rental: Rental, info: PaymentInfo | None = None) -> RentalOut:
    return RentalOut(
        id=rental.id,
        product_id=rental.product_id,
        product_slug=rental.product.slug,
        product_name=rental.product.name,
        image_url=rental.product.image_url,
        branch_id=rental.branch_id,
        branch_name=rental.branch.name,
        branch_city=rental.branch.city,
        branch_address=rental.branch.address,
        unit_code=rental.unit.code if rental.unit else None,
        start_at=rental.start_at,
        end_at=rental.end_at,
        status=rental.status,
        price=rental.price,
        payment_expires_at=rental.payment_expires_at if rental.status == RentalStatus.PENDING else None,
        payment=info.payment if info else None,
        invoice=info.invoice if info else None,
        created_at=rental.created_at,
    )


def create_rental(db: Session, user: User, data: RentalCreateIn) -> RentalOut:
    consent.ensure_current_policy(data.policy_version)
    product, branch, rates = _offer(db, data.product_id, data.branch_id)
    _validate_period(branch, data.start_at, data.end_at)
    price, _, _ = price_for(rates, data.start_at, data.end_at)

    free = _free_units(db, product.id, branch.id, data.start_at, data.end_at, lock=True)
    if not free:
        raise ConflictError("No hay unidades libres de este vehículo en esa sucursal para esas fechas.")
    customer = data.customer
    rental = Rental(
        user_id=user.id,
        product_id=product.id,
        branch_id=branch.id,
        rental_unit_id=free[0].id,
        start_at=data.start_at,
        end_at=data.end_at,
        status=RentalStatus.PENDING,
        price=price,
        payment_expires_at=now_utc() + timedelta(minutes=get_settings().payment_window_minutes),
        contact_name=customer.full_name,
        contact_email=customer.email.lower(),
        contact_phone=customer.phone,
        document_type=customer.document_type,
        document_number=customer.document_number,
    )
    db.add(rental)
    try:
        db.flush()
    except IntegrityError as error:
        # Última barrera: la restricción de exclusión de la base de datos.
        db.rollback()
        raise ConflictError("Esa unidad acaba de reservarse. Intenta de nuevo.") from error
    consent.record_consent(db, user.id, ConsentPurpose.RENTAL, rental_id=rental.id)
    db.commit()
    db.refresh(rental)
    return to_rental_out(rental)


def list_rentals(db: Session, user: User) -> list[RentalOut]:
    from .refunds import latest_request, refund_out

    rentals = repo.list_user_rentals(db, user.id)
    info = payment_info(db, rental_ids=[r.id for r in rentals])
    return [
        to_rental_out(r, info.get(r.id)).model_copy(
            update={"refund_request": refund_out(latest_request(db, rental_id=r.id))}
        )
        for r in rentals
    ]


def get_rental(db: Session, user: User, rental_id: uuid.UUID) -> RentalOut:
    rental = db.scalars(select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id)).unique().one_or_none()
    if rental is None:  # 404 también si es de otro usuario
        raise NotFoundError("El alquiler no existe.")
    from .refunds import latest_request, refund_out

    out = to_rental_out(rental, payment_info(db, rental_ids=[rental.id]).get(rental.id))
    return out.model_copy(update={"refund_request": refund_out(latest_request(db, rental_id=rental.id))})
