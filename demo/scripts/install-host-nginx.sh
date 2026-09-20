#!/usr/bin/env bash
# Install path-based nginx route on shared demo host (same output as create-nginx-site.sh).
# Safe on shared hosts: writes ONLY ${NGINX_ROUTES_DIR}/${NGINX_ROUTE}.conf — no other nginx files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/nginx-route.sh"

ROUTE="${NGINX_ROUTE:-}"
PORT="${AIT_HTTP_PORT:-11111}"
ROUTES_DIR="${NGINX_ROUTES_DIR:-/etc/nginx/routes}"
DOMAIN="${NGINX_DOMAIN:-client-demo.inapp.com}"
APP_BASE_PATH="${APP_BASE_PATH:-/intake}"
SKIP_RELOAD="${SKIP_NGINX_RELOAD:-0}"

usage() {
  cat <<'EOF'
Usage: install-host-nginx.sh [options]

Options:
  --route NAME          Path segment (default: from APP_BASE_PATH, e.g. intake)
  --port PORT           Upstream HTTP port (default: AIT_HTTP_PORT or 11111)
  --routes-dir DIR      Default: /etc/nginx/routes
  --skip-reload         Write config only; do not nginx -t / reload

Environment:
  APP_BASE_PATH         /intake → route intake
  NGINX_ROUTE           Override route name
  AIT_HTTP_PORT         Backend port
  NGINX_ROUTES_DIR      Route snippets directory
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --route) ROUTE="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
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

if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "ERROR: port must be numeric (got: ${PORT})" >&2
  exit 1
fi

ROUTE_FILE="${ROUTES_DIR}/${ROUTE}.conf"

write_route_config() {
  local dest="$1"
  cat >"$dest" <<EOF
# =========================================================
# ${ROUTE}  (upstream keeps path prefix — required for path-prefixed SPA)
# Installed by demo/scripts/install-host-nginx.sh
# Scoped to /${ROUTE}/ only — does not affect other apps on this host.
# =========================================================

location /${ROUTE}/ {

    # Preserve /${ROUTE}/ on Docker nginx (do NOT proxy_pass to / only)
    proxy_pass http://127.0.0.1:${PORT}/${ROUTE}/;

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

    client_max_body_size 50m;
}
EOF
}

echo ""
echo "====================================================="
echo "Installing host nginx route: /${ROUTE}/ → :${PORT}"
echo "====================================================="
echo ""

BACKEND_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/${ROUTE}/" 2>/dev/null || true)"
if [[ -z "$BACKEND_STATUS" ]] || [[ "$BACKEND_STATUS" == "000" ]]; then
  echo "WARNING: http://127.0.0.1:${PORT}/${ROUTE}/ not reachable yet (HTTP ${BACKEND_STATUS})"
  echo "         Continuing — start stack first if deploy order differs."
else
  echo "Backend reachable (HTTP ${BACKEND_STATUS})"
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
echo "Backend:         http://127.0.0.1:${PORT}/${ROUTE}/"
