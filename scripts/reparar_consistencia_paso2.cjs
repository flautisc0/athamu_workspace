/**
 * REPARACION DE CONSISTENCIA · PASO 2 (cruce Planner -> CRM)
 *
 * El Planner tiene los CORREOS y los PERSONAJES del elenco de ATHA Kids, y el CRM
 * tiene la nomina sin correo: por eso esas personas no podian entrar a la app ni
 * figurar en el equipo. Este paso cruza los dos lados por nombre:
 *
 *  R8  ficha de nomina para Catalina Noa en ATHA Kids (era miembro pero el CRM no la
 *      mostraba: es el reporte "Cata no aparece en ATHA Kids")
 *  R9  completa correo, personaje y cargo de la nomina de ATHA Kids con los datos del Planner
 *  R10 cuenta + membresia (artist) + preferencias + perfil de radar para ese elenco
 *  R11 borra las dos cuentas basura (semilla y "Prueba Alta CURL"), una de ellas admin
 *
 * Idempotente: se puede correr varias veces. No borra personas reales.
 */
const mysql = require('mysql2/promise');

const CID_KIDS = 'comp_c53ed0a54fe1';
const CID_ATHA = 'comp_9b626a8428c2';
const PREF = JSON.stringify({
  fase_app: { themeMode: 'light', accentColor: 'emerald', isBiometricsEnabled: false },
  theme_config: { mode: 'light', accent: 'emerald' }, layout_config: {},
});
const aleatorio = (n) => { let s = ''; const abc = 'abcdef0123456789'; for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; };

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 15000,
  });
  const q = async (sql, v = []) => (await c.execute(sql, v))[0];
  const log = [];

  const usuario = async (email) => (await q('SELECT id,email,display_name,role FROM users WHERE LOWER(email)=? LIMIT 1', [email.toLowerCase()]))[0] || null;
  const perfil = async (uid, email) => {
    if ((await q('SELECT 1 FROM radar_profiles WHERE user_id=? LIMIT 1', [uid])).length) return;
    let n = '';
    for (let i = 0; i < 25; i++) {
      n = 'FASE-EXP-' + String(Math.floor(Math.random() * 9000) + 1000);
      if (!(await q('SELECT 1 FROM radar_profiles WHERE explorer_number=? LIMIT 1', [n])).length) break;
    }
    await c.execute('INSERT INTO radar_profiles (user_id, explorer_number, xp, level, bio, city, is_public, updated_at) VALUES (?,?,0,1,NULL,NULL,1,NOW())', [uid, n]);
    log.push('R10 perfil de radar: ' + email);
  };
  const prefs = async (uid, email) => {
    if ((await q('SELECT 1 FROM user_preferences WHERE user_id=? LIMIT 1', [uid])).length) return;
    await c.execute('INSERT INTO user_preferences (user_id, preferences_json, created_at, updated_at) VALUES (?,?,NOW(),NOW())', [uid, PREF]);
    log.push('R10 preferencias: ' + email);
  };
  /** Crea cuenta + membresia si faltan, y deja preferencias y perfil. */
  const asegurar = async (email, nombre, cid, rol, cargo) => {
    let u = await usuario(email);
    if (!u) {
      const id = 'usr_' + aleatorio(8);
      await c.execute(
        `INSERT INTO users (id, email, display_name, role, role_title, picture, provider, public_profile, created_at, updated_at)
         VALUES (?,?,?,'explorador',?,'','invitado',1,NOW(),NOW())`, [id, email, nombre, cargo || '']);
      u = { id, email };
      log.push('R10 cuenta creada (invitado): ' + email);
    }
    if ((await q('SELECT 1 FROM company_members WHERE user_id=? AND company_id=? LIMIT 1', [u.id, cid])).length === 0) {
      await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?,?,?,?,NOW())',
        ['cm_' + aleatorio(8), cid, u.id, rol]);
      log.push('R10 membresia: ' + email + ' -> ' + cid + ' (' + rol + ')');
    }
    await prefs(u.id, email);
    await perfil(u.id, email);
  };

  // ---------- R8: Catalina (miembro sin ficha en la nomina) ----------
  const cata = 'catalina.noa.9@gmail.com';
  if (!(await q('SELECT 1 FROM company_people WHERE company_id=? AND LOWER(email)=? LIMIT 1', [CID_KIDS, cata])).length) {
    await c.execute(
      `INSERT INTO company_people (id, company_id, full_name, role_title, character_name, kind, email, phone, notes, created_at, updated_at)
       VALUES (?,?,?,'Elenco','Nuevo Artista','elenco',?,NULL,'alta automatica: miembro que no figuraba en la nomina',NOW(),NOW())`,
      ['cp_' + aleatorio(10), CID_KIDS, 'Catalina Noa', cata]);
    log.push('R8 ficha de nomina: Catalina Noa en ATHA Kids');
  }

  // ---------- R9: completar la nomina de ATHA Kids con los datos del Planner ----------
  const [planner] = await c.query("SELECT name, email, role, character_name FROM planner_artists WHERE email IS NOT NULL AND email<>''");
  const [nominaKids] = await c.query('SELECT id, full_name, email FROM company_people WHERE company_id=?', [CID_KIDS]);
  for (const a of planner) {
    const fila = nominaKids.find((n) => String(n.full_name).trim().toLowerCase() === String(a.name).trim().toLowerCase());
    if (!fila) continue;
    const faltanDatos = true; // se completa correo, cargo y personaje si vinieron vacios
    await c.execute(
      `UPDATE company_people SET email = COALESCE(NULLIF(email,''), ?),
              role_title = COALESCE(NULLIF(role_title,''), ?),
              character_name = COALESCE(NULLIF(character_name,''), ?), updated_at = NOW()
        WHERE id = ?`, [a.email, a.role, a.character_name, fila.id]);
    if (faltanDatos) log.push('R9 nomina completada desde el Planner: ' + a.name + ' <' + a.email + '>');
  }

  // ---------- R10: cuenta + membresia para el elenco ----------
  const [elenco] = await c.query("SELECT full_name, email, role_title FROM company_people WHERE company_id=? AND email IS NOT NULL AND email<>''", [CID_KIDS]);
  for (const p of elenco) {
    await asegurar(p.email, p.full_name, CID_KIDS, 'artist', p.role_title);
  }
  // el "Francisco Pérez" del elenco usa su cuenta alterna (ya existe): solo hay que
  // dejarla como miembro de ATHA Kids, y su ficha de nomina en ATHA (donde es owner)
  const alt = await usuario('flautisco.contacto@gmail.com');
  if (alt && (await q('SELECT 1 FROM company_members WHERE user_id=? AND company_id=? LIMIT 1', [alt.id, CID_ATHA])).length === 0) {
    await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?,?,?,?,NOW())',
      ['cm_' + aleatorio(8), CID_ATHA, alt.id, 'owner']);
    log.push('R10 membresia: flautisco.contacto@gmail.com -> Compañía Teatral ATHA (owner)');
  }

  // ---------- R11: cuentas basura ----------
  for (const basura of ['seed@athaproducciones.cl', 'prueba.alta.curl@athaproducciones.cl']) {
    const u = await usuario(basura);
    if (!u) continue;
    await c.execute('DELETE FROM company_members WHERE user_id=?', [u.id]);
    await c.execute('DELETE FROM user_preferences WHERE user_id=?', [u.id]);
    await c.execute('DELETE FROM radar_profiles WHERE user_id=?', [u.id]);
    try { await c.execute('DELETE FROM chat_messages WHERE sender_id=?', [u.id]); } catch (e) {}
    await c.execute('DELETE FROM users WHERE id=?', [u.id]);
    log.push('R11 cuenta basura eliminada: ' + basura);
  }

  console.log(log.length ? log.join('\n') : '(nada que reparar)');
  console.log('');
  console.log('ACCIONES DEL PASO 2: ' + log.length);
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
