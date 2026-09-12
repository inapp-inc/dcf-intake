#!/usr/bin/env bash
# Post-deploy smoke checks for demo stack (via nginx HTTP port).
set -euo pipefail
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DEMO_DIR}"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PORT="${AIT_HTTP_PORT:-4010}"
BASE="${APP_BASE_PATH:-/intake}"
API="${SMOKE_API_BASE:-http://127.0.0.1:${PORT}${BASE}/api/v1}"

json_field() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(${1}||'')}catch{process.exit(1)}})"
}

echo "Smoke: GET ${API}/health"
curl -sf "${API}/health" | head -c 200
echo ""

login_and_me() {
  local role="$1"
  local user="$2"
  local pass="$3"
  echo "Smoke: POST ${API}/auth/login (${role})"
  local token
  token="$(curl -sf -X POST "${API}/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${user}\",\"password\":\"${pass}\"}" | json_field 'j.accessToken')"
  if [[ -z "${token}" ]]; then
    echo "ERROR: no access token for ${role}" >&2
    exit 1
  fi
  local me_role
  me_role="$(curl -sf "${API}/auth/me" -H "Authorization: Bearer ${token}" | json_field 'j.role')"
  if [[ "${me_role}" != "${role}" ]]; then
    echo "ERROR: /auth/me role ${me_role} != ${role}" >&2
    exit 1
  fi
  echo "${token}"
}

TOKEN="$(login_and_me screener screener.demo 'ScreenerInit!')"
login_and_me supervisor supervisor.demo 'SupervisorInit!'
login_and_me worker worker.demo 'WorkerField!'
login_and_me admin admin.demo 'AdminDemo!'

echo "Smoke: POST ${API}/auth/demo-login (legacy screener shortcut)"
LEGACY_TOKEN="$(curl -sf -X POST "${API}/auth/demo-login" \
  -H 'Content-Type: application/json' \
  -d '{"role":"screener","displayName":"Demo Smoke"}' | json_field 'j.accessToken')"
if [[ -z "${LEGACY_TOKEN}" ]]; then
  echo "ERROR: demo-login returned no token" >&2
  exit 1
fi

echo "Smoke: POST ${API}/cases (screener token)"
CASE_ID="$(curl -sf -X POST "${API}/cases" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{}' | json_field 'j.caseId')"

echo "Created case: ${CASE_ID}"
echo "Demo smoke passed."
