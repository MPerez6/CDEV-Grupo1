import React, { useMemo } from 'react';
import { Sky } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { Object3D } from 'three';
import { GLBModel } from '../Common/GLBModel';
import { SafeGLTF } from '../Common/SafeModelLoader';
import { PampeanGrass } from './PampeanGrass';
import { MODEL_REGISTRY } from '../../config/modelRegistry';

// Arboleda distante de llanura pampeana en el horizonte
const DISTANT_TREES = [
  { x: -24.0, z: -32.0, size: 7.2, rotY: 0.8 },
  { x: -16.5, z: -22.0, size: 6.0, rotY: 2.1 },
  { x: -8.0, z: -16.0, size: 5.4, rotY: 4.3 },
  { x: 3.5, z: -27.0, size: 6.8, rotY: 1.2 },
  { x: 12.0, z: -18.0, size: 5.8, rotY: 3.5 },
  { x: 19.5, z: -25.0, size: 6.5, rotY: 5.1 },
  { x: 26.0, z: -34.0, size: 7.4, rotY: 0.4 },
];

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

// Mesada rústica real utilizando 'Tabla.glb', con cuchillo y botella de vino perfectamente calibrados
const MesadaRustica: React.FC = () => {
  const tableX = 0.95;
  const tableZ = 0.05;

  const targetSize = 1.15;
  const tableElevation = 0.351;
  const surfaceY = 0.702;

  return (
    <group position={[tableX, 0, tableZ]}>
      {/* 1. Modelo 3D auténtico de la mesa rústica (Tabla.glb) apoyado a nivel del suelo */}
      <group position={[0, tableElevation, 0]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.TABLA.url}
          fallback={
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.5, 0.7, 1.0]} />
              <meshStandardMaterial color="#352015" roughness={0.85} />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.TABLA.url}
              targetSize={targetSize}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>

      {/* 2. Cuchillo parrillero clavado en madera descansando con su base exactamente sobre la tabla */}
      <group position={[-0.04, surfaceY + 0.034, 0.14]} rotation={[0, 0.35, 0]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.CUCHILLO_EN_MADERA.url}
          fallback={
            <mesh position={[0, 0.02, 0]} castShadow>
              <boxGeometry args={[0.22, 0.03, 0.3]} />
              <meshStandardMaterial color="#6a4228" roughness={0.8} />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.CUCHILLO_EN_MADERA.url}
              targetSize={MODEL_REGISTRY.CUCHILLO_EN_MADERA.defaultTargetSize ?? 0.44}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>

      {/* 3. Botella de vino parada verticalmente con su base apoyada en la superficie de la mesa */}
      <group position={[0.07, surfaceY + 0.175, -0.24]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.BOTELLA_DE_VINO_VIEJA.url}
          fallback={
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.04, 0.35, 16]} />
              <meshStandardMaterial color="#1f3b23" roughness={0.2} metalness={0.1} />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.BOTELLA_DE_VINO_VIEJA.url}
              targetSize={MODEL_REGISTRY.BOTELLA_DE_VINO_VIEJA.defaultTargetSize ?? 0.35}
              rotation={[0, 0, 0]}
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
  const wireHeights = [0.25, 0.5, 0.75, 1.0, 1.25];

  return (
    <group>
      {/* Cielo pampeano de atardecer dorado despejado y abierto */}
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

      {/* Sistema denso de pasto procedural pampeano con balanceo orgánico */}
      <PampeanGrass />

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

      {/* CEIBO DESTACADO (Flor Nacional Argentina) en el flanco visible de la llanura */}
      <group position={[-6.2, 2.35, -2.5]} rotation={[0, 0.45, 0]}>
        <SafeGLTF
          modelPath={MODEL_REGISTRY.CEIBO.url}
          fallback={
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.4, 4.8, 8]} />
              <meshStandardMaterial color="#4a2e18" />
            </mesh>
          }
        >
          {() => (
            <GLBModel
              url={MODEL_REGISTRY.CEIBO.url}
              targetSize={4.8}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>

      {/* Arboleda pampeana lejana en el horizonte */}
      {DISTANT_TREES.map((tree, idx) => (
        <group
          key={`distant-tree-${idx}`}
          position={[tree.x, tree.size * 0.48, tree.z]}
          rotation={[0, tree.rotY, 0]}
        >
          <SafeGLTF
            modelPath={MODEL_REGISTRY.ARBOLES.url}
            fallback={
              <mesh position={[0, 0, 0]} castShadow>
                <coneGeometry args={[1.5, tree.size, 8]} />
                <meshStandardMaterial color="#2d4a1d" />
              </mesh>
            }
          >
            {() => (
              <GLBModel
                url={MODEL_REGISTRY.ARBOLES.url}
                targetSize={tree.size}
                castShadow
              />
            )}
          </SafeGLTF>
        </group>
      ))}

      {/* Leñera criolla con leños apilados */}
      <WoodShed />

      {/* Mesada rústica derecha con Tabla.glb, cuchillo y botella de vino */}
      <MesadaRustica />
    </group>
  );
};
