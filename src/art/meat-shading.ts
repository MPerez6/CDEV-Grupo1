import * as THREE from 'three';
import type { Side } from '../sim/meat.ts';

/**
 * Sombreado compartido de la carne: rampas de dorado (Maillard), marcas de parrilla,
 * carbonizado en manchas, brillo de grasa y un entorno reflejado mínimo.
 * Las funciones puras se prueban en Node; los fragmentos GLSL se inyectan desde cada corte.
 */

export type Rgb = readonly [number, number, number];
export type RampStop = readonly [number, number]; // [posición 0..1, color sRGB 0xRRGGBB]

/** Superficie magra: sellado gris-rosado → dorado → marrón rojizo → caoba → costra oscura. */
export const MAILLARD_RAMP: readonly RampStop[] = [
  [0.00, 0x9a5c50], [0.18, 0x9a6a52], [0.40, 0x9c5a2c],
  [0.62, 0x7a361a], [0.82, 0x50200e], [1.00, 0x2a1109],
];
/** Grasa: marfil translúcido → ámbar → caramelo → caramelo oscuro. */
export const FAT_RAMP: readonly RampStop[] = [
  [0.00, 0xead8bc], [0.35, 0xdcaa62], [0.65, 0xb46e32], [1.00, 0x6e3614],
];
/** Tripa de chorizo: rosado crudo → anaranjado tostado → marrón rojizo brillante → ampolla oscura. */
export const CHORIZO_RAMP: readonly RampStop[] = [
  [0.00, 0xc77f72], [0.30, 0xb8603c], [0.62, 0x8c3418], [0.85, 0x5a1d0c], [1.00, 0x2c0e07],
];
/** Tripa de morcilla: bordó → bordó muy oscuro → casi negro. */
export const MORCILLA_RAMP: readonly RampStop[] = [
  [0.00, 0x4a2a33], [0.45, 0x3c1d22], [0.80, 0x2a1215], [1.00, 0x170a0a],
];

/** Separación y ancho (metros de simulación) de los hierros que marcan la carne. */
export const GRILL_BAR_SPACING_M = 0.04;
export const GRILL_BAR_WIDTH_M = 0.006;

export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function hexToLinear(hex: number): Rgb {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(c => srgbToLinear(c / 255)) as unknown as Rgb;
}

