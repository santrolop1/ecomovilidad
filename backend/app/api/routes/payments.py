import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.payment import (
    PaymentConfigOut,
    PaymentResultOut,
    PaymentStartIn,
    PaymentStartOut,
    PaymentVerifyIn,
    SimulationDecisionIn,
    SimulationDecisionOut,
    SimulationOut,
)
from app.services.payments import service
from app.services.payments.gateway import PaymentGateway, get_payment_gateway

router = APIRouter(prefix="/payments", tags=["pagos"])
Gateway = Annotated[PaymentGateway, Depends(get_payment_gateway)]


@router.get("/config", response_model=PaymentConfigOut)
def payment_config():
    """Si los pagos en línea están configurados y si son de pruebas (sandbox)."""
    return service.payment_config()


@router.post("", response_model=PaymentStartOut, status_code=status.HTTP_201_CREATED)
def start_payment(data: PaymentStartIn, user: CurrentUser, db: DbSession, gateway: Gateway):
    """Crea un intento de pago y devuelve la URL del Web Checkout de Wompi."""
    return service.start_payment(db, user, gateway, order_id=data.order_id, rental_id=data.rental_id)


@router.post("/verify", response_model=PaymentResultOut, response_model_exclude_none=True)
def verify_payment(data: PaymentVerifyIn, user: CurrentUser, db: DbSession, gateway: Gateway):
    """Regreso desde la pasarela: el estado se consulta a Wompi, no se cree al navegador."""
    return service.verify_return(db, user, gateway, data.transaction_id)


@router.get("/simulator/{reference}", response_model=SimulationOut, response_model_exclude_none=True)
def simulation(reference: str, user: CurrentUser, db: DbSession, gateway: Gateway):
    """Pasarela simulada: datos del pago (solo su dueño; 404 si la pasarela activa es Wompi)."""
    return service.simulation_info(db, user, gateway, reference)


@router.post("/simulator/{reference}", response_model=SimulationDecisionOut)
def simulate(reference: str, data: SimulationDecisionIn, user: CurrentUser, db: DbSession, gateway: Gateway):
    """Pasarela simulada: el cliente aprueba o rechaza (sin cobro real)."""
    return service.simulate_decision(db, user, gateway, reference, data.decision)


@router.get("/{reference}", response_model=PaymentResultOut, response_model_exclude_none=True)
def get_payment(reference: str, user: CurrentUser, db: DbSession):
    return service.get_result(db, user, reference)


@router.post("/webhooks/wompi", status_code=status.HTTP_200_OK)
async def wompi_webhook(
    request: Request,
    db: DbSession,
    gateway: Gateway,
    checksum: Annotated[str | None, Header(alias="X-Event-Checksum")] = None,
) -> dict[str, str]:
    """Eventos de Wompi (sin sesión: se autentican con su checksum)."""
    try:
        payload: Any = json.loads(await request.body())
    except ValueError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cuerpo inválido.") from error
    if not isinstance(payload, dict) or not service.handle_event(db, gateway, payload, checksum):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Firma del evento inválida.")
    return {"status": "ok"}
