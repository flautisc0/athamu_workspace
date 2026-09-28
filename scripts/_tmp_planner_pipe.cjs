const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const APLICAR = process.argv.includes('--aplicar');
  // El Planner quedó apuntando al correo viejo de Pipe (con punto) tras consolidar su cuenta.
  const [arts] = await c.execute("SELECT id, name, email FROM planner_artists WHERE email LIKE '%naranjo%' OR name LIKE '%Naranjo%'");
  const [dirs] = await c.execute("SELECT id, name, email, authorized FROM planner_director_users WHERE email LIKE '%naranjo%' OR name LIKE '%Naranjo%'");
  console.log('planner_artists:', JSON.stringify(arts));
  console.log('planner_director_users:', JSON.stringify(dirs));
  const [gab] = await c.execute("SELECT * FROM planner_artists WHERE name LIKE '%gabriel rios%'");
  console.log('gabriel rios (planner_artists):', JSON.stringify(gab));
  for (const t of ['planner_artist_time_slots', 'planner_scheduled_rehearsals']) {
    try {
      const [r] = await c.execute(`SELECT COUNT(*) n FROM ${t} WHERE artist_id IN (${gab.map(() => '?').join(',') || "''"})`, gab.map((g) => g.id));
      console.log(`  ${t} apuntando a esos ids:`, r[0].n);
    } catch (e) { console.log(`  ${t}: ${e.message}`); }
  }
  if (APLICAR) {
    const r1 = await c.execute("UPDATE planner_artists SET email = 'pipenaranjo33@gmail.com' WHERE email = 'pipe.naranjo33@gmail.com'");
    const r2 = await c.execute("UPDATE planner_director_users SET email = 'pipenaranjo33@gmail.com' WHERE email = 'pipe.naranjo33@gmail.com'");
    console.log('actualizados → planner_artists', r1[0].affectedRows, '· planner_director_users', r2[0].affectedRows);
  } else {
    console.log('\n(informe: para aplicar, --aplicar)');
  }
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
