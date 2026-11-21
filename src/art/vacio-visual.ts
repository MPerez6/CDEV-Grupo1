import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createMeatSurfaceGeometry } from './meat-surface-geometry.ts';
import {
  GrillMarkTracker, MEAT_ROUGHNESS_GLSL, cookWithDepth, createMeatUniforms, flatFinishGlsl, injectMeatCommon,
  updateFaceMarks, withMeatEnvironment, type MeatShadingUniforms,
} from './meat-shading.ts';

// A = fibras; B = membrana/cuero. La cara B queda arriba al iniciar la pieza.
export const VACIO_FACES = { a: 'Fibras y grasa', b: 'Cuero / membrana' } as const;
let atlas: THREE.Texture | undefined;
let cookedAtlas: THREE.Texture | undefined;
const bumps: Partial<Record<Side, THREE.Texture>> = {};
function textureSet(): { map: THREE.Texture; cooked: THREE.Texture; bumps: Record<Side, THREE.Texture> } {
  if(!atlas) {
    atlas = typeof document === 'undefined'
      ? new THREE.DataTexture(new Uint8Array([152, 124, 137, 255, 166, 42, 48, 255]), 2, 1)
      : new THREE.TextureLoader().load(new URL('../assets/meat/vacio-raw-sides-v1.png', import.meta.url).href, loaded => {
        for(const bump of Object.values(bumps)) { bump.image = loaded.image; bump.needsUpdate = true; }
      });
    atlas.name = 'vacio-two-raw-faces'; atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;
    if(typeof document !== 'undefined') atlas.image = new ImageData(new Uint8ClampedArray([152, 124, 137, 255, 166, 42, 48, 255]), 2, 1);
    for(const side of ['a', 'b'] as const) {
      const bump = atlas.clone(); bump.colorSpace = THREE.NoColorSpace;
      bump.repeat.set(0.496, 0.996); bump.offset.set(side === 'b' ? 0.002 : 0.502, 0.002);
      bumps[side] = bump;
      if(typeof document === 'undefined') bump.needsUpdate = true;
    }
    if(typeof document === 'undefined') atlas.needsUpdate = true;
  }
  if(!cookedAtlas) {
    const placeholder = new Uint8Array([185, 121, 43, 255, 100, 39, 17, 255]);
    cookedAtlas = typeof document === 'undefined'
      ? new THREE.DataTexture(placeholder, 2, 1)
      : new THREE.TextureLoader().load(new URL('../assets/meat/vacio-cooked-sides-v1.png', import.meta.url).href);
    if(typeof document !== 'undefined') cookedAtlas.image = new ImageData(new Uint8ClampedArray(placeholder), 2, 1);
    cookedAtlas.name = 'vacio-two-cooked-faces'; cookedAtlas.colorSpace = THREE.SRGBColorSpace; cookedAtlas.anisotropy = 8;
    if(typeof document === 'undefined') cookedAtlas.needsUpdate = true;
  }
  return { map: atlas, cooked: cookedAtlas, bumps: bumps as Record<Side, THREE.Texture> };
}

