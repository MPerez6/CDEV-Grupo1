import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Color, InstancedMesh, Object3D } from 'three';
import { Text } from '@react-three/drei';
import { useAsadoStore } from '../../store/useAsadoStore';

// Partículas de llamas y chispas procedimentales para el fuego del brasero
export const FireFlamesParticles: React.FC<{ progress: number }> = ({ progress }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const count = 35;

  const dummy = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);
  const baseFlames = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new Vector3(
        (Math.random() - 0.5) * 0.28,
        Math.random() * 0.35,
        (Math.random() - 0.5) * 0.28
      ),
      speedY: 0.6 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      baseScale: 0.035 + Math.random() * 0.045,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const intensity = Math.min(1.25, 0.45 + progress * 0.85);

    for (let i = 0; i < count; i++) {
      const p = baseFlames[i];
      const y = ((p.pos.y + t * p.speedY) % 0.6);
      const wobbleX = Math.sin(t * 5.5 + p.phase) * 0.035;
      const wobbleZ = Math.cos(t * 4.5 + p.phase) * 0.035;

      dummy.position.set(p.pos.x + wobbleX, y + 0.1, p.pos.z + wobbleZ);

      const scaleFactor = (1 - y / 0.6) * p.baseScale * intensity;
      dummy.scale.set(scaleFactor, scaleFactor * 1.9, scaleFactor);
      dummy.rotation.set(0, t * 2.2 + p.phase, wobbleX * 4);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      const heightNorm = y / 0.6;
      if (heightNorm < 0.35) {
        tempColor.set('#ffea00').lerp(new Color('#ff6600'), heightNorm / 0.35);
      } else {
        tempColor.set('#ff6600').lerp(new Color('#881100'), (heightNorm - 0.35) / 0.65);
      }
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0.08, 0]}>
      <coneGeometry args={[0.07, 0.2, 5]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.88} />
    </instancedMesh>
  );
};

