#!/usr/bin/env bash
# Deploy DCF AIT from package-docker.sh archive via Docker Compose.
# Modeled on presales deploy-docker.sh — host ports 4010-4015; external Postgres by default.
set -euo pipefail

ARCHIVE_PATH=""
APP_NAME="${APP_NAME:-dcf-ait}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/dcf-ait}"
ENV_FILE_OVERRIDE="${ENV_FILE:-}"
RUN_SMOKE="${RUN_SMOKE:-1}"
SKIP_BUILD="${SKIP_BUILD:-0}"
USE_BUNDLED_DB=0

# Override before deploy, e.g.:
#   DATABASE_URL=postgresql://foundry:foundry@127.0.0.1:5432/appdb ./scripts/deploy-docker.sh dist/dcf-ait-docker.zip
EXTERNAL_DATABASE_URL="${DATABASE_URL:-postgresql://foundry:foundry@host.docker.internal:5432/appdb}"

# Default port block (4010-4015; 4015 reserved for bundled Postgres only)
AIT_HTTP_PORT="${AIT_HTTP_PORT:-4010}"
AIT_HTTPS_PORT="${AIT_HTTPS_PORT:-4011}"
AIT_API_PORT="${AIT_API_PORT:-4012}"
MINIO_HOST_PORT="${MINIO_HOST_PORT:-4013}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-4014}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-4015}"

# Subpath behind Foundry gateway: https://foundry.inapp.com/dcfintake/
APP_BASE_PATH="${APP_BASE_PATH:-/dcfintake}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-https://foundry.inapp.com}"
VITE_BASE_PATH="${VITE_BASE_PATH:-${APP_BASE_PATH}/}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-${APP_BASE_PATH}/api/v1}"
BEHIND_REVERSE_PROXY="${BEHIND_REVERSE_PROXY:-1}"

usage() {
  cat <<'EOF'
Usage: deploy-docker.sh [options] /path/to/dcf-ait-docker.zip

Options:
  --bundled-db          Start bundled Postgres container (profile bundled-db) on port 4015
  --skip-build          docker compose build skipped
  --no-smoke            Skip post-deploy smoke.sh
  --install-dir DIR     Extract target (default: /var/www/dcf-ait)
  --env-file PATH       Use/write this .env instead of codebase/deploy/.env

Environment:
  DATABASE_URL          External Postgres URL (127.0.0.1 rewritten to host.docker.internal)
  USE_EXTERNAL_POSTGRES Set to 0 with --bundled-db

Default: external Postgres at postgresql://foundry:foundry@host.docker.internal:5432/appdb

Public URL defaults (Foundry):
  APP_BASE_PATH=/dcfintake  →  https://foundry.inapp.com/dcfintake/
  CORS_ORIGIN=https://foundry.inapp.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bundled-db) USE_BUNDLED_DB=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --no-smoke) RUN_SMOKE=0; shift ;;
    --install-dir) DEPLOY_ROOT="$2"; shift 2 ;;
    --env-file) ENV_FILE_OVERRIDE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *.zip) ARCHIVE_PATH="$1"; shift ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

command -v docker >/dev/null 2>&1 || {
  echo "docker is required on the destination host." >&2
  exit 1
}
command -v unzip >/dev/null 2>&1 || {
  echo "unzip is required on the destination host." >&2
  exit 1
}
docker compose version >/dev/null 2>&1 || {
  echo "docker compose plugin is required on the destination host." >&2
  exit 1
}

env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  awk -F= -v key="$key" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      sub(/^[^=]*=/, "", $0)
      gsub(/^["'\'']|["'\'']$/, "", $0)
      print $0
      exit
    }
  ' "$file"
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp="${file}.tmp"
  if [[ -f "$file" ]] && grep -qE "^${key}=" "$file"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { replaced = 0 }
      $0 ~ "^" key "=" {
        print key "=" value
        replaced = 1
        next
      }
      { print }
      END {
        if (!replaced) print key "=" value
      }
    ' "$file" > "$tmp"
    mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

normalize_database_url() {
  local url="$1"
  url="${url/@127.0.0.1:/@host.docker.internal:}"
  url="${url/@localhost:/@host.docker.internal:}"
  echo "$url"
}

