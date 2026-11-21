import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import {
  GrillMarkTracker, applyMarks, cookWithDepth, createMeatUniforms, grillMarkDarkness, injectMeatCommon,
  withMeatEnvironment,
} from './meat-shading.ts';

/** Ritmo de dorado propio de cada embutido (temperaturas en °C, dorado 0..100). */
export type SausageHeat = {
  surfaceStartC: number; surfaceRangeC: number; downRate: number; upRate: number;
  thermalStartC: number; thermalRangeC: number; brownFull: number; downWeight: number; upWeight: number;
};

export type SausageLook = {
  name: string; cacheKey: string; lengthM: number; thicknessM: number;
  /** GLSL que declara `vec3 rawRgb`, `vec3 cookedRgb` y `float fatSpeck` a partir de `vMapUv`. */
  sampleGlsl: string;
  /** Nombre de la rampa GLSL de la tripa (ver meat-shading.ts). */
  ramp: 'mtChorizoRamp' | 'mtMorcillaRamp';
  /** Relleno expuesto cuando la tripa se parte (sRGB). */
  fillingRaw: number; fillingCooked: number;
  /** Brillo: la tripa del chorizo queda lustrosa; la de la morcilla, opaca. */
  roughness: number; cookedRoughness: number; clearcoat: number; cookedGloss: number;
  /** Cuánto detalle de la foto asada se conserva sobre la rampa (0..1). */
  photoDetail: number;
  heat: SausageHeat;
};

export type SausageCasing = { material: THREE.MeshPhysicalMaterial; update: (meat: MeatModel) => void };

/** Apertura de la tripa (0..1) según su daño (0..100): no se parte por debajo de ~35. */
export function casingSplit(damage: number): number {
  return THREE.MathUtils.smoothstep(damage, 35, 85);
}

const linear = (hex: number): string => `vec3(${new THREE.Color(hex).toArray().map(c => c.toFixed(4)).join(', ')})`;