// Brasero y fogonero criollo 100% procedural (sin llamadas a useGLTF)
export const Fogon: React.FC = () => {
  const fogonGroupRef = useRef<Group>(null);
  const fogonStage = useAsadoStore((state) => state.fogonStage);
  const fogonProgress = useAsadoStore((state) => state.fogonProgress);
  const fogonEmbersCount = useAsadoStore((state) => state.fogonEmbersCount);
  const carriedEmbersCount = useAsadoStore((state) => state.carriedEmbersCount);
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const colocarPapelYFosforo = useAsadoStore((state) => state.colocarPapelYFosforo);
  const encenderFogon = useAsadoStore((state) => state.encenderFogon);
  const avanzarFogon = useAsadoStore((state) => state.avanzarFogon);
  const tomarBrasasDelFogon = useAsadoStore((state) => state.tomarBrasasDelFogon);
  const triggerToolAction = useAsadoStore((state) => state.triggerToolAction);

  // Progresión de combustión
  useFrame((_, delta) => {
    if (fogonStage === 'encendido') {
      avanzarFogon(delta);
    }
  });

  const handleFogonClick = (e: any) => {
    e.stopPropagation();
    triggerToolAction();

    if (fogonStage === 'sin_fuego') {
      colocarPapelYFosforo();
      return;
    }

    if (fogonStage === 'con_papel') {
      encenderFogon();
      return;
    }

    if (fogonStage === 'brasas_listas') {
      if (selectedTool !== 'pala' && selectedTool !== 'atizador') {
        setSelectedTool('pala');
      }
      tomarBrasasDelFogon(8);
    }
  };

  const woodScale = 1.0 - fogonProgress * 0.45;
  const woodY = 0.22 - fogonProgress * 0.1;
  const woodColor =
    fogonStage === 'sin_fuego' || fogonStage === 'con_papel'
      ? '#442614'
      : fogonStage === 'encendido'
      ? '#22140d'
      : '#110b08';

  const numBarrotes = 14;
  const basketRadius = 0.24;
  const basketHeight = 0.38;

  return (
    <group
      ref={fogonGroupRef}
      position={[-0.95, 0, 0]}
      onClick={handleFogonClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 1. Base refractaria donde caerán las brasas */}
      <group position={[0, 0.02, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[0.34, 0.36, 0.04, 28]} />
          <meshStandardMaterial color="#3a2e26" roughness={0.92} metalness={0.08} />
        </mesh>
        {/* Cerco perimetral de ladrillos refractarios */}
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <torusGeometry args={[0.33, 0.02, 8, 28]} />
          <meshStandardMaterial color="#4a3729" roughness={0.88} metalness={0.05} />
        </mesh>
      </group>

      {/* 2. Canasto de hierro criollo / fogonero de barrotes cilíndricos oscuros */}
      <group position={[0, 0.06, 0]}>
        {/* Aro inferior de hierro */}
        <mesh position={[0, 0.04, 0]} castShadow>
          <torusGeometry args={[basketRadius, 0.012, 8, 24]} />
          <meshStandardMaterial color="#1f1f1f" roughness={0.65} metalness={0.85} />
        </mesh>

        {/* Aro intermedio de hierro */}
        <mesh position={[0, basketHeight * 0.5, 0]} castShadow>
          <torusGeometry args={[basketRadius + 0.01, 0.012, 8, 24]} />
          <meshStandardMaterial color="#1f1f1f" roughness={0.65} metalness={0.85} />
        </mesh>

        {/* Aro superior de hierro */}
        <mesh position={[0, basketHeight, 0]} castShadow>
          <torusGeometry args={[basketRadius + 0.02, 0.013, 8, 24]} />
          <meshStandardMaterial color="#1f1f1f" roughness={0.65} metalness={0.85} />
        </mesh>

        {/* Barrotes verticales cilíndricos oscuros */}
        {Array.from({ length: numBarrotes }).map((_, i) => {
          const angle = (i / numBarrotes) * Math.PI * 2;
          const x = Math.cos(angle) * basketRadius;
          const z = Math.sin(angle) * basketRadius;
          return (
            <mesh
              key={`barrote-${i}`}
              position={[x, basketHeight / 2, z]}
              castShadow
            >
              <cylinderGeometry args={[0.009, 0.009, basketHeight, 8]} />
              <meshStandardMaterial color="#181818" roughness={0.6} metalness={0.88} />
            </mesh>
          );
        })}

        {/* Patas de elevación del canasto */}
        {[-0.16, 0.16].map((x, i) =>
          [-0.16, 0.16].map((z, j) => (
            <mesh key={`pata-${i}-${j}`} position={[x, 0.03, z]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
              <meshStandardMaterial color="#181818" roughness={0.6} metalness={0.88} />
            </mesh>
          ))
        )}
      </group>

      {/* 3. Leños cruzados de quebracho colorado (madera rústica) */}
      <group position={[0, woodY + 0.06, 0]} scale={[woodScale, woodScale, woodScale]}>
        <mesh position={[-0.04, 0, 0.02]} rotation={[0.35, 0.25, 0.75]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.36, 10]} />
          <meshStandardMaterial color={woodColor} roughness={0.92} />
        </mesh>
        <mesh position={[0.04, 0.03, -0.02]} rotation={[-0.45, 0.6, -0.6]} castShadow>
          <cylinderGeometry args={[0.032, 0.036, 0.34, 10]} />
          <meshStandardMaterial color={woodColor} roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.07, 0.01]} rotation={[0.75, -0.35, 0.15]} castShadow>
          <cylinderGeometry args={[0.03, 0.033, 0.32, 10]} />
          <meshStandardMaterial color={woodColor} roughness={0.92} />
        </mesh>
      </group>

      {/* 4. Papel y fósforo inicial */}
      {(fogonStage === 'con_papel' || (fogonStage === 'encendido' && fogonProgress < 0.25)) && (
        <group position={[0, 0.1, 0]}>
          <mesh rotation={[0.2, 0.5, 0.1]} castShadow>
            <dodecahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial color="#dedad2" roughness={0.95} />
          </mesh>
          <mesh position={[0.06, 0.06, 0.04]} rotation={[0, 0, 0.6]}>
            <cylinderGeometry args={[0.004, 0.004, 0.08]} />
            <meshStandardMaterial color="#bda078" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* 5. Llamas y resplandor de fuego activo */}
      {fogonStage === 'encendido' && (
        <>
          <FireFlamesParticles progress={fogonProgress} />
          <pointLight
            position={[0, 0.32, 0]}
            color="#ff5500"
            intensity={2.6 * Math.min(1.0, 0.35 + fogonProgress)}
            distance={3.5}
            decay={2}
          />
        </>
      )}

      {/* 6. Base con brasas vivas en el fogonero */}
      {(fogonStage === 'brasas_listas' || fogonProgress > 0.6) && (
        <group position={[0, 0.04, 0]}>
          <pointLight
            position={[0, 0.12, 0]}
            color="#ff3300"
            intensity={1.8}
            distance={2.2}
            decay={2}
          />
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.22, 0.25, 0.06, 14]} />
            <meshStandardMaterial
              color="#ff2200"
              emissive="#ff3300"
              emissiveIntensity={0.85}
              roughness={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Cartel flotante de guía sobre el fogonero */}
      <group position={[0, 0.58, 0]}>
        {fogonStage === 'sin_fuego' && (
          <Text
            fontSize={0.06}
            color="#f39c12"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#000000"
          >
            [ Iniciar Fuego ]
          </Text>
        )}
        {fogonStage === 'con_papel' && (
          <Text
            fontSize={0.06}
            color="#e67e22"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#000000"
          >
            🔥 Clic para Encender
          </Text>
        )}
        {fogonStage === 'brasas_listas' && fogonEmbersCount > 0 && (
          <Text
            fontSize={0.055}
            color="#ffddaa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#000000"
          >
            {carriedEmbersCount > 0 ? '✓ Brasas en Pala' : '🪵 Clic para Cargar Brasas'}
          </Text>
        )}
      </group>
    </group>
  );
};
