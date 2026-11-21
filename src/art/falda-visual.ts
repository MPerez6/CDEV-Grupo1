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

function textureSet(): { map: THREE.Texture; bump: THREE.Texture } {
  if(!sharedAtlas) {
    const placeholder = new Uint8Array([164, 74, 75, 255, 132, 74, 36, 255]);
    const imgUrl = new URL('../assets/meat/costilla-raw-cooked-v1.png', import.meta.url).href;
    sharedAtlas = typeof document === 'undefined'
      ? new THREE.DataTexture(placeholder, 2, 1)
      : new THREE.TextureLoader().load(imgUrl, loaded => {
        sharedAtlas!.image = loaded.image;
        sharedAtlas!.needsUpdate = true;
        if(sharedBump) {
          sharedBump.image = loaded.image;
          sharedBump.needsUpdate = true;
        }
      });
    sharedAtlas.name = 'falda-atlas';
    sharedAtlas.colorSpace = THREE.SRGBColorSpace;
    sharedAtlas.anisotropy = 8;
    if(typeof document !== 'undefined') {
      sharedAtlas.image = new ImageData(new Uint8ClampedArray(placeholder), 2, 1);
    } else {
      sharedAtlas.needsUpdate = true;
    }
    sharedBump = sharedAtlas.clone();
    sharedBump.colorSpace = THREE.NoColorSpace;
    sharedBump.repeat.set(0.488, 0.992);
    sharedBump.offset.set(0.004, 0.004);
    if(typeof document === 'undefined') sharedBump.needsUpdate = true;
  }
  return { map: sharedAtlas, bump: sharedBump! };
}

function surfaceMaterial(side: Side, thickness: number, edge = false): {
  material: THREE.MeshPhysicalMaterial;
  uniforms: MeatShadingUniforms;
  update: (meat: MeatModel) => void;
} {
  const { map, bump } = textureSet();
  const material = withMeatEnvironment(new THREE.MeshPhysicalMaterial({
    name: edge ? 'falda-edge' : `falda-face-${side}`,
    map,
    bumpMap: bump,
    bumpScale: edge ? 0.00045 : 0.00065,
    color: 0xffffff,
    metalness: 0,
    roughness: edge ? 0.54 : 0.49,
    clearcoat: edge ? 0.15 : 0.22,
    clearcoatRoughness: 0.32,
    ior: 1.42,
    side: THREE.DoubleSide,
  }));

  const cook = { value: 0 }, burn = { value: 0 }, set = { value: 0 };
  const uniforms = createMeatUniforms();
  let sideHeat = 0;
  let lastSimSeconds = 0;

  material.onBeforeCompile = shader => {
    shader.uniforms.faldaCook = cook;
    shader.uniforms.faldaBurn = burn;
    shader.uniforms.faldaSet = set;
    injectMeatCommon(shader, uniforms, true);
    shader.vertexShader = 'varying float faldaHeight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      faldaHeight = clamp(position.y / ${Math.max(0.005, thickness).toFixed(6)}, 0.0, 1.0);
    `);
    shader.fragmentShader = `
      uniform float faldaCook;
      uniform float faldaBurn;
      uniform float faldaSet;
      varying float faldaHeight;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 baseUv = clamp(vMapUv, vec2(0.01), vec2(0.99));
      // Franja [0.10, 0.64] del atlas: solo hebras de carne y grasa, sin los huesos superiores
      float sampleY = ${edge
        ? 'clamp(0.12 + faldaHeight * 0.50, 0.10, 0.64)'
        : 'mix(0.10, 0.64, baseUv.y)'};
      vec3 rawCol = texture2D(map, vec2(baseUv.x * 0.484 + 0.006, sampleY)).rgb;
      vec3 cookedCol = texture2D(map, vec2(baseUv.x * 0.484 + 0.508, sampleY)).rgb;

      // Rojo carmesí fresco y vetas oblicuas de grasa blanca cremosa de la falda
      rawCol = clamp(pow(max(rawCol, vec3(0.001)), vec3(0.92)) * vec3(1.16, 0.95, 0.93), 0.0, 1.0);
      float seamWave = sin((baseUv.x * 0.72 + baseUv.y * 1.28) * 16.0 + mtNoise(baseUv * 8.5) * 1.8);
      float fatSeam = smoothstep(0.48, 0.88, seamWave) * ${side === 'b' ? '0.58' : '0.38'};
      ${edge ? `
        float edgeFatBand = smoothstep(0.58, 0.78, faldaHeight + sin(baseUv.x * 24.0) * 0.04);
        fatSeam = max(fatSeam, edgeFatBand * 0.78);
      ` : ''}
      float texFat = smoothstep(0.16, 0.45, min(rawCol.r, min(rawCol.g, rawCol.b)));
      float fatMask = clamp(max(texFat, fatSeam), 0.0, 1.0);
      rawCol = mix(rawCol, vec3(0.86, 0.76, 0.62), fatSeam * 0.8);
      ${flatFinishGlsl('faldaCook', 'faldaBurn', 'faldaSet', edge)}
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', MEAT_ROUGHNESS_GLSL);
  };
  material.customProgramCacheKey = () => `falda-atlas-surface-${side}-${edge}-v3`;

  return {
    material,
    uniforms,
    update(meat) {
      if(!meat.hasReceivedGrillHeat && meat.totalSimSeconds === 0 && meat.brown.a === 0 && meat.brown.b === 0) {
        sideHeat = 0;
        lastSimSeconds = 0;
      } else if(meat.totalSimSeconds > lastSimSeconds) {
        const dt = Math.min(5, meat.totalSimSeconds - lastSimSeconds);
        lastSimSeconds = meat.totalSimSeconds;
        if(meat.onGrill) {
          const active = edge ? true : meat.faceDown === side;
          const surfC = edge ? Math.max(meat.surfaceC.a, meat.surfaceC.b) : meat.surfaceC[side];
          const heatRate = Math.max(0, (surfC - 48) / 95);
          sideHeat = Math.min(1, sideHeat + dt * heatRate * (active ? 0.011 : 0.0022));
        }
      }

      const brownVal = edge ? (meat.brown.a + meat.brown.b) * 0.5 : meat.brown[side];
      const burnVal = edge ? Math.max(meat.burn.a, meat.burn.b) * 0.85 : meat.burn[side];
      const layerC = edge ? (meat.layersC[0] + meat.layersC[4]) * 0.5 : meat.layersC[side === 'a' ? 0 : 4];

      const brownProgress = THREE.MathUtils.clamp(brownVal / 38, 0, 1);
      const thermalProgress = THREE.MathUtils.clamp((layerC - 28) / 48, 0, 1);
      cook.value = cookWithDepth(Math.max(brownProgress, sideHeat, thermalProgress * 0.58 + brownProgress * 0.52), brownVal);
      burn.value = THREE.MathUtils.clamp(burnVal / 100, 0, 1);
      set.value = THREE.MathUtils.clamp((layerC - 26) / 38, 0, 1);

      const dryness = THREE.MathUtils.clamp((70 - meat.juiciness) / 70, 0, 1);
      const baseRough = edge ? 0.56 : 0.55;
      material.roughness = baseRough - Math.min(1, cook.value) * 0.11 + dryness * 0.20 + burn.value * 0.28;
      material.clearcoat = (edge ? 0.18 : 0.24 + Math.min(1, cook.value) * 0.12) * (1 - dryness * 0.72) * (1 - burn.value * 0.85);
    }
  };
}

