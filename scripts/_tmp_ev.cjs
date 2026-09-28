const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false } });
  const [t] = await c.execute("SELECT COUNT(*) n, COUNT(DISTINCT id) ids FROM events");
  console.log('events total:', JSON.stringify(t));
  const [l] = await c.execute("SELECT id, title, date, date_end, time_start FROM events ORDER BY date LIMIT 6");
  console.log(JSON.stringify(l, null, 0));
  const [r] = await c.execute("SELECT title, date, date_end FROM events WHERE date_end IS NOT NULL");
  console.log('de rango:', JSON.stringify(r));
  const [s] = await c.execute("SELECT title, source, source_url FROM events LIMIT 1");
  console.log('fuente:', JSON.stringify(s).slice(0, 300));
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
