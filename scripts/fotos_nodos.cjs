/**
 * FOTOS REALES para los nodos del radar que no tienen.
 *
 * Por qué existe: la carga original (`nodos_reales.cjs`) buscaba la foto sólo si OpenStreetMap
 * traía los tags `wikipedia`/`wikidata`. Los lugares de Rancagua (y varios de Santiago) no los
 * traen, así que quedaron sin foto: 60 de 263 nodos tenían imagen y la ficha se veía vacía.
 *
 * De dónde salen las fotos (nunca se inventa ni se inventa coincidencia):
 *   1. `es.wikipedia.org` — el artículo del lugar, con su imagen principal (`pageimages`).
 *   2. `commons.wikimedia.org` — una foto libre del lugar, siempre que el nombre del archivo
 *      coincida con el del lugar.
 * En los dos casos hay que pasar una **verificación**: el título tiene que compartir las palabras
 * importantes con el nombre del nodo (o el artículo estar a menos de ~400 m del nodo). Si no pasa,
 * el nodo queda **sin foto** y se informa: mejor sin foto que con la foto de otro lugar.
 *
 * Uso:
 *   node scripts/fotos_nodos.cjs                      → informe de todos los nodos sin foto
 *   node scripts/fotos_nodos.cjs --limite=20          → sólo los primeros 20 (muestra)
 *   node scripts/fotos_nodos.cjs --ciudad=Rancagua    → sólo una comuna
 *   node scripts/fotos_nodos.cjs --aplicar            → escribe `cover_url` (con backup)
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

const UA = 'ATHAMU-FASE/1.0 (radar cultural; fase.athamu@gmail.com)';
const APLICAR = process.argv.includes('--aplicar');
const BACKUP = '/home/flautisc0/athamu_workspace/backups';
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const LIMITE = Number(arg('limite') || 0);
const CIUDAD = arg('ciudad') || '';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/** Palabras que no identifican nada: se descartan para comparar nombres. */
const VACIAS = new Set(['teatro', 'museo', 'casa', 'biblioteca', 'centro', 'cultural', 'municipal',
  'regional', 'nacional', 'de', 'del', 'la', 'las', 'el', 'los', 'y', 'para', 'espacio', 'sala',
  'publica', 'comunal', 'arte', 'artes', 'galeria', 'cine', 'plaza', 'avenida', 'av', 'calle',
  'chile', 'jpg', 'jpeg', 'png', 'archivo', 'file', 'foto', 'imagen', 'panoramica']);
