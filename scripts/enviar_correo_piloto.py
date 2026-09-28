#!/usr/bin/env python3
"""
Correo de invitación al piloto del radar cultural, con la lista de tareas.

Manda por el emisor propio del ecosistema (el hub: `POST /api/v1/crm/avisos/correo`,
que sale desde fase.athamu@gmail.com y deja registro en `email_log`). NO toca la
cuenta personal de Francisco: su correo va como Reply-To.

Uso:
    python3 scripts/enviar_correo_piloto.py --para=correo@x.cl                 # informe (no envía)
    python3 scripts/enviar_correo_piloto.py --para=correo@x.cl --enviar        # envía
    python3 scripts/enviar_correo_piloto.py --para=correo@x.cl --enviar --copia # y una copia al agente

El texto de las tareas se adapta a la ciudad: la app es el radar, el mapa de la ciudad
tiene que estar cargado (ver `scripts/recolectar_nodos.py` + `nodos_reales.cjs`).
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
APP = 'https://fase-mobile-897089213264.us-central1.run.app'
APK = 'https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk'
# Quien envía tiene que ser admin o producción del CRM (el hub lo valida con esta cabecera).
REMITENTE_SESION = 'panxo.sms@gmail.com'
CORREO_AGENTE = 'fase.athamu@gmail.com'


def html_piloto(nombre, ciudad, lugares, radio_m, ejecutante='Francisco'):
    """Contenido del correo (el hub lo envuelve con el marco de FASE)."""
    return f"""
<p style="font-size:15px">Hola {nombre},</p>
<p>Te sumamos como uno de los primeros invitados a <b>FASE</b>, el radar cultural de
ATHAMU. Y te toca el estreno en <b>{ciudad}</b>: es la primera ciudad fuera de Santiago
donde cargamos el mapa cultural, así que eres vos el que lo abre.</p>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>Qué es.</b> Una app que te muestra qué espacios culturales tienes cerca —teatros, museos,
bibliotecas, centros culturales, galerías— y te deja desbloquear la ficha de cada lugar
cuando estás ahí. En {ciudad} hay <b>{lugares} lugares cargados</b> para descubrir.</p>

<h3 style="font-family:Georgia,serif;margin:18px 0 6px">Tus tareas (son 5–10 minutos)</h3>
<ol style="line-height:1.7;padding-left:20px">
  <li><b>Abre la app y entra con tu correo.</b><br>
    <a href="{APP}" style="color:#b4472c">{APP}</a><br>
    <span style="color:#5e564c;font-size:13px">En el teléfono anda en el navegador. Si prefieres la app instalada, está el APK al final.</span></li>
  <li><b>Cuando te pida la ubicación, dale “Permitir”.</b><br>
    <span style="color:#5e564c;font-size:13px">Es lo que hace funcionar el radar: sin permiso no sabe qué tienes cerca
    (y la app te lo dice, no inventa distancias).</span></li>
  <li><b>Ve a la pestaña <i>Radar</i> (“Todo cerca”).</b><br>
    <span style="color:#5e564c;font-size:13px">Deberían aparecer los lugares de {ciudad} ordenados por cercanía,
    con los km reales y chips para acotar a 1 / 3 / 10 km.</span></li>
  <li><b>Camina hasta uno y desbloquealo.</b><br>
    <span style="color:#5e564c;font-size:13px">Cuando estés a menos de {radio_m} m toca “Desbloquear”:
    se abre la ficha cultural y sumas XP. Los que no visitaste se ven como “lugar por descubrir”.</span></li>
  <li><b>Publica en el Muro con una foto.</b><br>
    <span style="color:#5e564c;font-size:13px">Del lugar, del ensayo, de lo que estés haciendo: el Muro es la parte
    social del radar.</span></li>
  <li><b>Si algo no funciona, mandalo desde “Reportar algo”.</b><br>
    <span style="color:#5e564c;font-size:13px">Está adentro de la app; adjunta solo la pantalla, tu cuenta y la versión,
    así lo podemos reproducir.</span></li>
</ol>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>Ojo:</b> es una prueba en curso. El mapa de {ciudad} es nuevo, así que si ves algo raro
—un lugar mal ubicado, una categoría que no calza, algo que no carga— es exactamente lo que
queremos saber. Nada de esto está “terminado”: lo vamos arreglando con lo que nos reportas.</p>

<p style="margin:16px 0 6px">
  <a href="{APP}" style="background:#b4472c;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir FASE</a>
</p>
<p style="font-size:13px"><a href="{APK}" style="color:#b4472c">Descargar la app (Android · APK)</a></p>
<p>Gracias por prestarte,<br><b>{ejecutante}</b><br>
<span style="color:#5e564c;font-size:13px">ATHAMU · ATHA Producciones</span></p>
"""


def main():
    para = ''
    enviar = '--enviar' in sys.argv
    copia = '--copia' in sys.argv
    nombre = 'Felipe'
    ciudad = 'Rancagua'
    lugares = 0
    radio = 120
    for a in sys.argv[1:]:
        if a.startswith('--para='):
            para = a.split('=', 1)[1].strip()
        if a.startswith('--nombre='):
            nombre = a.split('=', 1)[1].strip()
        if a.startswith('--ciudad='):
            ciudad = a.split('=', 1)[1].strip()
        if a.startswith('--lugares='):
            lugares = int(a.split('=', 1)[1])
        if a.startswith('--radio='):
            radio = int(a.split('=', 1)[1])

    if not para:
        print('Falta --para=correo@dominio.cl')
        return

    asunto = f'{nombre}, te sumamos al piloto del radar cultural FASE ({ciudad})'
    html = html_piloto(nombre, ciudad, lugares, radio)
    print(f'asunto: {asunto}')
    print(f'para  : {para}' + ('  (+ copia a ' + CORREO_AGENTE + ')' if copia else ''))
    print(f'largo : {len(html)} caracteres de HTML')
    if not enviar:
        print('\n(informe: no se envió nada. Para enviar de verdad: --enviar)')
        return

    destinos = [para] + ([CORREO_AGENTE] if copia else [])
    for destino in destinos:
        cuerpo = json.dumps({'para': destino, 'asunto': asunto, 'html': html}).encode()
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