/** Interpolación lineal por tramos en espacio lineal (igual que la versión GLSL). */
export function sampleRamp(stops: readonly RampStop[], t: number): Rgb {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const last = stops[stops.length - 1];
  if(x >= last[0]) return hexToLinear(last[1]);
  const next = stops.findIndex(([at]) => at >= x);
  if(next <= 0) return hexToLinear(stops[0][1]);
  const [t0, c0] = stops[next - 1], [t1, c1] = stops[next];
  const a = hexToLinear(c0), b = hexToLinear(c1), k = (x - t0) / (t1 - t0);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function luminance([r, g, b]: Rgb): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

const glslFloat = (value: number): string => value.toFixed(5);
const glslVec3 = (hex: number): string => `vec3(${hexToLinear(hex).map(glslFloat).join(', ')})`;

/** Genera una función GLSL `vec3 name(float t)` equivalente a `sampleRamp`. */
export function rampGlsl(name: string, stops: readonly RampStop[]): string {
  const lines = [`vec3 ${name}(float t) {`, '  t = clamp(t, 0.0, 1.0);', `  vec3 c = ${glslVec3(stops[0][1])};`];
  for(let i = 1;i < stops.length;i++) {
    const t0 = stops[i - 1][0], [t1, color] = stops[i];
    lines.push(`  c = mix(c, ${glslVec3(color)}, clamp((t - ${glslFloat(t0)}) / ${glslFloat(t1 - t0)}, 0.0, 1.0));`);
  }
  lines.push('  return c;', '}');
  return lines.join('\n');
}

/** Intensidad (0..1) de las marcas de hierro según el dorado acumulado en esa orientación. */
export function grillMarkAmount(brownAccumulated: number): number {
  return THREE.MathUtils.smoothstep(brownAccumulated, 8, 52);
}

/** Cuánto se oscurecen las marcas hacia carbón según el quemado de la cara (0..100). */
export function grillMarkDarkness(burn: number): number {
  return THREE.MathUtils.clamp(burn / 55, 0, 1);
}

/** Umbral de ruido sobre el que una zona se carboniza: baja con el quemado, nunca con burn = 0. */
export function charThreshold(burn: number): number {
  return burn <= 0 ? 2 : 1.04 - THREE.MathUtils.clamp(burn / 100, 0, 1);
}

const turnChannel = (quarterTurns: number): 0 | 1 => (((quarterTurns % 2) + 2) % 2) as 0 | 1;

/**
 * Reparte el dorado nuevo de cada cara entre dos orientaciones de la pieza respecto de los hierros:
 * si el jugador la gira un cuarto de vuelta (Q), aparece el cuadriculado clásico.
 */
export class GrillMarkTracker {
  private last: Record<Side, number> = { a: 0, b: 0 };
  private accumulated: Record<Side, readonly [number, number]> = { a: [0, 0], b: [0, 0] };

  update(brown: Readonly<Record<Side, number>>, quarterTurns: number): void {
    const channel = turnChannel(quarterTurns);
    const next = { ...this.accumulated };
    for(const side of ['a', 'b'] as const) {
      const delta = brown[side] - this.last[side];
      if(delta < 0) next[side] = [0, 0]; // pieza reiniciada
      else if(delta > 0) next[side] = channel === 0
        ? [next[side][0] + delta, next[side][1]] : [next[side][0], next[side][1] + delta];
    }
    this.accumulated = next;
    this.last = { a: brown.a, b: brown.b };
  }

  /** [marcas a lo largo de Z local, marcas a lo largo de X local] para una cara. */
  marks(side: Side): readonly [number, number] {
    const [along, across] = this.accumulated[side];
    return [grillMarkAmount(along), grillMarkAmount(across)];
  }
}

export type MeatShadingUniforms = {
  mtMarks: { value: THREE.Vector2 }; mtMarksB: { value: THREE.Vector2 }; mtMarkDark: { value: number };
};

export function createMeatUniforms(): MeatShadingUniforms {
  return { mtMarks: { value: new THREE.Vector2() }, mtMarksB: { value: new THREE.Vector2() }, mtMarkDark: { value: 0 } };
}

/** Copia las marcas de una cara al uniform indicado (sin crear objetos por cuadro). */
export function applyMarks(target: { value: THREE.Vector2 }, tracker: GrillMarkTracker, side: Side): void {
  const [along, across] = tracker.marks(side);
  target.value.set(along, across);
}

/** Actualiza marcas y oscurecimiento de una cara plana con el dorado y el quemado del modelo. */
export function updateFaceMarks(uniforms: MeatShadingUniforms, tracker: GrillMarkTracker, side: Side, burn: number): void {
  applyMarks(uniforms.mtMarks, tracker, side);
  uniforms.mtMarkDark.value = grillMarkDarkness(burn);
}

/** Avance de cocción para el shader: 0..1 hasta el dorado justo y hasta +0.7 extra al pasarse (costra más profunda). */
export function cookWithDepth(baseCook: number, brown: number): number {
  return THREE.MathUtils.clamp(baseCook, 0, 1) + THREE.MathUtils.clamp((brown - 40) / 60, 0, 0.7);
}

/** Fragmento común: ruido, rampas, marcas de parrilla, carbonizado y máscaras globales. */
export const MEAT_GLSL = `
uniform vec2 mtMarks;
uniform vec2 mtMarksB;
uniform float mtMarkDark;
varying vec3 vMtLocal;
varying float vMtEdge;
float mtCoat = 1.0;
float mtFat = 0.0;
float mtChar = 0.0;
float mtHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mtNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mtHash(i), mtHash(i + vec2(1.0, 0.0)), f.x),
    mix(mtHash(i + vec2(0.0, 1.0)), mtHash(i + vec2(1.0)), f.x), f.y);
}
float mtFbm(vec2 p) { return mtNoise(p) * 0.55 + mtNoise(p * 2.13 + 3.1) * 0.30 + mtNoise(p * 4.37 + 7.7) * 0.15; }
${rampGlsl('mtMaillard', MAILLARD_RAMP)}
${rampGlsl('mtFatRoast', FAT_RAMP)}
${rampGlsl('mtChorizoRamp', CHORIZO_RAMP)}
${rampGlsl('mtMorcillaRamp', MORCILLA_RAMP)}
// Franja de un hierro: 1 en el centro del contacto, 0 entre hierros. coord en metros locales.
float mtBar(float coord, float width, float wobble) {
  float d = abs(fract(coord / ${glslFloat(GRILL_BAR_SPACING_M)} + wobble) - 0.5) * ${glslFloat(GRILL_BAR_SPACING_M)};
  return 1.0 - smoothstep(width * 0.6, width, d);
}
// Marcas de parrilla sobre una cara plana (p = xz locales). amounts.x: hierros a lo largo de Z; amounts.y: cruzadas.
float mtGrillMarks(vec2 p, vec2 amounts) {
  if (amounts.x + amounts.y < 0.002) return 0.0;
  float w = ${glslFloat(GRILL_BAR_WIDTH_M)} * (0.75 + 0.55 * mtNoise(p * 60.0));
  float along = mtBar(p.x, w, (mtNoise(vec2(p.y * 22.0, 1.7)) - 0.5) * 0.10) * amounts.x;
  float across = mtBar(p.y, w, (mtNoise(vec2(p.x * 22.0, 5.3)) - 0.5) * 0.10) * amounts.y;
  // El contacto con el hierro no es parejo: zonas más y menos selladas
  float contact = smoothstep(0.05, 0.40, mtNoise(p * 85.0 + 4.0) * 0.6 + mtNoise(p * 240.0) * 0.4 + 0.10);
  return clamp(max(along, across) * contact, 0.0, 1.0);
}
// Color sellado por el hierro: caramelo muy oscuro que tiende a carbón cuando la cara se quema.
vec3 mtSear(vec3 col, float mark) {
  vec3 seared = mix(vec3(0.050, 0.014, 0.0045), vec3(0.0035, 0.0022, 0.0018), mtMarkDark);
  seared *= 0.75 + mtNoise(vMtLocal.xz * 330.0) * 0.5;
  // halo caramelizado apenas más ancho que el hierro
  return mix(col * mix(1.0, 0.8, smoothstep(0.0, 0.3, mark)), seared, smoothstep(0.1, 0.9, mark) * 0.72);
}
// Manchas de carbón irregulares (p en metros locales); deja un halo oscurecido alrededor.
vec3 mtBurnt(vec3 col, vec2 p, float burn) {
  if (burn <= 0.001) return col;
  float f = mtFbm(p * 34.0) * 0.8 + mtNoise(p * 150.0) * 0.2;
  float thr = 1.04 - burn * 1.0;
  float halo = smoothstep(thr - 0.24, thr, f) * min(1.0, burn * 2.5);
  col = mix(col, col * vec3(0.30, 0.22, 0.19), halo * 0.85);
  mtChar = smoothstep(thr - 0.03, thr + 0.07, f);
  float ash = mtNoise(p * 420.0);
  vec3 charCol = mix(vec3(0.0035, 0.0025, 0.0021), vec3(0.028, 0.020, 0.016), ash * ash);
  return mix(col, charCol, mtChar);
}
// Costra de un corte plano a partir de la foto cocida, re-teñida hacia caoba (no amarillo cartón).
vec3 mtCrust(vec3 cookedTex, float fat, float cook, float edgeDark) {
  float L = dot(cookedTex, vec3(0.2126, 0.7152, 0.0722));
  float detail = clamp(0.45 + L / 0.12, 0.6, 1.7);
  float tone = clamp(0.16 + cook * 0.28 + (0.08 - L) * 0.9 + edgeDark * 0.22, 0.0, 1.0);
  vec3 lean = mix(mtMaillard(tone) * detail, cookedTex * vec3(1.25, 0.95, 0.80), 0.25);
  float fatTone = clamp(0.30 + cook * 0.26 + edgeDark * 0.25 + (0.12 - L) * 0.8, 0.0, 1.0);
  vec3 fatCol = mtFatRoast(fatTone) * clamp(0.6 + L * 1.5, 0.6, 0.92);
  return mix(lean, fatCol, clamp(fat, 0.0, 1.0));
}
// Transición completa crudo → sellado → costra para cortes planos.
vec3 mtCookFlat(vec3 raw, vec3 cookedTex, float fat, float cook, float set, float edgeDark) {
  float L = dot(raw, vec3(0.2126, 0.7152, 0.0722));
  vec3 sealedLean = vec3(L) * vec3(1.55, 1.05, 0.86) + vec3(0.02, 0.01, 0.0);
  vec3 sealed = mix(raw, mix(sealedLean, mtFatRoast(0.12) * (0.6 + L), fat), set * 0.5);
  vec3 crust = mtCrust(cookedTex, fat, cook, edgeDark);
  float t = smoothstep(0.0, 1.0, cook);
  vec3 mid = mix(sealed, crust, smoothstep(0.0, 0.6, t) * 0.6);
  return mix(mid, crust, smoothstep(0.3, 1.0, t));
}
`;

/**
 * Cierre común de un corte plano. El fragmento del corte debe declarar antes
 * `vec3 rawCol`, `vec3 cookedCol` y `float fatMask`; aquí se cocina, se marca, se quema y se fija el brillo.
 */
export function flatFinishGlsl(cook: string, burn: string, set: string, edge: boolean): string {
  return `
      float mtEdgeDark = ${edge ? '0.5' : '1.0 - vMtEdge'};
      vec3 finalCol = mtCookFlat(rawCol, cookedCol, fatMask, ${cook}, ${set}, mtEdgeDark);
      float mark = ${edge ? '0.0' : 'mtGrillMarks(vMtLocal.xz, mtMarks)'};
      finalCol = mtSear(finalCol, mark);
      finalCol = mtBurnt(finalCol, ${edge ? 'vec2(vMtLocal.x + vMtLocal.z, vMtLocal.y * 3.0)' : 'vMtLocal.xz'}, ${burn});
      mtFat = fatMask * (1.0 - mtChar);
      mtCoat = (0.22 + mtFat * 1.9) * (1.0 - mtChar) * (1.0 - mark * 0.6);
      diffuseColor.rgb *= finalCol;
  `;
}

/** Ajuste común de rugosidad: grasa más brillante, carbón opaco. */
export const MEAT_ROUGHNESS_GLSL = `
  #include <roughnessmap_fragment>
  roughnessFactor *= 1.0 - mtFat * 0.42 * (1.0 - mtChar);
  roughnessFactor = mix(roughnessFactor, 0.96, mtChar);
`;

/**
 * Inyecta el fragmento común en un material ya preparado por el corte.
 * `edgeAttribute` usa el atributo `meatEdge` de `createMeatSurfaceGeometry` (0 en el borde, 1 adentro).
 */
export function injectMeatCommon(
  shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: MeatShadingUniforms,
  edgeAttribute = false,
): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = `${edgeAttribute ? 'attribute float meatEdge;\n' : ''}varying vec3 vMtLocal;\nvarying float vMtEdge;\n`
    + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vMtLocal = position;
      vMtEdge = ${edgeAttribute ? 'meatEdge' : '1.0'};`);
  shader.fragmentShader = MEAT_GLSL + shader.fragmentShader
    .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
        material.clearcoat = clamp(material.clearcoat * mtCoat, 0.0, 1.0);
      #endif`);
}

