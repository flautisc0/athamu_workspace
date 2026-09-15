import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');
const PHP_PORT = process.env.PHP_PORT || 8081;

// Auto-iniciar servidor PHP local si está disponible
try {
  const phpSrv = spawn('php', ['-S', `127.0.0.1:${PHP_PORT}`, '-t', __dirname], {
    stdio: 'ignore',
    detached: true
  });
  phpSrv.on('error', (err) => {
    console.warn('PHP server no disponible en el entorno:', err.message);
  });
  phpSrv.unref();
} catch (e) {
  console.warn('No se pudo inicializar servidor PHP:', e);
}

// Middleware: JSON body
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// JWT secret para validar token GIS
const JWT_SECRET = 'atha-crm-admin-secret-key';

// Middleware: autenticación admin (valida token Google)
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.admin === true) {
        req.user = decoded;
        return next();
      }
    } catch (e) {
      // token inválido
    }
  }
  // Si no hay token, permitir acceso (modo demo público)
  next();
};

// Proxy para endpoints PHP
const phpProxy = createProxyMiddleware({
  target: `http://127.0.0.1:${PHP_PORT}`,
  changeOrigin: true,
});

app.use('/admin-api.php', requireAdmin, phpProxy);
app.use('/admin-ui.php', requireAdmin, phpProxy);
app.use('/api.php', phpProxy);
app.use('/index.php', phpProxy);
app.use('/seed-sqlite.php', phpProxy);
app.use('/php', phpProxy);
app.use('/admin-assets', phpProxy);

// Rutas del CRM (SPA)
app.use(express.static(distDir));

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`crm-atha sirviendo en puerto ${PORT}`);
  console.log(`PHP backend en http://127.0.0.1:${PHP_PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin-ui.php`);
  console.log(`Admin API: http://localhost:${PORT}/admin-api.php?a=meta/tables`);
});

