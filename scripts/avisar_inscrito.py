#!/usr/bin/env python3
"""Le manda a una persona anotada en la prueba el enlace de acceso (app web + APK).

Usa el token de Google que ya vive en la máquina (~/.hermes/google_token.json, con
permiso gmail.send), así que el correo sale desde la cuenta de Francisco. No hay que
configurar SMTP ni nada.

Uso:
    python3 scripts/avisar_inscrito.py <correo> [nombre]

Los enlaces salen de la propia configuración del piloto: si cambia la URL de la app o
del APK, se cambia aquí y listo.
"""
import base64
import json
import os
import sys
from email.mime.text import MIMEText
from urllib.parse import urlencode

import requests

TOKEN_PATH = os.path.expanduser('~/.hermes/google_token.json')
APP_WEB = 'https://fase-mobile-897089213264.us-central1.run.app'
APK = 'https://storage.googleapis.com/atha-crm-obras-897089213264/fase-mobile/FASE-Mobile-1.0-piloto.apk'
PILOTO = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app/piloto'


def token_de_acceso():
    """Refresca el access token a partir del refresh_token (sin imprimir secretos)."""
    d = json.load(open(TOKEN_PATH))
    r = requests.post('https://oauth2.googleapis.com/token', data={
        'client_id': d['client_id'],
        'client_secret': d['client_secret'],
        'refresh_token': d['refresh_token'],
        'grant_type': 'refresh_token',
    }, timeout=30)
    r.raise_for_status()
    return r.json()['access_token'], d.get('account', '')


def cuerpo(nombre: str) -> tuple[str, str]:
    asunto = 'Tu acceso a la prueba de FASE · ATHA Producciones'
    texto = f"""Hola {nombre},

¡Gracias por sumarte a la prueba del ecosistema FASE!

Ya puedes entrar, cuando quieras:

1) EN LA COMPUTADORA (lo más rápido)
   Abre este enlace y entra con tu cuenta de Google:
   {APP_WEB}

2) EN EL CELULAR ANDROID
   Descarga la app e instalala (si te avisa que es de un origen desconocido,
   elige "Instalar de todos modos"):
   {APK}
   Después abrila y entra con la misma cuenta de Google.

QUÉ VAS A PODER HACER
- Descubrir nodos culturales con el GPS y el código QR.
- Publicar fotos en el muro, comentar y reaccionar.
- Ver el perfil de tu compañía: su equipo, sus montajes y sus aportes.

Y cuando algo te resulte confuso o no funcione, toca el botón "Reportar"
(abajo a la derecha, en todas las pantallas). El reporte llega con la pantalla
donde estabas y, si quieres, con una captura. Eso es lo más valioso de la prueba:
no hace falta que sea "un error", sirve cualquier cosa que te resulte incómoda.

Cualquier duda, respondé este correo.

Un abrazo,
Equipo ATHA Producciones
"""
    return asunto, texto


def enviar(para: str, nombre: str) -> None:
    access, cuenta = token_de_acceso()
    asunto, texto = cuerpo(nombre or 'hola')
    msg = MIMEText(texto, 'plain', 'utf-8')
    msg['To'] = para
    msg['From'] = cuenta or 'me'
    msg['Subject'] = asunto
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    r = requests.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        headers={'Authorization': f'Bearer {access}'},
        json={'raw': raw}, timeout=60)
    if r.status_code >= 300:
        print('no se pudo enviar:', r.status_code, r.text[:300])
        sys.exit(1)
    print(f'enviado a {para} (desde {cuenta}) · id {r.json().get("id")}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: python3 scripts/avisar_inscrito.py <correo> [nombre]')
        sys.exit(2)
    enviar(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '')
    print('enlaces incluidos:', APP_WEB, '|', APK, '|', PILOTO)
