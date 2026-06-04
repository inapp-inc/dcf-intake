#!/usr/bin/env bash
# Package DCF AIT for Docker Compose deployment (offline zip, no secrets).
# Modeled on presales package-docker.sh — produces a deployable archive for deploy-docker.sh.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_PATH="${1:-"$ROOT_DIR/dist/dcf-ait-docker.zip"}"

command -v zip >/dev/null 2>&1 || {
  echo "zip is required to create the deployment archive." >&2
  exit 1
}

VERSION="0.1.0"
if [[ -f "${ROOT_DIR}/codebase/api/package.json" ]]; then
  VERSION="$(node -p "require('${ROOT_DIR}/codebase/api/package.json').version" 2>/dev/null || echo 0.1.0)"
fi

GIT_SHA="nogit"
if command -v git >/dev/null 2>&1 && git -C "${ROOT_DIR}" rev-parse --short HEAD >/dev/null 2>&1; then
  GIT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
fi

STAGING="$(mktemp -d)"
trap 'rm -rf "${STAGING}"' EXIT
PKG_ROOT="${STAGING}/dcf-ait"
mkdir -p "${PKG_ROOT}"

# Extend when adding services or deploy assets.
INCLUDE_PATHS=(
  "codebase/api"
  "codebase/worker"
  "codebase/frontend"
  "codebase/deploy"
  "codebase/README.md"
  "scripts/deploy-docker.sh"
  "scripts/package-docker.sh"
  "openapi.yaml"
)

copy_tree() {
  local rel="$1"
  local src="${ROOT_DIR}/${rel}"
  local dest="${PKG_ROOT}/${rel}"
  if [[ ! -e "${src}" ]]; then
    echo "WARN: missing ${rel}, skipping" >&2
    return
  fi
  mkdir -p "$(dirname "${dest}")"
  if [[ -d "${src}" ]]; then
    if command -v rsync >/dev/null 2>&1; then
      rsync -a \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude 'build' \
        --exclude '.env' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.pytest_cache' \
        --exclude 'coverage' \
        --exclude '.git' \
        "${src}/" "${dest}/"
    else
      cp -R "${src}" "$(dirname "${dest}")/"
    fi
  else
    cp "${src}" "${dest}"
  fi
}

for p in "${INCLUDE_PATHS[@]}"; do
  copy_tree "${p}"
done

chmod +x "${PKG_ROOT}/scripts/deploy-docker.sh" 2>/dev/null || true
chmod +x "${PKG_ROOT}/codebase/deploy/scripts/"*.sh 2>/dev/null || true

cat > "${PKG_ROOT}/DEPLOY_README.txt" <<EOF
DCF AIT Docker package
version=${VERSION} git=${GIT_SHA} built=$(date -u +%Y-%m-%dT%H:%M:%SZ)

Deploy on the destination host:
  ./scripts/deploy-docker.sh /path/to/dcf-ait-docker.zip

External Postgres (default — no bundled DB container):
  Host must already run Postgres, e.g.:
    postgresql://foundry:foundry@127.0.0.1:5432/appdb
  deploy-docker.sh writes DATABASE_URL with host.docker.internal for Docker.

Bundled Postgres (optional):
  ./scripts/deploy-docker.sh /path/to/archive.zip --bundled-db

Public URL (default): https://foundry.inapp.com/dcfintake/
  APP_BASE_PATH=/dcfintake
  VITE_BASE_PATH=/dcfintake/   VITE_API_BASE_URL=/dcfintake/api/v1
  BEHIND_REVERSE_PROXY=1       (host nginx on :443; app on :4010 HTTP)
  CORS_ORIGIN=https://foundry.inapp.com

Existing VM nginx (HTTPS only) — add to your template:
  location /dcfintake/ { proxy_pass http://127.0.0.1:4010/dcfintake/; ... }
  Full snippet: codebase/deploy/nginx/foundry-gateway.example.conf

Host ports (4010-4015) — do not use host :80/:443:
  4010 HTTP app nginx (upstream for host proxy)   4011 container HTTPS (optional)
  4012 API   4013 MinIO   4014 MinIO console   4015 bundled Postgres only

Compose helpers (in codebase/deploy):
  docker-compose.yml
  docker-compose.external-db.yml
  scripts/compose-up.sh   — selects external vs bundled-db profile
  scripts/redeploy.sh     — patch api|frontend|ai-worker without wiping images
  scripts/smoke.sh

API runs DB migrations on startup against DATABASE_URL.

After code edits on the VM:
  rsync or git pull into .../codebase/ then:
  cd .../codebase/deploy && ./scripts/redeploy.sh api|frontend|ai-worker|all
  ./scripts/smoke.sh
  (No docker rmi / down -v needed.)

Full runbook: Docs/VM-RUNBOOK.md section 4 (in repo).
EOF

mkdir -p "$(dirname "$ARCHIVE_PATH")"
rm -f "$ARCHIVE_PATH"
(
  cd "${STAGING}"
  zip -rq "$ARCHIVE_PATH" dcf-ait \
    -x "*.env" \
    -x "*/.env" \
    -x "*/node_modules/*" \
    -x "*/dist/*" \
    -x "*/__pycache__/*"
)

echo "Created $ARCHIVE_PATH"
echo "Deploy on target: scripts/deploy-docker.sh $ARCHIVE_PATH"
echo "  External DB (default): uses host Postgres via host.docker.internal"
echo "  Bundled DB:            scripts/deploy-docker.sh $ARCHIVE_PATH --bundled-db"
