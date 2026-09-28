#!/usr/bin/env python3
"""
Montajes (segunda pasada, con una OBRA DE PRUEBA para poder probar el vínculo de verdad):
crea la obra, la vincula a la agrupación de prueba, verifica, desvincula y la borra.
"""
import json
import urllib.error
import urllib.request

B = 'http://localhost:8099'
EMAIL = 'panxo.sms@gmail.com'
COMP = '__COMP__'
ok = fallos = 0


def pedir(ruta, metodo='GET', cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(B + ruta, data=datos, method=metodo,
                                 headers={'Content-Type': 'application/json', 'x-atha-email': EMAIL})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}


def check(n, c, d=''):
    global ok, fallos
    if c:
        ok += 1; print('  ✓', n)
    else:
        fallos += 1; print('  ✗', n, d)


print('--- el catálogo ahora dice de quién es cada obra ---')
est, cat = pedir('/api/v1/crm/portfolio/projects')
obras = cat.get('projects') or cat.get('data') or []
con_dueño = [o for o in obras if o.get('company_id')]
libres = [o for o in obras if not o.get('company_id')]
print(f'    13 esperadas → {len(obras)} obras · con agrupación: {len(con_dueño)} · sin agrupación: {len(libres)}')
check('el catálogo informa company_id/company_name', all('company_id' in o for o in obras))
check('hay obras asignadas a agrupaciones', len(con_dueño) >= 8, str(len(con_dueño)))
if con_dueño:
    print(f'    ej: «{con_dueño[0]["title"]}» → {con_dueño[0]["company_name"]}')

print('\n--- obra de prueba: crear → vincular → desvincular → borrar ---')
est, d = pedir('/api/v1/crm/portfolio/projects', 'POST', {'title': 'OBRA DE PRUEBA BETA1 (borrar)', 'discipline': 'Prueba', 'companyId': None})
obra_id = (d.get('data') or d.get('project') or {}).get('id') or d.get('id')
print('    obra:', obra_id, '·', est, str(d)[:100])
check('se crea la obra de prueba', bool(obra_id), str(d)[:140])

if obra_id:
    est, d = pedir(f'/api/v1/crm/companies/{COMP}/projects', 'POST', {'projectId': obra_id})
    check('vincular la obra a la agrupación', est == 200 and d.get('success'), str(d)[:130])
    est, d = pedir('/api/v1/crm/companies')
    comp = [c for c in d['companies'] if c['id'] == COMP][0]
    check('aparece como montaje de la agrupación', any(x['id'] == obra_id for x in comp['obras']), str(comp['obras'])[:120])
    est, d = pedir(f'/api/v1/crm/companies/{COMP}/projects/{obra_id}', 'DELETE')
    check('desvincular', est == 200 and d.get('success'), str(d)[:110])
    est, cat2 = pedir('/api/v1/crm/portfolio/projects')
    obra = [o for o in (cat2.get('projects') or cat2.get('data') or []) if o['id'] == obra_id]
    check('la obra sigue en el catálogo, sin agrupación', bool(obra) and not obra[0].get('company_id'), str(obra)[:120])
    est, d = pedir(f'/api/v1/crm/portfolio/projects/{obra_id}', 'DELETE')
    check('borrar la obra de prueba', est in (200, 204), str(d)[:90])

print(f'\nRESULTADO montajes: {ok} ok · {fallos} fallos')
print('OBRA_PRUEBA=' + str(obra_id))
