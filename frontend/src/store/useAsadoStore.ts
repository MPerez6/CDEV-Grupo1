import { create } from 'zustand';

export type AsadoTool = 'pala' | 'atizador' | 'tenedor' | 'cepillo' | 'ninguna';
export type GameStage = 'menu' | 'playing' | 'served';
export type FogonStage = 'sin_fuego' | 'con_papel' | 'encendido' | 'brasas_listas';

export interface EmberData {
  id: string | number;
  position: [number, number, number];
  temperature: number; // 0.0 (apagada/ceniza) a 1.0 (al rojo vivo)
  decayRate?: number; // Tasa de enfriamiento por segundo
}

export interface MeatItem {
  id: string;
  cut: string;
  position: [number, number, number];
  cookLevel: number; // 0: crudo, 1: a punto, 2: quemado
  flipped: boolean;
}

export type AddMeatInput = Omit<MeatItem, 'cookLevel' | 'flipped'> &
  Partial<Pick<MeatItem, 'cookLevel' | 'flipped'>>;

// Configuración de la Grilla Térmica 2D
export const GRID_RES = 16;
export const GRID_BOUNDS = {
  minX: -2.0,
  maxX: 2.0,
  minZ: -2.0,
  maxZ: 2.0,
};

export interface AsadoStore {
  // Narrativa y juego
  stage: GameStage;
  selectedTool: AsadoTool;
  toolActionTrigger: number;
  setStage: (stage: GameStage) => void;
  setSelectedTool: (tool: AsadoTool) => void;
  triggerToolAction: () => void;

  // Estado de los cortes
  meats: MeatItem[];
  addMeat: (meat: AddMeatInput) => void;
  addNewRandomMeat: () => void;
  addNewMeat: (cutType: 'vacio' | 'chorizo') => void;
  updateCookLevel: (id: string, levelDelta: number) => void;
  flipMeat: (id: string) => void;
  setMeatPosition: (id: string, pos: [number, number, number]) => void;

  // Sistema de colocación y acomodo de cortes en la parrilla
  placingMeatId: string | null;
  startPlacingMeat: (id: string) => void;
  finishPlacingMeat: (id: string, pos?: [number, number, number]) => void;
  cancelPlacingMeat: () => void;

  // Sistema de brasas y calor
  embers: EmberData[];
  embersPos: [number, number, number][];
  setEmbers: (embers: EmberData[]) => void;
  setEmbersPos: (positions: [number, number, number][]) => void;
  addEmbersAt: (pos: [number, number, number], count?: number) => void;
  decayThermalSystem: (delta?: number) => void;
  thermalGrid: number[];
  getHeatAtPosition: (
    xOrPos: number | [number, number, number] | [number, number] | { x: number; y?: number; z: number },
    yOrZ?: number,
    optZ?: number
  ) => number;

  // Fogón criollo y acarreo de brasas
  fogonStage: FogonStage;
  fogonProgress: number;
  fogonEmbersCount: number;
  carriedEmbersCount: number;
  colocarPapelYFosforo: () => void;
  encenderFogon: () => void;
  avanzarFogon: (delta: number) => void;
  tomarBrasasDelFogon: (amount?: number) => void;
  distribuirBrasasEnParrilla: (pos: [number, number, number]) => void;
  interactFogon: () => void;

  // Limpieza y curado de la parrilla
  rustLevel: number;
  isClean: boolean;
  cleanGrill: (amount?: number) => void;
}

