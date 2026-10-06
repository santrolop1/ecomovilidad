def test_categorias_iniciales(client):
    slugs = {c["slug"] for c in client.get("/api/v1/categories").json()}
    assert slugs == {"bicicletas", "patinetas", "patines", "drones"}


def test_lista_de_productos_con_facetas(client):
    data = client.get("/api/v1/products").json()
    assert data["total"] == len(data["items"]) == 15
    assert {c["value"] for c in data["facets"]["categories"]} == {"bicicletas", "patinetas", "patines", "drones"}
    assert data["facets"]["specs"] == []  # solo dentro de una categoría


def test_filtros_por_categoria_marca_precio_y_especificacion(client):
    data = client.get(
        "/api/v1/products",
        params={
            "categoria": "bicicletas",
            "marca": "Andina Cycles",
            "precioMax": "2000000",
            "spec_asistencia": "Mecánica",
        },
    ).json()
    assert [p["slug"] for p in data["items"]] == ["andina-ruta-mecanica"]


def test_busqueda_sin_tildes_y_orden_por_precio(client):
    items = client.get("/api/v1/products", params={"q": "kondor", "orden": "precio-asc"}).json()["items"]
    assert {p["brand"] for p in items} == {"Kóndor"}
    prices = [p["price"] for p in items]
    assert prices == sorted(prices)


def test_parametros_invalidos_se_ignoran(client):
    data = client.get("/api/v1/products", params={"categoria": "motos", "precioMin": "abc", "orden": "x"}).json()
    assert data["total"] == 15


def test_destacados_con_limite(client):
    items = client.get("/api/v1/products", params={"destacados": "true", "limite": 2}).json()["items"]
    assert len(items) == 2 and all(p["featured"] for p in items)


def test_detalle_de_producto_con_stock_real(client):
    product = client.get("/api/v1/products/voltra-urbana-e1").json()
    assert product["category"] == "bicicletas"
    assert product["stock"]["available"] == sum(b["quantity"] for b in product["stock"]["byBranch"]) == 12
    assert product["stock"]["status"] == "in_stock"
    assert product["compareAtPrice"] > product["price"]


def test_producto_inexistente(client):
    assert client.get("/api/v1/products/no-existe").status_code == 404


def test_producto_sin_inventario_aparece_agotado(client):
    product = client.get("/api/v1/products/rueda-norte-commuter-pro").json()
    assert product["stock"] == {"status": "out_of_stock", "available": 0, "byBranch": []}


def test_inventario_por_sucursal(client):
    product = client.get("/api/v1/products/voltra-urbana-e1").json()
    inventory = client.get(f"/api/v1/products/{product['id']}/inventory").json()
    assert len(inventory) == 3
    for row in inventory:
        assert row["availableQuantity"] + row["reservedQuantity"] <= row["totalQuantity"]
        assert row["city"] in {"Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"}
