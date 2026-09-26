#!/usr/bin/env python3
"""Script para build y deploy del frontend con timeout controlado"""
import os
import subprocess
import sys
import time

os.chdir('/home/flautisc0/athamu_workspace')
os.makedirs('/tmp/build_logs', exist_ok=True)

def run_command(cmd, timeout=180):
    """Ejecutar comando con timeout y logging"""
    print("\n" + "=" * 60)
    print(f"Ejecutando: {cmd[:100]}")
    print("=" * 60)
    
    start = time.time()
    try:
        result = subprocess.run(
            cmd, shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd='/home/flautisc0/athamu_workspace'
        )
        elapsed = time.time() - start
        print(f"Completado en {elapsed:.1f}s (exit={result.returncode})")
        
        if result.stdout:
            lines = result.stdout.strip().split('\n')
            relevant = lines[-30:] if len(lines) > 30 else lines
            print('\n'.join(relevant))
        
        if result.stderr:
            for line in result.stderr.strip().split('\n')[-10:]:
                print(f"  [stderr] {line}")
        
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        print(f"TIMEOUT despues de {elapsed:.1f}s")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("=" * 60)
    print("BUILD + DEPLOY CRM-WEB FRONTEND")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 1. Verificar que AuthModal tiene las modificaciones
    print("\n--- Verificando modificaciones previas ---")
    auth_path = 'src/components/AuthModal.tsx'
    if os.path.exists(auth_path):
        with open(auth_path, 'r', errors='replace') as f:
            auth_content = f.read()
        
        checks = {
            'handleGoogleLogin': 'Funcion handleGoogleLogin',
            'performGoogleLogin': 'Funcion performGoogleLogin',
            'handleGoogleResponse': 'Funcion handleGoogleResponse',
            'accounts.google.com/gsi/client': 'Script GIS',
            'sg7hr4e5g269u1lirj19r349ahaheftr': 'Client ID real',
            'id="google-btn"': 'ID google-btn en JSX',
        }
        
        all_ok = True
        for term, desc in checks.items():
            if term in auth_content:
                print(f"  OK {desc}")
            else:
                print(f"  FALTA: {desc}")
                all_ok = False
        
        if not all_ok:
            print("\nAlgunas modificaciones faltan - verificar AuthModal.tsx")
    else:
        print("  AuthModal.tsx no encontrado")
    
    # 2. Verificar api.php
    print("\n--- Verificando api.php ---")
    api_path = 'php/api.php'
    if os.path.exists(api_path):
        with open(api_path, 'r', errors='replace') as f:
            api_content = f.read()
        if 'auth_google' in api_content:
            print("  OK Accion auth_google en api.php")
        else:
            print("  FALTA: accion auth_google")
    else:
        print("  api.php no encontrado")
    
    # 3. Detener servidor Node existente que pueda interferir
    print("\n--- Limpiando procesos que pueden interferir ---")
    for proc_name in ['node server.js', 'node server.mjs', 'vite', 'npm']:
        try:
            subprocess.run(
                f"pkill -f '{proc_name}' 2>/dev/null",
                shell=True, capture_output=True, text=True, timeout=5
            )
        except:
            pass
    
    time.sleep(1)
    
    # 4. Build
    print("\n--- BUILD ---")
    
    # Intentar con vite directo
    success = run_command(
        './node_modules/.bin/vite build --force',
        timeout=180
    )
    
    if success:
        # 5. Verificar el build
        print("\n--- Verificando resultado del build ---")
        if os.path.exists('dist/assets/index-*.js'):
            import glob
            js_files = glob.glob('dist/assets/index-*.js')
            if js_files:
                js_file = sorted(js_files)[-1]
                size = os.path.getsize(js_file)
                print(f"  OK Build exitoso: {js_file} ({size} bytes)")
                
                # 6. Verificar que el JS tiene el login de Google
                print("\n--- Verificando contenido del JS ---")
                with open(js_file, 'r', errors='replace') as f:
                    js_content = f.read()
                
                google_checks = {
                    'accounts.google.com/gsi/client': 'Script GIS',
                    'handleGoogleLogin': 'Funcion handleGoogleLogin',
                    'sg7hr4e5g269u1lirj19r349ahaheftr': 'Client ID',
                }
                
                has_google = False
                for term, desc in google_checks.items():
                    if term in js_content:
                        print(f"  OK JS contiene {desc}")
                        has_google = True
                    else:
                        print(f"  NO contiene {desc}")
                
                if has_google:
                    print("\n  JS tiene login Google real - listo para deploy")
                else:
                    print("\n  JS no tiene login Google - necesita rebuild")
            else:
                print("  No hay archivos JS en dist/")
        else:
            print("  No se encontro dist/assets/index-*.js")
    else:
        print("\n--- Fallo el build con vite directo ---")
        
        # Limpiar dist y intentar de nuevo
        print("\n--- Intentando enfoque alternativo ---")
        
        if os.path.exists('dist'):
            import shutil
            shutil.rmtree('dist', ignore_errors=True)
        
        success2 = run_command(
            './node_modules/.bin/vite build --mode production',
            timeout=120
        )
        
        if not success2:
            print("\nFallo el build completamente")
            print("\n=== Alternativa: usar JS del build previo ===")
            print("El JS actual (index-BkPUel63.js) NO tiene el login Google.")
            print("Para la presentacion de hoy se usara el login simulado.")
            print("El backend ya tiene auth_google listo para cuando se haga el rebuild.")
            return 1
    
    # 7. Deploy a Cloud Run
    if success or success2:
        print("\n--- DEPLOY A CLOUD RUN ---")
        
        deploy_cmd = (
            'gcloud run deploy atha-crm-web-frontend '
            '--source . '
            '--region us-central1 '
            '--platform managed '
            '--allow-unauthenticated '
            '--set-env-vars="VITE_BACKEND_URL=https://atha-producciones-app-897089213264.us-central1.run.app" '
            '--timeout=900s'
        )
        
        success_deploy = run_command(deploy_cmd, timeout=600)
        
        if success_deploy:
            print("\nDEPLOY COMPLETADO")
            print("URL: https://atha-crm-web-frontend-897089213264.us-central1.run.app")
        else:
            print("\nDeploy fallo - verificar logs")
            return 1
    
    print("\n" + "=" * 60)
    print("PROCESO COMPLETADO")
    print("=" * 60)
    return 0

if __name__ == '__main__':
    sys.exit(main())
