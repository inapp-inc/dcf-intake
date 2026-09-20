#!/usr/bin/env bash
# PM2 deploy: host nginx serves frontend/dist and proxies API + WS to loopback API.
# Safe on shared hosts: writes ONLY ${NGINX_ROUTES_DIR}/${NGINX_ROUTE}.conf — no other nginx files.
set -euo pipefail

INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${INSTALL_ROOT}/scripts/lib/env-helpers.sh"
# shellcheck disable=SC1091
source "${INSTALL_ROOT}/scripts/lib/nginx-route.sh"
source_env_files "${INSTALL_ROOT}"

ROUTE="${NGINX_ROUTE:-}"
API_PORT="${PORT:-11110}"
ROUTES_DIR="${NGINX_ROUTES_DIR:-/etc/nginx/routes}"
DOMAIN="${NGINX_DOMAIN:-client-demo.inapp.com}"
APP_BASE_PATH="${APP_BASE_PATH:-/intake}"
STATIC_ROOT="${INSTALL_ROOT}/frontend/dist"
SKIP_RELOAD="${SKIP_NGINX_RELOAD:-0}"

usage() {
  cat <<'EOF'
Usage: deploy/configure-nginx.sh [options]

Options:
  --route NAME          Path segment (default: from APP_BASE_PATH, e.g. intake)
  --api-port PORT       Loopback API port (default: PORT or 11110)
  --routes-dir DIR      Default: /etc/nginx/routes
  --skip-reload         Write config only; do not nginx -t / reload

Environment:
  APP_BASE_PATH         /intake → route intake
  NGINX_ROUTE           Override route name
  PORT                  API listen port
  NGINX_ROUTES_DIR      Route snippets directory
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --route) ROUTE="$2"; shift 2 ;;
    --api-port) API_PORT="$2"; shift 2 ;;
    --routes-dir) ROUTES_DIR="$2"; shift 2 ;;
    --skip-reload) SKIP_RELOAD=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$ROUTE" ]]; then
  ROUTE="${APP_BASE_PATH#/}"
  ROUTE="${ROUTE%/}"
fi

if [[ -z "$ROUTE" ]]; then
  echo "ERROR: could not determine route from APP_BASE_PATH=${APP_BASE_PATH}" >&2
  exit 1
fi

if ! [[ "$API_PORT" =~ ^[0-9]+$ ]]; then
  echo "ERROR: api port must be numeric (got: ${API_PORT})" >&2
  exit 1
fi

if [[ ! -d "$STATIC_ROOT" ]]; then
  echo "ERROR: frontend build missing at ${STATIC_ROOT} — run ./run-production.sh first." >&2
  exit 1
fi

ROUTE_FILE="${ROUTES_DIR}/${ROUTE}.conf"

write_route_config() {
  local dest="$1"
  cat >"$dest" <<EOF
# =========================================================
# ${ROUTE}  (PM2 — static SPA + loopback API)
# Installed by demo/deploy/configure-nginx.sh
# Scoped to /${ROUTE}/ only — does not affect other apps on this host.
# =========================================================

location /${ROUTE}/api/ {
    proxy_pass http://127.0.0.1:${API_PORT}/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_connect_timeout 120s;
    proxy_send_timeout 3600s;
    proxy_read_timeout 3600s;
    proxy_buffering off;
    proxy_redirect off;
    client_max_body_size 50m;
}

location /${ROUTE}/ws/ {
    proxy_pass http://127.0.0.1:${API_PORT}/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_connect_timeout 120s;
    proxy_send_timeout 3600s;
    proxy_read_timeout 3600s;
    proxy_buffering off;
    proxy_redirect off;
}

location = /${ROUTE} {
    return 301 /${ROUTE}/;
}

location /${ROUTE}/ {
    alias ${STATIC_ROOT}/;
    index index.html;
    try_files \$uri \$uri/ /${ROUTE}/index.html;
}

EOF
}

echo ""
echo "====================================================="
echo "Installing PM2 nginx route: /${ROUTE}/"
echo "  static: ${STATIC_ROOT}"
echo "  api:    http://127.0.0.1:${API_PORT}/api/"
echo "====================================================="
echo ""

HEALTH_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${API_PORT}/api/v1/health" 2>/dev/null || true)"
if [[ -z "$HEALTH_STATUS" ]] || [[ "$HEALTH_STATUS" == "000" ]]; then
  echo "WARNING: API health not reachable yet (HTTP ${HEALTH_STATUS})"
  echo "         Continuing — start PM2 first if deploy order differs."
else
  echo "API health reachable (HTTP ${HEALTH_STATUS})"
fi

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT
write_route_config "${TMP}"

install_nginx_route_snippet "${ROUTE_FILE}" "${TMP}" "${SKIP_RELOAD}"

PROXY_STATUS="$(curl -k -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" "https://127.0.0.1/${ROUTE}/" 2>/dev/null || true)"
if [[ -n "${PROXY_STATUS}" ]] && [[ "${PROXY_STATUS}" != "000" ]]; then
  echo "Route validation (Host: ${DOMAIN}): HTTP ${PROXY_STATUS}"
else
  echo "NOTE: could not validate https://127.0.0.1/${ROUTE}/ (Host: ${DOMAIN})"
fi

echo ""
echo "Application URL: https://${DOMAIN}/${ROUTE}/"
echo "API (loopback):  http://127.0.0.1:${API_PORT}/api/v1/health"
