#!/usr/bin/env python3
"""Muestra las inscripciones a la prueba piloto (endpoint de administracion del hub).

Uso:  python3 scripts/ver_inscripciones_piloto.py [email-admin]
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
ADMIN = sys.argv[1] if len(sys.argv) > 1 else 'panxo.sms@gmail.com'


def main():
    req = urllib.request.Request(
        HUB + '/api/v1/crm/piloto/inscripciones',
        headers={'x-atha-email': ADMIN},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        print('el hub respondió', e.code, e.read().decode()[:300])
        print(f'(la lista la ve administración; probá con otro correo admin que {ADMIN})')
        return
    print('=== INSCRIPCIONES A LA PRUEBA PILOTO ===')
    print('total:', d.get('total', 0))
    print('por compañía:', json.dumps(d.get('por_compania', {}), ensure_ascii=False))
    print()
    for i, x in enumerate(d.get('inscripciones', []), 1):
        print(f"{i:2}. {x.get('nombre')} <{x.get('email')}>")
        detalle = []
        if x.get('telefono'):
            detalle.append('tel ' + x['telefono'])
        if x.get('company_name'):
            detalle.append(x['company_name'])
        if x.get('rol'):
            detalle.append('rol ' + x['rol'])
        if x.get('dispositivo'):
            detalle.append(x['dispositivo'])
        if detalle:
            print('     ' + ' · '.join(detalle))
        if x.get('disponibilidad'):
            print('     disponible: ' + x['disponibilidad'])
        if x.get('comentario'):
            print('     comentario: ' + x['comentario'])
        print(f"     estado: {x.get('estado')} · anotado {str(x.get('created_at'))[:16]}")
    if not d.get('inscripciones'):
        print('(todavía no se anotó nadie)')


if __name__ == '__main__':
    main()
