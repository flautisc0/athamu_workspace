const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql, args = []) => {
    try { const [r] = await c.execute(sql, args); console.log('== ' + t + ' =='); console.log(JSON.stringify(r, null, 1).slice(0, 2500)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  // 1. Felipe Naranjo: cuenta, ficha de nómina, pertenencias
  await q('users (Felipe)', "SELECT id, email, display_name, role, city, phone FROM users WHERE display_name LIKE '%Felipe%' OR display_name LIKE '%Naranjo%'");
  await q('company_people (Felipe)', "SELECT id, company_id, full_name, role_title, kind, email, phone, city FROM company_people WHERE full_name LIKE '%Felipe%' OR full_name LIKE '%Naranjo%'");
  await q('company_members (Felipe)', "SELECT m.id, m.company_id, m.user_id, m.role_in_company, m.status, c.name AS company FROM company_members m LEFT JOIN companies c ON c.id=m.company_id WHERE m.user_id IN (SELECT id FROM users WHERE display_name LIKE '%Felipe%') OR m.user_id LIKE '%naranjo%'");
  // 2. ¿qué hay hoy cerca de Rancagua en el radar?
  await q('nodos cerca de Rancagua (40 km)', "SELECT id, name, category, city, latitude, longitude, is_published FROM radar_nodes WHERE (6371000 * ACOS(LEAST(1, COS(RADIANS(-34.1708))*COS(RADIANS(latitude))*COS(RADIANS(longitude)-RADIANS(-70.7444))+SIN(RADIANS(-34.1708))*SIN(RADIANS(latitude))))) < 40000");
  await q('total nodos', "SELECT COUNT(*) total, COUNT(DISTINCT city) comunas FROM radar_nodes");
  await q('email_log últimos', "SELECT id, destino, asunto, plantilla, ok, fecha FROM email_log ORDER BY fecha DESC LIMIT 6");
  // 3. inscritos al piloto (¿Felipe ya está?)
  await q('tabla piloto', "SHOW TABLES LIKE '%piloto%'");
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
