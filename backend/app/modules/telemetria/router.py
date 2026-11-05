from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status

from app.api.deps import DbSession
from app.modules.telemetria import service
from app.modules.telemetria.schemas import PositionAck, PositionIn

router = APIRouter(prefix="/telemetry", tags=["telemetría"])


@router.post("/positions", response_model=PositionAck, status_code=status.HTTP_201_CREATED)
def report_position(data: PositionIn, db: DbSession, authorization: Annotated[str | None, Header()] = None):
    """Un dispositivo reporta su posición con `Authorization: Bearer <token>` (sin sesión ni CSRF)."""
    scheme, _, token = (authorization or "").partition(" ")
    device = service.device_for_token(db, token) if scheme.lower() == "bearer" else None
    if device is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de dispositivo inválido.")
    return service.record_position(db, device, data)
