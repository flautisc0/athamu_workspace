#!/usr/bin/env python3
"""Auditoria de consistencia de datos cruzados: CRM <-> radar/app <-> Planner.

Lee las credenciales de la BD del propio servicio de Cloud Run (no las imprime)
y corre un conjunto de chequeos. Se puede correr antes y despues de una prueba
con colaboradores para comparar.
"""
import json
import os
import subprocess

WS = '/home/flautisc0/athamu_workspace'

CHECKS = [
    ("A1 emails duplicados en users",
     "SELECT LOWER(email) e, COUNT(*) n FROM users GROUP BY e HAVING n>1"),
    ("A2 usuarios SIN perfil de radar (sin XP/nivel en la app)",
     "SELECT u.email FROM users u LEFT JOIN radar_profiles rp ON rp.user_id=u.id WHERE rp.user_id IS NULL"),
    ("A3 usuarios SIN preferencias guardadas (tema/acento)",
     "SELECT u.email FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE p.user_id IS NULL"),
    ("A4 usuarios sin nombre visible",
     "SELECT email, display_name FROM users WHERE display_name IS NULL OR TRIM(display_name)=''"),
    ("B1b misma persona con DOS correos en la misma compania",
     "SELECT company_id, LOWER(full_name) n, COUNT(DISTINCT LOWER(email)) correos, GROUP_CONCAT(DISTINCT email) emails FROM company_people WHERE full_name IS NOT NULL AND TRIM(full_name)<>'' AND email IS NOT NULL AND email<>'' GROUP BY company_id, n HAVING correos>1"),
    ("i) B7 usuarios activos por compania (miembros vs nomina)",
     "SELECT c.name, (SELECT COUNT(*) FROM company_members m WHERE m.company_id=c.id) miembros, (SELECT COUNT(*) FROM company_people p WHERE p.company_id=c.id) nomina FROM companies c WHERE EXISTS (SELECT 1 FROM company_members m WHERE m.company_id=c.id) OR EXISTS (SELECT 1 FROM company_people p WHERE p.company_id=c.id) ORDER BY c.name"),
    ("B1 nomina duplicada por compania",
     "SELECT company_id, LOWER(email) e, COUNT(*) n FROM company_people WHERE email IS NOT NULL AND email<>'' GROUP BY company_id,e HAVING n>1"),
    ("B2 personas en nomina SIN cuenta de usuario (no pueden entrar)",
     "SELECT cp.company_id, cp.full_name, cp.email FROM company_people cp LEFT JOIN users u ON LOWER(u.email)=LOWER(cp.email) WHERE cp.email IS NOT NULL AND cp.email<>'' AND u.id IS NULL"),
    ("B3 miembros SIN ficha en la nomina del CRM",
     "SELECT u.email, cm.company_id FROM company_members cm JOIN users u ON u.id=cm.user_id LEFT JOIN company_people cp ON cp.company_id=cm.company_id AND LOWER(cp.email)=LOWER(u.email) WHERE cp.id IS NULL"),
    ("B4 en la nomina pero NO miembros (CRM los muestra, la app no)",
     "SELECT cp.company_id, cp.full_name, cp.email FROM company_people cp JOIN users u ON LOWER(u.email)=LOWER(cp.email) LEFT JOIN company_members cm ON cm.company_id=cp.company_id AND cm.user_id=u.id WHERE cm.id IS NULL"),
    ("B5 miembros con compania inexistente",
     "SELECT cm.id, cm.company_id FROM company_members cm LEFT JOIN companies c ON c.id=cm.company_id WHERE c.id IS NULL"),
    ("B6 companias sin nadie (ni miembro ni nomina)",
     "SELECT c.id,c.name FROM companies c LEFT JOIN company_members cm ON cm.company_id=c.id LEFT JOIN company_people cp ON cp.company_id=c.id WHERE cm.id IS NULL AND cp.id IS NULL"),
    ("C1 publicaciones de autor inexistente",
     "SELECT p.id,p.caption FROM radar_posts p LEFT JOIN users u ON u.id=p.user_id WHERE u.id IS NULL"),
    ("C2 publicaciones de nodo inexistente",
     "SELECT p.id,p.node_id FROM radar_posts p LEFT JOIN radar_nodes n ON n.id=p.node_id WHERE p.node_id IS NOT NULL AND n.id IS NULL"),
    ("C3 perfiles de radar de usuario inexistente",
     "SELECT rp.user_id FROM radar_profiles rp LEFT JOIN users u ON u.id=rp.user_id WHERE u.id IS NULL"),
    ("C4 descubrimientos huerfanos",
     "SELECT d.id FROM radar_discoveries d LEFT JOIN users u ON u.id=d.user_id LEFT JOIN radar_nodes n ON n.id=d.node_id WHERE u.id IS NULL OR n.id IS NULL"),
    ("C5 reacciones/comentarios huerfanos",
     "SELECT 'reaccion' t, r.id FROM radar_reactions r LEFT JOIN users u ON u.id=r.user_id WHERE u.id IS NULL UNION ALL SELECT 'comentario', c.id FROM radar_comments c LEFT JOIN users u ON u.id=c.user_id WHERE u.id IS NULL"),
    ("C6 XP del perfil vs suma de descubrimientos",
     "SELECT u.email, rp.xp, COALESCE(SUM(d.xp_awarded),0) xp_desc FROM radar_profiles rp JOIN users u ON u.id=rp.user_id LEFT JOIN radar_discoveries d ON d.user_id=rp.user_id GROUP BY u.email, rp.xp HAVING rp.xp <> COALESCE(SUM(d.xp_awarded),0)"),
    ("C7 insignias otorgadas huerfanas",
     "SELECT ub.user_id, ub.badge_id FROM radar_user_badges ub LEFT JOIN radar_badges b ON b.id=ub.badge_id LEFT JOIN users u ON u.id=ub.user_id WHERE b.id IS NULL OR u.id IS NULL"),
    ("C8 nodos publicados sin coordenadas (mapa)",
     "SELECT id,name FROM radar_nodes WHERE is_published=1 AND (latitude IS NULL OR longitude IS NULL OR latitude=0)"),
    ("C9 publicaciones aprobadas sin texto ni media",
     "SELECT id FROM radar_posts WHERE status='approved' AND (media_url IS NULL OR media_url='') AND (caption IS NULL OR TRIM(caption)='')"),
    ("D1 artistas del Planner que NO existen en el CRM",
     "SELECT pa.id,pa.name,pa.email FROM planner_artists pa LEFT JOIN users u ON LOWER(u.email)=LOWER(pa.email) LEFT JOIN company_people cp ON LOWER(cp.email)=LOWER(pa.email) WHERE pa.email IS NOT NULL AND pa.email<>'' AND u.id IS NULL AND cp.id IS NULL"),
    ("D2 artistas del Planner duplicados por nombre",
     "SELECT LOWER(name) n, COUNT(*) c FROM planner_artists GROUP BY n HAVING c>1"),
    ("D3 directores del Planner que no son usuarios del CRM",
     "SELECT pd.name,pd.email,pd.authorized FROM planner_director_users pd LEFT JOIN users u ON LOWER(u.email)=LOWER(pd.email) WHERE u.id IS NULL"),
    ("E1 chat huerfano (emisor o compania inexistente)",
     "SELECT m.id FROM chat_messages m LEFT JOIN users u ON u.id=m.sender_id LEFT JOIN companies c ON c.id=m.company_id WHERE u.id IS NULL OR c.id IS NULL"),
    ("E2 solicitudes aceptadas que NO dieron membresia",
     "SELECT cr.id,cr.company_id FROM company_requests cr JOIN users u ON u.id=cr.user_id LEFT JOIN company_members cm ON cm.company_id=cr.company_id AND cm.user_id=cr.user_id WHERE cr.status='aceptada' AND cm.id IS NULL"),
    ("E3 solicitudes de acceso pendientes",
     "SELECT email, rol_pedido, estado FROM access_requests WHERE estado IS NULL OR estado='pendiente'"),
]


