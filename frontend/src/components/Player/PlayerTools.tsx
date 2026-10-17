import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Quaternion, Euler, MathUtils } from 'three';
import { useAsadoStore } from '../../store/useAsadoStore';
import { GLBModel } from '../Common/GLBModel';
import { GlowingEmberModel } from '../Common/GlowingEmberModel';
import { SafeGLTF } from '../Common/SafeModelLoader';
import { MODEL_REGISTRY } from '../../config/modelRegistry';

const PALA_ATIZADOR_URL = MODEL_REGISTRY.PALA_Y_ATIZADOR.url;
const CARBON_URL = MODEL_REGISTRY.CARBON.url;

// Modelo procedural de tenedor parrillero criollo con presencia visual clara en primera persona
export const TenedorModel: React.FC = () => (
  <group rotation={[-0.75, -0.22, 0.18]} scale={[0.46, 0.46, 0.46]}>
    {/* Mango de quebracho rústico lustrado */}
    <mesh position={[0, -0.28, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.36, 16]} />
      <meshStandardMaterial color="#4a2a16" roughness={0.6} metalness={0.1} />
    </mesh>

    {/* Virola de latón / bronce parrillero */}
    <mesh position={[0, -0.09, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.038, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.85} />
    </mesh>

    {/* Varilla larga de hierro forjado negro */}
    <mesh position={[0, 0.28, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.74, 12]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.38} metalness={0.88} />
    </mesh>

    {/* Puente bifurcado horizontal */}
    <mesh position={[0, 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.14, 12]} />
      <meshStandardMaterial color="#242424" roughness={0.35} metalness={0.88} />
    </mesh>

    {/* Púa izquierda de acero */}
    <mesh position={[-0.05, 0.79, 0]} castShadow>
      <coneGeometry args={[0.009, 0.28, 8]} />
      <meshStandardMaterial color="#555555" roughness={0.22} metalness={0.94} />
    </mesh>

    {/* Púa derecha de acero */}
    <mesh position={[0.05, 0.79, 0]} castShadow>
      <coneGeometry args={[0.009, 0.28, 8]} />
      <meshStandardMaterial color="#555555" roughness={0.22} metalness={0.94} />
    </mesh>
  </group>
);

// Fallback procedural de pala parrillera
export const PalaProceduralModel: React.FC = () => (
  <group rotation={[-0.75, -0.22, 0.18]} scale={[0.46, 0.46, 0.46]}>
    <mesh position={[0, -0.28, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.36, 16]} />
      <meshStandardMaterial color="#4a2a16" roughness={0.6} metalness={0.1} />
    </mesh>
    <mesh position={[0, -0.09, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.038, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.28, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.76, 12]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.4} metalness={0.85} />
    </mesh>
    <group position={[0, 0.72, 0.02]} rotation={[-0.2, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.25, 0.01]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.82} />
      </mesh>
    </group>
  </group>
);

// Fallback procedural de atizador criollo
export const AtizadorProceduralModel: React.FC = () => (
  <group rotation={[-0.75, -0.22, 0.18]} scale={[0.46, 0.46, 0.46]}>
    <mesh position={[0, -0.28, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.36, 16]} />
      <meshStandardMaterial color="#4a2a16" roughness={0.6} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.3, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.82, 12]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.4} metalness={0.85} />
    </mesh>
    <mesh position={[0.06, 0.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.13, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
  </group>
);

// Modelo procedural de cepillo parrillero
export const CepilloModel: React.FC = () => (
  <group rotation={[-0.75, -0.22, 0.18]} scale={[0.46, 0.46, 0.46]}>
    <mesh position={[0, -0.22, 0]} castShadow>
      <cylinderGeometry args={[0.018, 0.022, 0.42, 12]} />
      <meshStandardMaterial color="#553018" roughness={0.75} metalness={0.08} />
    </mesh>
    <mesh position={[0, 0.1, 0]} castShadow>
      <boxGeometry args={[0.09, 0.24, 0.048]} />
      <meshStandardMaterial color="#3e2210" roughness={0.7} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.1, 0.038]} castShadow>
      <boxGeometry args={[0.08, 0.22, 0.03]} />
      <meshStandardMaterial color="#c29c50" roughness={0.5} metalness={0.8} />
    </mesh>
  </group>
);

