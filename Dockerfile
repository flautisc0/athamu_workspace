FROM node:20-slim AS build
WORKDIR /app
COPY package.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiar build frontend
COPY --from=build /app/dist ./dist

# Copiar server.js y package.json
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

# Instalar dependencias de producción (server.js + proxy)
RUN npm install --omit=dev

# Copiar archivos PHP del admin panel
COPY --from=build /app/admin-api.php ./admin-api.php
COPY --from=build /app/admin-ui.php ./admin-ui.php

# Instalar PHP para ejecutar admin panel
RUN apt-get update -qq && apt-get install -y -qq php-cli php-sqlite3 php-pdo > /dev/null 2>&1 && rm -rf /var/lib/apt/lists/*

# Copiar schema SQLite + archivos PHP admin
COPY --from=build /app/schema_sqlite.sql /app/admin-api.php /app/admin-ui.php /app/

EXPOSE 8080
CMD ["node", "server.js"]
