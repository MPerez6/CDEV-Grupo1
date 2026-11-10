import * as THREE from 'three';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { GRILL_LAYOUT, boardPosition } from '../level/layout.ts';
import { CLIENT_SEATS } from '../ai/client-brain.ts';
import { createMeatVisual, type MeatVisual } from './meat-visual.ts';

export function createMeatViews(
  scene: THREE.Scene,
  camera: THREE.Camera,
  clickable: THREE.Object3D[],
  carriedParent?: THREE.Object3D,
) {
  const { left, front, width, depth } = GRILL_LAYOUT;
  const meatVisuals = new Map<number, MeatVisual>();
  return {
    views: meatVisuals, update(world: SimulationWorld): void {
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
        else view.group.position.copy(boardPosition(meat.boardSlot));
        view.update();
        if(meat.location === 'served') {
          view.group.scale.setScalar(0.52);
          for(const part of view.pickMeshes) part.userData.enabled = false;
        } else if(meat.location === 'board') {
          view.group.scale.setScalar(0.76);
        }
      }
    }
  };
}
