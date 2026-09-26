#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-3001}"
LOG="/tmp/athamu_tunnel_${PORT}.log"
if lsof -ti tcp:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "OK_PORT_${PORT}"
else
  echo "DOWN_PORT_${PORT}"
  exit 1
fi
if command -v ssh >/dev/null 2>&1; then
  nohup ssh -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes -R 80:localhost:${PORT} nokey@localhost.run > "${LOG}" 2>&1 &
  sleep 2
  if [ -f "${LOG}" ]; then
    URL=$(grep -oE 'https://[a-z0-9-]+\.lhr\.life' "${LOG}" | head -1 || true)
    if [ -n "${URL}" ]; then
      echo "TUNNEL_UP=${URL}"
      echo "${URL}" > "/tmp/athamu_tunnel_url_${PORT}.txt"
      exit 0
    fi
  fi
fi
echo "TUNNEL_SETUP_REQUIRED"
exit 2
