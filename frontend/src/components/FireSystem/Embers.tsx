import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useAsadoStore, EmberData } from '../../store/useAsadoStore';
import { GlowingEmberModel } from '../Common/GlowingEmberModel';
import { MODEL_REGISTRY } from '../../config/modelRegistry';

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
      <GlowingEmberModel
        url={MODEL_REGISTRY.CARBON.url}
        targetSize={0.08}
        burnProgress={ember.temperature}
        pulsePhase={pulsePhase}
        scale={emberScale}
        castShadow
        receiveShadow
      />
      {/* Luz puntual localizada en las brasas más calientes */}
      {ember.temperature > 0.4 && (
        <pointLight
          position={[0, 0.035, 0]}
          color="#ff3e00"
          intensity={0.45 * ember.temperature}
          distance={0.65}
          decay={2}
        />
      )}
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

  return (
    <group name="grill-embers-group">
      {embers.map((ember, i) => (
        <SingleEmber key={ember.id} ember={ember} index={i} />
      ))}
    </group>
  );
};
