import * as THREE from 'three';
import { mark } from './primitives.ts';

/** Lámpara galponera colgada bajo la campana y la llave de luz en la columna izquierda del asador. */
export const ASADOR_LAMP = { x: -1.0, y: 2.28, z: -4.05 } as const;
export const LIGHT_SWITCH = { x: -3.66, y: 1.32, z: -3.06 } as const;

export function createAsadorLight(scene: THREE.Scene, clickable: THREE.Object3D[]) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x2d3a2f, roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide });
  const inside = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.6, side: THREE.BackSide });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.2, emissive: 0xffc670, emissiveIntensity: 0 });
  const lamp = new THREE.Group();
  lamp.position.set(ASADOR_LAMP.x, ASADOR_LAMP.y, ASADOR_LAMP.z);
  scene.add(lamp);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  cable.position.y = 0.42; lamp.add(cable);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.15, 24, 1, true), metal);
  shade.position.y = 0.02; shade.castShadow = true; lamp.add(shade);
  const shadeInside = new THREE.Mesh(new THREE.ConeGeometry(0.195, 0.145, 24, 1, true), inside);
  shadeInside.position.y = 0.02; lamp.add(shadeInside);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), metal);
  socket.position.y = 0.08; lamp.add(socket);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), bulbMat);
  bulb.position.y = -0.03; lamp.add(bulb);
  const light = new THREE.PointLight(0xffd5a0, 0, 8.5, 1.4);
  light.position.y = -0.08; lamp.add(light);

  // Llave de luz: caja blanca con tecla que cambia de posición.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.018), new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.5 }));
  plate.position.set(LIGHT_SWITCH.x, LIGHT_SWITCH.y, LIGHT_SWITCH.z);
  scene.add(plate);
  const key = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.014), new THREE.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.4 }));
  key.position.z = 0.014; plate.add(key);
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshStandardMaterial({ color: 0x331100, emissive: 0xff7a1a, emissiveIntensity: 0 }));
  pilot.position.set(0, -0.042, 0.012); plate.add(pilot);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.copy(plate.position);
  scene.add(hit);
  mark(hit, 'light-switch', clickable);

  let level = 0;
  return {
    light,
    update(on: boolean, elapsed: number, dt: number): void {
      // La lamparita tarda un instante en llegar a pleno y titila apenas.
      level += ((on ? 1 : 0) - level) * Math.min(1, dt * 12);
      const flicker = on ? 1 + Math.sin(elapsed * 37) * 0.015 : 1;
      light.intensity = 5.5 * level * flicker;
      bulbMat.emissiveIntensity = 2.4 * level;
      key.rotation.x = on ? -0.35 : 0.35;
      (pilot.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0 : 1.2; // piloto naranja para encontrarla a oscuras
      lamp.rotation.z = Math.sin(elapsed * 0.7) * 0.015;
    },
  };
}
