import type { Point2 } from './meatCatalog.ts';
import type { MeatModel } from './meat.ts';

export type CutStroke = { from: Point2; to: Point2 };
export const signedDistance = (p: Point2, origin: Point2, normal: Point2) =>
  (p.x - origin.x) * normal.x + (p.z - origin.z) * normal.z;

/** Todas las marcas y trazos se guardan en metros sobre la pieza de origen. */
export function originalOutline(meat: MeatModel): Point2[] {
  const center = meat.portion?.centerM ?? { x: 0, z: 0 };
  return meat.definition.outline.map(p => ({
    x: center.x + p.x * meat.dimensions.widthM, z: center.z + p.z * meat.dimensions.depthM,
  }));
}

export function containsPoint(outline: readonly Point2[], p: Point2): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[j], b = outline[i];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < a.x + (p.z - a.z) * (b.x - a.x) / (b.z - a.z))
      inside = !inside;
  }
  return inside;
}

/** Inserta los dos puntos donde el trazo sale de la carne y conserva ambos arcos del contorno. */
export function splitOutline(outline: Point2[], stroke: CutStroke) {
  const dx = stroke.to.x - stroke.from.x, dz = stroke.to.z - stroke.from.z;
  const length = Math.hypot(dx, dz);
  if (!Number.isFinite(length) || length < 1e-6) return null;
  const along = { x: dx / length, z: dz / length }, normal = { x: -along.z, z: along.x };
  const polygon: Point2[] = [], crossings: { index: number; at: number }[] = [];
  function insert(p: Point2, onLine: boolean) {
    if (onLine) crossings.push({ index: polygon.length, at: signedDistance(p, stroke.from, along) });
    polygon.push(p);
  }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const da = signedDistance(a, stroke.from, normal), db = signedDistance(b, stroke.from, normal);
    insert(a, Math.abs(da) < 1e-9);
    if (Math.abs(da) >= 1e-9 && Math.abs(db) >= 1e-9 && (da < 0) !== (db < 0)) {
      const t = da / (da - db);
      insert({ x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) }, true);
    }
  }
  crossings.sort((a, b) => a.at - b.at);
  let best = 0, ends: [number, number] | undefined;
  for (let i = 1; i < crossings.length; i++) {
    const a = crossings[i - 1], b = crossings[i];
    const overlap = Math.min(length, b.at) - Math.max(0, a.at);
    const middle = (a.at + b.at) / 2;
    if (overlap <= best || !containsPoint(outline, { x: stroke.from.x + middle * along.x, z: stroke.from.z + middle * along.z })) continue;
    best = overlap; ends = [Math.min(a.index, b.index), Math.max(a.index, b.index)];
  }
  if (!ends) return null;
  const [a, b] = ends;
  const first = polygon.slice(a, b + 1), second = [...polygon.slice(b), ...polygon.slice(0, a + 1)];
  return { polygons: [first, second], normal, chord: { from: polygon[a], to: polygon[b] } };
}
