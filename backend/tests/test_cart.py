from .conftest import PASSWORD, csrf


def product(client, slug="patinova-city-80"):
    return client.get(f"/api/v1/products/{slug}").json()


def test_carrito_requiere_sesion(client):
    assert client.get("/api/v1/cart").status_code == 401


def test_carrito_vacio_inicial(auth_client):
    cart = auth_client.get("/api/v1/cart").json()
    assert cart["items"] == []


def test_agregar_actualizar_y_eliminar(auth_client):
    p = product(auth_client)
    cart = auth_client.post("/api/v1/cart/items", json={"productId": p["id"], "quantity": 2}, headers=csrf(auth_client))
    assert cart.status_code == 200
    item = cart.json()["items"][0]
    assert item["quantity"] == 2 and item["unitPrice"] == p["price"] and item["maxQuantity"] == 10

    again = auth_client.post(
        "/api/v1/cart/items", json={"productId": p["id"], "quantity": 1}, headers=csrf(auth_client)
    )
    assert again.json()["items"][0]["quantity"] == 3  # se acumula en la misma línea

    patched = auth_client.patch(f"/api/v1/cart/items/{item['id']}", json={"quantity": 1}, headers=csrf(auth_client))
    assert patched.json()["items"][0]["quantity"] == 1

    deleted = auth_client.delete(f"/api/v1/cart/items/{item['id']}", headers=csrf(auth_client))
    assert deleted.json()["items"] == []


def test_no_permite_superar_el_inventario(auth_client):
    p = product(auth_client, "aeroandes-pro-6k")  # 1 unidad en total
    response = auth_client.post(
        "/api/v1/cart/items", json={"productId": p["id"], "quantity": 2}, headers=csrf(auth_client)
    )
    assert response.status_code == 409
    assert "Solo quedan 1" in response.json()["detail"]


def test_modificar_sin_csrf_es_rechazado(auth_client):
    p = product(auth_client)
    assert auth_client.post("/api/v1/cart/items", json={"productId": p["id"], "quantity": 1}).status_code == 403


def test_carrito_persiste_entre_dispositivos(auth_client, client):
    p = product(auth_client)
    auth_client.post("/api/v1/cart/items", json={"productId": p["id"], "quantity": 2}, headers=csrf(auth_client))

    # "Otro dispositivo": nueva sesión del mismo usuario.
    auth_client.cookies.clear()
    auth_client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": PASSWORD})
    items = auth_client.get("/api/v1/cart").json()["items"]
    assert [(i["slug"], i["quantity"]) for i in items] == [("patinova-city-80", 2)]


def test_item_de_otro_usuario_no_es_accesible(client):
    from .conftest import register

    register(client, email="uno@correo.com")
    p = product(client)
    item_id = client.post(
        "/api/v1/cart/items", json={"productId": p["id"], "quantity": 1}, headers=csrf(client)
    ).json()["items"][0]["id"]
    client.cookies.clear()
    register(client, email="dos@correo.com")
    assert client.delete(f"/api/v1/cart/items/{item_id}", headers=csrf(client)).status_code == 404
