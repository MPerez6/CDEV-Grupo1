import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESSION, RADIO_SETTINGS, renderFolkLoop } from '../src/audio/radio.ts';
import { createGameplay } from '../src/gameplay/actions.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { CHAIR_STACK_BOUNDS, FAMILY_TABLE_BOUNDS, PERGOLA_POST_BOUNDS, PREP_TABLE_BOUNDS } from '../src/level/layout.ts';
import { ASADOR_LAYOUT } from '../src/level/asador.ts';

const SR = 8000; // frecuencia baja para que la prueba sea rápida

test('el loop de la radio dura exactamente 16 compases de 6/8', () => {
  const loop = renderFolkLoop(SR);
  const expected = Math.round(PROGRESSION.length * RADIO_SETTINGS.eighthSeconds * 6 * SR);
  assert.equal(loop.length, expected);
});

test('el loop está normalizado, sin silencio ni valores inválidos', () => {
  const loop = renderFolkLoop(SR);
  let peak = 0, energy = 0;
  for(const v of loop) {
    assert.ok(Number.isFinite(v));
    peak = Math.max(peak, Math.abs(v));
    energy += v * v;
  }
  assert.ok(Math.abs(peak - 0.8) < 1e-3, `pico ${peak}`);
  assert.ok(Math.sqrt(energy / loop.length) > 0.02, 'el loop no debería ser casi silencio');
});

test('la música es determinística (misma semilla, misma salida)', () => {
  const a = renderFolkLoop(SR), b = renderFolkLoop(SR);
  assert.deepEqual(a.subarray(0, 4000), b.subarray(0, 4000));
});

test('E sobre la radio usa el callback y muestra su mensaje; sin callback no rompe', () => {
  const world = new SimulationWorld();
  const messages: string[] = [];
  let on = true;
  const gameplay = createGameplay(world, m => messages.push(m), () => { }, { toggleRadio: () => { on = !on; return on ? 'prendida' : 'apagada'; } });
  gameplay.interact({ kind: 'radio' });
  gameplay.interact({ kind: 'radio' });
  assert.deepEqual(messages, ['apagada', 'prendida']);
  const bare = createGameplay(new SimulationWorld(), m => messages.push(m));
  bare.interact({ kind: 'radio' });
  assert.equal(messages.at(-1), 'La radio no tiene pilas.');
});

test('la ambientación no se superpone con el asador ni con la mesa de preparación', () => {
  const overlaps = (a: { x0: number; x1: number; z0: number; z1: number }, b: typeof a) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
  for(const deco of [FAMILY_TABLE_BOUNDS, CHAIR_STACK_BOUNDS, ...PERGOLA_POST_BOUNDS])
    for(const core of [ASADOR_LAYOUT.bounds, PREP_TABLE_BOUNDS])
      assert.equal(overlaps(deco, core), false);
});
