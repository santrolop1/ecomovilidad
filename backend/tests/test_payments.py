"""CU-03 / CU-05: pago con la pasarela, descuento de inventario y factura."""

import hashlib
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from app.core.config import Settings
from app.models import Invoice, Order, Payment
from app.services.payments.gateway import WompiGateway, event_checksum, integrity_signature
from app.services.payments.invoices import split_vat

from .conftest import EVENTS_SECRET, csrf, register, wompi_event
from .test_admin import place_order, stock

P = "/api/v1/payments"


def start(client, order_id):
    response = client.post(P, json={"orderId": order_id}, headers=csrf(client))
    assert response.status_code == 201, response.text
    return response.json()


def verify(client, tx_id):
    return client.post(f"{P}/verify", json={"transactionId": tx_id}, headers=csrf(client))


# ─── Firmas (algoritmos documentados por Wompi) ─────────────────────────────


def test_firma_de_integridad_coincide_con_el_ejemplo_de_wompi():
    # Ejemplo de docs.wompi.co, "Widget & Checkout Web".
    assert (
        integrity_signature("sk8-438k4-xmxm392-sn2m", 2490000, "COP", "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6")
        == "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5"
    )


def test_checksum_de_eventos_sigue_el_procedimiento_documentado():
    # Propiedades en el orden indicado + timestamp + secreto, SHA-256.
    payload = {
        "data": {"transaction": {"id": "1234-1610641025-49201", "status": "APPROVED", "amount_in_cents": 4490000}},
        "signature": {"properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"]},
        "timestamp": 1530291411,
    }
    raw = "1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z"
    expected = hashlib.sha256(raw.encode()).hexdigest()
    assert event_checksum(payload, "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z") == expected


def test_url_de_checkout_firmada_y_sin_secretos():
    settings = Settings(
        wompi_public_key="pub_test_x",
        wompi_private_key="prv_test_secreta",
        wompi_events_secret="test_events_x",
        wompi_integrity_secret="test_integrity_secreto",
    )
    from app.services.payments.gateway import CheckoutCustomer

    expires = datetime(2026, 10, 20, 15, 30, tzinfo=UTC)
    url = WompiGateway(settings).checkout_url(
        reference="EMP-1",
        amount_in_cents=500000,
        redirect_url="https://demo.test/pagos/resultado",
        expires_at=expires,
        customer=CheckoutCustomer("ana@correo.com", "Ana Pérez", "300 123 4567", "1098765432", "CC"),
    )
    query = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query))
    assert query["public-key"] == "pub_test_x" and query["amount-in-cents"] == "500000"
    assert query["expiration-time"] == "2026-10-20T15:30:00.000Z"
    assert query["signature:integrity"] == integrity_signature(
        "EMP-1", 500000, "COP", "test_integrity_secreto", "2026-10-20T15:30:00.000Z"
    )
    assert "secret" not in url and "prv_test" not in url
    assert query["customer-data:phone-number"] == "3001234567"


# ─── Flujo de pago de un pedido ─────────────────────────────────────────────


def test_pago_aprobado_descuenta_inventario_y_emite_factura(auth_client, gateway, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    assert order["status"] == "pending" and order["paymentExpiresAt"]

    payment = start(auth_client, order["id"])
    assert payment["checkoutUrl"].startswith("https://checkout.wompi.co/p/") and payment["sandbox"] is True
    assert gateway.checkouts[0]["amount"] == order["total"] * 100
    assert gateway.checkouts[0]["redirect"].endswith("/pagos/resultado")

    tx = gateway.approve(payment["reference"], order["total"] * 100)
    result = verify(auth_client, tx.id).json()
    assert result["status"] == "approved" and result["target"] == "pedido"
    assert result["invoice"]["number"].startswith("EMV-")

    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)
    detail = auth_client.get(f"/api/v1/orders/{order['id']}").json()
    assert detail["status"] == "paid" and "paymentExpiresAt" not in detail
    assert detail["payment"]["status"] == "approved" and detail["payment"]["paymentMethodType"] == "CARD"
    assert detail["invoice"]["number"] == result["invoice"]["number"]

    # Volver a verificar la misma transacción no cambia nada (idempotente).
    assert verify(auth_client, tx.id).json()["status"] == "approved"
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)
    assert db.scalar(select(Invoice.id).where(Invoice.order_id == order["id"])) is not None


