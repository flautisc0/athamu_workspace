/**
 * Nodos culturales REALES al CRM.
 *
 * Lee /tmp/nodos_reales.json (cosecha de OpenStreetMap), completa comuna/dirección con
 * Nominatim y la foto con Wikipedia, y luego:
 *   - ENRIQUECE los nodos que ya existen (mismo nombre y a <150 m): les pone horarios,
 *     dirección, foto y web si les faltaban. No borra ni renombra nada.
 *   - AGREGA los que no existen, con is_published = 1.
 *
 * Uso:
 *   node scripts/nodos_reales.cjs            → dry-run (informe, no escribe)
 *   node scripts/nodos_reales.cjs --insertar → escribe en el CRM
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

const UA = 'ATHAMU-FASE/1.0 (radar cultural; fase.athamu@gmail.com)';
const INSERTAR = process.argv.includes('--insertar');

// Ruta del JSON cosechado: por defecto el de Santiago; se puede apuntar a otra
// cosecha con --archivo=/tmp/nodos_rancagua.json (ver scripts/recolectar_nodos.py).
const ARG_ARCHIVO = (process.argv.find((a) => a.startsWith('--archivo=')) || '').split('=')[1];
const ARCHIVO = ARG_ARCHIVO || '/tmp/nodos_reales.json';

/** La región no se inventa: sale de la comuna real del nodo. */
function regionDe(comuna) {
  const c = normalizar(comuna);
  const ohiggins = ['rancagua', 'machali', 'graneros', 'rengo', 'san fernando', 'santa cruz',
    'mostazal', 'codegua', 'coinco', 'coltauco', 'donihue', 'litueche', 'lolol', 'marchigue',
    'malloa', 'nancagua', 'palmilla', 'paredones', 'peralillo', 'peumo', 'pichidegua',
    'pichilemu', 'placilla', 'pumanque', 'quinta de tilcoco', 'requinoa', 'san vicente'];
  if (ohiggins.some((x) => c.includes(x))) return "Región del Libertador Gral. Bernardo O'Higgins";
  return 'Región Metropolitana';
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function distanciaM(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function slug(txt) {
  return normalizar(txt).replace(/ /g, '-').slice(0, 40);
}

async function comunaDe(lat, lng) {
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({
      lat, lon: lng, format: 'jsonv2', addressdetails: 1, zoom: 18, 'accept-language': 'es',
    }), { headers: { 'User-Agent': UA } });
    const d = await r.json();
    const a = d.address || {};
    return {
      comuna: a.city || a.town || a.municipality || a.county || '',
      direccion: [a.road, a.house_number].filter(Boolean).join(' '),
    };
  } catch (e) {
    return { comuna: '', direccion: '', error: e.message };
  }
}

async function fotoDe(wikidata, wikipedia) {
  if (!wikidata && !wikipedia) return '';
  try {
    const [idioma, titulo] = wikipedia && wikipedia.includes(':')
      ? wikipedia.split(':') : ['es', wikipedia || wikidata];
    const r = await fetch(`https://${idioma}.wikipedia.org/w/api.php?` + new URLSearchParams({
      action: 'query', prop: 'pageimages', piprop: 'original', titles: titulo, format: 'json', redirects: '1',
    }), { headers: { 'User-Agent': UA } });
    const d = await r.json();
    for (const p of Object.values((d.query || {}).pages || {})) {
      if (p.original && p.original.source) return p.original.source;
    }
  } catch (e) { /* sin foto */ }
  return '';
}

