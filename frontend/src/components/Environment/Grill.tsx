import React, { useRef, useState, useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';
import { useAsadoStore } from '../../store/useAsadoStore';

// Partículas de óxido y ceniza que caen al cepillar los hierros calientes
interface RustParticle {
  pos: Vector3;
  vel: Vector3;
  life: number;
  maxLife: number;
}

const RustSparks: React.FC<{ activePoints: Vector3[] }> = ({ activePoints }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const particles = useRef<RustParticle[]>([]);
  const maxParticles = 60;

  useMemo(() => {
    for (const pt of activePoints) {
      for (let i = 0; i < 4; i++) {
        if (particles.current.length < maxParticles) {
          particles.current.push({
            pos: pt.clone().add(new Vector3((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08)),
            vel: new Vector3(
              (Math.random() - 0.5) * 0.25,
              -0.3 - Math.random() * 0.3,
              (Math.random() - 0.5) * 0.25
            ),
            life: 0,
            maxLife: 0.45 + Math.random() * 0.25
          });
        }
      }
    }
  }, [activePoints]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const alive: RustParticle[] = [];
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      p.life += delta;
      p.pos.addScaledVector(p.vel, delta);
      if (p.life < p.maxLife) {
        alive.push(p);
      }
    }
    particles.current = alive;

    meshRef.current.count = particles.current.length;
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      const scale = Math.max(0.001, (1 - p.life / p.maxLife) * 0.02);
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8b4513" roughness={0.9} />
    </instancedMesh>
  );
};

// Estructura de soporte y patas de la parrilla criolla procedural
const GrillStructure: React.FC<{ width: number; length: number; height: number }> = ({
  width,
  length,
  height,
}) => {
  const halfW = width / 2;
  const halfL = length / 2;
  const legRadius = 0.016;

  return (
    <group position={[0, 0, 0]}>
      {/* 4 Patas de hierro forjado */}
      <mesh position={[-halfW, height / 2, -halfL]} castShadow>
        <cylinderGeometry args={[legRadius, legRadius, height, 12]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[halfW, height / 2, -halfL]} castShadow>
        <cylinderGeometry args={[legRadius, legRadius, height, 12]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[-halfW, height / 2, halfL]} castShadow>
        <cylinderGeometry args={[legRadius, legRadius, height, 12]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[halfW, height / 2, halfL]} castShadow>
        <cylinderGeometry args={[legRadius, legRadius, height, 12]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Travesaños inferiores de refuerzo */}
      <mesh position={[0, 0.08, -halfL]}>
        <boxGeometry args={[width, 0.02, 0.02]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.08, halfL]}>
        <boxGeometry args={[width, 0.02, 0.02]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Base refractaria bajo la parrilla donde descansan las brasas */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[width + 0.1, 0.02, length + 0.1]} />
        <meshStandardMaterial color="#2e231c" roughness={0.92} metalness={0.05} />
      </mesh>
    </group>
  );
};

