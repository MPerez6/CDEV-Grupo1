import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Color, InstancedMesh, Object3D } from 'three';
import { Text } from '@react-three/drei';
import { useAsadoStore } from '../../store/useAsadoStore';

// Partículas de llamas y chispas procedimentales para el fuego del fogonero
export const FireFlamesParticles: React.FC<{ progress: number }> = ({ progress }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const count = 30;

  const dummy = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);
  const baseFlames = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new Vector3(
        (Math.random() - 0.5) * 0.35,
        Math.random() * 0.4,
        (Math.random() - 0.5) * 0.35
      ),
      speedY: 0.5 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      baseScale: 0.04 + Math.random() * 0.05,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const intensity = Math.min(1.2, 0.4 + progress * 0.8);

    for (let i = 0; i < count; i++) {
      const p = baseFlames[i];
      // Animación ascendente cíclica de la llama
      const y = ((p.pos.y + t * p.speedY) % 0.65);
      const wobbleX = Math.sin(t * 5 + p.phase) * 0.04;
      const wobbleZ = Math.cos(t * 4 + p.phase) * 0.04;

      dummy.position.set(p.pos.x + wobbleX, y + 0.1, p.pos.z + wobbleZ);

      // La escala se achica a medida que la llama asciende y se disipa
      const scaleFactor = (1 - y / 0.65) * p.baseScale * intensity;
      dummy.scale.set(scaleFactor, scaleFactor * 1.8, scaleFactor);
      dummy.rotation.set(0, t * 2 + p.phase, wobbleX * 4);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Gradiente de color: del amarillo incandescente en la base al rojo en la punta
      const heightNorm = y / 0.65;
      if (heightNorm < 0.4) {
        tempColor.set('#ffea00').lerp(new Color('#ff6600'), heightNorm / 0.4);
      } else {
        tempColor.set('#ff6600').lerp(new Color('#881100'), (heightNorm - 0.4) / 0.6);
      }
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0.05, 0]}>
      <coneGeometry args={[0.08, 0.22, 5]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.88} />
    </instancedMesh>
  );
};

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

  // Progresión y combustión de los leños en tiempo real
  useFrame((_, delta) => {
    if (fogonStage === 'encendido') {
      avanzarFogon(delta);
    }
  });

  const handleFogonClick = (e: any) => {
    e.stopPropagation();

    // 1. Si no hay fuego, colocar papel y fósforos
    if (fogonStage === 'sin_fuego') {
      colocarPapelYFosforo();
      return;
    }

    // 2. Si ya tiene papel y fósforo, encender el fuego
    if (fogonStage === 'con_papel') {
      encenderFogon();
      return;
    }

    // 3. Si las brasas están listas, cargar en la pala/atizador
    if (fogonStage === 'brasas_listas') {
      if (selectedTool !== 'pala' && selectedTool !== 'atizador') {
        setSelectedTool('pala');
      }
      tomarBrasasDelFogon(8);
    }
  };

  // Simulación del colapso de los leños: se achican y ennegrecen con la combustión
  const woodScale = 1.0 - fogonProgress * 0.45;
  const woodY = 0.25 - fogonProgress * 0.12;
  const woodColor =
    fogonStage === 'sin_fuego' || fogonStage === 'con_papel'
      ? '#4a2e18'
      : fogonStage === 'encendido'
      ? '#22150d'
      : '#120d0b';

  return (
    <group
      ref={fogonGroupRef}
      position={[-1.3, 0.05, 0]}
      onClick={handleFogonClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 1. Canasto de hierro criollo / fogonero lateral (brasero) */}
      <group position={[0, 0.2, 0]}>
        {/* Anillo de base */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <torusGeometry args={[0.3, 0.015, 8, 24]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.8} />
        </mesh>
        {/* Anillo superior */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <torusGeometry args={[0.34, 0.015, 8, 24]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.8} />
        </mesh>
        {/* Varillas verticales de contención */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const r = 0.32;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * r, 0.05, Math.sin(angle) * r]}
              castShadow
            >
              <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
              <meshStandardMaterial color="#1f1f1f" roughness={0.6} metalness={0.85} />
            </mesh>
          );
        })}
        {/* Piso de ladrillo/chapa bajo el brasero */}
        <mesh position={[0, -0.22, 0]} receiveShadow>
          <cylinderGeometry args={[0.38, 0.42, 0.04, 24]} />
          <meshStandardMaterial color="#2d221c" roughness={0.9} metalness={0.1} />
        </mesh>
      </group>

      {/* 2. Leños de quebracho colorado cruzados */}
      <group position={[0, woodY, 0]} scale={[woodScale, woodScale, woodScale]}>
        <mesh position={[-0.05, 0, 0]} rotation={[0.4, 0.3, 0.8]} castShadow>
          <cylinderGeometry args={[0.04, 0.045, 0.44, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.9} />
        </mesh>
        <mesh position={[0.05, 0.02, 0]} rotation={[-0.5, 0.7, -0.6]} castShadow>
          <cylinderGeometry args={[0.038, 0.042, 0.42, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.06, 0.03]} rotation={[0.8, -0.4, 0.2]} castShadow>
          <cylinderGeometry args={[0.035, 0.038, 0.4, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.9} />
        </mesh>
      </group>

      {/* 3. Papel de diario y fósforos iniciales */}
      {(fogonStage === 'con_papel' || (fogonStage === 'encendido' && fogonProgress < 0.3)) && (
        <group position={[0, 0.12, 0]}>
          <mesh rotation={[0.2, 0.5, 0.1]} castShadow>
            <dodecahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial
              color="#e0ded6"
              roughness={0.95}
              wireframe={false}
            />
          </mesh>
          <mesh position={[0.08, 0.08, 0.05]} rotation={[0, 0, 0.6]}>
            <cylinderGeometry args={[0.005, 0.005, 0.09]} />
            <meshStandardMaterial color="#c29b68" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* 4. Llamas y resplandor de fuego activo */}
      {fogonStage === 'encendido' && (
        <>
          <FireFlamesParticles progress={fogonProgress} />
          <pointLight
            position={[0, 0.3, 0]}
            color="#ff5500"
            intensity={2.8 * Math.min(1.0, 0.3 + fogonProgress)}
            distance={4.0}
            decay={2}
          />
        </>
      )}

      {/* 5. Colchón de brasas vivas en el fogonero */}
      {(fogonStage === 'brasas_listas' || fogonProgress > 0.6) && (
        <group position={[0, 0.05, 0]}>
          <pointLight
            position={[0, 0.15, 0]}
            color="#ff4400"
            intensity={1.8}
            distance={2.5}
            decay={2}
          />
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.24, 0.28, 0.09, 12]} />
            <meshStandardMaterial
              color="#ff3300"
              emissive="#ff2200"
              emissiveIntensity={0.85}
              roughness={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Cartel 3D de guía flotante sobre el fogonero */}
      <group position={[0, 0.65, 0]}>
        {fogonStage === 'sin_fuego' && (
          <Text
            fontSize={0.065}
            color="#f39c12"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            [ Iniciar Fuego ]
          </Text>
        )}
        {fogonStage === 'con_papel' && (
          <Text
            fontSize={0.065}
            color="#e67e22"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            🔥 Clic para Encender
          </Text>
        )}
        {fogonStage === 'brasas_listas' && fogonEmbersCount > 0 && (
          <Text
            fontSize={0.06}
            color="#ffddaa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            {carriedEmbersCount > 0 ? '✓ Brasas en Pala' : '🪵 Clic para Cargar Brasas'}
          </Text>
        )}
      </group>
    </group>
  );
};
