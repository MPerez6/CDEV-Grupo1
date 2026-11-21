import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createMeatSurfaceGeometry } from './meat-surface-geometry.ts';
import {
  GrillMarkTracker, MEAT_ROUGHNESS_GLSL, cookWithDepth, createMeatUniforms, flatFinishGlsl, injectMeatCommon,
  updateFaceMarks, withMeatEnvironment, type MeatShadingUniforms,
} from './meat-shading.ts';

let sharedAtlas: THREE.Texture | undefined;
let sharedBump: THREE.Texture | undefined;
function textures(): { atlas: THREE.Texture; bump: THREE.Texture } {
  if(!sharedAtlas) {
    // Las pruebas de geometría corren sin DOM; la aplicación carga el recurso local real.
    sharedAtlas = typeof document === 'undefined'
      ? new THREE.DataTexture(new Uint8Array([190, 125, 125, 255, 169, 105, 43, 255]), 2, 1)
      : new THREE.TextureLoader().load(new URL('../assets/meat/matambre-raw-cooked-v1.png', import.meta.url).href,
        texture => { if(sharedBump) { sharedBump.image = texture.image; sharedBump.needsUpdate = true; } });
    sharedAtlas.name = 'matambre-raw-cooked-atlas';
    if(typeof document !== 'undefined') {
      // Imagen inicial válida mientras llega el PNG: evita subir una textura vacía al GPU.
      sharedAtlas.image = new ImageData(new Uint8ClampedArray([190, 125, 125, 255, 169, 105, 43, 255]), 2, 1);
    }
    sharedAtlas.colorSpace = THREE.SRGBColorSpace;
    sharedAtlas.anisotropy = 8;
    // Clonar comparte la imagen; no se duplican archivos ni se recorta la textura original.
    sharedBump = sharedAtlas.clone();
    sharedBump.colorSpace = THREE.NoColorSpace;
    sharedBump.repeat.set(0.496, 0.996);
    sharedBump.offset.set(0.002, 0.002);
    if(typeof document === 'undefined') { sharedAtlas.needsUpdate = true; sharedBump.needsUpdate = true; }
  }
  return { atlas: sharedAtlas, bump: sharedBump! };
}

function surfaceMaterial(name: string, edge = false): {
  material: THREE.MeshPhysicalMaterial;
  uniforms: MeatShadingUniforms;
  update: (brown: number, burn: number, layerC: number, juice: number) => void;
} {
  const { atlas, bump } = textures();
  const material = withMeatEnvironment(new THREE.MeshPhysicalMaterial({
    name, color: 0xffffff, map: atlas,
    bumpMap: bump, bumpScale: 0.00065, roughness: 0.53, metalness: 0,
    clearcoat: 0.16, clearcoatRoughness: 0.35, ior: 1.4, side: THREE.DoubleSide
  }));
  const cook = { value: 0 }, char = { value: 0 }, set = { value: 0 };
  const uniforms = createMeatUniforms();
  material.onBeforeCompile = shader => {
    shader.uniforms.matCook = cook; shader.uniforms.matChar = char; shader.uniforms.matSet = set;
    injectMeatCommon(shader, uniforms, true);
    shader.fragmentShader = `
      uniform float matCook;
      uniform float matChar;
      uniform float matSet;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 matUv = clamp(vMapUv, vec2(0.002), vec2(0.998));
      vec2 rawUv = vec2(matUv.x * 0.496 + 0.002, matUv.y);
      vec3 rawCol = texture2D(map, rawUv).rgb;
      vec3 cookedCol = texture2D(map, rawUv + vec2(0.5, 0.0)).rgb;
      // Membranas y vetas marfil del matambre: la grasa que brilla y se acaramela
      float fatMask = smoothstep(0.30, 0.72, min(rawCol.r, min(rawCol.g, rawCol.b)));
      ${flatFinishGlsl('matCook', 'matChar', 'matSet', edge)}
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', MEAT_ROUGHNESS_GLSL);
  };
  material.customProgramCacheKey = () => `matambre-atlas-surface-${edge}-v3`;
  return {
    material, uniforms, update(brown, burn, layerC, juice) {
      cook.value = cookWithDepth(brown / 60, brown);
      char.value = THREE.MathUtils.clamp(burn / 100, 0, 1);
      set.value = THREE.MathUtils.clamp((layerC - 35) / 45, 0, 1);
      const dryness = THREE.MathUtils.clamp((70 - juice) / 70, 0, 1);
      const done = Math.min(1, cook.value);
      material.roughness = 0.5 - done * 0.10 + dryness * 0.24;
      material.clearcoat = (0.18 + done * 0.12) * (1 - dryness * 0.85);
    }
  };
}

export const createMatambreGeometry = createMeatSurfaceGeometry;
export function createMatambreVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();
  group.name = `meat-matambre-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);
  const surfaces = { a: surfaceMaterial('matambre-face-a'), b: surfaceMaterial('matambre-face-b') };
  const edge = surfaceMaterial('matambre-edge', true);
  const marks = new GrillMarkTracker();
  const mesh = new THREE.Mesh(createMatambreGeometry(meat), [surfaces.a.material, surfaces.b.material, edge.material]);
  mesh.name = 'matambre-organic-volume'; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.kind = 'meat'; mesh.userData.meatId = meat.id;
  body.add(mesh);
  return {
    group, pickMeshes: [mesh], update() {
      orientation.rotation.y = meat.quarterTurns * Math.PI / 2;
      body.rotation.x = meat.faceDown === 'a' ? 0 : Math.PI;
      body.position.y = meat.faceDown === 'a' ? 0 : meat.definition.thicknessM;
      for(const side of ['a', 'b'] as Side[]) surfaces[side].update(meat.brown[side], meat.burn[side], meat.layersC[side === 'a' ? 0 : 4], meat.juiciness);
      marks.update(meat.brown, meat.quarterTurns);
      for(const side of ['a', 'b'] as Side[]) updateFaceMarks(surfaces[side].uniforms, marks, side, meat.burn[side]);
      edge.update((meat.brown.a + meat.brown.b) / 2, Math.max(meat.burn.a, meat.burn.b) * 0.7, (meat.layersC[0] + meat.layersC[4]) / 2, meat.juiciness);
      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      mesh.userData.enabled = meat.location !== 'carried';
    }
  };
}
