#!/usr/bin/env python3
"""ATHAMU v2 Fase 2: assemble + PDF/DOCX + logging."""
import importlib.util
import json
import sys
from pathlib import Path
from weasyprint import HTML

BASE = Path.home() / "athamu_workspace"
DEFAULT_OUTDIR = BASE / "output"

def assemble_html(data: dict, variant: str = "cinematic-dark") -> str:
    module = __import__("assemble_html")
    return module.render(data, variant)["html_text"]

def render_dossier(data: dict, variant: str = "cinematic-dark") -> dict:
    DEFAULT_OUTDIR.mkdir(parents=True, exist_ok=True)
    html_name = data.get("titulo") or data.get("TITULO") or "dossier"
    html_text = assemble_html(data, variant)
    html_path = DEFAULT_OUTDIR / f"{html_name}.html"
    pdf_path = DEFAULT_OUTDIR / f"{html_name}.pdf"
    docx_path = DEFAULT_OUTDIR / f"{html_name}.docx"
    html_path.write_text(html_text, encoding="utf-8")
    HTML(filename=str(html_path)).write_pdf(str(pdf_path))
    try:
        spec = importlib.util.spec_from_file_location("render_docx", str(BASE / "render_docx.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.render_docx(data, docx_path)
    except Exception:
        docx_path = None
    return {
        "variant": variant,
        "html": str(html_path),
        "pdf": str(pdf_path),
        "docx": str(docx_path) if docx_path and docx_path.exists() else None,
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("uso: render_dossier.py payload.json [variant]")
    payload_path = Path(sys.argv[1])
    variant = sys.argv[2] if len(sys.argv) > 2 else "cinematic-dark"
    print(render_dossier(json.loads(payload_path.read_text(encoding="utf-8")), variant))
