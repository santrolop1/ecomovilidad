from fastapi import APIRouter, Depends

from app.api import health
from app.api.deps import release_expired_reservations
from app.modules.admin import router as admin
from app.modules.alquiler import router as rentals
from app.modules.autenticacion import router as auth
from app.modules.carrito import router as cart
from app.modules.catalogo import router as catalog
from app.modules.contenidos import router as content
from app.modules.domicilios import router as tracking
from app.modules.pagos import invoices_router as invoices
from app.modules.pagos import router as payments
from app.modules.pedidos import router as orders
from app.modules.sucursales import router as branches
from app.modules.telemetria import router as telemetry

api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(release_expired_reservations)])
for module in (
    health,
    catalog,
    branches,
    auth,
    cart,
    orders,
    payments,
    invoices,
    rentals,
    tracking,
    telemetry,
    content,
    admin,
):
    api_router.include_router(module.router)
