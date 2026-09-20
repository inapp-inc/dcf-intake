#!/usr/bin/env bash
# Build API, frontend, and Python worker venv; optionally start PM2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

# shellcheck disable=SC1091
source "${ROOT}/scripts/lib/env-helpers.sh"

DO_BUILD=1
USE_PM2=0

usage() {
  cat <<'EOF'
Usage: run-production.sh [options]

Options:
  --no-build    Skip npm/vite/python builds
  --pm2         Start or reload PM2 after build
  -h, --help    Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build) DO_BUILD=0; shift ;;
    --pm2) USE_PM2=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

source_env_files "${ROOT}"

export VITE_BASE_PATH="${VITE_BASE_PATH:-/intake/}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/intake/api/v1}"

mkdir -p "${ROOT}/data/artifacts" "${ROOT}/logs"

if [[ "${DO_BUILD}" -eq 1 ]]; then
  echo "==> Building API"
  (
    cd "${ROOT}/api"
    npm ci --include=dev
    npm run build
  )

  echo "==> Building frontend"
  (
    cd "${ROOT}/frontend"
    npm ci --include=dev
    npm run build
  )

  echo "==> Preparing Python worker venv"
  (
    cd "${ROOT}/worker"
    if [[ ! -d .venv ]]; then
      python3 -m venv .venv
    fi
    # shellcheck disable=SC1091
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
  )
fi

if [[ "${USE_PM2}" -eq 1 ]]; then
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "ERROR: pm2 not found. Run start.sh or: npm install -g pm2" >&2
    exit 1
  fi

  if [[ ! -f "${ROOT}/api/dist/index.js" ]]; then
    echo "ERROR: api/dist missing — run without --no-build first." >&2
    exit 1
  fi

  if [[ ! -x "${ROOT}/worker/.venv/bin/python" ]]; then
    echo "ERROR: worker/.venv missing — run without --no-build first." >&2
    exit 1
  fi

  pm2 delete intake-api intake-worker 2>/dev/null || true
  pm2 start "${ROOT}/deploy/ecosystem.config.cjs"
  pm2 save
  echo "PM2 started: intake-api, intake-worker"
fi
