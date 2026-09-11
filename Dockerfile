FROM node:20-slim AS build
WORKDIR /app
COPY package.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiar build frontend Vite
COPY --from=build /app/dist ./dist

# Copiar server.js y package.json
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

# Instalar dependencias de producción (server.js + proxy)
RUN npm install --omit=dev

# Instalar PHP para admin panel
RUN apt-get update -qq && apt-get install -y -qq php-cli php-sqlite3 php-pdo > /dev/null 2>&1 && rm -rf /var/lib/apt/lists/*

# Copiar archivos PHP admin panel + schema SQLite
COPY --from=build /app/admin-api.php /app/admin-ui.php /app/schema_sqlite.sql /app/

EXPOSE 8080
CMD ["node", "server.js"]
