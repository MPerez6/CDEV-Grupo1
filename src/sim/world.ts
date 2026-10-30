import { BrazierModel, consumeEmber, HeatGrid, isFuelBurning, type DroppedPiece, type EmberPiece } from './embers.ts';
import { MeatModel } from './meat.ts';
import { CONFIG } from './parameters.ts';
import { type MeatKind } from './meatCatalog.ts';
import { footprintCoverage, polygonOverlapArea, meatFootprint } from './meatFootprint.ts';

export type PokerStrikeInput = {
  pointM: { x: number; z: number };
  aimDir?: { x: number; z: number; pitchDown?: number };
  dragDeltaM?: { x: number; z: number };
};

export type PokerStrikeResult = {
  moved: number;
  dirX: number;
  dirZ: number;
};

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
  depositEmber(index: number, positionM?: { x: number; z: number }): boolean {
    if (this.carried?.state !== 'ready') { this.message = 'Primero recogé brasas rojas con la pala.'; return false; }
    if (!Number.isInteger(index) || index < 0 || index >= this.grill.cells.length) return false;
    if (positionM && Number.isFinite(positionM.x) && Number.isFinite(positionM.z)) {
      this.carried.ember.positionM = {
        x: Math.max(0, Math.min(CONFIG.grillWidthM, positionM.x)),
        z: Math.max(0, Math.min(CONFIG.grillDepthM, positionM.z)),
      };
    }
    this.grill.put(index, this.carried.ember);
    this.carried = null;
    this.message = `Brasas colocadas en el sector ${index + 1}.`;
    return true;
  }
  pokeEmbers(input: PokerStrikeInput): PokerStrikeResult {
    const { pointM, aimDir, dragDeltaM } = input;
    if (!pointM || !Number.isFinite(pointM.x) || !Number.isFinite(pointM.z)) {
      return { moved: 0, dirX: 0, dirZ: 0 };
    }
    if (this.grill.emberCount === 0) {
      this.message = 'No hay brasas bajo la parrilla para mover.';
      return { moved: 0, dirX: 0, dirZ: 0 };
    }

    const dragLen = dragDeltaM && Number.isFinite(dragDeltaM.x) && Number.isFinite(dragDeltaM.z)
      ? Math.hypot(dragDeltaM.x, dragDeltaM.z)
      : 0;
    const hasDrag = dragLen > 1e-4;
    const reachRadiusM = hasDrag ? 0.21 : 0.19;

    const cellW = CONFIG.grillWidthM / CONFIG.gridColumns;
    const cellD = CONFIG.grillDepthM / CONFIG.gridRows;
    const candidates: { ember: EmberPiece; ex: number; ez: number; dist: number }[] = [];

    this.grill.cells.forEach((cell, cellIndex) => {
      const col = cellIndex % CONFIG.gridColumns;
      const row = Math.floor(cellIndex / CONFIG.gridColumns);
      const fallbackX = (col + 0.5) * cellW;
      const fallbackZ = (row + 0.5) * cellD;
      for (const ember of cell) {
        if (ember.massG <= 0) continue;
        const ex = ember.positionM ? ember.positionM.x : fallbackX;
        const ez = ember.positionM ? ember.positionM.z : fallbackZ;
        const dist = Math.hypot(ex - pointM.x, ez - pointM.z);
        if (dist <= reachRadiusM) {
          candidates.push({ ember, ex, ez, dist });
        }
      }
    });

    if (candidates.length === 0) {
      this.message = 'Apuntá más cerca de las brasas para empujarlas o arrastrarlas con el atizador.';
      return { moved: 0, dirX: 0, dirZ: 0 };
    }

    const axRaw = aimDir && Number.isFinite(aimDir.x) ? aimDir.x : 0;
    const azRaw = aimDir && Number.isFinite(aimDir.z) ? aimDir.z : 1;
    const aimLen = Math.hypot(axRaw, azRaw);
    const ax = aimLen > 1e-5 ? axRaw / aimLen : 0;
    const az = aimLen > 1e-5 ? azRaw / aimLen : 1;
    const pitchDown = Math.max(0, Math.min(1, aimDir?.pitchDown !== undefined && Number.isFinite(aimDir.pitchDown) ? aimDir.pitchDown : 0.35));

    const marginM = 0.025;
    let sumDirX = 0;
    let sumDirZ = 0;
    let totalDisplacement = 0;
    let lastSector = 0;

    for (const { ember, ex, ez, dist } of candidates) {
      let vx: number;
      let vz: number;
      let baseStep: number;

      if (hasDrag && dragDeltaM) {
        vx = dragDeltaM.x / dragLen;
        vz = dragDeltaM.z / dragLen;
        baseStep = Math.min(0.18, Math.max(0.065, dragLen));
      } else {
        const ux = dist > 1e-5 ? (ex - pointM.x) / dist : ax;
        const uz = dist > 1e-5 ? (ez - pointM.z) / dist : az;
        const w = Math.max(0, Math.min(1, (dist - 0.02) / 0.035));
        const forwardFactor = Math.max(0, uz);
        const rawX = ux * w + ax * (1 - w + 0.35 * w * forwardFactor);
        const rawZ = uz * w + az * (1 - w);
        const rawLen = Math.hypot(rawX, rawZ);
        vx = rawLen > 1e-5 ? rawX / rawLen : ax;
        vz = rawLen > 1e-5 ? rawZ / rawLen : az;
        baseStep = 0.175 - 0.04 * pitchDown;
      }

      const stepM = baseStep * (1 - 0.25 * (dist / reachRadiusM));
      const nx = Math.max(marginM, Math.min(CONFIG.grillWidthM - marginM, ex + vx * stepM));
      const nz = Math.max(marginM, Math.min(CONFIG.grillDepthM - marginM, ez + vz * stepM));
      const col = Math.max(0, Math.min(CONFIG.gridColumns - 1, Math.floor((nx / CONFIG.grillWidthM) * CONFIG.gridColumns)));
      const row = Math.max(0, Math.min(CONFIG.gridRows - 1, Math.floor((nz / CONFIG.grillDepthM) * CONFIG.gridRows)));
      const nextIndex = row * CONFIG.gridColumns + col;

      totalDisplacement += Math.hypot(nx - ex, nz - ez);
      ember.positionM = { x: nx, z: nz };
      this.grill.put(nextIndex, ember);
      sumDirX += vx;
      sumDirZ += vz;
      lastSector = nextIndex;
    }

    const avgLen = Math.hypot(sumDirX, sumDirZ) || 1;
    const dirX = sumDirX / avgLen;
    const dirZ = sumDirZ / avgLen;

    if (totalDisplacement < 0.002) {
      this.message = 'Las brasas ya están contra el borde en esa dirección.';
      return { moved: candidates.length, dirX, dirZ };
    }

    const depthLabel = dirZ > 0.38 ? 'hacia el fondo' : dirZ < -0.38 ? 'hacia adelante' : '';
    const sideLabel = dirX > 0.38 ? 'a la derecha' : dirX < -0.38 ? 'a la izquierda' : '';
    const where = [depthLabel, sideLabel].filter(Boolean).join(' ') || 'en la parrilla';
    const verb = dirZ < -0.38 ? 'Arrastraste' : dirZ > 0.38 ? 'Empujaste' : 'Barriste';
    const sectorNote = candidates.length === 1 ? ` (sector ${lastSector + 1})` : '';
    this.message = `${verb} ${candidates.length > 1 ? 'las brasas' : 'la brasa'} ${where}${sectorNote}.`;

    return { moved: candidates.length, dirX, dirZ };
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
