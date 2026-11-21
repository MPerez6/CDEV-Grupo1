import * as THREE from 'three';
import { meatDimensions, MEAT_CATALOG } from '../sim/meatCatalog.ts';
import { clipFoodDetails } from './portion-mesh.ts';
import { cutSurface } from './cut-surface.ts';
import type { MeatModel } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createSausageCasing } from './sausage-casing.ts';

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

// Hilo de atar: se tuesta y se ahúma, sin volverse naranja.
const TWINE_COOKED = new THREE.Color(0x9a7650), TWINE_BURNT = new THREE.Color(0x2a1d14);

// Muestreo de la tripa: crudo de chorizo-raw-sides (sin la franja negra) y asado del centro dorado.
const CHORIZO_SAMPLE_GLSL = `
      vec2 repeatUv = vMapUv * vec2(1.15, 1.0);
      vec2 seamlessUv = 1.0 - abs(fract(repeatUv) * 2.0 - 1.0);
      vec3 rawRgb = texture2D(map, vec2(mix(0.06, 0.94, seamlessUv.x), mix(0.06, 0.84, seamlessUv.y))).rgb;
      rawRgb = clamp(pow(max(rawRgb, vec3(0.001)), vec3(0.92)) * vec3(1.08, 1.0, 1.0), 0.0, 1.0);
      float fatSpeck = smoothstep(0.40, 0.70, min(rawRgb.r, min(rawRgb.g, rawRgb.b)));
      vec3 cookedRgb = texture2D(chorizoCookedMap, vec2(mix(0.54, 0.92, seamlessUv.x), mix(0.18, 0.86, seamlessUv.y))).rgb;
`;

export function createChorizoVisual(meat: MeatModel, scaleX: number, _scaleZ: number): MeatVisual {
  const d = MEAT_CATALOG[meat.definition.kind], size = meat.portion ? meatDimensions(d) : meat.dimensions;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();

  group.name = `meat-chorizo-${meat.id}`;
  projection.scale.set(scaleX, 3, _scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);

  const textures = textureSet();
  const casing = createSausageCasing(textures.rawMap, textures.bump, { chorizoCookedMap: { value: textures.cookedMap } }, {
    name: 'chorizo-casing', cacheKey: 'chorizo-casing-v5', lengthM: size.widthM, thicknessM: d.thicknessM,
    sampleGlsl: CHORIZO_SAMPLE_GLSL, ramp: 'mtChorizoRamp', fillingRaw: 0xc8705f, fillingCooked: 0x9c4f36,
    roughness: 0.40, cookedRoughness: 0.30, clearcoat: 0.30, cookedGloss: 0.7, photoDetail: 0.22,
    heat: { surfaceStartC: 42, surfaceRangeC: 85, downRate: 0.012, upRate: 0.0028,
      thermalStartC: 26, thermalRangeC: 46, brownFull: 36, downWeight: 0.68, upWeight: 0.42 },
  });
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
  if (meat.portion) clipFoodDetails(pickMeshes, meat.portion, cutSurface(meat));

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
      fatMat.color.set(0xeadcc0).lerp(TWINE_COOKED, cookRatio).lerp(TWINE_BURNT, burnRatio);

      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      for(const part of pickMeshes) part.userData.enabled = meat.location !== 'carried';
    }
  };
}

