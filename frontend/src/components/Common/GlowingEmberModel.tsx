import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

export interface GlowingEmberModelProps {
  url: string;
  targetSize?: number;
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  burnProgress?: number; // 0.0 (apagado / carbón crudo) a 1.0 (brasa viva incandescente)
  pulsePhase?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  scale?: [number, number, number] | number;
}

const EMBER_COLOR_ORANGE = new THREE.Color('#ff3800');
const EMBER_COLOR_GOLD = new THREE.Color('#ff7700');
const COAL_RAW_COLOR = new THREE.Color('#161413');
const EMBER_HOT_BASE = new THREE.Color('#380903');

export const GlowingEmberModel: React.FC<GlowingEmberModelProps> = ({
  url,
  targetSize = 0.4,
  positionOffset = [0, 0, 0],
  rotationOffset = [0, 0, 0],
  burnProgress = 0.0,
  pulsePhase = 0,
  castShadow = true,
  receiveShadow = true,
  scale = 1,
}) => {
  const { scene } = useGLTF(url);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  // Clonar profundamente la escena y aislar materiales MeshStandardMaterial
  const { clonedScene, normalizedScale } = useMemo(() => {
    const clone = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];

    // Calcular escala normalizada por targetSize
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const factor = maxDim > 0.0001 ? targetSize / maxDim : 1.0;

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;

        // Clonar el material para independizarlo de otras instancias
        let origMat = mesh.material;
        if (Array.isArray(origMat)) {
          origMat = origMat[0];
        }

        const standardMat = origMat instanceof THREE.MeshStandardMaterial
          ? origMat.clone()
          : new THREE.MeshStandardMaterial({
              color: COAL_RAW_COLOR,
              roughness: 0.88,
              metalness: 0.1,
            });

        // Configuración inicial del material para Glowing Ember
        standardMat.roughness = THREE.MathUtils.lerp(0.85, 0.65, burnProgress);
        standardMat.metalness = 0.12;
        standardMat.toneMapped = false; // Permite que el resplandor HDR emita luz viva

        mesh.material = standardMat;
        materials.push(standardMat);
      }
    });

    materialsRef.current = materials;

    return {
      clonedScene: clone,
      normalizedScale: factor,
    };
  }, [scene, targetSize, burnProgress, castShadow, receiveShadow]);

  // Actualización de emisión y pulso térmico realista en cada fotograma
  useFrame(({ clock }) => {
    if (materialsRef.current.length === 0) return;

    const t = clock.elapsedTime;
    const clampedProgress = Math.min(1.0, Math.max(0.0, burnProgress));

    // Pulso térmico realista: 1.45 + sin(t * 3.4) * 0.4
    const pulseFactor = 1.45 + Math.sin(t * 3.4 + pulsePhase) * 0.4;
    const currentIntensity = pulseFactor * clampedProgress;

    // Tinte dinámico de la incandescencia (oscila suavemente entre naranja fuego y destello dorado)
    const heatColor = EMBER_COLOR_ORANGE.clone().lerp(
      EMBER_COLOR_GOLD,
      Math.max(0, Math.sin(t * 2.8 + pulsePhase) * 0.35)
    );

    // Color difuso que va del carbón negro frío a tono rojo carbón vivo
    const baseColor = COAL_RAW_COLOR.clone().lerp(EMBER_HOT_BASE, clampedProgress * 0.7);

    for (let i = 0; i < materialsRef.current.length; i++) {
      const mat = materialsRef.current[i];
      if (!mat) continue;

      if (clampedProgress <= 0.001) {
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
        mat.color.copy(COAL_RAW_COLOR);
      } else {
        mat.emissive.copy(heatColor);
        mat.emissiveIntensity = currentIntensity;
        mat.color.copy(baseColor);
      }
    }
  });

  const parsedScale = Array.isArray(scale)
    ? [scale[0] * normalizedScale, scale[1] * normalizedScale, scale[2] * normalizedScale]
    : [scale * normalizedScale, scale * normalizedScale, scale * normalizedScale];

  return (
    <group ref={groupRef} position={positionOffset} rotation={rotationOffset}>
      <Center>
        <primitive
          object={clonedScene}
          scale={parsedScale}
        />
      </Center>
    </group>
  );
};
