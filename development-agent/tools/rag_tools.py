from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions

BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / ".chroma_rag_db"

client = chromadb.PersistentClient(path=str(DB_DIR))
emb_fn = embedding_functions.DefaultEmbeddingFunction()

collection = client.get_or_create_collection(
    name="threejs_r3f_knowledge",
    embedding_function=emb_fn
)

def consult_graphics_expert(query: str) -> str:
    """Consulta la documentación técnica indexada de Three.js, React Three Fiber, Rapier y Drei.
    Úsala ante dudas de implementación sobre sintaxis de hooks, físicas, shaders GLSL o jerarquía 3D."""
    try:
        results = collection.query(query_texts=[query], n_results=3)
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        if not docs:
            return "No se encontró documentación relevante en la base local."

        formatted_results = []
        for doc, meta in zip(docs, metas):
            source = meta.get("source", "desconocido")
            formatted_results.append(f"--- [Fuente: {source}] ---\n{doc}")

        return "\n\n".join(formatted_results)
    except Exception as e:
        return f"Error consultando el RAG: {str(e)}"