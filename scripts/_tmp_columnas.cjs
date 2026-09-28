const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql, args = []) => {
    try { const [r] = await c.execute(sql, args); console.log('== ' + t + ' =='); console.log(JSON.stringify(r, null, 1).slice(0, 2200)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  for (const tabla of ['users', 'company_people', 'company_members', 'email_log', 'piloto_inscripciones']) {
    await q('columnas ' + tabla, "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION", [tabla]);
  }
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
