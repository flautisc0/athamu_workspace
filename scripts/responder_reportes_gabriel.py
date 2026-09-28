#!/usr/bin/env python3
"""
Contestarle a un tester del piloto por los reportes que mandó desde la app.

Caso real (2026-09-27): Gabriel Ríos reportó 3 cosas a la 01:28–01:37 y quedaron 13 horas
sin leer, porque el CRM no tenía dónde verlas. Este script manda UNA respuesta que habla de
todos sus reportes (en vez de tres correos) y los marca como resueltos en el buzón, con la
nota de que se respondió. Queda registrado en `email_log`.

Uso:
    python3 scripts/responder_reportes_gabriel.py                 # informe (no envía)
    python3 scripts/responder_reportes_gabriel.py --enviar --copia # envía + copia al agente
"""
import json
import sys
import urllib.error
import urllib.request

HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app'
ADMIN = 'panxo.sms@gmail.com'
CORREO_AGENTE = 'fase.athamu@gmail.com'
TESTER = "atilan641@gmail.com"
NOMBRE = 'Gabriel'

APP = 'https://fase-mobile-897089213264.us-central1.run.app'
APK = 'https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk'


def pedir(ruta, metodo='GET', cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(HUB + ruta, data=datos, method=metodo,
                                 headers={'Content-Type': 'application/json', 'x-atha-email': ADMIN})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.loads(r.read().decode('utf-8', 'replace') or '{}')
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode('utf-8', 'replace')[:300]}


HTML = f"""
<p style="font-size:15px">Hola {NOMBRE},</p>

<p>Gracias por tomarte el tiempo de reportar. Nos llegaron <b>tus tres reportes</b> y
lamentablemente los leímos tarde — el canal estaba a medio hacer del lado nuestro. Ya está
arreglado: <b>cada reporte suena en el teléfono del equipo en el momento</b>, así que ninguno
se pierde de nuevo.</p>

<p>Te contesto los tres:</p>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>1 · “Al cambiarme el nombre este no persiste”.</b> Era un bug real y lo arreglamos: había dos
lugares que volvían a escribir el nombre viejo por atrás. Ahora el nombre y la foto se guardan
sólo desde tu perfil y ya no se pisan. Prueba de nuevo y debería quedar.</p>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>2 y 3 · “El chat no manda mensaje” y “las tareas tampoco se crean”.</b> Aquí la culpa es
nuestra por no avisarte antes: la app cambió de rumbo. Dejó de ser un mini-CRM con chat y pasó
a ser un <b>radar cultural</b>: <b>Inicio</b> (la cartelera), <b>Radar</b> (qué tienes cerca),
<b>Rutas</b>, <b>Muro</b> y <b>Perfil</b>. Esas dos pantallas se sacaron, así que lo que viste ya
no está en la app. El chat todavía no tiene lugar: cuando vuelva, va a estar dentro del Muro.</p>

<p style="background:#f5efe4;border:1px solid #e0d5c0;border-radius:14px;padding:12px 14px">
<b>Lo que queremos ahora:</b> que la uses como radar. Abre la app con tu correo, dale permiso a la
ubicación, mira la <b>cartelera real de Rancagua</b> en Inicio (con hora, lugar y a cuántos metros
te queda) y <b>ve a descubrir lugares</b>: cuando estés a menos de 120 m de uno puedes
desbloquear su ficha. Si algo no calza —un lugar mal ubicado, una función que cambió de fecha—
mandalo con <b>“Reportar algo”</b> adentro de la app: ahora sí lo vemos.</p>

<p style="margin:16px 0 6px">
  <a href="{APP}" style="background:#b4472c;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;display:inline-block">Abrir FASE</a>
</p>
<p style="font-size:13px"><a href="{APK}" style="color:#b4472c">Descargar la app (Android · APK)</a></p>

<p>Gracias por la paciencia,<br><b>Equipo FASE · ATHAMU</b><br>
<span style="color:#5e564c;font-size:13px">Si prefieres, respondé este correo y te leo.</span></p>
"""


def main():
    enviar = '--enviar' in sys.argv
    copia = '--copia' in sys.argv
    est, d = pedir('/api/v1/crm/piloto/reportes')
    if est != 200:
        print('no se pudo leer el buzón:', est, d)
        raise SystemExit(1)
    mios = [r for r in d.get('reportes', []) if (r.get('email') or '').lower() == TESTER]
    print(f'reportes de {TESTER}: {len(mios)}')
    for r in mios:
        print(f"  - [{(r.get('estado') or 'nuevo')}] {str(r.get('created_at'))[:16]} · {r.get('categoria')} · {r.get('pantalla')} · {str(r.get('texto'))[:60]}")
    if not mios:
        print('nada para responder.')
        return

    asunto = f'{NOMBRE}, sobre lo que reportaste en la app (y lo que cambió)'
    print(f'\nasunto: {asunto}')
    print(f'para  : {TESTER}' + ('  (+ copia a ' + CORREO_AGENTE + ')' if copia else ''))
    if not enviar:
        print('\n(informe: no se envió nada. Para enviar: --enviar [--copia])')
        return

    # Se anotó al piloto con gabo_641@hotmail.com y usa la app con atilan641@gmail.com:
    # se le manda a las dos casillas para que llegue seguro (es la misma persona).
    destinos = [TESTER, 'gabo_641@hotmail.com'] + ([CORREO_AGENTE] if copia else [])
    for destino in destinos:
        est, d2 = pedir('/api/v1/crm/avisos/correo', 'POST', {'para': destino, 'asunto': asunto, 'html': HTML})
        print(f'  {destino}: HTTP {est} · {str(d2)[:200]}')

    for r in mios:
        est, d2 = pedir(f"/api/v1/crm/piloto/reportes/{r['id']}", 'PATCH',
                        {'estado': 'resuelto', 'nota': 'Respondido por correo (ver email_log) — 2026-09-27',
                         'email': ADMIN})
        print(f"  reporte {r['id']} → {est} {d2 if est != 200 else 'resuelto'}")


if __name__ == '__main__':
    main()
