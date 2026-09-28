/**
 * Gabriel Ríos: dejarlo listo para la prueba real.
 *
 * Se anotó al piloto declarando que trabaja en **Tenoia Musicalis** (piloto_inscripciones,
 * 27/09) pero en el CRM no existía ni su ficha de nómina ni su membresía, y su cuenta de la
 * app es otra (`atilan641@gmail.com` — desde ahí mandó los 3 reportes; se anotó con
 * `gabo_641@hotmail.com`). Sin esto, al entrar a la app no ve ninguna agrupación.
 *
 * Se usa el correo de la cuenta con la que ENTRA a la app: es la que el CRM necesita para
 * vincularlo (regla de la casa: la identidad se cruza por el correo que realmente usa).
 *
 * Uso:  node scripts/preparar_gabriel.cjs             → informe
 *       node scripts/preparar_gabriel.cjs --aplicar   → escribe (con backup previo)
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

const APLICAR = process.argv.includes('--aplicar');
const BACKUP = '/home/flautisc0/athamu_workspace/backups';
const COMPANIA = 'comp_8fac7742a626';            // Tenoia Musicalis
const CUENTA = 'atilan641@gmail.com';            // la que usa en la app
const CORREO_INSCRIPCION = 'gabo_641@hotmail.com';
const NOMBRE = 'Gabriel Ríos';

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const [users] = await c.execute('SELECT id, email, display_name FROM users WHERE email = ?', [CUENTA]);
  if (!users.length) { console.error('no existe la cuenta', CUENTA); process.exit(1); }
  const userId = users[0].id;
  const [fichas] = await c.execute('SELECT id, full_name, email FROM company_people WHERE company_id = ? AND (email = ? OR full_name LIKE ?)',
    [COMPANIA, CUENTA, 'Gabriel%']);
  const [memb] = await c.execute('SELECT id FROM company_members WHERE company_id = ? AND user_id = ?', [COMPANIA, userId]);
  console.log('cuenta:', userId, CUENTA, '·', users[0].display_name);
  console.log('ficha en Tenoia:', fichas.length ? JSON.stringify(fichas) : 'NO TIENE');
  console.log('membresía en Tenoia:', memb.length ? 'ya la tiene' : 'NO TIENE');

  if (!APLICAR) { console.log('\n(informe: para aplicar, --aplicar)'); await c.end(); return; }

  fs.mkdirSync(BACKUP, { recursive: true });
  const sello = new Date().toISOString().replace(/[:.]/g, '-');
  const [antes] = await c.execute('SELECT * FROM company_people WHERE company_id = ?', [COMPANIA]);
  const [antesM] = await c.execute('SELECT * FROM company_members WHERE company_id = ?', [COMPANIA]);
  fs.writeFileSync(`${BACKUP}/gabriel_tenoia_${sello}.json`, JSON.stringify({ company_people: antes, company_members: antesM }, null, 1));
  console.log('backup:', `${BACKUP}/gabriel_tenoia_${sello}.json`);

  if (!fichas.length) {
    await c.execute(
      `INSERT INTO company_people (id, company_id, full_name, role_title, kind, email, notes, created_at)
       VALUES (?, ?, ?, 'Artista', 'elenco', ?, ?, NOW())`,
      [`cp_${Math.random().toString(16).slice(2, 10)}`, COMPANIA, NOMBRE, CUENTA,
       `Se anotó al piloto declarando Tenoia Musicalis (inscripción con ${CORREO_INSCRIPCION}). Ficha creada al preparar la prueba real.`]
    );
    console.log('ficha creada para', NOMBRE);
  } else if (fichas[0].email !== CUENTA) {
    await c.execute('UPDATE company_people SET email = ? WHERE id = ?', [CUENTA, fichas[0].id]);
    console.log('ficha reapuntada a', CUENTA);
  }
  if (!memb.length) {
    await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?, ?, ?, ?, NOW())',
      [`cm_${Math.random().toString(16).slice(2, 10)}`, COMPANIA, userId, 'artist']);
    console.log('membresía creada (artist)');
  }
  const [tot] = await c.execute("SELECT (SELECT COUNT(*) FROM company_people WHERE company_id=?) n, (SELECT COUNT(*) FROM company_members WHERE company_id=?) m", [COMPANIA, COMPANIA]);
  console.log('Tenoia Musicalis ahora → nómina', tot[0].n, '· miembros', tot[0].m);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
