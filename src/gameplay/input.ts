import type { GameplayController } from './actions.ts';
import type { InteractionTarget } from './targets.ts';

/** Las coordenadas vienen del rayo central en la tabla, también bajo Pointer Lock. */
export function bindPreparationStroke(target: EventTarget, options: {
  isPlaying: () => boolean;
  gameplay: GameplayController;
  getTarget: () => InteractionTarget | null;
}): () => void {
  const { isPlaying, gameplay, getTarget } = options;
  let tool: GameplayController['preparationTool'] = null;
  let start: InteractionTarget['prepPoint'], last: InteractionTarget['prepPoint'];
  let pieceId: number | undefined;
  const clear = () => { start = last = undefined; tool = null; pieceId = undefined; gameplay.setKnifeStroke(null); };
  const down = (event: Event) => {
    clear();
    if ((event as MouseEvent).button !== 0 || !isPlaying()) return;
    tool = gameplay.preparationTool;
    const hit = tool && getTarget();
    start = last = hit?.prepPoint;
    pieceId = hit?.meatId;
  };
  const move = (event: Event) => {
    if (!tool || tool !== gameplay.preparationTool || !isPlaying() || !((event as MouseEvent).buttons & 1)) return clear();
    const hit = getTarget(), point = hit?.prepPoint;
    if (!hit || !point) { if (tool.kind === 'seasoning') last = undefined; return; }
    start ??= point;
    if (tool.kind === 'knife') {
      pieceId ??= hit.meatId;
      if (Math.hypot(point.x - start.x, point.z - start.z) >= .025) gameplay.setKnifeStroke({ from: start, to: point }, pieceId);
      else gameplay.setKnifeStroke(null);
      return;
    }
    if (hit.kind !== 'meat') { last = undefined; pieceId = undefined; return; }
    if (!last || pieceId !== hit.meatId) { last = point; pieceId = hit.meatId; gameplay.applyPreparation(hit); return; }
    const dx = point.x - last.x, dz = point.z - last.z, distance = Math.hypot(dx, dz);
    const steps = Math.floor(distance / .025), origin = last;
    for (let step = 1; step <= steps; step++) {
      const t = step * .025 / distance;
      last = { x: origin.x + dx * t, z: origin.z + dz * t };
      gameplay.applyPreparation({ ...hit, prepPoint: last });
    }
  };
  const up = (event: Event) => {
    if ((event as MouseEvent).button !== 0) return;
    if (tool?.kind === 'knife' && tool === gameplay.preparationTool && isPlaying()) gameplay.finishCut();
    clear();
  };
  const cancelEvents = ['pointerlockchange', 'visibilitychange', 'pointercancel', 'blur'];
  for (const name of cancelEvents) target.addEventListener(name, clear);
  target.addEventListener('mousedown', down);
  target.addEventListener('mousemove', move);
  target.addEventListener('mouseup', up);
  return () => {
    for (const name of cancelEvents) target.removeEventListener(name, clear);
    target.removeEventListener('mousedown', down);
    target.removeEventListener('mousemove', move);
    target.removeEventListener('mouseup', up);
    clear();
  };
}

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
