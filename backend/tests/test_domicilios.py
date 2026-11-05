"""CU-07, CU-08 y CU-14: domicilios, seguimiento público y validación de la entrega."""

import base64

from .conftest import add_to_cart, csrf, register
from .test_admin import A, place_order
from .test_orders import order_body
from .test_refunds import REASON, pay

D = f"{A}/deliveries"
PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n-firma-").decode()


def paid_delivery(client, gateway):
    product = client.get("/api/v1/products/patinova-city-80").json()
    add_to_cart(client, product["id"], 1)
    order = client.post("/api/v1/orders", json=order_body(product["id"]), headers=csrf(client)).json()
    pay(client, gateway, orderId=order["id"])
    return client.get(f"/api/v1/orders/{order['id']}").json()


def delivery_id(client, order):
    return client.get(f"{A}/orders/{order['id']}").json()["deliveryId"]


def courier(client, name="Carlos Rueda"):
    body = {"name": name, "phone": "3001112233"}
    return client.post(f"{A}/couriers", json=body, headers=csrf(client)).json()


def move(client, did, state, note=None):
    return client.patch(f"{D}/{did}", json={"status": state, "note": note}, headers=csrf(client))


def to_transit(client, did):
    who = courier(client)
    assert client.post(f"{D}/{did}/assign", json={"courierId": who["id"]}, headers=csrf(client)).status_code == 200
    assert move(client, did, "en_recogida").status_code == 200
    assert move(client, did, "en_transito").status_code == 200


def validate(client, did, **body):
    return client.post(f"{D}/{did}/validate", json=body, headers=csrf(client))


