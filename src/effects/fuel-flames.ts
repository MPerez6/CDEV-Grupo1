import * as THREE from 'three';
import type { FuelPiece } from '../sim/embers.ts';

export function createFuelFlames(piece: FuelPiece): THREE.Group {
  const coal = piece.kind === 'charcoal';
  const fire = new THREE.Group();
  fire.name = 'fuel-fire';
  for(let i = 0;i < 3;i++) {
    const height = coal ? 0.18 : 0.48 + (i % 2) * 0.16;
    const geometry = new THREE.ConeGeometry(coal ? 0.045 : 0.07, height, 7);
    geometry.translate(0, height / 2, 0);
    const tongue = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xffc34a : 0xff7922, transparent: true, opacity: 0.65, depthWrite: false,
    }));
    tongue.position.set((i - 1) * (coal ? 0.06 : piece.kind === 'large-wood' ? 0.19 : 0.10), 0.02, (i % 2) * 0.04);
    fire.add(tongue);
  }
  return fire;
}
