import { CONFIG } from './parameters.ts';

export type FuelKind = 'charcoal' | 'small-wood' | 'large-wood';
export type EmberPiece = {
  id: number;
  initialMassG: number;
  massG: number;
  ashG: number;
};
export type FuelPiece = {
  id: number;
  kind: FuelKind;
  progress: number;
  ember: EmberPiece;
  slot: number;
};
export type DroppedPiece =
  | { id: number; state: 'ready'; ember: EmberPiece }
  | { id: number; state: 'immature'; fuel: FuelPiece };

let nextId = 1;
export function newEmber(massG: number = CONFIG.emberMassG): EmberPiece {
  return { id: nextId++, initialMassG: massG, massG, ashG: 0 };
}
export function newFuel(kind: FuelKind, slot = 0): FuelPiece {
  const ember = newEmber();
  return { id: ember.id, kind, progress: 0, ember, slot };
}

const SLOTS_PER_LAYER = CONFIG.brazierPileColumns * CONFIG.brazierPileRows;
export function fuelSlotCount(kind: FuelKind): number {
  return kind === 'large-wood' ? CONFIG.brazierLargeWoodSlots : 1;
}
export function fuelSlots(fuel: FuelPiece): number[] {
  return Array.from({ length: fuelSlotCount(fuel.kind) }, (_, i) => fuel.slot + i);
}

/** Contacto aproximado de la pila: calor hacia arriba, lateral y menor hacia abajo. */
function contactHeat(source: FuelPiece, target: FuelPiece): number {
  const sourceLayer = Math.floor(source.slot / SLOTS_PER_LAYER);
  const targetLayer = Math.floor(target.slot / SLOTS_PER_LAYER);
  const deltaLayer = targetLayer - sourceLayer;
  if (Math.abs(deltaLayer) > 1) return 0;
  const a = fuelSlots(source).map(slot => slot % SLOTS_PER_LAYER);
  const b = fuelSlots(target).map(slot => slot % SLOTS_PER_LAYER);
  if (deltaLayer !== 0) {
    const overlap = b.filter(slot => a.includes(slot)).length / b.length;
    return overlap * (deltaLayer > 0 ? CONFIG.brazierHeatUpward : CONFIG.brazierHeatDownward);
  }
  const neighbours = b.filter(slot => a.some(other =>
    Math.abs(slot % CONFIG.brazierPileColumns - other % CONFIG.brazierPileColumns)
    + Math.abs(Math.floor(slot / CONFIG.brazierPileColumns) - Math.floor(other / CONFIG.brazierPileColumns)) === 1));
  return neighbours.length / b.length * CONFIG.brazierHeatSideways;
}

export function isFuelBurning(fuel: FuelPiece): boolean {
  const threshold = fuel.kind === 'large-wood' ? CONFIG.largeWoodIgnitionProgress : CONFIG.fuelIgnitionProgress;
  return fuel.progress >= threshold && fuel.ember.massG > 0;
}

/** Una brasa solo libera energía si consume masa. La masa nunca puede ser negativa. */
export function consumeEmber(ember: EmberPiece, seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0 || ember.massG <= 0) return 0;
  const m0 = ember.initialMassG;
  const m = ember.massG;
  const rateGMin = CONFIG.initialBurnGPerMinute * Math.pow(m0 / 50, 2 / 3)
    * (0.7 + 0.3 * m / m0);
  const consumedG = Math.min(m, rateGMin * seconds / 60);
  ember.massG = Math.max(0, m - consumedG);
  ember.ashG += consumedG * CONFIG.ashFraction;
  const joules = consumedG / 1000 * CONFIG.heatOfCombustionJPerKg;
  return joules / seconds * CONFIG.thermalDelivery; // potencia promedio al plano de cocción
}

/** Fuente lateral: estado simplificado de ignición, no simulación detallada de llama. */
export class BrazierModel {
  public fuel: FuelPiece[] = [];
  public tray: DroppedPiece[] = [];
  public tinder = 0;
  public tinderSecondsRemaining = 0;
  private tinderSecondsLoaded = 0;
  public lastEvent = 'Agregá combustible y papel/ramitas para encender.';

