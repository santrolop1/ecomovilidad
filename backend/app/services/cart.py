"""Carrito persistente por usuario (RF 6.3) con reserva temporal de inventario
de 15 minutos por línea (RF 6.2). Ver services/reservations.py."""

import uuid

from sqlalchemy.orm import Session

from app.models import Cart, CartItem, User
from app.models.cart import MAX_QUANTITY_PER_ITEM
from app.models.reservation import RESERVATION_MINUTES
from app.repositories import carts as repo
from app.repositories.catalog import get_product
from app.schemas.cart import AddCartItemIn, CartItemOut, CartOut, UpdateCartItemIn
from app.schemas.catalog import ImageOut
from app.services.catalog import available_units

from . import reservations
from .errors import ConflictError, NotFoundError


def lock_or_create_cart(db: Session, user: User) -> Cart:
    cart = repo.get_active_cart(db, user.id, for_update=True)
    if cart is None:
        cart = Cart(user_id=user.id, items=[])
        db.add(cart)
        db.flush()
    return cart


def _max_quantity(item: CartItem) -> int:
    # Lo que ya reservó esta línea + lo que sigue disponible para todos.
    return min(item.quantity + available_units(item.product), MAX_QUANTITY_PER_ITEM)


def to_cart_out(cart: Cart, expired: list[str] | None = None) -> CartOut:
    return CartOut(
        id=cart.id,
        updated_at=cart.updated_at,
        reservation_minutes=RESERVATION_MINUTES,
        server_time=reservations.now_utc(),
        expired_items=expired or [],
        items=[
            CartItemOut(
                id=item.id,
                product_id=item.product_id,
                slug=item.product.slug,
                name=item.product.name,
                brand=item.product.brand,
                image=ImageOut(src=item.product.image_url, alt=item.product.name) if item.product.image_url else None,
                unit_price=item.unit_price,
                quantity=item.quantity,
                max_quantity=_max_quantity(item),
                reserved_until=reservations.reserved_until(item),
            )
            for item in cart.items
        ],
    )


def _sync_catalog(db: Session, cart: Cart) -> None:
    """Quita productos desactivados (liberando su reserva) y actualiza precios."""
    for item in list(cart.items):
        if not item.product.is_active:
            reservations.release(db, item, item.quantity)
            cart.items.remove(item)
        elif item.unit_price != item.product.price:
            item.unit_price = item.product.price


def _finish(db: Session, user: User, expired: list[str]) -> CartOut:
    db.commit()
    cart = repo.get_active_cart(db, user.id)
    assert cart is not None
    return to_cart_out(cart, expired)


def get_cart(db: Session, user: User) -> CartOut:
    cart = lock_or_create_cart(db, user)
    expired = reservations.purge_cart(db, cart)
    _sync_catalog(db, cart)
    return _finish(db, user, expired)


def _check_limit(name: str, quantity: int) -> None:
    if quantity > MAX_QUANTITY_PER_ITEM:
        raise ConflictError(f"Puedes llevar máximo {MAX_QUANTITY_PER_ITEM} unidades de {name}.")


def add_item(db: Session, user: User, data: AddCartItemIn) -> CartOut:
    product = get_product(db, data.product_id)
    if product is None:
        raise NotFoundError("El producto no existe.")
    cart = lock_or_create_cart(db, user)
    expired = reservations.purge_cart(db, cart)
    item = next((i for i in cart.items if i.product_id == product.id), None)
    _check_limit(product.name, (item.quantity if item else 0) + data.quantity)
    if item is None:
        # Si la reserva falla, la transacción completa se revierte (también esta línea).
        item = CartItem(product_id=product.id, quantity=data.quantity, unit_price=product.price)
        item.product = product
        cart.items.append(item)
        reservations.reserve(db, cart, item, data.quantity)
    else:
        reservations.reserve(db, cart, item, data.quantity)
        item.quantity += data.quantity
        item.unit_price = product.price
    return _finish(db, user, expired)


def _find_item(cart: Cart, item_id: uuid.UUID) -> CartItem:
    item = next((i for i in cart.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("El producto no está en tu carrito o su reserva venció.")
    return item


def update_item(db: Session, user: User, item_id: uuid.UUID, data: UpdateCartItemIn) -> CartOut:
    cart = lock_or_create_cart(db, user)
    expired = reservations.purge_cart(db, cart)
    item = _find_item(cart, item_id)
    _check_limit(item.product.name, data.quantity)
    difference = data.quantity - item.quantity
    if difference > 0:
        reservations.reserve(db, cart, item, difference)
    elif difference < 0:
        reservations.release(db, item, -difference)
    else:
        reservations.refresh(item)
    item.quantity = data.quantity
    return _finish(db, user, expired)


def remove_item(db: Session, user: User, item_id: uuid.UUID) -> CartOut:
    cart = lock_or_create_cart(db, user)
    expired = reservations.purge_cart(db, cart)
    item = _find_item(cart, item_id)
    reservations.release(db, item, item.quantity)
    cart.items.remove(item)
    return _finish(db, user, expired)
