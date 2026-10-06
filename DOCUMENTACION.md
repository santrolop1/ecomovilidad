# EcoMovilidad Colombia S.A.S.

## Documentación del producto

| | |
| --- | --- |
| **Producto** | Portal web, tienda en línea y panel de operación |
| **Versión** | 0.5.3 (fase 5.3: mapas) |
| **Fecha** | 6 de octubre de 2026 |
| **Estado** | En desarrollo. Funciona localmente sobre datos de **demostración**. No está desplegado en producción. |
| **Repositorio** | `ecomovilidad/` (Next.js + FastAPI + PostgreSQL/PostGIS) |

> Este documento describe el producto **tal como está construido hoy**: lo que dice el código y lo que demostraron las pruebas. Lo que solo existe como maqueta o mock se indica como tal.

---

## 1. Descripción general del producto

EcoMovilidad es la plataforma de **EcoMovilidad Colombia S.A.S.** para vender y operar vehículos de movilidad eléctrica y deportiva: bicicletas, patinetas eléctricas, patines de línea y drones.

Hoy está formada por tres piezas:

1. **Tienda web pública.** Catálogo, ficha de producto, sucursales, carrito, checkout y cuentas de cliente.
2. **Panel de operación (`/admin`).** Para administradores: productos, categorías, inventario por sucursal, pedidos, usuarios, sucursales y alquileres.
3. **API y base de datos.** FastAPI sobre PostgreSQL 16 con PostGIS.

## 2. Objetivo

Unir en una sola plataforma los dos negocios que define el SRS:

- **Venta** de vehículos nuevos con inventario real por sucursal.
- **Servicios** sobre una flota propia: alquiler, domicilios y mantenimiento.

La versión 0.4.0 cierra la experiencia de compra del cliente **hasta el pedido**: reserva de inventario de 15 minutos al agregar al carrito, "Mis pedidos", perfil, recuperación de contraseña, límite de intentos de login y evidencia del consentimiento. **El pedido se registra pero no se cobra:** pagos, domicilios con seguimiento, GPS y mantenimiento siguen pendientes (ver §5 y §21).

## 3. Usuarios

| Usuario | Qué puede hacer hoy |
| --- | --- |
| Visitante | Navegar el catálogo, las sucursales y la oferta de alquiler; armar un carrito local. |
| Cliente con cuenta | Registrarse, iniciar sesión, recuperar su contraseña, editar su perfil, reservar productos en el carrito durante 15 minutos, crear pedidos y consultarlos en "Mis pedidos". |
| Administrador | Usar el panel `/admin`. El rol se asigna solo desde el servidor. |
| Domiciliario, operador de punto | Definidos en el SRS. **Sin implementar.** |

## 4. Alcance geográfico

EcoMovilidad opera **exclusivamente en el área metropolitana de Bucaramanga**:

- Bucaramanga
- Floridablanca
- Girón
- Piedecuesta

El alcance está impuesto en el código y en la base de datos:

- `branches.city` solo admite esos cuatro municipios (restricción `CHECK`).
- Un pedido a domicilio solo se acepta en esos municipios (restricción en `orders` y validación en FastAPI).
- El panel rechaza sucursales con coordenadas fuera del área metropolitana.

"Colombia" aparece únicamente como marco legal y de servicios nacionales: Ley 1581 (datos personales), Ley 1480 (consumidor), DIAN (facturación) y AEROCIVIL (drones). **No hay operación en Bogotá, Medellín, Cali, Barranquilla ni ninguna otra ciudad.**

**Datos de demostración.** Las 5 sucursales, sus direcciones, teléfonos y coordenadas son inventadas; en la base tienen `is_demo = true` y la interfaz las marca como "Dato de demostración". Los 15 productos y sus marcas también son ficticios.

## 5. Funcionalidades actuales

### Implementado real

Funciona de punta a punta con FastAPI y PostgreSQL y tiene pruebas automáticas.

- Catálogo con búsqueda sin tildes, filtros por categoría, precio, marca y especificaciones, orden y facetas.
- Ficha de producto con stock por sucursal y 404 real para productos inexistentes o inactivos.
- Sucursales con horarios, servicios y disponibilidad por categoría, calculada desde el inventario.
- Registro, inicio y cierre de sesión con sesiones de servidor, cookies httpOnly y protección CSRF.
- Carrito persistente para usuarios con sesión (el mismo en cualquier dispositivo).
- Carrito local para visitantes y fusión con la cuenta al iniciar sesión.
- **Reserva temporal de inventario de 15 minutos (RF 6.2)** al agregar al carrito con sesión, con vencimiento y liberación automática, contador en el carrito y en el checkout, y bloqueo del checkout si la reserva venció (ver §12).
- Pedidos con reserva de inventario transaccional en una sucursal; la reserva del carrito se convierte en la del pedido sin contar dos veces.
- **Mis pedidos** (`/cuenta/pedidos` y `/cuenta/pedidos/[id]`): solo los pedidos propios (404 para pedidos ajenos).
- **Perfil** (`/cuenta`): editar nombre, apellido, celular y documento; cambiar la contraseña (cierra las demás sesiones).
- **Recuperación de contraseña** con token de un solo uso, guardado como hash y con vencimiento de 30 minutos. Al cambiarla se cierran todas las sesiones.
- **Límite de intentos de login** sin Redis: 5 fallos por cuenta y 30 por IP en 15 minutos (ver §14).
- **Evidencia del consentimiento (Ley 1581):** usuario, fecha y versión de la política, en el registro y en cada pedido.
- Ciclo de vida del pedido desde el panel: confirmar, completar (descuenta inventario) y cancelar (libera inventario).
- Panel de operación completo (ver §15), protegido por un rol en la base de datos.
- Rol administrativo `users.is_admin`, asignado por CLI o por el seed de desarrollo.
- PostGIS: punto geográfico de cada sucursal con índice espacial.
- **Mapa público real** (Leaflet + OpenStreetMap) en el inicio y en `/sucursales`: sucursales con sus coordenadas de la base de datos y disponibilidad real por categoría; fallback si el mapa no carga (§10).
- Fotografías reales de producto (Wikimedia Commons) con atribución y la página `/creditos`.

### Implementado parcialmente

- **Alquileres.** Existen la tabla `rentals`, su consulta por usuario y el listado en el panel. **No hay forma de crear alquileres** desde la tienda ni el panel. La oferta de `/alquiler` (tarifas y vehículos) es mock.
- **Franjas horarias (RF 7.1).** El checkout permite elegir fecha y franja, y FastAPI las valida y guarda. La lista de franjas y su "sin cupo" son mock; no hay capacidad real por franja.
- **Mapa de sucursales (RF 1.2).** Mapa real con coordenadas de PostGIS y disponibilidad que se refresca cada 60 s. No es "tiempo real" por eventos: se consulta periódicamente.
- **Ley 1581.** La evidencia del consentimiento se guarda (§14), pero el **texto legal** de la política sigue pendiente de revisión jurídica.
- **Recuperación de contraseña.** El flujo es real, pero **no se envían correos**: no hay proveedor de correo. En desarrollo el enlace se escribe en el log de la API (`docker compose logs api`); en otros entornos no se registra el token y el correo no sale.
- **Vencimiento de reservas.** Es perezoso: se libera en cada solicitud a la API (o con el comando opcional `release-expired` en un cron). Sin tráfico, las unidades quedan apartadas hasta la siguiente solicitud, aunque nadie puede comprarlas con una reserva vencida.
- **Pedidos del cliente.** Se consultan, pero no se pueden cancelar desde la tienda ni pagar; no hay historial de estados.

### Mock

Solo existe con datos de demostración, sin backend.

- Contenido editorial (CMS): hero, banners, propuesta de valor, noticias, FAQ y servicios.
- Oferta de alquiler con tarifas y la regla de mantenimiento al 90% (RF 3.2) aplicada a esa oferta.
- Lista de franjas horarias.
- **Mapa operativo del panel** (`/admin/operacion`): las sucursales son reales, pero los activos, sus posiciones y estados son **simulados** en el navegador (MODO DEMOSTRACIÓN, §10).
- `API_MODE=mock` completo: toda la tienda funciona sin backend con datos en memoria; el login responde "no disponible" y el panel muestra "requiere backend".

