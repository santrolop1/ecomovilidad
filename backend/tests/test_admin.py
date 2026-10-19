import uuid
from datetime import date, timedelta
from typing import get_args

import pytest
from sqlalchemy import select

from app.models import Inventory, User
from app.models.enums import SERVICE_AREA_CITIES
from app.schemas.admin import ServiceAreaCity

from .conftest import PASSWORD, add_to_cart, csrf, register

A = "/api/v1/admin"


def test_ciudades_del_esquema_coinciden_con_el_alcance():
    assert set(get_args(ServiceAreaCity)) == set(SERVICE_AREA_CITIES)


# ─── Permisos ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "path", ["/dashboard", "/products", "/orders", "/users", "/inventory", "/branches", "/rentals"]
)
def test_sin_sesion_responde_401(client, path):
    assert client.get(A + path).status_code == 401


@pytest.mark.parametrize(
    "path", ["/dashboard", "/products", "/orders", "/users", "/inventory", "/branches", "/rentals"]
)
def test_usuario_normal_responde_403(auth_client, path):
    assert auth_client.get(A + path).status_code == 403


def test_usuario_normal_no_puede_modificar(auth_client):
    product = auth_client.get("/api/v1/products/voltra-urbana-e1").json()
    response = auth_client.patch(f"{A}/products/{product['id']}", json={"price": 1}, headers=csrf(auth_client))
    assert response.status_code == 403


def test_admin_sin_csrf_no_puede_modificar(admin_client):
    product = admin_client.get("/api/v1/products/voltra-urbana-e1").json()
    assert admin_client.patch(f"{A}/products/{product['id']}", json={"price": 1}).status_code == 403


def test_me_informa_rol(admin_client):
    assert admin_client.get("/api/v1/auth/me").json()["isAdmin"] is True


# ─── Dashboard ─────────────────────────────────────────────────────────────


def test_dashboard(admin_client):
    data = admin_client.get(f"{A}/dashboard").json()
    assert data["productsTotal"] == 15 and data["productsActive"] == 15
    assert data["branchesTotal"] == data["branchesDemo"] == 5
    assert data["unitsAvailable"] + data["unitsReserved"] <= data["unitsTotal"]
    assert data["admins"] == 1
    assert set(data["ordersByStatus"]) == {"pending", "paid", "confirmed", "cancelled", "completed"}
    low = {item["sku"]: item["available"] for item in data["lowStock"]}
    assert low["PAT-RN-CP"] == 0  # sin inventario
    assert all(v <= data["lowStockThreshold"] for v in low.values())


# ─── Productos y categorías ────────────────────────────────────────────────


def new_product(admin_client, **overrides):
    category = next(c for c in admin_client.get(f"{A}/categories").json() if c["slug"] == "patinetas")
    body = {
        "categoryId": category["id"],
        "name": "Patineta Prueba",
        "slug": "patineta-prueba",
        "sku": "PAT-TEST-01",
        "brand": "Prueba",
        "shortDescription": "Resumen",
        "description": "Descripción",
        "price": 1_500_000,
        "specifications": [{"key": "uso", "label": "Uso", "value": "Urbana", "facet": True}],
        "highlights": ["Ligera", " "],
        **overrides,
    }
    return admin_client.post(f"{A}/products", json=body, headers=csrf(admin_client))


def test_listar_buscar_y_filtrar_productos(admin_client):
    page = admin_client.get(f"{A}/products").json()
    assert page["total"] == 15 and page["pageSize"] == 20
    assert {p["sku"] for p in admin_client.get(f"{A}/products", params={"q": "velox"}).json()["items"]} == {
        "PTN-VLX-C110",
        "PTN-VLX-JR",
    }
    drones = admin_client.get(f"{A}/products", params={"category": "drones"}).json()["items"]
    assert len(drones) == 3 and all(p["category"]["slug"] == "drones" for p in drones)
    pending_image = admin_client.get(f"{A}/products", params={"q": "PTN-VLX-C110"}).json()["items"][0]
    assert pending_image["imageUrl"] is None


def test_crear_producto_y_aparece_en_la_tienda(admin_client):
    response = new_product(admin_client)
    assert response.status_code == 201, response.text
    product = response.json()
    assert product["highlights"] == ["Ligera"]
    assert len(product["inventory"]) == 5 and all(row["total"] == 0 for row in product["inventory"])
    public = admin_client.get("/api/v1/products/patineta-prueba").json()
    assert public["stock"]["status"] == "out_of_stock"


