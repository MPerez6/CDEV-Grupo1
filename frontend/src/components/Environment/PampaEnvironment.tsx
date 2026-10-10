import React from 'react';
import { Sky } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export const PampaEnvironment: React.FC = () => {
  // Postes de quebracho rústicos para el alambrado pampeano
  const fencePosts = [-6, -4, -2, 0, 2, 4, 6];
  // Alturas de los 5 hilos de alambre galvanizado tradicional
  const wireHeights = [0.25, 0.5, 0.75, 1.0, 1.25];

  return (
    <group>
      {/* Cielo pampeano de atardecer dorado */}
      <Sky
        sunPosition={[35, 10, -50]}
        turbidity={8}
        rayleigh={2.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* Luz solar dorada de la pampa */}
      <directionalLight
        position={[25, 20, 15]}
        intensity={1.8}
        color="#ffb35e"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Luz ambiental cálida reflejada de la tierra y el horizonte */}
      <ambientLight intensity={0.55} color="#ffe5cc" />
      <directionalLight position={[-20, 10, -20]} intensity={0.4} color="#7f8ea6" />

      {/* Plano de suelo pampeano con pasto de llanura y física fija */}
      <RigidBody type="fixed" friction={1.0}>
        <mesh
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[140, 140]} />
          <meshStandardMaterial
            color="#485324"
            roughness={0.92}
            metalness={0.05}
          />
        </mesh>
      </RigidBody>

      {/* Área terrosa/quemada bajo y alrededor de la parrilla */}
      <mesh
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[3.2, 32]} />
        <meshStandardMaterial
          color="#2a221b"
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>

      {/* Pared rústica pampeana de ladrillo / quincho de fondo */}
      <group position={[0, 1.2, -4.2]}>
        {/* Muro bajo rústico de ladrillo visto / adobe */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 2.4, 0.4]} />
          <meshStandardMaterial
            color="#7a4228"
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Remate superior de viga o chapa rústica */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[14.4, 0.12, 0.55]} />
          <meshStandardMaterial
            color="#3b2318"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* Alambrado pampeano tradicional de 5 hilos con postes de quebracho */}
      <group position={[0, 0, -3.8]}>
        {/* Postes verticales de quebracho */}
        {fencePosts.map((posX, i) => (
          <mesh
            key={`post-${i}`}
            position={[posX, 0.75, 0]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.07, 0.09, 1.5, 8]} />
            <meshStandardMaterial
              color="#2d1c12"
              roughness={0.88}
              metalness={0.05}
            />
          </mesh>
        ))}

        {/* 5 hilos de alambre pampeano galvanizado */}
        {wireHeights.map((posY, i) => (
          <mesh
            key={`wire-${i}`}
            position={[0, posY, 0.05]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.003, 0.003, 13, 6]} />
            <meshStandardMaterial
              color="#999999"
              metalness={0.9}
              roughness={0.25}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
