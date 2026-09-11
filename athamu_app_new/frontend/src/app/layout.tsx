import { headers } from 'next/headers'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const forwarded = (await headers()).get('x-forwarded-proto') || ''
  const host = (await headers()).get('host') || ''
  const isExternal = host !== 'localhost:3001' && host !== '127.0.0.1:3001'
  const backendUrl = isExternal
    ? `https://crm-v1-uc-897089213264.us-central1.run.app`
    : ''

  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {backendUrl && (
          <meta name="crm-url" content={`${backendUrl}`} />
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}