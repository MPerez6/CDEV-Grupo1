import os
import shutil
import subprocess
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"

def _find_npm_binary() -> str | None:
    """Busca el binario de npm en el PATH o en ubicaciones estándar conocidas."""
    # 1. Búsqueda directa en PATH
    npm_bin = shutil.which("npm")
    if npm_bin:
        return npm_bin
    
    if os.name == "nt":
        npm_cmd = shutil.which("npm.cmd")
        if npm_cmd:
            return npm_cmd

        # 2. Rutas comunes de instalación en Windows
        candidate_paths = [
            Path(os.environ.get("ProgramFiles", "C:\\Program Files")) / "nodejs" / "npm.cmd",
            Path(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")) / "nodejs" / "npm.cmd",
            Path(os.environ.get("APPDATA", "")) / "npm" / "npm.cmd",
            Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "nodejs" / "npm.cmd",
            Path(os.environ.get("NVM_HOME", "")) / "npm.cmd",
        ]
        for candidate in candidate_paths:
            if candidate.exists():
                return str(candidate)
    else:
        # Rutas comunes en Linux / WSL
        candidate_paths = [
            Path("/usr/bin/npm"),
            Path("/usr/local/bin/npm"),
            Path.home() / ".nvm" / "versions" / "node",  # nvm paths
        ]
        for candidate in candidate_paths:
            if candidate.is_file() and os.access(candidate, os.X_OK):
                return str(candidate)
            elif candidate.is_dir():
                # Si usa nvm, buscar en la versión activa instalada
                for version_dir in candidate.glob("*/bin/npm"):
                    if version_dir.exists():
                        return str(version_dir)

    return None

def run_tests() -> str:
    """Ejecuta 'npm run build' en el directorio frontend."""
    if not FRONTEND_DIR.exists():
        return f"ERROR: No se encontró el directorio frontend en: {FRONTEND_DIR}"

    npm_bin = _find_npm_binary()
    if not npm_bin:
        return "ERROR: No se encontró 'npm' en el PATH ni en las rutas estándar del sistema."

    try:
        use_shell = os.name == "nt"
        result = subprocess.run(
            [npm_bin, "run", "build"],
            cwd=str(FRONTEND_DIR),
            capture_output=True,
            text=True,
            shell=use_shell,
            check=True
        )
        return f"SUCCESS:\n{result.stdout}"
    except subprocess.CalledProcessError as e:
        return f"ERROR:\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}"
    except Exception as e:
        return f"ERROR: Fallo al ejecutar el comando: {str(e)}"