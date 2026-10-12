import { Box3, Vector3, Object3D, Mesh } from 'three';

export interface ModelDiagnosticResult {
  modelPath: string;
  status: 'SUCCESS' | 'FALLBACK_PROCEDURAL' | 'ERROR';
  nodeCount: number;
  meshCount: number;
  vertexCount: number;
  boundingBox: [number, number, number];
  errorMessage?: string;
  timestamp: string;
}

// Historial en memoria de modelos auditados
const diagnosticHistory = new Map<string, ModelDiagnosticResult>();

/**
 * Inspecciona un Object3D de Three.js y calcula nodos, mallas, vértices y BoundingBox.
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
      status: 'SUCCESS',
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
      `[3D Audit] ÉXITO: "${modelPath}" | Nodos: ${nodeCount} | Mallas: ${meshCount} | Vértices: ${vertexCount} | BBox: [${result.boundingBox.join(', ')}]`
    );

    updateAuditLogGlobal();
    return result;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[3D Audit] ERROR calculando métricas para "${modelPath}":`, errorMsg);

    const failResult: ModelDiagnosticResult = {
      modelPath,
      status: 'ERROR',
      nodeCount: 0,
      meshCount: 0,
      vertexCount: 0,
      boundingBox: [0, 0, 0],
      errorMessage: errorMsg,
      timestamp: new Date().toISOString()
    };

    diagnosticHistory.set(modelPath, failResult);
    updateAuditLogGlobal();
    return failResult;
  }
};

/**
 * Registra un fallo de carga de un modelo GLTF/GLB y notifica la activación de fallback.
 */
export const logModelError = (modelPath: string, error: any): ModelDiagnosticResult => {
  const errorMsg = error?.message || (typeof error === 'string' ? error : 'Archivo GLTF no encontrado o formato inválido');
  console.warn(
    `[3D Audit Fallback] No se encontró o falló el GLB "${modelPath}". Se activa geometría procedural estilizada de respaldo. Causa: ${errorMsg}`
  );

  const fallbackResult: ModelDiagnosticResult = {
    modelPath,
    status: 'FALLBACK_PROCEDURAL',
    nodeCount: 0,
    meshCount: 0,
    vertexCount: 0,
    boundingBox: [0, 0, 0],
    errorMessage: errorMsg,
    timestamp: new Date().toISOString()
  };

  diagnosticHistory.set(modelPath, fallbackResult);
  updateAuditLogGlobal();
  return fallbackResult;
};

/**
 * Devuelve el mapa de diagnóstico en memoria.
 */
export const getDiagnosticHistory = (): Record<string, ModelDiagnosticResult> => {
  return Object.fromEntries(diagnosticHistory.entries());
};

/**
 * Genera el reporte textual de la auditoría de modelos 3D.
 */
export const generateAuditReportText = (): string => {
  const lines: string[] = [
    '================================================================================',
    '        AUDITORÍA DE MODELOS 3D GLB - SIMULADOR ASADO ARGENTINO',
    '================================================================================',
    `Fecha de auditoría: ${new Date().toISOString()}`,
    '',
    'Modelos auditados:',
    '--------------------------------------------------------------------------------'
  ];

  for (const [path, data] of diagnosticHistory.entries()) {
    lines.push(`- ARCHIVO: ${path}`);
    lines.push(`  ESTADO: ${data.status}`);
    if (data.status === 'SUCCESS') {
      lines.push(`  NODOS: ${data.nodeCount}`);
      lines.push(`  MALLAS: ${data.meshCount}`);
      lines.push(`  VÉRTICES: ${data.vertexCount}`);
      lines.push(`  BOUNDING BOX [X, Y, Z]: [${data.boundingBox.join(', ')}] metros`);
    } else {
      lines.push(`  DETALLE: ${data.errorMessage || 'No disponible en disco'}`);
      lines.push(`  ACCIÓN: Activación exitosa de fallback procedimental de alta fidelidad.`);
    }
    lines.push('--------------------------------------------------------------------------------');
  }

  return lines.join('\n');
};

/**
 * Mantiene accesible el reporte en window para inspección en tiempo de ejecución.
 */
function updateAuditLogGlobal() {
  if (typeof window !== 'undefined') {
    (window as any).__3D_MODELS_AUDIT__ = {
      history: getDiagnosticHistory(),
      reportText: generateAuditReportText()
    };
  }
}
