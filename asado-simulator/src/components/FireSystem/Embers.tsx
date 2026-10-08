import React, { useMemo, useEffect, useRef } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { useAsadoStore } from '../../store/useAsadoStore';

// Helper function to calculate heat transfer using inverse-square law
export const calculateHeatTransfer = (targetPosition: [number, number, number], embers: [number, number, number][]): number => {
  let totalHeat = 0;
  for (const ember of embers) {
    const dx = targetPosition[0] - ember[0];
    const dy = targetPosition[1] - ember[1];
    const dz = targetPosition[2] - ember[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    // adding a small constant to prevent division by zero
    totalHeat += 1 / (distanceSq + 0.1); 
  }
  return totalHeat;
};

export const Embers: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const setEmbersPos = useAsadoStore(state => state.setEmbersPos);
  const embersCount = 100;
  const dummy = useMemo(() => new Object3D(), []);
  
  const embersData = useMemo(() => {
    const data: { position: [number, number, number], color: Color, heatPhase: number }[] = [];
    for (let i = 0; i < embersCount; i++) {
      data.push({
        position: [
          (Math.random() - 0.5) * 4,
          0,
          (Math.random() - 0.5) * 4
        ],
        color: new Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.4 + Math.random() * 0.2),
        heatPhase: Math.random() * Math.PI * 2
      });
    }
    return data;
  }, []);

  useEffect(() => {
    setEmbersPos(embersData.map(e => e.position));
  }, [embersData, setEmbersPos]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    embersData.forEach((ember, i) => {
      dummy.position.set(...ember.position);
      // Optional: add some slight pulsating animation to scale or rotation
      dummy.scale.setScalar(0.1 + Math.sin(state.clock.elapsedTime * 2 + ember.heatPhase) * 0.02);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      // We could also update colors here to make them pulse, but instanceColor is easier to set statically or via custom shader.
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, embersCount]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ff4400" emissive="#ff3300" emissiveIntensity={2} toneMapped={false} />
    </instancedMesh>
  );
};
