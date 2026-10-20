from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Branch, Category, Inventory, Order, Product, Rental, User
from app.models.enums import OrderStatus, RentalStatus
from app.repositories import admin as repo
from app.schemas.admin import DashboardOut, LowStockOut
from app.services.refunds import open_requests

from .inventory import LOW_STOCK_THRESHOLD, inventory_totals
from .orders import summaries
from .payments import refund_alerts


def get_dashboard(db: Session) -> DashboardOut:
    available, reserved, total = inventory_totals(db)

    orders_by_status = {s: 0 for s in OrderStatus}
    for status, count in db.execute(select(Order.status, func.count()).group_by(Order.status)):
        orders_by_status[OrderStatus(status)] = count
    rentals_by_status = {s: 0 for s in RentalStatus}
    for status, count in db.execute(select(Rental.status, func.count()).group_by(Rental.status)):
        rentals_by_status[RentalStatus(status)] = count

    revenue = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.status.in_([OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.COMPLETED])
        )
    )

    # Productos activos con pocas unidades disponibles (sumando sucursales; sin inventario = 0).
    stock_available = func.coalesce(func.sum(Inventory.available_quantity), 0)
    low_stock_rows = db.execute(
        select(
            Product.id,
            Product.name,
            Product.sku,
            stock_available,
            func.coalesce(func.sum(Inventory.reserved_quantity), 0),
        )
        .outerjoin(Inventory, Inventory.product_id == Product.id)
        .where(Product.is_active)
        .group_by(Product.id)
        .having(stock_available <= LOW_STOCK_THRESHOLD)
        .order_by(stock_available, Product.name)
        .limit(8)
    ).all()

    recent = list(
        db.scalars(select(Order).options(selectinload(Order.user)).order_by(Order.created_at.desc()).limit(6)).unique()
    )

    return DashboardOut(
        products_total=repo.count_where(db, Product),
        products_active=repo.count_where(db, Product, Product.is_active),
        products_featured=repo.count_where(db, Product, Product.is_featured, Product.is_active),
        products_without_image=repo.count_where(db, Product, Product.image_url.is_(None), Product.is_active),
        categories=repo.count_where(db, Category),
        branches_total=repo.count_where(db, Branch),
        branches_active=repo.count_where(db, Branch, Branch.is_active),
        branches_demo=repo.count_where(db, Branch, Branch.is_demo),
        users_total=repo.count_where(db, User),
        users_active=repo.count_where(db, User, User.is_active),
        admins=repo.count_where(db, User, User.is_admin),
        orders_total=sum(orders_by_status.values()),
        orders_by_status=orders_by_status,
        revenue_confirmed=int(revenue or 0),
        payments_requiring_refund=refund_alerts(db),
        refund_requests=open_requests(db),
        units_available=available,
        units_reserved=reserved,
        units_total=total,
        rentals_total=sum(rentals_by_status.values()),
        rentals_by_status=rentals_by_status,
        low_stock_threshold=LOW_STOCK_THRESHOLD,
        low_stock=[
            LowStockOut(product_id=pid, name=name, sku=sku, available=int(a), reserved=int(r))
            for pid, name, sku, a, r in low_stock_rows
        ],
        recent_orders=summaries(db, recent),
    )
