import type { TargetKind } from '../gameplay/targets.ts';
export function targetName(kind: TargetKind, index?: number): string {
  const names: Record<TargetKind, string> = {
    'fuel-coal': 'Carbón vegetal bajo la mesada · E para cargar 3 trozos',
    'fuel-small-wood': 'Leña fina bajo la mesada · E para cargar',
    'fuel-large-wood': 'Leña gruesa bajo la mesada · E para cargar',
    'tinder': 'Papel y ramitas · E para colocar debajo',
    'brazier': 'Brasero · 4 + clic para golpear',
    'tinder-pad': 'Papel debajo de la canasta · 1 + clic para encender',
    'tray': 'Brasas en la mesada bajo el brasero · 2 + clic para recoger',
    'grill-cell': `Sector de parrilla ${index === undefined ? '?' : index + 1} · 2: brasas · 3: carne · 4 + clic: mover brasas`,
    'meat': 'Carne · E con pinza para recoger; R para dar vuelta o rodar; Q para orientar',
    'board': 'Mesa de preparación · E con pinza para devolver la pieza sostenida',
  };
  return names[kind];
}
