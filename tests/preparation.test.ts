import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMeatViews } from '../src/art/meat-views.ts';
import { createGameplay } from '../src/gameplay/actions.ts';
import { bindPreparationStroke } from '../src/gameplay/input.ts';
import { selectTargetFromRay } from '../src/gameplay/player.ts';
import type { InteractionTarget } from '../src/gameplay/targets.ts';
import { createFridge } from '../src/level/fridge.ts';
import { createPrepTable } from '../src/level/prep-table.ts';
import { FRIDGE_BOUNDS, PREP_TABLE_BOUNDS, boardPosition, fridgePosition } from '../src/level/layout.ts';
import { MEAT_KINDS } from '../src/sim/meatCatalog.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { ClientActor, CLIENT_PROFILES } from '../src/ai/client-brain.ts';

function stockedWorld(): SimulationWorld {
  const world = new SimulationWorld('fridge');
  for (const kind of MEAT_KINDS.slice(1)) world.addMeat(kind);
  return world;
}
const noLabel = () => {};

function rayTo(x: number, y: number, z: number, frontZ: number): THREE.Raycaster {
  const origin = new THREE.Vector3(x, 1.68, frontZ + 0.72);
  return new THREE.Raycaster(origin, new THREE.Vector3(x, y, z).sub(origin).normalize(), 0, 3.5);
}

test('la heladera mantiene seis cortes refrigerados y sólo se seleccionan con la puerta abierta', () => {
  const world = stockedWorld();
  const scene = new THREE.Scene(), clickable: THREE.Object3D[] = [];
  const fridge = createFridge(scene, clickable, noLabel);
  const views = createMeatViews(scene, new THREE.PerspectiveCamera(), clickable);
  const game = createGameplay(world);
  game.equip(2);
  world.tick(12 * 60);
  assert.deepEqual(world.meats.map(meat => meat.definition.kind), [...MEAT_KINDS]);
  assert.ok(world.meats.every(meat => meat.location === 'fridge' && meat.centerC === CONFIG.meatInitialC));
  assert.equal(world.takeMeat(world.meat.id), false);

  views.update(world);
  scene.updateMatrixWorld(true);
  const first = fridgePosition('matambre');
  const closedDoor = selectTargetFromRay(rayTo(first.x, first.y + 0.025, first.z, FRIDGE_BOUNDS.z1), clickable, 2, { carryingMeat: false });
  assert.equal(closedDoor?.kind, 'fridge-door');
  game.interact(closedDoor);
  for (let t = 0; t < 1; t += 0.02) fridge.update(world.fridgeOpen, t);
  views.update(world);
  scene.updateMatrixWorld(true);
  const footprints = new Set<string>();
  for (const meat of world.meats) {
    const p = fridgePosition(meat.definition.kind);
    footprints.add(`${p.x},${p.y}`);
    const view = views.views.get(meat.id)!;
    const box = new THREE.Box3().setFromObject(view.group);
    assert.ok(box.min.x >= FRIDGE_BOUNDS.x0 + 0.06 && box.max.x <= FRIDGE_BOUNDS.x1 - 0.06, meat.definition.name);
    assert.ok(p.x < (FRIDGE_BOUNDS.x0 + FRIDGE_BOUNDS.x1) / 2 ? box.max.x < fridge.root.position.x : box.min.x > fridge.root.position.x, meat.definition.name);
    const target = selectTargetFromRay(rayTo(p.x, p.y + meat.definition.thicknessM, p.z, FRIDGE_BOUNDS.z1), clickable, 2, { carryingMeat: false });
    assert.equal(target?.meatId, meat.id, meat.definition.name);
  }
  assert.equal(footprints.size, MEAT_KINDS.length);
});

function mouse(input: EventTarget, type: string, buttons = 1): void {
  const event = new Event(type);
  Object.defineProperties(event, { button: { value: 0 }, buttons: { value: buttons } });
  input.dispatchEvent(event);
}

test('retirar el mismo corte varias veces repone una pieza fresca al instante', () => {
  const world = stockedWorld();
  world.toggleFridge();
  const ids = new Set<number>();
  for (const cell of [0, 8, 23]) {
    const stock = world.meats.filter(m => m.location === 'fridge' && m.definition.kind === 'chorizo');
    assert.equal(stock.length, 1);
    assert.equal(stock[0].centerC, CONFIG.meatInitialC);
    assert.deepEqual(stock[0].seasonings, []);
    assert.ok(world.takeMeat(stock[0].id));
    ids.add(stock[0].id);
    stock[0].layersC.fill(55);
    assert.ok(world.placeMeat(cell));
  }
  assert.equal(ids.size, 3);
  assert.equal(world.meats.filter(m => m.location === 'fridge').length, MEAT_KINDS.length);
});

