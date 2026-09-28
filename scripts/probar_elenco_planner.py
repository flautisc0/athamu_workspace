#!/usr/bin/env python3
"""
Batería · Tandas B y C: elenco de una obra con cuentas de la plataforma + montaje para el Planner.

Uso:
    python3 scripts/probar_elenco_planner.py --base=http://localhost:8099
    python3 scripts/probar_elenco_planner.py --base=https://<url-del-tag>

Qué comprueba:
  1 · elenco: inscribir una persona REAL de una compañía registrada → listar → editar rol/personaje →
      quitar; persona que no está en ninguna compañía → 400; rol inválido → 400; sin permiso → 403;
      vinculación automática de la cuenta cuando el correo ya existe en `users`.
  2 · invitación: se manda al buzón del agente (NUNCA a un tercero) y responde ok.
  3 · montaje del Planner: 200 con elenco y funciones, 404 con obra inexistente, 403 sin permiso.

Nunca toca datos reales: crea su propia obra de prueba y la borra al final (aunque falle).
"""
import argparse
import base64
import json
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://localhost:8099')
parser.add_argument('--admin', default='panxo.sms@gmail.com')
parser.add_argument('--buzon', default='fase.athamu@gmail.com', help='buzón del agente para probar el correo')
parser.add_argument('--correo', action='store_true', help='manda la invitación de prueba (al buzón del agente)')
ARGS = parser.parse_args()
B = ARGS.base.rstrip('/')
TITULO = 'PRUEBA elenco y planner (se borra sola)'

ok = fallos = 0
fallas = []


