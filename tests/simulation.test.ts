import test from 'node:test';
import assert from 'node:assert/strict';
import { newEmber, consumeEmber, BrazierModel, HeatGrid } from '../src/sim/embers.ts';
import { MeatModel } from '../src/sim/meat.ts';
import { CONFIG } from '../src/sim/parameters.ts';

// Las pruebas usan el modelo acordado, no validan su exactitud científica.
test('una brasa pierde masa y genera potencia positiva', () => {
  const ember = newEmber(50);
  const power = consumeEmber(ember, 1);
  assert.ok(power > 0);
  assert.ok(ember.massG < 50);
  assert.ok(ember.ashG > 0);
});
test('una brasa apagada no genera calor y no adquiere masa negativa', () => {
  const ember = newEmber(0);
  assert.equal(consumeEmber(ember, 1), 0);
  assert.equal(ember.massG, 0);
});
test('golpear no crea brasas y permite devolver fragmentos inmaduros', () => {
  const b = new BrazierModel();
  b.addFuel('charcoal');
  b.addTinder();
  assert.ok(b.ignite());
  b.update(5 * 60);
  assert.ok(b.hit());
  const fallen = b.takeFromTray();
  assert.equal(fallen?.state, 'immature');
  if (fallen) assert.ok(b.returnImmature(fallen));
  assert.equal(b.fuel.length, 1);
  assert.ok(b.fuel[0].progress > 0);
});
test('la cuadrícula distribuye calor propio y vecino', () => {
  const g = new HeatGrid();
  g.put(7, newEmber());
  g.update(1);
  assert.ok(g.fluxWm2[7] > 0);
  assert.ok(g.fluxWm2[8] > 0);
  assert.equal(g.fluxWm2[23], 0);
});
test('las cinco capas de carne almacenan temperaturas independientes', () => {
  const m = new MeatModel();
  m.onGrill = true;
  for (let i = 0; i < 500; i++) m.update(0.25, 9000);
  assert.equal(m.layersC.length, 5);
  assert.ok(m.layersC[0] > m.layersC[2]);
  const before = [...m.layersC];
  m.flip();
  assert.deepEqual(m.layersC, before);
});
test('una carne sin brasas no se calienta instantáneamente por encima del ambiente', () => {
  const m = new MeatModel();
  m.onGrill = true;
  for (let i = 0; i < 100; i++) m.update(0.25, 0);
  assert.ok(m.layersC.every(t => t >= 5 && t < 25));
});

test('una distribución moderada permite alcanzar la ventana de cocción de prueba', () => {
  const g = new HeatGrid();
  const m = new MeatModel();
  m.onGrill = true;
  for (const i of [13, 14, 19, 20]) g.put(i, newEmber());
  let alcanzado = false;
  for (let i = 0; i < 45 * 60 * 4; i++) {
    g.update(0.25);
    if (i > 0 && i % (5 * 60 * 4) === 0) m.flip();
    const promedio = [13, 14, 19, 20].reduce((sum, j) => sum + g.fluxWm2[j], 0) / 4;
    m.update(0.25, promedio);
    if (m.objectiveAchieved) { alcanzado = true; break; }
  }
  assert.ok(alcanzado, 'el matambre debe poder cocinarse sin estar necesariamente quemado');
});

test('el papel se consume y no deja una fuente de fuego para combustible añadido después', () => {
  const b = new BrazierModel();
  b.addTinder();
  assert.ok(b.ignite());
  b.update(CONFIG.tinderBurnSecondsPerBundle);
  assert.equal(b.tinder, 0);
  assert.equal(b.tinderSecondsRemaining, 0);
  assert.equal(b.lit, false);
  b.addFuel('charcoal');
  b.update(600);
  assert.equal(b.fuel[0].progress, 0);
  assert.equal(b.fuel[0].ember.massG, CONFIG.emberMassG);
  assert.equal(b.ignite(), false);
  b.addTinder();
  assert.ok(b.ignite(), 'se puede reintentar agregando papel nuevo');
});

test('el carbón toma el encendido y sigue calentándose cuando se termina el papel', () => {
  const b = new BrazierModel();
  b.addFuel('charcoal');
  b.addTinder();
  b.ignite();
  b.update(CONFIG.tinderBurnSecondsPerBundle);
  assert.equal(b.tinderBurning, false);
  assert.equal(b.fuelBurning, true);
  const progress = b.fuel[0].progress;
  const mass = b.fuel[0].ember.massG;
  b.update(60);
  assert.ok(b.fuel[0].progress > progress);
  assert.ok(b.fuel[0].ember.massG < mass);
});

