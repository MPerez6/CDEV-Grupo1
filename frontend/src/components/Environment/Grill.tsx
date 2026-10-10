import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';

const GRILL_MODEL_PATH = '/models/outdoor+barbecue+grill+3d+model.glb';

export const Grill: React.FC = () => {
  const numBars = 29;
  const barSpacing = 0.12;
  const width = (numBars - 1) * barSpacing;

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <group position={[0, 0.3, 0]}>
        {/* Grilla principal de varillas de asado argentino */}
        {Array.from({ length: numBars }).map((_, i) => (
          <mesh
            key={i}
            position={[-(width / 2) + i * barSpacing, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.015, 0.015, 4]} />
            <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}

        {/* Marco y soportes laterales */}
        <mesh position={[-(width / 2) - 0.05, -0.05, 0]}>
          <boxGeometry args={[0.06, 0.12, 4.05]} />
          <meshStandardMaterial color="#2b2b2b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[(width / 2) + 0.05, -0.05, 0]}>
          <boxGeometry args={[0.06, 0.12, 4.05]} />
          <meshStandardMaterial color="#2b2b2b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.05, -2]}>
          <boxGeometry args={[width + 0.16, 0.12, 0.06]} />
          <meshStandardMaterial color="#2b2b2b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.05, 2]}>
          <boxGeometry args={[width + 0.16, 0.12, 0.06]} />
          <meshStandardMaterial color="#2b2b2b" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Superficie plana estática para apoyo continuo y colisión firme */}
        <mesh position={[0, -0.01, 0]} visible={false}>
          <boxGeometry args={[width + 0.1, 0.02, 4.0]} />
        </mesh>
      </group>
    </RigidBody>
  );
};

// Precarga del modelo GLB para optimizar el rendimiento y evitar micro-stutters
useGLTF.preload(GRILL_MODEL_PATH);
