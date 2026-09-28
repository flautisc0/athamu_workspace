#!/usr/bin/env python3
"""
Saca los textos de "SQL" que se ven en el CRM (empezando por la pestaña Compañías).

El fuente del SPA no está en la máquina: el bundle desplegado (dist/assets/index-DsS-IT5H.js)
es más nuevo que el fuente del repo y es idéntico al que sirve el hub, así que se parchea él.
Reglas de la skill `patch-compiled-spa-bundles`: backup, verificar cada anclaje, node --check,
reemplazos de atrás hacia adelante.

Uso:
    python3 scripts/parchear_textos_sql.py            # informe
    python3 scripts/parchear_textos_sql.py --aplicar
"""
import pathlib
import shutil
import subprocess
import sys

APLICAR = '--aplicar' in sys.argv
BUNDLE = pathlib.Path('/home/flautisc0/athamu_workspace/dist/assets/index-DsS-IT5H.js')

# (texto que se ve hoy, texto nuevo, cuántas veces debe aparecer: 1 = obligatorio exacto)
CAMBIOS = [
    ('¡Compañía o agrupación creada y vinculada en SQL con éxito!',
     '¡Agrupación creada con éxito!', 1),
    ('SQL Tags Vinculados (', 'Agrupaciones (', 1),
    ('Administra perfiles artísticos, material de repertorio, miembros asignados por etiqueta SQL y documentación técnica por cada agrupación.',
     'Administra los perfiles artísticos, el elenco, los montajes del catálogo y la documentación de cada agrupación.', 1),
    ('Tag SQL: ', 'ID interno: ', 1),
    ('Tag SQL (Identificador de Base de Datos)', 'ID interno (opcional)', 1),
    ('Base de Datos CRM & Grupos SQL Sincronizada', 'Datos del CRM sincronizados', 1),
    ('Cloud SQL (Desconectado/Modo Fallback)', 'Sin conexión con el CRM', 1),
    ('MySQL (Cloud SQL)', 'MySQL (hub del CRM)', 1),
    ('Guardando Cloud SQL...', 'Guardando…', 1),
    ('Base de Datos SQL & Archivos PHP', 'Archivos y datos del CRM', 2),
    ('Consola SQL Interactiva', 'Consola de datos', 1),
    ('Abrir Gestor SQL & Tablas en Vivo', 'Abrir tablas en vivo', 1),
    ('Abrir plataforma web SQL en nueva pestaña', 'Abrir la plataforma en otra pestaña', 1),
    ('Ingresa una consulta SQL arriba y presiona ', 'Escribe una consulta arriba y presiona ', 1),
]

texto = BUNDLE.read_text(encoding='utf-8')

print(f'bundle: {BUNDLE} ({len(texto)} bytes)')
faltan, sobra = [], []
for viejo, nuevo, esperado in CAMBIOS:
    n = texto.count(viejo)
    estado = 'OK' if n == esperado else ('NO ESTÁ' if n == 0 else f'APARECE {n} VECES')
    print(f'  {"✓" if n == esperado else "✗"} {estado:16} «{viejo[:52]}» → «{nuevo[:40]}»')
    if n == 0:
        faltan.append(viejo)
    elif n != esperado:
        sobra.append((viejo, n, esperado))

if faltan or sobra:
    print('\nABORTADO: hay anclajes que no coinciden (no se escribe nada).')
    for f in faltan:
        print('  falta:', f[:70])
    for v, n, e in sobra:
        print(f'  {n} veces (esperaba {e}):', v[:70])
    raise SystemExit(1)

print('\ntodos los anclajes verificados')
if not APLICAR:
    print('(informe: para escribir, --aplicar)')
    raise SystemExit(0)

respaldo = BUNDLE.with_suffix('.js.bak_sql')
if not respaldo.exists():
    shutil.copy2(BUNDLE, respaldo)
    print('backup:', respaldo)

# De atrás hacia adelante: los índices no se desfasan.
posiciones = sorted(((texto.find(v), v, n) for v, n, _ in CAMBIOS), reverse=True)
nuevo = texto
for _pos, viejo, reemplazo in posiciones:
    nuevo = nuevo.replace(viejo, reemplazo)
BUNDLE.write_text(nuevo, encoding='utf-8')
print(f'escrito: {len(nuevo)} bytes (antes {len(texto)})')

# node --check: si el bundle quedó roto, se restaura el backup.
r = subprocess.run(['node', '--check', str(BUNDLE)], capture_output=True, text=True)
if r.returncode != 0:
    shutil.copy2(respaldo, BUNDLE)
    print('node --check FALLÓ → restaurado el backup')
    print(r.stderr[:600])
    raise SystemExit(1)
print('node --check: OK')

quedan = nuevo.count('SQL ')
print('quedan textos con "SQL " (pueden ser logs internos):', quedan)