export function createFaldaGeometry(meat: MeatModel): THREE.BufferGeometry {
  return createMeatSurfaceGeometry(meat, {
    edgeBlendM: 0.012,
    topEdge: 0.62,
    topCenter: 0.93,
    bottomEdge: 0.13,
    bottomCenter: 0.04,
    rippleTop: 0.045,
    rippleBottom: 0.022,
  });
}

export function createFaldaVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  const d = meat.definition;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();

  group.name = `meat-falda-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);

  const surfaces = {
    a: surfaceMaterial('a', d.thicknessM),
    b: surfaceMaterial('b', d.thicknessM),
  };
  const edge = surfaceMaterial('a', d.thicknessM, true);
  const marks = new GrillMarkTracker();

  const mesh = new THREE.Mesh(
    createFaldaGeometry(meat),
    [surfaces.a.material, surfaces.b.material, edge.material]
  );
  mesh.name = 'falda-organic-volume';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.kind = 'meat';
  mesh.userData.meatId = meat.id;
  body.add(mesh);

  return {
    group,
    pickMeshes: [mesh],
    update() {
      orientation.rotation.y = meat.quarterTurns * Math.PI / 2;
      body.rotation.x = meat.faceDown === 'a' ? 0 : Math.PI;
      body.position.y = meat.faceDown === 'a' ? 0 : d.thicknessM;

      surfaces.a.update(meat);
      surfaces.b.update(meat);
      marks.update(meat.brown, meat.quarterTurns);
      updateFaceMarks(surfaces.a.uniforms, marks, 'a', meat.burn.a);
      updateFaceMarks(surfaces.b.uniforms, marks, 'b', meat.burn.b);
      edge.update(meat);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      mesh.userData.enabled = meat.location !== 'carried';
    }
  };
}
