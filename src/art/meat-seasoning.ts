import * as THREE from 'three';
import type { Seasoning } from '../sim/seasoning.ts';
import type { MeatVisual } from './meat-visual.ts';

const colorBySeasoning: Record<Seasoning, number> = { salt: 0xfff5dd, chimichurri: 0x456127, brine: 0xc49142 };

/** Las marcas se adhieren a la superficie real y se mueven con la carne. */
export function addSeasoningMarks(view: MeatVisual, seasoning: Seasoning): THREE.Points[] {
  view.group.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(view.group);
  const size = bounds.getSize(new THREE.Vector3());
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const byMesh = new Map<THREE.Object3D, number[]>();
  const phase = seasoning === 'salt' ? 0.12 : seasoning === 'chimichurri' ? 0.36 : 0.68;
  for (let i = 0; i < 52; i++) {
    const x = bounds.min.x + ((i * 0.618 + phase) % 1) * size.x;
    const z = bounds.min.z + ((i * 0.414 + phase) % 1) * size.z;
    ray.set(new THREE.Vector3(x, bounds.max.y + 0.2, z), down);
    const hit = ray.intersectObjects(view.pickMeshes, false)[0];
    if (!hit) continue;
    const points = byMesh.get(hit.object) ?? [];
    hit.point.y += 0.0025;
    const local = hit.object.worldToLocal(hit.point);
    points.push(local.x, local.y, local.z);
    byMesh.set(hit.object, points);
  }
  return [...byMesh].map(([mesh, positions]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const dots = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: colorBySeasoning[seasoning], size: seasoning === 'salt' ? 0.010 : 0.008,
    }));
    dots.name = `condimento-${seasoning}`;
    mesh.add(dots);
    return dots;
  });
}