const claves = (t) => norm(t).split(' ').filter((w) => w.length > 3 && !VACIAS.has(w));
const distancia = (a, b, c, d) => {
  const R = 6371000, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(c - a), dLng = rad(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/** Puntaje 0..1: cuánto de lo que identifica al nodo aparece en el título (cobertura del nodo). */
function parecido(nombre, titulo) {
  const a = claves(nombre), b = claves(titulo);
  if (!a.length || !b.length) return 0;
  const comunes = a.filter((w) => b.includes(w)).length;
  // Se mide sobre las palabras DEL NODO (no del título): si el título tiene menos palabras,
  // el cociente no puede dar 1 por ese solo hecho. Así "Centro Español de Rancagua" ya no
  // queda "igual" al artículo "Rancagua" (cubre 1 de 2 palabras suyas).
  return comunes / a.length;
}

/**
 * ¿Esta foto ES de este lugar? Reglas (todas deben pasar):
 *  1. el título cubre ≥75% de las palabras que identifican al nodo;
 *  2. la ubicación cuadra: o el artículo tiene coordenadas a ≤500 m del nodo, o el título nombra
 *     la comuna;
 *  3. si el nodo tiene UNA sola palabra identificatoria (ej. "Cinemark"), se exige además la
 *     comuna en el título;
 *  4. el nodo no puede llamarse SÓLO con la comuna ("Biblioteca Municipal de Quilicura" → sus
 *     palabras identificatorias se reducen a "quilicura"), porque entonces cualquier artículo de
 *     la comuna pasaría;
 *  5. el título no puede traer una palabra que cambie el sujeto y que el nodo no tenga
 *     ("Universidad Finis Terrae" contra el nodo "Teatro Finis Terrae", "Municipalidad de…",
 *     "Iglesia…", "Colegio…").
 * Falsos positivos reales que estas reglas cayeron: artículo del CANTANTE Lucho Gatica, artículo
 * de la ciudad de Rancagua, la comuna de Quilicura (×2) y la Universidad Finis Terrae.
 */
const CONTENEDORAS = new Set(['universidad', 'municipalidad', 'comuna', 'municipio', 'provincia',
  'region', 'iglesia', 'catedral', 'parroquia', 'colegio', 'escuela', 'liceo', 'instituto',
  'hospital', 'club', 'hotel', 'restaurante', 'empresa', 'fundacion', 'corporacion', 'partido',
  'ciudad', 'barrio', 'poblacion', 'villa', 'cancha', 'estadio', 'plaza', 'parque', 'iglesias']);

function verificado(nodo, titulo, coords) {
  const palabras = claves(nodo.name);
  const tituloPalabras = claves(titulo);
  const ciudad = nodo.city ? claves(nodo.city)[0] : '';
  const ciudadEnTitulo = !!ciudad && tituloPalabras.includes(ciudad);
  const soloComuna = palabras.length > 0 && palabras.every((w) => w === ciudad);
  const extraRaro = tituloPalabras.some((w) => CONTENEDORAS.has(w) && !palabras.includes(w));
  const cobertura = parecido(nodo.name, titulo);
  let metros = null;
  if (coords && coords.lat != null && nodo.latitude != null) {
    metros = Math.round(distancia(Number(nodo.latitude), Number(nodo.longitude), Number(coords.lat), Number(coords.lon)));
  }
  const ubicacion = (metros !== null && metros <= 500) ||
    (metros === null && ciudadEnTitulo);   // si el artículo trae coordenadas, mandan ellas
  const lejos = metros !== null && metros > 500;
  const unaSolaPalabra = palabras.length < 2;
  const ok = cobertura >= 0.75 && ubicacion && !soloComuna && !extraRaro && !lejos
    && (!unaSolaPalabra || ciudadEnTitulo);
  return { ok, puntaje: cobertura, metros, motivo: ok ? '' :
    (soloComuna ? 'el nodo se llama sólo con la comuna' : extraRaro ? 'el título trae otra cosa' :
      lejos ? `el artículo está a ${metros} m` : !ubicacion ? 'no cuadra la ubicación' : 'nombre poco parecido') };
}

/** 1) Artículo de Wikipedia (su imagen principal). */
async function deWikipedia(nodo) {
  const q = [nodo.name, nodo.city].filter(Boolean).join(' ');
  const d = await json('https://es.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: q, gsrlimit: 3, redirects: 1,
    prop: 'pageimages|coordinates', piprop: 'original', coprop: 'type',
  }));
  const paginas = Object.values((d.query && d.query.pages) || {});
  for (const p of paginas) {
    const imagen = p.original && p.original.source;
    if (!imagen) continue;
    const coords = p.coordinates && p.coordinates[0]
      ? { lat: Number(p.coordinates[0].lat), lon: Number(p.coordinates[0].lon) } : null;
    const v = verificado(nodo, p.title, coords);
    if (v.ok) return { url: imagen, fuente: 'wikipedia', pagina: p.title, puntaje: v.puntaje, metros: v.metros };
  }
  return null;
}

