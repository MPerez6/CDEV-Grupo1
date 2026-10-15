import React, { useMemo, useEffect } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { inspectModel3D } from '../../utils/modelLogger';

export interface GLBModelProps {
  url: string;
  targetSize?: number; // Tamaño deseado en metros en su eje mayor (ej: 0.35 para carne, 0.65 para herramientas)
  customMaterial?: THREE.Material; // Para MaillardShader u otros shaders personalizados
  nodeFilter?: string | ((name: string, obj: THREE.Object3D) => boolean);
  partIndex?: number;
  spatialHalf?: 'first' | 'second' | 'none'; // Separación espacial X de mallas combinadas (ej. pala vs atizador)
  castShadow?: boolean;
  receiveShadow?: boolean;
  rotation?: [number, number, number];
  onLoaded?: (dimensions: THREE.Vector3) => void;
}

export const GLBModel: React.FC<GLBModelProps> = ({
  url,
  targetSize = 0.4,
  customMaterial,
  nodeFilter,
  partIndex,
  spatialHalf = 'none',
  castShadow = true,
  receiveShadow = true,
  rotation,
  onLoaded,
}) => {
  const { scene } = useGLTF(url);

  const { isolatedRoot, normalizedScale, finalDimensions } = useMemo(() => {
    const clone = scene.clone(true);

    // Calcular la caja delimitadora total de la escena clonada
    const totalBox = new THREE.Box3().setFromObject(clone);
    const midX = (totalBox.min.x + totalBox.max.x) / 2;

    const meshes: THREE.Mesh[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });

    // Filtro por sub-objeto, índice o partición espacial
    meshes.forEach((mesh, index) => {
      let keep = true;

      // a) Filtro por nombre de nodo
      if (nodeFilter) {
        if (typeof nodeFilter === 'string') {
          keep = mesh.name.toLowerCase().includes(nodeFilter.toLowerCase()) ||
                 mesh.parent?.name.toLowerCase().includes(nodeFilter.toLowerCase()) || false;
        } else if (typeof nodeFilter === 'function') {
          keep = nodeFilter(mesh.name, mesh);
        }
      }

      // b) Filtro por índice de malla
      if (keep && partIndex !== undefined) {
        keep = index === partIndex;
      }

      // c) Partición espacial (ej. pala y atizador juntos en el mismo GLB)
      if (keep && spatialHalf !== 'none') {
        const meshBox = new THREE.Box3().setFromObject(mesh);
        const meshCenterX = (meshBox.min.x + meshBox.max.x) / 2;
        if (spatialHalf === 'first') {
          keep = meshCenterX < midX;
        } else if (spatialHalf === 'second') {
          keep = meshCenterX >= midX;
        }
      }

      if (!keep) {
        mesh.visible = false;
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
      } else {
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        if (customMaterial) {
          mesh.material = customMaterial;
        }
      }
    });

    // Medir dimensiones del objeto aislado
    const isolatedBox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    isolatedBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = maxDim > 0.0001 ? targetSize / maxDim : 1.0;
    const scaledSize = size.clone().multiplyScalar(scaleFactor);

    return {
      isolatedRoot: clone,
      normalizedScale: scaleFactor,
      finalDimensions: scaledSize,
    };
  }, [scene, targetSize, customMaterial, nodeFilter, partIndex, spatialHalf, castShadow, receiveShadow]);

  useEffect(() => {
    inspectModel3D(url, isolatedRoot);
    if (onLoaded) {
      onLoaded(finalDimensions);
    }
  }, [url, isolatedRoot, finalDimensions, onLoaded]);

  return (
    <group rotation={rotation}>
      <Center>
        <primitive object={isolatedRoot} scale={normalizedScale} />
      </Center>
    </group>
  );
};
