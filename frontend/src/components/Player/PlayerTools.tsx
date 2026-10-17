import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Quaternion, Euler, MathUtils } from 'three';
import { useAsadoStore } from '../../store/useAsadoStore';
import { GlowingEmberModel } from '../Common/GlowingEmberModel';
import { MODEL_REGISTRY } from '../../config/modelRegistry';

const CARBON_URL = MODEL_REGISTRY.CARBON.url;

// Configuración de clúster de brasas incandescentes dispuestas con precisión dentro de la cuchara de la pala
const SHOVEL_EMBERS = [
  { position: [0.0, 0.44, 0.012] as [number, number, number], rotation: [0.25, 0.4, -0.3] as [number, number, number], size: 0.046, phase: 0.0 },
  { position: [-0.035, 0.45, -0.012] as [number, number, number], rotation: [-0.6, 1.3, 0.2] as [number, number, number], size: 0.042, phase: 0.9 },
  { position: [0.034, 0.448, -0.010] as [number, number, number], rotation: [1.1, -0.7, 0.4] as [number, number, number], size: 0.044, phase: 1.8 },
  { position: [-0.024, 0.46, 0.022] as [number, number, number], rotation: [0.5, 2.1, -0.8] as [number, number, number], size: 0.038, phase: 2.7 },
  { position: [0.026, 0.462, 0.018] as [number, number, number], rotation: [-0.8, 0.6, 1.4] as [number, number, number], size: 0.040, phase: 3.6 },
  { position: [0.002, 0.478, 0.006] as [number, number, number], rotation: [0.9, -1.1, 0.7] as [number, number, number], size: 0.048, phase: 4.5 },
];

// Modelo de tenedor parrillero criollo de alta definición: varilla de acero forjado bruñido y unión sólida 100% visible
export const TenedorModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.92, -0.22, 0.18]} scale={[0.52, 0.52, 0.52]}>
    {/* Mango ergonómico de quebracho colorado lustrado */}
    <mesh position={[0, -0.16, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.022, 0.025, 0.32, 16]} />
      <meshStandardMaterial color="#4a2614" roughness={0.62} metalness={0.08} />
    </mesh>

    {/* Virola y remates de latón dorado criollo */}
    <mesh position={[0, 0.008, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.032, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.28} metalness={0.88} />
    </mesh>
    <mesh position={[0, -0.32, 0]} castShadow>
      <sphereGeometry args={[0.024, 12, 12]} />
      <meshStandardMaterial color="#3a1c0d" roughness={0.7} />
    </mesh>

    {/* Varilla sólida de acero forjado reflectante (visible, nítida y unida sin roturas visuales) */}
    <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.013, 0.013, 0.42, 14]} />
      <meshStandardMaterial color="#949ca4" roughness={0.25} metalness={0.92} />
    </mesh>

    {/* Cabezal de bifurcación de forja */}
    <mesh position={[0, 0.44, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 0.12, 12]} />
      <meshStandardMaterial color="#889098" roughness={0.28} metalness={0.92} />
    </mesh>

    {/* Púa izquierda cónica de acero templado parrillero */}
    <mesh position={[-0.048, 0.54, 0]} castShadow>
      <coneGeometry args={[0.01, 0.20, 10]} />
      <meshStandardMaterial color="#b0b8c0" roughness={0.2} metalness={0.95} />
    </mesh>

    {/* Púa derecha cónica de acero templado parrillero */}
    <mesh position={[0.048, 0.54, 0]} castShadow>
      <coneGeometry args={[0.01, 0.20, 10]} />
      <meshStandardMaterial color="#b0b8c0" roughness={0.2} metalness={0.95} />
    </mesh>
  </group>
);

