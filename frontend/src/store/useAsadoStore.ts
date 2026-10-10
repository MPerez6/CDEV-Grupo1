import { create } from 'zustand';

export type AsadoTool = 'pala' | 'atizador' | 'tenedor' | 'cepillo';
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
  setStage: (stage: GameStage) => void;
  setSelectedTool: (tool: AsadoTool) => void;

  // Estado de los cortes
  meats: MeatItem[];
  addMeat: (meat: AddMeatInput) => void;
  updateCookLevel: (id: string, levelDelta: number) => void;
  flipMeat: (id: string) => void;

  // Sistema de brasas y calor
  embers: EmberData[];
  embersPos: [number, number, number][];
  setEmbers: (embers: EmberData[]) => void;
  setEmbersPos: (positions: [number, number, number][]) => void;
  addEmbersAt: (pos: [number, number, number], count?: number) => void;
  decayThermalSystem: (delta?: number) => void;
  thermalGrid: number[]; // Grilla térmica 2D plana (GRID_RES x GRID_RES)
  getHeatAtPosition: (
    xOrPos: number | [number, number, number] | [number, number] | { x: number; y?: number; z: number },
    yOrZ?: number,
    optZ?: number
  ) => number;

  // Hito 1.1 y 1.2: Fogón criollo y acarreo de brasas
  fogonStage: FogonStage;
  fogonProgress: number; // 0 a 1 colapso de leña
  fogonEmbersCount: number; // Brasas producidas en el fogón
  carriedEmbersCount: number; // Brasas en la pala/atizador
  colocarPapelYFosforo: () => void;
  encenderFogon: () => void;
  avanzarFogon: (delta: number) => void;
  tomarBrasasDelFogon: (amount?: number) => void;
  distribuirBrasasEnParrilla: (pos: [number, number, number]) => void;

  // Hito 1.3: Limpieza y curado de la parrilla
  rustLevel: number; // 1.0 (oxidada/sucia) a 0.0 (curada y limpia)
  isClean: boolean;
  cleanGrill: (amount?: number) => void;
}

