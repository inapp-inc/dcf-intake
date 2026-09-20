#!/usr/bin/env bash
# Package child welfare intake demo stack for Docker Compose deployment.
# Produces intake-demo.zip for demo/scripts/deploy-docker.sh on the target host.
#
# Includes demo/.env when present (HF token + secrets). Never put real tokens in .env.example.
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "${DEMO_DIR}/.." && pwd)"
ARCHIVE_PATH="${1:-"${ROOT_DIR}/dist/intake-demo.zip"}"
AI_DEFAULTS="${DEMO_DIR}/config/ai-defaults.env"

# shellcheck disable=SC1091
source "${DEMO_DIR}/scripts/lib/env-helpers.sh"

command -v zip >/dev/null 2>&1 || {
  echo "zip is required to create the deployment archive." >&2
  exit 1
}

"${DEMO_DIR}/scripts/verify-before-package.sh"

if [[ ! -f "${DEMO_DIR}/.env" ]]; then
  echo "ERROR: demo/.env is required for packaging (copy from .env.example)." >&2
  exit 1
fi
ensure_ai_env_file "${DEMO_DIR}"
apply_ai_env_defaults "${DEMO_DIR}/config/ai.env" "${AI_DEFAULTS}"
if ! validate_ai_env "${DEMO_DIR}/config/ai.env"; then
  echo "ERROR: Fix config/ai.env before packaging (HF_API_TOKEN or Ollama settings)." >&2
  exit 1
fi

load_ai_defaults "${AI_DEFAULTS}"

VERSION="0.1.0"
if [[ -f "${DEMO_DIR}/api/package.json" ]]; then
  VERSION="$(node -p "require('${DEMO_DIR}/api/package.json').version" 2>/dev/null || echo 0.1.0)"
fi

GIT_SHA="nogit"
if command -v git >/dev/null 2>&1 && git -C "${ROOT_DIR}" rev-parse --short HEAD >/dev/null 2>&1; then
  GIT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
fi

STAGING="$(mktemp -d)"
trap 'rm -rf "${STAGING}"' EXIT
PKG_ROOT="${STAGING}/intake-demo"
mkdir -p "${PKG_ROOT}"

INCLUDE_PATHS=(
  "api"
  "frontend"
  "worker"
  "ai-bundle"
  "nginx"
  "config"
  "docker-compose.yml"
  ".env.example"
  "README.md"
  "scripts"
)

copy_tree() {
  local rel="$1"
  local src="${DEMO_DIR}/${rel}"
  local dest="${PKG_ROOT}/${rel}"
  if [[ ! -e "${src}" ]]; then
    echo "WARN: missing ${rel}, skipping" >&2
    return
  fi
  mkdir -p "$(dirname "${dest}")"
  if [[ -d "${src}" ]]; then
    if command -v rsync >/dev/null 2>&1; then
      rsync -a \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude 'build' \
        --exclude '.env' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.pytest_cache' \
        --exclude '.git' \
        "${src}/" "${dest}/"
    else
      cp -R "${src}" "$(dirname "${dest}")/"
    fi
  else
    cp "${src}" "${dest}"
  fi
}

for p in "${INCLUDE_PATHS[@]}"; do
  copy_tree "${p}"
done

cp "${DEMO_DIR}/.env" "${PKG_ROOT}/.env"
cp "${DEMO_DIR}/config/ai.env" "${PKG_ROOT}/config/ai.env"
echo "Included demo/.env and config/ai.env in deployment package"

chmod +x "${PKG_ROOT}/scripts/"*.sh 2>/dev/null || true
chmod +x "${PKG_ROOT}/scripts/lib/"*.sh 2>/dev/null || true
chmod +x "${PKG_ROOT}/start.sh" "${PKG_ROOT}/run-production.sh" 2>/dev/null || true
chmod +x "${PKG_ROOT}/deploy/"*.sh 2>/dev/null || true

echo "Normalizing LF line endings in package (all *.sh / *.cjs)..."
normalize_lf_tree "${PKG_ROOT}"

PKG_PORT="$(env_value "${DEMO_DIR}/.env" AIT_HTTP_PORT)"
PKG_PORT="${PKG_PORT:-11111}"

cat > "${PKG_ROOT}/DEPLOY_README.txt" <<EOF
Child Welfare Intake Demo Docker package (SQLite + Hugging Face AI)
version=${VERSION} git=${GIT_SHA} built=$(date -u +%Y-%m-%dT%H:%M:%SZ)

Deploy on the destination host:
  ./scripts/deploy-docker.sh /path/to/intake-demo.zip

Stack: 3 containers — nginx+frontend, api (SQLite), ai-bundle (pipeline worker)
  All AI (ASR + LLM) runs on Hugging Face — no local model RAM.

Public URL (default): https://client-demo.inapp.com/intake/
  APP_BASE_PATH=/intake
  Host nginx: proxy_pass http://127.0.0.1:${PKG_PORT}/intake/

This package includes .env + config/ai.env (AI provider + models).
  Provider: $(env_value "${DEMO_DIR}/config/ai.env" LLM_PROVIDER)
  LLM: $(env_value "${DEMO_DIR}/config/ai.env" HF_MODEL)
  ASR: $(env_value "${DEMO_DIR}/config/ai.env" HF_ASR_MODEL)

Scripts (in scripts/):
  deploy-docker.sh      — install from zip (+ host nginx route if sudo)
  install-host-nginx.sh — /etc/nginx/routes/<route>.conf on client-demo host
  package-docker.sh     — rebuild zip (on build machine)
  redeploy.sh           — patch api|frontend|ai-bundle after code changes
  smoke.sh              — health + auth smoke test
  up.sh                 — local compose up (when already extracted)

After code edits on the VM:
  cd /var/www/intake-demo/intake-demo && ./scripts/redeploy.sh api
  ./scripts/smoke.sh

Data volume: demo-data (SQLite + artifacts only)
EOF

mkdir -p "$(dirname "$ARCHIVE_PATH")"
rm -f "$ARCHIVE_PATH"
(
  cd "${STAGING}"
  zip -rq "$ARCHIVE_PATH" intake-demo \
    -x "*/node_modules/*" \
    -x "*/dist/*" \
    -x "*/__pycache__/*"
)

echo "Created $ARCHIVE_PATH"
echo "Deploy on target: scripts/deploy-docker.sh $ARCHIVE_PATH"
