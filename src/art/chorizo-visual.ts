import * as THREE from 'three';
import type { MeatModel } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';

let rawAtlas: THREE.Texture | undefined;
let cookedAtlas: THREE.Texture | undefined;
let bumpAtlas: THREE.Texture | undefined;

function textureSet(): { rawMap: THREE.Texture; cookedMap: THREE.Texture; bump: THREE.Texture } {
  if(!rawAtlas) {
    const rawPlaceholder = new Uint8Array([212, 118, 122, 255, 224, 152, 150, 255]);
    const rawUrl = new URL('../assets/meat/chorizo-raw-sides-v1.png', import.meta.url).href;
    rawAtlas = typeof document === 'undefined'
      ? new THREE.DataTexture(rawPlaceholder, 2, 1)
      : new THREE.TextureLoader().load(rawUrl, loaded => {
        rawAtlas!.image = loaded.image;
        rawAtlas!.needsUpdate = true;
        if(bumpAtlas) {
          bumpAtlas.image = loaded.image;
          bumpAtlas.needsUpdate = true;
        }
      });
    rawAtlas.name = 'chorizo-raw-sides';
    rawAtlas.colorSpace = THREE.SRGBColorSpace;
    rawAtlas.anisotropy = 8;
    if(typeof document !== 'undefined') {
      rawAtlas.image = new ImageData(new Uint8ClampedArray(rawPlaceholder), 2, 1);
    } else {
      rawAtlas.needsUpdate = true;
    }

    bumpAtlas = rawAtlas.clone();
    bumpAtlas.colorSpace = THREE.NoColorSpace;
    bumpAtlas.repeat.set(0.85, 0.78);
    bumpAtlas.offset.set(0.05, 0.06);
    if(typeof document === 'undefined') bumpAtlas.needsUpdate = true;
  }

  if(!cookedAtlas) {
    const cookedPlaceholder = new Uint8Array([145, 78, 38, 255, 110, 52, 24, 255]);
    const cookedUrl = new URL('../assets/meat/chorizo-raw-cooked-v1.jpg', import.meta.url).href;
    cookedAtlas = typeof document === 'undefined'
      ? new THREE.DataTexture(cookedPlaceholder, 2, 1)
      : new THREE.TextureLoader().load(cookedUrl, loaded => {
        cookedAtlas!.image = loaded.image;
        cookedAtlas!.needsUpdate = true;
      });
    cookedAtlas.name = 'chorizo-cooked-atlas';
    cookedAtlas.colorSpace = THREE.SRGBColorSpace;
    cookedAtlas.anisotropy = 8;
    if(typeof document !== 'undefined') {
      cookedAtlas.image = new ImageData(new Uint8ClampedArray(cookedPlaceholder), 2, 1);
    } else {
      cookedAtlas.needsUpdate = true;
    }
  }

  return { rawMap: rawAtlas, cookedMap: cookedAtlas, bump: bumpAtlas! };
}

