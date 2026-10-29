import * as THREE from 'three';
import type { SimulationWorld } from '../sim/world.ts';
import { createPatio } from '../level/patio.ts';
import { createGrill } from '../level/grill.ts';
import { ASADOR_LAYOUT } from '../level/asador.ts';
import { createPatioLighting } from '../lighting/lighting.ts';
import { createBrazier } from '../effects/brazier-effects.ts';
import { createGrillEmbers } from '../effects/grill-embers.ts';
import { createMeatViews } from '../art/meat-views.ts';

/** Compone los módulos visuales; no calcula física ni procesa entradas. */
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91a7ae);
  scene.fog = new THREE.Fog(0x91a7ae, 16, 39);
  const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.04, 80);
  camera.position.set(0, 1.68, 1.0);
  camera.lookAt(-1.0, 1.40, -4.55);
  scene.add(camera);
  const clickable: THREE.Object3D[] = [];
  createPatioLighting(scene);
  createPatio(scene, clickable);
  const grill = createGrill(scene, clickable);
  const brazier = createBrazier(scene, clickable, { position: ASADOR_LAYOUT.brazierPosition, scale: ASADOR_LAYOUT.brazierScale, hearth: false });
  const embers = createGrillEmbers(grill.coalMeshes);
  const meats = createMeatViews(scene, camera, clickable);
  return {
    scene, camera, clickable, updateVisuals(world: SimulationWorld, elapsedReal: number): void {
      brazier.updateVisuals(world, elapsedReal);
      embers.update(world, elapsedReal);
      meats.update(world);
    }
  };
}
