#!/usr/bin/env bash
# Wrapper — stages PM2 deploy bundle via deploy/create-archive.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/../deploy/create-archive.sh" "$@"
