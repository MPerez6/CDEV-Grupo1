import test from 'node:test';
import assert from 'node:assert/strict';
import { MeatModel } from '../src/sim/meat.ts';
import { polygonArea } from '../src/sim/meatCatalog.ts';
import { polygonOverlapArea, triangulatePolygon } from '../src/sim/meatFootprint.ts';
import { createMatambreGeometry } from '../src/art/matambre-visual.ts';

test('los recortes cóncavos no reciben calor ni bloquean piezas dentro del hueco', () => {
  const lShape = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 1 }, { x: 1, z: 1 }, { x: 1, z: 2 }, { x: 0, z: 2 }];
  const hull = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }, { x: 0, z: 2 }];
  const hole = [{ x: 1.2, z: 1.2 }, { x: 1.8, z: 1.2 }, { x: 1.8, z: 1.8 }, { x: 1.2, z: 1.8 }];
  assert.equal(triangulatePolygon(lShape).reduce((sum, triangle) => sum + polygonArea(triangle), 0), 3);
  assert.equal(polygonOverlapArea(lShape, hull), 3);
  assert.equal(polygonOverlapArea(lShape, hole), 0);
  assert.equal(polygonOverlapArea(hole, lShape), 0);
});

test('el matambre detallado es un volumen cerrado, con UV válidas y área proyectada coherente', () => {
  const meat = new MeatModel('matambre'), geometry = createMatambreGeometry(meat);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), indices = geometry.getIndex()!;
  assert.equal(meat.definition.massKg, 1.5);
  assert.equal(meat.definition.thicknessM, 0.015);
  assert.equal(meat.layersC.length, 5);
  const edges = new Map<string, number>();
  for (let i = 0; i < indices.count; i += 3) {
    const triangle = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'cada arista pertenece a dos caras');
  for (let i = 0; i < position.count; i++) {
    assert.ok(position.getY(i) >= 0 && position.getY(i) <= meat.definition.thicknessM);
    assert.ok(uv.getX(i) >= -1e-6 && uv.getX(i) <= 1 + 1e-6 && uv.getY(i) >= -1e-6 && uv.getY(i) <= 1 + 1e-6);
  }
  const top = geometry.groups.find(group => group.materialIndex === 1)!;
  let projectedArea = 0;
  for (let i = top.start; i < top.start + top.count; i += 3) {
    projectedArea += polygonArea([0, 1, 2].map(offset => {
      const vertex = indices.getX(i + offset);
      return { x: position.getX(vertex), z: position.getZ(vertex) };
    }));
  }
  assert.ok(Math.abs(projectedArea - meat.dimensions.areaM2) < 1e-8);
  geometry.dispose();
});
