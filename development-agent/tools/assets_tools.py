import os
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
DEFAULT_MODELS_DIR = REPO_ROOT / "frontend" / "public" / "models"

def inspect_3d_models(models_dir: str = str(DEFAULT_MODELS_DIR)) -> str:
    """Lista modelos 3D y texturas disponibles en frontend/public/models."""
    target = Path(models_dir)
    if not target.is_absolute():
        target = REPO_ROOT / "frontend" / models_dir
        
    if not target.exists():
        return f"El directorio {target} no existe. Crea la carpeta en frontend/public/models y coloca allí tus archivos (.glb, .gltf)."
    
    files = []
    for root, _, filenames in os.walk(target):
        for f in filenames:
            if f.endswith(('.glb', '.gltf', '.bin', '.hdr', '.png', '.jpg', '.webp')):
                rel_path = os.path.relpath(os.path.join(root, f), target)
                # Normaliza los separadores de ruta a formato web '/'
                web_path = rel_path.replace(os.sep, '/')
                files.append(web_path)
    
    if not files:
        return f"No se encontraron modelos 3D ni texturas en {target}."
    
    models_list = "\n".join(f"- /models/{f}" for f in files)
    return (
        f"Modelos 3D y texturas disponibles en public/models:\n{models_list}\n"
        "Nota para R3F: En Vite, los archivos dentro de public/ se cargan directamente desde la raíz web, "
        "por ejemplo: useGLTF('/models/nombre.glb')."
    )