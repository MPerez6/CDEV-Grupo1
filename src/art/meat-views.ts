import * as THREE from 'three';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { BOARD_CUT_SCALE, FRIDGE_CUT_SCALE, GRILL_LAYOUT, boardMeatPosition, fridgePosition } from '../level/layout.ts';
import { CLIENT_SEATS } from '../ai/client-brain.ts';
import { createMeatVisual, type MeatVisual } from './meat-visual.ts';
import { createSeasoningView } from './meat-seasoning.ts';

export function createMeatViews(
  scene: THREE.Scene,
  camera: THREE.Camera,
  clickable: THREE.Object3D[],
  carriedParent?: THREE.Object3D,
) {
  const { left, front, width, depth } = GRILL_LAYOUT;
  const meatVisuals = new Map<number, MeatVisual>();
  const marks = new Map<number, ReturnType<typeof createSeasoningView>>();
  return {
    views: meatVisuals, update(world: SimulationWorld, elapsedReal = 0): void {
      const activeIds = new Set(world.meats.map(meat => meat.id));
      for (const [id, view] of meatVisuals) {
        if (activeIds.has(id)) continue;
        for (const mesh of view.pickMeshes) {
          const index = clickable.indexOf(mesh);
          if (index !== -1) clickable.splice(index, 1);
        }
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
        view.group.traverse(object => {
          if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
          geometries.add(object.geometry);
          if (object instanceof THREE.InstancedMesh) object.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        });
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose(); // Los atlas se comparten entre cortes.
        view.group.removeFromParent();
        meatVisuals.delete(id);
        marks.delete(id);
      }
      for(const meat of world.meats) {
        let view = meatVisuals.get(meat.id);
        if(!view) {
          view = createMeatVisual(meat, width / CONFIG.grillWidthM, depth / CONFIG.grillDepthM);
          meatVisuals.set(meat.id, view);
          clickable.push(...view.pickMeshes);
        }
        const holdTarget = carriedParent ?? camera;
        const parent = meat.location === 'carried' ? holdTarget : scene;
        if(view.group.parent !== parent) parent.add(view.group);
        if(meat.location === 'carried') {
          if(carriedParent) view.group.position.set(0, -meat.definition.thicknessM * 0.975, 0);
          else view.group.position.set(0.42, -0.42, -0.85);
        }
        else if(meat.onGrill) view.group.position.set(left + meat.positionM.x * width / CONFIG.grillWidthM,
          1.18, front - meat.positionM.z * depth / CONFIG.grillDepthM);
        else if(meat.location === 'served' && meat.servedSeat !== null && CLIENT_SEATS[meat.servedSeat]) {
          const p = CLIENT_SEATS[meat.servedSeat].platePos;
          view.group.position.set(p.x, p.y, p.z);
        }
        else if(meat.location === 'fridge') view.group.position.copy(fridgePosition(meat.definition.kind));
        else {
          view.group.position.copy(boardMeatPosition(meat));
        }
        view.update();
        for (const part of view.pickMeshes) part.userData.onPrepBoard = meat.location === 'board';
        if(meat.location === 'served') {
          view.group.scale.setScalar(0.52);
          for(const part of view.pickMeshes) part.userData.enabled = false;
        } else if(meat.location === 'board') {
          view.group.scale.setScalar(BOARD_CUT_SCALE);
        } else if(meat.location === 'fridge') {
          view.group.scale.setScalar(FRIDGE_CUT_SCALE);
          for(const part of view.pickMeshes) part.userData.enabled = world.fridgeOpen;
        }
        let grains = marks.get(meat.id);
        if (!grains) { grains = createSeasoningView(view, meat); marks.set(meat.id, grains); }
        grains.update(elapsedReal);
      }
    }
  };
}
