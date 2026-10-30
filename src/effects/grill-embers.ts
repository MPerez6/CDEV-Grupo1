import * as THREE from 'three';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { GRILL_LAYOUT } from '../level/layout.ts';
import { createEmberScatter, type EmberScatter } from './ember-scatter.ts';

export function createGrillEmbers(coalMeshes: THREE.Group[]) {
  const { left, front, width, depth } = GRILL_LAYOUT;
  const grillEmbers = new Map<number, EmberScatter>();
  const targetPos = new THREE.Vector3();
  let lastElapsed = -1;
  return {
    update(world: SimulationWorld, elapsedReal: number): void {
      const dt = lastElapsed < 0 ? 0 : elapsedReal - lastElapsed;
      lastElapsed = elapsedReal;
      const smoothAlpha = dt > 0 && dt < 0.25 ? Math.min(1, 1 - Math.exp(-dt * 20)) : 1;

      const activeIds = new Set(world.grill.cells.flatMap(cell => cell.map(ember => ember.id)));
      for(const [id, portion] of grillEmbers) {
        if(!activeIds.has(id)) { portion.dispose(); grillEmbers.delete(id); }
      }
      world.grill.cells.forEach((cell, index) => {
        const anchor = coalMeshes[index];
        const freeParent = anchor.parent ?? anchor;
        for(const ember of cell) {
          let portion = grillEmbers.get(ember.id);
          let created = false;
          if(!portion) {
            portion = createEmberScatter(ember.id, {
              spreadX: width / CONFIG.gridColumns * 0.30,
              spreadZ: depth / CONFIG.gridRows * 0.30,
              size: 0.037,
            });
            grillEmbers.set(ember.id, portion);
            created = true;
          }
          if(ember.positionM && anchor.parent) {
            targetPos.set(
              left + (ember.positionM.x / CONFIG.grillWidthM) * width,
              anchor.position.y + (ember.id % 3) * 0.003,
              front - (ember.positionM.z / CONFIG.grillDepthM) * depth,
            );
            if(portion.group.parent !== freeParent) {
              const wasInCellAnchor = !created && portion.group.parent !== null && portion.group.parent !== freeParent;
              const prevParentPos = wasInCellAnchor ? portion.group.parent!.position.clone() : null;
              freeParent.add(portion.group);
              if(prevParentPos) portion.group.position.add(prevParentPos);
              else created = true;
            }
            if(created || smoothAlpha >= 1) portion.group.position.copy(targetPos);
            else portion.group.position.lerp(targetPos, smoothAlpha);
          } else {
            if(portion.group.parent !== anchor) anchor.add(portion.group);
            portion.group.position.set(Math.sin(ember.id * 12.13) * 0.022, (ember.id % 3) * 0.003,
              Math.cos(ember.id * 7.91) * 0.022);
          }
          portion.update(ember, elapsedReal);
        }
      });
    }
  };
}
