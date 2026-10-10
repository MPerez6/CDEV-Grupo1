import os
from pathlib import Path

MAX_READ_CHARS = 12000

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"

def _resolve_target_path(filepath: str) -> Path:
    p = Path(filepath)
    if p.is_absolute():
        return p
    # Si el agente pasa la ruta con el prefijo 'frontend/'
    if filepath.startswith("frontend"):
        return REPO_ROOT / p
    # Si pasa directamente 'src/...' o similar
    return FRONTEND_DIR / p

def read_file(filepath: str) -> str:
    """Lee el contenido de un archivo dentro de frontend."""
    target = _resolve_target_path(filepath)
    if not target.exists():
        return f"ERROR: El archivo {target} no existe."
    
    with open(target, 'r', encoding='utf-8') as f:
        content = f.read()
        if len(content) > MAX_READ_CHARS:
            return content[:MAX_READ_CHARS] + f"\n... [TRUNCADO: {len(content) - MAX_READ_CHARS} caracteres restantes]"
        return content

def write_file(filepath: str, content: str) -> str:
    """Crea o sobrescribe un archivo dentro de frontend."""
    target = _resolve_target_path(filepath)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"OK: {target} guardado correctamente."
    except Exception as e:
        return f"ERROR al escribir {target}: {str(e)}"

def list_directory(directory: str = "src") -> str:
    """Lista archivos y carpetas dentro de frontend omitiendo artefactos de build."""
    target = _resolve_target_path(directory)
    if not target.exists():
        return f"ERROR: El directorio {target} no existe."
    
    tree = []
    for root, dirs, files in os.walk(target):
        if any(ignored in root for ignored in ["node_modules", ".git", "dist"]):
            continue
        level = os.path.relpath(root, target).count(os.sep)
        indent = ' ' * 4 * level
        tree.append(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            tree.append(f"{sub_indent}{f}")
    return "\n".join(tree)