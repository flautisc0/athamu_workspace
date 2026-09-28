#!/usr/bin/env python3
"""
Correo a Felipe "Pipe" Naranjo: el radar de Rancagua ya tiene datos REALES y
necesitamos que descubra los lugares en terreno.

Sale por el emisor propio del ecosistema (el hub lo manda desde fase.athamu@gmail.com con
Reply-To al correo personal de Francisco y deja registro en `email_log`). NO usa la cuenta
personal de Francisco.

Uso:
    python3 scripts/enviar_correo_agenda_rancagua.py                 # informe (no envía)
    python3 scripts/enviar_correo_agenda_rancagua.py --enviar --copia # envía + copia al agente
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
APP = 'https://fase-mobile-897089213264.us-central1.run.app'
APK = 'https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk'
REMITENTE_SESION = 'panxo.sms@gmail.com'      # quien envía debe ser admin/producción del CRM
CORREO_AGENTE = 'fase.athamu@gmail.com'

# Medido en el CRM el 2026-09-27 sobre los nodos del radar, desde la Plaza de los Héroes.
# (nombre, metros) — son los 9 más cercanos; los de Machalí quedan a ~10 km.
LUGARES_CERCA = [
    ('Teatro San Martín', 208),
    ('Orfeón de la Plaza de los Héroes', 315),
    ('Museo Regional de Rancagua', 387),
    ('Cinemark', 427),
    ('Museo Patrimonial de la Merced', 482),
    ('Casa de la Cultura de Rancagua', 583),
    ('Biblioteca Pública Eduardo de Geyter', 606),
    ('Teatro Regional Lucho Gatica', 634),
    ('Casa del Arte', 660),
]

# Funciones reales cargadas (de la cartelera oficial de la Corporación de la Cultura).
AGENDA = [
    ('28 sep', '15:30', '«Gladiadora de Estrellas», homenaje a Stella Díaz Varín', 'Espacio Cultural La Merced'),
    ('30 sep', '20:00', 'Gala Academia de Danza Westyle «Baila a la moda»', 'Teatro Regional Lucho Gatica'),
    ('01 oct', '19:00', 'Inauguración: fotografías «Saint Magma & Retratos con relato»', 'Casa de la Cultura'),
    ('04 oct', '12:00', 'Celebración del Día de la Música Chilena', 'Casa de la Cultura'),
    ('09 oct', '20:00', 'Inti-Illimani, gira «Caminos»', 'Teatro Regional Lucho Gatica'),
    ('17 oct', '19:00', 'Presentación musical Grupo Nieve', 'Casa de la Cultura'),
    ('28 oct', '20:00', 'Cartelera Comunal de Teatro: «Antes todo esto era campo»', 'Teatro Regional Lucho Gatica'),
    ('05 dic', '20:00', 'Rancagua en Vivo: «Catalina y las Bordonas de Oro + Infeligreses»', 'Teatro Regional Lucho Gatica'),
]


def html(nombre, ciudad, total_lugares, total_eventos, desde, hasta, radio_m, ejecutante='Francisco'):
    filas_agenda = '\n'.join(
        f'<li><b>{d} · {h}</b> — {t}<br>'
        f'<span style="color:#5e564c;font-size:13px">{v}</span></li>' for d, h, t, v in AGENDA)
    filas_lugares = '\n'.join(
        f'<li>{n} <span style="color:#5e564c;font-size:13px">· a {m} m</span></li>' for n, m in LUGARES_CERCA)
    return f"""
<p style="font-size:15px">Hola {nombre},</p>

<p>Te escribo porque <b>Rancagua dejó de estar vacía</b>: el radar cultural FASE ya tiene
<b>datos reales</b> cargados y eres el primero en verlos desde adentro.</p>

<h3 style="font-family:Georgia,serif;margin:18px 0 6px">1 · Cartelera real en el Inicio</h3>
<p>Cargamos <b>{total_eventos} funciones reales</b> de la Corporación de la Cultura y las Artes de
la Municipalidad de Rancagua ({desde} → {hasta}), con su hora, su recinto y su fuente. Algunas:</p>
<ul style="line-height:1.7;padding-left:20px">{filas_agenda}</ul>
<p style="font-size:13px;color:#5e564c">Cada tarjeta muestra la hora, el lugar y —con la
ubicación activada— <b>a cuántos metros te queda</b>. Lo que cargamos son funciones
anunciadas: si la Corporación cambia una fecha, nos avisas y la corregimos.</p>

<h3 style="font-family:Georgia,serif;margin:18px 0 6px">2 · Y {total_lugares} lugares reales, con coordenadas</h3>
<p>El mapa salió de OpenStreetMap (espacios culturales de verdad, filtrados: quedaron fuera
sedes vecinales, canchas, colegios y capillas). Los más cercanos a la Plaza de los Héroes:</p>
<ul style="line-height:1.7;padding-left:20px">{filas_lugares}</ul>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>Lo que necesitamos de vos ahora: descubrir los lugares.</b> Que el mapa esté cargado es la
mitad; la otra mitad es que <b>alguien los pise y los desbloquee</b>. Eso es lo que queremos
probar en terreno: que el radar te lleve hasta la puerta y que el lugar se abra cuando
estás ahí.</p>

