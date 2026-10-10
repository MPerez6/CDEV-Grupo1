import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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
// Transiciona de carne cruda (rojo sangre) a cocido parrillero (dorado tostado) y a quemado (carbón)
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
      // De cocido a punto (1.0) a arrebatado/quemado (2.0)
      baseColor = mix(uCookedColor, uBurntColor, clamp(uCookLevel - 1.0, 0.0, 1.0));
    }

    // Sombreado difuso para dar volumen realista al corte
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
        uRawColor: { value: new Color('#9e2a2b') },
        uCookedColor: { value: new Color('#52321c') },
        uBurntColor: { value: new Color('#151110') }
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

  // Si cambia el estado de volteo, aplicamos un impulso parrillero dinámico
  useEffect(() => {
    if (prevFlippedRef.current !== meat.flipped && rigidBodyRef.current) {
      prevFlippedRef.current = meat.flipped;
      rigidBodyRef.current.applyImpulse({ x: 0, y: 1.2, z: 0 }, true);
      rigidBodyRef.current.applyTorqueImpulse({ x: 0.08, y: 0, z: 0 }, true);
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

    // Multiplicador térmico para regular la cocción del asado
    const heatMultiplier = 0.005;
    const cookDelta = heat * heatMultiplier * delta;

    if (cookDelta > 0 && meat.cookLevel < 2) {
      updateCookLevel(meat.id, cookDelta);
    }

    // Actualiza el nivel térmico en el material de Maillard
    if (maillardMaterial.uniforms && maillardMaterial.uniforms.uCookLevel) {
      maillardMaterial.uniforms.uCookLevel.value = meat.cookLevel;
    }
  });

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
        scale={[0.018, 0.018, 0.018]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          flipMeat(meat.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <primitive object={clonedScene} />
      </group>
    </RigidBody>
  );
};

// Precarga del modelo 3D GLB para evitar stutters
useGLTF.preload(MEAT_MODEL_PATH);
