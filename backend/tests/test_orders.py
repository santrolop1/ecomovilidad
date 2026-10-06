import uuid
from datetime import date, timedelta

from sqlalchemy import select

from app.models import Cart, Inventory

from .conftest import add_to_cart, csrf, register

TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def order_body(product_id, quantity=1, **fulfillment):
    return {
        "items": [{"productId": product_id, "quantity": quantity}],
        "customer": {
            "fullName": "Ana Pérez",
            "email": "ana@correo.com",
            "phone": "3001234567",
            "documentType": "CC",
            "documentNumber": "1098765432",
        },
        "fulfillment": {
            "method": "domicilio",
            "address": "Calle 45 # 30-20",
            "city": "Bucaramanga",
            "date": TOMORROW,
            "timeSlotId": "slot-08",
            **fulfillment,
        },
        "paymentMethod": "pse",
        "dataConsent": True,
    }


def inventory_of(db, product_id):
    return {i.branch_id: i for i in db.scalars(select(Inventory).where(Inventory.product_id == product_id))}


def test_pedido_requiere_sesion(client):
    p = client.get("/api/v1/products/patinova-city-80").json()
    assert client.post("/api/v1/orders", json=order_body(p["id"])).status_code == 401


def test_pedido_con_recogida_reserva_inventario_en_la_sucursal(auth_client, db):
    p = auth_client.get("/api/v1/products/patinova-city-80").json()
    branch_id = p["stock"]["byBranch"][0]["branchId"]
    before = inventory_of(db, p["id"])[uuid.UUID(branch_id)].available_quantity

    add_to_cart(auth_client, p["id"], 2)
    response = auth_client.post(
        "/api/v1/orders",
        json=order_body(p["id"], 2, method="recogida", branchId=branch_id, address=None, city=None),
        headers=csrf(auth_client),
    )
    assert response.status_code == 201, response.text
    order = response.json()
    assert order["status"] == "pending"
    assert order["subtotal"] == order["total"] == 2 * p["price"]
    assert order["branchId"] == branch_id

    db.expire_all()
    inv = inventory_of(db, p["id"])[uuid.UUID(branch_id)]
    assert inv.available_quantity == before - 2
    assert inv.reserved_quantity == 2


def test_pedido_usa_precio_del_catalogo_y_convierte_el_carrito(auth_client, db):
    p = auth_client.get("/api/v1/products/voltra-urbana-e1").json()
    auth_client.post("/api/v1/cart/items", json={"productId": p["id"], "quantity": 1}, headers=csrf(auth_client))
    body = order_body(p["id"])
    body["total"] = 1  # campo ajeno: se ignora
    order = auth_client.post("/api/v1/orders", json=body, headers=csrf(auth_client)).json()
    assert order["total"] == p["price"]
    assert db.scalars(select(Cart).where(Cart.status == "converted")).first() is not None
    assert auth_client.get("/api/v1/cart").json()["items"] == []


def test_domicilio_fuera_del_area_es_rechazado(auth_client):
    p = auth_client.get("/api/v1/products/patinova-city-80").json()
    response = auth_client.post("/api/v1/orders", json=order_body(p["id"], city="Bogotá"), headers=csrf(auth_client))
    assert response.status_code == 400
    assert "Bucaramanga" in response.json()["detail"]


def test_sin_unidades_suficientes(auth_client):
    p = auth_client.get("/api/v1/products/velox-carrera-110").json()  # 4 unidades en una sucursal
    # Con RF 6.2 la falta de stock se detecta al reservar en el carrito.
    response = auth_client.post(
        "/api/v1/cart/items", json={"productId": p["id"], "quantity": 5}, headers=csrf(auth_client)
    )
    assert response.status_code == 409
    assert auth_client.post("/api/v1/orders", json=order_body(p["id"], 5), headers=csrf(auth_client)).status_code == 409


def test_fecha_pasada_y_franja_invalida(auth_client):
    p = auth_client.get("/api/v1/products/patinova-city-80").json()
    past = (date.today() - timedelta(days=2)).isoformat()
    assert (
        auth_client.post("/api/v1/orders", json=order_body(p["id"], date=past), headers=csrf(auth_client)).status_code
        == 400
    )
    assert (
        auth_client.post(
            "/api/v1/orders", json=order_body(p["id"], timeSlotId="slot-99"), headers=csrf(auth_client)
        ).status_code
        == 400
    )


def test_listar_y_consultar_pedidos_propios(auth_client, client):
    p = auth_client.get("/api/v1/products/patinova-city-80").json()
    add_to_cart(auth_client, p["id"])
    order = auth_client.post("/api/v1/orders", json=order_body(p["id"]), headers=csrf(auth_client)).json()
    assert [o["id"] for o in auth_client.get("/api/v1/orders").json()] == [order["id"]]
    assert auth_client.get(f"/api/v1/orders/{order['id']}").json()["items"][0]["quantity"] == 1

    client.cookies.clear()
    register(client, email="otra@correo.com")
    assert client.get(f"/api/v1/orders/{order['id']}").status_code == 404
