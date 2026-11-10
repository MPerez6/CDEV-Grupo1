import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationWorld } from '../src/sim/world.ts';
import { MeatModel } from '../src/sim/meat.ts';
import { evaluateDelivery } from '../src/ai/client-brain.ts';

test('Modo Clientes: entrada de comensales, evaluación por punto de cocción y reposición al terminar de comer', () => {
  const world = new SimulationWorld();
  world.addMeat('chorizo');
  world.clients.reset(true);

  // Al avanzar el tiempo real, entra el primer cliente y camina hasta su silla bajo la parra
  let events = world.updateClients(2.5);
  assert.equal(world.clients.clients.length, 1);
  assert.equal(events[0]?.kind, 'arrived');

  const client = world.clients.clients[0];
  assert.equal(client.state, 'entrando');

  // Avanzamos tiempo suficiente para que llegue a su silla y haga el pedido
  for(let i = 0; i < 20 && client.state === 'entrando'; i++) {
    world.updateClients(1.0);
  }
  assert.equal(client.state, 'esperando');

  // Preparamos el corte pedido en el punto exacto y lo llevamos en la pinza
  const requestedKind = client.order.kind;
  const meat = world.meats.find(m => m.definition.kind === requestedKind) ?? world.addMeat(requestedKind);
  meat.layersC.fill(71);
  meat.brown.a = 45;
  meat.brown.b = 45;

  const evalRes = evaluateDelivery(client.order, meat, 0.9);
  assert.equal(evalRes.grade, 'excelente');
  assert.ok(evalRes.scoreDelta > 90);
  assert.ok(evalRes.tipPesos >= 1200);

  assert.ok(world.takeMeat(meat.id));
  assert.ok(world.serveMeatToSeat(client.seatIndex));
  assert.equal(meat.location, 'served');
  assert.equal(meat.servedSeat, client.seatIndex);
  assert.equal(client.state, 'comiendo');
  assert.equal(world.clients.servedCount, 1);

  // Cuando termina de comer, se levanta a salir y la pieza se repone fresca en la tabla
  world.updateClients(13.0);
  assert.equal(client.state, 'saliendo');
  assert.equal(meat.location, 'board');
  assert.equal(meat.servedSeat, null);
  assert.equal(meat.brown.a, 0);
});

test('Reacciones de enojo diferenciadas: corte equivocado, crudo, quemado y punto errado', () => {
  const order = { kind: 'vacio' as const, doneness: 'jugoso' as const, maxPatienceSeconds: 200 };

  // 1. Corte equivocado (pide Vacío, recibe Chorizo)
  const wrongMeat = new MeatModel('chorizo');
  wrongMeat.layersC.fill(72);
  wrongMeat.brown.a = 45;
  wrongMeat.brown.b = 45;
  const evalWrong = evaluateDelivery(order, wrongMeat, 0.8);
  assert.equal(evalWrong.grade, 'malo');
  assert.equal(evalWrong.reactionKind, 'enojo-corte');
  assert.ok(evalWrong.scoreDelta < 0);
  assert.ok(evalWrong.angerGesture);

  // 2. Corte crudo
  const rawMeat = new MeatModel('vacio');
  const evalRaw = evaluateDelivery(order, rawMeat, 0.8);
  assert.equal(evalRaw.grade, 'malo');
  assert.equal(evalRaw.reactionKind, 'enojo-crudo');
  assert.ok(evalRaw.scoreDelta < 0);

  // 3. Corte quemado
  const burnedMeat = new MeatModel('vacio');
  burnedMeat.layersC.fill(75);
  burnedMeat.burn.a = 45;
  const evalBurn = evaluateDelivery(order, burnedMeat, 0.8);
  assert.equal(evalBurn.grade, 'malo');
  assert.equal(evalBurn.reactionKind, 'enojo-quemado');
  assert.ok(evalBurn.scoreDelta < 0);

  // 4. Punto de cocción errado (pide Jugoso y recibe Seco / Pasado)
  const overcookedMeat = new MeatModel('vacio');
  overcookedMeat.layersC.fill(86);
  overcookedMeat.brown.a = 50;
  overcookedMeat.brown.b = 50;
  overcookedMeat.juiciness = 20;
  const evalPoint = evaluateDelivery(order, overcookedMeat, 0.8);
  assert.equal(evalPoint.grade, 'regular');
  assert.equal(evalPoint.reactionKind, 'queja-punto');

  // 5. Morcilla precocida: fría dice "¡ESTÁ FRÍA!" y al entibiar a 58 °C ya resulta excelente
  const morcillaOrder = { kind: 'morcilla' as const, doneness: 'a-punto' as const, maxPatienceSeconds: 195 };
  const coldMorcilla = new MeatModel('morcilla');
  const evalColdMorcilla = evaluateDelivery(morcillaOrder, coldMorcilla, 0.9);
  assert.equal(evalColdMorcilla.shortTitle, '🥶 ¡ESTÁ FRÍA!');

  const warmMorcilla = new MeatModel('morcilla');
  warmMorcilla.layersC.fill(60);
  const evalWarmMorcilla = evaluateDelivery(morcillaOrder, warmMorcilla, 0.9);
  assert.equal(evalWarmMorcilla.grade, 'excelente');
  assert.ok(evalWarmMorcilla.tipPesos >= 1800);
});