<h3 style="font-family:Georgia,serif;margin:18px 0 6px">Tus tareas (5–10 minutos)</h3>
<ol style="line-height:1.7;padding-left:20px">
  <li><b>Abre la app y entra con tu correo.</b><br>
    <a href="{APP}" style="color:#b4472c">{APP}</a><br>
    <span style="color:#5e564c;font-size:13px">En el teléfono anda en el navegador. Si prefieres la app instalada, el APK va al final.</span></li>
  <li><b>Cuando pida la ubicación, dale “Permitir”.</b><br>
    <span style="color:#5e564c;font-size:13px">Es lo que hace funcionar el radar: sin permiso no hay
    distancias (y la app te lo dice; no inventa “Estás a 45 m”).</span></li>
  <li><b>Abre <i>Inicio</i> y mira la agenda.</b><br>
    <span style="color:#5e564c;font-size:13px">Deberían aparecer las funciones de arriba con su hora,
    su recinto y la distancia real.</span></li>
  <li><b>Ve a <i>Radar</i> (“Todo cerca”) y elige el más cercano.</b><br>
    <span style="color:#5e564c;font-size:13px">Lista ordenada por cercanía, con chips de 1 / 3 / 10 km
    y “Cómo llegar” con las coordenadas del lugar.</span></li>
  <li><b>Camina hasta él y desbloquealo (a menos de {radio_m} m).</b><br>
    <span style="color:#5e564c;font-size:13px">Se abre la ficha cultural y sumas XP. Los que todavía no
    visitaste se ven como “lugar por descubrir”. <b>Este es el punto de la prueba:</b> queremos
    saber si el lugar se abre donde corresponde.</span></li>
  <li><b>Contanos lo que veas.</b><br>
    <span style="color:#5e564c;font-size:13px">Si un lugar está mal ubicado, si aparece uno que no es
    cultural, si el desbloqueo no salta al llegar: todo eso lo queremos saber. En la app está
    <b>“Reportar algo”</b> (adjunta pantalla, cuenta y versión), o respondé este correo.</span></li>
</ol>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>Dos cosas que ya sabemos que faltan:</b> el <b>Centro Cultural Oriente</b> y el
<b>Centro Cultural y Teatro Baquedano</b> no están en OpenStreetMap, así que sus funciones
aparecen sin distancia. Si pasas por ahí, contanos dónde quedan exactamente y los cargamos
como lugares del radar.</p>

<p style="margin:16px 0 6px">
  <a href="{APP}" style="background:#b4472c;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir FASE</a>
</p>
<p style="font-size:13px"><a href="{APK}" style="color:#b4472c">Descargar la app (Android · APK)</a></p>
<p>Gracias por prestarte a esto,<br><b>{ejecutante}</b><br>
<span style="color:#5e564c;font-size:13px">ATHAMU · ATHA Producciones</span></p>
"""


def main():
    para = 'pipe.naranjo33@gmail.com'
    nombre = 'Pipe'
    ciudad = 'Rancagua'
    total_lugares = 16
    total_eventos = 20
    desde, hasta = '28 de septiembre', 'principios de diciembre'
    radio = 120
    enviar = '--enviar' in sys.argv
    copia = '--copia' in sys.argv
    for a in sys.argv[1:]:
        for clave, actual in (('--para=', para), ('--nombre=', nombre)):
            if a.startswith(clave):
                valor = a.split('=', 1)[1].strip()
                if clave == '--para=':
                    para = valor
                else:
                    nombre = valor

    asunto = 'Rancagua ya tiene cartelera real en FASE — te toca descubrir los lugares'
    cuerpo_html = html(nombre, ciudad, total_lugares, total_eventos, desde, hasta, radio)
    print(f'asunto: {asunto}')
    print(f'para  : {para}' + ('  (+ copia a ' + CORREO_AGENTE + ')' if copia else ''))
    print(f'largo : {len(cuerpo_html)} caracteres de HTML')
    if not enviar:
        print('\n(informe: no se envió nada. Para enviar de verdad: --enviar)')
        return

    for destino in [para] + ([CORREO_AGENTE] if copia else []):
        cuerpo = json.dumps({'para': destino, 'asunto': asunto, 'html': cuerpo_html}).encode()
        req = urllib.request.Request(
            f'{HUB}/api/v1/crm/avisos/correo', data=cuerpo,
            headers={'Content-Type': 'application/json', 'x-atha-email': REMITENTE_SESION},
            method='POST')
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                print(f'  {destino}: HTTP {r.status} · {r.read().decode()[:300]}')
        except urllib.error.HTTPError as e:
            print(f'  {destino}: HTTP {e.code} · {e.read().decode()[:300]}')
        except Exception as e:
            print(f'  {destino}: ERROR {e}')


if __name__ == '__main__':
    main()