def credenciales():
    g = subprocess.run(
        ['gcloud', 'run', 'services', 'describe', 'atha-crm-web-frontend',
         '--region', 'us-central1', '--project', 'athamubot', '--format=json'],
        capture_output=True, text=True)
    env = {e['name']: e.get('value', '') for e in
           json.loads(g.stdout)['spec']['template']['spec']['containers'][0].get('env', [])}
    e = dict(os.environ)
    e.update({'DB_HOST': env.get('DB_HOST', ''), 'DB_PORT': str(env.get('DB_PORT', '3306')),
              'DB_USER': env.get('DB_USER', ''), 'DB_PASSWORD': env.get('DB_PASSWORD', ''),
              'DB_NAME': env.get('DB_NAME', 'admin_crm')})
    return e


NODE = """
const mysql = require('mysql2/promise');
const checks = JSON.parse(process.argv[1]);
(async () => {
  const c = await mysql.createConnection({host:process.env.DB_HOST,port:+process.env.DB_PORT,
    user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:15000});
  let problemas = 0;
  for (const [label, sql] of checks) {
    try {
      const [r] = await c.query(sql);
      const informativo = label.startsWith('i)');
      if (r.length === 0) { console.log('  OK    ' + label); continue; }
      if (!informativo) problemas++;
      console.log((informativo ? '  INFO  ' : '  ATENC ') + label + '  -> ' + r.length + ' fila(s)');
      for (const row of r.slice(0, 5)) console.log('          ' + JSON.stringify(row));
    } catch (e) { console.log('  ERR   ' + label + ' -> ' + e.message.slice(0, 110)); }
  }
  console.log('');
  console.log('CHEQUEOS CON HALLAZGOS: ' + problemas + ' de ' + checks.length);
  await c.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
"""

if __name__ == '__main__':
    print('=== AUDITORIA DE CONSISTENCIA (CRM / radar-app / Planner) ===')
    print('(leido directo de la base del hub)\n')
    p = subprocess.run(['node', '-e', NODE, json.dumps(CHECKS)], cwd=WS,
                       env=credenciales(), capture_output=True, text=True, timeout=300)
    print(p.stdout.strip() or p.stderr.strip())
