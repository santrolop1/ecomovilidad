"""RF 6.2: reserva temporal de inventario de 15 minutos."""

import threading
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.core.security import hash_password
from app.models import Branch, Cart, CartItem, CartReservation, Category, Inventory, Product, User
from app.modules.carrito import service as cart_service
from app.modules.carrito.schemas import AddCartItemIn
from app.modules.inventario.reservations import release_expired

from .conftest import add_to_cart, csrf

SLUG = "patinova-city-80"  # 11 unidades: 5 + 3 + 3 en tres sucursales


def product(client, slug=SLUG):
    return client.get(f"/api/v1/products/{slug}").json()


def totals(db, product_id) -> tuple[int, int, int]:
    db.expire_all()
    row = db.execute(
        select(
            func.sum(Inventory.available_quantity),
            func.sum(Inventory.reserved_quantity),
            func.sum(Inventory.total_quantity),
        ).where(Inventory.product_id == uuid.UUID(product_id))
    ).one()
    return int(row[0]), int(row[1]), int(row[2])


def cart_reserved(db, product_id) -> int:
    db.expire_all()
    return db.scalar(
        select(func.coalesce(func.sum(CartReservation.quantity), 0))
        .join(Inventory, Inventory.id == CartReservation.inventory_id)
        .where(Inventory.product_id == uuid.UUID(product_id))
    )


def expire_all_reservations(db) -> None:
    db.execute(update(CartReservation).values(expires_at=datetime.now(UTC) - timedelta(seconds=1)))
    db.flush()


def test_agregar_reserva_unidades_por_15_minutos(auth_client, db):
    p = product(auth_client)
    before = totals(db, p["id"])
    cart = add_to_cart(auth_client, p["id"], 2)

    assert totals(db, p["id"]) == (before[0] - 2, before[1] + 2, before[2])
    assert cart_reserved(db, p["id"]) == 2
    until = datetime.fromisoformat(cart["items"][0]["reservedUntil"])
    remaining = (until - datetime.now(UTC)).total_seconds()
    assert 14 * 60 < remaining <= 15 * 60
    assert cart["reservationMinutes"] == 15
    # La tienda ya no ofrece esas unidades a otros clientes.
    assert product(auth_client)["stock"]["available"] == before[0] - 2


def test_cambiar_cantidad_ajusta_la_reserva(auth_client, db):
    p = product(auth_client)
    before = totals(db, p["id"])
    item = add_to_cart(auth_client, p["id"], 2)["items"][0]

    up = auth_client.patch(f"/api/v1/cart/items/{item['id']}", json={"quantity": 5}, headers=csrf(auth_client))
    assert up.status_code == 200 and cart_reserved(db, p["id"]) == 5
    assert totals(db, p["id"])[0] == before[0] - 5

    down = auth_client.patch(f"/api/v1/cart/items/{item['id']}", json={"quantity": 1}, headers=csrf(auth_client))
    assert down.status_code == 200 and cart_reserved(db, p["id"]) == 1
    assert totals(db, p["id"]) == (before[0] - 1, before[1] + 1, before[2])


def test_reserva_puede_repartirse_entre_sucursales(auth_client, db):
    p = product(auth_client)
    add_to_cart(auth_client, p["id"], 7)  # ninguna sucursal tiene 7 sola
    assert cart_reserved(db, p["id"]) == 7
    assert db.scalar(select(func.count()).select_from(CartReservation)) >= 2


def test_eliminar_del_carrito_libera_la_reserva(auth_client, db):
    p = product(auth_client)
    before = totals(db, p["id"])
    item = add_to_cart(auth_client, p["id"], 3)["items"][0]
    response = auth_client.delete(f"/api/v1/cart/items/{item['id']}", headers=csrf(auth_client))
    assert response.status_code == 200 and response.json()["items"] == []
    assert totals(db, p["id"]) == before
    assert cart_reserved(db, p["id"]) == 0


def test_stock_insuficiente_no_reserva_nada(auth_client, db):
    p = product(auth_client, "velox-carrera-110")  # 4 unidades
    before = totals(db, p["id"])
    response = auth_client.post(
        "/api/v1/cart/items", json={"productId": p["id"], "quantity": 5}, headers=csrf(auth_client)
    )
    assert response.status_code == 409
    assert totals(db, p["id"]) == before
    assert auth_client.get("/api/v1/cart").json()["items"] == []