function createChorizoCapsuleGeometry(widthM: number, thicknessM: number, scaleX: number): THREE.BufferGeometry {
  const radiusY = thicknessM / 2;
  const radiusZ = thicknessM / 2;
  const capRatioX = (3 / Math.max(1, scaleX)) * 0.85;
  const capLengthX = radiusY * capRatioX;
  const halfLen = widthM * 0.48;

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-halfLen, 0, 0),
    new THREE.Vector3(0, 0, thicknessM * 0.14),
    new THREE.Vector3(halfLen, 0, 0)
  );

  const lengthSegments = 40;
  const radialSegments = 24;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const vertexNormal = new THREE.Vector3();

  const capFraction = Math.min(0.28, capLengthX / Math.max(0.01, halfLen));

  for(let i = 0; i <= lengthSegments; i++) {
    const u = i / lengthSegments;
    curve.getPoint(u, center);
    curve.getTangent(u, tangent).normalize();
    binormal.crossVectors(tangent, up).normalize();
    normal.crossVectors(binormal, tangent).normalize();

    let radialScale = 1;
    let axialNormalSign = 0;
    if(u < capFraction) {
      const t = u / capFraction;
      radialScale = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
      axialNormalSign = -(1 - t);
    } else if(u > 1 - capFraction) {
      const t = (1 - u) / capFraction;
      radialScale = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
      axialNormalSign = 1 - t;
    }
    radialScale *= 0.96 + 0.04 * Math.sin(u * Math.PI);

    for(let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const angle = v * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const dy = sin * radiusY * radialScale;
      const dz = cos * radiusZ * radialScale;

      vertex.copy(center)
        .addScaledVector(normal, dy)
        .addScaledVector(binormal, dz);
      positions.push(vertex.x, vertex.y, vertex.z);

      vertexNormal.copy(normal).multiplyScalar(sin * radialScale)
        .addScaledVector(binormal, cos * radialScale)
        .addScaledVector(tangent, axialNormalSign * 0.65)
        .normalize();
      normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);

      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for(let i = 0; i < lengthSegments; i++) {
    for(let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function createCasingMaterial(): { material: THREE.MeshPhysicalMaterial; update: (meat: MeatModel) => void; } {
  const textures = textureSet();
  const material = new THREE.MeshPhysicalMaterial({
    name: 'chorizo-casing',
    map: textures.rawMap,
    bumpMap: textures.bump,
    bumpScale: 0.00035,
    color: 0xffffff,
    metalness: 0,
    roughness: 0.38,
    clearcoat: 0.28,
    clearcoatRoughness: 0.24,
    ior: 1.42,
    side: THREE.DoubleSide,
  });

  const cookA = { value: 0 }, cookB = { value: 0 };
  const burnA = { value: 0 }, burnB = { value: 0 };
  const cookedTexUniform = { value: textures.cookedMap };
  const sideHeat = { a: 0, b: 0 };
  let lastSimSeconds = 0;

  material.onBeforeCompile = shader => {
    shader.uniforms.meatCookA = cookA;
    shader.uniforms.meatCookB = cookB;
    shader.uniforms.meatBurnA = burnA;
    shader.uniforms.meatBurnB = burnB;
    shader.uniforms.cookedMap = cookedTexUniform;
    shader.fragmentShader = `
      uniform float meatCookA;
      uniform float meatCookB;
      uniform float meatBurnA;
      uniform float meatBurnB;
      uniform sampler2D cookedMap;
      float chorizoHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float chorizoNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(chorizoHash(i), chorizoHash(i + vec2(1.0, 0.0)), f.x),
          mix(chorizoHash(i + vec2(0.0, 1.0)), chorizoHash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      // Mapeo suave sin efecto caleidoscopio y recortando la franja negra superior de chorizo-raw-sides-v1.png
      vec2 repeatUv = vMapUv * vec2(1.15, 1.0);
      vec2 seamlessUv = 1.0 - abs(fract(repeatUv) * 2.0 - 1.0);

      // En chorizo-raw-sides-v1.png recortamos Y en [0.06, 0.84] para excluir el borde negro superior
      vec2 rawUv = vec2(
        mix(0.06, 0.94, seamlessUv.x),
        mix(0.06, 0.84, seamlessUv.y)
      );
      // Tomamos el centro dorado de la mitad derecha de chorizo-raw-cooked-v1.jpg evitando bordes pálidos
      vec2 cookedUv = vec2(
        mix(0.54, 0.92, seamlessUv.x),
        mix(0.18, 0.86, seamlessUv.y)
      );

      vec4 texRaw = texture2D(map, rawUv);
      // Realzamos el tono rosado fresco de carne de cerdo/vacuna y los dados de tocino blanco
      texRaw.rgb = pow(max(texRaw.rgb, vec3(0.01)), vec3(0.80)) * vec3(1.14, 1.03, 1.02);
      texRaw.rgb = clamp(texRaw.rgb, 0.0, 1.0);

      float fatSpeck = smoothstep(0.52, 0.82, min(texRaw.r, min(texRaw.g, texRaw.b)));
      texRaw.rgb = mix(texRaw.rgb, vec3(0.97, 0.92, 0.85), fatSpeck * 0.45);

      vec4 texCooked = texture2D(cookedMap, cookedUv);
      float grain = chorizoNoise(seamlessUv * vec2(18.0, 14.0)) * 0.65
        + chorizoNoise(seamlessUv * 38.0) * 0.35;

      // Re-graduamos la textura cocida hacia un dorado ámbar / bronce crocante y parejo ("chorizo bien doradito")
      vec3 liftedCooked = pow(max(texCooked.rgb, vec3(0.02)), vec3(0.66)) * vec3(1.36, 1.14, 0.78);
      float cookedLuma = clamp(dot(liftedCooked, vec3(0.33, 0.50, 0.17)), 0.0, 1.0);
      vec3 goldenCasing = mix(
        vec3(0.60, 0.33, 0.10),
        vec3(0.92, 0.62, 0.22),
        smoothstep(0.14, 0.86, cookedLuma * 0.72 + grain * 0.28)
      );
      vec3 goldenCooked = mix(liftedCooked, goldenCasing, 0.68);
      // Los dados de tocino bajo la tripa se vuelven dorado miel brillante al asarse
      vec3 goldenFatSpeck = mix(vec3(0.88, 0.62, 0.24), vec3(0.97, 0.78, 0.38), grain);
      goldenCooked = mix(goldenCooked, goldenFatSpeck, fatSpeck * 0.65);

      // Mezcla suave entre cara A (inferior inicial) y cara B (superior inicial)
      float sideBlend = smoothstep(-0.28, 0.28, sin(vMapUv.y * 6.2831853));
      float localCook = clamp(mix(meatCookA, meatCookB, sideBlend), 0.0, 1.0);
      float localBurn = clamp(mix(meatBurnA, meatBurnB, sideBlend), 0.0, 1.0);

      // Etapa intermedia: de rosado crudo -> dorado manteca / ámbar suave -> dorado parrillero intenso
      float cookT = smoothstep(0.0, 1.0, localCook);
      vec3 warmMid = mix(
        texRaw.rgb,
        mix(vec3(0.86, 0.60, 0.32), vec3(0.95, 0.78, 0.44), fatSpeck),
        smoothstep(0.0, 0.55, cookT) * 0.78
      );
      vec3 finalRgb = mix(warmMid, goldenCooked, smoothstep(0.22, 1.0, cookT));

      // Sutiles marcas caramelizadas de los hierros de la parrilla a lo largo del chorizo
      float grillWave = abs(sin((vMapUv.x * 5.5 + (grain - 0.5) * 0.08) * 3.14159265));
      float grillMark = (1.0 - smoothstep(0.0, 0.16, grillWave)) * smoothstep(0.28, 0.90, cookT);
      finalRgb = mix(finalRgb, vec3(0.46, 0.23, 0.07), grillMark * 0.24);

      float charFactor = smoothstep(0.32, 0.95, localBurn + (grain - 0.5) * 0.30 * localBurn);
      finalRgb = mix(finalRgb, vec3(0.022, 0.014, 0.010), charFactor);

      diffuseColor.rgb *= finalRgb;
    `);
  };
  material.customProgramCacheKey = () => 'chorizo-casing-golden-v4';

  return {
    material,
    update(meat) {
      if(!meat.hasReceivedGrillHeat && meat.totalSimSeconds === 0 && meat.brown.a === 0 && meat.brown.b === 0) {
        sideHeat.a = 0;
        sideHeat.b = 0;
        lastSimSeconds = 0;
      } else if(meat.totalSimSeconds > lastSimSeconds) {
        const dt = Math.min(5, meat.totalSimSeconds - lastSimSeconds);
        lastSimSeconds = meat.totalSimSeconds;
        if(meat.onGrill) {
          const down = meat.faceDown;
          const up = down === 'a' ? 'b' : 'a';
          const surfDown = Math.max(meat.surfaceC[down], meat.layersC[0]);
          const rateDown = Math.max(0, (surfDown - 42) / 85);
          sideHeat[down] = Math.min(1, sideHeat[down] + dt * rateDown * 0.012);
          sideHeat[up] = Math.min(1, sideHeat[up] + dt * rateDown * 0.0028);
        }
      }

      const thermalBase = THREE.MathUtils.clamp((meat.layersC[0] - 26) / 46, 0, 1);
      const brownA = THREE.MathUtils.clamp(meat.brown.a / 36, 0, 1);
      const brownB = THREE.MathUtils.clamp(meat.brown.b / 36, 0, 1);

      cookA.value = THREE.MathUtils.clamp(
        Math.max(brownA, sideHeat.a, thermalBase * (meat.faceDown === 'a' ? 0.68 : 0.42) + brownA * 0.45),
        0,
        1
      );
      cookB.value = THREE.MathUtils.clamp(
        Math.max(brownB, sideHeat.b, thermalBase * (meat.faceDown === 'b' ? 0.68 : 0.42) + brownB * 0.45),
        0,
        1
      );
      burnA.value = THREE.MathUtils.clamp(Math.max(meat.burn.a, meat.casingDamage.a * 0.85) / 100, 0, 1);
      burnB.value = THREE.MathUtils.clamp(Math.max(meat.burn.b, meat.casingDamage.b * 0.85) / 100, 0, 1);
      const avgCook = (cookA.value + cookB.value) * 0.5;
      const maxBurn = Math.max(burnA.value, burnB.value);
      material.roughness = 0.36 - avgCook * 0.08 + maxBurn * 0.44;
      material.clearcoat = (0.30 + avgCook * 0.10) * (1 - maxBurn * 0.82);
    }
  };
}

export function createChorizoVisual(meat: MeatModel, scaleX: number, _scaleZ: number): MeatVisual {
  const d = meat.definition, size = meat.dimensions;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();

  group.name = `meat-chorizo-${meat.id}`;
  projection.scale.set(scaleX, 3, _scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);

  const casing = createCasingMaterial();
  const fatMat = new THREE.MeshStandardMaterial({ color: 0xe4d6ac, roughness: 0.65 });

  const pickMeshes: THREE.Mesh[] = [];

  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    const part = new THREE.Mesh(geometry, mat);
    part.castShadow = true; part.receiveShadow = true;
    part.userData.kind = 'meat'; part.userData.meatId = meat.id;
    body.add(part); pickMeshes.push(part);
    return part;
  }

  const capsuleGeo = createChorizoCapsuleGeometry(size.widthM, d.thicknessM, scaleX);
  const bodyMesh = mesh(capsuleGeo, casing.material);
  bodyMesh.position.y = d.thicknessM / 2;

  // Ataduras de hilo en los extremos de la tripa
  for(const sign of [-1, 1]) {
    const tie = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.008, 8), fatMat);
    tie.rotation.z = Math.PI / 2;
    tie.position.set(sign * size.widthM * 0.485, d.thicknessM / 2, 0);
  }

  return {
    group,
    pickMeshes,
    update() {
      orientation.rotation.y = meat.quarterTurns * Math.PI / 2;
      body.rotation.x = meat.faceDown === 'a' ? 0 : Math.PI;
      body.position.y = meat.faceDown === 'a' ? 0 : d.thicknessM;

      casing.update(meat);

      const thermalRatio = THREE.MathUtils.clamp((meat.layersC[0] - 26) / 48, 0, 1);
      const cookRatio = Math.min(1, Math.max(((meat.brown.a + meat.brown.b) / 2) / 38, thermalRatio * 0.72));
      const burnRatio = Math.min(1, Math.max(meat.burn.a, meat.burn.b, meat.casingDamage.a, meat.casingDamage.b) / 100);
      fatMat.color.set(0xeadcc0).lerp(new THREE.Color(0xc48b3c), cookRatio).lerp(new THREE.Color(0x2a1d14), burnRatio);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      for(const part of pickMeshes) part.userData.enabled = meat.location !== 'carried';
    }
  };
}

