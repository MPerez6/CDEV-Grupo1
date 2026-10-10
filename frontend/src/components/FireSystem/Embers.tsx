import React, { useMemo, useRef, useEffect } from 'react';
import { InstancedMesh, Object3D, Color, DodecahedronGeometry, MeshStandardMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { useAsadoStore, EmberData } from '../../store/useAsadoStore';

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

// Colores de referencia para la incandescencia del fuego
const hotColor = new Color('#ffcc22');   // Al rojo blanco/amarillento
const warmColor = new Color('#ff4500');  // Naranja brasa viva
const lowColor = new Color('#8b1a00');   // Rojo oscuro apagándose
const ashColor = new Color('#242120');   // Ceniza fría

export const Embers: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const embers = useAsadoStore(state => state.embers);
  const decayThermalSystem = useAsadoStore(state => state.decayThermalSystem);

  const geometry = useMemo(() => new DodecahedronGeometry(1, 0), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.7,
        metalness: 0.1,
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const dummy = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);

  // Fases aleatorias estables para dar pulsación orgánica independiente a cada brasa
  const heatPhases = useMemo(() => {
    return embers.map(() => Math.random() * Math.PI * 2);
  }, [embers.length]);

  // Asegura la inicialización de count al montar o cambiar el tamaño de la lista
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.count = embers.length;
    }
  }, [embers.length]);

  useFrame((state, delta) => {
    if (!meshRef.current || embers.length === 0) return;

    // Decaimiento natural del fuego con el transcurso de los segundos
    decayThermalSystem(delta);

    const time = state.clock.elapsedTime;
    meshRef.current.count = embers.length;

    for (let i = 0; i < embers.length; i++) {
      const ember = embers[i];
      if (!ember) continue;

      const phase = heatPhases[i] ?? 0;
      const t = Math.max(0, Math.min(1, ember.temperature));

      // Posicionamiento de la brasa bajo la parrilla
      dummy.position.set(ember.position[0], ember.position[1], ember.position[2]);

      // Pulsación térmica orgánica según la temperatura viva
      const pulse = t > 0.05 ? Math.sin(time * 3.5 + phase) * 0.015 * t : 0;
      const baseScale = t > 0.05 ? 0.08 * (0.6 + 0.4 * t) : 0.035; // Ceniza compacta al enfriarse
      dummy.scale.setScalar(Math.max(0.02, baseScale + pulse));

      // Rotación orgánica
      dummy.rotation.set(phase, phase * 0.5, phase * 1.5);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Color dinámico según la temperatura de la brasa viva
      if (t > 0.7) {
        // Al rojo vivo incandescente (amarillento a naranja fuego)
        const factor = (t - 0.7) / 0.3;
        tempColor.copy(warmColor).lerp(hotColor, factor);
      } else if (t > 0.25) {
        // Naranja vivo a rojo oscuro
        const factor = (t - 0.25) / 0.45;
        tempColor.copy(lowColor).lerp(warmColor, factor);
      } else {
        // Rojo apagándose a ceniza gris
        const factor = t / 0.25;
        tempColor.copy(ashColor).lerp(lowColor, factor);
      }

      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      key={embers.length}
      args={[geometry, material, embers.length]}
    />
  );
};
