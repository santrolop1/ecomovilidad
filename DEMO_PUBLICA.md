# Demo pública temporal (sin AWS)

> **Esta es una demostración temporal. El Mac debe permanecer encendido y conectado a Internet mientras la URL esté disponible.**

La aplicación se ejecuta en el Mac (Docker + Colima, Next.js, FastAPI, PostgreSQL + PostGIS) y se publica con un **túnel temporal de Cloudflare** (`trycloudflare.com`). No hace falta dominio, DNS, cuenta de Cloudflare, AWS ni abrir puertos del router.

## Arquitectura

```
Navegador (PC, celular, tablet)
   │  HTTPS  https://<aleatorio>.trycloudflare.com
   ▼
Cloudflare  ──  túnel saliente (cloudflared, en el Mac)
   ▼
Next.js 16  (next start, 127.0.0.1:3100, API_MODE=real)
   │  llamadas de servidor (Server Components / Server Actions)
   ▼
FastAPI     (Docker, 127.0.0.1:8000)   ← no accesible desde Internet
   ▼
PostgreSQL 16 + PostGIS  (Docker, 127.0.0.1:5433)   ← no accesible desde Internet
```

- El túnel apunta **solo a Next.js**. El navegador nunca llama a FastAPI ni a PostgreSQL; `https://…/api/v1/...` responde 404.
- `docker-compose.yml` publica FastAPI y PostgreSQL únicamente en `127.0.0.1`: ni siquiera la red local los ve.
- Next.js escucha en `127.0.0.1:3100`. El puerto 3000 queda libre para `npm run dev`.

## Requisitos (una sola vez)

```bash
brew install colima docker docker-compose cloudflared
npm install
```

## Iniciar la demo

```bash
scripts/demo.sh start        # o: npm run demo:start
```

El script:
1. inicia Colima si está apagado;
2. abre el túnel (`cloudflared tunnel --url http://127.0.0.1:3100`) y obtiene la URL `https://….trycloudflare.com`;
3. levanta PostgreSQL/PostGIS y FastAPI con Docker Compose (migraciones y datos DEMO automáticos);
4. aplica al administrador la contraseña de `.env.demo` (ver abajo);
5. compila Next.js en modo real con esa URL como URL canónica y lo inicia;
6. espera a que la URL pública responda e **imprime la URL**.

Tarda unos 2 minutos. La URL es **distinta cada vez** que se inicia el túnel.

**Obtener la URL de nuevo:** `scripts/demo.sh status` (o `cat .demo/url`).

## Detener

```bash
scripts/demo.sh stop         # cierra el túnel y Next.js; Docker sigue encendido
scripts/demo.sh stop --all   # además detiene Docker (los datos se conservan)
```

Apagar Docker por completo: `docker compose down` (conserva datos) o `docker compose down -v` (borra la base; la próxima vez se recrea con los datos DEMO). Apagar Colima: `colima stop`.

## Reiniciar la demo

```bash
scripts/demo.sh stop && scripts/demo.sh start
```

La URL cambia: hay que enviar la nueva. Después de actualizar el código (por ejemplo, para ver los mapas nuevos), hay que reiniciar así la demo: `start` vuelve a compilar Next.js. Para empezar con la base limpia (sin cuentas ni pedidos de pruebas anteriores):

```bash
scripts/demo.sh stop --all && docker compose down -v && scripts/demo.sh start
```

## Administrador de la demo

- Cuenta: `admin@ecomovilidad.dev` (la crea `demo.sh` con los datos de `.env.demo`).
- **Contraseña:** el primer `scripts/demo.sh start` genera una aleatoria y la guarda en **`.env.demo`** (permisos 600, ignorado por Git por la regla `.env*`). Consultarla en el Mac:

  ```bash
  grep DEMO_ADMIN_PASSWORD .env.demo
  ```

- Para elegir otra, edita `DEMO_ADMIN_PASSWORD` en `.env.demo` (10+ caracteres, letras y números) y vuelve a iniciar la demo. El script la aplica con `python -m app.cli set-password`, que la lee por stdin (no aparece en `ps` ni en el historial) y cierra las sesiones abiertas de esa cuenta.
- Para cambiarla en local sin iniciar la demo:

  ```bash
  docker compose exec -T api python -m app.cli set-password admin@ecomovilidad.dev
  # escribe la contraseña y pulsa Enter (se verá en pantalla)
  ```

- Comparte la contraseña del admin **solo** por un canal privado. Los clientes de prueba pueden registrarse libremente desde la propia URL.

## Pagos

**Por ahora la demo usa la pasarela de pruebas de EcoMovilidad:** al pagar, el cliente llega a una página marcada como "Pasarela de pruebas" y elige **Aprobar pago** o **Rechazar pago**. No se cobra dinero real y el resto del flujo es el real (pedido o alquiler pagado, inventario, factura PDF y XML, panel). No hay que configurar nada.

