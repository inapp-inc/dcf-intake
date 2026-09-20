#!/usr/bin/env bash
# Shared .env helpers for demo packaging and deployment scripts.

env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  awk -F= -v key="$key" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      sub(/^[^=]*=/, "", $0)
      gsub(/^["'\'']|["'\'']$/, "", $0)
      gsub(/\r$/, "", $0)
      print $0
      exit
    }
  ' "$file"
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp="${file}.tmp"
  mkdir -p "$(dirname "$file")"
  if [[ -f "$file" ]] && grep -qE "^${key}=" "$file"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { replaced = 0 }
      $0 ~ "^" key "=" {
        print key "=" value
        replaced = 1
        next
      }
      { print }
      END {
        if (!replaced) print key "=" value
      }
    ' "$file" > "$tmp"
    mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

load_ai_defaults() {
  local defaults_file="$1"
  LLM_PROVIDER="${LLM_PROVIDER:-$(env_value "$defaults_file" LLM_PROVIDER)}"
  HF_MODEL="${HF_MODEL:-$(env_value "$defaults_file" HF_MODEL)}"
  HF_API_BASE="${HF_API_BASE:-$(env_value "$defaults_file" HF_API_BASE)}"
  LLM_REQUEST_TIMEOUT_MS="${LLM_REQUEST_TIMEOUT_MS:-$(env_value "$defaults_file" LLM_REQUEST_TIMEOUT_MS)}"
  HF_ASR_MODEL="${HF_ASR_MODEL:-$(env_value "$defaults_file" HF_ASR_MODEL)}"
  ASR_REQUEST_TIMEOUT_MS="${ASR_REQUEST_TIMEOUT_MS:-$(env_value "$defaults_file" ASR_REQUEST_TIMEOUT_MS)}"
  NLP_CONFIDENCE_THRESHOLD="${NLP_CONFIDENCE_THRESHOLD:-0.65}"
}

ensure_ai_env_file() {
  local demo_root="$1"
  local ai_env="${demo_root}/config/ai.env"
  local ai_example="${demo_root}/config/ai.env.example"
  local ai_defaults="${demo_root}/config/ai-defaults.env"

  if [[ ! -f "$ai_env" ]]; then
    if [[ -f "$ai_example" ]]; then
      cp "$ai_example" "$ai_env"
      echo "Created ${ai_env} from ai.env.example"
    elif [[ -f "$ai_defaults" ]]; then
      cp "$ai_defaults" "$ai_env"
      echo "Created ${ai_env} from ai-defaults.env"
    else
      echo "ERROR: missing config/ai.env.example" >&2
      return 1
    fi
  fi
}

apply_ai_env_defaults() {
  local ai_env_file="$1"
  local defaults_file="$2"
  load_ai_defaults "$defaults_file"
  set_env_value "$ai_env_file" "LLM_PROVIDER" "${LLM_PROVIDER:-huggingface}"
  set_env_value "$ai_env_file" "HF_MODEL" "${HF_MODEL:-meta-llama/Llama-3.1-8B-Instruct}"
  set_env_value "$ai_env_file" "HF_API_BASE" "${HF_API_BASE:-https://router.huggingface.co/v1}"
  set_env_value "$ai_env_file" "LLM_REQUEST_TIMEOUT_MS" "${LLM_REQUEST_TIMEOUT_MS:-600000}"
  set_env_value "$ai_env_file" "HF_ASR_MODEL" "${HF_ASR_MODEL:-openai/whisper-large-v3}"
  set_env_value "$ai_env_file" "HF_ASR_API_URL" "${HF_ASR_API_URL:-}"
  set_env_value "$ai_env_file" "ASR_REQUEST_TIMEOUT_MS" "${ASR_REQUEST_TIMEOUT_MS:-600000}"
  set_env_value "$ai_env_file" "OLLAMA_BASE_URL" "${OLLAMA_BASE_URL:-http://host.docker.internal:11434}"
  set_env_value "$ai_env_file" "OLLAMA_MODEL" "${OLLAMA_MODEL:-llama3.2:3b}"
  set_env_value "$ai_env_file" "NLP_CONFIDENCE_THRESHOLD" "${NLP_CONFIDENCE_THRESHOLD:-0.65}"
}

preserve_hf_token() {
  local ai_env_file="$1"
  local token="${HF_API_TOKEN:-$(env_value "$ai_env_file" HF_API_TOKEN)}"
  if [[ -n "$token" ]]; then
    set_env_value "$ai_env_file" "HF_API_TOKEN" "$token"
    return 0
  fi
  return 1
}

validate_ai_env() {
  local ai_env_file="$1"
  local provider
  provider="$(env_value "$ai_env_file" LLM_PROVIDER)"
  provider="${provider:-huggingface}"

  if [[ "$provider" == "huggingface" ]]; then
    local token
    token="$(env_value "$ai_env_file" HF_API_TOKEN)"
    if [[ -z "$token" ]]; then
      echo "WARN: HF_API_TOKEN is empty in ${ai_env_file} — cloud LLM and ASR will fail." >&2
      return 1
    fi
    if [[ ! "$token" =~ ^hf_ ]]; then
      echo "WARN: HF_API_TOKEN in ${ai_env_file} does not look like a Hugging Face token (expected hf_…)." >&2
      return 1
    fi
    return 0
  fi

  if [[ "$provider" == "ollama" ]]; then
    local base
    base="$(env_value "$ai_env_file" OLLAMA_BASE_URL)"
    if [[ -z "$base" ]]; then
      echo "WARN: OLLAMA_BASE_URL is empty in ${ai_env_file} when LLM_PROVIDER=ollama." >&2
      return 1
    fi
    echo "INFO: LLM_PROVIDER=ollama — ASR still uses Hugging Face unless HF_ASR_API_URL points elsewhere." >&2
    return 0
  fi

  echo "WARN: Unknown LLM_PROVIDER=${provider} in ${ai_env_file}" >&2
  return 1
}

# Back-compat alias
validate_hf_env() {
  validate_ai_env "$@"
}

normalize_deploy_env_files() {
  local demo_root="$1"
  local f
  for f in \
    "${demo_root}/.env" \
    "${demo_root}/.env.example" \
    "${demo_root}/config/ai.env" \
    "${demo_root}/config/ai.env.example" \
    "${demo_root}/deploy/.env.example"; do
    normalize_lf_file "$f"
  done
}

source_env_files() {
  local demo_root="$1"
  local env_file="${demo_root}/.env"
  local ai_env="${demo_root}/config/ai.env"
  normalize_deploy_env_files "${demo_root}"
  set -a
  # shellcheck disable=SC1090
  [[ -f "$env_file" ]] && source "$env_file"
  # shellcheck disable=SC1090
  [[ -f "$ai_env" ]] && source "$ai_env"
  set +a
}

# Strip CRLF from deploy scripts (Windows zip / checkout). Safe to call repeatedly.
normalize_lf_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  if command -v dos2unix >/dev/null 2>&1; then
    dos2unix -q "$f" 2>/dev/null || true
  else
    sed -i 's/\r$//' "$f" 2>/dev/null || sed -i '' 's/\r$//' "$f" 2>/dev/null || true
  fi
}

normalize_lf_tree() {
  local root="$1"
  local f
  while IFS= read -r -d '' f; do
    normalize_lf_file "$f"
  done < <(
    find "$root" -type f \( \
      -name '*.sh' -o -name '*.bash' -o -name '*.cjs' -o \
      -name '.env' -o -name '.env.example' -o -name '*.env' -o -name '*.env.example' \
    \) -print0 2>/dev/null
  )
}
