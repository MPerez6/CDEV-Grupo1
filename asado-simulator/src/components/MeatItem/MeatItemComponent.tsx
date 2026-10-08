import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, Color } from 'three';
import { calculateHeatTransfer } from '../FireSystem/Embers';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';

// Custom shader material for Maillard reaction (from red to brown to black)
const MaillardMaterial = {
  uniforms: {
    uCookLevel: { value: 0.0 },
    uRawColor: { value: new Color('#a32a2a') },
    uCookedColor: { value: new Color('#5c3a21') },
    uBurntColor: { value: new Color('#1c1714') },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uCookLevel;
    uniform vec3 uRawColor;
    uniform vec3 uCookedColor;
    uniform vec3 uBurntColor;
    varying vec2 vUv;

    void main() {
      vec3 color;
      if (uCookLevel < 1.0) {
        color = mix(uRawColor, uCookedColor, uCookLevel);
      } else {
        color = mix(uCookedColor, uBurntColor, clamp(uCookLevel - 1.0, 0.0, 1.0));
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

interface Props {
  meat: MeatItem;
}

export const MeatItemComponent: React.FC<Props> = ({ meat }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  
  const embersPos = useAsadoStore(state => state.embersPos);
  const updateCookLevel = useAsadoStore(state => state.updateCookLevel);
  const flipMeat = useAsadoStore(state => state.flipMeat);

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Calculate heat based on distance to embers
    const heat = calculateHeatTransfer(meat.position, embersPos);
    
    // Increment cook level based on heat (scaled down for simulation speed)
    const heatMultiplier = 0.0001; 
    updateCookLevel(meat.id, heat * heatMultiplier * delta);
    
    // Update shader uniform
    materialRef.current.uniforms.uCookLevel.value = meat.cookLevel;
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    flipMeat(meat.id);
  };

  return (
    <mesh 
      ref={meshRef} 
      position={meat.position} 
      rotation={[meat.flipped ? Math.PI : 0, 0, 0]}
      onClick={handleClick}
    >
      <boxGeometry args={[1, 0.2, 0.6]} />
      <shaderMaterial 
        ref={materialRef}
        attach="material"
        args={[MaillardMaterial]}
      />
    </mesh>
  );
};
