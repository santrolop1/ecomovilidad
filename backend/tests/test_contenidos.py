"""CU-09: el panel edita propuesta de valor, banners y noticias; la tienda los muestra."""

from datetime import UTC, datetime, timedelta

from .conftest import csrf, register
from .test_admin import A

C = f"{A}/content"


def iso(days):
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


BANNER = {
    "title": "Promo de prueba",
    "description": "Descripción del banner",
    "ctaLabel": "Ver",
    "ctaHref": "/catalogo?categoria=drones",
    "startsAt": iso(-1),
    "endsAt": iso(1),
}
NEWS = {"slug": "noticia-prueba", "title": "Noticia de prueba", "excerpt": "Resumen", "publishedAt": iso(-1)}


def test_la_tienda_trae_el_contenido_inicial(client):
    home = client.get("/api/v1/content/home").json()
    assert len(home["valuePropositions"]) == 4 and home["valuePropositions"][0]["icon"] == "truck"
    assert len(home["banners"]) == 1 and home["banners"][0]["cta"]["href"].startswith("/")
    assert len(client.get("/api/v1/content/news").json()) == 3


def test_banner_solo_se_ve_dentro_de_sus_fechas_y_activo(admin_client):
    def titles():
        return [b["title"] for b in admin_client.get("/api/v1/content/home").json()["banners"]]

    created = admin_client.post(f"{C}/banners", json=BANNER, headers=csrf(admin_client)).json()
    assert "Promo de prueba" in titles()
    item = next(b for b in created["banners"] if b["title"] == "Promo de prueba")
    url = f"{C}/banners/{item['id']}"
    assert admin_client.put(url, json={**BANNER, "endsAt": iso(-0.5)}, headers=csrf(admin_client)).status_code == 200
    assert "Promo de prueba" not in titles()
    admin_client.put(url, json={**BANNER, "isActive": False}, headers=csrf(admin_client))
    assert "Promo de prueba" not in titles()
    admin_client.put(url, json=BANNER, headers=csrf(admin_client))
    assert "Promo de prueba" in titles()
    assert admin_client.delete(url, headers=csrf(admin_client)).status_code == 200
    assert "Promo de prueba" not in titles()


def test_el_enlace_del_banner_solo_puede_ser_interno(admin_client):
    for href in ("https://malo.example", "//malo.example", "javascript:alert(1)", "catalogo"):
        response = admin_client.post(f"{C}/banners", json={**BANNER, "ctaHref": href}, headers=csrf(admin_client))
        assert response.status_code == 422, href
    wrong = {**BANNER, "startsAt": iso(2), "endsAt": iso(1)}
    assert admin_client.post(f"{C}/banners", json=wrong, headers=csrf(admin_client)).status_code == 422


def test_noticias_sin_publicar_o_futuras_no_se_muestran_y_slug_unico(admin_client):
    def slugs():
        return [n["slug"] for n in admin_client.get("/api/v1/content/news").json()]

    created = admin_client.post(f"{C}/news", json=NEWS, headers=csrf(admin_client))
    assert created.status_code == 200 and "noticia-prueba" in slugs()
    assert admin_client.post(f"{C}/news", json=NEWS, headers=csrf(admin_client)).status_code == 409
    item = next(n for n in created.json()["news"] if n["slug"] == "noticia-prueba")
    admin_client.put(f"{C}/news/{item['id']}", json={**NEWS, "isPublished": False}, headers=csrf(admin_client))
    assert "noticia-prueba" not in slugs()
    admin_client.put(f"{C}/news/{item['id']}", json={**NEWS, "publishedAt": iso(3)}, headers=csrf(admin_client))
    assert "noticia-prueba" not in slugs()


def test_editar_y_ordenar_la_propuesta_de_valor(admin_client):
    items = admin_client.get(C).json()["valuePropositions"]
    last = items[-1]
    body = {"title": "Primero ahora", "description": "Nuevo texto", "icon": "leaf", "position": 0}
    updated = admin_client.put(f"{C}/value-propositions/{last['id']}", json=body, headers=csrf(admin_client))
    assert updated.status_code == 200
    assert admin_client.get("/api/v1/content/home").json()["valuePropositions"][0]["title"] == "Primero ahora"
    bad = {**body, "icon": "bomba"}
    assert admin_client.post(f"{C}/value-propositions", json=bad, headers=csrf(admin_client)).status_code == 422


def test_inexistente_y_solo_administradores(admin_client, client):
    fake = "00000000-0000-0000-0000-000000000000"
    assert admin_client.delete(f"{C}/banners/{fake}", headers=csrf(admin_client)).status_code == 404
    assert admin_client.delete(f"{C}/inventado/{fake}", headers=csrf(admin_client)).status_code == 422
    admin_client.cookies.clear()
    register(client, email="sin-panel@correo.com")
    assert client.get(C).status_code == 403
    assert client.post(f"{C}/banners", json=BANNER, headers=csrf(client)).status_code == 403
