import test from 'node:test';
import assert from 'node:assert/strict';
import { MeatModel } from '../src/sim/meat.ts';
import { MEAT_KINDS } from '../src/sim/meatCatalog.ts';
import { halveMeat } from '../src/sim/meatPortions.ts';
import { footprintCoverage, meatFootprint, polygonOverlapArea } from '../src/sim/meatFootprint.ts';

const near = (actual: number, expected: number, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test('cortar cualquiera de los seis tipos conserva masa, área y energía de las cinco capas', () => {
  for (const kind of MEAT_KINDS) {
    const whole = new MeatModel(kind);
    whole.layersC.splice(0, 5, 90, 71, 62, 51, 45);
    whole.brown.a = 43;
    whole.burn.b = 4;
    whole.juiciness = 68;
    whole.seasonings.push('chimichurri');
    whole.flip();
    const halves = halveMeat(whole)!;
    near(halves[0].definition.massKg + halves[1].definition.massKg, whole.definition.massKg);
    near(halves[0].dimensions.areaM2 + halves[1].dimensions.areaM2, whole.dimensions.areaM2);
    const energy = (m: MeatModel) => m.layersC.reduce((sum, t, i) => sum + t * m.layerMassKg[i] * m.definition.specificHeatJKgK, 0);
    near(halves.reduce((sum, half) => sum + energy(half), 0), energy(whole), 1e-5);
    for (const half of halves) {
      assert.equal(half.definition.thicknessM, whole.definition.thicknessM);
      assert.deepEqual(half.layersC, whole.layersC);
      assert.deepEqual(half.brown, whole.brown);
      assert.deepEqual(half.burn, whole.burn);
      assert.equal(half.faceDown, whole.faceDown);
      near(footprintCoverage(half).reduce((sum, cell) => sum + cell.weight, 0), 1);
      assert.equal(halveMeat(half), null);
    }
    const originalPlacement = (half: MeatModel) => {
      const center = half.portion!.centerM;
      return meatFootprint(half, { x: center.x, z: -center.z }, 0);
    };
    near(polygonOverlapArea(originalPlacement(halves[0]), originalPlacement(halves[1])), 0);
    halves[0].layersC[2] += 5;
    halves[0].seasonings.push('salt');
    assert.equal(halves[1].layersC[2], whole.layersC[2]);
    assert.deepEqual(halves[1].seasonings, ['chimichurri']);
  }
});
