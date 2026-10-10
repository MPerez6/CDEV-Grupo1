import os
from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions
from langchain_text_splitters import MarkdownTextSplitter

# Rutas base
BASE_DIR = Path(__file__).resolve().parent.parent
DOCS_DIR = BASE_DIR / "knowledge_docs"
DB_DIR = BASE_DIR / ".chroma_rag_db"

def build_vector_store():
    print("[RAG INGEST] Iniciando procesamiento de documentación...")
    
    # 1. Conexión a ChromaDB persistente
    client = chromadb.PersistentClient(path=str(DB_DIR))
    emb_fn = embedding_functions.DefaultEmbeddingFunction()
    
    collection = client.get_or_create_collection(
        name="threejs_r3f_knowledge",
        embedding_function=emb_fn
    )

    # 2. Configurar el splitter para Markdown
    # Fragmentos de ~1000 caracteres con solapamiento de 150 para preservar contexto
    splitter = MarkdownTextSplitter(chunk_size=1000, chunk_overlap=150)

    documents = []
    metadatas = []
    ids = []
    doc_counter = 0

    # 3. Recorrer la carpeta de documentos
    for root, _, files in os.walk(DOCS_DIR):
        for file in files:
            if file.endswith((".md", ".mdx", ".txt")):
                file_path = Path(root) / file
                category = file_path.parent.name
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read()
                    
                    chunks = splitter.split_text(text)
                    for idx, chunk in enumerate(chunks):
                        documents.append(chunk)
                        metadatas.append({
                            "source": file,
                            "category": category,
                            "chunk_id": idx
                        })
                        ids.append(f"{category}_{file}_{idx}_{doc_counter}")
                        doc_counter += 1
                        
                except Exception as e:
                    print(f"Error procesando {file}: {e}")

    # 4. Inserción por lotes en ChromaDB
    if documents:
        BATCH_SIZE = 100
        for i in range(0, len(documents), BATCH_SIZE):
            batch_docs = documents[i:i + BATCH_SIZE]
            batch_meta = metadatas[i:i + BATCH_SIZE]
            batch_ids = ids[i:i + BATCH_SIZE]
            collection.upsert(documents=batch_docs, metadatas=batch_meta, ids=batch_ids)
        
        print(f"[RAG INGEST] ✓ Ingesta completada: {len(documents)} fragmentos indexados.")
    else:
        print("[RAG INGEST] No se encontraron archivos markdown para indexar.")

if __name__ == "__main__":
    build_vector_store()