def test_factura_pdf_y_xml_solo_para_su_dueno(auth_client, gateway, db):
    order, _, _ = place_order(auth_client)
    payment = start(auth_client, order["id"])
    tx = gateway.approve(payment["reference"], order["total"] * 100)
    invoice = verify(auth_client, tx.id).json()["invoice"]

    pdf = auth_client.get(f"/api/v1/invoices/{invoice['id']}/pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    assert pdf.headers["content-type"] == "application/pdf"
    xml = auth_client.get(f"/api/v1/invoices/{invoice['id']}/xml")
    root = ET.fromstring(xml.content)
    assert root.attrib["dianValidated"] == "false"
    ns = {"f": "urn:ecomovilidad:invoice:1"}
    totals = root.find("f:Totals", ns)
    base, vat = split_vat(order["total"], 19)
    assert int(totals.find("f:TaxableAmount", ns).text) == base and int(totals.find("f:VAT", ns).text) == vat
    assert int(totals.find("f:Payable", ns).text) == order["total"]

    auth_client.cookies.clear()
    register(auth_client, email="otra@correo.com")
    assert auth_client.get(f"/api/v1/invoices/{invoice['id']}/pdf").status_code == 404


def test_rechazado_permite_reintentar(auth_client, gateway, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    first = start(auth_client, order["id"])
    declined = gateway.approve(first["reference"], order["total"] * 100, tx_id="tx-declined", status="DECLINED")
    assert verify(auth_client, declined.id).json()["status"] == "declined"
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "pending"
    assert stock(db, pid, bid) == before  # siguen reservadas

    second = start(auth_client, order["id"])
    assert second["reference"] != first["reference"]
    tx = gateway.approve(second["reference"], order["total"] * 100, tx_id="tx-ok")
    assert verify(auth_client, tx.id).json()["status"] == "approved"
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "paid"
    # Un pedido pagado no admite otro pago.
    assert auth_client.post(P, json={"orderId": order["id"]}, headers=csrf(auth_client)).status_code == 409


def test_monto_distinto_no_aplica_el_pago(auth_client, gateway, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    payment = start(auth_client, order["id"])
    tx = gateway.approve(payment["reference"], 100)  # alguien alteró el monto
    result = verify(auth_client, tx.id).json()
    assert result["status"] == "error" and "monto" in result["statusMessage"]
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "pending"
    assert stock(db, pid, bid) == before


def test_no_se_paga_ni_se_verifica_un_pedido_ajeno(auth_client, gateway):
    order, _, _ = place_order(auth_client)
    payment = start(auth_client, order["id"])
    tx = gateway.approve(payment["reference"], order["total"] * 100)
    auth_client.cookies.clear()
    register(auth_client, email="otra@correo.com")
    assert auth_client.post(P, json={"orderId": order["id"]}, headers=csrf(auth_client)).status_code == 404
    assert verify(auth_client, tx.id).status_code == 404
    assert auth_client.get(f"{P}/{payment['reference']}").status_code == 404


def test_en_produccion_sin_llaves_no_hay_pagos_ni_pasarela_simulada(auth_client, monkeypatch):
    from app.core.config import get_settings

    for key in ("WOMPI_PUBLIC_KEY", "WOMPI_PRIVATE_KEY", "WOMPI_EVENTS_SECRET", "WOMPI_INTEGRITY_SECRET"):
        monkeypatch.setenv(key, "")  # aunque backend/.env tenga llaves reales
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("PAYMENT_PROVIDER", "simulado")  # ni siquiera forzándola
    get_settings.cache_clear()
    try:
        order, _, _ = place_order(auth_client)
        response = auth_client.post(P, json={"orderId": order["id"]}, headers=csrf(auth_client))
        assert response.status_code == 503
        config = auth_client.get(f"{P}/config").json()
        assert config["enabled"] is False and config.get("provider") is None
    finally:
        get_settings.cache_clear()


# ─── Eventos (webhook) ──────────────────────────────────────────────────────


def tx_payload(reference, amount, status="APPROVED", tx_id="evt-tx-1"):
    return {
        "id": tx_id,
        "reference": reference,
        "status": status,
        "amount_in_cents": amount,
        "currency": "COP",
        "payment_method_type": "PSE",
    }


def test_evento_firmado_aprueba_una_sola_vez(auth_client, gateway, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    payment = start(auth_client, order["id"])
    payload, checksum = wompi_event(tx_payload(payment["reference"], order["total"] * 100))

    for _ in range(2):  # Wompi reintenta: el mismo evento se procesa una vez
        response = auth_client.post(f"{P}/webhooks/wompi", json=payload, headers={"X-Event-Checksum": checksum})
        assert response.status_code == 200
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "paid"
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)
    assert len(db.scalars(select(Invoice).where(Invoice.order_id == order["id"])).all()) == 1


def test_evento_con_firma_invalida_se_rechaza(auth_client, gateway):
    order, _, _ = place_order(auth_client)
    payment = start(auth_client, order["id"])
    payload, _ = wompi_event(tx_payload(payment["reference"], order["total"] * 100))
    forged = hashlib.sha256(b"otra cosa" + EVENTS_SECRET.encode()).hexdigest()
    response = auth_client.post(f"{P}/webhooks/wompi", json=payload, headers={"X-Event-Checksum": forged})
    assert response.status_code == 401
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "pending"


def test_evento_de_referencia_desconocida_se_acepta_sin_efecto(client, gateway):
    payload, checksum = wompi_event(tx_payload("NO-EXISTE", 100))
    assert client.post(f"{P}/webhooks/wompi", json=payload, headers={"X-Event-Checksum": checksum}).status_code == 200


# ─── Vencimiento sin pago ───────────────────────────────────────────────────


def test_pedido_sin_pagar_vence_y_libera_inventario(auth_client, gateway, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    db.execute(
        update(Order).where(Order.id == order["id"]).values(payment_expires_at=datetime.now(UTC) - timedelta(hours=1))
    )
    db.commit()
    detail = auth_client.get(f"/api/v1/orders/{order['id']}").json()  # cualquier solicitud procesa vencimientos
    assert detail["status"] == "cancelled"
    assert stock(db, pid, bid) == (before[0] + 2, before[1] - 2, before[2])
    assert auth_client.post(P, json={"orderId": order["id"]}, headers=csrf(auth_client)).status_code == 409


def test_pago_aprobado_tarde_queda_para_reembolso(admin_client, gateway, db):
    order, pid, bid = place_order(admin_client)
    payment = start(admin_client, order["id"])
    db.execute(
        update(Order).where(Order.id == order["id"]).values(payment_expires_at=datetime.now(UTC) - timedelta(hours=1))
    )
    db.commit()
    assert admin_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "cancelled"
    after_cancel = stock(db, pid, bid)

    tx = gateway.approve(payment["reference"], order["total"] * 100)
    result = verify(admin_client, tx.id).json()
    assert result["status"] == "approved" and result["requiresRefund"] is True and "invoice" not in result
    assert stock(db, pid, bid) == after_cancel  # no se vende lo que ya se liberó
    alerts = admin_client.get("/api/v1/admin/dashboard").json()["paymentsRequiringRefund"]
    assert [a["reference"] for a in alerts] == [payment["reference"]]


def test_pago_pendiente_de_la_pasarela_tiene_margen(auth_client, gateway, db):
    order, _, _ = place_order(auth_client)
    start(auth_client, order["id"])  # p. ej. un PSE en curso
    db.execute(
        update(Order).where(Order.id == order["id"]).values(payment_expires_at=datetime.now(UTC) - timedelta(minutes=5))
    )
    db.commit()
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "pending"
    db.execute(update(Payment).values(created_at=datetime.now(UTC) - timedelta(hours=1)))
    db.execute(
        update(Order).where(Order.id == order["id"]).values(payment_expires_at=datetime.now(UTC) - timedelta(hours=1))
    )
    db.commit()
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "cancelled"


def test_facturas_consecutivas(auth_client, gateway):
    numbers = []
    for n in range(2):
        order, _, _ = place_order(auth_client, quantity=1)
        payment = start(auth_client, order["id"])
        tx = gateway.approve(payment["reference"], order["total"] * 100, tx_id=f"tx-{n}")
        numbers.append(int(verify(auth_client, tx.id).json()["invoice"]["number"].split("-")[1]))
    assert numbers[1] == numbers[0] + 1
