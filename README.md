# EcoMovilidad

Tienda, servicios y panel de operación de **EcoMovilidad Colombia S.A.S.** en el área metropolitana de Bucaramanga (Bucaramanga, Floridablanca, Girón y Piedecuesta).

Next.js 16 · FastAPI · PostgreSQL 16 + PostGIS 3

## Inicio rápido

```bash
docker compose up -d                 # PostgreSQL/PostGIS + API en http://localhost:8000
npm install
API_MODE=real API_BASE_URL=http://localhost:8000/api/v1 npm run dev
# Tienda: http://localhost:3000   Panel: http://localhost:3000/admin
```

Administrador de **desarrollo** (solo local, definido en `docker-compose.yml`): `admin@ecomovilidad.dev` / `ELIMINADA`.

Sin Docker, `npm run dev` arranca la tienda con datos de demostración (`API_MODE=mock`; el panel requiere el backend).

Detener: `docker compose down` (conserva datos) o `docker compose down -v` (borra datos).

## Pruebas

```bash
npm run check                        # typecheck + lint + Vitest + build
cd backend && uv run pytest          # requiere: docker compose up -d db
```

## Documentos

- [DOCUMENTACION.md](DOCUMENTACION.md): documentación del producto (arquitectura, base de datos, API, autenticación, panel, ejecución y pruebas).
- [REQUISITOS.md](REQUISITOS.md): requisitos del SRS con estado verificable.
- [ESTADO.md](ESTADO.md): estado por área (implementado, parcial, mock, pendiente).

Las sucursales, productos y datos de contacto son **datos de demostración**. Las fotos de producto provienen de Wikimedia Commons (créditos en `/creditos`).
