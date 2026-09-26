// Reparacion de consistencia (CommonJS). Se invoca desde reparar_consistencia_20260926.py

const mysql = require('mysql2/promise');
const fs = require('fs');

const CID = { tenoia: 'comp_8fac7742a626', atha: 'comp_9b626a8428c2', kids: 'comp_c53ed0a54fe1', tmll: 'comp_f02f2d1abda3' };
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

  const usuario = async (email) => (await q('SELECT id,email,display_name,role,role_title FROM users WHERE LOWER(email)=? LIMIT 1', [email.toLowerCase()]))[0] || null;
  const crearPerfil = async (uid, email) => {
    if ((await q('SELECT 1 FROM radar_profiles WHERE user_id=? LIMIT 1', [uid])).length) return;
    let n = '';
    for (let i = 0; i < 25; i++) {
      n = 'FASE-EXP-' + String(Math.floor(Math.random() * 9000) + 1000);
      if (!(await q('SELECT 1 FROM radar_profiles WHERE explorer_number=? LIMIT 1', [n])).length) break;
    }
    await c.execute('INSERT INTO radar_profiles (user_id, explorer_number, xp, level, bio, city, is_public, updated_at) VALUES (?,?,0,1,NULL,NULL,1,NOW())', [uid, n]);
    log.push('R2 perfil de radar: ' + email + ' (' + n + ')');
  };
  const crearPrefs = async (uid, email) => {
    if ((await q('SELECT 1 FROM user_preferences WHERE user_id=? LIMIT 1', [uid])).length) return;
    await c.execute('INSERT INTO user_preferences (user_id, preferences_json, created_at, updated_at) VALUES (?,?,NOW(),NOW())', [uid, PREF]);
    log.push('R1 preferencias por defecto: ' + email);
  };

  // ---------- BACKUP ----------
  const [tablas] = await c.query('SHOW TABLES');
  const col = Object.keys(tablas[0])[0];
  const existentes = tablas.map(r => r[col]);
  const destino = process.argv[2];
  fs.mkdirSync(destino, { recursive: true });
  for (const t of JSON.parse(process.argv[3])) {
    if (!existentes.includes(t)) continue;
    const [filas] = await c.query('SELECT * FROM `' + t + '`');
    fs.writeFileSync(destino + '/' + t + '.json', JSON.stringify(filas, null, 2));
  }
  console.log('BACKUP -> ' + destino + ' (' + JSON.parse(process.argv[3]).join(', ') + ')');

  // ---------- R1 + R2: cuentas reales sin preferencias / sin perfil ----------
  const reales = ['catalina.noa.9@gmail.com', 'flautisco.contacto@gmail.com',
                  'ignacioperezquinteros@gmail.com', 'juanito.perez01@gmail.com',
                  'atilan641@gmail.com'];
  for (const em of reales) {
    const u = await usuario(em); if (!u) continue;
    await crearPrefs(u.id, em);
    await crearPerfil(u.id, em);
  }

  // ---------- R3: fichas de nomina para miembros que no figuraban ----------
  const nominaDe = [
    { cid: CID.atha,   email: 'panxo.sms@gmail.com',            nombre: 'Francisco Pérez',           kind: 'equipo',  cargo: 'Dirección General & Producción Ejecutiva' },
    { cid: CID.tenoia, email: 'panxo.sms@gmail.com',            nombre: 'Francisco Pérez',           kind: 'elenco', cargo: 'Artista' },
    { cid: CID.atha,   email: 'ignacioperezquinteros@gmail.com', nombre: 'Ignacio Pérez Quinteros', kind: 'elenco',  cargo: 'Artista' },
  ];
  for (const n of nominaDe) {
    const u = await usuario(n.email); if (!u) continue;
    const ya = await q('SELECT 1 FROM company_people WHERE company_id=? AND LOWER(email)=? LIMIT 1', [n.cid, n.email.toLowerCase()]);
    if (ya.length) continue;
    await c.execute(
      `INSERT INTO company_people (id, company_id, full_name, role_title, character_name, kind, email, phone, notes, created_at, updated_at)
       VALUES (?,?,?,?,NULL,?,?,NULL,'alta automatica: miembro que no figuraba en la nomina',NOW(),NOW())`,
      ['cp_' + aleatorio(10), n.cid, n.nombre, n.cargo, n.kind, n.email]);
    log.push('R3 ficha de nomina creada: ' + n.nombre + ' en ' + n.cid);
  }

  // ---------- R4: cuenta + membresia para la nomina que no podia entrar ----------
  const altas = [
    { cid: CID.atha,   email: 'antonia.schultz@athaproducciones.cl',            nombre: 'Antonia Schultz',            rol: 'viewer', kind: 'socio',  cargo: 'Socia' },
    { cid: CID.atha,   email: 'francisco.schultz@athaproducciones.cl',          nombre: 'Francisco Schultz',          rol: 'artist', kind: 'socio',  cargo: 'Flautista / Piccolo' },
    { cid: CID.atha,   email: 'joaquin.schultz@athaproducciones.cl',            nombre: 'Joaquín Schultz',            rol: 'viewer', kind: 'socio',  cargo: 'Comunicación' },
    { cid: CID.atha,   email: 'josefa.camila.schultz.leon@athaproducciones.cl', nombre: 'Josefa Camila Schultz León', rol: 'viewer', kind: 'socio',  cargo: 'Representante legal / CEO' },
    { cid: CID.tmll,   email: 'pipe.naranjo33@gmail.com',                       nombre: 'Felipe Naranjo',             rol: 'artist', kind: 'equipo', cargo: 'Diseño Lumínico & Elenco' },
  ];
  for (const a of altas) {
    let u = await usuario(a.email);
    if (!u) {
      const id = 'usr_' + aleatorio(8);
      await c.execute(
        `INSERT INTO users (id, email, display_name, role, role_title, picture, provider, public_profile, created_at, updated_at)
         VALUES (?,?,?,'explorador',?,'','invitado',1,NOW(),NOW())`,
        [id, a.email, a.nombre, a.cargo]);
      u = { id, email: a.email, display_name: a.nombre, role: 'explorador', role_title: a.cargo };
      log.push('R4 cuenta creada (invitado, rol explorador): ' + a.email);
    }
    const m = await q('SELECT 1 FROM company_members WHERE user_id=? AND company_id=? LIMIT 1', [u.id, a.cid]);
    if (!m.length) {
      await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?,?,?,?,NOW())',
        ['cm_' + aleatorio(8), a.cid, u.id, a.rol]);
      log.push('R4 membresia creada: ' + a.email + ' -> ' + a.cid + ' como ' + a.rol);
    }
    await crearPrefs(u.id, a.email);
    await crearPerfil(u.id, a.email);
  }

  // ---------- R5: duplicado de Josefa ----------
  const d = await c.execute("DELETE FROM company_people WHERE company_id=? AND LOWER(email)='josefa.csl@athaproducciones.cl'", [CID.atha]);
  if (d[0].affectedRows) log.push('R5 ficha duplicada "Josefa CSL" eliminada (queda la de Representante legal / CEO)');

  // ---------- R6: solicitudes de acceso basura ----------
  const r6 = await c.execute("DELETE FROM access_requests WHERE id IN ('sol_5a34add5070a4b45','sol_649dd8bc1d034694','sol_a0e3317b612b49ee')");
  if (r6[0].affectedRows) log.push('R6 solicitudes basura eliminadas: ' + r6[0].affectedRows);

  // ---------- R7: la cuenta semilla no debe figurar como miembro ----------
  const seed = await usuario('seed@athaproducciones.cl');
  if (seed) {
    const r7 = await c.execute('DELETE FROM company_members WHERE user_id=?', [seed.id]);
    if (r7[0].affectedRows) log.push('R7 membresia de la cuenta semilla quitada (' + r7[0].affectedRows + ')');
  }

  console.log('');
  console.log(log.length ? log.join('\n') : '(no habia nada que reparar)');
  console.log('');
  console.log('ACCIONES APLICADAS: ' + log.length);
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
