import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeEmber, HeatGrid, newEmber, newFuel } from '../src/sim/embers.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { SimulationWorld } from '../src/sim/world.ts';

function near(actual: number, expected: number, tolerance = 1e-8): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} debe aproximarse a ${expected}`);
}

test('referencia de 50 g: 1,2 g/min, 616 W brutos y 110,88 W útiles', () => {
  const ember = newEmber(50);
  const watts = consumeEmber(ember, 1);
  near(50 - ember.massG, 0.02);
  near((50 - ember.massG) * 60, 1.2);
  near(watts / CONFIG.thermalDelivery, 616);
  near(watts, 110.88);
  near(ember.ashG, 0.001);
});

test('el consumo depende de la masa inicial y de la fracción combustible restante', () => {
  const halfBurned = newEmber(50);
  halfBurned.massG = 25;
  halfBurned.ashG = 1.25;
  consumeEmber(halfBurned, 60);
  near(halfBurned.massG, 23.98); // 1,2 × (0,7 + 0,3 × 0,5) = 1,02 g/min
  near(halfBurned.ashG, 1.301);
  const larger = newEmber(100);
  consumeEmber(larger, 60);
  near(100 - larger.massG, 1.2 * Math.pow(2, 2 / 3));
});

test('el último paso limita consumo y energía a la masa disponible y luego entrega cero', () => {
  const ember = newEmber(50);
  ember.massG = 0.001;
  ember.ashG = 49.999 * 0.05;
  near(consumeEmber(ember, 1), 5.544);
  assert.equal(ember.massG, 0);
  near(ember.ashG, 2.5);
  const exhausted = { ...ember };
  assert.equal(consumeEmber(ember, 3600), 0);
  assert.deepEqual(ember, exhausted);
});

test('balance de toda la combustión: masa consumida, ceniza, gases y energía integrada', () => {
  const ember = newEmber(50);
  let usefulJ = 0;
  for (let i = 0; i < 14400; i++) usefulJ += consumeEmber(ember, 0.25) * 0.25;
  assert.equal(ember.massG, 0);
  near(ember.ashG, 2.5);
  near(usefulJ, 277200, 1e-6);
  near(usefulJ / 0.18, 1540000, 1e-5);
  const consumedG = ember.ashG / 0.05;
  const gaseousProductsFromFuelG = consumedG * 0.95;
  near(ember.massG + ember.ashG + gaseousProductsFromFuelG, 50);
});

test('geometría y flujo: 24 sectores de 0,0225 m², aporte local y cuatro vecinos', () => {
  const grid = new HeatGrid();
  assert.equal(grid.width, 6);
  assert.equal(grid.height, 4);
  near(grid.cellAreaM2, 0.0225);
  near(110.88 / grid.cellAreaM2, 4928);
  grid.put(7, newEmber(50));
  grid.update(1);
  near(grid.fluxWm2[7], 3942.4);
  for (const i of [1, 6, 8, 13]) near(grid.fluxWm2[i], 246.4);
  for (let i = 0; i < 24; i++) {
    if (![1, 6, 7, 8, 13].includes(i)) assert.equal(grid.fluxWm2[i], 0);
  }
  near(grid.fluxWm2.reduce((sum, flux) => sum + flux * grid.cellAreaM2, 0), 110.88);
});

test('dos brasas en un sector y las contribuciones de sectores distintos se suman', () => {
  const grid = new HeatGrid();
  grid.put(7, newEmber(50));
  grid.put(7, newEmber(50));
  grid.put(8, newEmber(50));
  grid.update(1);
  near(grid.fluxWm2[7], 7884.8 + 246.4);
  near(grid.fluxWm2[8], 3942.4 + 2 * 246.4);
  near(grid.fluxWm2.reduce((sum, flux) => sum + flux * grid.cellAreaM2, 0), 3 * 110.88);
});

test('bordes y esquinas pierden los aportes exteriores sin envolver filas ni renormalizar', () => {
  for (const [index, retainedFraction, excluded] of [[0, 0.90, 5], [5, 0.90, 6], [2, 0.95, 23]] as const) {
    const grid = new HeatGrid();
    grid.put(index, newEmber(50));
    grid.update(1);
    const receivedW = grid.fluxWm2.reduce((sum, flux) => sum + flux * grid.cellAreaM2, 0);
    near(receivedW, 110.88 * retainedFraction);
    near(receivedW + 110.88 * (1 - retainedFraction), 110.88);
    assert.equal(grid.fluxWm2[excluded], 0);
    near(grid.fluxWm2[index], 3942.4);
  }
});

test('la presencia y el giro de la carne no cambian consumo ni flujo de las brasas', () => {
  const empty = new SimulationWorld();
  const occupied = new SimulationWorld();
  const a = newEmber(50), b = newEmber(50);
  empty.grill.put(13, a);
  occupied.grill.put(13, b);
  occupied.meat.onGrill = true;
  for (let i = 0; i < 480; i++) {
    if (i % 20 === 0) occupied.meat.flip();
    empty.tick(0.25);
    occupied.tick(0.25);
  }
  assert.equal(a.massG, b.massG);
  assert.equal(a.ashG, b.ashG);
  assert.ok(a.massG < 50);
  assert.deepEqual(empty.grill.fluxWm2, occupied.grill.fluxWm2);
});

test('agotar una brasa elimina su fuente de calor, sin vida útil artificial', () => {
  const grid = new HeatGrid();
  const ember = newEmber(50);
  grid.put(7, ember);
  grid.update(100000);
  assert.equal(ember.massG, 0);
  near(ember.ashG, 2.5);
  assert.equal(grid.emberCount, 0);
  assert.ok(grid.fluxWm2[7] > 0, 'el intervalo final aún contiene la energía consumida');
  grid.update(0.25);
  assert.ok(grid.fluxWm2.every(flux => flux === 0));
});

test('mover una brasa entre sectores no duplica su identidad ni reinicia su estado', () => {
  const grid = new HeatGrid();
  const ember = newEmber(50);
  grid.put(7, ember);
  grid.update(60);
  const before = { ...ember };
  grid.put(8, ember);
  grid.put(8, ember); // La misma orden repetida tampoco agrega combustible.
  assert.equal(grid.cells[7].length, 0);
  assert.equal(grid.emberCount, 1);
  assert.equal(grid.cells[8][0], ember);
  assert.deepEqual(ember, before);
  const reference = { ...ember };
  const expectedW = consumeEmber(reference, 1);
  grid.update(1);
  near(ember.massG, reference.massG);
  near(ember.ashG, reference.ashG);
  near(grid.fluxWm2[8], expectedW * 0.8 / 0.0225);
  near(grid.fluxWm2[7], expectedW * 0.05 / 0.0225);
});

test('un sector inválido o una identidad clonada no alteran las brasas registradas', () => {
  const grid = new HeatGrid();
  const ember = newEmber(50);
  grid.put(7, ember);
  for (const index of [-1, 24, 1.5, NaN]) assert.throws(() => grid.put(index, ember), RangeError);
  assert.throws(() => grid.put(8, { ...ember }));
  assert.equal(grid.emberCount, 1);
  assert.equal(grid.cells[7][0], ember);
});

test('la pala conserva la brasa recogida y sigue consumiéndola sin calentar la parrilla', () => {
  const world = new SimulationWorld();
  const ember = newEmber(50);
  world.brazier.tray.push({ id: ember.id, state: 'ready', ember });
  world.tick(0.25);
  world.carried = world.brazier.takeFromTray();
  assert.equal(world.carried?.state, 'ready');
  const reference = { ...ember };
  const beforeMass = ember.massG;
  for (let i = 0; i < 240; i++) {
    consumeEmber(reference, 0.25);
    world.tick(0.25);
  }
  assert.ok(ember.massG < beforeMass);
  assert.deepEqual(ember, reference);
  assert.ok(world.grill.fluxWm2.every(flux => flux === 0));
  assert.equal(world.brazier.tray.length, 0);
  const beforeDeposit = { ...ember };
  assert.ok(world.depositEmber(7));
  assert.equal(world.carried, null);
  assert.equal(world.grill.cells[7][0], ember);
  assert.deepEqual(ember, beforeDeposit);
  assert.equal(world.depositEmber(8), false);
  assert.equal(world.grill.emberCount, 1);
});

test('el fragmento inmaduro encendido consume en la pala sin reiniciar su progreso al volver', () => {
  const world = new SimulationWorld();
  const fuel = newFuel('charcoal');
  fuel.progress = 0.5;
  world.carried = { id: fuel.id, state: 'immature', fuel };
  world.tick(1);
  near(fuel.ember.massG, 49.98);
  near(fuel.ember.ashG, 0.001);
  assert.equal(fuel.progress, 0.5);
  assert.ok(world.returnImmature());
  assert.equal(world.brazier.fuel[0], fuel);
  near(fuel.ember.massG, 49.98);
  assert.equal(fuel.progress, 0.5);
});

test('intervalos no válidos no corrompen masa, flujo, reloj ni temperaturas', () => {
  const world = new SimulationWorld();
  const ember = newEmber(50);
  world.grill.put(7, ember);
  world.tick(0.25);
  const before = JSON.stringify(world);
  for (const dt of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(consumeEmber(ember, dt), 0);
    world.grill.update(dt);
    world.meat.update(dt, 4000);
    world.tick(dt);
    assert.equal(JSON.stringify(world), before);
  }
});

test('la carne recibe flujo por área y absorptividad, sin aplicar otra vez el 18 %', () => {
  const world = new SimulationWorld();
  world.meat.onGrill = true;
  world.meat.layersC.fill(25); // Sin intercambio inicial con ambiente ni evaporación.
  // Fase 2: cobertura geométrica real. Crear flujo uniforme en el interior, sin depender del
  // antiguo promedio fijo de cuatro sectores; se sigue comprobando la eficiencia una sola vez.
  for (let i = 0; i < 24; i++) world.grill.put(i, newEmber(50));
  world.tick(0.25);
  const areaM2 = 1.5 / (1070 * 0.015);
  const expectedMeanFlux = 4928;
  const expectedAbsorbedJ = expectedMeanFlux * 0.6 * areaM2 * 0.25;
  const storedJ = world.meat.layersC.reduce((sum, temperature) => sum + (temperature - 25) * (1.5 / 5) * 3800, 0);
  near(storedJ, expectedAbsorbedJ);
  assert.equal(world.meat.layersC.length, 5);
});

test('energía integrada de la cuadrícula más pérdidas coincide con el combustible consumido', () => {
  const grid = new HeatGrid();
  const center = newEmber(50), corner = newEmber(50);
  grid.put(7, center);
  grid.put(0, corner);
  let receivedJ = 0;
  for (let i = 0; i < 14400; i++) {
    grid.update(0.25);
    receivedJ += grid.fluxWm2.reduce((sum, flux) => sum + flux * grid.cellAreaM2 * 0.25, 0);
  }
  assert.equal(center.massG + corner.massG, 0);
  near(center.ashG + corner.ashG, 5);
  near(receivedJ, 277200 * (1 + 0.9), 1e-6);
  const combustionJ = 100 / 1000 * 30_800_000;
  const deliveryLossJ = combustionJ * 0.82;
  const boundaryLossJ = 277200 * 0.1;
  near(receivedJ + deliveryLossJ + boundaryLossJ, combustionJ, 1e-5);
});

test('una brasa agotada en la pala no agrega una fuente de calor al depositarla', () => {
  const world = new SimulationWorld();
  const ember = newEmber(50);
  world.carried = { id: ember.id, state: 'ready', ember };
  world.tick(100000);
  assert.equal(ember.massG, 0);
  near(ember.ashG, 2.5);
  assert.ok(world.depositEmber(7));
  world.tick(0.25);
  assert.equal(world.grill.emberCount, 0);
  assert.ok(world.grill.fluxWm2.every(flux => flux === 0));
});
