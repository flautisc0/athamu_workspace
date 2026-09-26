#!/usr/bin/env python3
"""athamu_delegate.py — Hermes -> OpenClaw bridge for ATHAMU pipeline polishing.

Usage:
    python athamu_delegate.py polish-ideas
    python athamu_delegate.py polish-planner
    python athamu_delegate.py polish-script --day_idx 0
    python athamu_delegate.py polish-report
    python athamu_delegate.py status
"""

import os, sys, json, subprocess, time, urllib.request
from pathlib import Path

OPENCLAW = "/home/flautisc0/.local/bin/openclaw"
PIPELINE_DIR = Path(__file__).resolve().parent
APP_URL = "http://127.0.0.1:5100"
GATEWAY_URL = "http://127.0.0.1:18789"
AUTH_TOKEN = "f6bc3d4ff2cbeadfb4d3141e5b0231becefae41e383daa83"  # from openclaw.json


def _rpc(method: str, params: dict = None, id: int = 1):
    """Send one JSON-RPC message to OpenClaw gateway; return parsed response."""
    body = json.dumps({"jsonrpc": "2.0", "id": id, "method": method, "params": params or {}}).encode()
    req = urllib.request.Request(GATEWAY_URL + "/messages", data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AUTH_TOKEN}",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    try:
        return json.loads(raw)
    except Exception:
        return {"_raw": raw.decode("utf-8", errors="replace")}


def _init_session() -> dict:
    """Initialize MCP session; return parsed response."""
    res = _rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "athamu-bridge", "version": "0.1"}})
    return res or {}


def _pipeline_state() -> dict:
    try:
        with urllib.request.urlopen(APP_URL + "/content/state", timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"_error": str(e)}


def _app_version() -> str:
    try:
        with urllib.request.urlopen(APP_URL + "/health", timeout=5) as r:
            payload = json.loads(r.read())
            return payload.get("status", "ok")
    except Exception:
        return "down"


def _check_gateway() -> dict:
    try:
        with urllib.request.urlopen(GATEWAY_URL + "/health", timeout=5) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _build_prompt(task: str, state: dict) -> str:
    lines = [f"# ATHAMU Pipeline Polish Task: {task}", "", "## Contexto"]
    for key in ("ideas", "weekly_plans", "scripts", "reports"):
        items = state.get(key, [])[-5:]
        if items:
            lines.append(f"- {key}: {len(state.get(key, []))} items (últimos 5): {json.dumps(items, ensure_ascii=False)[:500]}")
    if state.get("_error"):
        lines.append(f"- ERROR: {state['_error']}")
    lines += [
        "",
        "## Objetivo de pulido",
        "- Mejorar títulos, hooks, CTAs y distribución por pilares según DS ATHAMU.",
        "- Eliminar duplicados y alinear guiones al tono real de Francisco (flautista/productor).",
        "- Añadir métricas específicas por serie y hashtags relevantes a música/piano/flauta.",
        "- Especificar próximos pasos accionables para cada ítem.",
        "- Si no hay datos previos, proponer valores mínimos realistas basados en el perfil ATHAMU.",
        "",
        "## Salida requerida",
        "Devuelve solo un JSON minificado así:",
        '{"task":"<task>","refined": [...], "summary":"..."}',
    ]
    return "\n".join(lines)


def _call_openclaw_agent(message: str) -> dict:
    cmd = [
        OPENCLAW,
        "agent",
        "--local",
        "--json",
        "--message", message,
        "--timeout", "120",
    ]
    env = os.environ.copy()
    env.setdefault("PATH", "/home/flautisc0/.local/bin:" + env.get("PATH", ""))
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=130, env=env)
        out = p.stdout.strip()
        if p.returncode != 0:
            return {"ok": False, "error": p.stderr[-500:], "stdout_tail": out[-500:]}
        # Extract JSON from output if wrapped
        try:
            return {"ok": True, "result": json.loads(out), "_stdout": out[:1000]}
        except Exception:
            return {"ok": True, "raw": out[:2000]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def cmd_polish(task_alias: str) -> dict:
    state = _pipeline_state()
    if state.get("_error"):
        return state
    prompt = _build_prompt(task_alias, state)
    result = _call_openclaw_agent(prompt)
    actionable = {"ok": result.get("ok"), "task": task_alias, "profile": "flautisc0", "pipeline": state}
    if "result" in result:
        actionable["polished"] = result["result"]
    else:
        actionable["raw_output"] = result.get("raw", result.get("error"))
    return actionable


def cmd_status() -> dict:
    return {
        "app": _app_version(),
        "gateway": _check_gateway(),
        "pipeline_state_keys": list(_pipeline_state().keys()) if not _pipeline_state().get("_error") else ["error"],
        "openclaw_binary": OPENCLAW,
    }


TASKS = {
    "polish-ideas": "ideas",
    "polish-planner": "planner",
    "polish-script": "script",
    "polish-report": "report",
    "polish-all": "all",
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "status":
        out = cmd_status()
    elif cmd in TASKS:
        alias = TASKS[cmd]
        if alias == "all":
            results = {}
            for t in ("polish-ideas", "polish-planner", "polish-script", "polish-report"):
                results[t] = cmd_polish(t)
                time.sleep(0.3)
            out = {"ok": True, "profile": "flautisc0", "tasks": results}
        else:
            out = cmd_polish(f"polish-{alias}")
    else:
        print(f"unknown task: {cmd}", file=sys.stderr)
        sys.exit(2)

    print(json.dumps(out, ensure_ascii=False, indent=2 if "--pretty" in sys.argv else None))


if __name__ == "__main__":
    main()
