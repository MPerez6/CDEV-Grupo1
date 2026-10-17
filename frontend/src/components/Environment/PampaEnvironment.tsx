import React, { useMemo } from 'react';
import { Sky } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { Object3D } from 'three';
import { GLBModel } from '../Common/GLBModel';
import { SafeGLTF } from '../Common/SafeModelLoader';
import { MODEL_REGISTRY } from '../../config/modelRegistry';

// Leñera criolla con leños apilados
const WoodShed: React.FC = () => {
  const logRows = [
    { y: 0.08, count: 5, zOffset: -0.04 },
    { y: 0.16, count: 4, zOffset: 0.0 },
    { y: 0.24, count: 4, zOffset: -0.02 },
    { y: 0.32, count: 3, zOffset: 0.02 },
  ];

  return (
    <group position={[-1.35, 0, -0.45]}>
      {/* Nicho / cajón de quebracho */}
      <mesh position={[0, 0.25, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.5, 0.04]} />
        <meshStandardMaterial color="#3a2318" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh position={[-0.34, 0.25, 0]} castShadow>
        <boxGeometry args={[0.04, 0.5, 0.44]} />
        <meshStandardMaterial color="#3a2318" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh position={[0.34, 0.25, 0]} castShadow>
        <boxGeometry args={[0.04, 0.5, 0.44]} />
        <meshStandardMaterial color="#3a2318" roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Leños de quebracho apilados */}
      {logRows.map((row, rIdx) =>
        Array.from({ length: row.count }).map((_, cIdx) => {
          const spacing = 0.11;
          const x = (cIdx - (row.count - 1) / 2) * spacing;
          return (
            <mesh
              key={`log-${rIdx}-${cIdx}`}
              position={[x, row.y, row.zOffset]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.042, 0.046, 0.38, 9]} />
              <meshStandardMaterial
                color={rIdx % 2 === 0 ? '#4a291a' : '#3f2113'}
                roughness={0.92}
              />
            </mesh>
          );
        })
      )}
    </group>
  );
};

// Campana y chimenea parrillera de mampostería y hierro criollo
const ChimneyHood: React.FC = () => {
  return (
    <group position={[-0.1, 1.45, -0.15]}>
      {/* Viga dintel frontal de quebracho macizo */}
      <mesh position={[0, -0.05, 0.42]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#382115" roughness={0.85} metalness={0.08} />
      </mesh>

      {/* Campana piramidal de ladrillo refractario y revoque criollo */}
      <mesh position={[0, 0.35, 0.05]} castShadow receiveShadow>
        <coneGeometry args={[1.15, 0.8, 4]} />
        <meshStandardMaterial color="#5c3826" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Faldón perimetral de hierro negro */}
      <mesh position={[0, -0.05, 0.05]} castShadow>
        <boxGeometry args={[2.18, 0.06, 0.82]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.65} metalness={0.8} />
      </mesh>

      {/* Tiro de chimenea prismático hacia el cielo */}
      <mesh position={[0, 1.15, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 1.2, 0.48]} />
        <meshStandardMaterial color="#683d29" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Sombrerete superior de chimenea */}
      <mesh position={[0, 1.82, 0.05]} castShadow>
        <boxGeometry args={[0.62, 0.06, 0.62]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.6} metalness={0.85} />
      </mesh>
    </group>
  );
};

// InstancedMesh de postes de quebracho para el alambrado pampeano
const FencePostsInstanced: React.FC = () => {
  const postPositions = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
  const count = postPositions.length;

  const dummy = useMemo(() => new Object3D(), []);

  return (
    <instancedMesh
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
      onUpdate={(self) => {
        postPositions.forEach((posX, i) => {
          dummy.position.set(posX, 0.75, -3.8);
          dummy.rotation.set(0, (i * 0.4) % 0.2, (i % 2 === 0 ? 0.02 : -0.02));
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          self.setMatrixAt(i, dummy.matrix);
        });
        self.instanceMatrix.needsUpdate = true;
      }}
    >
      <cylinderGeometry args={[0.07, 0.09, 1.5, 8]} />
      <meshStandardMaterial color="#2d1c12" roughness={0.88} metalness={0.05} />
    </instancedMesh>
  );
};

