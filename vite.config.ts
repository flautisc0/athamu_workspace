import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { defineConfig } from 'vite';

let phpServerStarted = false;

function ensurePhpServer() {
  if (phpServerStarted) return;
  phpServerStarted = true;
  try {
    const srv = spawn('php', ['-S', '127.0.0.1:8081', '-t', '.'], {
      stdio: 'ignore',
      detached: true,
    });
    srv.on('error', (err) => {
      console.warn('PHP server no disponible (modo TypeScript fallback activo):', err.message);
    });
    srv.unref();
  } catch (err) {
    console.warn('Could not spawn local PHP server:', err);
  }
}

function faseApiPlugin() {
  return {
    name: 'fase-api-middleware',
    configureServer(server: any) {
      ensurePhpServer();

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '';

        // Si se pide index.php en desarrollo, redirigir al index Vite
        if (url === '/index.php' || url.startsWith('/index.php?')) {
          res.writeHead(302, { Location: '/' });
          res.end();
          return;
        }

        // Enrutar todas las peticiones .php y endpoints del ecosistema al servidor PHP
        const isPhpRequest =
          url.endsWith('.php') ||
          url.includes('.php?') ||
          url.startsWith('/php/') ||
          url === '/php' ||
          url.startsWith('/admin-api') ||
          url.startsWith('/admin-ui');

        if (isPhpRequest) {
          const options = {
            hostname: '127.0.0.1',
            port: 8081,
            path: url,
            method: req.method,
            headers: {
              ...req.headers,
              host: '127.0.0.1:8081',
            },
          };

          const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res);
          });

          proxyReq.on('error', async () => {
            try {
              const { handleApiRequest } = await import('./src/server/apiHandler.ts');
              const handled = await handleApiRequest(req, res);
              if (handled) return;
            } catch (e) {
              console.error('PHP proxy fallback error:', e);
            }
            next();
          });

          req.pipe(proxyReq);
          return;
        }

        if (url.startsWith('/api/')) {
          try {
            const { handleApiRequest } = await import('./src/server/apiHandler.ts');
            const handled = await handleApiRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('API middleware error:', err);
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), faseApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
