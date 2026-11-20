import * as THREE from 'three';
import { MEAT_CATALOG, MEAT_KINDS } from '../sim/meatCatalog.ts';
import { FRIDGE, fridgePosition } from './layout.ts';
import { label, mark } from './primitives.ts';

/** Vitrina refrigerada de seis compartimentos con dos puertas de vidrio. */
export function createFridge(scene: THREE.Scene, clickable: THREE.Object3D[], addLabel = label) {
  const root = new THREE.Group();
  root.name = 'heladera';
  root.position.set(FRIDGE.x, 0, FRIDGE.z);
  scene.add(root);
  const { width: w, height: h, depth: d } = FRIDGE;
  const body = new THREE.MeshStandardMaterial({ color: 0xc8d4d7, metalness: 0.36, roughness: 0.42 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xb7d4d9, roughness: 0.74, emissive: 0x183133, emissiveIntensity: 0.3 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x283637, metalness: 0.32, roughness: 0.48 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x9fb8be, metalness: 0.42, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xb7e2eb, transparent: true, opacity: 0.18, roughness: 0.16, depthWrite: false,
  });
  const litStrip = new THREE.MeshBasicMaterial({ color: 0xd5f8ff });
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  function panel(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = cast;
    mesh.receiveShadow = material !== glass;
    parent.add(mesh);
    return mesh;
  }

  const front = d / 2;
  panel(root, [w, h, 0.075], [0, h / 2, -d / 2 + 0.0375], inner);
  for (const sign of [-1, 1]) {
    panel(root, [0.068, h, d], [sign * (w / 2 - 0.034), h / 2, 0], body);
    panel(root, [0.025, 1.94, 0.016], [sign * (w / 2 - 0.085), 1.28, front - 0.11], litStrip, false);
  }
  panel(root, [w, 0.105, d], [0, h - 0.0525, 0], body);
  panel(root, [w, 0.30, d], [0, 0.19, 0], trim);
  panel(root, [w, 0.13, 0.082], [0, h - 0.14, front], trim);
  const header = panel(root, [w, 0.2, 0.075], [0, h - 0.14, front + 0.055], hitMaterial, false);
  mark(header, 'fridge-door', clickable);
  addLabel(root, 'HELADERA  [E]', new THREE.Vector3(0, h - 0.14, front + 0.097), 0.73);
  for (let i = 0; i < 11; i++) {
    panel(root, [w * 0.68, 0.007, 0.018], [0, 0.09 + i * 0.017, front + 0.001], rail, false);
  }
  for (const y of FRIDGE.shelves) {
    panel(root, [w - 0.14, 0.032, d - 0.15], [0, y - 0.016, -0.018], inner);
    panel(root, [w - 0.14, 0.04, 0.032], [0, y - 0.014, front - 0.072], rail);
  }
  panel(root, [0.036, 1.79, d - 0.17], [0, 1.31, -0.025], rail);
  for (const kind of MEAT_KINDS) {
    const p = fridgePosition(kind).sub(root.position);
    addLabel(root, MEAT_CATALOG[kind].name.toUpperCase(),
      new THREE.Vector3(p.x, p.y - 0.031, front - 0.052), 0.53);
  }

  const doorWidth = w / 2 - 0.012;
  const doorHeight = h - 0.54;
  const doors = [-1, 1].map(side => {
    const hinge = new THREE.Group();
    hinge.position.set(side * (w / 2 - 0.007), 0.34 + doorHeight / 2, front + 0.018);
    root.add(hinge);
    const center = -side * doorWidth / 2;
    const pane = panel(hinge, [doorWidth - 0.082, doorHeight - 0.086, 0.025], [center, 0, 0], glass, false);
    pane.renderOrder = 2;
    for (const edge of [-1, 1]) {
      panel(hinge, [doorWidth, 0.044, 0.052], [center, edge * (doorHeight / 2 - 0.022), 0], body);
      panel(hinge, [0.046, doorHeight, 0.052], [center + edge * (doorWidth / 2 - 0.023), 0, 0], body);
    }
    panel(hinge, [0.036, 0.34, 0.047], [-side * (doorWidth - 0.10), 0.02, 0.062], trim);
    mark(panel(hinge, [doorWidth, doorHeight, 0.034], [center, 0, 0.037], hitMaterial, false), 'fridge-door', clickable);
    return { hinge, side };
  });

  let previous = 0;
  function update(open: boolean, elapsedReal: number): void {
    const dt = Math.max(0, Math.min(0.05, elapsedReal - previous));
    previous = elapsedReal;
    for (const { hinge, side } of doors) {
      hinge.rotation.y = THREE.MathUtils.damp(hinge.rotation.y, open ? side * 1.53 : 0, 10, dt);
    }
  }
  return { root, update };
}
