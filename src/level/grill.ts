import * as THREE from 'three';
import { CONFIG } from '../sim/parameters.ts';
import { ASADOR_LAYOUT } from './asador.ts';
import { GRILL_LAYOUT } from './layout.ts';
import { box, mark } from './primitives.ts';

export function createGrill(scene: THREE.Scene, clickable: THREE.Object3D[]) {
  const { left, front, width, depth } = GRILL_LAYOUT;
  box(scene, [2.78, 0.06, 0.055], [0, 1.15, -3.48], 0x363b39);
  box(scene, [2.78, 0.06, 0.055], [0, 1.15, -5.6], 0x363b39);
  box(scene, [0.055, 0.06, 2.17], [-1.38, 1.15, -4.54], 0x363b39);
  box(scene, [0.055, 0.06, 2.17], [1.38, 1.15, -4.54], 0x363b39);
  for(const x of [-1.32, 1.32]) for(const z of [-3.53, -5.55])
    box(scene, [0.04, 0.29, 0.04], [x, 0.99, z], 0x363b39);
  const cellMeshes: THREE.Mesh[] = [];
  const coalMeshes: THREE.Group[] = [];
  const cellPosition = (index: number): THREE.Vector3 => {
    const col = index % CONFIG.gridColumns;
    const row = Math.floor(index / CONFIG.gridColumns);
    return new THREE.Vector3(
      left + (col + 0.5) * width / CONFIG.gridColumns,
      1.10,
      front - (row + 0.5) * depth / CONFIG.gridRows
    );
  };
  for(let i = 0;i < CONFIG.gridColumns * CONFIG.gridRows;i++) {
    const p = cellPosition(i);
    const tile = box(scene, [width / CONFIG.gridColumns - 0.016, 0.018, depth / CONFIG.gridRows - 0.016], [p.x, p.y, p.z], 0x343434);
    const material = tile.material as THREE.MeshStandardMaterial;
    material.transparent = true;
    material.opacity = 0;
    material.depthWrite = false;
    mark(tile, 'grill-cell', clickable, i);
    cellMeshes.push(tile);
    const embers = new THREE.Group();
    embers.position.set(p.x, ASADOR_LAYOUT.hearthTop + 0.006, p.z);
    scene.add(embers);
    coalMeshes.push(embers);
  }
  // Plano continuo sobre el piso refractario y fondo bajo la parrilla para soltar brasas libremente con la pala.
  const emberBedMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const emberFloor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, 0.024, depth + 0.28), emberBedMat);
  emberFloor.position.set(left + width / 2, ASADOR_LAYOUT.hearthTop + 0.012, front - depth / 2 - 0.03);
  emberFloor.userData.emberBed = true;
  scene.add(emberFloor);
  mark(emberFloor, 'grill-cell', clickable);

  const emberBackstop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, 0.31, 0.04), emberBedMat);
  emberBackstop.position.set(left + width / 2, ASADOR_LAYOUT.hearthTop + 0.155, front - depth - 0.11);
  emberBackstop.userData.emberBed = true;
  scene.add(emberBackstop);
  mark(emberBackstop, 'grill-cell', clickable);

  for(let i = 0;i <= 17;i++) box(scene, [0.025, 0.025, 2.10], [-1.26 + i * 0.148, 1.15, -4.55], 0x363b39, false);
  for(let i = 0;i < 9;i++) box(scene, [2.58, 0.021, 0.022], [0, 1.152, -5.51 + i * 0.24], 0x363b39, false);
  return { cellMeshes, coalMeshes, cellPosition };
}
