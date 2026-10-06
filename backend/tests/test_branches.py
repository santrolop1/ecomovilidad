AREA = {"Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"}


def test_sucursales_demo_en_el_area_metropolitana(client):
    branches = client.get("/api/v1/branches").json()
    assert len(branches) == 5
    assert {b["city"] for b in branches} <= AREA
    assert all(b["isDemo"] for b in branches)
    for b in branches:
        assert 6.9 < b["location"]["lat"] < 7.2 and -73.25 < b["location"]["lng"] < -73.0


def test_disponibilidad_por_categoria_coincide_con_inventario(client):
    branches = {b["slug"]: b for b in client.get("/api/v1/branches").json()}
    cabecera = {i["category"]: i["available"] for i in branches["bucaramanga-cabecera"]["inventory"]}
    products = client.get("/api/v1/products").json()["items"]
    expected: dict[str, int] = {}
    for p in products:
        for entry in p["stock"]["byBranch"]:
            if entry["branchId"] == branches["bucaramanga-cabecera"]["id"]:
                expected[p["category"]] = expected.get(p["category"], 0) + entry["quantity"]
    assert {k: v for k, v in cabecera.items() if v} == expected