function casingGlsl(look: SausageLook): string {
  const circumference = (Math.PI * look.thicknessM).toFixed(5);
  return `
      ${look.sampleGlsl}
      vec2 caseUv = vMapUv;
      // Cara A abajo (v ≈ 0.75) y cara B arriba (v ≈ 0.25) al empezar
      float aroundSin = sin(caseUv.y * 6.2831853);
      float sideBlend = smoothstep(-0.28, 0.28, aroundSin);
      float localCook = mix(sauCookA, sauCookB, sideBlend);
      float localBurn = mix(sauBurnA, sauBurnB, sideBlend);
      float localSplit = mix(sauSplitA, sauSplitB, sideBlend);
      vec2 skinP = vec2(vMtLocal.x, caseUv.y * ${circumference});

      // Ampollas: la tripa se infla y se tuesta en manchas más oscuras y brillantes
      float blisterN = mtNoise(skinP * vec2(160.0, 190.0)) * 0.7 + mtNoise(skinP * 520.0) * 0.3;
      float blister = smoothstep(0.62, 0.80, blisterN) * smoothstep(0.35, 1.0, localCook);
      float L = dot(cookedRgb, vec3(0.2126, 0.7152, 0.0722));
      float tone = clamp(0.22 + localCook * 0.34 + (0.14 - L) * 0.9 + blister * 0.28, 0.0, 1.0);
      vec3 roast = mix(${look.ramp}(tone) * clamp(0.75 + L * 3.0, 0.85, 1.5), cookedRgb, ${look.photoDetail.toFixed(3)});
      roast = mix(roast, mtFatRoast(0.55 + localCook * 0.2) * 0.8, fatSpeck * 0.35);
      float cookT = smoothstep(0.0, 1.0, localCook);
      vec3 casingCol = mix(rawRgb, mix(rawRgb, roast, 0.7), smoothstep(0.0, 0.5, cookT));
      casingCol = mix(casingCol, roast, smoothstep(0.3, 1.0, cookT));

      // Marcas de los hierros: anillos si el embutido cruza los hierros, una franja si queda paralelo
      float contactA = smoothstep(0.55, 0.92, -aroundSin), contactB = smoothstep(0.55, 0.92, aroundSin);
      float ringW = ${(0.0055).toFixed(5)} * (0.8 + 0.4 * mtNoise(skinP * 90.0));
      float rings = mtBar(vMtLocal.x, ringW, (mtNoise(vec2(caseUv.y * 9.0, 2.0)) - 0.5) * 0.06);
      float stripeA = 1.0 - smoothstep(ringW * 0.6, ringW, abs(caseUv.y - 0.75) * ${circumference});
      float stripeB = 1.0 - smoothstep(ringW * 0.6, ringW, abs(caseUv.y - 0.25) * ${circumference});
      float mark = max(rings * (mtMarks.x * contactA + mtMarksB.x * contactB),
        stripeA * mtMarks.y + stripeB * mtMarksB.y);
      mark *= smoothstep(0.05, 0.4, mtNoise(skinP * 120.0) * 0.7 + 0.2);
      casingCol = mtSear(casingCol, clamp(mark, 0.0, 1.0));

      // Tripa partida: grieta a lo largo que deja ver el relleno y bordes de tripa encogida y oscura.
      // Se abre a ~45° entre el lomo y el costado para que se lea desde la cámara del parrillero.
      float lengthMask = smoothstep(0.16, 0.30, caseUv.x) * (1.0 - smoothstep(0.70, 0.84, caseUv.x));
      float crackCenter = mix(0.63, 0.13, step(0.0, aroundSin)) + sin(caseUv.x * 23.0) * 0.012
        + (mtNoise(vec2(caseUv.x * 40.0, 3.0)) - 0.5) * 0.02;
      float crackDist = abs(caseUv.y - crackCenter) * ${circumference};
      float crackW = localSplit * lengthMask * 0.0048 * (0.7 + 0.6 * mtNoise(vec2(caseUv.x * 18.0, 7.0)));
      float opening = 1.0 - smoothstep(crackW * 0.75, crackW, crackDist);
      float rim = (1.0 - smoothstep(crackW, crackW * 1.9 + 0.0004, crackDist)) * step(0.001, crackW) * (1.0 - opening);
      vec3 filling = mix(${linear(look.fillingRaw)}, ${linear(look.fillingCooked)}, cookT);
      // El relleno conserva la textura picada (carne y tocino) y se hunde hacia los bordes de la grieta
      vec3 fillTex = rawRgb * mix(vec3(1.0), vec3(0.78, 0.56, 0.44), cookT);
      filling = mix(filling, fillTex, 0.6) * (0.55 + 0.45 * (1.0 - smoothstep(0.0, crackW + 0.0001, crackDist)));
      casingCol = mix(casingCol, ${look.ramp}(1.0) * 0.6, rim * 0.9);
      casingCol = mix(casingCol, filling, opening);

      casingCol = mtBurnt(casingCol, skinP * 1.3, localBurn);
      mtFat = (blister * 0.5 + fatSpeck * 0.3 + cookT * 0.4) * (1.0 - mtChar) * (1.0 - opening);
      mtCoat = (0.6 + cookT * ${look.cookedGloss.toFixed(3)}) * (1.0 - mtChar) * (1.0 - opening * 0.8) * (1.0 - mark * 0.5);
      diffuseColor.rgb *= casingCol;
  `;
}

