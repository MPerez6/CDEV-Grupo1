import test from 'node:test';
import assert from 'node:assert/strict';
import { BrazierModel, fuelSlots, isFuelBurning } from '../src/sim/embers.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { CONFIG } from '../src/sim/parameters.ts';

const perLayer = CONFIG.brazierPileColumns * CONFIG.brazierPileRows;
function fullPile(): BrazierModel {
  const b = new BrazierModel();
  for (let i = 0; i < b.capacitySlots; i++) assert.ok(b.addFuel('charcoal'));
  return b;
}
function assertValidPile(b: BrazierModel): void {
  const occupied = b.fuel.flatMap(fuelSlots);
  assert.equal(new Set(occupied).size, occupied.length, 'las piezas no se superponen');
  assert.ok(occupied.every(slot => slot >= 0 && slot < b.capacitySlots));
}

test('la capacidad depende del espacio: el tronco grueso ocupa más que el carbón', () => {
  const b = fullPile();
  const before = JSON.stringify(b.fuel);
  assert.equal(b.addFuel('charcoal'), false);
  assert.equal(b.addFuel('large-wood'), false);
  assert.equal(JSON.stringify(b.fuel), before, 'rechazar una carga no cambia el combustible');
  const wood = new BrazierModel();
  for (let i = 0; i < b.capacitySlots / CONFIG.brazierLargeWoodSlots; i++) assert.ok(wood.addFuel('large-wood'));
  assert.equal(wood.addFuel('large-wood'), false);
  assert.equal(wood.occupiedSlots, wood.capacitySlots);
  assertValidPile(wood);
});

test('el papel calienta primero la base y las capas superiores conservan zonas frías', () => {
  const b = fullPile();
  b.addTinder(); b.ignite(); b.update(300);
  const lower = b.fuel.filter(f => f.slot < perLayer);
  const middle = b.fuel.filter(f => f.slot >= perLayer && f.slot < perLayer * 2);
  const upper = b.fuel.filter(f => f.slot >= perLayer * 2);
  assert.ok(lower.every(isFuelBurning));
  assert.ok(Math.min(...lower.map(f => f.progress)) > Math.max(...middle.map(f => f.progress)));
  assert.ok(Math.min(...middle.map(f => f.progress)) > Math.max(...upper.map(f => f.progress)));
  assert.ok(upper.every(f => !isFuelBurning(f)));
  assert.equal(b.tray.length, 0);
});

test('el calor se transmite entre vecinas y no enciende piezas lejanas instantáneamente', () => {
  const b = fullPile();
  b.fuel[0].progress = 0.60;
  b.update(1);
  assert.ok(b.fuel.find(f => f.slot === perLayer)!.progress > 0, 'calienta la pieza inmediatamente superior');
  assert.ok(b.fuel.find(f => f.slot === 1)!.progress > 0, 'calienta a su vecina lateral');
  assert.equal(b.fuel.find(f => f.slot === perLayer * 2)!.progress, 0, 'todavía no llega a dos capas de distancia');
  assert.equal(b.fuel.find(f => f.slot === 3)!.progress, 0, 'no hay calentamiento global');
});

test('la primera brasa cae mientras quedan piezas encendidas y frías dentro', () => {
  const b = fullPile();
  const first = b.fuel[0];
  const original = b.fuel.map(f => f.ember);
  b.addTinder(); b.ignite();
  for (let seconds = 0; !b.tray.length && seconds < 2000; seconds += 0.25) b.update(0.25);
  assert.ok(b.tray.length > 0);
  assert.equal(b.tray[0].id, first.id);
  assert.ok(b.fuel.length > 0 && b.fuel.length < b.capacitySlots);
  assert.ok(b.fuel.some(isFuelBurning), 'hay combustible que tomó el encendido antes de la caída');
  assert.ok(b.fuel.some(f => f.progress < 0.9), 'la carga restante no está toda madura');
  assert.equal(b.tinderBurning, false);
  assert.ok(original.every(e => e.massG > 0), 'se forman brasas antes de consumir toda la masa');
  assertValidPile(b);
});

