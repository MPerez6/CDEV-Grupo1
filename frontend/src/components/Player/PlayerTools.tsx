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

// Configuración de clúster de brasas incandescentes para la pala
const SHOVEL_EMBERS = [
  { position: [0.0, 0.23, 0.005] as [number, number, number], rotation: [0.25, 0.4, -0.3] as [number, number, number], size: 0.048, phase: 0.0 },
  { position: [-0.032, 0.238, -0.022] as [number, number, number], rotation: [-0.6, 1.3, 0.2] as [number, number, number], size: 0.042, phase: 0.9 },
  { position: [0.031, 0.235, -0.018] as [number, number, number], rotation: [1.1, -0.7, 0.4] as [number, number, number], size: 0.045, phase: 1.8 },
  { position: [-0.022, 0.244, 0.024] as [number, number, number], rotation: [0.5, 2.1, -0.8] as [number, number, number], size: 0.039, phase: 2.7 },
  { position: [0.025, 0.246, 0.02] as [number, number, number], rotation: [-0.8, 0.6, 1.4] as [number, number, number], size: 0.043, phase: 3.6 },
  { position: [0.003, 0.255, 0.002] as [number, number, number], rotation: [0.9, -1.1, 0.7] as [number, number, number], size: 0.051, phase: 4.5 },
];

// Modelo procedural de tenedor parrillero criollo visible y bien proporcionado en primera persona
export const TenedorModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.85, -0.32, 0.25]} scale={[0.48, 0.48, 0.48]}>
    {/* Mango de quebracho rústico lustrado */}
    <mesh position={[0, -0.16, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.36, 16]} />
      <meshStandardMaterial color="#4a2a16" roughness={0.6} metalness={0.1} />
    </mesh>

    {/* Virola de latón / bronce parrillero */}
    <mesh position={[0, 0.03, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.038, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.85} />
    </mesh>

    {/* Varilla larga de hierro forjado negro */}
    <mesh position={[0, 0.38, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.68, 12]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.38} metalness={0.88} />
    </mesh>

    {/* Puente bifurcado horizontal */}
    <mesh position={[0, 0.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.14, 12]} />
      <meshStandardMaterial color="#242424" roughness={0.35} metalness={0.88} />
    </mesh>

    {/* Púa izquierda de acero templado */}
    <mesh position={[-0.05, 0.85, 0]} castShadow>
      <coneGeometry args={[0.009, 0.26, 8]} />
      <meshStandardMaterial color="#666666" roughness={0.22} metalness={0.94} />
    </mesh>

    {/* Púa derecha de acero templado */}
    <mesh position={[0.05, 0.85, 0]} castShadow>
      <coneGeometry args={[0.009, 0.26, 8]} />
      <meshStandardMaterial color="#666666" roughness={0.22} metalness={0.94} />
    </mesh>
  </group>
);

// Fallback procedural de pala parrillera
export const PalaProceduralModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.85, -0.32, 0.25]} scale={[0.48, 0.48, 0.48]}>
    <mesh position={[0, -0.16, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.36, 16]} />
      <meshStandardMaterial color="#4a2a16" roughness={0.6} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.03, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.038, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.38, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.7, 12]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.4} metalness={0.85} />
    </mesh>
    <group position={[0, 0.74, 0.02]} rotation={[-0.2, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.25, 0.01]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.82} />
      </mesh>
    </group>
  </group>
);

