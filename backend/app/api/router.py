from fastapi import APIRouter, Depends

from app.api.deps import release_expired_reservations
from app.api.routes import admin, auth, branches, cart, catalog, health, invoices, orders, payments, rentals

api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(release_expired_reservations)])
for module in (health, catalog, branches, auth, cart, orders, payments, invoices, rentals, admin):
    api_router.include_router(module.router)
