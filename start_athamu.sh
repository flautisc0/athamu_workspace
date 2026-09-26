#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="/home/flautisc0/athamu_workspace/athamu_app_new/backend"
FRONTEND_DIR="/home/flautisc0/athamu_workspace/athamu_app_new/frontend"
BACKEND_PORT=5052
FRONTEND_PORT=3003

# 1) Backend
if ! ss -ltnp | grep -q ":${BACKEND_PORT}"; then
  echo "[start_athamu] levantando backend en :${BACKEND_PORT}"
  cd "${BACKEND_DIR}"
  source .venv/bin/activate
  flask run --host=0.0.0.0 --port="${BACKEND_PORT}" >/tmp/athamu_backend.log 2>&1 &
else
  echo "[start_athamu] backend ya activo en :${BACKEND_PORT}"
fi

# 2) Frontend (standalone build)
if ! ss -ltnp | grep -q ":${FRONTEND_PORT}"; then
  echo "[start_athamu] levantando frontend en :${FRONTEND_PORT}"
  cd "${FRONTEND_DIR}"
  PORT="${FRONTEND_PORT}" node .next/standalone/server.js >/tmp/athamu_frontend.log 2>&1 &
else
  echo "[start_athamu] frontend ya activo en :${FRONTEND_PORT}"
fi

# 3) Esperar salud
sleep 3
if curl -sf http://127.0.0.1:${BACKEND_PORT}/health >/dev/null; then
  echo "[start_athamu] backend OK"
else
  echo "[start_athamu] backend FAIL"
fi

if curl -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null; then
  echo "[start_athamu] frontend OK"
else
  echo "[start_athamu] frontend FAIL"
fi

echo "[start_athamu] stack listo"
echo "Backend: http://127.0.0.1:${BACKEND_PORT}"
echo "Frontend: http://127.0.0.1:${FRONTEND_PORT}"
