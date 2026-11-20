import * as THREE from 'three';
import type { MeatPortion } from '../sim/meat.ts';

type Vertex = { p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 };
type Face = { points: Vertex[]; material: number };

/** Recorta tripas, ataduras y huesos reales en el mismo plano que el contorno térmico. */
export function clipFoodDetails(meshes: THREE.Mesh[], cut: MeatPortion, interior: THREE.Material): void {
  const originals = new Set<THREE.BufferGeometry>();
  for (const mesh of [...meshes]) {
    mesh.updateMatrix();
    const geo = mesh.geometry, pos = geo.attributes.position, norm = geo.attributes.normal, uv = geo.attributes.uv;
    originals.add(geo);
    const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrix);
    const vertices: Vertex[] = Array.from({ length: pos.count }, (_, i) => ({
      p: new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrix),
      n: new THREE.Vector3().fromBufferAttribute(norm, i).applyNormalMatrix(nm),
      uv: uv ? new THREE.Vector2(uv.getX(i), uv.getY(i)) : new THREE.Vector2(),
    }));
    const indices = geo.index?.array ?? vertices.map((_, i) => i);
    let faces: Face[] = [];
    for (let i = 0; i < indices.length; i += 3) faces.push({
      points: [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]], material: 0,
    });
    for (const plane of cut.cuts) {
      const inward = new THREE.Vector3(plane.normal.x, 0, -plane.normal.z);
      const distance = (p: THREE.Vector3) => inward.dot(p) - plane.normal.x * plane.point.x - plane.normal.z * plane.point.z;
      const kept: Face[] = [], rim = new Map<string, THREE.Vector3>();
      for (const face of faces) {
        const poly: Vertex[] = [];
        let a = face.points[face.points.length - 1], da = distance(a.p);
        for (const b of face.points) {
          const db = distance(b.p);
          if ((da >= 0) !== (db >= 0)) {
            const t = da / (da - db), p = a.p.clone().lerp(b.p, t);
            poly.push({ p, n: a.n.clone().lerp(b.n, t).normalize(), uv: a.uv.clone().lerp(b.uv, t) });
            rim.set([p.x, p.y, p.z].map(x => Math.round(x * 1e7)).join(','), p);
          }
          if (db >= 0) poly.push(b);
          a = b; da = db;
        }
        if (poly.length >= 3) kept.push({ points: poly, material: face.material });
      }
      if (rim.size >= 3) {
        const points = [...rim.values()], center = new THREE.Vector3();
        for (const p of points) center.add(p);
        center.multiplyScalar(1 / points.length);
        const across = new THREE.Vector3(inward.z, 0, -inward.x), outward = inward.clone().negate();
        const planar = (p: THREE.Vector3) => new THREE.Vector2(across.dot(p.clone().sub(center)), p.y - center.y);
        points.sort((a, b) => planar(a).angle() - planar(b).angle());
        for (const triangle of THREE.ShapeUtils.triangulateShape(points.map(planar), [])) {
          const [a, b, c] = triangle.map(i => points[i]);
          const positive = b.clone().sub(a).cross(c.clone().sub(a)).dot(outward) > 0;
          kept.push({ points: (positive ? [a, b, c] : [a, c, b]).map(p => ({
            p, n: outward, uv: planar(p).multiplyScalar(38),
          })), material: 1 });
        }
      }
      faces = kept;
    }
    if (!faces.length) {
      mesh.removeFromParent(); meshes.splice(meshes.indexOf(mesh), 1); continue;
    }
    const points: number[] = [], normals: number[] = [], uvs: number[] = [];
    const result = new THREE.BufferGeometry();
    for (const material of [0, 1]) {
      const start = points.length / 3;
      for (const face of faces) if (face.material === material) {
        for (let i = 1; i < face.points.length - 1; i++) for (const v of [face.points[0], face.points[i], face.points[i + 1]]) {
          points.push(v.p.x - cut.centerM.x, v.p.y, v.p.z + cut.centerM.z);
          normals.push(v.n.x, v.n.y, v.n.z); uvs.push(v.uv.x, v.uv.y);
        }
      }
      if (points.length / 3 > start) result.addGroup(start, points.length / 3 - start, material);
    }
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    result.computeBoundingSphere();
    mesh.position.set(0, 0, 0); mesh.quaternion.identity(); mesh.scale.setScalar(1);
    mesh.geometry = result; mesh.material = [mesh.material as THREE.Material, interior];
  }
  for (const geometry of originals) geometry.dispose();
}