test('la leña grande sola no sostiene el encendido al consumirse el papel', () => {
  const b = new BrazierModel();
  b.addFuel('large-wood');
  b.addTinder();
  b.ignite();
  b.update(CONFIG.tinderBurnSecondsPerBundle);
  const progress = b.fuel[0].progress;
  assert.ok(progress > 0 && progress < CONFIG.fuelIgnitionProgress);
  assert.equal(b.lit, false);
  b.update(600);
  assert.equal(b.fuel[0].progress, progress);
});

test('la leña pequeña permite encender después la leña grande', () => {
  const b = new BrazierModel();
  b.addFuel('small-wood');
  b.addFuel('small-wood');
  b.addTinder();
  b.ignite();
  b.update(CONFIG.smallWoodHeatingMinutes * 60 * 0.65);
  b.addFuel('large-wood');
  const large = b.fuel.find(f => f.kind === 'large-wood');
  assert.ok(large);
  b.update(220);
  assert.ok(large.progress > 0.15, 'el fuego establecido acelera la leña grande');
  b.update(1100);
  assert.ok(b.tray.some(p => p.state === 'ready' && p.ember === large.ember), 'la leña grande continúa y produce brasa');
});

test('las brasas maduras caen solas en silencio y conservan su masa residual', () => {
  const b = new BrazierModel();
  for (let i = 0; i < 3; i++) b.addFuel('charcoal');
  const originalEmbers = b.fuel.map(f => f.ember);
  b.addTinder();
  b.ignite();
  const message = b.lastEvent;
  // Las piezas ya no maduran todas a la vez: dejar completar esta primera carga.
  b.update(CONFIG.charcoalHeatingMinutes * 60 + 120);
  assert.equal(b.fuel.length, 0);
  assert.equal(b.tray.length, 3);
  assert.equal(b.lastEvent, message, 'la caída no genera avisos');
  assert.equal(b.lit, false, 'ya no queda llama en la canasta vacía');
  for (const piece of b.tray) {
    assert.equal(piece.state, 'ready');
    if (piece.state !== 'ready') continue;
    assert.ok(originalEmbers.includes(piece.ember), 'se transfiere la misma brasa');
    assert.equal(piece.id, piece.ember.id);
    assert.ok(piece.ember.massG < piece.ember.initialMassG);
    assert.ok(Math.abs(piece.ember.massG + piece.ember.ashG / CONFIG.ashFraction - CONFIG.emberMassG) < 1e-8);
  }
  const mass = originalEmbers[0].massG;
  b.update(60);
  assert.ok(originalEmbers[0].massG < mass, 'las brasas se consumen también sobre el piso');
  b.update(3600);
  assert.ok(originalEmbers.every(e => e.massG === 0));
  assert.equal(b.takeFromTray(), null, 'la pala no recoge ceniza como brasa encendida');
});

test('la devolución de un fragmento conserva su masa, ceniza y progreso', () => {
  const b = new BrazierModel();
  b.addFuel('charcoal');
  b.addTinder();
  b.ignite();
  b.update(300);
  const fuel = b.fuel[0];
  const before = { progress: fuel.progress, mass: fuel.ember.massG, ash: fuel.ember.ashG };
  assert.ok(b.hit());
  const piece = b.takeFromTray();
  assert.ok(piece);
  assert.ok(b.returnImmature(piece));
  assert.equal(b.fuel[0], fuel);
  assert.deepEqual({ progress: fuel.progress, mass: fuel.ember.massG, ash: fuel.ember.ashG }, before);
});

test('un paso grande respeta el consumo del papel igual que los pasos fijos', () => {
  const coarse = new BrazierModel();
  const fine = new BrazierModel();
  for (const b of [coarse, fine]) { b.addFuel('charcoal'); b.addTinder(); b.ignite(); }
  coarse.update(850);
  for (let i = 0; i < 850 * 4; i++) fine.update(0.25);
  assert.equal(coarse.tinderSecondsRemaining, fine.tinderSecondsRemaining);
  assert.equal(coarse.fuel.length, fine.fuel.length);
  assert.equal(coarse.tray.length, fine.tray.length);
  const a = coarse.tray[0], b = fine.tray[0];
  assert.ok(a?.state === 'ready' && b?.state === 'ready');
  assert.equal(a.ember.massG, b.ember.massG);
});
