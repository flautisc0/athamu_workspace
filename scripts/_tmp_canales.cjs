const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql) => {
    try { const [r] = await c.execute(sql); console.log('== ' + t + ' =='); console.log(JSON.stringify(r, null, 1).slice(0, 1800)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  // Cobertura real de teléfonos
  await q('users con teléfono', "SELECT COUNT(*) total, SUM(phone IS NOT NULL AND phone <> '') con_fono FROM users");
  await q('users: quiénes tienen teléfono', "SELECT display_name, email, phone, role FROM users WHERE phone IS NOT NULL AND phone <> ''");
  await q('company_people con teléfono', "SELECT COUNT(*) total, SUM(phone IS NOT NULL AND phone <> '') con_fono FROM company_people");
  await q('piloto_inscripciones (teléfono)', "SELECT nombre, email, telefono, rol, estado FROM piloto_inscripciones");
  await q('columnas de contacto en companies', "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='companies' AND (COLUMN_NAME LIKE '%phone%' OR COLUMN_NAME LIKE '%contact%' OR COLUMN_NAME LIKE '%mail%')");
  await q('¿hay tabla de notificaciones/suscripciones?', "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME LIKE '%notif%' OR TABLE_NAME LIKE '%suscri%' OR TABLE_NAME LIKE '%whats%' OR TABLE_NAME LIKE '%telegram%')");
  // ¿hay algo de canal en los usuarios (telegram/whatsapp id)?
  await q('columnas users con canal', "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND (COLUMN_NAME LIKE '%telegram%' OR COLUMN_NAME LIKE '%whats%' OR COLUMN_NAME LIKE '%chat%')");
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
