/**
 * RENOMBRAR PERSONA  (en todas las superficies a la vez)
 *
 * Durante las iteraciones los nombres quedaron escritos de varias formas: la misma
 * persona figura distinto en el CRM, en el Planner o en la app. Este script cambia el
 * nombre en TODAS las tablas donde aparece, de una sola vez, para que el ecosistema
 * muestre siempre el mismo:
 *
 *   - company_people.full_name   (nomina del CRM, lo que ve el perfil de compania en la app)
 *   - users.display_name         (cuenta, lo que ve el muro y el chat)
 *   - planner_artists.name       (padron del Planner)
 *
 * Uso:
 *   node scripts/renombrar_persona.cjs "<nombre actual>" "<nombre correcto>"
 *   node scripts/renombrar_persona.cjs "Josefa Schultz" "Josefa Camila Schultz León"
 *
 * Sin --aplicar sólo muestra qué cambiaría (recomendado la primera vez).
 */
const mysql = require('mysql2/promise');

(async () => {
  const args = process.argv.slice(2);
  const aplicar = args.includes('--aplicar');
  const limpios = args.filter((a) => a !== '--aplicar');
  const [viejo, nuevo] = limpios;
  if (!viejo || !nuevo) {
    console.log('uso: node scripts/renombrar_persona.cjs "<nombre actual>" "<nombre correcto>" [--aplicar]');
    process.exit(2);
  }
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 15000,
  });
  const q = async (sql, v = []) => (await c.execute(sql, v))[0];

  const objetivos = [
    ['company_people (nomina del CRM)', 'SELECT id, company_id, full_name FROM company_people WHERE full_name = ?'],
    ['users (cuenta)', 'SELECT id, email, display_name FROM users WHERE display_name = ?'],
    ['planner_artists (Planner)', 'SELECT id, name FROM planner_artists WHERE name = ?'],
  ];

  console.log((aplicar ? 'APLICANDO' : 'SIMULACION (agregá --aplicar para cambiar)') + ': "' + viejo + '" -> "' + nuevo + '"\n');
  let total = 0;
  for (const [etiqueta, sql] of objetivos) {
    const filas = await q(sql, [viejo]);
    console.log(etiqueta + ': ' + filas.length + ' fila(s)');
    for (const f of filas.slice(0, 8)) console.log('   ' + JSON.stringify(f));
    total += filas.length;
    if (aplicar && filas.length) {
      if (etiqueta.startsWith('company_people')) {
        await c.execute('UPDATE company_people SET full_name = ?, updated_at = NOW() WHERE full_name = ?', [nuevo, viejo]);
      } else if (etiqueta.startsWith('users')) {
        await c.execute('UPDATE users SET display_name = ?, updated_at = NOW() WHERE display_name = ?', [nuevo, viejo]);
      } else {
        await c.execute('UPDATE planner_artists SET name = ? WHERE name = ?', [nuevo, viejo]);
      }
    }
  }
  console.log('\nTOTAL: ' + total + ' fila(s)' + (aplicar ? ' actualizadas.' : ' (sin cambios)'));
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
