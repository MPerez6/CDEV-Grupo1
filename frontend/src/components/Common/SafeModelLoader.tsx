import React, { Component, ReactNode, Suspense, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D } from 'three';
import { inspectModel3D, logModelError } from '../../utils/modelLogger';

interface ModelErrorBoundaryProps {
  fallback: ReactNode;
  modelPath: string;
  children: ReactNode;
}

interface ModelErrorBoundaryState {
  hasError: boolean;
}

/**
 * ErrorBoundary defensivo para capturar excepciones inesperadas durante la carga y renderizado 3D de modelos con useGLTF.
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

interface GLTFInternalProps {
  modelPath: string;
  children: (gltf: { scene: Object3D; nodes: Record<string, any> }) => ReactNode;
}

/**
 * Componente interno que ejecuta useGLTF dentro del contexto de Suspense y ErrorBoundary.
 */
const GLTFInternal: React.FC<GLTFInternalProps> = ({ modelPath, children }) => {
  const gltf = useGLTF(modelPath);

  useEffect(() => {
    if (gltf && gltf.scene) {
      inspectModel3D(modelPath, gltf.scene);
    }
  }, [gltf, modelPath]);

  return <>{children(gltf)}</>;
};

interface SafeGLTFProps {
  modelPath: string;
  fallback: ReactNode;
  children: (gltf: { scene: Object3D; nodes: Record<string, any> }) => ReactNode;
}

/**
 * Carga segura de modelos con useGLTF de @react-three/drei:
 * a) Si carga con éxito, registra diagnóstico detallado (nodos, mallas, vértices, Bounding Box).
 * b) Si useGLTF falla o el archivo no existe, ErrorBoundary captura la excepción, registra console.error
 *    y renderiza la geometría de fallback visible sin congelar el Canvas.
 */
export const SafeGLTF: React.FC<SafeGLTFProps> = ({ modelPath, fallback, children }) => {
  return (
    <ModelErrorBoundary modelPath={modelPath} fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLTFInternal modelPath={modelPath}>{children}</GLTFInternal>
      </Suspense>
    </ModelErrorBoundary>
  );
};
