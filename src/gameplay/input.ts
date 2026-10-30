import type { GameplayController } from './actions.ts';
import type { InteractionTarget } from './targets.ts';

/** Pointer Lock redirige el mouse al elemento bloqueado (body), no al canvas. */
export function bindPrimaryAction(target: EventTarget, isPlaying: () => boolean, action: () => void): () => void {
  const onMouseDown = (event: Event): void => {
    if((event as MouseEvent).button !== 0 || !isPlaying()) return;
    action();
  };
  target.addEventListener('mousedown', onMouseDown);
  return () => target.removeEventListener('mousedown', onMouseDown);
}

/** Permite arrastrar brasas continuamente manteniendo presionado el clic izquierdo con el atizador. */
export function bindPokerSweep(target: EventTarget, options: {
  isPlaying: () => boolean;
  gameplay: GameplayController;
  getTarget: () => InteractionTarget | null;
}): () => void {
  const { isPlaying, gameplay, getTarget } = options;
  let anchor: InteractionTarget | null = null;

  const onMouseDown = (event: Event): void => {
    if((event as MouseEvent).button !== 0 || !isPlaying() || gameplay.activeTool !== 3) {
      anchor = null;
      return;
    }
    const current = getTarget();
    anchor = current?.kind === 'grill-cell' && current.emberPointM ? current : null;
  };

  const onMouseMove = (): void => {
    if(!anchor || !anchor.emberPointM || !isPlaying() || gameplay.activeTool !== 3) {
      anchor = null;
      return;
    }
    const next = getTarget();
    if(next?.kind !== 'grill-cell' || !next.emberPointM) return;
    const dist = Math.hypot(next.emberPointM.x - anchor.emberPointM.x, next.emberPointM.z - anchor.emberPointM.z);
    if(dist >= 0.075) {
      gameplay.rakeEmbers(anchor, next);
      anchor = next;
    }
  };

  const clearAnchor = (): void => { anchor = null; };

  target.addEventListener('mousedown', onMouseDown);
  target.addEventListener('mousemove', onMouseMove);
  target.addEventListener('mouseup', clearAnchor);
  return () => {
    target.removeEventListener('mousedown', onMouseDown);
    target.removeEventListener('mousemove', onMouseMove);
    target.removeEventListener('mouseup', clearAnchor);
    anchor = null;
  };
}

export function bindGameplayInput(target: EventTarget, options: {
  isPlaying: () => boolean; keys: Set<string>; gameplay: GameplayController;
  getTarget: () => InteractionTarget | null; toggleDebug: () => void;
}): () => void {
  const { isPlaying, keys, gameplay, getTarget, toggleDebug } = options;
  const keydown = (event: Event): void => {
    const key = event as KeyboardEvent;
    if(key.code === 'F3') { toggleDebug(); key.preventDefault(); return; }
    if(!isPlaying()) return;
    keys.add(key.code);
    if(key.code === 'KeyE' && !key.repeat) gameplay.interact(getTarget());
    if(/^Digit[1-4]$/.test(key.code)) gameplay.equip(Number(key.code.slice(-1)) - 1);
    if(key.code === 'KeyR' && !key.repeat) gameplay.flip(getTarget());
    if(key.code === 'KeyQ' && !key.repeat) gameplay.rotate(getTarget());
  };
  const keyup = (event: Event): void => { keys.delete((event as KeyboardEvent).code); };
  target.addEventListener('keydown', keydown); target.addEventListener('keyup', keyup);
  return () => { target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); keys.clear(); };
}
