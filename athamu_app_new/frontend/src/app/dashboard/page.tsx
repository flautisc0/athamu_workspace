'use client'
import RequireAuth from '../require-auth'
import { useEffect, useState } from 'react'

type Dash = {
  members_count: number
  projects_count: number
  uploads_count: number
}

export default function Dashboard() {
  const [data, setData] = useState<Dash | null>(null)

  useEffect(() => {
    fetch('/api/dashboard', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  return (
    <RequireAuth>
      <main>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 1.25rem 6rem' }}>
          <div style={{ marginBottom: 22 }}>
            <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.35em', textTransform: 'uppercase', color: '#9ca3af' }}>Resumen</p>
            <h1 style={{ marginTop: 10, fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1, color: '#ffffff' }}>Dashboard</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            <Card label="Miembros" value={data ? String(data.members_count) : '—'} />
            <Card label="Proyectos" value={data ? String(data.projects_count) : '—'} />
            <Card label="Archivos" value={data ? String(data.uploads_count) : '—'} />
            <Card label="Estado" value="Backend OK" />
          </div>
        </section>
      </main>
    </RequireAuth>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      border: '1px solid #1f2937',
      borderRadius: 16,
      padding: 18,
      background: 'rgba(255,255,255,0.04)',
    }}>
      <p style={{ fontSize: 12, letterSpacing: '.15em', textTransform: 'uppercase', color: '#9ca3af' }}>{label}</p>
      <p style={{ marginTop: 10, color: '#f3f4f6', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700 }}>{value}</p>
    </div>
  )
}
