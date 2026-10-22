"""Reservas temporales de inventario para el carrito (RF 6.2).

Reglas:
- Agregar o aumentar una línea aparta unidades por 15 minutos: disponible −n,
  reservado +n en filas concretas de inventario (por sucursal).
- Reducir o quitar una línea las devuelve.
- Cada cambio de una línea renueva su vencimiento.
- Una reserva vencida no bloquea inventario: se libera (y su línea sale del
  carrito) antes de cualquier operación que lea o modifique disponibilidad.
- El backend es la autoridad: `expires_at` se compara con la hora del servidor.

Orden de bloqueo en TODAS las transacciones (evita interbloqueos):
  carts → cart_reservations → inventory (ordenado por producto, sucursal)
"""

import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models import Cart, CartItem, CartReservation, Inventory
from app.models.enums import CartStatus
from app.modules.inventario.reservation_models import RESERVATION_MINUTES

RESERVATION_TTL = timedelta(minutes=RESERVATION_MINUTES)


def now_utc() -> datetime:
    return datetime.now(UTC)


def lock_inventory_rows(db: Session, *, ids: set[uuid.UUID] | None = None, product_id: uuid.UUID | None = None):
    stmt = select(Inventory).order_by(Inventory.product_id, Inventory.branch_id).with_for_update(of=Inventory)
    if ids is not None:
        stmt = stmt.where(Inventory.id.in_(ids))
    if product_id is not None:
        stmt = stmt.where(Inventory.product_id == product_id)
    return list(db.scalars(stmt).unique())


def _give_back(inventory: dict[uuid.UUID, Inventory], reservation: CartReservation, quantity: int) -> None:
    inv = inventory[reservation.inventory_id]
    inv.reserved_quantity -= quantity
    inv.available_quantity += quantity


def release_expired(db: Session, now: datetime | None = None) -> int:
    """Libera TODAS las reservas vencidas. Seguro con solicitudes simultáneas:
    las reservas bloqueadas por otra transacción se omiten (SKIP LOCKED); esa
    transacción es la que las está gestionando. No hace commit."""
    now = now or now_utc()
    expired = list(
        db.scalars(
            select(CartReservation)
            .where(CartReservation.expires_at <= now)
            .order_by(CartReservation.id)
            .with_for_update(skip_locked=True, of=CartReservation)
        ).unique()
    )
    if expired:
        inventory = {inv.id: inv for inv in lock_inventory_rows(db, ids={r.inventory_id for r in expired})}
        for reservation in expired:
            _give_back(inventory, reservation, reservation.quantity)
        db.execute(delete(CartReservation).where(CartReservation.id.in_([r.id for r in expired])))
        db.flush()
    # Líneas de carritos activos sin reserva (vencidas o creadas antes de RF 6.2) salen del carrito.
    orphan = (
        select(CartItem.id)
        .join(Cart, Cart.id == CartItem.cart_id)
        .where(Cart.status == CartStatus.ACTIVE, ~CartItem.reservations.any())
    )
    removed = db.execute(delete(CartItem).where(CartItem.id.in_(orphan))).rowcount or 0
    db.expire_all()
    return removed


def lock_cart_reservations(db: Session, cart: Cart) -> list[CartReservation]:
    return list(
        db.scalars(
            select(CartReservation)
            .join(CartItem, CartItem.id == CartReservation.cart_item_id)
            .where(CartItem.cart_id == cart.id)
            .order_by(CartReservation.id)
            .with_for_update(of=CartReservation)
        ).unique()
    )


def purge_cart(db: Session, cart: Cart, now: datetime | None = None) -> list[str]:
    """Libera las reservas vencidas de un carrito ya bloqueado y quita sus
    líneas. Devuelve los nombres de los productos retirados."""
    now = now or now_utc()
    reservations = lock_cart_reservations(db, cart)
    expired_items = {r.cart_item_id for r in reservations if r.expires_at <= now}
    unreserved = {item.id for item in cart.items} - {r.cart_item_id for r in reservations}
    gone = expired_items | unreserved
    if not gone:
        return []
    to_release = [r for r in reservations if r.cart_item_id in gone]
    if to_release:
        inventory = {inv.id: inv for inv in lock_inventory_rows(db, ids={r.inventory_id for r in to_release})}
        for reservation in to_release:
            _give_back(inventory, reservation, reservation.quantity)
    names = [item.product.name for item in cart.items if item.id in gone]
    for item in [i for i in cart.items if i.id in gone]:
        cart.items.remove(item)  # cascade borra sus reservas
    db.flush()
    return names


def _branch_preference(cart: Cart, item: CartItem) -> dict[uuid.UUID, int]:
    """Prioridad de sucursales: primero donde esta línea ya tiene unidades,
    luego donde el resto del carrito tiene reservas (para facilitar un pedido
    desde una sola sucursal)."""
    weight: dict[uuid.UUID, int] = defaultdict(int)
    for other in cart.items:
        for r in other.reservations:
            weight[r.inventory.branch_id] += 1000 if other.id == item.id else r.quantity
    return weight


def reserve(db: Session, cart: Cart, item: CartItem, quantity: int, now: datetime | None = None) -> None:
    """Aparta `quantity` unidades más para la línea. Bloquea el inventario del
    producto; si no alcanza, no aparta nada (ConflictError)."""
    now = now or now_utc()
    rows = lock_inventory_rows(db, product_id=item.product_id)
    available = sum(inv.available_quantity for inv in rows)
    if quantity > available:
        raise ConflictError(f"Solo quedan {available} unidades disponibles de {item.product.name}.")
    weight = _branch_preference(cart, item)
    rows.sort(key=lambda inv: (-weight.get(inv.branch_id, 0), -inv.available_quantity, str(inv.branch_id)))
    existing = {r.inventory_id: r for r in item.reservations}
    pending = quantity
    for inv in rows:
        if pending == 0:
            break
        take = min(pending, inv.available_quantity)
        if take <= 0:
            continue
        inv.available_quantity -= take
        inv.reserved_quantity += take
        if inv.id in existing:
            existing[inv.id].quantity += take
        else:
            item.reservations.append(CartReservation(inventory=inv, quantity=take, expires_at=now + RESERVATION_TTL))
        pending -= take
    refresh(item, now)


def release(db: Session, item: CartItem, quantity: int, now: datetime | None = None) -> None:
    """Devuelve `quantity` unidades de la línea (las más recientes primero)."""
    inventory = {inv.id: inv for inv in lock_inventory_rows(db, ids={r.inventory_id for r in item.reservations})}
    pending = quantity
    for reservation in sorted(item.reservations, key=lambda r: r.created_at or now_utc(), reverse=True):
        if pending == 0:
            break
        take = min(pending, reservation.quantity)
        _give_back(inventory, reservation, take)
        reservation.quantity -= take
        if reservation.quantity == 0:
            item.reservations.remove(reservation)
        pending -= take
    refresh(item, now)


def refresh(item: CartItem, now: datetime | None = None) -> None:
    expires = (now or now_utc()) + RESERVATION_TTL
    for reservation in item.reservations:
        reservation.expires_at = expires


def reserved_until(item: CartItem) -> datetime | None:
    return min((r.expires_at for r in item.reservations), default=None)


def reserved_branch_units(item: CartItem) -> dict[uuid.UUID, int]:
    units: dict[uuid.UUID, int] = defaultdict(int)
    for r in item.reservations:
        units[r.inventory.branch_id] += r.quantity
    return units
