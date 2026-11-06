import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOG_SETTINGS, DOG_SPOTS, DogBrain, dogRoute, type Vec2 } from '../src/ai/dog-brain.ts';
import { CHAIR_STACK_BOUNDS, FAMILY_TABLE_BOUNDS, PERGOLA_POST_BOUNDS, PREP_TABLE_BOUNDS } from '../src/level/layout.ts';
import { ASADOR_LAYOUT } from '../src/level/asador.ts';
import { createGameplay } from '../src/gameplay/actions.ts';
import { SimulationWorld } from '../src/sim/world.ts';

const far: Vec2 = { x: 6, z: 4 };
const run = (dog: DogBrain, seconds: number, input: Partial<{ meatOnGrill: boolean; burning: boolean; player: Vec2 }> = {}) => {
  const events = [];
  for(let t = 0;t < seconds;t += 0.1) events.push(...dog.tick({ dt: 0.1, player: far, meatOnGrill: false, burning: false, ...input }));
  return events;
};

test('arranca echado en su lugar y se levanta a mirarte si te acercás', () => {
  const dog = new DogBrain();
  run(dog, 1);
  assert.equal(dog.state, 'echado');
  run(dog, 1, { player: { x: DOG_SPOTS.rest.x + 1, z: DOG_SPOTS.rest.z } });
  assert.equal(dog.state, 'atento');
});

test('cuando hay carne en la parrilla va a sentarse al costado y lo avisa una sola vez', () => {
  const dog = new DogBrain();
  const events = run(dog, 15, { meatOnGrill: true });
  assert.equal(dog.state, 'pidiendo');
  assert.ok(Math.hypot(dog.pos.x - DOG_SPOTS.beg.x, dog.pos.z - DOG_SPOTS.beg.z) < 0.05);
  assert.equal(events.filter(e => e.kind === 'sit-by-grill').length, 1);
  run(dog, 15, { meatOnGrill: false });
  assert.ok(Math.hypot(dog.pos.x - DOG_SPOTS.rest.x, dog.pos.z - DOG_SPOTS.rest.z) < 0.05, 'vuelve a echarse');
});

test('acariciarlo lo pone contento un rato y después vuelve a lo suyo', () => {
  const dog = new DogBrain();
  const message = dog.pet({ x: -4, z: -3 });
  assert.match(message, /Pancho/);
  run(dog, 0.5);
  assert.equal(dog.state, 'contento');
  assert.equal(dog.wag, 1);
  run(dog, DOG_SETTINGS.happySeconds + 1);
  assert.notEqual(dog.state, 'contento');
  assert.match(dog.pet(far, true), /quemando/);
});

test('ladra si algo se quema, pero no más de una vez cada 20 s', () => {
  const dog = new DogBrain();
  const barks = run(dog, 45, { burning: true }).filter(e => e.kind === 'bark-burning');
  assert.equal(barks.length, 3); // t = 0, 20 y 40
});

test('ningún recorrido del perro atraviesa muebles ni el asador', () => {
  const obstacles = [ASADOR_LAYOUT.bounds, PREP_TABLE_BOUNDS, FAMILY_TABLE_BOUNDS, CHAIR_STACK_BOUNDS, ...PERGOLA_POST_BOUNDS];
  const radius = 0.3;
  const spots: Vec2[] = [DOG_SPOTS.rest, DOG_SPOTS.beg, ...DOG_SPOTS.wander];
  for(const from of spots) for(const to of spots) {
    let prev = from;
    for(const next of dogRoute(from, to)) {
      for(let s = 0;s <= 1;s += 0.02) {
        const x = prev.x + (next.x - prev.x) * s, z = prev.z + (next.z - prev.z) * s;
        for(const o of obstacles)
          assert.ok(!(x > o.x0 - radius && x < o.x1 + radius && z > o.z0 - radius && z < o.z1 + radius), `tramo (${prev.x},${prev.z})→(${next.x},${next.z}) choca`);
        assert.ok(x > -7.5 && x < 7.5 && z > -6.6 && z < 4.6, 'fuera del patio');
      }
      prev = next;
    }
  }
});

test('E sobre el perro usa el callback de ambientación', () => {
  const messages: string[] = [];
  const gameplay = createGameplay(new SimulationWorld(), m => messages.push(m), () => { }, { petDog: () => 'mueve la cola' });
  gameplay.interact({ kind: 'dog' });
  assert.deepEqual(messages, ['mueve la cola']);
});
