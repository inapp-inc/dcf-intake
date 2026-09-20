#!/usr/bin/env bash
# Run before package-docker.sh — ensures demo tree is complete and builds.
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEMO_DIR}"

REQUIRED=(
  "frontend/src/auth/AuthProvider.tsx"
  "frontend/src/auth/RequireAuth.tsx"
  "frontend/src/auth/session.ts"
  "frontend/src/auth/index.ts"
  "frontend/src/vite-env.d.ts"
  "frontend/.dockerignore"
  "frontend/Dockerfile"
  "frontend/package-lock.json"
  "frontend/src/routes/RoleViews.tsx"
  "frontend/src/pages/screener/ScreenerCaseHistory.tsx"
  "frontend/src/pages/supervisor/SupervisorAuditHub.tsx"
  "frontend/src/pages/worker/WorkerCasePicker.tsx"
  "frontend/src/pages/admin/AdminAuditLogs.tsx"
  "api/src/db/sql.ts"
  "api/src/db/pool.ts"
  "api/src/db/rows.ts"
  "api/src/db/values.ts"
  "api/src/db/migrate.ts"
  "frontend/src/constants/demoUsers.ts"
  "api/src/domain/demoUsers.ts"
  "api/src/routes/auth.ts"
  "api/package-lock.json"
  "worker/worker/sqlite_util.py"
  "worker/worker/db.py"
  "worker/worker/llm_client.py"
  "worker/worker/whisper_asr.py"
  "api/src/services/llmService.ts"
  "config/ai-defaults.env"
  "scripts/lib/env-helpers.sh"
  "docker-compose.yml"
  "nginx/nginx.conf.http-only.template"
  "scripts/check-conflicts.mjs"
)

FORBIDDEN=(
  "frontend/src/context/AuthContext.tsx"
  "frontend/src/pages/PlaceholderPage.tsx"
)

echo "==> Checking required paths…"
missing=0
for f in "${REQUIRED[@]}"; do
  if [[ ! -e "${DEMO_DIR}/${f}" ]]; then
    echo "MISSING: ${f}" >&2
    missing=1
  fi
done
for f in "${FORBIDDEN[@]}"; do
  if [[ -e "${DEMO_DIR}/${f}" ]]; then
    echo "FORBIDDEN (remove): ${f}" >&2
    missing=1
  fi
done
if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "==> Env files (.env + config/ai.env)…"
if [[ ! -f "${DEMO_DIR}/.env" ]]; then
  echo "MISSING: demo/.env — copy .env.example" >&2
  exit 1
fi
# shellcheck disable=SC1091
source "${DEMO_DIR}/scripts/lib/env-helpers.sh"
ensure_ai_env_file "${DEMO_DIR}"
if ! validate_ai_env "${DEMO_DIR}/config/ai.env"; then
  exit 1
fi

echo "==> Conflict checks (routes, auth, nav, AI defaults)…"
"${DEMO_DIR}/scripts/check-conflicts.sh"

echo "==> API: tsc + SQLite + auth verify…"
(cd api && npm run build && npm run verify:sqlite && npm run verify:auth)

echo "==> Frontend: production build…"
(cd frontend && npm ci && npm run build)

echo "OK — demo tree is ready to package."
