import React, { useRef, useMemo, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Color, Vector3, Quaternion } from 'three';
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
  const finishPlacingMeat = useAsadoStore((state) => state.finishPlacingMeat);
  const triggerToolAction = useAsadoStore((state) => state.triggerToolAction);

  const isBeingPlaced = placingMeatId === meat.id;
  const prevPlacedRef = useRef<boolean>(isBeingPlaced);

  const isChorizo = meat.cut.toLowerCase().includes('chorizo') || meat.cut.toLowerCase().includes('chori');
  const glbUrl = isChorizo ? MODEL_REGISTRY.CHORIZO.url : MODEL_REGISTRY.VACIO.url;
  const targetSize = isChorizo ? 0.22 : 0.38;

  // Orientación transversal auténtica para reposar cruzando las varillas de la parrilla
  const rotationY = isChorizo ? 0 : Math.PI / 2;

  // Calibración geométrica precisa: medio ancho (X), medio alto (Y) y medio largo (Z)
  const colliderHalfX = isChorizo ? 0.04 : 0.16;
  const colliderHalfY = isChorizo ? 0.018 : 0.042;
  const colliderHalfZ = isChorizo ? 0.105 : 0.09;

  // Altura de superficie de la parrilla (0.35m varillas + 0.015m colisionador = 0.365m)
  const safeGrillY = 0.365 + colliderHalfY;

  // Tinte de cocción dinámico que preserva la textura PBR del GLB (grasa, veteado y fibras)
  const cookTint = useMemo(() => {
    if (meat.cookLevel <= 0.05) {
      return new Color('#ffffff');
    }

    if (meat.cookLevel <= 1.0) {
      const grilledCrust = new Color('#c47a50');
      return new Color('#ffffff').lerp(grilledCrust, meat.cookLevel * 0.85);
    }

    const wellDone = new Color('#854224');
    const charred = new Color('#1c120c');
    const overcooked = Math.min(1.0, meat.cookLevel - 1.0);
    return wellDone.clone().lerp(charred, overcooked * 0.9);
  }, [meat.cookLevel]);

  // Al soltar la carne desde cualquier origen, neutralizar velocidades físicas y resetear cursor
  useEffect(() => {
    if (prevPlacedRef.current && !isBeingPlaced) {
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      document.body.style.cursor = 'auto';
    } else if (isBeingPlaced) {
      document.body.style.cursor = 'grabbing';
    }
    prevPlacedRef.current = isBeingPlaced;
  }, [isBeingPlaced]);

  // Cleanup de cursor al desmontar
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

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
      const safeZ = !isNaN(curPos.z) ? curPos.z : meat.position[2];
      rigidBodyRef.current.setTranslation({ x: safeX, y: safeGrillY, z: safeZ }, true);
    }
  }, [meat.flipped, isBeingPlaced, meat.position, safeGrillY]);

  useFrame((_state, delta) => {
    if (isBeingPlaced && rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation(
        new Vector3(meat.position[0], safeGrillY, meat.position[2])
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

        // Anclaje seguro sobre la parrilla
        if (currentY < safeGrillY - 0.015) {
          rigidBodyRef.current.setTranslation({ x: currentX, y: safeGrillY, z: currentZ }, true);
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

    if (isBeingPlaced) {
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      finishPlacingMeat(meat.id, [e.point.x, safeGrillY, e.point.z]);
      document.body.style.cursor = 'auto';
      return;
    }

    triggerToolAction();

    if (e.button === 2 || e.shiftKey) {
      startPlacingMeat(meat.id);
      document.body.style.cursor = 'grabbing';
      return;
    }

    if (selectedTool === 'tenedor') {
      flipMeat(meat.id);
    } else {
      startPlacingMeat(meat.id);
      document.body.style.cursor = 'grabbing';
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
      position={[meat.position[0], Math.max(meat.position[1], safeGrillY), meat.position[2]]}
      canSleep={false}
    >
      <CuboidCollider
        args={[colliderHalfX, colliderHalfY, colliderHalfZ]}
        position={[0, 0, 0]}
      />

      <group
        onPointerDown={handlePointerDown}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = isBeingPlaced ? 'grabbing' : 'grab';
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
              tintColor={cookTint}
              rotation={[0, rotationY, 0]}
              castShadow
              receiveShadow
            />
          )}
        </SafeGLTF>
      </group>
    </RigidBody>
  );
};
