import * as THREE from 'three';
import type { SimulationWorld } from '../sim/world.ts';
import { createSmokeSystem, HOOD_DRAFT } from './smoke.ts';
import { meatSmoke } from './smoke-sources.ts';

/** Humo de la carne sobre la parrilla: la grasa que gotea humea blanco y el quemado, negro. */
export function createMeatSmoke(scene: THREE.Scene, views: ReadonlyMap<number, { group: THREE.Object3D }>) {
  const smoke = createSmokeSystem(scene, {
    capacity: 160, maxRate: 15, life: 3.6, size: [0.15, 0.85], rise: 0.5, spread: 0.14, opacity: 0.32,
    draft: HOOD_DRAFT, ceilingY: 3.6,
  });
  const origin = new THREE.Vector3();
  let previousElapsed: number | null = null;
  return {
    smoke,
    update(world: SimulationWorld, elapsedReal: number): void {
      const dt = previousElapsed === null ? 0 : Math.min(0.1, Math.max(0, elapsedReal - previousElapsed));
      previousElapsed = elapsedReal;
      for(const meat of world.meats) {
        const view = views.get(meat.id);
        if(!meat.onGrill || !view) continue;
        view.group.getWorldPosition(origin);
        origin.y += meat.definition.thicknessM + 0.02;
        const burn = Math.max(meat.burn.a, meat.burn.b, meat.casingDamage.a, meat.casingDamage.b);
        smoke.emit(`carne-${meat.id}`, origin, meatSmoke(world.meatFluxWm2(meat), meat.surfaceC[meat.faceDown], burn), dt);
      }
      smoke.update(dt, elapsedReal);
    },
  };
}
