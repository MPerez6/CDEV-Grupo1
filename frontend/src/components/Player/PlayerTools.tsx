import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { useAsadoStore, AsadoTool } from '../../store/useAsadoStore';

// Modelo procedimental de tenedor parrillero criollo de dos puntas
export const TenedorModel: React.FC<{ isPoking?: boolean }> = ({ isPoking }) => (
  <group
    rotation={[0.3, 0.1, -0.1]}
    position={[0, isPoking ? -0.1 : 0, isPoking ? -0.15 : 0]}
  >
    {/* Mango de madera torneada */}
    <mesh position={[0, -0.45, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.4, 16]} />
      <meshStandardMaterial color="#5a331a" roughness={0.7} metalness={0.1} />
    </mesh>

    {/* Virola de ajuste */}
    <mesh position={[0, -0.23, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.04, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla larga de hierro */}
    <mesh position={[0, 0.22, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.86, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Base bifurcada del tenedor */}
    <mesh position={[0, 0.67, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.11, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Púa izquierda afilada */}
    <mesh position={[-0.045, 0.82, 0]} castShadow>
      <coneGeometry args={[0.008, 0.3, 8]} />
      <meshStandardMaterial color="#3a3a3a" roughness={0.3} metalness={0.9} />
    </mesh>

    {/* Púa derecha afilada */}
    <mesh position={[0.045, 0.82, 0]} castShadow>
      <coneGeometry args={[0.008, 0.3, 8]} />
      <meshStandardMaterial color="#3a3a3a" roughness={0.3} metalness={0.9} />
    </mesh>
  </group>
);

// Modelo procedimental de pala parrillera para acarrear brasas
export const PalaModel: React.FC = () => (
  <group rotation={[0.3, 0.1, -0.1]}>
    {/* Mango de madera torneada */}
    <mesh position={[0, -0.45, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.4, 16]} />
      <meshStandardMaterial color="#5a331a" roughness={0.7} metalness={0.1} />
    </mesh>

    {/* Virola */}
    <mesh position={[0, -0.23, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.04, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla de hierro */}
    <mesh position={[0, 0.25, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.92, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Chapa plana de la pala */}
    <group position={[0, 0.8, 0.02]} rotation={[-0.2, 0, 0]}>
      {/* Fondo de la pala */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.28, 0.008]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Pestaña trasera */}
      <mesh position={[0, -0.14, 0.025]} castShadow>
        <boxGeometry args={[0.22, 0.008, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Pestañas laterales */}
      <mesh position={[-0.11, 0, 0.02]} castShadow>
        <boxGeometry args={[0.008, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[0.11, 0, 0.02]} castShadow>
        <boxGeometry args={[0.008, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
    </group>
  </group>
);

// Modelo procedimental de atizador criollo en forma de 'L'
export const AtizadorModel: React.FC = () => (
  <group rotation={[0.3, 0.1, -0.1]}>
    {/* Mango de madera con argolla */}
    <mesh position={[0, -0.45, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.4, 16]} />
      <meshStandardMaterial color="#5a331a" roughness={0.7} metalness={0.1} />
    </mesh>

    {/* Argolla trasera para colgar */}
    <mesh position={[0, -0.67, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.022, 0.005, 8, 20]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Virola */}
    <mesh position={[0, -0.23, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.04, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla larga de hierro macizo */}
    <mesh position={[0, 0.28, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.98, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Gancho / codo en 'L' para quebrar y arrastrar leña */}
    <mesh position={[0.065, 0.77, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.14, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
  </group>
);

export const PlayerTools: React.FC = () => {
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const stage = useAsadoStore((state) => state.stage);
  const toolGroupRef = useRef<Group>(null);
  const targetPos = useRef(new Vector3());

  // En cada frame, sincronizamos sutilmente la herramienta con el campo de visión del asador (POV)
  useFrame(({ camera, pointer }) => {
    if (!toolGroupRef.current || stage === 'menu') return;

    // Posicionamos la herramienta en la mano derecha inferior de la vista
    targetPos.current.set(0.38 + pointer.x * 0.08, -0.32 + pointer.y * 0.06, -0.75);
    targetPos.current.applyMatrix4(camera.matrixWorld);

    // Interpolación suave
    toolGroupRef.current.position.lerp(targetPos.current, 0.15);
    toolGroupRef.current.quaternion.slerp(camera.quaternion, 0.15);
  });

  // Si estamos en el menú de bienvenida, ocultamos la herramienta en mano
  if (stage === 'menu') {
    return null;
  }

  const renderActiveTool = (tool: AsadoTool) => {
    switch (tool) {
      case 'tenedor':
        return <TenedorModel />;
      case 'pala':
        return <PalaModel />;
      case 'atizador':
        return <AtizadorModel />;
      default:
        return <TenedorModel />;
    }
  };

  return (
    <group ref={toolGroupRef} scale={[0.55, 0.55, 0.55]}>
      {renderActiveTool(selectedTool)}
    </group>
  );
};
