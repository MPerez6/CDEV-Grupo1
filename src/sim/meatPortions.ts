import { MeatModel, type MeatPortion } from './meat.ts';
import { polygonArea, type Point2 } from './meatCatalog.ts';
import { intersectPolygons } from './meatFootprint.ts';

function clipX(outline: readonly Point2[], x: number, side: -1 | 1): Point2[] {
  const min = side === -1 ? -1 : x, max = side === -1 ? x : 1;
  const points = intersectPolygons(outline, [{ x: min, z: -1 }, { x: max, z: -1 }, { x: max, z: 1 }, { x: min, z: 1 }]);
  return points.filter((p, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    return Math.hypot(previous.x - p.x, previous.z - p.z) > 1e-10;
  });
}

/** Un solo corte transversal: dos áreas iguales, sin perder masa ni espesor. */
export function halveMeat(meat: MeatModel): [MeatModel, MeatModel] | null {
  if (meat.portion) return null;
  const original = meat.definition;
  let line = 0;
  if (original.geometry === 'flat') {
    const halfArea = polygonArea(original.outline) / 2;
    let left = -0.5, right = 0.5;
    for (let i = 0; i < 42; i++) {
      line = (left + right) / 2;
      if (polygonArea(clipX(original.outline, line, -1)) < halfArea) left = line;
      else right = line;
    }
  }
  function makeHalf(side: -1 | 1): MeatModel {
    const outline = clipX(original.outline, line, side);
    const minX = Math.min(...outline.map(p => p.x)), maxX = Math.max(...outline.map(p => p.x));
    const minZ = Math.min(...outline.map(p => p.z)), maxZ = Math.max(...outline.map(p => p.z));
    const dx = maxX - minX, dz = maxZ - minZ, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const { widthM, depthM } = meat.dimensions;
    const portion: MeatPortion = {
      sourceId: meat.id, side, centerM: { x: cx * widthM, z: cz * depthM },
      uv: { u0: minX + 0.5, u1: maxX + 0.5, v0: 0.5 - maxZ, v1: 0.5 - minZ },
      definition: {
        ...original,
        massKg: original.massKg / 2,
        aspectRatio: dx * widthM / (dz * depthM),
        outline: outline.map(p => ({ x: (p.x - cx) / dx, z: (p.z - cz) / dz })),
        boneCount: side === -1 ? Math.floor(original.boneCount / 2) : Math.ceil(original.boneCount / 2),
      },
    };
    const half = new MeatModel(original.kind, portion);
    half.layersC.splice(0, half.layersC.length, ...meat.layersC);
    Object.assign(half.brown, meat.brown);
    Object.assign(half.burn, meat.burn);
    Object.assign(half.surfaceC, meat.surfaceC);
    Object.assign(half.casingDamage, meat.casingDamage);
    half.juiciness = meat.juiciness;
    half.faceDown = meat.faceDown;
    half.totalSimSeconds = meat.totalSimSeconds;
    half.hasReceivedGrillHeat = meat.hasReceivedGrillHeat;
    half.seasonings.push(...meat.seasonings);
    return half;
  }
  return [makeHalf(-1), makeHalf(1)];
}