/** Tripa compartida por chorizo y morcilla: dorado por cara, ampollas, marcas, grieta y carbón. */
export function createSausageCasing(map: THREE.Texture, bump: THREE.Texture, extraUniforms: Record<string, { value: unknown }>,
  look: SausageLook): SausageCasing {
  const material = withMeatEnvironment(new THREE.MeshPhysicalMaterial({
    name: look.name, map, bumpMap: bump, bumpScale: 0.00035, color: 0xffffff, metalness: 0,
    roughness: look.roughness, clearcoat: look.clearcoat, clearcoatRoughness: 0.22, ior: 1.42, side: THREE.DoubleSide,
  }), 0.4);
  const u = {
    sauCookA: { value: 0 }, sauCookB: { value: 0 }, sauBurnA: { value: 0 }, sauBurnB: { value: 0 },
    sauSplitA: { value: 0 }, sauSplitB: { value: 0 },
  };
  const cookU = { a: u.sauCookA, b: u.sauCookB }, burnU = { a: u.sauBurnA, b: u.sauBurnB }, splitU = { a: u.sauSplitA, b: u.sauSplitB };
  const shading = createMeatUniforms(), marks = new GrillMarkTracker();
  const sideHeat: Record<Side, number> = { a: 0, b: 0 };
  let lastSimSeconds = 0;

  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u, extraUniforms);
    injectMeatCommon(shader, shading);
    shader.fragmentShader = Object.keys(u).map(name => `uniform float ${name};`).join('\n') + '\n'
      + Object.keys(extraUniforms).map(name => `uniform sampler2D ${name};`).join('\n') + '\n'
      + shader.fragmentShader
        .replace('#include <map_fragment>', casingGlsl(look))
        .replace('#include <roughnessmap_fragment>', `
          #include <roughnessmap_fragment>
          roughnessFactor *= 1.0 - mtFat * 0.45;
          roughnessFactor = mix(roughnessFactor, 0.92, max(mtChar, opening));
        `);
  };
  material.customProgramCacheKey = () => look.cacheKey;

  function trackHeat(meat: MeatModel): void {
    const h = look.heat;
    if(!meat.hasReceivedGrillHeat && meat.totalSimSeconds === 0 && meat.brown.a === 0 && meat.brown.b === 0) {
      sideHeat.a = 0; sideHeat.b = 0; lastSimSeconds = 0;
    } else if(meat.totalSimSeconds > lastSimSeconds) {
      const dt = Math.min(5, meat.totalSimSeconds - lastSimSeconds);
      lastSimSeconds = meat.totalSimSeconds;
      if(meat.onGrill) {
        const down = meat.faceDown, up: Side = down === 'a' ? 'b' : 'a';
        const rate = Math.max(0, (Math.max(meat.surfaceC[down], meat.layersC[0]) - h.surfaceStartC) / h.surfaceRangeC);
        sideHeat[down] = Math.min(1, sideHeat[down] + dt * rate * h.downRate);
        sideHeat[up] = Math.min(1, sideHeat[up] + dt * rate * h.upRate);
      }
    }
  }

  return {
    material,
    update(meat) {
      trackHeat(meat);
      const h = look.heat;
      const thermal = THREE.MathUtils.clamp((meat.layersC[0] - h.thermalStartC) / h.thermalRangeC, 0, 1);
      for(const side of ['a', 'b'] as const) {
        const brown = THREE.MathUtils.clamp(meat.brown[side] / h.brownFull, 0, 1);
        const weight = meat.faceDown === side ? h.downWeight : h.upWeight;
        cookU[side].value = cookWithDepth(Math.max(brown, sideHeat[side], thermal * weight + brown * 0.45), meat.brown[side]);
        // El daño de tripa la parte y la oscurece algo, pero no la carboniza por sí solo
        burnU[side].value = THREE.MathUtils.clamp(Math.max(meat.burn[side], meat.casingDamage[side] * 0.35) / 100, 0, 1);
        splitU[side].value = casingSplit(meat.casingDamage[side]);
      }
      marks.update(meat.brown, meat.quarterTurns);
      applyMarks(shading.mtMarks, marks, 'a');
      applyMarks(shading.mtMarksB, marks, 'b');
      shading.mtMarkDark.value = grillMarkDarkness(Math.max(meat.burn.a, meat.burn.b));
      const cook = Math.min(1, (u.sauCookA.value + u.sauCookB.value) * 0.5);
      const burn = Math.max(u.sauBurnA.value, u.sauBurnB.value);
      material.roughness = THREE.MathUtils.lerp(look.roughness, look.cookedRoughness, cook) + burn * 0.4;
      material.clearcoat = (look.clearcoat + cook * look.cookedGloss * 0.25) * (1 - burn * 0.82);
    }
  };
}
