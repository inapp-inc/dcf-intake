#!/usr/bin/env bash
# Install Foundry path-based nginx route (same output as create-nginx-site.sh).
# Called from deploy-docker.sh; safe to re-run (overwrites route file).
set -euo pipefail

ROUTE="${NGINX_ROUTE:-}"
PORT="${AIT_HTTP_PORT:-4010}"
ROUTES_DIR="${NGINX_ROUTES_DIR:-/etc/nginx/routes}"
DOMAIN="${NGINX_DOMAIN:-foundry.inapp.com}"
APP_BASE_PATH="${APP_BASE_PATH:-/dcfintake}"
SKIP_RELOAD="${SKIP_NGINX_RELOAD:-0}"

usage() {
  cat <<'EOF'
Usage: install-host-nginx.sh [options]

Options:
  --route NAME          Path segment (default: from APP_BASE_PATH, e.g. dcfintake)
  --port PORT           Upstream HTTP port (default: AIT_HTTP_PORT or 4010)
  --routes-dir DIR      Default: /etc/nginx/routes
  --skip-reload         Write config only; do not nginx -t / reload

Environment:
  APP_BASE_PATH         /dcfintake → route dcfintake
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

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "ERROR: need root or sudo to write ${ROUTE_FILE}" >&2
    return 1
  fi
}

write_route_config() {
  local dest="$1"
  cat >"$dest" <<EOF
# =========================================================
# ${ROUTE}  (upstream keeps path prefix — required for path-prefixed SPA)
# Installed by demo/scripts/install-host-nginx.sh
# =========================================================

# Fix SPA/API URLs that lost the prefix (e.g. /login → /${ROUTE}/login)
location ~ ^/(login|api)(/.*)?\$ {
    return 302 /${ROUTE}\$request_uri;
}

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

run_root mkdir -p "${ROUTES_DIR}" || exit 1

if [[ -f "${ROUTE_FILE}" ]]; then
  BACKUP="${ROUTE_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  echo "Backing up existing ${ROUTE_FILE} → ${BACKUP}"
  run_root cp -a "${ROUTE_FILE}" "${BACKUP}"
fi

run_root cp "${TMP}" "${ROUTE_FILE}"
run_root chmod 644 "${ROUTE_FILE}"
echo "Wrote ${ROUTE_FILE}"

if [[ "${SKIP_RELOAD}" -eq 1 ]]; then
  echo "Skip reload requested; run: sudo nginx -t && sudo systemctl reload nginx"
  exit 0
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "WARN: nginx binary not found; config written but not validated." >&2
  exit 0
fi

echo ""
echo "Validating nginx configuration..."
if run_root nginx -t; then
  echo "Reloading nginx..."
  if run_root systemctl reload nginx 2>/dev/null; then
    :
  elif run_root service nginx reload 2>/dev/null; then
    :
  else
    echo "WARN: could not reload nginx (run manually)." >&2
  fi
else
  echo "ERROR: nginx -t failed; restoring backup if present." >&2
  LATEST_BACKUP="$(run_root ls -t "${ROUTE_FILE}.bak."* 2>/dev/null | head -1 || true)"
  if [[ -n "${LATEST_BACKUP}" ]]; then
    run_root cp -a "${LATEST_BACKUP}" "${ROUTE_FILE}" || true
    run_root nginx -t && run_root systemctl reload nginx 2>/dev/null || true
  fi
  exit 1
fi

PROXY_STATUS="$(curl -k -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" "https://127.0.0.1/${ROUTE}/" 2>/dev/null || true)"
if [[ -n "${PROXY_STATUS}" ]] && [[ "${PROXY_STATUS}" != "000" ]]; then
  echo "Route validation (Host: ${DOMAIN}): HTTP ${PROXY_STATUS}"
else
  echo "NOTE: could not validate https://127.0.0.1/${ROUTE}/ (Host: ${DOMAIN})"
fi

echo ""
echo "Application URL: https://${DOMAIN}/${ROUTE}/"
echo "Backend:         http://127.0.0.1:${PORT}/${ROUTE}/"
