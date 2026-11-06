import * as THREE from 'three';
import { HOUSE_FACADE_Z, PERGOLA } from './layout.ts';
import { BRICK_TILE, brickTexture, calcareoTexture, chapaTexture, leafTexture, plasterTexture, seeded, tiled } from './textures.ts';

/**
 * Identidad de barrio del patio (propuesta): medianeras de ladrillo, santa rita, portón de chapa,
 * casas vecinas con tanque y cables, y la fachada de la casa familiar. Solo decorado.
 */
export function createBarrio(scene: THREE.Scene): void {
  createWalls(scene);
  createSantaRita(scene);
  createGate(scene);
  createNeighbours(scene);
  createFacade(scene);
  createCalcareoFloor(scene);
}

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, pos: [number, number, number], cast = true): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...pos);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const std = (color: THREE.ColorRepresentation, roughness = 0.95, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

/** Medianeras de ladrillo a la vista con carga de cemento arriba. Reemplazan las paredes lisas. */
function createWalls(scene: THREE.Scene): void {
  const brick = brickTexture();
  const wall = (size: [number, number, number], pos: [number, number, number], span: number) => {
    const material = std(0xffffff, 0.97, { map: tiled(brick, span / BRICK_TILE.w, size[1] / BRICK_TILE.h) });
    mesh(scene, new THREE.BoxGeometry(...size), material, pos, false);
    // Carga (remate de cemento) sobre la medianera.
    const cap: [number, number, number] = [size[0] + 0.06, 0.08, size[2] + 0.06];
    mesh(scene, new THREE.BoxGeometry(...cap), std(0x9d978c), [pos[0], pos[1] + size[1] / 2 + 0.04, pos[2]], false);
  };
  wall([18, 3, 0.22], [0, 1.45, -7.15], 18);
  wall([0.18, 3, 13], [-8, 1.45, -2.2], 13);
  wall([0.18, 3, 13], [8, 1.45, -2.2], 13);
  // Tramos que cierran contra la fachada de la casa.
  wall([0.18, 3, 0.75], [-8, 1.45, 4.68], 0.75);
  wall([0.18, 3, 0.75], [8, 1.45, 4.68], 0.75);
}

/** Santa rita (buganvilla) trepando la medianera izquierda y asomando por arriba. */
function createSantaRita(scene: THREE.Scene): void {
  const rand = seeded(7);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.17), leafMat, 520);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.04, 0), std(0xc2187a, 0.7), 260);
  leaves.castShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for(let i = 0;i < leaves.count;i++) {
    // Más densa arriba: se descuelga desde la carga de la medianera.
    const y = 3.05 - Math.pow(rand(), 1.8) * 2.6;
    const z = -6.9 + rand() * 4.6 + (3.05 - y) * 0.12 * (rand() - 0.5);
    dummy.position.set(-7.88 + rand() * 0.06 + (y > 2.9 ? rand() * 0.25 : 0), y, z);
    dummy.rotation.set(rand() * 0.9 - 0.45, Math.PI / 2 + (rand() - 0.5) * 0.9, rand() * Math.PI * 2);
    dummy.scale.setScalar(0.75 + rand() * 0.6);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, color.setHSL(0.27 + rand() * 0.06, 0.45 + rand() * 0.2, 0.22 + rand() * 0.12));
  }
  for(let i = 0;i < flowers.count;i++) {
    const y = 3.08 - Math.pow(rand(), 1.4) * 2.2;
    dummy.position.set(-7.86 + rand() * 0.1, y, -6.8 + rand() * 4.4);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(1, 0.6 + rand() * 0.6, 1);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
  }
  scene.add(leaves, flowers);
}

/** Portón de chapa en la medianera derecha, cerca de la casa. */
function createGate(scene: THREE.Scene): void {
  const group = new THREE.Group();
  group.position.set(7.88, 0, 3.05);
  const sheet = std(0xffffff, 0.6, { map: tiled(chapaTexture(), 3, 1), metalness: 0.35 });
  const panel = mesh(group, new THREE.PlaneGeometry(2.4, 2.15), sheet, [0, 1.12, 0]);
  panel.rotation.y = -Math.PI / 2;
  const frame = std(0x1f2a24, 0.7, { metalness: 0.4 });
  for(const z of [-1.22, 1.22]) mesh(group, new THREE.BoxGeometry(0.06, 2.2, 0.06), frame, [0, 1.1, z]);
  for(const y of [0.05, 1.12, 2.2]) mesh(group, new THREE.BoxGeometry(0.06, 0.06, 2.5), frame, [0, y, 0]);
  // Pasador y manija.
  mesh(group, new THREE.BoxGeometry(0.05, 0.04, 0.22), std(0x8a8f8c, 0.4, { metalness: 0.8 }), [-0.05, 1.05, -0.95]);
  scene.add(group);
}

