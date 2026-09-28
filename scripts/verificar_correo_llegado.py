#!/usr/bin/env python3
"""
¿El correo LLEGÓ? Comprueba el buzón del agente (fase.athamu@gmail.com) por IMAP.

Un `250` del SMTP sólo dice que Gmail lo aceptó, no que llegó ni cómo se ve. Esto
abre el INBOX de verdad y busca por asunto / destinatario.

Uso:
    python3 scripts/verificar_correo_llegado.py --asunto="radar cultural"
    python3 scripts/verificar_correo_llegado.py --para=pipe.naranjo33@gmail.com --limite=5

Credenciales: ~/.hermes/athamu_mail.json (600) — contraseña de aplicación, revocable.
"""
import email
import imaplib
import json
import os
import sys
import time
from email.header import decode_header


def credenciales():
    p = os.path.expanduser('~/.hermes/athamu_mail.json')
    d = json.load(open(p, encoding='utf-8'))
    return d['cuenta'], d['app_password'], d.get('imap', 'imap.gmail.com')


def texto_de(msg, partes=('text/plain', 'text/html')):
    """Devuelve el primer cuerpo del tipo pedido, decodificado."""
    for parte in msg.walk():
        if parte.get_content_type() in partes:
            carga = parte.get_payload(decode=True) or b''
            charset = parte.get_content_charset() or 'utf-8'
            return parte.get_content_type(), carga.decode(charset, 'ignore')
    return '', ''


def main():
    asunto = ''
    para = ''
    limite = 5
    for a in sys.argv[1:]:
        if a.startswith('--asunto='):
            asunto = a.split('=', 1)[1]
        if a.startswith('--para='):
            para = a.split('=', 1)[1]
        if a.startswith('--limite='):
            limite = int(a.split('=', 1)[1])

    cuenta, clave, servidor = credenciales()
    print(f'buzón: {cuenta} ({servidor})')
    imap = imaplib.IMAP4_SSL(servidor, 993)
    imap.login(cuenta, clave)
    imap.select('INBOX')

    criterio = []
    if asunto:
        criterio += ['SUBJECT', f'"{asunto}"']
    if para:
        criterio += ['TO', f'"{para}"']
    if not criterio:
        criterio = ['ALL']
    ok, datos = imap.search(None, *criterio)
    ids = (datos[0] or b'').split()
    print(f'mensajes que coinciden: {len(ids)}')
    if not ids:
        imap.logout()
        print('\n(no llegó nada con ese criterio — puede tardar unos segundos; vuelve a intentar)')
        return

    for num in ids[-limite:][::-1]:
        ok, d = imap.fetch(num, '(RFC822)')
        msg = email.message_from_bytes(d[0][1])

        def dec(s):
            """Decodifica encabezados; si el charset es raro ('unknown-8bit'), cae a utf-8."""
            salida = []
            for trozo, charset in decode_header(s or ''):
                if not isinstance(trozo, bytes):
                    salida.append(trozo)
                    continue
                for enc in (charset, 'utf-8', 'latin-1'):
                    try:
                        salida.append(trozo.decode(enc or 'utf-8', 'ignore'))
                        break
                    except (LookupError, UnicodeDecodeError):
                        continue
                else:
                    salida.append(trozo.decode('utf-8', 'ignore'))
            return ''.join(salida)

        tipo, cuerpo = texto_de(msg)
        print('\n' + '=' * 70)
        print('de     :', dec(msg.get('From')))
        print('para   :', dec(msg.get('To')))
        print('reply  :', dec(msg.get('Reply-To') or '(sin Reply-To)'))
        print('asunto :', dec(msg.get('Subject')))
        print('fecha  :', msg.get('Date'))
        print('cuerpo :', tipo or '(sin text/plain ni text/html)')
        limpio = ' '.join(cuerpo.split())
        print('texto  :', limpio[:400] + ('…' if len(limpio) > 400 else ''))
        # ¿van los links clave?
        for clave_link in ('fase-mobile', 'storage.googleapis.com/atha-crm-obras'):
            print(f'  link {clave_link}: {"SÍ" if clave_link in cuerpo else "NO"}')
    imap.logout()


if __name__ == '__main__':
    main()
