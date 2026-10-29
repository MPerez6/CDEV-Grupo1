import type { SimulationWorld } from '../sim/world.ts';
import type { FuelKind } from '../sim/embers.ts';
import type { InteractionTarget } from './targets.ts';
import { TOOL_NAMES } from './tools.ts';

export function createGameplay(world: SimulationWorld, onMessage: (message: string) => void = () => { }) {
  let activeTool = 0;
  function notify(message: string): void { world.message = message; onMessage(message); }
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
        world.takeMeat(target.meatId as number);
        notify(world.message);
        break;
      case 'board':
        if(activeTool === 2 && world.carriedMeatId !== null) {
          world.returnMeatToBoard();
          notify(world.message);
        }
        break;
      default:
        notify('Para esa acción utilizá la herramienta indicada en pantalla.');
    }
  }
  function primaryAction(target: InteractionTarget | null): void {
    if(!target) return notify('Apuntá a un objeto cercano.');
    const kind = target.kind;
    if(kind === 'tinder-pad' && activeTool === 0) {
      world.brazier.ignite();
      return notify(world.brazier.lastEvent);
    }
    if(kind === 'brazier' && activeTool === 3) {
      world.brazier.hit();
      return notify(world.brazier.lastEvent);
    }
    if(kind === 'tray' && activeTool === 1) {
      if(world.carried) return notify(world.carried.state === 'ready'
        ? 'La pala ya tiene brasas. Depositalas en la parrilla.' : 'La pala tiene un fragmento inmaduro. Devolvelo al brasero.');
      world.carried = world.brazier.takeFromTray();
      return notify(world.brazier.lastEvent);
    }
    if(kind === 'brazier' && activeTool === 1) {
      world.returnImmature();
      return notify(world.message);
    }
    if(kind === 'grill-cell' && activeTool === 1) {
      world.depositEmber(target.index as number);
      return notify(world.message);
    }
    if(kind === 'grill-cell' && activeTool === 2 && world.carriedMeatId !== null) {
      world.placeMeat(target.index as number);
      return notify(world.message);
    }
    notify('Esa herramienta no sirve para este objeto o todavía falta una acción.');
  }

  return {
    interact, primaryAction, get activeTool(): number { return activeTool; },
    equip(index: number): void {
      if(!Number.isInteger(index) || index < 0 || index >= TOOL_NAMES.length) return;
      activeTool = index; notify(`Herramienta equipada: ${TOOL_NAMES[activeTool]}.`);
    },
    flip(target: InteractionTarget | null): void {
      if(activeTool !== 2 || target?.kind !== 'meat' || world.carriedMeatId !== null)
        return notify('Apuntá a una carne en la parrilla con la pinza equipada (3).');
      world.flipMeat(target.meatId as number); notify(world.message);
    },
    rotate(target: InteractionTarget | null): void {
      if(activeTool !== 2) return;
      const id = world.carriedMeatId ?? target?.meatId;
      if(typeof id === 'number') { world.rotateMeat(id); notify(world.message); }
    },
  };
}
export type GameplayController = ReturnType<typeof createGameplay>;