### Pendiente

No existe.

- Pagos (Wompi: PSE, tarjetas, billeteras) y facturación electrónica DIAN.
- Domicilios con seguimiento, asignación de domiciliarios y estados de domicilio (RF 5.x).
- GPS, telemetría y WebSockets.
- Geocercas (geofencing) para drones.
- Validación de entrega con QR y firma digital.
- Mantenimiento preventivo real: umbrales, bloqueo automático y bitácora.
- CMS administrable y formulario de contacto conectado.
- Proveedor real de correo (envío del enlace de recuperación).
- Carga de imágenes desde el panel.
- Historial de cambios de estado de pedidos.
- Despliegue en AWS y HTTPS/TLS 1.3.

## 6. Arquitectura

```
Navegador
   │  HTTPS
   ▼
Next.js 16 (App Router)
   │  Server Components, Server Actions y route handler /api/branches
   │  REST/JSON con la cookie httpOnly del usuario reenviada desde el servidor
   ▼
FastAPI  /api/v1  (un solo servicio, sin microservicios)
   │  SQLAlchemy 2 + psycopg 3
   ▼
PostgreSQL 16 + PostGIS 3.6
```

- El navegador **nunca** llama directamente a FastAPI: todas las llamadas salen del servidor de Next.js.
- Desarrollo local con **Docker Compose**: base de datos y API. En macOS el runtime es **Colima**. Ambos servicios se publican solo en `127.0.0.1`.
- **Demo pública temporal:** Cloudflare Tunnel (`trycloudflare.com`) hacia Next.js en el Mac; ver [DEMO_PUBLICA.md](DEMO_PUBLICA.md). No hay despliegue en la nube.
- Sin Redis, Kafka, Celery, Kubernetes ni servicios de nube en esta fase. Las reservas vencidas y los límites de login se resuelven en PostgreSQL.

## 7. Frontend

**Tecnologías:** Next.js 16.3, React 19.2, TypeScript estricto, Tailwind CSS 4, shadcn/ui (Radix), lucide-react, Motion, TanStack Query 5 y Zod 4.

**Estructura (`src/`):**

```
app/(sitio)/   tienda pública (header + footer), incluida la cuenta del cliente
app/admin/     panel de operación (shell propio)
features/      catalog, cart, checkout, auth, account, branches, rentals, admin, operations, contact, content, home
components/    ui (shadcn), layout, shared, map (base de Leaflet compartida)
lib/api/       contratos, cliente HTTP, implementación mock y real, API admin
types/ mocks/ config/ hooks/
```

**Rutas.** 21 rutas públicas y 15 del panel.

| Pública | Datos con `API_MODE=real` |
| --- | --- |
| `/` | Categorías, destacados y sucursales reales; contenido editorial mock |
| `/catalogo`, `/catalogo/[slug]` | Real |
| `/sucursales` | Real (refresco cada 60 s), con mapa de OpenStreetMap |
| `/carrito` | Real con sesión; local sin sesión |
| `/checkout` | Real; exige cuenta |
| `/login`, `/registro` | Real |
| `/recuperar`, `/recuperar/nueva` | Real (solicitar enlace y elegir contraseña nueva) |
| `/cuenta` | Real; exige sesión: perfil, contraseña e historial de consentimientos |
| `/cuenta/pedidos`, `/cuenta/pedidos/[id]` | Real; exige sesión; solo pedidos propios |
| `/alquiler` | Oferta mock; sucursales reales |
| `/servicios`, `/nosotros`, `/ayuda` | Contenido mock |
| `/contacto` | Sin backend: responde "no disponible" |
| `/privacidad`, `/terminos` | Estáticas, pendientes de revisión legal |
| `/creditos` | Autores y licencias de las fotos |

Las 15 rutas del panel se detallan en §15. Los mapas se describen en §10.

**`API_MODE`.**

- `mock` (por defecto): datos en memoria, sin backend.
- `real`: FastAPI. Cada respuesta se valida con Zod.

Las secciones sin backend (CMS, oferta de alquiler, franjas) siguen usando el mock también en modo real, y así está indicado en el código.

**Sesión en el cliente.** `useSession()` consulta una Server Action y guarda el resultado en la caché de TanStack Query. El JavaScript del navegador nunca recibe tokens.

**Carrito.**
- Visitantes: `localStorage`, validado con Zod.
- Usuarios con sesión: carrito de FastAPI, con actualizaciones optimistas y contador de la reserva (§12).

**Imágenes.**
- 14 fotografías reales en `public/images/products/` (WebP 1200×900, 2,1 MB en total), servidas con `next/image`, `sizes` por breakpoint y calidad 70.
- El producto sin foto adecuada (Velox Carrera 110) muestra "Imagen pendiente".

- "Mis pedidos" reutiliza las fotos del catálogo.

**Responsive.** Probado a 360, 390, 768, 1024, 1280 y 1440 px. En el panel, las tablas se convierten en tarjetas en móvil y las columnas secundarias solo aparecen en pantallas anchas.

## 8. Backend

**Tecnologías:** FastAPI 0.142, SQLAlchemy 2.1 (síncrono), psycopg 3, Alembic 1.20, GeoAlchemy2, Pydantic 2, argon2-cffi y Python 3.13 (gestionado con `uv`).

```
backend/app/
  main.py          aplicación, CORS, manejo de errores de negocio
  core/            configuración, seguridad (argon2, tokens)
  db/              base, sesión, seed + seed_data.json (DEMO)
  models/          tablas y enums
  schemas/         entrada/salida Pydantic (JSON en camelCase)
  repositories/    consultas
  core/email.py    adaptador de correo (desarrollo: log)
  services/        reglas de negocio (catálogo, carrito, reservas, pedidos, auth,
                   login_guard, consent, admin/)
  api/deps.py      sesión, CSRF, require_admin y liberación de reservas vencidas
  api/client_ip.py IP del cliente (X-Forwarded-For solo de proxies de confianza)
  api/routes/      endpoints /api/v1
  cli.py           make-admin / revoke-admin / release-expired
backend/alembic/   migraciones 0001 (esquema), 0002 (rol admin, imagen opcional)
                   y 0003 (reservas y registros de seguridad)
backend/tests/     pytest contra PostGIS real
```

**Validaciones.** Pydantic valida toda entrada: longitudes, formatos, enums y coordenadas del área metropolitana. La base de datos repite las reglas críticas con restricciones `CHECK`, `UNIQUE` y claves foráneas.

**Errores.**
- Los errores de negocio responden `{"detail": "mensaje"}` con su código: 400, 401, 403, 404, 409 o 429.
- Las violaciones de unicidad (SKU, slug) se traducen a 409 con un mensaje legible.

**Pruebas.** 121 pruebas pytest contra PostgreSQL + PostGIS real (ver §19).

## 9. Base de datos

PostgreSQL 16 + PostGIS. Claves primarias UUID (`gen_random_uuid()`) y marcas de tiempo.

| Tabla | Contenido | Restricciones y relaciones |
| --- | --- | --- |
| `users` | email, password_hash (argon2id), nombre, apellido, teléfono, documento, is_active, **is_admin** | email único en minúsculas |
| `user_sessions` | token_hash, csrf_token_hash, expires_at | → users (CASCADE). Se borra al cerrar sesión o desactivar la cuenta |
| `categories` | name, slug, description | nombre y slug únicos |
| `products` | categoría, nombre, slug, sku, marca, resúmenes, precio, precio anterior, especificaciones (JSONB), destacados, **image_url (opcional)**, is_featured, is_active | → categories (RESTRICT); precio ≥ 0; precio anterior > precio; slug y SKU únicos |
| `branches` | slug, nombre, dirección, barrio, municipio, teléfono, latitud, longitud, **location** (geography), horarios (JSONB), servicios, is_demo, is_active | municipio ∈ área metropolitana; coordenadas válidas; índice GiST |
| `inventory` | product_id, branch_id, disponible, reservado, total | único (producto, sucursal); cantidades ≥ 0; disponible + reservado ≤ total |
| `carts` | user_id, status (active / converted / abandoned) | un solo carrito activo por usuario (índice único parcial) |
| `cart_items` | cart_id, product_id, cantidad, precio unitario | único (carrito, producto); cantidad 1–10 |
| `cart_reservations` | cart_item_id, inventory_id, cantidad, expires_at | → cart_items (CASCADE), → inventory (RESTRICT); cantidad > 0; índice por `expires_at`. La suma de reservas de una línea es su cantidad |
| `orders` | user_id, estado, subtotal, envío, total, branch_id, datos de entrega, método de pago, contacto y documento | total = subtotal + envío; domicilio dentro del área; estados válidos |
| `order_items` | order_id, product_id, cantidad, precio unitario, subtotal | subtotal = cantidad × precio |
| `rentals` | user_id, product_id, branch_id, inicio, fin, estado, precio | fin > inicio; estados válidos |
| `password_reset_tokens` | user_id, token_hash (SHA-256), expires_at, used_at | → users (CASCADE); hash único |
| `login_attempts` | email_hash (SHA-256 del correo), ip_address, succeeded, created_at | índices por (email_hash, fecha) e (IP, fecha); se purgan a las 24 h |
| `consent_records` | user_id, purpose (`registro` / `pedido`), policy_version, order_id, accepted_at | → users (CASCADE), → orders; un consentimiento de pedido exige `order_id` |

