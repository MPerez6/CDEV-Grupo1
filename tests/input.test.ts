import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { bindPrimaryAction } from '../src/gameplay/input.ts';
import { createBrazier } from '../src/effects/brazier-effects.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { ASADOR_LAYOUT, createAsador } from '../src/level/asador.ts';

function mouseDown(target: EventTarget, button = 0): void {
  const event = new Event('mousedown');
  Object.defineProperty(event, 'button', { value: button });
  target.dispatchEvent(event);
}

test('el clic dirigido al elemento bloqueado enciende el papel bajo el brasero', () => {
  const lockedElement = new EventTarget();
  const world = new SimulationWorld();
  world.brazier.addFuel('charcoal');
  world.brazier.addTinder();
  const scene = new THREE.Scene();
  const clickable: THREE.Object3D[] = [];
  const visual = createBrazier(scene, clickable);
  visual.updateVisuals(world, 0);
  assert.equal(visual.flame.visible, false);
  scene.updateMatrixWorld(true);
  // Posición accesible frente al brasero, fuera de sus colisiones.
  const origin = new THREE.Vector3(-2.65, 1.68, -3.55);
  const paper = clickable.find(object => object.userData.kind === 'tinder-pad');
  assert.ok(paper);
  const aim = new THREE.Box3().setFromObject(paper).getCenter(new THREE.Vector3());
  const ray = new THREE.Raycaster(origin, aim.sub(origin).normalize(), 0, 3.4);
  let uses = 0;
  const unbind = bindPrimaryAction(lockedElement, () => true, () => {
    const hit = ray.intersectObjects(clickable, false)[0];
    assert.equal(hit?.object.userData.kind, 'tinder-pad');
    uses++;
    world.brazier.ignite();
  });
  mouseDown(lockedElement);
  assert.equal(uses, 1);
  assert.equal(world.brazier.lit, true);
  visual.updateVisuals(world, 1);
  assert.equal(visual.flame.visible, true);
  assert.ok(visual.fireLight.intensity > 0);
  world.tick(1);
  assert.ok(world.brazier.fuel[0].progress > 0);
  unbind();
});

test('el menú, la pausa y los botones derecho y central no usan herramientas', () => {
  const input = new EventTarget();
  let playing = false;
  let uses = 0;
  const unbind = bindPrimaryAction(input, () => playing, () => { uses++; });
  mouseDown(input); // Clic en Entrar al patio antes de capturar el mouse.
  assert.equal(uses, 0);
  playing = true;
  mouseDown(input, 1);
  mouseDown(input, 2);
  assert.equal(uses, 0);
  mouseDown(input);
  assert.equal(uses, 1);
  playing = false;
  mouseDown(input);
  assert.equal(uses, 1);
  unbind();
  playing = true;
  mouseDown(input);
  assert.equal(uses, 1);
});

test('la llama inferior desaparece, el combustible arde arriba y las brasas terminan debajo', () => {
  const world = new SimulationWorld();
  world.brazier.addFuel('small-wood');
  world.brazier.addTinder();
  world.brazier.ignite();
  const scene = new THREE.Scene();
  const clickable: THREE.Object3D[] = [];
  const visual = createBrazier(scene, clickable);
  visual.updateVisuals(world, 0);
  assert.ok(visual.flame.visible);
  world.tick(300);
  visual.updateVisuals(world, 15);
  assert.equal(visual.flame.visible, false);
  assert.equal(scene.getObjectByName('tinder-paper')?.visible, false);
  assert.equal(visual.brazierContents.getObjectByName('fuel-fire')?.visible, true);
  const snapshot = JSON.stringify(world);
  visual.updateVisuals(world, 16);
  assert.equal(JSON.stringify(world), snapshot, 'el renderizado no modifica la combustión');
  world.tick(301);
  visual.updateVisuals(world, 30);
  world.tick(20);
  visual.updateVisuals(world, 31);
  scene.updateMatrixWorld(true);
  assert.equal(visual.brazierContents.children.length, 0);
  assert.equal(visual.trayContents.children.length, 1);
  const position = visual.trayContents.children[0].getWorldPosition(new THREE.Vector3());
  assert.ok(position.x > -3.30 && position.x < -2.0);
  assert.ok(position.z > -5.20 && position.z < -4.20, 'cae bajo la canasta, no adelante');
  assert.ok(position.y < 0.25, 'la brasa llega al piso');
  assert.equal(visual.fireLight.intensity, 0, 'no queda una llama infinita sin combustible');
});

test('los cuatro suministros inferiores se alcanzan desde delante del asador', () => {
  const scene = new THREE.Scene();
  const clickable: THREE.Object3D[] = [];
  createAsador(scene, clickable, () => {});
  createBrazier(scene, clickable, {
    position: ASADOR_LAYOUT.brazierPosition, scale: ASADOR_LAYOUT.brazierScale, hearth: false,
  });
  scene.updateMatrixWorld(true);
  for (const kind of ['fuel-large-wood', 'fuel-small-wood', 'fuel-coal', 'tinder']) {
    const supply = clickable.find(object => object.userData.kind === kind);
    assert.ok(supply);
    const center = new THREE.Box3().setFromObject(supply).getCenter(new THREE.Vector3());
    const origin = new THREE.Vector3(center.x, 1.68, ASADOR_LAYOUT.bounds.z1 + 0.55);
    const ray = new THREE.Raycaster(origin, center.sub(origin).normalize(), 0, 3.4);
    assert.equal(ray.intersectObjects(clickable, false)[0]?.object.userData.kind, kind);
  }
});

test('el brasero elevado permite encender y deja las brasas sobre la mesada', () => {
  const scene = new THREE.Scene();
  const clickable: THREE.Object3D[] = [];
  createAsador(scene, clickable, () => {});
  const visual = createBrazier(scene, clickable, {
    position: ASADOR_LAYOUT.brazierPosition, scale: ASADOR_LAYOUT.brazierScale, hearth: false,
  });
  const world = new SimulationWorld();
  world.brazier.addFuel('charcoal');
  world.brazier.addTinder();
  visual.updateVisuals(world, 0);
  scene.updateMatrixWorld(true);
  const paper = clickable.find(object => object.userData.kind === 'tinder-pad');
  assert.ok(paper);
  const origin = new THREE.Vector3(ASADOR_LAYOUT.brazierPosition[0], 1.68, ASADOR_LAYOUT.bounds.z1 + 0.55);
  const aim = new THREE.Box3().setFromObject(paper).getCenter(new THREE.Vector3());
  const ray = new THREE.Raycaster(origin, aim.sub(origin).normalize(), 0, 3.4);
  const hit = ray.intersectObjects(clickable.filter(object => object.userData.enabled !== false), false)[0];
  assert.equal(hit?.object.userData.kind, 'tinder-pad');
  assert.ok(world.brazier.ignite());
  world.tick(781);
  visual.updateVisuals(world, 39);
  world.tick(20);
  visual.updateVisuals(world, 40);
  scene.updateMatrixWorld(true);
  const brasa = visual.trayContents.children[0];
  assert.ok(brasa);
  const position = brasa.getWorldPosition(new THREE.Vector3());
  assert.ok(position.y > ASADOR_LAYOUT.hearthTop);
  assert.ok(position.y < ASADOR_LAYOUT.hearthTop + 0.12);
  assert.ok(Math.abs(position.x - ASADOR_LAYOUT.brazierPosition[0]) < 0.6);
  assert.ok(Math.abs(position.z - ASADOR_LAYOUT.brazierPosition[2]) < 0.5);
});