/** 2) Foto libre de Wikimedia Commons (nombre de archivo parecido). */
async function deCommons(nodo) {
  const q = [nodo.name, nodo.city].filter(Boolean).join(' ');
  const d = await json('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: q, gsrnamespace: '6',
    gsrlimit: 8, prop: 'imageinfo', iiprop: 'url|mime', iiurlwidth: '1280',
  }));
  const archivos = Object.values((d.query && d.query.pages) || {});
  let mejor = null;
  for (const a of archivos) {
    const info = a.imageinfo && a.imageinfo[0];
    if (!info || !info.thumburl) continue;
    const titulo = a.title || '';
    // Se descartan mapas, escudos, logos y OBRAS DE ARTE (un cuadro o una escultura no es el lugar;
    // pasó con "Museo Taller", que matcheó la foto de un cuadro por la palabra "taller").
    if (/mapa|plano|escudo|logo|bandera|svg|diagrama|grafico|retrato|firma|cuadro|pintura|[oó]leo|batalla|escultura|grabado|mural|dibujo|cartel|afiche|lienzo/i.test(titulo)) continue;
    if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
    const v = verificado(nodo, titulo.replace(/^File:/i, ''), null);
    if (v.ok && (!mejor || v.puntaje > mejor.puntaje)) {
      mejor = { url: info.thumburl, fuente: 'commons', pagina: titulo, puntaje: v.puntaje, metros: null };
    }
  }
  return mejor;
}

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  let sql = `SELECT id, name, category, city, latitude, longitude, cover_url FROM radar_nodes
              WHERE is_published = 1 AND (cover_url IS NULL OR cover_url = '')`;
  const args = [];
  if (CIUDAD) { sql += ' AND city = ?'; args.push(CIUDAD); }
  sql += ' ORDER BY city, name';
  if (LIMITE) sql += ` LIMIT ${LIMITE}`;
  const [nodos] = await c.execute(sql, args);
  console.log(`nodos sin foto: ${nodos.length}${CIUDAD ? ' en ' + CIUDAD : ''}\n`);

  const hallazgos = [];
  const usadas = new Set();
  for (const n of nodos) {
    let foto = null;
    try {
      foto = await deWikipedia(n);
      if (!foto) foto = await deCommons(n);
    } catch (e) { foto = null; }
    // La misma imagen no se pone en dos nodos: si dos fichas matchean el mismo archivo, es señal
    // de que el nombre se repite (o de un duplicado de nodo), no de que la foto sirva para ambas.
    if (foto && usadas.has(foto.url)) {
      console.log(`↔  ${n.name.slice(0, 46).padEnd(48)} ${(n.city || '').padEnd(12)} misma imagen que otro nodo → se descarta`);
      foto = null;
    }
    if (foto) { usadas.add(foto.url); hallazgos.push({ ...n, ...foto }); }
    console.log(`${foto ? '📷' : '· '} ${n.name.slice(0, 46).padEnd(48)} ${(n.city || '').padEnd(12)} ` +
      (foto ? `${foto.fuente} (${foto.puntaje.toFixed(2)}${foto.metros !== null ? ', ' + foto.metros + ' m' : ''}) → ${foto.pagina.slice(0, 44)}` : 'sin coincidencia verificable'));
    await dormir(350);
  }

  console.log(`\ncon foto encontrada: ${hallazgos.length} de ${nodos.length}`);
  const porFuente = {};
  for (const h of hallazgos) porFuente[h.fuente] = (porFuente[h.fuente] || 0) + 1;
  console.log('por fuente:', JSON.stringify(porFuente));

  if (!APLICAR) {
    console.log('\n(informe: no se escribió nada. Para guardar las fotos: --aplicar)');
    await c.end();
    return;
  }
  fs.mkdirSync(BACKUP, { recursive: true });
  const sello = new Date().toISOString().replace(/[:.]/g, '-');
  const ruta = `${BACKUP}/fotos_nodos_${sello}.json`;
  fs.writeFileSync(ruta, JSON.stringify({ antes: nodos, aplicadas: hallazgos }, null, 1));
  console.log('\nbackup:', ruta);
  let escritas = 0;
  for (const h of hallazgos) {
    await c.execute('UPDATE radar_nodes SET cover_url = ?, updated_at = NOW() WHERE id = ? AND (cover_url IS NULL OR cover_url = \'\')',
      [h.url, h.id]);
    escritas += 1;
  }
  const [t] = await c.execute("SELECT COUNT(*) total, SUM(cover_url IS NOT NULL AND cover_url <> '') con_foto FROM radar_nodes WHERE is_published=1");
  console.log(`fotos guardadas: ${escritas} · ahora el radar tiene ${t[0].con_foto}/${t[0].total} con foto`);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
