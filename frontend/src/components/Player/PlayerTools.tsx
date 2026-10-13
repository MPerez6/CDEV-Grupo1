import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Quaternion, Euler, MathUtils } from 'three';
import { useAsadoStore, AsadoTool } from '../../store/useAsadoStore';

// Modelo procedural de tenedor parrillero criollo de dos puntas de hierro forjado
export const TenedorModel: React.FC = () => (
  <group rotation={[0.4, 0.08, -0.1]} scale={[0.5, 0.5, 0.5]}>
    {/* Mango de madera de quebracho lustrada */}
    <mesh position={[0, -0.32, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.35, 16]} />
      <meshStandardMaterial color="#4d2c18" roughness={0.65} metalness={0.1} />
    </mesh>

    {/* Virola de latón / bronce parrillero */}
    <mesh position={[0, -0.13, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
      <meshStandardMaterial color="#b38f4d" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla larga de hierro */}
    <mesh position={[0, 0.24, 0]} castShadow>
      <cylinderGeometry args={[0.008, 0.008, 0.72, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Base bifurcada horizontal del tenedor */}
    <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Púa izquierda afilada */}
    <mesh position={[-0.04, 0.72, 0]} castShadow>
      <coneGeometry args={[0.007, 0.24, 8]} />
      <meshStandardMaterial color="#353535" roughness={0.3} metalness={0.9} />
    </mesh>

    {/* Púa derecha afilada */}
    <mesh position={[0.04, 0.72, 0]} castShadow>
      <coneGeometry args={[0.007, 0.24, 8]} />
      <meshStandardMaterial color="#353535" roughness={0.3} metalness={0.9} />
    </mesh>
  </group>
);

// Modelo procedural de pala parrillera con chapa para brasas
export const PalaModel: React.FC<{ carriedEmbers?: number }> = ({ carriedEmbers = 0 }) => (
  <group rotation={[0.4, 0.08, -0.1]} scale={[0.5, 0.5, 0.5]}>
    {/* Mango de madera */}
    <mesh position={[0, -0.32, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.35, 16]} />
      <meshStandardMaterial color="#4d2c18" roughness={0.65} metalness={0.1} />
    </mesh>

    {/* Virola */}
    <mesh position={[0, -0.13, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla larga de hierro */}
    <mesh position={[0, 0.26, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.76, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Chapa contenedora de la pala */}
    <group position={[0, 0.7, 0.02]} rotation={[-0.22, 0, 0]}>
      {/* Fondo de la pala */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.24, 0.008]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Reborde trasero */}
      <mesh position={[0, -0.12, 0.02]} castShadow>
        <boxGeometry args={[0.2, 0.008, 0.04]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Reborde izquierdo */}
      <mesh position={[-0.1, 0, 0.018]} castShadow>
        <boxGeometry args={[0.008, 0.24, 0.035]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Reborde derecho */}
      <mesh position={[0.1, 0, 0.018]} castShadow>
        <boxGeometry args={[0.008, 0.24, 0.035]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Brasas incandescentes visibles sobre la pala si se cargaron */}
      {carriedEmbers > 0 && (
        <group position={[0, 0, 0.025]}>
          <pointLight color="#ff4400" intensity={1.4} distance={1.0} />
          {Array.from({ length: Math.min(carriedEmbers, 5) }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (i % 3 - 1) * 0.045 + (i * 0.008),
                (i > 2 ? 0.035 : -0.035),
                0.015
              ]}
            >
              <dodecahedronGeometry args={[0.018, 0]} />
              <meshStandardMaterial
                color="#ff2200"
                emissive="#ff5500"
                emissiveIntensity={1.3}
                roughness={0.8}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  </group>
);

// Modelo procedural de atizador criollo en 'L'
export const AtizadorModel: React.FC = () => (
  <group rotation={[0.4, 0.08, -0.1]} scale={[0.5, 0.5, 0.5]}>
    {/* Mango de madera */}
    <mesh position={[0, -0.32, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.024, 0.35, 16]} />
      <meshStandardMaterial color="#4d2c18" roughness={0.65} metalness={0.1} />
    </mesh>

    {/* Argolla trasera para colgar */}
    <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.018, 0.004, 8, 16]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Virola */}
    <mesh position={[0, -0.13, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
    </mesh>

    {/* Varilla larga de hierro */}
    <mesh position={[0, 0.28, 0]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.82, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>

    {/* Gancho en 'L' para arrastrar y revolver brasas */}
    <mesh position={[0.055, 0.69, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
      <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.85} />
    </mesh>
  </group>
);

// Modelo procedural de cepillo parrillero de alambre para limpiar hierros
export const CepilloModel: React.FC = () => (
  <group rotation={[0.4, 0.08, -0.1]} scale={[0.5, 0.5, 0.5]}>
    {/* Mango largo de madera */}
    <mesh position={[0, -0.25, 0]} castShadow>
      <cylinderGeometry args={[0.016, 0.02, 0.4, 12]} />
      <meshStandardMaterial color="#553018" roughness={0.75} metalness={0.08} />
    </mesh>

    {/* Bloque de madera del cepillo */}
    <mesh position={[0, 0.06, 0]} castShadow>
      <boxGeometry args={[0.08, 0.22, 0.045]} />
      <meshStandardMaterial color="#3e2210" roughness={0.7} metalness={0.1} />
    </mesh>

    {/* Cerdas de alambre de bronce/acero */}
    <mesh position={[0, 0.06, 0.035]} castShadow>
      <boxGeometry args={[0.07, 0.2, 0.028]} />
      <meshStandardMaterial color="#c29c50" roughness={0.5} metalness={0.8} />
    </mesh>

    {/* Raspador metálico superior en el extremo */}
    <mesh position={[0, 0.18, 0.012]} castShadow>
      <boxGeometry args={[0.075, 0.02, 0.006]} />
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

  // Escucha de atajos de teclado para cambiar herramientas ágilmente
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

  const currentPos = useRef(new Vector3(0.28, -0.22, -0.55));
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

  // Animación en useFrame: Oscilación suave rústica (sway) + respuesta activa a clics
  useFrame(({ camera, pointer, clock }, delta) => {
    if (!toolGroupRef.current) return;

    if (selectedTool === 'ninguna') {
      toolGroupRef.current.visible = false;
      return;
    }
    toolGroupRef.current.visible = true;

    const t = clock.elapsedTime;

    // Balanceo natural de respiración y movimiento del cursor
    const swayX = Math.sin(t * 1.8) * 0.008 + pointer.x * 0.03;
    const swayY = Math.cos(t * 2.2) * 0.01 - pointer.y * 0.025;
    const swayZ = Math.sin(t * 1.4) * 0.006;

    let actionOffsetX = 0;
    let actionOffsetY = 0;
    let actionOffsetZ = 0;
    let actionRotX = 0;
    let actionRotY = 0;
    let actionRotZ = 0;

    // Animación de acción viva cuando el asador interactúa
    if (isActing.current) {
      actionProgress.current += delta * 4.5;
      if (actionProgress.current >= 1.0) {
        actionProgress.current = 1.0;
        isActing.current = false;
      }

      const pulse = Math.sin(actionProgress.current * Math.PI);

      switch (selectedTool) {
        case 'tenedor':
          // Estocada hacia adelante, descenso y giro para voltear
          actionOffsetZ = -0.16 * pulse;
          actionOffsetY = -0.05 * pulse;
          actionRotX = -0.3 * pulse;
          actionRotZ = 0.45 * pulse;
          break;
        case 'pala':
          // Inclinación hacia abajo para juntar brasas y levantada
          actionOffsetY = -0.1 * pulse;
          actionOffsetZ = -0.12 * pulse;
          actionRotX = 0.35 * pulse;
          break;
        case 'atizador':
          // Barrido lateral criollo para mover el carbón
          actionOffsetX = -0.12 * pulse;
          actionOffsetY = -0.04 * pulse;
          actionRotY = 0.4 * pulse;
          break;
        case 'cepillo': {
          // Vaivén rápido de raspado sobre los hierros
          const scrubCycle = Math.sin(actionProgress.current * Math.PI * 4);
          actionOffsetZ = -0.12 * pulse + scrubCycle * 0.03;
          actionOffsetY = -0.03 * pulse;
          actionRotX = 0.28 * pulse;
          break;
        }
        default:
          break;
      }
    }

    // Posicionamiento en el espacio relativo a la cámara
    const baseOffset = new Vector3(
      0.28 + swayX + actionOffsetX,
      -0.22 + swayY + actionOffsetY,
      -0.55 + swayZ + actionOffsetZ
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
    toolGroupRef.current.quaternion.slerp(targetRot.current, MathUtils.clamp(delta * 14, 0.1, 0.9));
  });

  const renderActiveTool = (tool: AsadoTool) => {
    switch (tool) {
      case 'tenedor':
        return <TenedorModel />;
      case 'pala':
        return <PalaModel carriedEmbers={carriedEmbersCount} />;
      case 'atizador':
        return <AtizadorModel />;
      case 'cepillo':
        return <CepilloModel />;
      default:
        return null;
    }
  };

  return (
    <group ref={toolGroupRef}>
      {renderActiveTool(selectedTool)}
    </group>
  );
};
