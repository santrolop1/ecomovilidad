"""CU-06: franjas con cupo real por sucursal."""

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select

from app.models import Branch, Order
from app.modules.pedidos.schedule import BOGOTA, slot_has_passed

from .conftest import csrf, register
from .test_admin import A
from .test_orders import order_body

S = "/api/v1/orders/time-slots"
FUTURE = (date.today() + timedelta(days=5)).isoformat()
SLOT = "slot-08"


def pickup_body(product, branch_id, **fulfillment):
    return order_body(
        product["id"], method="recogida", branchId=branch_id, address=None, city=None, date=FUTURE, **fulfillment
    )


def setup_pickup(client, db, capacity):
    product = client.get("/api/v1/products/patinova-city-80").json()
    stock = product["stock"]["byBranch"][0]
    branch = db.get(Branch, uuid.UUID(stock["branchId"]))
    branch.slot_capacity = capacity
    db.flush()
    return product, stock["branchId"]


def slot_available(client, **params):
    slots = client.get(S, params={"date": FUTURE, **params}).json()
    return next(s for s in slots if s["id"] == SLOT)["available"]


def test_franjas_publicas_con_sus_horas(client):
    slots = client.get(S, params={"date": FUTURE}).json()
    assert [s["id"] for s in slots] == ["slot-08", "slot-10", "slot-12", "slot-14", "slot-16"]
    assert slots[0]["start"] == "08:00" and all(s["available"] for s in slots)
    assert client.get(S).status_code == 422


def test_una_franja_de_hoy_deja_de_ofrecerse_cuando_empieza():
    now = datetime(2026, 11, 5, 10, 30, tzinfo=BOGOTA)
    assert slot_has_passed(now.date(), "slot-10", now) is True
    assert slot_has_passed(now.date(), "slot-12", now) is False
    assert slot_has_passed(now.date() + timedelta(days=1), "slot-08", now) is False


def add_and_order(client, product, branch_id, slot):
    client.post("/api/v1/cart/items", json={"productId": product["id"], "quantity": 1}, headers=csrf(client))
    return client.post("/api/v1/orders", json=pickup_body(product, branch_id, timeSlotId=slot), headers=csrf(client))


def test_sin_cupo_la_franja_se_rechaza_y_al_cancelar_se_libera(auth_client, db):
    product, branch_id = setup_pickup(auth_client, db, capacity=1)
    order = add_and_order(auth_client, product, branch_id, SLOT)
    assert order.status_code == 201, order.text
    assert slot_available(auth_client, branch_id=branch_id) is False

    # Un pedido cancelado devuelve el cupo.
    placed = db.get(Order, uuid.UUID(order.json()["id"]))
    placed.status = "cancelled"
    db.flush()
    assert slot_available(auth_client, branch_id=branch_id) is True
    placed.status = "pending"
    db.flush()

    auth_client.cookies.clear()
    register(auth_client, email="otra-franja@correo.com")
    # Otra franja del mismo día sí tiene cupo.
    assert add_and_order(auth_client, product, branch_id, "slot-10").status_code == 201
    rejected = add_and_order(auth_client, product, branch_id, SLOT)
    assert rejected.status_code == 409 and "cupo" in rejected.json()["detail"]


def test_el_panel_cambia_el_cupo_de_la_sucursal(admin_client, db):
    branch = db.scalars(select(Branch).order_by(Branch.slug)).first()
    url = f"{A}/branches/{branch.id}"
    assert admin_client.get(url).json()["slotCapacity"] == 6
    assert admin_client.patch(url, json={"slotCapacity": 0}, headers=csrf(admin_client)).status_code == 422
    assert admin_client.patch(url, json={"slotCapacity": 2}, headers=csrf(admin_client)).json()["slotCapacity"] == 2
