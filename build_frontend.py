#!/usr/bin/env python3
"""Script de limpieza y build del frontend CRM"""
import os
import signal
import subprocess
import sys

os.chdir('/home/flautisc0/athamu_workspace')
print("=== Limpieza de procesos colgados ===")
for pid in [757606, 757646]:
    try:
        os.kill(pid, 0)
        print(f"PID {pid}: existe, enviando SIGKILL")
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        print(f"PID {pid}: ya terminó")
    except Exception as e:
        print(f"PID {pid}: {e}")

print("\n=== Verificando dist actual ===")
if os.path.exists('dist'):
    for f in sorted(os.listdir('dist/assets')):
        if f.endswith('.js'):
            size = os.path.getsize(f'dist/assets/{f}')
            mtime = os.path.getmtime(f'dist/assets/{f}')
            print(f"  {f}: {size} bytes (modificado: {mtime})")
else:
    print("  dist/ no existe")

print("\n=== Limpiando caché de vite ===")
for cache_dir in ['node_modules/.vite', 'node_modules/.cache']:
    if os.path.exists(cache_dir):
        for f in os.listdir(cache_dir):
            fp = os.path.join(cache_dir, f)
            if os.path.isdir(fp):
                print(f"  Eliminando dir: {fp}")
                import shutil
                shutil.rmtree(fp, ignore_errors=True)
            else:
                print(f"  Eliminando: {fp}")
                os.remove(fp)
        print(f"  Caché {cache_dir} limpiado")
    else:
        print(f"  {cache_dir} no existe")

print("\n=== Iniciando build ===")
try:
    result = subprocess.run(
        ['./node_modules/.bin/vite', 'build'],
        capture_output=True,
        text=True,
        timeout=180,
        cwd='/home/flautisc0/athamu_workspace'
    )
    print(f"Exit code: {result.returncode}")
    if result.stdout:
        # Solo mostrar las últimas líneas relevantes
        lines = result.stdout.strip().split('\n')
        print('\n'.join(lines[-20:]) if len(lines) > 20 else result.stdout)
    if result.stderr:
        print(f"STDERR:\n{result.stderr[-1500:]}")
except subprocess.TimeoutExpired:
    print("ERROR: Build timed out after 180s")
    sys.exit(1)

print("\n=== Verificando resultado ===")
if os.path.exists('dist/assets/index-*.js'):
    print("✅ Build completado")
    for f in sorted(os.listdir('dist/assets')):
        if f.endswith('.js'):
            size = os.path.getsize(f'dist/assets/{f}')
            print(f"  {f}: {size} bytes")
else:
    print("❌ Build falló - no hay archivos JS en dist/")
    sys.exit(1)
