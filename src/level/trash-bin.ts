import * as THREE from 'three';
import { mark } from './primitives.ts';
import { TRASH_BIN } from './layout.ts';
import type { TrashModel } from '../sim/trash.ts';
import { SMELL_THRESHOLDS } from '../sim/trash.ts';
import { createSmokeSystem } from '../effects/smoke.ts';

/**
 * Tacho de basura con pedal: tapa con bisagra, bolsa negra, contenido que sube al llenarse,
 * moscas y vaho verdoso cuando huele. Solo representa el estado de `TrashModel`.
 */
export function createTrashBin(scene: THREE.Scene, clickable: THREE.Object3D[]) {
  const { radius: r, height: h } = TRASH_BIN;
  const root = new THREE.Group();
  root.position.set(TRASH_BIN.x, 0, TRASH_BIN.z);
  root.rotation.y = -0.35; // pedal mirando hacia donde se para el jugador
  scene.add(root);
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3a6, roughness: 0.35, metalness: 0.75 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3f42, roughness: 0.5, metalness: 0.6 });
  const bag = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.45, metalness: 0.05 });
  const garbage = new THREE.MeshStandardMaterial({ color: 0x2c2722, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 28, 1, true), steel);
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
  body.material.side = THREE.DoubleSide;
  root.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 24), darkSteel);
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.01; root.add(bottom);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.04, 28), darkSteel);
  base.position.y = 0.02; root.add(base);
  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.07), darkSteel);
  pedal.position.set(0, 0.04, r + 0.03); root.add(pedal);
  // Bolsa: el borde doblado sobre el aro y el bulto de adentro que sube con el llenado.
  const bagRim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, 0.012, 6, 28), bag);
  bagRim.rotation.x = Math.PI / 2; bagRim.position.y = h - 0.01; root.add(bagRim);
  const contents = new THREE.Mesh(new THREE.SphereGeometry(r * 0.93, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), bag);
  contents.scale.y = 0.35; root.add(contents);
  const scraps: THREE.Mesh[] = [];
  for(let i = 0;i < 6;i++) {
    const scrap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035 + (i % 3) * 0.012, 0), i % 2 ? garbage : bag);
    scrap.position.set(Math.cos(i * 2.3) * r * 0.45, 0, Math.sin(i * 2.3) * r * 0.45);
    scrap.rotation.set(i, i * 2, 0);
    root.add(scrap); scraps.push(scrap);
  }
  // Tapa con bisagra atrás.
  const hinge = new THREE.Group(); hinge.position.set(0, h + 0.005, -r); root.add(hinge);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.03, 28), steel);
  lid.position.set(0, 0.015, r); lid.castShadow = true; hinge.add(lid);
  const lidTop = new THREE.Mesh(new THREE.SphereGeometry(r * 1.0, 24, 6, 0, Math.PI * 2, 0, 0.35), steel);
  lidTop.scale.y = 0.6; lidTop.position.set(0, 0.0, r); hinge.add(lidTop);

  // Zona apuntable (cuerpo + tapa).
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.15, h + 0.12, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = (h + 0.12) / 2; root.add(hit);
  mark(hit, 'trash', clickable);

  // Bolsa atada que sale volando al vaciar.
  const tiedBag = new THREE.Group(); root.add(tiedBag); tiedBag.visible = false;
  const tied = new THREE.Mesh(new THREE.SphereGeometry(r * 0.85, 16, 12), bag); tied.scale.set(1, 1.25, 1); tiedBag.add(tied);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 8), bag); knot.position.y = r * 1.2; tiedBag.add(knot);

  // Moscas: puntitos negros dando vueltas.
  const flies = Array.from({ length: 7 }, (_, i) => {
    const fly = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), new THREE.MeshBasicMaterial({ color: 0x0c0c0c }));
    fly.visible = false; scene.add(fly);
    return { fly, phase: i * 1.7, radius: 0.18 + (i % 3) * 0.08, speed: 2.2 + (i % 4) * 0.6 };
  });
  const stink = createSmokeSystem(scene, {
    capacity: 40, maxRate: 5, life: 3.2, size: [0.18, 0.7], rise: 0.25, spread: 0.12, opacity: 0.18,
    colors: [0xa8b86a, 0x6f7d3a], ceilingY: 2.2,
  });
  const stinkOrigin = new THREE.Vector3(TRASH_BIN.x, h + 0.05, TRASH_BIN.z);

  let lidOpen = 0, lidKick = 0, bagOut = 1, previous: number | null = null, lastBags = 0, lastFill = 0;
  return {
    /** Abre la tapa un momento (al tirar algo). */
    kick(): void { lidKick = 1.2; },
    update(trash: TrashModel, playerNear: boolean, elapsed: number): void {
      const dt = previous === null ? 0 : Math.min(0.1, Math.max(0, elapsed - previous));
      previous = elapsed;
      if(trash.fill > lastFill) lidKick = 1.2;
      lastFill = trash.fill;
      if(trash.bagsTakenOut !== lastBags) { lastBags = trash.bagsTakenOut; bagOut = 0; lidKick = 1.6; }
      lidKick = Math.max(0, lidKick - dt);
      // Lleno: la tapa no cierra del todo. Cerca del jugador con algo para tirar se entreabre.
      const target = lidKick > 0 ? 1 : trash.isFull ? 0.22 : playerNear ? 0.08 : 0;
      lidOpen += (target - lidOpen) * Math.min(1, dt * 8);
      hinge.rotation.x = -lidOpen * 1.6;
      const fill = trash.fillRatio;
      contents.visible = fill > 0.01;
      contents.scale.set(1, 0.25 + fill * 0.5, 1);
      contents.position.y = 0.04 + fill * (h - 0.12);
      scraps.forEach((s, i) => {
        s.visible = fill > (i + 1) / (scraps.length + 2);
        s.position.y = contents.position.y + 0.03 + (i % 2) * 0.02 + (trash.isFull ? 0.05 : 0);
      });
      // Animación de la bolsa saliendo.
      if(bagOut < 1) {
        bagOut = Math.min(1, bagOut + dt / 1.1);
        tiedBag.visible = true;
        tiedBag.position.set(0, h * 0.4 + bagOut * 1.1, bagOut * 0.6);
        tiedBag.scale.setScalar(1 - bagOut * 0.4);
      } else tiedBag.visible = false;
      // Olor: moscas desde "fuerte", vaho verde desde "leve".
      const smell = trash.smell;
      flies.forEach((f, i) => {
        f.fly.visible = smell >= SMELL_THRESHOLDS.fuerte && i < 3 + Math.round((smell - SMELL_THRESHOLDS.fuerte) * 8);
        if(!f.fly.visible) return;
        const a = elapsed * f.speed + f.phase;
        f.fly.position.set(TRASH_BIN.x + Math.cos(a) * f.radius, h + 0.15 + Math.sin(a * 2.3) * 0.12 + (i % 3) * 0.08,
          TRASH_BIN.z + Math.sin(a * 1.3) * f.radius);
      });
      const level = smell < SMELL_THRESHOLDS.leve ? 0 : smell;
      stink.emit('basura', stinkOrigin, { amount: level, darkness: Math.min(1, smell) }, dt);
      stink.update(dt, elapsed);
    },
  };
}
