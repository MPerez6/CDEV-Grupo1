import { isFuelBurning, type FuelPiece } from '../sim/embers.ts';

/** Cuánto humo sale de una fuente: `amount` 0..1 (caudal) y `darkness` 0..1 (blanco → gris oscuro). */
export interface SmokeLevel { amount: number; darkness: number }

export interface BrazierSmokeState {
  lit: boolean;
  tinderBurning: boolean;
  tinderFraction: number;
  fuel: readonly FuelPiece[];
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Caudal por pieza que arde: la leña humea mucho al prender y casi nada como brasa; el carbón, poco. */
const BURNING_WEIGHT: Record<FuelPiece['kind'], number> = { 'large-wood': 0.45, 'small-wood': 0.32, charcoal: 0.12 };
/** Pieza calentándose sin llama todavía: la leña "suda" humo blanco antes de prender. */
const HEATING_WEIGHT: Record<FuelPiece['kind'], number> = { 'large-wood': 0.12, 'small-wood': 0.1, charcoal: 0.04 };
/** Hilo mínimo de humo mientras quede fuego vivo. */
const LIT_FLOOR = 0.04;

/**
 * Humo del brasero según su estado. El papel y las ramitas dan la bocanada más densa;
 * a medida que el combustible madura a brasa el humo se apaga hasta un hilo.
 */
export function brazierSmoke(state: BrazierSmokeState): SmokeLevel {
  if(!state.lit) return { amount: 0, darkness: 0 };
  let amount = state.tinderBurning ? 0.55 + 0.4 * clamp01(state.tinderFraction) : 0;
  let wood = state.tinderBurning ? 1 : 0;
  for(const piece of state.fuel) {
    const remaining = 1 - clamp01(piece.progress);
    if(isFuelBurning(piece)) {
      const share = BURNING_WEIGHT[piece.kind] * Math.pow(remaining, 0.7);
      amount += share;
      if(piece.kind !== 'charcoal') wood += share;
    } else if(piece.progress > 0.02) {
      amount += HEATING_WEIGHT[piece.kind];
    }
  }
  amount = Math.max(LIT_FLOOR, clamp01(amount));
  // Humo de leña verde/papel: algo más gris que el velo azulado del carbón.
  return { amount, darkness: wood > 0 ? 0.18 : 0.05 };
}

/** Temperatura de superficie a la que la grasa empieza a derretirse y gotear sobre las brasas. */
const FAT_RENDER_C = 75;
const FAT_RENDER_RANGE_C = 55;
/** Flujo típico de buenas brasas bajo la pieza (W/m²). */
const GOOD_FLUX_WM2 = 3500;
/** Quemado (0..100) a partir del cual el humo ya es negro y espeso. */
const HEAVY_BURN = 35;

/**
 * Humo de una pieza en la parrilla: la grasa que gotea sobre brasa da humo blanco;
 * el quemado lo vuelve espeso y oscuro. Fuera de la parrilla (flujo 0) no humea.
 */
export function meatSmoke(fluxWm2: number, surfaceC: number, burn: number): SmokeLevel {
  if(fluxWm2 <= 0) return { amount: 0, darkness: 0 };
  const sizzle = clamp01((surfaceC - FAT_RENDER_C) / FAT_RENDER_RANGE_C) * clamp01(fluxWm2 / GOOD_FLUX_WM2);
  const charred = clamp01(burn / HEAVY_BURN);
  return { amount: clamp01(0.5 * sizzle + 0.6 * charred), darkness: clamp01(burn / 50) };
}
