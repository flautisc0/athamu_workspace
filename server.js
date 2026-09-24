import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

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

    const payload = decodeJwtPayload(idToken);
    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, error: 'Token sin datos validos' });
    }

    if (payload.exp && Date.now() / 1000 > Number(payload.exp)) {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }

    if (GOOGLE_CLIENT_ID && payload.aud && payload.aud !== GOOGLE_CLIENT_ID) {
      console.warn('[auth] aud inesperado:', payload.aud);
    }

    const email = String(payload.email).toLowerCase().trim();
    const name = body.name || payload.name || email;
    const picture = body.picture || payload.picture || '';
    const googleSub = payload.sub || email;

    const isOwner = OWNER_EMAILS.includes(email);
    const userRole = isOwner ? 'admin' : (body.role || 'artist');
    const companyRole = isOwner ? 'owner' : 'artist';
    let roleTitle = isOwner ? 'Direccion General & Produccion Ejecutiva' : 'Artista / Elenco';

    let persisted = false;
    let userId = null;
    let dbError = null;

    try {
      const db = getPool();
      const [rows] = await db.execute(
        'SELECT id, role, role_title FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (rows && rows.length) {
        userId = rows[0].id;
        if (rows[0].role_title) roleTitle = rows[0].role_title;
        await db.execute(
          `UPDATE users SET display_name = ?, picture = ?, provider = 'google',
             google_id = COALESCE(google_id, ?), google_email = COALESCE(google_email, ?),
             google_name = COALESCE(google_name, ?), google_picture = COALESCE(google_picture, ?),
             role = ?, updated_at = NOW()
           WHERE id = ?`,
          [name, picture, googleSub, email, name, picture, userRole, userId]
        );
      } else {
        userId = randomUUID();
        await db.execute(
          `INSERT INTO users (id, email, display_name, role, role_title, picture, provider,
             google_id, google_email, google_name, google_picture, public_profile, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'google', ?, ?, ?, ?, 0, NOW(), NOW())`,
          [userId, email, name, userRole, roleTitle, picture, googleSub, email, name, picture]
        );
      }

      const [member] = await db.execute(
        'SELECT id, role_in_company FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1',
        [userId, DEFAULT_COMPANY_ID]
      );

      if (member && member.length) {
        if (isOwner && member[0].role_in_company !== 'owner') {
          await db.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?',
            ['owner', member[0].id]);
        }
      } else {
        const memberId = 'm_' + randomUUID().replace(/-/g, '').slice(0, 12);
        await db.execute(
          'INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?, ?, ?, ?, NOW())',
          [memberId, DEFAULT_COMPANY_ID, userId, companyRole]
        );
      }

      persisted = true;
    } catch (e) {
      dbError = e.message;
      console.warn('[auth] BD no disponible, se continua con sesion local:', e.message);
    }

    return res.json({
      success: true,
      data: {
        id: userId || googleSub,
        name,
        email,
        role: companyRole,
        role_title: roleTitle,
        picture,
        persisted,
      },
      message: persisted
        ? 'Sesion iniciada y registrada en el CRM'
        : 'Sesion local (base de datos no disponible)',
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

// JWT secret para validar token GIS
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'atha-crm-admin-secret-key';

// Middleware: autenticacion admin (valida token)
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.admin === true) {
        req.user = decoded;
        return next();
      }
    } catch (e) {
      // token invalido
    }
  }
  // Modo demo publico si no hay token
  next();
};

// ---------------------------------------------------------------
// AUTH (antes del proxy PHP, para que no lo intercepte)
// ---------------------------------------------------------------
app.post('/php/api.php', (req, res, next) => {
  if ((req.query.action || '') !== 'auth_google') return next();
  return handleGoogleAuth(req, res);
});

app.post('/api/auth/google', handleGoogleAuth);

