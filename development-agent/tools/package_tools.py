import json
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
PACKAGE_JSON = REPO_ROOT / "frontend" / "package.json"

def inspect_dependencies() -> str:
    """Lee las dependencias instaladas en el frontend para saber qué librerías están disponibles."""
    if not PACKAGE_JSON.exists():
        return "ERROR: package.json no encontrado."
    with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})
    return f"Dependencies: {list(deps.keys())}\nDevDependencies: {list(dev_deps.keys())}"