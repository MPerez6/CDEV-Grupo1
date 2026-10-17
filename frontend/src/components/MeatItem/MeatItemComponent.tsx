import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Color, MeshStandardMaterial, Vector3, Quaternion } from 'three';
import { useAsadoStore, MeatItem } from '../../store/useAsadoStore';
import { GLBModel } from '../Common/GLBModel';
import { SafeGLTF } from '../Common/SafeModelLoader';
import { MODEL_REGISTRY } from '../../config/modelRegistry';

// Fallback procedural de tira de asado / vacío con carne roja, grasa dorada y costillas
const ProceduralMeatFallback: React.FC<{ cookLevel: number }> = ({ cookLevel }) => {
  const meatColor = useMemo(() => {
    const raw = new Color('#b8281c');
    const crust = new Color('#75381a');
    const burnt = new Color('#22140d');
    if (cookLevel <= 1.0) {
      return raw.clone().lerp(crust, cookLevel);
    }
    return crust.clone().lerp(burnt, Math.min(1, cookLevel - 1.0));
  }, [cookLevel]);

  return (
    <group>
      {/* Músculo vacuno principal */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.34, 0.05, 0.18]} />
        <meshStandardMaterial color={meatColor} roughness={0.72} metalness={0.05} />
      </mesh>
      {/* Ribete de grasa parrillera dorada */}
      <mesh position={[0, 0.005, 0.095]} castShadow>
        <boxGeometry args={[0.33, 0.045, 0.02]} />
        <meshStandardMaterial color="#ebdcc4" roughness={0.65} metalness={0.05} />
      </mesh>
      {/* Costillas de quebracho/hueso vacuno */}
      {[-0.1, 0, 0.1].map((x, i) => (
        <mesh key={`bone-${i}`} position={[x, -0.005, -0.092]} castShadow>
          <boxGeometry args={[0.045, 0.04, 0.018]} />
          <meshStandardMaterial color="#dcd4c3" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

interface Props {
  meat: MeatItem;
}

export const MeatItemComponent: React.FC<Props> = ({ meat }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const prevFlippedRef = useRef<boolean>(meat.flipped);

  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const getHeatAtPosition = useAsadoStore((state) => state.getHeatAtPosition);
  const updateCookLevel = useAsadoStore((state) => state.updateCookLevel);
  const flipMeat = useAsadoStore((state) => state.flipMeat);
  const placingMeatId = useAsadoStore((state) => state.placingMeatId);
  const startPlacingMeat = useAsadoStore((state) => state.startPlacingMeat);
  const triggerToolAction = useAsadoStore((state) => state.triggerToolAction);

  const isBeingPlaced = placingMeatId === meat.id;

  const isChorizo = meat.cut.toLowerCase().includes('chorizo') || meat.cut.toLowerCase().includes('chori');
  const glbUrl = isChorizo ? MODEL_REGISTRY.CHORIZO.url : MODEL_REGISTRY.VACIO.url;
  const targetSize = isChorizo ? 0.22 : 0.38;

  const colliderHalfX = isChorizo ? 0.06 : 0.16;
  const colliderHalfY = 0.025;
  const colliderHalfZ = isChorizo ? 0.1 : 0.11;

  // Material de cocción dinámico realista PBR
  const cookMaterial = useMemo(() => {
    const rawColor = new Color(isChorizo ? '#9e2e1c' : '#ba2626');
    const crustColor = new Color('#75381a');
    const burntColor = new Color('#1c1410');

    let currentColor = rawColor;
    if (meat.cookLevel <= 1.0) {
      currentColor = rawColor.clone().lerp(crustColor, meat.cookLevel);
    } else {
      currentColor = crustColor.clone().lerp(burntColor, Math.min(1, meat.cookLevel - 1.0));
    }

    return new MeshStandardMaterial({
      color: currentColor,
      roughness: 0.7 - Math.min(0.2, meat.cookLevel * 0.1),
      metalness: 0.08,
    });
  }, [meat.cookLevel, isChorizo]);

  // Volteo de la carne sobre los fierros
  useEffect(() => {
    if (prevFlippedRef.current !== meat.flipped && rigidBodyRef.current && !isBeingPlaced) {
      prevFlippedRef.current = meat.flipped;

      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      const curRot = rigidBodyRef.current.rotation();
      const currentQ = new Quaternion(curRot.x, curRot.y, curRot.z, curRot.w);
      const flipQ = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
      currentQ.multiply(flipQ);
      rigidBodyRef.current.setRotation(currentQ, true);

      const curPos = rigidBodyRef.current.translation();
      const safeX = !isNaN(curPos.x) ? curPos.x : meat.position[0];
      const safeY = 0.385;
      const safeZ = !isNaN(curPos.z) ? curPos.z : meat.position[2];
      rigidBodyRef.current.setTranslation({ x: safeX, y: safeY, z: safeZ }, true);
    }
  }, [meat.flipped, isBeingPlaced, meat.position]);

  useFrame((_state, delta) => {
    if (isBeingPlaced && rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation(
        new Vector3(meat.position[0], 0.385, meat.position[2])
      );
      return;
    }

    let currentX = meat.position[0];
    let currentY = meat.position[1];
    let currentZ = meat.position[2];

    if (rigidBodyRef.current) {
      const translation = rigidBodyRef.current.translation();
      if (!isNaN(translation.x) && !isNaN(translation.y) && !isNaN(translation.z)) {
        currentX = translation.x;
        currentY = translation.y;
        currentZ = translation.z;

        // Anclaje seguro sobre la parrilla (0.35m altura de parrilla)
        if (currentY < 0.36) {
          rigidBodyRef.current.setTranslation({ x: currentX, y: 0.385, z: currentZ }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }

    const heat = getHeatAtPosition(currentX, currentY, currentZ);

    if (heat >= 0.05 && meat.cookLevel < 2.0) {
      const cookSpeed = 0.0008;
      const cookDelta = heat * cookSpeed * delta;
      updateCookLevel(meat.id, cookDelta);
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isBeingPlaced) return;

    triggerToolAction();

    if (e.button === 2 || e.shiftKey) {
      startPlacingMeat(meat.id);
      return;
    }

    if (selectedTool === 'tenedor') {
      flipMeat(meat.id);
    } else {
      startPlacingMeat(meat.id);
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isBeingPlaced ? 'kinematicPosition' : 'dynamic'}
      colliders={false}
      friction={0.95}
      restitution={0.01}
      mass={1.5}
      position={[meat.position[0], 0.385, meat.position[2]]}
      canSleep={false}
    >
      <CuboidCollider
        args={[colliderHalfX, colliderHalfY, colliderHalfZ]}
        position={[0, colliderHalfY, 0]}
      />

      <group
        onPointerDown={handlePointerDown}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = isBeingPlaced
            ? 'grabbing'
            : selectedTool === 'tenedor'
            ? 'grab'
            : 'move';
        }}
        onPointerOut={() => {
          if (!isBeingPlaced) {
            document.body.style.cursor = 'auto';
          }
        }}
      >
        <SafeGLTF
          modelPath={glbUrl}
          fallback={<ProceduralMeatFallback cookLevel={meat.cookLevel} />}
        >
          {() => (
            <GLBModel
              url={glbUrl}
              targetSize={targetSize}
              customMaterial={cookMaterial}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>
    </RigidBody>
  );
};
