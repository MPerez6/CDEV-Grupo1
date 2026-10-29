import * as THREE from 'three';
import type { EmberPiece } from '../sim/embers.ts';

export type EmberScatter = ReturnType<typeof createEmberScatter>;

function seededRandom(seed: number): () => number {
  let state = (seed ^ 0x6d2b79f5) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Una porción simulada se dibuja como varios fragmentos, sin multiplicar masa ni calor. */
export function createEmberScatter(seed: number, options: { spreadX: number; spreadZ: number; size: number; count?: number }): {
  group: THREE.Group;
  fragments: THREE.InstancedMesh;
  update: (ember: Readonly<EmberPiece>, realSeconds: number, options?: { heat?: number; fallFrom?: THREE.Vector3; fallProgress?: number }) => void;
  dispose: () => void;
} {
  const random = seededRandom(seed);
  const count = options.count ?? 18 + seed % 5;
  const raw = new THREE.DodecahedronGeometry(1, 0);
  const vertices = raw.getAttribute('position');
  // Deformar por coordenada mantiene unidas las caras compartidas.
  for(let i = 0;i < vertices.count;i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const scale = 0.86 + (Math.sin(x * 17.1 + y * 23.7 + z * 11.3 + seed * 0.13) + 1) * 0.12;
    vertices.setXYZ(i, x * scale, y * scale, z * scale);
  }
  // Superficie carbonizada, pequeñas caras al rojo y parches de ceniza.
  const buckets = [[], [], []] as number[][];
  for(let i = 0;i < vertices.count;i += 3) {
    const choice = random();
    const material = choice < 0.26 ? 1 : choice > 0.89 ? 2 : 0;
    for(let v = i;v < i + 3;v++) buckets[material].push(vertices.getX(v), vertices.getY(v), vertices.getZ(v));
  }
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  buckets.forEach((bucket, index) => {
    geometry.addGroup(positions.length / 3, bucket.length / 3, index);
    positions.push(...bucket);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  raw.dispose();
  const skin = new THREE.MeshStandardMaterial({ color: 0x292826, roughness: 1, emissive: 0x5a1004 });
  const core = new THREE.MeshStandardMaterial({ color: 0x9c3215, roughness: 1, emissive: 0xe83c0a });
  const ash = new THREE.MeshStandardMaterial({ color: 0x938b7d, roughness: 1, emissive: 0x3b1005 });
  const fragments = new THREE.InstancedMesh(geometry, [skin, core, ash], count);
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fragments.castShadow = true;
  fragments.receiveShadow = true;
  fragments.frustumCulled = false;
  const group = new THREE.Group();
  group.name = 'ember-portion';
  group.userData.emberId = seed;
  group.add(fragments);
  const poses: { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3; delay: number }[] = [];
  for(let i = 0;i < count;i++) {
    let x = 0, z = 0;
    for(let attempt = 0;attempt < 8;attempt++) {
      const angle = i * 2.39996 + random() * 0.9;
      const radius = Math.sqrt(random());
      x = Math.cos(angle) * radius * options.spreadX;
      z = Math.sin(angle) * radius * options.spreadZ;
      if(poses.every(p => Math.hypot(p.position.x - x, p.position.z - z) > options.size * 1.1)) break;
    }
    const scale = new THREE.Vector3(
      options.size * (0.75 + random() * 0.75),
      options.size * (0.60 + random() * 0.50),
      options.size * (0.75 + random() * 0.70),
    );
    poses.push({
      position: new THREE.Vector3(x, scale.y * 1.10, z), scale,
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 0.5, random() * Math.PI * 2, random() * 0.4)),
      delay: random() * 0.16
    });
  }
  const transform = new THREE.Object3D();
  const coldColor = new THREE.Color(0x292826), ashColor = new THREE.Color(0xaaa292);
  const hotColor = new THREE.Color(0xa43618);
  function update(ember: Readonly<EmberPiece>, realSeconds: number,
    state: { heat?: number; fallFrom?: THREE.Vector3; fallProgress?: number } = {}): void {
    const remaining = ember.initialMassG > 0 ? THREE.MathUtils.clamp(ember.massG / ember.initialMassG, 0, 1) : 0;
    const heat = remaining * (state.heat ?? 1);
    const size = 0.50 + Math.cbrt(remaining) * 0.50;
    poses.forEach((pose, i) => {
      const t = THREE.MathUtils.clamp(((state.fallProgress ?? 1) - pose.delay) / (1 - pose.delay), 0, 1);
      transform.position.copy(pose.position);
      transform.position.y *= size;
      // Cada fragmento se suelta con una pequeña diferencia y abre su dispersión al caer.
      if(state.fallFrom) {
        transform.position.x *= 0.20 + t * 0.80;
        transform.position.z *= 0.20 + t * 0.80;
        transform.position.addScaledVector(state.fallFrom, 1 - t * t);
      }
      transform.scale.copy(pose.scale).multiplyScalar(size);
      transform.quaternion.copy(pose.rotation);
      transform.updateMatrix();
      fragments.setMatrixAt(i, transform.matrix);
    });
    fragments.instanceMatrix.needsUpdate = true;
    skin.color.copy(coldColor).lerp(ashColor, 1 - remaining);
    skin.emissiveIntensity = heat * 0.08;
    core.color.copy(ashColor).lerp(hotColor, heat);
    core.emissiveIntensity = heat * (0.65 + Math.sin(realSeconds * 4 + seed) * 0.035);
    ash.color.copy(ashColor);
    ash.emissiveIntensity = heat * 0.02;
  }
  function dispose(): void {
    group.removeFromParent();
    geometry.dispose();
    skin.dispose(); core.dispose(); ash.dispose();
    fragments.dispose();
  }
  return { group, fragments, update, dispose };
}
