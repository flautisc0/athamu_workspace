#!/usr/bin/env python3
"""
Mete una página HTML suelta dentro de server.js (hub) como template literal + ruta.

Patrón de la casa para páginas servidas en línea (`/piloto`, `/previa`, `/nodos`): el deploy
del hub copia SÓLO server.js, así que un archivo nuevo en public/ no viajaría a la imagen.
El HTML se lee de un archivo real (editable, revisable) y se inserta **antes del catch-all
de la SPA** (`app.get('*', ...)`), que es la única ancla estable del archivo.

Escapa `\\`, `` ` `` y `${` para que el HTML no rompa el template literal de Node.

Uso:
    python3 scripts/insertar_pagina_hub.py --html=/tmp/nodos/nodos.html \\
        --const=PAGINA_NODOS --ruta=/nodos --titulo="Nodos del radar (administración)"
"""
import re
import sys

SERVER = '/home/flautisc0/athamu_workspace/server.js'
ANCLA = "app.get('*', (req, res) => {"


def escapar(html):
    return html.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')


def construir(html, nombre, ruta, titulo, archivo='paginas/nodos.html', reemplazo=False):
    """Bloque que se mete en server.js: comentario + template literal + ruta."""
    nota = f'Fuente editable del HTML: {archivo} (ver docs/).'
    return (
        '// ---------------------------------------------------------------------------\n'
        f'// {titulo.upper()}\n'
        '//\n'
        f'// Página servida en línea por el hub ({ruta}). Se sirve el HTML desde aquí a propósito:\n'
        '// el deploy con tag sólo copia server.js, así que un archivo estático nuevo en\n'
        f'// public/ NO viajaría en la imagen. {nota}\n'
        '// ---------------------------------------------------------------------------\n'
        f'const {nombre} = `{escapar(html)}`;\n'
        f"app.get('{ruta}', (req, res) => {{\n"
        "  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');\n"
        f"  res.type('html').send({nombre});\n"
        '});\n\n'
    )


def main():
    args = {}
    for a in sys.argv[1:]:
        if a.startswith('--'):
            k, _, v = a.partition('=')
            args[k] = v
    archivo = args.get('--html')
    nombre = args.get('--const')
    ruta = args.get('--ruta')
    titulo = args.get('--titulo', ruta or '')
    if not (archivo and nombre and ruta):
        print('uso: insertar_pagina_hub.py --html=<archivo> --const=<NOMBRE> --ruta=/x [--titulo="…"]')
        raise SystemExit(2)

    html = open(archivo, encoding='utf-8').read()
    src = open(SERVER, encoding='utf-8').read()
    if f'const {nombre} =' in src:
        # Ya está: se reemplaza el bloque entero (const … + su ruta) por el HTML nuevo.
        ini = src.index(f'const {nombre} =')
        ruta_ancla = f"app.get('{ruta}', (req, res) => {{"
        try:
            medio = src.index(ruta_ancla, ini)
        except ValueError:
            print(f'Existe {nombre} pero no encontré su ruta {ruta}: se aborta para no romper nada.')
            raise SystemExit(5)
        fin = src.index('});\n', medio) + len('});\n')
        # Arranca en el comentario de cabecera si lo tiene pegado arriba.
        cabeza = src.rfind('// ---------------------------------------------------------------------------\n', 0, ini)
        if cabeza >= 0 and ini - cabeza < 400:
            ini = cabeza
        bloque = construir(html, nombre, ruta, titulo, archivo=archivo, reemplazo=True)
        nuevo = src[:ini] + bloque + src[fin:]
        open(SERVER, 'w', encoding='utf-8').write(nuevo)
        print(f'reemplazado el bloque {nombre} ({len(html)} car. de HTML) · líneas: {nuevo.count(chr(10))}')
        return
    if ANCLA not in src:
        print('No encontré el catch-all de la SPA: no se inserta nada.')
        raise SystemExit(4)

    bloque = construir(html, nombre, ruta, titulo, archivo=archivo, reemplazo=False)
    lineas_antes = src.count('\n')
    nuevo = src.replace(ANCLA, bloque + ANCLA, 1)
    open(SERVER, 'w', encoding='utf-8').write(nuevo)
    print(f'insertado {nombre} ({len(html)} car. de HTML) antes del catch-all')
    print(f'líneas de server.js: {lineas_antes} → {nuevo.count(chr(10))}')


if __name__ == '__main__':
    main()
