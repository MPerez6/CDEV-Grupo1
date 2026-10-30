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

const MOUSE_SENSITIVITY = 0.002;
const MAX_PITCH_RAD = THREE.MathUtils.degToRad(80);
const LOCK_GRACE_MS = 45;
const HARD_SPIKE_PX = 320;
const SOFT_CAP_PX = 90;
const MAX_EFFECTIVE_PX = 135;

export type MouseLookFilterState = {
  lockedAtMs: number;
  lastEventMs: number;
  avgDx: number;
  avgDy: number;
};

export function createMouseLookFilterState(lockedAtMs = -1000): MouseLookFilterState {
  return { lockedAtMs, lastEventMs: -1000, avgDx: 0, avgDy: 0 };
}

/**
 * Filtra los saltos espurios de Pointer Lock (re-centrado brusco del cursor del SO a alta velocidad)
 * y limita suavemente picos extremos conservando el ángulo real del movimiento.
 */
export function sanitizeMouseDelta(
  rawDx: number,
  rawDy: number,
  nowMs: number,
  state: MouseLookFilterState,
): { dx: number; dy: number } {
  if(!Number.isFinite(rawDx) || !Number.isFinite(rawDy)) return { dx: 0, dy: 0 };
  if(nowMs - state.lockedAtMs < LOCK_GRACE_MS) {
    state.lastEventMs = nowMs;
    state.avgDx = 0;
    state.avgDy = 0;
    return { dx: 0, dy: 0 };
  }

  const dtMs = nowMs - state.lastEventMs;
  state.lastEventMs = nowMs;
  if(dtMs > 90) {
    state.avgDx = 0;
    state.avgDy = 0;
  }

  let dx = rawDx;
  let dy = rawDy;
  const mag = Math.hypot(dx, dy);
  const avgSpeed = Math.hypot(state.avgDx, state.avgDy);
  const dot = dx * state.avgDx + dy * state.avgDy;

  // 1) Descartar picos de warp del cursor de Windows/Chromium (> 320 px en un solo evento o inversión violenta).
  const isHardWarp = Math.abs(dx) > HARD_SPIKE_PX || Math.abs(dy) > HARD_SPIKE_PX || mag > 380;
  const isReversalSpike = mag > 105 && avgSpeed > 6 && dot < -avgSpeed * 18;
  const isOutlierJump = mag > 130 && avgSpeed > 4 && mag > avgSpeed * 5.5;

  if(isHardWarp || isReversalSpike || isOutlierJump) {
    dx = state.avgDx * 0.85;
    dy = state.avgDy * 0.85;
  } else {
    state.avgDx = state.avgDx * 0.65 + dx * 0.35;
    state.avgDy = state.avgDy * 0.65 + dy * 0.35;
  }

  // 2) Saturación suave para movimientos rápidos legítimos sin teletransportar la vista en un solo evento.
  const cleanMag = Math.hypot(dx, dy);
  if(cleanMag > SOFT_CAP_PX) {
    const capped = Math.min(MAX_EFFECTIVE_PX, SOFT_CAP_PX + (cleanMag - SOFT_CAP_PX) * 0.28);
    const scale = capped / cleanMag;
    dx *= scale;
    dy *= scale;
  }

  return { dx, dy };
}

export function applyCameraLookDelta(
  angles: { yaw: number; pitch: number },
  dx: number,
  dy: number,
  pointerSpeed = 1,
): { yaw: number; pitch: number } {
  const step = MOUSE_SENSITIVITY * pointerSpeed;
  let yaw = angles.yaw - dx * step;
  if(yaw > Math.PI || yaw < -Math.PI) {
    yaw = ((yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  }
  const pitch = THREE.MathUtils.clamp(angles.pitch - dy * step, -MAX_PITCH_RAD, MAX_PITCH_RAD);
  return { yaw, pitch };
}

export function createPlayer(camera: THREE.PerspectiveCamera, clickable: THREE.Object3D[], obstacles: readonly Obstacle[]) {
  const controls = new PointerLockControls(camera, document.body);
  // Desactivar el listener interno de PointerLockControls (sufre gimbal lock a ±90°, deriva en Z y picos de warp).
  const internalMouseMove = (controls as unknown as { _onMouseMove?: EventListener })._onMouseMove;
  if(internalMouseMove) document.removeEventListener('mousemove', internalMouseMove);

  camera.rotation.order = 'YXZ';
  const initialDir = camera.getWorldDirection(new THREE.Vector3());
  let angles = {
    yaw: Math.atan2(-initialDir.x, -initialDir.z),
    pitch: THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(initialDir.y, -1, 1)), -MAX_PITCH_RAD, MAX_PITCH_RAD),
  };
  camera.rotation.set(angles.pitch, angles.yaw, 0, 'YXZ');

  const filterState = createMouseLookFilterState();
  const onLock = (): void => {
    filterState.lockedAtMs = performance.now();
    filterState.lastEventMs = filterState.lockedAtMs;
    filterState.avgDx = 0;
    filterState.avgDy = 0;
  };
  controls.addEventListener('lock', onLock);

  const onMouseMove = (event: MouseEvent): void => {
    if(!controls.enabled || !controls.isLocked) return;
    const { dx, dy } = sanitizeMouseDelta(event.movementX, event.movementY, performance.now(), filterState);
    if(dx === 0 && dy === 0) return;
    angles = applyCameraLookDelta(angles, dx, dy, controls.pointerSpeed);
    camera.rotation.set(angles.pitch, angles.yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
  };
  document.addEventListener('mousemove', onMouseMove);

  // Solicitar movimiento crudo sin aceleración del sistema operativo cuando el navegador lo soporte.
  controls.lock = (unadjustedMovement = true): void => {
    try {
      const req = (document.body as HTMLElement & {
        requestPointerLock(options?: { unadjustedMovement?: boolean }): Promise<void> | void;
      }).requestPointerLock({ unadjustedMovement });
      if(req && typeof req.catch === 'function') {
        req.catch(() => { document.body.requestPointerLock(); });
      }
    } catch {
      document.body.requestPointerLock();
    }
  };

  const baseDispose = controls.dispose.bind(controls);
  controls.dispose = (): void => {
    document.removeEventListener('mousemove', onMouseMove);
    controls.removeEventListener('lock', onLock);
    baseDispose();
  };

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
    if(forward === 0 && right === 0) {
      camera.position.y = 1.68;
      return;
    }
    const norm = Math.hypot(forward, right) || 1;
    const forwardStep = (speed * forward) / norm;
    const rightStep = (speed * right) / norm;
    const sinY = Math.sin(angles.yaw);
    const cosY = Math.cos(angles.yaw);

    const beforeForwardX = camera.position.x;
    const beforeForwardZ = camera.position.z;
    camera.position.x -= sinY * forwardStep;
    camera.position.z -= cosY * forwardStep;
    if(isPlayerBlocked(camera.position.x, camera.position.z, obstacles)) {
      camera.position.x = beforeForwardX;
      camera.position.z = beforeForwardZ;
    }

    const beforeRightX = camera.position.x;
    const beforeRightZ = camera.position.z;
    camera.position.x += cosY * rightStep;
    camera.position.z -= sinY * rightStep;
    if(isPlayerBlocked(camera.position.x, camera.position.z, obstacles)) {
      camera.position.x = beforeRightX;
      camera.position.z = beforeRightZ;
    }
    camera.position.y = 1.68;
    camera.updateMatrixWorld();
  }
  return { controls, keys, target, move: movePlayer };
}
