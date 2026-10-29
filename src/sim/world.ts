import { BrazierModel, consumeEmber, HeatGrid, isFuelBurning, type DroppedPiece } from './embers.ts';
import { MeatModel } from './meat.ts';
import { CONFIG } from './parameters.ts';
import { type MeatKind } from './meatCatalog.ts';
import { footprintCoverage, polygonOverlapArea, meatFootprint } from './meatFootprint.ts';

export class SimulationWorld {
  public brazier = new BrazierModel();
  public grill = new HeatGrid();
  public readonly meats: MeatModel[] = [new MeatModel()];
  public carriedMeatId: number | null = null;
  private coverageCache = new Map<number, { key: string; coverage: ReturnType<typeof footprintCoverage> }>();
  // Alias del matambre original para herramientas de diagnóstico y pruebas anteriores.
  get meat(): MeatModel { return this.meats[0]; }
  public carried: DroppedPiece | null = null;
  public simSeconds = 0;
  public message = 'Cargá carbón o leña en el brasero.';

  tick(dtSimSeconds: number): void {
    if (!Number.isFinite(dtSimSeconds) || dtSimSeconds <= 0) return;
    this.simSeconds += dtSimSeconds;
    this.brazier.update(dtSimSeconds);
    // En la pala sigue la combustión; esa energía se pierde fuera del plano de cocción.
    if (this.carried?.state === 'ready') consumeEmber(this.carried.ember, dtSimSeconds);
    else if (this.carried?.state === 'immature' && isFuelBurning(this.carried.fuel))
      consumeEmber(this.carried.fuel.ember, dtSimSeconds);
    this.grill.update(dtSimSeconds);
    for (const meat of this.meats) meat.update(dtSimSeconds, this.meatFluxWm2(meat));
  }
  addMeat(kind: MeatKind): MeatModel {
    const meat = new MeatModel(kind);
    meat.boardSlot = this.meats.length;
    this.meats.push(meat);
    return meat;
  }
  meatById(id: number): MeatModel | undefined { return this.meats.find(meat => meat.id === id); }
  meatFluxWm2(meat: MeatModel): number {
    if (!meat.onGrill) return 0;
    const key = `${meat.positionM.x},${meat.positionM.z},${meat.quarterTurns},${meat.faceDown}`;
    let cached = this.coverageCache.get(meat.id);
    if (cached?.key !== key) {
      cached = { key, coverage: footprintCoverage(meat) };
      this.coverageCache.set(meat.id, cached);
    }
    return cached.coverage.reduce((sum, cell) => sum + this.grill.fluxWm2[cell.index] * cell.weight, 0);
  }
  takeMeat(id: number): boolean {
    const meat = this.meatById(id);
    if (!meat || this.carriedMeatId !== null) { this.message = 'La pinza ya tiene una pieza o no hay carne disponible.'; return false; }
    meat.location = 'carried';
    this.carriedMeatId = id;
    this.message = `${meat.definition.name} en la pinza. Clic sobre la parrilla para colocarlo; Q para orientar.`;
    return true;
  }
  private fits(meat: MeatModel, center: { x: number; z: number }, turns: number): boolean {
    const polygon = meatFootprint(meat, center, turns);
    return polygon.every(p => p.x >= -1e-10 && p.x <= CONFIG.grillWidthM + 1e-10
      && p.z >= -1e-10 && p.z <= CONFIG.grillDepthM + 1e-10)
      && !this.meats.some(other => other !== meat && other.onGrill
        && polygonOverlapArea(polygon, meatFootprint(other)) > 1e-10);
  }
  placeMeat(index: number): boolean {
    const meat = this.carriedMeatId === null ? undefined : this.meatById(this.carriedMeatId);
    if (!meat || !Number.isInteger(index) || index < 0 || index >= this.grill.cells.length) return false;
    const offsets = meatFootprint(meat, { x: 0, z: 0 });
    const xs = offsets.map(p => p.x), zs = offsets.map(p => p.z);
    const center = {
      x: Math.max(-Math.min(...xs), Math.min(CONFIG.grillWidthM - Math.max(...xs), (index % CONFIG.gridColumns + 0.5) * CONFIG.grillWidthM / CONFIG.gridColumns)),
      z: Math.max(-Math.min(...zs), Math.min(CONFIG.grillDepthM - Math.max(...zs), (Math.floor(index / CONFIG.gridColumns) + 0.5) * CONFIG.grillDepthM / CONFIG.gridRows)),
    };
    if (!this.fits(meat, center, meat.quarterTurns)) { this.message = 'La pieza no cabe ahí. Elegí otro sector u orientala con Q.'; return false; }
    meat.positionM = center;
    meat.location = 'grill';
    this.carriedMeatId = null;
    this.message = `${meat.definition.name} en la parrilla. R para ${meat.definition.geometry === 'cylinder' ? 'rodar' : 'dar vuelta'}; Q para orientar.`;
    return true;
  }
  returnMeatToBoard(): boolean {
    const meat = this.carriedMeatId === null ? undefined : this.meatById(this.carriedMeatId);
    if (!meat) return false;
    meat.location = 'board';
    meat.quarterTurns = 0;
    this.carriedMeatId = null;
    this.message = `${meat.definition.name} sobre su tabla; conserva su estado.`;
    return true;
  }
  flipMeat(id: number): boolean {
    const meat = this.meatById(id);
    if (!meat?.onGrill) return false;
    meat.flip();
    if (!this.fits(meat, meat.positionM, meat.quarterTurns)) {
      meat.flip();
      this.message = 'El contorno no cabe al dar vuelta. Mové la pieza a un lugar con más espacio.';
      return false;
    }
    this.message = meat.definition.geometry === 'cylinder' ? 'Embutido rodado media vuelta.' : 'Carne dada vuelta.';
    return true;
  }
  rotateMeat(id: number): boolean {
    const meat = this.meatById(id);
    if (!meat || meat.location === 'board') return false;
    const turns = (meat.quarterTurns + 1) % 4;
    if (meat.onGrill && !this.fits(meat, meat.positionM, turns)) { this.message = 'No hay espacio para girar la pieza en ese lugar.'; return false; }
    meat.quarterTurns = turns;
    this.message = 'Orientación girada 90°.';
    return true;
  }
  depositEmber(index: number): boolean {
    if (this.carried?.state !== 'ready') { this.message = 'Primero recogé brasas rojas con la pala.'; return false; }
    this.grill.put(index, this.carried.ember);
    this.carried = null;
    this.message = `Brasas colocadas en el sector ${index + 1}.`;
    return true;
  }
  returnImmature(): boolean {
    if (!this.carried || this.carried.state !== 'immature') {
      this.message = 'No tenés fragmentos inmaduros para devolver.';
      return false;
    }
    if (!this.brazier.returnImmature(this.carried)) {
      this.message = this.brazier.lastEvent;
      return false;
    }
    this.carried = null;
    this.message = this.brazier.lastEvent;
    return true;
  }
}
