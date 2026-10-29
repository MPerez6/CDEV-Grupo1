import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { isPlayerBlocked, type Obstacle } from './collisions.ts';
import type { InteractionTarget, TargetKind } from './targets.ts';

export function createPlayer(camera: THREE.PerspectiveCamera, clickable: THREE.Object3D[], obstacles: readonly Obstacle[]) {
  const controls = new PointerLockControls(camera, document.body);
  const keys = new Set<string>();
  const raycaster = new THREE.Raycaster(); raycaster.far = 3.4;
  function target(activeTool: number): InteractionTarget | null {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    // El papel y las brasas comparten el piso bajo la canasta: seleccionar según herramienta.
    const candidates = clickable.filter(object => object.userData.enabled !== false
      && !(object.userData.kind === 'tinder-pad' && activeTool !== 0)
      && !(object.userData.kind === 'tray' && activeTool === 0));
    const hit = raycaster.intersectObjects(candidates, false)[0];
    return hit ? { kind: hit.object.userData.kind as TargetKind, index: hit.object.userData.index, meatId: hit.object.userData.meatId } : null;
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
