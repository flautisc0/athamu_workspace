import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import mysql from 'mysql2/promise';
import { randomUUID, randomBytes } from 'crypto';
import tls from 'tls';
import net from 'net';

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
  // Reflejar los encabezados que pide el cliente en vez de una lista fija.
  // Los artefactos mandan la identidad en `x-atha-email`, y al no estar en la
  // lista el navegador bloqueaba TODAS las llamadas en el preflight
  // ("Request header field x-atha-email is not allowed by Access-Control-
  // Allow-Headers") y la app caía a sus datos mock sin ningún error visible.
  const headersPedidos = req.headers['access-control-request-headers'];
  res.header(
    'Access-Control-Allow-Headers',
    headersPedidos ||
      'Content-Type, Authorization, Accept, X-Requested-With, X-atha-email'
  );
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
    // Nombre visible con el que se firma la sesión: si la persona ya tiene uno propio,
    // es ESE (no el de Google), para que la app no vuelva a cachear el nombre viejo.
    let nombreVisible = name;

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
        // El NOMBRE tampoco: si la persona ya eligió uno (en la app o el CRM), el
        // nombre de Google no lo pisa. Antes esta línea escribía el nombre de Google en
        // cada login y deshacía el cambio hecho en el perfil ("no persiste el nombre").
        const [previoFilas] = await db.execute(
          'SELECT display_name, picture FROM users WHERE id = ? LIMIT 1', [userId]
        );
        const previo = (previoFilas && previoFilas[0]) || {};
        const nombreFinal = (!nombreProvisional(previo.display_name, email) && previo.display_name !== name)
          ? previo.display_name : name;
        const fotoFinal = String(previo.picture || '').trim() ? previo.picture : picture;
        nombreVisible = nombreFinal;
        await db.execute(
          `UPDATE users SET display_name = ?, picture = ?, provider = 'google',
             google_id = COALESCE(google_id, ?), google_email = COALESCE(google_email, ?),
             google_name = COALESCE(google_name, ?), google_picture = COALESCE(google_picture, ?),
             updated_at = NOW()
           WHERE id = ?`,
          [nombreFinal, fotoFinal, googleSub, email, name, picture, userId]
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
      email, name: nombreVisible, display_name: nombreVisible, role: rol, role_title: roleTitle, picture,
    });

    return res.json({
      success: true,
      data: {
        id: userId || googleSub,
        name: nombreVisible,
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
// 12mb: la app reduce las fotos a ~300 KB, pero si algún teléfono entrega un
// formato que el navegador no puede reducir (HEIC/HEIF), antes se cortaba con un
// 413 en HTML. Mejor margen + error claro (ver manejador de errores al final).
// El límite es 40 MB porque los archivos viajan en base64 (+33%): con el tope de 25 MB por
// archivo, un body de 12 MB rechazaba cualquier dossier un poco pesado con un 413 genérico.
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

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
// así que no se podía pintar una pantalla de perfil. Aquí va todo junto (usuario,
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
        ? 'Esa cuenta ya existe. Entra con Google y un administrador ajusta tu rol.'
        : 'Solicitud registrada. Entra con Google; un administrador te habilita el rol.',
    });
  } catch (e) {
    console.error('[register] error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// SOLICITUDES DE ACCESO · /api/v1/crm/solicitudes
//
// El registro público ya no da sesión: deja una fila en `access_requests`. Estos
// dos endpoints son los que hacen que esa solicitud sirva de algo — sin ellos la
// petición quedaba anotada en la base y nadie la veía nunca.
//   GET   → pendientes primero
//   PATCH → { estado: 'aprobada' | 'rechazada' }  (lo decide administración)
// El ROL no se aprueba aquí: se asigna en la ficha del usuario (pestaña Usuarios),
// que es donde se ve a quién le corresponde qué compañía y cargo.
// ---------------------------------------------------------------------------
app.get('/api/v1/crm/solicitudes', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const db = getPool();
    await asegurarTablaSolicitudes(db);
    const [filas] = await db.execute(
      `SELECT s.id, s.email, s.display_name, s.rol_pedido, s.estado, s.created_at,
              u.role AS rol_actual, u.id AS user_id
         FROM access_requests s
         LEFT JOIN users u ON LOWER(u.email) = LOWER(s.email)
        ORDER BY (s.estado = 'pendiente') DESC, s.created_at DESC
        LIMIT 200`
    );
    return res.json({ ok: true, total: filas.length, solicitudes: filas });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.patch('/api/v1/crm/solicitudes/:id', async (req, res) => {
  try {
    if (!(await permisoAdmin(req, res))) return;
    const estado = String((req.body && req.body.estado) || '').toLowerCase();
    if (!['aprobada', 'rechazada', 'pendiente'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'estado inválido (aprobada|rechazada|pendiente)' });
    }
    const db = getPool();
    await asegurarTablaSolicitudes(db);
    const r = await db.execute('UPDATE access_requests SET estado = ? WHERE id = ?', [estado, req.params.id]);
    if (!r[0].affectedRows) return res.status(404).json({ ok: false, error: 'solicitud no encontrada' });
    return res.json({ ok: true, id: req.params.id, estado });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
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
// aceptable aquí y no en el resto de la API.
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

/**
 * ALTA MANUAL DE USUARIO · POST /api/v1/crm/usuarios
 *
 * Por qué existe: antes el único alta posible era la implícita del login, así que
 * no se podía DAR DE ALTA a alguien desde Administración (había que esperar a que
 * entrara para poder asignarle rol y compañía). Ahora se crea la ficha con su rol,
 * cargo, disciplina y compañía, y cuando esa persona entra con Google (mismo
 * correo) ADOPTA esa ficha en vez de entrar como `explorador`.
 */
app.post('/api/v1/crm/usuarios', async (req, res) => {
  try {
    const alcance = await permisoAdmin(req, res);
    if (!alcance) return;
    const b = req.body || {};
    const email = String(b.email || '').toLowerCase().trim();
    const nombre = String(b.display_name || b.name || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'email inválido' });
    }
    if (!nombre) return res.status(400).json({ ok: false, error: 'falta el nombre' });

    const rol = String(b.role || ROL_ENTRADA).toLowerCase().trim();
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ ok: false, error: `rol inválido: usa ${ROLES_VALIDOS.join(', ')}` });
    }
    // Mismas guardias que en la edición: sólo el owner nombra owners.
    const rolSolicitante = String((alcance.usuario && alcance.usuario.role) || '').toLowerCase();
    if (rol === 'admin' && rolSolicitante !== 'admin') {
      return res.status(403).json({ ok: false, error: 'sólo el owner puede nombrar otro owner' });
    }
    const disciplina = b.artist_kind ? String(b.artist_kind) : null;
    if (disciplina && !DISCIPLINAS.map((d) => d.id).includes(disciplina)) {
      return res.status(400).json({
        ok: false, error: `disciplina inválida: ${DISCIPLINAS.map((d) => d.id).join(', ')}`,
      });
    }

    const db = getPool();
    const [ya] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (ya.length) {
      return res.status(409).json({
        ok: false, error: 'ese correo ya está en el CRM: editalo desde la lista', id: ya[0].id,
      });
    }

    const id = randomUUID();
    await db.execute(
      `INSERT INTO users (id, email, display_name, role, role_title, artist_kind, provider, public_profile, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', 0, NOW(), NOW())`,
      [id, email, nombre, rol, String(b.role_title || '').trim() || null, disciplina]
    );

    // Pertenencia opcional a una compañía: si la mandan, queda de una vez.
    let compania = null;
    const cid = String(b.company_id || '').trim();
    if (cid) {
      const rolCia = String(b.role_in_company || 'coordinator');
      if (!ROLES_COMPANIA.includes(rolCia)) {
        return res.status(400).json({ ok: false, error: `rol de compañía inválido: ${ROLES_COMPANIA.join(', ')}` });
      }
      await db.execute(
        'INSERT INTO company_members (id, company_id, user_id, role_in_company) VALUES (?, ?, ?, ?)',
        [idCorto('cm_'), cid, id, rolCia]
      );
      compania = { company_id: cid, role_in_company: rolCia };
    }

    return res.json({
      ok: true, id, email, display_name: nombre, role: rol,
      role_title: b.role_title || null, artist_kind: disciplina, compania,
      mensaje: 'Usuario creado. Cuando entre con Google (mismo correo) adopta esta ficha.',
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
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
        return res.status(400).json({ ok: false, error: `rol inválido: usa ${ROLES_VALIDOS.join(', ')}` });
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
      `SELECT id, name, legal_name, slug, status, kind, discipline, description, contact_email, city, logo_url
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
      logoUrl: c.logo_url || '',
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

/** Traer UNA compañía por ID (con gente y obras). */
app.get('/api/v1/crm/companies/:id', async (req, res) => {
  try {
    const db = getPool();
    const [comp] = await db.execute(
      `SELECT id, name, legal_name, slug, status, kind, discipline, description,
              contact_email, city, logo_url
       FROM companies WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!comp.length) return res.status(404).json({ success: false, error: 'Compañía no encontrada' });
    const c = comp[0];
    const [obras] = await db.execute(
      `SELECT id, title, discipline, status, image_url, company_id
       FROM projects WHERE company_id = ? ORDER BY title`,
      [c.id]
    );
    const [people] = await db.execute(
      `SELECT id, company_id, full_name, role_title, character_name, kind, email, phone
       FROM company_people WHERE company_id = ? ORDER BY kind, full_name`,
      [c.id]
    );
    return res.json({
      success: true,
      company: {
        id: c.id, name: c.name, legalName: c.legal_name || '', slug: c.slug || '',
        status: c.status || 'active', kind: c.kind || 'colaboradora',
        discipline: c.discipline || '', description: c.description || '',
        contactEmail: c.contact_email || '', city: c.city || '', logoUrl: c.logo_url || '',
        obras: obras.map(o => ({ id: o.id, title: o.title, discipline: o.discipline || '', status: o.status || '', image: o.image_url || '' })),
        people: people.map(p => ({ id: p.id, fullName: p.full_name, roleTitle: p.role_title || '', characterName: p.character_name || '', kind: p.kind || 'equipo', email: p.email || '', phone: p.phone || '' }))
      }
    });
  } catch (e) {
    console.error('[company:id] error:', e);
    return res.status(503).json({ success: false, error: e.message });
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

/** Editar una persona del elenco / equipo. */
app.put('/api/v1/crm/companies/:id/people/:personId', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    const campos = [];
    const valores = [];
    const mapa = { fullName: 'full_name', roleTitle: 'role_title', characterName: 'character_name',
      kind: 'kind', email: 'email', phone: 'phone' };
    for (const [clave, columna] of Object.entries(mapa)) {
      if (b[clave] !== undefined) {
        let valor = b[clave];
        if (columna === 'kind' && !COMPANY_PEOPLE_KINDS.includes(String(valor))) valor = 'equipo';
        campos.push(`${columna} = ?`);
        valores.push(valor);
      }
    }
    if (!campos.length) return res.status(400).json({ success: false, error: 'nada para actualizar' });
    valores.push(req.params.personId, req.params.id);
    const [r] = await db.execute(
      `UPDATE company_people SET ${campos.join(', ')}, updated_at = NOW() WHERE id = ? AND company_id = ?`, valores);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'persona no encontrada' });
    return res.json({ success: true, id: req.params.personId });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

/**
 * EDITAR LA AGRUPACIÓN · PUT /api/v1/crm/companies/:id
 * Es lo que pidió Francisco: poder editar TODOS los datos de la compañía (descripción incluida)
 * desde el CRM, en vez de que la pestaña Compañías trabaje sobre una lista local que no guardaba.
 */
app.put('/api/v1/crm/companies/:id', async (req, res) => {
  try {
    const db = getPool();
    const b = req.body || {};
    const campos = [];
    const valores = [];
    const mapa = { name: 'name', legalName: 'legal_name', discipline: 'discipline', kind: 'kind',
      description: 'description', contactEmail: 'contact_email', city: 'city', status: 'status',
      notes: 'notes', logoUrl: 'logo_url' };
    for (const [clave, columna] of Object.entries(mapa)) {
      if (b[clave] === undefined) continue;
      let valor = b[clave];
      if (columna === 'kind') valor = valor === 'propia' ? 'propia' : 'colaboradora';
      if (columna === 'status') valor = valor === 'inactive' ? 'inactive' : 'active';
      if (columna === 'name' && !String(valor || '').trim()) {
        return res.status(400).json({ success: false, error: 'El nombre no puede quedar vacío' });
      }
      campos.push(`${columna} = ?`);
      valores.push(typeof valor === 'string' ? valor.slice(0, 2000) : valor);
    }
    if (!campos.length) return res.status(400).json({ success: false, error: 'nada para actualizar' });
    valores.push(req.params.id);
    const [r] = await db.execute(
      `UPDATE companies SET ${campos.join(', ')}, updated_at = NOW() WHERE id = ?`, valores);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'agrupación no encontrada' });
    const [filas] = await db.execute(
      `SELECT id, name, legal_name, slug, status, kind, discipline, description, contact_email, city
         FROM companies WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, company: filas[0] || null });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

/**
 * ELIMINAR UNA AGRUPACIÓN · DELETE /api/v1/crm/companies/:id (administración)
 *
 * El botón «Eliminar compañía» del CRM sólo borraba de la lista en pantalla: no existía este
 * endpoint, así que la agrupación volvía al recargar. Ahora borra de verdad, y **no deja borrar
 * una agrupación que presenta obras** (el catálogo quedaría huérfano): primero se quitan o
 * reasignan sus montajes.
 */
app.delete('/api/v1/crm/companies/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.query.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) return res.status(403).json({ success: false, error: 'sólo administración puede eliminar una agrupación' });

    const db = getPool();
    const [obra] = await db.execute('SELECT COUNT(*) AS n FROM projects WHERE company_id = ?', [req.params.id]);
    if (Number(obra[0].n) > 0) {
      return res.status(409).json({
        success: false,
        error: `Esa agrupación presenta ${obra[0].n} obra(s) del catálogo. Quita o cambia de agrupación sus montajes antes de eliminarla.`,
      });
    }
    await db.execute('DELETE FROM company_people WHERE company_id = ?', [req.params.id]).catch(() => {});
    await db.execute('DELETE FROM company_members WHERE company_id = ?', [req.params.id]).catch(() => {});
    const [r] = await db.execute('DELETE FROM companies WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'agrupación no encontrada' });
    return res.json({ success: true, id: req.params.id, eliminada: true });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

/**
 * MONTAJES: vincular/desvincular una OBRA DEL CATÁLOGO real a la agrupación.
 * El vínculo es `projects.company_id` (no hay campo de texto): así el montaje que se ve en la
 * agrupación es la misma obra del catálogo, con su ficha, su imagen y sus funciones.
 */
app.post('/api/v1/crm/companies/:id/projects', async (req, res) => {
  try {
    const db = getPool();
    const projectId = String((req.body && (req.body.projectId || req.body.project_id)) || '').trim();
    if (!projectId) return res.status(400).json({ success: false, error: 'Falta la obra (projectId)' });
    const [obra] = await db.execute('SELECT id, title, company_id FROM projects WHERE id = ?', [projectId]);
    if (!obra.length) return res.status(404).json({ success: false, error: 'La obra no existe en el catálogo' });
    if (obra[0].company_id && obra[0].company_id !== req.params.id) {
      const [otra] = await db.execute('SELECT name FROM companies WHERE id = ?', [obra[0].company_id]);
      return res.status(409).json({
        success: false,
        error: `La obra «${obra[0].title}» ya está en ${(otra[0] && otra[0].name) || 'otra agrupación'}. Quítala de ahí primero.`,
      });
    }
    await db.execute('UPDATE projects SET company_id = ? WHERE id = ?', [req.params.id, projectId]);
    return res.json({ success: true, projectId, title: obra[0].title });
  } catch (e) {
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.delete('/api/v1/crm/companies/:id/projects/:projectId', async (req, res) => {
  try {
    const db = getPool();
    const [r] = await db.execute(
      'UPDATE projects SET company_id = NULL WHERE id = ? AND company_id = ?',
      [req.params.projectId, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'esa obra no está en la agrupación' });
    return res.json({ success: true, projectId: req.params.projectId });
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
// El Planner y el Arquitecto (F·A·S·E) leen y escriben por aquí, así el CRM es
// la única puerta de entrada y hay una sola fuente de verdad (la base).
//
// Antes el Arquitecto apuntaba a http://localhost:5052/api/v1/crm → en la nube
// no cargaba nada y, peor, no podía guardar: ese backend responde 405 en POST.
// ---------------------------------------------------------------------------
const CRM_V1 = 'https://crm-v1-uc-897089213264.us-central1.run.app';

// URL pública del hub: se usa en los avisos (Telegram/correo) para que el aviso traiga
// el enlace donde se atiende la cosa (reportes, nodos, agenda). Se puede pisar por env.
const URL_HUB_PUBLICA = process.env.URL_PUBLICA || 'https://atha-crm-web-frontend-897089213264.us-central1.run.app';

// Lectura del catálogo: se reenvía al catálogo real (misma forma exacta, sin
// riesgo de divergencia) para que las apps vean las mismas obras que el CRM.
app.get('/api/v1/crm/portfolio/projects', async (req, res) => {
  try {
    const r = await fetch(`${CRM_V1}/api/v1/crm/portfolio/projects`, {
      headers: { Accept: 'application/json' },
    });
    const txt = await r.text();
    // El catálogo se sirve desde crm-v1 (misma base), pero su respuesta no dice a qué agrupación
    // pertenece cada obra. Se enriquece acá con `projects.company_id` para que el panel de
    // agrupaciones pueda mostrar "está en X" y no ofrecerla como libre sin avisar.
    let cuerpo = null;
    try { cuerpo = JSON.parse(txt); } catch (e) { cuerpo = null; }
    if (cuerpo && (cuerpo.projects || cuerpo.data)) {
      const clave = cuerpo.projects ? 'projects' : 'data';
      try {
        const db = getPool();
        const [filas] = await db.execute(
          `SELECT p.id, p.company_id, p.ficha, c.name AS company_name, c.logo_url AS company_logo
             FROM projects p LEFT JOIN companies c ON c.id = p.company_id`);
        const porId = new Map(filas.map((f) => [f.id, f]));
        // Archivos y fotos de todas las obras de una sola consulta (son pocas filas).
        let archivos = [];
        try {
          const [af] = await db.execute(
            `SELECT id, project_id, tipo, nombre, url, mime, bytes, es_portada, subido_por, created_at
               FROM project_files ORDER BY created_at DESC`);
          archivos = af;
        } catch (e) { archivos = []; }
        const aJson = typeof archivoAJson === 'function' ? archivoAJson : ((x) => x);
        cuerpo[clave] = cuerpo[clave].map((o) => {
          const f = porId.get(o.id);
          const mios = archivos.filter((a) => a.project_id === o.id).map(aJson);
          let ficha = (f && f.ficha) || null;
          if (typeof ficha === 'string') { try { ficha = JSON.parse(ficha); } catch (e) { ficha = null; } }
          const dossier = mios.find((a) => a.tipo === 'dossier');
          return {
            ...o,
            company_id: (f && f.company_id) || null,
            company_name: (f && f.company_name) || '',
            logo_url: (f && f.company_logo) || '',
            ficha: ficha || {},
            files: mios,
            dossier_url: (dossier && dossier.url) || '',
          };
        });
      } catch (e) { /* si falla el enriquecido, se devuelve el catálogo tal cual */ }
    }
    res.status(r.status).type('application/json').send(JSON.stringify(cuerpo || { projects: [] }));
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
// ARCHIVOS Y FICHA DE UNA OBRA
//
// Antes los "archivos" de una obra eran texto suelto dentro de `dossier_highlights`
// (URLs pegadas en un array) y la interfaz adivinaba el dossier con una regla que nunca
// coincidía → el botón "Dossier PDF" no mostraba nada aunque el archivo existiera.
// Ahora cada archivo es una fila con su tipo, peso, autor y fecha; y la ficha de la obra
// (datos + bloques por disciplina) se edita con el endpoint de abajo.
// ---------------------------------------------------------------------------
const TIPOS_ARCHIVO_OBRA = ['dossier', 'rider', 'prensa', 'foto', 'video', 'otro'];

/** Traduce una fila de `project_files` a la forma que usa la interfaz. */
function archivoAJson(f) {
  return {
    id: f.id,
    projectId: f.project_id,
    tipo: f.tipo,
    nombre: f.nombre,
    url: f.url,
    mime: f.mime || '',
    bytes: Number(f.bytes) || 0,
    esPortada: !!f.es_portada,
    subidoPor: f.subido_por || '',
    creado: f.created_at,
  };
}

/**
 * Sube CUALQUIER archivo (no sólo imágenes) al bucket del ecosistema. Máximo 25 MB.
 * Mismo mecanismo que las fotos: el token sale del metadata server de Cloud Run.
 */
async function subirArchivoGenerico(nombre, dataUrl, carpeta, maxMB) {
  const m = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/is.exec(String(dataUrl || ''));
  if (!m) throw new Error('se espera el archivo en formato data:<tipo>;base64,...');
  const mime = m[1].toLowerCase();
  const buf = Buffer.from(m[2], 'base64');
  const tope = (maxMB || 25) * 1024 * 1024;
  if (!buf.length) throw new Error('el archivo llegó vacío');
  if (buf.length > tope) throw new Error(`archivo demasiado grande (máximo ${maxMB || 25} MB)`);
  const permitidos = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'application/zip',
  ];
  if (!permitidos.includes(mime)) throw new Error(`tipo de archivo no permitido (${mime})`);
  const ext = (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/g, '').slice(0, 8);
  const limpio = String(nombre || 'archivo').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]{1,8}$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'archivo';
  const destino = `${carpeta || 'obras'}/${limpio}-${Date.now().toString(36)}.${ext}`;

  const tr = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!tr.ok) throw new Error('sin credenciales para subir a GCS');
  const { access_token } = await tr.json();

  const up = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_INVENTARIO}/o?uploadType=media&name=${encodeURIComponent(destino)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': mime }, body: buf }
  );
  if (!up.ok) throw new Error(`GCS ${up.status}: ${(await up.text()).slice(0, 140)}`);
  return { url: `https://storage.googleapis.com/${BUCKET_INVENTARIO}/${destino}`, bytes: buf.length, mime };
}

/** Subir un archivo cualquiera desde el CRM (dossier, rider, foto, planilla…). */
app.post('/api/v1/crm/archivo', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) {
      return res.status(403).json({ ok: false, error: 'sólo administración o producción puede subir archivos' });
    }
    const carpeta = String(b.carpeta || 'obras').replace(/[^a-zA-Z0-9_/-]/g, '').slice(0, 40) || 'obras';
    // 15 MB y no 25: el archivo viaja en base64 (+33%) y la plataforma de Cloud Run corta el
    // request en 32 MB, así que con 25 MB el usuario recibía un 413 en HTML en vez de un aviso.
    const subido = await subirArchivoGenerico(b.nombre, b.dataUrl, carpeta, 15);
    return res.json({ ok: true, ...subido, nombre: String(b.nombre || '').slice(0, 200) });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

/** Lista los archivos de una obra. */
app.get('/api/v1/crm/portfolio/projects/:id/files', async (req, res) => {
  try {
    const db = getPool();
    const [filas] = await db.execute(
      `SELECT id, project_id, tipo, nombre, url, mime, bytes, es_portada, subido_por, created_at
         FROM project_files WHERE project_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json({ ok: true, total: filas.length, files: filas.map(archivoAJson) });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message, files: [] });
  }
});

/** Registra un archivo o enlace en la obra (después de subirlo, o un link de YouTube/Drive). */
app.post('/api/v1/crm/portfolio/projects/:id/files', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) {
      return res.status(403).json({ ok: false, error: 'sólo administración o producción puede agregar archivos' });
    }
    const url = String(b.url || '').trim();
    const nombre = String(b.nombre || '').trim();
    const tipo = String(b.tipo || 'otro').toLowerCase().trim();
    if (!url) return res.status(400).json({ ok: false, error: 'falta la url del archivo' });
    if (!nombre) return res.status(400).json({ ok: false, error: 'falta el nombre del archivo' });
    if (!TIPOS_ARCHIVO_OBRA.includes(tipo)) {
      return res.status(400).json({ ok: false, error: `tipo inválido: usa ${TIPOS_ARCHIVO_OBRA.join(', ')}` });
    }
    const db = getPool();
    const [obra] = await db.execute('SELECT id FROM projects WHERE id = ?', [req.params.id]);
    if (!obra.length) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo' });
    const id = 'pf_' + randomUUID().replace(/-/g, '').slice(0, 20);
    await db.execute(
      `INSERT INTO project_files (id, project_id, tipo, nombre, url, mime, bytes, es_portada, subido_por, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, req.params.id, tipo, nombre.slice(0, 250), url.slice(0, 895), b.mime || null,
       Number(b.bytes) || null, b.esPortada ? 1 : 0, email.slice(0, 180) || null]
    );
    const [fila] = await db.execute('SELECT * FROM project_files WHERE id = ?', [id]);
    return res.json({ ok: true, file: archivoAJson(fila[0]) });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Borra un archivo de la obra (el archivo en el bucket queda; se deja de listar). */
app.delete('/api/v1/crm/files/:fileId', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.query.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'sólo administración o producción puede borrar archivos' });
    const db = getPool();
    const [r] = await db.execute('DELETE FROM project_files WHERE id = ?', [req.params.fileId]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, error: 'ese archivo no existe' });
    return res.json({ ok: true, id: req.params.fileId });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * FICHA DE LA OBRA · PUT /api/v1/crm/portfolio/projects/:id/ficha
 *
 * Edita los datos de la obra y sus bloques por disciplina (música, teatro, técnico…)
 * guardados en `projects.ficha`. Actualización PARCIAL: lo que no viene en el body no se
 * pisa, así la pantalla nunca borra campos que no muestra.
 */
const CAMPOS_FICHA_OBRA = {
  title: 'title', synopsis: 'synopsis', description: 'description', discipline: 'discipline',
  category: 'category', duration: 'duration', targetAudience: 'target_audience', format: 'format',
  premiereDate: 'premiere_date', status: 'status', location: 'location', notes: 'notes',
  companyId: 'company_id', imageUrl: 'image_url', budgetRange: 'budget_range', year: 'year',
};

app.put('/api/v1/crm/portfolio/projects/:id/ficha', async (req, res) => {
  try {
    const b = req.body || {};
    const email = b.email || req.headers['x-atha-email'] || '';
    const alcance = await alcanceInventario(email);
    if (!alcance.total) {
      return res.status(403).json({ ok: false, error: 'sólo administración o producción puede editar la ficha' });
    }
    const db = getPool();
    const [existe] = await db.execute('SELECT id, ficha FROM projects WHERE id = ?', [req.params.id]);
    if (!existe.length) return res.status(404).json({ ok: false, error: 'obra no encontrada' });

    const campos = [];
    const valores = [];
    for (const [clave, columna] of Object.entries(CAMPOS_FICHA_OBRA)) {
      if (b[clave] === undefined) continue;
      let valor = b[clave];
      if (clave === 'title' && !String(valor || '').trim()) {
        return res.status(400).json({ ok: false, error: 'El título no puede quedar vacío' });
      }
      if (clave === 'premiereDate') {
        valor = /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) ? valor : null;
      }
      campos.push(`${columna} = ?`);
      valores.push(typeof valor === 'string' ? valor.slice(0, 4000) : valor);
    }
    if (b.isPublic !== undefined) { campos.push('is_public = ?'); valores.push(b.isPublic ? 1 : 0); }
    if (b.ficha && typeof b.ficha === 'object') {
      let previa = {};
      try {
        previa = typeof existe[0].ficha === 'string' ? JSON.parse(existe[0].ficha) : (existe[0].ficha || {});
      } catch (e) { previa = {}; }
      campos.push('ficha = ?');
      valores.push(JSON.stringify({ ...previa, ...b.ficha }));
    }
    if (!campos.length) return res.status(400).json({ ok: false, error: 'nada para actualizar' });

    valores.push(req.params.id);
    await db.execute(`UPDATE projects SET ${campos.join(', ')} WHERE id = ?`, valores);
    const [fila] = await db.execute('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    radarEmitir('obra_actualizada', { id: req.params.id });
    return res.json({ ok: true, success: true, project: fila[0] });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// ELENCO DE UNA OBRA CON CUENTAS DE LA PLATAFORMA · Tanda B (2026-09-28)
//
// Antes el elenco de una obra era texto suelto (`cast_team`) y no había forma de
// saber quién de ese elenco ya tiene cuenta en la plataforma ni con qué rol está
// en ESTA obra. Ahora cada integrante es una fila de `project_members`:
//   role     = su rol en la obra: `direccion` | `elenco` | `equipo` | `produccion`
//   title    = su personaje en esa obra (puede ir vacío)
//   user_id  = su cuenta de `users` (se vincula sola si el correo coincide)
//   notes    = origen, p. ej. «viene de TMLL» cuando es invitado de otra compañía
//   is_active = 1; al quitar a alguien se borra la fila (no se marca inactivo)
//
// REGLA DE ORO: nadie se inscribe «suelto» desde la obra. El nombre tiene que
// existir en la nómina (`company_people`) de alguna compañía registrada; si no,
// se responde 400 ofreciendo agregarla a su compañía. Esto evita que cada obra
// fabrique su propia lista paralela de personas.
//
// Escritura: administración, o producción/técnica de la compañía que presenta la
// obra (vía `alcanceInventario`). Lectura: lo mismo, o alguien cuyo correo esté
// en el elenco de ESA obra.
// ---------------------------------------------------------------------------
const ROLES_ELENCO_OBRA = ['direccion', 'elenco', 'equipo', 'produccion'];
const ETIQUETA_ROL_OBRA = {
  direccion: 'Dirección', elenco: 'Elenco', equipo: 'Equipo', produccion: 'Producción',
};

/** La compañía que presenta la obra (para comparar con la compañía de la persona). */
async function companiaDeObra(db, projectId) {
  const [filas] = await db.execute(
    `SELECT p.id, p.company_id, c.name AS company_name, c.logo_url AS company_logo
       FROM projects p LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.id = ? LIMIT 1`,
    [projectId]
  );
  return filas[0] || null;
}

/** ¿Quién puede gestionar el elenco de una obra? Administración, o producción/técnica de su compañía. */
function puedeGestionarElenco(alcance, companyId) {
  if (alcance.total) return true;
  if (!alcance.puedeEscribir) return false;
  if (!companyId) return false;
  return (alcance.companies || []).includes(companyId);
}

/**
 * Busca a la persona en la nómina de CUALQUIER compañía registrada (regla de oro).
 * Primero por correo (si viene), después por nombre exacto, sin distinguir
 * mayúsculas ni espacios.
 */
async function personaEnNomina(db, { displayName, email }) {
  const correo = String(email || '').trim().toLowerCase();
  const nombre = String(displayName || '').trim().toLowerCase();
  const comun =
    `SELECT cp.id, cp.company_id, cp.full_name, cp.email, cp.phone, cp.kind, cp.role_title,
            c.name AS company_name, c.logo_url AS company_logo
       FROM company_people cp LEFT JOIN companies c ON c.id = cp.company_id`;
  if (correo) {
    const [porCorreo] = await db.execute(`${comun} WHERE LOWER(cp.email) = ? LIMIT 1`, [correo]);
    if (porCorreo.length) return porCorreo[0];
  }
  if (nombre) {
    const [porNombre] = await db.execute(
      `${comun} WHERE LOWER(TRIM(cp.full_name)) = ? LIMIT 1`, [nombre]
    );
    if (porNombre.length) return porNombre[0];
  }
  return null;
}

/** Mensaje único de la regla de oro (ofrece agregar a la persona a su compañía). */
function avisoFueraDeNomina(displayName) {
  return `«${displayName}» no figura en la nómina de ninguna compañía registrada. ` +
    'Agrega a la persona a su compañía (Compañías → Nómina → Agregar persona) y vuelve a intentarlo.';
}

/** Fila de `project_members` a la forma que usa la interfaz. */
function elencoAJson(m, { cuenta = null, compania = '', companiaId = null, invitado = false } = {}) {
  return {
    id: m.id,
    projectId: m.project_id,
    displayName: m.display_name || '',
    email: m.email || '',
    role: m.role || '',
    personaje: m.title || '',
    title: m.title || '',          // alias: el personaje es el `title` de la fila
    phone: m.phone || '',
    origen: m.notes || '',
    notes: m.notes || '',
    compania: compania || '',
    companiaId: companiaId || null,
    esInvitadoDeOtraCompania: !!invitado,
    isActive: !!m.is_active,
    joinedAt: m.joined_at || m.created_at || null,
    cuenta: cuenta
      ? { id: cuenta.id, email: cuenta.email || '', name: cuenta.display_name || '', picture: cuenta.picture || '', role: cuenta.role || '' }
      : null,
  };
}

/**
 * Elenco completo de una obra, ya resuelto: cuenta vinculada, compañía de origen
 * y si es invitado de otra compañía. Se resuelve en tres consultas (no N+1) porque
 * la nómina y los usuarios son tablas chicas.
 */
async function elencoDeObra(db, projectId, companyId) {
  const [filas] = await db.execute(
    `SELECT * FROM project_members
      WHERE project_id = ? AND is_active = 1
      ORDER BY FIELD(role, 'direccion', 'produccion', 'elenco', 'equipo'), created_at, display_name`,
    [projectId]
  );
  if (!filas.length) return [];

  // Cuentas vinculadas
  const ids = [...new Set(filas.map((f) => f.user_id).filter(Boolean))];
  const porCuenta = new Map();
  if (ids.length) {
    const marcas = ids.map(() => '?').join(', ');
    const [us] = await db.execute(
      `SELECT id, email, display_name, role, picture FROM users WHERE id IN (${marcas})`, ids
    );
    for (const u of us) porCuenta.set(u.id, u);
  }

  // Nómina de todas las compañías registradas (para saber de dónde viene cada uno)
  const [nomina] = await db.execute(
    `SELECT cp.full_name, cp.email, cp.company_id, c.name AS company_name
       FROM company_people cp LEFT JOIN companies c ON c.id = cp.company_id`
  );
  const porCorreo = new Map();
  const porNombre = new Map();
  for (const n of nomina) {
    if (n.email) porCorreo.set(String(n.email).toLowerCase(), n);
    if (n.full_name) porNombre.set(String(n.full_name).trim().toLowerCase(), n);
  }

  return filas.map((m) => {
    const deNomina = (m.email && porCorreo.get(String(m.email).toLowerCase())) ||
      porNombre.get(String(m.display_name || '').trim().toLowerCase()) || null;
    // es invitado si la nómina lo ubica en OTRA compañía, o si quedó anotado el origen
    const invitado = (deNomina && companyId && deNomina.company_id !== companyId) ||
      /^viene de /i.test(String(m.notes || ''));
    return elencoAJson(m, {
      cuenta: m.user_id ? porCuenta.get(m.user_id) || null : null,
      compania: deNomina ? deNomina.company_name || '' : '',
      companiaId: deNomina ? deNomina.company_id : null,
      invitado: !!invitado,
    });
  });
}

/** Lista el elenco de una obra con su cuenta vinculada. */
app.get('/api/v1/crm/portfolio/projects/:id/cast', async (req, res) => {
  try {
    const db = getPool();
    const email = emailDeSesion(req) || '';
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida', cast: [] });

    const obra = await companiaDeObra(db, req.params.id);
    if (!obra) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo', cast: [] });

    const alcance = await alcanceInventario(email);
    let permitido = puedeGestionarElenco(alcance, obra.company_id);
    if (!permitido) {
      // alguien del elenco de ESA obra también puede verlo
      const [yo] = await db.execute(
        `SELECT id FROM project_members
          WHERE project_id = ? AND is_active = 1 AND LOWER(email) = ? LIMIT 1`,
        [req.params.id, email]
      );
      permitido = yo.length > 0;
    }
    if (!permitido) {
      return res.status(403).json({ ok: false, error: 'no tienes acceso al elenco de esa obra', cast: [] });
    }

    const cast = await elencoDeObra(db, req.params.id, obra.company_id);
    return res.json({ ok: true, total: cast.length, cast });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message, cast: [] });
  }
});

/**
 * Inscribe a alguien en el elenco de la obra.
 * `{displayName, email?, role, personaje?, desdeCompaniaId?}` (acepta también `nombre`/`rol`).
 */
app.post('/api/v1/crm/portfolio/projects/:id/cast', async (req, res) => {
  try {
    const db = getPool();
    const email = emailDeSesion(req) || '';
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });

    const obra = await companiaDeObra(db, req.params.id);
    if (!obra) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo' });

    const alcance = await alcanceInventario(email);
    if (!puedeGestionarElenco(alcance, obra.company_id)) {
      return res.status(403).json({
        ok: false,
        error: 'sólo administración o producción de la compañía que presenta la obra puede inscribir el elenco',
      });
    }

    const b = req.body || {};
    const rol = String(b.role || b.rol || '').toLowerCase().trim();
    if (!ROLES_ELENCO_OBRA.includes(rol)) {
      return res.status(400).json({ ok: false, error: `rol inválido: usa ${ROLES_ELENCO_OBRA.join(', ')}` });
    }
    const displayName = String(b.displayName || b.nombre || '').trim();
    if (!displayName) return res.status(400).json({ ok: false, error: 'falta el nombre de la persona' });
    const correoDado = String(b.email || '').trim().toLowerCase();

    // REGLA DE ORO: la persona tiene que existir en la nómina de alguna compañía
    const deNomina = await personaEnNomina(db, { displayName, email: correoDado });
    if (!deNomina) {
      return res.status(400).json({ ok: false, error: avisoFueraDeNomina(displayName), sugerencia: 'agregar_a_compania' });
    }

    // El correo que manda es el de la nómina si no se indicó otro: así la cuenta se vincula sola.
    const correo = correoDado || String(deNomina.email || '').toLowerCase();
    let user_id = null;
    if (correo) {
      const [u] = await db.execute('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [correo]);
      user_id = u.length ? u[0].id : null;
    }

    // Origen: invitado de otra compañía (la que lo presenta es la de la obra)
    let notes = null;
    const desde = String(b.desdeCompaniaId || b.desde_compania_id || '').trim();
    if (desde && desde !== String(obra.company_id || '')) {
      const [otra] = await db.execute('SELECT name FROM companies WHERE id = ? LIMIT 1', [desde]);
      notes = `viene de ${(otra.length && otra[0].name) || desde}`;
    }

    const personaje = String(b.personaje || b.title || '').trim().slice(0, 255) || null;
    const id = 'pm_' + randomUUID().replace(/-/g, '').slice(0, 20);
    await db.execute(
      `INSERT INTO project_members
         (id, project_id, user_id, role, display_name, phone, notes, is_active, joined_at, created_at,
          title, email, discipline)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?, ?, ?)`,
      [id, req.params.id, user_id, rol, displayName.slice(0, 255),
       String(b.phone || '').trim().slice(0, 80) || null, notes, personaje,
       correo.slice(0, 255) || null, String(b.discipline || '').trim().slice(0, 100) || null]
    );

    const cast = await elencoDeObra(db, req.params.id, obra.company_id);
    radarEmitir('obra_actualizada', { id: req.params.id });
    return res.json({ ok: true, cast: cast.find((c) => c.id === id) || null });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Edita rol, personaje, correo o teléfono de alguien del elenco (parcial). */
app.put('/api/v1/crm/portfolio/projects/:id/cast/:castId', async (req, res) => {
  try {
    const db = getPool();
    const email = emailDeSesion(req) || '';
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });

    const obra = await companiaDeObra(db, req.params.id);
    if (!obra) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo' });

    const alcance = await alcanceInventario(email);
    if (!puedeGestionarElenco(alcance, obra.company_id)) {
      return res.status(403).json({ ok: false, error: 'sólo administración o producción de la compañía que presenta la obra puede editar el elenco' });
    }

    const [actual] = await db.execute(
      'SELECT * FROM project_members WHERE id = ? AND project_id = ? LIMIT 1',
      [req.params.castId, req.params.id]
    );
    if (!actual.length) {
      return res.status(404).json({ ok: false, error: 'esa persona no está en el elenco de esta obra' });
    }

    const b = req.body || {};
    const campos = [];
    const valores = [];

    if (b.role !== undefined || b.rol !== undefined) {
      const rol = String(b.role || b.rol || '').toLowerCase().trim();
      if (!ROLES_ELENCO_OBRA.includes(rol)) {
        return res.status(400).json({ ok: false, error: `rol inválido: usa ${ROLES_ELENCO_OBRA.join(', ')}` });
      }
      campos.push('role = ?');
      valores.push(rol);
    }
    if (b.personaje !== undefined || b.title !== undefined) {
      campos.push('title = ?');
      valores.push(String(b.personaje !== undefined ? b.personaje : b.title).trim().slice(0, 255) || null);
    }
    if (b.displayName !== undefined || b.nombre !== undefined) {
      const nombre = String(b.displayName !== undefined ? b.displayName : b.nombre).trim();
      if (!nombre) return res.status(400).json({ ok: false, error: 'el nombre no puede quedar vacío' });
      // la regla de oro también vale al renombrar (y el correo actual ayuda a ubicarlo)
      const enNomina = await personaEnNomina(db, { displayName: nombre, email: b.email !== undefined ? b.email : actual[0].email });
      if (!enNomina) return res.status(400).json({ ok: false, error: avisoFueraDeNomina(nombre), sugerencia: 'agregar_a_compania' });
      campos.push('display_name = ?');
      valores.push(nombre.slice(0, 255));
    }
    if (b.email !== undefined) {
      const correo = String(b.email || '').trim().toLowerCase();
      campos.push('email = ?');
      valores.push(correo.slice(0, 255) || null);
      // re-vincula (o desvincula) la cuenta según el correo nuevo
      let user_id = null;
      if (correo) {
        const [u] = await db.execute('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [correo]);
        user_id = u.length ? u[0].id : null;
      }
      campos.push('user_id = ?');
      valores.push(user_id);
    }
    if (b.phone !== undefined) {
      campos.push('phone = ?');
      valores.push(String(b.phone || '').trim().slice(0, 80) || null);
    }
    if (b.desdeCompaniaId !== undefined) {
      const desde = String(b.desdeCompaniaId || '').trim();
      let notes = null;
      if (desde && desde !== String(obra.company_id || '')) {
        const [otra] = await db.execute('SELECT name FROM companies WHERE id = ? LIMIT 1', [desde]);
        notes = `viene de ${(otra.length && otra[0].name) || desde}`;
      }
      campos.push('notes = ?');
      valores.push(notes);
    }
    if (!campos.length) return res.status(400).json({ ok: false, error: 'nada para actualizar' });

    valores.push(req.params.castId, req.params.id);
    await db.execute(
      `UPDATE project_members SET ${campos.join(', ')} WHERE id = ? AND project_id = ?`, valores
    );
    const cast = await elencoDeObra(db, req.params.id, obra.company_id);
    radarEmitir('obra_actualizada', { id: req.params.id });
    return res.json({ ok: true, cast: cast.find((c) => c.id === req.params.castId) || null });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Quita a alguien del elenco de la obra (se borra la fila, no se marca inactiva). */
app.delete('/api/v1/crm/portfolio/projects/:id/cast/:castId', async (req, res) => {
  try {
    const db = getPool();
    const email = emailDeSesion(req) || '';
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });

    const obra = await companiaDeObra(db, req.params.id);
    if (!obra) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo' });

    const alcance = await alcanceInventario(email);
    if (!puedeGestionarElenco(alcance, obra.company_id)) {
      return res.status(403).json({ ok: false, error: 'sólo administración o producción de la compañía que presenta la obra puede quitar gente del elenco' });
    }

    const [r] = await db.execute(
      'DELETE FROM project_members WHERE id = ? AND project_id = ?',
      [req.params.castId, req.params.id]
    );
    if (!r.affectedRows) {
      return res.status(404).json({ ok: false, error: 'esa persona no está en el elenco de esta obra' });
    }
    radarEmitir('obra_actualizada', { id: req.params.id });
    return res.json({ ok: true, id: req.params.castId, quitado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * Manda UN correo de invitación al elenco con el nombre de la obra y su rol.
 * Se dispara sólo cuando se llama a este endpoint: nunca automático. Si el body
 * trae `para`, se usa ese correo (las pruebas van al buzón del agente).
 */
app.post('/api/v1/crm/portfolio/projects/:id/cast/:castId/invitar', async (req, res) => {
  try {
    const db = getPool();
    const email = emailDeSesion(req) || '';
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });

    const obra = await companiaDeObra(db, req.params.id);
    if (!obra) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo' });

    const alcance = await alcanceInventario(email);
    if (!puedeGestionarElenco(alcance, obra.company_id)) {
      return res.status(403).json({ ok: false, error: 'sólo administración o producción de la compañía que presenta la obra puede invitar al elenco' });
    }

    const [filas] = await db.execute(
      'SELECT * FROM project_members WHERE id = ? AND project_id = ? LIMIT 1',
      [req.params.castId, req.params.id]
    );
    if (!filas.length) {
      return res.status(404).json({ ok: false, error: 'esa persona no está en el elenco de esta obra' });
    }
    const m = filas[0];

    let para = String((req.body && (req.body.para || req.body.email)) || '').trim();
    if (!para && m.email) para = String(m.email).trim();
    if (!para && m.user_id) {
      const [u] = await db.execute('SELECT email FROM users WHERE id = ? LIMIT 1', [m.user_id]);
      if (u.length) para = String(u[0].email || '').trim();
    }
    if (!para) {
      return res.status(400).json({ ok: false, error: `«${m.display_name}» no tiene correo: agrégalo antes de invitarlo` });
    }

    const [p] = await db.execute('SELECT title, premiere_date FROM projects WHERE id = ? LIMIT 1', [req.params.id]);
    const rol = ETIQUETA_ROL_OBRA[m.role] || m.role || '';
    const r = await enviarCorreo({
      para,
      asunto: `Invitación al elenco de «${(p[0] && p[0].title) || 'la obra'}»`,
      plantilla: 'invitacion_elenco',
      html: marcoCorreo(PLANTILLAS_CORREO.invitacion_elenco({
        nombre: m.display_name || '',
        obra: (p[0] && p[0].title) || '',
        compania: obra.company_name || '',
        rol,
        personaje: m.title || '',
        estreno: (p[0] && p[0].premiere_date) || '',
        linkPlanner: `${URL_HUB_PUBLICA}/puente?destino=planner`,
      })),
      enviadoPor: email,
    });
    return res.status(r.ok ? 200 : 503).json({
      ok: !!r.ok, error: r.error, para, obra: (p[0] && p[0].title) || '', rol, correo: r,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// MONTAJE PARA EL PLANNER · Tanda C, punto 1 (2026-09-28)
//
// El CRM abre el Planner con la sesión puesta y `&obra=<id>`, pero el Planner no
// tenía de dónde sacar la ficha, el elenco ni las funciones. Este endpoint le
// entrega TODO en una llamada, con los nombres que usa el Planner.
// Autorización: sesión con token del hub, o administración/producción de la
// compañía que presenta la obra.
// ---------------------------------------------------------------------------
/** Fecha en `YYYY-MM-DD` sin sustos de zona horaria (mysql2 arma el Date en hora local). */
function fechaSolo(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s.slice(0, 10);
}

/** Hora en `HH:MM` (la columna es TIME y llega como `HH:MM:SS`). */
function horaSolo(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
  }
  return String(v).trim().slice(0, 5);
}

app.get('/api/v1/crm/planner/montaje/:id', async (req, res) => {
  try {
    const db = getPool();
    const email = emailDeSesion(req) || '';
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });

    const obra = await companiaDeObra(db, req.params.id);
    if (!obra) return res.status(404).json({ ok: false, error: 'la obra no existe en el catálogo' });

    const conToken = !!(req.identidad && req.identidad.conToken);
    if (!conToken) {
      const alcance = await alcanceInventario(email);
      if (!puedeGestionarElenco(alcance, obra.company_id)) {
        return res.status(403).json({ ok: false, error: 'no tienes acceso a ese montaje' });
      }
    }

    const [filas] = await db.execute(
      `SELECT id, title, synopsis, description, discipline, category, duration, target_audience,
              format, status, premiere_date, image_url, location, ficha, company_id
         FROM projects WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    const p = filas[0];
    let ficha = p.ficha;
    if (typeof ficha === 'string') { try { ficha = JSON.parse(ficha); } catch (e) { ficha = null; } }
    if (!ficha || typeof ficha !== 'object') ficha = {};

    const musica = (ficha.musica && typeof ficha.musica === 'object') ? ficha.musica : {};
    const tecnico = (ficha.tecnico && typeof ficha.tecnico === 'object') ? ficha.tecnico : {};

    const elenco = await elencoDeObra(db, req.params.id, p.company_id);
    const [eventos] = await db.execute(
      `SELECT id, title, type, date, time_start, venue, city, status
         FROM events WHERE obra_id = ? ORDER BY date ASC, time_start ASC`,
      [req.params.id]
    );

    return res.json({
      ok: true,
      montaje: {
        id: p.id,
        title: p.title || '',
        synopsis: p.synopsis || '',
        discipline: p.discipline || '',
        category: p.category || '',
        duration: p.duration || '',
        targetAudience: p.target_audience || '',
        format: p.format || '',
        status: p.status || '',
        premiereDate: p.premiere_date ? fechaSolo(p.premiere_date) : '',
        image: p.image_url || '',
        compania: {
          id: p.company_id || '',
          nombre: obra.company_name || '',
          logo: obra.company_logo || '',
        },
        musica: {
          formato: String(musica.formato || ''),
          musicos: String(musica.musicos || ''),
          instrumentos: String(musica.instrumentos || ''),
        },
        tecnico: {
          anchoMin: String(tecnico.anchoMin || ''),
          fondoMin: String(tecnico.fondoMin || ''),
          altoMin: String(tecnico.altoMin || ''),
          carga: String(tecnico.carga || ''),
          personal: String(tecnico.personal || ''),
        },
        elenco: elenco.map((c) => ({
          nombre: c.displayName,
          rol: c.role,
          personaje: c.personaje,
          email: c.email,
          cuenta: !!c.cuenta,
        })),
        funciones: eventos.map((e) => ({
          id: e.id,
          titulo: e.title || '',
          tipo: e.type || '',
          fecha: fechaSolo(e.date),
          hora: horaSolo(e.time_start),
          lugar: e.venue || e.city || '',
          estado: e.status || '',
        })),
      },
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// CONVOCATORIAS (Buscador de Fondos) · /api/v1/crm/convocatorias
//
// El Buscador de Fondos vivía 100% en el navegador (localStorage) y su "sync"
// apuntaba a http://localhost:5052 con un "Mac Agent" que nunca existió: nada
// llegaba al CRM. Aquí se guarda de verdad: las convocatorias en
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
// El panel de diseño (módulo modular que agregó Francisco) guarda aquí la
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
// Aquí, en el hub. Antes cada proyecto traía su propio esquema PostgreSQL y datos
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
/**
 * Identidad de quien llama: correo, nombre y FOTO.
 *
 * El nombre y la foto viajan tambien en cabeceras (`x-atha-name`,
 * `x-atha-picture`, codificadas) porque no todas las rutas reciben un body:
 * asi cualquier llamada autenticada alcanza para registrar bien al usuario.
 */
function identidad(req) {
  const b = req.body || {};
  const dec = (v) => {
    if (v === undefined || v === null) return null;
    try { return decodeURIComponent(String(v)); } catch { return String(v); }
  };
  return {
    email: b.email || req.headers['x-atha-email'] || (req.query && req.query.email) || null,
    nombre: b.name || dec(req.headers['x-atha-name']) || null,
    foto: b.picture || b.avatar || dec(req.headers['x-atha-picture']) || null,
  };
}

/**
 * Columnas de la AGENDA (lo que hace posible la cartelera real con hora y "cerca de mí").
 *
 * - `radar_nodes.hours`: horario de atención del lugar ("Lun a Sáb 10:00 a 18:45").
 *   Es texto a propósito: se muestra tal cual lo cargue el CRM; inventar una
 *   estructura de horarios que nadie va a completar sería peor que no tenerla.
 * - `events.*`: lugar geolocalizado (`venue_id` → `venues.lat/lng`, o `lat/lng` del
 *   propio evento), ciudad, imagen, link de entradas y la FUENTE del dato
 *   (`source` = manual | atha | externo, `source_url`). Sin fuente no hay cartelera
 *   externa: no se copian eventos sin decir de dónde salieron.
 * Todo idempotente, como el resto de las columnas que crecen en producción.
 */
const CAMPOS_AGENDA = [
  ['radar_nodes', 'hours', 'varchar(160) NULL'],
  ['events', 'venue_id', 'varchar(36) NULL'],
  ['events', 'city', 'varchar(120) NULL'],
  ['events', 'lat', 'decimal(10,7) NULL'],
  ['events', 'lng', 'decimal(10,7) NULL'],
  ['events', 'is_public', 'tinyint(1) NOT NULL DEFAULT 1'],
  ['events', 'image_url', 'varchar(512) NULL'],
  ['events', 'ticket_url', 'varchar(512) NULL'],
  ['events', 'source', "varchar(40) NULL DEFAULT 'manual'"],
  ['events', 'source_url', 'varchar(512) NULL'],
  // Fin de una muestra de varios días: la app puede decir "hasta el 26 de octubre".
  // `date` es el día de la función (o el inicio de la muestra).
  ['events', 'date_end', 'date NULL'],
];

let columnasAgendaListas = false;
async function asegurarColumnasAgenda() {
  if (columnasAgendaListas) return;
  const db = getPool();
  for (const tabla of [...new Set(CAMPOS_AGENDA.map((c) => c[0]))]) {
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tabla]
    );
    const hay = new Set(cols.map((c) => c.COLUMN_NAME));
    for (const [t, nombre, tipo] of CAMPOS_AGENDA.filter((c) => c[0] === tabla)) {
      if (!hay.has(nombre)) {
        await db.execute(`ALTER TABLE ${t} ADD COLUMN ${nombre} ${tipo}`);
        console.log(`[agenda] columna agregada: ${t}.${nombre}`);
      }
    }
  }
  // `events.time_start` nació NOT NULL, pero una MUESTRA de varios días (exposición) no
  // tiene hora: la fuente publica sólo el rango de fechas. Se afloja una vez para poder
  // representarlas (la app ya sabe mostrar un evento sin hora) en vez de dejarlas afuera.
  const [nulls] = await db.execute(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'time_start'`);
  if (nulls.length && nulls[0].IS_NULLABLE === 'NO') {
    await db.execute('ALTER TABLE events MODIFY COLUMN time_start TIME NULL');
    console.log('[agenda] events.time_start ahora acepta NULL (muestras de varios días)');
  }
  columnasAgendaListas = true;
}

/**
 * ¿El nombre guardado es apenas un relleno, no un nombre elegido?
 * Cuenta como provisional: vacío, o el prefijo del correo ("panxo.sms").
 * Sirve para decidir si el nombre de Google (o el del teléfono) PUEDE reemplazarlo.
 * Todo nombre real que la persona ya tiene NUNCA se pisa solo.
 */
function nombreProvisional(nombre, email) {
  const n = String(nombre || '').trim();
  if (!n) return true;
  const prefijo = String(email || '').split('@')[0].toLowerCase().trim();
  return !!prefijo && n.toLowerCase() === prefijo;
}

async function exploradorId(email, nombre, foto) {
  const correo = String(email || '').trim().toLowerCase();
  if (!correo) return null;
  const db = getPool();
  const [filas] = await db.execute(
    'SELECT id, display_name, picture FROM users WHERE LOWER(email) = ? LIMIT 1', [correo]
  );

  // Ya existe: se completa nombre/foto SÓLO si faltaban.
  // Sin esto, quien se registraba por Google quedaba SIN FOTO para siempre
  // (su avatar caia al logo de ATHA en la app, que era lo que se veia).
  //
  // PERO hay que respetar lo que ya está: la app manda `x-atha-name` con el nombre
  // guardado en el teléfono en CADA llamada, así que sobrescribir siempre convertía
  // cada request en un "revertidor": alguien cambiaba su nombre, y la siguiente
  // llamada le volvía a escribir el viejo. (Reportado: "no persiste su cambio de
  // nombre en el perfil; los otros datos del perfil sí"). Por eso ahora:
  //   - el nombre se completa si la cuenta no tiene (o tiene el prefijo del correo)
  //   - la foto se completa si la cuenta no tiene
  // Un cambio explícito de nombre/foto se hace por PATCH /radar/perfil, no por aquí.
  if (filas.length) {
    const actual = filas[0];
    const sinNombre = nombreProvisional(actual.display_name, correo);
    const nombreNuevo = (sinNombre && nombre) ? String(nombre).slice(0, 120) : actual.display_name;
    const fotoNueva = (!actual.picture && foto) ? String(foto).slice(0, 512) : actual.picture;
    if (nombreNuevo !== actual.display_name || fotoNueva !== actual.picture) {
      await db.execute('UPDATE users SET display_name = ?, picture = ? WHERE id = ?',
        [nombreNuevo, fotoNueva, actual.id]);
    }
    return actual.id;
  }

  const id = `usr_${randomUUID().slice(0, 8)}`;
  await db.execute(
    'INSERT INTO users (id, email, display_name, role, provider, picture, public_profile) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [id, correo, String(nombre || correo.split('@')[0]).slice(0, 120), 'explorador', 'google',
     foto ? String(foto).slice(0, 512) : null]
  );
  return id;
}

/* ---------------------------------------------------------------------------
 * Columnas del perfil que la app ofrece editar.
 *
 * `radar_profiles` nació con bio/city/is_public, nada más: por eso la "Organización"
 * y las "Disciplinas" del panel de perfil se guardaban… en el teléfono y nunca en el
 * CRM (el hub las ignoraba en silencio). Se agregan aquí, idempotente, igual que las
 * otras tablas que crecen en producción.
 * ------------------------------------------------------------------------- */
const CAMPOS_PERFIL_RADAR = [
  ['org_name', "varchar(160) NULL"],
  ['disciplines', "varchar(512) NULL"],
];

let columnasPerfilListas = false;
async function asegurarColumnasPerfilRadar() {
  if (columnasPerfilListas) return;
  const db = getPool();
  const [cols] = await db.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'radar_profiles'`
  );
  const hay = new Set(cols.map((c) => c.COLUMN_NAME));
  for (const [nombre, tipo] of CAMPOS_PERFIL_RADAR) {
    if (!hay.has(nombre)) {
      await db.execute(`ALTER TABLE radar_profiles ADD COLUMN ${nombre} ${tipo}`);
      console.log(`[perfil] columna agregada: radar_profiles.${nombre}`);
    }
  }
  columnasPerfilListas = true;
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
  /** Horario de atención del lugar, si el CRM lo cargó (si no, null: no se inventa) */
  hours: n.hours || null,
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
    // Se registra/completa con la identidad completa (nombre y foto): la app
    // llama a este endpoint cada vez que abre el radar, así que quien ya tenía
    // cuenta sin foto la recibe al volver a entrar, sin esperar a que escriba.
    const ident = identidad(req);
    const userId = email ? await exploradorId(email, ident.nombre, ident.foto) : null;

    let sql = 'SELECT * FROM radar_nodes';
    // Antes del SELECT *: si falta la columna del horario, se agrega ahora.
    await asegurarColumnasAgenda();
    // Los BORRADORES sólo los ve administración (el panel de /nodos). El pedido público
    // —la app— nunca los trae, aunque mande `incluir_borradores=1`.
    let verBorradores = false;
    if (incluir_borradores) {
      const alcance = await alcanceInventario(email || ident.email || req.headers['x-atha-email'] || '');
      verBorradores = !!alcance.total;
    }
    if (!verBorradores) sql += ' WHERE is_published = 1';
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
      /** Horario de atención: lo muestra la app tal como se escribe (si no, null) */
      hours: b.hours === undefined ? null : (b.hours ? String(b.hours).slice(0, 160) : null),
      created_by: alcance.usuario ? alcance.usuario.email : null,
    };
    const EDITABLES = ['name', 'short_description', 'full_description', 'category', 'latitude',
      'longitude', 'address', 'city', 'region', 'cover_url', 'unlock_radius_m', 'qr_code',
      'is_published', 'hours'];
    if (b.name !== undefined && String(b.name).trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'El nombre necesita al menos 3 letras.' });
    }

    if (id) {
      // Sólo se actualiza lo que VINO en el cuerpo: un PATCH parcial (p. ej. sólo
      // `is_published`, como hace el panel para publicar/ocultar) no debe vaciar el resto.
      const alias = { lat: 'latitude', lng: 'longitude' };
      const pedidos = new Set(Object.keys(b).map((k) => alias[k] || k));
      const sets = EDITABLES.filter((k) => pedidos.has(k));
      if (!sets.length) {
        return res.status(400).json({ ok: false, error: 'no hay nada para actualizar' });
      }
      const sql = `UPDATE radar_nodes SET ${sets.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
      await db.execute(sql, [...sets.map((k) => campos[k]), id]);
      radarEmitir('nodo_actualizado', { node_id: id });
      return res.json({ ok: true, id });
    }
    const nuevo = String(b.id || `nd_${randomUUID().slice(0, 8)}`).slice(0, 64);
    await db.execute(
      `INSERT INTO radar_nodes
        (id, name, short_description, full_description, category, latitude, longitude, address, city, region,
         cover_url, unlock_radius_m, qr_code, is_published, hours, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nuevo, campos.name || 'Nodo sin nombre', campos.short_description, campos.full_description, campos.category,
       campos.latitude, campos.longitude, campos.address, campos.city, campos.region, campos.cover_url,
       campos.unlock_radius_m, campos.qr_code, campos.is_published, campos.hours, campos.created_by]
    );
    radarEmitir('nodo_creado', { node_id: nuevo });
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
    const userId = await exploradorId(email, b.name, identidad(req).foto);

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
    await asegurarColumnasPerfilRadar();
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
// a un nodo cultural (publicas sobre el lugar que descubriste). Las reacciones
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
    const userId = await exploradorId(email, b.name, identidad(req).foto);
    const id = `po_${randomUUID().slice(0, 8)}`;

    let media = b.media_url || null;
    // Un data URL que llegue en media_url (app vieja, o el Muro que mandaba la foto
    // en los dos campos) se sube igual: guardarlo en la columna es VARCHAR(512) y
    // rompía la publicación con 503 "Data too long for column 'media_url'".
    if (media && /^data:/i.test(media)) {
      if (!b.image) b.image = media;
      media = null;
    }
    if (!media && b.image) {
      // OJO: aquí se llamaba a `subirFotoGcs`, que NUNCA estuvo definida (sólo
      // existe subirFotoInventario). Publicar con foto tiraba
      // "subirFotoGcs is not defined" y la publicación no se guardaba: era el
      // reporte "no se postean las publicaciones cuando subo la foto".
      media = await subirFotoInventario(id, b.image, 'radar/publicaciones');
    }
    // Nunca un 503 mudo por una URL larga: se explica y se corta.
    if (media && media.length > 512) {
      return res.status(400).json({
        ok: false,
        error: 'La imagen es demasiado grande. Prueba con otra foto (o más chica).',
      });
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
    const userId = await exploradorId(email, b.name, identidad(req).foto);
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
    const userId = await exploradorId(email, b.name, identidad(req).foto);
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
 * original. Aquí se arma el SET únicamente con lo que llegó.
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
        error: 'No tienes acceso al inventario de esa compañía.',
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
// El CRM es el PROVEEDOR DE IDENTIDAD del ecosistema: aquí se valida quién es el
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
  // URL DIRECTA del artefacto (sin pasar por el puente). La necesita la app
  // móvil: pide un ticket en /api/auth/ticket y abre `<url>?t=<ticket>`, con lo
  // que el artefacto entra con sesión SIN depender de que el navegador tenga la
  // sesión del CRM guardada (que es lo que hace el puente). Un solo origen de
  // verdad: las mismas URLs que usa el puente.
  const directa = (clave) => (DESTINOS_PUENTE[clave] || '');
  const artefactos = [
    { id: 'crm', key: 'crm', name: 'CRM Central', description: 'Clientes, obras, equipo, inventario y finanzas',
      icon: 'layout-dashboard', entry_point: 'https://atha-crm-web-frontend-897089213264.us-central1.run.app',
      url: directa('crm') || 'https://atha-crm-web-frontend-897089213264.us-central1.run.app',
      required_role: 'explorador', is_active: true },
    { id: 'app-movil', key: 'app-movil', name: 'App FASE (móvil)', description: 'Radar cultural, rutas y comunidad en el celular',
      icon: 'smartphone', entry_point: puente('app-movil'), url: directa('app-movil'), required_role: 'explorador', is_active: true },
    { id: 'planner', key: 'planner', name: 'Planner de Giras', description: 'Disponibilidad de elencos y planificación de temporada',
      icon: 'calendar', entry_point: puente('planner'), url: directa('planner'), required_role: 'explorador', is_active: true },
    { id: 'arquitecto', key: 'arquitecto', name: 'Arquitecto de Proyectos', description: 'Estructura, etapas y presupuesto de proyectos',
      icon: 'layers', entry_point: puente('arquitecto'), url: directa('arquitecto'), required_role: 'explorador', is_active: true },
    { id: 'buscador', key: 'buscador', name: 'Buscador de Fondos', description: 'Convocatorias y financiamiento cultural',
      icon: 'search', entry_point: puente('buscador'), url: directa('buscador'), required_role: 'explorador', is_active: true },
    { id: 'ticketer', key: 'ticketer', name: 'Ticketer', description: 'Entradas, funciones y control de acceso',
      icon: 'ticket', entry_point: puente('ticketer'), url: directa('ticketer'), required_role: 'explorador', is_active: true },
  ];
  const rol = String(req.query.role || 'explorador').toLowerCase();
  // el rol filtra qué artefactos se muestran (admin y dirección ven todo)
  const esAdmin = (await alcanceInventario(req.query.email || req.headers['x-atha-email'] || '')).total;
  return res.json({ ok: true, total: artefactos.length, rol, artefactos: esAdmin ? artefactos : artefactos.filter((a) => a.required_role === 'explorador') });
});

// ---------------------------------------------------------------------------
// RADAR · perfil del explorador editable (bio, ciudad, visibilidad)
// ---------------------------------------------------------------------------
/**
 * GUARDAR PERFIL · PATCH /api/v1/crm/radar/perfil
 *
 * Antes sólo guardaba bio/city/is_public: el NOMBRE venía en el body desde la app
 * pero la app no lo mandaba (mandaba userId, bio, disciplines, city, is_public), así
 * que el cambio de nombre se veía en pantalla y desaparecía al recargar (reportado
 * en la prueba: "no persiste su cambio de nombre, los otros datos sí").
 *
 * Ahora: nombre y foto van a la CUENTA (users, que es lo que la app lee al entrar) y
 * organización/disciplinas al perfil del radar. El `userId` del body se ignora a
 * propósito: manda la identidad, no lo que diga el teléfono.
 */
app.patch('/api/v1/crm/radar/perfil', async (req, res) => {
  try {
    const b = req.body || {};
    // La identidad verificada manda: `body.email` es spoofeable (el middleware sólo
    // normaliza cabecera y query). Sin esto, cualquiera podía cambiar el nombre de otro.
    const email = req.headers['x-atha-email'] || b.email;
    if (!email) return res.status(400).json({ ok: false, error: 'falta email' });
    const db = getPool();
    await asegurarColumnasPerfilRadar();
    const userId = await exploradorId(email, b.name, identidad(req).foto);
    const perfil = await perfilRadar(userId);
    const bio = b.bio !== undefined ? String(b.bio).slice(0, 1000) : perfil.bio;
    const city = b.city !== undefined ? String(b.city).slice(0, 120) : perfil.city;
    const isPublic = b.is_public !== undefined ? (b.is_public ? 1 : 0) : perfil.is_public;
    const orgName = b.org_name !== undefined ? String(b.org_name).slice(0, 160) : perfil.org_name;
    const disciplines = b.disciplines !== undefined
      ? JSON.stringify(
          (Array.isArray(b.disciplines) ? b.disciplines : String(b.disciplines).split(','))
            .map((d) => String(d).trim()).filter(Boolean).slice(0, 20)
        ).slice(0, 512)
      : perfil.disciplines;
    await db.execute(
      'UPDATE radar_profiles SET bio = ?, city = ?, is_public = ?, org_name = ?, disciplines = ? WHERE user_id = ?',
      [bio, city, isPublic, orgName, disciplines, userId]
    );

    // Nombre visible y foto: en la CUENTA, porque /sesion (lo que la app lee al
    // abrir) sale de users. Guardarlos sólo en radar_profiles dejaba el nombre viejo.
    const campos = [];
    const valores = [];
    if (b.name !== undefined && String(b.name).trim()) {
      campos.push('display_name = ?');
      valores.push(String(b.name).trim().replace(/\s+/g, ' ').slice(0, 120));
    }
    const fotoNueva = b.avatar_url ?? b.picture;
    if (fotoNueva !== undefined && String(fotoNueva).trim()) {
      campos.push('picture = ?');
      valores.push(String(fotoNueva).trim().slice(0, 500));
    }
    if (campos.length) {
      valores.push(userId);
      await db.execute(`UPDATE users SET ${campos.join(', ')} WHERE id = ?`, valores);
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
  // El PANEL DE USUARIOS es un artefacto: dejó de ser sección interna del CRM.
  usuarios: 'https://fase-user-pannel-897089213264.us-central1.run.app',
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
    aviso('<h1>Necesitas iniciar sesión</h1>' +
      '<p>Entra al CRM ATHA con tu cuenta y esta página te lleva a ' + NOMBRE + ' automáticamente. ' +
      'Si ya iniciaste sesión en otra pestaña, espera unos segundos.</p>' +
      '<a class="boton" href="/">Iniciar sesión en el CRM</a>');
    var n = 0;
    var t = setInterval(function () { if (intentar() || ++n > 150) clearInterval(t); }, 2000);
  }
  function abrirConTicket(ticket) {
    location.replace(URL_DESTINO + (URL_DESTINO.indexOf('?') >= 0 ? '&' : '?') +
      't=' + encodeURIComponent(ticket));
  }

  /* LLAVE: el token del hub vive en este mismo origen (lo dejó el login), así que
     aquí se pide un ticket de un solo uso y se viaja con eso. Nada de correo, rol
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

// ===========================================================================
// AGRUPACIONES (compañías) · solicitudes de pertenencia
// ===========================================================================
// Una persona nueva no pertenece a NINGUNA compañía, así que no ve el
// inventario de ninguna (el hub responde "no pertenece a ninguna compañía en un
// rol de producción o técnico"). Hasta ahora la pertenencia se cargaba a mano:
// no existía endpoint ni pantalla.
//
// Flujo: la persona SOLICITA entrar a una agrupación -> el pedido llega EN VIVO
// a los administradores por el canal SSE -> un admin acepta o rechaza.
// IMPORTANTE: solicitar NO da acceso. El acceso lo otorga únicamente el admin,
// porque pertenecer a una compañía habilita ver SUS datos.
// ---------------------------------------------------------------------------

let tablaSolCompaniaLista = false;

async function asegurarTablaSolCompania() {
  if (tablaSolCompaniaLista) return;
  const db = getPool();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_requests (
      id varchar(64) NOT NULL PRIMARY KEY,
      company_id varchar(64) NOT NULL,
      user_id varchar(64) NOT NULL,
      role_in_company varchar(24) NOT NULL DEFAULT 'artist',
      mensaje varchar(400) DEFAULT NULL,
      status varchar(16) NOT NULL DEFAULT 'pendiente',
      resuelto_por varchar(64) DEFAULT NULL,
      resuelto_at datetime DEFAULT NULL,
      created_at datetime DEFAULT CURRENT_TIMESTAMP,
      KEY idx_pendientes (status, company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tablaSolCompaniaLista = true;
}

/**
 * AVISO POR TELEGRAM
 *
 * Para lo que NO puede esperar a que el usuario abra la app: una solicitud de
 * agrupación que hay que aprobar. El canal en vivo (SSE) sólo llega con la app
 * abierta; esto suena en el bolsillo.
 *
 * Se configura con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. Sin esas
 * variables no hace nada (y lo deja anotado en el log): un aviso que falta
 * nunca debe romper la petición que lo dispara.
 */
async function avisarTelegram(texto, opciones = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log('[telegram] sin configurar: no se envía el aviso');
    return { ok: false, motivo: 'telegram sin configurar' };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: texto,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...opciones,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!d?.ok) {
      console.warn('[telegram] no se pudo enviar:', d?.description || r.status);
    } else {
      // Se registra el ÉXITO también: sin esto, un aviso que sale y uno que
      // nunca se intentó se ven igual en los logs (los dos sin línea).
      console.log(`[telegram] aviso enviado (mensaje ${d?.result?.message_id})`);
    }
    return { ok: !!d?.ok, error: d?.description };
  } catch (e) {
    console.warn('[telegram] error al enviar:', e.message);
    return { ok: false, error: e.message };
  }
}

/** ¿Este correo puede resolver solicitudes? (administración) */
async function esAdministrador(correo) {
  const email = String(correo || '').trim().toLowerCase();
  if (!email) return false;
  if (OWNER_EMAILS.includes(email)) return true;
  const alcance = await alcanceInventario(email);
  return !!alcance.total;
}

/**
 * El usuario pide entrar a una agrupación.
 * No otorga nada: crea el pedido y avisa a los admins en vivo.
 */
app.post('/api/v1/crm/companias/:id/solicitudes', async (req, res) => {
  try {
    await asegurarTablaSolCompania();
    const ident = identidad(req);
    if (!ident.email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    const db = getPool();
    const userId = await exploradorId(ident.email, ident.nombre, ident.foto);

    const [comp] = await db.execute(
      'SELECT id, name FROM companies WHERE id = ? LIMIT 1', [req.params.id]
    );
    if (!comp.length) return res.status(404).json({ ok: false, error: 'agrupación no encontrada' });

    // ¿ya pertenece?
    const [yaMiembro] = await db.execute(
      'SELECT id FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1',
      [userId, req.params.id]
    );
    if (yaMiembro.length) {
      return res.json({ ok: true, ya_pertenece: true, mensaje: `Ya perteneces a ${comp[0].name}.` });
    }

    // ¿ya hay un pedido pendiente?
    const [pendiente] = await db.execute(
      "SELECT id FROM company_requests WHERE user_id = ? AND company_id = ? AND status = 'pendiente' LIMIT 1",
      [userId, req.params.id]
    );
    if (pendiente.length) {
      return res.json({ ok: true, ya_solicitado: true, mensaje: 'Tu solicitud ya está esperando respuesta.' });
    }

    const rolPedido = ['artist', 'coordinator', 'viewer'].includes(req.body?.role_in_company)
      ? req.body.role_in_company : 'artist';
    const id = `sr_${randomUUID().slice(0, 8)}`;
    await db.execute(
      `INSERT INTO company_requests (id, company_id, user_id, role_in_company, mensaje)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.params.id, userId, rolPedido,
       req.body?.mensaje ? String(req.body.mensaje).slice(0, 400) : null]
    );

    // Aviso EN VIVO a los administradores (mismo canal que usa el radar).
    radarEmitir('solicitud_compania', {
      id,
      company_id: comp[0].id,
      company_name: comp[0].name,
      user_id: userId,
      email: ident.email,
      nombre: ident.nombre || ident.email,
      foto: ident.foto || null,
      role_in_company: rolPedido,
      mensaje: req.body?.mensaje || null,
      para_admins: true,
      creado: new Date().toISOString(),
    });

    // Aviso al BOLSILLO del admin. El canal en vivo (SSE) sólo llega con la app
    // abierta; esto suena aunque la tenga cerrada.
    avisarTelegram(
      `🔔 <b>Solicitud de agrupación</b>\n\n` +
      `<b>${ident.nombre || ident.email}</b> quiere entrar a <b>${comp[0].name}</b>` +
      (req.body?.mensaje ? `\n\n“${String(req.body.mensaje).slice(0, 300)}”` : '') +
      `\n\nResolvelo en la app: <b>Perfil → Apariencia y Colores → Pedidos por resolver</b>.`
    ).catch(() => { /* un aviso que falla no rompe la solicitud */ });

    return res.json({ ok: true, id, status: 'pendiente', company_name: comp[0].name });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * PERFIL PÚBLICO DE OTRA PERSONA · /radar/perfil-publico?usuario=<email|id>
 *
 * Hace falta un endpoint aparte porque el hub PISA `?email=` con la identidad
 * verificada de quien llama (así nadie puede suplantar a otro). O sea que
 * `/radar/perfil?email=<otro>` devuelve EL PROPIO perfil, no el del otro: por
 * eso no se podía ver el perfil de otra persona.
 *
 * Aquí el destinatario va en `usuario` (que el middleware no toca) y sólo se
 * devuelven datos PÚBLICOS. Si la persona marcó su perfil como privado, se
 * devuelve apenas lo mínimo para poder mostrarla en el muro (nombre y foto),
 * sin progreso ni ciudad.
 */
app.get('/api/v1/crm/radar/perfil-publico', async (req, res) => {
  try {
    const objetivo = String(req.query.usuario || req.query.user || '').trim();
    if (!objetivo) return res.status(400).json({ ok: false, error: 'falta ?usuario=' });
    const db = getPool();

    const [usuarios] = await db.execute(
      'SELECT id, email, display_name, picture, role, role_title FROM users WHERE LOWER(email) = LOWER(?) OR id = ? LIMIT 1',
      [objetivo, objetivo]
    );
    if (!usuarios.length) return res.status(404).json({ ok: false, error: 'no existe esa persona' });
    const u = usuarios[0];

    const [perfiles] = await db.execute('SELECT * FROM radar_profiles WHERE user_id = ? LIMIT 1', [u.id]);
    const p = perfiles[0] || {};
    const esPublico = p.is_public === undefined ? true : !!p.is_public;

    // Insignias ganadas (nombre + icono), sin exponer nada privado
    let insignias = [];
    try {
      const [b] = await db.execute(
        `SELECT b.id, b.name, b.description, b.icon, ub.earned_at
           FROM radar_user_badges ub JOIN radar_badges b ON b.id = ub.badge_id
          WHERE ub.user_id = ? ORDER BY ub.earned_at DESC`,
        [u.id]
      );
      insignias = b;
    } catch { /* la tabla puede no existir todavía */ }

    return res.json({
      ok: true,
      persona: {
        id: u.id,
        email: u.email,
        nombre: u.display_name || u.email,
        foto: u.picture || null,
        cargo: u.role_title || '',
        // el rol interno no se expone: sólo si es parte de dirección
        es_direccion: ['admin', 'director'].includes(String(u.role || '').toLowerCase()),
        explorer_number: p.explorer_number || '',
        nivel: p.level || 1,
        xp: p.xp || 0,
        ciudad: esPublico ? (p.city || '') : '',
        bio: esPublico ? (p.bio || '') : '',
        descubiertos: p.descubiertos || 0,
        es_publico: esPublico,
        insignias,
      },
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * ¿Esta cuenta puede CREAR una agrupación nueva?
 *
 * Dirección y producción sí; el resto pide entrar a una que ya existe (y la aprueba
 * un administrador). Se mira el rol de la cuenta, el rol dentro de alguna compañía y
 * la ficha de la nómina, porque las tres capas usan vocabularios distintos:
 *   - cuenta (`users.role`): admin | director | productor/producer
 *   - compañía (`company_members.role_in_company`): owner | director | coordinator
 *   - nómina (`company_people`): kind 'socio' o cargo con dirección/producción
 * Los cargos van sin acento en la comparación (`direcc%`, `producc%`) porque en el CRM
 * conviven "Dirección General" y "Direccion General".
 */
const ROLES_CUENTA_DIRECCION = ['admin', 'director', 'productor', 'producer', 'ceo'];
const ROLES_COMPANIA_DIRECCION = ['owner', 'director', 'coordinator', 'productor', 'producer'];

async function puedeCrearAgrupacion(userId) {
  const db = getPool();
  const marcadores = ROLES_COMPANIA_DIRECCION.map(() => '?').join(', ');
  const [filas] = await db.execute(
    `SELECT u.role,
            (SELECT COUNT(*) FROM company_members cm
              WHERE cm.user_id = u.id
                AND LOWER(COALESCE(cm.role_in_company, '')) IN (${marcadores})) AS en_compania,
            (SELECT COUNT(*) FROM company_people cp
              WHERE LOWER(COALESCE(cp.email, '')) = LOWER(COALESCE(u.email, ''))
                AND (LOWER(COALESCE(cp.kind, '')) IN ('socio', 'direccion', 'director')
                     OR LOWER(COALESCE(cp.role_title, '')) LIKE '%direcc%'
                     OR LOWER(COALESCE(cp.role_title, '')) LIKE '%producc%')) AS en_nomina
       FROM users u WHERE u.id = ? LIMIT 1`,
    [...ROLES_COMPANIA_DIRECCION, userId]
  );
  if (!filas.length) return false;
  const rol = String(filas[0].role || '').toLowerCase();
  return ROLES_CUENTA_DIRECCION.includes(rol) || !!filas[0].en_compania || !!filas[0].en_nomina;
}

/**
 * MIS AGRUPACIONES · a cuáles pertenezco DE VERDAD (no los pedidos).
 *
 * Faltaba: el panel mostraba sólo las solicitudes, así que alguien que YA
 * pertenecía a una compañía (cargada en el CRM) la veía como si no estuviera.
 * Reportado: "cuando me registré en Tenoia Musicalis eso debería haberme
 * añadido como miembro y no se ve reflejado".
 */
app.get('/api/v1/crm/companias/mias', async (req, res) => {
  try {
    const ident = identidad(req);
    if (!ident.email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    const db = getPool();
    const userId = await exploradorId(ident.email, ident.nombre, ident.foto);
    const [filas] = await db.execute(
      `SELECT cm.company_id, c.name AS company_name, cm.role_in_company, cm.joined_at
         FROM company_members cm
         JOIN companies c ON c.id = cm.company_id
        WHERE cm.user_id = ?
        ORDER BY c.name`,
      [userId]
    );
    const [nomina] = await db.execute(
      `SELECT cp.company_id, c.name AS company_name, cp.role_title, cp.kind
         FROM company_people cp
         JOIN companies c ON c.id = cp.company_id
        WHERE LOWER(cp.email) = LOWER(?)
        ORDER BY c.name`,
      [ident.email]
    );
    return res.json({
      ok: true,
      total: filas.length,
      agrupaciones: filas,
      // La nómina es otro vínculo (equipo/elenco) y también da alcance de datos.
      nomina: nomina || [],
      // Dirección/producción: la app muestra "crear agrupación" en el mismo selector.
      puede_crear: await puedeCrearAgrupacion(userId),
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * CREAR UNA AGRUPACIÓN · POST /api/v1/crm/companias/nueva
 *
 * Sólo dirección/producción (ver `puedeCrearAgrupacion`). El creador NO queda como
 * pedido: entra directo como `owner` de la compañía nueva y además se le deja ficha en
 * la nómina, porque la app lee `company_members` y el CRM lee `company_people`; si se
 * creara sólo una de las dos, la agrupación nacía "sin nadie" en alguno de los dos lados.
 */
app.post('/api/v1/crm/companias/nueva', async (req, res) => {
  try {
    const ident = identidad(req);
    // Identidad verificada antes que el body (el body es spoofeable).
    const emailSesion = emailDeSesion(req) || ident.email;
    if (!emailSesion) return res.status(400).json({ ok: false, error: 'falta el correo' });
    ident.email = emailSesion;
    const db = getPool();
    const userId = await exploradorId(ident.email, ident.nombre, ident.foto);
    if (!(await puedeCrearAgrupacion(userId))) {
      return res.status(403).json({
        ok: false,
        error: 'Sólo dirección o producción puede crear una agrupación. Puedes pedir entrar a una de las que ya existen.',
      });
    }

    const nombre = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
    if (nombre.length < 3) return res.status(400).json({ ok: false, error: 'El nombre necesita al menos 3 letras.' });
    if (nombre.length > 120) return res.status(400).json({ ok: false, error: 'El nombre es muy largo (máx. 120).' });

    const [repetida] = await db.execute(
      'SELECT id, name FROM companies WHERE LOWER(name) = LOWER(?) LIMIT 1', [nombre]
    );
    if (repetida.length) {
      return res.status(409).json({
        ok: false, error: `Ya existe una agrupación con ese nombre (${repetida[0].name}).`,
        company_id: repetida[0].id,
      });
    }

    // 'propia' (marca ATHA) sólo para administración: quien crea su agrupación entra
    // como colaboradora, que es lo que es.
    const kind = (req.body?.kind === 'propia' && (await esAdministrador(ident.email))) ? 'propia' : 'colaboradora';
    const disciplina = String(req.body?.discipline || '').slice(0, 160);
    const descripcion = String(req.body?.description || '').slice(0, 2000);
    const ciudad = String(req.body?.city || '').slice(0, 120);
    const contacto = String(req.body?.contactEmail || ident.email).slice(0, 255);
    const id = 'comp_' + randomUUID().replace(/-/g, '').slice(0, 12);
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || id;

    await db.execute(
      `INSERT INTO companies (id, name, legal_name, slug, status, created_by, discipline, kind,
         description, contact_email, city, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, nombre, nombre, slug, userId, disciplina, kind, descripcion, contacto, ciudad]
    );

    // El creador queda DENTRO, como owner.
    await db.execute(
      'INSERT INTO company_members (id, company_id, user_id, role_in_company) VALUES (?, ?, ?, ?)',
      [idCorto('cm_'), id, userId, 'owner']
    );

    // Y con ficha en la nómina, para que el CRM la muestre igual que a las demás.
    const [cuenta] = await db.execute('SELECT display_name, email FROM users WHERE id = ? LIMIT 1', [userId]);
    await db.execute(
      `INSERT INTO company_people (id, company_id, full_name, role_title, character_name, kind,
         email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, '', 'equipo', ?, '', NOW(), NOW())`,
      [randomUUID(), id, (cuenta[0] && cuenta[0].display_name) || ident.email, 'Dirección',
       (cuenta[0] && cuenta[0].email) || ident.email]
    );

    radarEmitir('agrupacion_nueva', {
      id, name: nombre, kind, owner: ident.email,
      nombre_owner: ident.nombre || ident.email, para_admins: true,
      creado: new Date().toISOString(),
    });
    avisarTelegram(
      `🏛️ <b>Agrupación nueva</b>\n\n<b>${nombre}</b> la creó ${ident.nombre || ident.email}` +
      (disciplina ? `\nDisciplina: ${disciplina}` : '') +
      `\n\nQueda como <b>${kind}</b> y su creador entra como <b>owner</b>.`
    ).catch(() => { /* un aviso que falla no rompe la creación */ });

    return res.json({
      ok: true,
      company: { id, name: nombre, kind, discipline: disciplina, city: ciudad },
      role_in_company: 'owner',
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * AGENDA CULTURAL · GET /api/v1/crm/radar/eventos
 *
 * Alimenta el INICIO de la app. Dos fuentes REALES, sin inventar nada:
 *   - `eventos`: la tabla `events` (la misma que usa el calendario del CRM), con los
 *     que todavía no pasaron y ordenados por fecha.
 *   - `cartelera`: las obras públicas (`projects.is_public = 1`) con su agrupación.
 * Si no hay eventos cargados, la app lo dice y muestra la cartelera; nunca rellena
 * con datos de ejemplo (regla de la casa: si falta el dato, se ve que falta).
 *
 * GEOLOCALIZACIÓN: con `?lat=&lng=` cada evento trae `distance_m` (desde el lugar
 * —`events.lat/lng` o, si falta, el `venues` del evento—) y la lista se ordena por
 * cercanía; los eventos sin coordenadas van al final, ordenados por fecha. `radio_km`
 * filtra por distancia (sólo aplica a los que tienen coordenadas).
 */
app.get('/api/v1/crm/radar/eventos', async (req, res) => {
  try {
    const db = getPool();
    await asegurarColumnasAgenda();
    const hoy = new Date().toISOString().slice(0, 10);
    const desde = String(req.query.desde || hoy);
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;
    const radioKm = req.query.radio_km !== undefined ? Number(req.query.radio_km) : null;
    // Los BORRADORES (is_public = 0) sólo los ve administración: es lo que necesita el
    // panel de agenda del CRM para preparar una función antes de publicarla. La app
    // nunca los pide, y si alguien lo fuerza sin permiso, la respuesta es la pública.
    let verBorradores = false;
    if (req.query.incluir_borradores) {
      const alcance = await alcanceInventario(emailDeSesion(req) || req.headers['x-atha-email'] || req.query.email || '');
      verBorradores = !!alcance.total;
    }
    const [eventos] = await db.execute(
      `SELECT e.id, e.title, e.obra_id, e.obra_title, e.type, e.date, e.date_end, e.time_start, e.time_end,
              e.venue, e.venue_id, e.status, e.notes, e.city, e.ticket_url, e.image_url,
              e.source, e.source_url,
              e.lat AS lat_propia, e.lng AS lng_propia,
              v.name AS venue_name, v.lat AS lat_venue, v.lng AS lng_venue,
              p.discipline, p.image_url AS obra_imagen, p.location, p.synopsis,
              c.id AS company_id, c.name AS company_name
         FROM events e
         LEFT JOIN venues v ON v.id = e.venue_id
         LEFT JOIN projects p ON p.id = e.obra_id
         LEFT JOIN companies c ON c.id = p.company_id
        WHERE e.date >= ? ${verBorradores ? '' : 'AND (e.is_public IS NULL OR e.is_public = 1)'}
        ORDER BY e.date ASC, e.time_start ASC
        LIMIT 120`,
      [desde]
    );

    const conDistancia = eventos.map((e) => {
      const la = e.lat_propia !== null && e.lat_propia !== undefined ? Number(e.lat_propia) : (e.lat_venue !== null ? Number(e.lat_venue) : null);
      const lo = e.lng_propia !== null && e.lng_propia !== undefined ? Number(e.lng_propia) : (e.lng_venue !== null ? Number(e.lng_venue) : null);
      const tiene = la !== null && lo !== null && isFinite(la) && isFinite(lo);
      const distance = (tiene && lat !== null && lng !== null && isFinite(lat) && isFinite(lng))
        ? Math.round(distanciaMetros(lat, lng, la, lo))
        : null;
      const { lat_propia, lng_propia, lat_venue, lng_venue, ...resto } = e;
      return { ...resto, lat: la, lng: lo, tiene_coords: tiene, distance_m: distance };
    });

    let lista = conDistancia;
    if (radioKm !== null && isFinite(radioKm) && radioKm > 0) {
      lista = lista.filter((e) => e.distance_m === null || e.distance_m <= radioKm * 1000);
    }
    if (lat !== null && lng !== null) {
      // Cercanía primero; lo que no tiene coordenadas conserva el orden por fecha.
      const conDist = lista.filter((e) => e.distance_m !== null).sort((a, b) => a.distance_m - b.distance_m);
      const sinDist = lista.filter((e) => e.distance_m === null);
      lista = [...conDist, ...sinDist];
    }

    const [cartelera] = await db.execute(
      `SELECT p.id, p.title, p.discipline, p.status, p.synopsis, p.image_url, p.location,
              p.premiere_date, p.category, p.year,
              c.id AS company_id, c.name AS company_name
         FROM projects p
         LEFT JOIN companies c ON c.id = p.company_id
        WHERE p.is_public = 1
        ORDER BY p.title
        LIMIT 60`
    );
    return res.json({
      ok: true, desde, eventos: lista, cartelera,
      total_eventos: lista.length,
      // Los que tienen lugar geolocalizado: es lo que hace posible "cerca de mí".
      con_ubicacion: lista.filter((e) => e.tiene_coords).length,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message, eventos: [], cartelera: [] });
  }
});

/**
 * PUBLICAR UN EVENTO · POST /api/v1/crm/radar/eventos
 *
 * Cómo se puebla la cartelera (lo que pidió Francisco): la producción carga sus
 * funciones aquí y quedan visibles en el inicio de la app con hora y lugar. Después
 * el mismo camino sirve para lo externo (ver `source`/`source_url`: manual | atha |
 * externo), pero cada alta externa tiene que traer SU fuente, no inventarse.
 *
 * Permiso: administración, o quien manda en la compañía dueña de la obra.
 */
app.post('/api/v1/crm/radar/eventos', async (req, res) => {
  try {
    await asegurarColumnasAgenda();
    const ident = identidad(req);
    const email = emailDeSesion(req) || ident.email;
    if (!email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    const db = getPool();
    const userId = await exploradorId(email, ident.nombre, ident.foto);

    const b = req.body || {};
    const titulo = String(b.title || '').trim().replace(/\s+/g, ' ');
    if (titulo.length < 3) return res.status(400).json({ ok: false, error: 'El título necesita al menos 3 letras.' });
    const fecha = String(b.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ ok: false, error: 'La fecha va como AAAA-MM-DD.' });
    const hora = b.time_start ? String(b.time_start).slice(0, 8) : null;
    if (hora && !/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) {
      return res.status(400).json({ ok: false, error: 'La hora va como HH:MM.' });
    }

    // ¿Puede publicar? Admin, o dueño/dirección/coordinación de la compañía de la obra.
    const esAdmin = await esAdministrador(email);
    let empresaObra = null;
    if (b.obra_id) {
      const [o] = await db.execute('SELECT company_id FROM projects WHERE id = ? LIMIT 1', [String(b.obra_id)]);
      empresaObra = (o[0] && o[0].company_id) || null;
    }
    let puede = esAdmin;
    if (!puede && empresaObra) {
      const [m] = await db.execute(
        `SELECT role_in_company FROM company_members
          WHERE user_id = ? AND company_id = ? AND LOWER(role_in_company) IN ('owner','director','coordinator','productor') LIMIT 1`,
        [userId, empresaObra]
      );
      puede = m.length > 0;
    }
    if (!puede) {
      return res.status(403).json({
        ok: false,
        error: 'Sólo la producción de la agrupación (o administración) puede publicar eventos.',
      });
    }

    // Lugar: venue del CRM, coordenadas propias o texto libre.
    let venueId = b.venue_id ? String(b.venue_id).slice(0, 36) : null;
    if (!venueId && b.venue) {
      const [v] = await db.execute('SELECT id FROM venues WHERE LOWER(name) = LOWER(?) LIMIT 1', [String(b.venue).trim()]);
      venueId = (v[0] && v[0].id) || null;
    }
    const lat = b.lat !== undefined && b.lat !== null && b.lat !== '' ? Number(b.lat) : null;
    const lng = b.lng !== undefined && b.lng !== null && b.lng !== '' ? Number(b.lng) : null;

    const id = `ev_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const tipo = String(b.type || 'Función').slice(0, 50);
    const estado = String(b.status || 'Confirmado').slice(0, 20);
    // date_end: sólo para muestras de varios días (exposiciones). Si viene igual a la fecha
    // de inicio, se guarda NULL (una función es de un día).
    const fin = b.date_end ? String(b.date_end).slice(0, 10) : null;
    const fechaFin = fin && /^\d{4}-\d{2}-\d{2}$/.test(fin) && fin > fecha ? fin : null;
    await db.execute(
      `INSERT INTO events (id, owner_id, title, obra_id, obra_title, type, date, date_end, time_start, time_end,
         venue, venue_id, cast_count, status, notes, city, lat, lng, is_public, image_url, ticket_url,
         source, source_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, userId, titulo, b.obra_id || null, String(b.obra_title || '').slice(0, 255) || null, tipo,
       fecha, fechaFin, hora, b.time_end ? String(b.time_end).slice(0, 8) : null,
       String(b.venue || '').slice(0, 255) || null, venueId, Number(b.cast_count) || null, estado,
       String(b.notes || '') || null, String(b.city || '').slice(0, 120) || null,
       isFinite(lat) ? lat : null, isFinite(lng) ? lng : null,
       b.is_public === false ? 0 : 1, String(b.image_url || '').slice(0, 512) || null,
       String(b.ticket_url || '').slice(0, 512) || null,
       String(b.source || 'atha').slice(0, 40), String(b.source_url || '').slice(0, 512) || null]
    );

    radarEmitir('evento_nuevo', { id, title: titulo, date: fecha, time_start: hora, venue: b.venue || null });
    avisarTelegram(
      `🎭 <b>${b.is_public === false ? 'Función cargada (borrador)' : 'Función publicada'}</b>\n\n<b>${titulo}</b>\n${fecha}${hora ? ` · ${hora.slice(0, 5)}` : ''}` +
      (fechaFin ? ` (muestra hasta el ${fechaFin})` : '') +
      (b.venue ? `\n${b.venue}` : '') +
      (b.is_public === false ? `\n\nQueda en borrador hasta que la publiquen.` : '') +
      `\n\nLa cargó ${ident.nombre || email}.`
    ).catch(() => { /* un aviso que falla no rompe la publicación */ });

    return res.json({ ok: true, id, title: titulo, date: fecha });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * Editar una función ya publicada (administración o producción de la agrupación dueña).
 * Igual que el alta: sólo se pisa lo que viene en el cuerpo. `date_end` se limpia si la
 * nueva fecha de fin no es posterior al inicio (una función es de un día).
 */
app.patch('/api/v1/crm/radar/eventos/:id', async (req, res) => {
  try {
    const db = getPool();
    await asegurarColumnasAgenda();
    const ident = identidad(req);
    const email = emailDeSesion(req) || ident.email;
    if (!email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    const [filas] = await db.execute('SELECT * FROM events WHERE id = ? LIMIT 1', [req.params.id]);
    if (!filas.length) return res.status(404).json({ ok: false, error: 'evento no encontrado' });
    const actual = filas[0];
    const userId = await exploradorId(email, ident.nombre, ident.foto);
    let empresaObra = null;
    const obraId = (req.body || {}).obra_id !== undefined ? (req.body.obra_id || null) : actual.obra_id;
    if (obraId) {
      const [o] = await db.execute('SELECT company_id FROM projects WHERE id = ? LIMIT 1', [String(obraId)]);
      empresaObra = (o[0] && o[0].company_id) || null;
    }
    let puede = await esAdministrador(email);
    if (!puede && empresaObra) {
      const [m] = await db.execute(
        `SELECT role_in_company FROM company_members
          WHERE user_id = ? AND company_id = ? AND LOWER(role_in_company) IN ('owner','director','coordinator','productor') LIMIT 1`,
        [userId, empresaObra]);
      puede = m.length > 0;
    }
    if (!puede) return res.status(403).json({ ok: false, error: 'Sólo la producción de la agrupación (o administración) puede editar eventos.' });

    const b = req.body || {};
    const alias = { lat: 'lat', lng: 'lng' };
    const campos = {
      title: b.title !== undefined ? String(b.title).trim().slice(0, 255) : undefined,
      obra_id: b.obra_id !== undefined ? (b.obra_id || null) : undefined,
      obra_title: b.obra_title !== undefined ? (String(b.obra_title || '').slice(0, 255) || null) : undefined,
      type: b.type !== undefined ? (String(b.type || 'Función').slice(0, 50)) : undefined,
      date: b.date !== undefined ? String(b.date).slice(0, 10) : undefined,
      time_start: b.time_start !== undefined ? (b.time_start ? String(b.time_start).slice(0, 8) : null) : undefined,
      time_end: b.time_end !== undefined ? (b.time_end ? String(b.time_end).slice(0, 8) : null) : undefined,
      venue: b.venue !== undefined ? (String(b.venue || '').slice(0, 255) || null) : undefined,
      venue_id: b.venue_id !== undefined ? (b.venue_id ? String(b.venue_id).slice(0, 36) : null) : undefined,
      cast_count: b.cast_count !== undefined ? (Number(b.cast_count) || null) : undefined,
      status: b.status !== undefined ? (String(b.status || '').slice(0, 20) || null) : undefined,
      notes: b.notes !== undefined ? (String(b.notes || '') || null) : undefined,
      city: b.city !== undefined ? (String(b.city || '').slice(0, 120) || null) : undefined,
      lat: b.lat !== undefined ? (b.lat === null || b.lat === '' ? null : Number(b.lat)) : undefined,
      lng: b.lng !== undefined ? (b.lng === null || b.lng === '' ? null : Number(b.lng)) : undefined,
      is_public: b.is_public !== undefined ? (b.is_public ? 1 : 0) : undefined,
      image_url: b.image_url !== undefined ? (String(b.image_url || '').slice(0, 512) || null) : undefined,
      ticket_url: b.ticket_url !== undefined ? (String(b.ticket_url || '').slice(0, 512) || null) : undefined,
      source: b.source !== undefined ? (String(b.source || '').slice(0, 40) || null) : undefined,
      source_url: b.source_url !== undefined ? (String(b.source_url || '').slice(0, 512) || null) : undefined,
      date_end: b.date_end !== undefined ? (b.date_end ? String(b.date_end).slice(0, 10) : null) : undefined,
    };
    if (campos.title !== undefined && campos.title.length < 3) {
      return res.status(400).json({ ok: false, error: 'El título necesita al menos 3 letras.' });
    }
    if (campos.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(campos.date)) {
      return res.status(400).json({ ok: false, error: 'La fecha va como AAAA-MM-DD.' });
    }
    if (campos.time_start && !/^\d{2}:\d{2}(:\d{2})?$/.test(campos.time_start)) {
      return res.status(400).json({ ok: false, error: 'La hora va como HH:MM.' });
    }
    const claves = Object.keys(campos).filter((k) => campos[k] !== undefined);
    if (!claves.length) return res.status(400).json({ ok: false, error: 'no hay nada para actualizar' });
    // La fecha de fin sólo tiene sentido si es posterior al inicio (si no, se limpia).
    if (campos.date_end) {
      const inicio = campos.date !== undefined ? campos.date : String(actual.date).slice(0, 10);
      if (!(campos.date_end > inicio)) campos.date_end = null;
    }
    await db.execute(`UPDATE events SET ${claves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...claves.map((k) => campos[k]), req.params.id]);
    radarEmitir('evento_actualizado', { id: req.params.id });
    return res.json({ ok: true, id: req.params.id });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Dar de baja una función (administración o producción de la agrupación dueña). */
app.delete('/api/v1/crm/radar/eventos/:id', async (req, res) => {
  try {
    const db = getPool();
    const ident = identidad(req);
    const email = (req.body && req.body.email) || ident.email || req.headers['x-atha-email'] || '';
    const [filas] = await db.execute('SELECT id, title, obra_id FROM events WHERE id = ? LIMIT 1', [req.params.id]);
    if (!filas.length) return res.status(404).json({ ok: false, error: 'evento no encontrado' });
    let puede = await esAdministrador(email);
    if (!puede && filas[0].obra_id) {
      const [o] = await db.execute('SELECT company_id FROM projects WHERE id = ? LIMIT 1', [filas[0].obra_id]);
      const empresa = (o[0] && o[0].company_id) || null;
      if (empresa) {
        const userId = await exploradorId(email);
        const [m] = await db.execute(
          `SELECT role_in_company FROM company_members
            WHERE user_id = ? AND company_id = ? AND LOWER(role_in_company) IN ('owner','director','coordinator','productor') LIMIT 1`,
          [userId, empresa]);
        puede = m.length > 0;
      }
    }
    if (!puede) return res.status(403).json({ ok: false, error: 'Sólo la producción de la agrupación (o administración) puede dar de baja eventos.' });
    await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    radarEmitir('evento_eliminado', { id: req.params.id });
    return res.json({ ok: true, id: req.params.id, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Prueba del aviso por Telegram (sólo administración). */
app.post('/api/v1/crm/avisos/probar', async (req, res) => {
  try {
    const ident = identidad(req);
    if (!ident.email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    if (!(await esAdministrador(ident.email))) {
      return res.status(403).json({ ok: false, error: 'sólo administración' });
    }
    const r = await avisarTelegram(
      '✅ <b>Avisos de ATHA configurados</b>\n\nAsí te voy a avisar cuando alguien pida entrar a una agrupación.'
    );
    return res.json({ ok: !!r.ok, ...r });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * Lista de solicitudes.
 *  - administración: todas las pendientes (para aprobar/rechazar)
 *  - el resto: las propias (para ver en qué quedaron)
 */
app.get('/api/v1/crm/companias/solicitudes', async (req, res) => {
  try {
    await asegurarTablaSolCompania();
    const db = getPool();
    const correo = String(req.query.email || req.headers['x-atha-email'] || '').trim().toLowerCase();
    if (!correo) return res.status(400).json({ ok: false, error: 'falta el correo' });
    const admin = await esAdministrador(correo);
    const userId = await exploradorId(correo);

    const sql = `
      SELECT s.id, s.company_id, c.name AS company_name, s.user_id,
             u.display_name AS nombre, u.email AS email, u.picture AS foto,
             s.role_in_company, s.mensaje, s.status, s.created_at, s.resuelto_at
      FROM company_requests s
      JOIN companies c ON c.id = s.company_id
      JOIN users u ON u.id = s.user_id
      ${admin ? '' : 'WHERE s.user_id = ?'}
      ORDER BY s.created_at DESC
      LIMIT 100`;
    const [filas] = await db.execute(sql, admin ? [] : [userId]);

    return res.json({ ok: true, admin, total: filas.length, solicitudes: filas });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * Resolver una solicitud: aceptar (agrega la membresía) o rechazar.
 * Sólo administración.
 */
app.post('/api/v1/crm/companias/solicitudes/:id/resolver', async (req, res) => {
  try {
    await asegurarTablaSolCompania();
    const ident = identidad(req);
    if (!ident.email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    if (!(await esAdministrador(ident.email))) {
      return res.status(403).json({ ok: false, error: 'sólo administración puede resolver solicitudes' });
    }

    const decision = String(req.body?.decision || '').toLowerCase();
    const aceptar = decision === 'aceptar' || decision === 'aprobar' || decision === 'si';
    if (!['aceptar', 'aprobar', 'si', 'rechazar', 'negar', 'no'].includes(decision)) {
      return res.status(400).json({ ok: false, error: "decision debe ser 'aceptar' o 'rechazar'" });
    }

    const db = getPool();
    const [sol] = await db.execute(
      `SELECT s.*, c.name AS company_name, u.email AS email, u.display_name AS nombre
       FROM company_requests s
       JOIN companies c ON c.id = s.company_id
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!sol.length) return res.status(404).json({ ok: false, error: 'solicitud no encontrada' });
    const s = sol[0];
    if (s.status !== 'pendiente') {
      return res.json({ ok: true, status: s.status, mensaje: `La solicitud ya estaba ${s.status}.` });
    }

    const yo = await exploradorId(ident.email, ident.nombre, ident.foto);
    const nuevoEstado = aceptar ? 'aceptada' : 'rechazada';

    if (aceptar) {
      // El rol final lo puede ajustar el admin; por defecto, el pedido.
      const rolFinal = ['owner', 'coordinator', 'director', 'artist', 'viewer'].includes(req.body?.role_in_company)
        ? req.body.role_in_company : (s.role_in_company || 'artist');
      const [ya] = await db.execute(
        'SELECT id FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1',
        [s.user_id, s.company_id]
      );
      if (ya.length) {
        await db.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?', [rolFinal, ya[0].id]);
      } else {
        await db.execute(
          `INSERT INTO company_members (id, company_id, user_id, role_in_company)
           VALUES (?, ?, ?, ?)`,
          [`cm_${randomUUID().slice(0, 8)}`, s.company_id, s.user_id, rolFinal]
        );
      }
    }

    await db.execute(
      'UPDATE company_requests SET status = ?, resuelto_por = ?, resuelto_at = NOW() WHERE id = ?',
      [nuevoEstado, yo, req.params.id]
    );

    // Aviso en vivo: al solicitante (y a los admins para que la lista se actualice)
    radarEmitir('solicitud_resuelta', {
      id: req.params.id,
      company_id: s.company_id,
      company_name: s.company_name,
      email: s.email,
      nombre: s.nombre,
      status: nuevoEstado,
      decidido_por: ident.email,
    });

    return res.json({
      ok: true, status: nuevoEstado, company_name: s.company_name,
      mensaje: aceptar
        ? `${s.nombre || s.email} ahora pertenece a ${s.company_name}.`
        : `Se rechazó la solicitud de ${s.nombre || s.email} a ${s.company_name}.`,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Asignación DIRECTA por un admin (sin solicitud previa). */
app.post('/api/v1/crm/companias/:id/miembros', async (req, res) => {
  try {
    const ident = identidad(req);
    if (!ident.email) return res.status(400).json({ ok: false, error: 'falta el correo' });
    if (!(await esAdministrador(ident.email))) {
      return res.status(403).json({ ok: false, error: 'sólo administración puede asignar agrupaciones' });
    }
    const correo = String(req.body?.email_destino || req.body?.emailDestino || '').trim().toLowerCase();
    if (!correo) return res.status(400).json({ ok: false, error: 'falta email_destino' });

    const db = getPool();
    const [comp] = await db.execute('SELECT id, name FROM companies WHERE id = ? LIMIT 1', [req.params.id]);
    if (!comp.length) return res.status(404).json({ ok: false, error: 'agrupación no encontrada' });

    const userId = await exploradorId(correo);
    if (!userId) return res.status(404).json({ ok: false, error: 'ese correo no tiene usuario' });

    const rol = ['owner', 'coordinator', 'director', 'artist', 'viewer'].includes(req.body?.role_in_company)
      ? req.body.role_in_company : 'artist';
    const [ya] = await db.execute(
      'SELECT id FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1', [userId, comp[0].id]
    );
    if (ya.length) {
      await db.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?', [rol, ya[0].id]);
    } else {
      await db.execute(
        'INSERT INTO company_members (id, company_id, user_id, role_in_company) VALUES (?, ?, ?, ?)',
        [`cm_${randomUUID().slice(0, 8)}`, comp[0].id, userId, rol]
      );
    }
    radarEmitir('solicitud_resuelta', {
      company_id: comp[0].id, company_name: comp[0].name, email: correo,
      status: 'aceptada', decidido_por: ident.email, directo: true,
    });
    return res.json({ ok: true, company_name: comp[0].name, mensaje: `${correo} quedó en ${comp[0].name} como ${rol}.` });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// CHAT INTERNO DE COMPANIA (módulo recuperado del working tree)
// ---------------------------------------------------------------------------
app.get('/api/v1/crm/chat/messages', async (req, res) => {
  try {
    const db = getPool();
    const email = req.headers['x-atha-email'];
    if (!email) return res.status(401).json({ success: false, error: 'No email provided' });
    const companyId = req.query.company_id;
    const since = req.query.since;
    let query = 'SELECT m.id, m.company_id, m.sender_id, m.content, m.sent_at, u.display_name as sender_name, u.picture as sender_picture FROM chat_messages m JOIN users u ON m.sender_id = u.id WHERE 1=1';
    const params = [];
    if (companyId) {
      query += ' AND m.company_id = ?';
      params.push(companyId);
    }
    if (since) {
      query += ' AND m.sent_at > ?';
      params.push(since);
    }
    query += ' ORDER BY m.sent_at ASC';
    const [rows] = await db.execute(query, params);
    return res.json({ success: true, messages: rows });
  } catch (e) {
    console.error('[chat messages GET] error:', e);
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.post('/api/v1/crm/chat/messages', async (req, res) => {
  try {
    const db = getPool();
    const email = req.headers['x-atha-email'];
    if (!email) return res.status(401).json({ success: false, error: 'No email provided' });
    const [userRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (!userRows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const senderId = userRows[0].id;
    const { company_id, content } = req.body;
    if (!company_id) return res.status(400).json({ success: false, error: 'company_id required' });
    if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'content required' });
    // Validate that sender is a member of the company
    const [memberRows] = await db.execute('SELECT 1 FROM company_members WHERE company_id = ? AND user_id = ?', [company_id, senderId]);
    if (!memberRows.length) return res.status(403).json({ success: false, error: 'User is not a member of the company' });
    const id = randomUUID();
    await db.execute(
      'INSERT INTO chat_messages (id, company_id, sender_id, content) VALUES (?, ?, ?, ?)',
      [id, company_id, senderId, content.trim()]
    );
    // Emit SSE? For now just return success.
    return res.json({ success: true, data: { id } });
  } catch (e) {
    console.error('[chat messages POST] error:', e);
    return res.status(503).json({ success: false, error: e.message });
  }
});

app.patch('/api/v1/crm/chat/messages/:id/read', async (req, res) => {
  try {
    const db = getPool();
    const email = req.headers['x-atha-email'];
    if (!email) return res.status(401).json({ success: false, error: 'No email provided' });
    const [userRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (!userRows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const userId = userRows[0].id;
    const messageId = req.params.id;
    // For now, we just return success; the client can keep track of last read timestamp.
    // In a future version, we could add a read_at column to the table.
    return res.json({ success: true });
  } catch (e) {
    console.error('[chat messages PATCH] error:', e);
    return res.status(503).json({ success: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// PRUEBA PILOTO · inscripciones
//
// Página pública (/piloto) para que la gente se anote al piloto de flujo, más un
// endpoint para listar las anotaciones (sólo administración). Vive en una tabla
// aparte: no toca datos de producción ni requiere sesión para anotarse.
//
// La lista se lee desde /api/v1/crm/piloto/inscripciones con la identidad de una
// cuenta de administración (x-atha-email), igual que el resto del panel.
// ---------------------------------------------------------------------------
let tablaPilotoLista = false;
async function asegurarTablaPiloto(db) {
  if (tablaPilotoLista) return;
  await db.execute(
    `CREATE TABLE IF NOT EXISTS piloto_inscripciones (
       id             VARCHAR(40)  NOT NULL PRIMARY KEY,
       nombre         VARCHAR(160) NOT NULL,
       email          VARCHAR(255) NOT NULL,
       telefono       VARCHAR(40)  NULL,
       company_id     VARCHAR(64)  NULL,
       company_name   VARCHAR(160) NULL,
       rol            VARCHAR(40)  NULL,
       dispositivo    VARCHAR(40)  NULL,
       disponibilidad VARCHAR(400) NULL,
       comentario     VARCHAR(1000) NULL,
       estado         VARCHAR(20)  NOT NULL DEFAULT 'anotado',
       created_at     DATETIME     NOT NULL,
       updated_at     DATETIME     NOT NULL,
       UNIQUE KEY uq_piloto_email (email)
     )`
  );
  tablaPilotoLista = true;
}

/** Alta (o actualización) de una inscripción al piloto. Público, sin sesión. */
app.post('/api/v1/crm/piloto/inscripciones', async (req, res) => {
  try {
    const b = req.body || {};
    const nombre = String(b.nombre || '').trim().slice(0, 160);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 255);
    if (!nombre) return res.status(400).json({ ok: false, error: 'Falta el nombre.' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'El correo no parece válido.' });
    }
    if (!b.acepta) return res.status(400).json({ ok: false, error: 'Hay que aceptar participar para anotarse.' });

    const db = getPool();
    await asegurarTablaPiloto(db);

    let companyName = String(b.company_name || '').trim().slice(0, 160) || null;
    const companyId = String(b.company_id || '').trim().slice(0, 64) || null;
    if (companyId && !companyName) {
      const [c] = await db.execute('SELECT name FROM companies WHERE id = ? LIMIT 1', [companyId]);
      if (c.length) companyName = c[0].name;
    }

    const id = 'pi_' + randomBytes(8).toString('hex');
    await db.execute(
      `INSERT INTO piloto_inscripciones
         (id, nombre, email, telefono, company_id, company_name, rol, dispositivo, disponibilidad, comentario, estado, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,'anotado',NOW(),NOW())
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre), telefono = VALUES(telefono),
         company_id = VALUES(company_id), company_name = VALUES(company_name),
         rol = VALUES(rol), dispositivo = VALUES(dispositivo),
         disponibilidad = VALUES(disponibilidad), comentario = VALUES(comentario),
         updated_at = NOW()`,
      [id, nombre, email, String(b.telefono || '').slice(0, 40) || null, companyId, companyName,
       String(b.rol || '').slice(0, 40) || null, String(b.dispositivo || '').slice(0, 40) || null,
       String(b.disponibilidad || '').slice(0, 400) || null, String(b.comentario || '').slice(0, 1000) || null]
    );
    return res.json({
      ok: true,
      mensaje: `${nombre}, quedaste anotado en la prueba del ecosistema FASE. Antes de arrancar mira la guía de 5 pasos (${URL_HUB_PUBLICA}/guia) y, si algo te estorba, usa “Reportar algo” adentro de la app.`,
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Lista de anotados (sólo administración). */
app.get('/api/v1/crm/piloto/inscripciones', async (req, res) => {
  try {
    const alcance = await alcanceInventario(req.query.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const db = getPool();
    await asegurarTablaPiloto(db);
    const [filas] = await db.execute(
      `SELECT id, nombre, email, telefono, company_name, rol, dispositivo, disponibilidad,
              comentario, estado, created_at
         FROM piloto_inscripciones ORDER BY created_at ASC`
    );
    const porCompania = {};
    for (const f of filas) {
      const k = f.company_name || '(sin compañía)';
      porCompania[k] = (porCompania[k] || 0) + 1;
    }
    return res.json({ ok: true, total: filas.length, por_compania: porCompania, inscripciones: filas });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Página pública de inscripción. */
app.get('/piloto', async (req, res) => {
  let opciones = '<option value="">— Elige tu compañía o agrupación —</option>';
  try {
    const db = getPool();
    const [cs] = await db.execute(
      `SELECT id, name, kind, discipline FROM companies WHERE status = 'active'
        ORDER BY (kind = 'propia') DESC, name`
    );
    for (const c of cs) {
      const extra = c.discipline ? ' — ' + String(c.discipline).slice(0, 60) : '';
      opciones += '<option value="' + c.id + '">' + String(c.name) + extra + '</option>';
    }
  } catch (e) { /* sin catálogo: se anota igual */ }

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  return res.send(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prueba del ecosistema FASE · ATHA Producciones</title>
<style>
  :root { color-scheme: dark }
  * { box-sizing: border-box }
  body { margin:0; background:#0a0a0a; color:#e5e5e5; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height:1.5 }
  .halo { position:fixed; inset:0; pointer-events:none; background: radial-gradient(circle at 50% 0%, rgba(110,231,183,.14) 0%, rgba(224,90,71,.10) 40%, transparent 70%) }
  main { position:relative; max-width:640px; margin:0 auto; padding:28px 18px 60px }
  img.logo { width:150px; display:block; margin:6px auto 14px }
  h1 { font-size:21px; margin:0 0 6px; text-align:center; letter-spacing:.01em }
  .sub { text-align:center; color:#a3a3a3; font-size:13px; margin:0 auto 22px; max-width:520px }
  .tarjeta { background:#141414; border:1px solid #262626; border-radius:20px; padding:18px; margin-bottom:16px }
  .tarjeta h2 { font-size:13px; text-transform:uppercase; letter-spacing:.12em; color:#6ee7b7; margin:0 0 10px }
  ul { margin:0; padding-left:18px; font-size:13px; color:#d4d4d4 }
  ul li { margin-bottom:6px }
  label { display:block; font-size:12px; font-weight:600; margin:14px 0 5px; color:#e5e5e5 }
  input, select, textarea { width:100%; padding:11px 12px; border-radius:12px; border:1px solid #303030; background:#0f0f0f; color:#f5f5f5; font-size:14px; font-family:inherit }
  textarea { min-height:74px; resize:vertical }
  .chk { display:flex; gap:10px; align-items:flex-start; margin-top:16px; font-size:12.5px; color:#d4d4d4 }
  .chk input { width:18px; height:18px; margin-top:2px; flex:0 0 auto }
  button { width:100%; margin-top:18px; padding:14px; border:0; border-radius:14px; background:#34d399; color:#052e1b; font-weight:800; font-size:15px; cursor:pointer }
  button:disabled { opacity:.6; cursor:progress }
  .pie { text-align:center; color:#737373; font-size:11px; margin-top:18px }
  .error { background:rgba(244,63,94,.12); border:1px solid rgba(244,63,94,.4); color:#fda4af; padding:10px 12px; border-radius:12px; font-size:12.5px; margin-top:14px }
  .boton { display:block; text-align:center; margin-top:6px; padding:14px; border-radius:14px; background:#34d399; color:#052e1b; font-weight:800; font-size:15px; text-decoration:none }
  .ok { background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.4); color:#6ee7b7; padding:14px; border-radius:14px; font-size:13.5px; margin-top:16px }
</style>
</head>
<body>
<div class="halo"></div>
<main>
  <img class="logo" src="https://storage.googleapis.com/atha-crm-obras-897089213264/marca/atha-logo.png" alt="ATHA Producciones">
  <h1>Probemos el ecosistema FASE</h1>
  <p class="sub">Buscamos personas del equipo para probar el radar cultural, el muro comunitario y el chat de compañía — y decirnos dónde se traban. No hace falta ser técnico: hace falta usar la app como la usaría en terreno.</p>

  <div class="tarjeta">
    <h2>Qué vas a hacer</h2>
    <ul>
      <li>Entrar con tu cuenta de Google a la app <strong>FASE</strong> (celular o computador).</li>
      <li>Descubrir un nodo cultural con el GPS, publicar una foto en el muro y comentar.</li>
      <li>Ver el perfil de tu compañía, su equipo y sus montajes.</li>
      <li>Contarnos qué te resultó confuso, con total honestidad. Eso es lo más valioso.</li>
    </ul>
  </div>

  <div class="tarjeta">
    <h2>1 · Descarga la app</h2>
    <p style="font-size:13px;color:#d4d4d4;margin:0 0 10px">Android: descarga el APK e instalalo. Si te avisa que es de un origen desconocido, elige <strong>“Instalar de todos modos”</strong> (pasa con toda app que no viene de la Play Store). Después abrila y entra con tu cuenta de Google.</p>
    <a class="boton" href="https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk">Descargar FASE Mobile · APK 14 MB</a>
    <p style="font-size:11.5px;color:#737373;margin:10px 0 0">iPhone: todavía no hay app para iOS. Abre <strong>fase-mobile-897089213264.us-central1.run.app</strong> en Safari y usala desde el navegador (funciona igual, con el mismo botón de reportar).</p>
  </div>

  <div class="tarjeta">
    <h2>2 · Anótate</h2>
    <form id="f">
      <label for="nombre">Nombre y apellido *</label>
      <input id="nombre" name="nombre" required autocomplete="name" placeholder="Ej: Catalina Noa">

      <label for="email">Correo (con el que entras a Google) *</label>
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="tucorreo@gmail.com">

      <label for="telefono">WhatsApp (opcional, para coordinar)</label>
      <input id="telefono" name="telefono" inputmode="tel" placeholder="+56 9 ...">

      <label for="company_id">Tu compañía o agrupación</label>
      <select id="company_id" name="company_id">${opciones}</select>

      <label for="rol">Tu rol ahí</label>
      <select id="rol" name="rol">
        <option value="">— Elige —</option>
        <option value="artist">Artista / elenco</option>
        <option value="coordinator">Producción / coordinación</option>
        <option value="director">Dirección</option>
        <option value="viewer">Sólo mirar</option>
        <option value="otro">Otro / externo</option>
      </select>

      <label for="dispositivo">¿Con qué vas a probar?</label>
      <select id="dispositivo" name="dispositivo">
        <option value="android">Celular Android</option>
        <option value="ios">iPhone</option>
        <option value="computador">Computador (navegador)</option>
      </select>

      <label for="disponibilidad">¿Qué días y horarios te acomodan?</label>
      <input id="disponibilidad" name="disponibilidad" placeholder="Ej: martes y jueves después de las 18">

      <label for="comentario">¿Algo que quieras que tengamos en cuenta?</label>
      <textarea id="comentario" name="comentario" placeholder="Opcional"></textarea>

      <label class="chk"><input type="checkbox" id="acepta" name="acepta" required>
        <span>Quiero participar de la prueba y acepto que usen mis comentarios (y una captura si hace falta) para mejorar la app.</span></label>

      <button id="b" type="submit">Anotarme en la prueba</button>
    </form>
    <div id="msg"></div>
    <p class="pie">Tus datos se guardan en el CRM de ATHA Producciones y se usan sólo para coordinar esta prueba.</p>
  </div>
</main>
<script>
  var f = document.getElementById('f'), b = document.getElementById('b'), msg = document.getElementById('msg');
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    msg.innerHTML = '';
    b.disabled = true; b.textContent = 'Enviando…';
    var datos = {};
    ['nombre','email','telefono','company_id','rol','dispositivo','disponibilidad','comentario'].forEach(function (k) {
      var el = document.getElementById(k);
      if (el && el.value) datos[k] = el.value;
    });
    var sel = document.getElementById('company_id');
    if (sel && sel.selectedIndex > 0) datos.company_name = sel.options[sel.selectedIndex].text.split(' — ')[0];
    datos.acepta = !!document.getElementById('acepta').checked;
    fetch('/api/v1/crm/piloto/inscripciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) throw new Error(d.error || 'No se pudo enviar.');
      f.style.display = 'none';
      msg.innerHTML =
        '<div class="ok"><strong>¡Listo!</strong><br>' + d.mensaje + '</div>' +
        '<div class="ok" style="margin-top:12px">' +
          '<strong>Empieza ahora:</strong>' +
          '<a class="boton" style="margin-top:10px" href="https://fase-mobile-897089213264.us-central1.run.app">Abrir FASE en el navegador</a>' +
          '<a class="boton" style="margin-top:8px;background:#a3a3a3" href="https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk">Descargar la app (Android · APK)</a>' +
          '<p style="font-size:11.5px;color:#a3a3a3;margin:10px 0 0">Con el mismo correo que ingresaste entras a la app (con tu cuenta de Google). ' +
          'Guarda este enlace: si quieres, te lo reenviamos cuando coordinemos la sesión.</p>' +
        '</div>';
    }).catch(function (e) {
      msg.innerHTML = '<div class="error">' + (e.message || 'No se pudo enviar. Prueba de nuevo.') + '</div>';
      b.disabled = false; b.textContent = 'Anotarme en la prueba';
    });
  });
</script>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// PRUEBA PILOTO · reportes desde la app
//
// El botón "Reportar algo" de FASE Mobile manda aquí lo que la persona vio mal o no
// entendió, con el contexto automático (pantalla, usuario, versión, plataforma): así
// el comentario llega ubicado en vez de "no me funcionó". El listado lo ve sólo
// administración.
// ---------------------------------------------------------------------------
let tablaReportesLista = false;
async function asegurarTablaReportes(db) {
  if (tablaReportesLista) return;
  await db.execute(
    `CREATE TABLE IF NOT EXISTS piloto_reportes (
       id         VARCHAR(40)  NOT NULL PRIMARY KEY,
       email      VARCHAR(255) NULL,
       nombre     VARCHAR(160) NULL,
       categoria  VARCHAR(40)  NULL,
       texto      VARCHAR(2000) NOT NULL,
       pantalla   VARCHAR(60)  NULL,
       plataforma VARCHAR(30)  NULL,
       version    VARCHAR(40)  NULL,
       imagen_url VARCHAR(500) NULL,
       estado     VARCHAR(20)  NOT NULL DEFAULT 'nuevo',
       created_at DATETIME     NOT NULL,
       KEY idx_reportes_fecha (created_at)
     )`
  );
  // La tabla ya existía en producción sin algunas columnas: se agregan sin perder
  // los reportes que haya (idempotente, como el resto de lo que crece en producción).
  const EXTRAS = [
    ['imagen_url', 'VARCHAR(500) NULL AFTER version'],
    // Lo que el equipo dejó dicho del reporte y quién lo atendió (el buzón del piloto).
    ['nota', 'VARCHAR(500) NULL AFTER estado'],
    ['atendido_por', 'VARCHAR(255) NULL AFTER nota'],
    ['atendido_en', 'DATETIME NULL AFTER atendido_por'],
  ];
  const [colsRep] = await db.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'piloto_reportes'`);
  const hay = new Set(colsRep.map((c) => c.COLUMN_NAME));
  for (const [nombre, tipo] of EXTRAS) {
    if (!hay.has(nombre)) {
      await db.execute(`ALTER TABLE piloto_reportes ADD COLUMN ${nombre} ${tipo}`);
      console.log(`[reportes] columna agregada: piloto_reportes.${nombre}`);
    }
  }
  tablaReportesLista = true;
}

/** Alta de un reporte. Público: la app lo manda con la identidad en los headers. */
app.post('/api/v1/crm/piloto/reportes', async (req, res) => {
  try {
    const b = req.body || {};
    const texto = String(b.texto || '').trim().slice(0, 2000);
    if (texto.length < 3) {
      return res.status(400).json({ ok: false, error: 'Contanos un poco más de qué pasó.' });
    }
    const db = getPool();
    await asegurarTablaReportes(db);
    const email = String(req.headers['x-atha-email'] || b.email || '').trim().toLowerCase().slice(0, 255) || null;
    let nombre = String(b.nombre || '').trim().slice(0, 160);
    if (!nombre && req.headers['x-atha-name']) {
      try { nombre = decodeURIComponent(String(req.headers['x-atha-name'])).slice(0, 160); } catch (e) { nombre = ''; }
    }
    const id = 'rep_' + randomBytes(8).toString('hex');
    // Captura adjunta (opcional): si la subida falla, el reporte se guarda igual.
    let imagenUrl = null;
    if (b.imagen) {
      try { imagenUrl = await subirFotoInventario(id, b.imagen, 'piloto/reportes'); }
      catch (e) { imagenUrl = null; }
    }
    await db.execute(
      `INSERT INTO piloto_reportes (id, email, nombre, categoria, texto, pantalla, plataforma, version, imagen_url, estado, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,'nuevo',NOW())`,
      [id, email, nombre || null,
       String(b.categoria || '').slice(0, 40) || 'otro', texto,
       String(b.pantalla || '').slice(0, 60) || null,
       String(b.plataforma || '').slice(0, 30) || null,
       String(b.version || '').slice(0, 40) || null, imagenUrl]
    );
    // Aviso al BOLSILLO del equipo: un tester reportando algo es EL insumo de la prueba.
    // Antes estos reportes quedaban sólo en la base y nadie se enteraba (pasó con los 3
    // de Gabriel Ríos, 13 horas sin leer).
    avisarTelegram(
      `🐞 <b>Reporte de la app</b> · ${String(b.categoria || 'otro')}\n\n` +
      `<b>${nombre || email || 'sin cuenta'}</b>` +
      (b.pantalla ? ` · pantalla <b>${String(b.pantalla)}</b>` : '') +
      (b.plataforma ? ` · ${String(b.plataforma)}${b.version ? ' ' + String(b.version) : ''}` : '') +
      `\n\n<i>${texto.slice(0, 400)}</i>\n\n` +
      (imagenUrl ? 'Trae captura de pantalla.\n' : '') +
      `Verlo y responderlo: ${URL_HUB_PUBLICA}/reportes`
    ).catch(() => { /* un aviso que falla no rompe el reporte del usuario */ });
    return res.json({ ok: true, id, imagen_url: imagenUrl, mensaje: '¡Gracias! Tu reporte llegó al equipo.' });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Listado de reportes (sólo administración). */
app.get('/api/v1/crm/piloto/reportes', async (req, res) => {
  try {
    const alcance = await alcanceInventario(req.query.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const db = getPool();
    await asegurarTablaReportes(db);
    const [filas] = await db.execute(
      `SELECT id, email, nombre, categoria, texto, pantalla, plataforma, version, imagen_url, estado,
              nota, atendido_por, atendido_en, created_at
         FROM piloto_reportes ORDER BY FIELD(estado, 'nuevo', 'visto', 'resuelto'), created_at DESC LIMIT 500`
    );
    const porCategoria = {};
    const porPantalla = {};
    for (const f of filas) {
      const k = f.categoria || 'otro';
      const p = f.pantalla || '(sin pantalla)';
      porCategoria[k] = (porCategoria[k] || 0) + 1;
      porPantalla[p] = (porPantalla[p] || 0) + 1;
    }
    return res.json({ ok: true, total: filas.length, por_categoria: porCategoria, por_pantalla: porPantalla, reportes: filas });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * Atender un reporte del piloto (sólo administración): estado + nota + quién lo atendió.
 * Estados: nuevo → visto (lo leímos) → resuelto (ya está arreglado o respondido).
 * El buzón existe porque estos reportes son el insumo de la prueba: entran desde la app
 * y hasta ahora no había dónde mirarlos.
 */
app.patch('/api/v1/crm/piloto/reportes/:id', async (req, res) => {
  try {
    const ident = identidad(req);
    const alcance = await alcanceInventario(ident.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const b = req.body || {};
    const db = getPool();
    await asegurarTablaReportes(db);
    const estados = ['nuevo', 'visto', 'resuelto'];
    const sets = [];
    const args = [];
    if (b.estado !== undefined) {
      const estado = String(b.estado);
      if (!estados.includes(estado)) return res.status(400).json({ ok: false, error: 'Estado inválido (nuevo · visto · resuelto).' });
      sets.push('estado = ?'); args.push(estado);
      if (estado !== 'nuevo') { sets.push('atendido_por = ?', 'atendido_en = NOW()'); args.push(ident.email || null); }
    }
    if (b.nota !== undefined) { sets.push('nota = ?'); args.push(String(b.nota || '').slice(0, 500) || null); }
    if (!sets.length) return res.status(400).json({ ok: false, error: 'no hay nada para actualizar' });
    args.push(req.params.id);
    const [r] = await db.execute(`UPDATE piloto_reportes SET ${sets.join(', ')} WHERE id = ?`, args);
    if (!r.affectedRows) return res.status(404).json({ ok: false, error: 'reporte no encontrado' });
    return res.json({ ok: true, id: req.params.id });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * Borrar un reporte (sólo administración). Existe para limpiar pruebas y spam:
 * sin esto, cada corrida de la batería de pruebas dejaba basura en la base.
 */
app.delete('/api/v1/crm/piloto/reportes/:id', async (req, res) => {
  try {
    const ident = identidad(req);
    const alcance = await alcanceInventario(ident.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const db = getPool();
    await asegurarTablaReportes(db);
    const [r] = await db.execute('DELETE FROM piloto_reportes WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, error: 'reporte no encontrado' });
    return res.json({ ok: true, id: req.params.id, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * FINANZAS · /api/v1/crm/finances (administración)
 *
 * La pestaña Finanzas del CRM llamaba a esta ruta y **no existía**: el catch-all le devolvía el
 * HTML de la SPA con HTTP 200, así que la tabla se veía vacía y los guardados fallaban en
 * silencio. La tabla real es `finance_records`; el front manda y espera camelCase.
 */
function finanzasDeFila(f) {
  return {
    id: f.id,
    projectId: f.project_id || '',
    projectName: f.projectName || f.project_title || '',
    type: f.type,
    category: f.category,
    amountCLP: Number(f.amount_clp || 0),
    date: f.date ? String(f.date).slice(0, 10) : '',
    status: f.status || 'Pendiente',
    invoiceRef: f.invoice_ref || '',
    responsible: f.responsible || '',
    notes: f.notes || '',
  };
}
async function alcanceFinanzas(req) {
  return alcanceInventario(emailDeSesion(req) || req.headers['x-atha-email'] || req.query.email || (req.body && req.body.email) || '');
}

app.get('/api/v1/crm/finances', async (req, res) => {
  try {
    if (!(await alcanceFinanzas(req)).total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const db = getPool();
    const [filas] = await db.execute(
      `SELECT f.*, p.title AS project_title FROM finance_records f
         LEFT JOIN projects p ON p.id = f.project_id
        ORDER BY f.date DESC, f.created_at DESC`);
    return res.json({ ok: true, finances: filas.map(finanzasDeFila), total: filas.length });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

app.post('/api/v1/crm/finances', async (req, res) => {
  try {
    if (!(await alcanceFinanzas(req)).total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const b = req.body || {};
    const db = getPool();
    // `finance_records.project_id` es NOT NULL y tiene clave foránea a `projects`: el movimiento
    // tiene que colgar de una obra. Se valida acá para devolver un mensaje entendible en vez del
    // error crudo de MySQL.
    const projectId = String(b.projectId || b.project_id || '');
    if (!projectId) return res.status(400).json({ ok: false, error: 'Elige la obra a la que pertenece el movimiento' });
    const [obra] = await db.execute('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!obra.length) return res.status(400).json({ ok: false, error: 'La obra indicada no existe' });
    const id = b.id || ('fin_' + randomUUID().slice(0, 12));
    await db.execute(
      `INSERT INTO finance_records (id, project_id, type, category, amount_clp, date, status, invoice_ref, responsible, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE project_id = VALUES(project_id), type = VALUES(type),
         category = VALUES(category), amount_clp = VALUES(amount_clp), date = VALUES(date),
         status = VALUES(status), invoice_ref = VALUES(invoice_ref), responsible = VALUES(responsible),
         notes = VALUES(notes)`,
      [id, b.projectId || b.project_id || '', b.type || 'Gasto', b.category || null,
       Number(b.amountCLP !== undefined ? b.amountCLP : b.amount_clp) || 0,
       (b.date || '').slice(0, 10) || null, b.status || 'Pendiente',
       b.invoiceRef || b.invoice_ref || null, b.responsible || null, b.notes || null]);
    const [filas] = await db.execute(
      `SELECT f.*, p.title AS project_title FROM finance_records f LEFT JOIN projects p ON p.id = f.project_id WHERE f.id = ?`, [id]);
    return res.json({ ok: true, finance: filas[0] ? finanzasDeFila(filas[0]) : null, id });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

/** Actualiza un movimiento (misma forma que el POST). */
app.put('/api/v1/crm/finances/:id', async (req, res) => {
  try {
    if (!(await alcanceFinanzas(req)).total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const b = req.body || {};
    const campos = [];
    const valores = [];
    const mapa = { projectId: 'project_id', type: 'type', category: 'category', amountCLP: 'amount_clp',
      amount_clp: 'amount_clp', date: 'date', status: 'status', invoiceRef: 'invoice_ref',
      invoice_ref: 'invoice_ref', responsible: 'responsible', notes: 'notes' };
    for (const [clave, columna] of Object.entries(mapa)) {
      if (b[clave] !== undefined && b[clave] !== null) {
        campos.push(`${columna} = ?`);
        valores.push(columna === 'project_id' ? String(b[clave]) : b[clave]);
      }
    }
    if (!campos.length) return res.status(400).json({ ok: false, error: 'nada para actualizar' });
    valores.push(req.params.id);
    const db = getPool();
    const [r] = await db.execute(`UPDATE finance_records SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (!r.affectedRows) return res.status(404).json({ ok: false, error: 'movimiento no encontrado' });
    return res.json({ ok: true, id: req.params.id });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

app.delete('/api/v1/crm/finances/:id', async (req, res) => {
  try {
    if (!(await alcanceFinanzas(req)).total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const db = getPool();
    const [r] = await db.execute('DELETE FROM finance_records WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ ok: false, error: 'movimiento no encontrado' });
    return res.json({ ok: true, id: req.params.id, eliminado: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * SUBIR UNA IMAGEN DESDE EL PANEL · POST /api/v1/crm/media (sólo administración)
 *
 * Las URLs públicas son difíciles de conseguir para fotos de lugares reales, así que el panel
 * permite **arrastrar/elegir un archivo**. El navegador lo achica (canvas, máx. 1600 px, JPEG 85%)
 * y lo manda como data URL; acá se sube al bucket del ecosistema —el mismo del APK y del logo— y
 * se devuelve la URL pública. Reusa `subirFotoInventario` (que ya valida formato y tamaño).
 */
app.post('/api/v1/crm/media', async (req, res) => {
  try {
    const alcance = await alcanceInventario(
      emailDeSesion(req) || req.headers['x-atha-email'] || (req.body && req.body.email) || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const cuerpo = req.body || {};
    const carpeta = String(cuerpo.carpeta || 'radar').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'radar';
    const url = await subirFotoInventario(cuerpo.nombre || 'foto', cuerpo.imagen, carpeta);
    return res.json({ ok: true, url, carpeta });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * FOTOS SUGERIDAS · GET /api/v1/crm/radar/fotos-sugeridas?q=<lugar>&ciudad=<comuna>
 *
 * Muchos nodos no tienen foto (no hay artículo de Wikipedia ni foto libre con nombre verificable).
 * Para esos, la vía es **manual**: administración busca a ojo y elige. Esto devuelve hasta 8 fotos
 * libres de Wikimedia Commons para el nombre del lugar, con su página de origen (para dar crédito),
 * y el panel de /nodos las muestra como galería: se hace clic en la que corresponde y queda en el
 * campo Foto. No decide solo a propósito: elegir la foto es un juicio humano.
 */
app.get('/api/v1/crm/radar/fotos-sugeridas', async (req, res) => {
  try {
    const alcance = await alcanceInventario(req.query.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const nombre = String(req.query.q || '').trim();
    const ciudad = String(req.query.ciudad || '').trim();
    if (nombre.length < 3) return res.status(400).json({ ok: false, error: 'Falta el nombre del lugar (q)' });
    const consulta = [nombre, ciudad].filter(Boolean).join(' ');
    const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrsearch: consulta, gsrnamespace: '6',
      gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '800',
    });
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ATHAMU-FASE/1.0 (radar cultural; fase.athamu@gmail.com)' },
    });
    if (!r.ok) throw new Error('Commons respondió ' + r.status);
    const d = await r.json();
    const fotos = Object.values((d.query && d.query.pages) || {})
      .map((p) => {
        const info = p.imageinfo && p.imageinfo[0];
        if (!info) return null;
        if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
        if (/mapa|plano|escudo|logo|bandera|svg|diagrama|grafico|cuadro|pintura|escultura|firma/i.test(p.title || '')) return null;
        const meta = (info.extmetadata || {});
        return {
          url: info.thumburl || info.url,
          url_grande: info.url,
          titulo: String(p.title || '').replace(/^File:/, ''),
          pagina: info.descriptionurl || ('https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title || '')),
          autor: meta.Artist ? String(meta.Artist.value).replace(/<[^>]*>/g, '').slice(0, 80) : '',
          licencia: meta.LicenseShortName ? String(meta.LicenseShortName.value).slice(0, 40) : '',
        };
      })
      .filter(Boolean);
    return res.json({ ok: true, consulta, fotos });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/**
 * TABLERO DEL PILOTO · GET /api/v1/crm/piloto/tablero (sólo administración)
 *
 * Todo lo que hace falta para saber si la prueba está funcionando, en una sola llamada:
 * inscripciones, reportes, uso del radar (descubrimientos por persona), muro, rutas, agenda,
 * agrupaciones, correos y cuentas. Cada bloque va en su propio try: si una tabla cambia o
 * falta, el resto del tablero igual responde.
 */
app.get('/api/v1/crm/piloto/tablero', async (req, res) => {
  const alcance = await alcanceInventario(req.query.email || req.headers['x-atha-email'] || '');
  if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
  const db = getPool();
  const bloque = async (nombre, fn) => {
    try { return { [nombre]: await fn() }; }
    catch (e) { return { [nombre]: { error: e.message } }; }
  };
  const uno = async (sql, args = []) => (await db.execute(sql, args))[0];
  const salida = Object.assign({ ok: true, generado: new Date().toISOString() },
    await bloque('inscripciones', async () => ({
      total: (await uno('SELECT COUNT(*) n FROM piloto_inscripciones'))[0].n,
      por_compania: await uno("SELECT COALESCE(NULLIF(company_name,''),'(sin compañía)') c, COUNT(*) n FROM piloto_inscripciones GROUP BY c ORDER BY n DESC"),
      por_estado: await uno('SELECT COALESCE(estado,\'(nuevo)\') e, COUNT(*) n FROM piloto_inscripciones GROUP BY e'),
      ultimos: await uno('SELECT nombre, email, company_name, rol, estado, created_at FROM piloto_inscripciones ORDER BY created_at DESC LIMIT 5'),
    })),
    await bloque('reportes', async () => ({
      por_estado: await uno("SELECT COALESCE(estado,'nuevo') e, COUNT(*) n FROM piloto_reportes GROUP BY e"),
      por_pantalla: await uno("SELECT COALESCE(pantalla,'(sin pantalla)') p, COUNT(*) n FROM piloto_reportes GROUP BY p ORDER BY n DESC"),
      por_categoria: await uno("SELECT COALESCE(categoria,'otro') c, COUNT(*) n FROM piloto_reportes GROUP BY c ORDER BY n DESC"),
      ultimos: await uno('SELECT id, nombre, categoria, texto, estado, created_at FROM piloto_reportes ORDER BY created_at DESC LIMIT 5'),
    })),
    await bloque('radar', async () => ({
      nodos: (await uno('SELECT COUNT(*) total, SUM(is_published=1) publicados, SUM(latitude IS NULL OR longitude IS NULL) sin_coordenada FROM radar_nodes'))[0],
      por_ciudad: await uno("SELECT COALESCE(city,'(sin comuna)') c, COUNT(*) n FROM radar_nodes WHERE is_published=1 GROUP BY c ORDER BY n DESC LIMIT 8"),
      descubrimientos: (await uno('SELECT COUNT(*) total, COUNT(DISTINCT user_id) personas FROM radar_discoveries'))[0],
      // Los que más avanzaron: la métrica estrella del plan
      top_exploradores: await uno(
        `SELECT u.email, u.display_name, COUNT(*) n, MAX(d.discovered_at) ultimo
           FROM radar_discoveries d LEFT JOIN users u ON u.id = d.user_id
          GROUP BY u.email, u.display_name ORDER BY n DESC LIMIT 6`),
      ultimos_14_dias: await uno(
        "SELECT DATE(discovered_at) dia, COUNT(*) n FROM radar_discoveries WHERE discovered_at >= NOW() - INTERVAL 14 DAY GROUP BY dia ORDER BY dia"),
    })),
    await bloque('muro', async () => ({
      posts: (await uno("SELECT COUNT(*) total, SUM(status='approved') aprobadas, SUM(status='pending') pendientes, COUNT(DISTINCT user_id) autores FROM radar_posts"))[0],
      ultimos: await uno('SELECT id, caption, status, created_at FROM radar_posts ORDER BY created_at DESC LIMIT 5'),
      comentarios: (await uno('SELECT COUNT(*) n FROM radar_comments'))[0].n,
      reacciones: (await uno('SELECT COUNT(*) n FROM radar_reactions'))[0].n,
    })),
    await bloque('rutas', async () => ({
      rutas: (await uno('SELECT COUNT(*) total, SUM(is_public=1) publicas FROM radar_routes'))[0],
      paradas: (await uno('SELECT COUNT(*) n FROM radar_route_nodes'))[0].n,
      con_progreso: (await uno('SELECT COUNT(DISTINCT route_id) n FROM radar_route_nodes rn JOIN radar_discoveries d ON d.node_id = rn.node_id'))[0].n,
    })),
    await bloque('agenda', async () => ({
      eventos: (await uno("SELECT COUNT(*) total, SUM(is_public=1) publicados, SUM(source='externo') externos, SUM(date_end IS NOT NULL) con_rango FROM events WHERE date >= CURDATE()"))[0],
      por_tipo: await uno("SELECT COALESCE(type,'(sin tipo)') t, COUNT(*) n FROM events WHERE date >= CURDATE() GROUP BY t ORDER BY n DESC"),
      por_comuna: await uno("SELECT COALESCE(city,'(sin comuna)') c, COUNT(*) n FROM events WHERE date >= CURDATE() GROUP BY c ORDER BY n DESC LIMIT 6"),
      proximos: await uno('SELECT title, date, time_start, venue, city, source FROM events WHERE date >= CURDATE() ORDER BY date ASC LIMIT 6'),
    })),
    await bloque('agrupaciones', async () => ({
      companias: (await uno(`SELECT COUNT(*) total,
          SUM((SELECT COUNT(*) FROM company_members m WHERE m.company_id=c.id) = 0) sin_nadie
        FROM companies c`))[0],
      solicitudes: await uno("SELECT COALESCE(status,'(sin estado)') s, COUNT(*) n FROM company_requests GROUP BY s"),
      cuentas: (await uno(`SELECT (SELECT COUNT(*) FROM users) usuarios,
          (SELECT COUNT(*) FROM company_members) membresias,
          (SELECT COUNT(*) FROM company_people) fichas,
          (SELECT COUNT(*) FROM radar_profiles) perfiles_radar`))[0],
    })),
    await bloque('correos', async () => ({
      total: (await uno('SELECT COUNT(*) n, SUM(ok=1) ok FROM email_log'))[0],
      ultimos: await uno('SELECT para, asunto, plantilla, ok, created_at FROM email_log ORDER BY created_at DESC LIMIT 5'),
    })),
    await bloque('dispositivos', async () => ({
      activos_7d: await uno(`SELECT COUNT(DISTINCT user_id) personas FROM radar_discoveries WHERE discovered_at >= NOW() - INTERVAL 7 DAY`),
      publicaron_7d: await uno(`SELECT COUNT(DISTINCT user_id) personas FROM radar_posts WHERE created_at >= NOW() - INTERVAL 7 DAY`),
      reportaron_7d: await uno(`SELECT COUNT(DISTINCT email) personas FROM piloto_reportes WHERE created_at >= NOW() - INTERVAL 7 DAY`),
    })));
  return res.json(salida);
});

/**
 * Responderle al tester por correo, desde el propio buzón (sólo administración).
 * Sale por el emisor del ecosistema (`enviarCorreo`, queda en `email_log`) y, si el
 * correo salió, marca el reporte como resuelto y guarda la respuesta como nota.
 */
app.post('/api/v1/crm/piloto/reportes/:id/responder', async (req, res) => {
  try {
    const ident = identidad(req);
    const alcance = await alcanceInventario(ident.email || req.headers['x-atha-email'] || '');
    if (!alcance.total) return res.status(403).json({ ok: false, error: 'Sólo administración' });
    const b = req.body || {};
    const mensaje = String(b.mensaje || '').trim();
    if (mensaje.length < 3) return res.status(400).json({ ok: false, error: 'Escribe la respuesta.' });
    const db = getPool();
    await asegurarTablaReportes(db);
    const [filas] = await db.execute('SELECT * FROM piloto_reportes WHERE id = ? LIMIT 1', [req.params.id]);
    if (!filas.length) return res.status(404).json({ ok: false, error: 'reporte no encontrado' });
    const rep = filas[0];
    const para = String(b.para || rep.email || '').trim();
    if (!para) return res.status(400).json({ ok: false, error: 'El reporte no trae correo: indica uno.' });

    const escapado = (t) => String(t == null ? '' : t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const contenido = `
<p style="font-size:15px">Hola ${escapado((rep.nombre || '').split(' ')[0] || 'de nuevo')},</p>
<p>${escapado(mensaje).replace(/\n/g, '<br>')}</p>
<hr style="border:0;border-top:1px solid #e0d5c0;margin:16px 0">
<p style="font-size:12px;color:#5e564c">Lo que nos contaste el ${String(rep.created_at).slice(0, 10)} desde
<b>${escapado(rep.pantalla || 'la app')}</b> (${escapado(rep.plataforma || '')} ${escapado(rep.version || '')}):<br>
<i>“${escapado(rep.texto)}”</i></p>
<p style="font-size:12px;color:#5e564c">Gracias por reportar: es lo que hace que esto mejore. Si quieres, sigue
usando la app y contanos cualquier cosa que veas rara con el botón <b>“Reportar algo”</b>.</p>
<p>Un abrazo,<br><b>Equipo FASE · ATHAMU</b></p>`;
    const r = await enviarCorreo({
      para,
      asunto: String(b.asunto || 'Sobre lo que nos reportaste en la app FASE').slice(0, 160),
      html: marcoCorreo(contenido),
      plantilla: 'respuesta_reporte',
      enviadoPor: ident.email || null,
    });
    if (!r || r.ok === false) return res.status(503).json({ ok: false, error: (r && r.error) || 'el correo no salió' });
    await db.execute(
      "UPDATE piloto_reportes SET estado = 'resuelto', nota = ?, atendido_por = ?, atendido_en = NOW() WHERE id = ?",
      [`Respondido a ${para}: ${mensaje.slice(0, 420)}`, ident.email || null, req.params.id]
    );
    return res.json({ ok: true, id: req.params.id, para });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/* ---------------------------------------------------------------------------
 * CALENDARIO · invitaciones de ensayo/función
 *
 * Se arma un .ics (método REQUEST) que viaja dentro del mismo correo: Gmail,
 * Outlook y Apple muestran los botones Sí / No / Quizás y el evento queda en la
 * agenda del artista. No hace falta OAuth de Google Calendar para esto; el OAuth
 * (para leer las respuestas y sincronizar el Planner) es el paso siguiente.
 *
 * Las horas van en la zona local del ecosistema (America/Santiago) y se convierten
 * a UTC respetando el horario de verano: en Chile el offset cambia entre -03 y -04,
 * y usar un valor fijo pondría los ensayos una hora corrida la mitad del año.
 * ------------------------------------------------------------------------- */
const ZONA_AGENDA = process.env.ZONA_AGENDA || 'America/Santiago';

/** Offset (en minutos) de una zona para una fecha dada, respetando el horario de verano. */
function offsetZona(fechaISO, zona) {
  const base = new Date(`${fechaISO}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' });
  const parte = (fmt.formatToParts(base).find((p) => p.type === 'timeZoneName') || {}).value || 'GMT+00:00';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(parte);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Fecha+hora local (YYYY-MM-DD HH:MM) → sello UTC de iCalendar (20260929T210000Z). */
function aUtcIcs(fecha, hora, zona = ZONA_AGENDA) {
  const [y, m, d] = String(fecha).split('-').map(Number);
  const [hh, mm] = String(hora || '00:00').split(':').map(Number);
  const ms = Date.UTC(y, m - 1, d, hh, mm || 0) - offsetZona(fecha, zona) * 60000;
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const icsEscapar = (t) => String(t || '')
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** iCalendar: se pliegan las líneas largas (>73) como pide la norma. */
function plegarIcs(linea) {
  if (linea.length <= 73) return linea;
  const partes = [];
  let resto = linea;
  while (resto.length > 73) { partes.push(resto.slice(0, 73)); resto = ' ' + resto.slice(73); }
  partes.push(resto);
  return partes.join('\r\n');
}

/**
 * Construye la invitación. `invitado` es el destinatario de ESTE correo: cada persona
 * recibe su propia copia con su ATTENDEE, para que el RSVP funcione de verdad.
 */
function construirIcs({ uid, titulo, descripcion, fecha, horaInicio, horaFin, lugar, organizador, organizadorNombre, invitado, invitadoNombre, zona }) {
  const fin = horaFin || horaInicio;
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ATHAMU//FASE//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${aUtcIcs(new Date().toISOString().slice(0, 10), new Date().toISOString().slice(11, 16), zona || ZONA_AGENDA)}`,
    `DTSTART:${aUtcIcs(fecha, horaInicio, zona || ZONA_AGENDA)}`,
    `DTEND:${aUtcIcs(fecha, fin, zona || ZONA_AGENDA)}`,
    `SUMMARY:${icsEscapar(titulo)}`,
    descripcion ? `DESCRIPTION:${icsEscapar(descripcion)}` : null,
    lugar ? `LOCATION:${icsEscapar(lugar)}` : null,
    `ORGANIZER;CN=${icsEscapar(organizadorNombre || 'ATHAMU · FASE')}:mailto:${organizador}`,
    `ATTENDEE;CN=${icsEscapar(invitadoNombre || invitado)};ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${invitado}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lineas.map(plegarIcs).join('\r\n') + '\r\n';
}

/** Invitar a un ensayo/función: correo con calendario a cada invitado y registro. */
app.post('/api/v1/crm/ensayos/invitar', async (req, res) => {
  try {
    await asegurarColumnasAgenda();
    const ident = identidad(req);
    const email = emailDeSesion(req) || ident.email;
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });
    const db = getPool();
    const userId = await exploradorId(email, ident.nombre, ident.foto);

    const b = req.body || {};
    const obraId = b.obra_id ? String(b.obra_id) : null;
    const empresaObra = obraId
      ? ((await db.execute('SELECT company_id FROM projects WHERE id = ? LIMIT 1', [obraId]))[0][0] || {}).company_id
      : (b.company_id ? String(b.company_id) : null);

    // Permiso: administración o producción/dirección de la agrupación.
    let puede = await esAdministrador(email);
    if (!puede && empresaObra) {
      const [m] = await db.execute(
        `SELECT role_in_company FROM company_members
          WHERE user_id = ? AND company_id = ?
            AND LOWER(role_in_company) IN ('owner','director','coordinator','productor') LIMIT 1`,
        [userId, empresaObra]
      );
      puede = m.length > 0;
    }
    if (!puede) return res.status(403).json({ ok: false, error: 'Sólo la producción de la agrupación (o administración) puede invitar.' });

    const titulo = String(b.titulo || b.obra_title || '').trim().slice(0, 200);
    const fecha = String(b.fecha || '').slice(0, 10);
    const hora = String(b.hora || '').slice(0, 5);
    const lugar = String(b.lugar || '').trim().slice(0, 180);
    if (!titulo) return res.status(400).json({ ok: false, error: 'Falta el título del ensayo.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ ok: false, error: 'La fecha va como AAAA-MM-DD.' });
    if (!/^\d{2}:\d{2}$/.test(hora)) return res.status(400).json({ ok: false, error: 'La hora va como HH:MM.' });
    const invitados = (Array.isArray(b.invitados) ? b.invitados : [])
      .map((i) => (typeof i === 'string' ? { email: i } : i))
      .map((i) => ({ email: String(i.email || '').trim().toLowerCase(), nombre: String(i.nombre || '').trim() }))
      .filter((i) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email));
    if (!invitados.length) return res.status(400).json({ ok: false, error: 'No hay invitados con correo válido.' });

    const uid = `${Date.now()}-${randomUUID().slice(0, 8)}@fase-athamu`;
    const durMin = Number(b.duracion_min) || 120;
    const horaFin = String(b.hora_fin || '').slice(0, 5) ||
      new Date(new Date(`2000-01-01T${hora}:00Z`).getTime() + durMin * 60000).toISOString().slice(11, 16);
    const descripcion = String(b.notas || '').trim().slice(0, 800);
    const tipo = String(b.tipo || 'Ensayo').slice(0, 40);
    const asunto = `${tipo} · ${titulo} · ${fecha.split('-').reverse().join('/')} ${hora}`;

    // Opcional: dejar el ensayo/función en la agenda del CRM (interno por defecto:
    // los ensayos no van al feed público de la app).
    let eventoId = null;
    if (b.crear_evento !== false) {
      eventoId = `ev_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      await db.execute(
        `INSERT INTO events (id, owner_id, title, obra_id, obra_title, type, date, time_start, time_end,
           venue, cast_count, status, notes, is_public, source, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [eventoId, userId, titulo, obraId, String(b.obra_title || '').slice(0, 255) || null, tipo,
         fecha, `${hora}:00`, `${horaFin}:00`, lugar || null, invitados.length, 'Confirmado',
         descripcion || null, b.is_public === true ? 1 : 0, 'atha']
      );
      radarEmitir('evento_nuevo', { id: eventoId, title: titulo, date: fecha, time_start: `${hora}:00`, venue: lugar || null });
    }

    /* ACCESO AL PLANNER
     *
     * El Planner no tiene login propio: entra por el puente de sesión del hub. Su
     * bundle NO canjea tickets (`?t=`) — lee `?auth=1&email=…&name=…`, que es el flujo
     * viejo. Por eso:
     *   - el link de la invitación va con ese formato (entra directo, sin bucle);
     *   - y al invitado hay que DEJARLO AUTORIZADO en `planner_director_users`, porque
     *     si no el Planner lo considera no autorizado y lo devuelve al login (el bucle
     *     que reportó Francisco el 2026-09-27).
     * El `role` decide la vista: 'artist' para el elenco, 'director' para dirección.
     */
    const plannerBase = DESTINOS_PUENTE.planner;
    const autorizarEnPlanner = b.autorizar_planner !== false;
    let autorizadosPlanner = 0;

    const enviados = [];
    const fallidos = [];
    for (const inv of invitados) {
      let rolPlanner = 'artist';
      if (autorizarEnPlanner) {
        try {
          // Rol real: si manda en una compañía, es dirección; si no, elenco.
          const [u] = await db.execute(
            `SELECT u.display_name, u.role_title
               FROM users u WHERE LOWER(u.email) = LOWER(?) LIMIT 1`, [inv.email]
          );
          const [dir] = empresaObra
            ? await db.execute(
                `SELECT cm.role_in_company FROM company_members cm
                  JOIN users u ON u.id = cm.user_id
                 WHERE LOWER(u.email) = LOWER(?) AND cm.company_id = ?
                   AND LOWER(cm.role_in_company) IN ('owner','director','coordinator','productor') LIMIT 1`,
                [inv.email, empresaObra])
            : [[]];
          const esDireccion = (await esAdministrador(inv.email)) || dir.length > 0;
          rolPlanner = esDireccion ? 'director' : 'artist';
          const nombre = inv.nombre || (u[0] && u[0].display_name) || inv.email;
          const ini = String(nombre).split(/\s+/).filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
          const cargo = (u[0] && u[0].role_title) || (rolPlanner === 'director' ? 'Dirección' : 'Elenco');
          const [ya] = await db.execute(
            'SELECT id FROM planner_director_users WHERE LOWER(email) = ? LIMIT 1', [inv.email]
          );
          if (ya.length) {
            await db.execute(
              'UPDATE planner_director_users SET name = ?, role = ?, initials = ?, authorized = 1 WHERE id = ?',
              [nombre, cargo, ini, ya[0].id]
            );
          } else {
            await db.execute(
              `INSERT INTO planner_director_users (id, name, email, role, initials, authorized, created_at)
               VALUES (?,?,?,?,?,1,NOW())`,
              [`dir_${randomUUID().replace(/-/g, '').slice(0, 8)}`, nombre, inv.email, cargo, ini]
            );
          }
          autorizadosPlanner += 1;
        } catch (e) {
          console.warn('[ensayo] no se pudo autorizar en el Planner:', inv.email, e.message);
        }
      }

      const linkPlanner = `${plannerBase}/?auth=1&email=${encodeURIComponent(inv.email)}` +
        `&name=${encodeURIComponent(inv.nombre || inv.email)}&role=${rolPlanner}`;
      const ics = construirIcs({
        uid, titulo, descripcion, fecha, horaInicio: hora, horaFin, lugar,
        organizador: MAIL_FROM, organizadorNombre: MAIL_FROM_NAME,
        invitado: inv.email, invitadoNombre: inv.nombre,
      });
      const r = await enviarCorreo({
        para: inv.email, asunto, plantilla: 'invitacion_ensayo',
        html: marcoCorreo(PLANTILLAS_CORREO.invitacion_ensayo({
          nombre: inv.nombre.split(' ')[0], obra: titulo, fecha, hora, lugar,
          descripcion, organizador: ident.nombre || email,
          linkPlanner, linkApp: DESTINOS_PUENTE['app-movil'],
        })),
        ics, icsNombre: 'invitacion.ics', enviadoPor: email,
      });
      if (r.ok) enviados.push(inv.email); else fallidos.push({ email: inv.email, error: r.error });
    }

    return res.json({
      ok: fallidos.length === 0, evento_id: eventoId, uid_ics: uid,
      enviados, fallidos, total: invitados.length,
      autorizados_planner: autorizadosPlanner,
      mensaje: enviados.length
        ? `Invitación enviada a ${enviados.length} de ${invitados.length}.`
        : 'No se pudo enviar ninguna invitación.',
    });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/* ---------------------------------------------------------------------------
 * CORREO Y AGENDA DEL ECOSISTEMA · emisor único de ATHAMU
 *
 * Por qué existe: hasta ahora los avisos e invitaciones salían desde la cuenta
 * PERSONAL de Francisco (token de Google con `gmail.send`). Aquí hay un emisor
 * propio del agente, con su identidad, que cualquier artefacto puede usar.
 *
 * - Sin dependencias: SMTP hablado a mano sobre TLS (el deploy del hub sólo copia
 *   server.js, así que no se pueden agregar paquetes sin rearmar la imagen).
 * - Identidad por variables de entorno: MAIL_FROM, MAIL_FROM_NAME, MAIL_REPLY_TO.
 *   El día que haya dominio propio, se cambian las variables y todo sale desde ahí
 *   sin tocar código.
 * - Gmail exige una "contraseña de aplicación" (con 2FA activo): la contraseña
 *   normal de la cuenta es rechazada (535).
 * - Todo envío queda registrado en `email_log`: antes no quedaba rastro de qué se
 *   le mandó a quién.
 * ------------------------------------------------------------------------- */
const MAIL_HOST = process.env.MAIL_HOST || 'smtp.gmail.com';
const MAIL_PORT = Number(process.env.MAIL_PORT || 465);
const MAIL_USER = process.env.MAIL_USER || '';
const MAIL_PASS = process.env.MAIL_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'ATHAMU · FASE';
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || '';
const MAIL_ACTIVO = !!(MAIL_USER && MAIL_PASS);

/** Espera la respuesta de un comando SMTP (soporta respuestas multilínea). */
function smtpEsperar(socket, codigos) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (d) => {
      buffer += d.toString('utf8');
      const lineas = buffer.split(/\r?\n/).filter(Boolean);
      const ultima = lineas[lineas.length - 1] || '';
      if (/^\d{3} /.test(ultima)) {
        const codigo = Number(ultima.slice(0, 3));
        socket.removeListener('data', onData);
        if (codigos.includes(codigo)) resolve({ codigo, texto: buffer });
        else reject(new Error(`SMTP ${codigo}: ${buffer.trim().slice(-160)}`));
      }
    };
    socket.on('data', onData);
    socket.once('error', (e) => { socket.removeListener('data', onData); reject(e); });
  });
}

/** Manda un correo HTML por SMTP. Devuelve {ok, error}. */
async function enviarPorSmtp({ desde, nombreDesde, replyTo, para, asunto, html, ics, icsNombre }) {
  // OJO: este archivo es ESM (`type: module`) — `require` NO existe aquí. Se usan los
  // imports de arriba (tls/net), que es el mismo código que ya se probó contra Gmail.
  const destinatarios = (Array.isArray(para) ? para : [para]).filter(Boolean);
  const puerto = MAIL_PORT;
  const tlsImplicito = puerto === 465;

  let socket = tlsImplicito
    ? tls.connect({ host: MAIL_HOST, port: puerto, servername: MAIL_HOST })
    : net.connect({ host: MAIL_HOST, port: puerto });
  await new Promise((res, rej) => {
    socket.once(tlsImplicito ? 'secureConnect' : 'connect', res);
    socket.once('error', rej);
  });

  await smtpEsperar(socket, [220]);
  const ehlo = () => socket.write('EHLO fase-athamu\r\n');
  ehlo();
  const saludo = await smtpEsperar(socket, [250]);

  if (!tlsImplicito) {
    if (!/STARTTLS/i.test(saludo.texto)) throw new Error('El servidor no ofrece STARTTLS');
    socket.write('STARTTLS\r\n');
    await smtpEsperar(socket, [220]);
    socket = tls.connect({ socket, servername: MAIL_HOST });
    await new Promise((res, rej) => { socket.once('secureConnect', res); socket.once('error', rej); });
    ehlo();
    await smtpEsperar(socket, [250]);
  }

  const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
  socket.write('AUTH LOGIN\r\n');
  await smtpEsperar(socket, [334]);
  socket.write(b64(MAIL_USER) + '\r\n');
  await smtpEsperar(socket, [334]);
  socket.write(b64(MAIL_PASS) + '\r\n');
  await smtpEsperar(socket, [235]);

  socket.write(`MAIL FROM:<${desde}>\r\n`);
  await smtpEsperar(socket, [250]);
  for (const d of destinatarios) {
    socket.write(`RCPT TO:<${d}>\r\n`);
    await smtpEsperar(socket, [250, 251]);
  }
  socket.write('DATA\r\n');
  await smtpEsperar(socket, [354]);

  const cabeceras = [
    `From: ${nombreDesde ? `"${nombreDesde}" ` : ''}<${desde}>`,
    `To: ${destinatarios.join(', ')}`,
    `Subject: =?UTF-8?B?${b64(asunto)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@fase-athamu>`,
    'MIME-Version: 1.0',
  ];
  if (replyTo) cabeceras.push(`Reply-To: <${replyTo}>`);

  // Con invitación de calendario: multipart (HTML + text/calendar con RSVP). Gmail,
  // Outlook y Apple leen el .ics y muestran los botones Sí / No / Quizás.
  let cuerpo;
  if (ics) {
    const b = `fase_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    cabeceras.push(`Content-Type: multipart/mixed; boundary="${b}"`);
    const htmlB64 = b64(html || '<p></p>').replace(/(.{76})/g, '$1\r\n');
    const icsB64 = b64(ics).replace(/(.{76})/g, '$1\r\n');
    cuerpo = `--${b}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${htmlB64}\r\n`
      + `--${b}\r\nContent-Type: text/calendar; method=REQUEST; charset=UTF-8; name="${icsNombre || 'invitacion.ics'}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${icsB64}\r\n`
      + `--${b}--\r\n`;
  } else {
    cabeceras.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64');
    cuerpo = b64(html || '<p></p>').replace(/(.{76})/g, '$1\r\n');
  }
  socket.write(cabeceras.join('\r\n') + '\r\n\r\n' + cuerpo.replace(/\r\n\./g, '\r\n..') + '\r\n.\r\n');
  const fin = await smtpEsperar(socket, [250]);
  try { socket.write('QUIT\r\n'); socket.end(); } catch (e) { /* se cierra igual */ }
  return { ok: true, servidor: fin.texto.trim().slice(-60) };
}

/** Registro de correos enviados (antes no quedaba ninguno). */
async function asegurarTablaCorreos() {
  const db = getPool();
  await db.execute(
    `CREATE TABLE IF NOT EXISTS email_log (
       id varchar(64) NOT NULL PRIMARY KEY,
       para varchar(255) NOT NULL,
       asunto varchar(255) NOT NULL,
       plantilla varchar(60) NULL,
       desde varchar(255) NULL,
       ok tinyint(1) NOT NULL DEFAULT 0,
       error varchar(500) NULL,
       enviado_por varchar(255) NULL,
       created_at datetime DEFAULT CURRENT_TIMESTAMP
     )`
  );
}

/** Envía y registra. Nunca lanza: devuelve {ok, error}. */
async function enviarCorreo({ para, asunto, html, plantilla, enviadoPor, ics, icsNombre }) {
  const db = getPool();
  const id = `mail_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  if (!MAIL_ACTIVO) {
    const error = 'El correo no está configurado todavía (faltan MAIL_USER/MAIL_PASS en el hub).';
    try {
      await asegurarTablaCorreos();
      await db.execute(
        'INSERT INTO email_log (id, para, asunto, plantilla, desde, ok, error, enviado_por) VALUES (?,?,?,?,?,0,?,?)',
        [id, String(para).slice(0, 255), String(asunto).slice(0, 255), plantilla || null, MAIL_FROM || null, error, enviadoPor || null]
      );
    } catch (e) { /* si ni la tabla se puede tocar, igual se devuelve el error */ }
    return { ok: false, error };
  }
  try {
    const r = await enviarPorSmtp({
      desde: MAIL_FROM, nombreDesde: MAIL_FROM_NAME, replyTo: MAIL_REPLY_TO,
      para, asunto, html, ics, icsNombre,
    });
    await asegurarTablaCorreos();
    await db.execute(
      'INSERT INTO email_log (id, para, asunto, plantilla, desde, ok, enviado_por) VALUES (?,?,?,?,?,1,?)',
      [id, String(para).slice(0, 255), String(asunto).slice(0, 255), plantilla || null, MAIL_FROM, enviadoPor || null]
    );
    return { ok: true, id, servidor: r.servidor };
  } catch (e) {
    try {
      await asegurarTablaCorreos();
      await db.execute(
        'INSERT INTO email_log (id, para, asunto, plantilla, desde, ok, error, enviado_por) VALUES (?,?,?,?,?,0,?,?)',
        [id, String(para).slice(0, 255), String(asunto).slice(0, 255), plantilla || null, MAIL_FROM || null,
         String(e.message || e).slice(0, 500), enviadoPor || null]
      );
    } catch (e2) { /* el log no puede romper el envío */ }
    return { ok: false, error: String(e.message || e) };
  }
}

/** Plantillas con la identidad FASE (papel + terracota). */
const PLANTILLAS_CORREO = {
  generico: (d) => `<h2 style="font-family:Georgia,serif;margin:0 0 10px">${d.titulo || 'Aviso de FASE'}</h2><p>${d.texto || ''}</p>`,
  invitacion_piloto: (d) => `<p style="font-size:15px">Hola ${d.nombre || ''},</p>
    <p>Te sumamos a la prueba de <b>FASE</b>, el radar cultural. Puedes empezar ahora mismo:</p>
    <p><a href="${d.app || ''}" style="background:#b4472c;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir FASE en el navegador</a></p>
    <p><a href="${d.apk || ''}">Descargar la app (Android · APK)</a></p>
    <p>Entras con tu mismo correo. Cualquier cosa que no funcione, mandala desde el botón "Reportar algo".</p>`,
  ingreso_aprobado: (d) => `<p style="font-size:15px">Hola ${d.nombre || ''},</p>
    <p>Ya eres parte de <b>${d.compania || ''}</b>. Vas a ver sus datos (equipo, inventario, obras) en la app.</p>`,
  invitacion_ensayo: (d) => `<p style="font-size:15px">Hola ${d.nombre || ''},</p>
    <p>Te invito al <b>${d.obra || 'ensayo'}</b>:</p>
    <p style="font-size:16px;line-height:1.6">📅 <b>${d.fecha || ''}</b> · 🕗 <b>${d.hora || ''}</b><br>📍 ${d.lugar || 'por confirmar'}</p>
    ${d.descripcion ? `<p style="color:#5e564c">${d.descripcion}</p>` : ''}
    <p>En el mismo correo va adjunta la <b>invitación de calendario</b>: confirma con
    <b>Sí / No / Quizás</b> y el ensayo queda agendado en tu calendario.</p>
    <p style="margin:18px 0 6px">
      <a href="${d.linkPlanner || ''}" style="background:#b4472c;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir el Planner de ensayos</a>
    </p>
    <p style="margin:0 0 14px">
      <a href="${d.linkApp || ''}" style="color:#b4472c">Abrir FASE en el navegador</a>
    </p>
    <p style="font-size:11.5px;color:#5e564c">Cualquier duda, respondé este correo (llega a producción).</p>`,
  recordatorio_ensayo: (d) => `<p style="font-size:15px">Hola ${d.nombre || ''},</p>
    <p>Te recuerdo el ensayo de <b>${d.obra || ''}</b>:</p>
    <p style="font-size:16px">📅 <b>${d.fecha || ''}</b> · 🕗 <b>${d.hora || ''}</b><br>📍 ${d.lugar || ''}</p>`,
  // Invitación al elenco de una obra (Tanda B). Sólo sale cuando producción llama al
  // endpoint de invitación; nunca se manda sola al inscribir a alguien.
  invitacion_elenco: (d) => `<p style="font-size:15px">Hola ${d.nombre || ''},</p>
    <p>Te sumamos al elenco de <b>${d.obra || ''}</b>${d.compania ? `, de <b>${d.compania}</b>` : ''}.</p>
    <p style="font-size:16px;line-height:1.7">🎭 <b>${d.rol || 'Elenco'}</b>${d.personaje ? ` · personaje: <b>${d.personaje}</b>` : ''}</p>
    ${d.estreno ? `<p>Estreno: <b>${d.estreno}</b></p>` : ''}
    <p>En el Planner de ensayos tienes las fechas, los lugares y el equipo de la obra.</p>
    <p style="margin:18px 0 6px">
      <a href="${d.linkPlanner || ''}" style="background:#b4472c;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir el Planner de ensayos</a>
    </p>`,
};

function marcoCorreo(contenido) {
  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#1d1a16;background:#f5efe4;padding:22px">
    <div style="max-width:520px;margin:0 auto;background:#fffbf4;border:1px solid #d8cdba;border-radius:18px;padding:22px">
      <p style="margin:0 0 14px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b4472c"><b>ATHAMU · FASE</b></p>
      ${contenido}
      <p style="margin:22px 0 0;font-size:11px;color:#5e564c">FASE · radar cultural del ecosistema ATHA Producciones.</p>
    </div>
  </div>`;
}

/** Prueba real del correo (sólo administración). */
app.post('/api/v1/crm/avisos/probar-correo', async (req, res) => {
  try {
    const email = emailDeSesion(req);
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });
    if (!(await esAdministrador(email))) return res.status(403).json({ ok: false, error: 'sólo administración' });
    const para = String(req.body?.para || email);
    const r = await enviarCorreo({
      para, asunto: 'Prueba del correo del ecosistema FASE',
      plantilla: 'generico',
      html: marcoCorreo(PLANTILLAS_CORREO.generico({
        titulo: 'El correo del ecosistema funciona',
        texto: `Este aviso salió desde <b>${MAIL_FROM || '(sin configurar)'}</b> con la identidad de ATHAMU. ` +
               `Las respuestas van a ${MAIL_REPLY_TO || '(sin Reply-To)'}.`,
      })),
      enviadoPor: email,
    });
    return res.status(r.ok ? 200 : 503).json({ ...r, desde: MAIL_FROM, reply_to: MAIL_REPLY_TO });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Enviar un aviso desde el ecosistema (administración o producción). */
app.post('/api/v1/crm/avisos/correo', async (req, res) => {
  try {
    const ident = identidad(req);
    const email = emailDeSesion(req) || ident.email;
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });
    const b = req.body || {};
    const para = String(b.para || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)) return res.status(400).json({ ok: false, error: 'Correo destinatario inválido.' });
    const asunto = String(b.asunto || '').trim().slice(0, 200);
    if (asunto.length < 3) return res.status(400).json({ ok: false, error: 'Falta el asunto.' });

    const db = getPool();
    const userId = await exploradorId(email, ident.nombre, ident.foto);
    const puede = (await esAdministrador(email)) || (await puedeCrearAgrupacion(userId));
    if (!puede) return res.status(403).json({ ok: false, error: 'Sólo administración o producción puede enviar avisos.' });

    let contenido;
    const plantilla = String(b.plantilla || '').trim();
    if (plantilla && PLANTILLAS_CORREO[plantilla]) {
      contenido = PLANTILLAS_CORREO[plantilla](b.datos || {});
    } else if (b.html) {
      contenido = String(b.html).slice(0, 20000);
    } else {
      contenido = PLANTILLAS_CORREO.generico({ titulo: b.titulo, texto: String(b.texto || '').slice(0, 4000) });
    }

    const r = await enviarCorreo({
      para, asunto, html: marcoCorreo(contenido),
      plantilla: plantilla || 'generico', enviadoPor: email,
    });
    return res.status(r.ok ? 200 : 503).json(r);
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/** Historial de avisos enviados (sólo administración). */
app.get('/api/v1/crm/avisos/correos', async (req, res) => {
  try {
    const email = emailDeSesion(req);
    if (!email) return res.status(401).json({ ok: false, error: 'Sesión requerida' });
    if (!(await esAdministrador(email))) return res.status(403).json({ ok: false, error: 'sólo administración' });
    await asegurarTablaCorreos();
    const limite = Math.min(Number(req.query.limite) || 50, 200);
    const db = getPool();
    const [filas] = await db.execute(
      'SELECT id, para, asunto, plantilla, desde, ok, error, enviado_por, created_at FROM email_log ORDER BY created_at DESC LIMIT ?',
      [limite]
    );
    return res.json({ ok: true, total: filas.length, correos: filas, configurado: MAIL_ACTIVO, desde: MAIL_FROM, reply_to: MAIL_REPLY_TO });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

/* ---------------------------------------------------------------------------
 * VISTA PREVIA MÓVIL · /previa
 *
 * Maqueta navegable del rediseño "de pie": qué se hace en el teléfono (con acción
 * real) y qué queda en el CRM web. No es la app: sirve para iterar el diseño.
 * Lee datos REALES del propio hub (/api/v1/crm/...) con la sesión del navegador
 * (claves `user_session` / `atha_user_session`) o con `?email=` para evaluarla.
 * Se sirve inline (como /piloto) y con las fuentes embebidas: no pide nada afuera.
 * ------------------------------------------------------------------------- */
const PAGINA_PREVIA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vista previa · FASE Mobile "de pie"</title>
<style>
  @font-face{font-family:'Fraunces';font-style:normal;font-weight:400 700;font-display:swap;src:url('data:font/woff2;base64,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') format('woff2');}
  @font-face{font-family:'Instrument Sans';font-style:normal;font-weight:400;font-display:swap;src:url('data:font/woff2;base64,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') format('woff2');}@font-face{font-family:'Instrument Sans';font-style:normal;font-weight:500 600;font-display:swap;src:url('data:font/woff2;base64,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') format('woff2');}

  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --fondo:#1b1b1f; --fondo2:#242429; --panel:#26262b; --tinta:#f2efe9; --tinta2:#a8a29a;
    --tarjeta:#2e2e34; --linea:#3d3d45; --acento:#b4472c; --acento-suave:#3a2a25;
    --serif:'Instrument Sans',sans-serif;
  }
  body.tema-dia {
    --fondo:#eef0f4; --fondo2:#f7f8fa; --panel:#ffffff; --tinta:#171717; --tinta2:#5c5c66;
    --tarjeta:#ffffff; --linea:#dcdfe6; --acento:#0f766e; --acento-suave:#d7ece8;
    --serif:'Instrument Sans',sans-serif;
  }
  body.tema-papel {
    --fondo:#e9e0cf; --fondo2:#f5efe4; --panel:#fffbf4; --tinta:#1d1a16; --tinta2:#5e564c;
    --tarjeta:#fffbf4; --linea:#d8cdba; --acento:#b4472c; --acento-suave:#f0dcd3;
    --serif:'Fraunces',serif;
  }
  body { background:var(--fondo); color:var(--tinta); font-family:'Instrument Sans',system-ui,sans-serif; padding:18px; }
  h1,h2,h3 { font-family:var(--serif); font-weight:600; letter-spacing:-0.01em; }

  .aviso { max-width:1180px; margin:0 auto 16px; padding:12px 16px; border:1px dashed var(--linea); border-radius:14px; background:var(--panel); font-size:12.5px; line-height:1.5; color:var(--tinta2); }
  .aviso b { color:var(--tinta); }
  .barra { max-width:1180px; margin:0 auto 18px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; }
  .barra h1 { font-size:22px; }
  .controles { display:flex; gap:8px; flex-wrap:wrap; }
  .chip { border:1px solid var(--linea); background:var(--panel); color:var(--tinta2); border-radius:999px; padding:6px 12px; font-size:11.5px; font-weight:600; cursor:pointer; }
  .chip.on { background:var(--acento); border-color:var(--acento); color:#fff; }

  .cuerpo { max-width:1180px; margin:0 auto; display:flex; gap:26px; align-items:flex-start; flex-wrap:wrap; }

  /* ---------- teléfono ---------- */
  .telefono { width:390px; height:844px; flex:0 0 auto; border-radius:40px; border:1px solid var(--linea); background:var(--fondo2);
              box-shadow:0 24px 60px rgba(0,0,0,.35); overflow:hidden; display:flex; flex-direction:column; position:relative; }
  .tope { height:4px; background:var(--acento); opacity:.85; }
  .pantalla { flex:1; overflow-y:auto; padding:16px 16px 22px; }
  .tabs { height:64px; display:flex; border-top:1px solid var(--linea); background:var(--fondo2); }
  .tab { flex:1; border:0; background:transparent; color:var(--tinta2); font:600 10.5px 'Instrument Sans',sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; cursor:pointer; }
  .tab.on { color:var(--acento); }
  .tab svg { width:19px; height:19px; }
  .sello { position:absolute; right:14px; bottom:76px; width:34px; height:34px; border-radius:50%; border:1px solid var(--linea); background:var(--fondo2); display:flex; align-items:center; justify-content:center; }

  .titulo-seccion { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--tinta2); margin:16px 0 8px; }
  .tarjeta { border:1px solid var(--linea); background:var(--tarjeta); border-radius:18px; padding:12px; margin-bottom:10px; }
  .fila { display:flex; gap:10px; align-items:flex-start; }
  .grow { flex:1; min-width:0; }
  .mini { font-size:10.5px; color:var(--tinta2); }
  .dato { font-size:12px; }
  .fuerte { font-weight:600; }
  .pill { display:inline-block; font-size:9.5px; font-weight:700; border-radius:6px; padding:2px 6px; border:1px solid var(--acento); color:var(--acento); background:var(--acento-suave); }
  .acciones { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .btn { border:1px solid var(--linea); background:var(--fondo2); color:var(--tinta); border-radius:999px; padding:7px 12px; font:600 11px 'Instrument Sans',sans-serif; cursor:pointer; }
  .btn.principal { background:var(--acento); border-color:var(--acento); color:#fff; }
  .fecha { width:52px; flex:0 0 auto; text-align:center; border-right:1px dashed var(--linea); padding-right:8px; }
  .fecha .d { font-size:19px; font-weight:700; font-family:var(--serif); }
  .fecha .m { font-size:9.5px; font-weight:700; color:var(--acento); }
  .perfil { display:flex; gap:12px; align-items:center; }
  .foto { width:54px; height:54px; border-radius:16px; object-fit:cover; background:var(--acento-suave); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--acento); font-size:18px; }
  .chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
  .chips span { font-size:9.5px; border:1px solid var(--linea); border-radius:999px; padding:2px 8px; color:var(--tinta2); }
  .vacio { border:1px dashed var(--linea); border-radius:16px; padding:14px; text-align:center; font-size:11.5px; color:var(--tinta2); }
  .aviso-sim { font-size:11px; border:1px solid var(--acento); background:var(--acento-suave); color:var(--acento); border-radius:12px; padding:8px 10px; margin-bottom:10px; }

  /* ---------- paneles ---------- */
  .lateral { flex:1; min-width:320px; display:flex; flex-direction:column; gap:14px; }
  .panel { border:1px solid var(--linea); background:var(--panel); border-radius:18px; padding:14px 16px; }
  .panel h3 { font-size:14px; margin-bottom:8px; }
  .panel p, .panel li { font-size:12px; line-height:1.5; color:var(--tinta2); }
  .panel ul { margin-left:16px; }
  .modulo { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px dashed var(--linea); font-size:12px; }
  .modulo:last-child { border-bottom:0; }
  .modulo input { accent-color:var(--acento); }
  .modulo .nom { flex:1; }
  .modulo .ro { font-size:10px; color:var(--tinta2); }
  .fle { border:1px solid var(--linea); background:transparent; color:var(--tinta2); border-radius:6px; width:20px; height:20px; cursor:pointer; font-size:10px; }
  .dos { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .si { color:#3f7d3f; font-weight:600; }
  .no { color:#a4453a; font-weight:600; }
  code { font-family:ui-monospace,monospace; font-size:11px; background:var(--fondo); border:1px solid var(--linea); border-radius:6px; padding:1px 5px; }
</style>
</head>
<body class="tema-papel">

<div class="aviso">
  <b>Vista previa — no es la app.</b> Es una maqueta navegable para iterar el rediseño
  "de pie": qué se hace en el teléfono (con acción real) y qué queda en el CRM web.
  Los datos que ves son <b>reales</b>, leídos del hub (<code>/api/v1/crm/…</code>) con la sesión del CRM;
  lo que todavía no existe se muestra vacío o marcado como <span class="pill">propuesta</span>.
</div>

<div class="barra">
  <h1>FASE Mobile · "de pie"</h1>
  <div class="controles">
    <button class="chip" id="t-noche" onclick="tema('tema-noche')">Noche</button>
    <button class="chip" id="t-dia" onclick="tema('tema-dia')">Día</button>
    <button class="chip on" id="t-papel" onclick="tema('tema-papel')">Papel</button>
    <button class="chip" onclick="simularDesdeCrm()">Simular cambio desde el CRM</button>
  </div>
</div>

<div class="cuerpo">
  <!-- ================= TELÉFONO ================= -->
  <div class="telefono">
    <div class="tope"></div>
    <div class="pantalla" id="pantalla">Cargando datos del hub…</div>
    <nav class="tabs" id="tabs"></nav>
    <div class="sello" title="Distintivo FASE, siempre visible">
      <img src="/assets/fase/fase-simbolo.svg" alt="" width="18" height="18">
    </div>
  </div>

  <!-- ================= PANELES ================= -->
  <div class="lateral">
    <div class="panel">
      <h3>Menú como datos (no como código)</h3>
      <p style="margin-bottom:10px">Esto es lo que hoy existe en la base como
      <code>user_preferences.layout_config.navbar</code> y nadie lee. Aquí se edita desde el CRM y la app
      lo recibe en vivo: cambiá un check o el orden y mira la barra del teléfono.</p>
      <div id="editor-modulos"></div>
      <p style="margin-top:10px">Rol de prueba:</p>
      <div class="controles" id="roles" style="margin-top:6px"></div>
    </div>

    <div class="panel">
      <h3>Qué se hace en la app y qué queda en el CRM</h3>
      <div class="dos">
        <div>
          <p><span class="si">ENTRA (con acción real)</span></p>
          <ul>
            <li>Agenda y <b>publicar función</b></li>
            <li>Radar y roles cercanos, descubrir por QR</li>
            <li>Muro + chat de compañía</li>
            <li>Aprobar <b>solicitudes</b> de ingreso</li>
            <li>Nómina: sumar / quitar integrante</li>
            <li>Inventario: check-out / check-in por QR</li>
            <li>Tareas asignadas y avisos</li>
            <li>Perfil, agrupaciones y apariencia</li>
          </ul>
        </div>
        <div>
          <p><span class="no">SALE (queda en el CRM web)</span></p>
          <ul>
            <li>Planner y Arquitecto</li>
            <li>Ecosistema / catálogo de artefactos</li>
            <li>Leads y contactos (mini-CRM)</li>
            <li>Inventario completo y reportes</li>
            <li>Finanzas (edición)</li>
            <li>Editor completo de Obras</li>
            <li>Curaduría de nodos y QR admin</li>
            <li>Preferencias de cuenta y permisos</li>
          </ul>
        </div>
      </div>
      <p style="margin-top:10px">Regla: <b>si entra, tiene que poder hacer algo</b>. Cero saltos al CRM
      (<code>window.open</code>): o se resuelve aquí, o no se muestra.</p>
    </div>

    <div class="panel">
      <h3>Cómo llega "en vivo" al CRM</h3>
      <p>Hoy el tiempo real va en una sola dirección: el hub emite en
      <code>/api/v1/crm/radar/stream</code> (SSE) y <b>sólo la app escucha</b>; el CRM web no tiene
      ningún listener, por eso no ve los cambios hasta recargar.</p>
      <p style="margin-top:8px">El arreglo propuesto:</p>
      <ul>
        <li>un <b>bus único</b>: cada escritura emite <code>cambio {entidad, accion, id}</code></li>
        <li>las <b>dos</b> superficies escuchan el mismo stream y refrescan sólo lo afectado</li>
        <li>la app <b>nunca</b> guarda verdad local: escribe al hub y muestra lo que el hub devuelve
            (el teléfono sólo cachea para cuando no hay señal)</li>
        <li>escrituras idempotentes + aviso visible de "guardado"</li>
      </ul>
    </div>
  </div>
</div>

<script>
/* ===========================================================================
   Previa navegable. JS sin template literals a propósito: esta página se sirve
   desde el hub (server.js) y los template literals chocan con los del hub.
   =========================================================================== */
var EMAIL = '';
try {
  // La previa acepta ?email= para poder evaluarla con datos reales, y si no, usa la
  // sesión que ya tenga el navegador en el origen del hub (el CRM guarda \`user_session\`,
  // la app \`atha_user_session\`: se miran las dos).
  var params = new URLSearchParams(location.search);
  EMAIL = params.get('email') || '';
  var CLAVES = ['atha_user_session', 'user_session', 'atha_user_profile'];
  for (var ii = 0; ii < CLAVES.length && !EMAIL; ii++) {
    var us = JSON.parse(localStorage.getItem(CLAVES[ii]) || 'null');
    EMAIL = (us && (us.email || (us.user && us.user.email))) || '';
  }
} catch (e) { EMAIL = ''; }

var estado = {
  modulo: 'inicio',
  rol: 'direccion',
  lat: -33.43985, lng: -70.67211,
  datos: { perfil: null, agenda: null, nodos: null, muro: null, mias: null, nomina: null, solicitudes: null },
  simulando: false
};

/* Módulos = catálogo con acción y rol. El orden aquí es el de la barra. */
var CATALOGO = [
  { id:'inicio',    nombre:'Inicio',    roles:['explorador','artista','produccion','direccion'] },
  { id:'cerca',     nombre:'Cerca',     roles:['explorador','artista','produccion','direccion'] },
  { id:'muro',      nombre:'Muro',      roles:['explorador','artista','produccion','direccion'] },
  { id:'tareas',    nombre:'Tareas',    roles:['artista','produccion','direccion'] },
  { id:'nomina',    nombre:'Nómina',    roles:['produccion','direccion'] },
  { id:'inventario',nombre:'Inventario',roles:['produccion','direccion'] },
  { id:'perfil',    nombre:'Perfil',    roles:['explorador','artista','produccion','direccion'] }
];
var ACTIVOS = ['inicio','cerca','muro','tareas','nomina','perfil'];

var ICONOS = {
  inicio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  cerca:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/></svg>',
  muro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M9 10v10"/></svg>',
  tareas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5"/><path d="m3 12 1.5 1.5L7 11"/></svg>',
  nomina:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M18 7v6M15 10h6"/></svg>',
  inventario:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
  perfil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
};

function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
  return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function dist(m) {
  if (typeof m !== 'number' || !isFinite(m)) return '';
  return m < 1000 ? Math.round(m) + ' m' : (m/1000).toFixed(1).replace('.', ',') + ' km';
}
function hora(h) { return h ? String(h).slice(0,5) : ''; }
function fechaPartes(iso) {
  var m = /^(\\\\d{4})-(\\\\d{2})-(\\\\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  var MES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  var DIA = ['dom','lun','mar','mié','jue','vie','sáb'];
  return { d: d.getDate(), m: MES[d.getMonth()], w: DIA[d.getDay()] };
}
var LAT = function () { return '?lat=' + estado.lat + '&lng=' + estado.lng; };

/* --------------------------- carga de datos --------------------------- */
function pedir(ruta, conEmail) {
  var cab = { 'Content-Type':'application/json' };
  if (EMAIL) cab['x-atha-email'] = EMAIL;
  var url = ruta + (ruta.indexOf('?') >= 0 ? '&' : '?') + 'email=' + encodeURIComponent(EMAIL);
  return fetch(url, { headers: cab }).then(function (r) { return r.json(); });
}

function cargarTodo() {
  if (!EMAIL) { pintar(); return; }
  var trabajos = [
    pedir('/api/v1/crm/sesion').then(function (d) { estado.datos.perfil = d && d.user || null; }).catch(function(){}),
    pedir('/api/v1/crm/radar/eventos' + LAT()).then(function (d) { estado.datos.agenda = d; }).catch(function(){}),
    pedir('/api/v1/crm/radar/nodos' + LAT()).then(function (d) { estado.datos.nodos = d; }).catch(function(){}),
    pedir('/api/v1/crm/radar/feed?limite=6').then(function (d) { estado.datos.muro = d; }).catch(function(){}),
    pedir('/api/v1/crm/companias/mias').then(function (d) { estado.datos.mias = d; }).catch(function(){}),
    pedir('/api/v1/crm/companias/solicitudes').then(function (d) { estado.datos.solicitudes = d; }).catch(function(){})
  ];
  Promise.all(trabajos).then(function () {
    var mias = (estado.datos.mias && estado.datos.mias.agrupaciones) || [];
    if (mias.length) {
      pedir('/api/v1/crm/companias/' + encodeURIComponent(mias[0].company_id) + '/nomina')
        .then(function (d) { estado.datos.nomina = d; pintar(); }).catch(function () { pintar(); });
    } else { pintar(); }
  });
}

/* --------------------------- pantallas --------------------------- */
function pantallaInicio() {
  var p = estado.datos.perfil || {};
  var ag = estado.datos.agenda || { eventos: [], cartelera: [] };
  var html = '';
  if (!EMAIL) html += '<div class="aviso-sim">Entra desde el CRM (o con el link del puente) para ver tus datos. Sin sesión, la previa muestra los estados vacíos.</div>';
  html += '<div class="tarjeta"><div class="perfil">'
      + '<div class="foto">' + (p.avatar ? '<img class="foto" src="' + esc(p.avatar) + '" alt="">' : esc((p.name||'?').slice(0,1))) + '</div>'
      + '<div class="grow"><div class="fuerte dato">' + esc(p.name || 'Tu nombre') + '</div>'
      + '<div class="mini">' + esc(p.roleTitle || p.role || 'explorador') + '</div>'
      + '<div class="mini" style="margin-top:4px">Tu descripción y disciplinas se ven aquí (se editan en Perfil).</div></div></div></div>';

  html += '<div class="titulo-seccion">Para hoy</div>';
  var pend = ((estado.datos.solicitudes || {}).solicitudes || []).filter(function (s) { return s.status === 'pendiente'; });
  html += '<div class="tarjeta"><div class="fila"><div class="grow"><div class="dato fuerte">Solicitudes de ingreso por resolver</div>'
        + '<div class="mini">' + (pend.length ? pend.length + ' pedido(s) esperando: se aprueban desde aquí en 2 toques' : 'Nada pendiente ahora') + '</div></div>'
        + '<span class="pill">' + pend.length + '</span></div>'
        + '<div class="acciones"><button class="btn principal">Resolver</button><button class="btn">Ver detalle</button></div></div>';

  html += '<div class="titulo-seccion">Próximas funciones</div>';
  var evs = ag.eventos || [];
  if (!evs.length) {
    html += '<div class="vacio">No hay eventos cargados en el CRM.<br>Desde aquí se publican (propuesta): <b>+ Publicar función</b>.</div>';
  }
  evs.slice(0, 5).forEach(function (e) {
    var f = fechaPartes(e.date);
    html += '<div class="tarjeta"><div class="fila">'
      + '<div class="fecha"><div class="m">' + (f ? f.w : '') + '</div><div class="d">' + (f ? f.d : '—') + '</div><div class="m">' + (f ? f.m : '') + '</div></div>'
      + '<div class="grow"><div class="dato fuerte">' + esc(e.title) + '</div>'
      + '<div class="mini">' + [hora(e.time_start), e.venue || e.location, e.company_name].filter(Boolean).map(esc).join(' · ') + '</div>'
      + (typeof e.distance_m === 'number' ? '<div class="mini">a ' + dist(e.distance_m) + ' de vos</div>' : '')
      + '</div></div></div>';
  });

  html += '<div class="titulo-seccion">En cartelera</div>';
  (ag.cartelera || []).slice(0, 3).forEach(function (o) {
    html += '<div class="tarjeta"><div class="dato fuerte">' + esc(o.title) + '</div>'
      + '<div class="mini">' + [o.company_name, o.discipline, o.status].filter(Boolean).map(esc).join(' · ') + '</div></div>';
  });
  return html;
}

function pantallaCerca() {
  var d = estado.datos.nodos || { nodos: [] };
  var nodos = (d.nodos || []).slice().sort(function (a, b) { return (a.distance_m||9e9) - (b.distance_m||9e9); });
  var html = '<div class="titulo-seccion">Todo cerca</div>'
    + '<div class="mini" style="margin-bottom:8px">' + nodos.length + ' lugares · ordenados por distancia real (GPS del teléfono)</div>';
  if (!nodos.length) return html + '<div class="vacio">Sin lugares cargados.</div>';
  nodos.slice(0, 6).forEach(function (n) {
    html += '<div class="tarjeta"><div class="fila"><div class="grow">'
      + '<div class="dato fuerte">' + esc(n.is_discovered ? n.name : 'Lugar por descubrir') + '</div>'
      + '<div class="mini">' + esc(n.category) + (n.hours ? ' · ' + esc(n.hours) : '') + '</div>'
      + '<div class="mini">' + (n.is_discovered ? esc((n.short_description||'').slice(0,70)) : 'Acércate para desbloquear su ficha') + '</div>'
      + '</div><div class="mini fuerte">' + dist(n.distance_m) + '</div></div>'
      + '<div class="acciones"><button class="btn">Cómo llegar</button><button class="btn">Ver agenda</button></div></div>';
  });
  return html;
}

function pantallaMuro() {
  var d = estado.datos.muro || { posts: [] };
  var posts = d.posts || [];
  var html = '<div class="titulo-seccion">Muro</div>'
    + '<div class="tarjeta"><div class="mini">Lo que se publica aquí llega al instante al CRM y al resto de la app.</div>'
    + '<div class="acciones"><button class="btn principal">+ Publicar con foto</button><button class="btn">Chat de compañía</button></div></div>';
  if (!posts.length) return html + '<div class="vacio">Todavía no hay publicaciones.</div>';
  posts.forEach(function (p) {
    html += '<div class="tarjeta"><div class="dato fuerte">' + esc((p.autor && p.autor.name) || p.user_name || 'Alguien') + '</div>'
      + '<div class="mini">' + esc((p.content || '').slice(0, 120)) + '</div></div>';
  });
  return html;
}

function pantallaTareas() {
  var sol = ((estado.datos.solicitudes || {}).solicitudes || []).filter(function (s) { return s.status === 'pendiente'; });
  var html = '<div class="titulo-seccion">Tareas · lo que se hace de pie</div>';
  sol.forEach(function (s) {
    html += '<div class="tarjeta"><div class="dato fuerte">' + esc(s.nombre || s.email) + ' pide entrar a ' + esc(s.company_name) + '</div>'
      + '<div class="mini">rol pedido: ' + esc(s.role_in_company || 'artist') + (s.mensaje ? ' · "' + esc(s.mensaje) + '"' : '') + '</div>'
      + '<div class="acciones"><button class="btn principal">Aceptar</button><button class="btn">Rechazar</button></div></div>';
  });
  html += '<div class="tarjeta"><div class="dato fuerte">Confirmar asistencia a función <span class="pill">propuesta</span></div>'
    + '<div class="mini">Ensayo general · martes 18:00 · Sala ATHA</div>'
    + '<div class="acciones"><button class="btn principal">Confirmo</button><button class="btn">No puedo</button></div></div>';
  html += '<div class="tarjeta"><div class="dato fuerte">Inventario: retirar equipos <span class="pill">propuesta</span></div>'
    + '<div class="mini">Escanear QR del item y queda el check-out con tu nombre y hora</div>'
    + '<div class="acciones"><button class="btn principal">Escanear QR</button></div></div>';
  if (!sol.length) html += '<div class="vacio">Sin solicitudes pendientes: cuando alguien pida entrar a tu agrupación, aparece aquí.</div>';
  return html;
}

function pantallaNomina() {
  var n = estado.datos.nomina;
  var mias = (estado.datos.mias && estado.datos.mias.agrupaciones) || [];
  var html = '<div class="titulo_seccion titulo-seccion">Nómina de ' + esc((mias[0] && mias[0].company_name) || 'tu agrupación') + '</div>';
  if (!n || !(n.personas || []).length) return html + '<div class="vacio">Sin datos de nómina. (En la app real: alta y baja de integrantes aquí mismo.)</div>';
  (n.personas || []).slice(0, 6).forEach(function (p) {
    html += '<div class="tarjeta"><div class="fila"><div class="grow"><div class="dato fuerte">' + esc(p.full_name) + '</div>'
      + '<div class="mini">' + esc(p.role_title || p.role_in_company || '') + ' · ' + esc(p.kind || '') + '</div></div></div></div>';
  });
  html += '<div class="acciones"><button class="btn principal">+ Sumar integrante</button></div>';
  return html;
}

function pantallaPerfil() {
  var p = estado.datos.perfil || {};
  var mias = (estado.datos.mias && estado.datos.mias.agrupaciones) || [];
  var html = '<div class="tarjeta"><div class="perfil">'
    + '<div class="foto">' + esc((p.name||'?').slice(0,1)) + '</div>'
    + '<div class="grow"><div class="dato fuerte">' + esc(p.name || 'Tu nombre') + '</div>'
    + '<div class="mini">' + esc(p.email || EMAIL || 'sin sesión') + '</div></div></div></div>';
  html += '<div class="titulo-seccion">Mis agrupaciones</div>';
  if (!mias.length) html += '<div class="vacio">No perteneces a ninguna agrupación.</div>';
  mias.forEach(function (m) {
    html += '<div class="tarjeta"><div class="dato fuerte">' + esc(m.company_name) + '</div>'
      + '<div class="mini">tu rol: ' + esc(m.role_in_company) + '</div></div>';
  });
  html += '<div class="titulo-seccion">Apariencia</div>'
    + '<div class="tarjeta"><div class="mini">Noche · Día · Papel (los tres modos ya funcionan en la app).</div></div>'
    + '<div class="titulo-seccion">Se gestiona en el CRM web</div>'
    + '<div class="tarjeta"><div class="mini">Planner · Arquitecto · Ecosistema · Leads · Inventario completo · Finanzas · Obras · Curaduría de nodos · Permisos. Sin saltos: la app no te saca al navegador.</div></div>';
  return html;
}

var PANTALLAS = { inicio:pantallaInicio, cerca:pantallaCerca, muro:pantallaMuro, tareas:pantallaTareas, nomina:pantallaNomina,
  inventario:function(){ return '<div class="vacio">Inventario móvil: check-out / check-in con QR. <span class="pill">propuesta</span></div>'; },
  perfil:pantallaPerfil };

/* --------------------------- pintado --------------------------- */
function pintar() {
  var pantalla = document.getElementById('pantalla');
  if (!pantalla) return;
  var fn = PANTALLAS[estado.modulo] || pantallaInicio;
  var html = '';
  if (estado.simulando) {
    html += '<div class="aviso-sim">Cambio recibido del CRM en vivo: el menú de la app se actualizó sin recargar.</div>';
    estado.simulando = false;
  }
  pantalla.innerHTML = html + fn();
  pantalla.scrollTop = 0;

  var activos = activosDelRol();
  var tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  activos.forEach(function (id) {
    var m = CATALOGO.filter(function (c) { return c.id === id; })[0];
    if (!m) return;
    var b = document.createElement('button');
    b.className = 'tab' + (estado.modulo === id ? ' on' : '');
    b.innerHTML = ICONOS[id] + '<span>' + esc(m.nombre) + '</span>';
    b.onclick = function () { estado.modulo = id; pintar(); };
    tabs.appendChild(b);
  });
}

function activosDelRol() {
  return ACTIVOS.filter(function (id) {
    var m = CATALOGO.filter(function (c) { return c.id === id; })[0];
    return m && m.roles.indexOf(estado.rol) >= 0;
  });
}

function editorModulos() {
  var caja = document.getElementById('editor-modulos');
  caja.innerHTML = '';
  ACTIVOS.forEach(function (id, i) {
    var m = CATALOGO.filter(function (c) { return c.id === id; })[0];
    if (!m) return;
    var fila = document.createElement('div');
    fila.className = 'modulo';
    fila.innerHTML = '<input type="checkbox" checked>'
      + '<span class="nom">' + esc(m.nombre) + '</span>'
      + '<span class="ro">' + esc(m.roles.length === 4 ? 'todos' : m.roles.join(', ')) + '</span>';
    fila.querySelector('input').onchange = function () { quitar(id); };
    var arriba = document.createElement('button');
    arriba.className = 'fle'; arriba.textContent = '↑';
    arriba.onclick = function () { mover(id, -1); };
    var abajo = document.createElement('button');
    abajo.className = 'fle'; abajo.textContent = '↓';
    abajo.onclick = function () { mover(id, 1); };
    fila.appendChild(arriba); fila.appendChild(abajo);
    caja.appendChild(fila);
  });
  var sobrantes = CATALOGO.filter(function (c) { return ACTIVOS.indexOf(c.id) < 0; });
  sobrantes.forEach(function (m) {
    var fila = document.createElement('div');
    fila.className = 'modulo';
    fila.innerHTML = '<input type="checkbox">'
      + '<span class="nom">' + esc(m.nombre) + '</span><span class="ro">' + esc(m.roles.join(', ')) + '</span>';
    fila.querySelector('input').onchange = function () { agregar(m.id); };
    caja.appendChild(fila);
  });
}

function roles() {
  var caja = document.getElementById('roles');
  caja.innerHTML = '';
  ['explorador','artista','produccion','direccion'].forEach(function (r) {
    var b = document.createElement('button');
    b.className = 'chip' + (estado.rol === r ? ' on' : '');
    b.textContent = r;
    b.onclick = function () { estado.rol = r; roles(); editorModulos(); ajustarModulo(); pintar(); };
    caja.appendChild(b);
  });
}

function ajustarModulo() {
  var act = activosDelRol();
  if (act.indexOf(estado.modulo) < 0) estado.modulo = act[0] || 'inicio';
}
function quitar(id) { ACTIVOS = ACTIVOS.filter(function (x) { return x !== id; }); ajustarModulo(); editorModulos(); pintar(); }
function agregar(id) { if (ACTIVOS.indexOf(id) < 0) ACTIVOS.push(id); editorModulos(); pintar(); }
function mover(id, delta) {
  var i = ACTIVOS.indexOf(id), j = i + delta;
  if (i < 0 || j < 0 || j >= ACTIVOS.length) return;
  var tmp = ACTIVOS[i]; ACTIVOS[i] = ACTIVOS[j]; ACTIVOS[j] = tmp;
  editorModulos(); pintar();
}

function tema(nombre) {
  document.body.className = nombre;
  ['tema-noche','tema-dia','tema-papel'].forEach(function (t) {
    var b = document.getElementById('t-' + t.split('-')[1]);
    if (b) b.className = 'chip' + (t === nombre ? ' on' : '');
  });
}

/* Simula el cambio que hoy NO llega: algo se edita en el CRM y la app lo recibe. */
function simularDesdeCrm() {
  var entra = ['nomina','inventario'].filter(function (id) { return ACTIVOS.indexOf(id) < 0; });
  if (entra.length) { ACTIVOS.push(entra[0]); }
  else if (ACTIVOS.length > 3) { ACTIVOS = ACTIVOS.filter(function (id) { return id !== 'nomina'; }); }
  estado.simulando = true;
  editorModulos(); ajustarModulo(); pintar();
}

/* arranque */
if (typeof navigator !== 'undefined' && navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (pos) {
    estado.lat = pos.coords.latitude; estado.lng = pos.coords.longitude;
    cargarTodo();
  }, function () { cargarTodo(); }, { timeout: 4000 });
} else { cargarTodo(); }

editorModulos(); roles(); pintar();
</script>
</body>
</html>
`;
app.get('/previa', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_PREVIA);
});

// ---------------------------------------------------------------------------
// NODOS DEL RADAR CULTURAL (ADMINISTRACIÓN)
//
// Página servida en línea por el hub (/nodos). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/nodos.html (ver docs/NODOS_ADMIN.md).
// ---------------------------------------------------------------------------
// PANEL DE NODOS DEL RADAR (ADMINISTRACIÓN)
//
// Página servida en línea por el hub (/nodos). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/nodos.html (ver docs/).
// ---------------------------------------------------------------------------
// PANEL DE NODOS DEL RADAR (ADMINISTRACIÓN)
//
// Página servida en línea por el hub (/nodos). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/nodos.html (ver docs/).
// ---------------------------------------------------------------------------
const PAGINA_NODOS = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nodos del radar · FASE CRM</title>
<link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>
  :root {
    --fondo:#F5EFE4; --fondo2:#EDE4D3; --tarjeta:#FFFBF4; --panel:#FFFBF4;
    --tinta:#1D1A16; --tinta2:#5E564C; --linea:#D8CDBA; --acento:#B4472C; --acento-suave:#F3E1DA;
    --ok:#4E6B3A; --alerta:#C98A1E; --malo:#8A3B6B;
    --serif: Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:14px/1.5 var(--sans); }
  a { color:var(--acento); }
  header { position:sticky; top:0; z-index:20; background:var(--tarjeta); border-bottom:1px solid var(--linea); padding:12px 16px; }
  .env { max-width:1220px; margin:0 auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .marca { display:flex; align-items:center; gap:9px; font:700 16px var(--serif); }
  .marca img { width:26px; height:26px; }
  .quien { margin-left:auto; font-size:12px; color:var(--tinta2); }
  .quien b { color:var(--tinta); }
  main { max-width:1220px; margin:0 auto; padding:16px; }
  .barra { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
  input, select, textarea { font:13px var(--sans); color:var(--tinta); background:var(--tarjeta); border:1px solid var(--linea); border-radius:10px; padding:8px 10px; }
  textarea { min-height:74px; resize:vertical; }
  input:focus, select:focus, textarea:focus { outline:2px solid var(--acento-suave); border-color:var(--acento); }
  .btn { border:1px solid var(--linea); background:var(--fondo2); color:var(--tinta); border-radius:999px; padding:8px 14px; font:600 12.5px var(--sans); cursor:pointer; }
  .btn:hover { border-color:var(--acento); color:var(--acento); }
  .btn.principal { background:var(--acento); border-color:var(--acento); color:#fff; }
  .btn.principal:hover { color:#fff; filter:brightness(1.06); }
  .btn.chico { padding:5px 10px; font-size:11.5px; }
  .btn.peligro:hover { border-color:var(--malo); color:var(--malo); }
  /* Galería de fotos candidatas (búsqueda manual de la foto del lugar) */
  .galeria { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-top:8px; }
  .galeria img { width:100%; height:66px; object-fit:cover; border-radius:8px; border:1px solid var(--linea); cursor:pointer; }
  .galeria img:hover { border-color:var(--acento); }
  .metricas { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
  .metrica { background:var(--tarjeta); border:1px solid var(--linea); border-radius:14px; padding:8px 12px; min-width:104px; }
  .metrica .n { font:700 19px var(--serif); }
  .metrica .t { font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--tinta2); }
  .metrica.aviso .n { color:var(--alerta); }
  .layout { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; }
  .col-principal { flex:1 1 640px; min-width:320px; }
  .col-lateral { flex:0 1 360px; min-width:300px; display:flex; flex-direction:column; gap:14px; }
  .panel { background:var(--panel); border:1px solid var(--linea); border-radius:18px; padding:14px 16px; }
  .panel h3 { font:700 14px var(--serif); margin:0 0 8px; }
  .panel p, .panel li { font-size:12.5px; color:var(--tinta2); }
  table { width:100%; border-collapse:collapse; background:var(--tarjeta); border:1px solid var(--linea); border-radius:16px; overflow:hidden; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--linea); font-size:12.5px; vertical-align:top; }
  th { background:var(--fondo2); font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--tinta2); }
  tr:last-child td { border-bottom:0; }
  tr.sin-coords td { background:#FDF6E8; }
  .nom { font-weight:600; }
  .mini { font-size:10.5px; color:var(--tinta2); }
  .pill { display:inline-block; font-size:9.5px; font-weight:700; border-radius:6px; padding:2px 6px; border:1px solid var(--linea); color:var(--tinta2); }
  .pill.ok { border-color:var(--ok); color:var(--ok); }
  .pill.borrador { border-color:var(--alerta); color:var(--alerta); }
  .pill.malo { border-color:var(--malo); color:var(--malo); }
  .acciones-fila { display:flex; gap:6px; flex-wrap:wrap; }
  #mapaGeneral { height:330px; border-radius:14px; border:1px solid var(--linea); }
  #mapaEditor { height:250px; border-radius:12px; border:1px solid var(--linea); margin-top:6px; }
  .modal-fondo { position:fixed; inset:0; background:rgba(29,26,22,.55); display:none; z-index:50; padding:18px; overflow:auto; }
  .modal-fondo.abierto { display:block; }
  .modal { max-width:760px; margin:0 auto; background:var(--tarjeta); border:1px solid var(--linea); border-radius:20px; padding:18px; }
  .modal h2 { font:700 18px var(--serif); margin:0 0 4px; }
  .campos { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
  .campo { display:flex; flex-direction:column; gap:4px; }
  .campo.ancho { grid-column:1 / -1; }
  .campo label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--tinta2); font-weight:700; }
  .campo .ayuda { font-size:10.5px; color:var(--tinta2); }
  .fila-campos { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .pie-modal { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; align-items:center; }
  .pie-modal .crece { flex:1; }
  .error { background:var(--acento-suave); border:1px solid var(--acento); color:var(--acento); border-radius:12px; padding:9px 12px; font-size:12.5px; margin-bottom:12px; }
  .aviso-sesion { background:#FDF6E8; border:1px solid var(--alerta); color:#7a5410; border-radius:12px; padding:10px 12px; font-size:12.5px; margin-bottom:12px; }
  .toast { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); background:var(--tinta); color:#fff; border-radius:999px; padding:9px 16px; font-size:12.5px; z-index:80; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.visible { opacity:1; }
  .vacio { border:1px dashed var(--linea); border-radius:16px; padding:16px; text-align:center; color:var(--tinta2); font-size:12.5px; }
  .duplicado { border-bottom:1px dashed var(--linea); padding:7px 0; font-size:12px; }
  .duplicado:last-child { border-bottom:0; }
  @media (max-width:720px) {
    .campos { grid-template-columns:1fr; }
    th:nth-child(4), td:nth-child(4) { display:none; }
  }
</style>
</head>
<body>
<header>
  <div class="env">
    <div class="marca"><img src="/assets/fase/fase-simbolo.svg" alt="FASE" /> Nodos del radar cultural</div>
    <div class="quien" id="quien">cargando…</div>
  </div>
</header>

<main>
  <div id="error" class="error" style="display:none"></div>
  <div id="sinSesion" class="aviso-sesion" style="display:none"></div>

  <div class="barra">
    <input id="buscar" type="search" placeholder="Buscar por nombre, ciudad o dirección…" style="flex:1 1 260px" />
    <select id="fCiudad"><option value="">Todas las comunas</option></select>
    <select id="fCategoria"><option value="">Todas las categorías</option></select>
    <select id="fEstado">
      <option value="">Publicados y borradores</option>
      <option value="1">Sólo publicados</option>
      <option value="0">Sólo borradores</option>
      <option value="sin">Sólo sin coordenada</option>
    </select>
    <button class="btn principal" id="btnNuevo">+ Nodo nuevo</button>
    <button class="btn" id="btnRecargar">Recargar</button>
  </div>

  <div class="metricas" id="metricas"></div>

  <div class="layout">
    <div class="col-principal">
      <div id="tablaContenedor"></div>
    </div>
    <div class="col-lateral">
      <div class="panel">
        <h3>Mapa de lo filtrado</h3>
        <p class="mini">Cada punto es un nodo del radar. Tocar un punto abre su ficha para editarla.</p>
        <div id="mapaGeneral"></div>
      </div>
      <div class="panel">
        <h3>Posibles duplicados</h3>
        <p class="mini">Nodos a menos de 200 m con el nombre parecido (el mismo lugar cargado dos veces).</p>
        <div id="duplicados"></div>
      </div>
      <div class="panel">
        <h3>Cómo se usa</h3>
        <ul style="margin:6px 0 0 16px; padding:0">
          <li>Un nodo <b>publicado</b> aparece en la app; un <b>borrador</b> sólo se ve aquí.</li>
          <li>El <b>radio de desbloqueo</b> es la distancia a la que el lugar se abre en el teléfono (por defecto 120 m).</li>
          <li>El <b>horario</b> lo muestra la app tal como se escriba ("Lun a Sáb 10:00 a 18:45"). Si está vacío, no se inventa.</li>
          <li>Si falta la coordenada, el lugar se ve sin distancia: se puede ubicar haciendo clic en el mapa.</li>
        </ul>
      </div>
    </div>
  </div>
</main>

<div class="modal-fondo" id="modalFondo">
  <div class="modal">
    <h2 id="modalTitulo">Nodo nuevo</h2>
    <div class="mini" id="modalSub"></div>
    <div class="campos">
      <div class="campo ancho">
        <label for="eName">Nombre del lugar *</label>
        <input id="eName" type="text" placeholder="Teatro Regional Lucho Gatica" />
      </div>
      <div class="campo">
        <label for="eCategory">Categoría</label>
        <input id="eCategory" list="cats" type="text" placeholder="Teatro" />
        <datalist id="cats"></datalist>
      </div>
      <div class="campo">
        <label for="eUnlock">Radio de desbloqueo (m)</label>
        <input id="eUnlock" type="number" min="20" max="5000" step="10" placeholder="120" />
      </div>
      <div class="campo ancho">
        <label for="eShort">Descripción corta</label>
        <input id="eShort" type="text" maxlength="300" placeholder="Sala de teatro municipal de Rancagua" />
      </div>
      <div class="campo ancho">
        <label for="eFull">Descripción larga</label>
        <textarea id="eFull" placeholder="Qué es, qué se puede ver, historia, cómo llegar…"></textarea>
      </div>
      <div class="campo ancho">
        <label for="eAddress">Dirección</label>
        <input id="eAddress" type="text" placeholder="Avenida Capitán Antonio Millán 342" />
      </div>
      <div class="campo">
        <label for="eCity">Comuna</label>
        <input id="eCity" type="text" placeholder="Rancagua" />
      </div>
      <div class="campo">
        <label for="eRegion">Región</label>
        <input id="eRegion" type="text" placeholder="Región del Libertador Gral. Bernardo O'Higgins" />
      </div>
      <div class="campo">
        <label for="eLat">Latitud</label>
        <input id="eLat" type="number" step="0.0000001" placeholder="-34.1755663" />
      </div>
      <div class="campo">
        <label for="eLng">Longitud</label>
        <input id="eLng" type="number" step="0.0000001" placeholder="-70.7406144" />
      </div>
      <div class="campo ancho">
        <div class="fila-campos">
          <button class="btn chico" id="btnUbicarme" type="button">Usar mi ubicación</button>
          <button class="btn chico" id="btnBuscarDir" type="button">Ubicar por la dirección (OpenStreetMap)</button>
          <button class="btn chico" id="btnVerMaps" type="button">Ver en Google Maps</button>
          <span class="mini">La dirección la resuelve OpenStreetMap y es aproximada: mueves el punto a mano si hace falta.</span>
        </div>
        <div id="mapaEditor"></div>
      </div>
      <div class="campo">
        <label for="eHours">Horario</label>
        <input id="eHours" type="text" maxlength="160" placeholder="Mar a Vie 11:00 a 17:00" />
      </div>
      <div class="campo">
        <label for="eCover">Foto</label>
        <div style="display:flex;gap:6px;align-items:stretch;flex-wrap:wrap">
          <input id="eCover" type="text" placeholder="https://… (o sube un archivo)" style="flex:1;min-width:140px" />
          <button type="button" class="btn principal" id="btnSubirFoto" title="Subir una foto desde tu computador o teléfono">Subir foto</button>
          <button type="button" class="btn" id="btnBuscarFotos" title="Buscar fotos libres en Wikimedia Commons">Buscar en Commons</button>
        </div>
        <input id="archivoFoto" type="file" accept="image/*" style="display:none" />
        <!-- Galería de candidatas: se elige a ojo (por eso no la decide el sistema) -->
        <div id="galeriaFotos" class="galeria" style="display:none"></div>
        <img id="previewCover" alt="" style="display:none;width:100%;max-height:160px;object-fit:cover;border-radius:10px;margin-top:8px;border:1px solid var(--linea)" />
        <p class="mini" id="estadoFoto" style="margin-top:4px">Sube una foto propia (se achica sola antes de guardarse) o elige una candidata libre. Sin foto el lugar se ve con un marcador “Sin foto”.</p>
      </div>
      <div class="campo">
        <label for="eQr">Código QR</label>
        <input id="eQr" type="text" placeholder="nd_…" />
      </div>
      <div class="campo">
        <label for="ePublicado">Estado</label>
        <label class="fila-campos" style="text-transform:none; letter-spacing:0; font-weight:400">
          <input id="ePublicado" type="checkbox" style="width:auto" /> Publicado (visible en la app)
        </label>
      </div>
    </div>
    <div class="pie-modal">
      <span class="crece mini" id="modalPista"></span>
      <button class="btn peligro" id="btnBorrar" type="button">Eliminar</button>
      <button class="btn" id="btnCancelar" type="button">Cancelar</button>
      <button class="btn principal" id="btnGuardar" type="button">Guardar</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
/* ---------------------------------------------------------------------------
   Panel de administración de los nodos culturales del radar (FASE CRM).
   Habla con la API del propio hub: /api/v1/crm/radar/nodos (permiso: administración).
   La identidad sale de la sesión del navegador en este origen (el CRM guarda
   \`user_session\`, la app \`atha_user_session\`) o de ?email= para poder abrirlo con
   una cuenta puntual.
--------------------------------------------------------------------------- */
var EMAIL = '';
try {
  var params = new URLSearchParams(location.search);
  EMAIL = params.get('email') || '';
  var CLAVES = ['user_session', 'atha_user_session', 'atha_user_profile'];
  for (var i = 0; i < CLAVES.length && !EMAIL; i++) {
    var us = JSON.parse(localStorage.getItem(CLAVES[i]) || 'null');
    EMAIL = (us && (us.email || (us.user && us.user.email))) || '';
  }
} catch (e) { EMAIL = ''; }

var NODOS = [];
var filtrados = [];
var editando = null;
var mapaGeneral = null;
var mapaEditor = null;
var marcadorEditor = null;
var capaGeneral = null;
var limitesChile = { lat: [-56.5, -17.0], lng: [-76.0, -66.0] };

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
function cabeceras() {
  var c = { 'Content-Type': 'application/json' };
  if (EMAIL) c['x-atha-email'] = EMAIL;
  return c;
}
function conEmail(ruta) {
  return ruta + (ruta.indexOf('?') >= 0 ? '&' : '?') + 'email=' + encodeURIComponent(EMAIL);
}
function toast(txt) {
  var t = document.getElementById('toast');
  t.textContent = txt;
  t.className = 'toast visible';
  setTimeout(function () { t.className = 'toast'; }, 2600);
}
function mostrarError(txt) {
  var e = document.getElementById('error');
  e.textContent = txt;
  e.style.display = txt ? 'block' : 'none';
}
function distM(a, b, c, d) {
  var R = 6371000, rad = Math.PI / 180;
  var dLat = (c - a) * rad, dLng = (d - b) * rad;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
}
function necesitaCoord(n) {
  return !n.latitude || !n.longitude || isNaN(Number(n.latitude)) || isNaN(Number(n.longitude));
}
function fueraDeChile(lat, lng) {
  return lat < limitesChile.lat[0] || lat > limitesChile.lat[1] || lng < limitesChile.lng[0] || lng > limitesChile.lng[1];
}

/* ------------------------------- carga ---------------------------------- */
function cargar() {
  document.getElementById('quien').innerHTML = EMAIL
    ? 'Sesión: <b>' + esc(EMAIL) + '</b>'
    : 'Sin sesión';
  if (!EMAIL) {
    var av = document.getElementById('sinSesion');
    av.innerHTML = 'No hay sesión en este navegador. Abre el panel desde el CRM, o agrega <b>?email=tucorreo@dominio.cl</b> a la dirección. Sólo las cuentas de administración pueden editar el radar.';
    av.style.display = 'block';
  }
  fetch('/api/v1/crm/radar/nodos?incluir_borradores=1', { headers: cabeceras() })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.ok || !res.d.ok) {
        mostrarError('No se pudieron leer los nodos: ' + (res.d && res.d.error ? res.d.error : 'HTTP ' + res.status));
        NODOS = [];
      } else {
        NODOS = res.d.nodos || [];
        mostrarError('');
      }
      pintar();
    })
    .catch(function (e) {
      mostrarError('No se pudo conectar con el hub: ' + e.message);
      NODOS = []; pintar();
    });
}

/* ------------------------------ filtros --------------------------------- */
function filtrar() {
  var q = norm(document.getElementById('buscar').value);
  var ciudad = document.getElementById('fCiudad').value;
  var cat = document.getElementById('fCategoria').value;
  var estado = document.getElementById('fEstado').value;
  filtrados = NODOS.filter(function (n) {
    if (ciudad && (n.city || '') !== ciudad) return false;
    if (cat && (n.category || '') !== cat) return false;
    if (estado === '1' && !n.is_published) return false;
    if (estado === '0' && n.is_published) return false;
    if (estado === 'sin' && !necesitaCoord(n)) return false;
    if (q) {
      var texto = norm([n.name, n.city, n.address, n.category, n.short_description].join(' '));
      if (texto.indexOf(q) < 0) return false;
    }
    return true;
  });
  filtrados.sort(function (a, b) {
    var ca = (a.city || '') + '|' + norm(a.name), cb = (b.city || '') + '|' + norm(b.name);
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
}

function llenarSelects() {
  var ciudades = {}, cats = {};
  NODOS.forEach(function (n) {
    if (n.city) ciudades[n.city] = (ciudades[n.city] || 0) + 1;
    if (n.category) cats[n.category] = (cats[n.category] || 0) + 1;
  });
  function opciones(id, datos, primera) {
    var sel = document.getElementById(id), actual = sel.value;
    sel.innerHTML = '<option value="">' + primera + '</option>';
    Object.keys(datos).sort().forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = k + ' (' + datos[k] + ')';
      sel.appendChild(o);
    });
    sel.value = actual && datos[actual] ? actual : '';
  }
  opciones('fCiudad', ciudades, 'Todas las comunas');
  opciones('fCategoria', cats, 'Todas las categorías');
  var dl = document.getElementById('cats');
  dl.innerHTML = '';
  Object.keys(cats).sort().forEach(function (k) {
    var o = document.createElement('option'); o.value = k; dl.appendChild(o);
  });
}

/* ------------------------------ pintado --------------------------------- */
function pintar() {
  llenarSelects();
  filtrar();

  var publicados = NODOS.filter(function (n) { return n.is_published; }).length;
  var sinCoord = NODOS.filter(necesitaCoord).length;
  var metros = [
    ['Nodos', NODOS.length, false],
    ['Publicados', publicados, false],
    ['Borradores', NODOS.length - publicados, NODOS.length - publicados > 0],
    ['Sin coordenada', sinCoord, sinCoord > 0],
    ['En pantalla', filtrados.length, false]
  ];
  document.getElementById('metricas').innerHTML = metros.map(function (m) {
    return '<div class="metrica' + (m[2] ? ' aviso' : '') + '"><div class="n">' + m[1] + '</div><div class="t">' + m[0] + '</div></div>';
  }).join('');

  var cont = document.getElementById('tablaContenedor');
  if (!NODOS.length) {
    cont.innerHTML = '<div class="vacio">Todavía no hay nodos cargados. Puedes crear el primero con “+ Nodo nuevo”, o cosecharlos de OpenStreetMap con <b>scripts/recolectar_nodos.py</b>.</div>';
  } else if (!filtrados.length) {
    cont.innerHTML = '<div class="vacio">Ningún nodo coincide con el filtro.</div>';
  } else {
    var filas = filtrados.map(function (n) {
      var coords = necesitaCoord(n) ? '<span class="pill borrador">sin coordenada</span>'
        : '<span class="mini">' + Number(n.latitude).toFixed(5) + ', ' + Number(n.longitude).toFixed(5) + '</span>';
      return '<tr class="' + (necesitaCoord(n) ? 'sin-coords' : '') + '">' +
        '<td><div class="nom">' + esc(n.name) + '</div>' +
          '<div class="mini">' + esc(n.short_description || '') + '</div>' +
          '<div class="mini">' + (n.hours ? 'Horario: ' + esc(n.hours) : 'sin horario') + '</div></td>' +
        '<td>' + esc(n.category || '—') + '<div class="mini">' + esc(n.city || 'sin comuna') + '</div></td>' +
        '<td>' + coords + '<div class="mini">' + esc(n.address || '') + '</div></td>' +
        '<td>' + (n.unlock_radius_m || 120) + ' m<div class="mini">' + (n.created_by ? esc(n.created_by) : '') + '</div></td>' +
        '<td>' + (n.is_published ? '<span class="pill ok">publicado</span>' : '<span class="pill borrador">borrador</span>') + '</td>' +
        '<td><div class="acciones-fila">' +
          '<button class="btn chico" data-accion="editar" data-id="' + esc(n.id) + '">Editar</button>' +
          '<button class="btn chico" data-accion="estado" data-id="' + esc(n.id) + '">' + (n.is_published ? 'Ocultar' : 'Publicar') + '</button>' +
          (necesitaCoord(n) ? '' : '<a class="btn chico" target="_blank" rel="noreferrer" href="https://www.google.com/maps?q=' + n.latitude + ',' + n.longitude + '">Mapa</a>') +
        '</div></td>' +
      '</tr>';
    }).join('');
    cont.innerHTML = '<table><thead><tr><th>Lugar</th><th>Categoría</th><th>Coordenada</th><th>Desbloqueo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + filas + '</tbody></table>';
  }
  pintarMapaGeneral();
  pintarDuplicados();
}

function pintarMapaGeneral() {
  var conCoords = filtrados.filter(function (n) { return !necesitaCoord(n); });
  if (!mapaGeneral) {
    mapaGeneral = L.map('mapaGeneral', { scrollWheelZoom: true }).setView([-34.1708, -70.7444], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(mapaGeneral);
  }
  if (capaGeneral) mapaGeneral.removeLayer(capaGeneral);
  capaGeneral = L.layerGroup().addTo(mapaGeneral);
  var puntos = [];
  conCoords.forEach(function (n) {
    var m = L.circleMarker([Number(n.latitude), Number(n.longitude)], {
      radius: 7, color: n.is_published ? '#B4472C' : '#C98A1E', weight: 2, fillOpacity: .55
    }).addTo(capaGeneral);
    m.bindPopup('<b>' + esc(n.name) + '</b><br>' + esc(n.category || '') + ' · ' + esc(n.city || '') +
      '<br><button class="btn chico" data-accion="editar" data-id="' + esc(n.id) + '">Editar</button>');
    puntos.push([Number(n.latitude), Number(n.longitude)]);
  });
  if (puntos.length) mapaGeneral.fitBounds(puntos, { padding: [24, 24], maxZoom: 15 });
  mapaGeneral.invalidateSize();
}

function pintarDuplicados() {
  var conCoords = NODOS.filter(function (n) { return !necesitaCoord(n); });
  var pares = [];
  for (var i = 0; i < conCoords.length; i++) {
    for (var j = i + 1; j < conCoords.length; j++) {
      var a = conCoords[i], b = conCoords[j];
      var d = distM(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude));
      if (d > 200) continue;
      var pa = norm(a.name).split(' ').filter(function (w) { return w.length > 3; });
      var pb = norm(b.name).split(' ').filter(function (w) { return w.length > 3; });
      var corto = Math.min(pa.length, pb.length) || 1;
      var comunes = pa.filter(function (w) { return pb.indexOf(w) >= 0; }).length;
      var parecido = comunes / corto;
      var contenido = norm(a.name).indexOf(norm(b.name)) >= 0 || norm(b.name).indexOf(norm(a.name)) >= 0;
      if (parecido >= 0.6 || contenido) pares.push({ a: a, b: b, d: d });
    }
  }
  var cont = document.getElementById('duplicados');
  if (!pares.length) {
    cont.innerHTML = '<p class="mini">No se ven duplicados entre los ' + conCoords.length + ' nodos con coordenada.</p>';
    return;
  }
  cont.innerHTML = pares.sort(function (x, y) { return x.d - y.d; }).slice(0, 12).map(function (p) {
    return '<div class="duplicado"><b>' + esc(p.a.name) + '</b> (' + esc(p.a.city || '?') + ') y <b>' + esc(p.b.name) +
      '</b> (' + esc(p.b.city || '?') + ') — a ' + p.d + ' m<br>' +
      '<button class="btn chico" data-accion="editar" data-id="' + esc(p.a.id) + '">Editar 1</button> ' +
      '<button class="btn chico" data-accion="editar" data-id="' + esc(p.b.id) + '">Editar 2</button></div>';
  }).join('');
}

/* ------------------------------- editor --------------------------------- */
function porId(id) {
  for (var i = 0; i < NODOS.length; i++) if (NODOS[i].id === id) return NODOS[i];
  return null;
}
function set(id, valor) { document.getElementById(id).value = valor == null ? '' : valor; }

function abrirEditor(id) {
  var n = id ? porId(id) : null;
  editando = n;
  document.getElementById('modalTitulo').textContent = n ? 'Editar nodo' : 'Nodo nuevo';
  document.getElementById('modalSub').textContent = n
    ? 'ID ' + n.id + (n.created_by ? ' · creado por ' + n.created_by : '')
    : 'Se crea sólo en el CRM: queda borrador hasta que lo publiques.';
  set('eName', n ? n.name : '');
  set('eCategory', n ? n.category : '');
  set('eShort', n ? n.short_description : '');
  set('eFull', n ? n.full_description : '');
  set('eAddress', n ? n.address : '');
  set('eCity', n ? n.city : '');
  set('eRegion', n ? n.region : '');
  set('eLat', n && n.latitude ? Number(n.latitude) : '');
  set('eLng', n && n.longitude ? Number(n.longitude) : '');
  set('eUnlock', n && n.unlock_radius_m ? n.unlock_radius_m : 120);
  set('eHours', n ? n.hours : '');
  set('eCover', n ? n.cover_url : '');
  // La galería de candidatas se limpia al abrir otro nodo, y la vista previa muestra la foto actual
  document.getElementById('galeriaFotos').style.display = 'none';
  document.getElementById('galeriaFotos').innerHTML = '';
  var previa = document.getElementById('previewCover');
  if (n && n.cover_url) { previa.src = n.cover_url; previa.style.display = 'block'; }
  else { previa.removeAttribute('src'); previa.style.display = 'none'; }
  avisoFoto('Sube una foto propia (se achica sola antes de guardarse) o elige una candidata libre.');
  set('eQr', n ? n.qr_code : '');
  document.getElementById('ePublicado').checked = n ? !!n.is_published : false;
  document.getElementById('btnBorrar').style.display = n ? 'inline-block' : 'none';
  document.getElementById('modalPista').textContent = '';
  document.getElementById('modalFondo').className = 'modal-fondo abierto';
  setTimeout(function () {
    montarMapaEditor();
    var lat = parseFloat(document.getElementById('eLat').value);
    var lng = parseFloat(document.getElementById('eLng').value);
    if (!isNaN(lat) && !isNaN(lng)) centroEditor(lat, lng, true);
  }, 60);
}
function cerrarEditor() {
  document.getElementById('modalFondo').className = 'modal-fondo';
  editando = null;
}
function montarMapaEditor() {
  if (mapaEditor) { mapaEditor.remove(); mapaEditor = null; }
  mapaEditor = L.map('mapaEditor').setView([-34.1708, -70.7444], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapaEditor);
  marcadorEditor = null;
  mapaEditor.on('click', function (ev) { ponerPin(ev.latlng.lat, ev.latlng.lng); });
  setTimeout(function () { mapaEditor.invalidateSize(); }, 80);
}
function centroEditor(lat, lng, poner) {
  if (!mapaEditor) return;
  mapaEditor.setView([lat, lng], 16);
  if (poner) ponerPin(lat, lng);
}
function ponerPin(lat, lng) {
  set('eLat', lat.toFixed(7));
  set('eLng', lng.toFixed(7));
  if (!mapaEditor) return;
  if (marcadorEditor) { marcadorEditor.setLatLng([lat, lng]); return; }
  marcadorEditor = L.marker([lat, lng], { draggable: true, title: 'Arrastrame al lugar exacto' }).addTo(mapaEditor);
  marcadorEditor.on('dragend', function () {
    var p = marcadorEditor.getLatLng();
    set('eLat', p.lat.toFixed(7));
    set('eLng', p.lng.toFixed(7));
  });
}

function cuerpoFormulario() {
  var lat = parseFloat(document.getElementById('eLat').value);
  var lng = parseFloat(document.getElementById('eLng').value);
  var radio = parseInt(document.getElementById('eUnlock').value, 10);
  return {
    name: document.getElementById('eName').value.trim(),
    category: document.getElementById('eCategory').value.trim() || null,
    short_description: document.getElementById('eShort').value.trim() || null,
    full_description: document.getElementById('eFull').value.trim() || null,
    address: document.getElementById('eAddress').value.trim() || null,
    city: document.getElementById('eCity').value.trim() || null,
    region: document.getElementById('eRegion').value.trim() || null,
    latitude: isNaN(lat) ? null : lat,
    longitude: isNaN(lng) ? null : lng,
    unlock_radius_m: isNaN(radio) ? 120 : radio,
    hours: document.getElementById('eHours').value.trim() || null,
    cover_url: document.getElementById('eCover').value.trim() || null,
    qr_code: document.getElementById('eQr').value.trim() || null,
    is_published: document.getElementById('ePublicado').checked ? 1 : 0,
    email: EMAIL
  };
}

function guardar() {
  var b = cuerpoFormulario();
  if (b.name.length < 3) { document.getElementById('modalPista').textContent = 'El nombre necesita al menos 3 letras.'; return; }
  if (b.latitude != null && b.longitude != null && fueraDeChile(b.latitude, b.longitude)) {
    document.getElementById('modalPista').textContent = 'Esas coordenadas no caen en Chile: revisa el pin.';
    return;
  }
  if ((b.latitude == null) !== (b.longitude == null)) {
    document.getElementById('modalPista').textContent = 'Latitud y longitud van juntas: pon las dos o ninguna.';
    return;
  }
  var url = editando ? '/api/v1/crm/radar/nodos/' + encodeURIComponent(editando.id) : '/api/v1/crm/radar/nodos';
  document.getElementById('modalPista').textContent = 'Guardando…';
  fetch(url, { method: editando ? 'PATCH' : 'POST', headers: cabeceras(), body: JSON.stringify(b) })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) {
        document.getElementById('modalPista').textContent = res.d && res.d.error ? res.d.error : 'No se pudo guardar (HTTP ' + res.status + ')';
        return;
      }
      toast(editando ? 'Nodo actualizado' : 'Nodo creado');
      cerrarEditor();
      cargar();
    })
    .catch(function (e) { document.getElementById('modalPista').textContent = 'Error de red: ' + e.message; });
}

function borrar() {
  if (!editando) return;
  if (!confirm('¿Eliminar «' + editando.name + '»? Se borran también sus descubrimientos y su lugar en las rutas. No se puede deshacer.')) return;
  fetch('/api/v1/crm/radar/nodos/' + encodeURIComponent(editando.id), { method: 'DELETE', headers: cabeceras(), body: JSON.stringify({ email: EMAIL }) })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) { document.getElementById('modalPista').textContent = (res.d && res.d.error) || ('no se pudo borrar (HTTP ' + res.status + ')'); return; }
      toast('Nodo eliminado');
      cerrarEditor();
      cargar();
    })
    .catch(function (e) { document.getElementById('modalPista').textContent = 'Error de red: ' + e.message; });
}

function alternarEstado(id) {
  var n = porId(id);
  if (!n) return;
  fetch('/api/v1/crm/radar/nodos/' + encodeURIComponent(id), {
    method: 'PATCH', headers: cabeceras(),
    body: JSON.stringify({ email: EMAIL, is_published: n.is_published ? 0 : 1 })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) { toast(d.error || 'no se pudo cambiar el estado'); return; }
    toast(n.is_published ? 'Pasó a borrador' : 'Publicado en la app');
    cargar();
  }).catch(function (e) { toast('Error de red: ' + e.message); });
}

/* ------------------------------ geocodificar ---------------------------- */
function ubicarme() {
  if (!navigator.geolocation) { document.getElementById('modalPista').textContent = 'Este navegador no da la ubicación.'; return; }
  document.getElementById('modalPista').textContent = 'Pidiendo la ubicación…';
  navigator.geolocation.getCurrentPosition(function (p) {
    centroEditor(p.coords.latitude, p.coords.longitude, true);
    document.getElementById('modalPista').textContent = 'Ubicación puesta (±' + Math.round(p.coords.accuracy) + ' m).';
  }, function (e) {
    document.getElementById('modalPista').textContent = 'No se pudo obtener la ubicación: ' + e.message;
  }, { enableHighAccuracy: true, timeout: 12000 });
}
function buscarDireccion() {
  var dir = document.getElementById('eAddress').value.trim();
  var comuna = document.getElementById('eCity').value.trim();
  if (!dir && !comuna) { document.getElementById('modalPista').textContent = 'Escribe una dirección o una comuna para buscarla.'; return; }
  var q = [dir, comuna, 'Chile'].filter(Boolean).join(', ');
  document.getElementById('modalPista').textContent = 'Buscando «' + q + '» en OpenStreetMap…';
  fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&q=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.length) { document.getElementById('modalPista').textContent = 'OpenStreetMap no encontró esa dirección: ubica el punto a mano en el mapa.'; return; }
      centroEditor(parseFloat(d[0].lat), parseFloat(d[0].lon), true);
      document.getElementById('modalPista').textContent = 'Aproximado por OpenStreetMap — revisa el pin y movelo si hace falta.';
    })
    .catch(function (e) { document.getElementById('modalPista').textContent = 'No se pudo consultar OpenStreetMap: ' + e.message; });
}
function verMaps() {
  var lat = document.getElementById('eLat').value, lng = document.getElementById('eLng').value;
  if (!lat || !lng) { document.getElementById('modalPista').textContent = 'Todavía no hay coordenada.'; return; }
  window.open('https://www.google.com/maps?q=' + lat + ',' + lng, '_blank', 'noreferrer');
}

/* ---------------------------------------------------------------------------
   Subir una foto propia (lo que pidió Francisco: las URLs públicas son
   difíciles de conseguir). El navegador la achica a 1600 px y la manda como
   JPEG 85 %, así no viajan 8 MB desde el teléfono; el hub la deja en el bucket
   del ecosistema y devuelve la URL pública.
   --------------------------------------------------------------------------- */
function avisoFoto(texto) {
  document.getElementById('estadoFoto').textContent = texto;
}

function procesarArchivo(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\\//.test(file.type)) { avisoFoto('Elige una imagen (JPG, PNG o WebP).'); input.value = ''; return; }
  avisoFoto('Preparando la imagen…');
  var lector = new FileReader();
  lector.onload = function () {
    var img = new Image();
    img.onload = function () {
      var max = 1600;
      var escala = Math.min(1, max / Math.max(img.width, img.height));
      var lienzo = document.createElement('canvas');
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
      var dataUrl = lienzo.toDataURL('image/jpeg', 0.85);
      avisoFoto('Subiendo ' + lienzo.width + '×' + lienzo.height + ' (' + Math.round(dataUrl.length / 1365) + ' KB)…');
      enviarFoto(dataUrl, file.name);
    };
    img.onerror = function () { avisoFoto('No se pudo leer la imagen.'); };
    img.src = lector.result;
  };
  lector.onerror = function () { avisoFoto('No se pudo leer el archivo.'); };
  lector.readAsDataURL(file);
  input.value = '';
}

function enviarFoto(dataUrl, nombreArchivo) {
  var nombre = document.getElementById('eName').value.trim() || nombreArchivo || 'foto';
  fetch('/api/v1/crm/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-atha-email': EMAIL },
    body: JSON.stringify({ imagen: dataUrl, nombre: nombre, carpeta: 'radar', email: EMAIL }),
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) { avisoFoto('No se pudo subir: ' + (d.error || 'error')); return; }
      document.getElementById('eCover').value = d.url;
      var previa = document.getElementById('previewCover');
      previa.src = d.url; previa.style.display = 'block';
      avisoFoto('Foto subida. Se guarda al apretar Guardar.');
    })
    .catch(function (e) { avisoFoto('No se pudo subir: ' + e.message); });
}

/* ---------------------------------------------------------------------------
   Fotografías: buscar candidatas libres (Wikimedia Commons) y elegir a ojo.
   El nombre del lugar es lo que busca; se le suma la comuna para desambiguar.
   La foto elegida queda en el campo Foto; el sistema NO elige solo.
   --------------------------------------------------------------------------- */
function buscarFotos() {
  var nombre = document.getElementById('eName').value.trim();
  var comuna = document.getElementById('eCity').value.trim();
  var caja = document.getElementById('galeriaFotos');
  if (nombre.length < 3) { document.getElementById('modalPista').textContent = 'Escribe primero el nombre del lugar.'; return; }
  caja.style.display = 'block';
  caja.innerHTML = '<p class="mini">Buscando fotos libres de «' + esc(nombre) + '»…</p>';
  fetch('/api/v1/crm/radar/fotos-sugeridas?q=' + encodeURIComponent(nombre) + '&ciudad=' + encodeURIComponent(comuna) + '&email=' + encodeURIComponent(EMAIL), { headers: { 'x-atha-email': EMAIL } })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) { caja.innerHTML = '<p class="mini">No se pudo buscar: ' + esc(d.error || 'error') + '</p>'; return; }
      if (!d.fotos.length) {
        caja.innerHTML = '<p class="mini">No hay fotos libres con ese nombre. Prueba con otro texto (el nombre de la calle, «teatro municipal», el nombre de la obra) o pega una URL propia.</p>';
        return;
      }
      var html = d.fotos.map(function (f) {
        return '<img src="' + esc(f.url) + '" data-u="' + esc(f.url_grande || f.url) + '" title="' + esc(f.titulo) + (f.licencia ? ' · ' + esc(f.licencia) : '') + (f.autor ? ' · ' + esc(f.autor) : '') + '">';
      }).join('');
      html += '<p class="mini" style="grid-column:1/-1">Elige la que corresponde al lugar (queda en el campo Foto) — ' +
        '<a href="https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent([nombre, comuna].filter(Boolean).join(' ')) + '" target="_blank" rel="noreferrer">ver todas en Commons</a> · ' +
        '<a href="https://www.google.com/search?tbm=isch&q=' + encodeURIComponent([nombre, comuna, 'Chile'].filter(Boolean).join(' ')) + '" target="_blank" rel="noreferrer">buscar en Google Imágenes</a></p>';
      caja.innerHTML = html;
      var imgs = caja.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].addEventListener('click', function () {
          var u = this.getAttribute('data-u');
          document.getElementById('eCover').value = u;
          var prev = document.getElementById('previewCover');
          prev.src = u; prev.style.display = 'block';
          document.getElementById('modalPista').textContent = 'Foto elegida: se guarda al apretar Guardar.';
        });
      }
    })
    .catch(function (e) { caja.innerHTML = '<p class="mini">No se pudo buscar: ' + esc(e.message) + '</p>'; });
}

/* ------------------------------- eventos -------------------------------- */
document.getElementById('buscar').addEventListener('input', function () { pintar(); });
['fCiudad', 'fCategoria', 'fEstado'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', function () { pintar(); });
});
document.getElementById('btnSubirFoto').addEventListener('click', function () { document.getElementById('archivoFoto').click(); });
document.getElementById('archivoFoto').addEventListener('change', function () { procesarArchivo(this); });
document.getElementById('btnBuscarFotos').addEventListener('click', buscarFotos);
document.getElementById('btnNuevo').addEventListener('click', function () { abrirEditor(null); });
document.getElementById('btnRecargar').addEventListener('click', function () { cargar(); });
document.getElementById('btnGuardar').addEventListener('click', guardar);
document.getElementById('btnBorrar').addEventListener('click', borrar);
document.getElementById('btnCancelar').addEventListener('click', cerrarEditor);
document.getElementById('btnUbicarme').addEventListener('click', ubicarme);
document.getElementById('btnBuscarDir').addEventListener('click', buscarDireccion);
document.getElementById('btnVerMaps').addEventListener('click', verMaps);
document.getElementById('modalFondo').addEventListener('click', function (ev) {
  if (ev.target.id === 'modalFondo') cerrarEditor();
});
document.addEventListener('click', function (ev) {
  var el = ev.target.closest ? ev.target.closest('[data-accion]') : null;
  if (!el) return;
  var accion = el.getAttribute('data-accion'), id = el.getAttribute('data-id');
  if (accion === 'editar') abrirEditor(id);
  if (accion === 'estado') alternarEstado(id);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrarEditor(); });

cargar();
</script>
</body>
</html>
`;
app.get('/nodos', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_NODOS);
});




// ---------------------------------------------------------------------------
// BUZÓN DEL PILOTO (REPORTES DE LA APP)
//
// Página servida en línea por el hub (/reportes). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/reportes.html (ver docs/).
// ---------------------------------------------------------------------------
const PAGINA_REPORTES = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Buzón del piloto · FASE CRM</title>
<link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
<style>
  :root {
    --fondo:#F5EFE4; --fondo2:#EDE4D3; --tarjeta:#FFFBF4; --tinta:#1D1A16; --tinta2:#5E564C;
    --linea:#D8CDBA; --acento:#B4472C; --acento-suave:#F3E1DA; --ok:#4E6B3A; --alerta:#C98A1E; --malo:#8A3B6B;
    --serif: Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:14px/1.5 var(--sans); }
  a { color:var(--acento); }
  header { position:sticky; top:0; z-index:20; background:var(--tarjeta); border-bottom:1px solid var(--linea); padding:12px 16px; }
  .env { max-width:1080px; margin:0 auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .marca { display:flex; align-items:center; gap:9px; font:700 16px var(--serif); }
  .marca img { width:26px; height:26px; }
  .quien { margin-left:auto; font-size:12px; color:var(--tinta2); }
  main { max-width:1080px; margin:0 auto; padding:16px; }
  .barra { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
  input, select, textarea { font:13px var(--sans); color:var(--tinta); background:var(--tarjeta); border:1px solid var(--linea); border-radius:10px; padding:8px 10px; }
  textarea { min-height:70px; resize:vertical; width:100%; }
  input:focus, select:focus, textarea:focus { outline:2px solid var(--acento-suave); border-color:var(--acento); }
  .btn { border:1px solid var(--linea); background:var(--fondo2); color:var(--tinta); border-radius:999px; padding:8px 14px; font:600 12.5px var(--sans); cursor:pointer; }
  .btn:hover { border-color:var(--acento); color:var(--acento); }
  .btn.principal { background:var(--acento); border-color:var(--acento); color:#fff; }
  .btn.principal:hover { color:#fff; filter:brightness(1.06); }
  .btn.chico { padding:5px 10px; font-size:11.5px; }
  .metricas { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
  .metrica { background:var(--tarjeta); border:1px solid var(--linea); border-radius:14px; padding:8px 12px; min-width:96px; }
  .metrica .n { font:700 19px var(--serif); }
  .metrica .t { font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--tinta2); }
  .metrica.rojo .n { color:var(--acento); }
  .reporte { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:14px 16px; margin-bottom:12px; }
  .reporte.nuevo { border-left:4px solid var(--acento); }
  .reporte .cab { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .reporte .quien-rep { font-weight:600; }
  .reporte .texto { font-size:14px; margin:8px 0; }
  .pill { display:inline-block; font-size:9.5px; font-weight:700; border-radius:6px; padding:2px 7px; border:1px solid var(--linea); color:var(--tinta2); }
  .pill.nuevo { border-color:var(--acento); color:var(--acento); background:var(--acento-suave); }
  .pill.visto { border-color:var(--alerta); color:#7a5410; }
  .pill.resuelto { border-color:var(--ok); color:var(--ok); }
  .mini { font-size:11px; color:var(--tinta2); }
  .captura { max-width:260px; border:1px solid var(--linea); border-radius:12px; margin-top:8px; display:block; }
  .nota { background:var(--fondo2); border-radius:10px; padding:8px 10px; font-size:12px; margin-top:8px; }
  .acciones-rep { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; align-items:center; }
  .responder { margin-top:10px; display:none; }
  .responder.abierto { display:block; }
  .vacio { border:1px dashed var(--linea); border-radius:16px; padding:18px; text-align:center; color:var(--tinta2); }
  .aviso-sesion { background:#FDF6E8; border:1px solid var(--alerta); color:#7a5410; border-radius:12px; padding:10px 12px; font-size:12.5px; margin-bottom:12px; }
  .error { background:var(--acento-suave); border:1px solid var(--acento); color:var(--acento); border-radius:12px; padding:9px 12px; font-size:12.5px; margin-bottom:12px; }
  .toast { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); background:var(--tinta); color:#fff; border-radius:999px; padding:9px 16px; font-size:12.5px; z-index:80; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.visible { opacity:1; }
</style>
</head>
<body>
<header>
  <div class="env">
    <div class="marca"><img src="/assets/fase/fase-simbolo.svg" alt="FASE" /> Buzón del piloto</div>
    <div class="quien" id="quien">cargando…</div>
  </div>
</header>

<main>
  <div id="error" class="error" style="display:none"></div>
  <div id="sinSesion" class="aviso-sesion" style="display:none"></div>

  <div class="metricas" id="metricas"></div>

  <div class="barra">
    <input id="buscar" type="search" placeholder="Buscar por texto, nombre o correo…" style="flex:1 1 240px" />
    <select id="fEstado">
      <option value="">Todos (nuevos primero)</option>
      <option value="nuevo">Sólo nuevos</option>
      <option value="visto">Sólo vistos</option>
      <option value="resuelto">Sólo resueltos</option>
    </select>
    <select id="fCategoria"><option value="">Todas las categorías</option></select>
    <button class="btn" id="btnRecargar">Recargar</button>
  </div>

  <div id="lista"></div>

  <div class="mini" style="margin-top:18px">
    Los reportes llegan desde el botón <b>“Reportar algo”</b> de la app, con la pantalla, la
    versión y la captura. Cada uno avisa por Telegram al equipo. Responder desde aquí sale por
    el correo del ecosistema (queda registrado en <code>email_log</code>).
  </div>
</main>

<div class="toast" id="toast"></div>

<script>
var EMAIL = '';
try {
  var params = new URLSearchParams(location.search);
  EMAIL = params.get('email') || '';
  var CLAVES = ['user_session', 'atha_user_session', 'atha_user_profile'];
  for (var i = 0; i < CLAVES.length && !EMAIL; i++) {
    var us = JSON.parse(localStorage.getItem(CLAVES[i]) || 'null');
    EMAIL = (us && (us.email || (us.user && us.user.email))) || '';
  }
} catch (e) { EMAIL = ''; }

var REPORTES = [];

function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function cabeceras() { var c = { 'Content-Type': 'application/json' }; if (EMAIL) c['x-atha-email'] = EMAIL; return c; }
function toast(t) { var e = document.getElementById('toast'); e.textContent = t; e.className = 'toast visible'; setTimeout(function () { e.className = 'toast'; }, 2600); }
function fechaBonita(t) { var m = /^(\\d{4})-(\\d{2})-(\\d{2})[T ](\\d{2}):(\\d{2})/.exec(String(t || '')); if (!m) return String(t || ''); var MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return m[3] + ' ' + MES[Number(m[2]) - 1] + ' · ' + m[4] + ':' + m[5]; }

function cargar() {
  document.getElementById('quien').innerHTML = EMAIL ? 'Sesión: <b>' + esc(EMAIL) + '</b>' : 'Sin sesión';
  if (!EMAIL) {
    var av = document.getElementById('sinSesion');
    av.innerHTML = 'No hay sesión en este navegador. Abre el buzón desde el CRM, o agrega <b>?email=tucorreo@dominio.cl</b>. Sólo administración puede ver y responder los reportes.';
    av.style.display = 'block';
  }
  fetch('/api/v1/crm/piloto/reportes', { headers: cabeceras() })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) { docError('No se pudieron leer los reportes: ' + ((res.d && res.d.error) || 'HTTP ' + res.status)); REPORTES = []; }
      else { docError(''); REPORTES = res.d.reportes || []; }
      pintar();
    })
    .catch(function (e) { docError('No se pudo conectar con el hub: ' + e.message); pintar(); });
}
function docError(t) { var e = document.getElementById('error'); e.textContent = t || ''; e.style.display = t ? 'block' : 'none'; }

function filtrados() {
  var q = String(document.getElementById('buscar').value || '').toLowerCase().trim();
  var estado = document.getElementById('fEstado').value;
  var cat = document.getElementById('fCategoria').value;
  return REPORTES.filter(function (r) {
    if (estado && (r.estado || 'nuevo') !== estado) return false;
    if (cat && (r.categoria || 'otro') !== cat) return false;
    if (q) {
      var blob = [r.texto, r.nombre, r.email, r.categoria, r.pantalla, r.nota].join(' ').toLowerCase();
      if (blob.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function pintar() {
  var cats = {};
  REPORTES.forEach(function (r) { var k = r.categoria || 'otro'; cats[k] = (cats[k] || 0) + 1; });
  var sel = document.getElementById('fCategoria'), actual = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>';
  Object.keys(cats).sort().forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = k + ' (' + cats[k] + ')'; sel.appendChild(o); });
  if (actual && cats[actual]) sel.value = actual;

  var nuevos = REPORTES.filter(function (r) { return (r.estado || 'nuevo') === 'nuevo'; }).length;
  var vistos = REPORTES.filter(function (r) { return r.estado === 'visto'; }).length;
  var resueltos = REPORTES.filter(function (r) { return r.estado === 'resuelto'; }).length;
  document.getElementById('metricas').innerHTML = [
    ['Nuevos sin leer', nuevos, nuevos > 0],
    ['Vistos', vistos, false],
    ['Resueltos', resueltos, false],
    ['Total', REPORTES.length, false]
  ].map(function (m) {
    return '<div class="metrica' + (m[2] ? ' rojo' : '') + '"><div class="n">' + m[1] + '</div><div class="t">' + m[0] + '</div></div>';
  }).join('');

  var lista = filtrados();
  var cont = document.getElementById('lista');
  if (!REPORTES.length) {
    cont.innerHTML = '<div class="vacio">Todavía no llegó ningún reporte desde la app. Cuando alguien use <b>“Reportar algo”</b>, aparece aquí y suena en el teléfono del equipo.</div>';
    return;
  }
  if (!lista.length) { cont.innerHTML = '<div class="vacio">Ningún reporte coincide con el filtro.</div>'; return; }
  cont.innerHTML = lista.map(function (r) {
    var estado = r.estado || 'nuevo';
    return '<div class="reporte ' + estado + '">' +
      '<div class="cab">' +
        '<span class="pill ' + estado + '">' + estado + '</span>' +
        '<span class="quien-rep">' + esc(r.nombre || r.email || 'sin cuenta') + '</span>' +
        (r.nombre && r.email ? '<span class="mini">' + esc(r.email) + '</span>' : '') +
        '<span class="mini">· ' + fechaBonita(r.created_at) + '</span>' +
        '<span class="pill">' + esc(r.categoria || 'otro') + '</span>' +
        (r.pantalla ? '<span class="mini">pantalla ' + esc(r.pantalla) + '</span>' : '') +
        (r.plataforma ? '<span class="mini">' + esc(r.plataforma) + (r.version ? ' ' + esc(r.version) : '') + '</span>' : '') +
      '</div>' +
      '<div class="texto">' + esc(r.texto) + '</div>' +
      (r.imagen_url ? '<a href="' + esc(r.imagen_url) + '" target="_blank" rel="noreferrer"><img class="captura" src="' + esc(r.imagen_url) + '" alt="captura de pantalla" /></a>' : '') +
      (r.nota ? '<div class="nota"><b>Nota:</b> ' + esc(r.nota) + (r.atendido_por ? ' <span class="mini">· ' + esc(r.atendido_por) + '</span>' : '') + '</div>' : '') +
      '<div class="acciones-rep">' +
        (estado === 'nuevo' ? '<button class="btn chico" data-accion="estado" data-id="' + esc(r.id) + '" data-estado="visto">Marcar visto</button>' : '') +
        '<button class="btn chico" data-accion="nota" data-id="' + esc(r.id) + '">Guardar nota</button>' +
        '<button class="btn chico principal" data-accion="responder" data-id="' + esc(r.id) + '">Responder por correo</button>' +
        (estado !== 'resuelto' ? '<button class="btn chico" data-accion="estado" data-id="' + esc(r.id) + '" data-estado="resuelto">Marcar resuelto</button>' : '') +
      '</div>' +
      '<div class="responder" id="resp-' + esc(r.id) + '">' +
        '<textarea id="msg-' + esc(r.id) + '" placeholder="Qué le quieres decir a ' + esc((r.nombre || 'quien reportó').split(' ')[0]) + '…">' + esc(sugerencia(r)) + '</textarea>' +
        '<div class="acciones-rep">' +
          '<input id="para-' + esc(r.id) + '" value="' + esc(r.email || '') + '" placeholder="correo de destino" style="flex:1 1 200px" />' +
          '<button class="btn chico principal" data-accion="enviar" data-id="' + esc(r.id) + '">Enviar respuesta</button>' +
          '<span class="mini" id="env-' + esc(r.id) + '"></span>' +
        '</div>' +
      '</div>' +
      '<div class="nota" id="nota-' + esc(r.id) + '" style="display:none">' +
        '<textarea id="txt-' + esc(r.id) + '" placeholder="Qué se hizo con este reporte (queda en la ficha)">' + esc(r.nota || '') + '</textarea>' +
        '<div class="acciones-rep"><button class="btn chico" data-accion="guardar-nota" data-id="' + esc(r.id) + '">Guardar</button></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/** Respuesta sugerida: corta, en el tono del ecosistema, siempre honesta. */
function sugerencia(r) {
  var nombre = (r.nombre || '').split(' ')[0] || '';
  return (nombre ? nombre + ', ' : '') + 'gracias por reportarlo. ';
}

/* ------------------------------- acciones -------------------------------- */
function cambiarEstado(id, estado) {
  fetch('/api/v1/crm/piloto/reportes/' + encodeURIComponent(id), {
    method: 'PATCH', headers: cabeceras(), body: JSON.stringify({ estado: estado, email: EMAIL })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) { toast(d.error || 'no se pudo cambiar el estado'); return; }
    toast(estado === 'resuelto' ? 'Marcado como resuelto' : 'Marcado como visto');
    cargar();
  }).catch(function (e) { toast('Error de red: ' + e.message); });
}

function guardarNota(id) {
  var texto = document.getElementById('txt-' + id).value;
  fetch('/api/v1/crm/piloto/reportes/' + encodeURIComponent(id), {
    method: 'PATCH', headers: cabeceras(), body: JSON.stringify({ nota: texto, email: EMAIL })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) { toast(d.error || 'no se pudo guardar la nota'); return; }
    toast('Nota guardada'); cargar();
  }).catch(function (e) { toast('Error de red: ' + e.message); });
}

function responder(id) {
  var caja = document.getElementById('resp-' + id);
  caja.className = 'responder abierto';
  var ta = document.getElementById('msg-' + id);
  if (ta) ta.focus();
}

function enviar(id) {
  var mensaje = document.getElementById('msg-' + id).value.trim();
  var para = document.getElementById('para-' + id).value.trim();
  var aviso = document.getElementById('env-' + id);
  if (mensaje.length < 3) { aviso.textContent = 'Escribe la respuesta.'; return; }
  if (!para) { aviso.textContent = 'Falta el correo de destino.'; return; }
  aviso.textContent = 'Enviando…';
  fetch('/api/v1/crm/piloto/reportes/' + encodeURIComponent(id) + '/responder', {
    method: 'POST', headers: cabeceras(), body: JSON.stringify({ mensaje: mensaje, para: para, email: EMAIL })
  }).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) { aviso.textContent = (res.d && res.d.error) || ('no salió (HTTP ' + res.status + ')'); return; }
      toast('Respuesta enviada a ' + res.d.para);
      cargar();
    })
    .catch(function (e) { aviso.textContent = 'Error de red: ' + e.message; });
}

document.getElementById('buscar').addEventListener('input', pintar);
document.getElementById('fEstado').addEventListener('change', pintar);
document.getElementById('fCategoria').addEventListener('change', pintar);
document.getElementById('btnRecargar').addEventListener('click', cargar);
document.addEventListener('click', function (ev) {
  var el = ev.target.closest ? ev.target.closest('[data-accion]') : null;
  if (!el) return;
  var accion = el.getAttribute('data-accion'), id = el.getAttribute('data-id');
  if (accion === 'estado') cambiarEstado(id, el.getAttribute('data-estado'));
  if (accion === 'nota') { var n = document.getElementById('nota-' + id); n.style.display = n.style.display === 'none' ? 'block' : 'none'; }
  if (accion === 'guardar-nota') guardarNota(id);
  if (accion === 'responder') responder(id);
  if (accion === 'enviar') enviar(id);
});

cargar();
</script>
</body>
</html>
`;
app.get('/reportes', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_REPORTES);
});

// ---------------------------------------------------------------------------
// AGENDA CULTURAL (CARGAR FUNCIONES EN EL CRM)
//
// Página servida en línea por el hub (/agenda). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/agenda.html (ver docs/).
// ---------------------------------------------------------------------------
const PAGINA_AGENDA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Agenda cultural · FASE CRM</title>
<link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
<style>
  :root {
    --fondo:#F5EFE4; --fondo2:#EDE4D3; --tarjeta:#FFFBF4; --tinta:#1D1A16; --tinta2:#5E564C;
    --linea:#D8CDBA; --acento:#B4472C; --acento-suave:#F3E1DA; --ok:#4E6B3A; --alerta:#C98A1E; --malo:#8A3B6B;
    --serif: Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:14px/1.5 var(--sans); }
  a { color:var(--acento); }
  header { position:sticky; top:0; z-index:20; background:var(--tarjeta); border-bottom:1px solid var(--linea); padding:12px 16px; }
  .env { max-width:1080px; margin:0 auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .marca { display:flex; align-items:center; gap:9px; font:700 16px var(--serif); }
  .marca img { width:26px; height:26px; }
  .quien { margin-left:auto; font-size:12px; color:var(--tinta2); }
  main { max-width:1080px; margin:0 auto; padding:16px; }
  .barra { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
  input, select, textarea { font:13px var(--sans); color:var(--tinta); background:var(--tarjeta); border:1px solid var(--linea); border-radius:10px; padding:8px 10px; }
  textarea { min-height:66px; resize:vertical; width:100%; }
  .btn { border:1px solid var(--linea); background:var(--fondo2); color:var(--tinta); border-radius:999px; padding:8px 14px; font:600 12.5px var(--sans); cursor:pointer; }
  .btn:hover { border-color:var(--acento); color:var(--acento); }
  .btn.principal { background:var(--acento); border-color:var(--acento); color:#fff; }
  .btn.principal:hover { color:#fff; filter:brightness(1.06); }
  .btn.chico { padding:5px 10px; font-size:11.5px; }
  table { width:100%; border-collapse:collapse; background:var(--tarjeta); border:1px solid var(--linea); border-radius:16px; overflow:hidden; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--linea); font-size:12.5px; vertical-align:top; }
  th { background:var(--fondo2); font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--tinta2); }
  tr:last-child td { border-bottom:0; }
  tr.borrador td { background:#FDF6E8; }
  tr.pasado td { opacity:.55; }
  .nom { font-weight:600; }
  .mini { font-size:10.5px; color:var(--tinta2); }
  .pill { display:inline-block; font-size:9.5px; font-weight:700; border-radius:6px; padding:2px 7px; border:1px solid var(--linea); color:var(--tinta2); }
  .pill.pub { border-color:var(--ok); color:var(--ok); }
  .pill.bor { border-color:var(--alerta); color:#7a5410; }
  .pill.ext { border-color:var(--malo); color:var(--malo); }
  .acciones-fila { display:flex; gap:6px; flex-wrap:wrap; }
  .modal-fondo { position:fixed; inset:0; background:rgba(29,26,22,.55); display:none; z-index:50; padding:18px; overflow:auto; }
  .modal-fondo.abierto { display:block; }
  .modal { max-width:720px; margin:0 auto; background:var(--tarjeta); border:1px solid var(--linea); border-radius:20px; padding:18px; }
  .modal h2 { font:700 18px var(--serif); margin:0 0 4px; }
  .campos { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
  .campo { display:flex; flex-direction:column; gap:4px; }
  .campo.ancho { grid-column:1 / -1; }
  .campo label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--tinta2); font-weight:700; }
  .pie-modal { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; align-items:center; }
  .pie-modal .crece { flex:1; }
  .toast { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); background:var(--tinta); color:#fff; border-radius:999px; padding:9px 16px; font-size:12.5px; z-index:80; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.visible { opacity:1; }
  .error { background:var(--acento-suave); border:1px solid var(--acento); color:var(--acento); border-radius:12px; padding:9px 12px; font-size:12.5px; margin-bottom:12px; }
  .aviso-sesion { background:#FDF6E8; border:1px solid var(--alerta); color:#7a5410; border-radius:12px; padding:10px 12px; font-size:12.5px; margin-bottom:12px; }
  .vacio { border:1px dashed var(--linea); border-radius:16px; padding:18px; text-align:center; color:var(--tinta2); }
  @media (max-width:720px) { .campos { grid-template-columns:1fr; } th:nth-child(4), td:nth-child(4) { display:none; } }
</style>
</head>
<body>
<header>
  <div class="env">
    <div class="marca"><img src="/assets/fase/fase-simbolo.svg" alt="FASE" /> Agenda cultural</div>
    <div class="quien" id="quien">cargando…</div>
  </div>
</header>

<main>
  <div id="error" class="error" style="display:none"></div>
  <div id="sinSesion" class="aviso-sesion" style="display:none"></div>

  <div class="barra">
    <input id="buscar" type="search" placeholder="Buscar por título, lugar o comuna…" style="flex:1 1 220px" />
    <select id="fEstado">
      <option value="">Publicadas y borradores</option>
      <option value="1">Sólo publicadas (lo que ve la app)</option>
      <option value="0">Sólo borradores</option>
      <option value="pasado">Sólo ya pasadas</option>
    </select>
    <label class="mini"><input type="checkbox" id="fLejos" style="width:auto" /> incluir más allá de 90 días</label>
    <button class="btn principal" id="btnNuevo">+ Función nueva</button>
    <button class="btn" id="btnRecargar">Recargar</button>
  </div>

  <div id="tabla"></div>

  <div class="mini" style="margin-top:16px">
    Esto alimenta el <b>Inicio</b> de la app: cada función publicada aparece con su hora, su
    recinto y —si tiene coordenadas— a cuántos metros queda de quien la mira. Al publicar,
    el equipo recibe un aviso por Telegram. Las funciones de una agrupación también las puede
    cargar la producción de esa compañía desde la app del CRM.
  </div>
</main>

<div class="modal-fondo" id="modalFondo">
  <div class="modal">
    <h2 id="modalTitulo">Función nueva</h2>
    <div class="mini" id="modalSub"></div>
    <div class="campos">
      <div class="campo ancho">
        <label for="eTitle">Título *</label>
        <input id="eTitle" type="text" placeholder="Inti-Illimani: gira «Caminos»" />
      </div>
      <div class="campo">
        <label for="eType">Tipo</label>
        <select id="eType">
          <option>Función</option><option>Teatro</option><option>Música</option><option>Danza</option>
          <option>Exposición</option><option>Taller</option><option>Cine</option><option>Evento</option>
        </select>
      </div>
      <div class="campo">
        <label for="eStatus">Condición</label>
        <input id="eStatus" type="text" placeholder="Confirmado · Entrada liberada" />
      </div>
      <div class="campo">
        <label for="eDate">Fecha *</label>
        <input id="eDate" type="date" />
      </div>
      <div class="campo">
        <label for="eDateEnd">Hasta (sólo muestras)</label>
        <input id="eDateEnd" type="date" />
      </div>
      <div class="campo">
        <label for="eHora">Hora</label>
        <input id="eHora" type="time" />
      </div>
      <div class="campo">
        <label for="eHoraFin">Hora de término</label>
        <input id="eHoraFin" type="time" />
      </div>
      <div class="campo ancho">
        <label for="eVenue">Lugar</label>
        <input id="eVenue" type="text" placeholder="Teatro Regional Lucho Gatica" />
      </div>
      <div class="campo">
        <label for="eCity">Comuna</label>
        <input id="eCity" type="text" placeholder="Rancagua" />
      </div>
      <div class="campo">
        <label for="eRegion">Región</label>
        <input id="eRegion" type="text" placeholder="Región del Libertador Gral. Bernardo O'Higgins" />
      </div>
      <div class="campo">
        <label for="eLat">Latitud</label>
        <input id="eLat" type="number" step="0.0000001" placeholder="-34.1755663" />
      </div>
      <div class="campo">
        <label for="eLng">Longitud</label>
        <input id="eLng" type="number" step="0.0000001" placeholder="-70.7406144" />
      </div>
      <div class="campo ancho">
        <div class="acciones-fila">
          <button class="btn chico" id="btnUbicarme" type="button">Usar mi ubicación</button>
          <button class="btn chico" id="btnBuscarDir" type="button">Ubicar por la dirección (OpenStreetMap)</button>
          <span class="mini">Sin coordenada la función se ve igual, sólo que sin distancia.</span>
        </div>
      </div>
      <div class="campo">
        <label for="eImage">Imagen (URL)</label>
        <input id="eImage" type="text" placeholder="https://…" />
      </div>
      <div class="campo">
        <label for="eTicket">Entradas (URL)</label>
        <input id="eTicket" type="text" placeholder="https://…" />
      </div>
      <div class="campo ancho">
        <label for="eNotes">Notas internas</label>
        <textarea id="eNotes" placeholder="Quién la produce, contacto de la sala, detalles de carga…"></textarea>
      </div>
      <div class="campo ancho">
        <label class="mini" style="text-transform:none; letter-spacing:0">
          <input type="checkbox" id="ePublic" style="width:auto" /> Publicada (visible en la app)
        </label>
      </div>
    </div>
    <div class="pie-modal">
      <span class="crece mini" id="modalPista"></span>
      <button class="btn" id="btnBorrar" type="button" style="display:none">Eliminar</button>
      <button class="btn" id="btnCancelar" type="button">Cancelar</button>
      <button class="btn principal" id="btnGuardar" type="button">Guardar</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
var EMAIL = '';
try {
  var params = new URLSearchParams(location.search);
  EMAIL = params.get('email') || '';
  var CLAVES = ['user_session', 'atha_user_session', 'atha_user_profile'];
  for (var i = 0; i < CLAVES.length && !EMAIL; i++) {
    var us = JSON.parse(localStorage.getItem(CLAVES[i]) || 'null');
    EMAIL = (us && (us.email || (us.user && us.user.email))) || '';
  }
} catch (e) { EMAIL = ''; }

var EVENTOS = [];
var editando = null;
var HOY = new Date().toISOString().slice(0, 10);

function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function cabeceras() { var c = { 'Content-Type': 'application/json' }; if (EMAIL) c['x-atha-email'] = EMAIL; return c; }
function toast(t) { var e = document.getElementById('toast'); e.textContent = t; e.className = 'toast visible'; setTimeout(function () { e.className = 'toast'; }, 2600); }
function err(t) { var e = document.getElementById('error'); e.textContent = t || ''; e.style.display = t ? 'block' : 'none'; }
function soloFecha(v) { var m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(v || '')); return m ? m[0] : ''; }
function soloHora(v) { var m = /^(\\d{2}):(\\d{2})/.exec(String(v || '')); return m ? m[1] + ':' + m[2] : ''; }
function fechaLinda(iso) {
  var f = soloFecha(iso); if (!f) return '';
  var MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var DIA = ['dom','lun','mar','mié','jue','vie','sáb'];
  var d = new Date(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
  return DIA[d.getDay()] + ' ' + d.getDate() + ' ' + MES[d.getMonth()];
}

function cargar() {
  document.getElementById('quien').innerHTML = EMAIL ? 'Sesión: <b>' + esc(EMAIL) + '</b>' : 'Sin sesión';
  if (!EMAIL) {
    var av = document.getElementById('sinSesion');
    av.innerHTML = 'No hay sesión en este navegador. Abre la agenda desde el CRM, o agrega <b>?email=tucorreo@dominio.cl</b>. Publicar requiere administración o ser producción de la agrupación de la obra.';
    av.style.display = 'block';
  }
  var lejos = document.getElementById('fLejos').checked;
  var desde = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  var url = '/api/v1/crm/radar/eventos?incluir_borradores=1&desde=' + desde;
  fetch(url, { headers: cabeceras() })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) { err('No se pudo leer la agenda: ' + ((res.d && res.d.error) || 'HTTP ' + res.status)); EVENTOS = []; }
      else { err(''); EVENTOS = res.d.eventos || []; }
      pintar();
    })
    .catch(function (e) { err('No se pudo conectar con el hub: ' + e.message); pintar(); });
}

function filtrados() {
  var q = String(document.getElementById('buscar').value || '').toLowerCase().trim();
  var estado = document.getElementById('fEstado').value;
  var lejos = document.getElementById('fLejos').checked;
  var limite = new Date(Date.now() + (lejos ? 730 : 90) * 86400000).toISOString().slice(0, 10);
  return EVENTOS.filter(function (e) {
    var fecha = soloFecha(e.date);
    if (estado === 'pasado' ? !(fecha < HOY) : (fecha < HOY)) return false;
    if (estado === '1' && !e.is_public) return false;
    if (estado === '0' && e.is_public) return false;
    if (fecha > limite) return false;
    if (q) {
      var blob = [e.title, e.venue, e.city, e.type, e.company_name].join(' ').toLowerCase();
      if (blob.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function pintar() {
  var lista = filtrados();
  var cont = document.getElementById('tabla');
  if (!EVENTOS.length) {
    cont.innerHTML = '<div class="vacio">No hay funciones en la agenda. Crea la primera con <b>“+ Función nueva”</b>.</div>';
    return;
  }
  if (!lista.length) { cont.innerHTML = '<div class="vacio">Ninguna función coincide con el filtro.</div>'; return; }
  var filas = lista.map(function (e) {
    var fecha = soloFecha(e.date);
    var cuando = fechaLinda(e.date) + (e.time_start ? ' · ' + soloHora(e.time_start) : '') +
      (soloFecha(e.date_end) ? ' <span class="mini">→ hasta ' + fechaLinda(e.date_end) + '</span>' : '');
    var coords = (e.lat && e.lng) ? '<span class="mini">' + Number(e.lat).toFixed(5) + ', ' + Number(e.lng).toFixed(5) + (e.distance_m != null ? ' · a ' + (e.distance_m < 1000 ? e.distance_m + ' m' : (e.distance_m / 1000).toFixed(1) + ' km') : '') + '</span>' : '<span class="pill bor">sin coordenada</span>';
    return '<tr class="' + (!e.is_public ? 'borrador' : (fecha < HOY ? 'pasado' : '')) + '">' +
      '<td><div class="nom">' + esc(e.title) + '</div>' +
        '<div class="mini">' + esc(e.type || '') + (e.company_name ? ' · ' + esc(e.company_name) : '') + (e.status ? ' · ' + esc(e.status) : '') + '</div></td>' +
      '<td>' + cuando + '</td>' +
      '<td>' + esc(e.venue || e.location || '—') + '<div class="mini">' + esc(e.city || 'sin comuna') + '</div></td>' +
      '<td>' + coords + '</td>' +
      '<td>' + (e.is_public ? '<span class="pill pub">publicada</span>' : '<span class="pill bor">borrador</span>') +
        (e.source === 'externo' ? ' <span class="pill ext">externa</span>' : '') +
        (e.source_url ? '<div class="mini"><a href="' + esc(e.source_url) + '" target="_blank" rel="noreferrer">fuente</a></div>' : '') + '</td>' +
      '<td><div class="acciones-fila">' +
        '<button class="btn chico" data-accion="editar" data-id="' + esc(e.id) + '">Editar</button>' +
        '<button class="btn chico" data-accion="estado" data-id="' + esc(e.id) + '">' + (e.is_public ? 'Ocultar' : 'Publicar') + '</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
  cont.innerHTML = '<table><thead><tr><th>Función</th><th>Cuándo</th><th>Dónde</th><th>Coordenada</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + filas + '</tbody></table>';
}

/* ------------------------------- editor ---------------------------------- */
function set(id, v) { document.getElementById(id).value = v == null ? '' : v; }
function porId(id) { for (var i = 0; i < EVENTOS.length; i++) if (EVENTOS[i].id === id) return EVENTOS[i]; return null; }

function abrirEditor(id) {
  var e = id ? porId(id) : null;
  editando = e;
  document.getElementById('modalTitulo').textContent = e ? 'Editar función' : 'Función nueva';
  document.getElementById('modalSub').textContent = e
    ? (e.source === 'externo' ? 'Esta función viene de una fuente externa: si la editas aquí, la próxima cosecha la vuelve a su versión original.' : 'ID ' + e.id)
    : 'Queda como borrador hasta que la publiques.';
  set('eTitle', e ? e.title : '');
  set('eType', e && e.type ? e.type : 'Función');
  set('eStatus', e ? e.status : '');
  set('eDate', e ? soloFecha(e.date) : HOY);
  set('eDateEnd', e ? soloFecha(e.date_end) : '');
  set('eHora', e ? soloHora(e.time_start) : '');
  set('eHoraFin', e ? soloHora(e.time_end) : '');
  set('eVenue', e ? e.venue : '');
  set('eCity', e ? e.city : '');
  set('eRegion', '');
  set('eLat', e && e.lat ? Number(e.lat) : '');
  set('eLng', e && e.lng ? Number(e.lng) : '');
  set('eImage', e ? e.image_url : '');
  set('eTicket', e ? e.ticket_url : '');
  set('eNotes', e ? e.notes : '');
  document.getElementById('ePublic').checked = e ? !!e.is_public : false;
  document.getElementById('btnBorrar').style.display = e ? 'inline-block' : 'none';
  document.getElementById('modalPista').textContent = '';
  document.getElementById('modalFondo').className = 'modal-fondo abierto';
}

function cuerpo() {
  var lat = parseFloat(document.getElementById('eLat').value);
  var lng = parseFloat(document.getElementById('eLng').value);
  return {
    title: document.getElementById('eTitle').value.trim(),
    type: document.getElementById('eType').value,
    status: document.getElementById('eStatus').value.trim() || null,
    date: document.getElementById('eDate').value,
    date_end: document.getElementById('eDateEnd').value || null,
    time_start: document.getElementById('eHora').value || null,
    time_end: document.getElementById('eHoraFin').value || null,
    venue: document.getElementById('eVenue').value.trim() || null,
    city: document.getElementById('eCity').value.trim() || null,
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    image_url: document.getElementById('eImage').value.trim() || null,
    ticket_url: document.getElementById('eTicket').value.trim() || null,
    notes: document.getElementById('eNotes').value.trim() || null,
    is_public: document.getElementById('ePublic').checked,
    email: EMAIL
  };
}

function guardar() {
  var b = cuerpo();
  var pista = document.getElementById('modalPista');
  if (b.title.length < 3) { pista.textContent = 'El título necesita al menos 3 letras.'; return; }
  if (!b.date) { pista.textContent = 'Falta la fecha.'; return; }
  if ((b.lat == null) !== (b.lng == null)) { pista.textContent = 'Latitud y longitud van juntas.'; return; }
  var url = editando ? '/api/v1/crm/radar/eventos/' + encodeURIComponent(editando.id) : '/api/v1/crm/radar/eventos';
  pista.textContent = 'Guardando…';
  fetch(url, { method: editando ? 'PATCH' : 'POST', headers: cabeceras(), body: JSON.stringify(b) })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) { pista.textContent = (res.d && res.d.error) || ('no se pudo guardar (HTTP ' + res.status + ')'); return; }
      toast(editando ? 'Función actualizada' : 'Función creada');
      cerrar(); cargar();
    })
    .catch(function (e) { pista.textContent = 'Error de red: ' + e.message; });
}

function borrar() {
  if (!editando) return;
  if (!confirm('¿Dar de baja «' + editando.title + '»? No se puede deshacer.')) return;
  fetch('/api/v1/crm/radar/eventos/' + encodeURIComponent(editando.id), { method: 'DELETE', headers: cabeceras(), body: JSON.stringify({ email: EMAIL }) })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d.ok) { document.getElementById('modalPista').textContent = d.error || 'no se pudo borrar'; return; } toast('Función dada de baja'); cerrar(); cargar(); })
    .catch(function (e) { document.getElementById('modalPista').textContent = 'Error de red: ' + e.message; });
}

function alternar(id) {
  var e = porId(id); if (!e) return;
  fetch('/api/v1/crm/radar/eventos/' + encodeURIComponent(id), {
    method: 'PATCH', headers: cabeceras(), body: JSON.stringify({ is_public: e.is_public ? 0 : 1, email: EMAIL })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) { toast(d.error || 'no se pudo cambiar'); return; }
    toast(e.is_public ? 'Pasó a borrador' : 'Publicada en la app');
    cargar();
  }).catch(function (e2) { toast('Error de red: ' + e2.message); });
}

function cerrar() { document.getElementById('modalFondo').className = 'modal-fondo'; editando = null; }

function ubicarme() {
  if (!navigator.geolocation) { document.getElementById('modalPista').textContent = 'Este navegador no da la ubicación.'; return; }
  navigator.geolocation.getCurrentPosition(function (p) {
    set('eLat', p.coords.latitude.toFixed(7)); set('eLng', p.coords.longitude.toFixed(7));
    document.getElementById('modalPista').textContent = 'Ubicación puesta (±' + Math.round(p.coords.accuracy) + ' m).';
  }, function (e) { document.getElementById('modalPista').textContent = 'No se pudo: ' + e.message; }, { enableHighAccuracy: true, timeout: 12000 });
}

function buscarDireccion() {
  var q = [document.getElementById('eVenue').value.trim(), document.getElementById('eCity').value.trim(), 'Chile'].filter(Boolean).join(', ');
  if (!q) { document.getElementById('modalPista').textContent = 'Escribe el lugar o la comuna.'; return; }
  document.getElementById('modalPista').textContent = 'Buscando «' + q + '» en OpenStreetMap…';
  fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&q=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.length) { document.getElementById('modalPista').textContent = 'No lo encontró: pon las coordenadas a mano si las tienes.'; return; }
      set('eLat', Number(d[0].lat).toFixed(7)); set('eLng', Number(d[0].lon).toFixed(7));
      document.getElementById('modalPista').textContent = 'Aproximado por OpenStreetMap — revisa antes de publicar.';
    })
    .catch(function (e) { document.getElementById('modalPista').textContent = 'No se pudo consultar: ' + e.message; });
}

document.getElementById('buscar').addEventListener('input', pintar);
document.getElementById('fEstado').addEventListener('change', pintar);
document.getElementById('fLejos').addEventListener('change', pintar);
document.getElementById('btnNuevo').addEventListener('click', function () { abrirEditor(null); });
document.getElementById('btnRecargar').addEventListener('click', cargar);
document.getElementById('btnGuardar').addEventListener('click', guardar);
document.getElementById('btnBorrar').addEventListener('click', borrar);
document.getElementById('btnCancelar').addEventListener('click', cerrar);
document.getElementById('btnUbicarme').addEventListener('click', ubicarme);
document.getElementById('btnBuscarDir').addEventListener('click', buscarDireccion);
document.getElementById('modalFondo').addEventListener('click', function (ev) { if (ev.target.id === 'modalFondo') cerrar(); });
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrar(); });
document.addEventListener('click', function (ev) {
  var el = ev.target.closest ? ev.target.closest('[data-accion]') : null;
  if (!el) return;
  if (el.getAttribute('data-accion') === 'editar') abrirEditor(el.getAttribute('data-id'));
  if (el.getAttribute('data-accion') === 'estado') alternar(el.getAttribute('data-id'));
});

cargar();
</script>
</body>
</html>
`;
app.get('/agenda', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_AGENDA);
});

// ---------------------------------------------------------------------------
// GUÍA DE USO PARA NUEVOS USUARIOS (PÚBLICA)
//
// Página servida en línea por el hub (/guia). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/guia.html (ver docs/).
// ---------------------------------------------------------------------------
const PAGINA_GUIA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Cómo usar FASE · guía para nuevos usuarios</title>
<link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
<style>
  :root {
    --fondo:#F5EFE4; --fondo2:#EDE4D3; --tarjeta:#FFFBF4; --tinta:#1D1A16; --tinta2:#5E564C;
    --linea:#D8CDBA; --acento:#B4472C; --acento-suave:#F3E1DA; --ok:#4E6B3A;
    --serif: Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:16px/1.6 var(--sans); }
  a { color:var(--acento); }
  .env { max-width:640px; margin:0 auto; padding:22px 18px 40px; }
  .marca { display:flex; align-items:center; gap:10px; font:700 17px var(--serif); }
  .marca img { width:28px; height:28px; }
  h1 { font:700 30px/1.2 var(--serif); margin:22px 0 8px; }
  h2 { font:700 19px var(--serif); margin:30px 0 6px; }
  p { margin:10px 0; }
  .mini { font-size:13.5px; color:var(--tinta2); }
  .tarjeta { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:16px 18px; margin:14px 0; }
  .paso { display:flex; gap:14px; align-items:flex-start; background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:16px 18px; margin:12px 0; }
  .num { flex:0 0 34px; height:34px; border-radius:50%; background:var(--acento); color:#fff; font:700 16px var(--serif); display:flex; align-items:center; justify-content:center; }
  .paso h3 { font:700 16px var(--sans); margin:3px 0 4px; }
  .paso p { margin:0; font-size:14.5px; }
  .paso ul { margin:8px 0 0 18px; padding:0; font-size:14px; color:#3a342c; }
  .btn { display:inline-block; background:var(--acento); color:#fff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:600; }
  .btn.suave { background:var(--fondo2); color:var(--tinta); border:1px solid var(--linea); }
  .destacado { background:var(--fondo2); border:1px solid var(--linea); border-radius:18px; padding:16px 18px; margin:18px 0; }
  .pie { margin-top:30px; font-size:13px; color:var(--tinta2); }
  .sep { border:0; border-top:1px solid var(--linea); margin:26px 0; }
  code { background:var(--fondo2); border-radius:5px; padding:1px 5px; font-size:13px; }
</style>
</head>
<body>
<div class="env">
  <div class="marca"><img src="/assets/fase/fase-simbolo.svg" alt="FASE" /> FASE · ATHAMU</div>

  <h1>Qué es FASE y cómo se usa</h1>
  <p class="mini">Guía corta para el primer día. No hace falta instalarlo: si prefieres la app en el
  teléfono, el APK está al final.</p>

  <div class="tarjeta">
    <b>FASE es el radar cultural de ATHAMU.</b> Te muestra <b>qué está pasando</b> en tu ciudad
    —teatro, música, talleres, exposiciones, con hora y lugar—, <b>qué espacios culturales tienes
    cerca</b> y te deja <b>descubrirlos</b> cuando estás ahí. Además es la puerta a tu agrupación:
    tu equipo, sus montajes y los ensayos.
  </div>

  <p>Está en <b>prueba</b>: lo que veas raro, decilo ahí mismo (paso 5) y se arregla. Varias de las
  cosas que ya funcionan las pidieron personas probándola.</p>

  <h2>Tus cinco primeros pasos</h2>

  <div class="paso">
    <div class="num">1</div>
    <div>
      <h3>Entra con tu correo</h3>
      <p>Con el mismo correo de Google que usás para el resto del ecosistema: así el sistema sabe
      quién eres y te muestra <b>tu agrupación</b>.</p>
      <ul>
        <li>Si entras con otro correo, vas a ver la app funcionando pero <b>sin tu equipo</b>.</li>
        <li>Puedes entrar desde el navegador del teléfono: no hace falta instalar nada.</li>
      </ul>
    </div>
  </div>

  <div class="paso">
    <div class="num">2</div>
    <div>
      <h3>Mira la agenda en <i>Inicio</i></h3>
      <p>Ahí están las funciones reales de tu ciudad, con <b>día, hora y lugar</b>. Cuando das el
      permiso de ubicación, cada una te dice <b>a cuántos metros te queda</b>.</p>
      <ul>
        <li>Los eventos con <b>“Ver la fuente”</b> vienen de la cartelera oficial de la ciudad: no son inventados.</li>
        <li>Lo que dice <b>“hasta el …”</b> es una muestra o exposición que dura varios días.</li>
      </ul>
    </div>
  </div>

  <div class="paso">
    <div class="num">3</div>
    <div>
      <h3>Ve a <i>Radar</i> y mira qué tienes cerca</h3>
      <p>Es la lista de espacios culturales ordenada por cercanía, con la distancia real (si no hay
      permiso de ubicación, la app lo dice: <b>no inventa distancias</b>).</p>
      <ul>
        <li>Chips de <b>1 / 3 / 10 km</b> para acotar.</li>
        <li><b>“Cómo llegar”</b> abre el mapa con las coordenadas del lugar.</li>
        <li>Los que no visitaste se ven como <b>“lugar por descubrir”</b>.</li>
      </ul>
    </div>
  </div>

  <div class="paso">
    <div class="num">4</div>
    <div>
      <h3>Camina hasta uno y <b>descubrilo</b></h3>
      <p>Cuando estés a menos de <b>120 metros</b>, se abre la ficha del lugar: qué es, su historia,
      su horario si lo tiene. Sumas experiencia y queda marcado como descubierto por vos.</p>
      <ul>
        <li>Es el corazón de la app: <b>funciona en el lugar</b>, no desde el sillón.</li>
        <li>Después puedes <b>publicar en el Muro</b> con una foto, reaccionar y comentar.</li>
        <li>Si quieres un recorrido armado, <i>Rutas</i> tiene caminos de 4 a 6 paradas.</li>
      </ul>
    </div>
  </div>

  <div class="paso">
    <div class="num">5</div>
    <div>
      <h3>Si algo no funciona, <b>repórtalo ahí mismo</b></h3>
      <p>El botón <b>“Reportar algo”</b> está flotando en todas las pantallas. Escribe qué pasó y,
      si quieres, adjunta una <b>captura de pantalla</b>.</p>
      <ul>
        <li>El reporte viaja con la pantalla donde estabas, tu cuenta y la versión: por eso se puede arreglar.</li>
        <li>Es lo que más ayuda: <b>cada reporte suena en el teléfono del equipo</b> y se responde.</li>
      </ul>
    </div>
  </div>

  <div class="destacado">
    <b>Y en <i>Perfil</i> está tu parte de trabajo:</b> tus agrupaciones con su equipo y sus
    montajes, y —si eres elenco o dirección— el <b>Planner</b> con la disponibilidad y los ensayos.
    Si todavía no perteneces a ninguna agrupación, desde ahí puedes <b>pedir entrar</b> a una; si
    eres dirección o producción, puedes <b>crear</b> una.
  </div>

  <hr class="sep" />

  <h2>Abrir la app</h2>
  <p><a class="btn" href="https://fase-mobile-897089213264.us-central1.run.app">Abrir FASE</a></p>
  <p class="mini" style="margin-top:10px">
    ¿La quieres instalada? <a href="https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk">Descargar el APK (Android)</a>.
    En iPhone, por ahora, desde el navegador.
  </p>

  <h2>Preguntas que nos hacen siempre</h2>
  <p><b>¿Necesito estar en la calle para usarla?</b> Para la agenda y el Muro no. Para descubrir
  lugares sí: el desbloqueo es por ubicación real.</p>
  <p><b>¿Por qué no veo mi agrupación?</b> Casi siempre es que entraste con otro correo. Escribinos
  y lo unimos.</p>
  <p><b>¿Esto reemplaza a WhatsApp?</b> No. El Muro es para lo que pasa <i>en los lugares</i>: una
  foto de lo que estás viendo, una reacción. Lo demás sigue donde está.</p>
  <p><b>¿Quién ve lo que publico?</b> La comunidad de FASE. Lo que reportas como problema lo ve
  sólo el equipo.</p>

  <div class="pie">
    ¿Dudas o algo que no está aquí? Respondé el correo con el que te invitaron: lo leemos.<br />
    <b>ATHAMU · ATHA Producciones</b>
  </div>
</div>
</body>
</html>
`;
app.get('/guia', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_GUIA);
});

// ---------------------------------------------------------------------------
// TABLERO DEL PILOTO (MÉTRICAS DE LA PRUEBA)
//
// Página servida en línea por el hub (/tablero). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/tablero.html (ver docs/).
// ---------------------------------------------------------------------------
// TABLERO DEL PILOTO (MÉTRICAS DE LA PRUEBA)
//
// Página servida en línea por el hub (/tablero). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/tablero.html (ver docs/).
// ---------------------------------------------------------------------------
const PAGINA_TABLERO = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tablero del piloto · FASE CRM</title>
<link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
<style>
  :root {
    --fondo:#F5EFE4; --fondo2:#EDE4D3; --tarjeta:#FFFBF4; --tinta:#1D1A16; --tinta2:#5E564C;
    --linea:#D8CDBA; --acento:#B4472C; --acento-suave:#F3E1DA; --ok:#4E6B3A; --alerta:#C98A1E; --malo:#8A3B6B;
    --serif: Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:14px/1.5 var(--sans); }
  a { color:var(--acento); }
  header { position:sticky; top:0; z-index:20; background:var(--tarjeta); border-bottom:1px solid var(--linea); padding:12px 16px; }
  .env { max-width:1120px; margin:0 auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .marca { display:flex; align-items:center; gap:9px; font:700 16px var(--serif); }
  .marca img { width:26px; height:26px; }
  .quien { margin-left:auto; font-size:12px; color:var(--tinta2); }
  main { max-width:1120px; margin:0 auto; padding:16px 16px 40px; }
  .barra { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
  .btn { border:1px solid var(--linea); background:var(--fondo2); color:var(--tinta); border-radius:999px; padding:8px 14px; font:600 12.5px var(--sans); cursor:pointer; }
  .btn:hover { border-color:var(--acento); color:var(--acento); }
  .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:10px; margin-bottom:8px; }
  .kpi { background:var(--tarjeta); border:1px solid var(--linea); border-radius:16px; padding:12px 14px; }
  .kpi .n { font:700 26px var(--serif); line-height:1.1; }
  .kpi .t { font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--tinta2); margin-top:2px; }
  .kpi .sub { font-size:11px; color:var(--tinta2); margin-top:4px; }
  .kpi.acento .n { color:var(--acento); }
  .kpi.ok .n { color:var(--ok); }
  .kpi.alerta .n { color:var(--alerta); }
  h2 { font:700 15px var(--serif); margin:22px 0 8px; }
  .dos { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px,1fr)); gap:12px; }
  .panel { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:12px 14px; }
  .panel h3 { font:700 13px var(--serif); margin:0 0 6px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:6px 6px; border-bottom:1px solid var(--linea); font-size:12px; vertical-align:top; }
  th { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--tinta2); }
  tr:last-child td { border-bottom:0; }
  .mini { font-size:11px; color:var(--tinta2); }
  .pill { display:inline-block; font-size:9.5px; font-weight:700; border-radius:6px; padding:2px 6px; border:1px solid var(--linea); color:var(--tinta2); }
  .pill.ok { border-color:var(--ok); color:var(--ok); }
  .pill.nuevo { border-color:var(--acento); color:var(--acento); background:var(--acento-suave); }
  .pill.ext { border-color:var(--malo); color:var(--malo); }
  .barras { display:flex; align-items:flex-end; gap:3px; height:54px; margin-top:6px; }
  .barras div { flex:1; background:var(--acento); border-radius:3px 3px 0 0; min-height:2px; }
  .error { background:var(--acento-suave); border:1px solid var(--acento); color:var(--acento); border-radius:12px; padding:9px 12px; font-size:12.5px; margin-bottom:12px; }
  .aviso-sesion { background:#FDF6E8; border:1px solid var(--alerta); color:#7a5410; border-radius:12px; padding:10px 12px; font-size:12.5px; margin-bottom:12px; }
</style>
</head>
<body>
<header>
  <div class="env">
    <div class="marca"><img src="/assets/fase/fase-simbolo.svg" alt="FASE" /> Tablero del piloto</div>
    <div class="quien" id="quien">cargando…</div>
  </div>
</header>

<main>
  <div id="error" class="error" style="display:none"></div>
  <div id="sinSesion" class="aviso-sesion" style="display:none"></div>

  <div class="barra">
    <button class="btn" id="btnRecargar">Recargar</button>
    <span class="mini" id="generado"></span>
  </div>

  <div id="contenido"></div>

  <div class="mini" style="margin-top:22px">
    Es la lectura del plan de prueba: <b>descubrimientos por persona</b> es la métrica estrella
    (que el radar lleve a la puerta), y <b>reportes por pantalla</b> dice dónde duele. El ritual es
    semanal: mirar esto 30 minutos, cerrar los reportes con nota y elegir <b>máximo dos arreglos</b>.
  </div>
</main>

<script>
var EMAIL = '';
try {
  var params = new URLSearchParams(location.search);
  EMAIL = params.get('email') || '';
  var CLAVES = ['user_session', 'atha_user_session', 'atha_user_profile'];
  for (var i = 0; i < CLAVES.length && !EMAIL; i++) {
    var us = JSON.parse(localStorage.getItem(CLAVES[i]) || 'null');
    EMAIL = (us && (us.email || (us.user && us.user.email))) || '';
  }
} catch (e) { EMAIL = ''; }

function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function cabeceras() { var c = { 'Content-Type': 'application/json' }; if (EMAIL) c['x-atha-email'] = EMAIL; return c; }
function kpi(n, t, sub, clase) {
  return '<div class="kpi ' + (clase || '') + '"><div class="n">' + n + '</div><div class="t">' + t + '</div>' +
    (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
}
function tabla(filas, cols) {
  if (!filas || !filas.length) return '<p class="mini">Sin datos todavía.</p>';
  var head = '<tr>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr>';
  var body = filas.map(function (f) {
    return '<tr>' + cols.map(function (c) { return '<td>' + c[1](f) + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<table>' + head + body + '</table>';
}
function fechaCorta(t) { return String(t || '').slice(0, 16).replace('T', ' '); }
function lista(obj) {
  if (!obj || !obj.length) return '<p class="mini">Sin datos.</p>';
  return obj.map(function (o) {
    var k = o.c || o.e || o.p || o.s || o.t || o.dia || o.nombre || o.title || o.destino || '(sin dato)';
    var v = (o.n !== undefined) ? o.n : '';
    return '<span class="pill">' + esc(k) + (v !== '' ? ' · ' + v : '') + '</span> ';
  }).join('');
}

function pintar(d) {
  var cont = document.getElementById('contenido');
  if (!d || !d.ok) { cont.innerHTML = ''; return; }
  var html = '';
  var rad = d.radar || {}, rep = d.reportes || {}, ins = d.inscripciones || {};
  var muro = d.muro || {}, ag = d.agenda || {}, ru = d.rutas || {}, agru = d.agrupaciones || {}, cor = d.correos || {}, disp = d.dispositivos || {};
  var desc = rad.descubrimientos || {}, nodos = rad.nodos || {}, posts = muro.posts || {};
  var nuevos = ((rep.por_estado || []).find(function (x) { return x.e === 'nuevo'; }) || {}).n || 0;

  /* --- lo que importa de un vistazo --- */
  html += '<div class="grid">' +
    kpi(desc.total || 0, 'lugares descubiertos', (desc.personas || 0) + ' personas', 'acento') +
    kpi(ins.total || 0, 'anotados al piloto', lista(ins.por_estado).replace(/<[^>]+>/g, '').trim() || '', '') +
    kpi(nuevos, 'reportes sin leer', 'total ' + ((rep.por_estado || []).reduce(function (a, x) { return a + x.n; }, 0)) || 0, nuevos > 0 ? 'acento' : 'ok') +
    kpi(posts.total || 0, 'publicaciones en el muro', (posts.autores || 0) + ' autores', '') +
    kpi((ag.eventos || {}).publicados || 0, 'funciones publicadas', ((ag.eventos || {}).externos || 0) + ' con fuente externa', '') +
    kpi((nodos.publicados || 0), 'lugares en el radar', (nodos.sin_coordenada || 0) + ' sin coordenada', '') +
    '</div>';

  /* --- uso de los últimos 7 días: ¿la gente está volviendo? --- */
  html += '<h2>Uso de los últimos 7 días</h2><div class="grid">' +
    kpi((disp.activos_7d || [{}])[0].personas || 0, 'descubrieron algo', '', '') +
    kpi((disp.publicaron_7d || [{}])[0].personas || 0, 'publicaron', '', '') +
    kpi((disp.reportaron_7d || [{}])[0].personas || 0, 'reportaron', '', '') +
    kpi((ru.rutas || {}).total || 0, 'rutas cargadas', (ru.paradas || 0) + ' paradas · ' + (ru.con_progreso || 0) + ' con avance', '') +
    '</div>';

  html += '<div class="dos">';

  /* --- quién avanza --- */
  html += '<div class="panel"><h3>Quiénes avanzan</h3>' +
    tabla(rad.top_exploradores, [
      ['Persona', function (f) { return '<b>' + esc(f.display_name || f.email || '—') + '</b><div class="mini">' + esc(f.email || '') + '</div>'; }],
      ['Lugares', function (f) { return f.n; }],
      ['Último', function (f) { return '<span class="mini">' + fechaCorta(f.ultimo) + '</span>'; }],
    ]) +
    '<div class="mini" style="margin-top:8px">Descubrimientos por día (14 días)</div>' +
    '<div class="barras">' + (function () {
      var dias = rad.ultimos_14_dias || [];
      var max = Math.max.apply(null, dias.map(function (x) { return x.n; }).concat([1]));
      if (!dias.length) return '<div style="background:transparent"></div>';
      return dias.map(function (x) { return '<div style="height:' + Math.max(2, Math.round(x.n / max * 54)) + 'px" title="' + esc(x.dia) + ': ' + x.n + '"></div>'; }).join('');
    })() + '</div></div>';

  /* --- reportes --- */
  html += '<div class="panel"><h3>Reportes de la app</h3>' +
    '<div class="mini" style="margin-bottom:6px">' + lista(rep.por_estado) + '</div>' +
    tabla(rep.ultimos, [
      ['Reporte', function (f) { return esc(String(f.texto || '').slice(0, 70)) + '<div class="mini">' + esc(f.nombre || '') + ' · ' + esc(f.categoria || '') + '</div>'; }],
      ['Estado', function (f) { var e = f.estado || 'nuevo'; return '<span class="pill ' + (e === 'nuevo' ? 'nuevo' : e === 'resuelto' ? 'ok' : '') + '">' + esc(e) + '</span>'; }],
    ]) +
    '<div class="mini" style="margin-top:8px">Por pantalla: ' + lista(rep.por_pantalla) + '</div>' +
    '<p class="mini" style="margin-top:8px"><a href="/reportes">Abrir el buzón y responder →</a></p></div>';

  /* --- agenda --- */
  html += '<div class="panel"><h3>Agenda (lo que ve la app)</h3>' +
    tabla(ag.proximos, [
      ['Función', function (f) { return '<b>' + esc(String(f.title || '').slice(0, 60)) + '</b><div class="mini">' + esc(f.venue || '') + ' · ' + esc(f.city || '') + '</div>'; }],
      ['Cuándo', function (f) { return '<span class="mini">' + String(f.date || '').slice(0, 10) + (f.time_start ? ' ' + String(f.time_start).slice(0, 5) : '') + '</span>'; }],
      ['Fuente', function (f) { return f.source === 'externo' ? '<span class="pill ext">externa</span>' : '<span class="pill">propia</span>'; }],
    ]) +
    '<div class="mini" style="margin-top:8px">Por comuna: ' + lista(ag.por_comuna) + '</div>' +
    '<div class="mini">Por tipo: ' + lista(ag.por_tipo) + '</div>' +
    '<p class="mini" style="margin-top:8px"><a href="/agenda">Cargar o corregir funciones →</a></p></div>';

  /* --- datos y gente --- */
  var cuentas = agru.cuentas || {};
  html += '<div class="panel"><h3>Datos y gente</h3>' +
    '<div class="mini" style="margin-bottom:6px">' +
    (cuentas.usuarios || 0) + ' cuentas · ' + (cuentas.membresias || 0) + ' membresías · ' +
    (cuentas.fichas || 0) + ' fichas de nómina · ' + (cuentas.perfiles_radar || 0) + ' perfiles de radar<br>' +
    'Compañías: ' + ((agru.companias || {}).total || 0) + ' (' + ((agru.companias || {}).sin_nadie || 0) + ' sin gente)' +
    '</div>' +
    '<div class="mini">Solicitudes: ' + lista(agru.solicitudes) + '</div>' +
    '<div class="mini" style="margin-top:6px">Nodos por comuna: ' + lista(rad.por_ciudad) + '</div>' +
    '<p class="mini" style="margin-top:8px"><a href="/nodos">Administrar lugares del radar →</a></p></div>';

  /* --- muro y correos --- */
  html += '<div class="panel"><h3>Muro y correos</h3>' +
    '<div class="mini" style="margin-bottom:6px">' + (posts.total || 0) + ' publicaciones (' + (posts.aprobadas || 0) + ' aprobadas, ' +
    (posts.pendientes || 0) + ' pendientes) · ' + (muro.comentarios || 0) + ' comentarios · ' + (muro.reacciones || 0) + ' reacciones<br>' +
    'Correos enviados: ' + ((cor.total || {}).n || 0) + ' (' + ((cor.total || {}).ok || 0) + ' ok)</div>' +
    tabla(muro.ultimos, [
      ['Publicación', function (f) { return esc(String(f.caption || '(sin texto)').slice(0, 60)); }],
      ['Fecha', function (f) { return '<span class="mini">' + fechaCorta(f.created_at) + '</span>'; }],
    ]) +
    tabla(cor.ultimos, [
      ['Correo a', function (f) { return esc(f.para || '') + '<div class="mini">' + esc(String(f.asunto || '').slice(0, 50)) + '</div>'; }],
      ['Estado', function (f) { return f.ok ? '<span class="pill ok">enviado</span>' : '<span class="pill">falló</span>'; }],
    ]) + '</div>';

  html += '</div>';
  cont.innerHTML = html;
}

function cargar() {
  document.getElementById('quien').innerHTML = EMAIL ? 'Sesión: <b>' + esc(EMAIL) + '</b>' : 'Sin sesión';
  if (!EMAIL) {
    var av = document.getElementById('sinSesion');
    av.innerHTML = 'No hay sesión en este navegador. Abre el tablero desde el CRM o agrega <b>?email=tucorreo@dominio.cl</b>. Sólo administración.';
    av.style.display = 'block';
  }
  fetch('/api/v1/crm/piloto/tablero', { headers: cabeceras() })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
    .then(function (res) {
      if (!res.d || !res.d.ok) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'No se pudo leer el tablero: ' + ((res.d && res.d.error) || 'HTTP ' + res.status);
        return;
      }
      document.getElementById('error').style.display = 'none';
      document.getElementById('generado').textContent = 'actualizado ' + fechaCorta(res.d.generado);
      pintar(res.d);
    })
    .catch(function (e) {
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = 'No se pudo conectar con el hub: ' + e.message;
    });
}

document.getElementById('btnRecargar').addEventListener('click', cargar);
cargar();
</script>
</body>
</html>
`;
app.get('/tablero', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_TABLERO);
});


/**
 * RUTAS DE API QUE NO EXISTEN: 404 en JSON, nunca el HTML de la SPA.
 *
 * Antes, cualquier `/api/...` desconocido caía en el catch-all y recibía el `index.html` con
 * **HTTP 200**. Consecuencia real: la pestaña Finanzas llamaba a `/api/v1/crm/finances` (que no
 * existía), el `fetch` "andaba", el `.json()` explotaba y la pantalla quedaba vacía sin decir
 * nada — una falla invisible. Este guardia va ANTES del catch-all y hace ruidoso el error.
 */
app.all('/api/*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: `La ruta ${req.method} ${req.path} no existe en el hub`,
    pista: 'Si es una pantalla del CRM que quedó sin backend, hay que implementarla: el catch-all ya no devuelve HTML.',
  });
});

// ---------------------------------------------------------------------------
// AGRUPACIONES: DATOS, ELENCO Y MONTAJES
//
// Página servida en línea por el hub (/companias). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/companias.html (ver docs/).
// ---------------------------------------------------------------------------
// AGRUPACIONES: DATOS, ELENCO Y MONTAJES
//
// Página servida en línea por el hub (/companias). Se sirve el HTML desde aquí a propósito:
// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en
// public/ NO viajaría en la imagen. Fuente editable del HTML: paginas/companias.html (ver docs/).
// ---------------------------------------------------------------------------
const PAGINA_COMPANIAS = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Agrupaciones · FASE CRM</title>
<link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
<style>
  :root {
    --fondo:#F5EFE4; --fondo2:#EDE4D3; --tarjeta:#FFFBF4; --tinta:#1D1A16; --tinta2:#5E564C;
    --linea:#D8CDBA; --acento:#B4472C; --acento-suave:#F3E1DA; --ok:#4E6B3A;
    --serif: Georgia, 'Times New Roman', serif;
    --sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:14px/1.5 var(--sans); }
  header { position:sticky; top:0; z-index:20; background:var(--tarjeta); border-bottom:1px solid var(--linea); padding:12px 16px; }
  .env { max-width:1180px; margin:0 auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .marca { display:flex; align-items:center; gap:9px; font:700 16px var(--serif); }
  .quien { margin-left:auto; font-size:12px; color:var(--tinta2); }
  main { max-width:1180px; margin:0 auto; padding:16px; display:grid; grid-template-columns:320px 1fr; gap:16px; }
  @media (max-width:820px) { main { grid-template-columns:1fr; } }
  .panel { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:14px; }
  .panel h2 { font:700 15px var(--serif); margin:0 0 10px; }
  .lista { display:flex; flex-direction:column; gap:6px; max-height:70vh; overflow:auto; }
  .item { text-align:left; border:1px solid var(--linea); background:var(--fondo2); border-radius:12px; padding:8px 10px; cursor:pointer; }
  .item:hover { border-color:var(--acento); }
  .item.activo { border-color:var(--acento); background:var(--acento-suave); }
  .item .n { font-weight:700; font-size:12.5px; }
  .item .m { font-size:10.5px; color:var(--tinta2); }
  .pill { display:inline-block; font-size:9.5px; font-weight:700; border-radius:6px; padding:2px 6px; border:1px solid var(--linea); color:var(--tinta2); }
  .pill.propia { border-color:var(--acento); color:var(--acento); background:var(--acento-suave); }
  .campo { margin-bottom:10px; }
  .campo label { display:block; font-size:11px; font-weight:700; color:var(--tinta2); margin-bottom:3px; text-transform:uppercase; letter-spacing:.04em; }
  input[type=text], textarea, select { width:100%; padding:8px 10px; border:1px solid var(--linea); border-radius:10px; background:#fff; font:13px var(--sans); color:var(--tinta); }
  textarea { min-height:88px; resize:vertical; }
  .fila { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .btn { border:1px solid var(--linea); background:var(--fondo2); color:var(--tinta); border-radius:999px; padding:8px 14px; font:600 12.5px var(--sans); cursor:pointer; }
  .btn:hover { border-color:var(--acento); color:var(--acento); }
  .btn.principal { background:var(--acento); border-color:var(--acento); color:#fff; }
  .btn.principal:hover { color:#fff; filter:brightness(1.06); }
  .btn.chico { padding:4px 9px; font-size:11px; }
  .btn.peligro:hover { border-color:#8A3B6B; color:#8A3B6B; }
  .barra { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
  h3 { font:700 13px var(--serif); margin:18px 0 6px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:6px 6px; border-bottom:1px solid var(--linea); font-size:12px; vertical-align:middle; }
  th { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--tinta2); }
  tr:last-child td { border-bottom:0; }
  .mini { font-size:11px; color:var(--tinta2); }
  .aviso { border-radius:10px; padding:8px 10px; font-size:12px; margin-bottom:10px; display:none; }
  .aviso.ok { background:#EDF3E6; border:1px solid var(--ok); color:#3C5527; display:block; }
  .aviso.malo { background:var(--acento-suave); border:1px solid var(--acento); color:var(--acento); display:block; }
  .error { background:var(--acento-suave); border:1px solid var(--acento); color:var(--acento); border-radius:12px; padding:9px 12px; font-size:12.5px; margin-bottom:12px; }
  .galeria { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:8px; }
  .galeria img { width:100%; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--linea); }
</style>
</head>
<body>
<header>
  <div class="env">
    <div class="marca">Agrupaciones del ecosistema</div>
    <div class="quien" id="quien">cargando…</div>
  </div>
</header>

<main>
  <section class="panel">
    <h2>Agrupaciones (<span id="total">0</span>)</h2>
    <div class="campo"><input id="buscar" type="text" placeholder="Buscar por nombre…" /></div>
    <div class="mini" style="margin-bottom:8px">Los montajes salen del <b>catálogo real de obras</b>: lo que vincules acá es la misma obra que ves en el catálogo y en la app.</div>
    <div class="lista" id="lista"></div>
    <p class="mini" id="sinSesion" style="display:none;margin-top:10px"></p>
  </section>

  <section>
    <div id="error" class="error" style="display:none"></div>
    <div class="panel" id="detalle" style="display:none">
      <div class="barra">
        <h2 style="margin:0" id="tituloComp">—</h2>
        <span class="pill" id="pillTipo">—</span>
        <span class="mini" id="contadores"></span>
        <span style="margin-left:auto"></span>
        <button class="btn principal" id="btnGuardar">Guardar cambios</button>
        <button class="btn" id="btnDescartar">Descartar</button>
      </div>
      <div class="aviso" id="aviso"></div>

      <h3>Datos de la agrupación</h3>
      <div class="fila">
        <div class="campo"><label for="fNombre">Nombre</label><input id="fNombre" type="text" /></div>
        <div class="campo"><label for="fRazon">Razón social</label><input id="fRazon" type="text" placeholder="Como figura legalmente" /></div>
      </div>
      <div class="fila">
        <div class="campo"><label for="fDisciplina">Disciplina</label><input id="fDisciplina" type="text" placeholder="Teatro contemporáneo &amp; género" /></div>
        <div class="campo"><label for="fTipo">Tipo</label>
          <select id="fTipo"><option value="propia">Propia (del ecosistema)</option><option value="colaboradora">Colaboradora</option></select>
        </div>
      </div>
      <div class="fila">
        <div class="campo"><label for="fCiudad">Ciudad</label><input id="fCiudad" type="text" placeholder="Rancagua" /></div>
        <div class="campo"><label for="fCorreo">Correo de contacto</label><input id="fCorreo" type="text" placeholder="contacto@…" /></div>
      </div>
      <div class="campo"><label for="fEstado">Estado</label>
        <select id="fEstado"><option value="active">Activa</option><option value="inactive">Inactiva</option></select>
      </div>
      <div class="campo"><label for="fDescripcion">Descripción</label>
        <textarea id="fDescripcion" placeholder="Qué hace la agrupación, su línea de trabajo, su historia…"></textarea>
      </div>

      <h3>Montajes (obras del catálogo)</h3>
      <table><tbody id="obras"></tbody></table>
      <div class="barra" style="margin-top:8px">
        <select id="selObra" style="max-width:340px"></select>
        <button class="btn" id="btnVincular">Vincular obra del catálogo</button>
        <span class="mini">Se guarda al instante (no hace falta apretar Guardar).</span>
      </div>
      <p class="mini" id="pistaObras"></p>

      <h3>Elenco y equipo</h3>
      <table><tbody id="gente"></tbody></table>
      <div class="fila" style="margin-top:8px">
        <div class="campo"><label for="pNombre">Nombre y apellido</label><input id="pNombre" type="text" placeholder="Josefa Schultz" /></div>
        <div class="campo"><label for="pRol">Rol</label><input id="pRol" type="text" placeholder="Dirección, producción, elenco…" /></div>
      </div>
      <div class="fila">
        <div class="campo"><label for="pTipo">En qué parte</label>
          <select id="pTipo"><option value="elenco">Elenco (artistas)</option><option value="equipo">Equipo (técnica y producción)</option><option value="socio">Socio/a</option><option value="colaborador">Colaborador/a</option></select>
        </div>
        <div class="campo"><label for="pCorreo">Correo (opcional)</label><input id="pCorreo" type="text" placeholder="para vincular su cuenta" /></div>
      </div>
      <div class="campo"><label for="pPersonaje">Personaje (opcional — sólo si es un papel de un montaje)</label>
        <input id="pPersonaje" type="text" placeholder="Se puede dejar vacío: no es un dato fijo del integrante" /></div>
      <div class="barra">
        <button class="btn" id="btnAgregarPersona">Agregar al elenco</button>
        <button class="btn" id="btnCancelarPersona" style="display:none">Cancelar edición</button>
      </div>
    </div>
    <div class="panel" id="vacio"><p class="mini">Elige una agrupación de la lista para editar sus datos, su elenco y sus montajes.</p></div>
  </section>
</main>

<script>
var EMAIL = '';
try {
  var q = new URLSearchParams(location.search);
  EMAIL = q.get('email') || '';
  ['user_session', 'atha_user_session', 'atha_user_profile'].forEach(function (k) {
    if (EMAIL) return;
    var u = JSON.parse(localStorage.getItem(k) || 'null');
    EMAIL = (u && (u.email || (u.user && u.user.email))) || '';
  });
} catch (e) { EMAIL = ''; }

var COMPANIAS = [];
var CATALOGO = [];
var ACTUAL = null;
var PERSONA_EDITANDO = '';

function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function cabeceras(conJson) { var h = { 'Content-Type': 'application/json' }; if (EMAIL) h['x-atha-email'] = EMAIL; return h; }
function aviso(texto, tipo) {
  var a = document.getElementById('aviso');
  a.textContent = texto || '';
  a.className = 'aviso ' + (tipo || '');
  if (!texto) { a.className = 'aviso'; a.style.display = 'none'; }
}
function pedir(url, metodo, cuerpo) {
  return fetch(url, {
    method: metodo || 'GET',
    headers: cabeceras(),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  }).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); });
}

function pintarLista() {
  var filtro = document.getElementById('buscar').value.trim().toLowerCase();
  var visibles = COMPANIAS.filter(function (c) { return !filtro || c.name.toLowerCase().indexOf(filtro) >= 0; });
  document.getElementById('total').textContent = String(COMPANIAS.length);
  document.getElementById('lista').innerHTML = visibles.map(function (c) {
    var activo = ACTUAL && ACTUAL.id === c.id ? ' activo' : '';
    return '<button class="item' + activo + '" data-id="' + esc(c.id) + '">' +
      '<div class="n">' + esc(c.name) + '</div>' +
      '<div class="m">' + ([c.kind === 'propia' ? 'propia' : 'colaboradora', (c.obras || []).length + ' montaje(s)', (c.people || []).length + ' persona(s)'].join(' · ')) + '</div>' +
      '</button>';
  }).join('') || '<p class="mini">Ninguna coincide.</p>';
  Array.prototype.forEach.call(document.querySelectorAll('#lista .item'), function (b) {
    b.addEventListener('click', function () { elegir(b.getAttribute('data-id')); });
  });
}

function elegir(id) {
  ACTUAL = COMPANIAS.filter(function (c) { return c.id === id; })[0] || null;
  pintarLista();
  if (!ACTUAL) return;
  document.getElementById('detalle').style.display = 'block';
  document.getElementById('vacio').style.display = 'none';
  document.getElementById('tituloComp').textContent = ACTUAL.name;
  var pill = document.getElementById('pillTipo');
  pill.textContent = ACTUAL.kind === 'propia' ? 'propia del ecosistema' : 'colaboradora';
  pill.className = 'pill' + (ACTUAL.kind === 'propia' ? ' propia' : '');
  document.getElementById('contadores').textContent =
    (ACTUAL.obras || []).length + ' montaje(s) · ' + (ACTUAL.people || []).length + ' persona(s)';
  document.getElementById('fNombre').value = ACTUAL.name || '';
  document.getElementById('fRazon').value = ACTUAL.legalName || '';
  document.getElementById('fDisciplina').value = ACTUAL.discipline || '';
  document.getElementById('fTipo').value = ACTUAL.kind === 'propia' ? 'propia' : 'colaboradora';
  document.getElementById('fCiudad').value = ACTUAL.city || '';
  document.getElementById('fCorreo').value = ACTUAL.contactEmail || '';
  document.getElementById('fEstado').value = ACTUAL.status === 'inactive' ? 'inactive' : 'active';
  document.getElementById('fDescripcion').value = ACTUAL.description || '';
  pintarObras();
  pintarGente();
  aviso('');
}

function pintarObras() {
  var obras = (ACTUAL && ACTUAL.obras) || [];
  document.getElementById('obras').innerHTML = obras.length ? obras.map(function (o) {
    return '<tr><td><b>' + esc(o.title) + '</b><div class="mini">' + esc(o.discipline || '') + (o.status ? ' · ' + esc(o.status) : '') + '</div></td>' +
      '<td style="text-align:right"><button class="btn chico peligro" data-quitar="' + esc(o.id) + '">Quitar</button></td></tr>';
  }).join('') : '<tr><td class="mini">Todavía no tiene montajes vinculados.</td></tr>';
  Array.prototype.forEach.call(document.querySelectorAll('#obras [data-quitar]'), function (b) {
    b.addEventListener('click', function () { quitarObra(b.getAttribute('data-quitar')); });
  });

  var yaEstan = obras.map(function (o) { return o.id; });
  // Del catálogo se ofrecen sólo las obras que no están en ninguna agrupación (el endpoint del
  // catálogo ahora informa a quién pertenece cada una) y se avisa cuántas están en otras.
  var libres = CATALOGO.filter(function (p) { return yaEstan.indexOf(p.id) < 0 && !p.company_id; });
  var enOtras = CATALOGO.filter(function (p) { return p.company_id && p.company_id !== (ACTUAL && ACTUAL.id); });
  document.getElementById('selObra').innerHTML = libres.length
    ? libres.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.title) + '</option>'; }).join('')
    : '<option value="">(no quedan obras libres en el catálogo)</option>';
  document.getElementById('btnVincular').disabled = !libres.length;
  var pista = document.getElementById('pistaObras');
  if (pista) {
    pista.textContent = enOtras.length
      ? enOtras.length + ' obra(s) del catálogo ya pertenecen a otra agrupación: quitalas de ahí primero.'
      : 'Todas las obras del catálogo están disponibles o ya son de esta agrupación.';
  }
}

function pintarGente() {
  var gente = (ACTUAL && ACTUAL.people) || [];
  document.getElementById('gente').innerHTML = gente.length ? gente.map(function (p) {
    // Sólo persona y cargo: el personaje es un papel de un montaje, no un dato fijo del integrante
    return '<tr><td><b>' + esc(p.fullName) + '</b><div class="mini">' + esc(p.roleTitle || 'sin cargo') + '</div></td>' +
      '<td><span class="pill">' + esc(p.kind || 'equipo') + '</span></td>' +
      '<td class="mini">' + esc(p.email || '') + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' +
      '<button class="btn chico" data-editar="' + esc(p.id) + '">Editar</button> ' +
      '<button class="btn chico peligro" data-borrar="' + esc(p.id) + '">Quitar</button></td></tr>';
  }).join('') : '<tr><td class="mini">Sin personas cargadas todavía.</td></tr>';
  Array.prototype.forEach.call(document.querySelectorAll('#gente [data-borrar]'), function (b) {
    b.addEventListener('click', function () { quitarPersona(b.getAttribute('data-borrar')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('#gente [data-editar]'), function (b) {
    b.addEventListener('click', function () { editarPersona(b.getAttribute('data-editar')); });
  });
}

function editarPersona(personId) {
  var p = ((ACTUAL && ACTUAL.people) || []).filter(function (x) { return x.id === personId; })[0];
  if (!p) return;
  PERSONA_EDITANDO = personId;
  document.getElementById('pNombre').value = p.fullName || '';
  document.getElementById('pRol').value = p.roleTitle || '';
  document.getElementById('pTipo').value = p.kind || 'elenco';
  document.getElementById('pCorreo').value = p.email || '';
  document.getElementById('pPersonaje').value = p.characterName || '';
  document.getElementById('btnAgregarPersona').textContent = 'Guardar cambios del integrante';
  document.getElementById('btnCancelarPersona').style.display = 'inline-block';
  aviso('Editando a ' + p.fullName + ': el personaje se puede dejar vacío (es un papel del montaje, no del integrante).');
}

function cancelarEdicionPersona() {
  PERSONA_EDITANDO = '';
  ['pNombre', 'pRol', 'pCorreo', 'pPersonaje'].forEach(function (id) { document.getElementById(id).value = ''; });
  document.getElementById('btnAgregarPersona').textContent = 'Agregar al elenco';
  document.getElementById('btnCancelarPersona').style.display = 'none';
  aviso('');
}

function recargar(mantener) {
  return pedir('/api/v1/crm/companies').then(function (r) {
    if (!r.d || !r.d.success) throw new Error((r.d && r.d.error) || 'no se pudo leer');
    COMPANIAS = r.d.companies || [];
    var id = mantener || (ACTUAL && ACTUAL.id);
    pintarLista();
    if (id) elegir(id);
  });
}

function cargar() {
  document.getElementById('quien').innerHTML = EMAIL ? 'Sesión: <b>' + esc(EMAIL) + '</b>' : 'Sin sesión';
  if (!EMAIL) {
    var p = document.getElementById('sinSesion');
    p.style.display = 'block';
    p.innerHTML = 'No hay sesión en este navegador: abrí esta página desde el CRM o agregá <b>?email=tucorreo@dominio.cl</b>.';
  }
  Promise.all([pedir('/api/v1/crm/companies'), pedir('/api/v1/crm/portfolio/projects')])
    .then(function (rs) {
      var c = rs[0], p = rs[1];
      if (!c.d || !c.d.success) throw new Error((c.d && c.d.error) || 'no se pudieron leer las agrupaciones');
      COMPANIAS = c.d.companies || [];
      CATALOGO = ((p.d && (p.d.projects || p.d.data)) || []).map(function (x) {
        return { id: x.id, title: x.title, company_name: x.companyName || x.company_name || '' };
      });
      pintarLista();
      document.getElementById('error').style.display = 'none';
      var primera = new URLSearchParams(location.search).get('id');
      if (primera) elegir(primera);
    })
    .catch(function (e) {
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = 'No se pudo cargar: ' + e.message;
    });
}

function guardar() {
  if (!ACTUAL) return;
  var cuerpo = {
    name: document.getElementById('fNombre').value.trim(),
    legalName: document.getElementById('fRazon').value.trim(),
    discipline: document.getElementById('fDisciplina').value.trim(),
    kind: document.getElementById('fTipo').value,
    city: document.getElementById('fCiudad').value.trim(),
    contactEmail: document.getElementById('fCorreo').value.trim(),
    status: document.getElementById('fEstado').value,
    description: document.getElementById('fDescripcion').value.trim(),
  };
  if (!cuerpo.name) { aviso('El nombre no puede quedar vacío.', 'malo'); return; }
  aviso('Guardando…', '');
  pedir('/api/v1/crm/companies/' + encodeURIComponent(ACTUAL.id), 'PUT', cuerpo).then(function (r) {
    if (!r.d || !r.d.success) { aviso('No se guardó: ' + ((r.d && r.d.error) || 'error'), 'malo'); return; }
    aviso('Guardado ✓ — los datos de la agrupación quedaron actualizados.', 'ok');
    return recargar(ACTUAL.id);
  }).catch(function (e) { aviso('No se guardó: ' + e.message, 'malo'); });
}

function agregarPersona() {
  if (!ACTUAL) return;
  var nombre = document.getElementById('pNombre').value.trim();
  if (!nombre) { aviso('Escribe el nombre de la persona.', 'malo'); return; }
  var cuerpo = {
    fullName: nombre,
    roleTitle: document.getElementById('pRol').value.trim(),
    kind: document.getElementById('pTipo').value,
    email: document.getElementById('pCorreo').value.trim(),
    characterName: document.getElementById('pPersonaje').value.trim(),
  };
  var editando = !!PERSONA_EDITANDO;
  aviso(editando ? 'Guardando…' : 'Agregando…');
  pedir('/api/v1/crm/companies/' + encodeURIComponent(ACTUAL.id) + '/people' + (editando ? '/' + encodeURIComponent(PERSONA_EDITANDO) : ''),
    editando ? 'PUT' : 'POST', cuerpo).then(function (r) {
    if (!r.d || !r.d.success) { aviso('No se guardó: ' + ((r.d && r.d.error) || 'error'), 'malo'); return; }
    cancelarEdicionPersona();
    aviso(editando ? 'Integrante actualizado ✓' : 'Agregada al elenco ✓', 'ok');
    return recargar(ACTUAL.id);
  }).catch(function (e) { aviso('No se guardó: ' + e.message, 'malo'); });
}

function quitarPersona(personId) {
  aviso('Quitando…');
  pedir('/api/v1/crm/companies/' + encodeURIComponent(ACTUAL.id) + '/people/' + encodeURIComponent(personId), 'DELETE')
    .then(function (r) {
      if (!r.d || !r.d.success) { aviso('No se pudo quitar: ' + ((r.d && r.d.error) || 'error'), 'malo'); return; }
      aviso('Persona quitada del elenco ✓', 'ok');
      return recargar(ACTUAL.id);
    }).catch(function (e) { aviso('No se pudo quitar: ' + e.message, 'malo'); });
}

function vincularObra() {
  var projectId = document.getElementById('selObra').value;
  if (!ACTUAL || !projectId) return;
  aviso('Vinculando…');
  pedir('/api/v1/crm/companies/' + encodeURIComponent(ACTUAL.id) + '/projects', 'POST', { projectId: projectId })
    .then(function (r) {
      if (!r.d || !r.d.success) { aviso('No se vinculó: ' + ((r.d && r.d.error) || 'error'), 'malo'); return; }
      aviso('«' + (r.d.title || 'obra') + '» quedó como montaje de la agrupación ✓', 'ok');
      return recargar(ACTUAL.id);
    }).catch(function (e) { aviso('No se vinculó: ' + e.message, 'malo'); });
}

function quitarObra(projectId) {
  aviso('Quitando el montaje…');
  pedir('/api/v1/crm/companies/' + encodeURIComponent(ACTUAL.id) + '/projects/' + encodeURIComponent(projectId), 'DELETE')
    .then(function (r) {
      if (!r.d || !r.d.success) { aviso('No se pudo quitar: ' + ((r.d && r.d.error) || 'error'), 'malo'); return; }
      aviso('Montaje desvinculado (la obra sigue en el catálogo) ✓', 'ok');
      return recargar(ACTUAL.id);
    }).catch(function (e) { aviso('No se pudo quitar: ' + e.message, 'malo'); });
}

document.getElementById('buscar').addEventListener('input', pintarLista);
document.getElementById('btnGuardar').addEventListener('click', guardar);
document.getElementById('btnDescartar').addEventListener('click', function () { elegir(ACTUAL.id); });
document.getElementById('btnAgregarPersona').addEventListener('click', agregarPersona);
document.getElementById('btnCancelarPersona').addEventListener('click', cancelarEdicionPersona);
document.getElementById('btnVincular').addEventListener('click', vincularObra);
cargar();
</script>
</body>
</html>
`;
app.get('/companias', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(PAGINA_COMPANIAS);
});


app.get('*', (req, res) => {
  // El index nunca se cachea: si no, el navegador sigue mostrando el bundle
  // viejo y parece que "las actualizaciones no llegan".
  res.sendFile(path.join(distDir, 'index.html'), {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
});

// ---------------------------------------------------------------------------
// Manejador de errores (último): convierte lo que antes salía como HTML opaco en
// un JSON que la app puede mostrar. El caso típico era subir una foto y recibir
// "PayloadTooLargeError: request entity too large" en HTML — la app no podía
// explicarle nada al usuario.
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (!err) return next();
  const grande = err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413;
  if (grande) {
    return res.status(413).json({
      ok: false,
      error: 'La foto es muy pesada para subirla. Prueba de nuevo o elige otra más chica.',
    });
  }
  console.error('[error]', req.method, req.originalUrl, err.message);
  return res.status(err.status || err.statusCode || 500).json({ ok: false, error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`crm-atha sirviendo en puerto ${PORT}`);
  console.log(`BD: ${DB_CONF.user}@${DB_CONF.host}:${DB_CONF.port}/${DB_CONF.database}`);
  console.log(`Auth: POST /php/api.php?action=auth_google  |  POST /api/auth/google`);
  console.log(`Diagnostico BD: GET /api/db/ping`);
});
