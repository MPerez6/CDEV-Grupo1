import * as THREE from 'three';
import type { FuelPiece } from '../sim/embers.ts';
// Agrupar caras por altura permite mostrar rojo abajo y zonas negras arriba.
// Es representación del progreso de cada pieza, no otro modelo térmico.
function bandedGeometry(geometry: THREE.BufferGeometry, radius: number, endCaps: boolean): THREE.BufferGeometry {
  const buckets = Array.from({ length: endCaps ? 5 : 4 }, () => ({ points: [] as number[], normals: [] as number[] }));
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  for(let i = 0;i < positions.count;i += 3) {
    const end = endCaps && geometry.groups.some(g => (g.materialIndex ?? 0) > 0 && i >= g.start && i < g.start + g.count);
    const y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
    const band = end ? 4 : Math.max(0, Math.min(3, Math.floor((y / radius + 1) * 2)));
    for(let v = i;v < i + 3;v++) {
      buckets[band].points.push(positions.getX(v), positions.getY(v), positions.getZ(v));
      buckets[band].normals.push(normals.getX(v), normals.getY(v), normals.getZ(v));
    }
  }
  const result = new THREE.BufferGeometry();
  const points: number[] = [], normalValues: number[] = [];
  buckets.forEach((bucket, band) => {
    result.addGroup(points.length / 3, bucket.points.length / 3, band);
    points.push(...bucket.points);
    normalValues.push(...bucket.normals);
  });
  result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normalValues, 3));
  geometry.dispose();
  return result;
}
export function createFuelModel(piece: FuelPiece) {
  const group = new THREE.Group();
  const coal = piece.kind === 'charcoal';
  const materials = Array.from({ length: coal ? 4 : 5 }, (_, i) => new THREE.MeshStandardMaterial({
    color: coal ? 0x242426 : i === 4 ? 0xad7946 : 0x60412a, roughness: 1,
  }));
  if(coal) {
    const geometry = new THREE.DodecahedronGeometry(0.13, 0);
    geometry.rotateX(piece.id * 0.7);
    geometry.rotateY(piece.id * 1.3);
    const mesh = new THREE.Mesh(bandedGeometry(geometry, 0.13, false), materials);
    mesh.scale.set(1.6, 0.8 + (piece.id % 3) * 0.1, 0.83);
    mesh.castShadow = true;
    group.add(mesh);
  } else {
    const radius = piece.kind === 'large-wood' ? 0.125 : 0.072;
    const length = piece.kind === 'large-wood' ? 0.82 : 0.38;
    const raw = new THREE.CylinderGeometry(radius * 0.87, radius, length, 9);
    const geometry = raw.toNonIndexed();
    raw.dispose();
    geometry.rotateZ(Math.PI / 2);
    const log = new THREE.Mesh(bandedGeometry(geometry, radius, true), materials);
    log.castShadow = true;
    group.add(log);
    for(const x of [-length / 2 - 0.001, length / 2 + 0.001]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.57, 0.004, 4, 16), materials[1]);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = x;
      group.add(ring);
    }
  }
  return { group, materials };
}
