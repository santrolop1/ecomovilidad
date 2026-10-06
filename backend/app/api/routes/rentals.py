from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.rental import RentalOut
from app.services.rentals import list_rentals

router = APIRouter(tags=["alquiler"])


@router.get("/rentals", response_model=list[RentalOut])
def get_rentals(user: CurrentUser, db: DbSession):
    """Alquileres del usuario autenticado."""
    return list_rentals(db, user)
