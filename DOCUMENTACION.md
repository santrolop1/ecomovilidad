# EcoMovilidad Colombia S.A.S.

## Documentación del producto

| | |
| --- | --- |
| **Producto** | Portal web, tienda en línea y panel de operación |
| **Versión** | 0.3.0 (fase 3: panel administrativo) |
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

Esta versión cumple el objetivo de la fase: **una tienda real funcionando sobre Next.js, FastAPI y PostgreSQL/PostGIS, con un panel para operarla**. Pagos, domicilios con seguimiento, GPS y mantenimiento siguen pendientes (ver §5 y §21).

## 3. Usuarios

| Usuario | Qué puede hacer hoy |
| --- | --- |
| Visitante | Navegar el catálogo, las sucursales y la oferta de alquiler; armar un carrito local. |
| Cliente con cuenta | Registrarse, iniciar sesión, mantener un carrito persistente entre dispositivos y crear pedidos. |
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
- Pedidos con reserva de inventario transaccional en una sucursal.
- Ciclo de vida del pedido desde el panel: confirmar, completar (descuenta inventario) y cancelar (libera inventario).
- Panel de operación completo (ver §15), protegido por un rol en la base de datos.
- Rol administrativo `users.is_admin`, asignado por CLI o por el seed de desarrollo.
- PostGIS: punto geográfico de cada sucursal con índice espacial.
- Fotografías reales de producto (Wikimedia Commons) con atribución y la página `/creditos`.

### Implementado parcialmente

- **Alquileres.** Existen la tabla `rentals`, su consulta por usuario y el listado en el panel. **No hay forma de crear alquileres** desde la tienda ni el panel. La oferta de `/alquiler` (tarifas y vehículos) es mock.
- **Franjas horarias (RF 7.1).** El checkout permite elegir fecha y franja, y FastAPI las valida y guarda. La lista de franjas y su "sin cupo" son mock; no hay capacidad real por franja.
- **Mapa de sucursales (RF 1.2).** Las coordenadas son reales en PostGIS y la disponibilidad se refresca cada 60 s. El mapa es esquemático; el adaptador de Google Maps existe pero **no se ha probado con una API key real**.
- **Ley 1581.** El consentimiento es obligatorio y se valida en registro y pedido, pero **no se guarda** como evidencia.
- **Autenticación.** Faltan recuperación de contraseña, edición de perfil y límite de intentos de login.

### Mock

Solo existe con datos de demostración, sin backend.

- Contenido editorial (CMS): hero, banners, propuesta de valor, noticias, FAQ y servicios.
- Oferta de alquiler con tarifas y la regla de mantenimiento al 90% (RF 3.2) aplicada a esa oferta.
- Lista de franjas horarias.
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
- Reserva temporal de inventario de 15 minutos al agregar al carrito (RF 6.2).
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
- Desarrollo local con **Docker Compose**: base de datos y API. En macOS el runtime es **Colima**.
- Sin Redis, Kafka, Celery, Kubernetes ni servicios de nube en esta fase.

## 7. Frontend

**Tecnologías:** Next.js 16.3, React 19.2, TypeScript estricto, Tailwind CSS 4, shadcn/ui (Radix), lucide-react, Motion, TanStack Query 5 y Zod 4.

**Estructura (`src/`):**

```
app/(sitio)/   tienda pública (header + footer)
app/admin/     panel de operación (shell propio)
features/      catalog, cart, checkout, auth, branches, rentals, admin, contact, content, home
components/    ui (shadcn), layout, shared
lib/api/       contratos, cliente HTTP, implementación mock y real, API admin
types/ mocks/ config/ hooks/
```

**Rutas.** 16 rutas públicas y 14 del panel.

| Pública | Datos con `API_MODE=real` |
| --- | --- |
| `/` | Categorías, destacados y sucursales reales; contenido editorial mock |
| `/catalogo`, `/catalogo/[slug]` | Real |
| `/sucursales` | Real (refresco cada 60 s) |
| `/carrito` | Real con sesión; local sin sesión |
| `/checkout` | Real; exige cuenta |
| `/login`, `/registro` | Real |
| `/alquiler` | Oferta mock; sucursales reales |
| `/servicios`, `/nosotros`, `/ayuda` | Contenido mock |
| `/contacto` | Sin backend: responde "no disponible" |
| `/privacidad`, `/terminos` | Estáticas, pendientes de revisión legal |
| `/creditos` | Autores y licencias de las fotos |

