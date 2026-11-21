import test from 'node:test';
import assert from 'node:assert/strict';

import { DAY_SETTINGS, DayCycle, daylight, formatHour, sunHeight } from '../src/sim/daytime.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { createGameplay } from '../src/gameplay/actions.ts';
import { ClientManager } from '../src/ai/client-brain.ts';

test('el sol está alto al mediodía, en el horizonte al atardecer y abajo de noche', () => {
  const noon = (DAY_SETTINGS.sunrise + DAY_SETTINGS.sunset) / 2;
  assert.ok(Math.abs(sunHeight(noon) - 1) < 1e-9);
  assert.ok(Math.abs(sunHeight(DAY_SETTINGS.sunset)) < 1e-9);
  assert.ok(sunHeight(1) < -0.5);
  assert.equal(daylight(13, 0).night, 0);
  assert.ok(daylight(23, 0).night > 0.99);
  assert.ok(daylight(DAY_SETTINGS.sunset - 0.2, 0).golden > 0.5, 'atardecer dorado');
  assert.ok(daylight(13, 1).sun < daylight(13, 0).sun, 'las nubes tapan el sol');
});

test('la hora avanza con el tiempo real y da la vuelta a medianoche', () => {
  const day = new DayCycle(23.5);
  day.tick(DAY_SETTINGS.realSecondsPerHour);
  assert.ok(Math.abs(day.hour - 0.5) < 1e-9);
  assert.equal(formatHour(19.75), '19:45');
  assert.equal(formatHour(24.5), '00:30');
});

test('avisa una vez cuando se hace de noche y sugiere prender la luz', () => {
  const day = new DayCycle(19.5);
  const events = [];
  for(let t = 0;t < DAY_SETTINGS.realSecondsPerHour * 2;t += 1) events.push(...day.tick(1));
  const night = events.filter(e => e.kind === 'anochece');
  assert.equal(night.length, 1);
  assert.match(night[0].message, /luz/);
});

test('el clima cambia solo y la lluvia llega con el cielo cubierto', () => {
  const day = new DayCycle(12, 3);
  const seen = new Set<string>();
  for(let t = 0;t < 4000;t += 1) { day.tick(1); seen.add(day.weather); }
  assert.ok(seen.size >= 2, `climas vistos: ${[...seen].join(', ')}`);
  day.setWeather('lluvia', true);
  assert.equal(day.rain, 1);
  assert.equal(day.clouds, 1);
  day.setWeather('despejado');
  for(let t = 0;t < 60;t += 1) day.tick(1);
  assert.ok(day.rain < 0.05, 'para de llover');
});

test('E en la llave prende y apaga la luz del asador', () => {
  const world = new SimulationWorld('fridge');
  const gameplay = createGameplay(world);
  gameplay.interact({ kind: 'light-switch' });
  assert.equal(world.asadorLight, true);
  assert.match(world.message, /Prendiste/);
  gameplay.interact({ kind: 'light-switch' });
  assert.equal(world.asadorLight, false);
});

test('a la hora de cierre no entra más gente', () => {
  const clients = new ClientManager();
  clients.reset(true);
  clients.acceptingClients = false;
  for(let i = 0;i < 300;i++) clients.update(0.1);
  assert.equal(clients.clients.length, 0);
  clients.reset(true);
  assert.equal(clients.acceptingClients, true, 'una jornada nueva vuelve a abrir');
});
