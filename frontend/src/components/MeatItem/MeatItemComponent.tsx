import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Mesh, ShaderMaterial, Color, Vector3 } from 'three';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';

const MEAT_MODEL_PATH = '/models/meat_piece_raw.glb';

// Vertex shader para el corte de carne
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

// Fragment shader: Reacción de Maillard paulatina y marcas de parrilla criolla
// Transición: Rojo brillante -> Marrón dorado/costra -> Tostado a punto -> Carbón
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
      // 1. De carne vacuna fresca roja brillante a sellado inicial dorado
      float t = smoothstep(0.0, 0.6, cl);
      baseColor = mix(uRawColor, uCrustColor, t);
    } else if (cl <= 1.2) {
      // 2. De sellado dorado a tostado a punto tradicional (jugoso por dentro, costra afuera)
      float t = smoothstep(0.6, 1.2, cl);
      baseColor = mix(uCrustColor, uTostadoColor, t);
    } else {
      // 3. De tostado a carbón/quemado
      float t = smoothstep(1.2, 2.0, cl);
      baseColor = mix(uTostadoColor, uBurntColor, t);
    }

    // Marcas de los fierros de la parrilla (grill marks) que aparecen al avanzar la cocción
    float barPattern = sin(vWorldPos.z * 52.0);
    if (cl > 0.25 && barPattern > 0.7) {
      float markFade = smoothstep(0.25, 1.0, cl) * 0.35;
      baseColor = mix(baseColor, uBurntColor, markFade);
    }

    // Iluminación difusa con rebote cálido del fuego inferior
    vec3 sunLightDir = normalize(vec3(0.8, 2.2, 0.9));
    float diff = max(dot(vNormal, sunLightDir), 0.32);

    // Resplandor cálido sutil si mira hacia abajo hacia las brasas
    float underBounce = max(-vNormal.y, 0.0) * 0.18;
    vec3 fireWarmth = vec3(0.25, 0.08, 0.01) * underBounce;

    vec3 finalRgb = (baseColor * diff) + fireWarmth;
    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;

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

  const isBeingPlaced = placingMeatId === meat.id;

  // Carga del modelo 3D GLB
  const { scene } = useGLTF(MEAT_MODEL_PATH);

  // Instancia independiente del ShaderMaterial de Maillard
  const maillardMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCookLevel: { value: meat.cookLevel },
        uRawColor: { value: new Color('#ba2626') },     // Rojo brillante de corte fresco vacuno
        uCrustColor: { value: new Color('#8e4d25') },   // Costra sellada dorada
        uTostadoColor: { value: new Color('#442315') }, // Tostado a punto
        uBurntColor: { value: new Color('#14100e') }    // Carbón
      }
    });
  }, []);

  // Clona la jerarquía del modelo GLB y asigna el shader de Maillard a las mallas
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const meshChild = child as Mesh;
        meshChild.material = maillardMaterial;
        meshChild.castShadow = true;
        meshChild.receiveShadow = true;
      }
    });
    return clone;
  }, [scene, maillardMaterial]);

  // Si cambia el estado de volteo (por tenedor parrillero), aplicamos impulso físico
  useEffect(() => {
    if (prevFlippedRef.current !== meat.flipped && rigidBodyRef.current && !isBeingPlaced) {
      prevFlippedRef.current = meat.flipped;
      rigidBodyRef.current.applyImpulse({ x: 0, y: 1.35, z: 0 }, true);
      rigidBodyRef.current.applyTorqueImpulse({ x: 0.14, y: 0, z: 0 }, true);
    }
  }, [meat.flipped, isBeingPlaced]);

  // Posicionamiento kinemático mientras se ubica con el puntero
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
      currentX = translation.x;
      currentY = translation.y;
      currentZ = translation.z;
    }

    // Consulta de calor en la posición física sobre la parrilla
    const heat = getHeatAtPosition(currentX, currentY, currentZ);

    // RECALIBRACIÓN TERMODINÁMICA CON INERCIA TÉRMICA:
    // Si heat < 0.05 (sin brasas activas debajo), el corte NO se cocina.
    // Ritmo pausado y realista: multiplicar por 0.0007 para cocción gradual y controlada.
    if (heat >= 0.05 && meat.cookLevel < 2.0) {
      const cookSpeed = 0.00075;
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

    // Con click secundario (botón derecho) o si se usa tenedor con Shift, acomodar corte
    if (e.button === 2 || e.shiftKey) {
      startPlacingMeat(meat.id);
      return;
    }

    // Click normal con tenedor: pinchar y voltear la carne
    if (selectedTool === 'tenedor') {
      flipMeat(meat.id);
    } else {
      // Con cualquier otra herramienta o mano libre, activar acomodo
      startPlacingMeat(meat.id);
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isBeingPlaced ? 'kinematicPosition' : 'dynamic'}
      colliders={false}
      friction={0.85}
      restitution={0.08}
      position={meat.position}
      canSleep={false}
    >
      {/* Colisionador cuboid ajustado que impide físicamente que el corte se deslice entre los hierros */}
      <CuboidCollider args={[0.22, 0.038, 0.16]} position={[0, 0, 0]} />

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
        {/* Envoltura con <Center> y escala normalizada realista (~30-35 cm de largo) */}
        <Center scale={0.32}>
          <primitive object={clonedScene} />
        </Center>
      </group>
    </RigidBody>
  );
};

// Precarga del modelo GLB
useGLTF.preload(MEAT_MODEL_PATH);
