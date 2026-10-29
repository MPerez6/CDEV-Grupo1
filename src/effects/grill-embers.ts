import * as THREE from 'three';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { GRILL_LAYOUT } from '../level/layout.ts';
import { createEmberScatter, type EmberScatter } from './ember-scatter.ts';

export function createGrillEmbers(coalMeshes: THREE.Group[]) {
  const { width, depth } = GRILL_LAYOUT;
  const grillEmbers = new Map<number, EmberScatter>();
  return {
    update(world: SimulationWorld, elapsedReal: number): void {
      const activeIds = new Set(world.grill.cells.flatMap(cell => cell.map(ember => ember.id)));
      for(const [id, portion] of grillEmbers) {
        if(!activeIds.has(id)) { portion.dispose(); grillEmbers.delete(id); }
      }
      world.grill.cells.forEach((cell, index) => {
        for(const ember of cell) {
          let portion = grillEmbers.get(ember.id);
          if(!portion) {
            portion = createEmberScatter(ember.id, {
              spreadX: width / CONFIG.gridColumns * 0.30,
              spreadZ: depth / CONFIG.gridRows * 0.30,
              size: 0.037,
            });
            portion.group.position.set(Math.sin(ember.id * 12.13) * 0.022, (ember.id % 3) * 0.003,
              Math.cos(ember.id * 7.91) * 0.022);
            grillEmbers.set(ember.id, portion);
          }
          if(portion.group.parent !== coalMeshes[index]) coalMeshes[index].add(portion.group);
          portion.update(ember, elapsedReal);
        }
      });
    }
  };
}
