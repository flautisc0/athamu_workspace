/**
 * PASO 3 · identidades para la prueba piloto (decision de Francisco)
 *
 *  R12 panxo.sms@gmail.com queda como contacto de las companias propias (los
 *      correos @athaproducciones.cl actuales no tienen casilla real)
 *  R13 flautisco.contacto@gmail.com pasa a ser la identidad ARTISTA / PRODUCTOR
 *      (hoy era admin): asi la prueba puede ejercer los dos puntos de vista
 *  R14 "Pipe Naranjo": su correo real es pipe.naranjo33@gmail.com, no el
 *      @athaproducciones.cl inventado -> se unifica y se borra la cuenta placeholder
 *
 * Idempotente y con backup previo de las tablas que toca.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');

const CID = { tenoia: 'comp_8fac7742a626', atha: 'comp_9b626a8428c2', kids: 'comp_c53ed0a54fe1' };
const PROPIAS = [CID.tenoia, CID.atha, CID.kids];
const CONTACTO = 'panxo.sms@gmail.com';
const ARTISTA = 'flautisco.contacto@gmail.com';
const PIPE = 'pipe.naranjo33@gmail.com';
const PIPE_FALSO = 'pipe.naranjo@athaproducciones.cl';
const aleatorio = (n) => { let s = ''; const abc = 'abcdef0123456789'; for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; };

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 15000,
  });
  const q = async (sql, v = []) => (await c.execute(sql, v))[0];
  const log = [];

  // backup
  const destino = process.argv[2];
  fs.mkdirSync(destino, { recursive: true });
  for (const t of ['users', 'company_people', 'company_members', 'companies', 'radar_profiles', 'user_preferences']) {
    const [filas] = await c.query('SELECT * FROM `' + t + '`');
    fs.writeFileSync(destino + '/' + t + '.json', JSON.stringify(filas, null, 2));
  }
  console.log('BACKUP -> ' + destino);

  // --- R12 contacto real de las companias propias ---
  for (const cid of PROPIAS) {
    const [r] = await c.execute('UPDATE companies SET contact_email = ?, updated_at = NOW() WHERE id = ?', [CONTACTO, cid]);
    if (r.affectedRows) log.push('R12 contacto: ' + cid + ' -> ' + CONTACTO);
  }

  // --- R13 la cuenta alterna pasa a artista / productor ---
  const [alt] = await c.execute(
    "UPDATE users SET role = 'artist', role_title = 'Artista / Productor', updated_at = NOW() WHERE LOWER(email) = ?", [ARTISTA]);
  if (alt.affectedRows) log.push('R13 rol de ' + ARTISTA + ' -> artist (Artista / Productor)');
  const [altm] = await c.execute(
    "UPDATE company_members SET role_in_company = 'artist' WHERE user_id = (SELECT id FROM (SELECT id FROM users WHERE LOWER(email)=?) x) AND role_in_company <> 'artist'", [ARTISTA]);
  if (altm.affectedRows) log.push('R13 membresias de ' + ARTISTA + ' -> artist (' + altm.affectedRows + ')');

  // --- R14 Pipe Naranjo: correo real ---
  const [cp1] = await c.execute(
    "UPDATE company_people SET email = ?, updated_at = NOW() WHERE company_id = ? AND full_name = 'Pipe Naranjo' AND (email IS NULL OR email = '' OR email = ?)",
    [PIPE, CID.kids, PIPE_FALSO]);
  if (cp1.affectedRows) log.push('R14 nomina de ATHA Kids: Pipe Naranjo -> ' + PIPE);

  const [pipeReal] = await q("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", [PIPE]);
  if (pipeReal) {
    if (!(await q('SELECT 1 FROM company_members WHERE user_id=? AND company_id=? LIMIT 1', [pipeReal.id, CID.kids])).length) {
      await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?,?,?,?,NOW())',
        ['cm_' + aleatorio(8), CID.kids, pipeReal.id, 'artist']);
      log.push('R14 membresia: ' + PIPE + ' -> ATHA Kids (artist)');
    }
  }

  const [pipeFalso] = await q("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", [PIPE_FALSO]);
  if (pipeFalso) {
    await c.execute('DELETE FROM company_members WHERE user_id = ?', [pipeFalso.id]);
    await c.execute('DELETE FROM user_preferences WHERE user_id = ?', [pipeFalso.id]);
    await c.execute('DELETE FROM radar_profiles WHERE user_id = ?', [pipeFalso.id]);
    try { await c.execute('DELETE FROM chat_messages WHERE sender_id = ?', [pipeFalso.id]); } catch (e) {}
    await c.execute('DELETE FROM users WHERE id = ?', [pipeFalso.id]);
    log.push('R14 cuenta placeholder eliminada: ' + PIPE_FALSO);
  }

  console.log('');
  console.log(log.length ? log.join('\n') : '(nada que cambiar)');
  console.log('');
  console.log('ACCIONES DEL PASO 3: ' + log.length);
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
