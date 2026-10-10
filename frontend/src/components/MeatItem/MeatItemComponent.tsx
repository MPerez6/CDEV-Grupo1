import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { Mesh, ShaderMaterial, Color } from 'three';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';

const MEAT_MODEL_PATH = '/models/meat_piece_raw.glb';

// Vertex shader para el corte de carne sobre la parrilla
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader: simulación de la reacción de Maillard
const fragmentShader = `
  uniform float uCookLevel;
  uniform vec3 uRawColor;
  uniform vec3 uCookedColor;
  uniform vec3 uBurntColor;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 baseColor;
    if (uCookLevel < 1.0) {
      // De crudo (0.0) a cocido a punto (1.0)
      baseColor = mix(uRawColor, uCookedColor, clamp(uCookLevel, 0.0, 1.0));
    } else {
      // De cocido a punto (1.0) a quemado (2.0)
      baseColor = mix(uCookedColor, uBurntColor, clamp(uCookLevel - 1.0, 0.0, 1.0));
    }

    vec3 lightDir = normalize(vec3(1.0, 2.5, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.35);

    gl_FragColor = vec4(baseColor * diff, 1.0);
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

  // Carga del modelo 3D GLB de corte de carne
  const { scene } = useGLTF(MEAT_MODEL_PATH);

  // Instancia independiente de ShaderMaterial con reacción de Maillard por corte
  const maillardMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCookLevel: { value: meat.cookLevel },
        uRawColor: { value: new Color('#a3282b') },
        uCookedColor: { value: new Color('#4f2e18') },
        uBurntColor: { value: new Color('#161210') }
      }
    });
  }, []);

  // Clona la jerarquía del modelo GLB y asigna el shader de Maillard a todas sus mallas
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
    if (prevFlippedRef.current !== meat.flipped && rigidBodyRef.current) {
      prevFlippedRef.current = meat.flipped;
      rigidBodyRef.current.applyImpulse({ x: 0, y: 1.4, z: 0 }, true);
      rigidBodyRef.current.applyTorqueImpulse({ x: 0.12, y: 0, z: 0 }, true);
    }
  }, [meat.flipped]);

  // Actualización térmica y de shader en cada frame
  useFrame((_state, delta) => {
    let currentX = meat.position[0];
    let currentY = meat.position[1];
    let currentZ = meat.position[2];

    if (rigidBodyRef.current) {
      const translation = rigidBodyRef.current.translation();
      currentX = translation.x;
      currentY = translation.y;
      currentZ = translation.z;
    }

    // Consulta el calor en la posición física actual sobre la parrilla
    const heat = getHeatAtPosition(currentX, currentY, currentZ);

    const heatMultiplier = 0.005;
    const cookDelta = heat * heatMultiplier * delta;

    if (cookDelta > 0 && meat.cookLevel < 2) {
      updateCookLevel(meat.id, cookDelta);
    }

    if (maillardMaterial.uniforms && maillardMaterial.uniforms.uCookLevel) {
      maillardMaterial.uniforms.uCookLevel.value = meat.cookLevel;
    }
  });

  const handleMeatClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // El tenedor permite pinchar y voltear la carne al hacer click sobre el corte
    if (selectedTool === 'tenedor') {
      flipMeat(meat.id);
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      colliders="cuboid"
      friction={0.8}
      restitution={0.1}
      position={meat.position}
    >
      <group
        onClick={handleMeatClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = selectedTool === 'tenedor' ? 'grab' : 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <Center scale={0.3}>
          <primitive object={clonedScene} />
        </Center>
      </group>
    </RigidBody>
  );
};

// Precarga del modelo 3D GLB
useGLTF.preload(MEAT_MODEL_PATH);
