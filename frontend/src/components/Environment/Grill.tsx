import React from 'react';

export const Grill: React.FC = () => {
  const numBars = 15;
  const barSpacing = 0.3;
  const width = (numBars - 1) * barSpacing;
  
  return (
    <group position={[0, 0.3, 0]}>
      {/* Grilla principal */}
      {Array.from({ length: numBars }).map((_, i) => (
        <mesh key={i} position={[-(width / 2) + i * barSpacing, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4]} />
          <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Soportes laterales */}
      <mesh position={[-(width / 2) - 0.1, -0.15, 0]}>
         <boxGeometry args={[0.05, 0.3, 4]} />
         <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[(width / 2) + 0.1, -0.15, 0]}>
         <boxGeometry args={[0.05, 0.3, 4]} />
         <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};
