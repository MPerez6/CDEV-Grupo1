import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createMeatSurfaceGeometry } from './meat-surface-geometry.ts';

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
  update: (meat: MeatModel) => void;
} {
  const { map, bump } = textureSet();
  const material = new THREE.MeshPhysicalMaterial({
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
  });

  const cook = { value: 0 }, burn = { value: 0 }, set = { value: 0 };
  let sideHeat = 0;
  let lastSimSeconds = 0;

  material.onBeforeCompile = shader => {
    shader.uniforms.faldaCook = cook;
    shader.uniforms.faldaBurn = burn;
    shader.uniforms.faldaSet = set;
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
      float faldaHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float faldaNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(faldaHash(i), faldaHash(i + vec2(1.0, 0.0)), f.x),
          mix(faldaHash(i + vec2(0.0, 1.0)), faldaHash(i + vec2(1.0)), f.x), f.y);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 baseUv = clamp(vMapUv, vec2(0.01), vec2(0.99));
      // Recortamos Y en [0.10, 0.64] para tomar solo las hebras de carne y grasa sin los huesos superiores ni el borde inferior del atlas
      float sampleY = ${edge
        ? 'clamp(0.12 + faldaHeight * 0.50, 0.10, 0.64)'
        : 'mix(0.10, 0.64, baseUv.y)'};

      vec2 rawUv = vec2(baseUv.x * 0.484 + 0.006, sampleY);
      vec2 cookedUv = vec2(baseUv.x * 0.484 + 0.508, sampleY);

      vec3 rawCol = texture2D(map, rawUv).rgb;
      vec3 cookedCol = texture2D(map, cookedUv).rgb;

      // Realzamos el color rojo carmesí fresco de la falda cruda y aclaramos sus vetas de grasa
      rawCol = pow(max(rawCol, vec3(0.01)), vec3(0.75)) * vec3(1.24, 0.96, 0.92);
      rawCol = clamp(rawCol, 0.0, 1.0);

      // Vetas oblicuas y hebras características de grasa blanca cremosa en la falda parrillera
      float fiberGrain = faldaNoise(baseUv * vec2(26.0, 12.0)) * 0.6 + faldaNoise(baseUv * 48.0) * 0.4;
      float seamWave = sin((baseUv.x * 0.72 + baseUv.y * 1.28) * 16.0 + faldaNoise(baseUv * 8.5) * 1.8);
      float fatSeam = smoothstep(0.48, 0.88, seamWave) * ${side === 'b' ? '0.58' : '0.38'};
      ${edge ? `
        float edgeFatBand = smoothstep(0.58, 0.78, faldaHeight + sin(baseUv.x * 24.0) * 0.04);
        fatSeam = max(fatSeam, edgeFatBand * 0.78);
      ` : ''}

      float texFat = smoothstep(0.28, 0.66, min(rawCol.r, min(rawCol.g, rawCol.b)));
      float fatMask = clamp(max(texFat, fatSeam), 0.0, 1.0);

      rawCol = mix(rawCol, vec3(0.96, 0.90, 0.80), fatSeam * 0.85);

      // Transformamos la textura cocida hacia una tonalidad doradita ámbar / miel tostada bien apetitosa
      vec3 liftedCooked = pow(max(cookedCol, vec3(0.02)), vec3(0.60)) * vec3(1.42, 1.18, 0.82);
      float cookedDetail = clamp(dot(liftedCooked, vec3(0.33, 0.50, 0.17)), 0.0, 1.0);
      vec3 goldenCrust = mix(
        vec3(0.56, 0.30, 0.10),
        vec3(0.90, 0.60, 0.22),
        smoothstep(0.12, 0.86, cookedDetail * 0.75 + fiberGrain * 0.25)
      );
      vec3 goldenCooked = mix(liftedCooked, goldenCrust, 0.64);
      // La grasa de la falda toma un tono dorado crocante (manteca tostada / miel)
      vec3 crispyGoldenFat = mix(vec3(0.86, 0.58, 0.22), vec3(0.96, 0.74, 0.34), fiberGrain);
      goldenCooked = mix(goldenCooked, crispyGoldenFat, fatMask * 0.72);

      // Etapa intermedia: sellado cálido y comienzo del dorado (evita que se vea grisácea)
      float luma = dot(rawCol, vec3(0.30, 0.59, 0.11));
      vec3 warmSeal = mix(vec3(0.76, 0.50, 0.30), vec3(0.93, 0.78, 0.48), fatMask);
      vec3 setCol = mix(rawCol, mix(vec3(luma) * vec3(1.18, 0.98, 0.82), warmSeal, 0.55), faldaSet * 0.48);

      // Transición progresiva en 2 etapas: de crudo/sellado -> dorado claro -> dorado parrillero intenso
      float cookT = smoothstep(0.0, 1.0, faldaCook);
      vec3 earlyGolden = mix(setCol, mix(goldenCooked, vec3(0.88, 0.62, 0.28), 0.38), smoothstep(0.0, 0.55, cookT));
      vec3 finalCol = mix(earlyGolden, goldenCooked, smoothstep(0.30, 1.0, cookT));

      ${!edge ? `
        // Marcas suaves y caramelizadas de los hierros de la parrilla
        float grillWave = abs(sin((baseUv.x * 7.0 + (fiberGrain - 0.5) * 0.10) * 3.14159265));
        float grillMark = (1.0 - smoothstep(0.0, 0.15, grillWave)) * smoothstep(0.25, 0.90, cookT);
        finalCol = mix(finalCol, vec3(0.44, 0.23, 0.07), grillMark * 0.26);
      ` : ''}

      // Carbonizado únicamente cuando se pasa de fuego (burn elevado)
      float charNoise = faldaNoise(baseUv * vec2(13.0, 10.0)) * 0.65
        + faldaNoise(baseUv * 31.0 + vec2(5.2, 2.7)) * 0.35;
      float charMask = smoothstep(0.26, 0.94, faldaBurn + (charNoise - 0.5) * 0.42 * faldaBurn);
      finalCol = mix(finalCol, vec3(0.025, 0.016, 0.011), charMask);

      diffuseColor.rgb *= finalCol;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor *= 1.0 - fatMask * 0.25 * (1.0 - charMask);
      roughnessFactor = mix(roughnessFactor, 0.94, charMask);
    `);
  };
  material.customProgramCacheKey = () => `falda-atlas-surface-${side}-${edge}-v2`;

  return {
    material,
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
      cook.value = THREE.MathUtils.clamp(
        Math.max(brownProgress, sideHeat, thermalProgress * 0.58 + brownProgress * 0.52),
        0,
        1
      );
      burn.value = THREE.MathUtils.clamp(burnVal / 100, 0, 1);
      set.value = THREE.MathUtils.clamp((layerC - 26) / 38, 0, 1);

      const dryness = THREE.MathUtils.clamp((70 - meat.juiciness) / 70, 0, 1);
      const baseRough = edge ? 0.52 : 0.46;
      material.roughness = baseRough - cook.value * 0.11 + dryness * 0.20 + burn.value * 0.28;
      material.clearcoat = (edge ? 0.18 : 0.24 + cook.value * 0.12) * (1 - dryness * 0.72) * (1 - burn.value * 0.85);
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
      edge.update(meat);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      mesh.userData.enabled = meat.location !== 'carried';
    }
  };
}
