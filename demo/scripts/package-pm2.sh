#!/usr/bin/env bash
# Package child welfare intake demo for PM2 deployment (no Docker).
# Produces intake-demo-pm2.zip with flat install-root layout.
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "${DEMO_DIR}/.." && pwd)"
ARCHIVE_PATH="${1:-"${ROOT_DIR}/dist/intake-demo-pm2.zip"}"
AI_DEFAULTS="${DEMO_DIR}/config/ai-defaults.env"

# shellcheck disable=SC1091
source "${DEMO_DIR}/scripts/lib/env-helpers.sh"

command -v zip >/dev/null 2>&1 || {
  echo "zip is required to create the deployment archive." >&2
  exit 1
}

"${DEMO_DIR}/scripts/verify-before-package.sh"

ensure_local_env_files() {
  if [[ ! -f "${DEMO_DIR}/.env" ]]; then
    if [[ -f "${DEMO_DIR}/deploy/.env.example" ]]; then
      cp "${DEMO_DIR}/deploy/.env.example" "${DEMO_DIR}/.env"
      echo "Created demo/.env from deploy/.env.example"
    elif [[ -f "${DEMO_DIR}/.env.example" ]]; then
      cp "${DEMO_DIR}/.env.example" "${DEMO_DIR}/.env"
      echo "Created demo/.env from .env.example"
    else
      echo "ERROR: demo/.env missing and no deploy/.env.example or .env.example found." >&2
      exit 1
    fi
  fi
  ensure_ai_env_file "${DEMO_DIR}"
}

ensure_local_env_files
apply_ai_env_defaults "${DEMO_DIR}/config/ai.env" "${AI_DEFAULTS}"
if ! validate_ai_env "${DEMO_DIR}/config/ai.env"; then
  echo "ERROR: Fix config/ai.env before packaging (HF_API_TOKEN or Ollama settings)." >&2
  exit 1
fi

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

copy_tree() {
  local rel="$1"
  local src="${DEMO_DIR}/${rel}"
  local dest="${STAGING}/${rel}"
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
        --exclude '.venv' \
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

INCLUDE_PATHS=(
  "api"
  "frontend"
  "worker"
  "config"
  "deploy"
  "scripts/lib/env-helpers.sh"
  "scripts/lib/nginx-route.sh"
  "scripts/smoke.sh"
  "scripts/package-pm2.sh"
  "scripts/deploy-pm2.sh"
  "start.sh"
  "run-production.sh"
  "README-SERVER.txt"
  "README.md"
  "docs/DEPLOY-RUNBOOK.md"
  ".env.example"
  ".gitattributes"
)

for p in "${INCLUDE_PATHS[@]}"; do
  copy_tree "${p}"
done

mkdir -p "${STAGING}/data/artifacts" "${STAGING}/logs"
cp "${DEMO_DIR}/.env" "${STAGING}/.env"
cp "${DEMO_DIR}/config/ai.env" "${STAGING}/config/ai.env"
echo "Included demo/.env and config/ai.env in PM2 package"

chmod +x "${STAGING}/start.sh" "${STAGING}/run-production.sh" 2>/dev/null || true
chmod +x "${STAGING}/deploy/"*.sh 2>/dev/null || true
chmod +x "${STAGING}/scripts/"*.sh 2>/dev/null || true
chmod +x "${STAGING}/scripts/lib/"*.sh 2>/dev/null || true

normalize_lf() {
  local f
  for f in "$@"; do
    [[ -f "$f" ]] || continue
    if command -v dos2unix >/dev/null 2>&1; then
      dos2unix -q "$f" 2>/dev/null || true
    else
      sed -i 's/\r$//' "$f" 2>/dev/null || sed -i '' 's/\r$//' "$f" 2>/dev/null || true
    fi
  done
}

normalize_lf \
  "${STAGING}/start.sh" \
  "${STAGING}/run-production.sh" \
  "${STAGING}/deploy/configure-nginx.sh" \
  "${STAGING}/scripts/smoke.sh" \
  "${STAGING}/scripts/deploy-pm2.sh" \
  "${STAGING}/scripts/package-pm2.sh"

PKG_PORT="$(env_value "${DEMO_DIR}/.env" PORT)"
PKG_PORT="${PKG_PORT:-11110}"
ROUTE="$(env_value "${DEMO_DIR}/.env" APP_BASE_PATH)"
ROUTE="${ROUTE:-/intake}"
ROUTE="${ROUTE#/}"
ROUTE="${ROUTE%/}"

cat > "${STAGING}/DEPLOY_README.txt" <<EOF
Child Welfare Intake Demo PM2 package (SQLite + Hugging Face AI)
version=${VERSION} git=${GIT_SHA} built=$(date -u +%Y-%m-%dT%H:%M:%SZ)

Deploy on the destination host:
  sudo bash start.sh

Processes: intake-api (Node :${PKG_PORT}), intake-worker (Python)
  Host nginx serves frontend/dist and proxies /${ROUTE}/api/ → loopback API.

Public URL (default): https://client-demo.inapp.com/${ROUTE}/

This package includes .env + config/ai.env (AI provider + models).
  Provider: $(env_value "${DEMO_DIR}/config/ai.env" LLM_PROVIDER)
  LLM: $(env_value "${DEMO_DIR}/config/ai.env" HF_MODEL)
  ASR: $(env_value "${DEMO_DIR}/config/ai.env" HF_ASR_MODEL)

See README-SERVER.txt and docs/DEPLOY-RUNBOOK.md
EOF

mkdir -p "$(dirname "$ARCHIVE_PATH")"
rm -f "$ARCHIVE_PATH"
(
  cd "${STAGING}"
  zip -rq "$ARCHIVE_PATH" . \
    -x "*/node_modules/*" \
    -x "*/dist/*" \
    -x "*/.venv/*" \
    -x "*/__pycache__/*"
)

echo "Created $ARCHIVE_PATH"
echo "Deploy on target: unzip -d /var/www/intake-demo && cd /var/www/intake-demo && sudo bash start.sh"
