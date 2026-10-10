import { create } from 'zustand';

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

export interface AsadoStore {
  meats: MeatItem[];
  embers: EmberData[];
  embersPos: [number, number, number][];
  addMeat: (meat: AddMeatInput) => void;
  updateCookLevel: (id: string, levelDelta: number) => void;
  flipMeat: (id: string) => void;
  setEmbers: (embers: EmberData[]) => void;
  setEmbersPos: (positions: [number, number, number][]) => void;
  decayThermalSystem: (delta?: number) => void;
  getHeatAtPosition: (
    xOrPos: number | [number, number, number] | [number, number] | { x: number; y?: number; z: number },
    yOrZ?: number,
    optZ?: number
  ) => number;
}

// Función pura de transferencia térmica según la ley del inverso del cuadrado
export const calculateHeatTransfer = (
  targetPosition: [number, number, number] | [number, number],
  embers: ([number, number, number] | EmberData)[]
): number => {
  let totalHeat = 0;
  const targetX = targetPosition[0];
  const targetY = targetPosition.length >= 3 ? targetPosition[1] : 0.3;
  const targetZ = (targetPosition.length >= 3 ? targetPosition[2] : targetPosition[1]) ?? 0;

  for (const ember of embers) {
    const pos = Array.isArray(ember) ? ember : ember.position;
    const temp = Array.isArray(ember) ? 1.0 : ember.temperature;
    if (temp <= 0.001) continue;

    const dx = targetX - pos[0];
    const dy = targetY - pos[1];
    const dz = targetZ - pos[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    totalHeat += temp / (distanceSq + 0.1);
  }
  return totalHeat;
};

// Distribución inicial de brasas incandescentes bajo la grilla de la parrilla
export const createInitialEmbers = (count = 120): EmberData[] => {
  const initial: EmberData[] = [];
  for (let i = 0; i < count; i++) {
    initial.push({
      id: `ember-${i}`,
      position: [
        (Math.random() - 0.5) * 3.4,
        0.02,
        (Math.random() - 0.5) * 2.8
      ],
      temperature: 0.75 + Math.random() * 0.25, // Brasas al rojo vivo
      decayRate: 0.003 + Math.random() * 0.002
    });
  }
  return initial;
};

const defaultEmbers = createInitialEmbers(120);

export const useAsadoStore = create<AsadoStore>((set, get) => ({
  meats: [],
  embers: defaultEmbers,
  embersPos: defaultEmbers.map(e => e.position),

  addMeat: (meat) => set((state) => ({
    meats: [
      ...state.meats,
      {
        ...meat,
        cookLevel: meat.cookLevel ?? 0,
        flipped: meat.flipped ?? false
      }
    ]
  })),

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
    embersPos: embers.map(e => e.position)
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
        temperature: 0.8,
        decayRate: 0.003
      };
    });
    return {
      embersPos: positions,
      embers: updatedEmbers
    };
  }),

  // Sistema de decaimiento térmico del fuego del asado
  decayThermalSystem: (delta = 0.016) => {
    set((state) => {
      if (state.embers.length === 0) return state;

      let changed = false;
      const updatedEmbers = state.embers.map((ember) => {
        if (ember.temperature <= 0) return ember;
        const decay = (ember.decayRate ?? 0.003) * delta;
        const newTemp = Math.max(0, ember.temperature - decay);
        if (newTemp !== ember.temperature) {
          changed = true;
        }
        return {
          ...ember,
          temperature: newTemp
        };
      });

      if (!changed) return state;
      return { embers: updatedEmbers };
    });
  },

  // Consulta térmica flexible: soporta (x, z), (x, y, z), [x, y, z], [x, z], o { x, y, z }
  getHeatAtPosition: (
    xOrPos: number | [number, number, number] | [number, number] | { x: number; y?: number; z: number },
    yOrZ?: number,
    optZ?: number
  ): number => {
    const { embers } = get();
    let targetX = 0;
    let targetY = 0.3; // Altura estándar del plano del emparrillado
    let targetZ = 0;

    if (typeof xOrPos === 'number') {
      targetX = xOrPos;
      if (typeof optZ === 'number' && typeof yOrZ === 'number') {
        // (x, y, z)
        targetY = yOrZ;
        targetZ = optZ;
      } else {
        // (x, z)
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

    let totalHeat = 0;
    for (let i = 0; i < embers.length; i++) {
      const ember = embers[i];
      if (!ember || ember.temperature <= 0.001) continue;

      const dx = targetX - ember.position[0];
      const dy = targetY - ember.position[1];
      const dz = targetZ - ember.position[2];
      const distanceSq = dx * dx + dy * dy + dz * dz;

      // Ley física del inverso del cuadrado con factor de atenuación epsilon = 0.1
      totalHeat += ember.temperature / (distanceSq + 0.1);
    }

    return totalHeat;
  }
}));
