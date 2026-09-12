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

apply_ai_env_defaults() {
  local env_file="$1"
  local defaults_file="$2"
  load_ai_defaults "$defaults_file"
  set_env_value "$env_file" "LLM_PROVIDER" "${LLM_PROVIDER:-huggingface}"
  set_env_value "$env_file" "HF_MODEL" "${HF_MODEL:-meta-llama/Llama-3.1-8B-Instruct}"
  set_env_value "$env_file" "HF_API_BASE" "${HF_API_BASE:-https://router.huggingface.co/v1}"
  set_env_value "$env_file" "LLM_REQUEST_TIMEOUT_MS" "${LLM_REQUEST_TIMEOUT_MS:-600000}"
  set_env_value "$env_file" "HF_ASR_MODEL" "${HF_ASR_MODEL:-openai/whisper-large-v3}"
  set_env_value "$env_file" "HF_ASR_API_URL" "${HF_ASR_API_URL:-}"
  set_env_value "$env_file" "ASR_REQUEST_TIMEOUT_MS" "${ASR_REQUEST_TIMEOUT_MS:-600000}"
  set_env_value "$env_file" "NLP_CONFIDENCE_THRESHOLD" "${NLP_CONFIDENCE_THRESHOLD:-0.65}"
}

preserve_hf_token() {
  local env_file="$1"
  local token="${HF_API_TOKEN:-$(env_value "$env_file" HF_API_TOKEN)}"
  if [[ -n "$token" ]]; then
    set_env_value "$env_file" "HF_API_TOKEN" "$token"
    return 0
  fi
  return 1
}

validate_hf_env() {
  local env_file="$1"
  local token
  token="$(env_value "$env_file" HF_API_TOKEN)"
  if [[ -z "$token" ]]; then
    echo "WARN: HF_API_TOKEN is empty in ${env_file} — transcription and LLM will fail." >&2
    return 1
  fi
  if [[ ! "$token" =~ ^hf_ ]]; then
    echo "WARN: HF_API_TOKEN in ${env_file} does not look like a Hugging Face token (expected hf_…)." >&2
    return 1
  fi
  return 0
}
