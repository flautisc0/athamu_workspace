#!/usr/bin/env python3
"""
Pasa a ESPAÑOL NEUTRO los textos de la app, las páginas del hub y los correos.

Contexto: la app quedó escrita con voseo (rioplatense): "tenés", "andá", "mirá", "elegí",
"acá". Francisco pidió español neutro. Esto reemplaza **palabra completa** y sólo en los
archivos indicados, dejando un registro de cada cambio para poder revisarlo.

Uso:
    python3 scripts/neutralizar_espanol.py            # informe (no escribe)
    python3 scripts/neutralizar_espanol.py --aplicar  # escribe y guarda .bak_espanol
"""
import collections
import pathlib
import re
import sys

APLICAR = '--aplicar' in sys.argv

# El orden importa: primero las formas más largas (sacale antes que saca).
CAMBIOS = [
    # --- verbos conjugados (voseo → tuteo) ---
    (r'tenés', 'tienes'), (r'podés', 'puedes'), (r'querés', 'quieres'), (r'sabés', 'sabes'),
    (r'\bsos\b', 'eres'), (r'andás', 'andas'), (r'hacés', 'haces'), (r'decís', 'dices'),
    (r'venís', 'vienes'), (r'ponés', 'pones'), (r'salís', 'sales'), (r'elegís', 'eliges'),
    (r'seguís', 'sigues'), (r'pedís', 'pides'), (r'sentís', 'sientes'), (r'preferís', 'prefieres'),
    (r'escribís', 'escribes'), (r'repetís', 'repites'), (r'dormís', 'duermes'),
    # --- imperativos ---
    (r'sacale', 'sácale'), (r'avisame', 'avísame'), (r'mostrame', 'muéstrame'), (r'dejame', 'déjame'),
    (r'contame', 'cuéntame'), (r'decime', 'dime'), (r'acercate', 'acércate'), (r'animate', 'anímate'),
    (r'anotate', 'anótate'), (r'sumate', 'únete'), (r'unite', 'únete'), (r'ponete', 'ponte'),
    (r'andate', 'vete'), (r'movete', 'muévete'), (r'fijate', 'fíjate'), (r'probalo', 'pruébalo'),
    (r'miralo', 'míralo'), (r'tocalo', 'tócalo'), (r'elegilo', 'elígelo'), (r'pedile', 'pídele'),
    (r'escribile', 'escríbele'), (r'mandale', 'envíale'), (r'proba\b', 'prueba'), (r'andá', 've'),
    (r'mirá', 'mira'), (r'tocá', 'toca'), (r'entrá', 'entra'), (r'usá', 'usa'), (r'dejá', 'deja'),
    (r'cargá', 'carga'), (r'esperá', 'espera'), (r'probá', 'prueba'), (r'sacá', 'saca'),
    (r'fijá', 'fija'), (r'elegí', 'elige'), (r'escribí', 'escribe'), (r'pedí', 'pide'),
    (r'subí', 'sube'), (r'compartí', 'comparte'), (r'mandá', 'envía'), (r'buscá', 'busca'),
    (r'revisá', 'revisa'), (r'contá', 'cuenta'), (r'sumá', 'suma'), (r'creá', 'crea'),
    (r'aceptá', 'acepta'), (r'activá', 'activa'), (r'apretá', 'presiona'), (r'instalá', 'instala'),
    (r'abrí', 'abre'), (r'vení', 'ven'), (r'poné', 'pon'), (r'hacé', 'haz'), (r'agregá', 'agrega'),
    (r'volvé', 'vuelve'), (r'seguí', 'sigue'), (r'empezá', 'empieza'), (r'arrancá', 'empieza'),
    (r'juntá', 'junta'), (r'confirmá', 'confirma'), (r'completá', 'completa'), (r'guardá', 'guarda'),
    (r'llená', 'llena'), (r'tirá', 'tira'), (r'dá\b', 'da'), (r'mandá', 'envía'), (r'tocá', 'toca'),
    (r'reportalo', 'repórtalo'), (r'reportá', 'reporta'), (r'entrale', 'entra'),
    # --- léxico rioplatense → neutro ---
    (r'\bacá\b', 'aquí'), (r'\blindo\b', 'bonito'), (r'\blinda\b', 'bonita'),
    (r'\bpibe\b', 'chico'), (r'\bpibes\b', 'chicos'), (r'\bche\b', 'oye'),
    # --- imperativos que faltaban en la primera pasada ---
    (r'caminá', 'camina'), (r'soltá', 'suelta'), (r'ubicá', 'ubica'), (r'deslizá', 'desliza'),
    (r'descubrí', 'descubre'), (r'adjuntá', 'adjunta'), (r'apuntá', 'apunta'),
    (r'descargá', 'descarga'), (r'bajá', 'descarga'), (r'indicá', 'indica'),
    (r'publicá', 'publica'), (r'reintentá', 'vuelve a intentar'), (r'encontrá', 'encuentra'),
    (r'saludá', 'saluda'), (r'llevá', 'lleva'), (r'avisá', 'avisa'), (r'contame', 'cuéntame'),
    (r'pasá', 'pasa'), (r'cerrá', 'cierra'), (r'largá', 'empieza'), (r'dale', 'dale'),
    (r'fijate', 'fíjate'), (r'recordá', 'recuerda'), (r'contá', 'cuenta'),
]

