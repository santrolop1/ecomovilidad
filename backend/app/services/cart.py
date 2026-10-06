"""Carrito persistente por usuario (RF 6.3). El inventario NO se aparta aquí:
se aparta al crear el pedido. La reserva temporal de 15 minutos (RF 6.2) es
trabajo pendiente."""

import uuid

from sqlalchemy.orm import Session

from app.models import Cart, CartItem, User
from app.models.cart import MAX_QUANTITY_PER_ITEM
from app.repositories import carts as repo
from app.repositories.catalog import get_product
from app.schemas.cart import AddCartItemIn, CartItemOut, CartOut, UpdateCartItemIn
from app.schemas.catalog import ImageOut
from app.services.catalog import available_units

from .errors import ConflictError, NotFoundError


def _get_or_create(db: Session, user: User) -> Cart:
    cart = repo.get_active_cart(db, user.id, for_update=True)
    if cart is None:
        cart = Cart(user_id=user.id, items=[])
        db.add(cart)
        db.flush()
    return cart


def _max_quantity(item: CartItem) -> int:
    return min(available_units(item.product), MAX_QUANTITY_PER_ITEM)


def to_cart_out(cart: Cart) -> CartOut:
    return CartOut(
        id=cart.id,
        updated_at=cart.updated_at,
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
            )
            for item in cart.items
        ],
    )


def get_cart(db: Session, user: User) -> CartOut:
    cart = _get_or_create(db, user)
    # Mantiene el carrito al día con el catálogo: quita productos desactivados
    # y actualiza precios que cambiaron.
    for item in list(cart.items):
        if not item.product.is_active:
            cart.items.remove(item)
        elif item.unit_price != item.product.price:
            item.unit_price = item.product.price
    db.commit()
    db.refresh(cart)
    return to_cart_out(cart)


def _check_quantity(item_name: str, quantity: int, available: int) -> None:
    if quantity > MAX_QUANTITY_PER_ITEM:
        raise ConflictError(f"Puedes llevar máximo {MAX_QUANTITY_PER_ITEM} unidades de {item_name}.")
    if quantity > available:
        raise ConflictError(f"Solo quedan {available} unidades disponibles de {item_name}.")


def add_item(db: Session, user: User, data: AddCartItemIn) -> CartOut:
    product = get_product(db, data.product_id)
    if product is None:
        raise NotFoundError("El producto no existe.")
    cart = _get_or_create(db, user)
    item = next((i for i in cart.items if i.product_id == product.id), None)
    quantity = (item.quantity if item else 0) + data.quantity
    _check_quantity(product.name, quantity, available_units(product))
    if item:
        item.quantity = quantity
        item.unit_price = product.price
    else:
        cart.items.append(CartItem(product_id=product.id, quantity=quantity, unit_price=product.price))
    db.commit()
    return get_cart(db, user)


def _find_item(cart: Cart, item_id: uuid.UUID) -> CartItem:
    item = next((i for i in cart.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("El producto no está en tu carrito.")
    return item


def update_item(db: Session, user: User, item_id: uuid.UUID, data: UpdateCartItemIn) -> CartOut:
    cart = _get_or_create(db, user)
    item = _find_item(cart, item_id)
    _check_quantity(item.product.name, data.quantity, available_units(item.product))
    item.quantity = data.quantity
    db.commit()
    return get_cart(db, user)


def remove_item(db: Session, user: User, item_id: uuid.UUID) -> CartOut:
    cart = _get_or_create(db, user)
    cart.items.remove(_find_item(cart, item_id))
    db.commit()
    return get_cart(db, user)