def test_reserva_vencida_se_libera_y_sale_del_carrito(auth_client, db):
    p = product(auth_client)
    before = totals(db, p["id"])
    add_to_cart(auth_client, p["id"], 2)
    expire_all_reservations(db)

    # Consultar disponibilidad ya libera lo vencido (el backend es la autoridad).
    assert product(auth_client)["stock"]["available"] == before[0]
    assert totals(db, p["id"]) == before
    cart = auth_client.get("/api/v1/cart").json()
    assert cart["items"] == []


def test_el_carrito_informa_los_productos_vencidos(auth_client, db):
    p = product(auth_client)
    add_to_cart(auth_client, p["id"], 1)
    expire_all_reservations(db)
    cart_id = db.scalar(select(Cart.id).where(Cart.status == "active"))
    # Simula que la limpieza global aún no corrió: el carrito la hace y lo informa.
    from app.modules.inventario import reservations

    cart = db.get(Cart, cart_id)
    names = reservations.purge_cart(db, cart)
    assert names == ["Patinova City 80"]


def test_otro_cliente_puede_comprar_lo_que_vencio(auth_client, client, db):
    from .conftest import register

    p = product(auth_client, "aeroandes-pro-6k")  # 1 unidad
    add_to_cart(auth_client, p["id"], 1)
    other = client  # mismo TestClient; cambiamos de usuario
    other.cookies.clear()
    register(other, email="otro@correo.com")
    blocked = other.post("/api/v1/cart/items", json={"productId": p["id"], "quantity": 1}, headers=csrf(other))
    assert blocked.status_code == 409
    expire_all_reservations(db)
    ok = other.post("/api/v1/cart/items", json={"productId": p["id"], "quantity": 1}, headers=csrf(other))
    assert ok.status_code == 200


def order_body(product_id, quantity, branch_id):
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
            "method": "recogida",
            "branchId": branch_id,
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "timeSlotId": "slot-08",
        },
        "paymentMethod": "pse",
        "dataConsent": True,
        "policyVersion": "2026-10-06",
    }


def test_pedido_convierte_la_reserva_sin_doble_conteo(auth_client, db):
    p = product(auth_client)
    before = totals(db, p["id"])
    branch_id = p["stock"]["byBranch"][-1]["branchId"]
    add_to_cart(auth_client, p["id"], 2)
    assert totals(db, p["id"]) == (before[0] - 2, before[1] + 2, before[2])

    response = auth_client.post("/api/v1/orders", json=order_body(p["id"], 2, branch_id), headers=csrf(auth_client))
    assert response.status_code == 201, response.text
    # Las 2 unidades siguen reservadas UNA sola vez (ahora por el pedido), en la sucursal elegida.
    assert totals(db, p["id"]) == (before[0] - 2, before[1] + 2, before[2])
    assert cart_reserved(db, p["id"]) == 0
    inv = db.scalars(
        select(Inventory).where(Inventory.product_id == uuid.UUID(p["id"]), Inventory.branch_id == uuid.UUID(branch_id))
    ).one()
    assert inv.reserved_quantity >= 2


def test_pedido_rechazado_si_la_reserva_vencio(auth_client, db):
    p = product(auth_client)
    before = totals(db, p["id"])
    add_to_cart(auth_client, p["id"], 1)
    # Vence sin que nadie consulte (la limpieza la hace la propia creación del pedido).
    db.execute(update(CartReservation).values(expires_at=datetime.now(UTC) - timedelta(minutes=1)))
    db.flush()
    response = auth_client.post(
        "/api/v1/orders", json=order_body(p["id"], 1, p["stock"]["byBranch"][0]["branchId"]), headers=csrf(auth_client)
    )
    assert response.status_code == 409
    assert "venció" in response.json()["detail"]
    assert totals(db, p["id"]) == before


def test_pedido_rechazado_si_no_coincide_con_el_carrito(auth_client):
    p = product(auth_client)
    add_to_cart(auth_client, p["id"], 1)
    body = order_body(p["id"], 3, p["stock"]["byBranch"][0]["branchId"])
    response = auth_client.post("/api/v1/orders", json=body, headers=csrf(auth_client))
    assert response.status_code == 409


def test_politica_desactualizada_rechaza_el_pedido(auth_client):
    p = product(auth_client)
    add_to_cart(auth_client, p["id"], 1)
    body = order_body(p["id"], 1, p["stock"]["byBranch"][0]["branchId"]) | {"policyVersion": "2020-01-01"}
    assert auth_client.post("/api/v1/orders", json=body, headers=csrf(auth_client)).status_code == 409