# Formas en -ás / -és / -ís (segunda persona del voseo). Las de -ar siguen una regla
# general (entrás→entras, sumás→sumas); las de -er/-ir tienen otra raíz y van explícitas.
GENERICAS_AS = re.compile(r'(?<![\wáéíóúüñ])([a-záéíóúñ]{3,})ás(?![\wáéíóúüñ])', re.IGNORECASE)
NO_VERBOS_AS = {'más', 'además', 'quizás', 'jamás', 'detrás', 'demás', 'compás', 'atrás', 'capaz',
                'estás', 'estés', 'quizá'}
FORMAS_ES_IS = [
    (r'tenés', 'tienes'), (r'podés', 'puedes'), (r'querés', 'quieres'), (r'sabés', 'sabes'),
    (r'hacés', 'haces'), (r'movés', 'mueves'), (r'pertenecés', 'perteneces'), (r'debés', 'debes'),
    (r'ponés', 'pones'), (r'salís', 'sales'), (r'escribís', 'escribes'), (r'pedís', 'pides'),
    (r'elegís', 'eliges'), (r'preferís', 'prefieres'), (r'seguís', 'sigues'), (r'sentís', 'sientes'),
    (r'repetís', 'repites'), (r'dormís', 'duermes'), (r'venís', 'vienes'), (r'decís', 'dices'),
    (r'vivís', 'vives'), (r'abrís', 'abres'), (r'descubrís', 'descubres'), (r'reportás', 'reportas'),
    (r'describís', 'describes'), (r'permitís', 'permites'), (r'definís', 'defines'),
]
CAMBIOS += FORMAS_ES_IS + [(r'\bsos\b', 'eres')]

ARCHIVOS = []
for pat in ('fase-mobile/src/**/*.ts', 'fase-mobile/src/**/*.tsx', 'fase-mobile/mobile/**/*.ts',
            'paginas/*.html', 'scripts/*.py',
            'server.js', 'docs/*.md'):
    ARCHIVOS += list(pathlib.Path('.').glob(pat))

# Este mismo archivo y el doc que documenta el vocabulario CONTIENEN las formas de voseo a
# propósito (son el diccionario y su explicación): si se reemplazaran, el script se rompería
# solo. La primera versión sólo miraba dos correos de `scripts/` y por eso quedaron sin
# convertir `enviar_correo_piloto.py` y `responder_reportes_gabriel.py`.
EXCLUIDOS = {
    'scripts/neutralizar_espanol.py',
    'docs/IDIOMA_TEMA_Y_CERCANIA.md',
}
ARCHIVOS = [f for f in ARCHIVOS if str(f) not in EXCLUIDOS]

