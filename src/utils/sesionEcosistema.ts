/**
 * Sesión compartida del ecosistema ATHA · CLAVE ÚNICA `atha_user_session`.
 *
 * EL BUG QUE ESTO ARREGLA: el CRM guardaba la sesión en `user_session` pero al
 * abrir Planner/Arquitecto la buscaba en `user_profile` (clave que NUNCA se
 * escribía) → no encontraba nada → abría el artefacto sin sesión y el usuario
 * tenía que loguearse de nuevo. Además los artefactos esperan
 * `atha_user_session`, así que había TRES claves para el mismo dato.
 *
 * Regla del ecosistema: el CRM es el proveedor de identidad. La sesión se guarda
 * siempre en `atha_user_session` (con `user_session` como compatibilidad) y se
 * pasa a los artefactos por URL, junto con el rol.
 */

export interface SesionCrm {
  id?: string;
  email: string;
  name: string;
  role: string;
  roleTitle?: string;
  avatar?: string;
  provider?: string;
  [k: string]: any;
}

const CLAVE = 'atha_user_session';
const CLAVE_LEGACY = 'user_session';
const CLAVE_TOKEN = 'atha_auth_token';

/** Artefactos que saben adoptar la sesión desde la URL. */
const CON_SESION = new Set(['planner', 'arquitecto', 'buscador', 'ticketer']);

/** Normaliza lo que haya guardado (tolera formatos viejos y anidados). */
function normalizar(u: any): SesionCrm | null {
  if (!u || typeof u !== 'object') return null;
  const base = u.user && typeof u.user === 'object' ? { ...u, ...u.user } : u;
  const email = String(base.email || base.google_email || '').trim();
  if (!email) return null;
  return {
    ...base,
    email,
    name: base.name || base.displayName || base.google_name || email,
    role: String(base.role || 'artista'),
    roleTitle: base.roleTitle || base.role_title || '',
    avatar: base.avatar || base.picture || base.google_picture || '',
    provider: base.provider || 'google',
  };
}

/** Lee la sesión del CRM sea cual sea la clave que se haya usado. */
export function leerSesionCrm(): SesionCrm | null {
  for (const clave of [CLAVE, CLAVE_LEGACY]) {
    try {
      const raw = localStorage.getItem(clave);
      if (!raw) continue;
      const u = normalizar(JSON.parse(raw));
      if (u) return u;
    } catch {
      /* sigue con la otra clave */
    }
  }
  return null;
}

/**
 * Guarda la sesión SIEMPRE en la clave compartida (y en la vieja por
 * compatibilidad). Usar esta función en todo lugar que guarde sesión.
 */
export function guardarSesionCompartida(usuario: any, token?: string): void {
  try {
    const json = JSON.stringify(usuario);
    localStorage.setItem(CLAVE, json);
    localStorage.setItem(CLAVE_LEGACY, json);
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    window.dispatchEvent(new Event('user_session_updated'));
  } catch (e) {
    console.warn('[ATHA] no se pudo guardar la sesión compartida:', e);
  }
}

/** Borra la sesión en todas sus formas. */
export function limpiarSesionCompartida(): void {
  try {
    localStorage.removeItem(CLAVE);
    localStorage.removeItem(CLAVE_LEGACY);
    localStorage.removeItem(CLAVE_TOKEN);
    window.dispatchEvent(new Event('user_session_updated'));
  } catch {
    /* nada */
  }
}

/**
 * TOKEN DE SESIÓN DEL HUB.
 *
 * Es la credencial de verdad: el hub lo firma al loguear con Google y lo exige
 * en cada llamada (`Authorization: Bearer`). El correo en localStorage es sólo
 * para pintar la interfaz — no autoriza nada por sí solo.
 */
export function leerTokenCrm(): string {
  try {
    return localStorage.getItem(CLAVE_TOKEN) || '';
  } catch {
    return '';
  }
}

/** Cabecera de autorización lista para pegar en un fetch (o {} si no hay sesión). */
export function cabeceraToken(): Record<string, string> {
  const t = leerTokenCrm();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Rol normalizado para los artefactos (ellos distinguen dirección de artista). */
export function rolParaArtefacto(u: SesionCrm): string {
  const r = String(u.role || '').toLowerCase();
  if (r === 'admin' || r === 'director' || r === 'productor') return 'director';
  return 'artist';
}

/**
 * URL del artefacto con la identidad y el rol puestos (si hay sesión).
 *
 * `extra` agrega datos del contexto: por ejemplo `{ obra: '<id de la obra>' }` para que el
 * Planner o el Arquitecto abran el montaje que se estaba mirando en el CRM.
 */
export function urlConSesion(id: string, url: string, extra?: Record<string, string>): string {
  const agregar = (p: URLSearchParams) => {
    if (extra) for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  };
  if (!CON_SESION.has(id)) {
    if (!extra) return url;
    const q = new URLSearchParams();
    agregar(q);
    const cadena = q.toString();
    return cadena ? `${url}${url.includes('?') ? '&' : '?'}${cadena}` : url;
  }
  const u = leerSesionCrm();
  if (!u || !u.email) {
    if (!extra) return url;
    const q = new URLSearchParams();
    agregar(q);
    const cadena = q.toString();
    return cadena ? `${url}${url.includes('?') ? '&' : '?'}${cadena}` : url;
  }

  const p = new URLSearchParams();
  p.set('auth', '1');
  p.set('email', u.email);
  p.set('name', u.name || u.email);
  p.set('role', rolParaArtefacto(u));
  p.set('roleTitle', u.roleTitle || u.role);
  if (u.avatar) p.set('picture', u.avatar);
  agregar(p);

  return `${url}${url.includes('?') ? '&' : '?'}${p.toString()}`;
}

export default urlConSesion;