  addFuel(kind: FuelKind): boolean {
    const slot = this.findSlot(kind);
    if (slot < 0) { this.lastEvent = 'No hay espacio para esa pieza. Esperá a que caigan brasas del brasero.'; return false; }
    this.fuel.push(newFuel(kind, slot));
    this.lastEvent = kind === 'charcoal' ? 'Carbón agregado al brasero.' : 'Leña agregada al brasero.';
    return true;
  }
  private findSlot(kind: FuelKind): number {
    const occupied = new Set(this.fuel.flatMap(fuelSlots));
    const span = fuelSlotCount(kind);
    for (let layer = 0; layer < CONFIG.brazierPileLayers; layer++) {
      for (let row = 0; row < CONFIG.brazierPileRows; row++) {
        for (let col = 0; col <= CONFIG.brazierPileColumns - span; col++) {
          const slot = layer * SLOTS_PER_LAYER + row * CONFIG.brazierPileColumns + col;
          if (Array.from({ length: span }, (_, i) => slot + i).every(cell => !occupied.has(cell))) return slot;
        }
      }
    }
    return -1;
  }
  private settleFuel(): void {
    const occupied = new Set(this.fuel.flatMap(fuelSlots));
    for (const fuel of [...this.fuel].sort((a, b) => a.slot - b.slot)) {
      fuelSlots(fuel).forEach(slot => occupied.delete(slot));
      while (fuel.slot >= SLOTS_PER_LAYER && fuelSlots(fuel).every(slot => !occupied.has(slot - SLOTS_PER_LAYER))) {
        fuel.slot -= SLOTS_PER_LAYER;
      }
      fuelSlots(fuel).forEach(slot => occupied.add(slot));
    }
  }
  addTinder(): void {
    if (this.tinderBurning) {
      this.tinderSecondsRemaining += CONFIG.tinderBurnSecondsPerBundle;
      this.tinderSecondsLoaded += CONFIG.tinderBurnSecondsPerBundle;
    } else this.tinder++;
    this.lastEvent = 'Papel o ramitas colocados debajo del brasero.';
  }
  ignite(): boolean {
    if (this.tinderBurning) { this.lastEvent = 'El papel ya está encendido.'; return false; }
    if (!this.tinder) {
      this.lastEvent = 'Primero colocá papel o ramitas debajo del brasero.';
      return false;
    }
    this.tinderSecondsLoaded = this.tinder * CONFIG.tinderBurnSecondsPerBundle;
    this.tinderSecondsRemaining = this.tinderSecondsLoaded;
    this.tinder = 0;
    this.lastEvent = 'Papel encendido debajo del brasero.';
    return true;
  }
  update(dtSimSeconds: number): void {
    if (!Number.isFinite(dtSimSeconds) || dtSimSeconds <= 0) return;
    // Respetar el agotamiento del papel y el traspaso de encendido incluso en pasos grandes.
    let remaining = dtSimSeconds;
    while (remaining > 0) {
      const dt = Math.min(remaining, CONFIG.brazierMaxStepSeconds);
      this.step(dt);
      remaining -= dt;
    }
  }
  private step(dt: number): void {
    // Las brasas sobre el piso también se consumen; su calor se disipa al ambiente.
    for (const piece of this.tray) {
      if (piece.state === 'ready') consumeEmber(piece.ember, dt);
      else if (isFuelBurning(piece.fuel)) consumeEmber(piece.fuel.ember, dt);
    }
    // Tomar un estado común evita propagar calor instantáneamente por orden del array.
    const states = this.fuel.map(f => ({ ...f, burning: isFuelBurning(f) }));
    for (let i = 0; i < this.fuel.length; i++) {
      const f = this.fuel[i];
      const state = states[i];
      const layer = Math.floor(state.slot / SLOTS_PER_LAYER);
      const footprint = fuelSlots(state);
      const exposure = footprint.reduce((sum, slot) => sum + CONFIG.brazierStarterExposure[slot % SLOTS_PER_LAYER], 0) / footprint.length;
      let heat = state.burning ? 1 : this.tinderBurning
        ? exposure * Math.pow(CONFIG.brazierStarterLeakPerLayer, layer) : 0;
      let established = false;
      for (const source of states) {
        if (source.id === state.id || !source.burning) continue;
        const contact = contactHeat(source, state);
        heat += contact;
        if (contact > 0 && source.progress >= CONFIG.establishedFireProgress) established = true;
      }
      heat = Math.min(1, heat);
      const mins = f.kind === 'charcoal' ? CONFIG.charcoalHeatingMinutes
        : f.kind === 'small-wood' ? CONFIG.smallWoodHeatingMinutes
          : CONFIG.largeWoodHeatingMinutes;
      // Troncos grandes se calientan muy lentamente si aún no hay fuego asentado.
      const factor = f.kind === 'large-wood' && !established && !isFuelBurning(f)
        ? CONFIG.largeWoodStarterFactor : 1;
      if (heat > 0) f.progress = Math.min(1, f.progress + dt / (mins * 60) * factor * heat);
      if (isFuelBurning(f)) consumeEmber(f.ember, dt);
    }
    this.tinderSecondsRemaining = Math.max(0, this.tinderSecondsRemaining - dt);
    // Caída automática al madurar, sin mensajes ni creación de masa nueva.
    let dropped = false;
    for (let i = this.fuel.length - 1; i >= 0; i--) {
      const fuel = this.fuel[i];
      if (fuel.progress >= 1 || fuel.ember.massG <= 0) {
        this.fuel.splice(i, 1);
        this.tray.push({ id: fuel.id, state: 'ready', ember: fuel.ember });
        dropped = true;
      }
    }
    if (dropped) this.settleFuel();
  }
  hit(): boolean {
    const mature = this.fuel.findIndex(f => f.progress >= 1);
    // Cuando no hay brasas maduras, un golpe puede desprender un fragmento negro/rojo.
    const partial = mature < 0 ? this.fuel.findIndex(f => f.progress >= CONFIG.fuelIgnitionProgress) : -1;
    const idx = mature >= 0 ? mature : partial;
    if (idx < 0) { this.lastEvent = 'Todavía no hay fragmentos listos para caer.'; return false; }
    const fuel = this.fuel.splice(idx, 1)[0];
    this.settleFuel();
    if (mature >= 0) {
      this.tray.push({ id: fuel.id, state: 'ready', ember: fuel.ember });
      this.lastEvent = 'Cayó una brasa roja. Podés recogerla con la pala.';
    } else {
      this.tray.push({ id: fuel.id, state: 'immature', fuel });
      this.lastEvent = 'Cayó un fragmento negro/rojo: devolvelo al brasero.';
    }
    return true;
  }
  takeFromTray(): DroppedPiece | null {
    const index = this.tray.findIndex(p => (p.state === 'immature' ? p.fuel.ember : p.ember).massG > 0);
    const piece = index < 0 ? null : this.tray.splice(index, 1)[0];
    if (!piece) this.lastEvent = 'No hay brasas caídas para recoger.';
    else this.lastEvent = piece.state === 'ready' ? 'Brasas rojas recogidas con la pala.' : 'Fragmento inmaduro: devolvelo al brasero.';
    return piece;
  }
  returnImmature(piece: DroppedPiece): boolean {
    if (piece.state !== 'immature') return false;
    const slot = this.findSlot(piece.fuel.kind);
    if (slot < 0) { this.lastEvent = 'No hay espacio para devolver el fragmento; sigue en la pala.'; return false; }
    piece.fuel.slot = slot;
    this.fuel.push(piece.fuel);
    this.lastEvent = 'Fragmento devuelto al brasero; conserva su progreso de encendido.';
    return true;
  }
  get readyCount(): number { return this.fuel.filter(f => f.progress >= 1).length; }
  get capacitySlots(): number { return SLOTS_PER_LAYER * CONFIG.brazierPileLayers; }
  get occupiedSlots(): number { return this.fuel.reduce((sum, f) => sum + fuelSlotCount(f.kind), 0); }
  get tinderBurning(): boolean { return this.tinderSecondsRemaining > 0; }
  get tinderFraction(): number {
    return this.tinderSecondsLoaded > 0 ? this.tinderSecondsRemaining / this.tinderSecondsLoaded : 0;
  }
  get fuelBurning(): boolean {
    return this.fuel.some(isFuelBurning);
  }
  get lit(): boolean { return this.tinderBurning || this.fuelBurning; }
}

