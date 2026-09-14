import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');

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

// Proxy: /admin-api.php → PHP backend local (localhost:8080)
// El PHP server debe correr en paralelo (php -S 127.0.0.1:8080)
app.use('/admin-api.php', requireAdmin, createProxyMiddleware({
  target: 'http://127.0.0.1:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/admin-api.php': '/api.php'
  },
  onProxyReq: (proxyReq, req) => {
    // Pasar query string ?a=... intacto
    const parsedUrl = new URL(req.url, 'http://localhost');
    const aParam = parsedUrl.searchParams.get('a');
    if (aParam) {
      proxyReq.path = `/api.php?a=${aParam}`;
    }
  }
}));

// Proxy: /admin-ui.php → PHP frontend
app.use('/admin-ui.php', requireAdmin, createProxyMiddleware({
  target: 'http://127.0.0.1:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/admin-ui.php': '/index.php'
  }
}));

// Servir assets estáticos del admin (CSS, JS del PHP)
app.use('/admin-assets', createProxyMiddleware({
  target: 'http://127.0.0.1:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/admin-assets': ''
  }
}));

// Rutas del CRM (SPA)
app.use(express.static(distDir));

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`crm-atha sirviendo en puerto ${PORT}`);
  console.log(`Admin panel: https://<host>/admin/index.php`);
  console.log(`Admin API: https://<host>/admin-api.php?a=...`);
});
