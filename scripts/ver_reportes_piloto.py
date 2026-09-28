#!/usr/bin/env python3
"""Muestra los reportes que la gente manda desde el botón "Reportar algo" de la app.

Uso:  python3 scripts/ver_reportes_piloto.py [email-admin]
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
ADMIN = sys.argv[1] if len(sys.argv) > 1 else 'panxo.sms@gmail.com'

ETIQUETAS = {
    'no_funciona': 'NO FUNCIONA',
    'no_entiendo': 'NO ENTIENDE',
    'idea': 'IDEA',
    'otro': 'OTRO',
}


def main():
    req = urllib.request.Request(
        HUB + '/api/v1/crm/piloto/reportes',
        headers={'x-atha-email': ADMIN},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        print('el hub respondió', e.code, e.read().decode()[:300])
        print(f'(los reportes los ve administración; prueba con otro correo admin que {ADMIN})')
        return

    print('=== REPORTES DE LA PRUEBA ===')
    print('total:', d.get('total', 0))
    print('por tipo:', json.dumps(d.get('por_categoria', {}), ensure_ascii=False))
    print('por pantalla:', json.dumps(d.get('por_pantalla', {}), ensure_ascii=False))
    print()
    for i, x in enumerate(d.get('reportes', []), 1):
        tipo = ETIQUETAS.get(x.get('categoria'), x.get('categoria') or '?')
        print(f"{i:2}. [{tipo}] {x.get('nombre') or '(sin nombre)'} <{x.get('email') or 'sin sesión'}>")
        print(f"     pantalla: {x.get('pantalla') or '?'} · v{x.get('version') or '?'} · {x.get('plataforma') or '?'}")
        print('     ' + (x.get('texto') or '').replace('\n', '\n     '))
        if x.get('imagen_url'):
            print('     captura: ' + x['imagen_url'])
        print(f"     estado: {x.get('estado')} · {str(x.get('created_at'))[:16]}")
        print()
    if not d.get('reportes'):
        print('(todavía no hay reportes)')


if __name__ == '__main__':
    main()
