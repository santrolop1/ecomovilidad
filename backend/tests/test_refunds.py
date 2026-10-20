"""CU-15: cancelación por el cliente y reembolsos registrados en el panel."""

from datetime import timedelta

from .conftest import csrf, register
from .test_admin import place_order, stock
from .test_rental_bookings import book, branch_of, offers, quote, weekday_at

REASON = "Ya no lo necesito, me equivoqué de modelo."


def pay(client, gateway, **target):
    payment = client.post("/api/v1/payments", json=target, headers=csrf(client)).json()
    amount = client.get(
        f"/api/v1/orders/{target['orderId']}" if "orderId" in target else f"/api/v1/rentals/{target['rentalId']}"
    ).json()
    total = amount.get("total", amount.get("price"))
    tx = gateway.approve(payment["reference"], total * 100, tx_id=f"tx-{payment['reference']}")
    client.post("/api/v1/payments/verify", json={"transactionId": tx.id}, headers=csrf(client))


def test_cliente_cancela_pedido_sin_pagar(auth_client, db):
    order, pid, bid = place_order(auth_client)
    before = stock(db, pid, bid)
    response = auth_client.post(f"/api/v1/orders/{order['id']}/cancel", headers=csrf(auth_client))
    assert response.status_code == 200 and response.json()["status"] == "cancelled"
    assert stock(db, pid, bid) == (before[0] + 2, before[1] - 2, before[2])


def test_pedido_pagado_no_se_cancela_pide_reembolso_y_el_panel_lo_registra(admin_client, gateway, db):
    order, pid, bid = place_order(admin_client)
    pay(admin_client, gateway, orderId=order["id"])
    sold = stock(db, pid, bid)
    url = f"/api/v1/orders/{order['id']}"
    assert admin_client.post(f"{url}/cancel", headers=csrf(admin_client)).status_code == 409

    short = admin_client.post(f"{url}/refund-request", json={"reason": "no"}, headers=csrf(admin_client))
    assert short.status_code == 422
    created = admin_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(admin_client))
    assert created.status_code == 201 and created.json()["status"] == "abierta"
    again = admin_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(admin_client))
    assert again.status_code == 409
    assert admin_client.get(url).json()["refundRequest"]["status"] == "abierta"

    requests = admin_client.get("/api/v1/admin/dashboard").json()["refundRequests"]
    assert [(r["orderId"], r["amount"]) for r in requests] == [(order["id"], order["total"])]

    resolved = admin_client.post(f"/api/v1/admin/orders/{order['id']}/refund", headers=csrf(admin_client)).json()
    assert resolved["status"] == "cancelled" and resolved["refundRequest"]["status"] == "reembolsada"
    # Las unidades vendidas vuelven al inventario y dejan de contar como vendidas.
    assert stock(db, pid, bid) == (sold[0] + 2, sold[1], sold[2] + 2)
    assert admin_client.get("/api/v1/admin/dashboard").json()["refundRequests"] == []
    assert (
        admin_client.post(f"/api/v1/admin/orders/{order['id']}/refund", headers=csrf(admin_client)).status_code == 409
    )


def test_pedido_sin_pagar_no_pide_reembolso_y_ajeno_es_404(auth_client):
    order, _, _ = place_order(auth_client)
    url = f"/api/v1/orders/{order['id']}"
    assert (
        auth_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(auth_client)).status_code == 409
    )
    auth_client.cookies.clear()
    register(auth_client, email="otra@correo.com")
    assert auth_client.post(f"{url}/cancel", headers=csrf(auth_client)).status_code == 404
    assert (
        auth_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(auth_client)).status_code == 404
    )


def test_alquiler_cancelado_y_reembolsado_libera_la_unidad(admin_client, gateway):
    dron = offers(admin_client)["nimbo-explorer-4k"]
    branch = branch_of(dron)
    start = weekday_at(10)
    end = start + timedelta(hours=3)

    pending = book(admin_client, dron, branch, start, end)
    cancelled = admin_client.post(f"/api/v1/rentals/{pending['id']}/cancel", headers=csrf(admin_client)).json()
    assert cancelled["status"] == "cancelled"
    assert quote(admin_client, dron, branch, start, end).json()["availableUnits"] == 1

    paid = book(admin_client, dron, branch, start, end)
    pay(admin_client, gateway, rentalId=paid["id"])
    url = f"/api/v1/rentals/{paid['id']}"
    assert admin_client.post(f"{url}/cancel", headers=csrf(admin_client)).status_code == 409
    admin_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(admin_client))
    resolved = admin_client.post(f"/api/v1/admin/rentals/{paid['id']}/refund", headers=csrf(admin_client)).json()
    assert resolved["status"] == "cancelled" and resolved["refundRequest"]["status"] == "reembolsada"
    assert quote(admin_client, dron, branch, start, end).json()["availableUnits"] == 1


def test_solo_un_administrador_registra_reembolsos(auth_client):
    order, _, _ = place_order(auth_client)
    response = auth_client.post(f"/api/v1/admin/orders/{order['id']}/refund", headers=csrf(auth_client))
    assert response.status_code == 403
