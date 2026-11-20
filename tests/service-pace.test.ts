import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDelivery, type ClientOrder } from '../src/ai/client-brain.ts';
import { MeatModel } from '../src/sim/meat.ts';
import { MEAT_KINDS, type MeatKind } from '../src/sim/meatCatalog.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { SimulationWorld } from '../src/sim/world.ts';

test('con el mismo calor los cortes llegan en tiempos distintos y el pedido entra en la nueva espera', () => {
  const centerTimes = new Map<MeatKind, number>();
  const { simulationStepSeconds: dt, timeScale } = CONFIG;
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind);
    const order: ClientOrder = {
      kind,
      doneness: kind === 'falda' ? 'bien-cocido' : 'a-punto',
      maxPatienceSeconds: CONFIG.clientPatienceRealSeconds[kind],
    };
    // Una referencia común de calor; 3 minutos reales reservados para el fuego y la preparación.
    const heatBudgetSimS = (order.maxPatienceSeconds - 180) * timeScale;
    meat.onGrill = true;
    let excellent = false;
    for (let t = dt; t <= heatBudgetSimS; t += dt) {
      meat.update(dt, 4000);
      if (meat.centerC >= (meat.definition.target?.minC ?? 60) && !centerTimes.has(kind)) centerTimes.set(kind, t / timeScale);
      if (t % 1 === 0 && evaluateDelivery(order, meat, 0.5).grade === 'excelente') excellent = true;
      if (t % 300 === 0) meat.flip();
      if (excellent && centerTimes.has(kind)) break;
    }
    assert.ok(excellent, `El pedido de ${kind} alcanza una entrega excelente con margen`);
    assert.ok(centerTimes.has(kind), `El centro de ${kind} alcanza su objetivo`);
  }
  const times = ['matambre', 'falda', 'costilla', 'vacio'].map(kind => centerTimes.get(kind as MeatKind)!);
  assert.ok(times.every((time, i) => i === 0 || time > times[i - 1]));
});

test('un comensal que pidió comida no se va al cumplirse la antigua espera de cuatro minutos', () => {
  const world = new SimulationWorld();
  world.resetClients(true);
  world.updateClients(2.5);
  const first = world.clients.clients[0];
  for (let i = 0; i < 30 && first.state === 'entrando'; i++) world.updateClients(1);
  assert.equal(first.state, 'esperando');
  assert.equal(first.order.maxPatienceSeconds, CONFIG.clientPatienceRealSeconds[first.order.kind]);
  world.updateClients(260);
  assert.equal(first.state, 'esperando');
  assert.ok(first.patienceSeconds > 0);
  const events = world.updateClients(first.patienceSeconds + 1);
  assert.ok(events.some(event => event.kind === 'impatient-leave' && event.client === first));
  assert.equal(first.state, 'saliendo');
});

test('el brasero empieza vacío y los ticks no agregan madera, carbón ni papel en ningún modo', () => {
  const world = new SimulationWorld('fridge');
  for (const clients of [false, true, false]) {
    world.resetClients(clients);
    world.tick(15 * 60);
    world.updateClients(20);
    assert.deepEqual(world.brazier.fuel, []);
    assert.deepEqual(world.brazier.tray, []);
    assert.equal(world.brazier.tinder, 0);
    assert.equal(world.brazier.tinderSecondsRemaining, 0);
  }
  assert.ok(world.brazier.addFuel('small-wood'));
  const id = world.brazier.fuel[0].id;
  world.brazier.addTinder();
  assert.ok(world.brazier.ignite());
  world.tick(12 * 60);
  assert.deepEqual(world.brazier.fuel, []);
  assert.deepEqual(world.brazier.tray.map(piece => piece.id), [id], 'cae sólo la pieza que se cargó');
});