is_port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ! ss -ltn "( sport = :$port )" | grep -q ":$port"
  elif command -v netstat >/dev/null 2>&1; then
    ! netstat -ltn | grep -q ":$port "
  else
    ! (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
  fi
}

port_taken() {
  local port="$1"
  shift
  for used in "$@"; do
    [[ "$used" == "$port" ]] && return 0
  done
  return 1
}

choose_unique_port() {
  local preferred="$1"
  local port_min="$2"
  local port_max="$3"
  shift 3
  local used=("$@")
  if [[ "$preferred" =~ ^[0-9]+$ ]] && is_port_free "$preferred" && ! port_taken "$preferred" "${used[@]}"; then
    echo "$preferred"
    return 0
  fi
  for port in $(seq "$port_min" "$port_max"); do
    if is_port_free "$port" && ! port_taken "$port" "${used[@]}"; then
      echo "$port"
      return 0
    fi
  done
  echo "No free port found in ${port_min}-${port_max}." >&2
  return 1
}

verify_external_postgres() {
  local host="${1:-host.docker.internal}"
  local port="${2:-5432}"
  echo "Checking host Postgres at ${host}:${port} from Docker…"
  if docker run --rm --add-host=host.docker.internal:host-gateway alpine:3.20 \
    sh -c "nc -z ${host} ${port}" >/dev/null 2>&1; then
    echo "  Postgres port reachable from container network"
    return 0
  fi
  echo "WARN: cannot reach ${host}:${port} from Docker (is Postgres listening on the host?)" >&2
  return 1
}

if [[ -z "$ARCHIVE_PATH" ]] || [[ ! -f "$ARCHIVE_PATH" ]]; then
  usage >&2
  exit 1
fi
ARCHIVE_PATH="$(cd "$(dirname "$ARCHIVE_PATH")" && pwd)/$(basename "$ARCHIVE_PATH")"

mkdir -p "$DEPLOY_ROOT"
unzip -oq "$ARCHIVE_PATH" -d "$DEPLOY_ROOT"

ROOT="${DEPLOY_ROOT}/dcf-ait"
if [[ ! -d "${ROOT}/codebase/deploy" ]]; then
  ROOT="${DEPLOY_ROOT}"
fi

DEPLOY="${ROOT}/codebase/deploy"
if [[ ! -f "${DEPLOY}/docker-compose.yml" ]]; then
  echo "ERROR: docker-compose.yml not found under ${DEPLOY}" >&2
  exit 1
fi
if [[ ! -f "${DEPLOY}/docker-compose.external-db.yml" ]]; then
  echo "ERROR: docker-compose.external-db.yml missing — repackage with current package-docker.sh" >&2
  exit 1
fi
if [[ ! -x "${DEPLOY}/scripts/compose-up.sh" ]] && [[ ! -f "${DEPLOY}/scripts/compose-up.sh" ]]; then
  echo "ERROR: scripts/compose-up.sh missing — repackage with current package-docker.sh" >&2
  exit 1
fi

ENV_FILE="${ENV_FILE_OVERRIDE:-${DEPLOY}/.env}"

PORT_MAX=4015
if [[ "${USE_BUNDLED_DB}" -eq 0 ]]; then
  PORT_MAX=4014
fi

USED=()
AIT_HTTP_PORT="$(choose_unique_port "${AIT_HTTP_PORT}" 4010 "${PORT_MAX}" "${USED[@]}")"; USED+=("$AIT_HTTP_PORT")
AIT_HTTPS_PORT="$(choose_unique_port "${AIT_HTTPS_PORT}" 4010 "${PORT_MAX}" "${USED[@]}")"; USED+=("$AIT_HTTPS_PORT")
AIT_API_PORT="$(choose_unique_port "${AIT_API_PORT}" 4010 "${PORT_MAX}" "${USED[@]}")"; USED+=("$AIT_API_PORT")
MINIO_HOST_PORT="$(choose_unique_port "${MINIO_HOST_PORT}" 4010 "${PORT_MAX}" "${USED[@]}")"; USED+=("$MINIO_HOST_PORT")
MINIO_CONSOLE_PORT="$(choose_unique_port "${MINIO_CONSOLE_PORT}" 4010 "${PORT_MAX}" "${USED[@]}")"; USED+=("$MINIO_CONSOLE_PORT")

