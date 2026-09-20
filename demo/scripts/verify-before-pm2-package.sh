#!/usr/bin/env bash
# Lightweight checks for package-pm2.sh — no npm build (start.sh builds on the server).
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REQUIRED=(
  "start.sh"
  "run-production.sh"
  "deploy/ecosystem.config.cjs"
  "api/package.json"
  "frontend/package.json"
  "worker/requirements.txt"
  "scripts/lib/env-helpers.sh"
  "scripts/lib/nginx-route.sh"
)

echo "==> Checking PM2 staging paths…"
missing=0
for f in "${REQUIRED[@]}"; do
  if [[ ! -e "${DEMO_DIR}/${f}" ]]; then
    echo "MISSING: ${f}" >&2
    missing=1
  fi
done
if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "OK — ready to stage (build runs on target host via start.sh)."
