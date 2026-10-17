import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

export interface GlowingEmberModelProps {
  url?: string;
  procedural?: boolean;
  seed?: number;
  targetSize?: number;
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  burnProgress?: number; // 0.0 (apagado / carbón crudo) a 1.0 (brasa viva incandescente)
  pulsePhase?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  scale?: [number, number, number] | number;
}

// Generador de clúster orgánico procedural de 3 a 4 trozos de brasa
interface ProceduralPiece {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

const ProceduralGlowingEmber: React.FC<GlowingEmberModelProps> = ({
  seed = 0,
  targetSize = 0.08,
  burnProgress = 0.0,
  pulsePhase = 0,
  scale = 1,
}) => {
  // Material estándar PBR altamente optimizado con emisión cálida parrillera dinámica
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
  if (!materialRef.current) {
    materialRef.current = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1c1715'),
      roughness: 0.88,
      metalness: 0.05,
      emissive: new THREE.Color('#ff4500'),
      emissiveIntensity: burnProgress * 2.2,
      toneMapped: false,
    });
  }

  // Generar geometría orgánica de 3 a 4 trozos achatados y deformados según seed
  const pieces = useMemo<ProceduralPiece[]>(() => {
    const list: ProceduralPiece[] = [];
    const count = 3 + (Math.abs(Math.floor(seed * 7)) % 2); // 3 o 4 trozos

    for (let i = 0; i < count; i++) {
      const pieceSeed = (seed * 1103515245 + 12345 + i * 982451653) >>> 0;
      const pseudoRand = (offset: number) => {
        const val = ((pieceSeed + offset * 65537) >>> 0) / 4294967296;
        return val;
      };

      const baseRadius = targetSize * (0.38 + pseudoRand(1) * 0.22);
      // Dodecaedro con nivel 1 de subdivisión para contorno facetado rústico
      const geom = new THREE.DodecahedronGeometry(baseRadius, 1);

      // Achatado en Y para asentamiento realista sobre el ladrillo refractario
      geom.scale(1.1 + pseudoRand(2) * 0.2, 0.48 + pseudoRand(3) * 0.16, 1.05 + pseudoRand(4) * 0.2);

      // Deformación pseudo-aleatoria de vértices según seed
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      for (let v = 0; v < posAttr.count; v++) {
        const vx = posAttr.getX(v);
        const vy = posAttr.getY(v);
        const vz = posAttr.getZ(v);

        const noiseDisp = Math.sin(vx * 35.0 + pieceSeed) * Math.cos(vz * 35.0 + pieceSeed) * (baseRadius * 0.2);
        posAttr.setXYZ(v, vx + noiseDisp, vy + noiseDisp * 0.45, vz + noiseDisp);
      }
      geom.computeVertexNormals();

      // Disposición orgánica en clúster
      const angle = (i / count) * Math.PI * 2 + pseudoRand(5) * 0.5;
      const dist = targetSize * (0.2 + pseudoRand(6) * 0.15);
      const px = i === 0 ? 0 : Math.cos(angle) * dist;
      const pz = i === 0 ? 0 : Math.sin(angle) * dist;
      const py = (i === 0 ? 0 : (pseudoRand(7) - 0.5) * 0.008) + baseRadius * 0.35;

      list.push({
        geometry: geom,
        position: [px, py, pz],
        rotation: [pseudoRand(8) * 0.3, pseudoRand(9) * Math.PI * 2, pseudoRand(10) * 0.3],
        scale: [1, 1, 1],
      });
    }

    return list;
  }, [seed, targetSize]);

  // Limpieza de geometrías y material al desmontar
  useEffect(() => {
    return () => {
      pieces.forEach((p) => p.geometry.dispose());
      materialRef.current?.dispose();
    };
  }, [pieces]);

  // Modulación continua de incandescencia y color térmico en useFrame
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const t = clock.elapsedTime;
    const pulse = 1.0 + 0.25 * Math.sin(t * 3.4 + pulsePhase);

    if (burnProgress > 0.005) {
      materialRef.current.emissiveIntensity = burnProgress * 2.2 * pulse;
      materialRef.current.emissive.setRGB(1.0, 0.26 + 0.12 * Math.sin(t * 2.5 + pulsePhase), 0.0);
      materialRef.current.color.setRGB(0.12 + burnProgress * 0.05, 0.08, 0.07);
    } else {
      materialRef.current.emissiveIntensity = 0;
      materialRef.current.color.setRGB(0.11, 0.09, 0.08);
    }
  });

  const parsedScale: [number, number, number] = Array.isArray(scale)
    ? [scale[0], scale[1], scale[2]]
    : [scale, scale, scale];

  return (
    <group scale={parsedScale}>
      {pieces.map((piece, idx) => (
        <mesh
          key={`ember-proc-piece-${seed}-${idx}`}
          geometry={piece.geometry}
          material={materialRef.current}
          position={piece.position}
          rotation={piece.rotation}
          scale={piece.scale}
          castShadow={false}
          receiveShadow={false}
        />
      ))}
    </group>
  );
};

