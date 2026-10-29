import * as THREE from 'three';
export const PREP_TABLE_BOUNDS = { x0: 2.25, x1: 6.85, z0: -4.85, z1: -1.95 };
export function boardPosition(slot: number): THREE.Vector3 {
  return new THREE.Vector3(3.0 + slot % 3 * 1.5, 1.105, -2.45 - Math.floor(slot / 3) * 0.95);
}


export const GRILL_LAYOUT = { left: -1.3, front: -3.55, width: 2.6, depth: 2.0 };
