#!/usr/bin/env bash
# Legacy wrapper — use scripts/package-docker.sh at repo root.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
exec "${REPO_ROOT}/scripts/package-docker.sh" "$@"
