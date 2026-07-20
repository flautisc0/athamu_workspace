#!/usr/bin/env python3
"""ATHAMU Fase 2: assemble HTML from components + tokens + variant."""
import json
import re
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

WORKSPACE = Path.home() / "athamu_workspace"
TOKENS_PATH = WORKSPACE / "tokens" / "atha-design-tokens.json"
COMPONENTS_DIR = WORKSPACE / "templates" / "components"
VARIANTS_DIR = WORKSPACE / "templates" / "variants"
BASE_TEMPLATE = COMPONENTS_DIR / "base.html"
DEFAULT_VARIANT = "cinematic-dark"
DEFAULT_OUTPUT = WORKSPACE / "output"
LOGO_CANDIDATES = [
    WORKSPACE / "templates" / "assets" / "logo_atha.png",
    WORKSPACE / "templates" / "assets" / "logo_atha.jpg",
    WORKSPACE / "templates" / "assets" / "logo_atha.svg",
]
PLACEHOLDER = "https://drive.google.com/thumbnail?id=10CPr4Ywd2VnPl3GIfCBwK6ihflS6MS3n&sz=w2000"
REQUIRED_UPPERCASE = ["TITULO", "ARTISTA", "SINOPSIS"]


def load_tokens() -> dict:
    if not TOKENS_PATH.exists():
        return {}
    try:
        return json.loads(TOKENS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def find_logo() -> str | None:
    for candidate in LOGO_CANDIDATES:
        if candidate.exists():
            return f"file://{candidate}"
    return None


def load_schema_defaults() -> dict:
    schema_path = WORKSPACE / "schema" / "dossier_schema.json"
    if not schema_path.exists():
        return {}
    try:
        data = json.loads(schema_path.read_text(encoding="utf-8"))
        return data.get("defaultSnippets", {})
    except Exception:
        return {}


def normalize_image(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("drive.google.com"):
        try:
            file_id = url.split("id=")[-1].split("&")[0]
            return f"https://drive.google.com/thumbnail?id={file_id}&sz=w2000"
        except Exception:
            return PLACEHOLDER
    return url


def map_payload(data: dict) -> dict:
    alias_map = {
        "titulo": "TITULO",
        "subtitulo": "SUBTITULO",
        "descripcion_corta": "DESCRIPCION_CORTA",
        "fecha": "FECHA",
        "sinopsis": "SINOPSIS",
        "propuesta_texto": "PROPUESTA_TEXTO",
        "nota_direccion": "NOTA_DIRECCION",
        "requerimientos_texto": "REQUERIMIENTOS_TEXTO",
        "requerimientos_detalle": "REQUERIMIENTOS_DETALLE",
        "contacto_texto": "CONTACTO_TEXTO",
        "cierre_texto": "CIERRE_TEXTO",
        "imagen_1": "IMAGEN_1",
        "imagen_2": "IMAGEN_2",
        "email": "EMAIL",
        "web": "WEB",
        "redes": "REDES",
        "artista": "ARTISTA",
    }
    out = dict(data)
    for src, dst in alias_map.items():
        if src in out and dst not in out:
            out[dst] = out[src]
    return out


def apply_defaults(data: dict) -> dict:
    out = dict(data)
    defaults = load_schema_defaults()
    for key, default in defaults.items():
        out.setdefault(key, default)
    return out


def validate_payload(data: dict) -> list:
    warnings = []
    for key in ["TITULO", "ARTISTA", "SINOPSIS"]:
        if not data.get(key):
            warnings.append(f"Falta campo requerido: {key}")
    img = data.get("IMAGEN_1", "")
    if img:
        parsed = urlparse(img)
        if parsed.scheme not in {"http", "https"}:
            warnings.append("IMAGEN_1 no es http/https")
    return warnings


def build_blocks(data: dict, warnings: list) -> dict:
    im1 = normalize_image(data.get("IMAGEN_1", ""))
    im2 = normalize_image(data.get("IMAGEN_2", "") or "")
    if not im1:
        im1 = PLACEHOLDER
    data["IMAGEN_1"] = im1
    data["IMAGEN_2"] = im2 or ""
    data.setdefault("LOGO_ABS", find_logo() or "")

    im2_block = ""
    if data.get("IMAGEN_2"):
        im2_block = f'<img src="{data["IMAGEN_2"]}" alt="Imagen 2" class="gallery-img">'
    data["IMAGEN_2_BLOCK"] = im2_block

    for key in ["EMAIL", "WEB", "REDES"]:
        block = ""
        value = (data.get(key) or "").strip()
        if value:
            if key == "EMAIL":
                block = f'<p>Email: <a href="mailto:{value}" style="color:var(--accent-gold)">{value}</a></p>'
            elif key == "WEB":
                block = f'<p>Web: <a href="{value}" target="_blank" style="color:var(--accent-gold)">{value}</a></p>'
            elif key == "REDES":
                block = f"<p>Redes: {value}</p>"
        data[f"{key}_BLOCK"] = block
    return data


def load_component(name: str, data: dict, logo_abs: str | None) -> str:
    component_path = COMPONENTS_DIR / f"{name}.html"
    if not component_path.exists():
        return ""
    html = component_path.read_text(encoding="utf-8")
    html = html.replace("{{LOGO_ABS}}", logo_abs or "")
    page_number = data.get("PAGE_NUMBER", "")
    html = html.replace("{{PAGE_NUMBER}}", str(page_number))
    for key, value in data.items():
        html = html.replace("{{" + key + "}}", str(value if value is not None else ""))
    leftover = re.findall(r"\{\{[A-Z0-9_]+}}", html)
    if leftover:
        raise SystemExit(f"Componente {name} con marcadores sin reemplazar: {leftover}")
    return html


def load_variant_styles(variant: str) -> tuple[str, str]:
    css_path = VARIANTS_DIR / f"{variant}.css"
    if css_path.exists():
        return "", css_path.read_text(encoding="utf-8")
    html_path = VARIANTS_DIR / f"{variant}.html"
    if html_path.exists():
        text = html_path.read_text(encoding="utf-8")
        match = re.search(r"<style>(.*?)</style>", text, re.S)
        if match:
            return "", match.group(1)
    return "", ""


def render_html(data: dict, variant: str = DEFAULT_VARIANT) -> str:
    if not BASE_TEMPLATE.exists():
        raise SystemExit("Falta base.html en templates/components/")

    data = apply_defaults(data)
    data = map_payload(data)
    warnings = validate_payload(data)
    if warnings:
        print("Advertencias:", warnings, file=__import__("sys").stderr)
    data = build_blocks(data, warnings)
    data["LOGO_ABS"] = data.get("LOGO_ABS") or find_logo() or ""

    pages = [
        ("header", "portada"),
        ("sinopsis", "sinopsis"),
        ("galeria", "galeria"),
        ("contacto", "contacto")
    ]
    components_html = ""
    for idx, (component_name, _page_id) in enumerate(pages, start=1):
        data["PAGE_NUMBER"] = f"{idx:02d} / {len(pages):02d}"
        components_html += load_component(component_name, data, data.get("LOGO_ABS"))

    base_html = BASE_TEMPLATE.read_text(encoding="utf-8")
    token_css, variant_css = load_variant_styles(variant)
    base_html = base_html.replace("{{CSS_VARIABLES}}", token_css)
    base_html = base_html.replace("{{VARIANT_STYLES}}", variant_css)
    base_html = base_html.replace("{{COMPONENTS}}", components_html)

    for key, value in data.items():
        base_html = base_html.replace("{{" + key + "}}", str(value if value is not None else ""))
    leftover = re.findall(r"\{\{[A-Z0-9_]+}}", base_html)
    if leftover:
        raise SystemExit(f"Marcadores sin reemplazar: {leftover}")

    DEFAULT_OUTPUT.mkdir(parents=True, exist_ok=True)
    html_name = data.get("TITULO") or data.get("titulo") or "dossier"
    html_path = DEFAULT_OUTPUT / f"{html_name}.html"
    html_path.write_text(base_html, encoding="utf-8")

    log = {
        "timestamp": datetime.now().isoformat(),
        "variant": variant,
        "tokens_loaded": bool(load_tokens()),
        "logo_used": bool(data.get("LOGO_ABS")),
        "warnings": warnings,
        "components_loaded": [name for name, _ in pages],
        "html": str(html_path),
    }
    log_path = DEFAULT_OUTPUT / f"{html_name}_assemble_log.json"
    log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    return base_html


def render(data: dict, variant: str = DEFAULT_VARIANT) -> dict:
    html_text = render_html(data, variant)
    html_name = data.get("TITULO") or data.get("titulo") or "dossier"
    return {
        "html": str(DEFAULT_OUTPUT / f"{html_name}.html"),
        "variant": variant,
        "html_text": html_text
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("uso: assemble_html.py payload.json [variant]")
    payload_path = Path(sys.argv[1])
    variant = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_VARIANT
    print(render(json.loads(payload_path.read_text(encoding="utf-8")), variant))
