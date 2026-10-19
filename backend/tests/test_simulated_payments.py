"""Pasarela simulada (desarrollo y demostración, sin cuenta de Wompi)."""

import pytest
from sqlalchemy import select

from app.models import Invoice, Payment

from .conftest import csrf, register
from .test_admin import place_order, stock
from .test_rental_bookings import book, branch_of, offers, weekday_at

P = "/api/v1/payments"


@pytest.fixture
def simulated(monkeypatch):
    """Sin llaves de Wompi y en desarrollo: la pasarela activa es la simulada."""
    from app.core.config import get_settings

    for key in ("WOMPI_PUBLIC_KEY", "WOMPI_PRIVATE_KEY", "WOMPI_EVENTS_SECRET", "WOMPI_INTEGRITY_SECRET"):
        monkeypatch.setenv(key, "")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("PAYMENT_PROVIDER", "auto")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def start(client, **target):
    response = client.post(P, json=target, headers=csrf(client))
    assert response.status_code == 201, response.text
    return response.json()


def decide(client, reference, decision, expect=200):
    response = client.post(f"{P}/simulator/{reference}", json={"decision": decision}, headers=csrf(client))
    assert response.status_code == expect, response.text
    return response.json()


def test_configuracion_indica_la_pasarela_simulada(client, simulated):
    assert client.get(f"{P}/config").json() == {
        "enabled": True,
        "sandbox": True,
        "windowMinutes": 30,
        "provider": "simulado",
    }


def test_aprobar_en_la_simulada_aplica_el_mismo_flujo_que_wompi(auth_client, simulated, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    payment = start(auth_client, orderId=order["id"])
    assert payment["provider"] == "simulado" and payment["sandbox"] is True
    assert payment["checkoutUrl"].endswith(f"/pagos/simulador?referencia={payment['reference']}")

    info = auth_client.get(f"{P}/simulator/{payment['reference']}").json()
    assert info["amount"] == order["total"] and info["status"] == "pending" and info["target"] == "pedido"

    tx = decide(auth_client, payment["reference"], "approved")["transactionId"]
    assert tx.startswith("SIM-")
    result = auth_client.post(f"{P}/verify", json={"transactionId": tx}, headers=csrf(auth_client)).json()
    assert result["status"] == "approved" and result["paymentMethodType"] == "SIMULADO"
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "paid"
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)

    invoice = db.scalars(select(Invoice).where(Invoice.order_id == order["id"])).one()
    assert "<Provider>simulado</Provider>" in invoice.xml
    assert db.scalars(select(Payment.provider).where(Payment.reference == payment["reference"])).one() == "simulado"
    # Una decisión ya aplicada no se repite.
    decide(auth_client, payment["reference"], "declined", expect=409)


def test_rechazar_permite_reintentar(auth_client, simulated, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    first = start(auth_client, orderId=order["id"])
    tx = decide(auth_client, first["reference"], "declined")["transactionId"]
    result = auth_client.post(f"{P}/verify", json={"transactionId": tx}, headers=csrf(auth_client)).json()
    assert result["status"] == "declined" and "pasarela de pruebas" in result["statusMessage"]
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "pending"
    assert stock(db, pid, bid) == before

    second = start(auth_client, orderId=order["id"])
    decide(auth_client, second["reference"], "approved")
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "paid"


def test_alquiler_con_la_simulada(auth_client, simulated):
    dron = offers(auth_client)["nimbo-explorer-4k"]
    start_at = weekday_at(10)
    from datetime import timedelta

    rental = book(auth_client, dron, branch_of(dron), start_at, start_at + timedelta(hours=4))
    payment = start(auth_client, rentalId=rental["id"])
    assert (
        auth_client.get(f"{P}/simulator/{payment['reference']}").json()["description"]
        == "Alquiler de Nimbo Explorer 4K"
    )
    decide(auth_client, payment["reference"], "approved")
    detail = auth_client.get(f"/api/v1/rentals/{rental['id']}").json()
    assert detail["status"] == "confirmed" and detail["invoice"]["number"].startswith("EMV-")


def test_solo_el_dueno_decide(auth_client, simulated):
    order, _, _ = place_order(auth_client)
    payment = start(auth_client, orderId=order["id"])
    auth_client.cookies.clear()
    register(auth_client, email="otra@correo.com")
    assert auth_client.get(f"{P}/simulator/{payment['reference']}").status_code == 404
    decide(auth_client, payment["reference"], "approved", expect=404)


def test_con_wompi_activo_no_existe_la_simulada(auth_client, gateway):
    """Con llaves de Wompi la página de pruebas no sirve para "pagar"."""
    order, _, _ = place_order(auth_client)
    payment = start(auth_client, orderId=order["id"])
    assert auth_client.get(f"{P}/simulator/{payment['reference']}").status_code == 404
    decide(auth_client, payment["reference"], "approved", expect=404)
