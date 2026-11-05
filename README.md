# EcoMovilidad

Tienda en línea, alquiler de flota, domicilios y panel de operación de **EcoMovilidad Colombia S.A.S.** para el área metropolitana de Bucaramanga (Bucaramanga, Floridablanca, Girón y Piedecuesta).

Los 15 casos de uso del proyecto están implementados. Aún no está en producción: usa datos de demostración, una pasarela de pagos de pruebas y un simulador de GPS. Abajo está [lo que falta para salir a producción](#lo-que-falta).

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend (`src/`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui + Radix, TanStack Query, Zod |
| Mapas | Leaflet + OpenStreetMap; Google Maps opcional si se configura una llave |
| Backend (`backend/`) | Python 3.13, FastAPI, SQLAlchemy 2, Pydantic 2, Alembic, Argon2, fpdf2, segno; dependencias con uv |
| Base de datos | PostgreSQL 16 + PostGIS 3 |
| Pagos | Pasarela de pruebas propia; integración con Wompi lista para recibir llaves |
| Pruebas y calidad | Vitest, Testing Library, ESLint, pytest, Ruff, GitHub Actions, gitleaks |
| Infraestructura | Docker Compose; demo temporal con Cloudflare Tunnel |

## Inicio rápido

Necesitas Docker (en macOS sirve Colima), Node.js 20.9 o superior y, para las pruebas del backend, [uv](https://docs.astral.sh/uv/).

```bash
# Solo la primera vez: crea las claves locales (archivos fuera de Git)
clave="$(openssl rand -hex 24)"
echo "POSTGRES_PASSWORD=$clave" > .env
sed "s/CAMBIAR/$clave/" backend/.env.example > backend/.env
printf 'API_MODE=real\nAPI_BASE_URL=http://127.0.0.1:8000/api/v1\n' > .env.local
npm install

# Cada vez
docker compose up -d --build         # PostgreSQL/PostGIS + API; aplica migraciones y datos de demostración
npm run dev                          # Tienda: http://localhost:3000   Panel: http://localhost:3000/admin
```

**Administrador:** regístrate en la tienda y ejecuta:

```bash
docker compose exec api python -m app.cli make-admin tu@correo.com
```

Detener: `docker compose down` (conserva los datos) o `docker compose down -v` (borra los datos).

Sin Docker, `npm run dev` sin `.env.local` arranca la tienda con datos de ejemplo (`API_MODE=mock`); el panel requiere el backend.

## Qué probar

- **Compra:** agrega al carrito (queda reservado 15 minutos), elige fecha y franja, y paga en la pasarela de pruebas. Después ves la factura en *Mis pedidos*.
- **Domicilio:** el pedido pagado aparece en *Panel > Domicilios*. Asigna un domiciliario, avanza los estados y confirma la entrega con el código QR del cliente o con su firma. El cliente sigue el avance en un enlace público.
- **Alquiler:** en `/alquiler` eliges vehículo y fechas, y pagas. La unidad queda reservada sin cruces de horario.
- **Reembolso:** el cliente cancela lo no pagado o pide reembolso de lo pagado; el panel lo registra.
- **GPS:** registra un dispositivo en *Panel > Operación > Dispositivos GPS*, copia su token y envía posiciones:
  ```bash
  GPS_TOKEN=<token> python3 scripts/simulate_gps.py           # recorre Bucaramanga
  GPS_TOKEN=<token> python3 scripts/simulate_gps.py --salir   # sale de la zona permitida y genera una alerta
  ```
  Sin dispositivos registrados, el mapa de Operación muestra una flota simulada con un aviso visible.
- **Mantenimiento:** en *Panel > Flota* registra el uso de una unidad. Al 90 % de su umbral sale sola de la oferta, y volver a operar exige registrar el mantenimiento.
- **Contenidos:** en *Panel > Contenidos* edita la propuesta de valor, los banners y las noticias de la tienda.

Los correos no se envían: el enlace de recuperación de contraseña aparece en `docker compose logs api`.

## Estado por caso de uso

| Caso de uso | Estado | Límite actual |
| --- | --- | --- |
| CU-01 Registro e inicio de sesión | Hecho | Sin proveedor de correo real |
| CU-02 Catálogo | Hecho | Productos de demostración |
| CU-03 Compra | Hecho | Pago de pruebas |
| CU-04 Alquiler | Hecho | Sin recargos por demora |
| CU-05 Pago | Hecho | Pasarela de pruebas; Wompi sin probar con llaves reales |
| CU-06 Agendar entrega | Hecho | Cupo por sucursal y franja |
| CU-07 Seguimiento del domicilio | Hecho | Se actualiza cada 15 s, sin WebSockets |
| CU-08 Validar entrega | Hecho | El código se escribe en el panel, sin escáner con cámara |
| CU-09 Contenidos | Hecho | Sin subir imágenes; el texto principal del inicio y la ayuda son fijos |
| CU-10 Monitoreo de flota | Hecho | Probado con simulador, sin aparatos físicos |
| CU-11 Geofencing | Hecho | Zonas circulares; alertas solo en el panel |
| CU-12 Mantenimiento | Hecho | El uso se registra a mano, no sale del GPS |
| CU-13 Inventario | Hecho | Solo registra lo que pasa por la app |
| CU-14 Gestionar domicilios | Hecho | El domiciliario no tiene app ni sesión: el panel registra su avance |
| CU-15 Cancelación y reembolso | Hecho | El dinero se devuelve a mano en la pasarela; sin nota crédito |

Detalle por requisito en [REQUISITOS.md](REQUISITOS.md) y por área en [ESTADO.md](ESTADO.md).

## Lo que falta

**Para cobrar de verdad** se necesita una de estas dos opciones:

- Una pasarela real: abrir una cuenta de Wompi y poner sus llaves en `backend/.env`. La integración ya existe, pero no se ha probado con llaves reales.
- Pago manual (contra entrega o transferencia, confirmado en el panel). Esto aún no está construido.

**Para salir a producción:**

- Servidor con HTTPS y copias de seguridad de la base de datos.
- Configuración de producción: `COOKIE_SECURE=true`, cabeceras de seguridad y `/docs` cerrado.
- Tarea programada para vencer reservas y pagos sin depender del tráfico (`python -m app.cli release-expired`).
- Limpieza periódica del historial de posiciones GPS.
- Proveedor de correo para recuperar contraseñas y enviar comprobantes.
- Factura electrónica DIAN, que requiere un proveedor.
- Revisión legal de los textos de datos personales, retracto y drones.
- Datos reales en lugar de los de demostración.

**Mejoras opcionales:** app o sesión para domiciliarios, aparatos GPS físicos, WebSockets, escáner de QR con cámara, carga de imágenes, roles intermedios y pruebas end-to-end automáticas.

## Estructura

```
src/app/(sitio)/        Páginas de la tienda
src/app/admin/          Panel de administración
src/features/<dominio>/ Componentes y lógica por dominio
src/lib/api/            Capa de datos: contratos, esquemas Zod, mock y real
backend/app/modules/    Una carpeta por servicio (router, service, models, schemas, repository)
backend/alembic/        Migraciones
backend/tests/          Pruebas del backend
scripts/                Demo pública y simulador de GPS
```

El navegador nunca llama a FastAPI: todo pasa por el servidor de Next.js. La API y la base de datos solo escuchan en `127.0.0.1`.

## Pruebas

```bash
npm run check                  # typecheck + lint + Vitest + build
cd backend
uv run pytest                  # requiere: docker compose up -d db
uv run ruff check .
uv run alembic check           # modelos y migraciones coinciden
```

GitHub Actions corre todo esto, más una búsqueda de secretos, en cada push.

## Demo pública temporal

```bash
scripts/demo.sh start      # imprime una URL https://….trycloudflare.com
scripts/demo.sh stop
```

Sin AWS ni dominio: Cloudflare Tunnel hacia Next.js en este Mac, que debe seguir encendido y conectado. Detalles en [DEMO_PUBLICA.md](DEMO_PUBLICA.md).

## Documentos

- [DOCUMENTACION.md](DOCUMENTACION.md): arquitectura, base de datos, API, autenticación, panel, ejecución y pruebas.
- [REQUISITOS.md](REQUISITOS.md): requisitos del SRS con su estado.
- [ESTADO.md](ESTADO.md): estado por área.
- [DEMO_PUBLICA.md](DEMO_PUBLICA.md): cómo publicar la demo temporal.

Las sucursales, productos y datos de contacto son **datos de demostración**. Las fotos de producto provienen de Wikimedia Commons (créditos en `/creditos`).