**Relaciones principales:**
- Un producto pertenece a una categoría y tiene una fila de inventario por sucursal.
- Un usuario tiene sesiones, un carrito activo, pedidos, alquileres, tokens de recuperación y consentimientos.
- Una línea de carrito tiene una o varias reservas, cada una sobre una fila de inventario (puede repartirse entre sucursales).
- Un pedido se despacha desde una sucursal y sus líneas apuntan a productos.

**Migraciones:**
- `0001`: esquema inicial y extensión PostGIS.
- `0002`: `users.is_admin` y `products.image_url` opcional.
- `0003`: `cart_reservations`, `password_reset_tokens`, `login_attempts` y `consent_records`. Las líneas de carrito anteriores, sin reserva, se retiran en la primera limpieza.

Las tres son reversibles (probado `upgrade → downgrade → upgrade`) y `alembic check` no detecta diferencias con los modelos.

## 10. PostGIS y mapas

- `branches.location` es una columna `geography(Point, 4326)` **generada** a partir de `latitude` y `longitude`: `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. Nunca se desincroniza de las coordenadas.
- Índice **GiST** (`ix_branches_location`), listo para `ST_DWithin` y `ST_Distance`.
- Prueba automática: la distancia Cabecera–Piedecuesta da unos 15,6 km.
- Las coordenadas se editan en el panel; PostGIS recalcula el punto.
- **No implementado:** geocercas, sucursal más cercana al cliente (falta geocodificar direcciones) y telemetría GPS.

### Mapas

**Tecnología.** Leaflet 1.9 + React-Leaflet 5. Sin API key y sin servicios de AWS.

**Cartografía.** Teselas estándar de **OpenStreetMap** (`tile.openstreetmap.org`), con la atribución obligatoria "© Colaboradores de OpenStreetMap". El modo oscuro es un filtro CSS sobre las teselas. Se descartaron los estilos oscuros de CARTO porque hoy devuelven teselas marcadas "API KEY REQUIRED". La política de uso de OSM admite tráfico moderado (demos); para producción con tráfico real conviene un proveedor de teselas con contrato.

**Dos mapas distintos sobre una base común:**

| | Mapa público | Mapa operativo |
| --- | --- | --- |
| Dónde | Portada del inicio (versión resumida, sustituye la antigua ilustración esquemática) y `/sucursales` (completo, con lista sincronizada) | `/admin/operacion` ("Operación en tiempo real") |
| Aspecto | Oscuro con calles y nombres legibles, marcadores verdes con halo, popups redondeados | Casi monocromo y más oscuro; activos por forma (tipo) y color (estado), recorridos, bases cuadradas |
| Datos | **Reales:** sucursales y coordenadas de la base de datos (`GET /branches`) y unidades disponibles por categoría del inventario | **Sucursales reales** como bases; **activos, posiciones y estados simulados** (MODO DEMOSTRACIÓN) |
| Interacción | Popup con municipio, dirección, unidades disponibles por categoría, "Ver horarios" y "Cómo llegar"; la lista y el mapa están sincronizados | Indicadores, filtros por estado, lista de activos, detalle del activo, pausar o reanudar |

- **Vista inicial:** se ajusta al área metropolitana (Bucaramanga, Floridablanca, Girón y Piedecuesta) y no permite alejarse a otras regiones (`maxBounds`).
- **Componentes compartidos** (`src/components/map/`): `BaseMap` (mapa, teselas, zoom, atribución), `useTileHealth` (detecta que el proveedor no carga), `MapFallback` ("Mapa temporalmente no disponible") y `MapBoundary` (si el código del mapa falla). Mapa público: `features/branches/components/branch-map.tsx` y `service-map.tsx`. Mapa operativo: `features/operations/`.
- **Fallback:** si no carga ninguna tesela en 12 s, o hay varios errores, o falla el código del mapa, se muestra "Mapa temporalmente no disponible" con la lista de sucursales (municipio, nombre y dirección). La página nunca se rompe.
- **Rendimiento:** Leaflet se descarga solo en las páginas con mapa (`next/dynamic`, `ssr: false`); en el inicio está en la portada, así que se carga al abrir la página; la sección "Puntos de servicio" del inicio es una lista sin mapa, para no crear una segunda instancia. Una instancia por mapa; los iconos del mapa operativo se reutilizan para no recrear el DOM en cada actualización.
- **Google Maps:** el adaptador anterior se conserva y solo se usa si se configura `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (no hay ninguna configurada).
- No hay mapa en `/alquiler`: su oferta es mock y la ubicación de los puntos de alquiler ya está en `/sucursales`.

**Mapa operativo y simulación (MODO DEMOSTRACIÓN).** No hay telemetría GPS física. La interfaz lo dice explícitamente ("Modo demostración", "Datos simulados… no hay telemetría GPS conectada").

- `createSimulatedTelemetry` (`features/operations/lib/simulated-telemetry.ts`) genera en el **navegador** una flota determinista de 29 activos alrededor de las sucursales activas reales: 2 bicicletas, 2 patinetas y 1 domicilio por sucursal, más 4 drones.
- Estados: disponible, en uso, mantenimiento e incidencia, con colores consistentes en marcadores, leyenda, indicadores y lista.
- Cada 3 s: los activos en uso viajan desde su sucursal a un destino y regresan; los domicilios muestran la línea a su punto de entrega; hay cambios de estado ocasionales y consumo y carga de batería.
- El tiempo de la simulación avanza 10 veces más rápido para que el movimiento se vea a escala metropolitana. Todas las posiciones quedan dentro del área metropolitana (probado).
- No escribe en la base de datos ni llama a la API: no se mezcla con datos reales.

**Cómo se reemplazará por telemetría real.** El panel consume la interfaz `TelemetrySource` (`features/operations/lib/telemetry.ts`): `subscribe(listener)` emite `TelemetrySnapshot { assets, at, origin }`. Para pasar a datos reales:

1. FastAPI recibe y guarda posiciones de los dispositivos (tabla de activos y de posiciones; PostGIS para geocercas).
2. Un endpoint de streaming (WebSocket o Server-Sent Events) publica los snapshots, con la misma forma y `origin: "gps"`.
3. En el frontend, una `createLiveTelemetry(url)` que implemente `TelemetrySource` sustituye a `createSimulatedTelemetry` en la página. Indicadores, mapa y lista no cambian; el aviso "Modo demostración" se oculta cuando `origin` es `"gps"`.

## 11. Inventario

Cada fila (producto, sucursal) guarda tres cantidades:

| Cantidad | Significado |
| --- | --- |
| `total_quantity` | unidades físicas |
| `reserved_quantity` | apartadas por carritos (reserva de 15 min) y por pedidos pendientes o confirmados |
| `available_quantity` | vendibles ahora |

**Restricciones:** ninguna cantidad puede ser negativa y `disponible + reservado ≤ total`.

