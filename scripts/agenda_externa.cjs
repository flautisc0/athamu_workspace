/**
 * AGENDA EXTERNA al CRM · carga real de la cartelera de Rancagua.
 *
 * Lee el JSON cosechado por scripts/recolectar_agenda_rancagua.py (iCal real de
 * rancaguacultura.cl = Corporación de la Cultura y las Artes de la Ilustre
 * Municipalidad de Rancagua) y escribe en `events` lo que la app muestra en Inicio.
 *
 * Reglas de la casa:
 *  - Nada inventado: cada fila lleva `source='externo'` y `source_url` de su fuente.
 *  - Idempotente: el id es determinístico (hash de fuente+fecha+hora) → re-ejecutar
 *    ACTUALIZA, no duplica.
 *  - Las coordenadas salen de los nodos del radar que ya existen (mismo OSM) o, si no,
 *    de Nominatim con la dirección textual de la fuente. Si no hay coordenada, la fila
 *    se carga igual pero se informa.
 *  - Las muestras de varios días (rango de fechas) NO se cargan: `events` guarda una
 *    fecha suelta y mostrarlas como un solo día sería mentir. Se listan aparte.
 *
 * Uso:
 *   node scripts/agenda_externa.cjs --archivo=/tmp/agenda_rancagua.json
 *   node scripts/agenda_externa.cjs --archivo=/tmp/agenda_rancagua.json --insertar
 */
const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const UA = 'ATHAMU-FASE/1.0 (radar cultural; fase.athamu@gmail.com)';
const INSERTAR = process.argv.includes('--insertar');
const ARCHIVO = (process.argv.find((a) => a.startsWith('--archivo=')) || '').split('=')[1] || '/tmp/agenda_rancagua.json';
const DESDE = (process.argv.find((a) => a.startsWith('--desde=')) || '').split('=')[1] || new Date().toISOString().slice(0, 10);
const CACHE_LUGARES = '/tmp/agenda_lugares.json';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Recintos que la fuente nombra de una forma y OSM de otra. Se revisó a mano contra
 * los nodos del radar (mismo OpenStreetMap): el Espacio Cultural La Merced (Estado 339)
 * es el complejo de La Merced, donde el radar ya tiene "Museo Patrimonial de la Merced".
 * Queda a ~50 m del recinto exacto: se usa y se informa como aproximada.
 * Centro Cultural Oriente y Centro Cultural y Teatro Baquedano NO están en OpenStreetMap
 * ni en Nominatim: se cargan sin coordenada (mejor sin dato que con un dato inventado).
 */
const COORDS_CONOCIDAS = {
  'espacio cultural la merced': { lat: -34.1685884, lng: -70.7398898, via: 'nodo radar "Museo Patrimonial de la Merced" (mismo complejo, ~50 m)' },
};

