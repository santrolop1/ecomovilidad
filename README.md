# EcoMovilidad

Tienda, servicios y panel de operación de **EcoMovilidad Colombia S.A.S.** en el área metropolitana de Bucaramanga (Bucaramanga, Floridablanca, Girón y Piedecuesta).

Incluye compra en línea, alquiler de flota, facturas, reembolsos y panel de administración. Aún no está en producción y usa datos de demostración.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend (`src/`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui + Radix, TanStack Query, Zod |
| Mapas | Leaflet + OpenStreetMap; Google Maps opcional si se configura una llave |
| Backend (`backend/`) | Python 3.13, FastAPI, SQLAlchemy 2, Pydantic 2, Alembic, Argon2, fpdf2; dependencias con uv |
| Base de datos | PostgreSQL 16 + PostGIS 3 |
| Pagos | Pasarela de pruebas propia; integración con Wompi lista para recibir llaves |
| Pruebas y calidad | Vitest, Testing Library, ESLint, pytest, Ruff, GitHub Actions, gitleaks |
| Infraestructura | Docker Compose; demo temporal con Cloudflare Tunnel |

## Inicio rápido

```bash
# Solo la primera vez: crea las claves locales (archivos fuera de Git)
clave="$(openssl rand -hex 24)"
echo "POSTGRES_PASSWORD=$clave" > .env
sed "s/CAMBIAR/$clave/" backend/.env.example > backend/.env

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

## Estado y lo que falta

| Caso de uso | Estado | Qué falta |
| --- | --- | --- |
| CU-01 Registro e inicio de sesión | Hecho | — |
| CU-02 Catálogo | Hecho | — |
| CU-03 Compra | Hecho (pago de pruebas) | Cobro real con Wompi |
| CU-04 Alquiler | Hecho | — |
| CU-05 Pago | Hecho (pago de pruebas) | Probar Wompi con llaves reales |
| CU-13 Inventario | Hecho | — |
| CU-15 Cancelación y reembolso | Hecho (reembolso manual) | Devolución automática y nota crédito |
| CU-06 Agendar entrega | Hecho | — |
| CU-12 Mantenimiento | Parcial | Umbrales de uso, alertas, bloqueo al 90% y bitácora |
| CU-09 Contenidos | Hecho | Sin subir imágenes; el texto principal del inicio y las preguntas frecuentes siguen fijos |
| CU-10 Monitoreo de flota | Hecho (sin aparatos reales) | Conectar aparatos o una app; hoy se prueba con `scripts/simulate_gps.py` |
| CU-07 Seguimiento del domicilio | Hecho | Se actualiza cada 15 s; sin WebSockets |
| CU-08 Validar entrega | Hecho | El código se escribe en el panel; sin escáner con cámara |
| CU-11 Geofencing | Hecho | Zonas circulares; sin dibujar polígonos ni avisos por correo |
| CU-14 Gestionar domicilios | Hecho | Sin app ni sesión para domiciliarios |

**Para salir a producción también falta:**

- Servidor con HTTPS, copias de seguridad y configuración segura (cookies, cabeceras, `/docs` cerrado).
- Tarea programada para vencer reservas y pagos sin depender del tráfico.
- Proveedor de correo para recuperar contraseñas.
- Factura electrónica DIAN, que requiere un proveedor.
- Revisión legal de los textos de datos personales, retracto y drones.
- Reemplazar los datos de demostración por los reales.

Detalle por requisito en [REQUISITOS.md](REQUISITOS.md) y por área en [ESTADO.md](ESTADO.md).

## Documentos

- [DOCUMENTACION.md](DOCUMENTACION.md): documentación del producto (arquitectura, base de datos, API, autenticación, panel, ejecución y pruebas).
- [REQUISITOS.md](REQUISITOS.md): requisitos del SRS con estado verificable.
- [ESTADO.md](ESTADO.md): estado por área (implementado, parcial, mock, pendiente).
- [DEMO_PUBLICA.md](DEMO_PUBLICA.md): cómo publicar una demo temporal con Cloudflare Tunnel.

Mapas: el público (inicio y `/sucursales`) usa OpenStreetMap con las sucursales reales de la base; el operativo del panel (`/admin/operacion`) muestra activos **simulados** (modo demostración) porque aún no hay telemetría GPS. Detalle en DOCUMENTACION.md §10.

Las sucursales, productos y datos de contacto son **datos de demostración**. Las fotos de producto provienen de Wikimedia Commons (créditos en `/creditos`).
