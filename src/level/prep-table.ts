import * as THREE from 'three';
import { SEASONINGS, SEASONING_LABELS } from '../sim/seasoning.ts';
import { PREP_BOARD, PREP_TABLE, boardPosition } from './layout.ts';
import { label, mark } from './primitives.ts';
import { cuttingBoardTexture, tiled, woodPlankTexture } from './textures.ts';

export function createPrepTable(scene: THREE.Scene, clickable: THREE.Object3D[], addLabel = label): void {
  const { x, z, width, depth, top } = PREP_TABLE;
  const plank = new THREE.MeshStandardMaterial({ color: 0x9e6f42,
    map: typeof document === 'undefined' ? null : tiled(woodPlankTexture(), 2, 1), roughness: 0.83 });
  const legs = new THREE.MeshStandardMaterial({ color: 0x583820, roughness: 0.9 });
  const cuttingBoard = new THREE.MeshStandardMaterial({ color: 0xc88d50,
    map: typeof document === 'undefined' ? null : cuttingBoardTexture(), roughness: 0.78 });
  function part(geometry: THREE.BufferGeometry, px: number, y: number, pz: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, y, pz); mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  part(new THREE.BoxGeometry(width, 0.12, depth), x, top - 0.06, z, plank);
  part(new THREE.BoxGeometry(width - 0.19, 0.16, depth - 0.16), x, top - 0.17, z, legs);
  part(new THREE.BoxGeometry(width - 0.25, 0.055, depth - 0.25), x, 0.31, z, plank);
  for (const dx of [-width / 2 + 0.15, width / 2 - 0.15]) {
    for (const dz of [-depth / 2 + 0.15, depth / 2 - 0.15]) {
      part(new THREE.BoxGeometry(0.13, top - 0.12, 0.13), x + dx, (top - 0.12) / 2, z + dz, legs);
    }
  }
  const p = boardPosition();
  mark(part(new THREE.BoxGeometry(PREP_BOARD.width, PREP_BOARD.thickness, PREP_BOARD.depth),
    p.x, top + PREP_BOARD.thickness / 2, p.z, cuttingBoard), 'board', clickable);

  const colors = [0xf5f0de, 0x546433, 0xb38a55];
  const caps = [0x9a3432, 0x35503a, 0x6b4930];
  SEASONINGS.forEach((seasoning, i) => {
    const px = x + (i - 1) * 0.58, pz = z - 0.52;
    const height = i === 2 ? 0.25 : 0.19;
    const material = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.29 });
    const jar = part(new THREE.CylinderGeometry(i === 2 ? 0.048 : 0.073, 0.079, height, 16),
      px, top + height / 2, pz, material);
    const cap = part(new THREE.CylinderGeometry(0.076, 0.076, 0.03, 16),
      px, top + height + 0.015, pz, new THREE.MeshStandardMaterial({ color: caps[i], roughness: 0.49 }));
    mark(jar, 'seasoning', clickable, i);
    mark(cap, 'seasoning', clickable, i);
    addLabel(scene, SEASONING_LABELS[seasoning], new THREE.Vector3(px, top + height * 0.54, pz + 0.083), 0.30);
  });
  const knifeX = x + width / 2 - 0.12, knifeZ = p.z + 0.14;
  const steel = new THREE.MeshStandardMaterial({ color: 0xcad1d4, roughness: 0.31, metalness: 0.72 });
  const blade = part(new THREE.BoxGeometry(0.087, 0.012, 0.29), knifeX, top + 0.017, knifeZ - 0.11, steel);
  blade.rotation.y = 0.08;
  const handle = part(new THREE.BoxGeometry(0.048, 0.029, 0.15), knifeX - 0.012, top + 0.021, knifeZ + 0.10, legs);
  mark(blade, 'prep-knife', clickable);
  mark(handle, 'prep-knife', clickable);
  addLabel(scene, 'CUCHILLO [E]', new THREE.Vector3(knifeX, top + 0.07, knifeZ + 0.23), 0.34);
  addLabel(scene, 'MESA DEL ASADOR', new THREE.Vector3(x, top - 0.16, z + depth / 2 + 0.006), 1.14);
}
