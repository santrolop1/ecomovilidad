"""CU-13: registro de entradas y salidas de inventario."""

import uuid

from sqlalchemy import func, select

from app.models import Inventory, InventoryMovement

from .conftest import csrf
from .test_admin import A, place_order, stock
from .test_refunds import REASON, pay

M = f"{A}/inventory/movements"


def movements(client, **params):
    return client.get(M, params=params).json()["items"]


def stock_url(client, slug="patinova-city-80"):
    product = client.get(f"/api/v1/products/{slug}").json()
    branch_id = product["stock"]["byBranch"][0]["branchId"]
    return f"{A}/products/{product['id']}/inventory/{branch_id}", product, branch_id


def ledger_matches_total(db) -> bool:
    db.expire_all()
    balance = (
        select(InventoryMovement.inventory_id, func.sum(InventoryMovement.quantity).label("units"))
        .group_by(InventoryMovement.inventory_id)
        .subquery()
    )
    wrong = db.scalar(
        select(func.count())
        .select_from(Inventory)
        .outerjoin(balance, balance.c.inventory_id == Inventory.id)
        .where(func.coalesce(balance.c.units, 0) != Inventory.total_quantity)
    )
    return wrong == 0


def test_el_saldo_inicial_cuadra_con_las_existencias(admin_client, db):
    assert ledger_matches_total(db)
    assert all(m["kind"] == "saldo_inicial" for m in movements(admin_client))


def test_el_panel_registra_entradas_y_salidas_con_motivo_y_responsable(admin_client, db):
    url, product, branch_id = stock_url(admin_client)
    current = next(
        r["total"]
        for r in admin_client.get(f"{A}/products/{product['id']}").json()["inventory"]
        if r["branchId"] == branch_id
    )

    def put(units, reason):
        return admin_client.put(url, json={"totalQuantity": units, "reason": reason}, headers=csrf(admin_client))

    assert put(current + 5, "  Llegó un pedido del proveedor  ").status_code == 200
    assert put(current + 2, "Tres unidades dañadas").status_code == 200
    assert put(current + 2, "Sin cambios").status_code == 200  # no registra nada

    # En la prueba todo ocurre en una transacción (misma fecha): se identifican por tipo.
    by_kind = {m["kind"]: m for m in movements(admin_client, q=product["name"])}
    assert len([m for m in movements(admin_client, q=product["name"]) if m["kind"] != "saldo_inicial"]) == 2
    damaged, received = by_kind["salida"], by_kind["entrada"]
    assert (damaged["kind"], damaged["quantity"], damaged["balanceAfter"]) == ("salida", -3, current + 2)
    assert damaged["reason"] == "Tres unidades dañadas"
    assert (received["kind"], received["quantity"]) == ("entrada", 5)
    assert received["reason"] == "Llegó un pedido del proveedor"
    assert received["userName"]
    assert ledger_matches_total(db)


def test_ajuste_sin_motivo_o_rechazado_no_registra_nada(admin_client, db):
    url, _, _ = stock_url(admin_client)
    before = db.scalar(select(func.count()).select_from(InventoryMovement))
    for body in ({"totalQuantity": 3}, {"totalQuantity": 3, "reason": "  a "}):
        assert admin_client.put(url, json=body, headers=csrf(admin_client)).status_code == 422
    assert db.scalar(select(func.count()).select_from(InventoryMovement)) == before


def test_venta_y_reembolso_quedan_registrados_y_la_reserva_no(admin_client, gateway, db):
    order, pid, bid = place_order(admin_client)
    assert [m for m in movements(admin_client) if m["orderId"] == order["id"]] == []  # reservar no saca unidades

    pay(admin_client, gateway, orderId=order["id"])
    sale = [m for m in movements(admin_client, kind="venta") if m["orderId"] == order["id"]]
    assert [(m["quantity"], m["balanceAfter"]) for m in sale] == [(-2, stock(db, pid, bid)[2])]
    assert sale[0]["userName"] is None

    url = f"/api/v1/orders/{order['id']}"
    admin_client.post(f"{url}/refund-request", json={"reason": REASON}, headers=csrf(admin_client))
    admin_client.post(f"{A}/orders/{order['id']}/refund", headers=csrf(admin_client))
    back = [m for m in movements(admin_client, kind="devolucion") if m["orderId"] == order["id"]]
    assert [(m["quantity"], m["balanceAfter"]) for m in back] == [(2, stock(db, pid, bid)[2])]
    assert ledger_matches_total(db)


def test_filtros_por_sucursal_y_busqueda(admin_client):
    _, product, branch_id = stock_url(admin_client)
    found = movements(admin_client, q=product["name"], branch_id=branch_id)
    assert found and {m["productId"] for m in found} == {product["id"]}
    assert movements(admin_client, branch_id=str(uuid.uuid4())) == []
    assert admin_client.get(M, params={"kind": "inventado"}).status_code == 422


def test_solo_un_administrador_ve_los_movimientos(auth_client):
    assert auth_client.get(M).status_code == 403