const ENV_WIDTH = 128, ENV_HEIGHT = 64;

/**
 * Brillo del entorno (0..1) para una dirección equirectangular (u, v): cielo tenue, piso oscuro y
 * dos ventanas cálidas que dan reflejos húmedos sobre la grasa y la tripa.
 */
export function environmentTexel(u: number, v: number): Rgb {
  const elevation = (v - 0.5) * Math.PI;
  const sky = THREE.MathUtils.smoothstep(elevation, -0.15, 0.6);
  const base = 0.035 + sky * 0.11;
  const window = (cu: number, cv: number, ru: number, rv: number): number => {
    const du = Math.min(Math.abs(u - cu), 1 - Math.abs(u - cu)) / ru, dv = (v - cv) / rv;
    return 1 - THREE.MathUtils.smoothstep(du * du + dv * dv, 0.55, 1);
  };
  const glow = Math.max(window(0.25, 0.74, 0.16, 0.12), window(0.75, 0.78, 0.12, 0.09) * 0.7, window(0.5, 0.92, 0.5, 0.1) * 0.55);
  return [Math.min(1, base + glow * 0.95), Math.min(1, base * 0.97 + glow * 0.88), Math.min(1, base * 0.92 + glow * 0.74)];
}

let sharedEnvironment: THREE.DataTexture | undefined;
/** Entorno equirectangular de 128×64 compartido por toda la carne (el renderer arma el PMREM una vez). */
export function meatEnvironment(): THREE.DataTexture {
  if(sharedEnvironment) return sharedEnvironment;
  const pixels = new Uint8Array(ENV_WIDTH * ENV_HEIGHT * 4);
  for(let y = 0;y < ENV_HEIGHT;y++) for(let x = 0;x < ENV_WIDTH;x++) {
    const [r, g, b] = environmentTexel((x + 0.5) / ENV_WIDTH, (y + 0.5) / ENV_HEIGHT);
    pixels.set([r * 255, g * 255, b * 255, 255].map(Math.round), (y * ENV_WIDTH + x) * 4);
  }
  sharedEnvironment = new THREE.DataTexture(pixels, ENV_WIDTH, ENV_HEIGHT);
  sharedEnvironment.name = 'entorno-reflejos-carne';
  sharedEnvironment.mapping = THREE.EquirectangularReflectionMapping;
  sharedEnvironment.colorSpace = THREE.SRGBColorSpace;
  sharedEnvironment.magFilter = THREE.LinearFilter;
  sharedEnvironment.minFilter = THREE.LinearFilter;
  sharedEnvironment.needsUpdate = true;
  return sharedEnvironment;
}

/** Aplica el entorno reflejado a un material de carne (brillo húmedo sin aclarar el difuso). */
export function withMeatEnvironment<T extends THREE.MeshStandardMaterial>(material: T, intensity = 0.32): T {
  material.envMap = meatEnvironment();
  material.envMapIntensity = intensity;
  return material;
}
