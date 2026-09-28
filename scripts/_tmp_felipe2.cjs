const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql, args = []) => {
    try { const [r] = await c.execute(sql, args); console.log('== ' + t + ' =='); console.log(JSON.stringify(r, null, 1).slice(0, 2000)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  await q('users FELIPE', "SELECT id, email, display_name, role, role_title, phone, provider FROM users WHERE display_name LIKE '%Felipe%' OR display_name LIKE '%Naranjo%' OR email LIKE '%naranjo%'");
  await q('company_people FELIPE', "SELECT id, company_id, full_name, role_title, kind, email, phone FROM company_people WHERE full_name LIKE '%Felipe%' OR full_name LIKE '%Naranjo%'");
  await q('company_members de su cuenta', "SELECT m.company_id, m.role_in_company, m.joined_at, c.name AS company FROM company_members m LEFT JOIN companies c ON c.id=m.company_id WHERE m.user_id IN (SELECT id FROM users WHERE display_name LIKE '%Felipe%' OR email LIKE '%naranjo%')");
  await q('piloto inscripciones', "SELECT nombre, email, company_name, rol, dispositivo, estado, created_at FROM piloto_inscripciones ORDER BY created_at DESC");
  await q('email_log', "SELECT para, asunto, plantilla, ok, error, created_at FROM email_log ORDER BY created_at DESC LIMIT 8");
  await q('resumen nodos', "SELECT COUNT(*) total, is_published, COUNT(DISTINCT city) comunas FROM radar_nodes GROUP BY is_published");
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
