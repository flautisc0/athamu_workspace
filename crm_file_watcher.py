#!/usr/bin/env python3
"""
ATHA CRM File Watcher — vigila puntos de interconexión entre CRM y server.
Usa watchdog para eventos de FS en tiempo real.
Organiza automáticamente archivos nuevos en crm_data/.

Directorios vigulados:
1. /share_atha/incoming_audio/ — Upload server cerebro
2. /share_atha/docs/ — Docs compartidos
3. athamu_app_new/frontend/public/ — Assets frontend
4. athamu_app_new/backend/instance/ — DB local
5. athamu_app_new/planner-src/src/data/ — Outputs planner
6. athamu_workspace/ (patrones: *.sql, *.bak*, *.backup*) — Root workspace
"""
import os, shutil, json, threading
from datetime import datetime
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

CRM_BASE = "/home/flautisc0/athamu_workspace/crm_data"
LOG_FILE = CRM_BASE + "/watcher.log"
WATCH_ROOT = "/home/flautisc0/athamu_workspace"

# (path, recursive)
WATCH_TARGETS = [
    ("/home/flautisc0/share_atha/incoming_audio", True),
    ("/home/flautisc0/share_atha/docs", True),
    (WATCH_ROOT + "/athamu_app_new/frontend/public", True),
    (WATCH_ROOT + "/athamu_app_new/backend/instance", True),
    (WATCH_ROOT + "/athamu_app_new/planner-src/src/data", True),
]

# Extensiones tipo-skip (ruido)
SKIP_EXTS = ('.pyc', '.tmp', '.log')

class CRMEventHandler(FileSystemEventHandler):
    def __init__(self):
        self._lock = threading.Lock()

    def _log(self, msg):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        line = "[" + ts + "] " + msg
        print(line, flush=True)
        os.makedirs(CRM_BASE, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")

    def on_created(self, event):
        if event.is_directory:
            return
        src_path = str(event.src_path)
        with self._lock:
            self._handle_new_file(src_path, "creado")

    def on_modified(self, event):
        if event.is_directory:
            return
        src_path = str(event.src_path)
        fname = os.path.basename(src_path)
        # Skip ruido
        if fname.endswith(SKIP_EXTS) or fname.endswith('.json'):
            return
        with self._lock:
            self._handle_new_file(src_path, "modificado")

    def on_deleted(self, event):
        if event.is_directory:
            return
        src_path = str(event.src_path)
        rel = os.path.relpath(src_path, WATCH_ROOT)
        self._log("🗑️  [Eliminado] " + rel)

    def _handle_new_file(self, fpath, action):
        rel = os.path.relpath(fpath, WATCH_ROOT)
        fname = os.path.basename(fpath)
        ext = os.path.splitext(fname)[1].lower()
        try:
            fsize = os.path.getsize(fpath)
        except:
            return

        # 1. Incoming audio
        if "/share_atha/incoming_audio/" in fpath:
            fsize_str = (str(fsize // 1024) + "KB") if fsize < 10 * 1024 * 1024 else (str(fsize // 1024 // 1024) + "MB")
            self._log("🎵 [" + action.capitalize() + "] audio: " + fname + " (" + fsize_str + ")")
            return

        # 2. Assets frontend → documentos/fotos
        if "/frontend/public/" in fpath and ext in ('.png', '.jpg', '.jpeg', '.webp'):
            dst_dir = CRM_BASE + "/02_operativo/documentos/fotos"
            os.makedirs(dst_dir, exist_ok=True)
            dst = dst_dir + "/" + fname
            if not os.path.exists(dst):
                shutil.copy2(fpath, dst)
                self._log("📷 [" + action.capitalize() + "] foto: " + rel + " → documentos/fotos/" + fname)

        # 3. SQL scripts
        if ext == '.sql' and 'import_catalog' in fname:
            self._log("📝 [" + action.capitalize() + "] SQL: " + rel)

        # 4. Backups
        if '.bak' in fname or '.backup' in fname:
            dst_dir = CRM_BASE + "/04_entregables"
            os.makedirs(dst_dir, exist_ok=True)
            dst = dst_dir + "/" + fname
            if not os.path.exists(dst):
                shutil.copy2(fpath, dst)
                self._log("💾 [" + action.capitalize() + "] backup: " + rel)

        # 5. Planner data
        if "/planner-src/src/data/" in fpath and fname.endswith('.ts'):
            if fname == "mockData.ts":
                self._log("📊 [" + action.capitalize() + "] planner data: " + rel)
        if "planner-data" in fname:
            self._log("📊 [" + action.capitalize() + "] planner output: " + rel)

        # 6. DB changes
        if fname.endswith('.db'):
            self._log("🗄️  [" + action.capitalize() + "] database: " + rel + " (" + str(fsize // 1024) + "KB)")

        # 7. SQL en root
        if ext == '.sql' and fpath.startswith(WATCH_ROOT + "/"):
            self._log("📝 [" + action.capitalize() + "] SQL root: " + rel)

class RootWatcher(FileSystemEventHandler):
    """Watch only .sql and .bak files in the root workspace."""
    def __init__(self):
        self._lock = threading.Lock()

    def _log(self, msg):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        line = "[" + ts + "] " + msg
        print(line, flush=True)
        os.makedirs(CRM_BASE, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")

    def on_created(self, event):
        if event.is_directory:
            return
        src_path = str(event.src_path)
        fname = os.path.basename(src_path)
        ext = os.path.splitext(fname)[1].lower()
        with self._lock:
            if ext in ('.sql', '.bak') or '.backup' in fname:
                rel = os.path.relpath(src_path, WATCH_ROOT)
                self._log("📝 [Creado] root: " + rel)

# ── Setup observers ──────────────────────────────────────────────────────

def main():
    os.makedirs(CRM_BASE, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write("\n" + "=" * 60 + "\n")
        f.write("[" + timestamp + "] 🕵️ CRM File Watcher iniciado\n")
        f.write("=" * 60 + "\n")

    print("[" + timestamp + "] 🕵️ CRM File Watcher iniciado", flush=True)
    print("  Vigilando " + str(len(WATCH_TARGETS) + 1) + " puntos:", flush=True)
    for path, _ in WATCH_TARGETS:
        print("  - " + path, flush=True)
    print("  - " + WATCH_ROOT + "/ (*.sql *.bak *.backup)", flush=True)

    observer = Observer()

    for watch_path, recursive in WATCH_TARGETS:
        if os.path.exists(watch_path):
            handler = CRMEventHandler()
            observer.schedule(handler, watch_path, recursive=recursive)

    root_handler = RootWatcher()
    observer.schedule(root_handler, WATCH_ROOT, recursive=False)

    observer.start()
    print("\n✅ Watcher activo. Ctrl+C para detener.", flush=True)

    try:
        while True:
            pass
    except KeyboardInterrupt:
        observer.stop()
        print("\n🛑 Watcher detenido.", flush=True)
    observer.join()

if __name__ == "__main__":
    main()