**Transacciones.** Al reservar en el carrito, al crear, cancelar o completar un pedido y al liberar reservas vencidas, FastAPI bloquea las filas de inventario con `SELECT … FOR UPDATE`, siempre en el mismo orden (carrito → reservas → inventario por producto y sucursal) para evitar interbloqueos. Dos clientes simultáneos no pueden apartar la misma unidad (probado con hilos concurrentes).

**Flujo:**

| Acción | Efecto en inventario |
| --- | --- |
| Agregar al carrito (con sesión) | disponible → reservado, durante 15 min |
| Cambiar cantidad / quitar del carrito | se reserva o se libera la diferencia |
| Reserva vencida | reservado → disponible; la línea sale del carrito |
| Crear pedido | la reserva del carrito pasa al pedido (sin contar dos veces) |
| Confirmar pedido | sin cambio |
| Completar pedido | reservado − n y total − n (unidades vendidas) |
| Cancelar pedido | reservado − n y disponible + n |
| Ajuste en el panel | se fija el total; disponible = total − reservado. Se rechaza un total menor que lo reservado. |

**Vendidas.** El panel calcula las unidades vendidas a partir de los pedidos completados.

**Alertas.** El panel avisa de stock bajo con 5 unidades disponibles o menos, sumando sucursales.

## 12. Carrito y reserva de 15 minutos (RF 6.2)

- **Persistente:** usuarios con sesión, tablas `carts` y `cart_items`. Es el mismo en cualquier dispositivo. No supera el inventario disponible ni 10 unidades por producto. Al leerlo se actualizan los precios y se quitan los productos desactivados.
- **Local:** visitantes, `localStorage` versionado y validado. **No reserva inventario**: la reserva empieza cuando el visitante inicia sesión y el carrito se fusiona.
- **Fusión:** al iniciar sesión, los productos del carrito local que no están en la cuenta se suben al carrito remoto (y se reservan); los agotados se omiten.
- **Al crear un pedido** el carrito pasa a `converted` y el usuario empieza uno nuevo.

**Reserva.** FastAPI es la única autoridad:

1. Agregar o aumentar una línea aparta las unidades en `inventory` (disponible → reservado) y crea filas en `cart_reservations` con `expires_at = ahora + 15 min`. Si no hay unidades suficientes responde 409 ("Solo quedan N unidades disponibles de …").
2. Se prefiere una sola sucursal; si ninguna tiene todas las unidades, la reserva se reparte entre sucursales.
3. Cada cambio en una línea renueva su vencimiento a 15 minutos. Reducir o quitar una línea libera las unidades sobrantes.
4. **Vencimiento sin Celery ni Redis.** Una dependencia del router `/api/v1` libera las reservas vencidas en cada solicitud (`FOR UPDATE SKIP LOCKED`, para que varias solicitudes simultáneas no liberen dos veces la misma reserva) y retira esas líneas del carrito. Opcionalmente, un cron puede ejecutar `uv run python -m app.cli release-expired`.
5. **Conversión en pedido.** `POST /orders` bloquea el carrito, rechaza con 409 si alguna reserva venció ("La reserva de X venció…") o si el carrito no coincide con lo enviado ("Tu carrito cambió…"), libera las reservas del carrito y reserva para el pedido **en la misma transacción**. El inventario nunca se cuenta dos veces.

**Interfaz.**
- Cada línea del carrito y el checkout muestran "Reservado durante 14:32". El contador se corrige con la hora del servidor (`serverTime`), para no depender del reloj del equipo.
- Al vencer, la interfaz vuelve a consultar el carrito, retira la línea y avisa ("La reserva de X venció…").
- El checkout se bloquea si la reserva venció y enlaza al carrito para volver a agregar el producto.

**Limitaciones:**
- El checkout no muestra en qué sucursal quedó la reserva. Para recogida, si se elige otra sucursal, el pedido se rechaza con un mensaje claro ("La sucursal elegida no tiene unidades suficientes").
- Una reserva repartida entre sucursales no garantiza el pedido: el pedido se despacha desde una sola sucursal.
- Quien vuelve al sitio después de que su reserva venció ve el carrito ya sin la línea, pero no recibe aviso.

## 13. Pedidos

1. El cliente, con sesión, completa el checkout: datos de contacto y documento, recogida en sucursal o domicilio en el área metropolitana, fecha, franja horaria y método de pago.
2. `POST /api/v1/orders`:
   - valida fecha (no anterior a hoy), franja y municipio;
   - calcula precios con el catálogo (ignora totales enviados por el cliente);
   - exige que el carrito coincida con el pedido y que sus reservas estén vigentes;
   - elige la sucursal: la de recogida, o para domicilio la que ya tiene la reserva (o la primera con stock completo);
   - convierte la reserva del carrito en la del pedido, guarda el consentimiento y crea el pedido en estado `pending`.
3. En el panel, un administrador lo **confirma**, lo **completa** o lo **cancela**. Solo se permiten estas transiciones: `pending → confirmed | cancelled` y `confirmed → completed | cancelled`.

4. El cliente lo consulta en **Mis pedidos**: lista con foto, número, fecha, estado y total; detalle con productos, entrega (sucursal o dirección), fecha, franja, contacto y pago. Un pedido ajeno responde 404 (en la web y en el API) y sin sesión se redirige a `/login?next=…`.

**Estados que ve el cliente:** "Pendiente de confirmación", "Confirmado", "Completado" y "Cancelado". La interfaz **nunca** muestra "Pago confirmado": el pago aparece como "Sin procesar: el pago en línea aún no está disponible."

**No hay pagos:** el método de pago se guarda, pero no se cobra. El costo de envío es 0 porque el SRS no define tarifas. No se guarda historial de cambios de estado.

## 14. Autenticación

- **Registro** (`POST /auth/register`):
  - nombre, apellido, correo único y celular;
  - contraseña de 10 caracteres o más, con letras y números;
  - autorización de datos obligatoria.
- **Login** (`POST /auth/login`): verificación con **argon2id**. Si el correo no existe se verifica contra un hash ficticio y el mensaje es el mismo, para no revelar qué correos existen.
- **Límite de intentos** (`login_attempts`, en PostgreSQL, sin Redis):
  - 5 fallos por cuenta en 15 minutos;
  - 30 fallos por IP en 15 minutos;
  - superado el límite responde **429** con el mismo mensaje exista o no la cuenta ("Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo."); un login correcto borra los fallos de esa cuenta;
  - el correo se guarda como hash SHA-256 y los registros se purgan a las 24 h;
  - la IP solo se toma de `X-Forwarded-For` cuando la conexión viene de un proxy listado en `TRUSTED_PROXIES` (el servidor de Next.js); si un proxy de confianza no envía la cabecera, **no se aplica el límite por IP**, para no bloquear a todos los clientes que comparten el servidor de Next.js;
  - **limitación:** un atacante con muchas IP solo queda frenado por el límite por cuenta, y un tercero puede bloquear temporalmente (15 min) una cuenta ajena fallando 5 veces.
- **Perfil** (`PATCH /auth/me`): nombre, apellido, celular y documento. El esquema rechaza cualquier otro campo (422), así que no se puede cambiar `is_admin`, el correo ni la contraseña por esta vía.
- **Cambio de contraseña** (`POST /auth/password`): exige la contraseña actual (con el mismo límite de intentos) y cierra las demás sesiones.
- **Recuperación de contraseña:**
  - `POST /auth/password-reset/request` responde siempre 202 con un mensaje genérico, exista o no el correo;
  - token aleatorio guardado **solo como hash SHA-256**, válido 30 minutos (`PASSWORD_RESET_TTL_MINUTES`) y de un solo uso; pedir uno nuevo invalida los anteriores; máximo 3 solicitudes por hora por cuenta;
  - `POST /auth/password-reset/confirm` cambia la contraseña y **cierra todas las sesiones**;
  - **no se envían correos reales.** El adaptador de desarrollo escribe el enlace en el log de la API (`docker compose logs api`). Fuera de `ENVIRONMENT=development` no se registra el token y el correo no se envía hasta configurar un proveedor;
  - la página `/recuperar/nueva` no envía el token en la cabecera `Referer`.