if [[ ! -f "$ENV_FILE" ]]; then
  JWT_SECRET_VALUE="$(openssl rand -hex 32 2>/dev/null || date +%s%N)"
  INTERNAL_KEY_VALUE="$(openssl rand -hex 24 2>/dev/null || date +%s%N)"
  MINIO_PASS="$(openssl rand -hex 16 2>/dev/null || date +%s%N)"
  cp "${DEPLOY}/.env.example" "$ENV_FILE"
  set_env_value "$ENV_FILE" "JWT_SECRET" "$JWT_SECRET_VALUE"
  set_env_value "$ENV_FILE" "INTERNAL_API_KEY" "$INTERNAL_KEY_VALUE"
  set_env_value "$ENV_FILE" "MINIO_ROOT_PASSWORD" "$MINIO_PASS"
  echo "Created ${ENV_FILE} with generated secrets"
else
  echo "Using existing env file: ${ENV_FILE}"
fi

set_env_value "$ENV_FILE" "AIT_HTTP_PORT" "$AIT_HTTP_PORT"
set_env_value "$ENV_FILE" "AIT_HTTPS_PORT" "$AIT_HTTPS_PORT"
set_env_value "$ENV_FILE" "AIT_API_PORT" "$AIT_API_PORT"
set_env_value "$ENV_FILE" "MINIO_HOST_PORT" "$MINIO_HOST_PORT"
set_env_value "$ENV_FILE" "MINIO_CONSOLE_PORT" "$MINIO_CONSOLE_PORT"
set_env_value "$ENV_FILE" "APP_BASE_PATH" "$APP_BASE_PATH"
set_env_value "$ENV_FILE" "PUBLIC_ORIGIN" "$PUBLIC_ORIGIN"
set_env_value "$ENV_FILE" "VITE_BASE_PATH" "$VITE_BASE_PATH"
set_env_value "$ENV_FILE" "VITE_API_BASE_URL" "$VITE_API_BASE_URL"
set_env_value "$ENV_FILE" "BEHIND_REVERSE_PROXY" "$BEHIND_REVERSE_PROXY"
set_env_value "$ENV_FILE" "CORS_ORIGIN" "${CORS_ORIGIN:-${PUBLIC_ORIGIN}}"
set_env_value "$ENV_FILE" "NODE_ENV" "production"

if [[ "${USE_BUNDLED_DB}" -eq 1 ]]; then
  set_env_value "$ENV_FILE" "USE_EXTERNAL_POSTGRES" "0"
  set_env_value "$ENV_FILE" "DATABASE_URL" ""
  POSTGRES_HOST_PORT="$(choose_unique_port "${POSTGRES_HOST_PORT}" 4010 4015 "${USED[@]}")"
  set_env_value "$ENV_FILE" "POSTGRES_HOST_PORT" "$POSTGRES_HOST_PORT"
  if [[ -z "$(env_value "$ENV_FILE" POSTGRES_PASSWORD || true)" ]]; then
    set_env_value "$ENV_FILE" "POSTGRES_PASSWORD" "$(openssl rand -hex 16 2>/dev/null || date +%s%N)"
  fi
  if [[ -z "$(env_value "$ENV_FILE" POSTGRES_USER || true)" ]]; then
    set_env_value "$ENV_FILE" "POSTGRES_USER" "ait"
  fi
  if [[ -z "$(env_value "$ENV_FILE" POSTGRES_DB || true)" ]]; then
    set_env_value "$ENV_FILE" "POSTGRES_DB" "ait"
  fi
  echo "Database mode: bundled Postgres (COMPOSE_PROFILES=bundled-db)"
