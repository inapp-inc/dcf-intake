#!/usr/bin/env bash
# Rebuild and recreate only the services you changed — keeps volumes, Postgres, Redis data, Ollama models.
#
# Usage:
#   ./scripts/redeploy.sh api              # API only (includes DB migrations on start)
#   ./scripts/redeploy.sh frontend         # UI only
#   ./scripts/redeploy.sh ai-worker        # Python worker only
#   ./scripts/redeploy.sh api ai-worker    # multiple services
#   ./scripts/redeploy.sh all              # api + frontend + ai-worker (not redis/minio/ollama)
#
# Does NOT: docker system prune, docker compose down -v, or delete images manually.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEPLOY_DIR}"

SERVICES=()
if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <api|frontend|ai-worker|all> [more services…]" >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    all) SERVICES+=(api frontend ai-worker) ;;
    api|frontend|ai-worker|nginx) SERVICES+=("$arg") ;;
    *)
      echo "Unknown service: $arg" >&2
      exit 1
      ;;
  esac
done

# nginx uses static frontend image — redeploy frontend if UI changed
if [[ " ${SERVICES[*]} " == *" frontend "* ]] && [[ " ${SERVICES[*]} " != *" nginx "* ]]; then
  SERVICES+=(nginx)
fi

echo "Rebuilding: ${SERVICES[*]}"
./scripts/compose-up.sh build "${SERVICES[@]}"
./scripts/compose-up.sh up -d --no-deps "${SERVICES[@]}"

echo ""
echo "Done. Tip: ./scripts/compose-up.sh logs -f ${SERVICES[*]}"
