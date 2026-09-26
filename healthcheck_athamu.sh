#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="http://127.0.0.1:5052"
HEALTH_ENDPOINT="${BACKEND_URL}/health"
JARVIS_ENDPOINT="${BACKEND_URL}/jarvis/summary"
TELEGRAM_ENV="/home/flautisc0/.hermes/profiles/personal/.env"
CHAT_ID="1482651780"

send_telegram() {
  local text="$1"
  if [[ -f "$TELEGRAM_ENV" ]]; then
    local token
    token=$(grep -oP '^TELEGRAM_BOT_TOKEN=\K.*' "$TELEGRAM_ENV" | head -n 1 || true)
    if [[ -n "$token" ]]; then
      curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
        -d chat_id="${CHAT_ID}" \
        -d text="$text" \
        -d parse_mode="Markdown" >/dev/null 2>&1 || true
    fi
  fi
}

check_endpoint() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [[ "$code" != "200" ]]; then
    send_telegram "ATHA ALERTA: ${name} no responde en ${url} (HTTP ${code})"
    return 1
  fi
  return 0
}

check_endpoint "Backend /health" "$HEALTH_ENDPOINT"
check_endpoint "Jarvis /jarvis/summary" "$JARVIS_ENDPOINT"
