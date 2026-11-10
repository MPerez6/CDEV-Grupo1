import * as THREE from 'three';
import { CHAIR_STACK, FAMILY_TABLE, RADIO_POSITION } from './layout.ts';
import { mark } from './primitives.ts';
import { huleTexture, paperTexture, seeded, tiled } from './textures.ts';

/**
 * Mesa familiar bajo la parra (propuesta): mantel de hule, sillas de plástico, sifón, pingüino,
 * panera, ensaladera, mate con termo y la radio portátil (seleccionable: E la prende o apaga).
 */
export function createMesaFamiliar(scene: THREE.Scene, clickable: THREE.Object3D[]): void {
  const familyGroup = new THREE.Group();
  familyGroup.name = 'mesa-familiar-group';
  scene.add(familyGroup);

  createTable(familyGroup);
  const { x, width } = FAMILY_TABLE;
  for(const cz of [-0.35, 0.4, 1.15]) {
    createChair(familyGroup, x - width / 2 - 0.36, cz, Math.PI / 2);
    createChair(familyGroup, x + width / 2 + 0.36, cz, -Math.PI / 2);
  }
  for(let i = 0;i < 4;i++) createChair(scene, CHAIR_STACK.x, CHAIR_STACK.z, 0.15 + i * 0.03, i * 0.075);
  createTableware(familyGroup);
  createRadio(scene, clickable);
}

const std = (color: THREE.ColorRepresentation, roughness = 0.9, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function put(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], pos: [number, number, number], cast = true): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...pos);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function createTable(scene: THREE.Object3D): void {
  const { x, z, width, length, top } = FAMILY_TABLE;
  const legMat = std(0x5d4a38);
  for(const dx of [-1, 1]) for(const dz of [-1, 1])
    put(scene, new THREE.BoxGeometry(0.06, top, 0.06), legMat, [x + dx * (width / 2 - 0.08), top / 2, z + dz * (length / 2 - 0.1)]);
  put(scene, new THREE.BoxGeometry(width, 0.04, length), std(0x8a6a4a), [x, top, z]);
  // Mantel de hule que cuelga por los costados.
  const hule = (w: number, d: number) => std(0xffffff, 0.45, { map: tiled(huleTexture(), w / 0.5, d / 0.5) });
  put(scene, new THREE.BoxGeometry(width + 0.16, 0.006, length + 0.16), hule(width + 0.16, length + 0.16), [x, top + 0.023, z]);
  for(const dx of [-1, 1]) put(scene, new THREE.BoxGeometry(0.006, 0.16, length + 0.16), hule(length + 0.16, 0.16), [x + dx * (width / 2 + 0.08), top - 0.055, z]);
  for(const dz of [-1, 1]) put(scene, new THREE.BoxGeometry(width + 0.16, 0.16, 0.006), hule(width + 0.16, 0.16), [x, top - 0.055, z + dz * (length / 2 + 0.08)]);
}

/** Silla monobloc blanca. `lift` permite apilarlas. */
function createChair(scene: THREE.Object3D, cx: number, cz: number, yaw: number, lift = 0): void {
  const chair = new THREE.Group();
  const plastic = std(0xf1f0ea, 0.55);
  put(chair, new THREE.BoxGeometry(0.46, 0.035, 0.44), plastic, [0, 0.44, 0]);
  const back = put(chair, new THREE.BoxGeometry(0.46, 0.44, 0.03), plastic, [0, 0.68, -0.22]);
  back.rotation.x = -0.14;
  for(const sx of [-1, 1]) {
    put(chair, new THREE.BoxGeometry(0.04, 0.03, 0.4), plastic, [sx * 0.23, 0.62, -0.02]);
    for(const sz of [-1, 1]) {
      const leg = put(chair, new THREE.CylinderGeometry(0.018, 0.024, 0.45, 8), plastic, [sx * 0.2, 0.22, sz * 0.19]);
      leg.rotation.set(sz * 0.08, 0, -sx * 0.08);
    }
  }
  chair.position.set(cx, lift, cz);
  chair.rotation.y = yaw;
  scene.add(chair);
}

