import os
import json
import struct
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
DEFAULT_MODELS_DIR = REPO_ROOT / "frontend" / "public" / "models"

def _parse_glb_metadata(glb_path: Path) -> dict:
    """Lee el chunk JSON interno de un .glb y detalla nodos/mallas individuales para separar packs."""
    try:
        with open(glb_path, "rb") as f:
            header = f.read(12)
            if len(header) < 12:
                return {"error": "Archivo demasiado pequeño."}
            
            magic, version, length = struct.unpack("<4sII", header)
            if magic != b"glTF":
                return {"error": "No es un archivo glTF binario válido."}
            
            chunk_length, chunk_type = struct.unpack("<II", f.read(8))
            if chunk_type != 0x4E4F534A:
                return {"error": "El primer chunk no es JSON."}
            
            gltf_data = json.loads(f.read(chunk_length).decode("utf-8"))
            
            meshes = gltf_data.get("meshes", [])
            accessors = gltf_data.get("accessors", [])
            
            # Detallar cada nodo que tenga malla o hijos para que el agente sepa cómo separarlos
            node_details = []
            for idx, node in enumerate(gltf_data.get("nodes", [])):
                n_name = node.get("name", f"node_{idx}")
                mesh_idx = node.get("mesh")
                translation = node.get("translation", [0, 0, 0])
                children = node.get("children", [])
                
                info = f"Node[{idx}] name='{n_name}'"
                if mesh_idx is not None and mesh_idx < len(meshes):
                    m_name = meshes[mesh_idx].get("name", f"mesh_{mesh_idx}")
                    # Buscar bounding box de la primitiva de esta malla
                    prims = meshes[mesh_idx].get("primitives", [])
                    bbox_str = ""
                    if prims:
                        pos_acc_idx = prims[0].get("attributes", {}).get("POSITION")
                        if pos_acc_idx is not None and pos_acc_idx < len(accessors):
                            acc = accessors[pos_acc_idx]
                            if "min" in acc and "max" in acc:
                                mn, mx = acc["min"], acc["max"]
                                bbox_str = f" | BBox min={[round(x,2) for x in mn]} max={[round(x,2) for x in mx]}"
                    info += f" -> Mesh='{m_name}'{bbox_str}"
                if any(t != 0 for t in translation):
                    info += f" | Pos={[round(x,2) for x in translation]}"
                if children:
                    info += f" | Children={children}"
                node_details.append(info)

            materials = [mat.get("name", f"mat_{i}") for i, mat in enumerate(gltf_data.get("materials", []))]

            return {
                "file_size_kb": round(length / 1024, 2),
                "total_nodes": len(gltf_data.get("nodes", [])),
                "total_meshes": len(meshes),
                "nodes_hierarchy": node_details[:25],
                "materials": materials[:10],
            }
    except Exception as e:
        return {"error": str(e)}

def inspect_3d_models(models_dir: str = str(DEFAULT_MODELS_DIR)) -> str:
    """Inspecciona todos los modelos 3D en frontend/public/models y extrae su jerarquía para poder usar modelos completos o separar sub-mallas (ej. pala y atizador en el mismo GLB)."""
    target = Path(models_dir)
    if not target.is_absolute():
        target = REPO_ROOT / "frontend" / models_dir
        
    if not target.exists():
        return f"ERROR: El directorio {target} no existe."
    
    report = []
    for root, _, filenames in os.walk(target):
        for f in sorted(filenames):
            if f.endswith(('.glb', '.gltf')):
                full_path = Path(root) / f
                rel_path = os.path.relpath(full_path, target).replace(os.sep, '/')
                web_path = f"/models/{rel_path}"
                
                if f.endswith(".glb"):
                    meta = _parse_glb_metadata(full_path)
                    if "error" in meta:
                        report.append(f"❌ {web_path} -> ERROR: {meta['error']}")
                    else:
                        nodes_str = "\n      ".join(meta["nodes_hierarchy"])
                        report.append(
                            f"✅ Ruta Web: '{web_path}' ({meta['file_size_kb']} KB | {meta['total_meshes']} Meshes)\n"
                            f"   - Materiales: {meta['materials']}\n"
                            f"   - Jerarquía de Nodos/Mallas:\n      {nodes_str}"
                        )
                else:
                    report.append(f"📄 Ruta Web: '{web_path}' (GLTF)")
    
    if not report:
        return f"ALERTA: No se encontraron archivos .glb en {target}."
    
    return (
        "=== CATÁLOGO DETALLADO DE MODELOS 3D EN PUBLIC/MODELS ===\n"
        "NOTA: Si un mismo .glb contiene varios objetos (ej. pala y atizador), revisa la 'Jerarquía de Nodos/Mallas' "
        "para extraer y renderizar cada sub-objeto por separado usando su nombre de nodo, índice de malla o posición espacial.\n\n"
        + "\n\n".join(report)
    )