/** Título legible: la fuente grita en mayúsculas y repite el lugar y "ENTRADA LIBERADA". */
function tituloLimpio(t) {
  let s = String(t || '').replace(/\s+/g, ' ').trim();
  // corta la cola administrativa ("- INVITACIONES GRATUITAS EN BOLETERÍA", "- Entradas a
  // la venta en Ticketpro.cl", "- INSCRIPCIÓN PRESENCIAL - REALIZACIÓN: …") cuando la
  // primera parte ya es el nombre de la actividad.
  const partes = s.split(/\s+[-–—]\s+/);
  if (partes.length > 1 && partes[0].replace(/[^\p{L}]/gu, '').length >= 12) s = partes[0];
  s = s.replace(/[,;:]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  // si al cortar quedó una comilla sin cerrar, se cierra (la UI no debe mostrar comillas cojas)
  const comillas = (s.match(/["«»]/g) || []).length;
  if (comillas % 2 === 1) s += s.includes('«') ? '»' : '"';
  if (s.length > 110) {
    const corte = s.slice(0, 107);
    s = corte.slice(0, Math.max(corte.lastIndexOf(' '), 60)).trim() + '…';
  }
  return s;
}

function tipoDe(t, cats) {
  const s = norm(t) + ' ' + norm((cats || []).join(' '));
  if (/exposici|muestra|fotograf|maqueta|mural/.test(s)) return 'Exposición';
  if (/danza|ballet/.test(s)) return 'Danza';
  if (/taller|inscripcion|clase magistral|seminario|conversatorio/.test(s)) return 'Taller';
  if (/stand up|comedia/.test(s)) return 'Stand up';
  if (/opera|concierto|musical|sinfonic|coro|coros|cant|folklor|gala|piano|cueca|banda|en vivo/.test(s)) return 'Música';
  if (/teatro|obra|cartelera comunal|compa[ñn]ia de teatro/.test(s)) return 'Teatro';
  if (/casting/.test(s)) return 'Convocatoria';
  return 'Evento';
}

/** El nombre del lugar tal como lo publica la fuente, sin la dirección. */
function lugarDe(loc) {
  const limpio = String(loc || '').replace(/\s*,\s*/g, ', ').trim();
  const partes = limpio.split(',').map((x) => x.trim()).filter(Boolean);
  return { nombre: partes[0] || '', direccion: partes.slice(1).filter((p) => !/^chile$/i.test(p)).join(', ') };
}

(async () => {
  const eventos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });

  const [admins] = await c.execute("SELECT id, email FROM users WHERE role='admin' ORDER BY created_at LIMIT 1");
  if (!admins.length) { console.error('no hay usuario admin para owner_id'); process.exit(1); }
  const ownerId = admins[0].id;
  console.log('owner_id =', ownerId, '(' + admins[0].email + ')');

  // `events.time_start` nació NOT NULL y una MUESTRA de varios días no tiene hora:
  // se afloja acá también (idempotente) para poder cargar las exposiciones con date_end.
  const [nulls] = await c.execute(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'time_start'`);
  if (nulls.length && nulls[0].IS_NULLABLE === 'NO') {
    if (INSERTAR) { await c.execute('ALTER TABLE events MODIFY COLUMN time_start TIME NULL'); console.log('events.time_start ahora acepta NULL'); }
    else console.log('(falta aflojar events.time_start: se hace al correr con --insertar)');
  }
  const [fin] = await c.execute(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'date_end'`);
  if (!fin.length) {
    if (INSERTAR) { await c.execute('ALTER TABLE events ADD COLUMN date_end DATE NULL AFTER date'); console.log('columna events.date_end agregada'); }
    else console.log('(falta la columna events.date_end: la agrega el hub al pedir /radar/eventos, o esta corrida con --insertar)');
  }

  // Nodos del radar en la zona: son la fuente de coordenadas más confiable (mismo OSM).
  const [nodos] = await c.execute(
    `SELECT name, latitude, longitude FROM radar_nodes
      WHERE (6371000 * ACOS(LEAST(1, COS(RADIANS(-34.1708))*COS(RADIANS(latitude))*COS(RADIANS(longitude)-RADIANS(-70.7444))+SIN(RADIANS(-34.1708))*SIN(RADIANS(latitude))))) < 40000`);
  const cache = fs.existsSync(CACHE_LUGARES) ? JSON.parse(fs.readFileSync(CACHE_LUGARES, 'utf8')) : {};

  async function coordsDe(nombre, direccion) {
    const clave = norm(nombre + ' ' + direccion);
    if (cache[clave]) return cache[clave];
    // 0) recinto ya revisado a mano contra OpenStreetMap
    const conocida = COORDS_CONOCIDAS[norm(nombre)];
    if (conocida) { cache[clave] = conocida; return conocida; }
    // 1) nodo del radar con palabras en común
    const palabras = new Set(norm(nombre).split(' ').filter((w) => w.length > 3));
    let mejor = null;
    for (const n of nodos) {
      const np = norm(n.name).split(' ').filter((w) => w.length > 3);
      const comunes = np.filter((w) => palabras.has(w)).length;
      const score = comunes / Math.max(1, Math.min(np.length, palabras.size));
      if (comunes >= 2 && score >= 0.5 && (!mejor || score > mejor.score)) {
        mejor = { score, lat: Number(n.latitude), lng: Number(n.longitude), via: 'nodo radar: ' + n.name };
      }
    }
    if (mejor) { cache[clave] = mejor; return mejor; }
    // 2) Nominatim con la dirección textual de la fuente
    const q = [direccion, nombre, 'Rancagua', 'Chile'].filter(Boolean).join(', ');
    try {
      await dormir(1100);
      const r = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
        q, format: 'jsonv2', limit: 1, 'accept-language': 'es', countrycodes: 'cl',
      }), { headers: { 'User-Agent': UA } });
      const d = await r.json();
      if (d && d[0]) {
        const res = { lat: Number(d[0].lat), lng: Number(d[0].lon), via: 'nominatim: ' + (d[0].display_name || '').slice(0, 80) };
        cache[clave] = res; return res;
      }
    } catch (e) { /* sin coordenada: se informa */ }
    cache[clave] = { lat: null, lng: null, via: 'sin coordenada (' + q + ')' };
    return cache[clave];
  }

  const filas = [];
  const aRango = [];
  const vistos = new Set();
  for (const e of eventos) {
    if (e.fecha < DESDE) continue;
    const clave = norm(e.titulo_origen) + '|' + e.fecha + '|' + (e.hora || '');
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    // Una muestra de varios días (exposición) SÍ se carga: `date` = inicio, `date_end` = fin
    // y sin hora (la fuente sólo publica el rango). La app muestra "hasta el …".
    const esRango = !e.hora && e.fecha_fin && e.fecha_fin > e.fecha;
    if (!e.hora) aRango.push(e);
    const { nombre, direccion } = lugarDe(e.lugar);
    const coords = await coordsDe(nombre, direccion);
    const id = 'ext-' + crypto.createHash('sha1').update(e.fuente_url + '|' + e.fecha + '|' + (e.hora || '')).digest('hex').slice(0, 24);
    const titulo = tituloLimpio(e.titulo_origen);
    filas.push({
      id, owner_id: ownerId, title: titulo, obra_id: null, obra_title: null,
      type: tipoDe(e.titulo_origen, e.categorias), date: e.fecha,
      date_end: esRango ? e.fecha_fin : null,
      time_start: e.hora || null, time_end: e.hora_fin || null, venue: nombre, venue_id: null,
      cast_count: null,
      status: /entrada liberada|invitacion(es)? gratuit|gratuito|entrada gratis/i.test(e.titulo_origen) ? 'Entrada liberada' : null,
      city: 'Rancagua', lat: coords.lat, lng: coords.lng,
      image_url: e.imagen || null, ticket_url: null,
      source: 'externo', source_url: e.fuente_url, is_public: 1,
      notes: [e.descripcion || null,
        'Fuente: Rancagua Cultura · Corporación de la Cultura y las Artes de la Ilustre Municipalidad de Rancagua. Título original: ' + e.titulo_origen].filter(Boolean).join('\n\n'),
      _via: coords.via,
    });
  }

  console.log('\n== A CARGAR (' + filas.length + ') ==');
  for (const f of filas) {
    const cuando = f.date + (f.time_start ? ' ' + f.time_start : ' (todo el día)') + (f.date_end ? ' → hasta ' + f.date_end : '');
    console.log(` ${cuando} · ${f.type} · ${f.title}`);
    console.log(`    ${f.venue} · ${f.city} · ${f.lat ? f.lat.toFixed(5) + ',' + f.lng.toFixed(5) : 'SIN COORDENADA'} · ${f.lat ? f._via : f._via}`);
  }
  console.log('\n== MUESTRAS DE VARIOS DÍAS (se cargan con date_end) (' + aRango.length + ') ==');
  for (const e of aRango) console.log(` ${e.fecha} → ${e.fecha_fin} · ${tituloLimpio(e.titulo_origen)} · ${lugarDe(e.lugar).nombre}`);
  const sinCoords = filas.filter((f) => !f.lat).length;
  console.log('\nresumen: ' + filas.length + ' eventos, ' + sinCoords + ' sin coordenada, ' + aRango.length + ' de rango.');

  fs.writeFileSync(CACHE_LUGARES, JSON.stringify(cache, null, 1));

  if (!INSERTAR) { console.log('\n(informe: no se escribió nada. Para escribir: --insertar)'); await c.end(); return; }

  let nuevos = 0, actualizados = 0;
  for (const f of filas) {
    const { _via, ...datos } = f;
    // Se pregunta ANTES si existe: MySQL devuelve 1 tanto al insertar como al actualizar,
    // así que sin esto el informe diría "23 nuevos" en una corrida idempotente.
    const [ya] = await c.execute('SELECT id FROM events WHERE id = ? LIMIT 1', [f.id]);
    const cols = Object.keys(datos);
    await c.execute(
      `INSERT INTO events (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
       ON DUPLICATE KEY UPDATE ${cols.filter((k) => k !== 'id' && k !== 'owner_id').map((k) => `${k}=VALUES(${k})`).join(', ')}`,
      cols.map((k) => datos[k]));
    if (ya.length) actualizados++; else nuevos++;
  }
  console.log(`\nESCRITO: ${nuevos} nuevos, ${actualizados} actualizados.`);
  const [tot] = await c.execute("SELECT COUNT(*) n FROM events WHERE source='externo' AND date >= ?", [DESDE]);
  console.log('events externos vigentes en el CRM:', tot[0].n);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
