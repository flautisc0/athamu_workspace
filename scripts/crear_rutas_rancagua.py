#!/usr/bin/env python3
"""
Rutas culturales REALES para el radar (las pestaña "Rutas" de la app estaba vacía).

Arma recorridos a pie con los nodos que YA están cargados en el CRM (nada inventado: cada
parada es un lugar real de OpenStreetMap y las distancias salen medidas desde la Plaza de
los Héroes). Idempotente: se puede correr de nuevo para actualizar las paradas.

Uso:
    python3 scripts/crear_rutas_rancagua.py                 # informe
    python3 scripts/crear_rutas_rancagua.py --enviar        # crea/actualiza en el hub
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
ADMIN = 'panxo.sms@gmail.com'

# id del nodo del CRM · texto de la parada (lo que se lee al llegar)
RUTAS = [
    {
        'id': 'rt_rancagua_centro',
        'name': 'Centro histórico de Rancagua',
        'description': 'Seis paradas alrededor de la Plaza de los Héroes: todo caminable en una tarde.',
        'city': 'Rancagua',
        'tags': ['a pie', 'patrimonio', '1,5 km'],
        'nodes': [
            ('nd_osm_466152536', 'El Orfeón de la plaza: el escenario al aire libre donde empieza todo.'),
            ('nd_osm_464455938', 'Museo Regional de Rancagua — Paseo del Estado 685, a 387 m de la plaza.'),
            ('nd_osm_487390856', 'Museo Patrimonial de la Merced, sobre la calle del Estado.'),
            ('nd_osm_464456702', 'Casa de la Cultura de Rancagua (Cachapoal 90): exposiciones, talleres y la cartelera municipal.'),
            ('nd_osm_475573086', 'Biblioteca Pública Eduardo de Geyter, al lado de la Casa de la Cultura.'),
            ('nd_osm_464456106', 'Teatro Regional Lucho Gatica (Millán 342): el escenario grande de la ciudad.'),
        ],
    },
    {
        'id': 'rt_rancagua_teatros',
        'name': 'Teatros de Rancagua',
        'description': 'Cuatro escenarios del centro: del más antiguo al regional, todos a menos de 700 m de la plaza.',
        'city': 'Rancagua',
        'tags': ['teatro', 'escenarios', '700 m'],
        'nodes': [
            ('nd_osm_11144364433', 'Teatro San Martín (Av. General José de San Martín 489) — el más cercano a la plaza: 208 m.'),
            ('nd_osm_466152536', 'Orfeón de la Plaza de los Héroes.'),
            ('nd_osm_564166962', 'Casa del Arte, sobre José Ignacio Ibieta.'),
            ('nd_osm_464456106', 'Teatro Regional Lucho Gatica — la meta: 634 m desde la plaza.'),
        ],
    },
    {
        'id': 'rt_rancagua_museos',
        'name': 'Museos y memoria',
        'description': 'Del centro de Rancagua a Machalí siguiendo museos: historia de la ciudad y su región.',
        'city': 'Rancagua',
        'tags': ['museos', 'memoria', 'en auto o bici'],
        'nodes': [
            ('nd_osm_464455938', 'Museo Regional de Rancagua.'),
            ('nd_osm_487390856', 'Museo Patrimonial de la Merced.'),
            ('nd_osm_481882147', 'Centro Español de Rancagua (El Quisco).'),
            ('nd_osm_13286187977', 'Museo Comunal de Machalí Rumel — cierre de la ruta, en Machalí.'),
        ],
    },
]


def main():
    enviar = '--enviar' in sys.argv
    for r in RUTAS:
        cuerpo = {
            'id': r['id'], 'name': r['name'], 'description': r['description'], 'city': r['city'],
            'tags': r['tags'], 'is_public': True, 'email': ADMIN,
            'nodes': [{'node_id': n, 'order_index': i, 'note': nota} for i, (n, nota) in enumerate(r['nodes'])],
        }
        print(f"· {r['name']}: {len(r['nodes'])} paradas ({r['city']})")
        for n, nota in r['nodes']:
            print(f"    {n} — {nota[:60]}")
        if not enviar:
            continue
        req = urllib.request.Request(f'{HUB}/api/v1/crm/radar/rutas', data=json.dumps(cuerpo).encode(),
                                     headers={'Content-Type': 'application/json', 'x-atha-email': ADMIN}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                print('    →', resp.status, resp.read().decode()[:160])
        except urllib.error.HTTPError as e:
            print('    → ERROR', e.code, e.read().decode()[:200])
    if not enviar:
        print('\n(informe: para crear/actualizar las rutas, --enviar)')


if __name__ == '__main__':
    main()
