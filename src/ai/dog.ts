import * as THREE from 'three';
import { mark } from '../level/primitives.ts';
import { DogBrain, type DogEvent, type DogInput, yawTo } from './dog-brain.ts';
import { createDogModel, type DogRig } from './dog-model.ts';
import { blendPose, dogPose, gait, LYING, type DogPose } from './dog-poses.ts';
import type { NavObstacle } from './dog-nav.ts';

type HeldMeat = { id: number; location: string };
type MeatView = { group: THREE.Object3D };
const MOUTH_SCALE = 0.42;
const HANG = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.25, Math.PI / 2, 0));

/**
 * Perro del patio: esqueleto low-poly animado por poses (dog-poses.ts), conducido por DogBrain.
 * Seleccionable ('dog'): E lo acaricia; con carne en la pinza, clic o E se la das.
 */
function textSprite(text: string, color: string, size = 0.22): THREE.Sprite {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let map: THREE.Texture | null = null;
  if(canvas) {
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if(ctx) {
      ctx.font = 'bold 64px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(40,24,12,0.85)'; ctx.strokeText(text, 128, 66);
      ctx.fillStyle = color; ctx.fillText(text, 128, 66);
    }
    map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, depthWrite: false }));
  sprite.scale.set(size * 2, size, 1);
  sprite.visible = false;
  return sprite;
}

function applyPose(rig: DogRig, pose: DogPose): void {
  rig.body.position.y = pose.y;
  rig.body.rotation.set(pose.pitch, 0, pose.roll);
  rig.neck.rotation.set(pose.neck, pose.headYaw * 0.4, 0);
  rig.head.rotation.set(-(pose.pitch + pose.neck) + pose.headTilt, pose.headYaw * 0.6, pose.headRoll);
  rig.jaw.rotation.x = pose.jaw;
  rig.tongue.visible = pose.jaw > 0.08;
  for(const leg of rig.legs) {
    const i = leg.side < 0 ? 0 : 1;
    // Ángulos respecto del piso: se descuenta la inclinación del cuerpo.
    leg.hip.rotation.x = (leg.front ? pose.fu[i] : pose.bu[i]) - pose.pitch;
    leg.knee.rotation.x = leg.front ? pose.fl[i] : pose.bl[i];
  }
  rig.tail[0].rotation.x = pose.tail;
  for(let i = 1;i < rig.tail.length;i++) rig.tail[i].rotation.x = pose.tailCurl;
  rig.ears.forEach((ear, i) => { ear.rotation.x = -pose.ears; ear.rotation.z = (i === 0 ? -1 : 1) * (0.5 + pose.ears * 0.4); });
}

