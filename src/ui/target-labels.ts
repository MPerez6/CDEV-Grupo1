import type { TargetKind } from '../gameplay/targets.ts';
import { DOG_NAME } from '../ai/dog-brain.ts';

export function targetName(kind: TargetKind, index?: number): string {
  const names: Record<TargetKind, string> = {
    'fuel-coal': '🪨 Carbón vegetal · [E] Cargar 3 trozos al brasero',
    'fuel-small-wood': '🪵 Leña fina · [E] Cargar 2 ramas al brasero',
    'fuel-large-wood': '🪵 Leña gruesa · [E] Cargar quebracho al brasero',
    'tinder': '🗞️ Papel y ramitas · [E] Colocar iniciador bajo el brasero',
    'brazier': '🔥 Brasero · [4 + Clic] Golpear con atizador para soltar brasas',
    'tinder-pad': '🗞️ Iniciador de fuego · [1 + Clic] Encender con encendedor',
    'tray': '✨ Brasas en mesada · [2 + Clic] Recoger con la pala',
    'grill-cell': `♨️ Parrilla (Sector ${index === undefined ? '?' : index + 1}) · [2] Brasas · [3] Carne · [4] Desparramar`,
    'meat': '🥩 Corte de carne · [3 + E] Agarrar · [R] Dar vuelta · [Q] Girar 90°',
    'board': '🔪 Tabla de preparación · [3 + E] Apoyar el corte de la pinza',
    'radio': '📻 Radio portátil · [E] Prender / cambiar estación / apagar',
    'dog': `🐕 ${DOG_NAME} · [E] Acariciar`,
    'plate': `🍽️ Plato (Lugar ${(index ?? 0) + 1}) · [3 + Clic / E] Servir corte al comensal`,
    'client': '🧑 Comensal · [E] Consultar pedido · [3 + Clic / E] Entregar corte',
  };
  return names[kind];
}
