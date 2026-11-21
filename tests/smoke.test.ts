import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { newFuel } from '../src/sim/embers.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { brazierSmoke, meatSmoke } from '../src/effects/smoke-sources.ts';
import { createSmokeSystem } from '../src/effects/smoke.ts';
import { createBrazier } from '../src/effects/brazier-effects.ts';
import { createFireLighting } from '../src/lighting/lighting.ts';

function fuel(kind: Parameters<typeof newFuel>[0], progress: number) {
  const piece = newFuel(kind);
  return { ...piece, progress };
}

test('brasero apagado no humea', () => {
  const level = brazierSmoke({ lit: false, tinderBurning: false, tinderFraction: 0, fuel: [fuel('small-wood', 0)] });
  assert.equal(level.amount, 0);
});

test('el papel encendido da la bocanada más densa y se afina al consumirse', () => {
  const fresh = brazierSmoke({ lit: true, tinderBurning: true, tinderFraction: 1, fuel: [] });
  const almostGone = brazierSmoke({ lit: true, tinderBurning: true, tinderFraction: 0.1, fuel: [] });
  assert.ok(fresh.amount > 0.9);
  assert.ok(almostGone.amount < fresh.amount);
});

test('la leña ardiendo humea más que el carbón y ambos se apagan al madurar a brasa', () => {
  const burning = CONFIG.largeWoodIgnitionProgress + 0.05;
  const wood = brazierSmoke({ lit: true, tinderBurning: false, tinderFraction: 0, fuel: [fuel('large-wood', burning)] });
  const coal = brazierSmoke({ lit: true, tinderBurning: false, tinderFraction: 0, fuel: [fuel('charcoal', burning)] });
  const mature = brazierSmoke({ lit: true, tinderBurning: false, tinderFraction: 0, fuel: [fuel('large-wood', 1)] });
  assert.ok(wood.amount > coal.amount);
  assert.ok(mature.amount < wood.amount);
  assert.ok(mature.amount > 0, 'queda un hilo de humo mientras haya fuego');
  assert.ok(wood.darkness > coal.darkness, 'el humo de leña es más gris que el del carbón');
});

test('carne fuera de la parrilla o fría no humea; caliente sobre brasas sí', () => {
  assert.equal(meatSmoke(0, 180, 0).amount, 0);
  assert.equal(meatSmoke(4000, CONFIG.meatInitialC, 0).amount, 0);
  const sizzling = meatSmoke(4000, 140, 0);
  assert.ok(sizzling.amount > 0.3);
  assert.equal(sizzling.darkness, 0, 'la grasa que gotea da humo blanco');
});

test('el quemado vuelve el humo más espeso y oscuro', () => {
  const ok = meatSmoke(4000, 140, 0);
  const burnt = meatSmoke(4000, 230, 40);
  assert.ok(burnt.amount > ok.amount);
  assert.ok(burnt.darkness > 0.7);
});

test('el sistema de humo emite según el caudal, sube y recicla partículas', () => {
  const scene = new THREE.Scene();
  const smoke = createSmokeSystem(scene, { capacity: 20, maxRate: 10, life: 1, size: [0.1, 0.5], rise: 0.4, spread: 0.05, opacity: 0.4 });
  const origin = new THREE.Vector3(0, 1, 0);
  smoke.emit('a', origin, { amount: 0, darkness: 0 }, 1);
  assert.equal(smoke.activeCount, 0);
  smoke.emit('a', origin, { amount: 1, darkness: 0 }, 1);
  assert.ok(smoke.activeCount >= 9 && smoke.activeCount <= 10);
  smoke.update(0.5, 0);
  const sprites = smoke.group.children.filter(c => c.visible);
  assert.ok(sprites.every(s => s.position.y > 1), 'el humo sube');
  smoke.emit('a', origin, { amount: 1, darkness: 0 }, 5);
  assert.equal(smoke.activeCount, 20, 'nunca supera la capacidad');
  smoke.update(2, 1);
  assert.equal(smoke.activeCount, 0, 'las partículas viejas se reciclan');
  smoke.emit('a', origin, { amount: 1, darkness: 0 }, 1);
  assert.equal(smoke.group.children.length, 20, 'reusa los sprites del pool');
});

test('el brasero encendido humea en la escena sin tocar la simulación', () => {
  const scene = new THREE.Scene();
  const world = new SimulationWorld('fridge');
  world.brazier.addFuel('small-wood');
  world.brazier.addTinder();
  world.brazier.ignite();
  const visual = createBrazier(scene, []);
  const before = JSON.stringify(world.brazier.fuel.map(f => [f.progress, f.ember.massG]));
  for(let i = 0;i <= 20;i++) visual.updateVisuals(world, i * 0.05);
  assert.ok(visual.smoke.activeCount > 0);
  assert.equal(JSON.stringify(world.brazier.fuel.map(f => [f.progress, f.ember.massG])), before);
});

test('la luz del fuego proyecta sombras solo mientras arde', () => {
  const lighting = createFireLighting(new THREE.Group());
  assert.equal(lighting.light.castShadow, true);
  lighting.update({ lit: false, tinderBurning: false }, 0);
  assert.equal(lighting.light.shadow.autoUpdate, false);
  lighting.update({ lit: true, tinderBurning: true }, 0.2);
  assert.equal(lighting.light.shadow.autoUpdate, true);
});
