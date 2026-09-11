/**
 * Utilidades de sesion de usuario para CRM.
 * Lee la sesion guardada por el flow de login de crm-v1-uc (Google Identity Services).
 * Compatible con SSR: siempre opera sobre `window` y devuelve null en server.
 */

export interface UserSession {
  user_id: string
  display_name: string | null
  email: string
  avatar_url: string | null
  role: string
  role_title: string | null
  provider: string
}

/**
 * Obtiene la sesion de usuario desde localStorage (`user_session`).
 * Devuelve null si no hay sesion o si no esta disponible `window`.
 */
export function getSessionFromStorage(): UserSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.user_id && parsed.email) {
      return parsed as UserSession
    }
    return null
  } catch {
    return null
  }
}

/**
 * Obtiene el nombre de usuario para mostrar.
 * Prioriza la sesion de localStorage, cae al cookie `atha_name` si existe,
 * y finalmente devuelve 'ATHA' como valor por defecto.
 */
export function getUserName(): string {
  const session = getSessionFromStorage()
  if (session?.display_name && session.display_name.trim() !== '') {
    return session.display_name
  }
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)atha_name=([^;]+)/)
    if (m) {
      try {
        const decoded = decodeURIComponent(m[1])
        if (decoded && decoded !== '') return decoded
      } catch {}
    }
  }
  return 'ATHA'
}

/**
 * Obtiene la URL del avatar del usuario.
 * Prioriza la sesion de localStorage (`avatar_url`).
 */
export function getUserAvatar(): string {
  const session = getSessionFromStorage()
  if (session?.avatar_url && session.avatar_url.trim() !== '') {
    return session.avatar_url
  }
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)atha_picture=([^;]+)/)
    if (m) {
      try {
        return decodeURIComponent(m[1])
      } catch {}
    }
  }
  return ''
}
