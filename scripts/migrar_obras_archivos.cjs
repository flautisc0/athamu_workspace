/**
 * MIGRACIÓN · CATÁLOGO DE OBRAS CON ARCHIVOS (Tanda A)
 *
 * Agrega el soporte que define docs/CONTRATO_CATALOGO_ARCHIVOS.md (sección 1):
 *   1. companies.logo_url     VARCHAR(500) NULL   (chequea information_schema: MySQL 8 no tiene ADD COLUMN IF NOT EXISTS)
 *   2. projects.ficha         JSON NULL
 *   3. tabla project_files    (+ índices idx_pf_project, idx_pf_tipo)
 *   4. migra las URLs de projects.dossier_highlights a project_files
 *      (tipo dossier/.pdf · video/youtube-vimeo · otro · resto; nombre = último segmento;
 *       id determinista pf_<md5 corto de project_id+url>; subido_por='migracion').
 *      NO duplica por (project_id, url) y NO toca dossier_highlights.
 *
 * Idempotente: se puede correr N veces sin efectos acumulativos.
 * Uso: python3 scripts/correr_en_hub.py scripts/migrar_obras_archivos.cjs
 */
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const TABLA_PF = 'project_files';

async function existeColumna(c, tabla, columna) {
  const [r] = await c.execute(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [tabla, columna]);
  return r.length > 0;
}

async function existeTabla(c, tabla) {
  const [r] = await c.execute(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1', [tabla]);
  return r.length > 0;
}

/** dossier_highlights puede venir como string JSON, objeto/array ya parseado, o null. */
function entradasDe(raw) {
  if (raw == null) return [];
  let v = raw;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try { v = JSON.parse(t); } catch { return []; }
  }
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return []; } }
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    // tolera {highlights:[...]} | {urls:[...]} | cualquier objeto con valores-URL
    for (const k of ['highlights', 'items', 'urls', 'archivos', 'files', 'lista']) {
      if (Array.isArray(v[k])) return v[k];
    }
    return Object.values(v);
  }
  return [];
}

/** Extrae la URL de una entrada que puede ser string o {url|link|href|...}. */
function urlDe(entrada) {
  if (typeof entrada === 'string') return entrada.trim();
  if (entrada && typeof entrada === 'object') {
    for (const k of ['url', 'link', 'href', 'enlace', 'src']) {
      if (typeof entrada[k] === 'string' && entrada[k].trim()) return entrada[k].trim();
    }
  }
  return null;
}

function tipoDe(url) {
  const u = url.toLowerCase();
  const sinQuery = u.split('?')[0];
  if (sinQuery.endsWith('.pdf')) return 'dossier';
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com')) return 'video';
  return 'otro';
}

function nombreDe(url) {
  const sinQuery = url.split('?')[0].split('#')[0];
  const partes = sinQuery.split('/').filter(Boolean);
  let nombre = partes.length ? decodeURIComponent(partes[partes.length - 1]) : url;
  if (!nombre) nombre = url;
  return nombre.slice(0, 255);
}

