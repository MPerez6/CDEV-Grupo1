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
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = [], edgeWeights: number[] = [];
  for(const top of [false, true]) for(const p of points) {
    const distance = Math.min(...outline.map((a, i) => {
      const b = outline[(i + 1) % outline.length], ab = b.clone().sub(a);
      const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      return p.distanceTo(a.clone().addScaledVector(ab, t));
    }));
    const portion = meat.portion;
    const cutEdge = portion?.cuts.some(cut => Math.abs((p.x + portion.centerM.x - cut.point.x) * cut.normal.x
      + (p.y + portion.centerM.z - cut.point.z) * cut.normal.z) < 1e-7);
    const edge = cutEdge ? 1 : THREE.MathUtils.smoothstep(distance, 0, settings.edgeBlendM);
    const ripple = Math.sin(p.x * 71 + Math.sin(p.y * 37)) * Math.sin(p.y * 93 + p.x * 18);
    const y = top ? thickness * (settings.topEdge + (settings.topCenter - settings.topEdge) * edge + ripple * settings.rippleTop * edge)
      : thickness * (settings.bottomCenter + (settings.bottomEdge - settings.bottomCenter) * (1 - edge) + ripple * settings.rippleBottom * edge);
    vertices.push(p.x, y, -p.y);
    edgeWeights.push(edge); // 0 en el contorno, 1 en el centro: el sombreado oscurece los bordes
    const u = p.x / w + 0.5, v = 0.5 - p.y / d;
    const crop = meat.portion?.uv;
    uvs.push(crop ? THREE.MathUtils.lerp(crop.u0, crop.u1, u) : u,
      crop ? THREE.MathUtils.lerp(crop.v0, crop.v1, v) : v);
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
  const fresh: {a:number;b:number}[] = [];
  for(const { a, b, count } of edges.values()) if(count === 1) {
    const portion = meat.portion;
    const isCut = portion?.cuts.some(c => [points[a],points[b]].every(p =>
      Math.abs((p.x + portion.centerM.x - c.point.x)*c.normal.x + (p.y + portion.centerM.z - c.point.z)*c.normal.z) < 1e-7));
    if (isCut) fresh.push({a,b});
    else indices.push(a, b, b + n, a, b + n, a + n);
  }
  geometry.addGroup(sideStart, indices.length - sideStart, 2);
  const freshStart = indices.length;
  for (const {a,b} of fresh) {
    const start = vertices.length/3;
    const dx=points[b].x-points[a].x, dz=points[b].y-points[a].y, length=Math.hypot(dx,dz);
    if (length < 1e-10) continue;
    for (const i of [a,b,b+n,a+n]) {
      const px=vertices[3*i], py=vertices[3*i+1], pz=vertices[3*i+2];
      vertices.push(px,py,pz); edgeWeights.push(1);
      uvs.push((px*dx-pz*dz)/length*18,py*30);
    }
    indices.push(start,start+1,start+2,start,start+2,start+3);
  }
  if (indices.length > freshStart) geometry.addGroup(freshStart,indices.length-freshStart,3);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('meatEdge', new THREE.Float32BufferAttribute(edgeWeights, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