function createTableware(scene: THREE.Object3D): void {
  const { x, z, width, top } = FAMILY_TABLE;
  const y = top + 0.026;
  // Platos y vasos frente a cada silla.
  const plate = std(0xf7f4ec, 0.3);
  const glass = std(0xcfe3e0, 0.1, { transparent: true, opacity: 0.55 });
  for(const cz of [-0.35, 0.4, 1.15]) for(const side of [-1, 1]) {
    const px = x + side * (width / 2 - 0.2);
    put(scene, new THREE.CylinderGeometry(0.12, 0.1, 0.018, 20), plate, [px, y + 0.009, cz]);
    put(scene, new THREE.CylinderGeometry(0.035, 0.03, 0.1, 12), glass, [px - side * 0.02, y + 0.05, cz + 0.17], false);
  }
  // Sifón de soda.
  put(scene, new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), std(0x4f8a80, 0.15, { transparent: true, opacity: 0.85 }), [x - 0.02, y + 0.12, z - 0.45]);
  const head = std(0xb9bcbc, 0.25, { metalness: 0.9 });
  put(scene, new THREE.CylinderGeometry(0.032, 0.045, 0.07, 12), head, [x - 0.02, y + 0.275, z - 0.45]);
  const spout = put(scene, new THREE.CylinderGeometry(0.009, 0.009, 0.08, 6), head, [x - 0.06, y + 0.29, z - 0.45]);
  spout.rotation.z = Math.PI / 2.4;
  // Ensaladera con lechuga y tomate.
  const bowl = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.09, 0.005), new THREE.Vector2(0.15, 0.05), new THREE.Vector2(0.16, 0.085)], 24);
  put(scene, bowl, std(0xe8e0cf, 0.4, { side: THREE.DoubleSide }), [x, y, z + 0.02]);
  const rand = seeded(61);
  for(let i = 0;i < 18;i++)
    put(scene, new THREE.IcosahedronGeometry(0.028, 0), std(i % 4 ? 0x5f9a3a : 0xc8352b, 0.7), [x + (rand() - 0.5) * 0.18, y + 0.065 + rand() * 0.02, z + 0.02 + (rand() - 0.5) * 0.18], false);
  // Pingüino de vino.
  const penguinBody = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0.0), new THREE.Vector2(0.085, 0.07), new THREE.Vector2(0.075, 0.15),
    new THREE.Vector2(0.05, 0.2), new THREE.Vector2(0.045, 0.24), new THREE.Vector2(0, 0.26),
  ], 20);
  const penguin = new THREE.Group();
  put(penguin, penguinBody, std(0xf4f1ea, 0.25), [0, 0, 0]);
  const beak = put(penguin, new THREE.ConeGeometry(0.02, 0.07, 8), std(0xe08a2c, 0.4), [0, 0.215, 0.06]);
  beak.rotation.x = Math.PI / 2.2;
  for(const s of [-1, 1]) put(penguin, new THREE.SphereGeometry(0.008, 8, 6), std(0x111111, 0.3), [s * 0.02, 0.232, 0.042], false);
  const handle = put(penguin, new THREE.TorusGeometry(0.04, 0.009, 6, 14, Math.PI), std(0xf4f1ea, 0.25), [0, 0.16, -0.08], false);
  handle.rotation.set(0, Math.PI / 2, Math.PI / 2);
  penguin.position.set(x - 0.05, y, z + 0.5);
  penguin.rotation.y = 0.9;
  scene.add(penguin);
  // Panera con pan francés.
  put(scene, new THREE.CylinderGeometry(0.14, 0.11, 0.07, 16, 1, true), std(0x9c7343, 0.9, { side: THREE.DoubleSide }), [x + 0.04, y + 0.035, z + 0.92]);
  for(let i = 0;i < 4;i++) {
    const bun = put(scene, new THREE.SphereGeometry(0.05, 12, 8), std(0xd29a55, 0.7), [x + 0.04 + (i % 2 - 0.5) * 0.09, y + 0.07, z + 0.92 + (i < 2 ? -0.04 : 0.05)]);
    bun.scale.set(1.4, 0.7, 0.9);
  }
  // Mate con bombilla y termo.
  const mx = x - 0.12, mz = z + 1.08;
  put(scene, new THREE.SphereGeometry(0.045, 14, 10), std(0x6b4b2b, 0.6), [mx, y + 0.04, mz]);
  put(scene, new THREE.CylinderGeometry(0.03, 0.033, 0.012, 14), std(0x3b6a2a, 0.9), [mx, y + 0.08, mz], false);
  const bombilla = put(scene, new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), std(0xcfcfcf, 0.2, { metalness: 1 }), [mx + 0.02, y + 0.12, mz], false);
  bombilla.rotation.z = -0.3;
  put(scene, new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16), std(0x2f6b4a, 0.4, { metalness: 0.3 }), [x + 0.14, y + 0.15, mz]);
  put(scene, new THREE.CylinderGeometry(0.03, 0.04, 0.05, 14), std(0xbababa, 0.3, { metalness: 0.8 }), [x + 0.14, y + 0.325, mz]);
}

