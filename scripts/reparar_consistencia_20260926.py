#!/usr/bin/env python3
"""Reparacion de las inconsistencias detectadas por scripts/auditoria_consistencia.py

Hace BACKUP de las tablas afectadas antes de tocar nada y despues aplica, de forma
idempotente:

  R1  preferencias por defecto (dia + esmeralda) para las cuentas reales que no las tenian
  R2  perfil de radar (XP/nivel/explorador) para las cuentas que no lo tenian
  R3  ficha en la nomina del CRM para los MIEMBROS que no figuraban (el CRM no los mostraba)
  R4  cuenta + membresia para la gente de la nomina que no podia entrar (los Schultz, Felipe)
  R5  fusiona el duplicado "Josefa CSL" en "Josefa Camila Schultz Leon"
  R6  borra las solicitudes de acceso basura (tablet / pepito locura / test de suplantacion)
  R7  quita la membresia de la cuenta semilla (seed) que ensuciaba la nomina

NO borra cuentas de usuario ni companias: eso queda a decision explicita de Francisco.
"""
import json
import os
import subprocess
import time
from pathlib import Path

WS = Path('/home/flautisc0/athamu_workspace')
TABLAS_BACKUP = ['users', 'company_members', 'company_people', 'radar_profiles',
                 'user_preferences', 'access_requests', 'companies']

# El codigo a ejecutar vive en scripts/reparar_consistencia.cjs
NODE = None


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
    destino = str(WS / 'backups' / ('consistencia-' + time.strftime('%Y%m%d-%H%M%S')))
    print('=== REPARACION DE CONSISTENCIA ===\n')
    p = subprocess.run(['node', 'scripts/reparar_consistencia.cjs', destino,
                        json.dumps(TABLAS_BACKUP)], cwd=str(WS),
                       env=credenciales(), capture_output=True, text=True, timeout=300)
    print(p.stdout.strip())
    if p.returncode != 0:
        print('--- STDERR ---')
        print(p.stderr.strip()[-1500:])