/** Casas vecinas detrás de las medianeras: volúmenes simples, ventanas, tanques, antena y cables. */
function createNeighbours(scene: THREE.Scene): void {
  const windowMat = std(0x2c3236, 0.4, { metalness: 0.2 });
  const tank = std(0x1d1f1e, 0.6);
  const house = (x0: number, x1: number, z0: number, z1: number, h: number, color: number, facing: 'z' | 'x+' | 'x-') => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    mesh(scene, new THREE.BoxGeometry(w, h, d), std(color), [cx, h / 2 - 0.05, cz], false);
    mesh(scene, new THREE.BoxGeometry(w + 0.1, 0.25, d + 0.1), std(new THREE.Color(color).multiplyScalar(0.82).getHex()), [cx, h + 0.07, cz], false);
    // Ventanas hacia el patio, por piso.
    for(let floor = 0;floor * 2.8 + 2.2 < h;floor++) {
      const y = 1.7 + floor * 2.8;
      for(let k = 0;k < 2;k++) {
        if(facing === 'z') mesh(scene, new THREE.BoxGeometry(0.9, 1.0, 0.05), windowMat, [x0 + w * (0.3 + k * 0.4), y, z1 + 0.03], false);
        else mesh(scene, new THREE.BoxGeometry(0.05, 1.0, 0.9), windowMat, [facing === 'x+' ? x1 + 0.03 : x0 - 0.03, y, z0 + d * (0.3 + k * 0.4)], false);
      }
    }
    return { cx, cz, top: h + 0.2 };
  };
  const waterTank = (x: number, z: number, y: number) => {
    for(const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]])
      mesh(scene, new THREE.BoxGeometry(0.06, 0.8, 0.06), std(0x6b6b66), [x + dx, y + 0.4, z + dz], false);
    mesh(scene, new THREE.CylinderGeometry(0.55, 0.55, 1.0, 18), tank, [x, y + 1.3, z], false);
    mesh(scene, new THREE.CylinderGeometry(0.2, 0.55, 0.22, 18), tank, [x, y + 1.9, z], false);
  };
  const a = house(-9.5, -3.2, -12.5, -8.2, 4.3, 0xcfc3ad, 'z');
  waterTank(a.cx + 1.2, a.cz - 0.6, a.top);
  house(-2.6, 3.6, -13.5, -8.6, 6.6, 0xb7c3bf, 'z');
  const c = house(4.2, 11.5, -11.2, -8.1, 3.7, 0xd8b9a0, 'z');
  // Antena de TV vieja.
  const antenna = std(0x55585a, 0.5, { metalness: 0.6 });
  mesh(scene, new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), antenna, [c.cx - 1.5, c.top + 1.2, c.cz], false);
  for(const y of [1.6, 2.0, 2.3]) {
    const bar = mesh(scene, new THREE.CylinderGeometry(0.012, 0.012, 1.1 - (y - 1.6) * 0.6, 5), antenna, [c.cx - 1.5, c.top + y, c.cz], false);
    bar.rotation.z = Math.PI / 2;
  }
  const d = house(-14.5, -8.6, -6.5, 1.5, 4.9, 0xa9b3a0, 'x+');
  waterTank(d.cx - 1.0, d.cz + 1.5, d.top);
  house(8.6, 14.5, -5.5, 2.5, 3.9, 0xd1c7b8, 'x-');

  // Postes de luz y cables colgando sobre el fondo.
  const pole = std(0x6f6253, 0.95);
  const poles: [number, number][] = [[-10.5, -8.0], [10.5, -8.0]];
  for(const [x, z] of poles) mesh(scene, new THREE.CylinderGeometry(0.11, 0.14, 8, 8), pole, [x, 4, z], false);
  const cable = new THREE.LineBasicMaterial({ color: 0x1b1b1b });
  for(const [i, y] of [7.6, 7.25, 6.9].entries()) {
    const pts: THREE.Vector3[] = [];
    for(let k = 0;k <= 24;k++) {
      const t = k / 24, x = -10.5 + t * 21;
      pts.push(new THREE.Vector3(x, y - Math.sin(t * Math.PI) * (0.9 + i * 0.15), -8.0 + i * 0.12));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cable));
  }
}