// Componente para modelos GLTF (usado en fogón y lecho de carbón)
const EMBER_COLOR_ORANGE = new THREE.Color('#ff3800');
const EMBER_COLOR_GOLD = new THREE.Color('#ff7700');
const COAL_RAW_COLOR = new THREE.Color('#161413');
const EMBER_HOT_BASE = new THREE.Color('#380903');

const GLTFGlowingEmber: React.FC<GlowingEmberModelProps> = ({
  url = '/models/carbon.glb',
  targetSize = 0.4,
  burnProgress = 0.0,
  pulsePhase = 0,
  castShadow = true,
  receiveShadow = true,
  scale = 1,
}) => {
  const { scene } = useGLTF(url);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const { clonedScene, normalizedScale } = useMemo(() => {
    const clone = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];

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

        standardMat.roughness = THREE.MathUtils.lerp(0.85, 0.65, burnProgress);
        standardMat.metalness = 0.12;
        standardMat.toneMapped = false;

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

  useFrame(({ clock }) => {
    if (materialsRef.current.length === 0) return;

    const t = clock.elapsedTime;
    const clampedProgress = Math.min(1.0, Math.max(0.0, burnProgress));
    const pulseFactor = 1.45 + Math.sin(t * 3.4 + pulsePhase) * 0.4;
    const currentIntensity = pulseFactor * clampedProgress;

    const heatColor = EMBER_COLOR_ORANGE.clone().lerp(
      EMBER_COLOR_GOLD,
      Math.max(0, Math.sin(t * 2.8 + pulsePhase) * 0.35)
    );
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

  const parsedScale: [number, number, number] = Array.isArray(scale)
    ? [scale[0] * normalizedScale, scale[1] * normalizedScale, scale[2] * normalizedScale]
    : [scale * normalizedScale, scale * normalizedScale, scale * normalizedScale];

  return (
    <Center>
      <primitive object={clonedScene} scale={parsedScale} />
    </Center>
  );
};

export const GlowingEmberModel: React.FC<GlowingEmberModelProps> = ({
  url,
  procedural = false,
  seed = 0,
  targetSize = 0.08,
  positionOffset = [0, 0, 0],
  rotationOffset = [0, 0, 0],
  burnProgress = 0.0,
  pulsePhase = 0,
  castShadow = true,
  receiveShadow = true,
  scale = 1,
}) => {
  return (
    <group position={positionOffset} rotation={rotationOffset}>
      {procedural ? (
        <ProceduralGlowingEmber
          seed={seed}
          targetSize={targetSize}
          burnProgress={burnProgress}
          pulsePhase={pulsePhase}
          scale={scale}
          castShadow={false}
          receiveShadow={false}
        />
      ) : (
        <GLTFGlowingEmber
          url={url}
          targetSize={targetSize}
          burnProgress={burnProgress}
          pulsePhase={pulsePhase}
          scale={scale}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      )}
    </group>
  );
};
