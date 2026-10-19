"""Pasarela de pagos Wompi (Web Checkout).

Flujo:
1. El backend crea el pago y arma la URL del Web Checkout con la firma de
   integridad (SHA-256 de referencia + monto + moneda + vencimiento + secreto).
   El secreto nunca sale del servidor.
2. El cliente paga en Wompi y vuelve a `redirect-url?id=<transacción>`.
3. El resultado NO se toma del navegador: el backend consulta la transacción a
   Wompi con la llave privada, o recibe el evento `transaction.updated` cuya
   firma (checksum) verifica con el secreto de eventos.

Documentación: docs.wompi.co (Web Checkout, Eventos, Transacciones).
"""

import hashlib
import hmac
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, Any, Protocol

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.services.errors import BadGatewayError, ServiceUnavailableError

logger = logging.getLogger("ecomovilidad.payments")

TIMEOUT_SECONDS = 15


@dataclass(frozen=True)
class CheckoutCustomer:
    email: str
    full_name: str
    phone: str
    legal_id: str
    legal_id_type: str


@dataclass(frozen=True)
class GatewayTransaction:
    id: str
    reference: str
    status: str  # PENDING | APPROVED | DECLINED | VOIDED | ERROR
    amount_in_cents: int
    currency: str
    payment_method_type: str | None = None
    status_message: str | None = None

    @classmethod
    def from_wompi(cls, data: dict[str, Any]) -> "GatewayTransaction":
        return cls(
            id=str(data["id"]),
            reference=str(data["reference"]),
            status=str(data["status"]).upper(),
            amount_in_cents=int(data["amount_in_cents"]),
            currency=str(data.get("currency") or "COP"),
            payment_method_type=data.get("payment_method_type"),
            status_message=(data.get("status_message") or None),
        )


class PaymentGateway(Protocol):
    name: str  # "wompi" | "simulado" (se guarda en payments.provider)
    sandbox: bool

    def checkout_url(
        self,
        *,
        reference: str,
        amount_in_cents: int,
        redirect_url: str,
        expires_at: datetime,
        customer: CheckoutCustomer,
    ) -> str: ...

    def get_transaction(self, transaction_id: str) -> GatewayTransaction | None: ...

    def verify_event(self, payload: dict[str, Any], checksum: str | None) -> bool: ...


def wompi_timestamp(moment: datetime) -> str:
    """Formato ISO 8601 en UTC con milisegundos que espera `expiration-time`."""
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def integrity_signature(
    reference: str, amount_in_cents: int, currency: str, secret: str, expiration_time: str | None = None
) -> str:
    """Firma de integridad del Web Checkout: SHA-256 hex de
    `<referencia><monto><moneda>[<vencimiento>]<secreto>`."""
    raw = f"{reference}{amount_in_cents}{currency}{expiration_time or ''}{secret}"
    return hashlib.sha256(raw.encode()).hexdigest()


def event_checksum(payload: dict[str, Any], secret: str) -> str:
    """Checksum de un evento: SHA-256 de los valores de `signature.properties`
    (rutas dentro de `data`, en ese orden) + `timestamp` + secreto de eventos."""
    values = []
    for path in payload["signature"]["properties"]:
        node: Any = payload["data"]
        for key in path.split("."):
            node = node[key]
        values.append(str(node))
    raw = "".join(values) + str(payload["timestamp"]) + secret
    return hashlib.sha256(raw.encode()).hexdigest()