function idDe(projectId, url) {
  const h = crypto.createHash('md5').update(`${projectId}|${url}`).digest('hex').slice(0, 16);
  return `pf_${h}`;
}

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });

  const columnas = [];
  const migradas = [];
  const saltadas = [];
  let tablaCreada = false;

  // ── 1 · companies.logo_url ─────────────────────────────────────────────────
  if (await existeColumna(c, 'companies', 'logo_url')) {
    columnas.push('companies.logo_url (ya existía)');
  } else {
    await c.execute('ALTER TABLE companies ADD COLUMN logo_url VARCHAR(500) NULL');
    columnas.push('companies.logo_url VARCHAR(500) NULL (agregada)');
  }

  // ── 2 · projects.ficha ─────────────────────────────────────────────────────
  if (await existeColumna(c, 'projects', 'ficha')) {
    columnas.push('projects.ficha (ya existía)');
  } else {
    await c.execute('ALTER TABLE projects ADD COLUMN ficha JSON NULL');
    columnas.push('projects.ficha JSON NULL (agregada)');
  }

  // ── 3 · tabla project_files ────────────────────────────────────────────────
  if (await existeTabla(c, TABLA_PF)) {
    columnas.push(`${TABLA_PF} (ya existía)`);
  } else {
    await c.execute(`
      CREATE TABLE ${TABLA_PF} (
        id           VARCHAR(64)  NOT NULL PRIMARY KEY,
        project_id   VARCHAR(64)  NOT NULL,
        tipo         VARCHAR(24)  NOT NULL DEFAULT 'otro',
        nombre       VARCHAR(255) NOT NULL,
        url          VARCHAR(900) NOT NULL,
        mime         VARCHAR(120) NULL,
        bytes        BIGINT       NULL,
        es_portada   TINYINT(1)   NOT NULL DEFAULT 0,
        subido_por   VARCHAR(190) NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pf_project (project_id),
        KEY idx_pf_tipo (tipo)
      )`);
    tablaCreada = true;
  }

  // ── 4 · migrar dossier_highlights → project_files ──────────────────────────
  const [proyectos] = await c.execute('SELECT id, dossier_highlights FROM projects');
  for (const p of proyectos) {
    const vistos = new Set();
    for (const entrada of entradasDe(p.dossier_highlights)) {
      const url = urlDe(entrada);
      if (!url || !/^https?:\/\//i.test(url)) continue;   // textos tipo «Trailer: …» se dejan como están
      const urlCol = url.slice(0, 900);
      if (vistos.has(urlCol)) { saltadas.push({ project_id: p.id, url: urlCol, motivo: 'repetida en el mismo JSON' }); continue; }
      vistos.add(urlCol);

      const [ya] = await c.execute(
        `SELECT id FROM ${TABLA_PF} WHERE project_id = ? AND url = ? LIMIT 1`, [p.id, urlCol]);
      if (ya.length) { saltadas.push({ project_id: p.id, url: urlCol, motivo: 'ya registrada' }); continue; }

      const fila = {
        id: idDe(p.id, urlCol), project_id: p.id, tipo: tipoDe(urlCol),
        nombre: nombreDe(urlCol), url: urlCol, subido_por: 'migracion',
      };
      try {
        await c.execute(
          `INSERT INTO ${TABLA_PF} (id, project_id, tipo, nombre, url, mime, bytes, es_portada, subido_por)
           VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, ?)`,
          [fila.id, fila.project_id, fila.tipo, fila.nombre, fila.url, fila.subido_por]);
        migradas.push({ ...fila });
      } catch (e) {
        // choque de PK por md5: no es fatal, se cuenta como saltada
        saltadas.push({ project_id: p.id, url: urlCol, motivo: 'id ya existente (' + e.code + ')' });
      }
    }
  }

  // ── 5 · informe ────────────────────────────────────────────────────────────
  const [[{ total }]] = await c.execute(`SELECT COUNT(*) AS total FROM ${TABLA_PF}`);
  const [porTipo] = await c.execute(`SELECT tipo, COUNT(*) n FROM ${TABLA_PF} GROUP BY tipo ORDER BY tipo`);
  const [[{ conLogo }]] = await c.execute('SELECT COUNT(*) AS conLogo FROM companies WHERE logo_url IS NOT NULL AND logo_url <> ""');
  const [[{ conFicha }]] = await c.execute('SELECT COUNT(*) AS conFicha FROM projects WHERE ficha IS NOT NULL');

  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log(' INFORME · MIGRACIÓN CATÁLOGO DE OBRAS (Tanda A)');
  console.log('════════════════════════════════════════════════════════════');
  console.log(' Base:', process.env.DB_NAME || 'admin_crm', '·', process.env.DB_HOST);
  console.log('');
  console.log(' 1) COLUMNAS / TABLA');
  for (const x of columnas) console.log('    ✓', x);
  console.log(`    · project_files creada en esta corrida: ${tablaCreada ? 'sí' : 'no (ya existía)'}`);
  console.log('');
  console.log(' 2) MIGRACIÓN DE dossier_highlights');
  console.log(`    · proyectos revisados:            ${proyectos.length}`);
  console.log(`    · URLs migradas (nuevas filas):   ${migradas.length}`);
  console.log(`    · URLs saltadas (sin duplicar):   ${saltadas.length}`);
  console.log('');
  console.log(` 3) TOTAL DE FILAS EN ${TABLA_PF}: ${total}`);
  for (const t of porTipo) console.log(`      · ${t.tipo}: ${t.n}`);
  console.log('');
  console.log(` 4) ESTADO DE COLUMNAS NUEVAS`);
  console.log(`    · companies con logo_url: ${conLogo}`);
  console.log(`    · projects con ficha:     ${conFicha}`);

  if (migradas.length) {
    console.log('');
    console.log(' Detalle de lo migrado (primeras 20):');
    for (const m of migradas.slice(0, 20)) console.log(`   + [${m.tipo}] ${m.project_id} → ${m.url}`);
    if (migradas.length > 20) console.log(`   … y ${migradas.length - 20} más.`);
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
