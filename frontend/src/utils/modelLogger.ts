import { Box3, Vector3, Object3D, Mesh } from 'three';

export interface ModelDiagnosticResult {
  modelPath: string;
  status: 'success' | 'error' | 'fallback';
  nodeCount: number;
  meshCount: number;
  vertexCount: number;
  boundingBox: [number, number, number];
  errorMessage?: string;
  timestamp: string;
}

// Registro en memoria de diagnósticos ejecutados
const diagnosticHistory = new Map<string, ModelDiagnosticResult>();

/**
 * Analiza un objeto 3D Three.js y extrae métricas de geometría y volumen.
 */
export const inspectModel3D = (modelPath: string, scene: Object3D): ModelDiagnosticResult => {
  try {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);

    let nodeCount = 0;
    let meshCount = 0;
    let vertexCount = 0;

    scene.traverse((child) => {
      nodeCount++;
      if ((child as Mesh).isMesh) {
        meshCount++;
        const mesh = child as Mesh;
        if (mesh.geometry) {
          vertexCount += mesh.geometry.attributes?.position?.count ?? 0;
        }
      }
    });

    const result: ModelDiagnosticResult = {
      modelPath,
      status: 'success',
      nodeCount,
      meshCount,
      vertexCount,
      boundingBox: [
        parseFloat(size.x.toFixed(3)),
        parseFloat(size.y.toFixed(3)),
        parseFloat(size.z.toFixed(3))
      ],
      timestamp: new Date().toISOString()
    };

    diagnosticHistory.set(modelPath, result);

    console.log(
      `[3D Diagnosis] ÉXITO: "${modelPath}" | Nodos: ${nodeCount} | Mallas: ${meshCount} | Vértices: ${vertexCount} | BBox: [${result.boundingBox.join(', ')}]`
    );

    return result;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[3D Diagnosis] ERROR calculando métricas para "${modelPath}":`, errorMsg);

    const failResult: ModelDiagnosticResult = {
      modelPath,
      status: 'error',
      nodeCount: 0,
      meshCount: 0,
      vertexCount: 0,
      boundingBox: [0, 0, 0],
      errorMessage: errorMsg,
      timestamp: new Date().toISOString()
    };

    diagnosticHistory.set(modelPath, failResult);
    return failResult;
  }
};

/**
 * Registra un fallo de carga de un modelo GLTF/GLB y notifica la activación de fallback.
 */
export const logModelError = (modelPath: string, error: any): ModelDiagnosticResult => {
  const errorMsg = error?.message || (typeof error === 'string' ? error : 'Fallo de red o archivo GLTF inválido');
  console.error(
    `[3D Diagnosis Error] No se pudo cargar "${modelPath}". Se activa geometría procedural de fallback estilizada. Causa:`,
    errorMsg
  );

  const errorResult: ModelDiagnosticResult = {
    modelPath,
    status: 'fallback',
    nodeCount: 0,
    meshCount: 0,
    vertexCount: 0,
    boundingBox: [0, 0, 0],
    errorMessage: errorMsg,
    timestamp: new Date().toISOString()
  };

  diagnosticHistory.set(modelPath, errorResult);
  return errorResult;
};

/**
 * Devuelve el mapa de diagnóstico en memoria.
 */
export const getDiagnosticHistory = (): Record<string, ModelDiagnosticResult> => {
  return Object.fromEntries(diagnosticHistory.entries());
};
