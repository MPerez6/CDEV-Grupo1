"""
git_tools.py - Control de versiones y push
"""
# pyrefly: ignore [missing-import]
import os
from pathlib import Path
import git

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent

def push_to_repository(commit_message: str) -> str:
    """Realiza git add, git commit y git push hacia el repositorio remoto.
    Solo debe invocarse cuando el objetivo esté completamente cumplido y los tests pasen."""
    try:
        repo_path = REPO_ROOT if (REPO_ROOT / ".git").exists() else Path.cwd()
        repo = git.Repo(repo_path, search_parent_directories=True)
        if not repo.is_dirty(untracked_files=True):
            return "No hay cambios pendientes para commitear."
        
        repo.git.add(A=True)
        repo.git.commit(m=commit_message)
        origin = repo.remote(name='origin')
        origin.push()
        return f"Push completado exitosamente con mensaje: '{commit_message}'"
    except Exception as e:
        return f"ERROR en Git: {str(e)}"
