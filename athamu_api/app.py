import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY") or os.popen("grep -E '^OPENROUTER_API_KEY=' /home/flautisc0/.hermes/.env | sed 's/^OPENROUTER_API_KEY=//'").read().strip() or os.popen("grep -E '^OPENROUTER_API_KEY=' /home/flautisc0/.hermes/.env 2>/dev/null | head -n 1 | cut -d= -f2-").read().strip()
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-chat-latest")

SYSTEM_PROMPTS = {
    "artista": (
        "Sos ATHAMU en Modo Artista. "
        "Ayudás con dossieres, campañas, repertorio y formatos de presentación. "
        "Respondé en español, concreto, accionable."
    ),
    "gestion": (
        "Sos ATHAMU en Modo Gestión Cultural. "
        "Ayudás con fondos, presupuestos, mailing, calendarios y postulaciones. "
        "Respondé en español, concreto, accionable."
    ),
    "musico": (
        "Sos ATHAMU en Modo Músico/Tecnológico. "
        "Ayudás con partituras, audio, MIDI, OMR y validación. "
        "Respondé en español, concreto, accionable."
    ),
    "meta": (
        "Sos ATHAMU en Modo Meta-Reflexivo. "
        "Revisás coherencia ética, auditoría interna y marcos ATHA. "
        "Respondé en español, concreto, accionable."
    ),
}

HISTORY = {}


@app.route("/modes", methods=["GET"])
def list_modes():
    return jsonify([
        {"key": k, "title": v.split("\n")[0].split("Sos ATHAMU en ")[1].split(".")[0]}
        for k, v in SYSTEM_PROMPTS.items()
    ])


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


def _get_conversation(session_id):
    return HISTORY.setdefault(session_id, {"messages": []})


@app.route("/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    mode = (body.get("mode") or "").strip().lower()
    message = (body.get("message") or "").strip()
    session_id = body.get("session_id") or "default"

    if mode not in SYSTEM_PROMPTS:
        return jsonify({"error": "Invalid mode", "valid_modes": list(SYSTEM_PROMPTS.keys())}), 400

    conversation = _get_conversation(session_id)
    if not conversation["messages"]:
        conversation["messages"].append({"role": "system", "content": SYSTEM_PROMPTS[mode]})

    user_msg = {"role": "user", "content": message}
    conversation["messages"].append(user_msg)

    try:
        payload = {
            "model": MODEL,
            "messages": conversation["messages"],
            "max_tokens": 600,
            "temperature": 0.4,
        }
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://athamu.app",
            "X-Title": "ATHAMU",
        }
        resp = requests.post(f"{OPENROUTER_BASE_URL}/chat/completions", json=payload, headers=headers, timeout=60)
        data = resp.json()
        if resp.status_code >= 400 or "choices" not in data:
            reply = f"Error upstream: {data}"
        else:
            reply = data["choices"][0]["message"]["content"]
    except Exception as exc:
        reply = f"Error llamando a Hermes/OpenRouter: {exc}"

    assistant_msg = {"role": "assistant", "content": reply}
    conversation["messages"].append(assistant_msg)

    return jsonify({
        "mode": mode,
        "reply": reply,
        "messages": conversation["messages"],
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
