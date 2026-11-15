from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status

from app.api.deps import DbSession
from app.modules.domicilios import service as deliveries
from app.modules.domicilios.schemas import DropAck
from app.modules.telemetria import service
from app.modules.telemetria.models import GpsDevice
from app.modules.telemetria.schemas import PositionAck, PositionIn

router = APIRouter(prefix="/telemetry", tags=["telemetría"])


def _device(db, authorization: str | None) -> GpsDevice:
    scheme, _, token = (authorization or "").partition(" ")
    device = service.device_for_token(db, token) if scheme.lower() == "bearer" else None
    if device is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de dispositivo inválido.")
    return device


@router.post("/positions", response_model=PositionAck, status_code=status.HTTP_201_CREATED)
def report_position(data: PositionIn, db: DbSession, authorization: Annotated[str | None, Header()] = None):
    """Un dispositivo reporta su posición con `Authorization: Bearer <token>` (sin sesión ni CSRF)."""
    return service.record_position(db, _device(db, authorization), data)


@router.post("/drops", response_model=DropAck, status_code=status.HTTP_201_CREATED)
def report_drop(data: PositionIn, db: DbSession, authorization: Annotated[str | None, Header()] = None):
    """Un dron de domicilios avisa que liberó el paquete, con la posición donde lo hizo."""
    return deliveries.record_drop_from_device(db, _device(db, authorization), data.latitude, data.longitude)
