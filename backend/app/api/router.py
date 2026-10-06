from fastapi import APIRouter

from app.api.routes import admin, auth, branches, cart, catalog, health, orders, rentals

api_router = APIRouter(prefix="/api/v1")
for module in (health, catalog, branches, auth, cart, orders, rentals, admin):
    api_router.include_router(module.router)
