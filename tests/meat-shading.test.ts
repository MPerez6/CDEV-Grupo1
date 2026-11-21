import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MeatModel } from '../src/sim/meat.ts';
import { MEAT_KINDS } from '../src/sim/meatCatalog.ts';
import { createMeatVisual } from '../src/art/meat-visual.ts';
import { createMeatSurfaceGeometry } from '../src/art/meat-surface-geometry.ts';
import { casingSplit } from '../src/art/sausage-casing.ts';
import { boneHeat } from '../src/art/costilla-bone.ts';
import {
  CHORIZO_RAMP, FAT_RAMP, GrillMarkTracker, MAILLARD_RAMP, MORCILLA_RAMP, charThreshold, cookWithDepth,
  environmentTexel, grillMarkAmount, grillMarkDarkness, hexToLinear, luminance, meatEnvironment, rampGlsl, sampleRamp,
} from '../src/art/meat-shading.ts';

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('las rampas interpolan por tramos en espacio lineal y respetan sus extremos', () => {
  for (const ramp of [MAILLARD_RAMP, FAT_RAMP, CHORIZO_RAMP, MORCILLA_RAMP]) {
    assert.deepEqual(sampleRamp(ramp, -1), hexToLinear(ramp[0][1]));
    assert.deepEqual(sampleRamp(ramp, 2), hexToLinear(ramp[ramp.length - 1][1]));
    const [t0, c0] = ramp[0], [t1, c1] = ramp[1], mid = sampleRamp(ramp, (t0 + t1) / 2);
    const a = hexToLinear(c0), b = hexToLinear(c1);
    mid.forEach((channel, i) => assert.ok(close(channel, (a[i] + b[i]) / 2)));
  }
  assert.deepEqual(hexToLinear(0xffffff), [1, 1, 1]);
  assert.deepEqual(hexToLinear(0x000000), [0, 0, 0]);
});

test('la costra de Maillard se oscurece desde el dorado hacia la caoba y nunca se vuelve amarilla', () => {
  let previous = Infinity;
  for (let t = 0.4; t <= 1.0001; t += 0.05) {
    const color = sampleRamp(MAILLARD_RAMP, t), lum = luminance(color);
    assert.ok(lum <= previous + 1e-9, `luminancia creciente en t=${t.toFixed(2)}`);
    previous = lum;
    assert.ok(color[0] > color[1] && color[1] > color[2], 'rojizo: R > G > B');
    assert.ok(color[1] / color[0] < 0.55, 'sin tono amarillo cartón');
  }
  assert.ok(luminance(sampleRamp(MORCILLA_RAMP, 1)) < luminance(sampleRamp(CHORIZO_RAMP, 1)) * 1.5);
  assert.ok(luminance(sampleRamp(MORCILLA_RAMP, 0.8)) < 0.03, 'la morcilla asada queda casi negra');
});

