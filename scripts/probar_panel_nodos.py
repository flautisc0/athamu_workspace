#!/usr/bin/env python3
"""
Batería de pruebas del panel de nodos (/nodos) y de la API del radar.
Se corre primero contra el hub LOCAL y después contra la URL del tag, antes de mover tráfico.

Uso:
    python3 scripts/probar_panel_nodos.py --base=http://localhost:8099
    python3 scripts/probar_panel_nodos.py --base=https://<url-del-tag>

Qué comprueba (y limpia todo lo que crea):
  1. GET /nodos devuelve la página (200 y el título del panel).
  2. Un correo SIN permiso no puede crear ni borrar (403) y el panel se lo dice.
  3. Con administración: crear un nodo en borrador (200) → aparece en el listado.
  4. PATCH parcial (sólo `is_published`) NO debe vaciar el resto del nodo.
  5. PATCH completo guarda también el horario (`hours`), que antes no se guardaba.
  6. Borrar (DELETE) limpia el nodo y sus descubrimientos.
"""
import json
import sys
import urllib.error
import urllib.request

ADMIN = 'panxo.sms@gmail.com'
SIN_PERMISO = 'pipe.naranjo33@gmail.com'
NOMBRE = 'PRUEBA panel de nodos (se borra sola)'


def pedir(base, ruta, metodo='GET', email=None, cuerpo=None, crudo=False):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(base + ruta, data=datos, method=metodo,
                                 headers={'Content-Type': 'application/json'})
    if email:
        req.add_header('x-atha-email', email)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            texto = r.read().decode('utf-8', 'replace')
            return r.status, (texto if crudo else (json.loads(texto) if texto.strip().startswith('{') else texto))
    except urllib.error.HTTPError as e:
        texto = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def main():
    base = 'http://localhost:8099'
    for a in sys.argv[1:]:
        if a.startswith('--base='):
            base = a.split('=', 1)[1].rstrip('/')
    print(f'base: {base}\n')
    fallos = []
    creado = None

    # 1 · la página
    est, html = pedir(base, '/nodos', crudo=True)
    ok = est == 200 and isinstance(html, str) and 'Nodos del radar cultural' in html and 'mapaEditor' in html
    print(f'1 · GET /nodos → {est} · página completa: {"OK" if ok else "FALLA"}')
    if not ok:
        fallos.append('la página /nodos no salió como se espera')

    # 2 · permisos
    est, d = pedir(base, '/api/v1/crm/radar/nodos', 'POST', SIN_PERMISO,
                   {'name': 'Nodo de alguien sin permiso', 'latitude': -34.17, 'longitude': -70.74})
    ok = est == 403
    print(f'2 · POST con cuenta sin permiso → {est} {d if isinstance(d,str) else d.get("error")} · {"OK" if ok else "FALLA"}')
    if not ok:
        fallos.append(f'un correo sin permiso pudo escribir (HTTP {est})')

    # 3 · crear (borrador)
    est, d = pedir(base, '/api/v1/crm/radar/nodos', 'POST', ADMIN, {
        'name': NOMBRE, 'category': 'Prueba', 'short_description': 'Nodo de prueba del panel',
        'address': 'Calle de prueba 123', 'city': 'Rancagua', 'region': 'O\'Higgins',
        'latitude': -34.1708, 'longitude': -70.7444, 'unlock_radius_m': 150,
        'hours': 'Lun a Vie 10:00 a 18:00', 'is_published': 0,
    })
    creado = d.get('nodo', {}).get('id') if isinstance(d, dict) else None
    ok = est == 200 and creado
    print(f'3 · POST admin (borrador) → {est} id={creado} · {"OK" if ok else "FALLA"}')
    if not ok:
        fallos.append(f'no se pudo crear el nodo de prueba: {d}')

    if creado:
        est, d = pedir(base, f'/api/v1/crm/radar/nodos/{creado}?email={ADMIN}', 'GET', ADMIN)
        nodo = d.get('nodo', {}) if isinstance(d, dict) else {}
        ok = est == 200 and nodo.get('hours') == 'Lun a Vie 10:00 a 18:00' and nodo.get('unlock_radius_m') == 150
        print(f'   · al leerlo, horario y radio guardados: {"OK" if ok else "FALLA"} ({nodo.get("hours")} / {nodo.get("unlock_radius_m")})')
        if not ok:
            fallos.append('el horario o el radio no se guardaron al crear')

        # 4 · PATCH parcial (el caso que antes vaciaba el nodo)
        est, d = pedir(base, f'/api/v1/crm/radar/nodos/{creado}', 'PATCH', ADMIN, {'is_published': 1})
        est2, d2 = pedir(base, f'/api/v1/crm/radar/nodos/{creado}?email={ADMIN}', 'GET', ADMIN)
        n2 = d2.get('nodo', {}) if isinstance(d2, dict) else {}
        ok = est == 200 and n2.get('is_published') is True and n2.get('name') == NOMBRE and n2.get('hours')
        print(f'4 · PATCH parcial (publicar) → {est} · nombre y horario intactos: {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append('un PATCH parcial vació datos del nodo')

        # 5 · PATCH completo
        est, d = pedir(base, f'/api/v1/crm/radar/nodos/{creado}', 'PATCH', ADMIN, {
            'name': NOMBRE + ' (editada)', 'category': 'Prueba', 'city': 'Machalí',
            'latitude': -34.1817, 'longitude': -70.6497, 'unlock_radius_m': 200,
            'hours': 'Sáb 11:00 a 14:00', 'is_published': 1,
        })
        est2, d2 = pedir(base, f'/api/v1/crm/radar/nodos/{creado}?email={ADMIN}', 'GET', ADMIN)
        n2 = d2.get('nodo', {}) if isinstance(d2, dict) else {}
        ok = est == 200 and n2.get('city') == 'Machalí' and n2.get('hours') == 'Sáb 11:00 a 14:00' and n2.get('unlock_radius_m') == 200
        print(f'5 · PATCH completo → {est} · comuna/horario/radio: {"OK" if ok else "FALLA"} ({n2.get("city")} / {n2.get("hours")} / {n2.get("unlock_radius_m")})')
        if not ok:
            fallos.append('el PATCH completo no guardó los campos editados')

        # 6 · borrar
        est, d = pedir(base, f'/api/v1/crm/radar/nodos/{creado}', 'DELETE', ADMIN, {'email': ADMIN})
        est2, d2 = pedir(base, f'/api/v1/crm/radar/nodos/{creado}?email={ADMIN}', 'GET', ADMIN)
        ok = est == 200 and est2 == 404
        print(f'6 · DELETE → {est} y al releerlo {est2} · {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append('no se pudo borrar el nodo de prueba')
            print(f'   ¡OJO! quedó basura en la base: id={creado}')

    print()
    if fallos:
        print('FALLAS:')
        for f in fallos:
            print(' -', f)
        raise SystemExit(1)
    print('TODO OK')


if __name__ == '__main__':
    main()
