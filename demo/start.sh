#!/usr/bin/env bash
# PM2 first-run / update entry for the child welfare intake demo (no Docker).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

# shellcheck disable=SC1091
source "${ROOT}/scripts/lib/env-helpers.sh"

NO_NGINX=0
NO_BUILD=0
NO_SEED=0
INSTALL_SYSTEM_DEPS=0

usage() {
  cat <<'EOF'
Usage: start.sh [options]

Options:
  --no-nginx              Skip host nginx route install
  --no-build              Skip npm/vite/python builds
  --no-seed               No-op for this demo (DB seeded via SQL migrations)
  --seed                  No-op for this demo
  --install-system-deps   Install Node 20+, python3-venv, pm2 (first machine)
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-nginx) NO_NGINX=1; shift ;;
    --no-build) NO_BUILD=1; shift ;;
    --no-seed|--seed) NO_SEED=1; shift ;;
    --install-system-deps) INSTALL_SYSTEM_DEPS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

ensure_env_files() {
  if [[ ! -f "${ROOT}/.env" ]]; then
    if [[ -f "${ROOT}/deploy/.env.example" ]]; then
      cp "${ROOT}/deploy/.env.example" "${ROOT}/.env"
      echo "Created .env from deploy/.env.example"
    elif [[ -f "${ROOT}/.env.example" ]]; then
      cp "${ROOT}/.env.example" "${ROOT}/.env"
      echo "Created .env from .env.example"
    else
      echo "ERROR: missing .env and deploy/.env.example" >&2
      exit 1
    fi
  fi

  ensure_ai_env_file "${ROOT}"
  apply_ai_env_defaults "${ROOT}/config/ai.env" "${ROOT}/config/ai-defaults.env"
}

generate_secrets_if_needed() {
  local env_file="${ROOT}/.env"
  local jwt internal

  jwt="$(env_value "${env_file}" JWT_SECRET)"
  internal="$(env_value "${env_file}" INTERNAL_API_KEY)"

  if [[ -z "${jwt}" ]] || [[ "${jwt}" == change-me* ]] || [[ "${jwt}" == dev-only* ]]; then
    jwt="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 64)"
    set_env_value "${env_file}" JWT_SECRET "${jwt}"
    echo "Generated JWT_SECRET"
  fi

  if [[ -z "${internal}" ]] || [[ "${internal}" == change-me* ]] || [[ "${internal}" == dev-internal* ]]; then
    internal="$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p -c 48)"
    set_env_value "${env_file}" INTERNAL_API_KEY "${internal}"
    echo "Generated INTERNAL_API_KEY"
  fi
}

ensure_node() {
  local major="${NODE_MAJOR:-20}"
  if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: node not found. Install Node ${major}+ or rerun with --install-system-deps." >&2
    exit 1
  fi
  local ver
  ver="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [[ "${ver}" -lt "${major}" ]]; then
    echo "ERROR: Node ${major}+ required (found ${ver})." >&2
    exit 1
  fi
}

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  echo "Installing pm2 globally..."
  npm install -g pm2
}

install_system_deps() {
  if [[ "$(id -u)" -ne 0 ]] && command -v sudo >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y curl ca-certificates gnupg python3 python3-venv python3-pip unzip
    if ! command -v node >/dev/null 2>&1; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi
  else
    echo "WARN: --install-system-deps needs apt + sudo on Ubuntu." >&2
  fi
  ensure_pm2
}

wait_for_health() {
  local port host url i
  source_env_files "${ROOT}"
  host="${HOST:-127.0.0.1}"
  port="${PORT:-11110}"
  url="http://${host}:${port}/api/v1/health"

  echo "Waiting for ${url} ..."
  for i in $(seq 1 60); do
    if curl -sf "${url}" >/dev/null 2>&1; then
      echo "API healthy."
      return 0
    fi
    sleep 2
  done
  echo "ERROR: API did not become healthy within 120s." >&2
  pm2 logs intake-api --lines 50 || true
  exit 1
}

ensure_env_files
generate_secrets_if_needed

if [[ "${INSTALL_SYSTEM_DEPS}" -eq 1 ]]; then
  install_system_deps
fi

ensure_node
ensure_pm2

BUILD_ARGS=(--pm2)
if [[ "${NO_BUILD}" -eq 1 ]]; then
  BUILD_ARGS=(--no-build --pm2)
fi

bash "${ROOT}/run-production.sh" "${BUILD_ARGS[@]}"

wait_for_health

if [[ "${NO_NGINX}" -eq 0 ]] && [[ "${NGINX_MANAGED:-1}" != "0" ]]; then
  bash "${ROOT}/deploy/configure-nginx.sh"
elif [[ "${NGINX_MANAGED:-1}" == "0" ]]; then
  echo "Skipping nginx (NGINX_MANAGED=0 — add /etc/nginx/routes/${NGINX_ROUTE:-intake}.conf manually)."
else
  echo "Skipping nginx (--no-nginx)."
fi

source_env_files "${ROOT}"
ROUTE="${NGINX_ROUTE:-intake}"
DOMAIN="${NGINX_DOMAIN:-client-demo.inapp.com}"
PORT="${PORT:-11110}"
HOST="${HOST:-127.0.0.1}"

echo ""
echo "====================================================="
echo "Intake demo (PM2) is running."
echo "  Loopback API: http://${HOST}:${PORT}/api/v1/health"
echo "  Public URL:   https://${DOMAIN}/${ROUTE}/"
echo ""
echo "Next steps (once per deploy user):"
echo "  pm2 save"
echo "  pm2 startup   # run the printed sudo command"
echo "====================================================="

if [[ "${NO_SEED}" -eq 0 ]]; then
  :
fi
