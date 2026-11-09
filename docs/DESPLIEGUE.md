# Despliegue en producción

Guía para publicar EcoMovilidad en un servidor propio con Docker. Todo corre en una sola máquina: Caddy (HTTPS), portal web, API, tareas programadas, copias de seguridad y base de datos. Solo Caddy expone puertos.

## Antes de empezar

Necesitas:

- Un servidor Linux con Docker y el plugin Compose (2 GB de RAM como mínimo; la compilación del portal los usa al arrancar).
- Un dominio apuntando a la IP del servidor, y los puertos 80 y 443 abiertos.
- Una forma de cobrar: Wompi o pago manual.
- Una cuenta de correo SMTP, para recuperar contraseñas y enviar comprobantes. Es opcional, pero sin ella esas funciones no operan.

## Primer despliegue

```bash
git clone https://github.com/santrolop1/ecomovilidad
cd ecomovilidad
cp .env.production.example .env.production
openssl rand -hex 24          # pega el resultado en POSTGRES_PASSWORD
nano .env.production          # DOMAIN, forma de cobro, SMTP, NIT
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --wait --wait-timeout 420
```

La API no arranca si la configuración no sirve para producción. Si algo falla, el motivo aparece en:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs api
```

Crea el primer administrador: regístrate en el sitio y ejecuta:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api python -m app.cli make-admin tu@correo.com
```

Para no repetir el comando largo: `alias eco='docker compose -f docker-compose.prod.yml --env-file .env.production'`.

## Formas de cobro

| Opción | Configuración | Cómo funciona |
| --- | --- | --- |
| Pago manual | `PAYMENT_PROVIDER=manual` y `PAYMENT_INSTRUCTIONS` | El cliente ve cómo pagar y una referencia. En el pedido o alquiler, un administrador confirma o rechaza el pago. El plazo se define con `PAYMENT_WINDOW_MINUTES` (máximo 1440). |
| Wompi | `PAYMENT_PROVIDER=auto` y las cuatro llaves | Registra `https://<dominio>/api/webhooks/wompi` como URL de eventos en el panel de Wompi. Prueba primero con llaves de sandbox y `WOMPI_API_URL=https://sandbox.wompi.co/v1`. |

La pasarela de pruebas nunca funciona en producción.

## Datos

Una instalación nueva queda sin productos ni sucursales: se cargan desde el panel. Para probar con los datos de demostración, usa `SEED_DEMO=true` en el primer arranque. Revisa los textos de *Panel > Contenidos*: los iniciales dicen "Dato de demostración".

## Operación

| Tarea | Cómo |
| --- | --- |
| Vencer reservas y pagos, limpiar datos | Automático cada 5 minutos (servicio `worker`). El historial GPS se conserva 90 días (`GPS_RETENTION_DAYS`). |
| Copias de seguridad | Automáticas cada día en `BACKUP_DIR`; se conservan 14 días. **Cópialas también fuera del servidor.** |
| Ver registros | `eco logs -f api` (o `web`, `caddy`, `worker`) |
| Revisar la configuración | `eco exec api python -m app.cli check-production` |

## Actualizar a una versión nueva

```bash
git pull
eco up -d --build --wait --wait-timeout 420
```

Las migraciones se aplican solas al arrancar la API. Haz una copia antes de actualizar.

## Restaurar una copia

```bash
eco stop api web worker
eco exec -T db dropdb -U ecomovilidad ecomovilidad
eco exec -T db createdb -U ecomovilidad ecomovilidad
eco exec -T db pg_restore -U ecomovilidad -d ecomovilidad --no-owner < backups/ecomovilidad-AAAAMMDD-HHMMSS.dump
eco up -d --wait --wait-timeout 420
```

## Antes de abrir al público

- [ ] Datos reales de productos, precios, sucursales y contacto.
- [ ] Una compra completa de prueba, con la forma de cobro elegida.
- [ ] Recuperación de contraseña recibida por correo.
- [ ] Una copia restaurada al menos una vez.
- [ ] Revisión legal: datos personales, retracto y drones.
- [ ] Factura electrónica DIAN: la app emite una factura de venta que no la reemplaza.

## Lo que esta guía no cubre

Es un solo servidor, sin réplicas. Si se cae, el sitio se cae hasta que vuelva. La disponibilidad del 99,9 % del requisito RNF-3.3 exige réplicas y monitoreo externo.
