import type { NextConfig } from 'next'

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://crm-v1-uc-897089213264.us-central1.run.app'

// El backend Flask expone sus blueprints en varios prefijos (/auth, /athamu,
// /calendar, /notifications, /api, etc.). Reescribimos todas las rutas de API
// al backend para que el WebView (servido por túnel Cloudflare) las alcance.
const nextConfig: NextConfig = {
  output: 'standalone',
  // Mockup ATHA: imágenes remotas de Unsplash para los proyectos
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Apagar el indicador "N" de Next.js dev (causa overlay en APK debug)
  devIndicators: false,
  // Doble seguridad: variable de entorno para el server
  env: {
    NEXT_DISABLE_DEVTOOLS: '1',
    NEXT_DISABLE_OVERLAY: '1',
  },
  async rewrites() {
    return [
      // Rutas que el frontend llama sin prefijo /api
      { source: '/auth/:path*', destination: `${BACKEND}/auth/:path*` },
      { source: '/athamu/:path*', destination: `${BACKEND}/athamu/:path*` },
      { source: '/calendar/:path*', destination: `${BACKEND}/calendar/:path*` },
      { source: '/notifications/:path*', destination: `${BACKEND}/notifications/:path*` },
      { source: '/projects/:path*', destination: `${BACKEND}/projects/:path*` },
      { source: '/artists/:path*', destination: `${BACKEND}/artists/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
      { source: '/dossier/:path*', destination: `${BACKEND}/dossier/:path*` },
      { source: '/budget/:path*', destination: `${BACKEND}/budget/:path*` },
      { source: '/downloads/:path*', destination: `${BACKEND}/downloads/:path*` },
      { source: '/tasks/:path*', destination: `${BACKEND}/tasks/:path*` },
      { source: '/plans/:path*', destination: `${BACKEND}/plans/:path*` },
      { source: '/grants/:path*', destination: `${BACKEND}/grants/:path*` },
      { source: '/jarvis/crm/:path*', destination: `${BACKEND}/jarvis/crm/:path*` },
      { source: '/jarvis/:path*', destination: `${BACKEND}/jarvis/:path*` },
      // Rutas bajo /api del frontend -> backend sin /api (los blueprints de poi/tasks/plans
      // ya viven en /api en el backend; las demás se resuelven quitando /api)
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
    ]
  },
  // Anti-cache: el WebView de Android a veces cachea HTML/JS/CSS.
  // Forzamos que siempre pida al server para iterar sin desinstalar.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },
}

export default nextConfig
