#!/usr/bin/env bash
# Rebuild and recreate demo services after code changes (keeps demo-data volume).
#
# Usage:
#   ./scripts/redeploy.sh api
#   ./scripts/redeploy.sh frontend
#   ./scripts/redeploy.sh ai-bundle
#   ./scripts/redeploy.sh all
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEMO_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SERVICES=()
if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <api|frontend|ai-bundle|nginx|all> [more…]" >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    all) SERVICES+=(api frontend ai-bundle nginx) ;;
    api|frontend|ai-bundle|nginx) SERVICES+=("$arg") ;;
    ai-worker|ollama|whisper) echo "WARN: use ai-bundle (pipeline worker; ASR+LLM are on Hugging Face)" >&2 ;;
    *)
      echo "Unknown service: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ " ${SERVICES[*]} " == *" frontend "* ]] && [[ " ${SERVICES[*]} " != *" nginx "* ]]; then
  SERVICES+=(nginx)
fi

echo "Rebuilding: ${SERVICES[*]}"
docker compose build "${SERVICES[@]}"
docker compose up -d --no-deps "${SERVICES[@]}"
echo "Done. ./scripts/smoke.sh  |  logs: docker compose logs -f ${SERVICES[*]}"