// Modelo procedural robusto de pala criolla de forja con concavidad calibrada para transporte de carbón
export const PalaModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.92, -0.22, 0.18]} scale={[0.52, 0.52, 0.52]}>
    {/* Mango de madera de quebracho */}
    <mesh position={[0, -0.16, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.022, 0.025, 0.32, 16]} />
      <meshStandardMaterial color="#4a2614" roughness={0.62} metalness={0.08} />
    </mesh>

    {/* Virola de latón */}
    <mesh position={[0, 0.008, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.032, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.28} metalness={0.88} />
    </mesh>

    {/* Varilla de acero forjado */}
    <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.013, 0.013, 0.42, 14]} />
      <meshStandardMaterial color="#949ca4" roughness={0.25} metalness={0.92} />
    </mesh>

    {/* Cuchara de la pala con concavidad para recoger y asentar brasas */}
    <group position={[0, 0.47, 0.018]} rotation={[-0.14, 0, 0]}>
      {/* Fondo de la cuchara */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.18, 0.01]} />
        <meshStandardMaterial color="#2d3033" roughness={0.45} metalness={0.85} />
      </mesh>
      {/* Reborde izquierdo */}
      <mesh position={[-0.09, 0, 0.015]} rotation={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.01, 0.18, 0.03]} />
        <meshStandardMaterial color="#25282a" roughness={0.45} metalness={0.85} />
      </mesh>
      {/* Reborde derecho */}
      <mesh position={[0.09, 0, 0.015]} rotation={[0, -0.35, 0]} castShadow>
        <boxGeometry args={[0.01, 0.18, 0.03]} />
        <meshStandardMaterial color="#25282a" roughness={0.45} metalness={0.85} />
      </mesh>
      {/* Reborde posterior */}
      <mesh position={[0, -0.09, 0.015]} rotation={[-0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.01, 0.03]} />
        <meshStandardMaterial color="#25282a" roughness={0.45} metalness={0.85} />
      </mesh>
    </group>
  </group>
);

// Modelo procedural de atizador criollo con gancho en ángulo recto para empujar y nivelar brasas
export const AtizadorModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.92, -0.22, 0.18]} scale={[0.52, 0.52, 0.52]}>
    <mesh position={[0, -0.16, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.022, 0.025, 0.32, 16]} />
      <meshStandardMaterial color="#4a2614" roughness={0.62} metalness={0.08} />
    </mesh>
    <mesh position={[0, 0.008, 0]} castShadow>
      <cylinderGeometry args={[0.024, 0.024, 0.032, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.28} metalness={0.88} />
    </mesh>
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.013, 0.013, 0.46, 14]} />
      <meshStandardMaterial color="#949ca4" roughness={0.25} metalness={0.92} />
    </mesh>
    {/* Gancho en L forjado en ángulo recto */}
    <mesh position={[0.05, 0.48, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.013, 0.013, 0.11, 12]} />
      <meshStandardMaterial color="#889098" roughness={0.3} metalness={0.92} />
    </mesh>
  </group>
);

