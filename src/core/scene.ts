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
import { createClientViews } from '../ai/clients.ts';
import { createRestaurante } from '../level/restaurante.ts';
import { createSky } from '../level/sky.ts';

/** Compone los módulos visuales; no calcula física ni procesa entradas. */
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8bc0e6);
  scene.fog = new THREE.Fog(0xc6e1f2, 28, 105);
  const aspect = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 16 / 9;
  const camera = new THREE.PerspectiveCamera(76, aspect, 0.04, 160);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.68, 1.0);
  camera.lookAt(-1.0, 1.40, -4.55);
  camera.rotation.z = 0;
  scene.add(camera);
  const clickable: THREE.Object3D[] = [];
  createPatioLighting(scene);
  const sky = createSky(scene);
  createPatio(scene, clickable);
  const grill = createGrill(scene, clickable);
  const brazier = createBrazier(scene, clickable, { position: ASADOR_LAYOUT.brazierPosition, scale: ASADOR_LAYOUT.brazierScale, hearth: false });
  const embers = createGrillEmbers(grill.coalMeshes);
  const tools = createToolViews(camera);
  const meats = createMeatViews(scene, camera, clickable, tools.carriedMeatAnchor);
  const restaurante = createRestaurante(scene, clickable);
  restaurante.setActive(false);
  const clientViews = createClientViews(scene, clickable);
  const familyGroup = scene.getObjectByName('mesa-familiar-group');
  const doorPivot = scene.getObjectByName('entrance-door-pivot');
  const radioObj = scene.getObjectByName('radio-led')?.parent;
  return {
    scene,
    camera,
    clickable,
    triggerToolAction: tools.triggerAction,
    updateVisuals(world: SimulationWorld, elapsedReal: number, activeTool = 0): void {
      const isRestaurant = world.clients.enabled;
      restaurante.setActive(isRestaurant);
      if(familyGroup) familyGroup.visible = !isRestaurant;
      // En modo restaurante ubicamos la radio sobre su mesita auxiliar bajo la pérgola (sin ocupar la mesada de preparación)
      if(radioObj) {
        if(isRestaurant) radioObj.position.set(-4.6, 0.786, -1.38);
        else radioObj.position.set(-5.6, 0.786, -0.55);
      }
      if(doorPivot) {
        doorPivot.rotation.y = world.clients.doorOpenRatio * 1.45;
      }
      sky.update(elapsedReal);
      brazier.updateVisuals(world, elapsedReal);
      embers.update(world, elapsedReal);
      tools.update(world, activeTool, elapsedReal);
      meats.update(world);
      clientViews.update(world.clients, elapsedReal);
    }
  };
}
