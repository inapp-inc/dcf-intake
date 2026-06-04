#!/usr/bin/env bash
# Generate self-signed TLS certs for demo nginx if missing.
set -euo pipefail

CERT_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../nginx/certs" && pwd)}"
mkdir -p "${CERT_DIR}"

if [[ -f "${CERT_DIR}/cert.pem" ]] && [[ -f "${CERT_DIR}/key.pem" ]]; then
  echo "Certs already exist in ${CERT_DIR}"
  exit 0
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${CERT_DIR}/key.pem" \
  -out "${CERT_DIR}/cert.pem" \
  -subj "/CN=dcf-ait-demo/O=DCF AIT Demo/C=US"

echo "Generated self-signed cert in ${CERT_DIR}"
