import React, { Component, ReactNode, useEffect, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Object3D } from 'three';
import { inspectModel3D, logModelError } from '../../utils/modelLogger';

// Caché en memoria de modelos cargados exitosamente para evitar recargas innecesarias
const loadedModelsCache = new Map<string, { scene: Object3D; nodes: Record<string, any> }>();
const failedModelsSet = new Set<string>();

interface ModelErrorBoundaryProps {
  fallback: ReactNode;
  modelPath: string;
  children: ReactNode;
}

interface ModelErrorBoundaryState {
  hasError: boolean;
}

/**
 * ErrorBoundary adicional para proteger el árbol de renderizado de R3F.
 */
export class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  constructor(props: ModelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    logModelError(this.props.modelPath, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface SafeGLTFProps {
  modelPath: string;
  fallback: ReactNode;
  children: (gltf: { scene: Object3D; nodes: Record<string, any> }) => ReactNode;
}

/**
 * Carga segura y resiliente de modelos 3D GLB:
 * 1. Intenta cargar el archivo mediante GLTFLoader.
 * 2. Si tiene éxito: extrae nodos, mallas, vértices y BoundingBox, registrándolos en la auditoría.
 * 3. Si no existe o falla: activa el fallback procedimental rústico sin colapsar el Canvas WebGL
 *    ni generar excepciones no capturadas en consola.
 */
export const SafeGLTF: React.FC<SafeGLTFProps> = ({ modelPath, fallback, children }) => {
  const [modelData, setModelData] = useState<{ scene: Object3D; nodes: Record<string, any> } | null>(() => {
    return loadedModelsCache.get(modelPath) || null;
  });
  const [hasFailed, setHasFailed] = useState<boolean>(() => {
    return failedModelsSet.has(modelPath);
  });

  useEffect(() => {
    // Si ya fue cacheado con éxito
    if (loadedModelsCache.has(modelPath)) {
      setModelData(loadedModelsCache.get(modelPath)!);
      return;
    }

    // Si ya sabemos que falló previamente, usar fallback de inmediato
    if (failedModelsSet.has(modelPath)) {
      setHasFailed(true);
      return;
    }

    let isMounted = true;
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      (gltf) => {
        if (!isMounted) return;
        inspectModel3D(modelPath, gltf.scene);
        const data = {
          scene: gltf.scene,
          nodes: (gltf as any).nodes || {}
        };
        loadedModelsCache.set(modelPath, data);
        setModelData(data);
      },
      undefined,
      (error) => {
        if (!isMounted) return;
        logModelError(modelPath, error);
        failedModelsSet.add(modelPath);
        setHasFailed(true);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [modelPath]);

  if (hasFailed || !modelData) {
    return <>{fallback}</>;
  }

  return (
    <ModelErrorBoundary modelPath={modelPath} fallback={fallback}>
      {children(modelData)}
    </ModelErrorBoundary>
  );
};
