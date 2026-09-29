#!/usr/bin/env node
/**
 * EDITORES DEL RADAR · dar o quitar el permiso de administrar lugares
 *
 * El permiso NO se deduce del rol: vive en la tabla `radar_editores`. Así se puede autorizar a
 * alguien a cargar y corregir lugares del radar sin ascenderlo a director (que le abriría todo
 * el CRM). La app FASE y el panel /nodos leen el permiso del hub.
 *
 * Uso (contra la base real, con las credenciales del servicio):
 *   python3 scripts/correr_en_hub.py scripts/radar_editores.cjs                     # listar
 *   python3 scripts/correr_en_hub.py scripts/radar_editores.cjs --agregar=a@b.cl,c@d.cl
 *   python3 scripts/correr_en_hub.py scripts/radar_editores.cjs --quitar=a@b.cl
 *
 * Es idempotente: agregar dos veces el mismo correo no rompe ni duplica.
 */
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const leerArg = (nombre) => {
  const conIgual = args.find((a) => a.startsWith(`--${nombre}=`));
  if (conIgual) return conIgual.slice(nombre.length + 3);
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? (args[i + 1] || '') : '';
};
const correos = (v) => String(v || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'admin_crm', ssl: { rejectUnauthorized: false },
  });

  await c.execute(
    `CREATE TABLE IF NOT EXISTS radar_editores (
       email      VARCHAR(255) PRIMARY KEY,
       nombre     VARCHAR(255),
       nota       VARCHAR(255),
       creado_por VARCHAR(255),
       created_at DATETIME NOT NULL
     )`
  );

  const agregar = correos(leerArg('agregar'));
  const quitar = correos(leerArg('quitar'));

  for (const email of agregar) {
    const [u] = await c.execute('SELECT display_name FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    const nombre = u.length ? (u[0].display_name || '') : '';
    await c.execute(
      `INSERT INTO radar_editores (email, nombre, nota, creado_por, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
      [email, nombre, 'editor de lugares del radar', 'hermes']
    );
    console.log(`  + ${email}${nombre ? ` (${nombre})` : ' — OJO: no está en users'}`);
  }

  for (const email of quitar) {
    const [r] = await c.execute('DELETE FROM radar_editores WHERE LOWER(email) = ?', [email]);
    console.log(`  - ${email} ${r.affectedRows ? 'quitado' : '(no estaba)'}`);
  }

  const [filas] = await c.execute('SELECT email, nombre, nota, creado_por, created_at FROM radar_editores ORDER BY created_at');
  console.log(`\n== editores del radar: ${filas.length} ==`);
  for (const f of filas) {
    console.log(`   ${f.email}  ·  ${f.nombre || '(sin nombre)'}  ·  ${f.creado_por || '?'}  ·  ${f.created_at.toISOString().slice(0, 10)}`);
  }
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
