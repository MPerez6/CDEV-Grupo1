import * as THREE from 'three';
import { SEASONINGS, type Seasoning } from '../sim/seasoning.ts';
import { makePrepProp, jarHeight, type PrepProp } from '../art/prep-props.ts';
import type { PreparationTool } from '../gameplay/actions.ts';
import type { InteractionTarget } from '../gameplay/targets.ts';
import type { CutStroke } from '../sim/cutOutline.ts';
import { PREP_BOARD, PREP_TABLE, boardPosition } from './layout.ts';
import { label, mark } from './primitives.ts';
import { cuttingBoardTexture, tiled, woodPlankTexture } from './textures.ts';

export function createPrepTable(scene: THREE.Scene, clickable: THREE.Object3D[], addLabel = label) {
  const { x, z, width, depth, top } = PREP_TABLE;
  const plank = new THREE.MeshStandardMaterial({ color: 0x9e6f42,
    map: typeof document === 'undefined' ? null : tiled(woodPlankTexture(), 2, 1), roughness: 0.83 });
  const legs = new THREE.MeshStandardMaterial({ color: 0x583820, roughness: 0.9 });
  const cuttingBoard = new THREE.MeshStandardMaterial({ color: 0xc88d50,
    map: typeof document === 'undefined' ? null : cuttingBoardTexture(), roughness: 0.78 });
  function part(geometry: THREE.BufferGeometry, px: number, y: number, pz: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, y, pz); mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  part(new THREE.BoxGeometry(width, 0.12, depth), x, top - 0.06, z, plank);
  part(new THREE.BoxGeometry(width - 0.19, 0.16, depth - 0.16), x, top - 0.17, z, legs);
  part(new THREE.BoxGeometry(width - 0.25, 0.055, depth - 0.25), x, 0.31, z, plank);
  for (const dx of [-width / 2 + 0.15, width / 2 - 0.15]) {
    for (const dz of [-depth / 2 + 0.15, depth / 2 - 0.15]) {
      part(new THREE.BoxGeometry(0.13, top - 0.12, 0.13), x + dx, (top - 0.12) / 2, z + dz, legs);
    }
  }
  const p = boardPosition();
  mark(part(new THREE.BoxGeometry(PREP_BOARD.width, PREP_BOARD.thickness, PREP_BOARD.depth),
    p.x, top + PREP_BOARD.thickness / 2, p.z, cuttingBoard), 'board', clickable);

  const tabletop = new Map<PrepProp, {model: THREE.Group; hit: THREE.Mesh}>();
  const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const jars: Seasoning[] = ['salt', 'pepper', 'chimichurri', 'brine'];
  for (const [i, kind] of jars.entries()) {
    const px = x + (i - 1.5) * .38, pz = z - .53, h = jarHeight[kind];
    const model = makePrepProp(kind); model.name = 'mesa-' + kind; model.position.set(px, top, pz); scene.add(model);
    const hit = part(new THREE.CylinderGeometry(kind === 'chimichurri' ? .105 : .074, .074, h + .02, 16),
      px, top + h / 2, pz, pickMaterial);
    hit.castShadow = hit.receiveShadow = false;
    mark(hit, 'seasoning', clickable, SEASONINGS.indexOf(kind));
    tabletop.set(kind,{model,hit});
  }
  const knifeX = x + width / 2 - .12, knifeZ = p.z + .13;
  const knife = makePrepProp('knife'); knife.name = 'mesa-cuchillo'; knife.position.set(knifeX, top + .014, knifeZ); knife.rotation.y = -.07; scene.add(knife);
  const knifeHit = part(new THREE.BoxGeometry(.12, .045, .46),knifeX,top + .026,knifeZ - .044,pickMaterial);
  knifeHit.castShadow = knifeHit.receiveShadow = false;
  mark(knifeHit,'prep-knife',clickable); tabletop.set('knife',{model:knife,hit:knifeHit});
  addLabel(scene, 'MESA DEL ASADOR', new THREE.Vector3(x, top - 0.16, z + depth / 2 + 0.006), 1.14);

  const held = new THREE.Group();
  held.name = 'herramienta-de-preparacion';
  const copies = new Map<PrepProp, THREE.Group>();
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
  const guide = new THREE.Line(lineGeo,new THREE.LineDashedMaterial({
    color:0xffe4ab, transparent:true, opacity:.92, dashSize:.021, gapSize:.012, depthTest:false }));
  guide.visible = false; guide.frustumCulled = false; guide.renderOrder = 4; scene.add(guide);
  let previous: PrepProp | undefined;
  let drawing = false, releaseTime = -10;
  return { update(camera: THREE.Camera, tool: PreparationTool | null, target: InteractionTarget | null,
    stroke: CutStroke | null, time: number) {
    const kind = tool?.kind === 'knife' ? 'knife' : tool?.seasoning;
    if (kind !== previous) {
      if (previous) {
        const prop = tabletop.get(previous)!; prop.model.visible = true; prop.hit.userData.enabled = true;
      }
      held.clear();
      if (kind) {
        const prop = tabletop.get(kind)!; prop.model.visible = false; prop.hit.userData.enabled = false;
        let copy = copies.get(kind);
        if (!copy) { copy = makePrepProp(kind); copies.set(kind, copy); }
        held.add(copy);
      }
      previous = kind;
    }
    guide.visible = !!stroke && kind === 'knife';
    if (drawing && !stroke && kind === 'knife') releaseTime = time;
    drawing = !!stroke && kind === 'knife';
    if (!kind) { held.removeFromParent(); return; }
    const aim = target?.prepPoint;
    if (aim) {
      if (held.parent !== scene) scene.add(held);
      const y = aim.y ?? p.y;
      if (kind === 'knife') {
        const angle = stroke ? Math.atan2(stroke.from.x - stroke.to.x, stroke.from.z - stroke.to.z) : -.32;
        const press = Math.max(0, 1 - (time - releaseTime) / .17);
        held.rotation.set(-.035, angle, 1.39, 'YXZ');
        held.position.set(aim.x + .14 * Math.sin(angle), y + .046 - press*.012, aim.z + .14 * Math.cos(angle));
      } else {
        held.rotation.set(.2, .12, 2.22 + Math.sin(time * 11) * .035);
        const lip = new THREE.Vector3(0, jarHeight[kind], 0).applyEuler(held.rotation);
        held.position.set(aim.x - lip.x, y + .17 - lip.y, aim.z - lip.z);
      }
      if (stroke) {
        const attr = lineGeo.attributes.position;
        attr.setXYZ(0,stroke.from.x,(stroke.from as {y?:number}).y ?? y,stroke.from.z);
        attr.setXYZ(1,stroke.to.x,(stroke.to as {y?:number}).y ?? y,stroke.to.z);
        attr.needsUpdate = true; guide.computeLineDistances();
      }
    } else {
      if (held.parent !== camera) camera.add(held);
      held.position.set(.26,-.23,-.46);
      held.rotation.set(kind === 'knife' ? -.31 : .08, -.43, kind === 'knife' ? 1.32 : -.18);
    }
  }};
}
