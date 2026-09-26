#!/usr/bin/env python3
"""Runner generico: ejecuta un script .cjs de Node contra la base del hub.

Uso:  python3 scripts/correr_en_hub.py scripts/algun_script.cjs [args...]

Toma las credenciales del propio servicio de Cloud Run (nunca las imprime) y las
pasa por variables de entorno. Existe porque el repo es ESM ("type": "module"),
asi que los scripts de base van como .cjs (require disponible).
"""
import json
import os
import subprocess
import sys

WS = '/home/flautisc0/athamu_workspace'


def credenciales():
    g = subprocess.run(['gcloud', 'run', 'services', 'describe', 'atha-crm-web-frontend',
                        '--region', 'us-central1', '--project', 'athamubot', '--format=json'],
                       capture_output=True, text=True)
    env = {e['name']: e.get('value', '') for e in
           json.loads(g.stdout)['spec']['template']['spec']['containers'][0].get('env', [])}
    e = dict(os.environ)
    e.update({'DB_HOST': env.get('DB_HOST', ''), 'DB_PORT': str(env.get('DB_PORT', '3306')),
              'DB_USER': env.get('DB_USER', ''), 'DB_PASSWORD': env.get('DB_PASSWORD', ''),
              'DB_NAME': env.get('DB_NAME', 'admin_crm')})
    return e


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: python3 scripts/correr_en_hub.py <script.cjs> [args...]')
        raise SystemExit(2)
    r = subprocess.run(['node'] + sys.argv[1:], cwd=WS, env=credenciales(),
                       capture_output=True, text=True, timeout=600)
    print(r.stdout.strip())
    if r.returncode != 0:
        print('--- STDERR ---')
        print(r.stderr.strip()[-2000:])
    raise SystemExit(r.returncode)