// Generador de IDs únicos para evitar colisión de keys
let meatCounter = 0;
export const generateUniqueMeatId = (prefix = 'corte'): string => {
  meatCounter += 1;
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${meatCounter}-${randomSuffix}`;
};

// Brasas iniciales bajo el emparrillado
export const createInitialEmbers = (count = 60): EmberData[] => {
  const initial: EmberData[] = [];
  for (let i = 0; i < count; i++) {
    initial.push({
      id: `ember-init-${i}`,
      position: [
        (Math.random() - 0.5) * 1.6,
        0.02,
        (Math.random() - 0.5) * 1.6
      ],
      temperature: 0.8 + Math.random() * 0.2,
      decayRate: 0.002 + Math.random() * 0.001
    });
  }
  return initial;
};

const defaultEmbers = createInitialEmbers(60);

// Inicializa la grilla térmica 2D con ceros
const createEmptyThermalGrid = (): number[] => new Array(GRID_RES * GRID_RES).fill(0);

export const useAsadoStore = create<AsadoStore>((set, get) => ({
  stage: 'menu',
  selectedTool: 'tenedor',

  setStage: (stage) => set({ stage }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),

  // Corte de prueba visible por defecto asegurado en position={[0, 0.45, 0]}
  meats: [
    {
      id: 'corte-tira-base',
      cut: 'Tira de Asado Criolla',
      position: [0, 0.45, 0],
      cookLevel: 0,
      flipped: false
    }
  ],

  embers: defaultEmbers,
  embersPos: defaultEmbers.map((e) => e.position),
  thermalGrid: createEmptyThermalGrid(),

  // Fogón y fuego
  fogonStage: 'sin_fuego',
  fogonProgress: 0,
  fogonEmbersCount: 0,
  carriedEmbersCount: 0,

  // Limpieza de parrilla
  rustLevel: 1.0,
  isClean: false,

  addMeat: (meat) => set((state) => {
    let resolvedId = meat.id;
    if (!resolvedId || state.meats.some((m) => m.id === resolvedId)) {
      resolvedId = generateUniqueMeatId(resolvedId || 'meat');
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

  updateCookLevel: (id, levelDelta) => set((state) => ({
    meats: state.meats.map((meat) =>
      meat.id === id
        ? { ...meat, cookLevel: Math.min(Math.max(meat.cookLevel + levelDelta, 0), 2) }
        : meat
    )
  })),

  flipMeat: (id) => set((state) => ({
    meats: state.meats.map((meat) =>
      meat.id === id ? { ...meat, flipped: !meat.flipped } : meat
    )
  })),

  setEmbers: (embers) => set({
    embers,
    embersPos: embers.map((e) => e.position)
  }),

  setEmbersPos: (positions) => set((state) => {
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
        const jitterX = (Math.random() - 0.5) * 0.28;
        const jitterZ = (Math.random() - 0.5) * 0.28;
        newEmbers.push({
          id: `ember-added-${timestamp}-${i}-${Math.random()}`,
          position: [pos[0] + jitterX, 0.02, pos[2] + jitterZ],
          temperature: 0.9 + Math.random() * 0.1, // Al rojo vivo
          decayRate: 0.002 + Math.random() * 0.001
        });
      }
      const combined = [...state.embers, ...newEmbers];
      return {
        embers: combined,
        embersPos: combined.map((e) => e.position)
      };
    });
  },

  // Fogón: interacción y progresión
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

      // Progresión paulatina de la combustión de la leña (aprox. 10-12 segundos a fuego vivo)
      const nextProgress = Math.min(1.0, state.fogonProgress + delta * 0.08);

      if (nextProgress >= 1.0) {
        return {
          fogonStage: 'brasas_listas',
          fogonProgress: 1.0,
          fogonEmbersCount: Math.max(state.fogonEmbersCount, 35)
        };
      }

      return { fogonProgress: nextProgress };
    });
  },

  tomarBrasasDelFogon: (amount = 8) => {
    set((state) => {
      if (state.fogonStage !== 'brasas_listas' || state.fogonEmbersCount <= 0) {
        return state;
      }
      const toTake = Math.min(amount, state.fogonEmbersCount);
      return {
        fogonEmbersCount: state.fogonEmbersCount - toTake,
        carriedEmbersCount: state.carriedEmbersCount + toTake
      };
    });
  },

  distribuirBrasasEnParrilla: (pos: [number, number, number]) => {
    const { carriedEmbersCount, addEmbersAt } = get();
    if (carriedEmbersCount > 0) {
      const toDistribute = Math.min(carriedEmbersCount, 6);
      addEmbersAt(pos, toDistribute);
      set({ carriedEmbersCount: carriedEmbersCount - toDistribute });
    } else {
      // Si el jugador no cargó previamente pero tiene pala/atizador y brasas en el fogón,
      // toma automáticamente del fogón y distribuye
      const { fogonStage, fogonEmbersCount } = get();
      if (fogonStage === 'brasas_listas' && fogonEmbersCount > 0) {
        const toTake = Math.min(6, fogonEmbersCount);
        addEmbersAt(pos, toTake);
        set({ fogonEmbersCount: fogonEmbersCount - toTake });
      }
    }
  },

  // Limpieza y desoxidado de la parrilla
  cleanGrill: (amount = 0.06) => {
    set((state) => {
      const nextRust = Math.max(0, state.rustLevel - amount);
      return {
        rustLevel: nextRust,
        isClean: nextRust <= 0.05
      };
    });
  },

  // Simulación térmica 2D y decaimiento térmico paulatino
  decayThermalSystem: (delta = 0.016) => {
    set((state) => {
      // 1. Decaimiento de temperatura en las brasas individuales
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

      // 2. Grilla térmica 2D: acumulación y disipación paulatina
      const nextGrid = [...state.thermalGrid];
      const stepX = (GRID_BOUNDS.maxX - GRID_BOUNDS.minX) / GRID_RES;
      const stepZ = (GRID_BOUNDS.maxZ - GRID_BOUNDS.minZ) / GRID_RES;

      // Disipación ambiental suave en cada celda
      for (let i = 0; i < nextGrid.length; i++) {
        nextGrid[i] = Math.max(0, nextGrid[i] * (1 - 0.02 * delta));
      }

      // Inyección de calor según posición y densidad de brasas vivas
      for (const ember of updatedEmbers) {
        if (ember.temperature <= 0.01) continue;

        const cellX = Math.floor((ember.position[0] - GRID_BOUNDS.minX) / stepX);
        const cellZ = Math.floor((ember.position[2] - GRID_BOUNDS.minZ) / stepZ);

        if (cellX >= 0 && cellX < GRID_RES && cellZ >= 0 && cellZ < GRID_RES) {
          const idx = cellZ * GRID_RES + cellX;
          nextGrid[idx] = Math.min(3.0, nextGrid[idx] + ember.temperature * 0.15 * delta);
        }
      }

      return {
        embers: embersChanged ? updatedEmbers : state.embers,
        thermalGrid: nextGrid
      };
    });
  },

  // Consulta térmica combinada (Grilla 2D + radiación directa de brasas)
  getHeatAtPosition: (
    xOrPos: number | [number, number, number] | [number, number] | { x: number; y?: number; z: number },
    yOrZ?: number,
    optZ?: number
  ): number => {
    const { embers, thermalGrid } = get();
    let targetX = 0;
    let targetY = 0.3; // Altura de los hierros
    let targetZ = 0;

    if (typeof xOrPos === 'number') {
      targetX = xOrPos;
      if (typeof optZ === 'number' && typeof yOrZ === 'number') {
        targetY = yOrZ;
        targetZ = optZ;
      } else {
        targetZ = yOrZ !== undefined ? yOrZ : 0;
      }
    } else if (Array.isArray(xOrPos)) {
      targetX = xOrPos[0] ?? 0;
      if (xOrPos.length >= 3) {
        targetY = xOrPos[1] ?? 0.3;
        targetZ = xOrPos[2] ?? 0;
      } else {
        targetZ = xOrPos[1] ?? 0;
      }
    } else if (typeof xOrPos === 'object' && xOrPos !== null) {
      targetX = xOrPos.x ?? 0;
      targetY = xOrPos.y !== undefined ? xOrPos.y : 0.3;
      targetZ = xOrPos.z ?? 0;
    }

    // Consulta en grilla 2D
    const stepX = (GRID_BOUNDS.maxX - GRID_BOUNDS.minX) / GRID_RES;
    const stepZ = (GRID_BOUNDS.maxZ - GRID_BOUNDS.minZ) / GRID_RES;
    const cellX = Math.floor((targetX - GRID_BOUNDS.minX) / stepX);
    const cellZ = Math.floor((targetZ - GRID_BOUNDS.minZ) / stepZ);

    let gridHeat = 0;
    if (cellX >= 0 && cellX < GRID_RES && cellZ >= 0 && cellZ < GRID_RES) {
      gridHeat = thermalGrid[cellZ * GRID_RES + cellX] || 0;
    }

    // Radiación directa inversa del cuadrado desde las brasas más cercanas
    let directHeat = 0;
    for (let i = 0; i < embers.length; i++) {
      const ember = embers[i];
      if (!ember || ember.temperature <= 0.001) continue;

      const dx = targetX - ember.position[0];
      const dy = targetY - ember.position[1];
      const dz = targetZ - ember.position[2];
      const distanceSq = dx * dx + dy * dy + dz * dz;

      directHeat += ember.temperature / (distanceSq + 0.12);
    }

    return directHeat * 0.7 + gridHeat * 0.3;
  }
}));