test('rampGlsl genera una función GLSL con un mix por tramo', () => {
  const glsl = rampGlsl('rampaPrueba', MAILLARD_RAMP);
  assert.match(glsl, /^vec3 rampaPrueba\(float t\) \{/);
  assert.equal(glsl.match(/c = mix\(/g)?.length, MAILLARD_RAMP.length - 1);
  assert.ok(!/NaN|Infinity/.test(glsl));
});

test('las marcas de parrilla crecen con el dorado y se oscurecen con el quemado', () => {
  assert.equal(grillMarkAmount(0), 0);
  assert.equal(grillMarkAmount(100), 1);
  let last = -1;
  for (let brown = 0; brown <= 60; brown += 5) {
    const amount = grillMarkAmount(brown);
    assert.ok(amount >= last); last = amount;
  }
  assert.equal(grillMarkDarkness(0), 0);
  assert.equal(grillMarkDarkness(200), 1);
  assert.ok(grillMarkDarkness(30) > grillMarkDarkness(10));
});

test('el carbonizado solo aparece con quemado y cubre más a medida que sube', () => {
  assert.ok(charThreshold(0) > 1.5, 'sin quemado no hay manchas');
  assert.ok(charThreshold(30) > charThreshold(60));
  assert.ok(charThreshold(60) > charThreshold(100));
  assert.ok(charThreshold(100) < 0.1, 'quemado total: casi todo carbón');
});

test('cookWithDepth sigue profundizando la costra después del dorado justo', () => {
  assert.equal(cookWithDepth(0.5, 20), 0.5);
  assert.equal(cookWithDepth(2, 40), 1);
  assert.ok(cookWithDepth(1, 75) > cookWithDepth(1, 50));
  assert.ok(close(cookWithDepth(1, 200), 1.7));
});

test('GrillMarkTracker separa las marcas por cara y por orientación (cuadriculado con Q)', () => {
  const tracker = new GrillMarkTracker();
  tracker.update({ a: 30, b: 0 }, 0);
  assert.equal(tracker.marks('a')[1], 0);
  assert.ok(tracker.marks('a')[0] > 0.3);
  assert.deepEqual(tracker.marks('b'), [0, 0], 'la cara de arriba no se marca');
  tracker.update({ a: 60, b: 0 }, 1);
  const [along, across] = tracker.marks('a');
  assert.ok(close(along, grillMarkAmount(30)) && close(across, grillMarkAmount(30)));
  tracker.update({ a: 70, b: 0 }, -1);
  assert.ok(close(tracker.marks('a')[1], grillMarkAmount(40)), 'cuartos negativos cuentan como impares');
  tracker.update({ a: 0, b: 0 }, 0);
  assert.deepEqual(tracker.marks('a'), [0, 0], 'reiniciar la pieza borra las marcas');
});

test('la tripa solo se parte con daño alto', () => {
  assert.equal(casingSplit(0), 0);
  assert.equal(casingSplit(35), 0);
  assert.equal(casingSplit(85), 1);
  assert.ok(casingSplit(60) > 0 && casingSplit(60) < 1);
});

test('el hueso de la costilla toma su cocción del promedio de caras y no del quemado', () => {
  const meat = new MeatModel('costilla');
  assert.deepEqual(boneHeat(meat), { cook: 0, burn: 0 });
  meat.brown.a = 90; meat.brown.b = 90; meat.burn.b = 50;
  assert.deepEqual(boneHeat(meat), { cook: 1, burn: 0.5 });
});

test('el entorno reflejado es tenue abajo, más claro arriba y se comparte', () => {
  for (const [u, v] of [[0, 0], [0.25, 0.74], [0.5, 0.5], [0.9, 1]]) {
    for (const channel of environmentTexel(u, v)) assert.ok(channel >= 0 && channel <= 1);
  }
  assert.ok(luminance(environmentTexel(0.0, 0.05)) < luminance(environmentTexel(0.0, 0.7)));
  assert.ok(luminance(environmentTexel(0.25, 0.74)) > 0.6, 'ventana que da el brillo húmedo');
  const env = meatEnvironment();
  assert.equal(env, meatEnvironment());
  assert.equal(env.mapping, THREE.EquirectangularReflectionMapping);
});

test('la geometría plana trae el peso de borde para oscurecer el contorno', () => {
  const geometry = createMeatSurfaceGeometry(new MeatModel('falda'));
  const edge = geometry.getAttribute('meatEdge'), position = geometry.getAttribute('position');
  assert.equal(edge.count, position.count);
  const values = Array.from(edge.array as Float32Array);
  assert.ok(values.every(v => v >= 0 && v <= 1));
  assert.equal(Math.min(...values), 0, 'el contorno vale 0');
  assert.equal(Math.max(...values), 1, 'el centro vale 1');
  geometry.dispose();
});

test('todos los cortes inyectan el sombreado común sin perder los includes de three', () => {
  for (const kind of MEAT_KINDS) {
    const meat = new MeatModel(kind), view = createMeatVisual(meat, 3, 3);
    meat.brown.a = 50; meat.burn.a = 40; meat.casingDamage.a = 90;
    view.update();
    const materials = new Set<THREE.Material>();
    view.group.traverse(object => {
      if (object instanceof THREE.Mesh) for (const m of [object.material].flat()) materials.add(m);
    });
    let injected = 0;
    for (const material of materials) {
      if (!(material instanceof THREE.MeshPhysicalMaterial) || !material.onBeforeCompile.toString().includes('injectMeatCommon')) continue;
      const shader = {
        uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader,
      } as unknown as THREE.WebGLProgramParametersWithUniforms;
      material.onBeforeCompile(shader, undefined as unknown as THREE.WebGLRenderer);
      assert.ok(!shader.fragmentShader.includes('#include <map_fragment>') || !material.map, `${kind}: map_fragment reemplazado`);
      assert.match(shader.fragmentShader, /float mtChar = 0\.0;/);
      assert.match(shader.fragmentShader, /material\.clearcoat = clamp\(material\.clearcoat \* mtCoat/);
      assert.match(shader.vertexShader, /vMtLocal = position;/);
      assert.ok(material.envMap, `${kind}: ${material.name} refleja el entorno`);
      injected++;
    }
    assert.ok(injected > 0, `${kind} usa el sombreado común`);
  }
});
