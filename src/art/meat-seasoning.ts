import * as THREE from 'three';
import type { MeatModel } from '../sim/meat.ts';
import type { Seasoning, SeasoningGrain } from '../sim/seasoning.ts';
import type { MeatVisual } from './meat-visual.ts';

const colors: Record<Seasoning, number[]> = {
  salt: [0xf6f2e8, 0xfffcf5, 0xe5dfd2, 0xf3eee4], pepper: [0x35281e, 0x65513c, 0x40352b],
  chimichurri: [0x486021, 0x596930, 0x763526, 0xb69b5f], brine: [0xc4a582, 0xaa8763],
};
type Deposit = { grain: SeasoningGrain; landing: THREE.Vector3; time: number; slot: number };
const crystal = () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2, 2, 2, 2), pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const bevel = Math.abs(x * y * z) > .9 ? .80 : 1;
    pos.setXYZ(i, x * bevel, y * bevel, z * bevel);
  }
  geometry.computeVertexNormals();
  return geometry;
};

export function createSeasoningView(view: MeatVisual, meat: MeatModel) {
  const body = view.pickMeshes[0].parent!;
  const batches = new Map<Seasoning, THREE.InstancedMesh>();
  const falling: Deposit[] = [];
  const dummy = new THREE.Object3D(), ray = new THREE.Raycaster(), direction = new THREE.Vector3();
  let seen = 0, initial = true;
  function batch(kind: Seasoning) {
    let mesh = batches.get(kind);
    if (!mesh) {
      const material = new THREE.MeshPhysicalMaterial({ roughness: kind === 'pepper' ? .84 : .44,
        clearcoat: kind === 'salt' ? .32 : kind === 'brine' ? .6 : .06, flatShading: true });
      mesh = new THREE.InstancedMesh(kind === 'salt' ? crystal() : new THREE.IcosahedronGeometry(1, 0), material, 900);
      mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.name = 'condimento-' + kind;
      body.add(mesh); batches.set(kind, mesh);
    }
    return mesh;
  }
  function pose(drop: Deposit, progress: number, rebound = 0, visible = true) {
    const { grain, landing, slot } = drop, s = grain.seed, sign = grain.face === 'b' ? 1 : -1;
    const mesh = batches.get(grain.kind)!;
    const size = grain.kind === 'salt' ? .00065 + s * .0009 : grain.kind === 'pepper' ? .00065 + s * .0006 : .0016 + s * .0012;
    dummy.position.copy(landing);
    dummy.position.x += (grain.origin.x - grain.point.x + Math.sin(s * 57) * .002) * (1 - progress);
    dummy.position.z -= (grain.origin.z - grain.point.z + Math.cos(s * 87) * .002) * (1 - progress);
    dummy.position.y += sign * (size * .50 + .074 * (1 - progress * progress) + rebound);
    dummy.rotation.set(s * 12 + (1 - progress) * 1.7, s * 91, s * 55);
    dummy.scale.set(size * (.75+.4*s), size * (grain.kind === 'salt' ? .55+.2*s : .46), size * (grain.kind === 'brine' ? 1.8 : 1.1));
    if (!visible) dummy.scale.setScalar(0);
    if (grain.kind === 'chimichurri' || grain.kind === 'brine') dummy.rotation.set(0, s * 45, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(slot, dummy.matrix); mesh.instanceMatrix.needsUpdate = true;
  }
  return {
    update(time: number) {
      if (seen > meat.grains.length) {
        for (const mesh of batches.values()) mesh.count = 0;
        falling.length = 0; seen = 0;
      }
      if (seen < meat.grains.length) body.updateWorldMatrix(true, true);
      const center = meat.portion?.centerM;
      for (; seen < meat.grains.length; seen++) {
        const grain = meat.grains[seen], top = grain.face === 'b';
        const x = grain.point.x - (center?.x ?? 0), z = -(grain.point.z - (center?.z ?? 0));
        const origin = body.localToWorld(new THREE.Vector3(x, top ? meat.definition.thicknessM + .08 : -.08, z));
        direction.set(0, top ? -1 : 1, 0).transformDirection(body.matrixWorld);
        ray.set(origin, direction);
        const hit = ray.intersectObjects(view.pickMeshes, false)[0];
        if (!hit) continue;
        const mesh = batch(grain.kind), slot = mesh.count++;
        const palette = colors[grain.kind];
        mesh.setColorAt(slot, new THREE.Color(palette[Math.floor(grain.seed * palette.length)]));
        mesh.instanceColor!.needsUpdate = true;
        const drop = { grain, landing: body.worldToLocal(hit.point), time: time + grain.seed*.05, slot };
        if (initial || meat.location !== 'board') pose(drop, 1);
        else falling.push(drop);
      }
      for (let i = falling.length - 1; i >= 0; i--) {
        const drop = falling[i];
        const age = meat.location === 'board' ? time-drop.time : 1;
        const flight = .19+.07*drop.grain.seed, progress = THREE.MathUtils.clamp(age/flight,0,1);
        const t = THREE.MathUtils.clamp((age-flight)/.058,0,1);
        const rebound = drop.grain.kind === 'salt' || drop.grain.kind === 'pepper' ? .0017 * 4*t*(1-t) : 0;
        pose(drop, progress, rebound, age >= 0);
        if (t === 1) falling.splice(i, 1);
      }
      initial = false;
    },
  };
}
