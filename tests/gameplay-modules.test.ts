import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationWorld } from '../src/sim/world.ts';
import { createGameplay } from '../src/gameplay/actions.ts';
import { bindGameplayInput, bindPrimaryAction } from '../src/gameplay/input.ts';
import type { InteractionTarget } from '../src/gameplay/targets.ts';

function key(target: EventTarget, code: string, repeat = false): void {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, { code: { value: code }, repeat: { value: repeat } });
  target.dispatchEvent(event);
}
function click(target: EventTarget): void {
  const event = new Event('mousedown');
  Object.defineProperty(event, 'button', { value: 0 });
  target.dispatchEvent(event);
}

test('entrada → acciones → simulación conserva encendido, pausa y limpieza de controles', () => {
  const input = new EventTarget(), world = new SimulationWorld();
  const messages: string[] = [], gameplay = createGameplay(world, message => messages.push(message));
  const keys = new Set<string>();
  let playing = false, debug = 0;
  let target: InteractionTarget = { kind: 'fuel-coal' };
  const unbindKeys = bindGameplayInput(input, { isPlaying: () => playing, keys, gameplay,
    getTarget: () => target, toggleDebug: () => { debug++; } });
  const unbindClick = bindPrimaryAction(input, () => playing, () => gameplay.primaryAction(target));
  key(input, 'KeyE'); click(input);
  assert.equal(world.brazier.fuel.length, 0);
  key(input, 'F3'); assert.equal(debug, 1, 'el diagnóstico sigue disponible en pausa');
  playing = true;
  key(input, 'KeyE'); key(input, 'KeyE', true);
  assert.equal(world.brazier.fuel.length, 3, 'mantener E no duplica la carga');
  target = { kind: 'tinder' }; key(input, 'KeyE');
  target = { kind: 'tinder-pad' }; click(input);
  assert.equal(world.brazier.tinderBurning, true);
  assert.equal(messages.at(-1), world.brazier.lastEvent);
  world.tick(1); assert.ok(world.brazier.fuel[0].progress > 0);
  playing = false; target = { kind: 'fuel-small-wood' }; key(input, 'KeyE');
  assert.equal(world.brazier.fuel.length, 3);
  unbindKeys(); unbindClick();
  const before = JSON.stringify(world);
  playing = true; key(input, 'KeyE'); click(input); key(input, 'F3');
  assert.equal(JSON.stringify(world), before); assert.equal(debug, 1); assert.equal(keys.size, 0);
});

test('los controles extraídos conservan recoger, orientar, colocar, girar y devolver carne', () => {
  const input = new EventTarget(), world = new SimulationWorld(), meat = world.meat;
  const gameplay = createGameplay(world), keys = new Set<string>();
  let target: InteractionTarget = { kind: 'meat', meatId: meat.id };
  const unbindKeys = bindGameplayInput(input, { isPlaying: () => true, keys, gameplay,
    getTarget: () => target, toggleDebug: () => {} });
  const unbindClick = bindPrimaryAction(input, () => true, () => gameplay.primaryAction(target));
  const layers = [...meat.layersC];
  key(input, 'KeyE'); assert.equal(world.carriedMeatId, null, 'sin pinza no se recoge');
  key(input, 'Digit3'); key(input, 'KeyE'); assert.equal(world.carriedMeatId, meat.id);
  key(input, 'KeyQ'); assert.equal(meat.quarterTurns, 1);
  target = { kind: 'grill-cell', index: 10 }; click(input);
  assert.equal(meat.location, 'grill'); assert.equal(world.carriedMeatId, null);
  target = { kind: 'meat', meatId: meat.id };
  const face = meat.faceDown; key(input, 'KeyR'); assert.notEqual(meat.faceDown, face);
  key(input, 'KeyR', true); assert.notEqual(meat.faceDown, face, 'mantener R no vuelve a girar');
  key(input, 'KeyE'); target = { kind: 'board' }; key(input, 'KeyE');
  assert.equal(meat.location, 'board'); assert.equal(world.carriedMeatId, null);
  assert.deepEqual(meat.layersC, layers, 'los controles no alteran temperaturas');
  unbindKeys(); unbindClick();
});
