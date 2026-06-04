#!/usr/bin/env bash
set -euo pipefail
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEMO_DIR}"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "ERROR: missing .env and .env.example" >&2
    exit 1
  fi
fi

# shellcheck disable=SC1091
source "${DEMO_DIR}/scripts/lib/env-helpers.sh"
if ! validate_hf_env "${DEMO_DIR}/.env"; then
  echo "Set HF_API_TOKEN in demo/.env before starting the stack." >&2
  exit 1
fi

docker compose up -d --build "$@"
