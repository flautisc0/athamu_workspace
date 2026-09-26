/**
 * AJUSTE DE NOMBRES Y CARGOS (confirmado por Francisco)
 *
 *  - Antonia Fernández: el nombre queda "Antonia Fernández" (mujer). Su cargo real es
 *    ACTRIZ Y DIRECTORA: el "Actriz & Solista" estaba mal (venía de una iteración).
 *  - Josefa: su nombre real es "Josefa Camila Schultz León" (en TMLL figuraba como
 *    "Josefa Schultz"). Es representante legal, como el resto de los socios.
 *
 * Idempotente; sólo toca las filas que todavía tienen el dato viejo.
 */
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 15000,
  });
  const log = [];

  // --- cargos de Antonia Fernández ---
  const [a1] = await c.execute(
    `UPDATE company_people SET role_title = 'Actriz & Directora', updated_at = NOW()
      WHERE full_name = 'Antonia Fernández' AND role_title LIKE 'Actriz & Solista%'`);
  if (a1.affectedRows) log.push('nomina: Antonia Fernández -> "Actriz & Directora" (' + a1.affectedRows + ')');

  const [a2] = await c.execute(
    `UPDATE planner_artists SET role = 'Actriz & Directora'
      WHERE name = 'Antonia Fernández' AND role LIKE 'Actriz & Solista%'`);
  if (a2.affectedRows) log.push('Planner: Antonia Fernández -> "Actriz & Directora" (' + a2.affectedRows + ')');

  // --- nombre legal de Josefa en todas las superficies ---
  const [j1] = await c.execute(
    `UPDATE company_people SET full_name = 'Josefa Camila Schultz León', updated_at = NOW()
      WHERE full_name = 'Josefa Schultz'`);
  if (j1.affectedRows) log.push('nomina: "Josefa Schultz" -> "Josefa Camila Schultz León" (' + j1.affectedRows + ')');
  const [j2] = await c.execute(`UPDATE users SET display_name = 'Josefa Camila Schultz León', updated_at = NOW()
      WHERE display_name = 'Josefa Schultz'`);
  if (j2.affectedRows) log.push('cuenta: display_name actualizado (' + j2.affectedRows + ')');
  const [j3] = await c.execute(`UPDATE planner_artists SET name = 'Josefa Camila Schultz León'
      WHERE name = 'Josefa Schultz'`);
  if (j3.affectedRows) log.push('Planner: nombre actualizado (' + j3.affectedRows + ')');

  console.log(log.length ? log.join('\n') : '(no había nada que ajustar)');
  console.log('');
  console.log('AJUSTES APLICADOS: ' + log.length);
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
