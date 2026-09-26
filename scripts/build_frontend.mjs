// Build del frontend CRM-web usando la API JS de Vite.
// Por qué así: el CLI (./node_modules/.bin/vite) puede quedar colgado o bloqueado
// en algunos entornos; la API JS es más predecible y permite heartbeat de progreso.
//
// Uso:  node scripts/build_frontend.mjs
//
// IMPORTANTE (rendimiento): el plugin @tailwindcss/vite escanea todo el proyecto
// buscando clases. Mantén .gitignore excluyendo árboles grandes (backups android,
// .venv, zips, node_modules anidados) o el build se cuelga en "transforming...".
import { build } from 'vite';

const ROOT = process.cwd();
const t0 = Date.now();

console.log('[build] inicio', new Date().toISOString());
console.log('[build] root:', ROOT);

const tick = setInterval(() => {
  console.log(`[build] ...sigue corriendo ${Math.round((Date.now() - t0) / 1000)}s`);
}, 15000);

try {
  await build({
    root: ROOT,
    configFile: `${ROOT}/vite.config.ts`,
    logLevel: 'info',
  });
  console.log(`[build] OK en ${Math.round((Date.now() - t0) / 1000)}s`);
  clearInterval(tick);
} catch (err) {
  console.log('[build] FALLO tras', Math.round((Date.now() - t0) / 1000), 's');
  console.log('[build] error:', err && (err.stack || err.message || String(err)));
  clearInterval(tick);
  process.exitCode = 1;
}
