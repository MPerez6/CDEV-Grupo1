import * as THREE from 'three';
import type { MeatModel } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';

let atlas: THREE.Texture | undefined;
let bumpAtlas: THREE.Texture | undefined;

function textureSet(): { map: THREE.Texture; bump: THREE.Texture } {
  if(!atlas) {
    const placeholder = new Uint8Array([42, 26, 34, 255, 28, 18, 16, 255]);
    const imgUrl = new URL('../assets/meat/morcilla-raw-cooked-v1.png', import.meta.url).href;
    atlas = typeof document === 'undefined'
      ? new THREE.DataTexture(placeholder, 2, 1)
      : new THREE.TextureLoader().load(imgUrl, loaded => {
        atlas!.image = loaded.image;
        atlas!.needsUpdate = true;
        if(bumpAtlas) {
          bumpAtlas.image = loaded.image;
          bumpAtlas.needsUpdate = true;
        }
      });
    atlas.name = 'morcilla-atlas';
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = 8;
    if(typeof document !== 'undefined') {
      atlas.image = new ImageData(new Uint8ClampedArray(placeholder), 2, 1);
    } else {
      atlas.needsUpdate = true;
    }
    bumpAtlas = atlas.clone();
    bumpAtlas.colorSpace = THREE.NoColorSpace;
    bumpAtlas.repeat.set(0.46, 0.96);
    bumpAtlas.offset.set(0.01, 0.02);
    if(typeof document === 'undefined') bumpAtlas.needsUpdate = true;
  }
  return { map: atlas, bump: bumpAtlas! };
}