Las 14 rutas del panel se detallan en §15.

**`API_MODE`.**

- `mock` (por defecto): datos en memoria, sin backend.
- `real`: FastAPI. Cada respuesta se valida con Zod.

Las secciones sin backend (CMS, oferta de alquiler, franjas) siguen usando el mock también en modo real, y así está indicado en el código.

**Sesión en el cliente.** `useSession()` consulta una Server Action y guarda el resultado en la caché de TanStack Query. El JavaScript del navegador nunca recibe tokens.

**Carrito.**
- Visitantes: `localStorage`, validado con Zod.
- Usuarios con sesión: carrito de FastAPI, con actualizaciones optimistas.

**Imágenes.**
- 14 fotografías reales en `public/images/products/` (WebP 1200×900, 2,1 MB en total), servidas con `next/image`, `sizes` por breakpoint y calidad 70.
- El producto sin foto adecuada (Velox Carrera 110) muestra "Imagen pendiente".

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
  services/        reglas de negocio (catálogo, carrito, pedidos, auth, admin/)
  api/deps.py      sesión, CSRF y require_admin
  api/routes/      endpoints /api/v1
  cli.py           make-admin / revoke-admin
backend/alembic/   migraciones 0001 (esquema) y 0002 (rol admin, imagen opcional)
backend/tests/     pytest contra PostGIS real
```

**Validaciones.** Pydantic valida toda entrada: longitudes, formatos, enums y coordenadas del área metropolitana. La base de datos repite las reglas críticas con restricciones `CHECK`, `UNIQUE` y claves foráneas.

**Errores.**
- Los errores de negocio responden `{"detail": "mensaje"}` con su código: 400, 401, 403, 404 o 409.
- Las violaciones de unicidad (SKU, slug) se traducen a 409 con un mensaje legible.

**Pruebas.** 81 pruebas pytest contra PostgreSQL + PostGIS real (ver §19).

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
| `orders` | user_id, estado, subtotal, envío, total, branch_id, datos de entrega, método de pago, contacto y documento | total = subtotal + envío; domicilio dentro del área; estados válidos |
| `order_items` | order_id, product_id, cantidad, precio unitario, subtotal | subtotal = cantidad × precio |
| `rentals` | user_id, product_id, branch_id, inicio, fin, estado, precio | fin > inicio; estados válidos |

**Relaciones principales:**
- Un producto pertenece a una categoría y tiene una fila de inventario por sucursal.
- Un usuario tiene sesiones, un carrito activo, pedidos y alquileres.
- Un pedido se despacha desde una sucursal y sus líneas apuntan a productos.

**Migraciones:**
- `0001`: esquema inicial y extensión PostGIS.
- `0002`: `users.is_admin` y `products.image_url` opcional.

Ambas son reversibles (probado `upgrade → downgrade → upgrade`) y `alembic check` no detecta diferencias con los modelos.

## 10. PostGIS

- `branches.location` es una columna `geography(Point, 4326)` **generada** a partir de `latitude` y `longitude`: `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. Nunca se desincroniza de las coordenadas.
- Índice **GiST** (`ix_branches_location`), listo para `ST_DWithin` y `ST_Distance`.
- Prueba automática: la distancia Cabecera–Piedecuesta da unos 15,6 km.
- Las coordenadas se editan en el panel; PostGIS recalcula el punto.
- **No implementado:** geocercas, sucursal más cercana al cliente (falta geocodificar direcciones) y telemetría.

## 11. Inventario

Cada fila (producto, sucursal) guarda tres cantidades:

| Cantidad | Significado |
| --- | --- |
| `total_quantity` | unidades físicas |
| `reserved_quantity` | apartadas por pedidos pendientes o confirmados |
| `available_quantity` | vendibles ahora |

**Restricciones:** ninguna cantidad puede ser negativa y `disponible + reservado ≤ total`.

**Transacciones.** Al crear, cancelar o completar un pedido, FastAPI bloquea las filas de inventario con `SELECT … FOR UPDATE`, en orden estable. Dos pedidos simultáneos no pueden vender la misma unidad.

**Flujo:**

