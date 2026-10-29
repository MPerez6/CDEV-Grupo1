import { CONFIG } from './parameters.ts';
import { MEAT_CATALOG, MEAT_THERMAL as P, meatDimensions, type MeatKind } from './meatCatalog.ts';
export type Side = 'a' | 'b';
export type MeatState = 'raw' | 'undercooked' | 'cooked' | 'dry' | 'burned' | 'precooked' | 'reheating';
let nextMeatId = 1;
/** Cinco volúmenes: planos de una cara a otra, cilindros de envoltura a centro.
 * Propiedades, contacto, evaporación y dorado PROVISIONALES. */
export class MeatModel {
  public readonly id = nextMeatId++;
  public readonly definition;
  public readonly dimensions;
  public readonly layersC: number[] = Array(CONFIG.meatLayerCount).fill(CONFIG.meatInitialC);
  public readonly layerMassKg: number[];
  public readonly conductanceWK: number[];
  public readonly brown: Record<Side, number> = { a: 0, b: 0 };
  public readonly burn: Record<Side, number> = { a: 0, b: 0 };
  public readonly surfaceC: Record<Side, number> = { a: CONFIG.meatInitialC, b: CONFIG.meatInitialC };
  public readonly casingDamage: Record<Side, number> = { a: 0, b: 0 };
  public juiciness = 100;
  public faceDown: Side = 'a';
  public location: 'board' | 'carried' | 'grill' = 'board';
  public positionM = { x: CONFIG.grillWidthM / 2, z: CONFIG.grillDepthM / 2 };
  public quarterTurns = 0;
  public boardSlot = 0;
  public totalSimSeconds = 0;
  public hasReceivedGrillHeat = false;
  constructor(kind: MeatKind = 'matambre') {
    this.definition = MEAT_CATALOG[kind];
    this.dimensions = meatDimensions(this.definition);
    const d = this.definition, n = CONFIG.meatLayerCount;
    if (d.geometry === 'flat') {
      this.layerMassKg = Array(n).fill(d.massKg / n);
      this.conductanceWK = Array(n - 1).fill(d.conductivityWmK * this.dimensions.areaM2 / (d.thicknessM / n));
    } else {
      const radius = d.thicknessM / 2;
      const radii = Array.from({ length: n + 1 }, (_, i) => radius * (1 - i / n));
      this.layerMassKg = Array.from({ length: n }, (_, i) =>
        d.massKg * (radii[i] ** 2 - radii[i + 1] ** 2) / radius ** 2);
      const centers = this.layerMassKg.map((_, i) =>
        (2 / 3) * (radii[i] ** 3 - radii[i + 1] ** 3) / (radii[i] ** 2 - radii[i + 1] ** 2));
      this.conductanceWK = Array.from({ length: n - 1 }, (_, i) =>
        d.conductivityWmK * 2 * Math.PI * radii[i + 1] * this.dimensions.widthM / (centers[i] - centers[i + 1]));
    }
  }
  get onGrill(): boolean { return this.location === 'grill'; }
  set onGrill(value: boolean) { this.location = value ? 'grill' : 'board'; }
  flip(): void { this.faceDown = this.faceDown === 'a' ? 'b' : 'a'; }
  /** Flujo incidente en W/m². Los rangos recomendados nunca recortan el calor. */
  update(dt: number, incomingFluxWm2: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const d = this.definition, n = this.layersC.length;
    const radial = d.geometry === 'cylinder';
    const lower = radial || this.faceDown === 'a' ? 0 : n - 1;
    const upper = radial ? 0 : this.faceDown === 'a' ? n - 1 : 0;
    const energyJ: number[] = Array(n).fill(0);
    const incoming = this.onGrill && Number.isFinite(incomingFluxWm2) ? Math.max(0, incomingFluxWm2) : 0;
    if (incoming > 0) this.hasReceivedGrillHeat = true;
    const area = this.dimensions.areaM2;
    energyJ[lower] += incoming * d.absorptivity * area * dt;
    const conv = CONFIG.meatSurfaceConvectionWm2K;
    if (radial) {
      const r = d.thicknessM / 2;
      const exteriorArea = 2 * Math.PI * r * this.dimensions.widthM + 2 * Math.PI * r * r;
      energyJ[0] -= conv * exteriorArea * (1 + P.lowerConvectionFactor) / 2 * (this.layersC[0] - CONFIG.ambientC) * dt;
    } else {
      energyJ[lower] -= conv * area * (this.layersC[lower] - CONFIG.ambientC) * dt * P.lowerConvectionFactor;
      energyJ[upper] -= conv * area * (this.layersC[upper] - CONFIG.ambientC) * dt;
    }
    for (let i = 0; i < n - 1; i++) {
      const transfer = this.conductanceWK[i] * (this.layersC[i] - this.layersC[i + 1]) * dt;
      energyJ[i] -= transfer;
      energyJ[i + 1] += transfer;
    }
    const evapG = Math.min(this.onGrill ? Math.max(0, this.layersC[lower] - P.evaporationStartC)
      * P.evaporationGPerDegreeSecond * dt : 0, this.juiciness * P.evaporationJuiceCap);
    energyJ[lower] -= evapG / 1000 * P.latentHeatJKg;
    this.juiciness = Math.max(0, this.juiciness - evapG * P.juiceLossPerG);
    for (let i = 0; i < n; i++) this.layersC[i] += energyJ[i] / (this.layerMassKg[i] * d.specificHeatJKgK);
    const side = this.faceDown, other: Side = side === 'a' ? 'b' : 'a';
    // Indicador superficial para dorado: no agrega energía a las capas.
    this.surfaceC[side] = this.layersC[lower] + incoming * P.surfaceFluxFactor;
    this.surfaceC[other] = this.layersC[upper];
    if (this.onGrill) {
      const t = this.surfaceC[side];
      const rate = P.browningBands.find(([limit]) => t < limit)?.[1] ?? 0;
      const dryFactor = Math.min(1, Math.max(P.minDryFactor, (t - P.drySurfaceStartC) / P.drySurfaceRangeC));
      this.brown[side] = Math.min(100, this.brown[side] + rate * dryFactor * dt);
      if (t > P.burnStartC && this.brown[side] > P.burnMinBrown)
        this.burn[side] = Math.min(100, this.burn[side] + P.burnRate * (t - P.burnStartC) / P.burnRangeC * dt);
      this.casingDamage[side] = Math.min(100, this.casingDamage[side]
        + Math.max(0, t - P.casingStartC) * P.casingRate * d.casingSensitivity * dt);
    }
    this.totalSimSeconds += dt;
  }
  get centerC(): number { return this.layersC[this.definition.geometry === 'cylinder' ? 4 : 2]; }
  get state(): MeatState {
    if (Math.max(this.burn.a, this.burn.b, this.casingDamage.a, this.casingDamage.b) >= P.burnedThreshold) return 'burned';
    if (this.centerC > P.dryCenterC || this.juiciness < P.dryJuice) return 'dry';
    if (this.definition.precooked) return this.hasReceivedGrillHeat ? 'reheating' : 'precooked';
    const target = this.definition.target;
    if (target && this.centerC >= target.minC && this.brown.a >= CONFIG.meatBrowningMin && this.brown.b >= CONFIG.meatBrowningMin) return 'cooked';
    if (this.centerC >= P.undercookedCenterC) return 'undercooked';
    return 'raw';
  }
  get objectiveAchieved(): boolean {
    const target = this.definition.target;
    return target !== null && this.centerC >= target.minC && (target.maxC === null || this.centerC <= target.maxC)
      && this.brown.a >= CONFIG.meatBrowningMin && this.brown.a <= CONFIG.meatBrowningMax
      && this.brown.b >= CONFIG.meatBrowningMin && this.brown.b <= CONFIG.meatBrowningMax
      && Math.max(this.burn.a, this.burn.b, this.casingDamage.a, this.casingDamage.b) < P.objectiveMaxBurn
      && this.juiciness > P.objectiveMinJuice;
  }
}
