/**
 * SOCIOS / REPRESENTANTES LEGALES DE ATHA PRODUCCIONES
 *
 * Lo explicitado por Francisco: los representantes legales NO son la "familia Schultz"
 * (eso quedó de una iteración). El unico Schultz es Josefa. Los representantes legales
 * reales son:
 *
 *   Josefa Camila Schultz León · Antonia Fernández · Francisco Pérez ·
 *   Joaquín Toledo · Nicolás Ortiz
 *
 * "Antonia Schultz", "Francisco Schultz" y "Joaquín Schultz" eran los MISMOS tres
 * primeros nombres con un apellido equivocado: se unifican y se borra la ficha falsa.
 *
 * Idempotente, con backup previo.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');

const CID_ATHA = 'comp_9b626a8428c2';   // la entidad ATHA Producciones
const CARGO = 'Representante legal';
const SOCIOS = [
  { nombre: 'Josefa Camila Schultz León', email: 'josefa.camila.schultz.leon@athaproducciones.cl', cargo: 'Representante legal / CEO' },
  { nombre: 'Antonia Fernández', email: 'antonia.fernandez@athaproducciones.cl', cargo: CARGO },
  { nombre: 'Francisco Pérez', email: 'panxo.sms@gmail.com', cargo: CARGO },
  { nombre: 'Joaquín Toledo', email: 'joaquin.toledo@athaproducciones.cl', cargo: CARGO },
  { nombre: 'Nicolás Ortiz', email: 'nico.ortiz@athaproducciones.cl', cargo: CARGO },
];
/** Fichas con apellido equivocado que en realidad son personas ya listadas arriba. */
const FALSAS = ['Antonia Schultz', 'Francisco Schultz', 'Joaquín Schultz'];
const aleatorio = (n) => { let s = ''; const abc = 'abcdef0123456789'; for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; };

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 15000,
  });
  const q = async (sql, v = []) => (await c.execute(sql, v))[0];
  const log = [];

  const destino = process.argv[2];
  fs.mkdirSync(destino, { recursive: true });
  for (const t of ['company_people', 'users', 'company_members']) {
    const [filas] = await c.query('SELECT * FROM `' + t + '`');
    fs.writeFileSync(destino + '/' + t + '.json', JSON.stringify(filas, null, 2));
  }
  console.log('BACKUP -> ' + destino);

  // 1) marcar / crear a los socios reales
  for (const s of SOCIOS) {
    const [fila] = await q('SELECT id FROM company_people WHERE company_id = ? AND full_name = ? LIMIT 1', [CID_ATHA, s.nombre]);
    if (fila) {
      await c.execute(
        `UPDATE company_people SET kind = 'socio', role_title = ?, email = COALESCE(NULLIF(email,''), ?), updated_at = NOW()
          WHERE id = ?`, [s.cargo, s.email, fila.id]);
      log.push('socio marcado: ' + s.nombre);
    } else {
      await c.execute(
        `INSERT INTO company_people (id, company_id, full_name, role_title, character_name, kind, email, phone, notes, created_at, updated_at)
         VALUES (?,?,?,?,NULL,'socio',?,NULL,'representante legal (alta desde el CRM)',NOW(),NOW())`,
        ['cp_' + aleatorio(10), CID_ATHA, s.nombre, s.cargo, s.email]);
      log.push('socio creado: ' + s.nombre);
    }
  }

  // 2) borrar las fichas con el apellido equivocado
  for (const falso of FALSAS) {
    const [r] = await c.execute('DELETE FROM company_people WHERE company_id = ? AND full_name = ?', [CID_ATHA, falso]);
    if (r.affectedRows) log.push('ficha con apellido equivocado eliminada: ' + falso);
  }

  console.log('');
  console.log(log.length ? log.join('\n') : '(nada que cambiar)');
  console.log('');
  console.log('ACCIONES: ' + log.length);
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
