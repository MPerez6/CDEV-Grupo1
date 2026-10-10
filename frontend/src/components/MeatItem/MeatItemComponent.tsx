import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, Color, MathUtils } from 'three';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';

// Vertex shader para el corte de carne sobre la parrilla
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader: simulación de la reacción de Maillard
// Transiciona de carne cruda (rojo sangre) a cocido parrillero (dorado tostado) y a quemado (carbón)
const fragmentShader = `
  uniform float uCookLevel;
  uniform vec3 uRawColor;
  uniform vec3 uCookedColor;
  uniform vec3 uBurntColor;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 baseColor;
    if (uCookLevel < 1.0) {
      // De crudo (0.0) a cocido a punto (1.0)
      baseColor = mix(uRawColor, uCookedColor, clamp(uCookLevel, 0.0, 1.0));
    } else {
      // De cocido a punto (1.0) a arrebatado/quemado (2.0)
      baseColor = mix(uCookedColor, uBurntColor, clamp(uCookLevel - 1.0, 0.0, 1.0));
    }

    // Sombreado difuso para dar volumen realista al corte
    vec3 lightDir = normalize(vec3(1.0, 2.5, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.35);

    gl_FragColor = vec4(baseColor * diff, 1.0);
  }
`;

interface Props {
  meat: MeatItem;
}

export const MeatItemComponent: React.FC<Props> = ({ meat }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const getHeatAtPosition = useAsadoStore(state => state.getHeatAtPosition);
  const updateCookLevel = useAsadoStore(state => state.updateCookLevel);
  const flipMeat = useAsadoStore(state => state.flipMeat);

  // Uniformes independientes por corte
  const uniforms = useMemo(() => ({
    uCookLevel: { value: meat.cookLevel },
    uRawColor: { value: new Color('#9e2a2b') },
    uCookedColor: { value: new Color('#52321c') },
    uBurntColor: { value: new Color('#151110') },
  }), []);

  // Animación suave de giro y progreso térmico continuo
  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    // Consulta el calor térmico en su posición X/Z sobre la parrilla
    const heat = getHeatAtPosition(meat.position[0], meat.position[2]);

    // Multiplicador térmico para regular la progresión de la cocción
    const heatMultiplier = 0.005;
    const cookDelta = heat * heatMultiplier * delta;

    if (cookDelta > 0 && meat.cookLevel < 2) {
      updateCookLevel(meat.id, cookDelta);
    }

    // Actualiza el nivel térmico en el shader de Maillard
    if (materialRef.current && materialRef.current.uniforms && materialRef.current.uniforms.uCookLevel) {
      materialRef.current.uniforms.uCookLevel.value = meat.cookLevel;
    }

    // Transición suave de rotación al voltear el corte
    const targetRotX = meat.flipped ? Math.PI : 0;
    meshRef.current.rotation.x = MathUtils.lerp(
      meshRef.current.rotation.x,
      targetRotX,
      Math.min(1, delta * 10)
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={meat.position}
      onClick={(e) => {
        e.stopPropagation();
        // Voltea el corte con clic parrillero
        flipMeat(meat.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.9, 0.18, 0.55]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};
