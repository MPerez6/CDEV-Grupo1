import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MeatModel } from '../src/sim/meat.ts';
import { MEAT_CATALOG, MEAT_KINDS, polygonArea } from '../src/sim/meatCatalog.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { footprintCoverage, meatFootprint } from '../src/sim/meatFootprint.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { newEmber } from '../src/sim/embers.ts';
import { createMeatVisual } from '../src/art/meat-visual.ts';
import { boardPosition, PREP_TABLE_BOUNDS } from '../src/level/layout.ts';

function near(actual: number, expected: number, tolerance = 1e-8): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
}
function storedEnergy(meat: MeatModel): number {
  return meat.layersC.reduce((sum, t, i) => sum + t * meat.layerMassKg[i] * meat.definition.specificHeatJKgK, 0);
}
function heat(meat: MeatModel, flux: number, seconds: number): void {
  meat.onGrill = true;
  for (let i = 0; i < seconds * 4; i++) meat.update(0.25, flux);
}
function thermalState(meat: MeatModel): object {
  return { temperatures: [...meat.layersC], brown: { ...meat.brown }, burn: { ...meat.burn },
    casing: { ...meat.casingDamage }, juice: meat.juiciness, time: meat.totalSimSeconds, face: meat.faceDown };
}

test('catálogo: masas, espesores, rangos y objetivos pedidos para seis productos', () => {
  const expected = [
    [1.5, 0.015, 3000, 5500], [1.8, 0.035, 4000, 7000], [1.2, 0.03, 3000, 6000],
    [1.2, 0.025, 4000, 6500], [0.15, 0.032, 4500, 7500], [0.14, 0.032, 2500, 4500],
  ];
  MEAT_KINDS.forEach((kind, i) => {
    const d = MEAT_CATALOG[kind];
    assert.deepEqual([d.massKg, d.thicknessM, ...d.recommendedFluxWm2], expected[i]);
    if (i < 4) assert.deepEqual(d.target, { minC: 68, maxC: 74 });
  });
  assert.deepEqual(MEAT_CATALOG.chorizo.target, { minC: 71, maxC: null });
  assert.equal(MEAT_CATALOG.morcilla.target, null);
  assert.equal(MEAT_CATALOG.morcilla.precooked, true);
});

test('cada pieza tiene exactamente cinco capas, masa total correcta e identidad independiente', () => {
  for (const kind of MEAT_KINDS) {
    const a = new MeatModel(kind), b = new MeatModel(kind);
    assert.notEqual(a.id, b.id);
    assert.deepEqual(a.layersC, [5, 5, 5, 5, 5]);
    assert.equal(a.layerMassKg.length, 5);
    assert.equal(a.conductanceWK.length, 4);
    near(a.layerMassKg.reduce((sum, mass) => sum + mass, 0), a.definition.massKg);
    assert.ok(a.layerMassKg.every(mass => mass > 0));
    assert.ok(a.conductanceWK.every(k => k > 0 && Number.isFinite(k)));
    a.layersC[0] = 80; a.brown.a = 50; a.burn.b = 30;
    assert.deepEqual(b.layersC, [5, 5, 5, 5, 5]);
    assert.deepEqual(b.brown, { a: 0, b: 0 });
    assert.deepEqual(b.burn, { a: 0, b: 0 });
  }
});

test('anillos radiales tienen masas proporcionales a volumen y centro en la quinta capa', () => {
  for (const kind of ['chorizo', 'morcilla'] as const) {
    const meat = new MeatModel(kind);
    for (const [i, fraction] of [0.36, 0.28, 0.20, 0.12, 0.04].entries()) near(meat.layerMassKg[i], meat.definition.massKg * fraction);
    meat.layersC[2] = 40; meat.layersC[4] = 10;
    assert.equal(meat.centerC, 10);
  }
});

test('primer paso a ambiente conserva la energía absorbida en planos y cilindros', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind);
    meat.layersC.fill(25);
    meat.onGrill = true;
    const before = storedEnergy(meat);
    meat.update(0.25, 5000);
    near(storedEnergy(meat) - before, 5000 * meat.dimensions.areaM2 * meat.definition.absorptivity * 0.25);
    assert.ok(meat.layersC[0] > 25);
    assert.ok(meat.layersC.slice(1).every(t => t === 25));
  }
});