def test_cancelar_pedido_tras_conversion_devuelve_stock(admin_client, db):
    p = product(admin_client)
    before = totals(db, p["id"])
    add_to_cart(admin_client, p["id"], 2)
    order = admin_client.post(
        "/api/v1/orders", json=order_body(p["id"], 2, p["stock"]["byBranch"][0]["branchId"]), headers=csrf(admin_client)
    ).json()
    admin_client.patch(f"/api/v1/admin/orders/{order['id']}", json={"status": "cancelled"}, headers=csrf(admin_client))
    assert totals(db, p["id"]) == before


# ─── Concurrencia real: conexiones y transacciones independientes ─────────


def _committed_fixture(engine, units: int):
    """Crea (con commit) un producto con `units` unidades y dos usuarios."""
    with Session(engine) as s:
        category = s.scalars(select(Category).limit(1)).one()
        branch = s.scalars(select(Branch).limit(1)).one()
        tag = uuid.uuid4().hex[:8]
        prod = Product(
            category_id=category.id,
            name=f"Concurrencia {tag}",
            slug=f"concurrencia-{tag}",
            sku=f"CONC-{tag.upper()}",
            brand="QA",
            short_description="x",
            description="x",
            price=1000,
            image_url=None,
        )
        s.add(prod)
        s.flush()
        s.add(
            Inventory(
                product_id=prod.id,
                branch_id=branch.id,
                total_quantity=units,
                available_quantity=units,
                reserved_quantity=0,
            )
        )
        users = [
            User(
                email=f"conc-{tag}-{i}@correo.com",
                password_hash=hash_password("x"),
                first_name="C",
                last_name="C",
                phone="3000000000",
            )
            for i in range(2)
        ]
        s.add_all(users)
        s.commit()
        return prod.id, [u.id for u in users]


def _cleanup(engine, product_id, user_ids):
    with Session(engine) as s:
        cart_ids = select(Cart.id).where(Cart.user_id.in_(user_ids))
        item_ids = select(CartItem.id).where(CartItem.cart_id.in_(cart_ids))
        s.execute(delete(CartReservation).where(CartReservation.cart_item_id.in_(item_ids)))
        s.execute(delete(CartItem).where(CartItem.cart_id.in_(cart_ids)))
        s.execute(delete(Cart).where(Cart.user_id.in_(user_ids)))
        s.execute(delete(Inventory).where(Inventory.product_id == product_id))
        s.execute(delete(Product).where(Product.id == product_id))
        s.execute(delete(User).where(User.id.in_(user_ids)))
        s.commit()


def test_dos_clientes_simultaneos_no_reservan_la_misma_unidad(engine):
    product_id, user_ids = _committed_fixture(engine, units=1)
    barrier = threading.Barrier(2)
    results: list[str] = []

    def attempt(user_id):
        with Session(engine) as s:
            user = s.get(User, user_id)
            barrier.wait()
            try:
                cart_service.add_item(s, user, AddCartItemIn(product_id=product_id, quantity=1))
                results.append("ok")
            except ConflictError:
                s.rollback()
                results.append("sin stock")

    try:
        threads = [threading.Thread(target=attempt, args=(uid,)) for uid in user_ids]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)
        assert sorted(results) == ["ok", "sin stock"]
        with Session(engine) as s:
            inv = s.scalars(select(Inventory).where(Inventory.product_id == product_id)).one()
            assert (inv.available_quantity, inv.reserved_quantity, inv.total_quantity) == (0, 1, 1)
            active = s.scalar(
                select(func.count()).select_from(CartReservation).where(CartReservation.inventory_id == inv.id)
            )
            assert active == 1
    finally:
        _cleanup(engine, product_id, user_ids)


def test_limpiezas_simultaneas_no_liberan_dos_veces(engine):
    product_id, user_ids = _committed_fixture(engine, units=3)
    try:
        with Session(engine) as s:
            cart_service.add_item(s, s.get(User, user_ids[0]), AddCartItemIn(product_id=product_id, quantity=2))
            s.execute(
                update(CartReservation)
                .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
                .where(CartReservation.inventory_id.in_(select(Inventory.id).where(Inventory.product_id == product_id)))
            )
            s.commit()
        barrier = threading.Barrier(3)

        def sweep():
            with Session(engine) as s:
                barrier.wait()
                release_expired(s)
                s.commit()

        threads = [threading.Thread(target=sweep) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)
        with Session(engine) as s:
            inv = s.scalars(select(Inventory).where(Inventory.product_id == product_id)).one()
            assert (inv.available_quantity, inv.reserved_quantity, inv.total_quantity) == (3, 0, 3)
    finally:
        _cleanup(engine, product_id, user_ids)
