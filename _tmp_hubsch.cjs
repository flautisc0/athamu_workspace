const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'admin_crm'});
  const [r] = await c.query('SHOW COLUMNS FROM company_people');
  console.log('company_people:', r.map(x=>`${x.Field}:${x.Type}${x.Null==='YES'?'?':''}`).join(' | '));
  const [ev] = await c.query("SELECT id,title,obra_id,date,time_start,venue,city FROM events WHERE obra_id IS NOT NULL LIMIT 6");
  console.log('events:', JSON.stringify(ev));
  const [cp] = await c.query("SELECT id,company_id,full_name,email,kind,role_title FROM company_people LIMIT 10");
  console.log('company_people rows:', JSON.stringify(cp));
  const [us] = await c.query("SELECT id,email,display_name,role,picture FROM users LIMIT 10");
  console.log('users:', JSON.stringify(us));
  const [u2] = await c.query("SELECT id,email,display_name,role FROM users WHERE LOWER(email) IN ('flautisco.contacto@gmail.com','panxo.sms@gmail.com')");
  console.log('usuarios clave:', JSON.stringify(u2));
  const [adm] = await c.query("SELECT email,role FROM users WHERE role IN ('admin','director') LIMIT 10");
  console.log('admins:', JSON.stringify(adm));
  // alguien del elenco: buscar personas kind elenco
  const [el] = await c.query("SELECT DISTINCT kind, COUNT(*) n FROM company_people GROUP BY kind");
  console.log('kinds:', JSON.stringify(el));
  await c.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
