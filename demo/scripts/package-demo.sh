#!/usr/bin/env bash
# Legacy name — use scripts/package-docker.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/package-docker.sh" "$@"
