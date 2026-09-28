const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false } });
  const [cols] = await c.execute("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name LIKE 'planner%' AND (column_name LIKE '%artist%' OR column_name LIKE '%ids%' OR data_type IN ('text','json','longtext'))");
  console.log('columnas candidatas:', JSON.stringify(cols));
  const [ref] = await c.execute("SELECT COUNT(*) n FROM planner_scheduled_rehearsals WHERE CAST(artist_ids AS CHAR) LIKE '%art_1790530884522%'").catch(() => [[{n: 0}]]);
  console.log('referencias del duplicado en ensayos:', JSON.stringify(ref));
  const APLICAR = process.argv.includes('--aplicar');
  if (APLICAR) {
    const [d] = await c.execute("DELETE FROM planner_artists WHERE id = 'art_1790530884522'");
    console.log('duplicado borrado:', d.affectedRows);
    const [r] = await c.execute("SELECT id, name FROM planner_artists WHERE name LIKE '%gabriel rios%'");
    console.log('quedan:', JSON.stringify(r));
  } else console.log('(informe: para borrar el duplicado, --aplicar)');
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
