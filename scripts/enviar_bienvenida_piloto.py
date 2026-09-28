#!/usr/bin/env python3
"""
Correo de BIENVENIDA de la prueba: los flujos del ecosistema, con la guía y las tareas.

Reemplaza a `scripts/avisar_inscrito.py`, que manda el correo con **el token personal de
Francisco** (regla de la casa: nunca operar con su cuenta). Este sale por el **emisor del
ecosistema** —`fase.athamu@gmail.com`, Reply-To al correo de Francisco— usando el endpoint del
hub (`POST /api/v1/crm/avisos/correo`, que ya acepta HTML) y queda registrado en `email_log`.

Es la pieza que hace que el "plan demo de uso" llegue a la persona: qué es FASE, cómo entrar,
los 5 primeros pasos y qué hacer si algo falla. La guía completa (para leer o reenviar) vive en
`/guia`; aquí va el resumen con los enlaces.

Uso:
    python3 scripts/enviar_bienvenida_piloto.py --para=correo@x.cl --nombre=Ana          # informe
    python3 scripts/enviar_bienvenida_piloto.py --para=correo@x.cl --nombre=Ana --enviar
    … --enviar --copia    # y una copia al buzón del agente (para verificar por IMAP)
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
APP = 'https://fase-mobile-897089213264.us-central1.run.app'
APK = 'https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk'
GUIA = f'{HUB}/guia'
REMITENTE_SESION = 'panxo.sms@gmail.com'      # quien envía debe ser admin/producción del CRM
CORREO_AGENTE = 'fase.athamu@gmail.com'
EJECUTANTE = 'Francisco'


def html(nombre: str) -> str:
    return f"""
<p style="font-size:15px">Hola {nombre},</p>

<p>Ya estás en la prueba de <b>FASE</b>, el radar cultural de ATHAMU. Te dejo lo esencial en un
minuto: qué es, qué hacer primero y cómo se pide ayuda.</p>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>Qué es.</b> Muestra <b>qué está pasando en tu ciudad</b> —teatro, música, talleres, exposiciones,
con hora y lugar—, <b>qué espacios culturales tienes cerca</b> y te deja <b>descubrirlos</b> cuando
estás ahí. Y en tu Perfil está tu agrupación: equipo, montajes y ensayos.</p>

<h3 style="font-family:Georgia,serif;margin:18px 0 6px">Tus cinco primeros pasos</h3>
<ol style="line-height:1.7;padding-left:20px">
  <li><b>Entra con el mismo correo de Google</b> que usás en el ecosistema.<br>
    <span style="color:#5e564c;font-size:13px">Si entras con otro correo, la app funciona pero no
    te muestra tu agrupación (es el problema más común: nos escribes y lo unimos).</span></li>
  <li><b>Mira la agenda en <i>Inicio</i>.</b><br>
    <span style="color:#5e564c;font-size:13px">Funciones reales de la ciudad, con día, hora y lugar;
    con la ubicación activada, a cuántos metros te queda. Lo que dice “Ver la fuente” viene de la
    cartelera oficial.</span></li>
  <li><b>Ve a <i>Radar</i> y mira qué tienes cerca.</b><br>
    <span style="color:#5e564c;font-size:13px">Lista ordenada por cercanía con la distancia real
    (sin permiso de ubicación la app lo dice: no inventa distancias).</span></li>
  <li><b>Camina hasta uno y descubrilo.</b><br>
    <span style="color:#5e564c;font-size:13px">A menos de <b>120 metros</b> se abre la ficha del lugar
    y sumas experiencia. Es el corazón de la app: funciona <b>en el lugar</b>. Después puedes publicar
    una foto en el Muro.</span></li>
  <li><b>Si algo no funciona, repórtalo ahí mismo.</b><br>
    <span style="color:#5e564c;font-size:13px">El botón <b>“Reportar algo”</b> está en todas las
    pantallas; puedes adjuntar una captura. Cada reporte suena en el teléfono del equipo y se
    responde: eso es lo que hace que esto mejore.</span></li>
</ol>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>La guía completa</b> (con las preguntas que nos hacen siempre) está aquí:
<a href="{GUIA}" style="color:#b4472c">{GUIA}</a> — guardala, sirve para volver a mirarla.</p>

<p style="margin:16px 0 6px">
  <a href="{APP}" style="background:#b4472c;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir FASE</a>
</p>
<p style="font-size:13px"><a href="{APK}" style="color:#b4472c">Descargar la app (Android · APK)</a> ·
en iPhone, por ahora desde el navegador.</p>

<p>Gracias por prestarte a probarla. Cualquier duda, respondé este correo,<br><b>{EJECUTANTE}</b><br>
<span style="color:#5e564c;font-size:13px">ATHAMU · ATHA Producciones</span></p>
"""


def main():
    para, nombre = '', 'hola'
    enviar = '--enviar' in sys.argv
    copia = '--copia' in sys.argv
    for a in sys.argv[1:]:
        if a.startswith('--para='):
            para = a.split('=', 1)[1].strip()
        if a.startswith('--nombre='):
            nombre = a.split('=', 1)[1].strip()
    if not para:
        print('falta --para=correo@dominio.cl')
        raise SystemExit(2)

    asunto = 'Bienvenido a la prueba de FASE: qué es y cómo se usa'
    cuerpo = html(nombre)
    print(f'asunto: {asunto}')
    print(f'para  : {para}' + ('  (+ copia a ' + CORREO_AGENTE + ')' if copia else ''))
    print(f'guía  : {GUIA}')
    print(f'largo : {len(cuerpo)} caracteres de HTML')
    if not enviar:
        print('\n(informe: no se envió nada. Para enviar: --enviar [--copia])')
        return

    for destino in [para] + ([CORREO_AGENTE] if copia else []):
        datos = json.dumps({'para': destino, 'asunto': asunto, 'html': cuerpo}).encode()
        req = urllib.request.Request(f'{HUB}/api/v1/crm/avisos/correo', data=datos,
                                     headers={'Content-Type': 'application/json',
                                              'x-atha-email': REMITENTE_SESION}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                print(f'  {destino}: HTTP {r.status} · {r.read().decode()[:200]}')
        except urllib.error.HTTPError as e:
            print(f'  {destino}: HTTP {e.code} · {e.read().decode()[:200]}')
        except Exception as e:
            print(f'  {destino}: ERROR {e}')


if __name__ == '__main__':
    main()
