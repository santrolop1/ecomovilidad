"""API del panel administrativo. Todas las rutas exigen sesión de administrador
(y token CSRF en los métodos que modifican datos)."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import AdminUser, DbSession, require_admin
from app.core.errors import NotFoundError
from app.models import Invoice
from app.models.enums import OrderStatus, RentalStatus
from app.modules.admin import branches, catalog, dashboard, inventory, orders, rentals, users
from app.modules.admin.schemas import (
    AdminBranchDetailOut,
    AdminBranchOut,
    AdminCategoryOut,
    AdminOrderDetailOut,
    AdminOrderSummaryOut,
    AdminProductDetailOut,
    AdminProductOut,
    AdminRentalOut,
    AdminUserDetailOut,
    AdminUserOut,
    BranchCreateIn,
    BranchUpdateIn,
    CategoryIn,
    CategoryUpdateIn,
    DashboardOut,
    InventoryRowOut,
    InventoryUpsertIn,
    OrderStatusIn,
    Page,
    ProductCreateIn,
    ProductUpdateIn,
    RentalStatusIn,
    UserUpdateIn,
)
from app.modules.alquiler.schemas import RentalUnitOut, RentalUnitStatusIn
from app.modules.pagos.invoices_router import invoice_response
from app.modules.pedidos import service as order_service
from app.modules.reembolsos import service as refunds

router = APIRouter(prefix="/admin", tags=["administración"], dependencies=[Depends(require_admin)])

PageQuery = Query(default=1, ge=1, le=10_000)
SearchQuery = Query(default=None, max_length=80)


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(db: DbSession):
    return dashboard.get_dashboard(db)


# ─── Productos ─────────────────────────────────────────────────────────────


@router.get("/products", response_model=Page[AdminProductOut])
def list_products(
    db: DbSession,
    page: int = PageQuery,
    q: str | None = SearchQuery,
    category: str | None = Query(default=None, max_length=60),
    status: Literal["active", "inactive"] | None = None,
    featured: bool | None = None,
):
    return catalog.list_products(db, page=page, query=q, category=category, status=status, featured=featured)


@router.post("/products", response_model=AdminProductDetailOut, status_code=201)
def create_product(data: ProductCreateIn, db: DbSession):
    return catalog.create_product(db, data)


@router.get("/products/{product_id}", response_model=AdminProductDetailOut)
def get_product(product_id: uuid.UUID, db: DbSession):
    return catalog.get_product(db, product_id)


@router.patch("/products/{product_id}", response_model=AdminProductDetailOut)
def update_product(product_id: uuid.UUID, data: ProductUpdateIn, db: DbSession):
    return catalog.update_product(db, product_id, data)


@router.put("/products/{product_id}/inventory/{branch_id}", response_model=AdminProductDetailOut)
def set_stock(product_id: uuid.UUID, branch_id: uuid.UUID, data: InventoryUpsertIn, db: DbSession):
    return catalog.set_stock(db, product_id, branch_id, data.total_quantity)


# ─── Categorías ────────────────────────────────────────────────────────────


@router.get("/categories", response_model=list[AdminCategoryOut])
def list_categories(db: DbSession):
    return catalog.list_categories(db)


@router.post("/categories", response_model=AdminCategoryOut, status_code=201)
def create_category(data: CategoryIn, db: DbSession):
    return catalog.create_category(db, data)


@router.patch("/categories/{category_id}", response_model=AdminCategoryOut)
def update_category(category_id: uuid.UUID, data: CategoryUpdateIn, db: DbSession):
    return catalog.update_category(db, category_id, data)


# ─── Sucursales e inventario ───────────────────────────────────────────────


@router.get("/branches", response_model=list[AdminBranchOut])
def list_branches(db: DbSession):
    return branches.list_branches(db)


@router.post("/branches", response_model=AdminBranchDetailOut, status_code=201)
def create_branch(data: BranchCreateIn, db: DbSession):
    return branches.create_branch(db, data)


@router.get("/branches/{branch_id}", response_model=AdminBranchDetailOut)
def get_branch(branch_id: uuid.UUID, db: DbSession):
    return branches.get_branch(db, branch_id)


@router.patch("/branches/{branch_id}", response_model=AdminBranchDetailOut)
def update_branch(branch_id: uuid.UUID, data: BranchUpdateIn, db: DbSession):
    return branches.update_branch(db, branch_id, data)


@router.get("/inventory", response_model=Page[InventoryRowOut])
def list_inventory(
    db: DbSession,
    page: int = PageQuery,
    q: str | None = SearchQuery,
    branch_id: uuid.UUID | None = None,
    low_stock: bool = False,
):
    return inventory.list_inventory(db, page=page, query=q, branch_id=branch_id, low_stock=low_stock)


# ─── Pedidos ───────────────────────────────────────────────────────────────


@router.get("/orders", response_model=Page[AdminOrderSummaryOut])
def list_orders(db: DbSession, page: int = PageQuery, q: str | None = SearchQuery, status: OrderStatus | None = None):
    return orders.list_orders(db, page=page, query=q, status=status)


@router.get("/orders/{order_id}", response_model=AdminOrderDetailOut)
def get_order(order_id: uuid.UUID, db: DbSession):
    return orders.get_order(db, order_id)


@router.patch("/orders/{order_id}", response_model=AdminOrderDetailOut)
def update_order_status(order_id: uuid.UUID, data: OrderStatusIn, db: DbSession):
    order_service.change_status(db, order_id, data.status)
    return orders.get_order(db, order_id)


# ─── Usuarios y alquileres ─────────────────────────────────────────────────


@router.get("/users", response_model=Page[AdminUserOut])
def list_users(
    db: DbSession,
    page: int = PageQuery,
    q: str | None = SearchQuery,
    status: Literal["active", "inactive", "admin"] | None = None,
):
    return users.list_users(db, page=page, query=q, status=status)


@router.get("/users/{user_id}", response_model=AdminUserDetailOut)
def get_user(user_id: uuid.UUID, db: DbSession):
    return users.get_user(db, user_id)


@router.patch("/users/{user_id}", response_model=AdminUserDetailOut)
def update_user(user_id: uuid.UUID, data: UserUpdateIn, admin: AdminUser, db: DbSession):
    return users.update_user(db, admin, user_id, data)


@router.get("/rentals", response_model=Page[AdminRentalOut])
def list_rentals(db: DbSession, page: int = PageQuery, status: RentalStatus | None = None):
    return rentals.list_rentals(db, page=page, status=status)


@router.get("/rentals/{rental_id}", response_model=AdminRentalOut)
def get_rental(rental_id: uuid.UUID, db: DbSession):
    return rentals.get_rental(db, rental_id)


@router.patch("/rentals/{rental_id}", response_model=AdminRentalOut)
def update_rental_status(rental_id: uuid.UUID, data: RentalStatusIn, db: DbSession):
    """Pagado → entregado → devuelto; pendiente de pago → cancelado."""
    rentals.change_status(db, rental_id, data.status)
    return rentals.get_rental(db, rental_id)


@router.post("/orders/{order_id}/refund", response_model=AdminOrderDetailOut)
def resolve_order_refund(order_id: uuid.UUID, db: DbSession):
    """Registrar el reembolso (hecho en la pasarela): cancela y devuelve las unidades al inventario."""
    refunds.resolve_refund(db, order_id=order_id)
    return orders.get_order(db, order_id)


@router.post("/rentals/{rental_id}/refund", response_model=AdminRentalOut)
def resolve_rental_refund(rental_id: uuid.UUID, db: DbSession):
    """Registrar el reembolso de un alquiler pagado: se cancela y la unidad queda libre."""
    refunds.resolve_refund(db, rental_id=rental_id)
    return rentals.get_rental(db, rental_id)


@router.get("/rental-units", response_model=list[RentalUnitOut])
def list_rental_units(db: DbSession):
    return rentals.list_units(db)


@router.patch("/rental-units/{unit_id}", response_model=RentalUnitOut)
def update_rental_unit(unit_id: uuid.UUID, data: RentalUnitStatusIn, db: DbSession):
    return rentals.set_unit_status(db, unit_id, data.status)


# ─── Facturas ──────────────────────────────────────────────────────────────


@router.get("/invoices/{invoice_id}/{fmt}")
def download_invoice(invoice_id: uuid.UUID, fmt: Literal["pdf", "xml"], db: DbSession):
    invoice = db.get(Invoice, invoice_id)
    if invoice is None:
        raise NotFoundError("La factura no existe.")
    return invoice_response(invoice, fmt)
