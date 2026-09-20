#!/usr/bin/env bash
set -euo pipefail
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEMO_DIR}"

# shellcheck disable=SC1091
source "${DEMO_DIR}/scripts/lib/env-helpers.sh"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "ERROR: missing .env and .env.example" >&2
    exit 1
  fi
fi

ensure_ai_env_file "${DEMO_DIR}"
apply_ai_env_defaults "${DEMO_DIR}/config/ai.env" "${DEMO_DIR}/config/ai-defaults.env"

if ! validate_ai_env "${DEMO_DIR}/config/ai.env"; then
  echo "Configure config/ai.env (HF_API_TOKEN for cloud, or LLM_PROVIDER=ollama for local)." >&2
  exit 1
fi

source_env_files "${DEMO_DIR}"
docker compose up -d --build "$@"