- **Consentimiento (Ley 1581):**
  - el registro y cada pedido guardan en `consent_records` el usuario, la fecha y la versión de la política aceptada (`registro` o `pedido`, con el número de pedido);
  - versión vigente `2026-10-06` (`PRIVACY_POLICY_VERSION` en el backend y `src/config/legal.ts` en el frontend); si el cliente envía otra versión, FastAPI responde 409 y pide aceptar la vigente;
  - el cliente ve su historial en `/cuenta` (`GET /auth/me/consents`);
  - **pendiente:** el texto legal definitivo de la política, que debe revisar un abogado.
- **Sesiones:**
  - token aleatorio de 256 bits, guardado en `user_sessions` **solo como hash SHA-256**;
  - expira a los 7 días (`SESSION_TTL_HOURS`);
  - `logout` borra la sesión (revocación real);
  - desactivar una cuenta borra todas sus sesiones.
- **Cookies:**
  - `em_session` y `em_csrf`, ambas `HttpOnly`, `SameSite=Lax` y `Secure` en producción;
  - Next.js las copia al navegador y las reenvía a FastAPI desde el servidor;
  - `document.cookie` queda vacío: nada de JWT ni `localStorage`.
- **CSRF:**
  - navegador → Next.js: las Server Actions verifican el `Origin`;
  - Next.js → FastAPI: token sincronizado en la cabecera `X-CSRF-Token`, obligatorio en todo método que modifica datos (403 sin él).
- **Rol administrativo:** `users.is_admin`. Se asigna desde el servidor, nunca desde la web:

  ```bash
  cd backend
  uv run python -m app.cli make-admin correo@dominio.com
  uv run python -m app.cli revoke-admin correo@dominio.com
  uv run python -m app.cli set-password correo@dominio.com   # lee la clave de stdin y cierra sus sesiones
  ```

## 15. Panel administrativo

Ruta `/admin`. Consume exclusivamente el API real `/api/v1/admin` y no tiene versión mock: en `API_MODE=mock` muestra "El panel requiere el backend".

**Seguridad (tres capas):**

1. **FastAPI.** Todo `/api/v1/admin/*` exige una sesión válida con `is_admin = true` (401 sin sesión, 403 sin rol) y el token CSRF en escrituras.
2. **Next.js.** El layout y **cada página** verifican el rol antes de pedir datos (`getAdminUser()`, memorizado por solicitud). Sin sesión: redirección a `/login?next=/admin`. Sin rol: pantalla "No tienes acceso al panel".
3. **Interfaz.** El enlace "Panel" solo aparece para administradores. Es solo presentación; no concede permisos.

**Secciones:**

| Ruta | Funciones |
| --- | --- |
| `/admin` | Resumen: pedidos (por estado), ventas confirmadas, productos activos y destacados, unidades disponibles y reservadas, sucursales (activas y demo), usuarios, alquileres, pedidos recientes, alertas de stock bajo y productos sin foto |
| `/admin/productos` | Listar, buscar (nombre, SKU, marca), filtrar (categoría, estado, destacados), paginar |
| `/admin/productos/nuevo` | Crear producto: categoría, nombre, slug, SKU, marca, resumen, descripción, precio, precio anterior, foto, destacados, especificaciones (con filtro en catálogo), destacado y activo |
| `/admin/productos/[id]` | Editar todo lo anterior; activar o desactivar (con confirmación); **stock por sucursal** (disponible, reservado, vendido; total editable, nunca negativo ni menor que lo reservado) |
| `/admin/categorias` | Listar con número de productos, crear y editar. El modelo no permite desactivar ni borrar categorías. |
| `/admin/sucursales`, `/nueva`, `/[id]` | Listar, crear y editar: municipio, dirección, barrio, teléfono, coordenadas (validadas en el área), horarios, servicios, marca demo y estado. Inventario de la sucursal. Activar o desactivar con confirmación. |
| `/admin/inventario` | Existencias por producto y sucursal: disponible, reservado, total y vendido. Búsqueda, filtro por sucursal y por stock bajo. |
| `/admin/pedidos`, `/[id]` | Listar, buscar (cliente, correo, número), filtrar por estado. Detalle con cliente, documento, productos, cantidades, totales, entrega, dirección y pago. Cambiar estado con confirmación (efecto en inventario). |
| `/admin/usuarios`, `/[id]` | Listar, buscar, filtrar (activas, desactivadas, administradores). Detalle con pedidos recientes. Desactivar o reactivar con confirmación (cierra sus sesiones; un admin no puede desactivarse a sí mismo). **Nunca** se muestran contraseñas, hashes ni sesiones. |
| `/admin/alquileres` | Listado de la tabla `rentals` filtrable por estado. No se inventan tarifas ni disponibilidad. |
| `/admin/operacion` | "Operación en tiempo real": mapa operativo con indicadores (activos, disponibles, en uso, en mantenimiento, incidencias), filtros, lista y detalle de activos. **MODO DEMOSTRACIÓN:** sucursales reales y activos simulados (§10). |

**Experiencia de uso:**
- Barra lateral en escritorio y menú lateral en móvil y tablet.
- Tablas en escritorio y tarjetas en móvil.
- Filtros por URL que funcionan sin JavaScript.
- Estados de carga, vacíos y de error.
- Confirmación en operaciones destructivas o irreversibles.
- Notificaciones (toast) al guardar.
- Invalidación inmediata de la caché pública (`updateTag`) tras cada cambio.

**Limitaciones conocidas:**
- No se pueden subir fotos: se elige entre las existentes o "Imagen pendiente".
- Las categorías nuevas se gestionan en el panel, pero la tienda pública solo muestra las cuatro del SRS (RF 6.1); los productos de otras categorías se omiten en la tienda.
- No hay roles intermedios (operador, domiciliario) ni registro de auditoría.

**Credenciales de DESARROLLO** (definidas solo en `docker-compose.yml` para el entorno local; **no son credenciales de producción**):

| Correo | Contraseña |
| --- | --- |
| `admin@ecomovilidad.dev` | `ELIMINADA` |

En otros entornos no se debe definir `DEMO_ADMIN_*`: el primer administrador se crea registrando la cuenta y ejecutando `make-admin` en el servidor.

## 16. API

Base: `http://localhost:8000/api/v1`. Documentación interactiva en `http://localhost:8000/docs`.

**Públicos:**

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Conexión a BD y versión de PostGIS |
| GET | `/categories` | Categorías |
| GET | `/products` | Lista con facetas. Filtros: `q`, `categoria`, `marca`, `precioMin`, `precioMax`, `orden`, `spec_<clave>`, `destacados`, `limite` |
| GET | `/products/{slug}` | Ficha con stock por sucursal |
| GET | `/products/{id}/inventory` | Inventario por sucursal |
| GET | `/branches` | Sucursales activas con disponibilidad por categoría |

**Autenticación y cliente** (✔ = requiere sesión; CSRF en escrituras):

| Método | Ruta | Sesión |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | — |
| POST | `/auth/logout` | ✔ |
| GET, PATCH | `/auth/me` (PATCH: nombre, apellido, celular, documento) | ✔ |
| GET | `/auth/me/consents` | ✔ |
| POST | `/auth/password` (cambio con la contraseña actual) | ✔ |
| POST | `/auth/password-reset/request` (202 genérico) | — |
| POST | `/auth/password-reset/confirm` (204) | — |
| GET | `/cart` | ✔ |
| POST | `/cart/items` | ✔ |
| PATCH, DELETE | `/cart/items/{id}` | ✔ |
| POST, GET | `/orders` (POST exige reservas vigentes y `policyVersion`) | ✔ |
| GET | `/orders/{id}` | ✔ (404 si es de otro usuario) |
| GET | `/rentals` | ✔ (alquileres propios) |

**Administración** (todas exigen `is_admin`):

| Método | Ruta |
| --- | --- |
| GET | `/admin/dashboard` |
| GET, POST | `/admin/products` (filtros `q`, `category`, `status`, `featured`, `page`) |
| GET, PATCH | `/admin/products/{id}` |
| PUT | `/admin/products/{id}/inventory/{branch_id}` (cuerpo `{ "totalQuantity": n }`) |
| GET, POST | `/admin/categories` |
| PATCH | `/admin/categories/{id}` |
| GET, POST | `/admin/branches` |
| GET, PATCH | `/admin/branches/{id}` |
| GET | `/admin/inventory` (`q`, `branch_id`, `low_stock`, `page`) |
| GET | `/admin/orders` (`q`, `status`, `page`) |
| GET, PATCH | `/admin/orders/{id}` (cuerpo `{ "status": "confirmed" \| "completed" \| "cancelled" }`) |
| GET | `/admin/users` (`q`, `status`, `page`) |
| GET, PATCH | `/admin/users/{id}` (cuerpo `{ "isActive": bool }`) |
| GET | `/admin/rentals` (`status`, `page`) |