def test_sku_duplicado_y_precio_anterior_invalido(admin_client):
    assert new_product(admin_client, sku="PAT-VOL-S2").status_code == 409
    assert new_product(admin_client, compareAtPrice=1_000).status_code == 422


def test_editar_precio_y_desactivar_oculta_de_la_tienda(admin_client):
    product = admin_client.get("/api/v1/products/voltra-urbana-e1").json()
    url = f"{A}/products/{product['id']}"
    updated = admin_client.patch(url, json={"price": 6_000_000, "compareAtPrice": None}, headers=csrf(admin_client))
    assert updated.status_code == 200
    assert updated.json()["price"] == 6_000_000 and updated.json()["compareAtPrice"] is None

    assert admin_client.patch(url, json={"isActive": False}, headers=csrf(admin_client)).json()["isActive"] is False
    assert admin_client.get("/api/v1/products/voltra-urbana-e1").status_code == 404
    assert admin_client.get(url).status_code == 200  # el admin lo sigue viendo


def test_precio_anterior_debe_superar_al_nuevo_precio(admin_client):
    product = admin_client.get("/api/v1/products/voltra-urbana-e1").json()  # tiene precio anterior 6.490.000
    response = admin_client.patch(
        f"{A}/products/{product['id']}", json={"price": 7_000_000}, headers=csrf(admin_client)
    )
    assert response.status_code == 400


def test_categorias_crear_y_editar(admin_client):
    created = admin_client.post(
        f"{A}/categories", json={"name": "Monociclos", "slug": "monociclos"}, headers=csrf(admin_client)
    )
    assert created.status_code == 201 and created.json()["productCount"] == 0
    edited = admin_client.patch(
        f"{A}/categories/{created.json()['id']}", json={"description": "Eléctricos"}, headers=csrf(admin_client)
    )
    assert edited.json()["description"] == "Eléctricos"
    duplicate = admin_client.post(
        f"{A}/categories", json={"name": "Otra", "slug": "drones"}, headers=csrf(admin_client)
    )
    assert duplicate.status_code == 409


# ─── Inventario ────────────────────────────────────────────────────────────


def test_fijar_stock_respeta_reservas_y_nunca_queda_negativo(admin_client, db):
    product = admin_client.get("/api/v1/products/patinova-city-80").json()
    branch_id = product["stock"]["byBranch"][0]["branchId"]
    inv = db.scalars(
        select(Inventory).where(
            Inventory.product_id == uuid.UUID(product["id"]), Inventory.branch_id == uuid.UUID(branch_id)
        )
    ).one()
    inv.available_quantity -= 2
    inv.reserved_quantity += 2
    db.flush()

    url = f"{A}/products/{product['id']}/inventory/{branch_id}"
    assert admin_client.put(url, json={"totalQuantity": 1}, headers=csrf(admin_client)).status_code == 409
    assert admin_client.put(url, json={"totalQuantity": -3}, headers=csrf(admin_client)).status_code == 422
    row = next(
        r
        for r in admin_client.put(url, json={"totalQuantity": 10}, headers=csrf(admin_client)).json()["inventory"]
        if r["branchId"] == branch_id
    )
    assert (row["total"], row["reserved"], row["available"]) == (10, 2, 8)


def test_crear_existencias_en_sucursal_nueva_para_el_producto(admin_client):
    product = admin_client.get("/api/v1/products/aeroandes-pro-6k").json()
    branches = admin_client.get(f"{A}/branches").json()
    empty = next(b for b in branches if b["id"] not in {s["branchId"] for s in product["stock"]["byBranch"]})
    response = admin_client.put(
        f"{A}/products/{product['id']}/inventory/{empty['id']}", json={"totalQuantity": 4}, headers=csrf(admin_client)
    )
    assert response.status_code == 200
    assert admin_client.get("/api/v1/products/aeroandes-pro-6k").json()["stock"]["available"] == 5


def test_listado_de_inventario_y_stock_bajo(admin_client):
    page = admin_client.get(f"{A}/inventory").json()
    assert page["total"] == 31
    low = admin_client.get(f"{A}/inventory", params={"low_stock": "true"}).json()
    assert 0 < low["total"] < page["total"]
    assert all(r["available"] <= 5 for r in low["items"])
    branch = admin_client.get(f"{A}/branches").json()[0]
    by_branch = admin_client.get(f"{A}/inventory", params={"branch_id": branch["id"]}).json()["items"]
    assert by_branch and {r["branchId"] for r in by_branch} == {branch["id"]}


