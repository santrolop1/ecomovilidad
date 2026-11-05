"""Consultas agregadas del panel administrativo."""

import uuid

from sqlalchemy import Select, String, case, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Branch, Inventory, InventoryMovement, Order, OrderItem, Product, User
from app.models.enums import MovementKind, OrderStatus


def paginate[T](db: Session, stmt: Select[tuple[T]], page: int, page_size: int) -> tuple[list[T], int]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = list(db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).unique())
    return items, total


def stock_by_product(db: Session, product_ids: list[uuid.UUID] | None = None) -> dict[uuid.UUID, tuple[int, int, int]]:
    """(disponible, reservado, total) por producto, sumando todas las sucursales."""
    stmt = select(
        Inventory.product_id,
        func.sum(Inventory.available_quantity),
        func.sum(Inventory.reserved_quantity),
        func.sum(Inventory.total_quantity),
    ).group_by(Inventory.product_id)
    if product_ids is not None:
        stmt = stmt.where(Inventory.product_id.in_(product_ids))
    return {pid: (int(a), int(r), int(t)) for pid, a, r, t in db.execute(stmt)}


def stock_by_branch(db: Session) -> dict[uuid.UUID, tuple[int, int, int]]:
    stmt = select(
        Inventory.branch_id,
        func.sum(Inventory.available_quantity),
        func.sum(Inventory.reserved_quantity),
        func.sum(Inventory.total_quantity),
    ).group_by(Inventory.branch_id)
    return {bid: (int(a), int(r), int(t)) for bid, a, r, t in db.execute(stmt)}


def sold_units(db: Session) -> dict[tuple[uuid.UUID, uuid.UUID], int]:
    """Unidades vendidas por (producto, sucursal): las que ya salieron del
    inventario (pedido pagado o completado)."""
    stmt = (
        select(OrderItem.product_id, Order.branch_id, func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .where(or_(Order.status == OrderStatus.COMPLETED, Order.stock_settled_at.is_not(None)))
        .group_by(OrderItem.product_id, Order.branch_id)
    )
    return {(pid, bid): int(q) for pid, bid, q in db.execute(stmt)}


def inventory_movements_stmt(
    *, branch_id: uuid.UUID | None = None, query: str | None = None, kind: MovementKind | None = None
) -> Select[tuple[InventoryMovement]]:
    stmt = (
        select(InventoryMovement)
        .join(Inventory, Inventory.id == InventoryMovement.inventory_id)
        .join(Product, Product.id == Inventory.product_id)
        .options(joinedload(InventoryMovement.inventory).joinedload(Inventory.product))
        .options(joinedload(InventoryMovement.user))
        .order_by(InventoryMovement.created_at.desc(), InventoryMovement.id)
    )
    if branch_id:
        stmt = stmt.where(Inventory.branch_id == branch_id)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if kind:
        stmt = stmt.where(InventoryMovement.kind == kind)
    return stmt


def inventory_rows_stmt(
    *, product_id: uuid.UUID | None = None, branch_id: uuid.UUID | None = None, query: str | None = None
) -> Select[tuple[Inventory]]:
    stmt = (
        select(Inventory)
        .join(Product, Product.id == Inventory.product_id)
        .join(Branch, Branch.id == Inventory.branch_id)
        .order_by(Product.name, Branch.city, Branch.name)
    )
    if product_id:
        stmt = stmt.where(Inventory.product_id == product_id)
    if branch_id:
        stmt = stmt.where(Inventory.branch_id == branch_id)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    return stmt


def order_search(stmt: Select[tuple[Order]], query: str) -> Select[tuple[Order]]:
    like = f"%{query}%"
    return stmt.join(User, User.id == Order.user_id).where(
        or_(
            Order.contact_name.ilike(like),
            Order.contact_email.ilike(like),
            User.email.ilike(like),
            cast(Order.id, String).ilike(f"{query.lower()}%"),
        )
    )


def order_item_counts(db: Session, order_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not order_ids:
        return {}
    stmt = (
        select(OrderItem.order_id, func.sum(OrderItem.quantity))
        .where(OrderItem.order_id.in_(order_ids))
        .group_by(OrderItem.order_id)
    )
    return {oid: int(q) for oid, q in db.execute(stmt)}


def order_counts_by_user(db: Session, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not user_ids:
        return {}
    stmt = select(Order.user_id, func.count()).where(Order.user_id.in_(user_ids)).group_by(Order.user_id)
    return {uid: int(n) for uid, n in db.execute(stmt)}


def count_where(db: Session, model: type, *conditions) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0


def sum_case(condition, value):
    return func.coalesce(func.sum(case((condition, value), else_=0)), 0)
