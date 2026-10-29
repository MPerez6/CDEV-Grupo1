import * as THREE from 'three';
import { createAsador } from './asador.ts';
import { boardPosition } from './layout.ts';
import { box, label, mark } from './primitives.ts';

export function createPatio(scene: THREE.Scene, clickable: THREE.Object3D[]): void {
  box(scene, [18, 0.18, 15], [0, -0.12, -1.9], 0x9b968a, false);
  // Jardín/parrilla de patio: mampostería, pared y mesas básicas.
  box(scene, [18, 3, 0.22], [0, 1.45, -7.15], 0xb8a99a, false);
  box(scene, [0.18, 3, 13], [-8, 1.45, -2.2], 0xa9a39a, false);
  box(scene, [0.18, 3, 13], [8, 1.45, -2.2], 0xa9a39a, false);
  createAsador(scene, clickable, label);

  // Mesa provisional para probar los seis cortes antes de incorporar la heladera.
  box(scene, [4.6, 0.15, 2.9], [4.55, 0.95, -3.4], 0x815738);
  for(const x of [2.5, 6.6]) for(const z of [-4.6, -2.2])
    box(scene, [0.14, 0.85, 0.14], [x, 0.47, z], 0x815738);
  for(let i = 0;i < 7;i++) {
    const p = boardPosition(i);
    const board = box(scene, [1.4, 0.05, 0.88], [p.x, 1.07, p.z], 0xb88a58);
    mark(board, 'board', clickable);
  }
  label(scene, 'PREPARACIÓN', new THREE.Vector3(4.55, 1.2, -1.92), 0.9);
}
