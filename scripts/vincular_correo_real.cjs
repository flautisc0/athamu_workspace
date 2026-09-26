/**
 * VINCULAR CORREO REAL
 *
 * Los correos @athaproducciones.cl de la nomina son de mentira (no tienen casilla), asi
 * que esas personas no pueden entrar. Cuando alguien se anota al piloto o te pasa su
 * correo real, este script hace el puente:
 *
 *   1. actualiza el correo de su ficha en la nomina (todas las companias donde figure)
 *   2. deja la cuenta real como miembro (creandola si no existe) con el rol pedido
 *   3. borra la cuenta placeholder que ya no sirve
 *
 * Uso:
 *   node scripts/vincular_correo_real.cjs <nombre exacto en la nomina> <correo real> [rol]
 *   node scripts/vincular_correo_real.cjs "Pipe Naranjo" pipe.naranjo33@gmail.com artist
 *
 * Sin [rol] se respeta el que ya tenga; si la persona no es miembro, no se agrega.
 */
const mysql = require('mysql2/promise');

const PREF = JSON.stringify({
  fase_app: { themeMode: 'light', accentColor: 'emerald', isBiometricsEnabled: false },
  theme_config: { mode: 'light', accent: 'emerald' }, layout_config: {},
});
const aleatorio = (n) => { let s = ''; const abc = 'abcdef0123456789'; for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; };

(async () => {
  const [nombre, correo, rolPedido] = process.argv.slice(2);
  if (!nombre || !correo) {
    console.log('uso: node scripts/vincular_correo_real.cjs "<nombre en la nomina>" <correo real> [rol]');
    process.exit(2);
  }
  const real = correo.trim().toLowerCase();
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 15000,
  });
  const q = async (sql, v = []) => (await c.execute(sql, v))[0];
  const log = [];

  const fichas = await q('SELECT id, company_id, email, role_title FROM company_people WHERE full_name = ?', [nombre]);
  if (!fichas.length) { console.log('no encontré a "' + nombre + '" en ninguna nomina'); await c.end(); return; }

  const viejos = [...new Set(fichas.map((f) => (f.email || '').toLowerCase()).filter(Boolean).filter((e) => e !== real))];
  for (const f of fichas) {
    await c.execute('UPDATE company_people SET email = ?, updated_at = NOW() WHERE id = ?', [real, f.id]);
  }
  log.push('nomina actualizada en ' + fichas.length + ' ficha(s): ' + nombre + ' -> ' + real);

  let [u] = await q('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [real]);
  if (!u) {
    const id = 'usr_' + aleatorio(8);
    await c.execute(
      `INSERT INTO users (id, email, display_name, role, role_title, picture, provider, public_profile, created_at, updated_at)
       VALUES (?,?,?, 'explorador', '', '', 'invitado', 1, NOW(), NOW())`,
      [id, real, nombre]);
    u = { id };
    log.push('cuenta creada: ' + real);
    await c.execute('INSERT INTO user_preferences (user_id, preferences_json, created_at, updated_at) VALUES (?,?,NOW(),NOW())', [u.id, PREF]);
  }

  for (const cid of [...new Set(fichas.map((f) => f.company_id))]) {
    const [m] = await q('SELECT id, role_in_company FROM company_members WHERE user_id = ? AND company_id = ? LIMIT 1', [u.id, cid]);
    if (!m && rolPedido) {
      await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?,?,?,?,NOW())',
        ['cm_' + aleatorio(8), cid, u.id, rolPedido]);
      log.push('membresia nueva: ' + real + ' -> ' + cid + ' (' + rolPedido + ')');
    } else if (m && rolPedido && m.role_in_company !== rolPedido) {
      await c.execute('UPDATE company_members SET role_in_company = ? WHERE id = ?', [rolPedido, m.id]);
      log.push('membresia actualizada: ' + real + ' -> ' + cid + ' (' + rolPedido + ')');
    }
  }

  for (const viejo of viejos) {
    const [pv] = await q('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [viejo]);
    if (!pv) continue;
    await c.execute('DELETE FROM company_members WHERE user_id = ?', [pv.id]);
    await c.execute('DELETE FROM user_preferences WHERE user_id = ?', [pv.id]);
    await c.execute('DELETE FROM radar_profiles WHERE user_id = ?', [pv.id]);
    await c.execute('DELETE FROM users WHERE id = ?', [pv.id]);
    log.push('cuenta placeholder eliminada: ' + viejo);
  }

  console.log(log.join('\n'));
  console.log('\nLISTO. ' + nombre + ' ahora entra con ' + real + '.');
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