let meatCounter = 0;
export const generateUniqueMeatId = (prefix = 'corte'): string => {
  meatCounter += 1;
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${meatCounter}-${randomSuffix}`;
};

const createEmptyThermalGrid = (): number[] => new Array(GRID_RES * GRID_RES).fill(0);

export const useAsadoStore = create<AsadoStore>((set, get) => ({
  stage: 'playing',
  selectedTool: 'tenedor',
  toolActionTrigger: 0,

  setStage: (stage) => set({ stage }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  triggerToolAction: () => set((state) => ({ toolActionTrigger: state.toolActionTrigger + 1 })),

  meats: [
    {
      id: 'corte-tira-base',
      cut: 'Vacío Pampeano',
      position: [0, 0.42, 0],
      cookLevel: 0,
      flipped: false
    }
  ],

  embers: [],
  embersPos: [],
  thermalGrid: createEmptyThermalGrid(),

  placingMeatId: null,
  startPlacingMeat: (id: string) => set({ placingMeatId: id }),
  finishPlacingMeat: (id: string, pos?: [number, number, number]) => {
    set((state) => ({
      placingMeatId: null,
      meats: state.meats.map((m) =>
        m.id === id ? { ...m, position: pos ?? m.position } : m
      )
    }));
  },
  cancelPlacingMeat: () => set({ placingMeatId: null }),

  setMeatPosition: (id: string, pos: [number, number, number]) => {
    set((state) => ({
      meats: state.meats.map((m) => (m.id === id ? { ...m, position: pos } : m))
    }));
  },

  fogonStage: 'sin_fuego',
  fogonProgress: 0,
  fogonEmbersCount: 0,
  carriedEmbersCount: 0,

  rustLevel: 0.9,
  isClean: false,

  addMeat: (meat) => set((state) => {
    let resolvedId = meat.id;
    if (!resolvedId || state.meats.some((m) => m.id === resolvedId)) {
      resolvedId = generateUniqueMeatId(meat.cut ? meat.cut.toLowerCase().replace(/\s+/g, '-') : 'meat');
    }

    return {
      meats: [
        ...state.meats,
        {
          ...meat,
          id: resolvedId,
          cookLevel: meat.cookLevel ?? 0,
          flipped: meat.flipped ?? false
        }
      ]
    };
  }),

  addNewMeat: (cutType: 'vacio' | 'chorizo') => {
    const isVacio = cutType === 'vacio';
    const cutName = isVacio ? 'Vacío Pampeano' : 'Chorizo Criollo';
    const pos: [number, number, number] = isVacio ? [0, 0.42, 0] : [0, 0.40, 0];
    const newId = generateUniqueMeatId(cutType);
    get().addMeat({
      id: newId,
      cut: cutName,
      position: pos,
      cookLevel: 0,
      flipped: false
    });
    get().startPlacingMeat(newId);
  },

  addNewRandomMeat: () => {
    const cuts: ('vacio' | 'chorizo')[] = ['vacio', 'chorizo'];
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)];
    get().addNewMeat(randomCut);
  },

  updateCookLevel: (id, levelDelta) => set((state) => ({
    meats: state.meats.map((meat) =>
      meat.id === id
        ? { ...meat, cookLevel: Math.min(Math.max(meat.cookLevel + levelDelta, 0), 2.0) }
        : meat
    )
  })),

  flipMeat: (id) => {
    get().triggerToolAction();
    set((state) => ({
      meats: state.meats.map((meat) =>
        meat.id === id ? { ...meat, flipped: !meat.flipped } : meat
      )
    }));
  },

  setEmbers: (embers: EmberData[]) => set({
    embers,
    embersPos: embers.map((e) => e.position)
  }),

  setEmbersPos: (positions: [number, number, number][]) => set((state) => {
    const updatedEmbers: EmberData[] = positions.map((pos, i) => {
      const existing = state.embers[i];
      if (existing) {
        return { ...existing, position: pos };
      }
      return {
        id: `ember-${i}`,
        position: pos,
        temperature: 0.85,
        decayRate: 0.002
      };
    });
    return {
      embersPos: positions,
      embers: updatedEmbers
    };
  }),

  addEmbersAt: (pos: [number, number, number], count = 6) => {
    set((state) => {
      const newEmbers: EmberData[] = [];
      const timestamp = Date.now();
      for (let i = 0; i < count; i++) {
        const jitterX = (Math.random() - 0.5) * 0.32;
        const jitterZ = (Math.random() - 0.5) * 0.32;
        newEmbers.push({
          id: `ember-added-${timestamp}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          position: [pos[0] + jitterX, 0.02, pos[2] + jitterZ],
          temperature: 0.9 + Math.random() * 0.1,
          decayRate: 0.0018 + Math.random() * 0.001
        });
      }
      const combined = [...state.embers, ...newEmbers];
      return {
        embers: combined,
        embersPos: combined.map((e) => e.position)
      };
    });
  },

  colocarPapelYFosforo: () => {
    set((state) => {
      if (state.fogonStage === 'sin_fuego') {
        return { fogonStage: 'con_papel' };
      }
      return state;
    });
  },

  encenderFogon: () => {
    set((state) => {
      if (state.fogonStage === 'con_papel') {
        return { fogonStage: 'encendido', fogonProgress: 0.05 };
      }
      return state;
    });
  },

  avanzarFogon: (delta: number) => {
    set((state) => {
      if (state.fogonStage !== 'encendido') return state;

      const nextProgress = Math.min(1.0, state.fogonProgress + delta * 0.09);

      if (nextProgress >= 1.0) {
        return {
          fogonStage: 'brasas_listas',
          fogonProgress: 1.0,
          fogonEmbersCount: Math.max(state.fogonEmbersCount, 40)
        };
      }

      return { fogonProgress: nextProgress };
    });
  },

  tomarBrasasDelFogon: (amount = 8) => {
    const state = get();
    state.triggerToolAction();
    if (state.fogonStage !== 'brasas_listas' || state.fogonEmbersCount <= 0) {
      return;
    }
    const toTake = Math.min(amount, state.fogonEmbersCount);
    set({
      fogonEmbersCount: state.fogonEmbersCount - toTake,
      carriedEmbersCount: state.carriedEmbersCount + toTake
    });
  },

  distribuirBrasasEnParrilla: (pos: [number, number, number]) => {
    const { carriedEmbersCount, addEmbersAt, triggerToolAction } = get();
    triggerToolAction();
    if (carriedEmbersCount > 0) {
      const toDistribute = Math.min(carriedEmbersCount, 6);
      addEmbersAt(pos, toDistribute);
      set({ carriedEmbersCount: carriedEmbersCount - toDistribute });
    } else {
      const { fogonStage, fogonEmbersCount } = get();
      if (fogonStage === 'brasas_listas' && fogonEmbersCount > 0) {
        const toTake = Math.min(6, fogonEmbersCount);
        addEmbersAt(pos, toTake);
        set({ fogonEmbersCount: fogonEmbersCount - toTake });
      }
    }
  },

  interactFogon: () => {
    const { fogonStage, colocarPapelYFosforo, encenderFogon, tomarBrasasDelFogon, setSelectedTool, triggerToolAction } = get();
    triggerToolAction();
    if (fogonStage === 'sin_fuego') {
      colocarPapelYFosforo();
    } else if (fogonStage === 'con_papel') {
      encenderFogon();
    } else if (fogonStage === 'brasas_listas') {
      setSelectedTool('pala');
      tomarBrasasDelFogon(8);
    }
  },

  cleanGrill: (amount = 0.06) => {
    get().triggerToolAction();
    set((state) => {
      const nextRust = Math.max(0, state.rustLevel - amount);
      return {
        rustLevel: nextRust,
        isClean: nextRust <= 0.05
      };
    });
  },

  decayThermalSystem: (delta = 0.016) => {
    set((state) => {
      if (state.embers.length === 0) {
        const hasHeat = state.thermalGrid.some((h) => h > 0.001);
        if (!hasHeat) return state;

        return {
          thermalGrid: state.thermalGrid.map((h) => Math.max(0, h * (1 - 0.08 * delta)))
        };
      }

      let embersChanged = false;
      const updatedEmbers = state.embers.map((ember) => {
        if (ember.temperature <= 0) return ember;
        const decay = (ember.decayRate ?? 0.002) * delta;
        const newTemp = Math.max(0, ember.temperature - decay);
        if (newTemp !== ember.temperature) {
          embersChanged = true;
        }
        return { ...ember, temperature: newTemp };
      });

      const nextGrid = [...state.thermalGrid];
      const stepX = (GRID_BOUNDS.maxX - GRID_BOUNDS.minX) / GRID_RES;
      const stepZ = (GRID_BOUNDS.maxZ - GRID_BOUNDS.minZ) / GRID_RES;

      for (let i = 0; i < nextGrid.length; i++) {
        const cellVal = nextGrid[i] ?? 0;
        nextGrid[i] = Math.max(0, cellVal * (1 - 0.02 * delta));
      }

      for (const ember of updatedEmbers) {
        if (ember.temperature <= 0.01) continue;

        const cellX = Math.floor((ember.position[0] - GRID_BOUNDS.minX) / stepX);
        const cellZ = Math.floor((ember.position[2] - GRID_BOUNDS.minZ) / stepZ);

        if (cellX >= 0 && cellX < GRID_RES && cellZ >= 0 && cellZ < GRID_RES) {
          const idx = cellZ * GRID_RES + cellX;
          const currentCellHeat = nextGrid[idx] ?? 0;
          nextGrid[idx] = Math.min(3.0, currentCellHeat + ember.temperature * 0.15 * delta);
        }
      }

      return {
        embers: embersChanged ? updatedEmbers : state.embers,
        thermalGrid: nextGrid
      };
    });
  },

  getHeatAtPosition: (
    xOrPos: number | [number, number, number] | [number, number] | { x: number; y?: number; z: number },
    yOrZ?: number,
    optZ?: number
  ): number => {
    const { embers, thermalGrid } = get();

    if (embers.length === 0 && thermalGrid.every((h) => h <= 0.001)) {
      return 0.0;
    }

    let px = 0;
    let pz = 0;

    if (typeof xOrPos === 'number') {
      px = xOrPos;
      pz = typeof yOrZ === 'number' && typeof optZ === 'number' ? optZ : (yOrZ ?? 0);
    } else if (Array.isArray(xOrPos)) {
      px = xOrPos[0] ?? 0;
      pz = (xOrPos.length > 2 ? xOrPos[2] : xOrPos[1]) ?? 0;
    } else if (typeof xOrPos === 'object') {
      px = xOrPos.x ?? 0;
      pz = xOrPos.z ?? 0;
    }

    const stepX = (GRID_BOUNDS.maxX - GRID_BOUNDS.minX) / GRID_RES;
    const stepZ = (GRID_BOUNDS.maxZ - GRID_BOUNDS.minZ) / GRID_RES;
    const cellX = Math.floor((px - GRID_BOUNDS.minX) / stepX);
    const cellZ = Math.floor((pz - GRID_BOUNDS.minZ) / stepZ);

    let gridHeat = 0;
    if (cellX >= 0 && cellX < GRID_RES && cellZ >= 0 && cellZ < GRID_RES) {
      gridHeat = thermalGrid[cellZ * GRID_RES + cellX] ?? 0;
    }

    let directEmberHeat = 0;
    for (const ember of embers) {
      if (ember.temperature <= 0.05) continue;
      const dx = px - ember.position[0];
      const dz = pz - ember.position[2];
      const distSq = dx * dx + dz * dz;

      if (distSq < 0.12) {
        directEmberHeat += ember.temperature * (1.0 - distSq / 0.12);
      }
    }

    return Math.min(2.5, gridHeat * 0.5 + directEmberHeat * 0.85);
  }
}));
