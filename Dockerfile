FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiar frontend Vite ya construido
COPY dist ./dist

# Copiar server.js y package.json (con deps de producción)
COPY server.js package.json ./

# Instalar solo deps de producción (http-proxy-middleware, jsonwebtoken)
RUN npm install --omit=dev 2>&1 | tail -3

# Instalar PHP + extensiones para admin panel
RUN apt-get update -qq && apt-get install -y -qq php-cli php-sqlite3 php-pdo > /dev/null 2>&1 && rm -rf /var/lib/apt/lists/*

# Copiar archivos PHP admin panel + schema SQLite
COPY admin-api.php admin-ui.php schema_sqlite.sql ./

# Crear /tmp/atha_crm.db vacío (el api.php lo inicializa con schema)
RUN touch /tmp/atha_crm.db && chmod 666 /tmp/atha_crm.db

EXPOSE 8080
CMD ["node", "server.js"]
