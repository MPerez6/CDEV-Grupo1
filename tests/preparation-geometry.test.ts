import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMeatViews } from '../src/art/meat-views.ts';
import { createMeatVisual } from '../src/art/meat-visual.ts';
import { CLIENT_SEATS, DOOR_SPAWN, RESTAURANT_TABLES, routeFromSeat, routeToSeat } from '../src/ai/client-brain.ts';
import { PERGOLA_POST_BOUNDS } from '../src/level/layout.ts';
import { SimulationWorld } from '../src/sim/world.ts';
import { MeatModel } from '../src/sim/meat.ts';
import { MEAT_KINDS } from '../src/sim/meatCatalog.ts';
import { halveMeat } from '../src/sim/meatPortions.ts';
import { footprintCoverage } from '../src/sim/meatFootprint.ts';

test('los ocho recorridos de ida y vuelta dan espacio al cuerpo, al mantel y a las demás sillas', () => {
  for (const seat of CLIENT_SEATS) {
    for (const route of [[DOOR_SPAWN, ...routeToSeat(seat.index)], [seat.chairPos, ...routeFromSeat(seat.index)]]) {
      for (let i = 1; i < route.length; i++) {
        const a = route[i-1], b = route[i];
        for (let n = 0; n <= 80; n++) {
          const x = a.x + (b.x - a.x) * n/80, z = a.z + (b.z - a.z) * n/80;
          const gap = (cx: number, cz: number, w: number, d: number) =>
            Math.hypot(Math.max(0, Math.abs(x-cx)-w/2), Math.max(0, Math.abs(z-cz)-d/2));
          for (const table of RESTAURANT_TABLES) assert.ok(gap(table.x,table.z,1,.94) >= .21);
          for (const other of CLIENT_SEATS) if (other.index !== seat.index) assert.ok(gap(other.chairPos.x,other.chairPos.z,.44,.44) >= .21);
          for (const post of PERGOLA_POST_BOUNDS) assert.ok(gap((post.x0+post.x1)/2,(post.z0+post.z1)/2,
            post.x1-post.x0,post.z1-post.z0) >= .21);
        }
      }
    }
  }
});

test('dos pasadas oblicuas conservan la masa, las cinco capas, la superficie y la identidad de cada porción', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind);
    const { widthM: w, depthM: d } = meat.dimensions;
    meat.layersC.splice(0,5,80,75,68,60,56); meat.faceDown = 'b';
    const first = halveMeat(meat, { from:{x:-.27*w,z:-d}, to:{x:-.07*w,z:d} })!;
    assert.ok(first[0].definition.massKg < first[1].definition.massKg);
    const next = halveMeat(first[1],{ from:{x:0,z:-.28*d}, to:{x:w,z:.36*d} })!;
    const all = [first[0], ...next];
    const sum = (fn: (m: MeatModel) => number) => all.reduce((s,p) => s + fn(p), 0);
    assert.ok(Math.abs(sum(p=>p.definition.massKg) - meat.definition.massKg) < 1e-9);
    assert.ok(Math.abs(sum(p=>p.dimensions.areaM2) - meat.dimensions.areaM2) < 1e-9);
    for (let i=0; i<5; i++) assert.ok(Math.abs(sum(p=>p.layerMassKg[i]*p.layersC[i]) - meat.layerMassKg[i]*meat.layersC[i]) < 1e-8);
    for (const part of all) {
      assert.equal(part.portion?.sourceId,meat.id); assert.equal(part.faceDown,'b');
      const center = part.portion!.centerM;
      assert.ok(Math.abs(footprintCoverage(part).reduce((s,c)=>s+c.weight,0) - 1) < 1e-8);
      const view = createMeatVisual(part,1,1);
      assert.ok(view.pickMeshes.length > 0);
      for (const mesh of view.pickMeshes) {
        mesh.updateMatrix();
        const attr = mesh.geometry.attributes.position;
        for (let i=0; i<attr.count; i+=3) {
          const v = new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrix);
          for (const plane of part.portion!.cuts) assert.ok((v.x+center.x-plane.point.x)*plane.normal.x +
            (center.z-v.z-plane.point.z)*plane.normal.z > -1e-6, kind);
        }
      }
    }
    assert.equal(halveMeat(meat,{from:{x:w,z:d},to:{x:w*2,z:2*d}}),null);
  }
});

test('la evaporación en porciones de vacío responde al calor que recibe su superficie', () => {
  const whole = new MeatModel('vacio');
  const stroke = { from: { x: -.04, z: -1 }, to: { x: -.04, z: 1 } };
  const parts = halveMeat(whole, stroke)!;
  for (const meat of [whole, ...parts]) {
    meat.layersC.fill(92);
    meat.onGrill = true;
    for (let i = 0; i < 240; i++) meat.update(.25, 3500);
  }
  assert.ok(whole.juiciness < 100);
  for (const part of parts) {
    part.layersC.forEach((temperature, i) => assert.ok(Math.abs(temperature - whole.layersC[i]) < 1e-8));
    assert.ok(Math.abs(part.juiciness - whole.juiciness) < 1e-8);
  }
});

test('los cristales caen en el lugar salado, se asientan, y el cuchillo los reparte sin duplicarlos', () => {
  const world = new SimulationWorld(), meat = world.meat;
  const views = createMeatViews(new THREE.Scene(),new THREE.Camera(),[]);
  views.update(world,0);
  assert.ok(world.seasonMeat('salt',meat.id,{x:-.07,z:0}));
  assert.ok(world.seasonMeat('salt',meat.id,{x:-.10,z:.01}));
  assert.ok(meat.grains.length >= 15);
  assert.ok(meat.grains.every(g=>g.point.x < -.05 && Math.abs(g.point.z) < .026 && g.face==='b'));
  views.update(world,1);
  const crystals = views.views.get(meat.id)!.group.getObjectByName('condimento-salt') as THREE.InstancedMesh;
  assert.ok(crystals.isInstancedMesh && crystals.count > 0);
  const matrix = new THREE.Matrix4();
  crystals.getMatrixAt(0,matrix); const falling = matrix.elements[13];
  views.update(world,1.4); crystals.getMatrixAt(0,matrix);
  const landed = matrix.elements[13]; assert.ok(falling-landed >= .05);
  views.update(world,3); crystals.getMatrixAt(0,matrix); assert.equal(matrix.elements[13],landed);
  assert.ok(world.cutMeatOnBoard(meat.id,{from:{x:0,z:-1},to:{x:0,z:1}}));
  const salted = world.meats.find(m=>m.seasonings.includes('salt'))!;
  assert.ok(salted.portion!.centerM.x < 0); assert.equal(salted.grains.length,meat.grains.length);
  assert.equal(world.meats.find(m=>m!==salted)!.grains.length,0);
  views.update(world,4); assert.ok(world.takeMeat(salted.id)); views.update(world,5);
  assert.equal(views.views.get(salted.id)!.group.getObjectByName('condimento-salt')?.type,'Mesh');
});
