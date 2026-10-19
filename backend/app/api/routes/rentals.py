import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.rental import RentalCreateIn, RentalOfferOut, RentalOut, RentalPeriodIn, RentalQuoteOut
from app.services import rentals as service

router = APIRouter(tags=["alquiler"])


@router.get("/rental-offers", response_model=list[RentalOfferOut], response_model_exclude_none=True)
def list_offers(db: DbSession):
    """Vehículos que se alquilan: tarifas y unidades en servicio por sucursal."""
    return service.list_offers(db)


@router.post("/rental-offers/{product_id}/quote", response_model=RentalQuoteOut)
def quote(product_id: uuid.UUID, data: RentalPeriodIn, db: DbSession):
    """Precio y unidades libres para una sucursal y un periodo (no aparta nada)."""
    return service.quote(db, product_id, data)


@router.post(
    "/rentals", response_model=RentalOut, status_code=status.HTTP_201_CREATED, response_model_exclude_none=True
)
def create_rental(data: RentalCreateIn, user: CurrentUser, db: DbSession):
    """Aparta una unidad por el plazo de pago."""
    return service.create_rental(db, user, data)


@router.get("/rentals", response_model=list[RentalOut], response_model_exclude_none=True)
def get_rentals(user: CurrentUser, db: DbSession):
    """Alquileres del usuario autenticado."""
    return service.list_rentals(db, user)


@router.get("/rentals/{rental_id}", response_model=RentalOut, response_model_exclude_none=True)
def get_rental(rental_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return service.get_rental(db, user, rental_id)