test('seleccionar un frasco o hacer un clic no condimenta; arrastrar sobre carne en la tabla sí', () => {
  const world = stockedWorld();
  const scene = new THREE.Scene(), clickable: THREE.Object3D[] = [];
  createPrepTable(scene, clickable, noLabel);
  scene.updateMatrixWorld(true);
  const game = createGameplay(world);
  game.equip(2);
  game.interact({ kind: 'fridge-door' });
  game.interact({ kind: 'meat', meatId: world.meat.id });
  const p = boardPosition();
  const table = selectTargetFromRay(rayTo(p.x, p.y, p.z, PREP_TABLE_BOUNDS.z1), clickable, 2, { carryingMeat: true });
  assert.equal(table?.kind, 'board');
  game.interact(table);
  assert.equal(world.meat.location, 'board');
  const input = new EventTarget();
  const piece = world.meat;
  const board = boardPosition();
  let hit: InteractionTarget = { kind: 'meat', meatId: piece.id, prepPoint: { x: board.x, z: board.z } };
  const unbind = bindPreparationStroke(input, { isPlaying: () => true, gameplay: game, getTarget: () => hit });
  for (const index of [0, 1, 2, 3]) {
    const jar = clickable.find(object => object.userData.kind === 'seasoning' && object.userData.index === index)!;
    const p = jar.position;
    const target = selectTargetFromRay(rayTo(p.x, p.y, p.z, PREP_TABLE_BOUNDS.z1), clickable, 2, { carryingMeat: false });
    assert.equal(target?.index, index);
    game.interact(target);
    assert.equal(piece.seasonings.length, index);
    hit = { kind: 'meat', meatId: piece.id, prepPoint: { x: board.x, z: board.z } };
    mouse(input, 'mousedown');
    assert.equal(piece.seasonings.length, index);
    hit.prepPoint = { x: board.x + 0.09, z: board.z };
    mouse(input, 'mousemove');
    mouse(input, 'mouseup', 0);
    assert.equal(piece.seasonings.length, index + 1);
  }
  unbind();
  game.equip(2);
  assert.deepEqual(piece.seasonings, ['salt', 'chimichurri', 'brine', 'pepper']);
  const other = world.meats[1];
  assert.deepEqual(other.seasonings, []);
  assert.ok(world.takeMeat(other.id));
  assert.equal(world.returnMeatToBoard(), false);
  assert.equal(world.carriedMeatId, other.id);
  assert.ok(world.placeMeat(0));
  game.interact({ kind: 'meat', meatId: world.meat.id });
  assert.ok(world.placeMeat(23));
  assert.deepEqual(piece.seasonings, ['salt', 'chimichurri', 'brine', 'pepper']);
});

test('un matambre cocido se corta en diagonal donde se arrastra, y se sirven las porciones a dos clientes', () => {
  const world = stockedWorld();
  world.clients.enabled = true;
  for (let seat = 0; seat < 2; seat++) {
    const client = new ClientActor(seat + 1, CLIENT_PROFILES[seat], seat, {
      kind: 'matambre', doneness: 'a-punto', maxPatienceSeconds: 600,
    });
    client.state = 'esperando';
    world.clients.clients.push(client);
  }
  const meat = world.meat;
  world.toggleFridge();
  assert.ok(world.takeMeat(meat.id));
  assert.ok(world.returnMeatToBoard());
  assert.ok(world.seasonMeat('salt', meat.id));
  meat.layersC.fill(71); meat.brown.a = meat.brown.b = 45;
  const game = createGameplay(world);
  const input = new EventTarget();
  const board = boardPosition();
  const hit: InteractionTarget = { kind: 'meat', meatId: meat.id, prepPoint: { x: board.x - .26, z: board.z + .12 } };
  const unbind = bindPreparationStroke(input, { isPlaying: () => true, gameplay: game, getTarget: () => hit });
  game.interact({ kind: 'prep-knife' });
  mouse(input, 'mousedown');
  assert.equal(world.meats.filter(m => m.location === 'board').length, 1);
  hit.prepPoint = { x: board.x - .19, z: board.z - .09 };
  mouse(input, 'mousemove');
  assert.ok(game.knifeStroke);
  assert.equal(world.meats.filter(m => m.location === 'board').length, 1);
  mouse(input, 'mouseup', 0);
  unbind();
  const halves = world.meats.filter(m => m.location === 'board');
  assert.equal(halves.length, 2);
  assert.equal(world.meatById(meat.id), undefined);
  assert.ok(Math.abs(halves[0].definition.massKg - halves[1].definition.massKg) > .2);
  assert.ok(Math.abs(halves[0].definition.massKg + halves[1].definition.massKg - 1.5) < 1e-9);
  for (const [seat, half] of halves.entries()) {
    assert.equal(half.centerC, 71);
    assert.deepEqual(half.seasonings, ['salt']);
    assert.ok(world.takeMeat(half.id));
    assert.ok(world.serveMeatToSeat(seat));
    assert.equal(world.clients.clientAtSeat(seat)?.servedMeatId, half.id);
    assert.equal(world.clients.lastDelivery?.grade, 'excelente');
  }
  const stock = world.meats.find(m => m.location === 'fridge' && m.definition.kind === 'matambre')!;
  world.updateClients(13);
  assert.ok(halves.every(half => !world.meatById(half.id)));
  assert.equal(world.meatById(stock.id), stock);
  assert.equal(stock.centerC, CONFIG.meatInitialC);
  assert.deepEqual(stock.seasonings, []);
  assert.equal(world.meats.length, MEAT_KINDS.length);
});
