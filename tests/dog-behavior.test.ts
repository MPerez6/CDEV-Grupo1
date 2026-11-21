import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTION_SECONDS, DOG_SETTINGS, DOG_SPOTS, DogBrain, type DogEvent, type DogInput, type Vec2 } from '../src/ai/dog-brain.ts';
import { dogBlocked, findPath, segmentClear } from '../src/ai/dog-nav.ts';
import { dogPose, gait, blendPose, STAND } from '../src/ai/dog-poses.ts';
import { ASADOR_LAYOUT } from '../src/level/asador.ts';
import { CHAIR_STACK_BOUNDS, FAMILY_TABLE_BOUNDS, FRIDGE_BOUNDS, PATIO_TREE_BOUNDS, PERGOLA_POST_BOUNDS, PREP_TABLE_BOUNDS, TRASH_BIN_BOUNDS } from '../src/level/layout.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { createGameplay } from '../src/gameplay/actions.ts';

const OBSTACLES = [ASADOR_LAYOUT.bounds, PREP_TABLE_BOUNDS, FRIDGE_BOUNDS, TRASH_BIN_BOUNDS, FAMILY_TABLE_BOUNDS, CHAIR_STACK_BOUNDS, PATIO_TREE_BOUNDS, ...PERGOLA_POST_BOUNDS];
const far: Vec2 = { x: 6, z: 4 };

function run(dog: DogBrain, seconds: number, input: Partial<DogInput> = {}): DogEvent[] {
  const events: DogEvent[] = [];
  for(let t = 0;t < seconds;t += 0.1) events.push(...dog.tick({ dt: 0.1, player: far, meatOnGrill: false, burning: false, obstacles: OBSTACLES, ...input }));
  return events;
}

test('el navegador encuentra caminos que no atraviesan muebles', () => {
  const pairs: [Vec2, Vec2][] = [
    [DOG_SPOTS.rest, DOG_SPOTS.board], [DOG_SPOTS.board, DOG_SPOTS.rest], [DOG_SPOTS.rest, DOG_SPOTS.trash],
    [{ x: 5.5, z: 1.2 }, DOG_SPOTS.beg], [DOG_SPOTS.beg, { x: -5.6, z: 3.0 }],
  ];
  for(const [from, to] of pairs) {
    const path = findPath(from, to, OBSTACLES);
    assert.ok(path && path.length > 0, `hay camino de ${JSON.stringify(from)} a ${JSON.stringify(to)}`);
    let prev = from;
    for(const next of path) { assert.ok(segmentClear(prev, next, OBSTACLES), 'tramo libre'); prev = next; }
    assert.ok(Math.hypot(prev.x - to.x, prev.z - to.z) < 0.35, 'llega cerca del destino');
  }
  assert.equal(dogBlocked(DOG_SPOTS.board.x, DOG_SPOTS.board.z, OBSTACLES), false, 'el lugar para robar es pisable');
  assert.equal(dogBlocked(DOG_SPOTS.trash.x, DOG_SPOTS.trash.z, OBSTACLES), false, 'el lugar frente al tacho es pisable');
});

test('acariciarlo hace un truco animado distinto cada vez (no solo un texto)', () => {
  const dog = new DogBrain();
  const player = { x: DOG_SPOTS.rest.x + 0.7, z: DOG_SPOTS.rest.z };
  const seen = new Set<string>();
  for(let i = 0;i < 5;i++) {
    dog.pet(player);
    run(dog, 0.2, { player });
    assert.ok(dog.action, 'está haciendo algo');
    seen.add(dog.action as string);
    run(dog, 4, { player });
  }
  assert.ok(seen.size >= 4, `trucos distintos: ${[...seen].join(', ')}`);
});

test('si lo acariciás de lejos viene trotando y recién ahí hace el truco', () => {
  const dog = new DogBrain();
  const player = { x: -2.0, z: 1.0 };
  assert.match(dog.pet(player), /viene/);
  const events = run(dog, 6, { player });
  assert.ok(Math.hypot(dog.pos.x - player.x, dog.pos.z - player.z) < 1.2, 'llegó al lado tuyo');
  assert.ok(events.some(e => e.kind === 'trick'));
});

test('te pide comida: se acerca, se sienta a mendigar y si le das se lo lleva y se lo come', () => {
  const dog = new DogBrain();
  const player = { x: -2.2, z: -1.6 };
  const events = run(dog, DOG_SETTINGS.askFirstAfter + 6, { player, playerHasMeat: true });
  assert.ok(events.some(e => e.kind === 'ask-food'));
  assert.equal(dog.action, 'mendigar');
  assert.equal(dog.state, 'pidiendo-a-vos');
  assert.ok(Math.hypot(dog.pos.x - player.x, dog.pos.z - player.z) < 1.3);
  assert.match(dog.give(7, 'el chorizo', player) ?? '', /chorizo/);
  assert.deepEqual(dog.carrying, { meatId: 7, name: 'el chorizo', stolen: false });
  let ate: DogEvent | undefined;
  for(let t = 0;t < 20 && !ate;t += 0.1) ate = run(dog, 0.1, { player }).find(e => e.kind === 'ate');
  assert.ok(ate, 'se lo comió');
  assert.equal(ate.meatId, 7);
  assert.equal(dog.carrying, null);
  assert.ok(Math.hypot(dog.pos.x - DOG_SPOTS.rest.x, dog.pos.z - DOG_SPOTS.rest.z) < 0.4, 'se lo comió en su rincón');
});

