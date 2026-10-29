import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MeatModel } from '../src/sim/meat.ts';
import { createMeatVisual } from '../src/art/meat-visual.ts';
import { createVacioGeometry } from '../src/art/vacio-visual.ts';
import { createMatambreGeometry } from '../src/art/matambre-visual.ts';

test('el vacío muestra membrana y fibras en caras opuestas y las conserva al darlo vuelta', () => {
  const meat = new MeatModel('vacio'), view = createMeatVisual(meat, 3, 3);
  const scene = new THREE.Scene(); scene.add(view.group);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
  const mesh = view.pickMeshes[0], materials = mesh.material as THREE.MeshPhysicalMaterial[];
  const before = [...meat.layersC];
  view.update(); scene.updateMatrixWorld(true);
  assert.equal(ray.intersectObjects(view.pickMeshes, false)[0].face?.materialIndex, 1, 'al inicio se ve la cara B');
  assert.equal(materials[1].name, 'vacio-membrane');
  assert.equal(materials[1].userData.rawAtlasTile, 0);
  assert.equal(materials[0].name, 'vacio-fibers');
  assert.equal(materials[0].userData.rawAtlasTile, 1);
  assert.equal(materials[0].map, materials[1].map, 'el atlas se comparte sin confundir las caras');
  meat.flip(); view.update(); scene.updateMatrixWorld(true);
  assert.equal(ray.intersectObjects(view.pickMeshes, false)[0].face?.materialIndex, 0, 'al girar se ve la cara A de fibras');
  assert.deepEqual(meat.layersC, before);
  assert.equal(materials[1].userData.rawAtlasTile, 0);
  assert.equal(materials[0].userData.rawAtlasTile, 1);
});

test('el volumen del vacío es considerablemente más grueso y respeta sus parámetros térmicos', () => {
  const vacio = new MeatModel('vacio'), matambre = new MeatModel('matambre');
  const thick = createVacioGeometry(vacio), thin = createMatambreGeometry(matambre);
  const thickSize = thick.boundingBox!.getSize(new THREE.Vector3()), thinSize = thin.boundingBox!.getSize(new THREE.Vector3());
  assert.ok(thickSize.y > thinSize.y * 2);
  assert.ok(thick.boundingBox!.min.y >= 0 && thick.boundingBox!.max.y <= 0.035);
  assert.equal(vacio.definition.massKg, 1.8);
  assert.equal(vacio.definition.thicknessM, 0.035);
  assert.equal(vacio.layersC.length, 5);
  assert.ok(Array.from(thick.getAttribute('normal').array).every(Number.isFinite));
  thick.dispose(); thin.dispose();
});