// Mesada rústica de quebracho con tabla de corte, cuchillo y botella de vino
const PrepTable: React.FC = () => {
  const tableX = 0.98;
  const tableY = 0.35;
  const tableWidth = 0.62;
  const tableDepth = 0.72;
  const topThickness = 0.04;

  return (
    <group position={[tableX, 0, 0]}>
      {/* 4 Patas rústicas de quebracho */}
      {[-tableWidth / 2 + 0.04, tableWidth / 2 - 0.04].map((px, i) =>
        [-tableDepth / 2 + 0.04, tableDepth / 2 - 0.04].map((pz, j) => (
          <mesh key={`tbl-leg-${i}-${j}`} position={[px, tableY / 2, pz]} castShadow receiveShadow>
            <boxGeometry args={[0.055, tableY, 0.055]} />
            <meshStandardMaterial color="#352015" roughness={0.85} metalness={0.08} />
          </mesh>
        ))
      )}

      {/* Travesaños inferiores de refuerzo */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[tableWidth - 0.04, 0.025, tableDepth - 0.04]} />
        <meshStandardMaterial color="#321e13" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Tabla superior de quebracho macizo lustrado */}
      <mesh position={[0, tableY + topThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[tableWidth, topThickness, tableDepth]} />
        <meshStandardMaterial color="#4a2e1d" roughness={0.7} metalness={0.12} />
      </mesh>

      {/* Cuchillo parrillero criollo clavado en madera (cuchillo_en_madera.glb) */}
      <group position={[-0.04, tableY + topThickness + 0.01, 0.06]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.CUCHILLO_EN_MADERA.url}
          fallback={
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.22, 0.02, 0.3]} />
              <meshStandardMaterial color="#6a4228" roughness={0.8} />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.CUCHILLO_EN_MADERA.url}
              targetSize={0.44}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>

      {/* Botella de vino vieja y añeja (botella_de_vino_vieja.glb) */}
      <group position={[0.16, tableY + topThickness + 0.02, -0.16]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.BOTELLA_DE_VINO_VIEJA.url}
          fallback={
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.04, 0.32, 16]} />
              <meshStandardMaterial color="#1f3b23" roughness={0.2} metalness={0.1} />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.BOTELLA_DE_VINO_VIEJA.url}
              targetSize={0.35}
              rotation={[-Math.PI / 2, 0, 0]}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>
    </group>
  );
};

export const PampaEnvironment: React.FC = () => {
  // Alturas de los 5 hilos de alambre galvanizado tradicional pampeano
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

      {/* Pared rústica pampeana de ladrillo visto / quincho criollo de fondo */}
      <group position={[0, 1.2, -4.2]}>
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
      <group position={[0, 0, 0]}>
        <FencePostsInstanced />

        {/* 5 hilos de alambre galvanizado */}
        {wireHeights.map((posY, i) => (
          <mesh
            key={`wire-${i}`}
            position={[0, posY, -3.75]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.003, 0.003, 17, 6]} />
            <meshStandardMaterial
              color="#999999"
              metalness={0.9}
              roughness={0.25}
            />
          </mesh>
        ))}
      </group>

      {/* Vegetación pampeana en el horizonte usando modelos reales */}
      <group position={[-5.5, 0, -6.5]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.ARBOLES.url}
          fallback={
            <mesh position={[0, 2, 0]} castShadow>
              <coneGeometry args={[1.2, 4, 8]} />
              <meshStandardMaterial color="#2d4a1d" />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.ARBOLES.url}
              targetSize={5.5}
              castShadow
            />
          )}
        </SafeGLTF>
      </group>

      <group position={[5.8, 0, -7.2]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.ARBOLES.url}
          fallback={
            <mesh position={[0, 2, 0]} castShadow>
              <coneGeometry args={[1.2, 4, 8]} />
              <meshStandardMaterial color="#2d4a1d" />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.ARBOLES.url}
              targetSize={6.2}
              castShadow
            />
          )}
        </SafeGLTF>
      </group>

      {/* Leñera criolla con leños apilados */}
      <WoodShed />

      {/* Campana y chimenea parrillera criolla */}
      <ChimneyHood />

      {/* Mesada rústica derecha con cuchillo y botella de vino */}
      <PrepTable />
    </group>
  );
};
