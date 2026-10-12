import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Mesh, ShaderMaterial, Color, Vector3, Quaternion, Object3D } from 'three';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';
import { SafeGLTF } from '../Common/SafeModelLoader';

const MEAT_MODEL_PATH = '/models/meat_piece_raw.glb';

// Vertex shader para el corte de carne vacuna criolla
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader: Reacción de Maillard paulatina y marcas de los hierros
const fragmentShader = `
  uniform float uCookLevel;
  uniform vec3 uRawColor;
  uniform vec3 uCrustColor;
  uniform vec3 uTostadoColor;
  uniform vec3 uBurntColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    float cl = clamp(uCookLevel, 0.0, 2.0);
    vec3 baseColor;

    // Transición gradual de Maillard en 4 etapas cromáticas
    if (cl <= 0.6) {
      float t = smoothstep(0.0, 0.6, cl);
      baseColor = mix(uRawColor, uCrustColor, t);
    } else if (cl <= 1.2) {
      float t = smoothstep(0.6, 1.2, cl);
      baseColor = mix(uCrustColor, uTostadoColor, t);
    } else {
      float t = smoothstep(1.2, 2.0, cl);
      baseColor = mix(uTostadoColor, uBurntColor, t);
    }

    // Marcas de los hierros de la parrilla que aparecen al avanzar la cocción
    float barPattern = sin(vWorldPos.z * 52.0);
    if (cl > 0.25 && barPattern > 0.7) {
      float markFade = smoothstep(0.25, 1.0, cl) * 0.35;
      baseColor = mix(baseColor, uBurntColor, markFade);
    }

    // Iluminación difusa con rebote cálido del fuego inferior
    vec3 sunLightDir = normalize(vec3(0.8, 2.2, 0.9));
    float diff = max(dot(vNormal, sunLightDir), 0.32);

    float underBounce = max(-vNormal.y, 0.0) * 0.18;
    vec3 fireWarmth = vec3(0.25, 0.08, 0.01) * underBounce;

    vec3 finalRgb = (baseColor * diff) + fireWarmth;
    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;

interface MeatMeshProps {
  scene: Object3D;
  material: ShaderMaterial;
}

const MeatMesh: React.FC<MeatMeshProps> = ({ scene, material }) => {
  const clone = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const meshChild = child as Mesh;
        meshChild.material = material;
        meshChild.castShadow = true;
        meshChild.receiveShadow = true;
      }
    });
  }, [clone, material]);

  // Escala aumentada (~0.48): tamaño visible, suculento y contundente de asado de tira
  return (
    <Center scale={0.48}>
      <primitive object={clone} />
    </Center>
  );
};

// Fallback estilizado para el corte si el archivo .glb falla
const MeatPieceFallback: React.FC<{ material: ShaderMaterial }> = ({ material }) => (
  <Center scale={0.48}>
    <mesh castShadow receiveShadow material={material}>
      <boxGeometry args={[0.78, 0.18, 0.46]} />
    </mesh>
  </Center>
);

interface Props {
  meat: MeatItem;
}

export const MeatItemComponent: React.FC<Props> = ({ meat }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const prevFlippedRef = useRef<boolean>(meat.flipped);

  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const getHeatAtPosition = useAsadoStore((state) => state.getHeatAtPosition);
  const updateCookLevel = useAsadoStore((state) => state.updateCookLevel);
  const flipMeat = useAsadoStore((state) => state.flipMeat);
  const placingMeatId = useAsadoStore((state) => state.placingMeatId);
  const startPlacingMeat = useAsadoStore((state) => state.startPlacingMeat);
  const triggerToolAction = useAsadoStore((state) => state.triggerToolAction);

  const isBeingPlaced = placingMeatId === meat.id;

  const maillardMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCookLevel: { value: meat.cookLevel },
        uRawColor: { value: new Color('#ba2626') },
        uCrustColor: { value: new Color('#8e4d25') },
        uTostadoColor: { value: new Color('#442315') },
        uBurntColor: { value: new Color('#14100e') }
      }
    });
  }, []);

  // Volteo estable y controlado: resetea velocidades lineales y angulares a cero absoluto
  useEffect(() => {
    if (prevFlippedRef.current !== meat.flipped && rigidBodyRef.current && !isBeingPlaced) {
      prevFlippedRef.current = meat.flipped;

      // 1. Reseteo riguroso de velocidades para que jamás salga despedido al infinito
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      // 2. Rotación controlada de 180° sobre el eje longitudinal (Z)
      const curRot = rigidBodyRef.current.rotation();
      const currentQ = new Quaternion(curRot.x, curRot.y, curRot.z, curRot.w);
      const flipQ = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
      currentQ.multiply(flipQ);
      rigidBodyRef.current.setRotation(currentQ, true);

      // 3. Pequeño micro-lift seguro para asentarse de nuevo sobre los fierros
      const curPos = rigidBodyRef.current.translation();
      const safeX = !isNaN(curPos.x) ? curPos.x : meat.position[0];
      const safeY = !isNaN(curPos.y) ? Math.max(curPos.y, 0.40) + 0.02 : 0.44;
      const safeZ = !isNaN(curPos.z) ? curPos.z : meat.position[2];
      rigidBodyRef.current.setTranslation({ x: safeX, y: safeY, z: safeZ }, true);
    }
  }, [meat.flipped, isBeingPlaced, meat.position]);

  useFrame((_state, delta) => {
    if (isBeingPlaced && rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation(
        new Vector3(meat.position[0], meat.position[1], meat.position[2])
      );
      return;
    }

    let currentX = meat.position[0];
    let currentY = meat.position[1];
    let currentZ = meat.position[2];

    if (rigidBodyRef.current) {
      const translation = rigidBodyRef.current.translation();
      if (!isNaN(translation.x) && !isNaN(translation.y) && !isNaN(translation.z)) {
        currentX = translation.x;
        currentY = translation.y;
        currentZ = translation.z;

        // Red de seguridad criolla: si cae accidentalmente bajo la parrilla, reponerlo en los fierros
        if (currentY < 0.22) {
          rigidBodyRef.current.setTranslation({ x: currentX, y: 0.44, z: currentZ }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }

    const heat = getHeatAtPosition(currentX, currentY, currentZ);

    if (heat >= 0.05 && meat.cookLevel < 2.0) {
      const cookSpeed = 0.0006;
      const cookDelta = heat * cookSpeed * delta;
      updateCookLevel(meat.id, cookDelta);
    }

    if (maillardMaterial.uniforms?.uCookLevel) {
      maillardMaterial.uniforms.uCookLevel.value = meat.cookLevel;
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    if (isBeingPlaced) return;

    triggerToolAction();

    // Click secundario o Shift+clic: activar modo de colocación / mover
    if (e.button === 2 || e.shiftKey) {
      startPlacingMeat(meat.id);
      return;
    }

    // Click normal con tenedor: pinchar y voltear la carne
    if (selectedTool === 'tenedor') {
      flipMeat(meat.id);
    } else {
      startPlacingMeat(meat.id);
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isBeingPlaced ? 'kinematicPosition' : 'dynamic'}
      colliders={false}
      friction={0.9}
      restitution={0.02}
      mass={1.5}
      position={meat.position}
      canSleep={false}
    >
      {/* Colisionador cuboid proporcional generoso: 0.72 x 0.16 x 0.48 m. Imposible colarse entre varillas */}
      <CuboidCollider args={[0.36, 0.08, 0.24]} position={[0, 0.02, 0]} />

      <group
        onPointerDown={handlePointerDown}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = isBeingPlaced
            ? 'grabbing'
            : selectedTool === 'tenedor'
            ? 'grab'
            : 'move';
        }}
        onPointerOut={() => {
          if (!isBeingPlaced) {
            document.body.style.cursor = 'auto';
          }
        }}
      >
        <SafeGLTF
          modelPath={MEAT_MODEL_PATH}
          fallback={<MeatPieceFallback material={maillardMaterial} />}
        >
          {({ scene }) => <MeatMesh scene={scene} material={maillardMaterial} />}
        </SafeGLTF>
      </group>
    </RigidBody>
  );
};
