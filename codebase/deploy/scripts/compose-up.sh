#!/usr/bin/env bash
# Start DCF AIT stack with correct compose files for external vs bundled Postgres.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEPLOY_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

COMPOSE=(docker compose -f docker-compose.yml)
PROFILES=()

if [[ "${USE_EXTERNAL_POSTGRES:-}" == "1" ]] || [[ -n "${DATABASE_URL:-}" ]]; then
  COMPOSE+=(-f docker-compose.external-db.yml)
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: USE_EXTERNAL_POSTGRES=1 requires DATABASE_URL in .env" >&2
    exit 1
  fi
  # Containers cannot use 127.0.0.1 to reach host Postgres
  if [[ "${DATABASE_URL}" == *"@127.0.0.1:"* ]] || [[ "${DATABASE_URL}" == *"@localhost:"* ]]; then
    export DATABASE_URL="${DATABASE_URL/@127.0.0.1:/@host.docker.internal:}"
    export DATABASE_URL="${DATABASE_URL/@localhost:/@host.docker.internal:}"
    echo "Adjusted DATABASE_URL for Docker: ${DATABASE_URL}"
  fi
  echo "Using external Postgres (bundled-db profile disabled)"
else
  PROFILES=(--profile bundled-db)
  echo "Using bundled Postgres container (profile bundled-db)"
fi

exec "${COMPOSE[@]}" "${PROFILES[@]}" "$@"
