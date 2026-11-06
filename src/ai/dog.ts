import * as THREE from 'three';
import { mark } from '../level/primitives.ts';
import { DogBrain, type DogEvent, type DogInput, type DogState, yawTo } from './dog-brain.ts';

/**
 * Perro del patio: cuerpo low-poly + animación por poses, conducido por DogBrain.
 * Seleccionable ('dog'): E lo acaricia. No tiene colisión con el jugador.
 */
type Pose = { height: number; tilt: number; frontFold: number; backFold: number; headY: number };
const POSES: Record<'lying' | 'sitting' | 'standing', Pose> = {
  lying: { height: 0.16, tilt: 0, frontFold: -1.45, backFold: 1.45, headY: 0.06 },
  sitting: { height: 0.3, tilt: -0.55, frontFold: 0, backFold: 1.3, headY: 0.18 },
  standing: { height: 0.36, tilt: 0, frontFold: 0, backFold: 0, headY: 0.12 },
};
const poseFor = (s: DogState): keyof typeof POSES => s === 'echado' ? 'lying' : s === 'pidiendo' || s === 'contento' ? 'sitting' : 'standing';

export function createDog(scene: THREE.Scene, clickable: THREE.Object3D[]) {
  const brain = new DogBrain();
  const fur = new THREE.MeshStandardMaterial({ color: 0xc98b4a, roughness: 0.9 });
  const light = new THREE.MeshStandardMaterial({ color: 0xe8c79a, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1612, roughness: 0.4 });
  const part = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number]) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...p);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();          // posición y orientación en el patio
  const body = new THREE.Group();          // altura e inclinación según la pose
  root.add(body);
  const torso = part(body, new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), fur, [0, 0, 0]);
  torso.rotation.x = Math.PI / 2;
  part(body, new THREE.CapsuleGeometry(0.1, 0.26, 4, 8), light, [0, -0.05, 0.02]).rotation.x = Math.PI / 2; // panza clara

  const neck = new THREE.Group(); neck.position.set(0, 0.1, 0.26); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.12, 0.06); neck.add(head);
  part(head, new THREE.SphereGeometry(0.11, 12, 10), fur, [0, 0, 0]).scale.set(1, 0.92, 1.05);
  part(head, new THREE.BoxGeometry(0.09, 0.08, 0.12), light, [0, -0.03, 0.1]);
  part(head, new THREE.SphereGeometry(0.024, 8, 6), dark, [0, -0.005, 0.165]);
  for(const s of [-1, 1]) {
    part(head, new THREE.SphereGeometry(0.016, 8, 6), dark, [s * 0.045, 0.035, 0.085]);
    const ear = part(head, new THREE.ConeGeometry(0.045, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x8f5a2c, roughness: 0.9 }), [s * 0.085, 0.07, -0.01]);
    ear.rotation.set(0.2, 0, s * 2.6); // orejas caídas
  }

  const legs: { pivot: THREE.Group; front: boolean; side: number }[] = [];
  for(const front of [true, false]) for(const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.08, -0.04, front ? 0.17 : -0.17);
    part(pivot, new THREE.CylinderGeometry(0.035, 0.03, 0.3, 7), fur, [0, -0.15, 0]);
    part(pivot, new THREE.SphereGeometry(0.038, 8, 6), light, [0, -0.3, 0.015]);
    body.add(pivot);
    legs.push({ pivot, front, side });
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.07, -0.27); body.add(tail);
  part(tail, new THREE.CylinderGeometry(0.018, 0.028, 0.24, 6), fur, [0, 0.11, -0.03]).rotation.x = -0.35;

  // Caja invisible para apuntarlo fácil con la mira.
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.85), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(0, 0.25, 0.02);
  root.add(hit);
  mark(hit, 'dog', clickable);

  // Corazones al acariciarlo.
  const heartTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    if(ctx) { ctx.fillStyle = '#ff5f7a'; ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♥', 32, 36); }
    return new THREE.CanvasTexture(c);
  })();
  const hearts = Array.from({ length: 3 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, opacity: 0, depthWrite: false }));
    s.scale.setScalar(0.16);
    scene.add(s);
    return { sprite: s, age: Infinity, dx: 0 };
  });

  scene.add(root);
  const pose: Pose = { ...POSES.lying };
  let walkPhase = 0;

  function place(elapsed: number, dt: number): void {
    root.position.set(brain.pos.x, 0, brain.pos.z);
    root.rotation.y = brain.yaw;
    const target = POSES[poseFor(brain.state)];
    const k = 1 - Math.exp(-dt * 6);
    (Object.keys(pose) as (keyof Pose)[]).forEach(key => { pose[key] += (target[key] - pose[key]) * k; });
    body.position.y = pose.height;
    body.rotation.x = pose.tilt;
    if(brain.state === 'caminando') walkPhase += dt * 9;
    const swing = brain.state === 'caminando' ? 0.55 : 0;
    for(const { pivot, front, side } of legs) {
      const gait = Math.sin(walkPhase + (front ? 0 : Math.PI) + (side > 0 ? Math.PI : 0)) * swing;
      // Las delanteras compensan la inclinación del cuerpo para quedar apoyadas en el piso.
      pivot.rotation.x = (front ? pose.frontFold - pose.tilt : pose.backFold) + gait;
    }
    tail.rotation.z = Math.sin(elapsed * (6 + brain.wag * 12)) * (0.15 + brain.wag * 0.75);
    tail.rotation.x = brain.state === 'echado' ? 0.9 : -0.2 - brain.wag * 0.4;
    // Cabeza: mira a la persona o a la parrilla, dentro de un rango cómodo.
    let headYaw = 0;
    if(brain.lookAt) headYaw = Math.max(-1.0, Math.min(1.0, Math.atan2(Math.sin(yawTo(brain.pos, brain.lookAt) - brain.yaw), Math.cos(yawTo(brain.pos, brain.lookAt) - brain.yaw))));
    head.rotation.y += (headYaw - head.rotation.y) * k;
    head.rotation.z = brain.state === 'contento' ? Math.sin(elapsed * 3) * 0.25 : 0;
    neck.position.y = 0.1 + pose.headY - 0.12;
    head.rotation.x = brain.state === 'echado' ? 0.35 : -pose.tilt * 0.8 - 0.1;
    // Corazones.
    for(const h of hearts) {
      h.age += dt;
      const life = 1.4;
      h.sprite.visible = h.age >= 0 && h.age < life;
      if(h.sprite.visible) {
        h.sprite.position.set(brain.pos.x + h.dx, 0.75 + h.age * 0.45, brain.pos.z);
        (h.sprite.material as THREE.SpriteMaterial).opacity = 1 - h.age / life;
      }
    }
  }

  return {
    brain,
    /** Avanza el cerebro y la animación. Devuelve eventos con mensajes para el HUD. */
    update(input: DogInput, elapsed: number): DogEvent[] {
      const events = brain.tick(input);
      place(elapsed, input.dt);
      return events;
    },
    /** Acariciarlo (E). Devuelve el mensaje. */
    pet(player: { x: number; z: number }, burning = false): string {
      hearts.forEach((h, i) => { h.age = -i * 0.18; h.dx = (i - 1) * 0.12; });
      return brain.pet(player, burning);
    },
  };
}
