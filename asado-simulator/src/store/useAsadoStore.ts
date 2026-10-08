import { create } from 'zustand';

export interface MeatItem {
  id: string;
  cut: string;
  position: [number, number, number];
  cookLevel: number; // 0: raw, 1: perfectly cooked, 2: burnt
  flipped: boolean;
}

interface AsadoStore {
  meats: MeatItem[];
  embersPos: [number, number, number][];
  addMeat: (meat: Omit<MeatItem, 'cookLevel' | 'flipped'>) => void;
  updateCookLevel: (id: string, levelDelta: number) => void;
  flipMeat: (id: string) => void;
  setEmbersPos: (positions: [number, number, number][]) => void;
}

export const useAsadoStore = create<AsadoStore>((set) => ({
  meats: [],
  embersPos: [],
  addMeat: (meat) => set((state) => ({
    meats: [...state.meats, { ...meat, cookLevel: 0, flipped: false }]
  })),
  updateCookLevel: (id, levelDelta) => set((state) => ({
    meats: state.meats.map((meat) => 
      meat.id === id ? { ...meat, cookLevel: Math.min(Math.max(meat.cookLevel + levelDelta, 0), 2) } : meat
    )
  })),
  flipMeat: (id) => set((state) => ({
    meats: state.meats.map((meat) =>
      meat.id === id ? { ...meat, flipped: !meat.flipped } : meat
    )
  })),
  setEmbersPos: (positions) => set({ embersPos: positions })
}));
