/**
 * Tacho de basura del asador. Lógica pura: cuánto hay adentro y cuánto olor larga.
 * La basura con restos de carne se pudre con el tiempo: si no se saca la bolsa, el olor sube
 * aunque no se tire nada nuevo. Con olor fuerte los comensales pierden la paciencia y se van.
 */
export const TRASH_SETTINGS = {
  /** Unidades que entran en una bolsa (una pieza de carne ocupa 1–3, los restos de un plato 1). */
  capacity: 8,
  /** Olor que suma por segundo de simulación con el tacho lleno (a medio llenar, la mitad). */
  smellPerSimSecondFull: 1 / 900,
  /** Una pieza recién tirada ya se nota un poco. */
  smellPerItem: 0.03,
  /** Lo que queda en el aire al sacar la bolsa; después se ventila. */
  smellAfterEmpty: 0.15,
  ventilatePerSimSecond: 1 / 240,
} as const;

export type SmellLevel = 'sin olor' | 'leve' | 'fuerte' | 'insoportable';
/** Umbrales de olor (0..1) para los avisos y para los comensales. */
export const SMELL_THRESHOLDS = { leve: 0.2, fuerte: 0.5, insoportable: 0.8 } as const;

export function smellLevel(smell: number): SmellLevel {
  if(smell >= SMELL_THRESHOLDS.insoportable) return 'insoportable';
  if(smell >= SMELL_THRESHOLDS.fuerte) return 'fuerte';
  if(smell >= SMELL_THRESHOLDS.leve) return 'leve';
  return 'sin olor';
}

/** Lugar que ocupa una pieza de carne según su masa. */
export function trashUnitsForMass(massKg: number): number {
  return Math.max(1, Math.min(3, Math.ceil(massKg / 0.35)));
}

export class TrashModel {
  public fill = 0;
  public smell = 0;
  public bagsTakenOut = 0;
  public readonly capacity = TRASH_SETTINGS.capacity;

  get fillRatio(): number { return Math.min(1, this.fill / this.capacity); }
  get isFull(): boolean { return this.fill >= this.capacity; }
  get level(): SmellLevel { return smellLevel(this.smell); }

  /** Tira algo al tacho. Si no entra, devuelve false y no cambia nada. */
  add(units: number): boolean {
    if(!Number.isFinite(units) || units <= 0) return false;
    if(this.fill + units > this.capacity) return false;
    this.fill += units;
    this.smell = Math.min(1, this.smell + TRASH_SETTINGS.smellPerItem * units);
    return true;
  }

  /** Saca la bolsa: queda vacío y el olor empieza a ventilarse. */
  empty(): boolean {
    if(this.fill <= 0) return false;
    this.fill = 0;
    this.smell = Math.min(this.smell, TRASH_SETTINGS.smellAfterEmpty);
    this.bagsTakenOut++;
    return true;
  }

  tick(dtSimSeconds: number): void {
    if(!Number.isFinite(dtSimSeconds) || dtSimSeconds <= 0) return;
    if(this.fill > 0) this.smell = Math.min(1, this.smell + this.fillRatio * TRASH_SETTINGS.smellPerSimSecondFull * dtSimSeconds);
    else this.smell = Math.max(0, this.smell - TRASH_SETTINGS.ventilatePerSimSecond * dtSimSeconds);
  }

  /** No entró en el tacho: queda tirado al lado y el olor sube de golpe. */
  overflow(): void { this.smell = Math.min(1, this.smell + 0.08); }

  reset(): void { this.fill = 0; this.smell = 0; this.bagsTakenOut = 0; }
}
