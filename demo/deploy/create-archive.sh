#!/usr/bin/env bash
# Stage a deploy folder for client-demo.inapp.com — zip it yourself before uploading.
# Output: dist/intake-demo-staging/ (extract flat into /var/www/intake-demo on the server)
# Run from demo/: ./deploy/create-archive.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${ROOT}/.." && pwd)"
STAGING="${REPO_ROOT}/dist/intake-demo-staging"
INSTALL_ROOT="/var/www/intake-demo"
AI_DEFAULTS="${ROOT}/config/ai-defaults.env"
RUN_FULL_VERIFY=0

usage() {
  cat <<'EOF'
Usage: deploy/create-archive.sh [options] [STAGING_DIR]

Default STAGING_DIR: ../dist/intake-demo-staging

Options:
  --with-build   Run full npm build verify (slow on Windows/WSL)
  -h, --help     Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-build) RUN_FULL_VERIFY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      STAGING="$1"
      shift
      ;;
  esac
done

cd "${ROOT}"

# shellcheck disable=SC1091
source "${ROOT}/scripts/lib/env-helpers.sh"

ensure_local_env_files() {
  if [[ ! -f "${ROOT}/.env" ]]; then
    if [[ -f "${ROOT}/deploy/.env.example" ]]; then
      cp "${ROOT}/deploy/.env.example" "${ROOT}/.env"
      echo "Created demo/.env from deploy/.env.example"
    elif [[ -f "${ROOT}/.env.example" ]]; then
      cp "${ROOT}/.env.example" "${ROOT}/.env"
      echo "Created demo/.env from .env.example"
    else
      echo "ERROR: demo/.env missing and no deploy/.env.example found." >&2
      exit 1
    fi
  fi
  ensure_ai_env_file "${ROOT}"
}

echo "==> Preparing env files (.env + config/ai.env)…"
ensure_local_env_files
apply_ai_env_defaults "${ROOT}/config/ai.env" "${AI_DEFAULTS}"
if ! validate_ai_env "${ROOT}/config/ai.env"; then
  echo "ERROR: Fix config/ai.env before staging (HF_API_TOKEN or Ollama settings)." >&2
  exit 1
fi

if [[ "${RUN_FULL_VERIFY}" -eq 1 ]]; then
  echo "==> Full verify (npm build)…"
  "${ROOT}/scripts/verify-before-package.sh"
else
  echo "==> Quick path check…"
  "${ROOT}/scripts/verify-before-pm2-package.sh"
fi

echo "==> Staging files to ${STAGING}"
rm -rf "${STAGING}"
mkdir -p "${STAGING}"

copy_tree() {
  local src="$1"
  local dest="$2"
  mkdir -p "${dest}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude 'node_modules' \
      --exclude 'dist' \
      --exclude 'build' \
      --exclude '.env' \
      --exclude '.venv' \
      --exclude '__pycache__' \
      --exclude '*.pyc' \
      --exclude '*.db' \
      --exclude '*.db-wal' \
      --exclude '*.db-shm' \
      --exclude 'coverage' \
      --exclude 'logs' \
      --exclude '.git' \
      "${src}/" "${dest}/"
  else
    tar -C "${src}" \
      --exclude=node_modules \
      --exclude=dist \
      --exclude=build \
      --exclude=.env \
      --exclude=.venv \
      --exclude=__pycache__ \
      --exclude='*.db' \
      --exclude='*.db-wal' \
      --exclude='*.db-shm' \
      --exclude=coverage \
      --exclude=logs \
      -cf - . | tar -C "${dest}" -xf -
  fi
}

copy_tree "${ROOT}/api" "${STAGING}/api"
copy_tree "${ROOT}/frontend" "${STAGING}/frontend"
copy_tree "${ROOT}/worker" "${STAGING}/worker"
copy_tree "${ROOT}/config" "${STAGING}/config"
copy_tree "${ROOT}/deploy" "${STAGING}/deploy"
copy_tree "${ROOT}/scripts/lib" "${STAGING}/scripts/lib"