export function createDog(scene: THREE.Scene, clickable: THREE.Object3D[], obstacles?: () => readonly NavObstacle[]) {
  const brain = new DogBrain();
  const rig = createDogModel();
  rig.head.rotation.order = 'YXZ';
  rig.neck.rotation.order = 'YXZ';
  mark(rig.hit, 'dog', clickable);
  scene.add(rig.root);

  // Corazones al acariciarlo y carteles de lo que hace (para que se entienda sin leer el HUD).
  const hearts = Array.from({ length: 3 }, () => {
    const s = textSprite('♥', '#ff5f7a', 0.16);
    scene.add(s);
    return { sprite: s, age: Infinity, dx: 0 };
  });
  const bubbles = { mendigar: textSprite('🍖?', '#ffffff'), ladrar: textSprite('¡GUAU!', '#ffe27a', 0.2),
    comer: textSprite('ñam ñam', '#ffffff', 0.16), olfatear: textSprite('snif snif', '#d7f5b0', 0.16), culpa: textSprite('😔', '#ffffff', 0.18) };
  Object.values(bubbles).forEach(s => scene.add(s));

  let pose: DogPose = { ...LYING };
  let walkPhase = 0;
  let lastAction = brain.action;
  const headWorld = new THREE.Vector3();
  const mouthPos = new THREE.Vector3(), mouthQuat = new THREE.Quaternion();
  /** Escala que tenía cada pieza antes de ir a la boca, para devolvérsela. */
  const savedScale = new Map<number, number>();

  function updateBubbles(elapsed: number, dt: number): void {
    rig.head.getWorldPosition(headWorld);
    for(const [key, sprite] of Object.entries(bubbles)) {
      const on = brain.action === key && (key !== 'ladrar' || Math.sin(brain.actionTime * 13) > 0.2);
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity += ((on ? 1 : 0) - mat.opacity) * Math.min(1, dt * 10);
      sprite.visible = mat.opacity > 0.02;
      sprite.position.set(headWorld.x, headWorld.y + 0.28 + Math.sin(elapsed * 3) * 0.02, headWorld.z);
    }
    for(const h of hearts) {
      h.age += dt;
      const life = 1.4;
      h.sprite.visible = h.age >= 0 && h.age < life;
      if(h.sprite.visible) {
        h.sprite.position.set(headWorld.x + h.dx, headWorld.y + 0.2 + h.age * 0.45, headWorld.z);
        (h.sprite.material as THREE.SpriteMaterial).opacity = 1 - h.age / life;
      }
    }
  }

  function burstHearts(): void { hearts.forEach((h, i) => { h.age = -i * 0.18; h.dx = (i - 1) * 0.12; }); }

  function place(elapsed: number, dt: number): void {
    rig.root.position.set(brain.pos.x, 0, brain.pos.z);
    walkPhase += dt * brain.speed * 7.5;
    let target = gait(dogPose(brain.state, brain.action, brain.actionTime, brain.wag), walkPhase, brain.speed);
    // Llevando algo en la boca: cabeza en alto y boca entreabierta.
    if(brain.carrying && brain.action !== 'comer') target = { ...target, headTilt: target.headTilt - 0.15, jaw: Math.max(target.jaw, 0.14) };
    // La cabeza busca a quien mira (dentro de un rango cómodo).
    if(brain.lookAt && brain.action !== 'olfatear' && brain.action !== 'comer') {
      const rel = Math.atan2(Math.sin(yawTo(brain.pos, brain.lookAt) - brain.yaw), Math.cos(yawTo(brain.pos, brain.lookAt) - brain.yaw));
      target = { ...target, headYaw: Math.max(-1.1, Math.min(1.1, rel)) };
    }
    const k = 1 - Math.exp(-dt * (brain.speed > 0 ? 14 : 7));
    pose = blendPose(pose, target, k);
    rig.root.rotation.y = brain.yaw + pose.extraYaw;
    applyPose(rig, pose);
    // Cola: el meneo se suma a la pose.
    const wag = brain.wag;
    rig.tail[0].rotation.z = Math.sin(elapsed * (7 + wag * 12)) * (0.12 + wag * 0.7);
    rig.tail[1].rotation.z = Math.sin(elapsed * (7 + wag * 12) - 0.6) * (0.1 + wag * 0.4);
    if(brain.action !== lastAction) {
      if(lastAction && !brain.action && lastAction !== 'olfatear' && lastAction !== 'ladrar') burstHearts();
      lastAction = brain.action;
    }
    updateBubbles(elapsed, dt);
  }

  return {
    brain,
    rig,
    /** Avanza el cerebro y la animación. Devuelve eventos con mensajes para el HUD. */
    update(input: DogInput, elapsed: number): DogEvent[] {
      const events = brain.tick(obstacles ? { ...input, obstacles: obstacles() } : input);
      place(elapsed, input.dt);
      return events;
    },
    /** Acariciarlo (E). Devuelve el mensaje. */
    pet(player: { x: number; z: number }, burning = false): string {
      burstHearts();
      return brain.pet(player, burning);
    },
    /** Darle una pieza. Devuelve el mensaje o null si ya tiene algo en la boca. */
    give(meatId: number, name: string, player: { x: number; z: number }): string | null {
      const message = brain.give(meatId, name, player);
      if(message) burstHearts();
      return message;
    },
    /** Pone en la boca del perro las piezas que tiene (y devuelve la escala a las que ya soltó). */
    holdMeat(meats: readonly HeldMeat[], views: ReadonlyMap<number, MeatView>): void {
      for(const [id, scale] of savedScale) {
        const meat = meats.find(m => m.id === id);
        if(meat?.location === 'dog') continue;
        views.get(id)?.group.scale.setScalar(scale);
        savedScale.delete(id);
      }
      for(const meat of meats) {
        if(meat.location !== 'dog') continue;
        const view = views.get(meat.id);
        if(!view) continue;
        if(!savedScale.has(meat.id)) savedScale.set(meat.id, view.group.scale.x);
        rig.mouth.getWorldPosition(mouthPos);
        rig.head.getWorldQuaternion(mouthQuat);
        view.group.position.copy(mouthPos);
        view.group.quaternion.copy(mouthQuat).multiply(HANG);
        view.group.scale.setScalar(MOUTH_SCALE);
      }
    },
    /** Dónde y cómo ubicar lo que lleva en la boca. */
    mouthTransform(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
      rig.mouth.getWorldPosition(position);
      rig.head.getWorldQuaternion(quaternion);
    },
  };
}
