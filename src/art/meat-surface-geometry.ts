import * as THREE from 'three';
import type { MeatModel } from '../sim/meat.ts';

export type SurfaceProfile = Partial<{
  edgeBlendM: number; topEdge: number; topCenter: number;
  bottomEdge: number; bottomCenter: number; rippleTop: number; rippleBottom: number
}>;

/** Malla cerrada con tapas subdivididas, relieve suave, borde afinado y UV compartidas. */
export function createMeatSurfaceGeometry(meat: MeatModel, profile: SurfaceProfile = {}): THREE.BufferGeometry {
  const settings = {
    edgeBlendM: 0.014, topEdge: 0.35, topCenter: 0.92, bottomEdge: 0.11,
    bottomCenter: 0.04, rippleTop: 0.07, rippleBottom: 0.018, ...profile
  };
  const { widthM: w, depthM: d } = meat.dimensions, thickness = meat.definition.thicknessM;
  const outline = meat.definition.outline.map(p => new THREE.Vector2(p.x * w, p.z * d));
  const points = outline.map(p => p.clone());
  let triangles = THREE.ShapeUtils.triangulateShape(outline, []);
  for(let level = 0;level < 3;level++) {
    const midpoints = new Map<string, number>();
    const middle = (a: number, b: number): number => {
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      let id = midpoints.get(key);
      if(id === undefined) { id = points.length; points.push(points[a].clone().add(points[b]).multiplyScalar(0.5)); midpoints.set(key, id); }
      return id;
    };
    triangles = triangles.flatMap(([a, b, c]) => {
      const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
      return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]];
    });
  }
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
  for(const top of [false, true]) for(const p of points) {
    const distance = Math.min(...outline.map((a, i) => {
      const b = outline[(i + 1) % outline.length], ab = b.clone().sub(a);
      const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      return p.distanceTo(a.clone().addScaledVector(ab, t));
    }));
    const edge = THREE.MathUtils.smoothstep(distance, 0, settings.edgeBlendM);
    const ripple = Math.sin(p.x * 71 + Math.sin(p.y * 37)) * Math.sin(p.y * 93 + p.x * 18);
    const y = top ? thickness * (settings.topEdge + (settings.topCenter - settings.topEdge) * edge + ripple * settings.rippleTop * edge)
      : thickness * (settings.bottomCenter + (settings.bottomEdge - settings.bottomCenter) * (1 - edge) + ripple * settings.rippleBottom * edge);
    vertices.push(p.x, y, -p.y);
    uvs.push(p.x / w + 0.5, 0.5 - p.y / d);
  }
  const n = points.length, geometry = new THREE.BufferGeometry();
  for(const [a, b, c] of triangles) indices.push(a, c, b);
  geometry.addGroup(0, indices.length, 0); // cara A inferior
  const topStart = indices.length;
  for(const [a, b, c] of triangles) indices.push(a + n, b + n, c + n);
  geometry.addGroup(topStart, indices.length - topStart, 1); // cara B superior
  const edges = new Map<string, { a: number; b: number; count: number }>();
  for(const [a, b, c] of triangles) for(const [from, to] of [[a, b], [b, c], [c, a]]) {
    const key = `${Math.min(from, to)}:${Math.max(from, to)}`;
    const edge = edges.get(key);
    if(edge) edge.count++;
    else edges.set(key, { a: from, b: to, count: 1 });
  }
  const sideStart = indices.length;
  for(const { a, b, count } of edges.values()) if(count === 1) indices.push(a, b, b + n, a, b + n, a + n);
  geometry.addGroup(sideStart, indices.length - sideStart, 2);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
