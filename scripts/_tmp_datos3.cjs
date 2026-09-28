const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql) => {
    try { const [r] = await c.execute(sql); console.log('== ' + t + ' ==\n' + JSON.stringify(r).slice(0, 1500)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  await q('role_in_company usados', "SELECT role_in_company, COUNT(*) n FROM company_members GROUP BY role_in_company ORDER BY n DESC");
  await q('miembros de Compañía Teatral ATHA', "SELECT m.id, m.user_id, u.email, u.display_name, m.role_in_company FROM company_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.company_id='comp_9b626a8428c2'");
  await q('perfiles de radar de Pipe', "SELECT user_id, explorer_number, xp, level FROM radar_profiles WHERE user_id IN ('usr_1df3a028','usr_bc09fbb7')");
  await q('preferencias de Pipe', "SELECT user_id, * FROM user_preferences WHERE user_id IN ('usr_1df3a028','usr_bc09fbb7')");
  await q('qué más apunta a esas cuentas', `SELECT 'posts' t, COUNT(*) n FROM radar_posts WHERE user_id IN ('usr_1df3a028','usr_bc09fbb7','usr_125b46d6','usr_a93c09eb','usr_fc70f79b')
     UNION ALL SELECT 'descubrimientos', COUNT(*) FROM radar_discoveries WHERE user_id IN ('usr_1df3a028','usr_bc09fbb7','usr_125b46d6','usr_a93c09eb','usr_fc70f79b')
     UNION ALL SELECT 'perfiles', COUNT(*) FROM radar_profiles WHERE user_id IN ('usr_125b46d6','usr_a93c09eb','usr_fc70f79b')
     UNION ALL SELECT 'preferencias', COUNT(*) FROM user_preferences WHERE user_id IN ('usr_1df3a028','usr_bc09fbb7','usr_125b46d6','usr_a93c09eb','usr_fc70f79b')`);
  await q('inscripciones piloto: columnas', "SELECT column_name FROM information_schema.columns WHERE table_name='piloto_inscripciones' ORDER BY ordinal_position");
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