Toda solicitud a `/api/v1` libera antes las reservas vencidas. Las respuestas de `/orders` omiten los campos vacíos (p. ej. sin dirección en recogida).

Las listas paginadas devuelven `{ items, total, page, pageSize }` con 20 elementos por página.

## 17. Variables de entorno

**Frontend** (`.env.local`, ver `.env.example`):

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | En producción | URL canónica (sitemap, Open Graph). |
| `API_MODE` | No (por defecto `mock`) | `mock` o `real`. |
| `API_BASE_URL` | **Sí con `API_MODE=real`** | p. ej. `http://localhost:8000/api/v1`. Solo servidor. |
| `MOCK_LATENCY_MS` | No | Latencia artificial del mock. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Opcional. Sin ella (lo habitual) el mapa usa OpenStreetMap. Si se define, el mapa público usa Google Maps (no probado). Pública por diseño: restringirla por dominio. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | No | Map ID de Google Maps. |

**Backend** (`backend/.env`, ver `backend/.env.example`):

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí (tiene valor local por defecto) | `postgresql+psycopg://…` |
| `CORS_ORIGINS` | No | Orígenes permitidos (JSON). |
| `COOKIE_SECURE` | **`true` en producción** | Cookies solo por HTTPS. |
| `SESSION_TTL_HOURS` | No (168) | Duración de la sesión. |
| `ENVIRONMENT` | No (`development`) | Fuera de `development` no se escriben enlaces de recuperación en el log. |
| `FRONTEND_URL` | En producción | Base de los enlaces de recuperación. En Docker Compose se toma del entorno (`scripts/demo.sh` pone la URL del túnel). |
| `PASSWORD_RESET_TTL_MINUTES` | No (30) | Vigencia del enlace de recuperación. |
| `PRIVACY_POLICY_VERSION` | No (`2026-10-06`) | Versión vigente de la política; debe coincidir con `src/config/legal.ts`. |
| `TRUSTED_PROXIES` | Recomendada | CIDR (JSON) de los proxies cuyo `X-Forwarded-For` se acepta. En Docker Compose: redes privadas y `127.0.0.1`. |
| `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | **No usar fuera de desarrollo** | Crean el admin de desarrollo al ejecutar el seed. |

No hay secretos reales en el repositorio. `.env` y `backend/.env` están en `.gitignore`.

## 18. Ejecución local

Requisitos:
- Docker. En macOS sirve Colima: `brew install colima docker docker-compose && colima start`.
- Node.js 20.9 o superior.
- [uv](https://docs.astral.sh/uv/) para las pruebas del backend.

```bash
# 1. Base de datos + API (migraciones, datos DEMO y admin de desarrollo al arrancar)
docker compose up -d

# 2. Frontend conectado al backend real
npm install
API_MODE=real API_BASE_URL=http://localhost:8000/api/v1 npm run dev
#   Tienda: http://localhost:3000    Panel: http://localhost:3000/admin

# 3. Pruebas del backend (requieren la base de datos en Docker)
cd backend
uv run pytest

# 4. Verificación completa del frontend (typecheck + lint + pruebas + build)
cd ..
npm run check

# Opcional: liberar reservas vencidas desde un cron
#   cd backend && uv run python -m app.cli release-expired

# Enlace de recuperación de contraseña en desarrollo
#   docker compose logs api | grep "CORREO DE DESARROLLO" -A6