# ─── Pedidos ───────────────────────────────────────────────────────────────


def place_order(client, slug="patinova-city-80", quantity=2):
    product = client.get(f"/api/v1/products/{slug}").json()
    branch_id = product["stock"]["byBranch"][0]["branchId"]
    body = {
        "items": [{"productId": product["id"], "quantity": quantity}],
        "customer": {
            "fullName": "Ana Pérez",
            "email": "ana@correo.com",
            "phone": "3001234567",
            "documentType": "CC",
            "documentNumber": "1098765432",
        },
        "fulfillment": {
            "method": "recogida",
            "branchId": branch_id,
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "timeSlotId": "slot-10",
        },
        "paymentMethod": "pse",
        "dataConsent": True,
    }
    add_to_cart(client, product["id"], quantity)
    order = client.post("/api/v1/orders", json=body, headers=csrf(client)).json()
    return order, uuid.UUID(product["id"]), uuid.UUID(branch_id)


def stock(db, product_id, branch_id):
    db.expire_all()
    inv = db.scalars(
        select(Inventory).where(Inventory.product_id == product_id, Inventory.branch_id == branch_id)
    ).one()
    return inv.available_quantity, inv.reserved_quantity, inv.total_quantity


def test_listar_buscar_y_ver_pedido(admin_client):
    order, _, _ = place_order(admin_client)
    page = admin_client.get(f"{A}/orders", params={"status": "pending"}).json()
    assert [o["id"] for o in page["items"]] == [order["id"]]
    assert admin_client.get(f"{A}/orders", params={"q": order["id"][:8]}).json()["total"] == 1
    assert admin_client.get(f"{A}/orders", params={"q": "nadie"}).json()["total"] == 0
    detail = admin_client.get(f"{A}/orders/{order['id']}").json()
    assert detail["user"]["email"] == "admin@correo.com"
    assert detail["documentNumber"] == "1098765432"
    # Sin pago aprobado solo se puede cancelar: "pagado" lo pone la pasarela (CU-03).
    assert detail["allowedTransitions"] == ["cancelled"]


def test_pagar_y_completar_descuenta_inventario_una_vez(admin_client, gateway, db):
    """CU-03: el inventario sale al aprobarse el pago; completar (entregar) no lo descuenta otra vez.
    Antes de los pagos, un administrador confirmaba el pedido a mano: ya no es posible."""
    order, pid, bid = place_order(admin_client)
    before = stock(db, pid, bid)
    url = f"{A}/orders/{order['id']}"
    assert admin_client.patch(url, json={"status": "confirmed"}, headers=csrf(admin_client)).status_code == 409
    assert admin_client.patch(url, json={"status": "paid"}, headers=csrf(admin_client)).status_code == 409

    pay = admin_client.post("/api/v1/payments", json={"orderId": order["id"]}, headers=csrf(admin_client)).json()
    tx = gateway.approve(pay["reference"], order["total"] * 100)
    paid = admin_client.post("/api/v1/payments/verify", json={"transactionId": tx.id}, headers=csrf(admin_client))
    assert paid.json()["status"] == "approved"
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)

    done = admin_client.patch(url, json={"status": "completed"}, headers=csrf(admin_client)).json()
    assert done["status"] == "completed" and done["allowedTransitions"] == []
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)
    sold = next(
        r
        for r in admin_client.get(f"{A}/inventory", params={"q": "PTN-PNV-C80"}).json()["items"]
        if r["branchId"] == str(bid)
    )
    assert sold["sold"] == 2


def test_cancelar_libera_inventario(admin_client, db):
    order, pid, bid = place_order(admin_client)
    before = stock(db, pid, bid)
    response = admin_client.patch(f"{A}/orders/{order['id']}", json={"status": "cancelled"}, headers=csrf(admin_client))
    assert response.status_code == 200
    assert stock(db, pid, bid) == (before[0] + 2, before[1] - 2, before[2])


def test_transicion_invalida(admin_client):
    order, _, _ = place_order(admin_client)
    url = f"{A}/orders/{order['id']}"
    assert admin_client.patch(url, json={"status": "completed"}, headers=csrf(admin_client)).status_code == 409
    admin_client.patch(url, json={"status": "cancelled"}, headers=csrf(admin_client))
    assert admin_client.patch(url, json={"status": "confirmed"}, headers=csrf(admin_client)).status_code == 409


# ─── Usuarios, sucursales, alquileres ──────────────────────────────────────