test('la caída acomoda la carga sin reiniciar progreso ni crear masa', () => {
  const b = fullPile();
  const lower = b.fuel[0], middle = b.fuel[perLayer], upper = b.fuel[perLayer * 2];
  const original = b.fuel.map(f => f.ember);
  lower.progress = 0.9999;
  middle.progress = 0.45;
  upper.progress = 0.10;
  b.update(0.25);
  assert.equal(middle.slot, 0);
  assert.equal(upper.slot, perLayer);
  assert.ok(middle.progress >= 0.45 && upper.progress >= 0.10);
  assert.equal(b.tray[0].state, 'ready');
  if (b.tray[0].state === 'ready') assert.equal(b.tray[0].ember, lower.ember);
  const conserved = original.reduce((sum, e) => sum + e.massG + e.ashG / CONFIG.ashFraction, 0);
  assert.ok(Math.abs(conserved - b.capacitySlots * CONFIG.emberMassG) < 1e-8);
  assertValidPile(b);
});

test('se repone la carga y el combustible nuevo prende del que queda, sin agregar papel', () => {
  const b = fullPile();
  b.addTinder(); b.ignite();
  for (let seconds = 0; !b.tray.length && seconds < 2000; seconds += 0.25) b.update(0.25);
  assert.ok(b.addFuel('charcoal'));
  const added = b.fuel[b.fuel.length - 1];
  assert.equal(added.progress, 0);
  assert.ok(added.slot >= perLayer, 'se agrega encima de la carga que queda');
  assert.equal(b.tinderBurning, false);
  b.update(300);
  assert.ok(isFuelBurning(added), 'tomó el encendido de las piezas cercanas');
  assert.equal(b.tinder, 0);
  assert.equal(b.tinderSecondsRemaining, 0);
  assertValidPile(b);
});

test('se puede reponer leña gruesa sobre leña fina encendida, sin volver a usar papel', () => {
  const b = new BrazierModel();
  for (let i = 0; i < b.capacitySlots; i++) b.addFuel('small-wood');
  b.addTinder(); b.ignite();
  let accepted = false;
  for (let seconds = 0; !accepted && seconds < 2000; seconds += 0.25) {
    b.update(0.25);
    if (b.occupiedSlots <= b.capacitySlots - CONFIG.brazierLargeWoodSlots) accepted = b.addFuel('large-wood');
  }
  assert.ok(accepted);
  const added = b.fuel.find(f => f.kind === 'large-wood');
  assert.ok(added);
  assert.equal(added.progress, 0);
  assert.equal(b.tinderBurning, false);
  b.update(300);
  assert.ok(isFuelBurning(added));
  assert.equal(b.tinderSecondsRemaining, 0);
  assertValidPile(b);
});

test('una devolución rechazada por falta de espacio conserva el fragmento en la pala', () => {
  const world = new SimulationWorld();
  world.brazier = fullPile();
  world.brazier.fuel[0].progress = 0.50;
  assert.ok(world.brazier.hit());
  world.carried = world.brazier.takeFromTray();
  const piece = world.carried;
  assert.ok(piece?.state === 'immature');
  assert.ok(world.brazier.addFuel('charcoal'));
  assert.equal(world.returnImmature(), false);
  assert.equal(world.carried, piece);
  world.brazier.fuel[0].progress = 1;
  world.brazier.update(0.25);
  assert.ok(world.returnImmature());
  assert.equal(world.carried, null);
  assert.ok(world.brazier.fuel.includes(piece.fuel));
  assert.equal(piece.fuel.progress, 0.50);
  assertValidPile(world.brazier);
});

test('la propagación depende de la posición y no del orden de los objetos', () => {
  const a = fullPile(), b = fullPile();
  b.fuel.reverse();
  for (const model of [a, b]) { model.addTinder(); model.ignite(); model.update(500); }
  const snapshot = (model: BrazierModel) => [...model.fuel].sort((x, y) => x.slot - y.slot)
    .map(f => ({ slot: f.slot, progress: f.progress, mass: f.ember.massG, ash: f.ember.ashG }));
  assert.deepEqual(snapshot(a), snapshot(b));
});