# 5. Detener
docker compose down        # conserva los datos
docker compose down -v     # borra la base de datos
```

**Notas:**
- PostgreSQL queda en `127.0.0.1:5433`, para no chocar con un PostgreSQL local en el 5432. PostgreSQL y FastAPI no son accesibles desde la red local.
- La imagen de base de datos es `postgres:16` oficial con PostGIS instalado desde PGDG, porque `postgis/postgis` no publica imágenes para Apple Silicon.
- `npm run check` compila en modo mock. Un build con `API_MODE=real` necesita la API encendida, porque genera las fichas de producto desde ella.

## 19. Testing

Resultados obtenidos el 6 de octubre de 2026 sobre una base de datos recreada desde cero (`docker compose down -v && docker compose up -d --build`, migraciones 0001 → 0003, seed DEMO):

| Suite | Resultado |
| --- | --- |
| Backend, pytest (PostgreSQL + PostGIS real) | **123 / 123** pruebas |
| Backend, ruff (lint y formato) | Sin errores |
| Migraciones | `upgrade → downgrade → upgrade` correcto; `alembic check` sin diferencias |
| Frontend, Vitest | **81 / 81** pruebas en 22 archivos (fase 5.3) |
| Frontend, typecheck (`tsc`) | Sin errores |
| Frontend, ESLint | Sin errores ni advertencias |
| Build de producción, `API_MODE=mock` | Correcto |
| Build de producción, `API_MODE=real` | Correcto |

**Cobertura de pytest:**
- Base de datos: conexión, PostGIS, restricciones (inventario negativo, reservado > total, sucursal fuera del área, alquiler con fin anterior al inicio).
- Autenticación: registro, login, logout con CSRF, revocación de sesión.
- Catálogo, categorías, sucursales e inventario.
- Carrito: persistencia entre dispositivos, límites de stock, aislamiento entre usuarios.
- **Reservas (15 pruebas):** crear, ajustar cantidad, repartir entre sucursales, quitar; stock insuficiente; el vencimiento libera el inventario y otro cliente puede comprar esas unidades; conversión en pedido sin doble conteo; pedido rechazado con reserva vencida o carrito distinto; cancelar devuelve el stock; **concurrencia real con hilos**: de dos compradores de la última unidad gana uno, y tres limpiezas simultáneas no liberan dos veces.
- Pedidos: reserva de inventario, alcance geográfico, fechas, franjas, contrato sin campos `null`.
- **Cuenta (22 pruebas):** pedidos propios y 404 para ajenos; perfil y campos prohibidos (422); cambio de contraseña; recuperación completa (token de un uso, vencido, sesiones cerradas) con un buzón de prueba; límite de solicitudes de recuperación; límites de login por cuenta, por correo inexistente y por IP; proxy de confianza sin IP no bloquea a todos; consentimiento en registro y pedido; versión de política desactualizada (409).
- Panel: permisos (401/403 en 7 endpoints), CRUD de productos, categorías y sucursales, ajuste de stock sin negativos, transiciones de pedido con su efecto en inventario, usuarios sin datos sensibles, desactivación que cierra sesiones, alquileres.

**Cobertura de Vitest añadida en esta fase:** cálculo del contador y estado de la reserva (con corrección del reloj del servidor), componente del contador con temporizadores simulados, detección de líneas vencidas, tarjetas y detalle de "Mis pedidos" (sin "Pago confirmado"), esquemas de perfil y recuperación, contrato de pedidos.

**Pruebas manuales en navegador** (Playwright, build de producción en modo real, base recreada):
1. Registro con la versión de la política visible.
2. Agregar al carrito: disponible 11 → 10; cantidad 2 → 9; quitar → 11.
3. Contador "Reservado durante …" en carrito y checkout.
4. Vencimiento en vivo: la línea desaparece con aviso, el stock vuelve y el checkout queda bloqueado.
5. Pedido creado; "Ver mi pedido"; lista y detalle en "Mis pedidos".
6. Cerrar sesión → `/cuenta/pedidos` redirige a login; al volver a entrar el pedido sigue ahí.
7. Pedido de otro usuario → 404 en la web y en el API.
8. Edición de perfil e historial de consentimientos (registro y pedido).
9. Recuperación de contraseña con el enlace del log: reutilizar el enlace falla, la contraseña antigua falla y la nueva funciona.
10. Sexto intento fallido de login → mensaje 429.
11. Panel: las 8 secciones responden; el administrador confirma un pedido de cliente; un cliente nuevo no accede a `/admin` (UI) y recibe 403 del API.
12. `API_MODE=mock`: la tienda funciona y `/cuenta` redirige a login.
- **Responsive:** `/cuenta`, `/cuenta/pedidos`, detalle de pedido, `/carrito`, `/checkout`, `/recuperar` y `/recuperar/nueva` a 360, 390, 768, 1024, 1280 y 1440 px, sin desbordamiento horizontal ni errores de consola, con revisión visual de capturas.

**Fase 5.3 (mapas), pruebas automáticas:** simulación de telemetría (flota determinista de 29 activos, todos dentro del área metropolitana durante 600 ticks, velocidad acotada, los cuatro estados aparecen, origen `simulada`, sin estado interno en el snapshot, se detiene sin suscriptores) y detección de proveedor caído (`useTileHealth`: sin teselas a tiempo, errores repetidos, sin falsos positivos).

**Fase 5.3, pruebas manuales** (build de producción en modo real detrás de un túnel de Cloudflare de prueba):
- `/sucursales`: 5 marcadores en sus coordenadas reales, vista inicial del área metropolitana, popups con disponibilidad real, lista y mapa sincronizados en ambos sentidos; el popup queda dentro de la pantalla y sin tapar el zoom ni el rótulo en 360, 390, 768 y 1280 px.
- Inicio: la portada muestra el mapa real (una sola instancia en la página, teselas de OpenStreetMap, 5 sucursales, zoom, arrastre y popup táctil); sin rastro de la ilustración esquemática anterior (cuadrícula, rutas y etiquetas dibujadas a mano), que se eliminó. La tarjeta "Disponible ahora" va debajo del mapa para no tapar marcadores.
- Proveedor bloqueado: aparece "Mapa temporalmente no disponible" con la lista de sucursales; el mapa no cae en el fallback por sí solo pasado el umbral de 12 s.
- `/admin/operacion`: 29 activos y 5 sucursales, indicadores, posiciones que cambian cada 3 s, filtros, detalle y pausa; aviso "Modo demostración".
- Regresión: login, carrito con reserva, checkout y Mis pedidos sin cambios.
- Responsive: inicio, `/sucursales`, `/admin/operacion`, `/login`, `/carrito`, `/checkout`, `/alquiler` y `/admin` a 360, 390, 768, 1024, 1280 y 1440 px, sin scroll horizontal y con botones de zoom de 40 px. Corregido en esta fase: a 1024 px con sesión de administrador la cabecera pública desbordaba 12 px; entre 1024 y 1279 px sus tres enlaces ("Mi cuenta", "Panel", "Salir") se muestran solo con icono (texto para lectores de pantalla y como tooltip).

**Errores encontrados y corregidos durante la fase 4:**
- Crear una línea de carrito con cantidad 0 violaba la restricción `CHECK` antes de reservar.
- El límite de 3 recuperaciones por hora no funcionaba porque se borraban los tokens anteriores; ahora se marcan como usados.
- El límite por IP habría bloqueado a todos los clientes (todos llegan desde la IP del servidor de Next.js); ahora solo se aplica con una IP fiable.
- Una reserva vencida seguía visible si el reloj del equipo iba adelantado; se corrige con la hora del servidor y reintentos.
- El carrito se desbordaba 24 px a 360 px.
- "Mis pedidos" fallaba con pedidos de recogida porque el API enviaba `deliveryAddress: null`; ahora se omiten los campos vacíos, con pruebas de contrato en ambos lados.

## 20. Estado actual del producto

| Área | Estado | Observación |
| --- | --- | --- |
| Frontend | IMPLEMENTADO | 21 rutas públicas y 15 de panel; modos mock y real; responsive verificado. |
| Backend | IMPLEMENTADO | FastAPI `/api/v1` con catálogo, cuentas, carrito con reservas, pedidos y administración. |
| Base de datos | IMPLEMENTADO | PostgreSQL 16 + PostGIS; 15 tablas; 3 migraciones reversibles; seed DEMO. |
| Auth | PARCIAL | Real: sesiones, httpOnly, CSRF, rol admin, perfil, cambio y recuperación de contraseña, límite de intentos. Falta un proveedor de correo real (el enlace solo sale en el log de desarrollo) y roles intermedios. |
| Catálogo | IMPLEMENTADO | Real y administrable. Productos y marcas DEMO; fotos referenciales. |
| Sucursales | IMPLEMENTADO | Reales y administrables. Datos DEMO (`is_demo`). |
| Inventario | PARCIAL | Real: por sucursal, reserva de 15 min en el carrito (RF 6.2), reservas por pedido, ajustes y alertas. Falta la auditoría de ajustes. |
| Carrito | IMPLEMENTADO | Persistente entre dispositivos con reserva y contador; local (sin reserva) para visitantes; fusión. |
| Pedidos | PARCIAL | Creación, gestión de estados y "Mis pedidos" reales. Sin pagos, sin historial de estados, sin cancelación por el cliente. |
| Alquileres | PARCIAL | Tabla y consultas reales. La oferta y tarifas de `/alquiler` son MOCK; no se pueden crear alquileres. |
| Admin | IMPLEMENTADO | Panel funcional protegido en backend y frontend. Sin carga de imágenes ni auditoría. |
| Ley 1581 | PARCIAL | Evidencia real (usuario, fecha, versión) en registro y pedido. Texto legal pendiente de revisión. |
| Pagos | PENDIENTE | Wompi no integrado; solo se guarda el método elegido. |
| Mapas | IMPLEMENTADO / MOCK | Público real (Leaflet + OpenStreetMap, sucursales e inventario de la BD). Operativo del panel con posiciones **simuladas** (MODO DEMOSTRACIÓN). |
| GPS | PENDIENTE | Sin telemetría física; el mapa operativo usa una fuente simulada sustituible (`TelemetrySource`). |
| WebSockets | PENDIENTE | — |
| Domicilios | PENDIENTE | Sin asignación, seguimiento ni estados de domicilio. |
| QR | PENDIENTE | — |
| Firma digital | PENDIENTE | — |
| Mantenimiento | MOCK | La regla del 90% solo se aplica a la oferta mock de alquiler; sin umbrales ni bitácora reales. |
| CMS | MOCK | Contenido editorial en `src/mocks/content.ts`. |

## 21. Funcionalidades pendientes

1. Proveedor real de correo para la recuperación de contraseña (y verificación del correo al registrarse).
2. Pagos con Wompi (PSE, tarjetas, billeteras) y facturación electrónica DIAN (RF 4.1–4.3).
3. "Mis alquileres" y creación de alquileres con tarifas en la base de datos; cancelación de pedidos por el cliente.
4. Mostrar en el checkout la sucursal de la reserva y reservar en la sucursal de recogida elegida.
5. Texto legal definitivo de la política de datos (revisión jurídica).
6. Historial y auditoría de cambios (estados de pedido, ajustes de stock, acciones del panel).
7. Carga de imágenes de producto desde el panel.
8. Domicilios: asignación, seguimiento en tiempo real, estados de domicilio, QR y firma digital (RF 5.x, 7.2, 7.3).
9. Mantenimiento preventivo real (RF 3.x) y geocercas para drones (RF 2.2).
10. CMS administrable y formulario de contacto conectado.
11. Capacidad real por franja horaria.
12. Despliegue (AWS), HTTPS/TLS 1.3, monitoreo y copias de seguridad.

## 22. Decisiones técnicas importantes

| Decisión | Motivo |
| --- | --- |
| **PostgreSQL 16 + PostGIS** | Datos relacionales con integridad y soporte geoespacial para sucursales, domicilios y geocercas futuras. |
| **Columna `geography` generada** | El punto geográfico se deriva de lat/lng y nunca se desincroniza. |
| **Imagen `postgres:16` + PostGIS de PGDG** | `postgis/postgis` no tiene imágenes para Apple Silicon (arm64). |
| **Docker Compose + Colima** | Entorno local reproducible sin Docker Desktop. |
| **`API_MODE` mock / real** | La tienda funciona sin backend (demos, desarrollo de UI); el modo real conecta FastAPI sin tocar las páginas. |
| **Separación frontend / backend; el navegador no llama a FastAPI** | Las llamadas salen del servidor de Next.js: sin URL del backend ni tokens en el navegador. |
| **Sesiones de servidor + cookies httpOnly** (no JWT en `localStorage`) | Revocación real (logout, desactivar cuenta) y tokens inaccesibles para JavaScript. |
| **Tokens guardados como hash SHA-256** | Una fuga de la base no permite suplantar sesiones. |
| **CSRF con token sincronizado** | Protege los métodos que modifican datos en FastAPI. |
| **Rol `is_admin` en la base + verificación en cada capa** | Autorización real en el backend; la UI solo informa. |
| **Validación doble (Zod + Pydantic) y restricciones en la BD** | La interfaz no es la única defensa; la base de datos protege invariantes como el inventario no negativo. |
| **Bloqueo de filas en inventario** | Evita sobreventa con pedidos simultáneos. |
| **Leaflet + OpenStreetMap** | Mapa real sin API key ni costo; funciona en la demo pública. Carga diferida para no pesar en páginas sin mapa. |
| **Mapa público y operativo separados sobre una base común** | Cada uno con su propósito y aspecto; teselas, controles y fallback no se duplican. |
| **Telemetría detrás de `TelemetrySource`** | La simulación de la demo se reemplaza por GPS real (WebSocket/SSE) sin cambiar la interfaz del panel. |
| **Reservas en PostgreSQL con vencimiento perezoso** | Cumple RF 6.2 sin Celery ni Redis: la liberación ocurre en cada solicitud con `SKIP LOCKED` y hay un comando para cron. |
| **Orden de bloqueo único (carrito → reservas → inventario)** | Evita interbloqueos entre carrito, pedidos y limpieza. |
| **Hora del servidor en el contador** | El vencimiento lo decide FastAPI; la interfaz solo lo muestra. |
| **Límite de login en PostgreSQL e IP solo de proxies de confianza** | Sin Redis; evita que un cliente falsee su IP o que todos compartan la del servidor de Next.js. |
| **Adaptador de correo** | El flujo de recuperación es real hoy; conectar un proveedor no cambia la lógica. |
| **Versión de la política en el consentimiento** | Evidencia verificable de qué texto aceptó cada cliente. |
| **JSON en camelCase** | Lo consume TypeScript sin capas de traducción. |
| **Seed DEMO idempotente y marcado** | Entorno reproducible, sin presentar datos inventados como reales. |
| **Fotos de Wikimedia Commons con atribución** | Fotografías reales con licencia verificable (CC0, CC BY, CC BY-SA). Sin foto adecuada se muestra "Imagen pendiente" en lugar de inventar una. |
| **Filtros del panel en la URL** | Compartibles, funcionan sin JavaScript y se renderizan en el servidor. |

## 23. Riesgos técnicos conocidos

| Riesgo | Impacto | Mitigación propuesta |
| --- | --- | --- |
| Sin proveedor de correo | La recuperación de contraseña no llega al cliente fuera de desarrollo | Integrar un proveedor transaccional detrás de `EmailSender`. |
| Bloqueo de cuentas ajenas | Un tercero puede bloquear una cuenta 15 min fallando 5 veces | Aceptable por ahora; añadir CAPTCHA o verificación adicional si se observa abuso. |
| `TRUSTED_PROXIES` mal configurado | Sin límite por IP, o IP falseables | Listar solo la IP del servidor de Next.js en producción. |
| Reservas sin tráfico | Las unidades vencidas siguen apartadas hasta la siguiente solicitud | Programar `release-expired` en un cron. |
| Reserva repartida entre sucursales | El pedido puede rechazarse aunque haya stock en total | Reservar por sucursal elegida o permitir pedidos multi-sucursal. |
| Sin auditoría de acciones del panel | No hay trazabilidad de cambios de precio, stock o estados | Tabla de eventos de auditoría. |
| Datos DEMO llegando a producción | Información falsa visible a clientes | Bloquear el despliegue si hay sucursales `is_demo`; credenciales `DEMO_ADMIN_*` solo en local. |
| Fotos referenciales con logos de marcas reales | Pueden confundir con los productos (ficticios) del catálogo | Sustituir por fotos propias de EcoMovilidad. |
| Texto de la política sin revisión legal | Riesgo legal pese a guardar la evidencia | Revisión jurídica y nueva versión de la política. |
| Catálogo filtrado en memoria | Rendimiento con miles de productos | Mover los filtros a SQL cuando crezca. |
| Categorías nuevas invisibles en la tienda | Productos creados en ellas no se venden | Volver dinámicas las categorías en la tienda si el SRS lo aprueba. |
| Teselas públicas de OpenStreetMap | Sin garantía de servicio y con política de uso moderado; con tráfico alto pueden limitarse | Contratar un proveedor de teselas (o alojar teselas propias) antes de producción; el fallback evita que la página se rompa. |
| Mapa operativo simulado confundido con datos reales | Decisiones operativas sobre datos ficticios | Aviso permanente "Modo demostración" y origen `simulada` en cada snapshot; reemplazar por telemetría real (§10). |
| Google Maps no probado | Solo aplica si se configura una key | Probar con una key restringida antes de usarla (existe fallback automático). |
| Discrepancia SRS v3.0 / SDP (Módulo 8) | Alcance de usuarios sin requisito formal | Emitir SRS v3.1. |

## 24. Próximas fases recomendadas

En orden de prioridad:

1. **Pagos:** integración con Wompi (sandbox), confirmación automática de pedidos por webhook, proveedor de correo transaccional (recuperación y confirmación de pedido) y factura electrónica DIAN.
2. **Ajustes de la experiencia de compra:** sucursal de la reserva visible en el checkout, cancelación por el cliente e historial de estados.
3. **Datos reales:** sucursales, catálogo y fotografías propias de EcoMovilidad; retirar los datos DEMO.
4. **Operación:**
   - auditoría del panel;
   - historial de pedidos;
   - carga de imágenes;
   - roles de operador de punto.
5. **Alquiler real:** tarifas en base de datos, creación de reservas y disponibilidad por fechas.
6. **Domicilios:** asignación, estados de domicilio (RF 5.3), QR y firma (RF 7.2, 7.3).
7. **Flota en tiempo real:** dispositivos GPS, ingesta en FastAPI, streaming (WebSocket/SSE) que implemente `TelemetrySource`, mantenimiento preventivo y geocercas (Módulos 2 y 3).
8. **Despliegue:** AWS, HTTPS/TLS 1.3, monitoreo, copias de seguridad y pruebas E2E en CI.

---

### Anexo A. Créditos de las fotografías

Fotos de Wikimedia Commons usadas como **referencia del tipo de producto** (el catálogo es de demostración). La lista completa con enlaces está en `src/config/image-credits.ts` y en la página `/creditos`.

| Archivo | Autor | Licencia |
| --- | --- | --- |
| voltra-urbana-e1.webp | Elmschrat | CC BY-SA 4.0 |
| andina-pliega-20.webp | Glurois | CC BY-SA 4.0 |
| condor-trail-29.webp | TaurusEmerald | CC BY-SA 4.0 |
| andina-ruta-mecanica.webp | Andrej Shadura | CC BY-SA 4.0 |
| voltra-s2-urbana.webp | PantheraLeo1359531 | CC BY 4.0 |
| rueda-norte-city-lite.webp | Axel.206 | CC0 |
| condor-x-terreno.webp | Amo0202 | CC BY-SA 4.0 |
| rueda-norte-commuter-pro.webp | Sahaquiel9102 | CC BY-SA 4.0 |
| patinova-city-80.webp | Santeri Viinamäki | CC BY-SA 4.0 |
| patinova-fit-84.webp | Krochoman | CC BY-SA 3.0 |
| velox-junior-ajustable.webp | Jillsphone1 | CC BY-SA 4.0 |
| aeroandes-mini-4k.webp | Jacek Halicki | CC BY-SA 4.0 |
| aeroandes-pro-6k.webp | C.Stadler/Bwag | CC BY-SA 4.0 |
| nimbo-explorer-4k.webp | Josh Sorenson | CC0 |
| Velox Carrera 110 | — | **Imagen pendiente**: no se encontró una foto con licencia adecuada de un patín de velocidad. |
