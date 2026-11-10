import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createMeatSurfaceGeometry } from './meat-surface-geometry.ts';

let sharedAtlas: THREE.Texture | undefined;
let sharedBump: THREE.Texture | undefined;

function textureSet(): { atlas: THREE.Texture; bump: THREE.Texture } {
  if(!sharedAtlas) {
    const placeholder = new Uint8Array([198, 78, 82, 255, 152, 86, 42, 255]);
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
    sharedAtlas.name = 'costilla-raw-cooked-atlas';
    sharedAtlas.colorSpace = THREE.SRGBColorSpace;
    sharedAtlas.anisotropy = 8;
    if(typeof document !== 'undefined') {
      sharedAtlas.image = new ImageData(new Uint8ClampedArray(placeholder), 2, 1);
    } else {
      sharedAtlas.needsUpdate = true;
    }

    sharedBump = sharedAtlas.clone();
    sharedBump.colorSpace = THREE.NoColorSpace;
    sharedBump.repeat.set(0.492, 0.992);
    sharedBump.offset.set(0.004, 0.004);
    if(typeof document === 'undefined') sharedBump.needsUpdate = true;
  }
  return { atlas: sharedAtlas, bump: sharedBump! };
}

function surfaceMaterial(side: Side, thickness: number, edge = false): {
  material: THREE.MeshPhysicalMaterial;
  update: (meat: MeatModel) => void;
} {
  const { atlas, bump } = textureSet();
  const material = new THREE.MeshPhysicalMaterial({
    name: edge ? 'costilla-edge' : `costilla-face-${side}`,
    map: atlas,
    bumpMap: bump,
    bumpScale: edge ? 0.00045 : (side === 'a' ? 0.00055 : 0.00068),
    color: 0xffffff,
    metalness: 0,
    roughness: side === 'a' ? 0.50 : 0.46,
    clearcoat: side === 'a' ? 0.20 : 0.24,
    clearcoatRoughness: 0.32,
    ior: 1.42,
    side: THREE.DoubleSide,
  });

  const cook = { value: 0 };
  const burn = { value: 0 };
  const set = { value: 0 };
  let sideHeat = 0;
  let lastSimSeconds = 0;

  material.onBeforeCompile = shader => {
    shader.uniforms.costillaCook = cook;
    shader.uniforms.costillaBurn = burn;
    shader.uniforms.costillaSet = set;

    shader.vertexShader = 'varying float costillaHeight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      costillaHeight = clamp(position.y / ${Math.max(0.005, thickness).toFixed(6)}, 0.0, 1.0);
    `);

    shader.fragmentShader = `
      uniform float costillaCook;
      uniform float costillaBurn;
      uniform float costillaSet;
      varying float costillaHeight;
      float costillaHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float costillaNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(costillaHash(i), costillaHash(i + vec2(1.0, 0.0)), f.x),
          mix(costillaHash(i + vec2(0.0, 1.0)), costillaHash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 baseUv = clamp(vMapUv, vec2(0.008), vec2(0.992));
      // Mapeamos la franja [0.10, 0.65] del atlas para mostrar carne intercostal y veteado de grasa sin los huesos 2D superiores
      float sampleY = ${edge
        ? 'clamp(0.12 + costillaHeight * 0.52, 0.10, 0.65)'
        : 'mix(0.10, 0.65, baseUv.y)'};

      // Mitad izquierda = costilla cruda; mitad derecha = costilla cocida
      vec2 rawUv = vec2(baseUv.x * 0.484 + 0.006, sampleY);
      vec2 cookedUv = vec2(baseUv.x * 0.484 + 0.506, sampleY);

      vec3 rawCol = texture2D(map, rawUv).rgb;
      vec3 cookedCol = texture2D(map, cookedUv).rgb;

      // Realce de carne vacuna fresca y veteado de grasa blanca cremosa
      rawCol = pow(max(rawCol, vec3(0.01)), vec3(0.76)) * vec3(1.20, 0.98, 0.94);
      rawCol = clamp(rawCol, 0.0, 1.0);

      float fatMask = smoothstep(0.30, 0.68, min(rawCol.r, min(rawCol.g, rawCol.b)));
      float marbleNoise = costillaNoise(baseUv * vec2(14.0, 18.0)) * 0.65
        + costillaNoise(baseUv * vec2(34.0, 42.0)) * 0.35;

      ${edge ? `
        // Vetas horizontales de grasa e intercostales propias de la tira de asado / costillar
        float wave = sin(baseUv.x * 28.0) * 0.03 + (marbleNoise - 0.5) * 0.06;
        float midFatBand = smoothstep(0.30, 0.38, costillaHeight + wave)
          * (1.0 - smoothstep(0.42, 0.50, costillaHeight + wave));
        float topFatCap = smoothstep(0.72, 0.85, costillaHeight + wave * 0.8);
        float edgeFat = clamp(midFatBand * 0.78 + topFatCap * 0.92, 0.0, 1.0);
        rawCol = mix(rawCol, vec3(0.95, 0.89, 0.79), edgeFat * 0.88);
        fatMask = max(fatMask, edgeFat);
      ` : `
        // En la cara superior (B) acentuamos la cobertura de grasa veteada; en la cara ósea (A) la membrana intercostal
        float surfaceFat = smoothstep(0.55, 0.82, marbleNoise + ${side === 'b' ? '0.16' : '-0.04'});
        rawCol = mix(rawCol, vec3(0.96, 0.90, 0.80), surfaceFat * ${side === 'b' ? '0.44' : '0.22'});
        fatMask = max(fatMask, surfaceFat);
      `}

      // Re-graduamos la textura cocida para lograr una tonalidad doradita ámbar / bronce asado en vez de marrón oscuro
      vec3 liftedCooked = pow(max(cookedCol, vec3(0.02)), vec3(0.58)) * vec3(1.44, 1.20, 0.82);
      float cookedLuma = clamp(dot(liftedCooked, vec3(0.33, 0.50, 0.17)), 0.0, 1.0);
      vec3 goldenRoast = mix(
        vec3(0.58, 0.32, 0.11),
        vec3(0.91, 0.61, 0.23),
        smoothstep(0.10, 0.86, cookedLuma * 0.72 + marbleNoise * 0.28)
      );
      vec3 goldenCooked = mix(liftedCooked, goldenRoast, 0.66);

      // Dorado miel crocante en la grasa intercostal y de cobertura (Maillard)
      vec3 crispyFat = mix(vec3(0.86, 0.58, 0.20), vec3(0.96, 0.74, 0.34), marbleNoise);
      goldenCooked = mix(goldenCooked, crispyFat, fatMask * 0.74);

      // Transición térmica inicial (sellado cálido hacia dorado suave)
      float luma = dot(rawCol, vec3(0.30, 0.59, 0.11));
      vec3 warmSeal = mix(vec3(0.78, 0.52, 0.32), vec3(0.94, 0.80, 0.50), fatMask);
      vec3 searedRaw = mix(rawCol, mix(vec3(luma) * vec3(1.16, 1.00, 0.84), warmSeal, 0.52), costillaSet * 0.46);

      // Progresión continua: crudo -> dorado manteca/ámbar claro -> dorado parrillero intenso
      float cookT = smoothstep(0.0, 1.0, costillaCook);
      vec3 midGolden = mix(searedRaw, mix(goldenCooked, vec3(0.89, 0.63, 0.29), 0.38), smoothstep(0.0, 0.55, cookT));
      vec3 meatColor = mix(midGolden, goldenCooked, smoothstep(0.28, 1.0, cookT));

      // Marcas orgánicas caramelizadas (ámbar tostado) de los hierros de la parrilla en las caras principales
      ${!edge ? `
        float grillWave = abs(sin((baseUv.x * 7.5 + (marbleNoise - 0.5) * 0.12) * 3.14159265));
        float grillBar = (1.0 - smoothstep(0.0, 0.15, grillWave)) * smoothstep(0.24, 0.88, cookT);
        meatColor = mix(meatColor, vec3(0.45, 0.24, 0.08), grillBar * 0.25);
      ` : ''}

      // Carbonizado progresivo e irregular solo por exceso real de fuego
      float charNoise = costillaNoise(baseUv * vec2(11.0, 13.0)) * 0.65
        + costillaNoise(baseUv * 31.0 + vec2(4.2, 8.7)) * 0.35;
      float charMask = smoothstep(0.26, 0.94, costillaBurn + (charNoise - 0.5) * 0.42 * costillaBurn);
      meatColor = mix(meatColor, vec3(0.025, 0.016, 0.011), charMask);

      diffuseColor.rgb *= meatColor;
    `);

    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor *= 1.0 - fatMask * 0.26 * (1.0 - charMask);
      roughnessFactor = mix(roughnessFactor, 0.94, charMask);
    `);
  };

  material.customProgramCacheKey = () => `costilla-surface-${side}-${edge}-v4`;

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

      const sideBrown = edge ? (meat.brown.a + meat.brown.b) * 0.5 : meat.brown[side];
      const sideBurn = edge ? Math.max(meat.burn.a, meat.burn.b) * 0.85 : meat.burn[side];
      const layerC = edge
        ? (meat.layersC[0] + meat.layersC[4]) * 0.5
        : meat.layersC[side === 'a' ? 0 : 4];
      const dryness = THREE.MathUtils.clamp((70 - meat.juiciness) / 70, 0, 1);

      const brownProgress = THREE.MathUtils.clamp(sideBrown / 38, 0, 1);
      const thermalProgress = THREE.MathUtils.clamp((layerC - 28) / 48, 0, 1);
      cook.value = THREE.MathUtils.clamp(
        Math.max(brownProgress, sideHeat, thermalProgress * 0.58 + brownProgress * 0.52),
        0,
        1
      );
      burn.value = THREE.MathUtils.clamp(sideBurn / 100, 0, 1);
      set.value = THREE.MathUtils.clamp((layerC - 26) / 38, 0, 1);

      material.roughness = (side === 'a' ? 0.48 : 0.44) - cook.value * 0.10 + dryness * 0.20 + burn.value * 0.28;
      material.clearcoat = (0.24 + cook.value * 0.12) * (1 - dryness * 0.72) * (1 - burn.value * 0.85);
    }
  };
}