| Acción | Efecto en inventario |
| --- | --- |
| Crear pedido | disponible → reservado |
| Confirmar pedido | sin cambio |
| Completar pedido | reservado − n y total − n (unidades vendidas) |
| Cancelar pedido | reservado − n y disponible + n |
| Ajuste en el panel | se fija el total; disponible = total − reservado. Se rechaza un total menor que lo reservado. |

**Vendidas.** El panel calcula las unidades vendidas a partir de los pedidos completados.

**Alertas.** El panel avisa de stock bajo con 5 unidades disponibles o menos, sumando sucursales.

## 12. Carrito

- **Persistente:** usuarios con sesión, tablas `carts` y `cart_items`. Es el mismo en cualquier dispositivo. No supera el inventario disponible ni 10 unidades por producto. Al leerlo se actualizan los precios y se quitan los productos desactivados.
- **Local:** visitantes, `localStorage` versionado y validado.
- **Fusión:** al iniciar sesión, los productos del carrito local que no están en la cuenta se suben al carrito remoto; los agotados se omiten.
- **Al crear un pedido** el carrito pasa a `converted` y el usuario empieza uno nuevo.

## 13. Pedidos

1. El cliente, con sesión, completa el checkout: datos de contacto y documento, recogida en sucursal o domicilio en el área metropolitana, fecha, franja horaria y método de pago.
2. `POST /api/v1/orders`:
   - valida fecha (no anterior a hoy), franja y municipio;
   - calcula precios con el catálogo (ignora totales enviados por el cliente);
   - elige la sucursal: la de recogida, o la primera con stock completo para domicilio;
   - reserva el inventario y crea el pedido en estado `pending`.
3. En el panel, un administrador lo **confirma**, lo **completa** o lo **cancela**. Solo se permiten estas transiciones: `pending → confirmed | cancelled` y `confirmed → completed | cancelled`.

**No hay pagos:** el método de pago se guarda, pero no se cobra. El costo de envío es 0 porque el SRS no define tarifas. No se guarda historial de cambios de estado.

## 14. Autenticación

- **Registro** (`POST /auth/register`):
  - nombre, apellido, correo único y celular;
  - contraseña de 10 caracteres o más, con letras y números;
  - autorización de datos obligatoria.
- **Login** (`POST /auth/login`): verificación con **argon2id**. Si el correo no existe se verifica contra un hash ficticio y el mensaje es el mismo, para no revelar qué correos existen.
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
| GET | `/auth/me` | ✔ |
| GET | `/cart` | ✔ |
| POST | `/cart/items` | ✔ |
| PATCH, DELETE | `/cart/items/{id}` | ✔ |
| POST, GET | `/orders` | ✔ |
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

Las listas paginadas devuelven `{ items, total, page, pageSize }` con 20 elementos por página.

## 17. Variables de entorno

**Frontend** (`.env.local`, ver `.env.example`):

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | En producción | URL canónica (sitemap, Open Graph). |
| `API_MODE` | No (por defecto `mock`) | `mock` o `real`. |
| `API_BASE_URL` | **Sí con `API_MODE=real`** | p. ej. `http://localhost:8000/api/v1`. Solo servidor. |
| `MOCK_LATENCY_MS` | No | Latencia artificial del mock. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Activa Google Maps (no probado). Pública por diseño: restringirla por dominio. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | No | Map ID de Google Maps. |

**Backend** (`backend/.env`, ver `backend/.env.example`):

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí (tiene valor local por defecto) | `postgresql+psycopg://…` |
| `CORS_ORIGINS` | No | Orígenes permitidos (JSON). |
| `COOKIE_SECURE` | **`true` en producción** | Cookies solo por HTTPS. |
| `SESSION_TTL_HOURS` | No (168) | Duración de la sesión. |
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