/** Fachada trasera de la casa familiar, a espaldas del punto de inicio. */
function createFacade(scene: THREE.Scene): void {
  const z = HOUSE_FACADE_Z;
  const plaster = std(0xffffff, 0.95, { map: tiled(plasterTexture(), 6, 1.4) });
  mesh(scene, new THREE.BoxGeometry(16.2, 3.3, 0.22), plaster, [0, 1.6, z + 0.11], false);
  // Zócalo.
  mesh(scene, new THREE.BoxGeometry(16.2, 0.24, 0.04), std(0xa39886), [0, 0.09, z - 0.02], false);
  // Puerta de madera con marco.
  const wood = std(0x6a4127, 0.8);
  mesh(scene, new THREE.BoxGeometry(1.06, 2.16, 0.06), std(0x3e3a35, 0.8), [-1.6, 1.08, z - 0.02], false);
  mesh(scene, new THREE.BoxGeometry(0.92, 2.04, 0.06), wood, [-1.6, 1.03, z - 0.05], false);
  for(const y of [0.55, 1.5]) mesh(scene, new THREE.BoxGeometry(0.7, 0.62, 0.02), std(0x5a3620, 0.8), [-1.6, y, z - 0.09], false);
  mesh(scene, new THREE.SphereGeometry(0.035, 10, 8), std(0xc9a64a, 0.3, { metalness: 0.9 }), [-1.95, 1.0, z - 0.1], false);
  // Ventana: marco blanco, vidrio, cortina y reja de hierro.
  mesh(scene, new THREE.BoxGeometry(1.42, 1.22, 0.05), std(0xece6da, 0.6), [2.0, 1.55, z - 0.02], false);
  mesh(scene, new THREE.BoxGeometry(1.24, 1.04, 0.03), std(0xe9dcc0, 0.9), [2.0, 1.55, z - 0.04], false); // cortina
  mesh(scene, new THREE.BoxGeometry(1.24, 1.04, 0.01), std(0x9fb4ba, 0.08, { transparent: true, opacity: 0.45, metalness: 0.2 }), [2.0, 1.55, z - 0.06], false);
  mesh(scene, new THREE.BoxGeometry(0.04, 1.04, 0.03), std(0xece6da, 0.6), [2.0, 1.55, z - 0.07], false); // parante
  const bars = std(0x2a2a2a, 0.6, { metalness: 0.5 });
  for(let i = 0;i < 6;i++) mesh(scene, new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), bars, [1.5 + i * 0.2, 1.55, z - 0.13], false);
  for(const y of [1.0, 2.1]) {
    const rail = mesh(scene, new THREE.CylinderGeometry(0.013, 0.013, 1.42, 6), bars, [2.0, y, z - 0.13], false);
    rail.rotation.z = Math.PI / 2;
  }
  // Alero corto de chapa galvanizada sobre la puerta, con aplique de luz.
  const eave = mesh(scene, new THREE.BoxGeometry(2.0, 0.04, 0.7), std(0xc4c8c2, 0.45, { metalness: 0.25 }), [-1.6, 2.42, z - 0.36], true);
  eave.rotation.x = 0.12;
  mesh(scene, new THREE.BoxGeometry(0.12, 0.08, 0.1), std(0x2b2b2b, 0.5), [0.0, 2.25, z - 0.05], false);
  mesh(scene, new THREE.SphereGeometry(0.06, 12, 8), std(0xfff3d6, 0.3, { emissive: 0xffe2a8, emissiveIntensity: 0.25 }), [0.0, 2.18, z - 0.1], false);
  // Maceta con malvón junto a la puerta.
  mesh(scene, new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), std(0xb5652f), [-0.75, 0.12, z - 0.3]);
  const rand = seeded(19);
  for(let i = 0;i < 10;i++)
    mesh(scene, new THREE.IcosahedronGeometry(0.06, 0), std(i % 3 ? 0x3f6b2c : 0xd8283a, 0.8), [-0.75 + (rand() - 0.5) * 0.25, 0.36 + rand() * 0.18, z - 0.3 + (rand() - 0.5) * 0.25]);
}

/** Piso de baldosas calcáreas bajo la parra (el resto del patio queda como está). */
function createCalcareoFloor(scene: THREE.Scene): void {
  const w = PERGOLA.x1 - PERGOLA.x0 + 0.6, d = PERGOLA.z1 - PERGOLA.z0 + 0.6;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, 0.75, { map: tiled(calcareoTexture(), w / 0.4, d / 0.4) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((PERGOLA.x0 + PERGOLA.x1) / 2, -0.026, (PERGOLA.z0 + PERGOLA.z1) / 2);
  floor.receiveShadow = true;
  scene.add(floor);
}
