/**
 * Poda de nodos ruidosos traídos de OSM (sedes vecinales, oficinas municipales,
 * clubes, capillas…): no son espacios culturales y ensucian el radar.
 *
 * Uso:  node scripts/podar_nodos.cjs            → informe (no borra)
 *       node scripts/podar_nodos.cjs --borrar   → borra
 */
const mysql = require('mysql2/promise');

const RUIDO = "^(sede|sedes|oficina municipal|oficina de|junta|club|comite|comité|agrupacion|agrupación|capilla|parroquia|iglesia|cancha|multicancha|posta|consultorio|cesfam|colegio|escuela|liceo|jardin|jardín|sala cuna|polideportivo|gimnasio municipal)";

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const [ruidosos] = await c.execute(
    `SELECT id, name, category, city FROM radar_nodes
      WHERE created_by = 'osm' AND LOWER(TRIM(name)) REGEXP ?
      ORDER BY city, name`, [RUIDO]);
  console.log('candidatos a poda:', ruidosos.length);
  for (const r of ruidosos) console.log(`  - ${r.name} (${r.category}, ${r.city || '?'})`);

  const [resto] = await c.execute(
    `SELECT category, COUNT(*) n FROM radar_nodes
      WHERE created_by = 'osm' AND LOWER(TRIM(name)) NOT REGEXP ? GROUP BY category ORDER BY n DESC`, [RUIDO]);
  console.log('\nquedarían por categoría:', JSON.stringify(resto));

  if (process.argv.includes('--borrar')) {
    const [r] = await c.execute(
      `DELETE FROM radar_nodes WHERE created_by = 'osm' AND LOWER(TRIM(name)) REGEXP ?`, [RUIDO]);
    console.log('\nBORRADOS:', r.affectedRows);
    const [t] = await c.execute('SELECT COUNT(*) n FROM radar_nodes');
    console.log('total en el CRM:', t[0].n);
  } else {
    console.log('\n(informe: no se borró nada. Para borrar: --borrar)');
  }
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
