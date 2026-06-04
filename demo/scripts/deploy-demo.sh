#!/usr/bin/env bash
# Legacy name — use scripts/deploy-docker.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/deploy-docker.sh" "$@"
