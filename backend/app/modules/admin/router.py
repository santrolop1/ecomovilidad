"""API del panel administrativo. Todas las rutas exigen sesión de administrador
(y token CSRF en los métodos que modifican datos)."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import AdminUser, DbSession, require_admin
from app.core.errors import NotFoundError
from app.models import Invoice
from app.models.enums import DeliveryStatus, MovementKind, OrderStatus, RentalStatus
from app.modules.admin import branches, catalog, dashboard, deliveries, inventory, orders, rentals, users
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
    InventoryMovementOut,
    InventoryRowOut,
    InventoryUpsertIn,
    OrderStatusIn,
    Page,
    ProductCreateIn,
    ProductUpdateIn,
    RentalStatusIn,
    UserUpdateIn,
)
from app.modules.alquiler import maintenance
from app.modules.alquiler.schemas import (
    MaintenanceFinishIn,
    MaintenanceLogOut,
    RentalUnitOut,
    RentalUnitStatusIn,
    UnitThresholdIn,
    UnitUsageIn,
)
from app.modules.contenidos import service as content_service
from app.modules.contenidos.schemas import AdminContentOut, BannerIn, NewsItemIn, ValuePropositionIn
from app.modules.domicilios import service as delivery_service
from app.modules.domicilios.schemas import (
    AdminDeliveryOut,
    AdminDeliverySummaryOut,
    AssignCourierIn,
    CourierCreateIn,
    CourierOut,
    CourierUpdateIn,
    DeliveryStatusIn,
    DeliveryValidationIn,
)
from app.modules.pagos.invoices_router import invoice_response
from app.modules.pedidos import service as order_service
from app.modules.reembolsos import service as refunds
from app.modules.telemetria import service as telemetry_service
from app.modules.telemetria.schemas import (
    FleetSnapshotOut,
    GeofenceAlertOut,
    GeofenceCreateIn,
    GeofenceOut,
    GeofenceUpdateIn,
    GpsDeviceCreatedOut,
    GpsDeviceCreateIn,
    GpsDeviceOut,
    GpsDeviceUpdateIn,
)

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
def set_stock(product_id: uuid.UUID, branch_id: uuid.UUID, data: InventoryUpsertIn, user: AdminUser, db: DbSession):
    return catalog.set_stock(db, product_id, branch_id, data.total_quantity, data.reason, user.id)


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


@router.get("/inventory/movements", response_model=Page[InventoryMovementOut])
def list_inventory_movements(
    db: DbSession,
    page: int = PageQuery,
    q: str | None = SearchQuery,
    branch_id: uuid.UUID | None = None,
    kind: MovementKind | None = None,
):
    return inventory.list_movements(db, page=page, query=q, branch_id=branch_id, kind=kind)


# ─── Domicilios (CU-07, CU-08, CU-14) ───────────────────────────────────────


@router.get("/couriers", response_model=list[CourierOut])
def list_couriers(db: DbSession):
    return delivery_service.list_couriers(db)


@router.post("/couriers", response_model=CourierOut, status_code=status.HTTP_201_CREATED)
def create_courier(data: CourierCreateIn, db: DbSession):
    return delivery_service.create_courier(db, data)


@router.patch("/couriers/{courier_id}", response_model=CourierOut)
def update_courier(courier_id: uuid.UUID, data: CourierUpdateIn, db: DbSession):
    return delivery_service.update_courier(db, courier_id, data)


@router.get("/deliveries", response_model=Page[AdminDeliverySummaryOut])
def list_deliveries(
    db: DbSession, page: int = PageQuery, q: str | None = SearchQuery, state: DeliveryStatus | None = None
):
    return deliveries.list_deliveries(db, page=page, query=q, status=state)


@router.get("/deliveries/{delivery_id}", response_model=AdminDeliveryOut)
def get_delivery(delivery_id: uuid.UUID, db: DbSession):
    return deliveries.get_delivery(db, delivery_id)


@router.post("/deliveries/{delivery_id}/assign", response_model=AdminDeliveryOut)
def assign_delivery(delivery_id: uuid.UUID, data: AssignCourierIn, user: AdminUser, db: DbSession):
    delivery_service.assign_courier(db, delivery_id, data.courier_id, user.id)
    return deliveries.get_delivery(db, delivery_id)


@router.post("/deliveries/{delivery_id}/assign-nearest", response_model=AdminDeliveryOut)
def assign_nearest(delivery_id: uuid.UUID, user: AdminUser, db: DbSession):
    delivery_service.assign_nearest(db, delivery_id, user.id)
    return deliveries.get_delivery(db, delivery_id)


@router.patch("/deliveries/{delivery_id}", response_model=AdminDeliveryOut)
def update_delivery(delivery_id: uuid.UUID, data: DeliveryStatusIn, user: AdminUser, db: DbSession):
    delivery_service.change_status(db, delivery_id, data, user.id)
    return deliveries.get_delivery(db, delivery_id)


@router.post("/deliveries/{delivery_id}/validate", response_model=AdminDeliveryOut)
def validate_delivery(delivery_id: uuid.UUID, data: DeliveryValidationIn, user: AdminUser, db: DbSession):
    delivery_service.validate_delivery(db, delivery_id, data, user.id)
    return deliveries.get_delivery(db, delivery_id)


# ─── Contenidos (CU-09) ─────────────────────────────────────────────────────


@router.get("/content", response_model=AdminContentOut)
def get_content(db: DbSession):
    return content_service.admin_content(db)


@router.post("/content/value-propositions", response_model=AdminContentOut)
def create_value_proposition(data: ValuePropositionIn, db: DbSession):
    return content_service.save(db, "value-propositions", data)


@router.put("/content/value-propositions/{item_id}", response_model=AdminContentOut)
def update_value_proposition(item_id: uuid.UUID, data: ValuePropositionIn, db: DbSession):
    return content_service.save(db, "value-propositions", data, item_id)


@router.post("/content/banners", response_model=AdminContentOut)
def create_banner(data: BannerIn, db: DbSession):
    return content_service.save(db, "banners", data)


@router.put("/content/banners/{item_id}", response_model=AdminContentOut)
def update_banner(item_id: uuid.UUID, data: BannerIn, db: DbSession):
    return content_service.save(db, "banners", data, item_id)


@router.post("/content/news", response_model=AdminContentOut)
def create_news(data: NewsItemIn, db: DbSession):
    return content_service.save(db, "news", data)


@router.put("/content/news/{item_id}", response_model=AdminContentOut)
def update_news(item_id: uuid.UUID, data: NewsItemIn, db: DbSession):
    return content_service.save(db, "news", data, item_id)


@router.delete("/content/{kind}/{item_id}", response_model=AdminContentOut)
def delete_content(kind: Literal["value-propositions", "banners", "news"], item_id: uuid.UUID, db: DbSession):
    return content_service.delete(db, kind, item_id)


# ─── Telemetría y zonas (CU-10, CU-11) ──────────────────────────────────────


@router.get("/telemetry/fleet", response_model=FleetSnapshotOut)
def fleet(db: DbSession):
    return telemetry_service.fleet_snapshot(db)


@router.get("/gps-devices", response_model=list[GpsDeviceOut])
def list_gps_devices(db: DbSession):
    return telemetry_service.list_devices(db)


@router.post("/gps-devices", response_model=GpsDeviceCreatedOut, status_code=status.HTTP_201_CREATED)
def create_gps_device(data: GpsDeviceCreateIn, db: DbSession):
    return telemetry_service.create_device(db, data)


@router.patch("/gps-devices/{device_id}", response_model=GpsDeviceOut)
def update_gps_device(device_id: uuid.UUID, data: GpsDeviceUpdateIn, db: DbSession):
    return telemetry_service.set_device_active(db, device_id, data.is_active)


@router.get("/geofences", response_model=list[GeofenceOut])
def list_geofences(db: DbSession):
    return telemetry_service.list_geofences(db)


@router.post("/geofences", response_model=GeofenceOut, status_code=status.HTTP_201_CREATED)
def create_geofence(data: GeofenceCreateIn, db: DbSession):
    return telemetry_service.create_geofence(db, data)


@router.patch("/geofences/{fence_id}", response_model=GeofenceOut)
def update_geofence(fence_id: uuid.UUID, data: GeofenceUpdateIn, db: DbSession):
    return telemetry_service.set_geofence_active(db, fence_id, data.is_active)


@router.get("/geofence-alerts", response_model=list[GeofenceAlertOut])
def list_geofence_alerts(db: DbSession, only_open: bool = False):
    return telemetry_service.list_alerts(db, only_open=only_open)


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
def update_rental_unit(unit_id: uuid.UUID, data: RentalUnitStatusIn, user: AdminUser, db: DbSession):
    return rentals.set_unit_status(db, unit_id, data.status, user.id)


@router.get("/rental-units/{unit_id}", response_model=RentalUnitOut)
def get_rental_unit(unit_id: uuid.UUID, db: DbSession):
    return rentals.get_unit(db, unit_id)


@router.get("/rental-units/{unit_id}/maintenance-log", response_model=list[MaintenanceLogOut])
def get_maintenance_log(unit_id: uuid.UUID, db: DbSession):
    return maintenance.list_log(db, unit_id)


@router.post("/rental-units/{unit_id}/usage", response_model=RentalUnitOut)
def record_unit_usage(unit_id: uuid.UUID, data: UnitUsageIn, user: AdminUser, db: DbSession):
    maintenance.record_usage(db, unit_id, data.amount, data.note, user.id)
    return rentals.get_unit(db, unit_id)


@router.put("/rental-units/{unit_id}/threshold", response_model=RentalUnitOut)
def set_unit_threshold(unit_id: uuid.UUID, data: UnitThresholdIn, user: AdminUser, db: DbSession):
    maintenance.set_threshold(db, unit_id, data.service_threshold, user.id)
    return rentals.get_unit(db, unit_id)


@router.post("/rental-units/{unit_id}/maintenance/finish", response_model=RentalUnitOut)
def finish_unit_maintenance(unit_id: uuid.UUID, data: MaintenanceFinishIn, user: AdminUser, db: DbSession):
    maintenance.finish_maintenance(db, unit_id, data.note, user.id)
    return rentals.get_unit(db, unit_id)


# ─── Facturas ──────────────────────────────────────────────────────────────


@router.get("/invoices/{invoice_id}/{fmt}")
def download_invoice(invoice_id: uuid.UUID, fmt: Literal["pdf", "xml"], db: DbSession):
    invoice = db.get(Invoice, invoice_id)
    if invoice is None:
        raise NotFoundError("La factura no existe.")
    return invoice_response(invoice, fmt)