export const Grill: React.FC = () => {
  // Proporciones realistas argentinas: 1.1m ancho x 0.72m profundidad x 0.35m altura
  const numBars = 17;
  const barSpacing = 0.065;
  const width = (numBars - 1) * barSpacing; // ~1.04m
  const barLength = 0.72;
  const grillHeight = 0.35;

  const rustLevel = useAsadoStore((state) => state.rustLevel);
  const cleanGrill = useAsadoStore((state) => state.cleanGrill);
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const distribuirBrasasEnParrilla = useAsadoStore((state) => state.distribuirBrasasEnParrilla);
  const placingMeatId = useAsadoStore((state) => state.placingMeatId);
  const setMeatPosition = useAsadoStore((state) => state.setMeatPosition);
  const finishPlacingMeat = useAsadoStore((state) => state.finishPlacingMeat);

  const [activePoints, setActivePoints] = useState<Vector3[]>([]);
  const isPointerDownRef = useRef(false);

  // Material de las varillas que pasa de oxidado criollo a curado negro brillante
  const barColor = useMemo(() => {
    const rusty = new Color('#6e3a24');
    const clean = new Color('#1c1c1c');
    return clean.clone().lerp(rusty, rustLevel);
  }, [rustLevel]);

  const barRoughness = 0.35 + rustLevel * 0.55;
  const barMetalness = 0.85 - rustLevel * 0.55;

  const handleBarClean = (e: ThreeEvent<PointerEvent>) => {
    if (selectedTool === 'cepillo') {
      e.stopPropagation();
      cleanGrill(0.06);
      setActivePoints([e.point.clone()]);
    }
  };

  const handleUnderGrillClick = (e: ThreeEvent<MouseEvent>) => {
    if (selectedTool === 'pala' || selectedTool === 'atizador') {
      e.stopPropagation();
      distribuirBrasasEnParrilla([e.point.x, 0.02, e.point.z]);
    }
  };

  const handlePlacingPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (placingMeatId) {
      e.stopPropagation();
      setMeatPosition(placingMeatId, [e.point.x, grillHeight + 0.06, e.point.z]);
    }
  };

  const handlePlacingPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (placingMeatId) {
      e.stopPropagation();
      finishPlacingMeat(placingMeatId, [e.point.x, grillHeight + 0.06, e.point.z]);
    }
  };

  return (
    <>
      {/* Colisionador plano calibrado sobre los hierros para que la carne descanse firme sin colarse */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[width / 2 + 0.04, 0.015, barLength / 2 + 0.02]}
          position={[0, grillHeight, 0]}
          friction={0.9}
        />

        <group position={[0, grillHeight, 0]}>
          {/* Varillas de hierro redondo de la parrilla procedural */}
          {Array.from({ length: numBars }).map((_, i) => (
            <mesh
              key={`bar-${i}`}
              position={[-(width / 2) + i * barSpacing, 0, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
              receiveShadow
              onPointerDown={(e) => {
                isPointerDownRef.current = true;
                handleBarClean(e);
              }}
              onPointerUp={() => {
                isPointerDownRef.current = false;
              }}
              onPointerMove={(e) => {
                if (isPointerDownRef.current) {
                  handleBarClean(e);
                }
              }}
            >
              <cylinderGeometry args={[0.007, 0.007, barLength, 10]} />
              <meshStandardMaterial
                color={barColor}
                metalness={barMetalness}
                roughness={barRoughness}
              />
            </mesh>
          ))}

          {/* Marco perimetral de hierro ángulo */}
          <mesh position={[-(width / 2) - 0.02, 0, 0]} castShadow>
            <boxGeometry args={[0.03, 0.03, barLength + 0.04]} />
            <meshStandardMaterial color="#202020" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[(width / 2) + 0.02, 0, 0]} castShadow>
            <boxGeometry args={[0.03, 0.03, barLength + 0.04]} />
            <meshStandardMaterial color="#202020" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -(barLength / 2) - 0.015]} castShadow>
            <boxGeometry args={[width + 0.06, 0.03, 0.03]} />
            <meshStandardMaterial color="#202020" metalness={0.8} roughness={0.4} />
          </mesh>
          {/* Grasera / canaleta frontal */}
          <mesh position={[0, -0.01, (barLength / 2) + 0.02]} castShadow>
            <boxGeometry args={[width + 0.06, 0.04, 0.04]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      </RigidBody>

      {/* Estructura de patas y base refractaria 100% procedural */}
      <GrillStructure width={width} length={barLength} height={grillHeight} />

      {/* Plano horizontal para arrastrar y colocar carne exactamente sobre los fierros */}
      <mesh
        position={[0, grillHeight + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePlacingPointerMove}
        onPointerDown={handlePlacingPointerDown}
      >
        <planeGeometry args={[width + 0.1, barLength + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Zona interactiva bajo la parrilla para tirar y distribuir brasas */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleUnderGrillClick}
        onPointerOver={(e) => {
          if (selectedTool === 'pala' || selectedTool === 'atizador') {
            e.stopPropagation();
            document.body.style.cursor = 'crosshair';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <planeGeometry args={[width + 0.2, barLength + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Partículas de óxido al limpiar con el cepillo */}
      <RustSparks activePoints={activePoints} />
    </>
  );
};
