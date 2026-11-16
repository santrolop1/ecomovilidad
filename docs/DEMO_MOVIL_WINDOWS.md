# Demo móvil en iPhone y Android desde una PC Windows

La aplicación Next.js es una PWA instalable desde el navegador. Incluye
manifiesto, iconos PNG de 192 y 512 píxeles, icono adaptable de Android e icono
Apple de 180 píxeles. `/instalar` explica los pasos a los participantes.

La instalación no descarga FastAPI ni PostgreSQL al celular: la PC conserva
esos servicios. Compra, alquiler, pagos y seguimiento requieren conexión con
ella. No hay modo de transacciones sin conexión ni publicación en App Store o
Google Play. No se registra un service worker: no es necesario para esta
instalación y no se almacenan respuestas privadas en una caché offline.

## Requisitos en la PC

- Node.js compatible con Next.js (20.9 o superior; se recomienda la versión 22 usada por CI).
- Docker Desktop ejecutándose con contenedores Linux.
- `cloudflared` instalado si se usará el enlace HTTPS temporal.
- Internet para el túnel y los mapas; mantener la PC encendida y sin suspensión.

El script `scripts/demo.sh` existente usa herramientas de Mac/Colima y no se
ejecuta con doble clic en Windows. Los pasos siguientes usan PowerShell.

## Preparación, solo si todavía no existen los archivos locales

En la raíz del repositorio, después de `npm ci`:

```powershell
if (Test-Path -LiteralPath .env) { throw 'Ya existe .env: conserva tu configuración y omite este bloque.' }
$demoBytes = New-Object byte[] 32
$demoRng = [Security.Cryptography.RandomNumberGenerator]::Create()
$demoRng.GetBytes($demoBytes)
$demoRng.Dispose()
$demoPassword = [Convert]::ToBase64String($demoBytes)
Set-Content -LiteralPath .env -Value "POSTGRES_PASSWORD=$demoPassword"
Remove-Variable demoPassword,demoBytes
```

Si no existe `.env.local`, créalo por separado:

```powershell
if (Test-Path -LiteralPath .env.local) { throw 'Ya existe .env.local: revisa sus valores sin sobrescribirlo.' }
Set-Content -LiteralPath .env.local -Value @('API_MODE=real', 'API_BASE_URL=http://127.0.0.1:8000/api/v1')
```

Esos archivos no se suben a Git. Para la demo, revisar también cualquier
`backend/.env` existente: no utilizar llaves de cobro real. Sin llaves, el modo
de desarrollo usa la pasarela simulada; el pago simulado no cobra dinero.

## Opción para instalar en iOS y Android: HTTPS temporal

1. En una primera terminal, ejecutar y dejar abierta:

   ```powershell
   cloudflared tunnel --url http://127.0.0.1:3100
   ```

   Copiar la URL `https://…trycloudflare.com` que imprime. El túnel es público
   para quien conozca la URL y se detiene con Ctrl+C. Por ahora puede mostrar
   un error: el servidor se inicia en el siguiente paso.

2. En otra terminal, desde la raíz, sustituir el ejemplo por esa URL real:

   ```powershell
   $demoUrl = 'https://REEMPLAZAR.trycloudflare.com'
   if ($demoUrl -match 'REEMPLAZAR') { throw 'Sustituye la URL por la del túnel.' }
   $env:FRONTEND_URL = $demoUrl
   $env:NEXT_PUBLIC_SITE_URL = $demoUrl
   docker compose up -d --build --wait
   # Si el comando anterior falla, corregir Docker antes de seguir.
   npm run build
   # Solo si el build terminó correctamente:
   npm run start -- --hostname 127.0.0.1 --port 3100
   ```

   Compose aplica `alembic upgrade head` al iniciar la API, incluida la migración
   0013. PostgreSQL y FastAPI continúan ligados a 127.0.0.1 en el host; solo la
   web se comparte a través del túnel. El correo sigue requiriendo SMTP real.

3. Abrir la URL HTTPS en el teléfono y entrar en `/instalar`:
   - iPhone: Safari → Compartir → Agregar a pantalla de inicio. Mantener
     activado Abrir como app web si aparece.
   - Android: Chrome → menú → Agregar a pantalla principal / Instalar app.

4. Registrarse desde el celular. Para dar acceso al panel a una cuenta de la demo:

   ```powershell
   docker compose exec api python -m app.cli make-admin 'CORREO_REGISTRADO_DE_LA_DEMO'
   ```

   Usar una cuenta de prueba y mantener su contraseña fuera de la presentación.

5. Probar catálogo, login, compra simulada, alquiler y seguimiento. Para mostrar
   operación y GPS usar el simulador documentado en el README, no un dron físico
   sin integrar. Mantener abiertas las dos terminales de la demo.

El dominio de un Quick Tunnel cambia al reiniciarlo: la app instalada conserva
su dirección anterior y habrá que quitarla y volver a agregarla. Para repetir
demostraciones sin reinstalar, usar más adelante un túnel con hostname estable.

## Alternativa sin túnel: navegador en la misma red Wi-Fi

Para una visita desde el navegador, iniciar Next.js en `0.0.0.0` y abrir en el
celular `http://IP_LOCAL_DE_LA_PC:3100`. La PC y el teléfono deben estar en la
misma red y el firewall debe permitir ese puerto en la red privada. No cambiar
la configuración del firewall si no se necesita esa opción.

`localhost` en un iPhone apunta al propio iPhone, no a la PC. Una IP privada con
HTTP no proporciona el contexto seguro que necesita una instalación PWA
completa; para demostrar instalación, usar la opción HTTPS anterior. No
compartir los puertos 8000 ni 5433 con los celulares.

## Comprobación y cierre

- Revisar manifiesto en `/manifest.webmanifest` e iconos en `/icons/`.
- Verificar instalación y reapertura en un iPhone real y un Android real.
- No prometer trabajo sin conexión: al apagar la PC o cerrar el túnel la app
  deja de acceder a los servicios. El icono instalado sigue en el teléfono.
- Ctrl+C en las terminales de Next.js y del túnel. `docker compose down` detiene
  el backend conservando los datos; no usar `down -v` si se desean conservar.

Referencias: [PWA en Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps),
[instalación en iPhone](https://support.apple.com/guide/iphone/iphea86e5236/ios),
[apps web en Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid),
[Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
