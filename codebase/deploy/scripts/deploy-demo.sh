#!/usr/bin/env bash
# Legacy wrapper — use scripts/deploy-docker.sh at repo root (or from unpacked zip).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

ZIP_PATH=""
EXTRA=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --zip-path) ZIP_PATH="$2"; shift 2 ;;
    --install-dir) EXTRA+=(--install-dir "$2"); shift 2 ;;
    --skip-build) EXTRA+=(--skip-build); shift ;;
    --smoke) shift ;;
    --no-smoke) EXTRA+=(--no-smoke); shift ;;
    --bundled-db) EXTRA+=(--bundled-db); shift ;;
    -h|--help)
      echo "Usage: deploy-demo.sh --zip-path PATH [--install-dir DIR] [--skip-build] [--smoke|--no-smoke] [--bundled-db]"
      exit 0
      ;;
    *.zip) ZIP_PATH="$1"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ZIP_PATH" ]]; then
  echo "Usage: deploy-demo.sh --zip-path PATH" >&2
  exit 1
fi

# --smoke is default on deploy-docker.sh; legacy flag kept for compatibility
DEPLOY_SCRIPT="${REPO_ROOT}/scripts/deploy-docker.sh"
if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
  DEPLOY_SCRIPT="$(cd "${SCRIPT_DIR}/../../.." && pwd)/scripts/deploy-docker.sh"
fi
exec "$DEPLOY_SCRIPT" "${EXTRA[@]}" "$ZIP_PATH"
