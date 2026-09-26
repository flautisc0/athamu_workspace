#!/bin/bash
# Script de pruebas de tunneling - ATHAMU
set -e

# Verificar servicios locales
echo "=== 1. VERIFICANDO SERVICIOS LOCALES ==="
for port in 9119 8080 3000 5173 8090 8889; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:$port/ 2>/dev/null || echo "FAIL")
  echo "Puerto $port: $code"
done

# Skytunnel
echo -e "\n=== 2. SKYTUNNEL TEST ==="
timeout 10 ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -R 443:localhost:8889 skytunnel.pp.ua 2>&1 &
sleep 8
echo "Skytunnel resultado: $(curl -s --max-time 5 https://williams-apparently-regulations-players.trycloudflare.com/ 2>&1 | head -c 100 || echo 'FALLA')"

# Cloudflared con tunnel existente  
echo -e "\n=== 3. CLOUDFLARED CON TUNNEL NOMBREADO ==="
cloudflared tunnel run --config /home/flautisc0/.cloudflared/config.yml &
sleep 10
echo "HTTP status: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://atha-tuapp.trycloudflare.com/ 2>&1 || echo 'FAIL')"
echo "Content sample: $(curl -s --max-time 10 https://atha-tuapp.trycloudflare.com/ 2>&1 | head -c 200 || echo 'FALLA')"

# FlareGUI
echo -e "\n=== 4. FLAREGUI TEST ==="
pkill -9 -f "flaregui" 2>/dev/null || true
sleep 2
flaregui --port 8889 &
sleep 8
echo "FlareGUI URL: $(curl -s --max-time 5 https://atha-tuapp.trycloudflare.com/ 2>&1 | head -c 100 || echo 'FALLA')"
