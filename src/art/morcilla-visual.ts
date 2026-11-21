import * as THREE from 'three';
import { meatDimensions, MEAT_CATALOG } from '../sim/meatCatalog.ts';
import { clipFoodDetails } from './portion-mesh.ts';
import { cutSurface } from './cut-surface.ts';
import type { MeatModel } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createSausageCasing } from './sausage-casing.ts';

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

// Muestreo en espejo del atlas: mitad izquierda fresca, mitad derecha asada.
const MORCILLA_SAMPLE_GLSL = `
      vec2 repeatUv = vMapUv * vec2(1.6, 1.0);
      vec2 seamlessUv = clamp(1.0 - abs(fract(repeatUv) * 2.0 - 1.0), vec2(0.03, 0.04), vec2(0.92, 0.96));
      vec3 rawRgb = texture2D(map, vec2(seamlessUv.x * 0.45 + 0.015, seamlessUv.y)).rgb;
      vec3 cookedRgb = texture2D(map, vec2(seamlessUv.x * 0.45 + 0.525, seamlessUv.y)).rgb;
      // Bordó criollo en frío con dados de tocino bajo la tripa
      rawRgb = pow(max(rawRgb, vec3(0.001)), vec3(0.95)) * vec3(1.12, 0.95, 1.02);
      float fatSpeck = smoothstep(0.18, 0.45, min(rawRgb.r, min(rawRgb.g, rawRgb.b)));
      rawRgb = mix(rawRgb, vec3(0.80, 0.72, 0.64), fatSpeck * 0.4);
`;

// Piolín de atar: se tuesta y se ahúma.
const STRING_COOKED = new THREE.Color(0x8e6c48), STRING_BURNT = new THREE.Color(0x221710);

export function createMorcillaVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  const d = MEAT_CATALOG[meat.definition.kind], size = meat.portion ? meatDimensions(d) : meat.dimensions;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();

  group.name = `meat-morcilla-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);

  const textures = textureSet();
  const casing = createSausageCasing(textures.map, textures.bump, {}, {
    name: 'morcilla-casing', cacheKey: 'morcilla-casing-v4', lengthM: size.widthM, thicknessM: d.thicknessM,
    sampleGlsl: MORCILLA_SAMPLE_GLSL, ramp: 'mtMorcillaRamp', fillingRaw: 0x3a2226, fillingCooked: 0x4a2622,
    roughness: 0.36, cookedRoughness: 0.68, clearcoat: 0.32, cookedGloss: -0.5, photoDetail: 0.45,
    heat: { surfaceStartC: 36, surfaceRangeC: 68, downRate: 0.014, upRate: 0.0032,
      thermalStartC: 24, thermalRangeC: 38, brownFull: 30, downWeight: 0.74, upWeight: 0.46 },
  });
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
  if (meat.portion) clipFoodDetails(pickMeshes, meat.portion, cutSurface(meat));

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
      stringMat.color.set(0xd8c8a0).lerp(STRING_COOKED, cookRatio).lerp(STRING_BURNT, burnRatio);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      for(const part of pickMeshes) part.userData.enabled = meat.location !== 'carried';
    }
  };
}
