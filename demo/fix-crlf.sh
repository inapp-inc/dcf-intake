#!/usr/bin/env bash
# Emergency CRLF fix on the server (if start.sh fails with "not found").
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
find "${ROOT}" -type f \( \
  -name '*.sh' -o -name '*.bash' -o -name '*.cjs' -o \
  -name '.env' -o -name '.env.example' -o -name '*.env' -o -name '*.env.example' \
\) -print0 \
  | while IFS= read -r -d '' f; do sed -i 's/\r$//' "$f" 2>/dev/null || sed -i '' 's/\r$//' "$f"; done
echo "LF normalized under ${ROOT} (scripts + .env). Run: bash start.sh"
