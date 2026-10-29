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
