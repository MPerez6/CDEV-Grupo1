import { MeatModel, type MeatPortion } from './meat.ts';
import { MEAT_CATALOG, meatDimensions, polygonArea, type Point2 } from './meatCatalog.ts';
import { containsPoint, originalOutline, signedDistance, splitOutline, type CutStroke } from './cutOutline.ts';

function equalAreaStroke(outline: Point2[]): CutStroke {
  let low = Math.min(...outline.map(p => p.x)), high = Math.max(...outline.map(p => p.x));
  const half = polygonArea(outline) / 2;
  let x = 0;
  for (let i = 0; i < 44; i++) {
    x = (low + high) / 2;
    const halves = splitOutline(outline, { from: { x, z: -1 }, to: { x, z: 1 } })!;
    const left = halves.polygons.find(points => points.some(p => p.x < x - 1e-9))!;
    if (polygonArea(left) < half) low = x;
    else high = x;
  }
  return { from: { x, z: -1 }, to: { x, z: 1 } };
}

/** Sin trazo explícito mantiene el reparto por mitades de las demostraciones anteriores. */
export function halveMeat(meat: MeatModel, stroke?: CutStroke): [MeatModel, MeatModel] | null {
  if (!stroke && meat.portion) return null;
  const outline = originalOutline(meat);
  const split = splitOutline(outline, stroke ?? equalAreaStroke(outline));
  if (!split) return null;
  const original = meat.definition, whole = MEAT_CATALOG[original.kind], source = meatDimensions(whole);
  const fraction = stroke ? polygonArea(split.polygons[0]) / polygonArea(outline) : 0.5;
  if (!Number.isFinite(fraction) || Math.min(fraction, 1 - fraction) < 1e-7) return null;
  const parts = split.polygons.map((points, i) => {
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
    const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z));
    const widthM = maxX - minX, depthM = maxZ - minZ, x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
    const p = split.chord.from;
    // El primer vértice interior al arco indica hacia dónde separar esa porción.
    const inside = points.slice(1, -1).find(v => Math.abs(signedDistance(v, p, split.normal)) > 1e-9)!;
    const side = Math.sign(signedDistance(inside, p, split.normal)) as -1 | 1;
    const normal = { x: side * split.normal.x, z: side * split.normal.z };
    const share = i === 0 ? fraction : 1 - fraction;
    const firstBones = Math.round(original.boneCount * fraction);
    const portion: MeatPortion = {
      sourceId: meat.portion?.sourceId ?? meat.id, side, centerM: { x, z },
      boardCenterM: {
        x: (meat.portion?.boardCenterM.x ?? 0) + x - (meat.portion?.centerM.x ?? 0) + normal.x * .009,
        z: (meat.portion?.boardCenterM.z ?? 0) + (z - (meat.portion?.centerM.z ?? 0) + normal.z * .009) * (meat.faceDown === 'a' ? 1 : -1),
      },
      cuts: [...(meat.portion?.cuts ?? []), { point: p, normal }],
      dimensions: { widthM, depthM, areaM2: meat.dimensions.areaM2 * share },
      uv: { u0: minX / source.widthM + .5, u1: maxX / source.widthM + .5,
        v0: .5 - maxZ / source.depthM, v1: .5 - minZ / source.depthM },
      definition: { ...original, massKg: original.massKg * share, aspectRatio: widthM / depthM,
        outline: points.map(v => ({ x: (v.x - x) / widthM, z: (v.z - z) / depthM })),
        boneCount: i === 0 ? firstBones : original.boneCount - firstBones },
    };
    const part = new MeatModel(original.kind, portion);
    part.layersC.splice(0, part.layersC.length, ...meat.layersC);
    Object.assign(part.brown, meat.brown);
    Object.assign(part.burn, meat.burn);
    Object.assign(part.surfaceC, meat.surfaceC);
    Object.assign(part.casingDamage, meat.casingDamage);
    part.juiciness = meat.juiciness;
    part.faceDown = meat.faceDown;
    part.totalSimSeconds = meat.totalSimSeconds;
    part.hasReceivedGrillHeat = meat.hasReceivedGrillHeat;
    return part;
  });
  // Un grano sobre el filo queda en una sola porción.
  for (const grain of meat.grains) parts[containsPoint(split.polygons[0], grain.point) ? 0 : 1].grains.push(grain);
  for (const part of parts) {
    for (const kind of meat.seasonings) {
      if (part.grains.some(g => g.kind === kind) || !meat.grains.some(g => g.kind === kind)) part.seasonings.push(kind);
    }
  }
  parts.sort((a, b) => a.portion!.centerM.x - b.portion!.centerM.x);
  return [parts[0], parts[1]];
}
