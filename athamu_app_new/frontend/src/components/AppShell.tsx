'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────
type Role = 'socio' | 'artista' | 'publico'

// --- Importaciones de utils de autenticacion ---
import { getUserName, getUserAvatar, getSessionFromStorage } from '../lib/auth'

// ─── Navigation tree ─────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { label: 'Inicio',      href: '/',             icon: '🏠' },
      { label: 'Dashboard',   href: '/dashboard',    icon: '📊' },
      { label: 'Perfil',      href: '/perfil',       icon: '👤' },
    ],
  },
  {
    label: 'Portafolio y obras',
    items: [
      { label: 'Obras',       href: '/obras',         icon: '🎭' },
      { label: 'Artistas',    href: '/artistas',      icon: '🎻' },
      { label: 'Documentos',  href: '/documentos',    icon: '📁' },
      { label: 'Subir archivo', href: '/upload',      icon: '⬆️' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { label: 'CRM',         href: '/crm',           icon: '🤝' },
      { label: 'Fondos',      href: '/fondos',        icon: '💼' },
      { label: 'Calendario',  href: '/calendario',    icon: '📅' },
      { label: 'Mensajes',    href: '/mensajes',      icon: '✉️' },
      { label: 'Noticias',    href: '/noticias',      icon: '📰' },
    ],
  },
  {
    label: 'Territorio',
    items: [
      { label: 'Mapa cultural', href: '/mapa-cultural', icon: '🗺️' },
      { label: 'Mapa POIs',   href: '/mapa-pois',     icon: '📍' },
      { label: 'Radar cultural', href: '/radar-cultural', icon: '🔍' },
      { label: 'Red cultural', href: '/red-cultural', icon: '🌐' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'ATHAMU',      href: '/athamu',        icon: '🤖' },
      { label: 'Coordinator', href: '/coordinator',   icon: '⚙️' },
      { label: 'Servicios',   href: '/servicios',     icon: '🎯' },
      { label: 'Eventos',     href: '/eventos',       icon: '📆' },
      { label: 'Correos',     href: '/correo',        icon: '📬' },
      { label: 'Empaquetamiento', href: '/empaquetamiento', icon: '📦' },
    ],
  },
]

// ─── Drawer ──────────────────────────────────────────────────
function Drawer({
  open,
  onClose,
  pathname,
}: {
  open: boolean
  onClose: () => void
  pathname: string
}) {
  const name = getUserName()
  const role = 'socio'
  const picture = getUserAvatar()
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Trap focus inside drawer when open
  useEffect(() => {
    if (open) drawerRef.current?.focus()
  }, [open])

  function logout() {
    ['atha_token', 'atha_role', 'atha_name', 'atha_modo', 'atha_picture'].forEach(k => {
      document.cookie = `${k}=; path=/; max-age=0`
    })
    onClose()
    router.replace('/login')
  }

  const ROLE_LABELS: Record<string, string> = {
    socio: 'Socio del equipo',
    artista: 'Artista',
    publico: 'Público / Colaborador',
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
          zIndex: 60, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .22s ease',
        }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 288, background: '#0a0a0a',
          borderRight: '1px solid #1a1a1a',
          zIndex: 70, display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          outline: 'none',
        }}
      >
        {/* Profile header */}
        <div style={{
          padding: '28px 20px 20px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: '#111', border: '2px solid #333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 600, color: '#888', overflow: 'hidden', flexShrink: 0,
          }}>
            {picture
              ? <img src={picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (name[0] || 'A').toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              {ROLE_LABELS[role] || role}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                color: '#444', padding: '14px 20px 4px', textTransform: 'uppercase',
              }}>
                {section.label}
              </div>
              {section.items.map(item => {
                const active = item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13,
                      padding: '11px 20px',
                      color: active ? '#fafafa' : '#888',
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      textDecoration: 'none', fontSize: 14, fontWeight: active ? 500 : 400,
                      borderLeft: `3px solid ${active ? '#fafafa' : 'transparent'}`,
                      transition: 'background .12s, color .12s',
                    }}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1a1a1a' }}>
          <button
            onClick={logout}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: 'transparent', border: '1px solid #1a1a1a',
              color: '#666', fontSize: 13, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span>⏎</span> Cerrar sesión
          </button>
          <div style={{ marginTop: 10, fontSize: 11, color: '#333' }}>
            ATHA Producciones · v1.0
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Topbar ──────────────────────────────────────────────────
function Topbar({ onMenuOpen, title }: { onMenuOpen: () => void; title: string }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(5,5,5,.92)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #1a1a1a', height: 56,
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
    }}>
      <button
        onClick={onMenuOpen}
        aria-label="Abrir menú"
        style={{
          background: 'none', border: 'none', color: '#999',
          fontSize: 22, cursor: 'pointer', padding: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, lineHeight: 1,
        }}
      >
        ☰
      </button>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <span style={{
          fontSize: 15, fontWeight: 500, color: '#fafafa',
          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button aria-label="Notificaciones" style={{ background: 'none', border: '1px solid #1a1a1a', color: '#777', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16 }}>🔔</button>
        <button aria-label="Más opciones" style={{ background: 'none', border: '1px solid #1a1a1a', color: '#777', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 14 }}>⋮</button>
      </div>
    </header>
  )
}

// ─── Shell ───────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  // Derive page title from pathname
  const allItems = NAV_SECTIONS.flatMap(s => s.items)
  const active = allItems.find(i =>
    i.href === '/' ? pathname === '/' : pathname === i.href || pathname.startsWith(i.href + '/')
  )
  const pageTitle = active?.label ?? 'ATHA Producciones'

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  if (isLogin) return <>{children}</>

  return (
    <>
      <Topbar onMenuOpen={() => setDrawerOpen(true)} title={pageTitle} />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathname={pathname}
      />
      <main style={{ paddingTop: 56, minHeight: '100svh', position: 'relative' }}>
        {children}
      </main>
    </>
  )
}
