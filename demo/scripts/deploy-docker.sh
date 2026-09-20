#!/usr/bin/env bash
# Deploy child welfare intake demo stack from package-docker.sh archive.
# SQLite + filesystem artifacts; pipeline worker in ai-bundle; all AI on Hugging Face.
set -euo pipefail

ARCHIVE_PATH=""
APP_NAME="${APP_NAME:-intake-demo}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/intake-demo}"
ENV_FILE_OVERRIDE="${ENV_FILE:-}"
RUN_SMOKE="${RUN_SMOKE:-1}"
SKIP_BUILD="${SKIP_BUILD:-0}"
INSTALL_HOST_NGINX="${INSTALL_HOST_NGINX:-1}"

AIT_HTTP_PORT="${AIT_HTTP_PORT:-11111}"
APP_BASE_PATH="${APP_BASE_PATH:-/intake}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-https://client-demo.inapp.com}"
VITE_BASE_PATH="${VITE_BASE_PATH:-${APP_BASE_PATH}/}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-${APP_BASE_PATH}/api/v1}"
HF_ASR_API_URL="${HF_ASR_API_URL:-}"

usage() {
  cat <<'EOF'
Usage: deploy-docker.sh [options] /path/to/intake-demo.zip

Options:
  --skip-build          Skip docker compose build
  --no-smoke            Skip post-deploy smoke.sh
  --skip-nginx          Skip host nginx route install (/etc/nginx/routes)
  --install-dir DIR     Extract parent directory (default: /var/www/intake-demo)
  --env-file PATH       Use/write this .env instead of ./.env in install tree

Environment (optional overrides — packaged .env is used when present):
  AIT_HTTP_PORT         Host port for app nginx HTTP (default 11111)
  APP_BASE_PATH         URL prefix (default /intake)
  PUBLIC_ORIGIN         https://client-demo.inapp.com
  HF_API_TOKEN          Override Hugging Face token
  LLM_PROVIDER          huggingface (default)
  HF_MODEL              LLM model (default meta-llama/Llama-3.1-8B-Instruct)
  HF_ASR_MODEL          ASR model (default openai/whisper-large-v3)
  INSTALL_HOST_NGINX    1 (default) — write /etc/nginx/routes/<route>.conf

Host nginx: installed automatically unless --skip-nginx (requires sudo).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --no-smoke) RUN_SMOKE=0; shift ;;
    --skip-nginx) INSTALL_HOST_NGINX=0; shift ;;
    --install-dir) DEPLOY_ROOT="$2"; shift 2 ;;
    --env-file) ENV_FILE_OVERRIDE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *.zip) ARCHIVE_PATH="$1"; shift ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

command -v docker >/dev/null 2>&1 || { echo "docker is required." >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unzip is required." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose plugin is required." >&2; exit 1; }

if [[ -z "$ARCHIVE_PATH" ]] || [[ ! -f "$ARCHIVE_PATH" ]]; then
  usage >&2
  exit 1
fi
ARCHIVE_PATH="$(cd "$(dirname "$ARCHIVE_PATH")" && pwd)/$(basename "$ARCHIVE_PATH")"

is_port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ! ss -ltn "( sport = :$port )" | grep -q ":$port"
  else
    true
  fi
}

choose_http_port() {
  local preferred="$1"
  if is_port_free "$preferred"; then
    echo "$preferred"
    return
  fi
  local p
  for p in $(seq 11111 11116); do
    if is_port_free "$p"; then
      echo "$p"
      return
    fi
  done
  echo "No free port in 11111-11116." >&2
  exit 1
}

mkdir -p "$DEPLOY_ROOT"
unzip -oq "$ARCHIVE_PATH" -d "$DEPLOY_ROOT"

ROOT="${DEPLOY_ROOT}/intake-demo"
if [[ ! -f "${ROOT}/docker-compose.yml" ]]; then
  ROOT="${DEPLOY_ROOT}"
fi

if [[ ! -f "${ROOT}/docker-compose.yml" ]]; then
  echo "ERROR: docker-compose.yml not found under ${DEPLOY_ROOT}" >&2
  exit 1
fi

# Strip CRLF from Windows-packaged zip before running any bash script
find "${ROOT}" -type f \( -name '*.sh' -o -name '*.bash' -o -name '*.cjs' \) \
  -exec sed -i 's/\r$//' {} + 2>/dev/null \
  || find "${ROOT}" -type f \( -name '*.sh' -o -name '*.bash' -o -name '*.cjs' \) \
  -exec sed -i '' 's/\r$//' {} + 2>/dev/null || true

# shellcheck disable=SC1091
source "${ROOT}/scripts/lib/env-helpers.sh"
AI_DEFAULTS="${ROOT}/config/ai-defaults.env"
AI_ENV_FILE="${ROOT}/config/ai.env"
load_ai_defaults "${AI_DEFAULTS}"

ENV_FILE="${ENV_FILE_OVERRIDE:-${ROOT}/.env}"
ensure_ai_env_file "${ROOT}"
AIT_HTTP_PORT="$(choose_http_port "${AIT_HTTP_PORT}")"

if [[ ! -f "$ENV_FILE" ]]; then
  JWT_SECRET_VALUE="$(openssl rand -hex 32 2>/dev/null || date +%s%N)"
  INTERNAL_KEY_VALUE="$(openssl rand -hex 24 2>/dev/null || date +%s%N)"
  cp "${ROOT}/.env.example" "$ENV_FILE"
  set_env_value "$ENV_FILE" "JWT_SECRET" "$JWT_SECRET_VALUE"
  set_env_value "$ENV_FILE" "INTERNAL_API_KEY" "$INTERNAL_KEY_VALUE"
  echo "Created ${ENV_FILE} from .env.example"
  echo "Created ${AI_ENV_FILE} from ai.env.example (set HF_API_TOKEN or LLM_PROVIDER=ollama)"
