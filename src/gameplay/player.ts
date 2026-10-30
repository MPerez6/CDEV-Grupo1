import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG } from '../sim/parameters.ts';
import { GRILL_LAYOUT } from '../level/layout.ts';
import { isPlayerBlocked, type Obstacle } from './collisions.ts';
import type { InteractionTarget, TargetKind } from './targets.ts';

export function resolveEmberBedTarget(
  point: THREE.Vector3,
  rayDirection?: THREE.Vector3,
  allowRim = false,
): InteractionTarget {
  const { left, front, width, depth } = GRILL_LAYOUT;
  const marginX = allowRim ? -0.12 : 0.06;
  const marginZ = allowRim ? -0.14 : 0.05;
  const clampedX = Math.max(left + marginX, Math.min(left + width - marginX, point.x));
  const clampedZ = Math.max(front - depth + marginZ, Math.min(front - marginZ, point.z));
  const xM = ((clampedX - left) / width) * CONFIG.grillWidthM;
  const zM = ((front - clampedZ) / depth) * CONFIG.grillDepthM;
  const col = Math.max(0, Math.min(CONFIG.gridColumns - 1, Math.floor((xM / CONFIG.grillWidthM) * CONFIG.gridColumns)));
  const row = Math.max(0, Math.min(CONFIG.gridRows - 1, Math.floor((zM / CONFIG.grillDepthM) * CONFIG.gridRows)));
  let pokerAim: InteractionTarget['pokerAim'];
  if(rayDirection) {
    const horiz = Math.hypot(rayDirection.x, rayDirection.z);
    pokerAim = {
      dirX: horiz > 1e-5 ? rayDirection.x / horiz : 0,
      dirZ: horiz > 1e-5 ? -rayDirection.z / horiz : 1,
      pitchDown: Math.max(0, Math.min(1, -rayDirection.y)),
    };
  }
  return {
    kind: 'grill-cell',
    index: row * CONFIG.gridColumns + col,
    emberPointM: { x: xM, z: zM },
    pokerAim,
  };
}

export function selectTargetFromRay(raycaster: THREE.Raycaster, clickable: readonly THREE.Object3D[], activeTool: number): InteractionTarget | null {
  // Con la pala (1) o el atizador (3) se apunta directo al piso refractario bajo la parrilla sin que las carnes arriba tapen el hogar.
  const hearthTool = activeTool === 1 || activeTool === 3;
  const candidates = clickable.filter(object => object.userData.enabled !== false
    && !(object.userData.kind === 'tinder-pad' && activeTool !== 0)
    && !(object.userData.kind === 'tray' && activeTool === 0)
    && !(hearthTool && object.userData.kind === 'meat')
    && !(hearthTool && object.userData.kind === 'grill-cell' && !object.userData.emberBed)
    && !(!hearthTool && object.userData.emberBed));
  const hit = raycaster.intersectObjects(candidates, false)[0];
  if(!hit) return null;
  const maxDistance = hit.object.userData.kind === 'grill-cell' ? 5.0 : 3.5;
  if(hit.distance > maxDistance) return null;
  if(hit.object.userData.emberBed) return resolveEmberBedTarget(hit.point, raycaster.ray.direction, activeTool === 3);
  return { kind: hit.object.userData.kind as TargetKind, index: hit.object.userData.index, meatId: hit.object.userData.meatId };
}

export function createPlayer(camera: THREE.PerspectiveCamera, clickable: THREE.Object3D[], obstacles: readonly Obstacle[]) {
  const controls = new PointerLockControls(camera, document.body);
  const keys = new Set<string>();
  const raycaster = new THREE.Raycaster(); raycaster.far = 5.0;
  function target(activeTool: number): InteractionTarget | null {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    return selectTargetFromRay(raycaster, clickable, activeTool);
  }
  function movePlayer(dt: number): void {
    if(!controls.isLocked) return;
    const speed = 2.55 * dt;
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const norm = Math.hypot(forward, right) || 1;
    const before = camera.position.clone();
    controls.moveForward(speed * forward / norm);
    if(isPlayerBlocked(camera.position.x, camera.position.z, obstacles)) camera.position.copy(before);
    const beforeRight = camera.position.clone();
    controls.moveRight(speed * right / norm);
    if(isPlayerBlocked(camera.position.x, camera.position.z, obstacles)) camera.position.copy(beforeRight);
    camera.position.y = 1.68;
  }
  return { controls, keys, target, move: movePlayer };
}