export class HeatGrid {
  public readonly cells: EmberPiece[][];
  public fluxWm2: number[];
  public readonly width = CONFIG.gridColumns;
  public readonly height = CONFIG.gridRows;
  public readonly cellAreaM2 = CONFIG.grillWidthM * CONFIG.grillDepthM / (this.width * this.height);
  constructor() {
    this.cells = Array.from({ length: this.width * this.height }, () => []);
    this.fluxWm2 = Array(this.cells.length).fill(0);
  }
  put(index: number, ember: EmberPiece): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) throw new RangeError('Sector inválido');
    // Una identidad corresponde a una única porción, nunca a copias con estados diferentes.
    if (this.cells.some(cell => cell.some(piece => piece.id === ember.id && piece !== ember)))
      throw new Error('La brasa ya está registrada con otra referencia');
    // Depositar una porción ya presente la traslada; repetir la orden no la duplica.
    for (const cell of this.cells) {
      for (let i = cell.length - 1; i >= 0; i--) {
        if (cell[i].id === ember.id) cell.splice(i, 1);
      }
    }
    this.cells[index].push(ember);
  }
  update(dtSimSeconds: number): void {
    if (!Number.isFinite(dtSimSeconds) || dtSimSeconds <= 0) return;
    const power = this.cells.map(cell => cell.reduce((sum, ember) => sum + consumeEmber(ember, dtSimSeconds), 0));
    this.fluxWm2.fill(0);
    power.forEach((watts, i) => {
      this.fluxWm2[i] += watts * CONFIG.radiantCellShare / this.cellAreaM2;
      const x = i % this.width;
      const z = Math.floor(i / this.width);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height)
          this.fluxWm2[nz * this.width + nx] += watts * CONFIG.radiantNeighbourShare / this.cellAreaM2;
      }
    });
    for (const cell of this.cells) {
      for (let j = cell.length - 1; j >= 0; j--) {
        if (cell[j].massG <= 0) cell.splice(j, 1);
      }
    }
  }
  get emberCount(): number { return this.cells.reduce((n, cell) => n + cell.length, 0); }
}