# 5. Detener
docker compose down        # conserva los datos
docker compose down -v     # borra la base de datos
```

**Notas:**
- PostgreSQL queda en `localhost:5433`, para no chocar con un PostgreSQL local en el 5432.
- La imagen de base de datos es `postgres:16` oficial con PostGIS instalado desde PGDG, porque `postgis/postgis` no publica imágenes para Apple Silicon.
- `npm run check` compila en modo mock. Un build con `API_MODE=real` necesita la API encendida, porque genera las fichas de producto desde ella.

## 19. Testing

Resultados obtenidos el 6 de octubre de 2026 sobre una base de datos recreada desde cero (`docker compose down -v && docker compose up -d`):

| Suite | Resultado |
| --- | --- |
| Backend, pytest (PostgreSQL + PostGIS real) | **81 / 81** pruebas |
| Backend, ruff (lint y formato) | Sin errores |
| Frontend, Vitest | **54 / 54** pruebas en 14 archivos |
| Frontend, typecheck (`tsc`) | Sin errores |
| Frontend, ESLint | Sin errores ni advertencias |
| Build de producción, `API_MODE=mock` | Correcto |
| Build de producción, `API_MODE=real` | Correcto |

**Cobertura de pytest:**
- Base de datos: conexión, PostGIS, restricciones (inventario negativo, reservado > total, sucursal fuera del área, alquiler con fin anterior al inicio).
- Autenticación: registro, login, logout con CSRF, revocación de sesión.
- Catálogo, categorías, sucursales e inventario.
- Carrito: persistencia entre dispositivos, límites de stock, aislamiento entre usuarios.
- Pedidos: reserva de inventario, alcance geográfico, fechas, franjas.
- Panel: permisos (401/403 en 7 endpoints), CRUD de productos, categorías y sucursales, ajuste de stock sin negativos, transiciones de pedido con su efecto en inventario, usuarios sin datos sensibles, desactivación que cierra sesiones, alquileres.

**Pruebas manuales en navegador** (Playwright, build de producción en modo real):
- Un cliente no puede ver el panel en ninguna ruta, no ve el enlace "Panel" y recibe 403 del API con su propia cookie.
- Login de administrador y dashboard con cifras reales.
- Pedido real de un cliente confirmado, completado (1 unidad vendida) y otro cancelado (inventario liberado).
- Producto: cambio de precio reflejado en la tienda; stock negativo rechazado; desactivar (ficha pública → 404) y reactivar (→ 200); alta de producto nuevo.
- Usuario desactivado: su sesión deja de ser válida (401).
- Sucursal: edición visible en la tienda; coordenadas fuera del área rechazadas.
- Categoría nueva: la tienda sigue funcionando.
- **Responsive:** 25 rutas (públicas y del panel) × 6 anchos (360, 390, 768, 1024, 1280 y 1440 px) = 150 combinaciones, **sin desbordamiento horizontal**, más revisión visual de capturas en móvil, tablet y escritorio.

**Errores encontrados y corregidos durante esta fase:**
- Los formularios enviaban al servidor datos ya transformados por Zod; un precio anterior vacío fallaba al revalidarse. Ahora se envía la entrada original.
- Los errores de validación de un solo valor (stock) no mostraban mensaje.
- El build en modo mock fallaba al prerenderizar `/admin`.
- Las tablas del panel se cortaban en pantallas medianas.
- Una prueba de inventario usaba un parámetro mal escrito y pasaba por casualidad.

## 20. Estado actual del producto

| Área | Estado | Observación |
| --- | --- | --- |
| Frontend | IMPLEMENTADO | 16 rutas públicas y 14 de panel; modos mock y real; responsive verificado. |
| Backend | IMPLEMENTADO | FastAPI `/api/v1` con catálogo, cuentas, carrito, pedidos y administración. |
| Base de datos | IMPLEMENTADO | PostgreSQL 16 + PostGIS; 11 tablas; 2 migraciones reversibles; seed DEMO. |
| Auth | PARCIAL | Real con sesiones, httpOnly, CSRF y rol admin. Falta recuperar contraseña, perfil y límite de intentos. |
| Catálogo | IMPLEMENTADO | Real y administrable. Productos y marcas DEMO; fotos referenciales. |
| Sucursales | IMPLEMENTADO | Reales y administrables. Datos DEMO (`is_demo`). |
| Inventario | PARCIAL | Real: por sucursal, reservas por pedido, ajustes y alertas. Falta la reserva de 15 min (RF 6.2) y la auditoría de ajustes. |
| Carrito | IMPLEMENTADO | Persistente entre dispositivos; local para visitantes; fusión. |
| Pedidos | PARCIAL | Creación y gestión de estados reales. Sin pagos, sin historial, sin "mis pedidos" en la tienda. |
| Alquileres | PARCIAL | Tabla y consultas reales. La oferta y tarifas de `/alquiler` son MOCK; no se pueden crear alquileres. |
| Admin | IMPLEMENTADO | Panel funcional protegido en backend y frontend. Sin carga de imágenes ni auditoría. |
| Pagos | PENDIENTE | Wompi no integrado; solo se guarda el método elegido. |
| GPS | PENDIENTE | — |
| WebSockets | PENDIENTE | — |
| Domicilios | PENDIENTE | Sin asignación, seguimiento ni estados de domicilio. |
| QR | PENDIENTE | — |
| Firma digital | PENDIENTE | — |
| Mantenimiento | MOCK | La regla del 90% solo se aplica a la oferta mock de alquiler; sin umbrales ni bitácora reales. |
| CMS | MOCK | Contenido editorial en `src/mocks/content.ts`. |

## 21. Funcionalidades pendientes

1. Reserva temporal de inventario de 15 minutos al agregar al carrito (RF 6.2).
2. Pagos con Wompi (PSE, tarjetas, billeteras) y facturación electrónica DIAN (RF 4.1–4.3).
3. Pantallas "mis pedidos" y "mis alquileres" para clientes; creación de alquileres con tarifas en la base de datos.
4. Recuperación de contraseña, edición de perfil y límite de intentos de login.
5. Evidencia del consentimiento Ley 1581 (fecha y versión de la política).
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
| **JSON en camelCase** | Lo consume TypeScript sin capas de traducción. |
| **Seed DEMO idempotente y marcado** | Entorno reproducible, sin presentar datos inventados como reales. |
| **Fotos de Wikimedia Commons con atribución** | Fotografías reales con licencia verificable (CC0, CC BY, CC BY-SA). Sin foto adecuada se muestra "Imagen pendiente" en lugar de inventar una. |
| **Filtros del panel en la URL** | Compartibles, funcionan sin JavaScript y se renderizan en el servidor. |

## 23. Riesgos técnicos conocidos

| Riesgo | Impacto | Mitigación propuesta |
| --- | --- | --- |
| Sin límite de intentos de login | Ataques de fuerza bruta | Limitar por IP y por cuenta en FastAPI. |
| Sin reserva de 15 min en el carrito | Un cliente puede encontrar el producto agotado al pagar | Reservas con vencimiento sobre `inventory`. |
| Sin auditoría de acciones del panel | No hay trazabilidad de cambios de precio, stock o estados | Tabla de eventos de auditoría. |
| Datos DEMO llegando a producción | Información falsa visible a clientes | Bloquear el despliegue si hay sucursales `is_demo`; credenciales `DEMO_ADMIN_*` solo en local. |
| Fotos referenciales con logos de marcas reales | Pueden confundir con los productos (ficticios) del catálogo | Sustituir por fotos propias de EcoMovilidad. |
| Consentimiento Ley 1581 sin evidencia | Riesgo legal | Registrar fecha y versión aceptada. |
| Catálogo filtrado en memoria | Rendimiento con miles de productos | Mover los filtros a SQL cuando crezca. |
| Categorías nuevas invisibles en la tienda | Productos creados en ellas no se venden | Volver dinámicas las categorías en la tienda si el SRS lo aprueba. |
| Google Maps no probado | El mapa real puede fallar al activarlo | Probar con una key restringida antes de producción (existe fallback automático). |
| Discrepancia SRS v3.0 / SDP (Módulo 8) | Alcance de usuarios sin requisito formal | Emitir SRS v3.1. |

## 24. Próximas fases recomendadas

En orden de prioridad:

1. **Cerrar la tienda:**
   - reserva de 15 minutos;
   - "mis pedidos";
   - recuperación de contraseña y límite de intentos;
   - evidencia de consentimiento.
2. **Pagos:** integración con Wompi (sandbox), confirmación automática de pedidos por webhook y factura electrónica DIAN.
3. **Datos reales:** sucursales, catálogo y fotografías propias de EcoMovilidad; retirar los datos DEMO.
4. **Operación:**
   - auditoría del panel;
   - historial de pedidos;
   - carga de imágenes;
   - roles de operador de punto.
5. **Alquiler real:** tarifas en base de datos, creación de reservas y disponibilidad por fechas.
6. **Domicilios:** asignación, estados de domicilio (RF 5.3), QR y firma (RF 7.2, 7.3).
7. **Flota en tiempo real:** GPS, WebSockets, mantenimiento preventivo y geocercas (Módulos 2 y 3).
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
