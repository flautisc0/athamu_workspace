#!/usr/bin/env python3
"""Bateria del permiso de editores del radar (radar_editores).

Comprueba que el permiso sea acotado y no una puerta abierta:
  - Felipe (autorizado) puede crear, editar y borrar lugares.
  - Una cuenta comun recibe 403 en las tres.
  - Sin sesion tambien 403.
  - El feed informa puede_editar_radar segun la cuenta.
Todo lo que crea lo borra en la misma corrida.

Uso:  python3 scripts/probar_editores_radar.py --base=http://localhost:8099
"""
import argparse
import json
import urllib.error
import urllib.request

PIPE = 'pipe.naranjo33@gmail.com'
OTRO = 'flautisco.contacto@gmail.com'   # cuenta de artista: NO debe poder


def pedir(base, ruta, metodo='GET', cuerpo=None, email=''):
    url = base.rstrip('/') + ruta
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(url, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if email:
        req.add_header('x-atha-email', email)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {'error': str(e)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    a = ap.parse_args()
    base = a.base
    ok = fallos = 0

    def check(nombre, cond, detalle=''):
        nonlocal ok, fallos
        if cond:
            ok += 1
            print(f'  ok    {nombre}')
        else:
            fallos += 1
            print(f'  FALLA {nombre} {detalle}')

    print(f'== {base} ==')

    # 1. El feed dice el permiso de cada cuenta
    _, f_pipe = pedir(base, f'/api/v1/crm/radar/feed?limite=1&email={PIPE}')
    check('feed: Felipe puede editar lugares', f_pipe.get('puede_editar_radar') is True, f_pipe.get('puede_editar_radar'))
    _, f_otro = pedir(base, f'/api/v1/crm/radar/feed?limite=1&email={OTRO}')
    check('feed: cuenta comun NO puede', f_otro.get('puede_editar_radar') is False, f_otro.get('puede_editar_radar'))
    _, f_nadie = pedir(base, '/api/v1/crm/radar/feed?limite=1')
    check('feed: sin sesion NO puede', f_nadie.get('puede_editar_radar') in (False, None), f_nadie.get('puede_editar_radar'))

    # 2. Cuenta comun: 403 en crear, editar y borrar
    st, _ = pedir(base, '/api/v1/crm/radar/nodos', 'POST',
                  {'name': 'PRUEBA permiso (no deberia existir)', 'email': OTRO}, OTRO)
    check('crear: cuenta comun recibe 403', st == 403, f'HTTP {st}')
    st, _ = pedir(base, '/api/v1/crm/radar/nodos/nd_inexistente', 'PATCH', {'name': 'x'}, OTRO)
    check('editar: cuenta comun recibe 403', st == 403, f'HTTP {st}')
    st, _ = pedir(base, '/api/v1/crm/radar/nodos/nd_inexistente', 'DELETE', {'email': OTRO}, OTRO)
    check('borrar: cuenta comun recibe 403', st == 403, f'HTTP {st}')

    # 3. Sin sesion: 403
    st, _ = pedir(base, '/api/v1/crm/radar/nodos', 'POST', {'name': 'PRUEBA sin sesion'})
    check('crear: sin sesion recibe 403', st == 403, f'HTTP {st}')

    # 4. Felipe: crear -> editar -> borrar
    st, r = pedir(base, '/api/v1/crm/radar/nodos', 'POST', {
        'name': 'PRUEBA editores radar (borrar)', 'short_description': 'prueba automatica',
        'category': 'Prueba', 'latitude': -33.44, 'longitude': -70.67,
        'address': 'calle de prueba 1', 'city': 'Rancagua', 'unlock_radius_m': 120,
        'is_published': 0, 'email': PIPE, 'hours': 'Lun a Vie 10:00-18:00',
    }, PIPE)
    nuevo = (r.get('nodo') or {}).get('id')
    check('crear: Felipe puede', st == 200 and bool(nuevo), f'HTTP {st} {r.get("error", "")}')

    if nuevo:
        st, _ = pedir(base, f'/api/v1/crm/radar/nodos/{nuevo}', 'PATCH',
                      {'short_description': 'prueba editada', 'email': PIPE}, PIPE)
        check('editar: Felipe puede', st == 200, f'HTTP {st}')
        _, leido = pedir(base, f'/api/v1/crm/radar/nodos/{nuevo}')
        check('editar: el cambio quedo guardado',
              (leido.get('nodo') or {}).get('short_description') == 'prueba editada',
              (leido.get('nodo') or {}).get('short_description'))
        st, _ = pedir(base, f'/api/v1/crm/radar/nodos/{nuevo}/', 'PATCH', {'is_published': 1, 'email': PIPE}, PIPE) if False else (0, {})
        st, _ = pedir(base, f'/api/v1/crm/radar/nodos/{nuevo}', 'PATCH', {'is_published': 1, 'email': PIPE}, PIPE)
        check('publicar: Felipe puede', st == 200, f'HTTP {st}')
        st, _ = pedir(base, f'/api/v1/crm/radar/nodos/{nuevo}', 'DELETE', {'email': PIPE}, PIPE)
        check('borrar: Felipe puede', st == 200, f'HTTP {st}')
        st, _ = pedir(base, f'/api/v1/crm/radar/nodos/{nuevo}')
        check('borrar: el lugar ya no existe', st == 404, f'HTTP {st}')

    print(f'\n== {ok} ok · {fallos} fallos ==')
    raise SystemExit(1 if fallos else 0)


if __name__ == '__main__':
    main()
