import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { ShaderMaterial, Color, Vector3, Quaternion } from 'three';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';
import { GLBModel } from '../Common/GLBModel';
import { SafeGLTF } from '../Common/SafeModelLoader';

// Vertex shader para reacción térmica sobre el modelo 3D
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

// Fragment shader: Reacción de Maillard gradual y marcas de hierros
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

    // Transición gradual en 4 etapas cromáticas argentinas
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

    // Marcas de los hierros de la parrilla
    float barPattern = sin(vWorldPos.x * 96.0);
    if (cl > 0.2 && barPattern > 0.72) {
      float markFade = smoothstep(0.2, 0.9, cl) * 0.45;
      baseColor = mix(baseColor, uBurntColor, markFade);
    }

    // Iluminación difusa con rebote cálido del fuego inferior
    vec3 sunLightDir = normalize(vec3(0.8, 2.2, 0.9));
    float diff = max(dot(vNormal, sunLightDir), 0.35);

    float underBounce = max(-vNormal.y, 0.0) * 0.22;
    vec3 fireWarmth = vec3(0.28, 0.09, 0.01) * underBounce;

    vec3 finalRgb = (baseColor * diff) + fireWarmth;
    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;

// Fallback estilizado procedural de tira de asado con carne, grasa y huesos
const ProceduralMeatFallback: React.FC<{ material: ShaderMaterial }> = ({ material }) => (
  <group>
    {/* Carne roja vacuna con reacción de Maillard */}
    <mesh castShadow receiveShadow material={material}>
      <boxGeometry args={[0.38, 0.08, 0.2]} />
    </mesh>
    {/* Ribete de grasa dorada */}
    <mesh position={[0, 0, 0.105]} castShadow>
      <boxGeometry args={[0.37, 0.07, 0.015]} />
      <meshStandardMaterial color="#ebe0cb" roughness={0.7} metalness={0.05} />
    </mesh>
    {/* Huesos de costilla */}
    {[-0.12, 0, 0.12].map((x, i) => (
      <mesh key={`bone-${i}`} position={[x, -0.01, -0.103]} castShadow>
        <boxGeometry args={[0.05, 0.06, 0.02]} />
        <meshStandardMaterial color="#e0d6c5" roughness={0.5} />
      </mesh>
    ))}
  </group>
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

  // Selección de asset GLB real y escala según corte
  const isChorizo = meat.cut.toLowerCase().includes('chorizo') || meat.cut.toLowerCase().includes('chori');
  const glbUrl = isChorizo ? '/models/chorizo.glb' : '/models/vacio.glb';
  const targetSize = isChorizo ? 0.22 : 0.38;

  // Dimensiones del colisionador Rapier según tipo de corte
  const colliderHalfX = isChorizo ? 0.06 : 0.18;
  const colliderHalfY = 0.035;
  const colliderHalfZ = isChorizo ? 0.1 : 0.12;

  const maillardMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCookLevel: { value: meat.cookLevel },
        uRawColor: { value: new Color(isChorizo ? '#8a2818' : '#ba2626') },
        uCrustColor: { value: new Color('#8e4d25') },
        uTostadoColor: { value: new Color('#442315') },
        uBurntColor: { value: new Color('#14100e') }
      }
    });
  }, [isChorizo]);

  // Volteo parrillero estable: resetea velocidades lineales y angulares
  useEffect(() => {
    if (prevFlippedRef.current !== meat.flipped && rigidBodyRef.current && !isBeingPlaced) {
      prevFlippedRef.current = meat.flipped;

      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      // Rotación de 180° sobre el eje longitudinal
      const curRot = rigidBodyRef.current.rotation();
      const currentQ = new Quaternion(curRot.x, curRot.y, curRot.z, curRot.w);
      const flipQ = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
      currentQ.multiply(flipQ);
      rigidBodyRef.current.setRotation(currentQ, true);

      // Posicionamiento seguro sobre los hierros (grillHeight = 0.35 + delta)
      const curPos = rigidBodyRef.current.translation();
      const safeX = !isNaN(curPos.x) ? curPos.x : meat.position[0];
      const safeY = !isNaN(curPos.y) ? Math.max(curPos.y, 0.39) + 0.02 : 0.41;
      const safeZ = !isNaN(curPos.z) ? curPos.z : meat.position[2];
      rigidBodyRef.current.setTranslation({ x: safeX, y: safeY, z: safeZ }, true);
    }
  }, [meat.flipped, isBeingPlaced, meat.position]);

  useFrame((_state, delta) => {
    if (isBeingPlaced && rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation(
        new Vector3(meat.position[0], Math.max(meat.position[1], 0.40), meat.position[2])
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

        // Red de seguridad: si cae por debajo de la parrilla (0.35m), reponerlo firme arriba
        if (currentY < 0.34) {
          rigidBodyRef.current.setTranslation({ x: currentX, y: 0.40, z: currentZ }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }

    const heat = getHeatAtPosition(currentX, currentY, currentZ);

    if (heat >= 0.05 && meat.cookLevel < 2.0) {
      const cookSpeed = 0.0007;
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

    // Click derecho o shift: reubicar corte
    if (e.button === 2 || e.shiftKey) {
      startPlacingMeat(meat.id);
      return;
    }

    // Pinchar y dar vuelta con tenedor
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
      restitution={0.01}
      mass={1.4}
      position={[meat.position[0], Math.max(meat.position[1], 0.40), meat.position[2]]}
      canSleep={false}
    >
      {/* Colisionador proporcional y plano para que repose firme sobre la cota Y de la parrilla */}
      <CuboidCollider
        args={[colliderHalfX, colliderHalfY, colliderHalfZ]}
        position={[0, colliderHalfY, 0]}
      />

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
          modelPath={glbUrl}
          fallback={<ProceduralMeatFallback material={maillardMaterial} />}
        >
          {() => (
            <GLBModel
              url={glbUrl}
              targetSize={targetSize}
              customMaterial={maillardMaterial}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>
    </RigidBody>
  );
};
