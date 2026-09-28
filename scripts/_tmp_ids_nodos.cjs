const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const [n] = await c.execute(
    `SELECT id, name, category, city FROM radar_nodes
      WHERE (6371000 * ACOS(LEAST(1, COS(RADIANS(-34.1708))*COS(RADIANS(latitude))*COS(RADIANS(longitude)-RADIANS(-70.7444))+SIN(RADIANS(-34.1708))*SIN(RADIANS(latitude))))) < 8000
      ORDER BY city, name`);
  for (const x of n) console.log(`${x.id}\t${x.name}\t${x.category}\t${x.city}`);
  const [r] = await c.execute('SELECT COUNT(*) n FROM radar_routes');
  console.log('\nrutas hoy:', r[0].n);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
