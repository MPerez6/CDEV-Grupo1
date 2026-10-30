import * as THREE from 'three';
import type { SimulationWorld } from '../sim/world.ts';
import { createPatio } from '../level/patio.ts';
import { createGrill } from '../level/grill.ts';
import { ASADOR_LAYOUT } from '../level/asador.ts';
import { createPatioLighting } from '../lighting/lighting.ts';
import { createBrazier } from '../effects/brazier-effects.ts';
import { createGrillEmbers } from '../effects/grill-embers.ts';
import { createMeatViews } from '../art/meat-views.ts';
import { createToolViews } from '../art/tool-views.ts';

/** Compone los módulos visuales; no calcula física ni procesa entradas. */
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91a7ae);
  scene.fog = new THREE.Fog(0x91a7ae, 16, 39);
  const aspect = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 16 / 9;
  const camera = new THREE.PerspectiveCamera(76, aspect, 0.04, 80);
  camera.position.set(0, 1.68, 1.0);
  camera.lookAt(-1.0, 1.40, -4.55);
  scene.add(camera);
  const clickable: THREE.Object3D[] = [];
  createPatioLighting(scene);
  createPatio(scene, clickable);
  const grill = createGrill(scene, clickable);
  const brazier = createBrazier(scene, clickable, { position: ASADOR_LAYOUT.brazierPosition, scale: ASADOR_LAYOUT.brazierScale, hearth: false });
  const embers = createGrillEmbers(grill.coalMeshes);
  const tools = createToolViews(camera);
  const meats = createMeatViews(scene, camera, clickable, tools.carriedMeatAnchor);
  return {
    scene,
    camera,
    clickable,
    triggerToolAction: tools.triggerAction,
    updateVisuals(world: SimulationWorld, elapsedReal: number, activeTool = 0): void {
      brazier.updateVisuals(world, elapsedReal);
      embers.update(world, elapsedReal);
      tools.update(world, activeTool, elapsedReal);
      meats.update(world);
    }
  };
}
