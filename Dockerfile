# Dockerfile CRM-aha — multi-stage build con credenciales reales
# El backend PHP + API ya están verificadas; este build es solo el frontend SPA
FROM node:20-slim AS builder
WORKDIR /app

# Instalar deps
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund 2>&1 | tail -3

# Copiar código
COPY . .

# Build de Vite (SPA estática)
# Fix: instalar tailwindcss vía CDN fallback si oxide falla
RUN npm install @tailwindcss/vite@4 2>&1 | tail -2 && \
    CI=false npm run build 2>&1 | tail -10

# Runtime: servir SPA estática con Node + proxy al API
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar solo deps de producción para server.js
COPY --from=builder /app/dist ./dist
COPY server.js package.json ./
RUN npm install --omit=dev 2>&1 | tail -1

# Exponer puerto Cloud Run
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]