else
  echo "Using env file: ${ENV_FILE}"
fi

set_env_value "$ENV_FILE" "AIT_HTTP_PORT" "$AIT_HTTP_PORT"
set_env_value "$ENV_FILE" "APP_BASE_PATH" "$APP_BASE_PATH"
set_env_value "$ENV_FILE" "PUBLIC_ORIGIN" "$PUBLIC_ORIGIN"
set_env_value "$ENV_FILE" "VITE_BASE_PATH" "$VITE_BASE_PATH"
set_env_value "$ENV_FILE" "VITE_API_BASE_URL" "$VITE_API_BASE_URL"
set_env_value "$ENV_FILE" "CORS_ORIGIN" "${CORS_ORIGIN:-${PUBLIC_ORIGIN}}"
set_env_value "$ENV_FILE" "NODE_ENV" "production"

apply_ai_env_defaults "$AI_ENV_FILE" "$AI_DEFAULTS"
preserve_hf_token "$AI_ENV_FILE" || true

chmod +x "${ROOT}/scripts/"*.sh 2>/dev/null || true
chmod +x "${ROOT}/scripts/lib/"*.sh 2>/dev/null || true

cd "${ROOT}"
export DOCKER_BUILDKIT=1
# shellcheck disable=SC1091
source_env_files "${ROOT}"

validate_ai_env "$AI_ENV_FILE" || echo "  → Edit ${AI_ENV_FILE} (HF_API_TOKEN or Ollama settings)." >&2

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  docker compose build
fi
docker compose up -d

APP_BASE_PATH="${APP_BASE_PATH%/}"
NGINX_ROUTE="${APP_BASE_PATH#/}"
NGINX_ROUTE="${NGINX_ROUTE%/}"

if [[ "${INSTALL_HOST_NGINX}" -eq 1 ]] && [[ -x "${ROOT}/scripts/install-host-nginx.sh" ]]; then
  echo ""
  if AIT_HTTP_PORT="${AIT_HTTP_PORT}" APP_BASE_PATH="${APP_BASE_PATH}" \
    "${ROOT}/scripts/install-host-nginx.sh" --route "${NGINX_ROUTE}" --port "${AIT_HTTP_PORT}"; then
    :
  else
    echo "WARN: host nginx route not installed (use sudo or --skip-nginx)." >&2
    echo "  Manual: sudo ${ROOT}/scripts/install-host-nginx.sh --port ${AIT_HTTP_PORT}" >&2
  fi
fi

UI_LOCAL="http://127.0.0.1:${AIT_HTTP_PORT}${APP_BASE_PATH}/"
API_LOCAL="http://127.0.0.1:${AIT_HTTP_PORT}${APP_BASE_PATH}/api/v1"
PUBLIC_UI="${PUBLIC_ORIGIN}${APP_BASE_PATH}/"
HF_STATUS="configured"
if [[ "$(env_value "$AI_ENV_FILE" LLM_PROVIDER)" == "ollama" ]]; then
  HF_STATUS="Ollama mode — see OLLAMA_BASE_URL in ${AI_ENV_FILE}"
elif [[ -z "$(env_value "$AI_ENV_FILE" HF_API_TOKEN)" ]]; then
  HF_STATUS="MISSING — set HF_API_TOKEN in ${AI_ENV_FILE}"
fi

if [[ "${INSTALL_HOST_NGINX}" -eq 1 ]]; then
  NGINX_STATUS="Installed /etc/nginx/routes/${NGINX_ROUTE}.conf"
else
  NGINX_STATUS="Skipped — run: sudo ${ROOT}/scripts/install-host-nginx.sh --port ${AIT_HTTP_PORT}"
fi

cat <<EOF

Deployed ${APP_NAME}
Install dir: ${ROOT}
Env files:     ${ENV_FILE}
               ${AI_ENV_FILE}

Host port:
  HTTP (app nginx): ${AIT_HTTP_PORT}  → use for host HTTPS proxy

UI (local):    ${UI_LOCAL}
UI (public):   ${PUBLIC_UI}
Health:        ${API_LOCAL}/health

AI (config/ai.env):
  Provider: ${LLM_PROVIDER:-huggingface}
  LLM: ${HF_MODEL:-$(env_value "$AI_ENV_FILE" HF_MODEL)}
  ASR: ${HF_ASR_MODEL:-$(env_value "$AI_ENV_FILE" HF_ASR_MODEL)}
  Token: ${HF_STATUS}

Host nginx:  ${NGINX_STATUS}
  → http://127.0.0.1:${AIT_HTTP_PORT}${APP_BASE_PATH}/

SQLite DB and artifacts: Docker volume demo-data
AI config: config/ai.env (cloud HF by default; switch to Ollama post-deploy — see docs/VM-RUNBOOK.md).
EOF

if [[ "${RUN_SMOKE}" -eq 1 ]] && [[ -x "${ROOT}/scripts/smoke.sh" ]]; then
  echo ""
  echo "Waiting for API health (up to 180s)…"
  for _ in $(seq 1 36); do
    if curl -sf "${API_LOCAL}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 5
  done
  "${ROOT}/scripts/smoke.sh" || {
    echo "WARN: smoke checks failed — stack may still be starting." >&2
    exit 1
  }
fi
