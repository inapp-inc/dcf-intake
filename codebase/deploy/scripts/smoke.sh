#!/usr/bin/env bash
# Post-deploy smoke checks (API via nginx HTTPS or direct API port).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${DEPLOY_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${DEPLOY_DIR}/.env"
  set +a
fi

AIT_HTTPS_PORT="${AIT_HTTPS_PORT:-4011}"
AIT_API_PORT="${AIT_API_PORT:-4012}"
APP_BASE_PATH="${APP_BASE_PATH:-/dcfintake}"
APP_BASE_PATH="${APP_BASE_PATH%/}"
API_SUFFIX="${APP_BASE_PATH}/api/v1"

AIT_HTTP_PORT="${AIT_HTTP_PORT:-4010}"
BEHIND_REVERSE_PROXY="${BEHIND_REVERSE_PROXY:-0}"

API_BASE="${SMOKE_API_BASE:-}"
if [[ -z "${API_BASE}" ]]; then
  if [[ "${BEHIND_REVERSE_PROXY}" == "1" ]] \
    && curl -sf "http://127.0.0.1:${AIT_HTTP_PORT}${API_SUFFIX}/health" >/dev/null 2>&1; then
    API_BASE="http://127.0.0.1:${AIT_HTTP_PORT}${API_SUFFIX}"
  elif curl -skf "https://localhost:${AIT_HTTPS_PORT}${API_SUFFIX}/health" >/dev/null 2>&1; then
    API_BASE="https://localhost:${AIT_HTTPS_PORT}${API_SUFFIX}"
  elif curl -sf "http://127.0.0.1:${AIT_HTTP_PORT}${API_SUFFIX}/health" >/dev/null 2>&1; then
    API_BASE="http://127.0.0.1:${AIT_HTTP_PORT}${API_SUFFIX}"
  elif curl -sf "http://127.0.0.1:${AIT_API_PORT}/api/v1/health" >/dev/null 2>&1; then
    API_BASE="http://127.0.0.1:${AIT_API_PORT}/api/v1"
  else
    API_BASE="https://localhost:${AIT_HTTPS_PORT}${API_SUFFIX}"
  fi
fi

json_field() {
  local expr="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(${expr}||'')}catch{process.exit(1)}})"
}

curl_api() {
  if [[ "${API_BASE}" == https://* ]]; then
    curl -skf "$@"
  else
    curl -sf "$@"
  fi
}

curl_api_code() {
  if [[ "${API_BASE}" == https://* ]]; then
    curl -sk -o /dev/null -w '%{http_code}' "$@"
  else
    curl -s -o /dev/null -w '%{http_code}' "$@"
  fi
}

echo "Smoke: GET ${API_BASE}/health"
curl_api "${API_BASE}/health" | head -c 200
echo ""

echo "Smoke: POST ${API_BASE}/auth/demo-login (screener)"
TOKEN="$(curl_api -X POST "${API_BASE}/auth/demo-login" \
  -H 'Content-Type: application/json' \
  -d '{"role":"screener","displayName":"Smoke Test"}' | json_field 'j.accessToken')"

if [[ -z "${TOKEN}" ]]; then
  echo "ERROR: no screener access token" >&2
  exit 1
fi

echo "Smoke: POST ${API_BASE}/cases"
CASE_ID="$(curl_api -X POST "${API_BASE}/cases" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{}' | json_field 'j.caseId')"

echo "Created case: ${CASE_ID}"

echo "Smoke: GET ${API_BASE}/cases/${CASE_ID}/form51a"
curl_api -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/cases/${CASE_ID}/form51a" | head -c 120
echo ""

echo "Smoke: GET ${API_BASE}/cases/${CASE_ID}/pipeline"
curl_api -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/cases/${CASE_ID}/pipeline" | head -c 120
echo ""

echo "Smoke: RBAC worker denied on in-progress case"
WORKER_TOKEN="$(curl_api -X POST "${API_BASE}/auth/demo-login" \
  -H 'Content-Type: application/json' \
  -d '{"role":"worker","displayName":"Smoke Worker"}' | json_field 'j.accessToken')"
WORKER_CODE="$(curl_api_code \
  -H "Authorization: Bearer ${WORKER_TOKEN}" \
  "${API_BASE}/cases/${CASE_ID}/transcript")"
if [[ "${WORKER_CODE}" != "403" ]]; then
  echo "ERROR: expected worker 403 on transcript, got ${WORKER_CODE}" >&2
  exit 1
fi
echo "  worker transcript → ${WORKER_CODE} (expected 403)"

echo "Smoke: RBAC admin denied on case transcript"
ADMIN_TOKEN="$(curl_api -X POST "${API_BASE}/auth/demo-login" \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin","displayName":"Smoke Admin"}' | json_field 'j.accessToken')"
ADMIN_CODE="$(curl_api_code \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "${API_BASE}/cases/${CASE_ID}/transcript")"
if [[ "${ADMIN_CODE}" != "403" ]]; then
  echo "ERROR: expected admin 403 on transcript, got ${ADMIN_CODE}" >&2
  exit 1
fi
echo "  admin transcript → ${ADMIN_CODE} (expected 403)"

echo "Smoke: supervisor screening pending"
SUP_TOKEN="$(curl_api -X POST "${API_BASE}/auth/demo-login" \
  -H 'Content-Type: application/json' \
  -d '{"role":"supervisor","displayName":"Smoke Sup"}' | json_field 'j.accessToken')"
curl_api -H "Authorization: Bearer ${SUP_TOKEN}" "${API_BASE}/screening/pending" | head -c 80
echo ""

echo "Smoke checks passed."