export const PlayerTools: React.FC = () => {
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const carriedEmbersCount = useAsadoStore((state) => state.carriedEmbersCount);
  const toolActionTrigger = useAsadoStore((state) => state.toolActionTrigger);
  const interactFogon = useAsadoStore((state) => state.interactFogon);
  const addNewRandomMeat = useAsadoStore((state) => state.addNewRandomMeat);

  const toolGroupRef = useRef<Group>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

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
        case 'f':
          interactFogon();
          break;
        case 'm':
          addNewRandomMeat();
          break;
        case 'escape':
        case 'e':
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
  }, [setSelectedTool, interactFogon, addNewRandomMeat]);

  const currentPos = useRef(new Vector3(0.2, -0.15, -0.48));
  const targetPos = useRef(new Vector3());
  const targetRot = useRef(new Quaternion());
  const eulerAux = useRef(new Euler());

  const actionProgress = useRef(1.0);
  const isActing = useRef(false);
  const lastTriggerRef = useRef(toolActionTrigger);

  useEffect(() => {
    if (toolActionTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = toolActionTrigger;
      isActing.current = true;
      actionProgress.current = 0;
    }
  }, [toolActionTrigger]);

  // Animación viva en useFrame: oscilación rústica continua (respiración / sway) y respuesta reactiva a acciones
  useFrame(({ camera, pointer, clock }, delta) => {
    if (!toolGroupRef.current) return;

    if (selectedTool === 'ninguna') {
      toolGroupRef.current.visible = false;
      return;
    }
    toolGroupRef.current.visible = true;

    const t = clock.elapsedTime;

    // Sway orgánico y perceptible de respiración del asador y respuesta dinámica al puntero
    const swayX = Math.sin(t * 2.2) * 0.024 + pointer.x * 0.045;
    const swayY = Math.cos(t * 2.6) * 0.02 - pointer.y * 0.038;
    const swayZ = Math.sin(t * 1.8) * 0.016;

    // Bobbing angular de la muñeca
    const bobRotX = Math.sin(t * 2.2) * 0.035;
    const bobRotY = Math.cos(t * 1.9) * 0.035;
    const bobRotZ = Math.sin(t * 2.1) * 0.025;

    let actionOffsetX = 0;
    let actionOffsetY = 0;
    let actionOffsetZ = 0;
    let actionRotX = 0;
    let actionRotY = 0;
    let actionRotZ = 0;

    // Feedback táctil activo cuando el asador pincha, recoge brasas o cepilla
    if (isActing.current) {
      actionProgress.current += delta * 5.5;
      if (actionProgress.current >= 1.0) {
        actionProgress.current = 1.0;
        isActing.current = false;
      }

      const pulse = Math.sin(actionProgress.current * Math.PI);

      switch (selectedTool) {
        case 'tenedor':
          actionOffsetZ = -0.18 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotX = -0.35 * pulse;
          actionRotZ = 0.52 * pulse;
          break;
        case 'pala':
          actionOffsetY = -0.12 * pulse;
          actionOffsetZ = -0.15 * pulse;
          actionRotX = 0.42 * pulse;
          break;
        case 'atizador':
          actionOffsetX = -0.16 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotY = 0.5 * pulse;
          break;
        case 'cepillo': {
          const scrubCycle = Math.sin(actionProgress.current * Math.PI * 4);
          actionOffsetZ = -0.15 * pulse + scrubCycle * 0.04;
          actionOffsetY = -0.04 * pulse;
          actionRotX = 0.3 * pulse;
          break;
        }
        default:
          break;
      }
    }

    // Posición calibrada en primera persona para visualización clara y óptima dentro del FOV
    const baseOffset = new Vector3(
      0.21 + swayX + actionOffsetX,
      -0.15 + swayY + actionOffsetY,
      -0.48 + swayZ + actionOffsetZ
    );

    targetPos.current.copy(baseOffset);
    targetPos.current.applyMatrix4(camera.matrixWorld);

    currentPos.current.lerp(targetPos.current, MathUtils.clamp(delta * 14, 0.1, 0.9));
    toolGroupRef.current.position.copy(currentPos.current);

    eulerAux.current.set(
      camera.rotation.x + actionRotX + bobRotX,
      camera.rotation.y + actionRotY + bobRotY,
      camera.rotation.z + actionRotZ + bobRotZ,
      camera.rotation.order
    );
    targetRot.current.setFromEuler(eulerAux.current);

    toolGroupRef.current.quaternion.slerp(targetRot.current, MathUtils.clamp(delta * 16, 0.1, 0.95));
  });

  return (
    <group ref={toolGroupRef}>
      {selectedTool === 'tenedor' && <TenedorModel />}

      {selectedTool === 'pala' && (
        <group rotation={[-0.75, -0.22, 0.18]}>
          <SafeGLTF
            modelPath={PALA_ATIZADOR_URL}
            fallback={<PalaProceduralModel />}
          >
            {() => (
              <GLBModel
                url={PALA_ATIZADOR_URL}
                spatialHalf="first"
                targetSize={0.65}
                rotation={[Math.PI, Math.PI, 0]}
              />
            )}
          </SafeGLTF>

          {/* Brasa auténtica carbon.glb anclada EXACTAMENTE adentro de la cuchara de la pala (x = 0) */}
          {carriedEmbersCount > 0 && (
            <group position={[0, 0.22, 0.02]}>
              <GlowingEmberModel
                url={CARBON_URL}
                targetSize={0.085}
                burnProgress={1.0}
                pulsePhase={0.5}
                castShadow
              />
              <pointLight color="#ff4500" intensity={1.5} distance={1.2} />
            </group>
          )}
        </group>
      )}

      {selectedTool === 'atizador' && (
        <group rotation={[-0.75, -0.22, 0.18]}>
          <SafeGLTF
            modelPath={PALA_ATIZADOR_URL}
            fallback={<AtizadorProceduralModel />}
          >
            {() => (
              <GLBModel
                url={PALA_ATIZADOR_URL}
                spatialHalf="second"
                targetSize={0.65}
                rotation={[Math.PI, 0, 0]}
              />
            )}
          </SafeGLTF>
        </group>
      )}

      {selectedTool === 'cepillo' && <CepilloModel />}
    </group>
  );
};