app.get('/api/auth/me', async (req, res) => {
  const email = String(req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ success: false, error: 'Falta email' });
  try {
    const db = getPool();
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.display_name, u.picture, u.role_title, u.provider,
              cm.role_in_company, cm.company_id
         FROM users u
         LEFT JOIN company_members cm ON cm.user_id = u.id
        WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    return res.json({ success: true, data: rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Registro publico: SIEMPRE rol no-admin. Nadie puede auto-asignarse admin/owner.
const REGISTER_ROLES = {
  artista: { user: 'artist', company: 'artist', label: 'Artista / Elenco' },
  productor: { user: 'producer', company: 'coordinator', label: 'Productor / Produccion' },
  gestor: { user: 'manager', company: 'director', label: 'Gestor / Gestion cultural' },
  cliente: { user: 'client', company: 'viewer', label: 'Cliente / Programador' },
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const name = String(body.name || '').trim();
    const requestedRole = String(body.role || 'Artista').trim();
    const rawRole = requestedRole.toLowerCase();

    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Faltan nombre o email' });
    }

    const isOwner = OWNER_EMAILS.includes(email);
    const map = REGISTER_ROLES[rawRole] || REGISTER_ROLES.artista;
    const userRole = isOwner ? 'admin' : map.user;
    const companyRole = isOwner ? 'owner' : map.company;
    const roleTitle = isOwner ? 'Direccion General & Produccion Ejecutiva' : map.label;

    let userId = null;
    let persisted = false;
    let existed = false;
    let dbError = null;

    try {
      const db = getPool();
      const [rows] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

      if (rows.length) {
        userId = rows[0].id;
        existed = true;
        await db.execute(
          'UPDATE users SET display_name = ?, role = ?, role_title = ?, updated_at = NOW() WHERE id = ?',
          [name, userRole, roleTitle, userId]
        );
      } else {
        userId = randomUUID();
        await db.execute(
          `INSERT INTO users (id, email, display_name, role, role_title, provider, public_profile, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
          [userId, email, name, userRole, roleTitle, body.provider || 'email']
        );
      }

      const [member] = await db.execute(
        'SELECT id, role_in_company FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1',
        [userId, DEFAULT_COMPANY_ID]
      );
      if (member.length) {
        if (isOwner && member[0].role_in_company !== 'owner') {
          await db.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?',
            ['owner', member[0].id]);
        }
      } else {
        const memberId = 'm_' + randomUUID().replace(/-/g, '').slice(0, 12);
        await db.execute(
          'INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?, ?, ?, ?, NOW())',
          [memberId, DEFAULT_COMPANY_ID, userId, companyRole]
        );
      }
      persisted = true;
    } catch (e) {
      dbError = e.message;
      console.warn('[register] BD no disponible:', e.message);
    }

    return res.json({
      success: true,
      data: {
        id: userId,
        name,
        email,
        role: userRole,
        role_title: roleTitle,
        company_role: companyRole,
        persisted,
        existed,
      },
      message: existed ? 'Cuenta existente: sesion iniciada' : 'Cuenta creada',
      db_error: dbError || undefined,
    });
  } catch (e) {
    console.error('[register] error:', e);
    return res.status(500).json({ success: false, error: e.message });
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
app.patch('/api/v1/crm/portfolio/projects/:id', (req, res) =>
  guardarObraEcosistema(req, res, req.params.id));

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
    return res.json({
      ok: true,
      comentario: {
        id, content: String(b.content), created_at: new Date().toISOString(),
        autor: { id: userId, name: b.name || email.split('@')[0], avatar: null },
      },
    });
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
      return res.json({ ok: true, accion: 'quitada', reaction_type: null });
    }
    if (ya.length) {
      await db.execute('UPDATE radar_reactions SET reaction_type = ? WHERE id = ?', [tipo, ya[0].id]);
      return res.json({ ok: true, accion: 'cambiada', reaction_type: tipo });
    }
    await db.execute(
      'INSERT INTO radar_reactions (id, user_id, target_type, target_id, reaction_type) VALUES (?, ?, ?, ?, ?)',
      [`rx_${randomUUID().slice(0, 8)}`, userId, targetType, target, tipo]
    );
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
};

app.get('/puente', (req, res) => {
  const clave = String(req.query.destino || '').toLowerCase();
  const destino = DESTINOS_PUENTE[clave] || '/';
  const nombre = clave || 'el CRM';
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
  var destino = ${JSON.stringify(destino)};
  // Lee la sesión del CRM sea cual sea la clave usada y normaliza el formato.
  function sesion() {
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
  function ir(u) {
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
    location.replace(destino + (destino.indexOf('?') >= 0 ? '&' : '?') + q.toString());
  }
  function intentar() {
    var u = sesion();
    if (u && u.email) { ir(u); return true; }
    return false;
  }
  if (!intentar()) {
    document.getElementById('caja').innerHTML =
      '<h1>Necesitás iniciar sesión</h1>' +
      '<p>Entrá al CRM ATHA con tu cuenta y esta página te lleva a ${nombre} automáticamente. ' +
      'Si ya iniciaste sesión en otra pestaña, esperá unos segundos.</p>' +
      '<a class="boton" href="/">Iniciar sesión en el CRM</a>';
    var n = 0;
    var t = setInterval(function () { if (intentar() || ++n > 150) clearInterval(t); }, 2000);
  }
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
