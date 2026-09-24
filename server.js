import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import mysql from 'mysql2/promise';
import { randomUUID, randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------------------------------------------------------------------------
// CORS — el CRM es el HUB del ecosistema y las apps (Buscador de Fondos,
// Arquitecto, Planner) lo llaman desde OTRO origen. Sin estos encabezados el
// navegador bloquea las llamadas (y el preflight OPTIONS falla).
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');
const PHP_PORT = process.env.PHP_PORT || 8081;

// ---------------------------------------------------------------
// Base de datos (Cloud SQL MySQL: admin_crm)
// ---------------------------------------------------------------
const DB_CONF = {
  host: process.env.DB_HOST || '34.171.150.11',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin_crm',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
  connectTimeout: 10000,
};

let pool = null;
function getPool() {
  if (!pool) pool = mysql.createPool(DB_CONF);
  return pool;
}

// Direccion ATHA -> rol owner
const OWNER_EMAILS = ['panxo.sms@gmail.com', 'flautisco.contacto@gmail.com'];
const DEFAULT_COMPANY_ID = process.env.DEFAULT_COMPANY_ID || 'comp_9b626a8428c2';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';

// ---------------------------------------------------------------
// Helpers de autenticacion
// ---------------------------------------------------------------
function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function handleGoogleAuth(req, res) {
  try {
    const body = req.body || {};
    const idToken = body.id_token || body.credential;

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Falta id_token' });
    }

    const payload = await verificarTokenGoogle(idToken);
    if (!payload || !payload.email) {
      return res.status(401).json({ success: false, error: 'Token de Google inválido' });
    }

    const email = String(payload.email).toLowerCase().trim();
    // El nombre y la foto salen del TOKEN verificado, no del body del cliente.
    const name = payload.name || email;
    const picture = payload.picture || '';
    const googleSub = payload.sub || email;

    const isOwner = OWNER_EMAILS.includes(email);
    let persisted = false;
    let userId = null;
    let dbError = null;
    let esNuevo = false;
    let rol = isOwner ? 'admin' : ROL_ENTRADA;
    let roleTitle = isOwner ? 'Direccion General & Produccion Ejecutiva' : '';

    try {
      const db = getPool();
      const [rows] = await db.execute(
        'SELECT id, role, role_title FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (rows && rows.length) {
        userId = rows[0].id;
        // El ROL y el CARGO son de la base: NO se pisan con lo que mande el cliente.
        rol = rows[0].role || ROL_ENTRADA;
        roleTitle = rows[0].role_title || '';
        await db.execute(
          `UPDATE users SET display_name = ?, picture = ?, provider = 'google',
             google_id = COALESCE(google_id, ?), google_email = COALESCE(google_email, ?),
             google_name = COALESCE(google_name, ?), google_picture = COALESCE(google_picture, ?),
             updated_at = NOW()
           WHERE id = ?`,
          [name, picture, googleSub, email, name, picture, userId]
        );
        if (isOwner && rol !== 'admin') {
          await db.execute("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);
          rol = 'admin';
        }
      } else {
        // ALTA NUEVA: rol mínimo y SIN pertenencia a compañía.
        // Antes el alta insertaba en `company_members` de la compañía por defecto
        // con rol `coordinator` ⇒ `alcanceInventario` daba `puedeEscribir: true`
        // y un recién registrado editaba el inventario (reportado 2026-09-24).
        // El rol y la compañía los asigna un admin en Administración.
        esNuevo = true;
        userId = randomUUID();
        await db.execute(
          `INSERT INTO users (id, email, display_name, role, role_title, picture, provider,
             google_id, google_email, google_name, google_picture, public_profile, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'google', ?, ?, ?, ?, 0, NOW(), NOW())`,
          [userId, email, name, rol, roleTitle, picture, googleSub, email, name, picture]
        );
      }

      // La pertenencia `owner` del dueño se asegura sola (idempotente).
      // Para el resto, la pertenencia la administra el panel, no el login.
      if (isOwner) {
        const [member] = await db.execute(
          'SELECT id, role_in_company FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1',
          [userId, DEFAULT_COMPANY_ID]
        );
        if (member && member.length) {
          if (member[0].role_in_company !== 'owner') {
            await db.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?',
              ['owner', member[0].id]);
          }
        } else {
          const memberId = 'm_' + randomUUID().replace(/-/g, '').slice(0, 12);
          await db.execute(
            'INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?, ?, ?, ?, NOW())',
            [memberId, DEFAULT_COMPANY_ID, userId, 'owner']
          );
        }
      }

      persisted = true;
    } catch (e) {
      dbError = e.message;
      console.warn('[auth] BD no disponible, se continua con sesion local:', e.message);
    }

    // TOKEN DE SESIÓN DEL HUB: es la única credencial que sirve para llamar la API.
    const token = firmarSesion({
      email, name, display_name: name, role: rol, role_title: roleTitle, picture,
    });

    return res.json({
      success: true,
      data: {
        id: userId || googleSub,
        name,
        email,
        role: rol,
        role_title: roleTitle,
        picture,
        persisted,
        nuevo: esNuevo,
        token,
      },
      message: esNuevo
        ? 'Cuenta creada. Un administrador te asigna rol y compañía.'
        : (persisted ? 'Sesion iniciada' : 'Sesion local (base de datos no disponible)'),
      db_error: dbError || undefined,
    });
  } catch (e) {
    console.error('[auth] error inesperado:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ---------------------------------------------------------------
// Auto-iniciar servidor PHP local si esta disponible (dev)
// ---------------------------------------------------------------
try {
  const phpSrv = spawn('php', ['-S', `127.0.0.1:${PHP_PORT}`, '-t', __dirname], {
    stdio: 'ignore',
    detached: true,
  });
  phpSrv.on('error', (err) => {
    console.warn('PHP server no disponible en el entorno:', err.message);
  });
  phpSrv.unref();
} catch (e) {
  console.warn('No se pudo inicializar servidor PHP:', e);
}

// Middleware: JSON body
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// JWT secret: firma el TOKEN DE SESIÓN del hub (no sólo el viejo token admin).
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'atha-crm-admin-secret-key';

// ---------------------------------------------------------------
// IDENTIDAD DEL ECOSISTEMA · Tanda A (2026-09-24)
//
// ANTES: la identidad era un string que el cliente mandaba (`x-atha-email` o
// `?email=`) y el servidor creía a ciegas → `curl -H 'x-atha-email: <admin>'`
// era admin completo. Además `handleGoogleAuth` decodificaba el id_token SIN
// verificar la firma. Auditoría completa:
//   skills/atha-prod-hardening/references/auth-audit-and-single-use-ticket.md
//
// AHORA: el hub emite y verifica su PROPIO token (JWT firmado con JWT_SECRET).
// La identidad verificada se inyecta en `x-atha-email`, así que las ~25 guardias
// que ya existen (permisoAdmin, alcanceInventario, …) quedan correctas sin tocarlas.
//
// AUTH_MODO:
//   'estricto' → SÓLO token del hub (o ticket canjeado). Es el objetivo.
//   'mixto'    → acepta además el header/query viejo. Transición para no dejar
//                afuera a los artefactos que todavía no canjean ticket.
// ---------------------------------------------------------------
const AUTH_MODO = String(process.env.AUTH_MODO || 'mixto').toLowerCase();
const AUTH_ESTRICTO = AUTH_MODO === 'estricto';
const SESION_TTL = process.env.SESION_TTL || '7d';
const TICKET_TTL_SEG = Number(process.env.TICKET_TTL_SEG || 120);
// Rol con el que ENTRA alguien nuevo: mínimo, sin compañía, sin permisos.
// El rol real lo asigna un admin (o un director) en Administración.
const ROL_ENTRADA = process.env.ROL_ENTRADA || 'explorador';

/** Firma el token de sesión del hub para un usuario. */
function firmarSesion(u) {
  return jwt.sign(
    {
      email: String(u.email || '').toLowerCase(),
      name: u.display_name || u.name || '',
      role: u.role || ROL_ENTRADA,
      role_title: u.role_title || '',
      picture: u.picture || '',
    },
    JWT_SECRET,
    { expiresIn: SESION_TTL }
  );
}

/** Identidad VERIFICADA de la petición (token del hub), o null. */
function identidadDe(req) {
  const cab = String((req.headers && req.headers.authorization) || '');
  if (cab.startsWith('Bearer ')) {
    try {
      const d = jwt.verify(cab.slice(7).trim(), JWT_SECRET);
      if (d && d.email) {
        return { email: String(d.email).toLowerCase(), role: d.role || '', conToken: true };
      }
    } catch (e) {
      /* token inválido o vencido: se sigue (si el modo lo permite) */
    }
  }
  if (!AUTH_ESTRICTO) {
    const correo = String(
      (req.headers && req.headers['x-atha-email']) || (req.query && req.query.email) || ''
    ).trim().toLowerCase();
    if (correo) return { email: correo, role: '', conToken: false };
  }
  return null;
}

/** Email verificado de la sesión. Es lo que deben usar TODAS las guardias. */
function emailDeSesion(req) {
  if (req.identidad !== undefined) return req.identidad ? req.identidad.email : '';
  const s = identidadDe(req);
  return s ? s.email : '';
}

// Middleware de identidad: normaliza los DOS canales de identidad con el valor
// verificado (o los borra). No toca `req.body`: hay entidades cuyo campo `email`
// es un DATO del registro, no la identidad de quien llama.
app.use((req, res, next) => {
  const s = identidadDe(req);
  req.identidad = s;
  if (s) {
    req.headers['x-atha-email'] = s.email;
    if (req.query) req.query.email = s.email;
  } else {
    delete req.headers['x-atha-email'];
    if (req.query && req.query.email !== undefined) req.query.email = '';
  }
  next();
});

// Middleware: autenticación de administración. FALLA CERRADO.
// Antes llamaba `next()` siempre ("modo demo público") → no protegía nada.
const requireAdmin = async (req, res, next) => {
  const correo = emailDeSesion(req);
  if (!correo) return res.status(401).json({ success: false, error: 'Sesión requerida' });
  try {
    const [filas] = await getPool().execute(
      'SELECT role FROM users WHERE LOWER(email) = ? LIMIT 1',
      [correo]
    );
    const rol = String((filas[0] && filas[0].role) || '').toLowerCase();
    if (!filas.length || !['admin', 'director'].includes(rol)) {
      return res.status(403).json({ success: false, error: 'Sólo administración' });
    }
    req.user = { email: correo, role: rol };
    return next();
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
};

/**
 * Verifica un ID token de Google de verdad: firma + `aud` + `exp`.
 *
 * Antes sólo se hacía base64 del payload (`decodeJwtPayload`), así que un token
 * con payload inventado entraba. Se usa el endpoint `tokeninfo` de Google, que
 * valida la firma contra las claves públicas y devuelve el payload canónico:
 * cero dependencias nuevas (el runtime instala con `--omit=dev`).
 */
async function verificarTokenGoogle(idToken) {
  if (process.env.AUTH_VERIFICAR_GOOGLE === '0') {
    console.warn('[auth] AUTH_VERIFICAR_GOOGLE=0 → token SIN verificar. NO usar en producción.');
    return decodeJwtPayload(idToken);
  }
  try {
    const r = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) {
      console.warn('[auth] tokeninfo rechazó el token:', r.status);
      return null;
    }
    const p = await r.json();
    if (GOOGLE_CLIENT_ID && p.aud !== GOOGLE_CLIENT_ID) {
      console.warn('[auth] aud inesperado (no es nuestro cliente):', p.aud);
      return null;
    }
    if (String(p.email_verified) === 'false') {
      console.warn('[auth] email no verificado por Google:', p.email);
      return null;
    }
    if (!p.exp || Date.now() / 1000 > Number(p.exp)) {
      console.warn('[auth] token vencido');
      return null;
    }
    return p;
  } catch (e) {
    console.warn('[auth] no se pudo verificar el token con Google:', e.message);
    return null;
  }
}

// ---------------------------------------------------------------
// AUTH (antes del proxy PHP, para que no lo intercepte)
// ---------------------------------------------------------------
app.post('/php/api.php', (req, res, next) => {
  if ((req.query.action || '') !== 'auth_google') return next();
  return handleGoogleAuth(req, res);
});

app.post('/api/auth/google', handleGoogleAuth);

app.get('/api/auth/me', async (req, res) => {
  const email = emailDeSesion(req);
  if (!email) return res.status(401).json({ success: false, error: 'Sesión requerida' });
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.display_name, u.picture, u.role, u.role_title, u.provider,
              u.artist_kind
         FROM users u
        WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    return res.json({ success: true, data: rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// PERFIL Y PERMISOS DEL USUARIO DE LA SESIÓN
//
// Antes no existía: `/api/auth/me` devolvía 6 campos y UNA compañía (LIMIT 1),
// así que no se podía pintar una pantalla de perfil. Acá va todo junto (usuario,
// compañías por pertenencia y por nómina, disciplina, preferencias y capacidades).
// La identidad es SIEMPRE la de la sesión: no hay `?email=` que pedir.
// ---------------------------------------------------------------------------
async function perfilDeSesion(req) {
  const email = emailDeSesion(req);
  if (!email) return null;
  const db = getPool();
  const [filas] = await db.execute(
    `SELECT id, email, display_name, picture, role, role_title, artist_kind, provider, phone, bio_short
       FROM users WHERE LOWER(email) = ? LIMIT 1`,
    [email]
  );
  if (!filas.length) return null;
  const u = filas[0];

  let companias = [];
  try {
    const [mem] = await db.execute(
      `SELECT cm.company_id, cm.role_in_company AS rol, c.name AS nombre
         FROM company_members cm LEFT JOIN companies c ON c.id = cm.company_id
        WHERE cm.user_id = ?`,
      [u.id]
    );
    companias = companias.concat(mem.map((m) => ({
      company_id: m.company_id, nombre: m.nombre || m.company_id,
      rol: m.rol, origen: 'miembro',
    })));
  } catch { /* la tabla puede no estar */ }

  try {
    const [nom] = await db.execute(
      `SELECT cp.company_id, cp.role_title AS cargo, cp.kind AS tipo, c.name AS nombre
         FROM company_people cp LEFT JOIN companies c ON c.id = cp.company_id
        WHERE LOWER(cp.email) = ?`,
      [email]
    );
    companias = companias.concat(nom.map((n) => ({
      company_id: n.company_id, nombre: n.nombre || n.company_id,
      cargo: n.cargo, tipo: n.tipo, origen: 'nómina',
    })));
  } catch { /* la tabla puede existir sin columnas nuevas */ }

  let preferencias = null;
  try {
    const [pref] = await db.execute(
      'SELECT preferences_json FROM user_preferences WHERE user_id = ? LIMIT 1',
      [u.id]
    );
    if (pref.length && pref[0].preferences_json) {
      preferencias = typeof pref[0].preferences_json === 'string'
        ? JSON.parse(pref[0].preferences_json) : pref[0].preferences_json;
    }
  } catch { /* sin preferencias guardadas */ }

  const alcance = await alcanceInventario(email);
  const rol = String(u.role || '').toLowerCase();
  return {
    usuario: {
      id: u.id, email: u.email, nombre: u.display_name, foto: u.picture,
      rol, cargo: u.role_title, disciplina: u.artist_kind || null,
      telefono: u.phone || null, bio: u.bio_short || null, proveedor: u.provider,
    },
    companias,
    preferencias,
    permisos: {
      administracion: ['admin', 'director'].includes(rol),
      inventario_total: !!alcance.total,
      inventario_companias: alcance.companies || [],
      puede_escribir_inventario: !!alcance.puedeEscribir,
      motivo: alcance.motivo || '',
    },
  };
}

app.get('/api/v1/perfil', async (req, res) => {
  try {
    const email = emailDeSesion(req);
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });
    const perfil = await perfilDeSesion(req);
    if (!perfil) return res.status(404).json({ ok: false, error: 'Usuario no encontrado en el CRM' });
    return res.json({ ok: true, ...perfil });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Registro público: SIEMPRE rol no-admin. Nadie puede auto-asignarse admin/owner.
const REGISTER_ROLES = {
  artista: { user: 'artist', company: 'artist', label: 'Artista / Elenco' },
  productor: { user: 'producer', company: 'coordinator', label: 'Productor / Produccion' },
  gestor: { user: 'manager', company: 'director', label: 'Gestor / Gestion cultural' },
  cliente: { user: 'client', company: 'viewer', label: 'Cliente / Programador' },
};

/**
 * SOLICITUD DE ACCESO · reemplaza al registro que daba sesión.
 *
 * El registro viejo era una escalada de privilegios: no pedía ninguna credencial
 * (la tabla `users` no tiene password), y si el correo YA existía devolvía sesión
 * de esa cuenta y le pisaba `display_name`, `role` y `role_title`. Escribir el
 * correo del owner alcanzaba para entrar como admin.
 *
 * Ahora: se anota la solicitud y NO se otorga sesión, NO se crea usuario con rol,
 * NO se toca ninguna fila existente. Para entrar hay que pasar por Google (que sí
 * verifica el correo); el rol y la compañía los asigna un administrador.
 */
let tablaSolicitudesLista = false;
async function asegurarTablaSolicitudes(db) {
  if (tablaSolicitudesLista) return;
  await db.execute(
    `CREATE TABLE IF NOT EXISTS access_requests (
       id          VARCHAR(40) PRIMARY KEY,
       email       VARCHAR(255) NOT NULL,
       display_name VARCHAR(255),
       rol_pedido  VARCHAR(40),
       estado      VARCHAR(20) NOT NULL DEFAULT 'pendiente',
       created_at  DATETIME NOT NULL,
       KEY idx_access_requests_email (email)
     )`
  );
  tablaSolicitudesLista = true;
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const name = String(body.name || '').trim();
    const rolPedido = String(body.role || 'Artista').trim();

    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Faltan nombre o email' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Email inválido' });
    }

    const db = getPool();
    const [existe] = await db.execute('SELECT id, role FROM users WHERE email = ? LIMIT 1', [email]);

    await asegurarTablaSolicitudes(db);
    await db.execute(
      `INSERT INTO access_requests (id, email, display_name, rol_pedido, estado, created_at)
       VALUES (?, ?, ?, ?, 'pendiente', NOW())`,
      [`sol_${randomUUID().replace(/-/g, '').slice(0, 16)}`, email, name, rolPedido]
    );

    // NO se devuelve sesión y NO se modifica la cuenta existente (ni su rol).
    return res.json({
      success: true,
      data: { solicitud: true, ya_existe: existe.length > 0 },
      message: existe.length
        ? 'Esa cuenta ya existe. Entrá con Google y un administrador ajusta tu rol.'
        : 'Solicitud registrada. Entrá con Google; un administrador te habilita el rol.',
    });
  } catch (e) {
    console.error('[register] error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// LA LLAVE · ticket de un solo uso (Tanda B)
//
// Reemplaza el SSO por query (`?auth=1&email=…&role=…`), que exponía la identidad
// en la URL, el history, los logs y el Referer — y que además ya no funcionaba
// porque cada artefacto leía una clave distinta (Planner: `fase_current_user`;
// Ticketer: ninguna).
//
// Flujo:
//   1. El CRM (mismo origen que el usuario) pide el ticket: POST /api/auth/ticket
//      con la sesión puesta (Bearer). Vuelve un opaco de 32 bytes.
//   2. El navegador abre el artefacto con `?t=<ticket>`. Nada más viaja en la URL.
//   3. El artefacto lo canjea server-side: POST /api/auth/exchange { ticket }.
//      El hub valida, QUEMA el ticket y devuelve el usuario + un TOKEN del hub.
//   4. El artefacto usa ese token como `Authorization: Bearer` en sus llamadas.
//
// Propiedades: TTL corto, un solo uso, atado al destino, y el rol sale del hub
// (nunca de un `?role=` que el usuario pueda editar).
// ---------------------------------------------------------------------------
let tablaTicketsLista = false;
async function asegurarTablaTickets(db) {
  if (tablaTicketsLista) return;
  await db.execute(
    `CREATE TABLE IF NOT EXISTS auth_tickets (
       ticket    VARCHAR(64) PRIMARY KEY,
       email     VARCHAR(255) NOT NULL,
       destino   VARCHAR(40) NOT NULL,
       emitido   DATETIME NOT NULL,
       expira    DATETIME NOT NULL,
       usado     TINYINT NOT NULL DEFAULT 0,
       usado_en  DATETIME NULL,
       KEY idx_auth_tickets_expira (expira)
     )`
  );
  tablaTicketsLista = true;
}

// Los artefactos son OTRO origen: necesitan CORS en estos dos endpoints (y sólo
// en éstos). El ticket es opaco, de un solo uso y de TTL corto: por eso `*` es
// aceptable acá y no en el resto de la API.
function corsArtefactos(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Cache-Control', 'no-store');
}
app.options('/api/auth/ticket', (req, res) => { corsArtefactos(res); res.status(204).end(); });
app.options('/api/auth/exchange', (req, res) => { corsArtefactos(res); res.status(204).end(); });

/** Emite un ticket para un destino. Requiere sesión válida del hub. */
app.post('/api/auth/ticket', async (req, res) => {
  corsArtefactos(res);
  try {
    const email = emailDeSesion(req);
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });
    const destino = String((req.body && req.body.destino) || req.query.destino || '')
      .toLowerCase().trim();
    if (!destino) return res.status(400).json({ ok: false, error: 'Falta destino' });

    const db = getPool();
    const [u] = await db.execute('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    if (!u.length) return res.status(404).json({ ok: false, error: 'Usuario no registrado en el CRM' });

    await asegurarTablaTickets(db);
    try { await db.execute('DELETE FROM auth_tickets WHERE expira < NOW()'); } catch { /* limpieza oportunista */ }

    const ticket = randomBytes(32).toString('hex');
    await db.execute(
      `INSERT INTO auth_tickets (ticket, email, destino, emitido, expira, usado)
       VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND), 0)`,
      [ticket, email, destino, TICKET_TTL_SEG]
    );
    return res.json({ ok: true, ticket, destino, expires_in: TICKET_TTL_SEG });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Canjea un ticket: un solo uso, atado al destino, TTL corto. */
app.post('/api/auth/exchange', async (req, res) => {
  corsArtefactos(res);
  try {
    const ticket = String((req.body && req.body.ticket) || req.query.t || '').trim();
    const destino = String((req.body && req.body.destino) || req.query.destino || '')
      .toLowerCase().trim();
    if (!ticket) return res.status(400).json({ ok: false, error: 'Falta ticket' });

    const db = getPool();
    await asegurarTablaTickets(db);
    const [rows] = await db.execute(
      'SELECT ticket, email, destino, expira, usado FROM auth_tickets WHERE ticket = ? LIMIT 1',
      [ticket]
    );
    if (!rows.length) return res.status(401).json({ ok: false, error: 'Ticket inexistente' });
    const t = rows[0];
    if (Number(t.usado) === 1) return res.status(401).json({ ok: false, error: 'Ticket ya usado' });
    if (new Date(t.expira).getTime() < Date.now()) {
      return res.status(401).json({ ok: false, error: 'Ticket vencido' });
    }
    if (destino && String(t.destino).toLowerCase() !== destino) {
      return res.status(401).json({ ok: false, error: 'Ticket emitido para otro destino' });
    }

    // Se quema ANTES de entregar nada: si el UPDATE no afecta filas, otro canje
    // ganó la carrera y este no entrega.
    const [upd] = await db.execute(
      'UPDATE auth_tickets SET usado = 1, usado_en = NOW() WHERE ticket = ? AND usado = 0',
      [ticket]
    );
    if (!upd.affectedRows) return res.status(401).json({ ok: false, error: 'Ticket ya usado' });

    const [filas] = await db.execute(
      `SELECT id, email, display_name, picture, role, role_title, artist_kind
         FROM users WHERE LOWER(email) = ? LIMIT 1`,
      [String(t.email).toLowerCase()]
    );
    if (!filas.length) {
      return res.status(404).json({ ok: false, error: 'El usuario del ticket no está en el CRM' });
    }
    const u = filas[0];
    const token = firmarSesion({
      email: u.email, display_name: u.display_name, role: u.role,
      role_title: u.role_title, picture: u.picture,
    });
    return res.json({
      ok: true,
      token,
      usuario: {
        id: u.id, email: u.email, nombre: u.display_name, foto: u.picture,
        rol: u.role, cargo: u.role_title, disciplina: u.artist_kind || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ---- Leads y grupos de destinatarios (seccion Ventas) ----
function leadTypeFromSegment(segment, kind) {
  const t = String(segment || '').toLowerCase();
  if (t.includes('gremial') || t.includes('colegio') || t.includes('cámara') || t.includes('camara')) return 'programador';
  if (t.includes('festival')) return 'festival';
  return 'sala';
}

function leadStatusUi(status) {
  const s = String(status || '').toLowerCase();
  if (['contactado', 'negociacion', 'cerrado', 'archivado'].includes(s)) return s;
  if (s === 'propuesta enviada') return 'negociacion';
  return 'contactado';
}

/* ---------------------------------------------------------------------------
   USUARIOS Y ROLES · sólo administración
   El rol vive en `users.role` (y el cargo libre en `users.role_title`); la
   pertenencia a compañías en `company_members` / `company_people`.

   Catálogo de roles (uno por usuario, decide el alcance en todo el ecosistema):
     admin      → todo el ecosistema
     productor  → gestiona su(s) compañía(s): obras, leads, equipo, inventario
     tecnico    → su compañía: inventario y riders
     artist     → artista/elenco: sin acceso a gestión (ve su perfil)
   --------------------------------------------------------------------------- */
const ROLES_VALIDOS = ['admin', 'director', 'productor', 'tecnico', 'artist'];

const DESCRIPCION_ROLES = {
  admin: 'Owner: todo el ecosistema y el panel de usuarios (único e irrepetible)',
  director: 'Dirección: dirige compañías, obras y espectáculos; administra el panel',
  productor: 'Producción: administra obras, compañías y elementos técnicos de las suyas',
  tecnico: 'Técnica: administra elementos técnicos e inventario de su compañía',
  artist: 'Artista: postea en su perfil, declara disponibilidad y busca fondos',
};

/** Disciplina del artista (subcategoría de `artist`). */
const DISCIPLINAS = [
  { id: 'musico', label: 'Músico/a' },
  { id: 'actor', label: 'Actor / Actriz' },
  { id: 'bailarin', label: 'Bailarín/a' },
  { id: 'otro', label: 'Otra disciplina' },
];

/** Roles dentro de una compañía (enum de company_members). */
const ROLES_COMPANIA = ['owner', 'coordinator', 'director', 'artist', 'viewer'];

/** Tipos de persona en la nómina (enum de company_people). */
const TIPOS_NOMINA = ['socio', 'elenco', 'equipo', 'colaborador'];

async function permisoAdmin(req, res) {
  const correo = String(
    req.headers['x-atha-email'] || (req.query && req.query.email) || ''
  ).trim();
  const alcance = await alcanceInventario(correo);
  if (!alcance.total) {
    res.status(403).json({ ok: false, error: 'sólo administración puede gestionar usuarios' });
    return null;
  }
  return alcance;
}

app.get('/api/v1/crm/usuarios', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const db = getPool();
    const [us] = await db.execute(
      `SELECT id, email, display_name, role, role_title, artist_kind, picture, public_profile, created_at
         FROM users ORDER BY (role = 'admin') DESC, (role = 'director') DESC, display_name`
    );
    // compañías disponibles (para asignar pertenencias desde el panel)
    let comps = [];
    try {
      [comps] = await db.execute('SELECT id, name, status FROM companies ORDER BY name');
    } catch { /* la tabla puede no estar */ }
    // pertenencia declarada y nómina (con el nombre de la compañía si se puede)
    let membresias = [];
    let nomina = [];
    try {
      [membresias] = await db.execute(
        `SELECT cm.user_id, cm.company_id, cm.role_in_company, c.name AS company_name
           FROM company_members cm LEFT JOIN companies c ON c.id = cm.company_id`
      );
    } catch {
      [membresias] = await db.execute(
        'SELECT user_id, company_id, role_in_company FROM company_members'
      );
    }
    try {
      [nomina] = await db.execute(
        `SELECT LOWER(cp.email) AS email, cp.company_id, cp.kind, cp.role_title,
                c.name AS company_name
           FROM company_people cp LEFT JOIN companies c ON c.id = cp.company_id`
      );
    } catch {
      [nomina] = await db.execute(
        'SELECT LOWER(email) AS email, company_id, kind, role_title FROM company_people'
      );
    }

    const porUsuario = {};
    for (const m of membresias) {
      (porUsuario[m.user_id] = porUsuario[m.user_id] || []).push({
        origen: 'miembro', company_id: m.company_id,
        company_name: m.company_name || m.company_id, rol: m.role_in_company,
      });
    }
    const porCorreo = {};
    for (const n of nomina) {
      (porCorreo[n.email] = porCorreo[n.email] || []).push({
        origen: 'nómina', company_id: n.company_id,
        company_name: n.company_name || n.company_id, cargo: n.role_title, tipo: n.kind,
      });
    }

    const usuarios = us.map((u) => ({
      ...u,
      companias: porUsuario[u.id] || [],
      nomina: porCorreo[String(u.email || '').toLowerCase()] || [],
      puede_gestionar: u.role !== 'artist',
    }));
    return res.json({
      ok: true, total: usuarios.length, usuarios,
      roles: ROLES_VALIDOS.map((r) => ({ id: r, descripcion: DESCRIPCION_ROLES[r] })),
      disciplinas: DISCIPLINAS,
      roles_compania: ROLES_COMPANIA,
      tipos_nomina: TIPOS_NOMINA,
      companias: comps,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message, usuarios: [] });
  }
});

app.patch('/api/v1/crm/usuarios/:id', async (req, res) => {
  try {
    const alcance = await permisoAdmin(req, res);
    if (!alcance) return;
    const db = getPool();
    const [destino] = await db.execute('SELECT id, email, role FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!destino.length) return res.status(404).json({ ok: false, error: 'usuario no encontrado' });
    const rolSolicitante = String((alcance.usuario && alcance.usuario.role) || '').toLowerCase();

    const b = req.body || {};
    const campos = {};

    if (b.role !== undefined) {
      if (!ROLES_VALIDOS.includes(b.role)) {
        return res.status(400).json({ ok: false, error: `rol inválido: usá ${ROLES_VALIDOS.join(', ')}` });
      }
      // proteger al owner: sólo el owner puede tocar a un owner, y no puede quedar sin owner
      if (String(destino[0].role).toLowerCase() === 'admin' && rolSolicitante !== 'admin') {
        return res.status(403).json({ ok: false, error: 'sólo el owner puede modificar al owner' });
      }
      if (b.role === 'admin' && rolSolicitante !== 'admin') {
        return res.status(403).json({ ok: false, error: 'sólo el owner puede nombrar otro owner' });
      }
      if (String(destino[0].role).toLowerCase() === 'admin' && b.role !== 'admin') {
        const [admins] = await db.execute("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
        if ((admins[0]?.n || 0) <= 1) {
          return res.status(409).json({ ok: false, error: 'no se puede quitar el último owner del sistema' });
        }
      }
      campos.role = b.role;
    }
    if (b.role_title !== undefined) campos.role_title = b.role_title;
    if (b.artist_kind !== undefined) {
      const validos = ['', ...DISCIPLINAS.map((d) => d.id)];
      if (!validos.includes(String(b.artist_kind))) {
        return res.status(400).json({ ok: false, error: `disciplina inválida: ${validos.filter(Boolean).join(', ')}` });
      }
      campos.artist_kind = b.artist_kind || null;
    }
    if (b.public_profile !== undefined) campos.public_profile = b.public_profile ? 1 : 0;
    if (!Object.keys(campos).length) return res.status(400).json({ ok: false, error: 'nada que actualizar' });

    const r = await db.execute(
      `UPDATE users SET ${Object.keys(campos).map((c) => '`' + c + '` = ?').join(', ')} WHERE id = ?`,
      [...Object.values(campos), req.params.id]
    );
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'usuario no encontrado' });
    return res.json({ ok: true, id: req.params.id, actualizado: campos });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/* ---------------------------------------------------------------------------
   PERTENENCIA A COMPAÑÍAS · /api/v1/crm/usuarios/:id/companias
   y NÓMINAS · /api/v1/crm/companias/:id/nomina
   Sirven para que dirección/owner administre a quién pertenece cada usuario y
   revise los datos de cada compañía (nómina) sin tocar la base a mano.
   --------------------------------------------------------------------------- */
function idCorto(prefijo) {
  return `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.slice(0, 36);
}

app.post('/api/v1/crm/usuarios/:id/companias', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const b = req.body || {};
    if (!b.company_id) return res.status(400).json({ ok: false, error: 'falta company_id' });
    const rol = String(b.role_in_company || 'coordinator');
    if (!ROLES_COMPANIA.includes(rol)) {
      return res.status(400).json({ ok: false, error: `rol de compañía inválido: ${ROLES_COMPANIA.join(', ')}` });
    }
    const db = getPool();
    const [ya] = await db.execute(
      'SELECT id FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1',
      [req.params.id, b.company_id]
    );
    if (ya.length) {
      await db.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?', [rol, ya[0].id]);
      return res.json({ ok: true, actualizado: true, id: ya[0].id, role_in_company: rol });
    }
    const id = idCorto('cm_');
    await db.execute(
      'INSERT INTO company_members (id, company_id, user_id, role_in_company) VALUES (?, ?, ?, ?)',
      [id, b.company_id, req.params.id, rol]
    );
    return res.json({ ok: true, creado: true, id, role_in_company: rol });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.delete('/api/v1/crm/usuarios/:id/companias/:companyId', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const db = getPool();
    const r = await db.execute(
      'DELETE FROM company_members WHERE user_id = ? AND company_id = ?',
      [req.params.id, req.params.companyId]
    );
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'no pertenecía a esa compañía' });
    return res.json({ ok: true, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Nómina de una compañía: quiénes la componen y con qué cargo
app.get('/api/v1/crm/companias/:id/nomina', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const db = getPool();
    const [c] = await db.execute('SELECT id, name, status, city, discipline FROM companies WHERE id = ? LIMIT 1', [req.params.id]);
    if (!c.length) return res.status(404).json({ ok: false, error: 'compañía no encontrada' });
    const [personas] = await db.execute(
      `SELECT id, full_name, role_title, character_name, kind, email, phone, notes
         FROM company_people WHERE company_id = ?
        ORDER BY (kind = 'socio') DESC, (kind = 'equipo') DESC, full_name`,
      [req.params.id]
    );
    // usuarios del sistema que pertenecen a la compañía
    const [miembros] = await db.execute(
      `SELECT cm.id, cm.role_in_company, u.id AS user_id, u.display_name, u.email, u.role
         FROM company_members cm JOIN users u ON u.id = cm.user_id
        WHERE cm.company_id = ? ORDER BY cm.role_in_company`,
      [req.params.id]
    );
    // avisos de datos: sin cargo o sin email se consideran incompletos
    const incompletos = personas.filter((p) => !p.role_title).length;
    return res.json({
      ok: true, compania: c[0], total: personas.length,
      personas, miembros, incompletos,
      tipos_nomina: TIPOS_NOMINA, roles_compania: ROLES_COMPANIA,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.post('/api/v1/crm/companias/:id/nomina', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const b = req.body || {};
    if (!String(b.full_name || '').trim()) return res.status(400).json({ ok: false, error: 'falta el nombre' });
    const kind = String(b.kind || 'colaborador');
    if (!TIPOS_NOMINA.includes(kind)) {
      return res.status(400).json({ ok: false, error: `tipo inválido: ${TIPOS_NOMINA.join(', ')}` });
    }
    const db = getPool();
    const id = idCorto('cp_');
    await db.execute(
      `INSERT INTO company_people (id, company_id, full_name, role_title, character_name, kind, email, phone, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, b.full_name, b.role_title || null, b.character_name || null, kind,
       b.email || null, b.phone || null, b.notes || null]
    );
    return res.json({ ok: true, id });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.patch('/api/v1/crm/nomina/:id', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const b = req.body || {};
    const campos = {};
    for (const c of ['full_name', 'role_title', 'character_name', 'email', 'phone', 'notes']) {
      if (b[c] !== undefined) campos[c] = b[c];
    }
    if (b.kind !== undefined) {
      if (!TIPOS_NOMINA.includes(String(b.kind))) {
        return res.status(400).json({ ok: false, error: `tipo inválido: ${TIPOS_NOMINA.join(', ')}` });
      }
      campos.kind = b.kind;
    }
    if (!Object.keys(campos).length) return res.status(400).json({ ok: false, error: 'nada que actualizar' });
    const db = getPool();
    const r = await db.execute(
      `UPDATE company_people SET ${Object.keys(campos).map((c) => '`' + c + '` = ?').join(', ')} WHERE id = ?`,
      [...Object.values(campos), req.params.id]
    );
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'persona no encontrada' });
    return res.json({ ok: true, id: req.params.id, actualizado: Object.keys(campos) });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.delete('/api/v1/crm/nomina/:id', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const db = getPool();
    const r = await db.execute('DELETE FROM company_people WHERE id = ?', [req.params.id]);
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'persona no encontrada' });
    return res.json({ ok: true, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/* --- LEADS: alta, edición y baja (los usa la pestaña "CRM" del CRM web) -------
   Antes el CRM hacía POST a /api/leads, ruta que no existía: el guardado fallaba
   en silencio y la pestaña "no hacía lo que decía". */
async function permisoLeads(req, res) {
  // OJO: en un lead, el campo `email` es el correo DEL LEAD, no el de la sesión.
  // La identidad va SIEMPRE por header o query (nunca por el body).
  const sesion = String(
    req.headers['x-atha-email'] || (req.query && req.query.email) || ''
  ).trim();
  const alcance = await alcanceInventario(sesion);
  const puede = alcance.total || (alcance.companies && alcance.companies.length > 0);
  if (!puede) res.status(403).json({ ok: false, error: 'tu rol no puede gestionar leads' });
  return puede;
}

const CAMPOS_LEAD = ['name', 'email', 'phone', 'status', 'notes', 'city', 'region',
  'organization', 'segment', 'contact_role', 'interest_area', 'website', 'address',
  'source', 'assigned_to', 'last_contact_at'];

function leadDeBody(b) {
  const v = {};
  for (const c of CAMPOS_LEAD) {
    if (c === 'contact_role' && b.contactRole !== undefined) v[c] = b.contactRole;
    else if (c === 'interest_area' && b.interestArea !== undefined) v[c] = b.interestArea;
    else if (c === 'last_contact_at' && (b.lastContactDate !== undefined)) v[c] = b.lastContactDate;
    else if (c === 'assigned_to' && b.assignedTo !== undefined) v[c] = b.assignedTo;
    else if (b[c] !== undefined) v[c] = b[c];
  }
  if (b.type !== undefined) v.lead_type = b.type;
  if (b.estimatedValueCLP !== undefined) v.estimated_value_clp = Number(b.estimatedValueCLP) || 0;
  return v;
}

app.post('/api/v1/crm/leads', async (req, res) => {
  try {
    if (!(await permisoLeads(req, res))) return;
    const b = req.body || {};
    if (!String(b.name || '').trim()) return res.status(400).json({ ok: false, error: 'el nombre es obligatorio' });
    const db = getPool();
    const id = String(b.id || `lead_${Date.now().toString(36)}` + Math.random().toString(36).slice(2, 6));
    const v = leadDeBody(b);
    // `owner_id` es obligatorio en la tabla: queda como dueño quien lo crea
    if (!v.owner_id) {
      const correo = String(b.email_sesion || b.sessionEmail || '').trim() ||
        String((req.query && req.query.email) || req.headers['x-atha-email'] || '').trim();
      let dueno = null;
      if (correo) {
        const [ur] = await db.execute('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [correo.toLowerCase()]);
        dueno = ur.length ? ur[0].id : null;
      }
      if (dueno) v.owner_id = dueno;
    }
    // `kind` y `status` también son obligatorias en la tabla
    if (!v.kind) v.kind = 'lead';
    if (!v.status) v.status = 'prospecto';
    if (!v.name) v.name = String(b.name || '').trim();
    const cols = ['id', ...Object.keys(v)];
    const vals = [id, ...Object.values(v)];
    await db.execute(
      `INSERT INTO leads (${cols.map((c) => '`' + c + '`').join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
    radarEmitir('lead_nuevo', { id, name: v.name });
    return res.json({ ok: true, id, lead: { ...v, id } });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.patch('/api/v1/crm/leads/:id', async (req, res) => {
  try {
    if (!(await permisoLeads(req, res))) return;
    const v = leadDeBody(req.body || {});
    const campos = Object.keys(v);
    if (!campos.length) return res.status(400).json({ ok: false, error: 'nada para actualizar' });
    const db = getPool();
    const r = await db.execute(
      `UPDATE leads SET ${campos.map((c) => '`' + c + '` = ?').join(', ')} WHERE id = ?`,
      [...campos.map((c) => v[c]), req.params.id]
    );
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'lead no encontrado' });
    radarEmitir('lead_actualizado', { id: req.params.id, campos });
    return res.json({ ok: true, id: req.params.id, actualizado: campos });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.delete('/api/v1/crm/leads/:id', async (req, res) => {
  try {
    if (!(await permisoLeads(req, res))) return;
    const db = getPool();
    await db.execute('DELETE FROM lead_group_members WHERE lead_id = ?', [req.params.id]);
    const r = await db.execute('DELETE FROM leads WHERE id = ?', [req.params.id]);
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'lead no encontrado' });
    radarEmitir('lead_eliminado', { id: req.params.id });
    return res.json({ ok: true, id: req.params.id, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.get('/api/v1/crm/leads', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT id, name, email, phone, status, notes, city, region, estimated_value_clp,
              assigned_to, last_contact_at, organization, segment, lead_type, contact_role,
              interest_area, website, address, source, value, kind, import_batch
         FROM leads
        ORDER BY (organization IS NULL), organization, name`
    );
    const [links] = await db.execute('SELECT group_id, lead_id FROM lead_group_members');
    const byLead = {};
    for (const l of links) {
      if (!byLead[l.lead_id]) byLead[l.lead_id] = [];
      byLead[l.lead_id].push(l.group_id);
    }
    const leads = rows.map((r) => ({
      id: r.id,
      name: r.name,
      organization: r.organization || '',
      type: r.lead_type || leadTypeFromSegment(r.segment, r.kind),
      status: leadStatusUi(r.status),
      city: r.city || '',
      region: r.region || '',
      email: r.email || '',
      phone: r.phone || '',
      notes: r.notes || '',
      lastContactDate: r.last_contact_at ? String(r.last_contact_at).slice(0, 10) : '',
      estimatedValueCLP: Number(r.estimated_value_clp || 0),
      assignedTo: r.assigned_to || '',
      segment: r.segment || '',
      interestArea: r.interest_area || '',
      contactRole: r.contact_role || '',
      website: r.website || '',
      address: r.address || '',
      source: r.source || '',
      importBatch: r.import_batch || '',
      groupIds: byLead[r.id] || [],
    }));
    return res.json({ success: true, total: leads.length, leads });
  } catch (e) {
    console.error('[leads] error:', e);
    return res.status(503).json({ success: false, error: e.message, leads: [] });
  }
});

app.get('/api/v1/crm/lead-groups', async (req, res) => {
  try {
    const db = getPool();
    const [groups] = await db.execute(
      'SELECT id, name, description, color FROM lead_groups ORDER BY name'
    );
    const [members] = await db.execute(
      `SELECT m.group_id, m.lead_id, l.email, l.name, l.organization
         FROM lead_group_members m JOIN leads l ON l.id = m.lead_id`
    );
    const out = groups.map((g) => {
      const mine = members.filter((m) => m.group_id === g.id);
      return {
        id: g.id,
        name: g.name,
        description: g.description || '',
        color: g.color || '',
        count: mine.length,
        memberIds: mine.map((m) => m.lead_id),
        emails: mine.map((m) => m.email).filter(Boolean),
        organizations: mine.map((m) => m.organization || m.name),
      };
    });
    return res.json({ success: true, total: out.length, groups: out });
  } catch (e) {
    console.error('[lead-groups] error:', e);
    return res.status(503).json({ success: false, error: e.message, groups: [] });
  }
});

app.post('/api/v1/crm/lead-groups', async (req, res) => {
  try {
    const db = getPool();
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'Falta el nombre del grupo' });

    const id = randomUUID();
    await db.execute(
      `INSERT INTO lead_groups (id, owner_id, name, description, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NOW(), NOW())`,
      [id, body.owner_id || '2a2b45f0-c408-484d-8b49-8034b76b227d', name,
       String(body.description || '').slice(0, 400)]
    );

    let added = 0;
    const emails = Array.isArray(body.emails) ? body.emails.filter(Boolean) : [];
    for (const email of emails) {
      const [rows] = await db.execute('SELECT id FROM leads WHERE email = ? LIMIT 1', [email]);
      if (rows.length) {
        await db.execute(
          'INSERT IGNORE INTO lead_group_members (group_id, lead_id, added_at) VALUES (?, ?, NOW())',
          [id, rows[0].id]
        );
        added += 1;
      }
    }
    return res.json({ success: true, data: { id, name, added } });
  } catch (e) {
    console.error('[lead-groups POST] error:', e);
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.delete('/api/v1/crm/lead-groups/:id', async (req, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM lead_group_members WHERE group_id = ?', [req.params.id]);
    await db.execute('DELETE FROM lead_groups WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.post('/api/v1/crm/lead-groups/:id/members', async (req, res) => {
  try {
    const db = getPool();
    const emails = Array.isArray(req.body?.emails) ? req.body.emails.filter(Boolean) : [];
    let added = 0;
    for (const email of emails) {
      const [rows] = await db.execute('SELECT id FROM leads WHERE email = ? LIMIT 1', [email]);
      if (rows.length) {
        await db.execute(
          'INSERT IGNORE INTO lead_group_members (group_id, lead_id, added_at) VALUES (?, ?, NOW())',
          [req.params.id, rows[0].id]
        );
        added += 1;
      }
    }
    return res.json({ success: true, added });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.delete('/api/v1/crm/lead-groups/:id/members/:leadId', async (req, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM lead_group_members WHERE group_id = ? AND lead_id = ?',
      [req.params.id, req.params.leadId]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

// ---- Companias, obras vinculadas y nomina de socios ----
app.get('/api/v1/crm/companies', async (req, res) => {
  try {
    const db = getPool();
    const [companies] = await db.execute(
      `SELECT id, name, legal_name, slug, status, kind, discipline, description, contact_email, city
         FROM companies ORDER BY (kind <> 'propia'), name`
    );
    const [obras] = await db.execute(
      `SELECT id, title, discipline, status, image_url, company_id
         FROM projects WHERE company_id IS NOT NULL AND is_public = 1
        ORDER BY title`
    );
    const [people] = await db.execute(
      `SELECT id, company_id, full_name, role_title, character_name, kind, email, phone
         FROM company_people ORDER BY kind, full_name`
    );

    const out = companies.map((c) => ({
      id: c.id,
      name: c.name,
      legalName: c.legal_name || '',
      slug: c.slug || '',
      status: c.status || 'active',
      kind: c.kind || 'colaboradora',
      discipline: c.discipline || '',
      description: c.description || '',
      contactEmail: c.contact_email || '',
      city: c.city || '',
      obras: obras.filter((o) => o.company_id === c.id).map((o) => ({
        id: o.id,
        title: o.title,
        discipline: o.discipline || '',
        status: o.status || '',
        image: o.image_url || '',
      })),
      people: people.filter((p) => p.company_id === c.id).map((p) => ({
        id: p.id,
        fullName: p.full_name,
        roleTitle: p.role_title || '',
        characterName: p.character_name || '',
        kind: p.kind || 'equipo',
        email: p.email || '',
        phone: p.phone || '',
      })),
    }));

    return res.json({ success: true, total: out.length, companies: out });
  } catch (e) {
    console.error('[companies] error:', e);
    return res.status(503).json({ success: false, error: e.message, companies: [] });
  }
});

const COMPANY_PEOPLE_KINDS = ['socio', 'elenco', 'equipo', 'colaborador'];

app.post('/api/v1/crm/companies', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'Falta el nombre' });
    const id = 'comp_' + randomUUID().replace(/-/g, '').slice(0, 12);
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    await db.execute(
      `INSERT INTO companies (id, name, legal_name, slug, status, created_by, discipline, kind,
         description, contact_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, name, slug, b.owner_id || '2a2b45f0-c408-484d-8b49-8034b76b227d', String(b.discipline || '').slice(0, 160),
       b.kind === 'propia' ? 'propia' : 'colaboradora', String(b.description || ''),
       String(b.contactEmail || '')]
    );
    return res.json({ success: true, data: { id, name, slug } });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.post('/api/v1/crm/companies/:id/people', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    const fullName = String(b.fullName || '').trim();
    if (!fullName) return res.status(400).json({ success: false, error: 'Falta el nombre' });
    const kind = COMPANY_PEOPLE_KINDS.includes(String(b.kind)) ? b.kind : 'equipo';
    const id = randomUUID();
    await db.execute(
      `INSERT INTO company_people (id, company_id, full_name, role_title, character_name, kind,
         email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, req.params.id, fullName, String(b.roleTitle || '').slice(0, 160),
       String(b.characterName || '').slice(0, 120), kind,
       String(b.email || '').slice(0, 255), String(b.phone || '').slice(0, 80)]
    );
    return res.json({ success: true, data: { id, fullName, kind } });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.delete('/api/v1/crm/companies/:id/people/:personId', async (req, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM company_people WHERE id = ? AND company_id = ?',
      [req.params.personId, req.params.id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

// ---- Obras: lectura y escritura persistente (projects) ----
function obraToRow(b) {
  const j = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
  return {
    id: String(b.id || randomUUID()),
    title: String(b.title || '').slice(0, 255),
    discipline: String(b.discipline || '').slice(0, 80),
    status: String(b.status || '').slice(0, 40),
    format: String(b.format || '').slice(0, 120),
    duration: String(b.duration || '').slice(0, 80),
    target_audience: String(b.targetAudience || b.target_audience || '').slice(0, 120),
    synopsis: String(b.synopsis || ''),
    premiere_date: String(b.premiereDate || b.premiere_date || '').slice(0, 120),
    image_url: String(b.image || b.image_url || '').slice(0, 512),
    dossier_highlights: j(b.dossierHighlights ?? b.dossier_highlights),
    cast_team: j(b.castTeam ?? b.cast_team),
    economics: j(b.economics),
    notes: String(b.notes || ''),
    category: String(b.category || 'teatro').slice(0, 60),
    year: b.year ? Number(b.year) : null,
    company_id: b.companyId || b.company_id || DEFAULT_COMPANY_ID,
  };
}

app.get('/api/obras', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT id, title, discipline, status, format, duration, target_audience, synopsis,
              premiere_date, image_url, dossier_highlights, cast_team, economics, notes,
              category, year, is_public, company_id
         FROM projects ORDER BY title`
    );
    return res.json({ success: true, total: rows.length, obras: rows });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message, obras: [] });
  }
});

app.post('/api/obras', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, error: 'Falta el titulo' });
    const r = obraToRow(b);
    await db.execute(
      `INSERT INTO projects
        (id, owner_id, title, description, synopsis, status, is_public, year, category, discipline,
         format, duration, target_audience, location, image_url, dossier_highlights, notes, economics,
         cast_team, company_id, created_by, updated_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         title = VALUES(title), synopsis = VALUES(synopsis), status = VALUES(status),
         year = VALUES(year), category = VALUES(category), discipline = VALUES(discipline),
         format = VALUES(format), duration = VALUES(duration),
         target_audience = VALUES(target_audience), image_url = VALUES(image_url),
         dossier_highlights = VALUES(dossier_highlights), notes = VALUES(notes),
         economics = VALUES(economics), cast_team = VALUES(cast_team),
         company_id = VALUES(company_id), updated_by = VALUES(updated_by)`,
      [r.id, req.body?.ownerId || '2a2b45f0-c408-484d-8b49-8034b76b227d', r.title,
       r.synopsis.slice(0, 400), r.synopsis, r.status, r.year, r.category, r.discipline,
       r.format, r.duration, r.target_audience, r.discipline, r.image_url,
       r.dossier_highlights, r.notes, r.economics, r.cast_team, r.company_id,
       '2a2b45f0-c408-484d-8b49-8034b76b227d', '2a2b45f0-c408-484d-8b49-8034b76b227d']
    );
    return res.json({ success: true, data: { id: r.id, title: r.title }, persisted: true });
  } catch (e) {
    console.error('[obras POST] error:', e);
    return res.status(503).json({ success: false, error: e.message });
  }
});

// ---- Leads: escritura persistente ----
app.post('/api/leads', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, error: 'Falta el nombre' });
    const id = String(b.id || randomUUID());
    const kind = String(b.kind || 'lead').slice(0, 20);
    const status = String(b.status || 'contactado').slice(0, 20);
    await db.execute(
      `INSERT INTO leads
        (id, owner_id, name, email, phone, source, kind, status, value, notes, city,
         estimated_value_clp, assigned_to, organization, region, address, website,
         contact_role, interest_area, segment, lead_type, created_by, updated_by,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), email = VALUES(email), phone = VALUES(phone),
         status = VALUES(status), notes = VALUES(notes), city = VALUES(city),
         estimated_value_clp = VALUES(estimated_value_clp), organization = VALUES(organization),
         region = VALUES(region), address = VALUES(address), website = VALUES(website),
         contact_role = VALUES(contact_role), interest_area = VALUES(interest_area),
         segment = VALUES(segment), lead_type = VALUES(lead_type), updated_by = VALUES(updated_by),
         updated_at = NOW()`,
      [id, b.ownerId || '2a2b45f0-c408-484d-8b49-8034b76b227d', String(b.name).slice(0, 255),
       b.email || null, b.phone || null, b.source || 'crm-web', kind, status,
       b.value || null, b.notes || null, b.city || null,
       b.estimatedValueCLP || b.estimated_value_clp || null, b.assignedTo || null,
       b.organization || null, b.region || null, b.address || null, b.website || null,
       b.contactRole || b.contact_role || null, b.interestArea || b.interest_area || null,
       b.segment || null, b.type || b.lead_type || null,
       '2a2b45f0-c408-484d-8b49-8034b76b227d', '2a2b45f0-c408-484d-8b49-8034b76b227d']
    );
    return res.json({ success: true, data: { id, name: b.name }, persisted: true });
  } catch (e) {
    console.error('[leads POST] error:', e);
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.delete('/api/obras/:id', async (req, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const db = getPool();
    await db.execute('DELETE FROM lead_group_members WHERE lead_id = ?', [req.params.id]);
    await db.execute('DELETE FROM leads WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

// Diagnostico de base de datos
app.get('/api/db/ping', async (req, res) => {
  const t0 = Date.now();
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT COUNT(*) AS proyectos FROM projects');
    const [u] = await db.query('SELECT COUNT(*) AS usuarios FROM users');
    return res.json({
      success: true,
      db: `${DB_CONF.user}@${DB_CONF.host}:${DB_CONF.port}/${DB_CONF.database}`,
      proyectos: rows[0].proyectos,
      usuarios: u[0].usuarios,
      ms: Date.now() - t0,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, ms: Date.now() - t0 });
  }
});

// Proxy para endpoints PHP
const phpProxy = createProxyMiddleware({
  target: `http://127.0.0.1:${PHP_PORT}`,
  changeOrigin: true,
});

app.use('/admin-api.php', requireAdmin, phpProxy);
app.use('/admin-ui.php', requireAdmin, phpProxy);
app.use('/api.php', phpProxy);
app.use('/index.php', phpProxy);
app.use('/seed-sqlite.php', phpProxy);
app.use('/php', phpProxy);
app.use('/admin-assets', phpProxy);

// Rutas del CRM (SPA)
// Estáticos. El HTML SIEMPRE se revalida (no-store): así el navegador no se
// queda con un index viejo apuntando a un bundle que ya no existe. Los assets
// llevan hash en el nombre, así que se cachean fuerte.
app.use(
  express.static(distDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Fallback SPA
// ---------------------------------------------------------------------------
// HUB DEL ECOSISTEMA · /api/v1/crm/portfolio/*
//
// El Planner y el Arquitecto (F·A·S·E) leen y escriben por acá, así el CRM es
// la única puerta de entrada y hay una sola fuente de verdad (la base).
//
// Antes el Arquitecto apuntaba a http://localhost:5052/api/v1/crm → en la nube
// no cargaba nada y, peor, no podía guardar: ese backend responde 405 en POST.
// ---------------------------------------------------------------------------
const CRM_V1 = 'https://crm-v1-uc-897089213264.us-central1.run.app';

// Lectura del catálogo: se reenvía al catálogo real (misma forma exacta, sin
// riesgo de divergencia) para que las apps vean las mismas obras que el CRM.
app.get('/api/v1/crm/portfolio/projects', async (req, res) => {
  try {
    const r = await fetch(`${CRM_V1}/api/v1/crm/portfolio/projects`, {
      headers: { Accept: 'application/json' },
    });
    const txt = await r.text();
    res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(txt);
  } catch (e) {
    res.status(502).json({ success: false, error: 'catálogo no disponible', detail: e.message, projects: [] });
  }
});

// Equipo real del ecosistema: nómina de compañías (socios y elenco).
app.get('/api/v1/crm/portfolio/team', async (req, res) => {
  try {
    const db = getPool();
    const [people] = await db.execute(
      `SELECT p.id, p.full_name, p.role_title, p.kind, p.email, p.phone, p.character_name,
              c.name AS company, c.kind AS company_kind
         FROM company_people p LEFT JOIN companies c ON c.id = p.company_id
        ORDER BY c.name, p.kind, p.full_name`
    );
    const team = people.map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email || '',
      role: p.role_title || '',
      kind: p.kind || 'equipo',
      company: p.company || '',
      phone: p.phone || '',
      characterName: p.character_name || '',
      provider: 'google',
    }));
    return res.json({ success: true, total: team.length, team });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message, team: [] });
  }
});

// Alta / edición de obra enviada desde el Arquitecto.
// El Arquitecto manda: id, title, disciplina, descripcion, estado, location,
// category, year, image_url, budget_range.
function obraDesdeArquitecto(b) {
  return {
    id: String(b.id || b.projectId || randomUUID()).slice(0, 36),
    title: String(b.title || '').slice(0, 255),
    discipline: String(b.disciplina || b.discipline || '').slice(0, 100),
    synopsis: String(b.descripcion || b.synopsis || b.description || ''),
    status: String(b.estado || b.status || 'En formulación').slice(0, 40),
    location: String(b.location || '').slice(0, 200),
    category: String(b.category || 'teatro').slice(0, 60),
    year: b.year ? Number(b.year) : null,
    image_url: String(b.image_url || b.image || '').slice(0, 512),
    budget_range: String(b.budget_range || '').slice(0, 255),
  };
}

async function guardarObraEcosistema(req, res, idFijo) {
  try {
    const db = getPool();
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, ok: false, error: 'Falta el titulo' });
    const r = obraDesdeArquitecto(idFijo ? { ...b, id: idFijo } : b);
    await db.execute(
      `INSERT INTO projects
         (id, owner_id, title, description, synopsis, discipline, status, location, category, year,
          image_url, budget_range, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         -- solo se pisa un campo si viene con valor: una edición parcial no
         -- debe borrar lo que ya estaba cargado
         title = COALESCE(NULLIF(VALUES(title), ''), title),
         synopsis = COALESCE(NULLIF(VALUES(synopsis), ''), synopsis),
         discipline = COALESCE(NULLIF(VALUES(discipline), ''), discipline),
         status = COALESCE(NULLIF(VALUES(status), ''), status),
         location = COALESCE(NULLIF(VALUES(location), ''), location),
         category = COALESCE(NULLIF(VALUES(category), ''), category),
         year = COALESCE(VALUES(year), year),
         image_url = COALESCE(NULLIF(VALUES(image_url), ''), image_url),
         budget_range = COALESCE(NULLIF(VALUES(budget_range), ''), budget_range)`,
      [r.id, b.ownerId || b.owner_id || '2a2b45f0-c408-484d-8b49-8034b76b227d',
       r.title, r.synopsis.slice(0, 400), r.synopsis, r.discipline, r.status,
       r.location, r.category, r.year, r.image_url, r.budget_range]
    );
    return res.json({ success: true, ok: true, id: r.id, project: r });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
}

app.post('/api/v1/crm/portfolio/projects', (req, res) => guardarObraEcosistema(req, res, null));
// Edición de una obra. Tolera actualizaciones PARCIALES: lo que no venga en el
// body se completa con lo que ya está guardado (antes fallaba con "Falta el titulo").
app.patch('/api/v1/crm/portfolio/projects/:id', async (req, res) => {
  try {
    const b = { ...(req.body || {}) };
    const faltan = !b.title || !b.status || b.is_public === undefined || !b.category;
    if (faltan) {
      const db = getPool();
      const [r] = await db.execute(
        'SELECT title, status, is_public, category, owner_id FROM projects WHERE id = ? LIMIT 1',
        [req.params.id]
      );
      if (!r.length) return res.status(404).json({ ok: false, error: 'obra no encontrada' });
      const act = r[0];
      if (!b.title) b.title = act.title;
      if (!b.status) b.status = act.status;
      if (b.is_public === undefined) b.is_public = act.is_public;
      if (!b.category) b.category = act.category;
      if (!b.owner_id) b.owner_id = act.owner_id;
    }
    return guardarObraEcosistema({ ...req, body: b }, res, req.params.id);
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Baja de una obra (la usa el catálogo del CRM). Sólo administración/dirección.
app.delete('/api/v1/crm/portfolio/projects/:id', async (req, res) => {
  try {
    const email = (req.body && req.body.email) || req.query.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) {
      return res.status(403).json({ ok: false, error: 'sólo administración puede eliminar obras' });
    }
    const db = getPool();
    // limpia las relaciones que apuntan a la obra y después la obra
    for (const tabla of ['project_people', 'project_documents', 'project_milestones']) {
      try { await db.execute(`DELETE FROM ${tabla} WHERE project_id = ?`, [req.params.id]); } catch { /* tabla opcional */ }
    }
    const r = await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'obra no encontrada' });
    radarEmitir('obra_eliminada', { id: req.params.id });
    return res.json({ ok: true, id: req.params.id, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// CONVOCATORIAS (Buscador de Fondos) · /api/v1/crm/convocatorias
//
// El Buscador de Fondos vivía 100% en el navegador (localStorage) y su "sync"
// apuntaba a http://localhost:5052 con un "Mac Agent" que nunca existió: nada
// llegaba al CRM. Acá se guarda de verdad: las convocatorias en
// `fundraising_calls` y su seguimiento (estado, responsable, notas, checklist)
// en `fundraising_crm_tracking`.
// ---------------------------------------------------------------------------
function convocatoriaARow(c) {
  const fecha = (v) => {
    const s = String(v || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;   // la columna es DATE
  };
  return {
    id: String(c.id || '').slice(0, 255),
    nombre: String(c.nombre || '').slice(0, 255),
    institucion: String(c.institucion || '').slice(0, 255),
    categoria: String(c.categoria || '').slice(0, 100),
    monto_max: c.monto_max ? Number(c.monto_max) : null,
    fecha_apertura: fecha(c.fecha_apertura),
    fecha_cierre: fecha(c.fecha_cierre),
    estado: String(c.estado || '').slice(0, 50),
    enlace: String(c.enlace || ''),
    tags_json: JSON.stringify(Array.isArray(c.tags) ? c.tags : []),
    perfil_beneficiario: c.perfil_beneficiario || null,
    monto_formateado: c.monto_formateado ? String(c.monto_formateado).slice(0, 80) : null,
    cofinanciamiento: c.cofinanciamiento || null,
    resumen: c.resumen || null,
    requisitos: c.requisitos || null,
    advertencias: c.advertencias || null,
    observaciones: c.observaciones || null,
    documento_base_url: c.documento_base_url ? String(c.documento_base_url).slice(0, 500) : null,
    periodo_auditoria: c.periodo_auditoria ? String(c.periodo_auditoria).slice(0, 80) : null,
  };
}

app.post('/api/v1/crm/convocatorias/sync', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    const lista = Array.isArray(b) ? b : (Array.isArray(b.convocatorias) ? b.convocatorias : [b]);
    if (!lista.length) return res.status(400).json({ success: false, error: 'sin convocatorias' });

    let guardadas = 0;
    let seguimientos = 0;
    const avisos = [];
    for (const c of lista) {
      if (!c || !c.id) continue;
      const r = convocatoriaARow(c);
      await db.execute(
        `INSERT INTO fundraising_calls
           (id, nombre, institucion, categoria, monto_max, fecha_apertura, fecha_cierre, estado,
            enlace, tags_json, perfil_beneficiario, monto_formateado, cofinanciamiento, resumen,
            requisitos, advertencias, observaciones, documento_base_url, periodo_auditoria)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
           institucion = COALESCE(NULLIF(VALUES(institucion), ''), institucion),
           categoria = COALESCE(NULLIF(VALUES(categoria), ''), categoria),
           monto_max = COALESCE(VALUES(monto_max), monto_max),
           fecha_apertura = COALESCE(VALUES(fecha_apertura), fecha_apertura),
           fecha_cierre = COALESCE(VALUES(fecha_cierre), fecha_cierre),
           estado = COALESCE(NULLIF(VALUES(estado), ''), estado),
           enlace = COALESCE(NULLIF(VALUES(enlace), ''), enlace),
           tags_json = VALUES(tags_json),
           perfil_beneficiario = COALESCE(VALUES(perfil_beneficiario), perfil_beneficiario),
           monto_formateado = COALESCE(VALUES(monto_formateado), monto_formateado),
           cofinanciamiento = COALESCE(VALUES(cofinanciamiento), cofinanciamiento),
           resumen = COALESCE(VALUES(resumen), resumen),
           requisitos = COALESCE(VALUES(requisitos), requisitos),
           advertencias = COALESCE(VALUES(advertencias), advertencias),
           observaciones = COALESCE(VALUES(observaciones), observaciones),
           documento_base_url = COALESCE(VALUES(documento_base_url), documento_base_url),
           periodo_auditoria = COALESCE(VALUES(periodo_auditoria), periodo_auditoria)`,
        [r.id, r.nombre, r.institucion, r.categoria, r.monto_max, r.fecha_apertura, r.fecha_cierre,
         r.estado, r.enlace, r.tags_json, r.perfil_beneficiario, r.monto_formateado,
         r.cofinanciamiento, r.resumen, r.requisitos, r.advertencias, r.observaciones,
         r.documento_base_url, r.periodo_auditoria]
      );
      guardadas += 1;

      // Seguimiento interno (estado, responsable, notas, checklist)
      if (c.crm && typeof c.crm === 'object') {
        // `responsable` tiene FK a users(email): solo se guarda si es un correo
        // de usuario real; el nombre igual se conserva en `responsable_nombre`.
        const resp = String(c.crm.responsable || '').trim();
        let respEmail = null;
        if (resp.includes('@')) {
          const [u] = await db.execute(
            'SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1', [resp.toLowerCase()]);
          if (u.length) respEmail = u[0].email;
        }
        const t = {
          id: `trk_${r.id}`.slice(0, 255),
          convocatoria_id: r.id,
          estado: String(c.crm.estado || 'No visto').slice(0, 50),
          responsable: respEmail,
          responsable_nombre: resp ? resp.slice(0, 255) : null,
          notas_internas: String(c.crm.notas_internas || ''),
          checklist_completado: JSON.stringify(c.crm.checklist_completado || {}),
        };
        try {
          await db.execute(
            `INSERT INTO fundraising_crm_tracking
               (id, convocatoria_id, estado, responsable, responsable_nombre, notas_internas,
                checklist_completado)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               estado = VALUES(estado), responsable = VALUES(responsable),
               responsable_nombre = VALUES(responsable_nombre),
               notas_internas = VALUES(notas_internas),
               checklist_completado = VALUES(checklist_completado)`,
            [t.id, t.convocatoria_id, t.estado, t.responsable, t.responsable_nombre,
             t.notas_internas, t.checklist_completado]
          );
          seguimientos += 1;
        } catch (errTrack) {
          // el seguimiento no debe tumbar la sincronización completa
          avisos.push({ id: r.id, error: `seguimiento: ${errTrack.message}` });
        }
      }
    }
    return res.json({ success: true, ok: true, guardadas, seguimientos, avisos });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
});

// Lo que el CRM tiene guardado (para que el Buscador lo muestre al abrir)
app.get('/api/v1/crm/convocatorias', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT c.id, c.nombre, c.institucion, c.categoria, c.monto_max, c.monto_formateado,
              c.fecha_apertura, c.fecha_cierre, c.estado, c.enlace, c.tags_json,
              c.perfil_beneficiario, c.cofinanciamiento, c.resumen, c.requisitos,
              c.advertencias, c.observaciones, c.documento_base_url, c.periodo_auditoria,
              t.estado AS crm_estado, t.responsable AS crm_responsable,
              t.responsable_nombre AS crm_responsable_nombre,
              t.notas_internas AS crm_notas, t.checklist_completado AS crm_checklist
         FROM fundraising_calls c
         LEFT JOIN fundraising_crm_tracking t ON t.convocatoria_id = c.id
        ORDER BY c.fecha_cierre IS NULL, c.fecha_cierre`
    );
    const convocatorias = rows.map((r) => ({
      ...r,
      tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json || '[]') : (r.tags_json || []),
      crm: {
        estado: r.crm_estado || 'No visto',
        responsable: r.crm_responsable_nombre || r.crm_responsable || 'Sin asignar',
        notas_internas: r.crm_notas || '',
        checklist_completado:
          typeof r.crm_checklist === 'string' ? JSON.parse(r.crm_checklist || '{}') : (r.crm_checklist || {}),
      },
    }));
    return res.json({ success: true, total: convocatorias.length, convocatorias });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message, convocatorias: [] });
  }
});

// ---------------------------------------------------------------------------
// PREFERENCIAS DE INTERFAZ · /api/users/:id/preferences
//
// El panel de diseño (módulo modular que agregó Francisco) guarda acá la
// configuración visual de cada usuario: color de acento, tipografía, estilo de
// superficie, densidad y el orden/ocultamiento de las secciones del perfil.
//
// ANTES esto apuntaba a un servicio que ya no existe y el frontend caía en
// silencio a localStorage: el estado decía "Sincronizado Cloud" sin haber
// guardado nada en la base. Ahora persiste de verdad, por usuario.
//
// El `id` puede ser el id del usuario o su correo (se normaliza).
// ---------------------------------------------------------------------------
async function resolverUsuarioId(id) {
  const clave = String(id || '').trim();
  if (!clave) return null;
  const db = getPool();
  const [filas] = await db.execute(
    'SELECT id, email FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1',
    [clave, clave.toLowerCase()]
  );
  return filas.length ? filas[0] : null;
}

app.get('/api/users/:id/preferences', async (req, res) => {
  try {
    const db = getPool();
    const usuario = await resolverUsuarioId(req.params.id);
    const clave = usuario ? usuario.id : String(req.params.id || '').trim();
    const [filas] = await db.execute(
      'SELECT preferences_json FROM user_preferences WHERE user_id = ? LIMIT 1', [clave]
    );
    if (!filas.length) {
      // Sin preferencias guardadas: el frontend usa sus valores por defecto.
      return res.status(404).json({ success: false, error: 'sin preferencias guardadas' });
    }
    const prefs = typeof filas[0].preferences_json === 'string'
      ? JSON.parse(filas[0].preferences_json)
      : filas[0].preferences_json;
    return res.json(prefs);
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

async function guardarPreferencias(req, res) {
  try {
    const db = getPool();
    const prefs = req.body || {};
    if (!prefs.theme_config || !prefs.layout_config) {
      return res.status(400).json({ success: false, error: 'faltan theme_config o layout_config' });
    }
    // Se puede guardar para el usuario indicado en la URL o para el de la sesión
    const usuario = await resolverUsuarioId(req.params.id || req.body.userId || req.headers['x-atha-email']);
    const clave = usuario ? usuario.id : String(req.params.id || '').slice(0, 64);
    if (!clave) return res.status(400).json({ success: false, error: 'falta el usuario' });

    await db.execute(
      `INSERT INTO user_preferences (user_id, preferences_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE preferences_json = VALUES(preferences_json)`,
      [clave, JSON.stringify(prefs)]
    );
    return res.json({ success: true, ok: true, user_id: clave, guardado: new Date().toISOString() });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
}

app.put('/api/users/:id/preferences', guardarPreferencias);
app.post('/api/users/:id/preferences', guardarPreferencias);

// ---------------------------------------------------------------------------
// RADAR CULTURAL · /api/v1/crm/radar/*
//
// El radar (nodos culturales descubribles por GPS o QR, rutas y progreso) vive
// ACÁ, en el hub. Antes cada proyecto traía su propio esquema PostgreSQL y datos
// semilla; ahora hay una sola fuente de verdad y las apps (móvil, PWA, CRM)
// sólo consumen.
//
// Identidad: el correo del explorador (misma sesión del ecosistema). Si el
// correo no existe todavía se crea como rol `explorador` (registro público).
// ---------------------------------------------------------------------------
const RADAR_XP_DESCUBRIR = 50;

/** Distancia en metros entre dos coordenadas (haversine). */
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (Number(lat2) - Number(lat1)) * rad;
  const dLng = (Number(lng2) - Number(lng1)) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(Number(lat1) * rad) * Math.cos(Number(lat2) * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** Nivel a partir de la experiencia acumulada. */
const nivelPorXp = (xp) => Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1);

/** Id del explorador; si no existe, lo crea (registro público, rol no-admin). */
async function exploradorId(email, nombre) {
  const correo = String(email || '').trim().toLowerCase();
  if (!correo) return null;
  const db = getPool();
  const [filas] = await db.execute('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [correo]);
  if (filas.length) return filas[0].id;
  const id = `usr_${randomUUID().slice(0, 8)}`;
  await db.execute(
    'INSERT INTO users (id, email, display_name, role, provider, public_profile) VALUES (?, ?, ?, ?, ?, 1)',
    [id, correo, String(nombre || correo.split('@')[0]).slice(0, 120), 'explorador', 'google']
  );
  return id;
}

/** Perfil de explorador (se crea al vuelo con 0 XP). */
async function perfilRadar(userId) {
  const db = getPool();
  const [filas] = await db.execute('SELECT * FROM radar_profiles WHERE user_id = ? LIMIT 1', [userId]);
  if (filas.length) return filas[0];
  const numero = `FASE-EXP-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  await db.execute(
    'INSERT INTO radar_profiles (user_id, explorer_number, xp, level) VALUES (?, ?, 0, 1)',
    [userId, numero]
  );
  const [nuevo] = await db.execute('SELECT * FROM radar_profiles WHERE user_id = ? LIMIT 1', [userId]);
  return nuevo[0];
}

const nodoSalida = (n, distancia, descubrimiento) => ({
  id: n.id,
  name: n.name,
  short_description: n.short_description,
  full_description: n.full_description,
  category: n.category,
  latitude: Number(n.latitude),
  longitude: Number(n.longitude),
  address: n.address,
  city: n.city,
  region: n.region,
  cover_url: n.cover_url,
  unlock_radius_m: n.unlock_radius_m,
  qr_code: n.qr_code,
  is_published: !!n.is_published,
  created_by: n.created_by,
  created_at: n.created_at,
  distance_m: distancia,
  is_discovered: !!descubrimiento,
  discovery_number: descubrimiento ? descubrimiento.discovery_number : undefined,
  discovered_at: descubrimiento ? descubrimiento.discovered_at : undefined,
});

// Nodos del radar (con estado de descubrimiento y distancia si se envía la ubicación)
app.get('/api/v1/crm/radar/nodos', async (req, res) => {
  try {
    const db = getPool();
    const { lat, lng, email, incluir_borradores } = req.query;
    const userId = email ? await exploradorId(email) : null;

    let sql = 'SELECT * FROM radar_nodes';
    if (!incluir_borradores) sql += ' WHERE is_published = 1';
    sql += ' ORDER BY created_at DESC';
    const [nodos] = await db.execute(sql);

    let descubiertos = [];
    if (userId) {
      const [d] = await db.execute('SELECT * FROM radar_discoveries WHERE user_id = ?', [userId]);
      descubiertos = d;
    }
    const porNodo = new Map(descubiertos.map((d) => [d.node_id, d]));

    const lista = nodos.map((n) => {
      const dist = (lat && lng && n.latitude != null)
        ? distanciaMetros(lat, lng, n.latitude, n.longitude)
        : undefined;
      return nodoSalida(n, dist, porNodo.get(n.id));
    });

    return res.json({ ok: true, total: lista.length, nodos: lista });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Un nodo puntual
app.get('/api/v1/crm/radar/nodos/:id', async (req, res) => {
  try {
    const db = getPool();
    const [filas] = await db.execute('SELECT * FROM radar_nodes WHERE id = ? LIMIT 1', [req.params.id]);
    if (!filas.length) return res.status(404).json({ ok: false, error: 'nodo no encontrado' });
    const userId = req.query.email ? await exploradorId(req.query.email) : null;
    let desc = null;
    if (userId) {
      const [d] = await db.execute(
        'SELECT * FROM radar_discoveries WHERE user_id = ? AND node_id = ? LIMIT 1', [userId, req.params.id]
      );
      desc = d.length ? d[0] : null;
    }
    return res.json({ ok: true, nodo: nodoSalida(filas[0], undefined, desc) });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Alta / edición de nodos (administración del radar)
async function guardarNodoRadar(req, res, id) {
  try {
    const b = req.body || {};
    const db = getPool();
    const email = b.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) {
      return res.status(403).json({ ok: false, error: 'sólo administración puede editar el radar' });
    }
    const campos = {
      name: b.name ? String(b.name).slice(0, 200) : null,
      short_description: b.short_description ? String(b.short_description).slice(0, 300) : null,
      full_description: b.full_description ?? null,
      category: b.category ?? null,
      latitude: b.latitude ?? b.lat ?? null,
      longitude: b.longitude ?? b.lng ?? null,
      address: b.address ?? null,
      city: b.city ?? null,
      region: b.region ?? null,
      cover_url: b.cover_url ?? null,
      unlock_radius_m: b.unlock_radius_m ?? 120,
      qr_code: b.qr_code ?? null,
      is_published: b.is_published === undefined ? 1 : (b.is_published ? 1 : 0),
      created_by: alcance.usuario ? alcance.usuario.email : null,
    };

    if (id) {
      const sets = Object.keys(campos).filter((k) => b[k] !== undefined || ['name','short_description','full_description','category','latitude','longitude','address','city','region','cover_url','unlock_radius_m','qr_code','is_published'].includes(k));
      const sql = `UPDATE radar_nodes SET ${sets.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
      await db.execute(sql, [...sets.map((k) => campos[k]), id]);
      return res.json({ ok: true, id });
    }
    const nuevo = String(b.id || `nd_${randomUUID().slice(0, 8)}`).slice(0, 64);
    await db.execute(
      `INSERT INTO radar_nodes
        (id, name, short_description, full_description, category, latitude, longitude, address, city, region,
         cover_url, unlock_radius_m, qr_code, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nuevo, campos.name || 'Nodo sin nombre', campos.short_description, campos.full_description, campos.category,
       campos.latitude, campos.longitude, campos.address, campos.city, campos.region, campos.cover_url,
       campos.unlock_radius_m, campos.qr_code, campos.is_published, campos.created_by]
    );
    return res.json({ ok: true, nodo: { id: nuevo, ...campos } });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
}

app.post('/api/v1/crm/radar/nodos', (req, res) => guardarNodoRadar(req, res, null));
app.patch('/api/v1/crm/radar/nodos/:id', (req, res) => guardarNodoRadar(req, res, req.params.id));

// Baja de un nodo (administración): limpia también sus relaciones
app.delete('/api/v1/crm/radar/nodos/:id', async (req, res) => {
  try {
    const alcance = await alcanceInventario(
      (req.body && req.body.email) || req.query.email || req.headers['x-atha-email'] || ''
    );
    if (!alcance.total) {
      return res.status(403).json({ ok: false, error: 'sólo administración puede eliminar nodos' });
    }
    const db = getPool();
    await db.execute('DELETE FROM radar_route_nodes WHERE node_id = ?', [req.params.id]);
    await db.execute('DELETE FROM radar_discoveries WHERE node_id = ?', [req.params.id]);
    await db.execute('DELETE FROM radar_nodes WHERE id = ?', [req.params.id]);
    radarEmitir('nodo_eliminado', { node_id: req.params.id });
    return res.json({ ok: true, id: req.params.id, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Descubrimiento de un nodo (GPS o QR): otorga XP una sola vez
app.post('/api/v1/crm/radar/descubrimientos', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || b.userId || req.headers['x-atha-email'];
    const nodeId = b.nodeId || b.node_id;
    if (!email || !nodeId) {
      return res.status(400).json({ ok: false, error: 'faltan email y nodeId' });
    }
    const db = getPool();
    const userId = await exploradorId(email, b.name);

    const [nodos] = await db.execute('SELECT * FROM radar_nodes WHERE id = ? LIMIT 1', [nodeId]);
    if (!nodos.length) return res.status(404).json({ ok: false, error: 'nodo no encontrado' });

    const [ya] = await db.execute(
      'SELECT * FROM radar_discoveries WHERE user_id = ? AND node_id = ? LIMIT 1', [userId, nodeId]
    );
    if (ya.length) {
      return res.json({ ok: true, repetido: true, descubrimiento: ya[0], perfil: await perfilRadar(userId) });
    }

    const [cuenta] = await db.execute('SELECT COUNT(*) n FROM radar_discoveries WHERE node_id = ?', [nodeId]);
    const numero = String(Number(cuenta[0].n) + 1).padStart(4, '0');
    const id = `ds_${randomUUID().slice(0, 8)}`;
    await db.execute(
      `INSERT INTO radar_discoveries (id, user_id, node_id, discovery_number, method, xp_awarded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, nodeId, numero, b.method === 'qr' ? 'qr' : 'gps', RADAR_XP_DESCUBRIR]
    );
    await db.execute(
      `INSERT INTO radar_profiles (user_id, explorer_number, xp, level) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE xp = xp + VALUES(xp),
                               level = GREATEST(level, FLOOR(SQRT((xp + VALUES(xp)) / 100)) + 1)`,
      [userId, `FASE-EXP-${Math.floor(Math.random() * 9000) + 1000}`, RADAR_XP_DESCUBRIR, nivelPorXp(RADAR_XP_DESCUBRIR)]
    );
    const [desc] = await db.execute('SELECT * FROM radar_discoveries WHERE id = ? LIMIT 1', [id]);
    const insignias = await otorgarInsignias(userId);
    // en vivo: el mapa de todos muestra el nodo recién descubierto
    radarEmitir('descubrimiento', {
      node_id: nodeId, user_id: userId, discovery_number: numero,
      xp: RADAR_XP_DESCUBRIR, insignias: insignias.map((b) => b.name),
    });
    return res.json({
      ok: true,
      repetido: false,
      nodo: nodoSalida(nodos[0], undefined, desc[0]),
      descubrimiento: desc[0],
      perfil: await perfilRadar(userId),
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Perfil del explorador (XP, nivel, número, cuántos nodos descubrió)
app.get('/api/v1/crm/radar/perfil', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-atha-email'];
    if (!email) return res.status(400).json({ ok: false, error: 'falta email' });
    const db = getPool();
    const userId = await exploradorId(email);
    const perfil = await perfilRadar(userId);
    const [desc] = await db.execute(
      'SELECT node_id, discovery_number, discovered_at FROM radar_discoveries WHERE user_id = ? ORDER BY discovered_at DESC',
      [userId]
    );
    const [total] = await db.execute('SELECT COUNT(*) n FROM radar_nodes WHERE is_published = 1');
    return res.json({
      ok: true,
      perfil: { ...perfil, descubiertos: desc.length, total_nodos: total[0].n },
      descubrimientos: desc,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Rutas culturales (con sus nodos y el progreso del explorador)
app.get('/api/v1/crm/radar/rutas', async (req, res) => {
  try {
    const db = getPool();
    const [rutas] = await db.execute('SELECT * FROM radar_routes ORDER BY created_at DESC');
    const [enlaces] = await db.execute('SELECT * FROM radar_route_nodes ORDER BY order_index');
    const [nodos] = await db.execute('SELECT * FROM radar_nodes WHERE is_published = 1');
    const porId = new Map(nodos.map((n) => [n.id, n]));

    let hechos = new Set();
    if (req.query.email) {
      const userId = await exploradorId(req.query.email);
      const [d] = await db.execute('SELECT node_id FROM radar_discoveries WHERE user_id = ?', [userId]);
      hechos = new Set(d.map((x) => x.node_id));
    }

    const salida = rutas.map((r) => {
      const suyos = enlaces.filter((e) => e.route_id === r.id);
      const completados = suyos.filter((e) => hechos.has(e.node_id)).length;
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        cover_url: r.cover_url,
        city: r.city,
        tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json || '[]') : (r.tags_json || []),
        is_public: !!r.is_public,
        nodes: suyos.map((e) => ({ node_id: e.node_id, order_index: e.order_index, note: e.note, node: porId.get(e.node_id) || null })),
        progress: {
          status: suyos.length && completados >= suyos.length ? 'completed' : 'in_progress',
          completed_nodes: suyos.filter((e) => hechos.has(e.node_id)).map((e) => e.node_id),
          completados, total: suyos.length,
        },
      };
    });
    return res.json({ ok: true, total: salida.length, rutas: salida });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Alta de rutas (administración)
app.post('/api/v1/crm/radar/rutas', async (req, res) => {
  try {
    const b = req.body || {};
    const db = getPool();
    const alcance = await alcanceInventario(b.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'sólo administración puede crear rutas' });
    const id = String(b.id || `rt_${randomUUID().slice(0, 8)}`).slice(0, 64);
    await db.execute(
      `INSERT INTO radar_routes (id, name, description, cover_url, city, tags_json, created_by, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
                               cover_url = VALUES(cover_url), city = VALUES(city),
                               tags_json = VALUES(tags_json), is_public = VALUES(is_public)`,
      [id, b.name || 'Ruta sin nombre', b.description || null, b.cover_url || null, b.city || null,
       JSON.stringify(b.tags || []), alcance.usuario ? alcance.usuario.email : null, b.is_public === false ? 0 : 1]
    );
    if (Array.isArray(b.nodes)) {
      await db.execute('DELETE FROM radar_route_nodes WHERE route_id = ?', [id]);
      let i = 0;
      for (const n of b.nodes) {
        const nodeId = typeof n === 'string' ? n : (n.node_id || n.id);
        if (!nodeId) continue;
        await db.execute(
          'INSERT INTO radar_route_nodes (route_id, node_id, order_index, note) VALUES (?, ?, ?, ?)',
          [id, nodeId, typeof n === 'object' && n.order_index !== undefined ? n.order_index : i, (typeof n === 'object' && n.note) || null]
        );
        i += 1;
      }
    }
    return res.json({ ok: true, id });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// RADAR SOCIAL · feed, publicaciones, comentarios, reacciones e insignias
//
// La red social del radar NO es un feed genérico: cada publicación está anclada
// a un nodo cultural (publicás sobre el lugar que descubriste). Las reacciones
// siguen el modelo del radar (like · inspire · fire · star · clap) y son únicas
// por usuario y objetivo.
// ---------------------------------------------------------------------------
const REACCIONES = ['like', 'inspire', 'fire', 'star', 'clap'];

/* ---------------------------------------------------------------------------
   RADAR EN VIVO · canal de eventos (Server-Sent Events)
   El hub empuja cada cambio del radar a todos los conectados: así el feed, los
   contadores de reacciones y los descubrimientos se actualizan sin recargar.
   La app se suscribe con EventSource y reconecta sola si se corta.
--------------------------------------------------------------------------- */
const radarSuscriptores = new Set();

function radarEmitir(tipo, datos) {
  if (!radarSuscriptores.size) return;
  const payload = `event: ${tipo}\ndata: ${JSON.stringify({ tipo, datos, ts: Date.now() })}\n\n`;
  for (const cliente of [...radarSuscriptores]) {
    try {
      cliente.write(payload);
    } catch (e) {
      radarSuscriptores.delete(cliente);
    }
  }
}

app.get('/api/v1/crm/radar/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (res.flushHeaders) res.flushHeaders();
  // saludo inicial: el cliente sabe que quedó conectado
  res.write(`event: conectado\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
  radarSuscriptores.add(res);
  // latido para que proxies y móviles no cierren la conexión
  const latido = setInterval(() => {
    try {
      res.write(': latido\n\n');
    } catch (e) {
      clearInterval(latido);
      radarSuscriptores.delete(res);
    }
  }, 25000);
  req.on('close', () => {
    clearInterval(latido);
    radarSuscriptores.delete(res);
  });
});

// Estado del canal (útil para diagnóstico y para la app)
app.get('/api/v1/crm/radar/stream/estado', (req, res) => {
  res.json({ ok: true, conectados: radarSuscriptores.size });
});

/** Otorga las insignias que correspondan según la actividad del explorador. */
async function otorgarInsignias(userId) {
  const db = getPool();
  const [reglas] = await db.execute('SELECT * FROM radar_badges');
  if (!reglas.length) return [];
  const [[d]] = await db.execute('SELECT COUNT(*) n FROM radar_discoveries WHERE user_id = ?', [userId]);
  const [[p]] = await db.execute('SELECT COUNT(*) n FROM radar_posts WHERE user_id = ?', [userId]);
  const [[r]] = await db.execute(
    `SELECT COUNT(*) n FROM radar_routes rt
      WHERE EXISTS (SELECT 1 FROM radar_route_nodes rn WHERE rn.route_id = rt.id)
        AND NOT EXISTS (
          SELECT 1 FROM radar_route_nodes rn
           WHERE rn.route_id = rt.id
             AND rn.node_id NOT IN (SELECT node_id FROM radar_discoveries WHERE user_id = ?)
        )`, [userId]
  );
  const cuenta = { descubrimientos: Number(d.n), publicaciones: Number(p.n), rutas: Number(r.n) };
  const [tiene] = await db.execute('SELECT badge_id FROM radar_user_badges WHERE user_id = ?', [userId]);
  const ya = new Set(tiene.map((x) => x.badge_id));
  const nuevas = [];
  for (const b of reglas) {
    if (ya.has(b.id)) continue;
    if ((cuenta[b.criterio] || 0) >= Number(b.umbral || 1)) {
      await db.execute('INSERT IGNORE INTO radar_user_badges (user_id, badge_id) VALUES (?, ?)', [userId, b.id]);
      nuevas.push({ code: b.code, name: b.name, icon: b.icon });
    }
  }
  return nuevas;
}

const autorDe = (u) => ({
  id: u.user_id,
  name: u.display_name || (u.email || '').split('@')[0],
  avatar: u.avatar_url || null,
  explorer_number: u.explorer_number || null,
  level: u.level || 1,
  xp: u.xp || 0,
});

// Feed del radar: publicaciones con autor, nodo, reacciones y comentarios
app.get('/api/v1/crm/radar/feed', async (req, res) => {
  try {
    const db = getPool();
    const limite = Math.min(Number(req.query.limite) || 30, 100);
    const usuarioActual = req.query.email ? await exploradorId(req.query.email) : null;
    const esAdmin = (await alcanceInventario(req.query.email || '')).total;

    let sql = `SELECT p.*, u.display_name, u.email, COALESCE(u.picture, u.google_picture) AS avatar_url,
                      rp.explorer_number, rp.level, rp.xp
                 FROM radar_posts p
                 LEFT JOIN users u ON u.id = p.user_id
                 LEFT JOIN radar_profiles rp ON rp.user_id = p.user_id`;
    const cond = [];
    const vals = [];
    if (!esAdmin) cond.push("p.status = 'approved'");
    if (req.query.node_id) { cond.push('p.node_id = ?'); vals.push(req.query.node_id); }
    if (req.query.autor === 'mio' && usuarioActual) { cond.push('p.user_id = ?'); vals.push(usuarioActual); }
    if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
    sql += ' ORDER BY p.created_at DESC LIMIT ' + limite;

    const [posts] = await db.execute(sql, vals);
    const ids = posts.map((p) => p.id);
    let comentarios = [];
    let reacciones = [];
    let nodos = [];
    if (ids.length) {
      const marcas = ids.map(() => '?').join(',');
      [comentarios] = await db.execute(
        `SELECT c.*, u.display_name, COALESCE(u.picture, u.google_picture) AS avatar_url FROM radar_comments c
          LEFT JOIN users u ON u.id = c.user_id
          WHERE c.post_id IN (${marcas}) AND c.status = 'approved' ORDER BY c.created_at ASC`, ids);
      [reacciones] = await db.execute(
        `SELECT target_id, reaction_type, COUNT(*) n FROM radar_reactions
          WHERE target_type = 'post' AND target_id IN (${marcas}) GROUP BY target_id, reaction_type`, ids);
      const nodeIds = [...new Set(posts.map((p) => p.node_id).filter(Boolean))];
      if (nodeIds.length) {
        const nm = nodeIds.map(() => '?').join(',');
        [nodos] = await db.execute(`SELECT id, name, category, city, cover_url FROM radar_nodes WHERE id IN (${nm})`, nodeIds);
      }
    }
    let mias = new Set();
    if (usuarioActual && ids.length) {
      const marcas = ids.map(() => '?').join(',');
      const [m] = await db.execute(
        `SELECT target_id, reaction_type FROM radar_reactions WHERE user_id = ? AND target_type = 'post' AND target_id IN (${marcas})`,
        [usuarioActual, ...ids]);
      mias = new Map(m.map((x) => [x.target_id, x.reaction_type]));
    }
    const nodoPorId = new Map(nodos.map((n) => [n.id, n]));

    const feed = posts.map((p) => {
      const suyos = reacciones.filter((r) => r.target_id === p.id);
      const conteo = suyos.reduce((acc, r) => { acc[r.reaction_type] = Number(r.n); return acc; }, {});
      const totalReacciones = suyos.reduce((acc, r) => acc + Number(r.n), 0);
      const suyosCom = comentarios.filter((c) => c.post_id === p.id);
      return {
        id: p.id,
        type: p.type,
        media_url: p.media_url,
        caption: p.caption,
        status: p.status,
        created_at: p.created_at,
        autor: autorDe(p),
        nodo: nodoPorId.get(p.node_id) || (p.node_id ? { id: p.node_id } : null),
        reactions: conteo,
        total_reacciones: totalReacciones,
        mi_reaccion: (mias instanceof Map ? mias.get(p.id) : null) || null,
        comentarios: suyosCom.length,
        ultimos_comentarios: suyosCom.slice(-3).map((c) => ({
          id: c.id, content: c.content, created_at: c.created_at,
          autor: { id: c.user_id, name: c.display_name || 'Explorador', avatar: c.avatar_url || null },
        })),
      };
    });
    return res.json({ ok: true, total: feed.length, feed });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Publicar en el radar (con foto opcional: llega como image base64 o media_url)
app.post('/api/v1/crm/radar/posts', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'];
    if (!email) return res.status(400).json({ ok: false, error: 'falta email' });
    if (!b.caption && !b.media_url && !b.image) {
      return res.status(400).json({ ok: false, error: 'la publicación necesita texto o imagen' });
    }
    const db = getPool();
    const userId = await exploradorId(email, b.name);
    const id = `po_${randomUUID().slice(0, 8)}`;

    let media = b.media_url || null;
    if (!media && b.image) {
      media = await subirFotoGcs(id, b.image, 'radar/publicaciones');
    }
    const alcance = await alcanceInventario(email);
    const status = (alcance.total && b.status) ? String(b.status).slice(0, 16) : 'approved';

    await db.execute(
      `INSERT INTO radar_posts (id, user_id, node_id, type, media_url, caption, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, b.node_id || b.nodeId || null, b.type || (media ? 'photo' : 'text'), media, b.caption || null, status]
    );
    const insignias = await otorgarInsignias(userId);
    // en vivo: el feed de todos los conectados recibe la publicación
    radarEmitir('post_nuevo', {
      id, node_id: b.node_id || b.nodeId || null, caption: b.caption || null,
      media_url: media, status, autor: { id: userId, name: b.name || null },
    });
    return res.json({ ok: true, id, status, media_url: media, insignias });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Comentar una publicación (o un nodo)
app.post('/api/v1/crm/radar/posts/:id/comentarios', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'];
    if (!email || !b.content) return res.status(400).json({ ok: false, error: 'faltan email y content' });
    const db = getPool();
    const userId = await exploradorId(email, b.name);
    const [post] = await db.execute('SELECT * FROM radar_posts WHERE id = ? LIMIT 1', [req.params.id]);
    if (!post.length) return res.status(404).json({ ok: false, error: 'publicación no encontrada' });
    const id = `cm_${randomUUID().slice(0, 8)}`;
    await db.execute(
      `INSERT INTO radar_comments (id, user_id, node_id, post_id, content, status)
       VALUES (?, ?, ?, ?, ?, 'approved')`,
      [id, userId, post[0].node_id, req.params.id, String(b.content).slice(0, 2000)]
    );
    const comentario = {
      id, content: String(b.content), created_at: new Date().toISOString(),
      autor: { id: userId, name: b.name || email.split('@')[0], avatar: null },
    };
    // en vivo: aparece el comentario en el feed de todos
    radarEmitir('comentario', { post_id: req.params.id, node_id: post[0].node_id, ...comentario });
    return res.json({ ok: true, comentario });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Reaccionar (toggle): misma reacción = se quita; otra = se cambia
app.post('/api/v1/crm/radar/reacciones', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'];
    const tipo = REACCIONES.includes(b.reaction_type) ? b.reaction_type : 'inspire';
    const target = b.target_id || b.targetId;
    const targetType = b.target_type === 'node' ? 'node' : 'post';
    if (!email || !target) return res.status(400).json({ ok: false, error: 'faltan email y target_id' });
    const db = getPool();
    const userId = await exploradorId(email, b.name);
    const [ya] = await db.execute(
      'SELECT * FROM radar_reactions WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1',
      [userId, targetType, target]
    );
    if (ya.length && ya[0].reaction_type === tipo) {
      await db.execute('DELETE FROM radar_reactions WHERE id = ?', [ya[0].id]);
      radarEmitir('reaccion', { target_type: targetType, target_id: target, accion: 'quitada', reaction_type: null });
      return res.json({ ok: true, accion: 'quitada', reaction_type: null });
    }
    if (ya.length) {
      await db.execute('UPDATE radar_reactions SET reaction_type = ? WHERE id = ?', [tipo, ya[0].id]);
      radarEmitir('reaccion', { target_type: targetType, target_id: target, accion: 'cambiada', reaction_type: tipo });
      return res.json({ ok: true, accion: 'cambiada', reaction_type: tipo });
    }
    await db.execute(
      'INSERT INTO radar_reactions (id, user_id, target_type, target_id, reaction_type) VALUES (?, ?, ?, ?, ?)',
      [`rx_${randomUUID().slice(0, 8)}`, userId, targetType, target, tipo]
    );
    radarEmitir('reaccion', { target_type: targetType, target_id: target, accion: 'puesta', reaction_type: tipo });
    return res.json({ ok: true, accion: 'puesta', reaction_type: tipo });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Insignias: catálogo + las que ganó el explorador
app.get('/api/v1/crm/radar/badges', async (req, res) => {
  try {
    const db = getPool();
    const [todas] = await db.execute('SELECT * FROM radar_badges ORDER BY umbral');
    let ganadas = new Map();
    if (req.query.email) {
      const userId = await exploradorId(req.query.email);
      await otorgarInsignias(userId);
      const [mias] = await db.execute('SELECT badge_id, earned_at FROM radar_user_badges WHERE user_id = ?', [userId]);
      ganadas = new Map(mias.map((x) => [x.badge_id, x.earned_at]));
    }
    return res.json({
      ok: true,
      badges: todas.map((b) => ({ ...b, earned: ganadas.has(b.id), earned_at: ganadas.get(b.id) || null })),
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// Moderación de publicaciones (administración)
app.patch('/api/v1/crm/radar/posts/:id/moderar', async (req, res) => {
  try {
    const alcance = await alcanceInventario(req.body?.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'sólo administración modera' });
    const estado = ['approved', 'pending', 'rejected'].includes(req.body?.status) ? req.body.status : 'approved';
    const db = getPool();
    await db.execute('UPDATE radar_posts SET status = ? WHERE id = ?', [estado, req.params.id]);
    return res.json({ ok: true, id: req.params.id, status: estado });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// INVENTARIO · /api/v1/crm/inventario/*
//
// El inventario se organiza por CAJAS (lo que realmente sale a gira) y cada caja
// pertenece a una COMPAÑÍA. Estructura: companies → inventory_boxes → items.
// Incluye subida de fotos al bucket (el navegador manda un data URL y el
// contenedor lo sube a GCS con sus credenciales: no hacen falta API keys).
// ---------------------------------------------------------------------------
const BUCKET_INVENTARIO = 'atha-crm-obras-897089213264';

function nuevoId(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 64);
}

/**
 * Actualización PARCIAL: sólo toca las columnas que vienen en el body.
 *
 * Por qué: antes un PATCH con un solo campo (por ejemplo la foto) pasaba por el
 * mismo camino que el alta, donde los valores por defecto ("Ítem sin nombre",
 * "Audio / Backline"…) no son vacíos → el UPDATE los escribía y BORRABA el dato
 * original. Acá se arma el SET únicamente con lo que llegó.
 */
async function actualizarParcial(tabla, id, campos) {
  const cols = Object.keys(campos);
  if (!cols.length) return { actualizado: false };
  const db = getPool();
  const set = cols.map((c) => `\`${c}\` = ?`).join(', ');
  const vals = cols.map((c) => campos[c]);
  const [r] = await db.execute(`UPDATE \`${tabla}\` SET ${set} WHERE id = ?`, [...vals, id]);
  return { actualizado: r.affectedRows > 0 };
}

/** Traduce el body de un ítem a columnas de la base, sólo las claves presentes. */
function camposItemDeBody(b) {
  const campos = {};
  const pone = (k, v) => { if (v !== undefined) campos[k] = v; };
  if (b.companyId !== undefined || b.company_id !== undefined) campos.company_id = b.companyId || b.company_id || null;
  if (b.boxId !== undefined || b.box_id !== undefined) campos.box_id = b.boxId || b.box_id || null;
  if (b.code !== undefined) campos.code = String(b.code).slice(0, 100);
  if (b.name !== undefined) campos.name = String(b.name).slice(0, 255);
  if (b.category !== undefined) campos.category = String(b.category).slice(0, 50);
  if (b.brand !== undefined) campos.brand = b.brand ? String(b.brand).slice(0, 120) : null;
  if (b.model !== undefined) campos.model = b.model ? String(b.model).slice(0, 120) : null;
  if (b.serial !== undefined) campos.serial = b.serial ? String(b.serial).slice(0, 120) : null;
  if (b.quantity !== undefined) campos.quantity = Number(b.quantity) || 1;
  if (b.condition !== undefined) campos.condition = String(b.condition).slice(0, 30);
  if (b.status !== undefined) campos.status = String(b.status).slice(0, 30);
  if (b.assignedToWork !== undefined || b.assigned_to_work !== undefined) {
    campos.assigned_to_work = b.assignedToWork || b.assigned_to_work || null;
  }
  if (b.location !== undefined) campos.location = b.location ? String(b.location).slice(0, 255) : null;
  if (b.valueCLP !== undefined || b.value_clp !== undefined) {
    campos.value_clp = Number(b.valueCLP !== undefined ? b.valueCLP : b.value_clp) || 0;
  }
  if (b.photoUrl !== undefined || b.photo_url !== undefined) {
    campos.photo_url = b.photoUrl || b.photo_url || null;
  }
  if (b.notes !== undefined) campos.notes = b.notes || null;
  if (b.tags !== undefined) campos.tags_json = JSON.stringify(Array.isArray(b.tags) ? b.tags : []);
  return campos;
}

/** Traduce el body de una caja a columnas, sólo las claves presentes. */
function camposCajaDeBody(b) {
  const campos = {};
  if (b.companyId !== undefined || b.company_id !== undefined) campos.company_id = b.companyId || b.company_id || null;
  if (b.code !== undefined) campos.code = b.code ? String(b.code).slice(0, 50) : null;
  if (b.name !== undefined) campos.name = String(b.name).slice(0, 160);
  if (b.kind !== undefined) campos.kind = b.kind ? String(b.kind).slice(0, 60) : null;
  if (b.location !== undefined) campos.location = b.location ? String(b.location).slice(0, 160) : null;
  if (b.photoUrl !== undefined || b.photo_url !== undefined) campos.photo_url = b.photoUrl || b.photo_url || null;
  if (b.notes !== undefined) campos.notes = b.notes || null;
  if (b.status !== undefined) campos.status = String(b.status).slice(0, 40);
  return campos;
}

function cajaDeBody(b, idForzado) {
  return {
    id: String(idForzado || b.id || nuevoId('box')).slice(0, 64),
    company_id: b.companyId || b.company_id || null,
    code: b.code ? String(b.code).slice(0, 50) : null,
    name: String(b.name || 'Caja sin nombre').slice(0, 160),
    kind: b.kind ? String(b.kind).slice(0, 60) : null,
    location: b.location ? String(b.location).slice(0, 160) : null,
    photo_url: b.photoUrl || b.photo_url || null,
    notes: b.notes || null,
    status: String(b.status || 'En bodega').slice(0, 40),
  };
}

function itemDeBody(b, idForzado) {
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    id: String(idForzado || b.id || nuevoId('inv')).slice(0, 64),
    company_id: b.companyId || b.company_id || null,
    box_id: b.boxId || b.box_id || null,
    code: String(b.code || `ATHA-EQ-${Math.random().toString(36).slice(2, 6).toUpperCase()}`).slice(0, 100),
    name: String(b.name || 'Ítem sin nombre').slice(0, 255),
    category: String(b.category || 'Audio / Backline').slice(0, 50),
    brand: b.brand ? String(b.brand).slice(0, 120) : null,
    model: b.model ? String(b.model).slice(0, 120) : null,
    serial: b.serial ? String(b.serial).slice(0, 120) : null,
    quantity: num(b.quantity) || 1,
    condition: b.condition ? String(b.condition).slice(0, 30) : 'Excelente',
    status: b.status ? String(b.status).slice(0, 30) : 'Disponible',
    assigned_to_work: b.assignedToWork || b.assigned_to_work || null,
    location: b.location ? String(b.location).slice(0, 255) : null,
    value_clp: num(b.valueCLP !== undefined ? b.valueCLP : b.value_clp) || 0,
    photo_url: b.photoUrl || b.photo_url || null,
    notes: b.notes || null,
    tags_json: JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
  };
}

/** Sube una imagen (data URL) al bucket y devuelve su URL pública. */
async function subirFotoInventario(id, dataUrl, carpeta) {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!m) throw new Error('formato no soportado: se espera una imagen data:image/...;base64,...');
  const mime = m[1].toLowerCase();
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) throw new Error('imagen demasiado grande (máximo 6 MB)');
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const limpio = String(id || 'sin-id').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'sin-id';
  const nombre = `${carpeta}/${limpio}-${Date.now().toString(36)}.${ext}`;

  const tr = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!tr.ok) throw new Error('sin credenciales para subir a GCS');
  const { access_token } = await tr.json();

  const up = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_INVENTARIO}/o?uploadType=media&name=${encodeURIComponent(nombre)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': mime }, body: buf }
  );
  if (!up.ok) throw new Error(`GCS ${up.status}: ${(await up.text()).slice(0, 120)}`);
  return `https://storage.googleapis.com/${BUCKET_INVENTARIO}/${nombre}`;
}

/**
 * ALCANCE DEL INVENTARIO POR USUARIO
 *
 * Regla de negocio: el inventario de una compañía lo ve quien PERTENECE a esa
 * compañía con un rol de producción o técnico. Un artista, el elenco, o alguien
 * de otra compañía NO lo ve. Administración (admin/director) ve todo.
 *
 * De dónde sale la pertenencia:
 *   - `company_members` (user_id → compañía, rol: owner/coordinator/director/artist/viewer)
 *   - `company_people`  (nómina vinculada por correo; kind = 'equipo' o cargo
 *     de producción/técnico: "Producción & Elenco", "Técnico", "Operación Lumínica"…)
 */
const CARGO_GESTION = /productor|producci|t[eé]cnic|t[eé]cnica|luminic|sonor|sonido|operaci[oó]n|escenari|regid|maquinis|utiler|vestuar|bodega|log[ií]stic/i;
const ROLES_GESTION = ['owner', 'coordinator', 'director'];

function esAdministracion(rolUsuario) {
  return ['admin', 'director'].includes(String(rolUsuario || '').toLowerCase());
}

async function alcanceInventario(email) {
  const correo = String(email || '').trim().toLowerCase();
  const base = { identificado: false, total: false, companies: [], puedeEscribir: false, motivo: '' };
  if (!correo) return { ...base, motivo: 'sin sesión' };

  const db = getPool();
  const [filas] = await db.execute(
    'SELECT id, email, display_name, role, role_title FROM users WHERE LOWER(email) = ? LIMIT 1',
    [correo]
  );
  if (!filas.length) return { ...base, motivo: 'usuario no registrado' };

  const u = filas[0];
  if (esAdministracion(u.role)) {
    return {
      identificado: true, total: true, companies: [], puedeEscribir: true,
      motivo: 'administración: ve todas las compañías', usuario: u,
    };
  }

  const companies = new Set();

  // 1) pertenencia declarada como miembro de la compañía
  const [mem] = await db.execute(
    'SELECT company_id, role_in_company FROM company_members WHERE user_id = ?', [u.id]
  );
  for (const m of mem) {
    if (ROLES_GESTION.includes(String(m.role_in_company || '').toLowerCase())) {
      companies.add(m.company_id);
    }
  }

  // 2) pertenencia por nómina: equipo técnico o cargo de producción
  const [nom] = await db.execute(
    'SELECT company_id, kind, role_title FROM company_people WHERE LOWER(email) = ?', [correo]
  );
  for (const n of nom) {
    const cargo = String(n.role_title || '');
    const esEquipoTecnico = String(n.kind || '').toLowerCase() === 'equipo';
    if (esEquipoTecnico || CARGO_GESTION.test(cargo)) companies.add(n.company_id);
  }

  const lista = [...companies];
  return {
    identificado: true,
    total: false,
    companies: lista,
    puedeEscribir: lista.length > 0,
    motivo: lista.length
      ? 'pertenencia: ve sólo las compañías en las que participa en producción o técnica'
      : 'no pertenece a ninguna compañía en un rol de producción o técnico',
    usuario: u,
  };
}

// Todo el inventario que el usuario puede ver (una compañía o todas) en una llamada.
app.get('/api/v1/crm/inventario', async (req, res) => {
  try {
    const db = getPool();
    const email = req.query.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);

    // compañías habilitadas para este usuario (null = todas)
    const permitidas = alcance.total ? null : alcance.companies;
    const pedida = String(req.query.company_id || req.query.companyId || '').trim() || null;

    // pide una compañía que no le corresponde
    if (pedida && permitidas && !permitidas.includes(pedida)) {
      return res.status(403).json({
        success: false, alcance,
        error: 'No tenés acceso al inventario de esa compañía.',
        companies: [], boxes: [], items: [],
      });
    }

    const [todasLasCompanias] = await db.execute('SELECT id, name, kind, city FROM companies ORDER BY name');
    const companies = permitidas
      ? todasLasCompanias.filter((c) => permitidas.includes(c.id))
      : todasLasCompanias;

    // si no pidió compañía, se abre la primera que puede ver
    const elegida = pedida || (permitidas ? (companies[0]?.id || null) : null);

    let boxes = [];
    let items = [];
    if (permitidas === null ? true : Boolean(elegida)) {
      const filtroC = elegida ? 'WHERE b.company_id = ?' : '';
      const filtroI = elegida ? 'WHERE i.company_id = ?' : '';
      const par = elegida ? [elegida] : [];
      [boxes] = await db.execute(
        `SELECT b.*,
                (SELECT COUNT(*) FROM inventory_items i WHERE i.box_id = b.id) AS items,
                (SELECT COALESCE(SUM(i.value_clp * COALESCE(i.quantity, 1)), 0)
                   FROM inventory_items i WHERE i.box_id = b.id) AS valor
           FROM inventory_boxes b ${filtroC}
          ORDER BY b.code IS NULL, b.code, b.name`,
        par
      );
      [items] = await db.execute(
        `SELECT i.*, b.name AS box_name
           FROM inventory_items i
           LEFT JOIN inventory_boxes b ON b.id = i.box_id
           ${filtroI}
          ORDER BY i.name`,
        par
      );
    }

    return res.json({
      success: true,
      alcance: {
        total: alcance.total,
        identificado: alcance.identificado,
        puede_escribir: alcance.puedeEscribir,
        motivo: alcance.motivo,
        companies: alcance.companies,
      },
      company_id: elegida,
      total_cajas: boxes.length,
      total_items: items.length,
      valor_total: items.reduce((s, i) => s + Number(i.value_clp || 0) * Number(i.quantity || 1), 0),
      companies,
      boxes,
      items: items.map((i) => ({
        ...i,
        tags: typeof i.tags_json === 'string' ? JSON.parse(i.tags_json || '[]') : (i.tags_json || []),
      })),
    });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message, companies: [], boxes: [], items: [] });
  }
});

// Alta / edición de cajas
/**
 * ¿Este usuario puede ESCRIBIR en el inventario de esa compañía?
 * Sólo se exige cuando el pedido trae la identidad (email); si no viene, se deja
 * pasar para no romper flujos internos previos.
 */
async function permisoEscritura(email, companyId) {
  if (!email) return { ok: true, sin_identidad: true };
  const alcance = await alcanceInventario(email);
  if (!alcance.identificado) return { ok: false, motivo: 'usuario no registrado', alcance };
  if (alcance.total) return { ok: true, alcance };
  if (!companyId) return { ok: false, motivo: 'no se indicó la compañía', alcance };
  return alcance.companies.includes(companyId)
    ? { ok: true, alcance }
    : { ok: false, motivo: 'tu rol no tiene acceso al inventario de esta compañía', alcance };
}

/** Compañía de una caja (para validar permisos en ediciones/borrados). */
async function companiaDeCaja(id) {
  const [r] = await getPool().execute('SELECT company_id FROM inventory_boxes WHERE id = ? LIMIT 1', [id]);
  return r.length ? r[0].company_id : null;
}

/** Compañía de un ítem. */
async function companiaDeItem(id) {
  const [r] = await getPool().execute('SELECT company_id FROM inventory_items WHERE id = ? LIMIT 1', [id]);
  return r.length ? r[0].company_id : null;
}

async function guardarCaja(req, res, id) {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'] || '';

    // ¿puede escribir en esa compañía?
    let companyId = b.companyId || b.company_id || null;
    if (!companyId && id) companyId = await companiaDeCaja(id);
    const perm = await permisoEscritura(email, companyId);
    if (!perm.ok) {
      return res.status(403).json({ success: false, ok: false, error: `Sin permiso: ${perm.motivo}` });
    }

    // Edición: se actualizan SÓLO los campos enviados (una edición parcial no
    // debe borrar lo que ya estaba cargado).
    if (id) {
      const r = await actualizarParcial('inventory_boxes', id, camposCajaDeBody(b));
      return res.json({ success: true, ok: true, id, actualizado: r.actualizado });
    }
    const db = getPool();
    const c = cajaDeBody(b, null);
    await db.execute(
      `INSERT INTO inventory_boxes (id, company_id, code, name, kind, location, photo_url, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.company_id, c.code, c.name, c.kind, c.location, c.photo_url, c.notes, c.status]
    );
    return res.json({ success: true, ok: true, caja: c });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
}
app.post('/api/v1/crm/inventario/cajas', (req, res) => guardarCaja(req, res));
app.patch('/api/v1/crm/inventario/cajas/:id', (req, res) => guardarCaja(req, res, req.params.id));

app.delete('/api/v1/crm/inventario/cajas/:id', async (req, res) => {
  try {
    const db = getPool();
    const id = req.params.id;
    const email = (req.body && req.body.email) || req.query.email || req.headers['x-atha-email'] || '';
    const perm = await permisoEscritura(email, await companiaDeCaja(id));
    if (!perm.ok) {
      return res.status(403).json({ success: false, ok: false, error: `Sin permiso: ${perm.motivo}` });
    }
    // los ítems de la caja no se borran: quedan sin caja (no se pierde información)
    await db.execute('UPDATE inventory_items SET box_id = NULL WHERE box_id = ?', [id]);
    await db.execute('DELETE FROM inventory_boxes WHERE id = ?', [id]);
    return res.json({ success: true, ok: true, id });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
});

// Alta / edición de ítems
async function guardarItem(req, res, id) {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'] || '';

    // ¿puede escribir en esa compañía? (en edición se resuelve por la fila)
    let companyId = b.companyId || b.company_id || null;
    if (!companyId && id) companyId = await companiaDeItem(id);
    const perm = await permisoEscritura(email, companyId);
    if (!perm.ok) {
      return res.status(403).json({ success: false, ok: false, error: `Sin permiso: ${perm.motivo}` });
    }

    // Edición: sólo los campos enviados (una edición parcial no borra el resto).
    if (id) {
      const r = await actualizarParcial('inventory_items', id, camposItemDeBody(b));
      return res.json({ success: true, ok: true, id, actualizado: r.actualizado });
    }
    const db = getPool();
    const i = itemDeBody(b, null);
    await db.execute(
      `INSERT INTO inventory_items
         (id, company_id, box_id, code, name, category, brand, model, serial, quantity, \`condition\`,
          status, assigned_to_work, location, value_clp, photo_url, notes, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.id, i.company_id, i.box_id, i.code, i.name, i.category, i.brand, i.model, i.serial,
       i.quantity, i.condition, i.status, i.assigned_to_work, i.location, i.value_clp,
       i.photo_url, i.notes, i.tags_json]
    );
    return res.json({ success: true, ok: true, item: i });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
}
app.post('/api/v1/crm/inventario/items', (req, res) => guardarItem(req, res));
app.patch('/api/v1/crm/inventario/items/:id', (req, res) => guardarItem(req, res, req.params.id));

app.delete('/api/v1/crm/inventario/items/:id', async (req, res) => {
  try {
    const db = getPool();
    const email = (req.body && req.body.email) || req.query.email || req.headers['x-atha-email'] || '';
    const perm = await permisoEscritura(email, await companiaDeItem(req.params.id));
    if (!perm.ok) {
      return res.status(403).json({ success: false, ok: false, error: `Sin permiso: ${perm.motivo}` });
    }
    await db.execute('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    return res.json({ success: true, ok: true, id: req.params.id });
  } catch (e) {
    return res.status(503).json({ success: false, ok: false, error: e.message });
  }
});

// Foto de un ítem o de una caja: { image: 'data:image/jpeg;base64,...', id, tipo, companyId }
app.post('/api/v1/crm/inventario/foto', async (req, res) => {
  try {
    const b = req.body || {};
    const esCaja = String(b.tipo || 'items').toLowerCase() === 'caja';
    const email = b.email || req.headers['x-atha-email'] || '';

    // Permiso: la compañía puede venir en el body (alta nueva, la fila aún no
    // existe) o resolverse desde la fila que se está editando.
    const companyId =
      b.companyId || b.company_id ||
      (esCaja ? await companiaDeCaja(b.id) : await companiaDeItem(b.id));
    const perm = await permisoEscritura(email, companyId);
    if (!perm.ok) {
      return res.status(403).json({ success: false, ok: false, error: `Sin permiso: ${perm.motivo}` });
    }

    const carpeta = esCaja ? 'inventario-cajas' : 'inventario-items';
    const url = await subirFotoInventario(b.id, b.image, carpeta);
    return res.json({ success: true, ok: true, url });
  } catch (e) {
    return res.status(400).json({ success: false, ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// SESIÓN + PERMISOS · /api/v1/crm/sesion?email=...
//
// El CRM es el PROVEEDOR DE IDENTIDAD del ecosistema: acá se valida quién es el
// usuario y QUÉ PUEDE HACER. Los artefactos consultan este endpoint en vez de
// decidir permisos por su cuenta (así la política vive en UN solo lugar y no hay
// que tocar 5 apps cuando cambia).
// ---------------------------------------------------------------------------
const PERMISOS_POR_ROL = {
  admin:     { nivel: 'total',    leer: true, escribir: true,  administrar: true,  solo_lo_propio: false },
  director:  { nivel: 'total',    leer: true, escribir: true,  administrar: false, solo_lo_propio: false },
  productor: { nivel: 'gestion',  leer: true, escribir: true,  administrar: false, solo_lo_propio: false },
  gestor:    { nivel: 'lectura',  leer: true, escribir: false, administrar: false, solo_lo_propio: false },
  artista:   { nivel: 'personal', leer: true, escribir: true,  administrar: false, solo_lo_propio: true },
  cliente:   { nivel: 'publico',  leer: true, escribir: false, administrar: false, solo_lo_propio: true },
};

app.get('/api/v1/crm/sesion', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, authorized: false, error: 'falta email' });
    }
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT id, email, display_name, role, role_title, picture, provider
         FROM users WHERE LOWER(email) = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      // No está registrado: se lo trata como visitante (sólo lectura pública).
      return res.json({
        success: true, authorized: false, registered: false,
        user: null, permissions: PERMISOS_POR_ROL.cliente,
      });
    }
    const u = rows[0];
    const rol = String(u.role || 'artista').toLowerCase();
    return res.json({
      success: true,
      authorized: true,
      registered: true,
      user: {
        id: u.id, email: u.email, name: u.display_name || u.email,
        role: rol, roleTitle: u.role_title || '', avatar: u.picture || '',
        provider: u.provider || 'google',
      },
      permissions: PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.artista,
    });
  } catch (e) {
    return res.status(503).json({ success: false, authorized: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// ECOSISTEMA · /api/v1/crm/ecosistema/artefactos
//
// Catálogo de artefactos del ecosistema (lo consume la app móvil como lanzador).
// Los enlaces apuntan al PUENTE del CRM, así se abre cada artefacto con la
// sesión ya puesta, sin pedir login de nuevo.
// ---------------------------------------------------------------------------
app.get('/api/v1/crm/ecosistema/artefactos', async (req, res) => {
  const puente = (destino) => `https://atha-crm-web-frontend-897089213264.us-central1.run.app/puente?destino=${destino}`;
  const artefactos = [
    { id: 'crm', key: 'crm', name: 'CRM Central', description: 'Clientes, obras, equipo, inventario y finanzas',
      icon: 'layout-dashboard', entry_point: 'https://atha-crm-web-frontend-897089213264.us-central1.run.app',
      required_role: 'explorador', is_active: true },
    { id: 'app-movil', key: 'app-movil', name: 'App FASE (móvil)', description: 'Radar cultural, rutas y comunidad en el celular',
      icon: 'smartphone', entry_point: puente('app-movil'), required_role: 'explorador', is_active: true },
    { id: 'planner', key: 'planner', name: 'Planner de Giras', description: 'Disponibilidad de elencos y planificación de temporada',
      icon: 'calendar', entry_point: puente('planner'), required_role: 'explorador', is_active: true },
    { id: 'arquitecto', key: 'arquitecto', name: 'Arquitecto de Proyectos', description: 'Estructura, etapas y presupuesto de proyectos',
      icon: 'layers', entry_point: puente('arquitecto'), required_role: 'explorador', is_active: true },
    { id: 'buscador', key: 'buscador', name: 'Buscador de Fondos', description: 'Convocatorias y financiamiento cultural',
      icon: 'search', entry_point: puente('buscador'), required_role: 'explorador', is_active: true },
    { id: 'ticketer', key: 'ticketer', name: 'Ticketer', description: 'Entradas, funciones y control de acceso',
      icon: 'ticket', entry_point: puente('ticketer'), required_role: 'explorador', is_active: true },
  ];
  const rol = String(req.query.role || 'explorador').toLowerCase();
  // el rol filtra qué artefactos se muestran (admin y dirección ven todo)
  const esAdmin = (await alcanceInventario(req.query.email || req.headers['x-atha-email'] || '')).total;
  return res.json({ ok: true, total: artefactos.length, rol, artefactos: esAdmin ? artefactos : artefactos.filter((a) => a.required_role === 'explorador') });
});

// ---------------------------------------------------------------------------
// RADAR · perfil del explorador editable (bio, ciudad, visibilidad)
// ---------------------------------------------------------------------------
app.patch('/api/v1/crm/radar/perfil', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'];
    if (!email) return res.status(400).json({ ok: false, error: 'falta email' });
    const db = getPool();
    const userId = await exploradorId(email, b.name);
    const perfil = await perfilRadar(userId);
    const bio = b.bio !== undefined ? String(b.bio).slice(0, 1000) : perfil.bio;
    const city = b.city !== undefined ? String(b.city).slice(0, 120) : perfil.city;
    const isPublic = b.is_public !== undefined ? (b.is_public ? 1 : 0) : perfil.is_public;
    await db.execute('UPDATE radar_profiles SET bio = ?, city = ?, is_public = ? WHERE user_id = ?',
      [bio, city, isPublic, userId]);
    // también actualiza el nombre visible si viene
    if (b.name) {
      await db.execute('UPDATE users SET display_name = ? WHERE id = ?', [String(b.name).slice(0, 120), userId]);
    }
    return res.json({ ok: true, perfil: await perfilRadar(userId) });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// PUENTE DE SESIÓN · /puente?destino=arquitecto|planner|buscador|ticketer
//
// Para entrar a un artefacto SIN volver a loguearse: esta página se sirve desde
// el mismo origen que el CRM, así que puede leer la sesión guardada y reenviarla
// al artefacto por URL (que ya sabe adoptarla). Si todavía no hay sesión, avisa
// y reintenta sola: cuando el usuario entra al CRM, redirige sin más trámite.
//
// Reemplaza al login propio de cada app (que además fallaba porque el origen del
// artefacto no está autorizado en Google Cloud Console).
// ---------------------------------------------------------------------------
const DESTINOS_PUENTE = {
  arquitecto: 'https://artha-arquitecto-897089213264.us-central1.run.app',
  planner: 'https://planner-frontend-897089213264.us-central1.run.app',
  buscador: 'https://buscardor-de-fondos-897089213264.us-central1.run.app',
  ticketer: 'https://ticketerapp-897089213264.us-central1.run.app',
  // capa 3 del ecosistema: la app móvil entra con la misma sesión
  'app-movil': 'https://fase-mobile-897089213264.us-central1.run.app',
  app: 'https://fase-mobile-897089213264.us-central1.run.app',
};

// ---------------------------------------------------------------------------
// ¿QUÉ DESTINOS YA HABLAN LA LLAVE?
//
// El puente pasa a mandar `?t=<ticket>` en vez de `?auth=1&email=…&role=…`.
// Un artefacto que todavía no sabe canjear el ticket NO puede recibir la URL
// nueva: se quedaría sin sesión. Por eso la migración es por lista:
// `DESTINOS_LLAVE=arquitecto,buscador` activa la llave sólo para ésos; el resto
// sigue entrando por query mientras se los parchea, uno por uno.
//
// Vacío = nadie (comportamiento viejo intacto).
// ---------------------------------------------------------------------------
const DESTINOS_LLAVE = new Set(
  String(process.env.DESTINOS_LLAVE || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
);

app.get('/puente', (req, res) => {
  const clave = String(req.query.destino || '').toLowerCase();
  const destino = DESTINOS_PUENTE[clave] || '/';
  const nombre = clave || 'el CRM';
  const usarLlave = DESTINOS_LLAVE.has(clave);
  res.type('html').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ATHA · Abriendo ${nombre}…</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0f1115;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif}
  .caja{max-width:420px;padding:28px;border:1px solid #2a2f3a;border-radius:16px;text-align:center}
  h1{font-size:16px;margin:0 0 8px}p{font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 16px}
  a.boton{display:inline-block;background:#6ee7b7;color:#0f1115;text-decoration:none;
          font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px}
  .punto{display:inline-block;width:8px;height:8px;border-radius:50%;background:#6ee7b7;margin-right:6px}
</style></head><body>
<div class="caja" id="caja">
  <h1><span class="punto"></span>Abriendo ${nombre}…</h1>
  <p>Usando tu sesión del CRM ATHA.</p>
</div>
<script>
  var URL_DESTINO = ${JSON.stringify(destino)};
  var NOMBRE = ${nombre ? JSON.stringify(nombre) : '""'};
  var DESTINO = ${JSON.stringify(clave)};
  var USAR_LLAVE = ${usarLlave ? 'true' : 'false'};

  function aviso(html) {
    var c = document.getElementById('caja');
    if (c) c.innerHTML = html;
  }
  function sinSesion() {
    aviso('<h1>Necesitás iniciar sesión</h1>' +
      '<p>Entrá al CRM ATHA con tu cuenta y esta página te lleva a ' + NOMBRE + ' automáticamente. ' +
      'Si ya iniciaste sesión en otra pestaña, esperá unos segundos.</p>' +
      '<a class="boton" href="/">Iniciar sesión en el CRM</a>');
    var n = 0;
    var t = setInterval(function () { if (intentar() || ++n > 150) clearInterval(t); }, 2000);
  }
  function abrirConTicket(ticket) {
    location.replace(URL_DESTINO + (URL_DESTINO.indexOf('?') >= 0 ? '&' : '?') +
      't=' + encodeURIComponent(ticket));
  }

  /* LLAVE: el token del hub vive en este mismo origen (lo dejó el login), así que
     acá se pide un ticket de un solo uso y se viaja con eso. Nada de correo, rol
     ni nombre en la URL. */
  function tokenHub() {
    try { return localStorage.getItem('atha_auth_token') || ''; } catch (e) { return ''; }
  }
  function irConLlave() {
    var t = tokenHub();
    if (!t) return false;
    fetch('/api/auth/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
      body: JSON.stringify({ destino: DESTINO })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok && d.ticket) { abrirConTicket(d.ticket); return; }
      aviso('<h1>No se pudo abrir</h1><p>' + ((d && d.error) || 'El hub rechazó la llave.') +
        '</p><a class="boton" href="/">Volver al CRM</a>');
    }).catch(function (e) {
      aviso('<h1>No se pudo abrir</h1><p>' + e.message +
        '</p><a class="boton" href="/">Volver al CRM</a>');
    });
    return true;
  }

  /* COMPATIBILIDAD: artefactos que todavía no canjean ticket. Lee la sesión del
     CRM sea cual sea la clave usada y la reenvía por query (como antes). */
  function sesionLegacy() {
    var claves = ['atha_user_session', 'user_session', 'user_profile'];
    for (var i = 0; i < claves.length; i++) {
      try {
        var u = JSON.parse(localStorage.getItem(claves[i]) || 'null');
        if (!u) continue;
        if (u.user && typeof u.user === 'object') u = Object.assign({}, u, u.user);
        if (u.email) return u;
      } catch (e) {}
    }
    return null;
  }
  function irLegacy() {
    var u = sesionLegacy();
    if (!u || !u.email) return false;
    var q = new URLSearchParams();
    q.set('auth', '1');
    q.set('email', u.email || '');
    q.set('name', u.name || u.displayName || u.email || '');
    q.set('role', (function (r) {
      r = String(r || '').toLowerCase();
      return (r === 'admin' || r === 'director' || r === 'productor') ? 'director' : 'artist';
    })(u.role));
    q.set('roleTitle', u.roleTitle || u.role_title || u.role || '');
    q.set('picture', u.avatar || u.picture || u.google_picture || '');
    location.replace(URL_DESTINO + (URL_DESTINO.indexOf('?') >= 0 ? '&' : '?') + q.toString());
    return true;
  }

  function intentar() {
    return USAR_LLAVE ? irConLlave() : irLegacy();
  }
  if (!intentar()) sinSesion();
</script></body></html>`);
});

app.get('*', (req, res) => {
  // El index nunca se cachea: si no, el navegador sigue mostrando el bundle
  // viejo y parece que "las actualizaciones no llegan".
  res.sendFile(path.join(distDir, 'index.html'), {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`crm-atha sirviendo en puerto ${PORT}`);
  console.log(`BD: ${DB_CONF.user}@${DB_CONF.host}:${DB_CONF.port}/${DB_CONF.database}`);
  console.log(`Auth: POST /php/api.php?action=auth_google  |  POST /api/auth/google`);
  console.log(`Diagnostico BD: GET /api/db/ping`);
});
