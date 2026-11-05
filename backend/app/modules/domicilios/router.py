from fastapi import APIRouter

from app.api.deps import DbSession
from app.modules.domicilios import service
from app.modules.domicilios.schemas import TrackingOut

router = APIRouter(prefix="/tracking", tags=["domicilios"])


@router.get("/{token}", response_model=TrackingOut, response_model_exclude_none=True)
def track(token: str, db: DbSession):
    """Seguimiento público por enlace (CU-07). No requiere sesión."""
    return service.tracking(db, token)