def pedir(ruta, metodo='GET', cuerpo=None, email=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    cab = {'Content-Type': 'application/json'}
    if email:
        cab['x-atha-email'] = email
    req = urllib.request.Request(B + ruta, data=datos, method=metodo, headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}


def comprobar(nombre, condicion, detalle=''):
    global ok, fallos
    if condicion:
        ok += 1
        print(f'  ✓ {nombre}')
    else:
        fallos += 1
        fallas.append(f'{nombre} · {detalle}')
        print(f'  ✗ {nombre} · {detalle}')


ADMIN = ARGS.admin
obra_id = None
filas_creadas = []

try:
    print('=== preparación ===')
    est, comps = pedir('/api/v1/crm/companies', email=ADMIN)
    lista = comps.get('companies') or []
    comprobar('la lista de agrupaciones trae nóminas', est == 200 and any(c.get('people') for c in lista),
              f'HTTP {est} · {len(lista)} agrupaciones')
    con_gente = [c for c in lista if c.get('people')]
    compania = con_gente[0]
    persona = compania['people'][0]
    print(f"    usando: {persona['fullName']} (de {compania['name']})")

    est, d = pedir('/api/v1/crm/portfolio/projects', 'POST',
                   {'title': TITULO, 'synopsis': 'Obra de prueba de la batería.', 'discipline': 'Teatro',
                    'category': 'teatro', 'status': 'En repertorio'}, email=ADMIN)
    obra_id = (d.get('data') or d.get('project') or {}).get('id') or d.get('id')
    comprobar('la obra de prueba se creó', bool(obra_id), str(d)[:140])

    print('\n=== 1 · elenco de la obra ===')
    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', 'POST',
                   {'displayName': persona['fullName'], 'email': persona.get('email') or '',
                    'role': 'elenco', 'personaje': 'Personaje de prueba'}, email=ADMIN)
    comprobar('inscribir a una persona de una compañía registrada', est == 200 and (d.get('ok') is not False),
              f'HTTP {est} · {str(d)[:140]}')
    cast_id = ((d.get('cast') or d.get('data') or d.get('member') or {}) or {}).get('id')
    if cast_id:
        filas_creadas.append(cast_id)

    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', email=ADMIN)
    elenco = d.get('cast') or d.get('data') or []
    comprobar('el elenco se lista con rol y personaje',
              est == 200 and any((x.get('displayName') == persona['fullName'] and
                                  x.get('role') == 'elenco' and
                                  (x.get('personaje') or x.get('title')) == 'Personaje de prueba') for x in elenco),
              f'HTTP {est} · {str(elenco)[:180]}')

    if cast_id:
        est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast/{cast_id}', 'PUT',
                       {'role': 'direccion', 'personaje': 'Dirección'}, email=ADMIN)
        comprobar('editar rol y personaje', est == 200 and (d.get('ok') is not False), f'HTTP {est} · {str(d)[:120]}')
        est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', email=ADMIN)
        elenco = d.get('cast') or d.get('data') or []
        comprobar('el rol quedó actualizado',
                  any((x.get('role') == 'direccion') for x in elenco), str(elenco)[:160])

    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', 'POST',
                   {'displayName': 'Persona Que No Existe En Ninguna Compañía', 'role': 'elenco'}, email=ADMIN)
    comprobar('persona fuera de toda compañía → 400', est == 400, f'HTTP {est} · {str(d)[:160]}')

    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', 'POST',
                   {'displayName': persona['fullName'], 'role': 'rey'}, email=ADMIN)
    comprobar('rol inválido → 400', est == 400, f'HTTP {est} · {str(d)[:120]}')

    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', 'POST',
                   {'displayName': persona['fullName'], 'role': 'elenco'}, email='nadie@example.com')
    comprobar('sin permiso → 403', est == 403, f'HTTP {est} · {str(d)[:120]}')

    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', 'POST',
                   {'displayName': persona['fullName'], 'email': 'flautisco.contacto@gmail.com',
                    'role': 'elenco'}, email=ADMIN)
    vinculado = ((d.get('cast') or d.get('data') or d.get('member') or {}) or {})
    cuenta = vinculado.get('cuenta') or vinculado.get('user') or vinculado.get('user_id')
    comprobar('la cuenta se vincula sola si el correo ya existe',
              est == 200 and bool(cuenta), f'HTTP {est} · {str(d)[:180]}')
    if vinculado.get('id'):
        filas_creadas.append(vinculado['id'])

    print('\n=== 2 · invitación (al buzón del agente) ===')
    objetivo = filas_creadas[0] if filas_creadas else cast_id
    if objetivo and ARGS.correo:
        est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast/{objetivo}/invitar', 'POST',
                       {'para': ARGS.buzon}, email=ADMIN)
        comprobar('la invitación responde ok', est == 200 and (d.get('ok') is not False),
                  f'HTTP {est} · {str(d)[:140]}')
    else:
        print('    (saltada: se manda sólo con --correo, y siempre al buzón del agente)')

    print('\n=== 3 · montaje para el Planner ===')
    est, d = pedir('/api/v1/crm/portfolio/projects', email=ADMIN)
    obras = (d.get('projects') or d.get('data') or [])
    real = obras[0]['id'] if obras else None
    est, d = pedir(f'/api/v1/crm/planner/montaje/{real}', email=ADMIN)
    m = d.get('montaje') or {}
    comprobar('el montaje responde 200 con la ficha', est == 200 and bool(m.get('title')),
              f'HTTP {est} · {str(d)[:160]}')
    comprobar('el montaje trae elenco y funciones',
              isinstance(m.get('elenco'), list) and isinstance(m.get('funciones'), list),
              f"elenco={type(m.get('elenco')).__name__} funciones={type(m.get('funciones')).__name__}")
    comprobar('el montaje trae la compañía con logo',
              isinstance(m.get('compania'), dict) and 'logo' in m['compania'], str(m.get('compania'))[:120])
    est, d = pedir('/api/v1/crm/planner/montaje/no-existe-999', email=ADMIN)
    comprobar('obra inexistente → 404', est == 404, f'HTTP {est}')
    est, d = pedir(f'/api/v1/crm/planner/montaje/{real}', email='nadie@example.com')
    comprobar('sin permiso → 403', est in (401, 403), f'HTTP {est}')

finally:
    print('\n=== limpieza ===')
    if obra_id:
        for cid in set(filas_creadas):
            pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast/{cid}', 'DELETE', email=ADMIN)
        est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}/cast', email=ADMIN)
        for x in (d.get('cast') or d.get('data') or []):
            pedir(f"/api/v1/crm/portfolio/projects/{obra_id}/cast/{x['id']}", 'DELETE', email=ADMIN)
        est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}', 'DELETE', email=ADMIN)
        comprobar('la obra de prueba se borró', est in (200, 404), f'HTTP {est}')
        est, d = pedir(f'/api/v1/crm/planner/montaje/{obra_id}', email=ADMIN)
        comprobar('y su montaje ya no existe', est == 404, f'HTTP {est}')

print(f'\nRESULTADO: {ok} ok · {fallos} fallos')
if fallas:
    print('FALLAS:')
    for f in fallas:
        print(' -', f)
raise SystemExit(1 if fallos else 0)