else
  DB_URL="$(normalize_database_url "${EXTERNAL_DATABASE_URL}")"
  if [[ -n "$(env_value "$ENV_FILE" DATABASE_URL || true)" ]] && [[ -z "${DATABASE_URL:-}" ]]; then
    DB_URL="$(normalize_database_url "$(env_value "$ENV_FILE" DATABASE_URL)")"
  fi
  set_env_value "$ENV_FILE" "DATABASE_URL" "$DB_URL"
  set_env_value "$ENV_FILE" "USE_EXTERNAL_POSTGRES" "1"
  echo "Database mode: external Postgres"
  echo "  DATABASE_URL=${DB_URL}"
  verify_external_postgres host.docker.internal 5432 || true
fi

CERT_SCRIPT="${DEPLOY}/scripts/gen-dev-certs.sh"
if [[ "${BEHIND_REVERSE_PROXY}" != "1" ]] && [[ -x "${CERT_SCRIPT}" ]]; then
  "${CERT_SCRIPT}" "${DEPLOY}/nginx/certs"
elif [[ "${BEHIND_REVERSE_PROXY}" == "1" ]]; then
  echo "BEHIND_REVERSE_PROXY=1 — skipping container TLS certs (host nginx terminates HTTPS)"
fi

chmod +x "${DEPLOY}/scripts/"*.sh 2>/dev/null || true
[[ -x "${ROOT}/scripts/deploy-docker.sh" ]] || chmod +x "${ROOT}/scripts/deploy-docker.sh" 2>/dev/null || true

cd "${DEPLOY}"
export DOCKER_BUILDKIT=1

COMPOSE_UP="${DEPLOY}/scripts/compose-up.sh"
if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  "${COMPOSE_UP}" build
fi
"${COMPOSE_UP}" up -d

APP_BASE_PATH="${APP_BASE_PATH%/}"
UI_URL="https://localhost:${AIT_HTTPS_PORT}${APP_BASE_PATH}/"
API_URL="https://localhost:${AIT_HTTPS_PORT}${APP_BASE_PATH}/api/v1"
PUBLIC_UI_URL="${PUBLIC_ORIGIN}${APP_BASE_PATH}/"
API_DIRECT="http://127.0.0.1:${AIT_API_PORT}/api/v1"

if [[ "${USE_BUNDLED_DB}" -eq 1 ]]; then
  PG_LINE="  Postgres:         ${POSTGRES_HOST_PORT} → bundled container :5432"
else
  PG_LINE="  Postgres:         external — $(env_value "$ENV_FILE" DATABASE_URL || true)"
fi

cat <<EOF

Deployed ${APP_NAME}
Deploy dir: ${DEPLOY}
Env file:   ${ENV_FILE}

Host ports:
  HTTP redirect:  ${AIT_HTTP_PORT}  → nginx :80
  HTTPS UI:       ${AIT_HTTPS_PORT} → nginx :443
  API (direct):   ${AIT_API_PORT}  → api :8080
  MinIO S3:         ${MINIO_HOST_PORT}  → minio :9000
  MinIO console:    ${MINIO_CONSOLE_PORT} → minio :9001
${PG_LINE}

UI (local):    ${UI_URL}
UI (Foundry):  ${PUBLIC_UI_URL}
API:           ${API_URL}
Health:        ${API_URL}/health
Direct:        ${API_DIRECT}/health

Migrations run automatically when the API container starts (schema in codebase/api/migrations).

Host nginx (existing on VM): see codebase/deploy/nginx/foundry-gateway.example.conf
  proxy_pass http://127.0.0.1:${AIT_HTTP_PORT}${APP_BASE_PATH}/;
  (set BEHIND_REVERSE_PROXY=1 in .env — default for deploy-docker.sh)
EOF

if [[ "${RUN_SMOKE}" -eq 1 ]] && [[ -x "${DEPLOY}/scripts/smoke.sh" ]]; then
  echo ""
  echo "Waiting for stack health (up to 120s)…"
  for _ in $(seq 1 24); do
    if curl -skf "${API_URL}/health" >/dev/null 2>&1 || curl -sf "${API_DIRECT}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 5
  done
  # shellcheck disable=SC1091
  set -a && source "$ENV_FILE" && set +a
  "${DEPLOY}/scripts/smoke.sh" || {
    echo "WARN: smoke checks failed — stack may still be starting (Ollama model pull or DB migrations)." >&2
    exit 1
  }
fi
