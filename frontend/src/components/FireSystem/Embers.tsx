import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useAsadoStore, EmberData } from '../../store/useAsadoStore';
import { GlowingEmberModel } from '../Common/GlowingEmberModel';

// Función auxiliar para calcular transferencia de calor térmico usando la ley de inverso del cuadrado
export const calculateHeatTransfer = (
  targetPosition: [number, number, number] | [number, number],
  embers: ([number, number, number] | EmberData)[]
): number => {
  let totalHeat = 0;
  const targetX = targetPosition[0];
  const targetY = targetPosition.length >= 3 ? targetPosition[1] : 0.3;
  const targetZ = (targetPosition.length >= 3 ? targetPosition[2] : targetPosition[1]) ?? 0;

  for (const ember of embers) {
    const pos = Array.isArray(ember) ? ember : ember.position;
    const temp = Array.isArray(ember) ? 1.0 : ember.temperature;
    if (temp <= 0.001) continue;

    const dx = targetX - pos[0];
    const dy = targetY - pos[1];
    const dz = targetZ - pos[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    totalHeat += temp / (distanceSq + 0.1);
  }
  return totalHeat;
};

interface SingleEmberProps {
  ember: EmberData;
  index: number;
}

const SingleEmber: React.FC<SingleEmberProps> = ({ ember, index }) => {
  const pulsePhase = (index * 1.37) % (Math.PI * 2);

  // Escala orgánica según temperatura y degradación
  const emberScale = Math.max(0.65, 0.75 + ember.temperature * 0.35);

  return (
    <group position={ember.position}>
      {/* Brasa procedural de quebracho sin pointLight individual ni sombras GPU pesadas */}
      <GlowingEmberModel
        procedural={true}
        seed={index}
        targetSize={0.08}
        burnProgress={ember.temperature}
        pulsePhase={pulsePhase}
        scale={emberScale}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
};

export const Embers: React.FC = () => {
  const embers = useAsadoStore((state) => state.embers);
  const decayThermalSystem = useAsadoStore((state) => state.decayThermalSystem);

  // Decaimiento del calor y refresco de la grilla térmica
  useFrame((_, delta) => {
    decayThermalSystem(delta);
  });

  if (embers.length === 0) {
    return null;
  }

  // Luz puntual consolidada única para todas las brasas, evitando N pointLights dinámicas
  const totalTemp = embers.reduce((acc, e) => acc + (e.temperature || 0), 0);
  const consolidatedIntensity = Math.min(2.0, totalTemp * 0.25);

  return (
    <group name="grill-embers-group">
      {consolidatedIntensity > 0.01 && (
        <pointLight
          position={[0, 0.08, 0]}
          color="#ff4500"
          intensity={consolidatedIntensity}
          distance={1.8}
          decay={2}
        />
      )}
      {embers.map((ember, i) => (
        <SingleEmber key={ember.id} ember={ember} index={i} />
      ))}
    </group>
  );
};
