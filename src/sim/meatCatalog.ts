import { CONFIG } from './parameters.ts';
export const MEAT_KINDS = ['matambre', 'vacio', 'costilla', 'falda', 'chorizo', 'morcilla'] as const;
export type MeatKind = typeof MEAT_KINDS[number];
export type Point2 = Readonly<{ x: number; z: number }>;
export type MeatDefinition = Readonly<{
  kind: MeatKind; name: string; geometry: 'flat' | 'cylinder'; massKg: number; thicknessM: number;
  densityKgM3: number; specificHeatJKgK: number; conductivityWmK: number; absorptivity: number;
  aspectRatio: number; outline: readonly Point2[]; recommendedFluxWm2: readonly [number, number];
  target: Readonly<{ minC: number; maxC: number | null }> | null;
  precooked: boolean; fatCover: number; boneCount: number; casingSensitivity: number; rawColor: number;
}>;
// PROVISIONAL: objetivos de jugabilidad, no certificación de inocuidad.
const rectangle = [{ x: -0.5, z: -0.5 }, { x: 0.5, z: -0.5 }, { x: 0.5, z: 0.5 }, { x: -0.5, z: 0.5 }];
const base = {
  densityKgM3: CONFIG.meatDensityKgM3, specificHeatJKgK: CONFIG.meatSpecificHeatJKgK,
  conductivityWmK: CONFIG.meatConductivityWmK, absorptivity: CONFIG.meatAbsorptivity,
  geometry: 'flat' as const, aspectRatio: 1.7, outline: rectangle,
  target: { minC: 68, maxC: 74 }, precooked: false,
  fatCover: 0, boneCount: 0, casingSensitivity: 0, rawColor: 0xb75b62,
};
export const MEAT_CATALOG: Readonly<Record<MeatKind, MeatDefinition>> = {
  matambre: { ...base, kind: 'matambre', name: 'Matambre', massKg: 1.5, thicknessM: 0.015,
    recommendedFluxWm2: [3000, 5500], outline: [
      { x: -0.43, z: -0.43 }, { x: -0.24, z: -0.46 }, { x: 0.02, z: -0.44 },
      { x: 0.20, z: -0.5 }, { x: 0.39, z: -0.46 }, { x: 0.43, z: -0.31 },
      { x: 0.49, z: -0.23 }, { x: 0.5, z: -0.08 }, { x: 0.45, z: 0.05 },
      { x: 0.39, z: 0.17 }, { x: 0.36, z: 0.30 }, { x: 0.37, z: 0.48 },
      { x: 0.29, z: 0.5 }, { x: 0.17, z: 0.41 }, { x: 0.10, z: 0.28 },
      { x: -0.03, z: 0.15 }, { x: -0.16, z: 0.11 }, { x: -0.33, z: 0.17 },
      { x: -0.46, z: 0.20 }, { x: -0.5, z: 0.11 }, { x: -0.48, z: -0.04 },
      { x: -0.44, z: -0.17 },
    ].map(({ x, z }) => ({ x, z: -z })).reverse() },
  vacio: { ...base, kind: 'vacio', name: 'Vacío', massKg: 1.8, thicknessM: 0.035,
    aspectRatio: 2.1, conductivityWmK: 0.42, fatCover: 0.65, rawColor: 0x973e40, recommendedFluxWm2: [4000, 7000],
    outline: [{ x: -0.5, z: -0.15 }, { x: -0.46, z: -0.30 }, { x: -0.30, z: -0.27 },
      { x: -0.15, z: -0.44 }, { x: 0.06, z: -0.5 }, { x: 0.29, z: -0.46 },
      { x: 0.44, z: -0.31 }, { x: 0.5, z: -0.08 }, { x: 0.46, z: 0.16 },
      { x: 0.34, z: 0.36 }, { x: 0.14, z: 0.47 }, { x: -0.12, z: 0.5 },
      { x: -0.34, z: 0.39 }, { x: -0.47, z: 0.33 }, { x: -0.5, z: 0.17 }] },
  costilla: { ...base, kind: 'costilla', name: 'Tira de asado', massKg: 1.2, thicknessM: 0.03,
    aspectRatio: 3.4, boneCount: 5, fatCover: 0.18, conductivityWmK: 0.36,
    specificHeatJKgK: 3500, recommendedFluxWm2: [3000, 6000] },
  falda: { ...base, kind: 'falda', name: 'Falda', massKg: 1.2, thicknessM: 0.025,
    aspectRatio: 2.1, fatCover: 0.3, rawColor: 0xa44a4b, recommendedFluxWm2: [4000, 6500],
    outline: [{ x: -0.5, z: -0.12 }, { x: -0.24, z: -0.48 }, { x: 0.22, z: -0.5 },
      { x: 0.5, z: -0.13 }, { x: 0.33, z: 0.38 }, { x: -0.32, z: 0.5 }] },
  chorizo: { ...base, kind: 'chorizo', name: 'Chorizo', geometry: 'cylinder', massKg: 0.15,
    thicknessM: 0.032, target: { minC: 71, maxC: null }, casingSensitivity: 0.7,
    rawColor: 0xcc887c, recommendedFluxWm2: [4500, 7500] },
  morcilla: { ...base, kind: 'morcilla', name: 'Morcilla', geometry: 'cylinder', massKg: 0.14,
    thicknessM: 0.032, target: null, precooked: true, casingSensitivity: 1.5,
    rawColor: 0x302325, recommendedFluxWm2: [2500, 4500] },
};
export const MEAT_THERMAL = {
  lowerConvectionFactor: 0.35, surfaceFluxFactor: 0.025,
  evaporationStartC: 85, evaporationGPerDegreeSecond: 0.00004,
  evaporationJuiceCap: 0.05, latentHeatJKg: 2_260_000, juiceLossPerG: 0.7,
  browningBands: [[120, 0], [140, 0.005], [160, 0.06], [180, 0.15], [200, 0.4], [Infinity, 0.75]] as const,
  drySurfaceStartC: 100, drySurfaceRangeC: 70, minDryFactor: 0.1,
  burnStartC: 210, burnMinBrown: 60, burnRate: 0.3, burnRangeC: 30,
  casingStartC: 165, casingRate: 0.025, burnedThreshold: 30,
  dryCenterC: 85, dryJuice: 30, undercookedCenterC: 45, objectiveMaxBurn: 10, objectiveMinJuice: 35,
} as const;
export function polygonArea(polygon: readonly Point2[]): number {
  return Math.abs(polygon.reduce((sum, a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return sum + a.x * b.z - b.x * a.z;
  }, 0)) / 2;
}
export function meatDimensions(def: MeatDefinition): { widthM: number; depthM: number; areaM2: number } {
  if (def.geometry === 'cylinder') {
    const radius = def.thicknessM / 2;
    const length = def.massKg / (def.densityKgM3 * Math.PI * radius * radius);
    return { widthM: length, depthM: def.thicknessM, areaM2: length * def.thicknessM };
  }
  const areaM2 = def.massKg / (def.densityKgM3 * def.thicknessM);
  const widthM = Math.sqrt(areaM2 * def.aspectRatio / polygonArea(def.outline));
  return { widthM, depthM: widthM / def.aspectRatio, areaM2 };
}