test('la conducción conserva energía interna, descontando solo la convección exterior', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind);
    meat.layersC.splice(0, 5, 50, 40, 30, 25, 25);
    const before = storedEnergy(meat), d = meat.definition;
    const r = d.thicknessM / 2;
    const convArea = d.geometry === 'flat' ? meat.dimensions.areaM2 * 0.35
      : (2 * Math.PI * r * meat.dimensions.widthM + 2 * Math.PI * r * r) * 0.675;
    meat.update(0.25, 0);
    near(storedEnergy(meat) - before, -CONFIG.meatSurfaceConvectionWm2K * convArea * 25 * 0.25);
    assert.ok(meat.layersC[2] > 30, 'el centro recibe más calor del que cede a la siguiente capa');
  }
});

test('el vacío más grueso demora más en calentar su centro que el matambre', () => {
  const flat = new MeatModel('matambre'), thick = new MeatModel('vacio');
  heat(flat, 5000, 600); heat(thick, 5000, 600);
  assert.ok(flat.centerC > thick.centerC + 5);
  assert.ok(thick.layersC[0] > thick.centerC);
});

test('el calor avanza de la envoltura al centro y los anillos permanecen estables', () => {
  for (const kind of ['chorizo', 'morcilla'] as const) {
    const meat = new MeatModel(kind);
    heat(meat, 6000, 600);
    assert.ok(meat.layersC[0] > meat.centerC);
    assert.ok(meat.centerC > 5);
    assert.ok(meat.layersC.every(t => Number.isFinite(t) && t > 5 && t < 250));
  }
});

test('los rangos recomendados no bloquean ni recortan el aporte de calor', () => {
  for (const kind of MEAT_KINDS) {
    const low = new MeatModel(kind), high = new MeatModel(kind);
    low.layersC.fill(25); high.layersC.fill(25);
    heat(low, 1000, 1); heat(high, 12000, 1);
    assert.ok(low.layersC[0] > 25);
    assert.ok(high.layersC[0] > low.layersC[0]);
  }
});

test('girar y rodar conservan temperaturas, tiempo, jugosidad, dorado y quemado', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind);
    heat(meat, 10000, 300);
    const before = thermalState(meat) as Record<string, unknown>;
    const oldFace = meat.faceDown;
    meat.flip();
    assert.notEqual(meat.faceDown, oldFace);
    assert.deepEqual({ ...thermalState(meat), face: oldFace }, before);
    const previousBrown = meat.brown[oldFace], other = meat.faceDown;
    heat(meat, 10000, 30);
    assert.equal(meat.brown[oldFace], previousBrown);
    assert.ok(meat.brown[other] > 0);
  }
});

test('chorizo exige 71 °C de centro y la morcilla no inventa un objetivo de recalentamiento', () => {
  const chorizo = new MeatModel('chorizo');
  chorizo.brown.a = chorizo.brown.b = 40;
  chorizo.layersC.fill(70);
  assert.equal(chorizo.objectiveAchieved, false);
  chorizo.layersC[4] = 71;
  assert.equal(chorizo.objectiveAchieved, true);
  const morcilla = new MeatModel('morcilla');
  assert.equal(morcilla.state, 'precooked');
  heat(morcilla, 4000, 300);
  assert.equal(morcilla.state, 'reheating');
  morcilla.location = 'carried';
  assert.equal(morcilla.state, 'reheating', 'transportar no borra su historial de calentamiento');
  morcilla.layersC.fill(74); morcilla.brown.a = morcilla.brown.b = 40;
  assert.equal(morcilla.objectiveAchieved, false);
});

test('la envoltura de morcilla se deteriora por exceso de calor y no se repara al rodar', () => {
  const meat = new MeatModel('morcilla');
  heat(meat, 11000, 120);
  assert.ok(meat.casingDamage.a > 0);
  assert.equal(meat.casingDamage.b, 0);
  const before = meat.casingDamage.a;
  meat.flip(); heat(meat, 11000, 30);
  assert.equal(meat.casingDamage.a, before);
  assert.ok(meat.casingDamage.b > 0);
});

test('huella rectangular pondera exactamente el área intersectada en cada sector', () => {
  const meat = new MeatModel('costilla');
  meat.positionM = { x: 0.3, z: 0.225 };
  const coverage = footprintCoverage(meat), w = meat.dimensions.widthM, d = meat.dimensions.depthM;
  const polygon = meatFootprint(meat);
  near(polygonArea(polygon), meat.dimensions.areaM2);
  near(coverage.reduce((sum, cell) => sum + cell.weight, 0), 1);
  for (const cell of coverage) {
    const x = cell.index % 6 * 0.15, z = Math.floor(cell.index / 6) * 0.15;
    const overlapX = Math.max(0, Math.min(x + 0.15, 0.3 + w / 2) - Math.max(x, 0.3 - w / 2));
    const overlapZ = Math.max(0, Math.min(z + 0.15, 0.225 + d / 2) - Math.max(z, 0.225 - d / 2));
    near(cell.areaM2, overlapX * overlapZ);
    near(cell.weight, overlapX * overlapZ / (w * d));
  }
});