// Fallback procedural de atizador criollo
export const AtizadorProceduralModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.85, -0.32, 0.25]} scale={[0.48, 0.48, 0.48]}>
    <mesh position={[0, -0.16, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.026, 0.36, 16]} />
      <meshStandardMaterial color="#4a2a16" roughness={0.6} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.38, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.76, 12]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.4} metalness={0.85} />
    </mesh>
    <mesh position={[0.06, 0.74, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.13, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
  </group>
);

// Modelo procedural de cepillo parrillero
export const CepilloModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.85, -0.32, 0.25]} scale={[0.48, 0.48, 0.48]}>
    <mesh position={[0, -0.12, 0]} castShadow>
      <cylinderGeometry args={[0.018, 0.022, 0.38, 12]} />
      <meshStandardMaterial color="#553018" roughness={0.75} metalness={0.08} />
    </mesh>
    <mesh position={[0, 0.18, 0]} castShadow>
      <boxGeometry args={[0.09, 0.24, 0.048]} />
      <meshStandardMaterial color="#3e2210" roughness={0.7} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.18, 0.038]} castShadow>
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
  const triggerToolAction = useAsadoStore((state) => state.triggerToolAction);
  const interactFogon = useAsadoStore((state) => state.interactFogon);

  const toolGroupRef = useRef<Group>(null);

  // Atajos de teclado para selección ágil de herramientas
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
        case 'escape':
        case 'e':
          setSelectedTool('ninguna');
          break;
        default:
          break;
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      // Dispara la acción de la herramienta si se hace clic principal con alguna herramienta activa
      if (e.button === 0 && selectedTool !== 'ninguna') {
        const target = e.target as HTMLElement;
        if (target && !['BUTTON', 'A', 'INPUT'].includes(target.tagName)) {
          triggerToolAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [selectedTool, setSelectedTool, triggerToolAction, interactFogon]);

  const currentPos = useRef(new Vector3(0.18, -0.09, -0.42));
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
    const swayX = Math.sin(t * 1.8) * 0.016 + pointer.x * 0.035;
    const swayY = Math.cos(t * 2.2) * 0.014 - pointer.y * 0.028;
    const swayZ = Math.sin(t * 1.4) * 0.012;

    // Bobbing angular de la muñeca
    const bobRotX = Math.sin(t * 1.8) * 0.025;
    const bobRotY = Math.cos(t * 1.5) * 0.025;
    const bobRotZ = Math.sin(t * 1.7) * 0.02;

    let actionOffsetX = 0;
    let actionOffsetY = 0;
    let actionOffsetZ = 0;
    let actionRotX = 0;
    let actionRotY = 0;
    let actionRotZ = 0;

    // Feedback táctil activo cuando el asador pincha, recoge brasas o cepilla
    if (isActing.current) {
      actionProgress.current += delta * 6.0;
      if (actionProgress.current >= 1.0) {
        actionProgress.current = 1.0;
        isActing.current = false;
      }

      const pulse = Math.sin(actionProgress.current * Math.PI);

      switch (selectedTool) {
        case 'tenedor':
          actionOffsetZ = -0.16 * pulse;
          actionOffsetY = -0.04 * pulse;
          actionRotX = -0.32 * pulse;
          actionRotZ = 0.45 * pulse;
          break;
        case 'pala':
          actionOffsetY = -0.10 * pulse;
          actionOffsetZ = -0.14 * pulse;
          actionRotX = 0.38 * pulse;
          break;
        case 'atizador':
          actionOffsetX = -0.14 * pulse;
          actionOffsetY = -0.04 * pulse;
          actionRotY = 0.45 * pulse;
          break;
        case 'cepillo': {
          const scrubCycle = Math.sin(actionProgress.current * Math.PI * 4);
          actionOffsetZ = -0.12 * pulse + scrubCycle * 0.035;
          actionOffsetY = -0.03 * pulse;
          actionRotX = 0.28 * pulse;
          break;
        }
        default:
          break;
      }
    }

    // Posición calibrada en primera persona para visualización clara y óptima dentro del FOV (tercio inferior derecho)
    const baseOffset = new Vector3(
      0.18 + swayX + actionOffsetX,
      -0.09 + swayY + actionOffsetY,
      -0.42 + swayZ + actionOffsetZ
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
        <group position={[0, 0, 0]} rotation={[-0.85, -0.32, 0.25]}>
          <SafeGLTF
            modelPath={PALA_ATIZADOR_URL}
            fallback={<PalaProceduralModel />}
          >
            {() => (
              <GLBModel
                url={PALA_ATIZADOR_URL}
                spatialHalf="first"
                targetSize={0.65}
                rotation={[Math.PI, 0, 0]}
              />
            )}
          </SafeGLTF>

          {/* Clúster realista de 6 brasas incandescentes apiladas en la concavidad de la cuchara */}
          {carriedEmbersCount > 0 && (
            <group>
              {SHOVEL_EMBERS.map((ember, i) => (
                <GlowingEmberModel
                  key={`shovel-ember-${i}`}
                  url={CARBON_URL}
                  positionOffset={ember.position}
                  rotationOffset={ember.rotation}
                  targetSize={ember.size}
                  burnProgress={1.0}
                  pulsePhase={ember.phase}
                  castShadow
                />
              ))}
              <pointLight position={[0, 0.245, 0.01]} color="#ff4500" intensity={1.6} distance={1.3} />
            </group>
          )}
        </group>
      )}

      {selectedTool === 'atizador' && (
        <group position={[0, 0, 0]} rotation={[-0.85, -0.32, 0.25]}>
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