function surfaceMaterial(side: Side, thickness: number, edge = false): {
  material: THREE.MeshPhysicalMaterial; uniforms: MeatShadingUniforms; update: (meat: MeatModel) => void;
} {
  const textures = textureSet();
  const material = withMeatEnvironment(new THREE.MeshPhysicalMaterial({
    name: edge ? 'vacio-muscle-edge' : `vacio-${side === 'b' ? 'membrane' : 'fibers'}`,
    map: textures.map, bumpMap: textures.bumps[side], bumpScale: side === 'b' ? 0.00028 : 0.00045,
    color: 0xffffff, metalness: 0, roughness: side === 'b' ? 0.49 : 0.56,
    clearcoat: side === 'b' ? 0.19 : 0.12, clearcoatRoughness: 0.42, ior: 1.4, side: THREE.DoubleSide,
  }));
  const uniforms = createMeatUniforms();
  const cook = { value: 0 }, burn = { value: 0 }, set = { value: 0 };
  material.userData.vacioFace = edge ? 'edge' : side;
  material.userData.rawAtlasTile = side === 'b' ? 0 : 1;
  material.userData.cookedAtlasTile = side === 'b' ? 0 : 1;
  material.onBeforeCompile = shader => {
    shader.uniforms.vacioCook = cook; shader.uniforms.vacioBurn = burn; shader.uniforms.vacioSet = set;
    shader.uniforms.vacioCookedMap = { value: textures.cooked };
    injectMeatCommon(shader, uniforms, true);
    shader.vertexShader = 'varying float vacioHeight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vacioHeight = position.y / ${thickness.toFixed(6)};
    `);
    shader.fragmentShader = `uniform float vacioCook;
      uniform float vacioBurn;
      uniform float vacioSet;
      uniform sampler2D vacioCookedMap;
      varying float vacioHeight;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 vacioUv = clamp(vMapUv, vec2(0.002), vec2(0.998));
      ${edge ? 'vacioUv.y = 0.3 + vacioHeight * 0.4;' : ''}
      vec3 vacioRaw = texture2D(map, vec2(vacioUv.x * 0.496 + ${side === 'b' ? '0.002' : '0.502'}, vacioUv.y)).rgb;
      vec3 vacioRoast = texture2D(vacioCookedMap, vec2(vacioUv.x * 0.496 + ${side === 'b' ? '0.002' : '0.502'}, vacioUv.y)).rgb;
      ${edge ? `
        vacioRaw *= vec3(1.10, 0.90, 0.87);
        float vacioFatBand = smoothstep(0.64, 0.78, vacioHeight + sin(vacioUv.x * 39.0) * 0.025);
        vacioFatBand = max(vacioFatBand, (1.0 - smoothstep(0.05, 0.13, vacioHeight)) * 0.45);
        vacioRaw = mix(vacioRaw, vec3(0.72, 0.59, 0.45), vacioFatBand * 0.88);
        vacioRoast = mix(vacioRoast, vec3(0.44, 0.23, 0.07), vacioFatBand * 0.65);
      ` : ''}
      vec3 rawCol = vacioRaw, cookedCol = vacioRoast;
      // Grasa y cuero claros: brillan crudos y se acaramelan al dorarse
      float fatMask = smoothstep(0.24, 0.66, min(vacioRaw.r, min(vacioRaw.g, vacioRaw.b)));
      ${edge ? 'fatMask = max(fatMask, vacioFatBand);' : ''}
      ${flatFinishGlsl('vacioCook', 'vacioBurn', 'vacioSet', edge)}
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', MEAT_ROUGHNESS_GLSL);
  };
  material.customProgramCacheKey = () => `vacio-raw-cooked-${side}-${edge}-v3`;
  return {
    material, uniforms, update(meat) {
      const brown = edge ? (meat.brown.a + meat.brown.b) / 2 : meat.brown[side];
      cook.value = cookWithDepth(brown / 60, brown);
      burn.value = THREE.MathUtils.clamp((edge ? Math.max(meat.burn.a, meat.burn.b) : meat.burn[side]) / 100, 0, 1);
      set.value = THREE.MathUtils.clamp((meat.layersC[side === 'a' ? 0 : 4] - 35) / 45, 0, 1);
      material.roughness = (side === 'b' ? 0.49 : 0.56) - Math.min(1, cook.value) * 0.08 + burn.value * 0.3;
    }
  };
}

export function createVacioGeometry(meat: MeatModel): THREE.BufferGeometry {
  return createMeatSurfaceGeometry(meat, {
    edgeBlendM: 0.01, topEdge: 0.77, topCenter: 0.96,
    bottomEdge: 0.12, bottomCenter: 0.04, rippleTop: 0.025, rippleBottom: 0.018
  });
}

export function createVacioVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();
  group.name = `meat-vacio-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);
  const materials = { a: surfaceMaterial('a', meat.definition.thicknessM), b: surfaceMaterial('b', meat.definition.thicknessM) };
  const edge = surfaceMaterial('a', meat.definition.thicknessM, true);
  const marks = new GrillMarkTracker();
  const mesh = new THREE.Mesh(createVacioGeometry(meat), [materials.a.material, materials.b.material, edge.material]);
  mesh.name = 'vacio-organic-volume'; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.kind = 'meat'; mesh.userData.meatId = meat.id;
  body.add(mesh);
  return {
    group, pickMeshes: [mesh], update() {
      orientation.rotation.y = meat.quarterTurns * Math.PI / 2;
      body.rotation.x = meat.faceDown === 'a' ? 0 : Math.PI;
      body.position.y = meat.faceDown === 'a' ? 0 : meat.definition.thicknessM;
      materials.a.update(meat); materials.b.update(meat); edge.update(meat);
      marks.update(meat.brown, meat.quarterTurns);
      updateFaceMarks(materials.a.uniforms, marks, 'a', meat.burn.a);
      updateFaceMarks(materials.b.uniforms, marks, 'b', meat.burn.b);
      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      mesh.userData.enabled = meat.location !== 'carried';
    }
  };
}
