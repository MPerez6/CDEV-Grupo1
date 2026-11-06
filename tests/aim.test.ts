import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { selectTargetFromRay } from '../src/gameplay/player.ts';

/** Arma una escena mínima: tabla con una carne encima, un brasero delante de la mesada y una radio chica. */
function scene() {
  const clickable: THREE.Object3D[] = [];
  const add = (size: [number, number, number], pos: [number, number, number], userData: Record<string, unknown>) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial());
    m.position.set(...pos);
    m.userData = userData;
    m.updateMatrixWorld();
    clickable.push(m);
    return m;
  };
  add([1.4, 0.05, 0.9], [0, 1, -2], { kind: 'board', index: 0 });
  add([1.2, 0.04, 0.8], [0, 1.045, -2], { kind: 'meat', meatId: 7 });
  add([0.8, 0.4, 0.6], [3, 1.1, -2], { kind: 'brazier' });
  add([0.8, 0.1, 0.6], [3, 0.85, -2.6], { kind: 'tray', enabled: true });
  add([0.3, 0.18, 0.1], [-3, 1, -2], { kind: 'radio' });
  return clickable;
}

function rayFrom(origin: [number, number, number], target: [number, number, number]) {
  const o = new THREE.Vector3(...origin);
  return new THREE.Raycaster(o, new THREE.Vector3(...target).sub(o).normalize(), 0, 5);
}

test('con carne en la pinza se apunta a la tabla aunque haya otra carne encima', () => {
  const c = scene();
  const ray = rayFrom([0, 1.7, -0.8], [0, 1.0, -2]);
  assert.equal(selectTargetFromRay(ray, c, 2)?.kind, 'meat', 'sin contexto: comportamiento original');
  assert.equal(selectTargetFromRay(ray, c, 2, { carryingMeat: true, shovelLoaded: false })?.kind, 'board');
});

test('con la pinza vacía la tabla no tapa la carne', () => {
  const c = scene();
  const ray = rayFrom([0.6, 1.7, -0.8], [0.62, 1.0, -2]); // borde de la tabla, 2 cm afuera de la carne
  assert.equal(selectTargetFromRay(ray, c, 2, { carryingMeat: false, shovelLoaded: false })?.kind, 'meat');
});

test('con la pala vacía el brasero no tapa las brasas de la mesada; cargada, sí apunta al brasero', () => {
  const c = scene();
  const ray = rayFrom([3, 1.6, -0.9], [3, 0.85, -2.6]);
  assert.equal(selectTargetFromRay(ray, c, 1, { carryingMeat: false, shovelLoaded: false })?.kind, 'tray');
  assert.equal(selectTargetFromRay(ray, c, 1, { carryingMeat: false, shovelLoaded: true })?.kind, 'brazier');
});

test('la asistencia de puntería agarra un objeto chico si la mira queda apenas al costado', () => {
  const c = scene();
  const ray = rayFrom([-3, 1.6, -0.6], [-2.79, 1.0, -2]); // ~2° a la derecha de la radio
  assert.equal(selectTargetFromRay(ray, c, 0), null, 'sin contexto no hay asistencia');
  assert.equal(selectTargetFromRay(ray, c, 0, { carryingMeat: false, shovelLoaded: false })?.kind, 'radio');
});
