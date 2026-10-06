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

La URL cambia: hay que enviar la nueva. Para empezar con la base limpia (sin cuentas ni pedidos de pruebas anteriores):

```bash
scripts/demo.sh stop --all && docker compose down -v && scripts/demo.sh start
```

## Administrador de la demo

- Cuenta: `admin@ecomovilidad.dev` (creada por el seed de desarrollo).
- **Contraseña:** el primer `scripts/demo.sh start` genera una aleatoria y la guarda en **`.env.demo`** (permisos 600, ignorado por Git por la regla `.env*`). Consultarla en el Mac:

  ```bash
  grep DEMO_ADMIN_PASSWORD .env.demo
  ```

- Para elegir otra, edita `DEMO_ADMIN_PASSWORD` en `.env.demo` (10+ caracteres, letras y números) y vuelve a iniciar la demo. El script la aplica con `python -m app.cli set-password`, que la lee por stdin (no aparece en `ps` ni en el historial) y cierra las sesiones abiertas de esa cuenta.
- La contraseña de desarrollo documentada en el README **deja de funcionar** después del primer `demo.sh start`, para que nadie con acceso a la documentación entre al panel público. Para volver a ella en local:

  ```bash
  docker compose exec -T api python -m app.cli set-password admin@ecomovilidad.dev
  # escribe la contraseña y pulsa Enter (se verá en pantalla)
  ```

- Comparte la contraseña del admin **solo** por un canal privado. Los clientes de prueba pueden registrarse libremente desde la propia URL.

## Qué puede probar el profesor

Inicio, catálogo, ficha de producto, sucursales, registro, login, carrito con reserva de 15 minutos, checkout, crear pedido, "Mis pedidos", cerrar sesión y volver a entrar, y el panel `/admin` (con la cuenta de administrador).

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
- Sin pagos, domicilios con seguimiento, GPS, QR ni firma (ver ESTADO.md).
- Sin copias de seguridad: `docker compose down -v` borra los datos.
- Para una URL fija haría falta un túnel con nombre (cuenta de Cloudflare y un dominio). No se configuró en esta fase.

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| `El puerto 3100 está ocupado` | `scripts/demo.sh stop` o `DEMO_PORT=3200 scripts/demo.sh start` |
| La URL responde 502 o "Bad gateway" | Next.js aún compila o se detuvo: `scripts/demo.sh status`, revisa `.demo/next.log` |
| `cloudflared no entregó una URL` | Revisa la conexión a Internet y `.demo/cloudflared.log` |
| La API no responde | `docker compose logs api` |
