#!/usr/bin/env python3
"""
MCP: Mermaid Checkpoint Protocol v1.0
Genera diagramas Mermaid desde el estado real del CRM + valida healthchecks.
"""
import os, json, re, urllib.request
from datetime import datetime
from glob import glob

class MCPGenerator:
    def __init__(self):
        self.base = "/home/flautisc0/athamu_workspace"
        self.crm_data = f"{self.base}/crm_data"
        self.checkpoint_dir = f"{self.crm_data}/04_entregables/checkpoints"
        os.makedirs(self.checkpoint_dir, exist_ok=True)

    def _inspect_routes(self):
        endpoints = []
        routes_dir = f"{self.base}/athamu_app_new/backend/app/routes"
        if os.path.exists(routes_dir):
            for f in glob(f"{routes_dir}/*.py"):
                fname = os.path.basename(f)
                if fname.startswith("__pycache__") or fname == "__init__.py": continue
                try:
                    with open(f) as fh:
                        content = fh.read()
                    matches = re.findall(r'@(?:\w+)_bp\.route\("([^"]+)"', content)
                    for match in matches:
                        endpoints.append({
                            "file": fname,
                            "endpoint": match,
                            "methods": re.findall(r'methods=\[([^\]]+)\]', content)[:1]
                        })
                except:
                    pass
        return endpoints

    def _check_services(self):
        services = {
            "flask_local": "http://127.0.0.1:5052/health",
            "crm_v1_uc": "https://crm-v1-uc-897089213264.us-central1.run.app/health",
            "upload_server": "http://127.0.0.1:8085/",
            "next_dev": "http://127.0.0.1:3003/",
            "admin_panel": "https://atha-crm-admin-897089213264.us-central1.run.app/"
        }
        status = {}
        for name, url in services.items():
            try:
                req = urllib.request.Request(url, method='GET')
                with urllib.request.urlopen(req, timeout=5) as resp:
                    status[name] = {"status": "✅ HTTP " + str(resp.status), "url": url}
            except Exception as e:
                status[name] = {"status": "❌ " + str(e)[:30], "url": url}
        return status

    def _gen_mermaid_flow(self, title, endpoints, services):
        lines = ["```mermaid", "flowchart LR"]
        for svc, info in services.items():
            emoji = "✅" if "HTTP" in info["status"] else "❌"
            label = emoji + " " + svc + "<br/>" + info["status"][:10]
            lines.append("  " + svc + "[" + label + "]")
        for ep in endpoints[:5]:
            safe_ep = ep["endpoint"].replace("/", "_").replace("<", "").replace(">", "").replace("{", "").replace("}", "")
            lines.append("  EP_" + safe_ep + "[" + ep["file"] + ": " + ep["endpoint"] + "]")
        lines.append("  flask_local -->|proxy| crm_v1_uc")
        lines.append("  flask_local --> upload_server")
        lines.append("```")
        return "\n".join(lines)

    def run_checkpoint(self, title="MCP Checkpoint"):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        endpoints = self._inspect_routes()
        services = self._check_services()
        mermaid = self._gen_mermaid_flow(title, endpoints, services)
        
        checkpoint = {
            "timestamp": ts,
            "title": title,
            "endpoints_found": len(endpoints),
            "services_checked": len(services),
            "mermaid": mermaid,
            "services": services,
            "top_endpoints": endpoints[:10]
        }
        
        chk_path = self.checkpoint_dir + "/checkpoint_" + ts + ".md"
        with open(chk_path, "w") as f:
            f.write("# MCP Checkpoint: " + title + "\n\n")
            f.write("_Generated: " + ts + "_\n\n")
            f.write("## Service Status\n")
            for svc, info in services.items():
                f.write("- " + info["status"] + " " + svc + "\n")
            f.write("\n## Endpoints (" + str(len(endpoints)) + " found)\n")
            for ep in endpoints[:5]:
                f.write("- `" + ep["file"] + "`: " + ep["endpoint"] + "\n")
            f.write("\n## Mermaid Diagram\n\n")
            f.write(mermaid)
        
        print("✅ Checkpoint: " + chk_path)
        print("📊 " + str(len(endpoints)) + " endpoints, " + str(len(services)) + " services")
        print("\n" + mermaid)
        return checkpoint

if __name__ == "__main__":
    import sys
    title = sys.argv[1] if len(sys.argv) > 1 else "MCP Auto-Checkpoint"
    MCPGenerator().run_checkpoint(title)