function createMorcillaCapsuleGeometry(widthM: number, thicknessM: number, scaleX: number): THREE.BufferGeometry {
  const radiusY = thicknessM / 2;
  const radiusZ = thicknessM / 2;
  // Compensamos la relación de escala X/Y para que las puntas redondeadas no se aplasten ni se estiren
  const capRatioX = (3 / Math.max(1, scaleX)) * 0.85;
  const capLengthX = radiusY * capRatioX;
  const halfLen = widthM * 0.48;

  // Curvatura característica de la morcilla criolla (ligeramente más arqueada que el chorizo)
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-halfLen, 0, 0),
    new THREE.Vector3(0, 0, thicknessM * 0.22),
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

    // Perfil redondeado continuo en los extremos (cápsula) con fruncido suave hacia el atado
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
    // Volumen orgánico ligeramente más relleno en el centro
    radialScale *= 0.95 + 0.06 * Math.sin(u * Math.PI);

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
    name: 'morcilla-casing',
    map: textures.map,
    bumpMap: textures.bump,
    bumpScale: 0.0005,
    color: 0xffffff,
    metalness: 0,
    roughness: 0.36,
    clearcoat: 0.32,
    clearcoatRoughness: 0.24,
    ior: 1.45,
    side: THREE.DoubleSide,
  });

  const cookA = { value: 0 }, cookB = { value: 0 };
  const burnA = { value: 0 }, burnB = { value: 0 };
  const sideHeat = { a: 0, b: 0 };
  let lastSimSeconds = 0;

  material.onBeforeCompile = shader => {
    shader.uniforms.meatCookA = cookA;
    shader.uniforms.meatCookB = cookB;
    shader.uniforms.meatBurnA = burnA;
    shader.uniforms.meatBurnB = burnB;
    shader.fragmentShader = `
      uniform float meatCookA;
      uniform float meatCookB;
      uniform float meatBurnA;
      uniform float meatBurnB;
      float morcillaHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float morcillaNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(morcillaHash(i), morcillaHash(i + vec2(1.0, 0.0)), f.x),
          mix(morcillaHash(i + vec2(0.0, 1.0)), morcillaHash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      // Mapeo continuo en espejo (triangle wave) para eliminar costuras y evitar cruzar la línea central del atlas
      vec2 repeatUv = vMapUv * vec2(1.6, 1.0);
      vec2 seamlessUv = 1.0 - abs(fract(repeatUv) * 2.0 - 1.0);
      seamlessUv = clamp(seamlessUv, vec2(0.03, 0.04), vec2(0.92, 0.96));

      // Mitad izquierda del atlas = morcilla fresca/precocida; mitad derecha = morcilla asada
      vec2 rawUv = vec2(seamlessUv.x * 0.45 + 0.015, seamlessUv.y);
      vec2 cookedUv = vec2(seamlessUv.x * 0.45 + 0.525, seamlessUv.y);

      vec4 texRaw = texture2D(map, rawUv);
      vec4 texCooked = texture2D(map, cookedUv);

      // Realzamos el tono bordó-morado criollo en frío y los dados de tocino blanco bajo la tripa
      vec3 rawRgb = pow(max(texRaw.rgb, vec3(0.01)), vec3(0.84)) * vec3(1.18, 0.95, 1.02);
      float fatCube = smoothstep(0.26, 0.58, min(rawRgb.r, min(rawRgb.g, rawRgb.b)));
      rawRgb = mix(rawRgb, vec3(0.93, 0.87, 0.80), fatCube * 0.50);

      // Transformamos el estado cocido hacia una tripa bronceada y doradita (caramelo/ámbar tostado en relieves y grasa)
      float grain = morcillaNoise(seamlessUv * vec2(20.0, 15.0)) * 0.65
        + morcillaNoise(seamlessUv * 42.0) * 0.35;
      vec3 liftedCooked = pow(max(texCooked.rgb, vec3(0.015)), vec3(0.56)) * vec3(1.48, 1.16, 0.78);
      float ridgeDetail = clamp(dot(liftedCooked, vec3(0.40, 0.45, 0.15)) * 0.80 + grain * 0.35, 0.0, 1.0);

      vec3 goldenBronzeCasing = mix(
        vec3(0.30, 0.16, 0.08),
        vec3(0.78, 0.49, 0.19),
        smoothstep(0.14, 0.82, ridgeDetail)
      );
      vec3 goldenCooked = mix(liftedCooked, goldenBronzeCasing, 0.72);
      // Los dados de grasa subcutáneos se doran a un tono ámbar miel cálido
      vec3 toastedFatCube = mix(vec3(0.82, 0.54, 0.20), vec3(0.92, 0.68, 0.30), grain);
      goldenCooked = mix(goldenCooked, toastedFatCube, fatCube * 0.76);

      // Mezcla suave entre cara A y cara B alrededor del cilindro
      float sideBlend = smoothstep(-0.28, 0.28, sin(vMapUv.y * 6.2831853));
      float localCook = clamp(mix(meatCookA, meatCookB, sideBlend), 0.0, 1.0);
      float localBurn = clamp(mix(meatBurnA, meatBurnB, sideBlend), 0.0, 1.0);

      // Transición progresiva: de bordó-morado -> bronce cálido -> doradito crocante
      float cookT = smoothstep(0.0, 1.0, localCook);
      vec3 warmBronzeMid = mix(
        rawRgb,
        mix(vec3(0.46, 0.26, 0.13), vec3(0.86, 0.62, 0.28), fatCube * 0.7 + ridgeDetail * 0.3),
        smoothstep(0.0, 0.55, cookT) * 0.80
      );
      vec3 finalRgb = mix(warmBronzeMid, goldenCooked, smoothstep(0.22, 1.0, cookT));

      // Destellos dorados / caramelizados en las zonas de apoyo sobre la parrilla
      float grillWave = abs(sin((vMapUv.x * 5.5 + (grain - 0.5) * 0.08) * 3.14159265));
      float grillMark = (1.0 - smoothstep(0.0, 0.16, grillWave)) * smoothstep(0.25, 0.88, cookT);
      finalRgb = mix(finalRgb, vec3(0.36, 0.18, 0.06), grillMark * 0.24);

      float charFactor = smoothstep(0.34, 0.95, localBurn + (grain - 0.5) * 0.28 * localBurn);
      finalRgb = mix(finalRgb, vec3(0.014, 0.010, 0.008), charFactor);

      diffuseColor.rgb *= finalRgb;
    `);
  };
  material.customProgramCacheKey = () => 'morcilla-casing-golden-v3';

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
          // La morcilla se cocina a fuego suave (2500-4500 W/m²), por lo que empieza a dorarse desde ~36 °C superficiales
          const rateDown = Math.max(0, (surfDown - 36) / 68);
          sideHeat[down] = Math.min(1, sideHeat[down] + dt * rateDown * 0.014);
          sideHeat[up] = Math.min(1, sideHeat[up] + dt * rateDown * 0.0032);
        }
      }

      const thermalBase = THREE.MathUtils.clamp((meat.layersC[0] - 24) / 38, 0, 1);
      const brownA = THREE.MathUtils.clamp(meat.brown.a / 30, 0, 1);
      const brownB = THREE.MathUtils.clamp(meat.brown.b / 30, 0, 1);

      cookA.value = THREE.MathUtils.clamp(
        Math.max(brownA, sideHeat.a, thermalBase * (meat.faceDown === 'a' ? 0.74 : 0.46) + brownA * 0.45),
        0,
        1
      );
      cookB.value = THREE.MathUtils.clamp(
        Math.max(brownB, sideHeat.b, thermalBase * (meat.faceDown === 'b' ? 0.74 : 0.46) + brownB * 0.45),
        0,
        1
      );
      burnA.value = THREE.MathUtils.clamp(Math.max(meat.burn.a, meat.casingDamage.a) / 100, 0, 1);
      burnB.value = THREE.MathUtils.clamp(Math.max(meat.burn.b, meat.casingDamage.b) / 100, 0, 1);
      const avgCook = (cookA.value + cookB.value) * 0.5;
      const maxBurn = Math.max(burnA.value, burnB.value);
      material.roughness = 0.34 - avgCook * 0.07 + maxBurn * 0.46;
      material.clearcoat = (0.34 + avgCook * 0.12) * (1 - maxBurn * 0.85);
    }
  };
}

