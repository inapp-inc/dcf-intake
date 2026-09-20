#!/usr/bin/env bash
# Deploy child welfare intake demo from package-pm2.sh archive (PM2, no Docker).
set -euo pipefail

ARCHIVE_PATH=""
INSTALL_ROOT="${INSTALL_ROOT:-/var/www/intake-demo}"
START_ARGS=()

usage() {
  cat <<'EOF'
Usage: deploy-pm2.sh [options] /path/to/intake-demo-pm2.zip

Options:
  --install-dir DIR     Extract target (default: /var/www/intake-demo)
  --no-nginx            Pass --no-nginx to start.sh
  --no-build            Pass --no-build to start.sh
  --no-seed             Pass --no-seed to start.sh
  --install-system-deps Pass --install-system-deps to start.sh

Environment:
  INSTALL_ROOT          Same as --install-dir
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-dir) INSTALL_ROOT="$2"; shift 2 ;;
    --no-nginx) START_ARGS+=(--no-nginx); shift ;;
    --no-build) START_ARGS+=(--no-build); shift ;;
    --no-seed) START_ARGS+=(--no-seed); shift ;;
    --install-system-deps) START_ARGS+=(--install-system-deps); shift ;;
    -h|--help) usage; exit 0 ;;
    *.zip) ARCHIVE_PATH="$1"; shift ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

command -v unzip >/dev/null 2>&1 || { echo "unzip is required." >&2; exit 1; }

if [[ -z "$ARCHIVE_PATH" ]] || [[ ! -f "$ARCHIVE_PATH" ]]; then
  usage >&2
  exit 1
fi
ARCHIVE_PATH="$(cd "$(dirname "$ARCHIVE_PATH")" && pwd)/$(basename "$ARCHIVE_PATH")"

mkdir -p "$INSTALL_ROOT"
unzip -oq "$ARCHIVE_PATH" -d "$INSTALL_ROOT"

if [[ ! -f "${INSTALL_ROOT}/start.sh" ]]; then
  echo "ERROR: start.sh not found under ${INSTALL_ROOT}" >&2
  exit 1
fi

cd "${INSTALL_ROOT}"
chmod +x start.sh run-production.sh deploy/*.sh scripts/*.sh scripts/lib/*.sh 2>/dev/null || true
bash start.sh "${START_ARGS[@]}"

if [[ -f "${INSTALL_ROOT}/scripts/smoke.sh" ]]; then
  echo ""
  DEPLOY_MODE=pm2 bash "${INSTALL_ROOT}/scripts/smoke.sh" || true
fi

echo ""
echo "Deploy complete. Run: pm2 save && pm2 startup"
