# EcoMovilidad

Tienda, servicios y panel de operación de **EcoMovilidad Colombia S.A.S.** en el área metropolitana de Bucaramanga (Bucaramanga, Floridablanca, Girón y Piedecuesta).

Next.js 16 · FastAPI · PostgreSQL 16 + PostGIS 3 · Leaflet + OpenStreetMap

## Inicio rápido

```bash
docker compose up -d                 # PostgreSQL/PostGIS + API en http://localhost:8000
npm install
API_MODE=real API_BASE_URL=http://localhost:8000/api/v1 npm run dev
# Tienda: http://localhost:3000   Panel: http://localhost:3000/admin
```

Administrador de **desarrollo**: regístrate en la tienda y ejecuta `docker compose exec api python -m app.cli make-admin tu@correo.com`. La demo pública usa la contraseña aleatoria de `.env.demo`.

El enlace de recuperación de contraseña se ve en `docker compose logs api` (no hay proveedor de correo).

Pagos: la app **está lista para recibir las llaves de Wompi**, pero por ahora usa una **pasarela de pruebas** propia (pago simulado, sin cobro real, mismo flujo). Para usar Wompi, pon sus llaves en `backend/.env` (ver `backend/.env.example`; nunca en Git) y reinicia la API. Detalles en DOCUMENTACION.md §13 y DEMO_PUBLICA.md.

Sin Docker, `npm run dev` arranca la tienda con datos de demostración (`API_MODE=mock`; el panel requiere el backend).

Detener: `docker compose down` (conserva datos) o `docker compose down -v` (borra datos).

## Demo pública temporal

```bash
scripts/demo.sh start      # imprime una URL https://….trycloudflare.com
scripts/demo.sh stop
```

Sin AWS ni dominio: Cloudflare Tunnel hacia Next.js en este Mac. El Mac debe seguir encendido y conectado mientras se use la URL. Detalles en [DEMO_PUBLICA.md](DEMO_PUBLICA.md).

## Pruebas

```bash
npm run check                        # typecheck + lint + Vitest + build
cd backend && uv run pytest          # requiere: docker compose up -d db
```

## Documentos

- [DOCUMENTACION.md](DOCUMENTACION.md): documentación del producto (arquitectura, base de datos, API, autenticación, panel, ejecución y pruebas).
- [REQUISITOS.md](REQUISITOS.md): requisitos del SRS con estado verificable.
- [ESTADO.md](ESTADO.md): estado por área (implementado, parcial, mock, pendiente).
- [DEMO_PUBLICA.md](DEMO_PUBLICA.md): cómo publicar una demo temporal con Cloudflare Tunnel.

Mapas: el público (inicio y `/sucursales`) usa OpenStreetMap con las sucursales reales de la base; el operativo del panel (`/admin/operacion`) muestra activos **simulados** (modo demostración) porque aún no hay telemetría GPS. Detalle en DOCUMENTACION.md §10.

Las sucursales, productos y datos de contacto son **datos de demostración**. Las fotos de producto provienen de Wikimedia Commons (créditos en `/creditos`).
