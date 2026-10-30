import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import type { FuelKind } from '../sim/embers.ts';
import type { InteractionTarget } from './targets.ts';
import { TOOL_NAMES } from './tools.ts';

export type ToolAnimationEvent =
  | 'equip'
  | 'ignite'
  | 'lighter-flick'
  | 'shovel-scoop'
  | 'shovel-deposit'
  | 'shovel-return'
  | 'shovel-tap'
  | 'tongs-grab'
  | 'tongs-release'
  | 'tongs-flip'
  | 'tongs-rotate'
  | 'tongs-clack'
  | 'poker-hit'
  | 'poker-rake'
  | 'poker-swing';

export type ToolAnimationDetail = {
  dirX?: number;
  dirZ?: number;
};

function cellCenterM(index: number): { x: number; z: number } {
  const col = ((index % CONFIG.gridColumns) + CONFIG.gridColumns) % CONFIG.gridColumns;
  const row = Math.max(0, Math.min(CONFIG.gridRows - 1, Math.floor(index / CONFIG.gridColumns)));
  return {
    x: ((col + 0.5) / CONFIG.gridColumns) * CONFIG.grillWidthM,
    z: ((row + 0.5) / CONFIG.gridRows) * CONFIG.grillDepthM,
  };
}

export function createGameplay(
  world: SimulationWorld,
  onMessage: (message: string) => void = () => { },
  onToolAction: (event: ToolAnimationEvent, detail?: ToolAnimationDetail) => void = () => { },
) {
  let activeTool = 0;
  function notify(message: string): void { world.message = message; onMessage(message); }
  function idleClickFeedback(): void {
    if(activeTool === 0) onToolAction('lighter-flick');
    else if(activeTool === 1) onToolAction('shovel-tap');
    else if(activeTool === 2) onToolAction('tongs-clack');
    else if(activeTool === 3) onToolAction('poker-swing');
  }
  function loadFuel(kind: FuelKind, quantity: number): void {
    let added = 0;
    while(added < quantity && world.brazier.addFuel(kind)) added++;
    if(!added) return notify(world.brazier.lastEvent);
    const name = kind === 'charcoal' ? 'carbón' : kind === 'small-wood' ? 'leña fina' : 'leña gruesa';
    notify(`Agregaste ${added} pieza${added > 1 ? 's' : ''} de ${name} al brasero.${added < quantity ? ' No cabe más por ahora.' : ''}`);
  }
  function interact(target: InteractionTarget | null): void {
    if(!target) return notify('Acercate y apuntá a un objeto para interactuar.');
    const kind = target.kind;
    switch(kind) {
      case 'fuel-coal':
        loadFuel('charcoal', 3);
        break;
      case 'fuel-small-wood':
        loadFuel('small-wood', 2);
        break;
      case 'fuel-large-wood':
        loadFuel('large-wood', 1);
        break;
      case 'tinder':
        world.brazier.addTinder();
        notify(world.brazier.lastEvent);
        break;
      case 'meat':
        if(activeTool !== 2) return notify('Equipá la pinza (3) para manipular la carne.');
        onToolAction(world.takeMeat(target.meatId as number) ? 'tongs-grab' : 'tongs-clack');
        notify(world.message);
        break;
      case 'board':
        if(activeTool === 2 && world.carriedMeatId !== null) {
          if(world.returnMeatToBoard()) onToolAction('tongs-release');
          notify(world.message);
        }
        break;
      default:
        notify('Para esa acción utilizá la herramienta indicada en pantalla.');
    }
  }
  function primaryAction(target: InteractionTarget | null): void {
    if(!target) {
      idleClickFeedback();
      return notify('Apuntá a un objeto cercano.');
    }
    const kind = target.kind;
    if(kind === 'tinder-pad' && activeTool === 0) {
      const ignited = world.brazier.ignite();
      onToolAction(ignited ? 'ignite' : 'lighter-flick');
      return notify(world.brazier.lastEvent);
    }
    if(kind === 'brazier' && activeTool === 3) {
      world.brazier.hit();
      onToolAction('poker-hit');
      return notify(world.brazier.lastEvent);
    }
    if(kind === 'tray' && activeTool === 1) {
      if(world.carried) {
        onToolAction('shovel-tap');
        return notify(world.carried.state === 'ready'
          ? 'La pala ya tiene brasas. Depositalas en la parrilla.' : 'La pala tiene un fragmento inmaduro. Devolvelo al brasero.');
      }
      world.carried = world.brazier.takeFromTray();
      onToolAction(world.carried ? 'shovel-scoop' : 'shovel-tap');
      return notify(world.brazier.lastEvent);
    }
    if(kind === 'brazier' && activeTool === 1) {
      onToolAction(world.returnImmature() ? 'shovel-return' : 'shovel-tap');
      return notify(world.message);
    }
    if(kind === 'grill-cell' && activeTool === 1) {
      onToolAction(world.depositEmber(target.index as number, target.emberPointM) ? 'shovel-deposit' : 'shovel-tap');
      return notify(world.message);
    }
    if(kind === 'grill-cell' && activeTool === 3) {
      const pointM = target.emberPointM ?? cellCenterM(target.index ?? 0);
      const result = world.pokeEmbers({
        pointM,
        aimDir: target.pokerAim
          ? { x: target.pokerAim.dirX, z: target.pokerAim.dirZ, pitchDown: target.pokerAim.pitchDown }
          : undefined,
      });
      if(result.moved > 0) onToolAction('poker-rake', { dirX: result.dirX, dirZ: result.dirZ });
      else onToolAction('poker-swing');
      return notify(world.message);
    }
    if(kind === 'grill-cell' && activeTool === 2 && world.carriedMeatId !== null) {
      onToolAction(world.placeMeat(target.index as number) ? 'tongs-release' : 'tongs-clack');
      return notify(world.message);
    }
    idleClickFeedback();
    notify('Esa herramienta no sirve para este objeto o todavía falta una acción.');
  }

  return {
    interact, primaryAction, get activeTool(): number { return activeTool; },
    rakeEmbers(fromTarget: InteractionTarget | null, toTarget: InteractionTarget | null): boolean {
      if(activeTool !== 3 || fromTarget?.kind !== 'grill-cell' || toTarget?.kind !== 'grill-cell') return false;
      if(!fromTarget.emberPointM || !toTarget.emberPointM) return false;
      const dx = toTarget.emberPointM.x - fromTarget.emberPointM.x;
      const dz = toTarget.emberPointM.z - fromTarget.emberPointM.z;
      if(Math.hypot(dx, dz) < 1e-4) return false;
      const result = world.pokeEmbers({
        pointM: fromTarget.emberPointM,
        dragDeltaM: { x: dx, z: dz },
      });
      if(result.moved > 0) {
        onToolAction('poker-rake', { dirX: result.dirX, dirZ: result.dirZ });
        notify(world.message);
        return true;
      }
      return false;
    },
    equip(index: number): void {
      if(!Number.isInteger(index) || index < 0 || index >= TOOL_NAMES.length) return;
      const changed = activeTool !== index;
      activeTool = index;
      if(changed) onToolAction('equip');
      notify(`Herramienta equipada: ${TOOL_NAMES[activeTool]}.`);
    },
    flip(target: InteractionTarget | null): void {
      if(activeTool !== 2 || target?.kind !== 'meat' || world.carriedMeatId !== null)
        return notify('Apuntá a una carne en la parrilla con la pinza equipada (3).');
      if(world.flipMeat(target.meatId as number)) onToolAction('tongs-flip');
      notify(world.message);
    },
    rotate(target: InteractionTarget | null): void {
      if(activeTool !== 2) return;
      const id = world.carriedMeatId ?? target?.meatId;
      if(typeof id === 'number') {
        if(world.rotateMeat(id)) onToolAction('tongs-rotate');
        notify(world.message);
      }
    },
  };
}
export type GameplayController = ReturnType<typeof createGameplay>;