def test_usuarios_sin_datos_sensibles(admin_client):
    page = admin_client.get(f"{A}/users").json()
    assert page["total"] == 1
    user = page["items"][0]
    assert user["isAdmin"] is True
    assert not {"passwordHash", "password_hash", "password", "tokenHash"} & set(user)


def test_desactivar_usuario_cierra_sus_sesiones(admin_client, client):
    other = TestUserSession(client)
    users = admin_client.get(f"{A}/users", params={"q": "cliente@correo.com"}).json()["items"]
    response = admin_client.patch(f"{A}/users/{users[0]['id']}", json={"isActive": False}, headers=csrf(admin_client))
    assert response.status_code == 200 and response.json()["isActive"] is False
    assert other.me_status() == 401
    assert (
        client.post("/api/v1/auth/login", json={"email": "cliente@correo.com", "password": PASSWORD}).status_code == 401
    )


class TestUserSession:
    """Registra un segundo usuario y guarda su cookie para consultarla después."""

    __test__ = False

    def __init__(self, client):
        admin_cookies = dict(client.cookies)
        client.cookies.clear()
        register(client, email="cliente@correo.com")
        self.client, self.token = client, client.cookies["em_session"]
        client.cookies.clear()
        for name, value in admin_cookies.items():
            client.cookies.set(name, value)

    def me_status(self):
        saved = dict(self.client.cookies)
        self.client.cookies.clear()
        self.client.cookies.set("em_session", self.token)
        status = self.client.get("/api/v1/auth/me").status_code
        self.client.cookies.clear()
        for name, value in saved.items():
            self.client.cookies.set(name, value)
        return status


def test_admin_no_puede_desactivarse_a_si_mismo(admin_client, db):
    me = db.scalars(select(User).where(User.email == "admin@correo.com")).one()
    response = admin_client.patch(f"{A}/users/{me.id}", json={"isActive": False}, headers=csrf(admin_client))
    assert response.status_code == 409


def test_sucursal_crear_editar_y_validar_area(admin_client):
    body = {
        "slug": "floridablanca-lagos",
        "name": "Lagos",
        "address": "Calle 200 # 20-10",
        "neighborhood": "Lagos del Cacique",
        "city": "Floridablanca",
        "phone": "+57 607 000 0501",
        "latitude": 7.07,
        "longitude": -73.1,
        "openingHours": [{"days": "Lunes a viernes", "opens": "08:00", "closes": "18:00"}],
        "services": ["venta", "recogida"],
        "isDemo": True,
    }
    created = admin_client.post(f"{A}/branches", json=body, headers=csrf(admin_client))
    assert created.status_code == 201, created.text
    branch = created.json()
    edited = admin_client.patch(
        f"{A}/branches/{branch['id']}", json={"isActive": False, "latitude": 7.08}, headers=csrf(admin_client)
    ).json()
    assert edited["isActive"] is False and edited["latitude"] == 7.08
    assert "floridablanca-lagos" not in {b["slug"] for b in admin_client.get("/api/v1/branches").json()}

    outside = {**body, "slug": "bogota", "city": "Bogotá"}
    assert admin_client.post(f"{A}/branches", json=outside, headers=csrf(admin_client)).status_code == 422
    far = {**body, "slug": "lejos", "latitude": 4.6}
    assert admin_client.post(f"{A}/branches", json=far, headers=csrf(admin_client)).status_code == 422


def test_detalle_de_sucursal_con_inventario(admin_client):
    branch = next(b for b in admin_client.get(f"{A}/branches").json() if b["slug"] == "bucaramanga-cabecera")
    detail = admin_client.get(f"{A}/branches/{branch['id']}").json()
    assert detail["inventory"] and sum(r["total"] for r in detail["inventory"]) == branch["total"]


def test_alquileres(admin_client, db):
    from datetime import UTC, datetime

    from app.models import Branch, Product, Rental

    user = db.scalars(select(User).where(User.email == "admin@correo.com")).one()
    start = datetime.now(UTC) + timedelta(days=2)
    db.add(
        Rental(
            user_id=user.id,
            product_id=db.scalars(select(Product).limit(1)).first().id,
            branch_id=db.scalars(select(Branch).limit(1)).first().id,
            start_at=start,
            end_at=start + timedelta(hours=3),
            price=45_000,
        )
    )
    db.flush()
    page = admin_client.get(f"{A}/rentals").json()
    assert page["total"] == 1 and page["items"][0]["userEmail"] == "admin@correo.com"
    assert admin_client.get(f"{A}/rentals", params={"status": "active"}).json()["total"] == 0
