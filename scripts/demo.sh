#!/usr/bin/env bash
# Demo pública TEMPORAL: Mac + Docker (Colima) + Next.js + Cloudflare Tunnel.
#
#   scripts/demo.sh start    levanta base de datos, API, Next.js y el túnel; imprime la URL
#   scripts/demo.sh status   muestra qué está corriendo y la URL actual
#   scripts/demo.sh stop     cierra el túnel y Next.js (Docker sigue encendido)
#   scripts/demo.sh stop --all   además detiene Docker (conserva los datos)
#
# Solo Next.js queda accesible desde Internet, a través del túnel. PostgreSQL y
# FastAPI escuchan únicamente en 127.0.0.1. Ver DEMO_PUBLICA.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.demo"
ENV_FILE="$ROOT/.env.demo"
PORT="${DEMO_PORT:-3100}"
API_BASE_URL="http://127.0.0.1:8000/api/v1"
cd "$ROOT"
mkdir -p "$STATE"

log() { printf '\033[1m==>\033[0m %s\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

running() { [[ -f "$STATE/$1.pid" ]] && kill -0 "$(cat "$STATE/$1.pid")" 2>/dev/null; }

kill_tree() { # el proceso y sus hijos (next start lanza next-server)
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}

stop_process() {
  if running "$1"; then
    kill_tree "$(cat "$STATE/$1.pid")"
    log "$1 detenido"
  fi
  rm -f "$STATE/$1.pid"
}

wait_for() { # url, segundos
  for _ in $(seq 1 "$2"); do
    curl -sf -o /dev/null "$1" && return 0
    sleep 1
  done
  return 1
}

# Credenciales del admin para la demo: fuera de Git (.env.demo, permisos 600).
ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    local random
    random="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 18)"
    umask 077
    cat > "$ENV_FILE" <<EOF
# Credenciales de la DEMO pública. No se versiona (.gitignore: .env*).
DEMO_ADMIN_EMAIL=admin@ecomovilidad.dev
DEMO_ADMIN_PASSWORD=Demo${random}7
EOF
    log "Creado .env.demo con una contraseña aleatoria para el administrador"
  fi
  chmod 600 "$ENV_FILE"
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  [[ -n "${DEMO_ADMIN_EMAIL:-}" && -n "${DEMO_ADMIN_PASSWORD:-}" ]] || fail ".env.demo debe definir DEMO_ADMIN_EMAIL y DEMO_ADMIN_PASSWORD"
}

start() {
  command -v cloudflared >/dev/null || fail "cloudflared no está instalado: brew install cloudflared"
  running next && fail "La demo ya está en marcha ($(cat "$STATE/url" 2>/dev/null)). Usa: scripts/demo.sh stop"
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "El puerto $PORT está ocupado. Libéralo o usa DEMO_PORT=otro_puerto scripts/demo.sh start"
  fi
  ensure_env_file

  if ! colima status >/dev/null 2>&1; then
    log "Iniciando Colima"
    colima start
  fi

  log "Abriendo el túnel temporal de Cloudflare → http://127.0.0.1:$PORT"
  stop_process cloudflared
  : > "$STATE/cloudflared.log"
  nohup cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" > "$STATE/cloudflared.log" 2>&1 &
  echo $! > "$STATE/cloudflared.pid"
  local url=""
  for _ in $(seq 1 60); do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$STATE/cloudflared.log" | head -1 || true)"
    [[ -n "$url" ]] && break
    sleep 1
  done
  [[ -n "$url" ]] || { stop_process cloudflared; fail "cloudflared no entregó una URL. Revisa .demo/cloudflared.log"; }
  echo "$url" > "$STATE/url"

  log "Levantando PostgreSQL/PostGIS y FastAPI (Docker)"
  FRONTEND_URL="$url" docker compose up -d --build --wait
  wait_for "$API_BASE_URL/health" 60 || fail "La API no respondió. Revisa: docker compose logs api"

  log "Aplicando la contraseña de .env.demo al administrador ($DEMO_ADMIN_EMAIL)"
  docker compose exec -T api python -m app.cli make-admin "$DEMO_ADMIN_EMAIL" >/dev/null
  docker compose exec -T api python -m app.cli set-password "$DEMO_ADMIN_EMAIL" <<< "$DEMO_ADMIN_PASSWORD" >/dev/null

  log "Compilando Next.js (API_MODE=real) para $url"
  API_MODE=real API_BASE_URL="$API_BASE_URL" NEXT_PUBLIC_SITE_URL="$url" \
    "$ROOT/node_modules/.bin/next" build > "$STATE/next-build.log" 2>&1 || fail "Falló el build. Revisa .demo/next-build.log"

  log "Iniciando Next.js en 127.0.0.1:$PORT"
  API_MODE=real API_BASE_URL="$API_BASE_URL" NEXT_PUBLIC_SITE_URL="$url" \
    nohup "$ROOT/node_modules/.bin/next" start -H 127.0.0.1 -p "$PORT" > "$STATE/next.log" 2>&1 &
  echo $! > "$STATE/next.pid"
  wait_for "http://127.0.0.1:$PORT/" 60 || fail "Next.js no respondió. Revisa .demo/next.log"

  log "Esperando a que la URL pública responda"
  wait_for "$url/" 90 || log "La URL aún no responde; Cloudflare puede tardar un minuto más."

  cat <<EOF

  Demo pública lista (TEMPORAL):

      $url

  El Mac debe permanecer encendido y conectado a Internet mientras se use la URL.
  Admin: $DEMO_ADMIN_EMAIL (contraseña en .env.demo; no se imprime).
  Detener: scripts/demo.sh stop

EOF
}

status() {
  if running cloudflared; then echo "Túnel:   activo   $(cat "$STATE/url" 2>/dev/null)"; else echo "Túnel:   detenido"; fi
  if running next; then echo "Next.js: activo   http://127.0.0.1:$PORT"; else echo "Next.js: detenido"; fi
  if curl -sf -o /dev/null "$API_BASE_URL/health"; then echo "FastAPI: activo   127.0.0.1:8000 (solo local)"; else echo "FastAPI: detenido"; fi
  docker compose ps --format '{{.Service}}: {{.State}} {{.Ports}}' 2>/dev/null || true
}

stop() {
  stop_process cloudflared
  stop_process next
  rm -f "$STATE/url"
  if [[ "${1:-}" == "--all" ]]; then
    log "Deteniendo Docker (los datos se conservan)"
    docker compose stop
  fi
}

case "${1:-}" in
  start) start ;;
  status) status ;;
  stop) shift; stop "${1:-}" ;;
  *) echo "Uso: scripts/demo.sh start | status | stop [--all]"; exit 1 ;;
esac