/**
 * Genera el volumen orgánico de la costilla a partir de `createMeatSurfaceGeometry`
 * y modela las ondulaciones intercostales entre hueso y hueso.
 */
export function createCostillaGeometry(meat: MeatModel): THREE.BufferGeometry {
  const geometry = createMeatSurfaceGeometry(meat, {
    edgeBlendM: 0.009,
    topEdge: 0.78,
    topCenter: 0.96,
    bottomEdge: 0.10,
    bottomCenter: 0.03,
    rippleTop: 0.026,
    rippleBottom: 0.020,
  });

  const pos = geometry.getAttribute('position');
  const widthM = Math.max(0.05, meat.dimensions.widthM);
  const depthM = Math.max(0.05, meat.dimensions.depthM);
  const thicknessM = Math.max(0.01, meat.definition.thicknessM);
  const boneCount = Math.max(1, meat.definition.boneCount || 4);

  for(let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const normX = x / widthM + 0.5;
    const normZ = z / depthM;
    // Onda transversal que hunde suavemente los valles intercostales y abomba la carne entre costillas
    const ribPhase = normX * boneCount * Math.PI * 2;
    const intercostalWave = -Math.cos(ribPhase) * 0.5 + 0.5;
    // Curvatura natural del arco costal a lo largo de Z
    const archZ = (1 - Math.min(1, normZ * normZ * 3.2)) * thicknessM * 0.07;
    const heightRatio = THREE.MathUtils.clamp(y / thicknessM, 0, 1);
    const undulation = (intercostalWave - 0.5) * thicknessM * 0.11 * (0.35 + 0.65 * heightRatio);

    pos.setY(i, y + undulation + archZ);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Crea la geometría anatómica de un hueso de costilla (arco costal aplanado con extremos biselados).
 */
function createRibBoneGeometry(ribWidth: number, ribHeight: number, ribLength: number): THREE.BufferGeometry {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, -ribHeight * 0.12, -ribLength * 0.5),
    new THREE.Vector3(0, ribHeight * 0.22, 0),
    new THREE.Vector3(0, -ribHeight * 0.12, ribLength * 0.5)
  );

  const lengthSegments = 18;
  const radialSegments = 14;
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

  for(let i = 0; i <= lengthSegments; i++) {
    const u = i / lengthSegments;
    curve.getPoint(u, center);
    curve.getTangent(u, tangent).normalize();
    binormal.crossVectors(tangent, up).normalize();
    normal.crossVectors(binormal, tangent).normalize();

    // Ligero ensanchamiento en la cabeza costal y bisel suave en las puntas aserradas
    const endTaper = Math.min(1, Math.min(u, 1 - u) / 0.06);
    const profileScale = (0.92 + 0.14 * Math.sin(u * Math.PI)) * (0.78 + 0.22 * endTaper);

    for(let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const angle = v * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Sección transversal elíptica aplanada con cara externa más plana (hueso de costilla real)
      const flatten = sin < 0 ? 0.72 : 1.0;
      const dx = cos * (ribWidth * 0.5) * profileScale;
      const dy = sin * (ribHeight * 0.5) * flatten * profileScale;

      vertex.copy(center)
        .addScaledVector(binormal, dx)
        .addScaledVector(normal, dy);
      positions.push(vertex.x, vertex.y, vertex.z);

      vertexNormal.copy(binormal).multiplyScalar(cos / Math.max(0.001, ribWidth))
        .addScaledVector(normal, sin / Math.max(0.001, ribHeight * flatten))
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

export function createCostillaVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  const d = meat.definition, size = meat.dimensions;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();

  group.name = `meat-costilla-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);

  const surfaces = {
    a: surfaceMaterial('a', d.thicknessM),
    b: surfaceMaterial('b', d.thicknessM),
  };
  const edge = surfaceMaterial('a', d.thicknessM, true);

  const boneMat = new THREE.MeshPhysicalMaterial({
    name: 'costilla-bone-cortex',
    color: 0xefe6cf,
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.14,
    clearcoatRoughness: 0.45,
  });

  const marrowMat = new THREE.MeshStandardMaterial({
    name: 'costilla-bone-marrow',
    color: 0x8f3d34,
    roughness: 0.86,
  });

  const pickMeshes: THREE.Mesh[] = [];

  function registerMesh(part: THREE.Mesh): THREE.Mesh {
    part.castShadow = true;
    part.receiveShadow = true;
    part.userData.kind = 'meat';
    part.userData.meatId = meat.id;
    body.add(part);
    pickMeshes.push(part);
    return part;
  }

  // Volumen principal orgánico con grupos de materiales [cara A, cara B, borde]
  const meatMesh = registerMesh(
    new THREE.Mesh(createCostillaGeometry(meat), [surfaces.a.material, surfaces.b.material, edge.material])
  );
  meatMesh.name = 'costilla-organic-volume';

  // Costillas anatómicas curvadas que atraviesan el corte y asoman en los extremos
  const boneCount = Math.max(1, d.boneCount || 4);
  const ribSpacing = size.widthM / boneCount;
  const ribWidth = Math.min(0.022, ribSpacing * 0.42);
  const ribHeight = Math.max(0.009, d.thicknessM * 0.46);
  const ribLength = size.depthM * 1.03;

  const ribGeo = createRibBoneGeometry(ribWidth, ribHeight, ribLength);
  const capOuterGeo = new THREE.CylinderGeometry(ribWidth * 0.44, ribWidth * 0.44, 0.002, 12);
  capOuterGeo.rotateX(Math.PI / 2);
  capOuterGeo.scale(1, (ribHeight / ribWidth) * 0.82, 1);

  const capMarrowGeo = new THREE.CylinderGeometry(ribWidth * 0.28, ribWidth * 0.28, 0.0026, 10);
  capMarrowGeo.rotateX(Math.PI / 2);
  capMarrowGeo.scale(1, (ribHeight / ribWidth) * 0.76, 1);

  for(let i = 0; i < boneCount; i++) {
    const xPos = (i + 0.5) / boneCount * size.widthM - size.widthM / 2;
    const yPos = d.thicknessM * 0.24;

    const rib = registerMesh(new THREE.Mesh(ribGeo, boneMat));
    rib.name = `costilla-rib-${i}`;
    rib.position.set(xPos, yPos, 0);

    // Corte transversal del hueso visible en ambos extremos (corteza ósea + médula esponjosa)
    for(const sign of [-1, 1] as const) {
      const zEnd = sign * (ribLength * 0.495);
      const yEnd = yPos - ribHeight * 0.11;

      const cortexCap = registerMesh(new THREE.Mesh(capOuterGeo, boneMat));
      cortexCap.position.set(xPos, yEnd, zEnd);

      const marrowCap = registerMesh(new THREE.Mesh(capMarrowGeo, marrowMat));
      marrowCap.position.set(xPos, yEnd, zEnd + sign * 0.0003);
    }
  }

  return {
    group,
    pickMeshes,
    update() {
      orientation.rotation.y = meat.quarterTurns * Math.PI / 2;
      body.rotation.x = meat.faceDown === 'a' ? 0 : Math.PI;
      body.position.y = meat.faceDown === 'a' ? 0 : d.thicknessM;

      surfaces.a.update(meat);
      surfaces.b.update(meat);
      edge.update(meat);

      const layerAvg = (meat.layersC[0] + meat.layersC[4]) * 0.5;
      const thermalRatio = THREE.MathUtils.clamp((layerAvg - 28) / 50, 0, 1);
      const cookRatio = THREE.MathUtils.clamp(
        Math.max((meat.brown.a + meat.brown.b) / 76, thermalRatio * 0.65),
        0,
        1
      );
      const burnRatio = THREE.MathUtils.clamp(Math.max(meat.burn.a, meat.burn.b) / 100, 0, 1);

      boneMat.color.set(0xf3ead4)
        .lerp(new THREE.Color(0xd69b4e), cookRatio)
        .lerp(new THREE.Color(0x281d14), burnRatio);
      boneMat.roughness = 0.56 - cookRatio * 0.08 + burnRatio * 0.32;

      marrowMat.color.set(0x983e35)
        .lerp(new THREE.Color(0x6e3d20), cookRatio)
        .lerp(new THREE.Color(0x160f0b), burnRatio);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      for(const part of pickMeshes) part.userData.enabled = meat.location !== 'carried';
    }
  };
}