cp "${ROOT}/start.sh" "${STAGING}/"
cp "${ROOT}/run-production.sh" "${STAGING}/"
cp "${ROOT}/fix-crlf.sh" "${STAGING}/"
cp "${ROOT}/README-SERVER.txt" "${STAGING}/"
cp "${ROOT}/README.md" "${STAGING}/"
cp "${ROOT}/.gitattributes" "${STAGING}/" 2>/dev/null || true
cp "${ROOT}/.env.example" "${STAGING}/" 2>/dev/null || true

if [[ -f "${ROOT}/docs/DEPLOY-RUNBOOK.md" ]]; then
  mkdir -p "${STAGING}/docs"
  cp "${ROOT}/docs/DEPLOY-RUNBOOK.md" "${STAGING}/docs/"
fi

mkdir -p "${STAGING}/scripts"
cp "${ROOT}/scripts/smoke.sh" "${STAGING}/scripts/"
cp "${ROOT}/scripts/deploy-pm2.sh" "${STAGING}/scripts/"
cp "${ROOT}/scripts/verify-before-pm2-package.sh" "${STAGING}/scripts/" 2>/dev/null || true
cp "${ROOT}/.env" "${STAGING}/.env"
cp "${ROOT}/config/ai.env" "${STAGING}/config/ai.env"
mkdir -p "${STAGING}/data/artifacts" "${STAGING}/logs"

chmod +x \
  "${STAGING}/start.sh" \
  "${STAGING}/run-production.sh" \
  "${STAGING}/fix-crlf.sh" \
  "${STAGING}/deploy/create-archive.sh" \
  "${STAGING}/deploy/configure-nginx.sh" \
  "${STAGING}/scripts/deploy-pm2.sh" \
  "${STAGING}/scripts/smoke.sh" \
  "${STAGING}/scripts/lib/"*.sh \
  2>/dev/null || true

echo "==> Normalizing staged scripts and env files to LF"
normalize_lf() {
  local py=""
  if command -v python >/dev/null 2>&1; then
    py="python"
  elif command -v python3 >/dev/null 2>&1; then
    py="python3"
  elif command -v py >/dev/null 2>&1; then
    py="py -3"
  fi
  if [[ -z "$py" ]]; then
    echo "    Warning: python not found; shell scripts may keep CRLF" >&2
    return 0
  fi
  # shellcheck disable=SC2086
  $py - "${STAGING}" <<'PY'
import os
import sys

root = sys.argv[1]
exts = {".sh", ".bash", ".cjs", ".env"}
changed = 0
for dirpath, _, files in os.walk(root):
    for name in files:
        _, ext = os.path.splitext(name)
        if ext.lower() not in exts and name not in (".env", ".env.example"):
            continue
        path = os.path.join(dirpath, name)
        with open(path, "rb") as fh:
            data = fh.read()
        converted = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
        if converted != data:
            with open(path, "wb") as fh:
                fh.write(converted)
            changed += 1
print(f"    converted {changed} file(s) to LF")
PY
}
normalize_lf

PKG_PORT="$(env_value "${ROOT}/.env" PORT)"
PKG_PORT="${PKG_PORT:-11110}"
ROUTE="$(env_value "${ROOT}/.env" APP_BASE_PATH)"
ROUTE="${ROUTE:-/intake}"
ROUTE="${ROUTE#/}"
ROUTE="${ROUTE%/}"

echo ""
echo "Done: ${STAGING}"
du -sh "${STAGING}" 2>/dev/null || ls -ld "${STAGING}"
cat <<EOF

Next steps (on your machine):
  1. Zip the contents of dist/intake-demo-staging/ (not the parent dist folder).
     Windows: open the folder, select all files inside, compress to zip.
  2. Copy the zip to the Ubuntu server.

On the server:
  sudo mkdir -p ${INSTALL_ROOT}
  sudo unzip -o your-archive.zip -d ${INSTALL_ROOT}
  cd ${INSTALL_ROOT}
  sudo bash start.sh

PM2 processes: intake-api (:${PKG_PORT}) + intake-worker
Public URL: https://client-demo.inapp.com/${ROUTE}/
See README-SERVER.txt in the staged folder.

EOF
