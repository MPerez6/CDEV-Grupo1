import { CONFIG } from './parameters.ts';
import { polygonArea, type Point2 } from './meatCatalog.ts';
import type { MeatModel } from './meat.ts';

export function meatFootprint(meat: MeatModel, center = meat.positionM, turns = meat.quarterTurns): Point2[] {
  const angle = turns * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle);
  const outline = meat.definition.outline.map(point => {
    const x = point.x * meat.dimensions.widthM;
    const z = point.z * meat.dimensions.depthM * (meat.faceDown === 'a' ? 1 : -1);
    return { x: center.x + x * c - z * s, z: center.z + x * s + z * c };
  });
  return meat.faceDown === 'a' ? outline : outline.reverse();
}

/** Intersección de polígonos convexos antihorarios, sin aproximar por sector central. */
export function intersectPolygons(subject: readonly Point2[], clip: readonly Point2[]): Point2[] {
  let output = [...subject];
  for (let i = 0; i < clip.length && output.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const distance = (p: Point2) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    const input = output;
    output = [];
    let start = input[input.length - 1], ds = distance(start);
    for (const end of input) {
      const de = distance(end);
      if ((ds >= 0) !== (de >= 0)) {
        const t = ds / (ds - de);
        output.push({ x: start.x + t * (end.x - start.x), z: start.z + t * (end.z - start.z) });
      }
      if (de >= 0) output.push(end);
      start = end; ds = de;
    }
  }
  return output;
}

/** Triangulación de un contorno simple antihorario: admite recortes cóncavos del matambre. */
export function triangulatePolygon(polygon: readonly Point2[]): Point2[][] {
  const vertices = [...polygon], triangles: Point2[][] = [];
  const cross = (a: Point2, b: Point2, c: Point2) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  while (vertices.length > 3) {
    const ear = vertices.findIndex((b, i) => {
      const a = vertices[(i + vertices.length - 1) % vertices.length], c = vertices[(i + 1) % vertices.length];
      return cross(a, b, c) > 1e-12 && !vertices.some(p => p !== a && p !== b && p !== c
        && cross(a, b, p) >= -1e-12 && cross(b, c, p) >= -1e-12 && cross(c, a, p) >= -1e-12);
    });
    if (ear < 0) throw new Error('El contorno de carne debe ser simple y antihorario');
    triangles.push([vertices[(ear + vertices.length - 1) % vertices.length], vertices[ear], vertices[(ear + 1) % vertices.length]]);
    vertices.splice(ear, 1);
  }
  if (vertices.length === 3) triangles.push(vertices);
  return triangles;
}

export function polygonOverlapArea(a: readonly Point2[], b: readonly Point2[]): number {
  const ta = triangulatePolygon(a), tb = triangulatePolygon(b);
  return ta.reduce((sum, triangleA) => sum + tb.reduce((subtotal, triangleB) =>
    subtotal + polygonArea(intersectPolygons(triangleA, triangleB)), 0), 0);
}
export function sectorPolygon(index: number): Point2[] {
  const dx = CONFIG.grillWidthM / CONFIG.gridColumns, dz = CONFIG.grillDepthM / CONFIG.gridRows;
  const x = (index % CONFIG.gridColumns) * dx, z = Math.floor(index / CONFIG.gridColumns) * dz;
  return [{ x, z }, { x: x + dx, z }, { x: x + dx, z: z + dz }, { x, z: z + dz }];
}
export function footprintCoverage(meat: MeatModel): { index: number; areaM2: number; weight: number }[] {
  const polygon = meatFootprint(meat);
  const triangles = triangulatePolygon(polygon);
  const coverage = [];
  for (let index = 0; index < CONFIG.gridColumns * CONFIG.gridRows; index++) {
    const sector = sectorPolygon(index);
    const areaM2 = triangles.reduce((sum, triangle) => sum + polygonArea(intersectPolygons(triangle, sector)), 0);
    if (areaM2 > 1e-12) coverage.push({ index, areaM2, weight: areaM2 / meat.dimensions.areaM2 });
  }
  return coverage;
}