(async () => {
  const crudos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  console.log(`cosecha: ${ARCHIVO}`);

  /* Ruido a descartar: sedes vecinales, clubes de adulto mayor, canchas y sedes
     sociales que OSM etiqueta como "community_centre" pero no son espacios
     culturales; y bibliotecas de liceos/colegios, que no son visitables por
     cualquiera. El radar es cultural: si entra basura, el mapa miente. */
  const NO_CULTURAL = /junta de vecinos|junta vecinal|adulto mayor|sede vecinal|sede social|club deportivo|club de adulto|cancha|multicancha|parroquia|iglesia|capilla|comedor|sede comunitaria|centro de madres|comite de|comité de|agrupacion de|agrupación de|biblioteca.+?(liceo|colegio|escuela|instituto)|fundo /i;
  const nodos = crudos.filter((n) => {
    if (NO_CULTURAL.test(n.nombre)) return false;
    if (/^(sin nombre|por definir|no name)$/i.test(n.nombre.trim())) return false;
    return true;
  });
  console.log(`cosechados: ${crudos.length} → tras descartar sedes vecinales/clubes/bibliotecas de liceo: ${nodos.length}`);

  /* El mismo lugar suele estar en OSM dos veces (nodo + polígono) y con nombres que
     se contienen ("Museo Comunal Rumel" / "Museo Comunal de Machalí Rumel"). Acá se
     compara DENTRO de la cosecha: si no, entran dos fichas del mismo lugar y el
     mapa muestra duplicados. */
  const VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en']);
  const palabras = (s) => new Set(
    normalizar(s).split(' ').filter((x) => x.length > 2 && !VACIAS.has(x)));
  const solapan = (a, b) => {
    const ta = palabras(a), tb = palabras(b);
    const chico = ta.size <= tb.size ? ta : tb;
    const grande = chico === ta ? tb : ta;
    if (!chico.size) return false;
    let comunes = 0;
    chico.forEach((t) => { if (grande.has(t)) comunes += 1; });
    return comunes / chico.size >= 0.6;               // "museo comunal rumel" ⊂ "museo comunal de machali rumel"
  };

  const unicos = [];
  for (const n of nodos) {
    const nn = normalizar(n.nombre);
    const repetido = unicos.find((u) => {
      const un = normalizar(u.nombre);
      const d = distanciaM(u.lat, u.lng, n.lat, n.lng);
      if (un === nn) return d < 300;                       // mismo nombre y muy cerca
      const seContienen = un.length > 8 && nn.length > 8 && (un.includes(nn) || nn.includes(un));
      if (seContienen && d < 600) return true;
      // Mismo tipo de lugar con casi las mismas palabras, a pocos metros.
      return u.categoria === n.categoria && d < 500 && solapan(u.nombre, n.nombre);
    });
    if (repetido) {
      // Se conserva el que tenga más datos (horario, web, foto potencial).
      const puntos = (x) => (x.horarios ? 1 : 0) + (x.web ? 1 : 0) + (x.descripcion_osm ? 1 : 0) + (x.calle ? 1 : 0);
      if (puntos(n) > puntos(repetido)) Object.assign(repetido, n);
      continue;
    }
    unicos.push(n);
  }
  console.log(`mismo lugar repetido en OSM: ${nodos.length - unicos.length} → quedan ${unicos.length}`);
  nodos.length = 0;
  nodos.push(...unicos);

  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const [existentes] = await c.execute(
    'SELECT id, name, latitude, longitude, hours, address, city, cover_url, category FROM radar_nodes');

  // ---- 1) completar comuna/dirección (sólo a los que les falta) ----
  let pedidos = 0;
  for (const n of nodos) {
    if (n.calle && n.comuna_osm) { n.comuna = n.comuna_osm; n.direccion = n.calle; continue; }
    const d = await comunaDe(n.lat, n.lng);
    n.comuna = n.comuna_osm || d.comuna || '';
    n.direccion = n.calle || d.direccion || '';
    pedidos += 1;
    await dormir(1100);                    // política de Nominatim: 1 req/s
  }
  console.log('consultas de comuna/dirección:', pedidos);

  // ---- 2) ¿ya existe? (mismo nombre normalizado y cerca) ----
  const nuevos = [], enriquecer = [];
  for (const n of nodos) {
    const nn = normalizar(n.nombre);
    const gemelo = existentes.find((e) => {
      const en = normalizar(e.name);
      const mismo = en === nn || (en.length > 6 && nn.length > 6 && (en.includes(nn) || nn.includes(en)));
      return mismo && distanciaM(Number(e.latitude), Number(e.longitude), n.lat, n.lng) < 250;
    });
    if (gemelo) enriquecer.push({ nodo: n, existente: gemelo });
    else nuevos.push(n);
  }
  console.log(`ya existen (se enriquecen): ${enriquecer.length} | nuevos a agregar: ${nuevos.length}`);

  // ---- 3) fotos de los nuevos con artículo ----
  let fotos = 0;
  for (const n of nuevos) {
    if ((n.wikidata || n.wikipedia) && !n.foto) {
      n.foto = await fotoDe(n.wikidata, n.wikipedia);
      if (n.foto) fotos += 1;
      await dormir(250);
    }
  }
  console.log('fotos reales obtenidas:', fotos);

  const desc = (n) => {
    const base = n.descripcion_osm || `${n.categoria} en ${n.comuna || 'la ciudad'}`;
    return { corta: base.slice(0, 295), larga: `${base}.` + (n.direccion ? ` Dirección: ${n.direccion}, ${n.comuna}.` : '') + (n.web ? ` Web: ${n.web}` : '') + ' Ficha generada desde OpenStreetMap (datos abiertos).' };
  };

  console.log('\n--- muestra de los que se agregarían ---');
  for (const n of nuevos.slice(0, 20)) {
    console.log(`  · ${n.nombre.slice(0, 42).padEnd(44)} ${n.categoria.padEnd(18)} ${(n.comuna || '?').padEnd(14)} ` +
      `${n.horarios ? '⏰' : '  '} ${n.foto ? '📷' : '  '} ${n.direccion || ''}`);
  }
  const porCat = {};
  nuevos.forEach((n) => { porCat[n.categoria] = (porCat[n.categoria] || 0) + 1; });
  const porCom = {};
  nuevos.forEach((n) => { porCom[n.comuna || '?'] = (porCom[n.comuna || '?'] || 0) + 1; });
  console.log('\npor categoría:', JSON.stringify(porCat));
  console.log('por comuna  :', JSON.stringify(porCom));

  if (!INSERTAR) {
    console.log('\n(dry-run: no se escribió nada. Para escribir: --insertar)');
    await c.end();
    return;
  }

  // ---- 4) escribir ----
  let agregados = 0, mejorados = 0;
  for (const { nodo: n, existente: e } of enriquecer) {
    const sets = [], vals = [];
    if (!e.hours && n.horarios) { sets.push('hours = ?'); vals.push(n.horarios); }
    if (!e.address && n.direccion) { sets.push('address = ?'); vals.push(n.direccion); }
    if (!e.city && n.comuna) { sets.push('city = ?'); vals.push(n.comuna); }
    if (!e.cover_url && n.foto) { sets.push('cover_url = ?'); vals.push(n.foto); }
    if (sets.length) {
      sets.push('updated_at = NOW()');
      const [r] = await c.execute(`UPDATE radar_nodes SET ${sets.join(', ')} WHERE id = ?`, [...vals, e.id]);
      if (r.affectedRows) mejorados += 1;
    }
  }
  for (const n of nuevos) {
    const d = desc(n);
    const id = 'nd_osm_' + n.osm_id;
    const [r] = await c.execute(
      `INSERT INTO radar_nodes (id, name, short_description, full_description, category, latitude, longitude,
         address, city, region, cover_url, unlock_radius_m, is_published, created_by, created_at, updated_at, hours)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,'osm',NOW(),NOW(),?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category),
         latitude = VALUES(latitude), longitude = VALUES(longitude), hours = VALUES(hours),
         address = VALUES(address), city = VALUES(city), cover_url = VALUES(cover_url), updated_at = NOW()`,
      [id, n.nombre, d.corta, d.larga, n.categoria, n.lat, n.lng, n.direccion || null, n.comuna || null,
       regionDe(n.comuna), n.foto || null, 120, n.horarios || null]);
    if (r.affectedRows) agregados += 1;
  }
  console.log(`\nESCRITO · nodos nuevos: ${agregados} | nodos existentes mejorados: ${mejorados}`);
  const [tot] = await c.execute('SELECT COUNT(*) n FROM radar_nodes');
  const [cat] = await c.execute('SELECT category, COUNT(*) n FROM radar_nodes GROUP BY category ORDER BY n DESC');
  console.log('total en el CRM:', tot[0].n);
  console.log('por categoría  :', JSON.stringify(cat));
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
