const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const q = async (t, sql, a = []) => {
    try { const [r] = await c.execute(sql, a); console.log('== ' + t + ' ==\n' + JSON.stringify(r, null, 0).slice(0, 2200)); }
    catch (e) { console.log('== ' + t + ' == ERR ' + e.message); }
  };
  await q('companias: columnas', "SELECT column_name FROM information_schema.columns WHERE table_name='companies' ORDER BY ordinal_position");
  await q('7 companias sin nadie (detalle)', `SELECT c.id, c.name, c.kind, c.created_at,
      (SELECT COUNT(*) FROM projects p WHERE p.company_id=c.id) obras,
      (SELECT COUNT(*) FROM leads l WHERE l.company_id=c.id) leads
     FROM companies c LEFT JOIN company_members m ON m.company_id=c.id
     GROUP BY c.id HAVING COUNT(m.id)=0`);
  await q('comp_9b626a8428c2', "SELECT id, name, kind, created_at FROM companies WHERE id='comp_9b626a8428c2'");
  await q('  · su nomina', "SELECT full_name, role_title, kind, email FROM company_people WHERE company_id='comp_9b626a8428c2' ORDER BY full_name");
  await q('  · sus miembros', "SELECT u.email, u.display_name, m.role_in_company, m.status FROM company_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.company_id='comp_9b626a8428c2'");
  await q('Pipe: las dos cuentas', "SELECT u.id, u.email, u.display_name, u.role, u.created_at, (SELECT COUNT(*) FROM radar_discoveries d WHERE d.user_id=u.id) descubrimientos, (SELECT COUNT(*) FROM radar_profiles r WHERE r.user_id=u.id) perfil, (SELECT COUNT(*) FROM company_members m WHERE m.user_id=u.id) membresias FROM users u WHERE u.email LIKE '%naranjo%'");
  await q('Pipe: fichas de nomina', "SELECT company_id, full_name, role_title, email FROM company_people WHERE email LIKE '%naranjo%' OR full_name LIKE '%Naranjo%'");
  await q('inscritos al piloto (todos)', "SELECT nombre, email, company_name, rol, estado FROM piloto_inscripciones");
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
