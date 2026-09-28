const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql, a = []) => {
    try { const [r] = await c.execute(sql, a); console.log('== ' + t + ' ==\n' + JSON.stringify(r).slice(0, 2000)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  await q('companias sin nadie (detalle)', `SELECT c.id, c.name, c.kind, c.created_by, c.created_at,
      (SELECT COUNT(*) FROM projects p WHERE p.company_id=c.id) obras
     FROM companies c LEFT JOIN company_members m ON m.company_id=c.id
     GROUP BY c.id, c.name, c.kind, c.created_by, c.created_at HAVING COUNT(m.id)=0`);
  await q('miembros de Compañía Teatral ATHA', `SELECT m.id, m.user_id, u.email, u.display_name, u.role, m.role_in_company,
      (SELECT COUNT(*) FROM radar_discoveries d WHERE d.user_id=u.id) desc,
      (SELECT COUNT(*) FROM radar_posts p WHERE p.user_id=u.id) posts,
      (SELECT COUNT(*) FROM radar_profiles r WHERE r.user_id=u.id) perfil
     FROM company_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.company_id='comp_9b626a8428c2'`);
  await q('cuentas de los socios reales (placeholders)', "SELECT id, email, display_name, role, created_at FROM users WHERE email LIKE '%athaproducciones.cl'");
  await q('descubrimientos: de quién son', "SELECT u.email, COUNT(*) n FROM radar_discoveries d LEFT JOIN users u ON u.id=d.user_id GROUP BY u.email");
  await q('columnas company_members', "SELECT column_name FROM information_schema.columns WHERE table_name='company_members' ORDER BY ordinal_position");
  await q('columnas company_people', "SELECT column_name FROM information_schema.columns WHERE table_name='company_people' ORDER BY ordinal_position");
  await q('planner: gabriel rios duplicado', "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'planner%'");
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
