import * as THREE from 'three';
import { ASADOR_LAYOUT } from '../level/asador.ts';

/**
 * Lluvia: gotas como líneas finas en una caja que sigue al jugador. Bajo la campana del asador no llueve.
 * `update` fija la intensidad (0..1) y el centro; `animate` hace caer las gotas.
 */
const DROPS = 1400;
const RADIUS = 11;
const TOP = 9;
const LENGTH = 0.32;
const SPEED = 9.5;
const SLANT = 0.12;

export function createRain(scene: THREE.Scene) {
  const positions = new Float32Array(DROPS * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xb4c2d2, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);
  const center = new THREE.Vector3();
  let seed = 12345;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const covered = (x: number, z: number) => {
    const b = ASADOR_LAYOUT.bounds;
    return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;
  };
  function respawn(i: number, y: number): void {
    let x = 0, z = 0;
    for(let tries = 0;tries < 6;tries++) {
      x = center.x + (rand() * 2 - 1) * RADIUS; z = center.z + (rand() * 2 - 1) * RADIUS;
      if(!covered(x, z)) break;
    }
    const o = i * 6;
    positions[o] = x; positions[o + 1] = y; positions[o + 2] = z;
    positions[o + 3] = x + SLANT * LENGTH; positions[o + 4] = y - LENGTH; positions[o + 5] = z;
  }
  for(let i = 0;i < DROPS;i++) respawn(i, rand() * TOP);
  let level = 0;
  return {
    update(rain: number, around: THREE.Vector3): void {
      level = rain;
      center.set(around.x, 0, around.z);
      material.opacity = 0.5 * Math.min(1, rain * 1.4);
      lines.visible = rain > 0.03;
      geometry.setDrawRange(0, Math.floor(DROPS * Math.min(1, rain)) * 2);
    },
    animate(dt: number): void {
      if(!lines.visible || dt <= 0) return;
      const fall = SPEED * dt * (0.8 + level * 0.4);
      const count = Math.floor(DROPS * Math.min(1, level));
      for(let i = 0;i < count;i++) {
        const o = i * 6;
        positions[o + 1] -= fall; positions[o + 4] -= fall;
        positions[o] += SLANT * fall; positions[o + 3] += SLANT * fall;
        const x = positions[o], z = positions[o + 2];
        if(positions[o + 4] < 0 || covered(x, z) || Math.abs(x - center.x) > RADIUS || Math.abs(z - center.z) > RADIUS) respawn(i, TOP * (0.6 + rand() * 0.4));
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
