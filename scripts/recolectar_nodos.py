#!/usr/bin/env python3
"""
Recolector de espacios culturales REALES desde OpenStreetMap (Overpass).

Sin API key y sin dependencias (stdlib). Una sola consulta por zona (unión de
todos los filtros), así no son 78 pedidos: son tantos como zonas.

Uso:
    python3 scripts/recolectar_nodos.py                        # zonas de Santiago (informe)
    python3 scripts/recolectar_nodos.py --grupo=rancagua       # zonas de Rancagua
    python3 scripts/recolectar_nodos.py --grupo=rancagua --guardar --salida=/tmp/nodos_rancagua.json

Los nodos que salen de aquí entran al CRM con `scripts/nodos_reales.cjs --archivo=<ruta> --insertar`.
El JSON es lo que se cosecha de OSM (nombre, tipo, coordenadas, horarios, web); la comuna,
la dirección exacta y la foto las completa `nodos_reales.cjs` contra Nominatim/Wikipedia.
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter

UA = 'ATHAMU-FASE/1.0 (radar cultural; fase.athamu@gmail.com)'
ESPEJOS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

# (grupo, nombre de la zona, lat, lng, radio en metros)
ZONAS = [
    # --- Santiago (piloto original) ---
    ('santiago', 'Centro de Santiago', -33.4372, -70.6506, 2200),
    ('santiago', 'Barrio Lastarria / Bellas Artes', -33.4387, -70.6430, 1300),
    ('santiago', 'Barrio Italia', -33.4450, -70.6300, 1300),
    ('santiago', 'Providencia', -33.4280, -70.6180, 2000),
    ('santiago', 'Ñuñoa', -33.4560, -70.6000, 1800),
    ('santiago', 'Quilicura', -33.3600, -70.7100, 4000),
    # --- Rancagua (O'Higgins) · para el piloto de Felipe Naranjo ---
    ('rancagua', 'Rancagua centro (Plaza de los Héroes)', -34.1708, -70.7444, 2000),
    ('rancagua', 'Rancagua norte (Alameda / Miguel Ramírez)', -34.1570, -70.7400, 1500),
    ('rancagua', 'Rancagua oriente (Av. España / Del Libertador)', -34.1720, -70.7250, 1500),
    ('rancagua', 'Rancagua sur (Estación / Barrio Norte Sur)', -34.1840, -70.7480, 1500),
    ('rancagua', 'Machalí', -34.1817, -70.6497, 2000),
]

# Filtros de OSM (sin `historic=monument`: es enorme y ruidoso).
FILTROS = [
    'nwr["amenity"="theatre"]',
    'nwr["amenity"="cinema"]',
    'nwr["tourism"="museum"]',
    'nwr["tourism"="gallery"]',
    'nwr["shop"="art"]',
    'nwr["amenity"="arts_centre"]',
    'nwr["amenity"="community_centre"]',
    'nwr["amenity"="library"]',
    'nwr["amenity"="music_venue"]',
    'nwr["amenity"="events_venue"]',
    'nwr["leisure"="cultural_centre"]',
]


def categoria(t):
    """Traduce los tags reales de OSM a las categorías que usa la app."""
    if t.get('amenity') == 'theatre':
        return 'Teatro'
    if t.get('amenity') == 'events_venue':
        return 'Espacio Cultural'
    if t.get('amenity') == 'cinema':
        return 'Cine'
    if t.get('tourism') == 'museum':
        return 'Museo'
    if t.get('tourism') == 'gallery' or t.get('shop') == 'art':
        return 'Galería de Arte'
    if t.get('amenity') == 'arts_centre' or t.get('leisure') == 'cultural_centre':
        return 'Centro Cultural'
    if t.get('amenity') == 'library':
        return 'Biblioteca'
    if t.get('amenity') == 'music_venue':
        return 'Música'
    if t.get('amenity') == 'community_centre':
        sub = (t.get('community_centre') or '').lower()
        if sub in ('cultural', 'arts', 'theatre'):
            return 'Centro Cultural'
        return 'Centro Comunitario'
    return 'Espacio Cultural'


def zona(nombre_zona, lat, lng, radio):
    union = ''.join(f'{f}(around:{radio},{lat},{lng});' for f in FILTROS)
    q = f'[out:json][timeout:180];({union});out tags center 300;'
    for i in range(3):
        url = ESPEJOS[i % len(ESPEJOS)]
        try:
            datos = urllib.parse.urlencode({'data': q}).encode()
            req = urllib.request.Request(url, data=datos, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=240) as r:
                j = json.loads(r.read().decode())
            print(f'  {nombre_zona}: {len(j.get("elements", []))} elementos', flush=True)
            return j.get('elements', [])
        except Exception as e:
            print(f'  {nombre_zona}: fallo ({str(e)[:60]}), probando otro espejo…', flush=True)
            time.sleep(3)
    return []


def main():
    grupo = 'santiago'
    salida = '/tmp/nodos_reales.json'
    for a in sys.argv[1:]:
        if a.startswith('--grupo='):
            grupo = a.split('=', 1)[1].strip().lower()
        if a.startswith('--salida='):
            salida = a.split('=', 1)[1].strip()

    zonas = [z for z in ZONAS if grupo in ('todos', 'todas', '*') or z[0] == grupo]
    if not zonas:
        print(f'No hay zonas para el grupo "{grupo}". Grupos: '
              + ', '.join(sorted({z[0] for z in ZONAS})))
        return

    print(f'Consultando OpenStreetMap (Overpass) · grupo "{grupo}" · {len(zonas)} zonas…')
    encontrados = {}
    for _g, nombre_zona, lat, lng, radio in zonas:
        for el in zona(nombre_zona, lat, lng, radio):
            t = el.get('tags') or {}
            nombre = (t.get('name') or '').strip()
            lat2 = el.get('lat') or (el.get('center') or {}).get('lat')
            lng2 = el.get('lon') or (el.get('center') or {}).get('lon')
            if not nombre or not lat2 or not lng2:
                continue
            clave = (el.get('type'), el.get('id'))
            if clave in encontrados:
                continue
            encontrados[clave] = {
                'osm_tipo': el.get('type'), 'osm_id': el.get('id'),
                'nombre': nombre, 'categoria': categoria(t),
                'lat': round(float(lat2), 7), 'lng': round(float(lng2), 7),
                'zona': nombre_zona,
                'calle': ' '.join(x for x in [t.get('addr:street'), t.get('addr:housenumber')] if x).strip(),
                'comuna_osm': t.get('addr:city') or '',
                'horarios': t.get('opening_hours') or '',
                'web': t.get('website') or t.get('contact:website') or '',
                'telefono': t.get('phone') or t.get('contact:phone') or '',
                'descripcion_osm': t.get('description') or '',
                'wikidata': t.get('wikidata') or '',
                'wikipedia': t.get('wikipedia') or '',
                'instagram': t.get('contact:instagram') or '',
                'tags': {k: v for k, v in t.items() if k in (
                    'amenity', 'tourism', 'shop', 'leisure', 'community_centre', 'operator', 'network')},
            }

    nodos = list(encontrados.values())
    print(f'\nTOTAL con nombre: {len(nodos)}')
    print('por categoría:', dict(Counter(n['categoria'] for n in nodos)))
    print('por zona     :', dict(Counter(n['zona'] for n in nodos)))
    print(f"con horarios : {sum(1 for n in nodos if n['horarios'])}"
          f" | con web: {sum(1 for n in nodos if n['web'])}"
          f" | con artículo (foto): {sum(1 for n in nodos if n['wikidata'] or n['wikipedia'])}")
    print('\nMuestra:')
    for n in nodos[:25]:
        print(f"  · {n['nombre'][:44]:46s} {n['categoria']:18s} {n['zona'][:30]:32s}"
              f"{'⏰' if n['horarios'] else '  '}{'📷' if (n['wikidata'] or n['wikipedia']) else '  '} {n['calle']}")
    if '--guardar' in sys.argv:
        json.dump(nodos, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'\nGuardado en {salida}')


if __name__ == '__main__':
    main()