export function createMorcillaVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  const d = meat.definition, size = meat.dimensions;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();

  group.name = `meat-morcilla-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);

  const casing = createCasingMaterial();
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.7 });
  const pickMeshes: THREE.Mesh[] = [];

  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    const part = new THREE.Mesh(geometry, mat);
    part.castShadow = true; part.receiveShadow = true;
    part.userData.kind = 'meat'; part.userData.meatId = meat.id;
    body.add(part); pickMeshes.push(part);
    return part;
  }

  const capsuleGeo = createMorcillaCapsuleGeometry(size.widthM, d.thicknessM, scaleX);
  const bodyMesh = mesh(capsuleGeo, casing.material);
  bodyMesh.position.y = d.thicknessM / 2;

  // Ataduras de piolín en los extremos de la morcilla
  for(const sign of [-1, 1]) {
    const tie = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.008, 8), stringMat);
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

      const thermalRatio = THREE.MathUtils.clamp((meat.layersC[0] - 24) / 40, 0, 1);
      const cookRatio = Math.min(1, Math.max(((meat.brown.a + meat.brown.b) / 2) / 34, thermalRatio * 0.75));
      const burnRatio = Math.min(1, Math.max(meat.burn.a, meat.burn.b, meat.casingDamage.a, meat.casingDamage.b) / 100);
      stringMat.color.set(0xd8c8a0).lerp(new THREE.Color(0xb8843e), cookRatio).lerp(new THREE.Color(0x221710), burnRatio);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      for(const part of pickMeshes) part.userData.enabled = meat.location !== 'carried';
    }
  };
}