test('si no le das nada se cansa de pedir', () => {
  const dog = new DogBrain();
  const player = { x: -2.2, z: -1.6 };
  const events = run(dog, DOG_SETTINGS.askFirstAfter + 6 + ACTION_SECONDS.mendigar + 1, { player, playerHasMeat: true });
  assert.ok(events.some(e => e.kind === 'ask-gave-up'));
  assert.notEqual(dog.action, 'mendigar');
});

test('roba la carne que quedó sola en la tabla cuando estás lejos, huye y se la come', () => {
  const dog = new DogBrain();
  const boardMeat = { id: 3, name: 'la falda' };
  const events = run(dog, 40, { player: { x: -5.5, z: 3.5 }, boardMeat });
  const steal = events.find(e => e.kind === 'steal');
  assert.ok(steal, 'robó');
  assert.equal(steal.meatId, 3);
  assert.match(steal.message, /robó/);
  assert.ok(events.some(e => e.kind === 'ate'), 'y se la comió');
});

test('no roba si estás al lado de la tabla', () => {
  const dog = new DogBrain();
  const events = run(dog, 60, { player: { x: 3.2, z: -2.6 }, boardMeat: { id: 3, name: 'la falda' } });
  assert.equal(events.filter(e => e.kind === 'steal').length, 0);
});

test('si le sacás lo que tiene en la boca se pone culposo y no se come nada', () => {
  const dog = new DogBrain();
  dog.give(9, 'la morcilla', far);
  run(dog, 1);
  dog.loseCarried();
  assert.equal(dog.carrying, null);
  assert.equal(dog.action, 'culpa');
  assert.equal(run(dog, 15).filter(e => e.kind === 'ate').length, 0);
});

test('con olor a basura va a olfatear el tacho', () => {
  const dog = new DogBrain();
  const events = run(dog, 20, { trashSmell: 0.7 });
  assert.ok(events.some(e => e.kind === 'sniff-trash'));
});

test('cuando algo se quema ladra de verdad (acción) mirando la parrilla', () => {
  const dog = new DogBrain();
  run(dog, 0.3, { burning: true });
  assert.equal(dog.action, 'ladrar');
  assert.equal(dog.state, 'ladrando');
});

test('en el mundo: darle la pieza de la pinza, sacársela babeada y que el comensal la rechace', () => {
  const world = new SimulationWorld('fridge');
  world.fridgeOpen = true;
  const piece = world.meats.find(m => m.location === 'fridge');
  assert.ok(piece);
  world.takeMeat(piece.id);
  const given = world.giveCarriedMeatToDog();
  assert.equal(given?.id, piece.id);
  assert.equal(piece.location, 'dog');
  assert.equal(world.carriedMeatId, null);
  assert.ok(world.takeMeat(piece.id), 'se la saca con la pinza');
  assert.equal(piece.tainted, true);
  assert.match(world.message, /babeado/);
  world.dogFinishedEating(piece.id);
  assert.ok(world.meatById(piece.id), 'si ya no la tiene el perro, no desaparece');
});

test('con la pinza cargada, clic sobre el perro le da la pieza', () => {
  const world = new SimulationWorld('fridge');
  world.fridgeOpen = true;
  const piece = world.meats.find(m => m.location === 'fridge');
  assert.ok(piece);
  let given = false;
  const gameplay = createGameplay(world, () => {}, () => {}, { giveDog: () => { given = world.giveCarriedMeatToDog() !== null; return 'ok'; } });
  gameplay.equip(2);
  world.takeMeat(piece.id);
  gameplay.primaryAction({ kind: 'dog' });
  assert.equal(given, true);
  assert.equal(piece.location, 'dog');
});

test('las poses: las patas quedan apoyadas y las mezclas no se salen de rango', () => {
  const lyingPose = dogPose('echado', null, 0, 0);
  assert.ok(lyingPose.y < STAND.y);
  const walking = gait(STAND, 1.2, 1.1);
  assert.notDeepEqual(walking.fu, STAND.fu, 'al caminar mueve las patas');
  const half = blendPose(STAND, lyingPose, 0.5);
  assert.ok(half.y < STAND.y && half.y > lyingPose.y);
  for(const action of Object.keys(ACTION_SECONDS) as (keyof typeof ACTION_SECONDS)[]) {
    const pose = dogPose('atento', action, 0.8, 0.5);
    assert.ok(Object.values(pose).flat().every(v => Number.isFinite(v)), action);
  }
});
