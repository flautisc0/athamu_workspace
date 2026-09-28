/**
 * REPARACIÓN DEL ECOSISTEMA · 2026-09-27 (antes de la prueba real)
 *
 * Dos cosas que la auditoría dejó marcadas y que sí tienen arreglo decidible:
 *
 * 1. PIPE (Felipe Naranjo) con DOS cuentas:
 *      · pipenaranjo33@gmail.com  → la que crea el login de Google (sin punto)
 *      · pipe.naranjo33@gmail.com → la que tiene las 2 membresías y las 2 fichas de nómina
 *    Gmail ignora los puntos, así que es la MISMA persona y la MISMA casilla: lo que cambia es
 *    con qué fila de `users` entra. Se consolida en la de Google (la que él usa) moviéndole
 *    membresías, perfil de explorador, preferencias y las fichas de nómina.
 *
 * 2. COMPAÑÍA TEATRAL ATHA: quedaron 3 membresías de la iteración vieja ("familia Schultz":
 *    antonia/francisco/joaquin.schultz) y los 3 socios reales de la nómina (Antonia Fernández,
 *    Joaquín Toledo, Nicolás Ortiz) NO eran miembros → el CRM los mostraba y la app no.
 *
 * NO se borra ninguna cuenta de persona real ni ninguna compañía. Las 7 compañías "sin nadie"
 * (INTERDRAM, Ilícita Teatro, Los Dispersos, Proyecto Fuego, SantosFilms, Con Mucho Merkén,
 * Q importa?) son `kind='colaboradora'`, creadas por Francisco, cada una con su obra: son
 * legítimas y se dejan tal cual.
 *
 * Uso:  node scripts/reparar_ecosistema_20260927.cjs             → informe
 *       node scripts/reparar_ecosistema_20260927.cjs --aplicar   → escribe (con backup previo)
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

const APLICAR = process.argv.includes('--aplicar');
const BACKUP = '/home/flautisc0/athamu_workspace/backups';

const PIPE = { google: 'ush_bc09fbb7', viejo_email: 'pipe.naranjo33@gmail.com', nuevo_email: 'pipenaranjo33@gmail.com' };
const FALSOS = ['antonia.schultz@athaproducciones.cl', 'francisco.schultz@athaproducciones.cl', 'joaquin.schultz@athaproducciones.cl'];
const REALES = ['antonia.fernandez@athaproducciones.cl', 'joaquin.toledo@athaproducciones.cl', 'nico.ortiz@athaproducciones.cl'];
const ATHA = 'comp_9b626a8428c2';
const ROL_SOCIOS = 'viewer';   // privilegio mínimo, igual que la otra socia ya cargada

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'admin_crm',
    ssl: { rejectUnauthorized: false },
  });
  const [usuarios] = await c.execute("SELECT id, email, display_name, role, created_at FROM users WHERE email IN (?, ?)",
    ['pipe.naranjo33@gmail.com', 'pipenaranjo33@gmail.com']);
  const viejo = usuarios.find((u) => u.email === PIPE.viejo_email.replace('pipe.', 'pipe.'));
  const nuevo = usuarios.find((u) => u.email === 'pipenaranjo33@gmail.com');
  console.log('== CUENTAS DE PIPE ==');
  console.log('  la de Google (sobrevive):', nuevo ? `${nuevo.id} · ${nuevo.email} · ${nuevo.display_name}` : 'NO EXISTE (se creará al entrar)');
  console.log('  la duplicada (se absorbe):', viejo ? `${viejo.id} · ${viejo.email} · ${viejo.display_name}` : '(ninguna)');

  if (!viejo || !nuevo) {
    console.log('\nNo hay nada que consolidar (hace falta que existan las dos filas).');
  } else {
    const q = async (t, sql, a = []) => { const [r] = await c.execute(sql, a); console.log(`  ${t}: ${JSON.stringify(r)}`); return r; };
    const [memb] = await c.execute('SELECT m.id, m.company_id, co.name FROM company_members m LEFT JOIN companies co ON co.id=m.company_id WHERE m.user_id = ?', [viejo.id]);
    const [perf] = await c.execute('SELECT user_id, xp, level FROM radar_profiles WHERE user_id = ?', [viejo.id]);
    const [prefs] = await c.execute('SELECT COUNT(*) n FROM user_preferences WHERE user_id = ?', [viejo.id]);
    const [fichas] = await c.execute('SELECT id, company_id, full_name FROM company_people WHERE email = ?', [viejo.email]);
    console.log('\n== A MOVER ==');
    console.log('  membresías:', memb.map((m) => m.name).join(', ') || 'ninguna');
    console.log('  perfil de explorador:', perf.length ? `xp ${perf[0].xp} · nivel ${perf[0].level}` : 'ninguno');
    console.log('  preferencias:', prefs[0].n);
    console.log('  fichas de nómina:', fichas.map((f) => f.full_name).join(', ') || 'ninguna');

    const [otrosPerf] = await c.execute('SELECT COUNT(*) n FROM radar_profiles WHERE user_id = ?', [nuevo.id]);
    if (otrosPerf[0].n) console.log('  OJO: la cuenta de Google YA tiene perfil: no se pisa (se borra el duplicado vacío).');

    if (APLICAR) {
      fs.mkdirSync(BACKUP, { recursive: true });
      const sello = new Date().toISOString().replace(/[:.]/g, '-');
      const respaldo = {
        sello, motivo: 'consolidación de las dos cuentas de Felipe Naranjo + socios de Compañía Teatral ATHA',
        users: usuarios,
        company_members: memb,
        company_people: fichas,
        radar_profiles: perf,
        company_members_attha: (await c.execute("SELECT m.id, m.user_id, u.email FROM company_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.company_id = ?", [ATHA]))[0],
      };
      const ruta = `${BACKUP}/reparacion_ecosistema_${sello}.json`;
      fs.writeFileSync(ruta, JSON.stringify(respaldo, null, 1));
      console.log('\n  backup:', ruta);

      for (const m of memb) {
        await c.execute('UPDATE company_members SET user_id = ? WHERE id = ? AND user_id = ?', [nuevo.id, m.id, viejo.id]);
        console.log(`  membresía movida: ${m.name}`);
      }
      if (perf.length && !otrosPerf[0].n) {
        await c.execute('UPDATE radar_profiles SET user_id = ? WHERE user_id = ?', [nuevo.id, viejo.id]);
        console.log('  perfil de explorador movido');
      } else if (perf.length) {
        await c.execute('DELETE FROM radar_profiles WHERE user_id = ?', [viejo.id]);
        console.log('  perfil duplicado borrado (la cuenta de Google ya tenía uno)');
      }
      await c.execute('UPDATE user_preferences SET user_id = ? WHERE user_id = ?', [nuevo.id, viejo.id]);
      await c.execute('UPDATE company_people SET email = ? WHERE email = ?', [nuevo.email, viejo.email]);
      console.log('  fichas de nómina reapuntadas a', nuevo.email);
      await c.execute('DELETE FROM users WHERE id = ?', [viejo.id]);
      console.log('  cuenta duplicada borrada:', viejo.email);
    }
  }

  console.log('\n== COMPAÑÍA TEATRAL ATHA: membresías de la iteración vieja ==');
  const [falsas] = await c.execute(
    `SELECT m.id, u.email, u.display_name FROM company_members m LEFT JOIN users u ON u.id=m.user_id
      WHERE m.company_id = ? AND u.email IN (${FALSOS.map(() => '?').join(',')})`, [ATHA, ...FALSOS]);
  for (const f of falsas) console.log(`  - quitar membresía de ${f.display_name} (${f.email})`);
  const [faltan] = await c.execute(
    `SELECT u.id, u.email, p.full_name, p.role_title FROM company_people p
       LEFT JOIN users u ON u.email = p.email
       LEFT JOIN company_members m ON m.company_id = p.company_id AND m.user_id = u.id
      WHERE p.company_id = ? AND m.id IS NULL AND p.email <> ''`, [ATHA]);
  for (const f of faltan) console.log(`  + agregar como miembro a ${f.full_name} (${f.email || 'sin correo'}) · ${f.role_title}`);

  if (APLICAR) {
    for (const f of falsas) {
      await c.execute('DELETE FROM company_members WHERE id = ?', [f.id]);
      console.log(`  membresía falsa borrada: ${f.email}`);
    }
    for (const f of faltan) {
      if (!f.id) { console.log(`  (sin cuenta: no se puede agregar a ${f.full_name})`); continue; }
      const [ya] = await c.execute('SELECT id FROM company_members WHERE company_id = ? AND user_id = ?', [ATHA, f.id]);
      if (ya.length) { console.log(`  (ya era miembro: ${f.full_name})`); continue; }
      await c.execute('INSERT INTO company_members (id, company_id, user_id, role_in_company, joined_at) VALUES (?, ?, ?, ?, NOW())',
        [`cm_${Math.random().toString(16).slice(2, 10)}`, ATHA, f.id, ROL_SOCIOS]);
      console.log(`  miembro agregado: ${f.full_name} (${ROL_SOCIOS})`);
    }
  }

  const [tot] = await c.execute("SELECT (SELECT COUNT(*) FROM company_members WHERE company_id=?) miembros, (SELECT COUNT(*) FROM company_people WHERE company_id=?) nomina", [ATHA, ATHA]);
  console.log(`\nCompañía Teatral ATHA → miembros ${tot[0].miembros} · nómina ${tot[0].nomina}`);
  if (!APLICAR) console.log('\n(informe: no se escribió nada. Para aplicar: --aplicar)');
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