/** Radio portátil de dos colores. La caja es el objeto seleccionable. */
function createRadio(scene: THREE.Scene, clickable: THREE.Object3D[]): void {
  const radio = new THREE.Group();
  const grille = paperTexture('radio-grille', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e9e1cc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3d3a35';
    for(let gy = 10;gy < h;gy += 12) for(let gx = 10;gx < w * 0.62;gx += 12) {
      ctx.beginPath(); ctx.arc(gx, gy, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#c9b98f';
    ctx.fillRect(w * 0.68, 18, w * 0.27, h - 36);
    ctx.fillStyle = '#7a1f1f';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText('AM · FM', w * 0.7, 44);
    ctx.fillStyle = '#3d3a35';
    for(let i = 0;i < 8;i++) ctx.fillRect(w * 0.7 + i * 8, 60, 1.5, 10 + (i % 2) * 6);
  });
  const shell = std(0xa3262a, 0.5);
  const body = put(radio, new THREE.BoxGeometry(0.32, 0.18, 0.1), [shell, shell, shell, shell, std(0xffffff, 0.6, { map: grille }), shell], [0, 0.09, 0]);
  mark(body, 'radio', clickable);
  const knob = std(0x222222, 0.4);
  for(const kx of [0.1, 0.135]) {
    const k = put(radio, new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), knob, [kx, 0.19, 0.02], false);
    k.rotation.x = 0;
  }
  const antenna = put(radio, new THREE.CylinderGeometry(0.004, 0.004, 0.42, 6), std(0xd2d2d2, 0.2, { metalness: 1 }), [-0.12, 0.36, -0.03], false);
  antenna.rotation.z = 0.45;
  const handle = put(radio, new THREE.TorusGeometry(0.11, 0.012, 6, 18, Math.PI), std(0x2a2a2a, 0.5), [0, 0.18, 0], false);
  handle.rotation.y = 0;
  // Luz testigo (se ve encendida mientras suena).
  const led = put(radio, new THREE.SphereGeometry(0.007, 8, 6), std(0x3a0000, 0.3, { emissive: 0xff2a1a, emissiveIntensity: 1.6 }), [0.15, 0.15, 0.051], false);
  led.name = 'radio-led';
  radio.position.set(...RADIO_POSITION);
  radio.position.y = FAMILY_TABLE.top + 0.026;
  radio.rotation.y = Math.PI / 2 + 0.25;
  scene.add(radio);
}
