import React, { Component, ReactNode, useEffect, useState } from 'react';
import { Box3, Vector3, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  modelPath: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * ErrorBoundary defensivo para capturar excepciones inesperadas durante el renderizado 3D.
 */
export class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[3D Loader Error] Falló la carga del modelo GLB "${this.props.modelPath}". Renderizando primitiva estilizada de fallback:`,
      error.message || error
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Registra en consola los metadatos detallados de un modelo 3D cargado:
 * Nombre de archivo, nodos encontrados y dimensiones de la Bounding Box.
 */
export const logModelMetadata = (modelPath: string, scene: Object3D, nodes?: Record<string, any>) => {
  try {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);

    let nodeCount = 0;
    if (nodes && Object.keys(nodes).length > 0) {
      nodeCount = Object.keys(nodes).length;
    } else {
      scene.traverse(() => {
        nodeCount++;
      });
    }

    console.log(
      `[3D Loader] Modelo cargado: ${modelPath} | Nodos encontrados: ${nodeCount} | Bounding Box: [${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}]`
    );
  } catch (err) {
    console.warn(`[3D Loader] No se pudo calcular el bounding box para ${modelPath}:`, err);
  }
};

interface SafeGLTFModelProps {
  modelPath: string;
  fallback: ReactNode;
  children: (gltf: { scene: Object3D; nodes: Record<string, any> }) => ReactNode;
}

// Cache global en memoria para no recargar modelos ya descargados
const gltfCache = new Map<string, { scene: Object3D; nodes: Record<string, any> }>();

/**
 * Componente defensivo que carga modelos GLTF/GLB:
 * a) Si carga con éxito, registra console.log con nombre, nodos y Bounding Box.
 * b) Si la ruta no existe o falla, emite console.error explicativo y renderiza la primitiva estilizada de fallback
 *    sin romper el Canvas de WebGL.
 */
export const SafeGLTF: React.FC<SafeGLTFModelProps> = ({ modelPath, fallback, children }) => {
  const [data, setData] = useState<{ scene: Object3D; nodes: Record<string, any> } | null>(() => {
    return gltfCache.get(modelPath) || null;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (gltfCache.has(modelPath)) {
      const cached = gltfCache.get(modelPath)!;
      setData(cached);
      logModelMetadata(modelPath, cached.scene, cached.nodes);
      return;
    }

    let isMounted = true;
    const loader = new GLTFLoader();

    // Verificación defensiva antes de cargar
    fetch(modelPath, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Ruta no encontrada (${res.status} ${res.statusText})`);
        }
        return loader.loadAsync(modelPath);
      })
      .then((gltf) => {
        if (!isMounted) return;
        const nodes: Record<string, any> = {};
        gltf.scene.traverse((child) => {
          if (child.name) {
            nodes[child.name] = child;
          }
        });
        const result = { scene: gltf.scene, nodes };
        gltfCache.set(modelPath, result);
        logModelMetadata(modelPath, gltf.scene, nodes);
        setData(result);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(
          `[3D Loader Error] Falló la carga del modelo GLB "${modelPath}". Renderizando primitiva estilizada de fallback:`,
          err.message || err
        );
        setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [modelPath]);

  if (hasError || !data) {
    return <ModelErrorBoundary modelPath={modelPath} fallback={fallback}>{fallback}</ModelErrorBoundary>;
  }

  return (
    <ModelErrorBoundary modelPath={modelPath} fallback={fallback}>
      {children(data)}
    </ModelErrorBoundary>
  );
};