class WompiGateway:
    name = "wompi"

    def __init__(self, settings: Settings):
        self.settings = settings
        self.sandbox = settings.payments_sandbox

    def checkout_url(
        self,
        *,
        reference: str,
        amount_in_cents: int,
        redirect_url: str,
        expires_at: datetime,
        customer: CheckoutCustomer,
    ) -> str:
        expiration = wompi_timestamp(expires_at)
        params = {
            "public-key": self.settings.wompi_public_key,
            "currency": "COP",
            "amount-in-cents": str(amount_in_cents),
            "reference": reference,
            "signature:integrity": integrity_signature(
                reference, amount_in_cents, "COP", self.settings.wompi_integrity_secret, expiration
            ),
            "redirect-url": redirect_url,
            "expiration-time": expiration,
            "customer-data:email": customer.email,
            "customer-data:full-name": customer.full_name,
            "customer-data:phone-number": "".join(ch for ch in customer.phone if ch.isdigit())[-10:],
            "customer-data:legal-id": customer.legal_id,
            "customer-data:legal-id-type": customer.legal_id_type,
        }
        return f"{self.settings.wompi_checkout_url}?{urllib.parse.urlencode(params)}"

    def get_transaction(self, transaction_id: str) -> GatewayTransaction | None:
        """Consulta servidor a servidor con la llave privada (fuente de verdad del estado)."""
        url = f"{self.settings.wompi_api_url}/transactions/{urllib.parse.quote(transaction_id, safe='')}"
        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.settings.wompi_private_key}"})
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                body = json.loads(response.read())
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            logger.error("Wompi respondió %s al consultar la transacción %s", error.code, transaction_id)
            raise BadGatewayError("No pudimos consultar el pago en Wompi. Intenta de nuevo en unos minutos.") from error
        except (urllib.error.URLError, TimeoutError) as error:
            logger.error("Wompi no respondió al consultar la transacción %s: %s", transaction_id, error)
            raise BadGatewayError("No pudimos consultar el pago en Wompi. Intenta de nuevo en unos minutos.") from error
        return GatewayTransaction.from_wompi(body["data"])

    def verify_event(self, payload: dict[str, Any], checksum: str | None) -> bool:
        received = checksum or payload.get("signature", {}).get("checksum")
        if not received:
            return False
        try:
            expected = event_checksum(payload, self.settings.wompi_events_secret)
        except (KeyError, TypeError):
            return False
        return hmac.compare_digest(expected.lower(), str(received).lower())


class SimulatedGateway:
    """Pasarela SIMULADA para desarrollo y demostraciones (sin cuenta de Wompi).

    El checkout es una página de EcoMovilidad (/pagos/simulador) donde el
    cliente aprueba o rechaza el pago; no se cobra dinero real. La decisión la
    registra el backend (POST /payments/simulator/{referencia}) y el resto del
    flujo es el mismo que con Wompi: verificación, inventario y factura.
    Nunca está activa con ENVIRONMENT=production (ver Settings).
    """

    name = "simulado"
    sandbox = True
    METHOD = "SIMULADO"

    def __init__(self, settings: Settings, db: Session):
        self.settings = settings
        self.db = db

    def checkout_url(
        self,
        *,
        reference: str,
        amount_in_cents: int,
        redirect_url: str,
        expires_at: datetime,
        customer: CheckoutCustomer,
    ) -> str:
        query = urllib.parse.urlencode({"referencia": reference})
        return f"{self.settings.frontend_url.rstrip('/')}/pagos/simulador?{query}"

    def get_transaction(self, transaction_id: str) -> GatewayTransaction | None:
        from app.models import Payment

        payment = self.db.scalars(
            select(Payment).where(Payment.provider_transaction_id == transaction_id, Payment.provider == self.name)
        ).one_or_none()
        if payment is None:
            return None
        return GatewayTransaction(
            id=transaction_id,
            reference=payment.reference,
            status=payment.status.upper(),
            amount_in_cents=payment.amount_in_cents,
            currency=payment.currency,
            payment_method_type=self.METHOD,
            status_message=payment.status_message,
        )

    def verify_event(self, payload: dict[str, Any], checksum: str | None) -> bool:
        return False  # la pasarela simulada no envía eventos


class UnconfiguredGateway:
    """Sin pasarela disponible: ningún pago se puede iniciar ni verificar."""

    name = "ninguna"
    sandbox = False

    def _fail(self) -> ServiceUnavailableError:
        return ServiceUnavailableError("Los pagos en línea no están configurados en este entorno.")

    def checkout_url(self, **_: Any) -> str:
        raise self._fail()

    def get_transaction(self, transaction_id: str) -> GatewayTransaction | None:
        raise self._fail()

    def verify_event(self, payload: dict[str, Any], checksum: str | None) -> bool:
        return False


def get_payment_gateway(db: Annotated[Session, Depends(get_db)]) -> PaymentGateway:
    """Wompi si tiene llaves; si no, en desarrollo, la pasarela simulada (Settings.active_payment_provider)."""
    settings = get_settings()
    provider = settings.active_payment_provider
    if provider == "wompi":
        return WompiGateway(settings)
    if provider == "simulado":
        return SimulatedGateway(settings, db)
    return UnconfiguredGateway()
