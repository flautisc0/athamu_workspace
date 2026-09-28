#!/usr/bin/env python3
"""
Repara las palabras que la regla general de -ás del neutralizador dejó sin tilde:
ademas→además · atras→atrás · detras→detrás · demas→demás · quizas→quizás · jamas→jamás ·
compas→compás · y "estas" cuando es el verbo (estás), no el demostrativo ("estas dos claves").

Se corre una sola vez; queda como registro del incidente. Uso:
    python3 scripts/reparar_espanol_danado.py [--aplicar]
"""
import pathlib
import re
import sys

APLICAR = '--aplicar' in sys.argv

# Sin ambigüedad: estas formas nunca son correctas así.
DIRECTAS = [
    (r'ademas', 'además'), (r'atras', 'atrás'), (r'detras', 'detrás'), (r'demas', 'demás'),
    (r'quizas', 'quizás'), (r'jamas', 'jamás'), (r'compas', 'compás'),
]
# "estas" es verbo o demostrativo según el contexto: sólo se toca donde es verbo.
CONTEXTO_ESTAS = [
    (r'cuando estas\b', 'cuando estás'),
    (r'donde estas\b', 'donde estás'),
    (r'\bYa estas\b', 'Ya estás'),
    (r'\bEstas a\b', 'Estás a'),
    (r'\bestas a (\d)', r'estás a \1'),
    (r"'estas cerca", "'estás cerca"),
    (r'"estas cerca', '"estás cerca'),
    (r'\bestas ahí\b', 'estás ahí'),
    (r'\bque estas\b', 'que estás'),
    (r'\bsi estas\b', 'si estás'),
    (r'\bno estas\b', 'no estás'),
]

ARCHIVOS = []
for pat in ('fase-mobile/src/**/*.ts', 'fase-mobile/src/**/*.tsx', 'fase-mobile/mobile/**/*.ts',
            'paginas/*.html', 'scripts/*.py', 'server.js', 'docs/*.md'):
    ARCHIVOS += list(pathlib.Path('.').glob(pat))
ARCHIVOS = [f for f in ARCHIVOS
            if 'backups/' not in str(f)
            and str(f) not in ('scripts/neutralizar_espanol.py', 'scripts/reparar_espanol_danado.py',
                               'docs/IDIOMA_TEMA_Y_CERCANIA.md')]

total = 0
for f in sorted(set(ARCHIVOS)):
    texto = f.read_text(encoding='utf-8')
    nuevo = texto
    hechos = 0
    # Palabras sin ambigüedad: con límites de palabra.
    for patron, reemplazo in DIRECTAS:
        rx = re.compile(r'(?<![\wáéíóúüñÁÉÍÓÚÑ])' + patron + r'(?![\wáéíóúüñÁÉÍÓÚÑ])', re.IGNORECASE)
        def rep(m, r=reemplazo):
            o = m.group(0)
            return r[:1].upper() + r[1:] if o[:1].isupper() else r
        nuevo, n = rx.subn(rep, nuevo)
        hechos += n
    # "estas" según contexto: los patrones ya traen sus propios límites.
    for patron, reemplazo in CONTEXTO_ESTAS:
        rx = re.compile(patron, re.IGNORECASE)
        def rep2(m, r=reemplazo):
            out = re.sub(r'\\1', m.group(1), r) if m.groups() else r
            o = m.group(0)
            return out[:1].upper() + out[1:] if o[:1].isupper() else out
        nuevo, n = rx.subn(rep2, nuevo)
        hechos += n
    if nuevo != texto:
        total += hechos
        print(f'  {hechos:3}  {f}')
        if APLICAR:
            destino = pathlib.Path('backups/espanol_reparado') / str(f)
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(texto, encoding='utf-8')
            f.write_text(nuevo, encoding='utf-8')

print(f'\ntotal reparado: {total}')
print('APLICADO' if APLICAR else '(informe: para escribir, --aplicar)')