test('huellas irregulares y rotadas cubren su área real, sin crear superficie térmica', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind);
    for (let turns = 0; turns < 4; turns++) {
      meat.quarterTurns = turns;
      near(polygonArea(meatFootprint(meat)), meat.dimensions.areaM2);
      near(footprintCoverage(meat).reduce((sum, cell) => sum + cell.areaM2, 0), meat.dimensions.areaM2);
    }
  }
});

test('la exposición suma sectores cubiertos, incluidos los que no son el central', () => {
  const world = new SimulationWorld();
  const meat = world.addMeat('costilla'); meat.onGrill = true;
  meat.positionM = { x: 0.3, z: 0.225 };
  const coverage = footprintCoverage(meat);
  const sideCell = coverage.find(c => c.index === 6);
  assert.ok(sideCell);
  world.grill.fluxWm2.fill(0); world.grill.fluxWm2[6] = 8000;
  near(world.meatFluxWm2(meat), 8000 * sideCell.weight);
  assert.ok(world.meatFluxWm2(meat) > 0);
  meat.quarterTurns = 1;
  near(world.meatFluxWm2(meat), 0); // El contorno girado ya no cubre el sector lateral 6.
});

test('dos vacíos mantienen estados distintos y siguen calentándose sin intervención de cámara', () => {
  const world = new SimulationWorld();
  const a = world.addMeat('vacio'), b = world.addMeat('vacio');
  assert.ok(world.takeMeat(a.id)); assert.ok(world.placeMeat(0));
  assert.ok(world.takeMeat(b.id)); assert.ok(world.placeMeat(23));
  world.grill.put(0, newEmber(50)); world.grill.put(1, newEmber(50));
  for (let i = 0; i < 1200; i++) world.tick(0.25);
  assert.ok(a.centerC > b.centerC);
  a.brown.a = 50;
  assert.equal(b.brown.a, 0);
  assert.equal(a.totalSimSeconds, 300);
  assert.equal(b.totalSimSeconds, 300);
});

test('recoger, orientar, depositar y devolver no reinician el estado de una pieza', () => {
  const world = new SimulationWorld();
  const meat = world.addMeat('chorizo'); heat(meat, 7000, 300); meat.flip();
  const before = thermalState(meat);
  assert.ok(world.takeMeat(meat.id)); assert.ok(world.rotateMeat(meat.id));
  assert.ok(world.placeMeat(7)); assert.deepEqual(thermalState(meat), before);
  assert.ok(world.takeMeat(meat.id)); assert.ok(world.returnMeatToBoard());
  assert.equal(meat.location, 'board'); assert.equal(world.carriedMeatId, null);
  assert.deepEqual(thermalState(meat), before);
});

test('ocupación, bordes y depósitos inválidos conservan la carne en la pinza si no cabe', () => {
  const world = new SimulationWorld();
  const a = world.addMeat('vacio'), b = world.addMeat('vacio');
  assert.ok(world.takeMeat(a.id)); assert.ok(world.placeMeat(0));
  assert.ok(world.takeMeat(b.id));
  const before = thermalState(b);
  for (const sector of [0, -1, 24, NaN]) {
    assert.equal(world.placeMeat(sector), false);
    assert.equal(world.carriedMeatId, b.id); assert.equal(b.location, 'carried');
    assert.deepEqual(thermalState(b), before);
  }
  assert.equal(world.takeMeat(a.id), false);
  assert.ok(world.placeMeat(23));
  for (const meat of [a, b]) assert.ok(meatFootprint(meat).every(p => p.x >= -1e-10 && p.x <= 0.9 + 1e-10 && p.z >= -1e-10 && p.z <= 0.6 + 1e-10));
});

test('un giro rechazado por bordes no altera orientación ni propiedades térmicas', () => {
  const world = new SimulationWorld(), meat = world.addMeat('costilla');
  assert.ok(world.takeMeat(meat.id)); assert.ok(world.placeMeat(0));
  const before = thermalState(meat);
  assert.equal(world.rotateMeat(meat.id), false);
  assert.equal(meat.quarterTurns, 0);
  assert.deepEqual(thermalState(meat), before);
});

