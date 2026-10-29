import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import type { MeatVisual } from './meat-visual.ts';
import { createMeatSurfaceGeometry } from './meat-surface-geometry.ts';

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

function surfaceMaterial(name: string): {
  material: THREE.MeshPhysicalMaterial;
  update: (brown: number, burn: number, layerC: number, juice: number) => void;
} {
  const { atlas, bump } = textures();
  const material = new THREE.MeshPhysicalMaterial({
    name, color: 0xffffff, map: atlas,
    bumpMap: bump, bumpScale: 0.00065, roughness: 0.53, metalness: 0,
    clearcoat: 0.16, clearcoatRoughness: 0.35, ior: 1.4, side: THREE.DoubleSide
  });
  const cook = { value: 0 }, char = { value: 0 }, set = { value: 0 };
  material.onBeforeCompile = shader => {
    shader.uniforms.matCook = cook; shader.uniforms.matChar = char; shader.uniforms.matSet = set;
    shader.fragmentShader = `
      uniform float matCook;
      uniform float matChar;
      uniform float matSet;
      float matHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float matNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(matHash(i), matHash(i + vec2(1.0, 0.0)), f.x),
          mix(matHash(i + vec2(0.0, 1.0)), matHash(i + vec2(1.0)), f.x), f.y);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 matUv = clamp(vMapUv, vec2(0.002), vec2(0.998));
      vec2 rawUv = vec2(matUv.x * 0.496 + 0.002, matUv.y);
      vec3 rawSurface = texture2D(map, rawUv).rgb;
      vec3 cookedSurface = texture2D(map, rawUv + vec2(0.5, 0.0)).rgb;
      float matFat = smoothstep(0.30, 0.72, min(rawSurface.r, min(rawSurface.g, rawSurface.b)));
      float pale = dot(rawSurface, vec3(0.30, 0.59, 0.11));
      vec3 warmSurface = mix(rawSurface, vec3(pale) * vec3(1.16, 1.03, 0.91), matSet * 0.38);
      vec3 matColor = mix(warmSurface, cookedSurface, smoothstep(0.0, 1.0, matCook));
      float matPatch = matNoise(matUv * vec2(8.0, 11.0)) * 0.6
        + matNoise(matUv * 23.0 + vec2(7.0, 3.0)) * 0.3 + matNoise(matUv * 51.0) * 0.1;
      float charMask = smoothstep(0.20, 0.94, matChar + (matPatch - 0.5) * 0.48 * matChar);
      matColor = mix(matColor, vec3(0.025, 0.016, 0.011), charMask);
      diffuseColor.rgb *= matColor;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor *= 1.0 - matFat * 0.22 * (1.0 - charMask);
      roughnessFactor = mix(roughnessFactor, 0.94, charMask);
    `);
  };
  material.customProgramCacheKey = () => 'matambre-atlas-surface-v2';
  return {
    material, update(brown, burn, layerC, juice) {
      cook.value = THREE.MathUtils.clamp(brown / 60, 0, 1);
      char.value = THREE.MathUtils.clamp(burn / 100, 0, 1);
      set.value = THREE.MathUtils.clamp((layerC - 35) / 45, 0, 1);
      const dryness = THREE.MathUtils.clamp((70 - juice) / 70, 0, 1);
      material.roughness = 0.53 - cook.value * 0.10 + dryness * 0.24;
      material.clearcoat = (0.16 + cook.value * 0.12) * (1 - dryness * 0.85);
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
  const edge = surfaceMaterial('matambre-edge');
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
      edge.update((meat.brown.a + meat.brown.b) / 2, Math.max(meat.burn.a, meat.burn.b) * 0.7, (meat.layersC[0] + meat.layersC[4]) / 2, meat.juiciness);
      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      mesh.userData.enabled = meat.location !== 'carried';
    }
  };
}
