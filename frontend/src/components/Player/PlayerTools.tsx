import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Quaternion, Euler, MathUtils } from 'three';
import { useAsadoStore, AsadoTool } from '../../store/useAsadoStore';
import { SafeGLTF } from '../Common/SafeModelLoader';

// Rutas de modelos GLB para forzar su auditoría y carga
const TENEDOR_MODEL_PATH = '/models/tenedor.glb';
const PALA_MODEL_PATH = '/models/pala.glb';
const ATIZADOR_MODEL_PATH = '/models/atizador.glb';
const CEPILLO_MODEL_PATH = '/models/cepillo.glb';

// Modelo procedimental de tenedor parrillero criollo de dos puntas
export const TenedorModel: React.FC = () => (
  <group rotation={[0.25, 0.05, -0.05]}>
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

// Modelo procedimental de pala parrillera con brasas incandescentes activas
export const PalaModel: React.FC<{ carriedEmbers?: number }> = ({ carriedEmbers = 0 }) => (
  <group rotation={[0.25, 0.05, -0.05]}>
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

    {/* Chapa de la pala */}
    <group position={[0, 0.8, 0.02]} rotation={[-0.2, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.28, 0.008]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.14, 0.025]} castShadow>
        <boxGeometry args={[0.22, 0.008, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[-0.11, 0, 0.02]} castShadow>
        <boxGeometry args={[0.008, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[0.11, 0, 0.02]} castShadow>
        <boxGeometry args={[0.008, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
      </mesh>

      {carriedEmbers > 0 && (
        <group position={[0, 0, 0.03]}>
          <pointLight color="#ff4400" intensity={1.5} distance={1.2} />
          {Array.from({ length: Math.min(carriedEmbers, 5) }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (i % 3 - 1) * 0.05 + (i * 0.01),
                ((i > 2 ? 0.04 : -0.04)),
                0.015
              ]}
            >
              <dodecahedronGeometry args={[0.022, 0]} />
              <meshStandardMaterial
                color="#ff2200"
                emissive="#ff5500"
                emissiveIntensity={1.2}
                roughness={0.8}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  </group>
);

// Modelo procedimental de atizador criollo en 'L'
export const AtizadorModel: React.FC = () => (
  <group rotation={[0.25, 0.05, -0.05]}>
    <mesh position={[0, -0.45, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.4, 16]} />
      <meshStandardMaterial color="#5a331a" roughness={0.7} metalness={0.1} />
    </mesh>
    <mesh position={[0, -0.67, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.022, 0.005, 8, 20]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
    <mesh position={[0, -0.23, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.04, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.28, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.98, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
    <mesh position={[0.065, 0.77, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.14, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
  </group>
);

// Modelo procedimental de cepillo parrillero de alambre
export const CepilloModel: React.FC = () => (
  <group rotation={[0.25, 0.05, -0.05]}>
    <mesh position={[0, -0.35, 0]} castShadow>
      <cylinderGeometry args={[0.018, 0.022, 0.45, 12]} />
      <meshStandardMaterial color="#653b1e" roughness={0.8} metalness={0.05} />
    </mesh>
    <mesh position={[0, 0.02, 0]} castShadow>
      <boxGeometry args={[0.1, 0.28, 0.05]} />
      <meshStandardMaterial color="#4a2812" roughness={0.7} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.02, 0.04]} castShadow>
      <boxGeometry args={[0.08, 0.25, 0.035]} />
      <meshStandardMaterial color="#b89758" roughness={0.5} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.17, 0.015]} castShadow>
      <boxGeometry args={[0.09, 0.025, 0.008]} />
      <meshStandardMaterial color="#777777" roughness={0.3} metalness={0.9} />
    </mesh>
  </group>
);

export const PlayerTools: React.FC = () => {
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const carriedEmbersCount = useAsadoStore((state) => state.carriedEmbersCount);
  const toolActionTrigger = useAsadoStore((state) => state.toolActionTrigger);

  const toolGroupRef = useRef<Group>(null);
  const animationRef = useRef<Group>(null);

  // Escucha global de eventos de teclado (C, P, A, T, 1, 2, 3, 4, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está en un input o editable
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'c':
        case '1':
          setSelectedTool('cepillo');
          break;
        case 'p':
        case '2':
          setSelectedTool('pala');
          break;
        case 'a':
        case '3':
          setSelectedTool('atizador');
          break;
        case 't':
        case '4':
          setSelectedTool('tenedor');
          break;
        case 'escape':
          setSelectedTool('ninguna');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setSelectedTool]);

  const currentPos = useRef(new Vector3(0.38, -0.32, -0.75));
  const targetPos = useRef(new Vector3());
  const targetRot = useRef(new Quaternion());
  const eulerAux = useRef(new Euler());

  const actionProgress = useRef(0);
  const isActing = useRef(false);
  const lastTriggerRef = useRef(toolActionTrigger);

  useEffect(() => {
    if (toolActionTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = toolActionTrigger;
      isActing.current = true;
      actionProgress.current = 0;
    }
  }, [toolActionTrigger]);

  useFrame(({ camera, pointer, clock }, delta) => {
    if (!toolGroupRef.current) return;

    if (selectedTool === 'ninguna') {
      toolGroupRef.current.visible = false;
      return;
    }
    toolGroupRef.current.visible = true;

    const t = clock.elapsedTime;
    const swayX = Math.sin(t * 1.8) * 0.012 + pointer.x * 0.04;
    const swayY = Math.cos(t * 2.2) * 0.014 + pointer.y * 0.03;
    const swayZ = Math.sin(t * 1.5) * 0.008;

    let actionOffsetX = 0;
    let actionOffsetY = 0;
    let actionOffsetZ = 0;
    let actionRotX = 0;
    let actionRotY = 0;
    let actionRotZ = 0;

    if (isActing.current) {
      actionProgress.current += delta * 4.2;
      if (actionProgress.current >= 1.0) {
        actionProgress.current = 1.0;
        isActing.current = false;
      }

      const pulse = Math.sin(actionProgress.current * Math.PI);

      switch (selectedTool) {
        case 'tenedor':
          actionOffsetZ = -0.22 * pulse;
          actionOffsetY = -0.06 * pulse;
          actionRotX = -0.35 * pulse;
          actionRotZ = 0.5 * pulse;
          break;
        case 'pala':
          actionOffsetY = -0.12 * pulse;
          actionOffsetZ = -0.16 * pulse;
          actionRotX = 0.3 * pulse;
          break;
        case 'atizador':
          actionOffsetX = -0.14 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotY = 0.45 * pulse;
          break;
        case 'cepillo': {
          const scrubCycle = Math.sin(actionProgress.current * Math.PI * 4);
          actionOffsetZ = -0.15 * pulse + scrubCycle * 0.04;
          actionOffsetY = -0.04 * pulse;
          actionRotX = 0.25 * pulse;
          break;
        }
        default:
          break;
      }
    }

    const baseCameraOffset = new Vector3(
      0.36 + swayX + actionOffsetX,
      -0.28 + swayY + actionOffsetY,
      -0.65 + swayZ + actionOffsetZ
    );

    targetPos.current.copy(baseCameraOffset);
    targetPos.current.applyMatrix4(camera.matrixWorld);

    currentPos.current.lerp(targetPos.current, MathUtils.clamp(delta * 14, 0.1, 0.9));
    toolGroupRef.current.position.copy(currentPos.current);

    eulerAux.current.set(
      camera.rotation.x + actionRotX + Math.sin(t * 1.6) * 0.02,
      camera.rotation.y + actionRotY + Math.cos(t * 1.4) * 0.02,
      camera.rotation.z + actionRotZ,
      camera.rotation.order
    );
    targetRot.current.setFromEuler(eulerAux.current);
    toolGroupRef.current.quaternion.slerp(targetRot.current, MathUtils.clamp(delta * 14, 0.1, 0.9));
  });

  const renderActiveTool = (tool: AsadoTool) => {
    switch (tool) {
      case 'tenedor':
        return (
          <SafeGLTF modelPath={TENEDOR_MODEL_PATH} fallback={<TenedorModel />}>
            {({ scene }) => <primitive object={scene.clone()} />}
          </SafeGLTF>
        );
      case 'pala':
        return (
          <SafeGLTF modelPath={PALA_MODEL_PATH} fallback={<PalaModel carriedEmbers={carriedEmbersCount} />}>
            {({ scene }) => <primitive object={scene.clone()} />}
          </SafeGLTF>
        );
      case 'atizador':
        return (
          <SafeGLTF modelPath={ATIZADOR_MODEL_PATH} fallback={<AtizadorModel />}>
            {({ scene }) => <primitive object={scene.clone()} />}
          </SafeGLTF>
        );
      case 'cepillo':
        return (
          <SafeGLTF modelPath={CEPILLO_MODEL_PATH} fallback={<CepilloModel />}>
            {({ scene }) => <primitive object={scene.clone()} />}
          </SafeGLTF>
        );
      case 'ninguna':
      default:
        return null;
    }
  };

  return (
    <group ref={toolGroupRef} scale={[0.55, 0.55, 0.55]}>
      <group ref={animationRef}>
        {renderActiveTool(selectedTool)}
      </group>
    </group>
  );
};
