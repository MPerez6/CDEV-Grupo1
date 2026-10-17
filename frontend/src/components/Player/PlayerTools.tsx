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

// Modelo procedural de tenedor parrillero criollo de gran presencia visual
export const TenedorModel: React.FC = () => (
  <group rotation={[-0.82, -0.2, 0.22]} scale={[0.42, 0.42, 0.42]}>
    {/* Mango de madera de quebracho lustrada */}
    <mesh position={[0, -0.32, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.35, 16]} />
      <meshStandardMaterial color="#4d2c18" roughness={0.65} metalness={0.1} />
    </mesh>

    {/* Virola de latón / bronce parrillero */}
    <mesh position={[0, -0.13, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla larga de hierro forjado */}
    <mesh position={[0, 0.24, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.72, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Base bifurcada horizontal */}
    <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Púa izquierda afilada */}
    <mesh position={[-0.045, 0.74, 0]} castShadow>
      <coneGeometry args={[0.008, 0.26, 8]} />
      <meshStandardMaterial color="#404040" roughness={0.25} metalness={0.92} />
    </mesh>

    {/* Púa derecha afilada */}
    <mesh position={[0.045, 0.74, 0]} castShadow>
      <coneGeometry args={[0.008, 0.26, 8]} />
      <meshStandardMaterial color="#404040" roughness={0.25} metalness={0.92} />
    </mesh>
  </group>
);

// Fallback procedural de pala parrillera
export const PalaProceduralModel: React.FC = () => (
  <group rotation={[-0.82, -0.2, 0.22]} scale={[0.42, 0.42, 0.42]}>
    <mesh position={[0, -0.32, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.35, 16]} />
      <meshStandardMaterial color="#4d2c18" roughness={0.65} metalness={0.1} />
    </mesh>
    <mesh position={[0, -0.13, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.26, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.76, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
    <group position={[0, 0.7, 0.02]} rotation={[-0.22, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.24, 0.008]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.8} />
      </mesh>
    </group>
  </group>
);

// Fallback procedural de atizador criollo
export const AtizadorProceduralModel: React.FC = () => (
  <group rotation={[-0.82, -0.2, 0.22]} scale={[0.42, 0.42, 0.42]}>
    <mesh position={[0, -0.32, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.35, 16]} />
      <meshStandardMaterial color="#4d2c18" roughness={0.65} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.28, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.82, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
    <mesh position={[0.055, 0.69, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
  </group>
);

// Modelo procedural de cepillo parrillero
export const CepilloModel: React.FC = () => (
  <group rotation={[-0.82, -0.2, 0.22]} scale={[0.42, 0.42, 0.42]}>
    <mesh position={[0, -0.25, 0]} castShadow>
      <cylinderGeometry args={[0.016, 0.02, 0.4, 12]} />
      <meshStandardMaterial color="#553018" roughness={0.75} metalness={0.08} />
    </mesh>
    <mesh position={[0, 0.06, 0]} castShadow>
      <boxGeometry args={[0.08, 0.22, 0.045]} />
      <meshStandardMaterial color="#3e2210" roughness={0.7} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.06, 0.035]} castShadow>
      <boxGeometry args={[0.07, 0.2, 0.028]} />
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

  // Atajos globales de teclado:
  // C: Cepillo | P: Pala | A: Atizador | T: Tenedor | F: Fogón | M: Carne | ESC/E: Mano libre
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

  const currentPos = useRef(new Vector3(0.2, -0.12, -0.38));
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

  // Animación viva en useFrame: respiración orgánica (sway) y respuesta reactiva a acciones
  useFrame(({ camera, pointer, clock }, delta) => {
    if (!toolGroupRef.current) return;

    if (selectedTool === 'ninguna') {
      toolGroupRef.current.visible = false;
      return;
    }
    toolGroupRef.current.visible = true;

    const t = clock.elapsedTime;

    // Sway de respiración y movimiento armónico con el puntero
    const swayX = Math.sin(t * 1.8) * 0.012 + pointer.x * 0.035;
    const swayY = Math.cos(t * 2.2) * 0.014 - pointer.y * 0.028;
    const swayZ = Math.sin(t * 1.4) * 0.009;

    let actionOffsetX = 0;
    let actionOffsetY = 0;
    let actionOffsetZ = 0;
    let actionRotX = 0;
    let actionRotY = 0;
    let actionRotZ = 0;

    // Feedback táctil activo cuando el asador pincha, recoge brasas o cepilla
    if (isActing.current) {
      actionProgress.current += delta * 5.2;
      if (actionProgress.current >= 1.0) {
        actionProgress.current = 1.0;
        isActing.current = false;
      }

      const pulse = Math.sin(actionProgress.current * Math.PI);

      switch (selectedTool) {
        case 'tenedor':
          actionOffsetZ = -0.18 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotX = -0.32 * pulse;
          actionRotZ = 0.5 * pulse;
          break;
        case 'pala':
          actionOffsetY = -0.11 * pulse;
          actionOffsetZ = -0.14 * pulse;
          actionRotX = 0.38 * pulse;
          break;
        case 'atizador':
          actionOffsetX = -0.15 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotY = 0.48 * pulse;
          break;
        case 'cepillo': {
          const scrubCycle = Math.sin(actionProgress.current * Math.PI * 4);
          actionOffsetZ = -0.14 * pulse + scrubCycle * 0.035;
          actionOffsetY = -0.04 * pulse;
          actionRotX = 0.28 * pulse;
          break;
        }
        default:
          break;
      }
    }

    // Posición visible en primera persona en la esquina inferior derecha
    const baseOffset = new Vector3(
      0.18 + swayX + actionOffsetX,
      -0.12 + swayY + actionOffsetY,
      -0.36 + swayZ + actionOffsetZ
    );

    targetPos.current.copy(baseOffset);
    targetPos.current.applyMatrix4(camera.matrixWorld);

    currentPos.current.lerp(targetPos.current, MathUtils.clamp(delta * 14, 0.1, 0.9));
    toolGroupRef.current.position.copy(currentPos.current);

    eulerAux.current.set(
      camera.rotation.x + actionRotX + Math.sin(t * 1.5) * 0.015,
      camera.rotation.y + actionRotY + Math.cos(t * 1.3) * 0.015,
      camera.rotation.z + actionRotZ,
      camera.rotation.order
    );
    targetRot.current.setFromEuler(eulerAux.current);

    toolGroupRef.current.quaternion.slerp(targetRot.current, MathUtils.clamp(delta * 16, 0.1, 0.95));
  });

  return (
    <group ref={toolGroupRef}>
      {selectedTool === 'tenedor' && <TenedorModel />}

      {selectedTool === 'pala' && (
        <group rotation={[-0.82, -0.2, 0.22]}>
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

          {/* Brasa incandescente carbon.glb anclada EXACTAMENTE adentro de la cuchara de la pala (x = 0) */}
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
        <group rotation={[-0.82, -0.2, 0.22]}>
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