El sistema **está listo para recibir las llaves de Wompi**. Para pasar a Wompi en modo de pruebas (sandbox):

1. Crea una cuenta en el panel de comercios de Wompi y copia las **llaves de pruebas** (en la sección para desarrolladores del panel): pública (`pub_test_…`), privada (`prv_test_…`), secreto de eventos (`test_events_…`) y secreto de integridad (`test_integrity_…`).
2. Ponlas en `backend/.env` (está fuera de Git), con los nombres de `backend/.env.example`:
   `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`.
3. Inicia (o reinicia) la demo: `scripts/demo.sh start`. Comprueba en la consola: `curl -s 127.0.0.1:8000/api/v1/payments/config` debe decir `"enabled":true,"sandbox":true`.
4. **URL de eventos:** en el panel de Wompi, en la configuración de eventos para desarrolladores, registra `https://<url-del-túnel>/api/webhooks/wompi`. Cambia en cada inicio de la demo; si no la actualizas, el pago se confirma igual cuando el cliente vuelve de Wompi, pero los pagos que tardan (PSE) solo se actualizan al volver a la página de resultado.
5. Datos de prueba de Wompi: tarjeta **4242 4242 4242 4242** (aprobada) o **4111 1111 1111 1111** (rechazada), con cualquier fecha futura y CVC; Nequi **3991111111** (aprobado).

Mientras no estén las llaves, se sigue usando la pasarela de pruebas. `curl -s 127.0.0.1:8000/api/v1/payments/config` muestra cuál está activa (`"provider": "simulado"` o `"wompi"`).

## Qué puede probar el profesor

Inicio, catálogo, ficha de producto, sucursales con **mapa real** (OpenStreetMap), registro, login, carrito con reserva de 15 minutos, checkout, crear pedido y **pagarlo en la pasarela de pruebas**, factura PDF y XML, **alquilar** un vehículo (cotización, reserva y pago) y verlo en "Mis alquileres", "Mis pedidos", cerrar sesión y volver a entrar, y el panel `/admin` (con la cuenta de administrador), incluida "Operación" (`/admin/operacion`), cuyo mapa muestra activos **simulados** en modo demostración.

Todos los datos comerciales son **de demostración** (`is_demo = true`, marcados en la interfaz). El pago **no se procesa**: los pedidos quedan "Pendiente de confirmación".

## Seguridad

- HTTPS de punta a punta hasta Cloudflare; el túnel es una conexión saliente desde el Mac.
- Cookies de sesión `HttpOnly`, `Secure` y `SameSite=Lax`, solo en el dominio del túnel. `document.cookie` queda vacío.
- Las Server Actions verifican que `Origin` coincida con el host público (no hubo que relajar nada). CSRF hacia FastAPI con token sincronizado.
- CORS de FastAPI no cambia: el navegador nunca llama a FastAPI.
- Límite de intentos de login: Next.js envía a FastAPI la IP real del visitante (`CF-Connecting-IP`, fijada por Cloudflare), no la que el cliente pudiera escribir en `X-Forwarded-For`.
- `.env.demo` y `.demo/` (logs, PID, URL) no se versionan.

## Limitaciones

- **Temporal:** la URL deja de funcionar al detener el túnel, apagar o suspender el Mac, o perder Internet. Cada inicio genera una URL nueva.
- Los túneles rápidos de Cloudflare no tienen garantía de disponibilidad y están pensados para pruebas, no para producción.
- El rendimiento depende del Mac y de su conexión de subida.
- **Recuperación de contraseña:** no hay proveedor de correo; el enlace solo aparece en `docker compose logs api` del Mac, así que un visitante no puede completarla por su cuenta.
- Sin pagos, domicilios con seguimiento, GPS, QR ni firma (ver ESTADO.md). El mapa operativo del panel es una **simulación** claramente marcada; no hay telemetría GPS.
- Los mapas cargan teselas de `tile.openstreetmap.org` desde el navegador del visitante (sin API key). Si no cargan, la página muestra "Mapa temporalmente no disponible" y conserva la lista de sucursales.
- Sin copias de seguridad: `docker compose down -v` borra los datos.
- Para una URL fija haría falta un túnel con nombre (cuenta de Cloudflare y un dominio). No se configuró en esta fase.

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| `El puerto 3100 está ocupado` | `scripts/demo.sh stop` o `DEMO_PORT=3200 scripts/demo.sh start` |
| La URL responde 502 o "Bad gateway" | Next.js aún compila o se detuvo: `scripts/demo.sh status`, revisa `.demo/next.log` |
| `cloudflared no entregó una URL` | Revisa la conexión a Internet y `.demo/cloudflared.log` |
| La API no responde | `docker compose logs api` |
