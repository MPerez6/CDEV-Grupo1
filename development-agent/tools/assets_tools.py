import os
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
DEFAULT_ASSETS_DIR = REPO_ROOT / "frontend" / "src" / "assets"

def inspect_3d_models(assets_dir: str = str(DEFAULT_ASSETS_DIR)) -> str:
    """Lista modelos 3D y texturas en la carpeta de assets de frontend."""
    target = Path(assets_dir)
    if not target.is_absolute():
        target = REPO_ROOT / "frontend" / assets_dir
        
    if not target.exists():
        return f"El directorio {target} no existe."
    
    files = []
    for root, _, filenames in os.walk(target):
        for f in filenames:
            if f.endswith(('.glb', '.gltf', '.hdr', '.png', '.jpg', '.webp')):
                rel_path = os.path.relpath(os.path.join(root, f), target)
                files.append(rel_path)
    
    if not files:
        return "No se encontraron modelos ni texturas en la carpeta de assets."
    return f"Assets 3D disponibles:\n" + "\n".join(f"- {f}" for f in files)