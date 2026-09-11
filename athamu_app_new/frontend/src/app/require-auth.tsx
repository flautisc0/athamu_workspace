'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSessionFromStorage } from '../lib/auth'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const session = getSessionFromStorage()
    if (!session) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) {
    return (
      <main style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#a3a3a3',
      }}>
        Cargando...
      </main>
    )
  }

  return <>{children}</>
}