test('cortes simultáneos no absorben más energía que la disponible en su superficie cubierta', () => {
  const world = new SimulationWorld();
  const a = world.addMeat('vacio'), b = world.addMeat('chorizo');
  world.takeMeat(a.id); assert.ok(world.placeMeat(0));
  world.takeMeat(b.id); assert.ok(world.placeMeat(23));
  for (let i = 0; i < 24; i++) world.grill.put(i, newEmber(50));
  for (const meat of [a, b]) meat.layersC.fill(25);
  const before = storedEnergy(a) + storedEnergy(b);
  world.tick(0.25);
  const receivedJ = world.grill.fluxWm2.reduce((sum, flux) => sum + flux * 0.0225 * 0.25, 0);
  const absorbedJ = storedEnergy(a) + storedEnergy(b) - before;
  assert.ok(absorbedJ > 0 && absorbedJ < receivedJ);
  near(absorbedJ, [a, b].reduce((sum, meat) => sum + world.meatFluxWm2(meat) * meat.dimensions.areaM2 * meat.definition.absorptivity * 0.25, 0));
});

test('geometrías tienen volumen, selección por identidad y representación sin mutar la simulación', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind), view = createMeatVisual(meat, 2.6 / 0.9, 2 / 0.6);
    const before = JSON.stringify(meat);
    view.update();
    view.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(view.group), size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.x > 0 && size.y > 0 && size.z > 0);
    assert.ok(view.pickMeshes.every(mesh => mesh.userData.meatId === meat.id));
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
    assert.equal(ray.intersectObjects(view.pickMeshes, false)[0]?.object.userData.meatId, meat.id);
    assert.equal(JSON.stringify(meat), before);
    const p = boardPosition(MEAT_KINDS.indexOf(kind));
    assert.ok(p.x - size.x / 2 >= PREP_TABLE_BOUNDS.x0 && p.x + size.x / 2 <= PREP_TABLE_BOUNDS.x1);
    assert.ok(p.z - size.z / 2 >= PREP_TABLE_BOUNDS.z0 && p.z + size.z / 2 <= PREP_TABLE_BOUNDS.z1);
  }
});

test('las siete piezas de la mesa pueden seleccionarse desde el frente a distancia de interacción', () => {
  const world = new SimulationWorld();
  for (const kind of MEAT_KINDS.slice(1)) world.addMeat(kind);
  world.addMeat('vacio');
  const scene = new THREE.Scene();
  const meshes: THREE.Mesh[] = [];
  for (const meat of world.meats) {
    const view = createMeatVisual(meat, 2.6 / 0.9, 2 / 0.6);
    view.update(); view.group.position.copy(boardPosition(meat.boardSlot)); scene.add(view.group);
    meshes.push(...view.pickMeshes);
  }
  scene.updateMatrixWorld(true);
  for (const meat of world.meats) {
    const p = boardPosition(meat.boardSlot), origin = new THREE.Vector3(p.x, 1.68, PREP_TABLE_BOUNDS.z1 + 0.4);
    const target = p.clone().add(new THREE.Vector3(0, meat.definition.thicknessM * 1.5, 0));
    const ray = new THREE.Raycaster(origin, target.sub(origin).normalize(), 0, 3.4);
    assert.equal(ray.intersectObjects(meshes, false)[0]?.object.userData.meatId, meat.id, meat.definition.name);
  }
});

test('al dar vuelta una pieza irregular la huella coincide con su contorno reflejado', () => {
  const meat = new MeatModel('matambre');
  const before = meatFootprint(meat);
  meat.flip();
  const after = meatFootprint(meat);
  for (const p of before) assert.ok(after.some(q => Math.abs(q.x - p.x) < 1e-10 && Math.abs(q.z - (2 * meat.positionM.z - p.z)) < 1e-10));
  near(footprintCoverage(meat).reduce((sum, c) => sum + c.weight, 0), 1);
  const world = new SimulationWorld();
  const a = world.addMeat('vacio'), b = world.addMeat('vacio');
  world.takeMeat(a.id); assert.ok(world.placeMeat(0)); assert.ok(world.flipMeat(a.id));
  world.takeMeat(b.id);
  assert.equal(world.placeMeat(0), false, 'la cara invertida también bloquea superposiciones');
});