def test_pagar_a_domicilio_crea_el_domicilio_y_recogida_no(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    delivery = order["delivery"]
    assert delivery["status"] == "creado"
    assert len(delivery["confirmationCode"]) == 6 and delivery["qrImage"].startswith("data:image/svg+xml")

    pickup, _, _ = place_order(admin_client)
    pay(admin_client, gateway, orderId=pickup["id"])
    assert "delivery" not in admin_client.get(f"/api/v1/orders/{pickup['id']}").json()


def test_pedido_sin_pagar_no_tiene_domicilio(auth_client):
    product = auth_client.get("/api/v1/products/patinova-city-80").json()
    add_to_cart(auth_client, product["id"], 1)
    order = auth_client.post("/api/v1/orders", json=order_body(product["id"]), headers=csrf(auth_client)).json()
    assert "delivery" not in auth_client.get(f"/api/v1/orders/{order['id']}").json()


def test_el_enlace_publico_no_revela_datos_personales(admin_client, gateway, client):
    order = paid_delivery(admin_client, gateway)
    token = order["delivery"]["trackingToken"]
    admin_client.cookies.clear()
    response = client.get(f"/api/v1/tracking/{token}")
    assert response.status_code == 200
    text = response.text
    for secret in (
        order["delivery"]["confirmationCode"],
        order["deliveryAddress"],
        order["contactName"],
        order["contactPhone"],
    ):
        assert secret not in text
    assert response.json()["status"] == "creado"
    assert client.get("/api/v1/tracking/no-existe").status_code == 404


def test_recorrido_completo_con_codigo_qr_completa_el_pedido(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    assert admin_client.get(f"{D}/{did}").json()["canAssign"] is True

    # No se salta estados ni se marca entregado a mano.
    assert move(admin_client, did, "en_transito").status_code == 409
    assert move(admin_client, did, "entregado").status_code == 409
    to_transit(admin_client, did)
    assert (
        validate(
            admin_client,
            did,
            method="qr",
            code="000000" if order["delivery"]["confirmationCode"] != "000000" else "111111",
        ).status_code
        == 409
    )

    done = validate(admin_client, did, method="qr", code=order["delivery"]["confirmationCode"])
    assert done.status_code == 200
    body = done.json()
    assert body["status"] == "entregado" and body["proofMethod"] == "qr" and body["deliveredAt"]
    assert [e["status"] for e in body["events"]] == ["creado", "asignado", "en_recogida", "en_transito", "entregado"]

    after = admin_client.get(f"/api/v1/orders/{order['id']}").json()
    assert after["status"] == "completed"
    assert "confirmationCode" not in after["delivery"] and "qrImage" not in after["delivery"]
    assert after["delivery"]["courierName"] == "Carlos Rueda"
    assert validate(admin_client, did, method="qr", code=order["delivery"]["confirmationCode"]).status_code == 409


def test_entrega_con_firma_digital(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    to_transit(admin_client, did)
    assert validate(admin_client, did, method="firma", signerName="Ana Pérez").status_code == 422
    fake = "data:image/png;base64," + base64.b64encode(b"no soy png").decode()
    assert validate(admin_client, did, method="firma", signerName="Ana Pérez", signatureImage=fake).status_code == 422
    done = validate(admin_client, did, method="firma", signerName="Ana Pérez", signatureImage=PNG)
    assert done.status_code == 200
    assert done.json()["proofMethod"] == "firma" and done.json()["signerName"] == "Ana Pérez"


def test_fallido_exige_motivo_y_se_puede_reprogramar(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    to_transit(admin_client, did)
    assert move(admin_client, did, "fallido").status_code == 422
    failed = move(admin_client, did, "fallido", "Nadie atendió en la dirección")
    assert failed.status_code == 200 and failed.json()["failureReason"] == "Nadie atendió en la dirección"

    again = move(admin_client, did, "creado", "Se acordó otra hora")
    assert again.status_code == 200
    assert again.json()["courierId"] is None and again.json()["failureReason"] is None
    assert again.json()["canAssign"] is True


def test_no_se_asigna_un_domiciliario_inactivo_ni_tras_salir(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    who = courier(admin_client, "Inés Gómez")
    assert (
        admin_client.patch(f"{A}/couriers/{who['id']}", json={"isActive": False}, headers=csrf(admin_client)).json()[
            "isActive"
        ]
        is False
    )
    assert (
        admin_client.post(f"{D}/{did}/assign", json={"courierId": who["id"]}, headers=csrf(admin_client)).status_code
        == 409
    )
    to_transit(admin_client, did)
    other = courier(admin_client, "Luis Díaz")
    assert (
        admin_client.post(f"{D}/{did}/assign", json={"courierId": other["id"]}, headers=csrf(admin_client)).status_code
        == 409
    )


def test_el_panel_no_completa_a_mano_un_pedido_con_domicilio(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    url = f"{A}/orders/{order['id']}"
    assert "completed" not in admin_client.get(url).json()["allowedTransitions"]
    assert admin_client.patch(url, json={"status": "completed"}, headers=csrf(admin_client)).status_code == 409


def test_reembolso_cierra_el_domicilio_y_si_va_en_camino_se_bloquea(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    url = f"/api/v1/orders/{order['id']}"
    admin_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(admin_client))
    to_transit(admin_client, did)
    assert admin_client.post(f"{A}/orders/{order['id']}/refund", headers=csrf(admin_client)).status_code == 409

    move(admin_client, did, "fallido", "Devuelto a la sucursal")
    assert admin_client.post(f"{A}/orders/{order['id']}/refund", headers=csrf(admin_client)).status_code == 200
    assert admin_client.get(url).json()["status"] == "cancelled"
    assert move(admin_client, did, "creado").status_code == 409


def test_buscar_filtrar_y_solo_administradores(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    assert admin_client.get(D, params={"state": "creado"}).json()["total"] == 1
    assert admin_client.get(D, params={"state": "entregado"}).json()["total"] == 0
    assert admin_client.get(D, params={"q": order["contactName"][:3]}).json()["total"] == 1
    admin_client.cookies.clear()
    register(admin_client, email="cliente-domicilio@correo.com")
    assert admin_client.get(D).status_code == 403
    assert admin_client.get(f"{A}/couriers").status_code == 403