// Modelo procedural de cepillo parrillero con cerdas de latón tupidas
export const CepilloModel: React.FC = () => (
  <group position={[0, 0, 0]} rotation={[-0.92, -0.22, 0.18]} scale={[0.52, 0.52, 0.52]}>
    <mesh position={[0, -0.14, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.34, 14]} />
      <meshStandardMaterial color="#553018" roughness={0.72} metalness={0.08} />
    </mesh>
    {/* Bloque cabezal de madera dura */}
    <mesh position={[0, 0.16, 0]} castShadow>
      <boxGeometry args={[0.08, 0.22, 0.045]} />
      <meshStandardMaterial color="#3e2210" roughness={0.7} metalness={0.1} />
    </mesh>
    {/* Bloque de cerdas metálicas de latón para raspar óxido */}
    <mesh position={[0, 0.16, 0.035]} castShadow>
      <boxGeometry args={[0.075, 0.20, 0.028]} />
      <meshStandardMaterial color="#c29c50" roughness={0.45} metalness={0.85} />
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

  // Atajos de teclado ágiles
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

  const currentPos = useRef(new Vector3(0.19, -0.13, -0.38));
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

  // Animaciones continuas vivas y dinámicas en 60 FPS: oscilación en ocho, respiración rústica y feedback al operar
  useFrame(({ camera, pointer, clock }, delta) => {
    if (!toolGroupRef.current) return;

    if (selectedTool === 'ninguna') {
      toolGroupRef.current.visible = false;
      return;
    }
    toolGroupRef.current.visible = true;

    const t = clock.elapsedTime;

    // Oscilación continua de respiración (sway en 8) bien perceptible
    const swayX = Math.sin(t * 1.6) * 0.024 + pointer.x * 0.038;
    const swayY = Math.cos(t * 2.1) * 0.020 - pointer.y * 0.030;
    const swayZ = Math.sin(t * 1.3) * 0.015;

    // Bobbing angular de la muñeca del asador
    const bobRotX = Math.sin(t * 1.6) * 0.045;
    const bobRotY = Math.cos(t * 1.4) * 0.040;
    const bobRotZ = Math.sin(t * 1.5) * 0.030;

    let actionOffsetX = 0;
    let actionOffsetY = 0;
    let actionOffsetZ = 0;
    let actionRotX = 0;
    let actionRotY = 0;
    let actionRotZ = 0;

    // Animación interactiva contundente al accionar cada utensilio
    if (isActing.current) {
      actionProgress.current += delta * 6.5;
      if (actionProgress.current >= 1.0) {
        actionProgress.current = 1.0;
        isActing.current = false;
      }

      const pulse = Math.sin(actionProgress.current * Math.PI);

      switch (selectedTool) {
        case 'tenedor':
          // Estocada hacia adelante al pinchar o dar vuelta la carne
          actionOffsetZ = -0.18 * pulse;
          actionOffsetY = -0.04 * pulse;
          actionRotX = -0.36 * pulse;
          actionRotZ = 0.32 * pulse;
          break;
        case 'pala':
          // Movimiento de palear y alzar brasas con pulso firme
          actionOffsetY = -0.12 * pulse;
          actionOffsetZ = -0.15 * pulse;
          actionRotX = 0.42 * pulse;
          break;
        case 'atizador':
          // Barrido lateral enérgico para esparcir brasas bajo la parrilla
          actionOffsetX = -0.18 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotY = 0.48 * pulse;
          break;
        case 'cepillo': {
          // Vaivén rápido de fregado criollo sobre las varillas
          const scrubCycle = Math.sin(actionProgress.current * Math.PI * 4);
          actionOffsetZ = -0.14 * pulse + scrubCycle * 0.04;
          actionOffsetY = -0.04 * pulse;
          actionRotX = 0.32 * pulse;
          break;
        }
        default:
          break;
      }
    }

    // Posición en primera persona: cuadrante inferior derecho despejado
    const baseOffset = new Vector3(
      0.19 + swayX + actionOffsetX,
      -0.13 + swayY + actionOffsetY,
      -0.38 + swayZ + actionOffsetZ
    );

    targetPos.current.copy(baseOffset);
    targetPos.current.applyMatrix4(camera.matrixWorld);

    currentPos.current.lerp(targetPos.current, MathUtils.clamp(delta * 15, 0.1, 0.9));
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
        <group>
          <PalaModel />

          {/* Clúster de brasas incandescentes 3D sobre la pala: reaparece cuando carriedEmbersCount > 0 y se limpia inmediatamente al llegar a 0 */}
          {carriedEmbersCount > 0 && (
            <group rotation={[-0.92, -0.22, 0.18]} scale={[0.52, 0.52, 0.52]}>
              {SHOVEL_EMBERS.slice(0, Math.min(carriedEmbersCount, SHOVEL_EMBERS.length)).map((cfg, idx) => (
                <group
                  key={`shovel-ember-${idx}`}
                  position={cfg.position}
                  rotation={cfg.rotation}
                >
                  <GlowingEmberModel
                    url={CARBON_URL}
                    targetSize={cfg.size}
                    burnProgress={0.92}
                    pulsePhase={cfg.phase}
                    castShadow={false}
                    receiveShadow={false}
                  />
                </group>
              ))}
              <pointLight
                position={[0, 0.46, 0.04]}
                color="#ff5500"
                intensity={1.8}
                distance={1.4}
                decay={2}
              />
            </group>
          )}
        </group>
      )}

      {selectedTool === 'atizador' && <AtizadorModel />}

      {selectedTool === 'cepillo' && <CepilloModel />}
    </group>
  );
};
