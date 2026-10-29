import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedStepClock } from '../src/sim/clock.ts';
import { newEmber } from '../src/sim/embers.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { SimulationWorld } from '../src/sim/world.ts';

function runFrames(frameSeconds: number[]): object {
  const clock = new FixedStepClock();
  const world = new SimulationWorld();
  for (let i = 0; i < 6; i++) world.brazier.addFuel('charcoal');
  world.brazier.addTinder();
  world.brazier.ignite();
  world.grill.put(13, newEmber(50));
  const carried = newEmber(50);
  world.carried = { id: carried.id, state: 'ready', ember: carried };
  assert.ok(world.takeMeat(world.meat.id)); assert.ok(world.placeMeat(0));
  for (const [kind, cell] of [['vacio', 23], ['chorizo', 5]] as const) {
    const piece = world.addMeat(kind);
    assert.ok(world.takeMeat(piece.id)); assert.ok(world.placeMeat(cell));
  }
  for (const seconds of frameSeconds) {
    clock.advance(seconds, dt => {
      assert.equal(dt, 0.25);
      world.tick(dt);
    });
  }
  assert.equal(world.simSeconds, 300);
  return {
    seconds: world.simSeconds,
    grillMass: world.grill.cells.flat().map(e => [e.initialMassG, e.massG, e.ashG]),
    flux: world.grill.fluxWm2,
    carried: [carried.massG, carried.ashG],
    pile: world.brazier.fuel.map(f => [f.slot, f.progress, f.ember.massG, f.ember.ashG]),
    tinder: world.brazier.tinderSecondsRemaining,
    // Comparar estado físico: las instancias de escenarios separados tienen identidades distintas.
    meats: world.meats.map(meat => ({ ...meat, id: 0 })),
  };
}

test('10, 30, 60 y 144 FPS y frames variables producen idéntico estado a los 30 s reales', () => {
  const reference = runFrames(Array(30 * 60).fill(1 / 60));
  for (const fps of [10, 30, 144]) {
    assert.deepEqual(runFrames(Array(30 * fps).fill(1 / fps)), reference);
  }
  // Cada par suma 0,1 s real; incluye frames más largos que el antiguo recorte de 0,05 s.
  assert.deepEqual(runFrames(Array.from({ length: 600 }, (_, i) => i % 2 ? 0.09 : 0.01)), reference);
});

test('un frame lento limita trabajo pero conserva tiempo pendiente para los siguientes', () => {
  const clock = new FixedStepClock();
  let simSeconds = 0;
  const tick = (dt: number) => { assert.equal(dt, 0.25); simSeconds += dt; };
  assert.equal(clock.advance(2, tick), CONFIG.simulationMaxStepsPerFrame);
  for (let i = 0; i < 3; i++) {
    assert.ok(clock.advance(1 / 60, tick) <= CONFIG.simulationMaxStepsPerFrame);
  }
  assert.equal(simSeconds, 20.5); // (2 + 3/60) × 10, sin descartar el remanente.
});

test('los intervalos inválidos no alteran el remanente del reloj', () => {
  const clock = new FixedStepClock();
  let simSeconds = 0;
  const tick = (dt: number) => { simSeconds += dt; };
  assert.equal(clock.advance(0.01, tick), 0);
  for (const dt of [0, -1, NaN, Infinity, -Infinity]) assert.equal(clock.advance(dt, tick), 0);
  assert.equal(clock.advance(0.015, tick), 1);
  assert.equal(simSeconds, 0.25);
});
