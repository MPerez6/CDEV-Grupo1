import React, { useRef, useState, useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { useGLTF, Center } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';
import { useAsadoStore } from '../../store/useAsadoStore';

const GRILL_MODEL_PATH = '/models/outdoor+barbecue+grill+3d+model.glb';

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

  // Si hay nuevos puntos de cepillado, emitimos partículas
  useMemo(() => {
    for (const pt of activePoints) {
      for (let i = 0; i < 4; i++) {
        if (particles.current.length < maxParticles) {
          particles.current.push({
            pos: pt.clone().add(new Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1)),
            vel: new Vector3(
              (Math.random() - 0.5) * 0.3,
              -0.4 - Math.random() * 0.4,
              (Math.random() - 0.5) * 0.3
            ),
            life: 0,
            maxLife: 0.5 + Math.random() * 0.3
          });
        }
      }
    }
  }, [activePoints]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Actualizar físicas simples de partículas
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
      const scale = Math.max(0.001, (1 - p.life / p.maxLife) * 0.025);
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

export const Grill: React.FC = () => {
  const numBars = 29;
  const barSpacing = 0.12;
  const width = (numBars - 1) * barSpacing;

  const rustLevel = useAsadoStore((state) => state.rustLevel);
  const cleanGrill = useAsadoStore((state) => state.cleanGrill);
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const distribuirBrasasEnParrilla = useAsadoStore((state) => state.distribuirBrasasEnParrilla);

  const [activePoints, setActivePoints] = useState<Vector3[]>([]);
  const isPointerDownRef = useRef(false);

  // Carga del modelo GLB con Center según especificación de escala visible adecuada
  const { scene: grillModel } = useGLTF(GRILL_MODEL_PATH);

  // Material de las barras de la parrilla que transiciona de oxidado a limpio/curado
  const barColor = useMemo(() => {
    const rusty = new Color('#753f28');  // Color óxido ferroso
    const clean = new Color('#2a2a2a');  // Hierro curado parrillero brillante
    return clean.clone().lerp(rusty, rustLevel);
  }, [rustLevel]);

  const barRoughness = 0.3 + rustLevel * 0.6;
  const barMetalness = 0.9 - rustLevel * 0.65;

  // Interacción de limpieza sobre los hierros de la parrilla
  const handleBarClean = (e: ThreeEvent<PointerEvent>) => {
    if (selectedTool === 'cepillo') {
      e.stopPropagation();
      cleanGrill(0.04);
      setActivePoints([e.point.clone()]);
    }
  };

  // Interacción de acarreo y distribución de brasas debajo del emparrillado
  const handleUnderGrillClick = (e: ThreeEvent<MouseEvent>) => {
    if (selectedTool === 'pala' || selectedTool === 'atizador') {
      e.stopPropagation();
      distribuirBrasasEnParrilla([e.point.x, 0.02, e.point.z]);
    }
  };

  return (
    <>
      <RigidBody type="fixed" colliders="trimesh">
        <group position={[0, 0.3, 0]}>
          {/* Grilla principal de varillas de asado argentino */}
          {Array.from({ length: numBars }).map((_, i) => (
            <mesh
              key={i}
              position={[-(width / 2) + i * barSpacing, 0, 0]}
              rotation={[Math.PI / 2, 0, 0]}
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
              <cylinderGeometry args={[0.015, 0.015, 4]} />
              <meshStandardMaterial
                color={barColor}
                metalness={barMetalness}
                roughness={barRoughness}
              />
            </mesh>
          ))}

          {/* Marco perimetral y soportes laterales */}
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

          {/* Plano de colisión superior para la carne */}
          <mesh position={[0, -0.01, 0]} visible={false}>
            <boxGeometry args={[width + 0.1, 0.02, 4.0]} />
          </mesh>
        </group>
      </RigidBody>

      {/* Modelo GLB envuelto en <Center> de drei con escala adecuada */}
      <group position={[0, -0.08, 0]}>
        <Center scale={0.35}>
          <primitive object={grillModel.clone()} />
        </Center>
      </group>

      {/* Zona interactiva bajo la parrilla para sembrar/distribuir brasas con pala o atizador */}
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
        <planeGeometry args={[width + 0.5, 3.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Partículas de desprendimiento de ceniza y óxido al limpiar */}
      <RustSparks activePoints={activePoints} />
    </>
  );
};

// Precarga del modelo GLB para rendimiento óptimo
useGLTF.preload(GRILL_MODEL_PATH);
