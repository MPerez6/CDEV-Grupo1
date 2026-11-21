import test from 'node:test';
import assert from 'node:assert/strict';

import { TrashModel, TRASH_SETTINGS, smellLevel, trashUnitsForMass } from '../src/sim/trash.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { ClientManager, SMELL_EFFECT, smellPatienceFactor } from '../src/ai/client-brain.ts';
import { createGameplay } from '../src/gameplay/actions.ts';
import { CONFIG } from '../src/sim/parameters.ts';

test('el tacho se llena por unidades y no acepta más de su capacidad', () => {
  const trash = new TrashModel();
  assert.equal(trash.add(TRASH_SETTINGS.capacity - 1), true);
  assert.equal(trash.add(2), false, 'no entra');
  assert.equal(trash.fill, TRASH_SETTINGS.capacity - 1);
  assert.equal(trash.add(1), true);
  assert.equal(trash.isFull, true);
  assert.equal(trash.add(0), false);
});

test('la basura con restos empieza a oler con el tiempo aunque no tires nada nuevo', () => {
  const trash = new TrashModel();
  trash.tick(3600);
  assert.equal(trash.smell, 0, 'vacío no huele');
  trash.add(4);
  const fresh = trash.smell;
  trash.tick(600);
  assert.ok(trash.smell > fresh + 0.2);
  trash.tick(100000);
  assert.equal(trash.smell, 1, 'el olor tiene tope');
  assert.equal(trash.level, 'insoportable');
});

test('sacar la bolsa vacía el tacho y el olor se ventila de a poco', () => {
  const trash = new TrashModel();
  trash.add(6); trash.tick(5000);
  assert.equal(trash.empty(), true);
  assert.equal(trash.fill, 0);
  assert.ok(trash.smell <= TRASH_SETTINGS.smellAfterEmpty);
  trash.tick(1000);
  assert.equal(trash.smell, 0);
  assert.equal(trash.empty(), false, 'vacío no hay bolsa para sacar');
  assert.equal(trash.bagsTakenOut, 1);
});

test('niveles de olor y lugar que ocupa cada pieza', () => {
  assert.equal(smellLevel(0.1), 'sin olor');
  assert.equal(smellLevel(0.3), 'leve');
  assert.equal(smellLevel(0.6), 'fuerte');
  assert.equal(smellLevel(0.9), 'insoportable');
  assert.equal(trashUnitsForMass(0.1), 1);
  assert.equal(trashUnitsForMass(5), 3);
});

test('con la pinza se tira la pieza al tacho y con E sin nada se saca la bolsa', () => {
  const world = new SimulationWorld('fridge');
  world.addMeat('chorizo');
  world.fridgeOpen = true;
  const gameplay = createGameplay(world);
  gameplay.equip(2);
  const chorizo = world.meats.find(m => m.definition.kind === 'chorizo' && m.location === 'fridge');
  assert.ok(chorizo);
  assert.ok(world.takeMeat(chorizo.id));
  const before = world.meats.length;
  gameplay.primaryAction({ kind: 'trash' });
  assert.equal(world.carriedMeatId, null);
  assert.equal(world.meats.length, before - 1, 'la pieza se fue a la basura');
  assert.ok(world.trash.fill > 0);
  assert.match(world.message, /basura/);
  gameplay.interact({ kind: 'trash' });
  assert.equal(world.trash.fill, 0);
  assert.match(world.message, /bolsa/);
});

test('el olor de la basura avisa una sola vez por nivel', () => {
  const world = new SimulationWorld('fridge');
  world.trash.add(CONFIG.timeScale > 0 ? 6 : 6);
  for(let i = 0;i < 2000;i++) world.tick(1);
  const notices = world.drainNotices();
  assert.ok(notices.some(n => /empieza a oler/.test(n)));
  assert.ok(notices.some(n => /moscas/.test(n)));
  assert.equal(world.drainNotices().length, 0, 'no repite avisos');
});

test('con olor fuerte los comensales pierden paciencia más rápido y con olor insoportable se van', () => {
  assert.equal(smellPatienceFactor(0), 1);
  assert.equal(smellPatienceFactor(SMELL_EFFECT.impatientFrom), 1);
  assert.equal(smellPatienceFactor(1), SMELL_EFFECT.maxPatienceFactor);
  const clients = new ClientManager();
  clients.reset(true);
  // Que lleguen y se sienten.
  for(let i = 0;i < 400 && !clients.clients.some(c => c.state === 'esperando');i++) clients.update(0.1, 0);
  const waiting = clients.clients.find(c => c.state === 'esperando');
  assert.ok(waiting, 'hay alguien esperando');
  const events = [];
  for(let t = 0;t < SMELL_EFFECT.leaveEverySeconds + 1;t += 0.1) events.push(...clients.update(0.1, 0.95).events);
  const left = events.filter(e => e.kind === 'smell-leave');
  assert.equal(left.length, 1);
  assert.match(left[0].message, /olor/);
  assert.ok(clients.lostCount >= 1);
});
