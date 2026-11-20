import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeMeat, faceLabel } from '../src/ui/cooking-card.ts';
import { MeatModel } from '../src/sim/meat.ts';
import { SimulationWorld } from '../src/sim/world.ts';

const freshMatambre = () => {
  const world = new SimulationWorld();
  return world.meats[0];
};

test('una pieza cruda en la tabla invita a llevarla a la parrilla', () => {
  const meat = freshMatambre();
  const card = describeMeat(meat);
  assert.equal(card.place, 'En la tabla');
  assert.equal(card.doneness, 'Cruda');
  assert.equal(card.tone, 'raw');
  assert.match(card.hint, /pinza/);
  assert.ok(card.progress < 0.2);
});

test('si la cara de abajo ya doró y la de arriba no, sugiere darla vuelta', () => {
  const meat = freshMatambre();
  meat.location = 'grill';
  meat.faceDown = 'a';
  meat.brown.a = 40;
  meat.brown.b = 2;
  const card = describeMeat(meat);
  assert.match(card.hint, /dala vuelta \(R\)/);
  assert.equal(card.faces.find(f => f.down)?.label, 'Dorada');
});

test('en la pinza indica dónde apoyarla y marca el progreso del centro', () => {
  const meat = freshMatambre();
  meat.layersC.fill(50);
  const card = describeMeat(meat, true);
  assert.equal(card.place, 'En la pinza');
  assert.match(card.hint, /brasas/);
  assert.ok(card.progress > 0.6 && card.progress < 0.8);
  assert.match(card.center, /50 °C/);
});

test('las etiquetas de cada cara siguen los umbrales de la simulación', () => {
  assert.equal(faceLabel(0, 0).label, 'Cruda');
  assert.equal(faceLabel(35, 0).label, 'Dorada');
  assert.equal(faceLabel(70, 0).label, 'Muy tostada');
  assert.equal(faceLabel(50, 12).label, 'Empieza a quemarse');
  assert.equal(faceLabel(50, 40).label, 'Quemada');
});

test('la ficha distingue una tripa tostada de un embutido quemado', () => {
  const meat = new MeatModel('chorizo');
  meat.layersC.fill(71);
  meat.brown.a = meat.brown.b = 45;
  meat.casingDamage.a = 35;
  const card = describeMeat(meat);
  assert.equal(card.tone, 'ready');
  assert.equal(card.faces[0].label, 'Tripa tostada');

  meat.casingDamage.a = meat.casingDamage.b = 80;
  assert.equal(describeMeat(meat).doneness, 'Quemada');
});