total = 0
detalle = []
for f in sorted(set(ARCHIVOS)):
    texto = f.read_text(encoding='utf-8')
    nuevo = texto
    cambios = []
    for patron, reemplazo in CAMBIOS:
        # Palabra completa, sin tocar identificadores ni clases CSS: se exige que el carácter
        # antes y después no sea letra. Se respeta la mayúscula inicial (Tenés → Tienes).
        regex = re.compile(r'(?<![\wáéíóúüñÁÉÍÓÚÑ])' + patron + r'(?![\wáéíóúüñÁÉÍÓÚÑ])', re.IGNORECASE)
        for m in list(regex.finditer(nuevo)):
            original = m.group(0)
            reempl = reemplazo[:1].upper() + reemplazo[1:] if original[:1].isupper() else reemplazo
            cambios.append((original, reempl, nuevo[max(0, m.start() - 45):m.end() + 25].replace('\n', ' ')))
    for patron, reemplazo in CAMBIOS:
        regex = re.compile(r'(?<![\wáéíóúüñÁÉÍÓÚÑ])' + patron + r'(?![\wáéíóúüñÁÉÍÓÚÑ])', re.IGNORECASE)
        def rep(m, r=reemplazo):
            o = m.group(0)
            return r[:1].upper() + r[1:] if o[:1].isupper() else r
        nuevo = regex.sub(rep, nuevo)
    # Regla general de los verbos en -ar: entrás→entras, sumás→sumas, caminás→caminas.
    # (Las formas de -er/-ir no siguen regla —tenés→tienes— y van en la lista explícita.)
    # OJO: la lista blanca se compara contra la PALABRA COMPLETA, no contra la raíz: la
    # primera versión comparaba 'atr' y 'est' y por eso convirtió «atrás»→«atras» y
    # «estás»→«estas» (error real, corregido con scripts/reparar_espanol_danado.py).
    def rep_as(m):
        if m.group(0).lower() in NO_VERBOS_AS:
            return m.group(0)
        return m.group(1) + 'as'
    nuevo = GENERICAS_AS.sub(rep_as, nuevo)
    if nuevo != texto:
        n = sum(1 for a, b in zip(texto.split(), nuevo.split()) if a != b)
        detalle.append((str(f), len(cambios)))
        total += len(cambios)
        if APLICAR:
            # Los respaldos van a backups/espanol/ (no al lado del archivo: ensuciaría el build)
            destino = pathlib.Path('backups/espanol') / str(f)
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(texto, encoding='utf-8')
            f.write_text(nuevo, encoding='utf-8')

print(f'ocurrencias a cambiar: {total} en {len(detalle)} archivos\n')
for nombre, n in sorted(detalle, key=lambda x: -x[1])[:22]:
    print(f'  {n:4}  {nombre}')
if not APLICAR:
    print('\n(informe: no se escribió nada. Para aplicar: --aplicar)')
else:
    print('\nAPLICADO (los originales quedaron en backups/espanol/)')

# ---------------------------------------------------------------------------
# REVISIÓN FINAL: qué quedó sospechoso de voseo. Se informa, no se toca solo:
# hay palabras legítimas que terminan igual (más, después, país, Machalí).
# ---------------------------------------------------------------------------
SOSPECHOSAS = re.compile(
    r'(?<![\wáéíóúüñ])([a-záéíóúñ]{3,}ás|[a-záéíóúñ]{3,}(?:és|ís)|sos|acá|vos|andá|mirá|tocá|entrá|usá|dejá|elegí|abrí|pedí|subí|bajá|soltá|fijate)(?![\wáéíóúüñ])',
    re.IGNORECASE)
PERMITIDAS = {
    'más', 'además', 'quizás', 'jamás', 'detrás', 'demás', 'compás', 'atrás', 'capaz',
    'estás', 'estés', 'después', 'país', 'así', 'aquí', 'ahí', 'machalí', 'interés', 'cortés',
    'francés', 'inglés', 'chileno', 'sos', 'vos', 'acá', 'está', 'será', 'estará', 'podrá',
    'tendrá', 'hará', 'verá', 'dejará', 'quedará', 'sumará', 'permitirá', 'mostrará',
    'aparecerá', 'cargará', 'tocará', 'dirá', 'pondrá', 'vendrá', 'usará', 'creará', 'serán',
    'funcionará', 'llegará', 'empezará', 'dirigirá', 'esperú', 'servirá', 'pondrá',
}
restos = collections.Counter()
for f in sorted(set(ARCHIVOS)):
    try:
        texto = f.read_text(encoding='utf-8')
    except Exception:
        continue
    for m in SOSPECHOSAS.finditer(texto):
        w = m.group(1).lower()
        if w not in PERMITIDAS:
            restos[w] += 1
if restos:
    print(f'\nREVISAR A MANO ({sum(restos.values())} casos):', ', '.join(f'{w}×{n}' for w, n in restos.most_common(20)))
else:
    print('\nrevisión final: no quedan formas de voseo detectables.')
