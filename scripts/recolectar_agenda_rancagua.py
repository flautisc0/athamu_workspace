#!/usr/bin/env python3
"""Cosecha REAL de la agenda cultural de Rancagua (rancaguacultura.cl).

Corporación de la Cultura y las Artes de la Ilustre Municipalidad de Rancagua.
Sin API key: se leen las vistas HTML del calendario (The Events Calendar) para sacar
las URLs de cada evento y de ahí el iCal de cada uno (`?ical=1`), que trae la fecha y
la hora exactas con su zona horaria (America/Santiago).

Uso:
    python3 scripts/recolectar_agenda_rancagua.py                # informe
    python3 scripts/recolectar_agenda_rancagua.py --salida=/tmp/agenda_rancagua.json
No escribe en el CRM: eso lo hace scripts/agenda_externa.cjs con el JSON.
"""
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

UA = 'Mozilla/5.0 (X11; Linux x86_64) ATHAMU-FASE/1.0 (radar cultural; fase.athamu@gmail.com)'
BASE = 'https://rancaguacultura.cl'
MESES = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01']


def bajar(url, destino):
    r = subprocess.run(['curl', '-sL', '--max-time', '60', '-A', UA, url, '-o', destino],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('curl falló: ' + (r.stderr or '').strip()[:200])
    return open(destino, encoding='utf-8', errors='replace').read()


def limpiar(t):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t or ''))).strip()


def urls_de_eventos():
    """Todas las URLs de eventos que aparecen en las vistas de mes (y list) 2026."""
    urls = {}
    for mes in MESES:
        for vista in ('mes', 'list'):
            if vista == 'mes':
                u = f'{BASE}/event-directory/mes/{mes}/'
            else:
                u = f'{BASE}/event-directory/list/?tribe-bar-date={mes}-01'
            try:
                h = bajar(u, f'/tmp/agenda_{vista}_{mes}.html')
            except Exception as e:
                print('  ! no se pudo leer', u, e, file=sys.stderr)
                continue
            for m in re.finditer(r'href="(https://rancaguacultura\.cl/event-directory/[a-z0-9][^"]*?)"', h):
                url = m.group(1)
                if url.rstrip('/').endswith('/event-directory'):
                    continue
                urls[url] = True
            time.sleep(0.7)
    return list(urls)


def parse_ical(txt):
    txt = txt.replace('\r\n', '\n').replace('\n ', '')
    # OJO: el feed trae un VTIMEZONE con sus propios DTSTART; sólo vale el VEVENT.
    m = re.search(r'BEGIN:VEVENT(.*?)END:VEVENT', txt, re.S)
    if not m:
        return {}
    d = {}
    for line in m.group(1).split('\n'):
        if ':' in line:
            k, v = line.split(':', 1)
            d.setdefault(k.split(';')[0], []).append(v)
    return d


def descripcion_de_pagina(url, i):
    """El iCal no trae descripción, pero la página del evento sí: es el texto real de la función
    (contenedor `tribe-events-single-event-description` de The Events Calendar)."""
    try:
        pagina = bajar(url, f'/tmp/agenda_pag_{i}.html')
    except Exception:
        return ''
    # OJO: hay que buscar la APERTURA (`<div class=…`). Buscando sólo `class="…"` el primer match
    # es el comentario de CIERRE de la plantilla y se extraía basura (pasó y se vio en el diag).
    m = re.search(r'<div class="tribe-events-single-event-description[^"]*"[^>]*>', pagina)
    if not m:
        return ''
    fin = pagina.find('<!-- .tribe-events-single-event-description -->', m.end())
    trozo = pagina[m.end():fin if fin > m.end() else m.end() + 5000]
    # Se corta donde empieza el ruido de la plantilla (compartir, calendario, entradas…)
    for corte in ('Comparte esto', 'Añadir al calendario', 'Add to Calendar', 'Detalles del evento',
                  'tribe-events-single-section', '<footer', 'Entradas</'):
        p = trozo.find(corte)
        if p > 40:
            trozo = trozo[:p]
    return limpiar(trozo)[:700]


def leer_evento(url, i):
    ics = bajar(url + ('&' if '?' in url else '?') + 'ical=1', f'/tmp/agenda_ev_{i}.ics')
    d = parse_ical(ics)
    def uno(k):
        return d.get(k, [None])[0]
    ini = d.get('DTSTART', [None])[0]
    fin = d.get('DTEND', [None])[0]
    if not ini:
        return None
    # El valor viene como 20260928T153000 (hora local de America/Santiago) o 20260928
    fecha, hora = (ini.split('T') + [None])[:2] if 'T' in ini else (ini, None)
    fin_f, fin_h = ((fin.split('T') + [None])[:2] if fin and 'T' in fin else (fin, None))
    return {
        'titulo_origen': html.unescape(uno('SUMMARY') or '').replace('\\,', ','),
        'fecha': f'{fecha[0:4]}-{fecha[4:6]}-{fecha[6:8]}',
        'hora': (f'{hora[0:2]}:{hora[2:4]}' if hora else None),
        'fecha_fin': (f'{fin_f[0:4]}-{fin_f[4:6]}-{fin_f[6:8]}' if fin_f and len(fin_f) >= 8 else None),
        'hora_fin': (f'{fin_h[0:2]}:{fin_h[2:4]}' if fin_h else None),
        'todo_el_dia': hora is None,
        'lugar': html.unescape(uno('LOCATION') or '').replace('\\,', ','),
        'categorias': [html.unescape(x).replace('\\,', ',') for x in d.get('CATEGORIES', [])],
        # La DESCRIPCIÓN del iCal es el texto real de la función: es lo que muestra la tarjeta
        # del Inicio (los eventos externos no tienen obra cargada, así que no hay sinopsis).
        'descripcion': limpiar(uno('DESCRIPTION') or '')[:700] or descripcion_de_pagina(url, i),
        'imagen': uno('ATTACH'),
        'fuente_url': uno('URL') or url,
    }


if __name__ == '__main__':
    salida = None
    for a in sys.argv[1:]:
        if a.startswith('--salida='):
            salida = a.split('=', 1)[1]
    print('· leyendo vistas del calendario…')
    urls = sorted(urls_de_eventos())
    print(f'· {len(urls)} URLs de eventos encontradas')
    eventos = []
    for i, u in enumerate(urls):
        try:
            e = leer_evento(u, i)
            if e:
                eventos.append(e)
        except Exception as ex:
            print('  ! falló', u, ex, file=sys.stderr)
        time.sleep(0.5)
    eventos.sort(key=lambda e: (e['fecha'], e['hora'] or ''))
    print(f'· {len(eventos)} eventos con fecha/hora reales')
    for e in eventos:
        print(' ', e['fecha'], (e['hora'] or '--:--'), '→', (e['fecha_fin'] or '')[:0],
              '|', e['titulo_origen'][:60], '|', e['lugar'][:40])
    if salida:
        with open(salida, 'w', encoding='utf-8') as f:
            json.dump(eventos, f, ensure_ascii=False, indent=1)
        print('· guardado en', salida)
