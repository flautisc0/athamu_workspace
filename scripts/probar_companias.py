#!/usr/bin/env python3
"""
Batería de /companias: la agrupación se edita de verdad (datos, elenco y montajes del catálogo).
Crea una agrupación de PRUEBA y la borra al final: no toca las reales.
"""
import json
import time
import urllib.error
import urllib.request

B = 'http://localhost:8099'
EMAIL = 'panxo.sms@gmail.com'
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


def check(nombre, condicion, detalle=''):
    global ok, fallos
    if condicion:
        ok += 1
        print(f'  ✓ {nombre}')
    else:
        fallos += 1
        print(f'  ✗ {nombre} {detalle}')


print('--- 0 · la página y la lista ---')
with urllib.request.urlopen(B + '/companias', timeout=40) as r:
    pagina = r.read().decode()
check('página /companias responde', r.status == 200)
for t in ('Guardar cambios', 'Montajes (obras del catálogo)', 'Elenco y equipo', 'Vincular obra del catálogo'):
    check(f'la página tiene «{t}»', t in pagina)

est, d = pedir('/api/v1/crm/companies')
check('la lista de agrupaciones viene con datos', est == 200 and len(d.get('companies', [])) >= 11)
primera = d['companies'][0]
check('cada agrupación trae descripción, elenco y montajes',
      all(k in primera for k in ('description', 'people', 'obras')),
      str(list(primera.keys())[:8]))
print(f'    (ej: {primera["name"]} · {len(primera["obras"])} montaje(s) · {len(primera["people"])} persona(s))')

# El nombre lleva la hora: `companies.name` es único y, si se repite, la corrida anterior
# hacía fallar esta («Duplicate entry») sin que hubiera nada roto.
NOMBRE_PRUEBA = f'PRUEBA BETA1 {int(time.time())} (borrar)'
print('\n--- 1 · crear agrupación de prueba ---')
est, d = pedir('/api/v1/crm/companies', 'POST', {'name': NOMBRE_PRUEBA, 'discipline': 'Prueba', 'description': 'sin descripción'})
check('se crea', est == 200 and d.get('success'), str(d)[:120])
comp_id = (d.get('data') or {}).get('id')
print('    id de prueba:', comp_id)

print('\n--- 2 · editar TODOS los datos (PUT) ---')
est, d = pedir(f'/api/v1/crm/companies/{comp_id}', 'PUT', {
    'name': 'PRUEBA BETA1 (borrar)', 'legalName': 'Prueba SpA', 'discipline': 'Teatro & prueba',
    'kind': 'colaboradora', 'city': 'Rancagua', 'contactEmail': 'prueba@example.com',
    'status': 'active', 'description': 'Descripción editada desde el CRM para la prueba de Beta 1.',
})
check('PUT responde ok', est == 200 and d.get('success'), str(d)[:140])
est, d = pedir('/api/v1/crm/companies')
comp = [c for c in d['companies'] if c['id'] == comp_id]
check('los datos quedaron guardados',
      bool(comp) and comp[0]['description'].startswith('Descripción editada') and comp[0]['legalName'] == 'Prueba SpA',
      str(comp[0] if comp else 'no está')[:140])

print('\n--- 3 · validaciones ---')
est, d = pedir(f'/api/v1/crm/companies/{comp_id}', 'PUT', {'name': '   '})
check('nombre vacío se rechaza', est == 400, str(d)[:80])
est, d = pedir(f'/api/v1/crm/companies/{comp_id}', 'PUT', {})
check('sin campos se rechaza', est == 400, str(d)[:80])
est, d = pedir('/api/v1/crm/companies/no-existe', 'PUT', {'description': 'x'})
check('agrupación inexistente → 404', est == 404, str(d)[:80])

print('\n--- 4 · elenco ---')
est, d = pedir(f'/api/v1/crm/companies/{comp_id}/people', 'POST', {'fullName': 'Persona de Prueba', 'roleTitle': 'Dirección', 'kind': 'elenco'})
check('agregar persona', est == 200 and d.get('success'), str(d)[:110])
persona_id = (d.get('data') or {}).get('id')
est, d = pedir(f'/api/v1/crm/companies/{comp_id}/people/{persona_id}', 'PUT', {'roleTitle': 'Dirección y dramaturgia', 'kind': 'socio'})
check('editar persona (rol y tipo)', est == 200 and d.get('success'), str(d)[:110])
est, d = pedir('/api/v1/crm/companies')
comp = [c for c in d['companies'] if c['id'] == comp_id][0]
p = [x for x in comp['people'] if x['id'] == persona_id]
check('la persona quedó con el rol nuevo', bool(p) and p[0]['roleTitle'] == 'Dirección y dramaturgia' and p[0]['kind'] == 'socio',
      str(p)[:140])

print('\n--- 5 · montajes contra el CATÁLOGO real ---')
est, d = pedir('/api/v1/crm/portfolio/projects')
obras = (d.get('projects') or d.get('data') or [])
check('el catálogo tiene obras', est == 200 and len(obras) >= 10, f'{len(obras)} obras')
ocupada = [o for o in obras if o.get('companyId') or o.get('company_id')]
libre = [o for o in obras if not (o.get('companyId') or o.get('company_id'))]
print(f'    obras en catálogo: {len(obras)} · ya asignadas: {len(ocupada)} · libres: {len(libre)}')
if libre:
    o = libre[0]
    est, d = pedir(f'/api/v1/crm/companies/{comp_id}/projects', 'POST', {'projectId': o['id']})
    check('vincular obra libre del catálogo', est == 200 and d.get('success'), str(d)[:120])
    est, d = pedir('/api/v1/crm/companies')
    comp = [c for c in d['companies'] if c['id'] == comp_id][0]
    check('la obra aparece como montaje', any(x['id'] == o['id'] for x in comp['obras']), str(comp['obras'])[:120])
    est, d = pedir(f'/api/v1/crm/companies/{comp_id}/projects/{o["id"]}', 'DELETE')
    check('desvincular el montaje', est == 200 and d.get('success'), str(d)[:110])
    est, d = pedir('/api/v1/crm/portfolio/projects')
    after = [x for x in (d.get('projects') or d.get('data') or []) if x['id'] == o['id']]
    check('la obra sigue en el catálogo (sin agrupación)',
          bool(after) and not (after[0].get('companyId') or after[0].get('company_id')), str(after)[:120])
if ocupada:
    o = ocupada[0]
    est, d = pedir(f'/api/v1/crm/companies/{comp_id}/projects', 'POST', {'projectId': o['id']})
    check('no se puede robar una obra de otra agrupación (409 + aviso)', est == 409, str(d)[:150])
    print('    mensaje:', d.get('error', '')[:110])
est, d = pedir(f'/api/v1/crm/companies/{comp_id}/projects', 'POST', {'projectId': 'no-existe'})
check('obra inexistente → 404', est == 404, str(d)[:90])

print(f'\nRESULTADO: {ok} ok · {fallos} fallos')
print('ID_PRUEBA=' + str(comp_id))

print('\n--- limpieza ---')
if comp_id:
    est, d = pedir(f'/api/v1/crm/companies/{comp_id}', 'DELETE')
    check('la agrupación de prueba se borró', est in (200, 404, 409), f'HTTP {est} · {str(d)[:120]}')
else:
    print('  (no se creó agrupación: nada que borrar)')
