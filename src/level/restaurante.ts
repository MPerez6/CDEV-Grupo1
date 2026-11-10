import * as THREE from 'three';
import { RESTAURANT_TABLES } from '../ai/client-brain.ts';
import { HOUSE_FACADE_Z } from './layout.ts';
import { mark } from './primitives.ts';
import { calcareoTexture, huleTexture, paperTexture, tiled } from './textures.ts';

const std = (
  color: THREE.ColorRepresentation,
  roughness = 0.85,
  extra: THREE.MeshStandardMaterialParameters = {}
) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function put(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  pos: [number, number, number],
  cast = true
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...pos);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Silla de madera estilo bodegón/parrilla con almohadón bordó. */
function createBistroChair(parent: THREE.Object3D, cx: number, cz: number, yaw: number): void {
  const chair = new THREE.Group();
  const wood = std(0x5a3921, 0.78);
  const cushion = std(0x7c1f28, 0.7);

  // Asiento de madera y almohadón
  put(chair, new THREE.BoxGeometry(0.44, 0.03, 0.44), wood, [0, 0.43, 0]);
  put(chair, new THREE.BoxGeometry(0.40, 0.025, 0.40), cushion, [0, 0.455, 0]);

  // Patas y travesaños
  for(const sx of [-1, 1]) {
    for(const sz of [-1, 1]) {
      put(chair, new THREE.CylinderGeometry(0.02, 0.016, 0.43, 8), wood, [sx * 0.18, 0.215, sz * 0.18]);
    }
    put(chair, new THREE.BoxGeometry(0.025, 0.025, 0.36), wood, [sx * 0.18, 0.14, 0]);
  }
  // Respaldo de listones de madera
  for(const sx of [-1, 1]) {
    put(chair, new THREE.CylinderGeometry(0.02, 0.018, 0.44, 8), wood, [sx * 0.18, 0.65, -0.19]);
  }
  put(chair, new THREE.BoxGeometry(0.42, 0.07, 0.025), wood, [0, 0.81, -0.19]);
  put(chair, new THREE.BoxGeometry(0.42, 0.055, 0.022), wood, [0, 0.67, -0.19]);
  put(chair, new THREE.BoxGeometry(0.36, 0.032, 0.018), wood, [0, 0.55, -0.19]);

  chair.position.set(cx, 0, cz);
  chair.rotation.y = yaw;
  parent.add(chair);
}

/** Clásico pingüino de cerámica de bodegón argentino para servir el vino de la casa. */
function createWinePenguin(parent: THREE.Object3D, x: number, y: number, z: number): void {
  const pGroup = new THREE.Group();
  pGroup.position.set(x, y, z);
  pGroup.rotation.y = -0.45;
  const blackGlaze = std(0x1d1d20, 0.22, { metalness: 0.08 });
  const whiteGlaze = std(0xf5f2ea, 0.25);
  const beakMat = std(0xd9822b, 0.35);

  const body = put(pGroup, new THREE.SphereGeometry(0.035, 10, 10), blackGlaze, [0, 0.046, 0]);
  body.scale.set(0.92, 1.35, 0.88);
  const belly = put(pGroup, new THREE.SphereGeometry(0.029, 8, 8), whiteGlaze, [0, 0.044, 0.012], false);
  belly.scale.set(0.82, 1.22, 0.65);
  put(pGroup, new THREE.SphereGeometry(0.023, 9, 8), blackGlaze, [0, 0.098, 0.004]);
  const beak = put(pGroup, new THREE.ConeGeometry(0.010, 0.026, 6), beakMat, [0, 0.102, 0.025], false);
  beak.rotation.x = Math.PI / 2 - 0.25;
  const handle = put(pGroup, new THREE.TorusGeometry(0.017, 0.004, 6, 10, Math.PI), blackGlaze, [0, 0.060, -0.025], false);
  handle.rotation.y = Math.PI / 2;
  parent.add(pGroup);
}

/** Panera de mimbre con pancitos caseros dorados y frasquito de chimichurri en el centro de la mesa. */
function createTableCenterpiece(parent: THREE.Object3D, x: number, y: number, z: number): void {
  const wickerMat = std(0xa87948, 0.88);
  const napkinMat = std(0xf7f2e8, 0.82);
  const breadMat = std(0xd48c46, 0.65);
  const glassJar = std(0xe5f0ec, 0.15, { transparent: true, opacity: 0.62 });
  const chimiMat = std(0x6e3b16, 0.45);

  put(parent, new THREE.CylinderGeometry(0.064, 0.048, 0.030, 12), wickerMat, [x - 0.08, y + 0.015, z + 0.19]);
  put(parent, new THREE.CylinderGeometry(0.058, 0.044, 0.010, 10), napkinMat, [x - 0.08, y + 0.026, z + 0.19], false);
  for(const [bx, bz, rot] of [[-0.016, -0.009, 0.2], [0.018, -0.007, -0.3], [0.0, 0.016, 0.5]] as const) {
    const roll = put(parent, new THREE.SphereGeometry(0.019, 8, 6), breadMat, [x - 0.08 + bx, y + 0.035, z + 0.19 + bz], false);
    roll.scale.set(1.25, 0.78, 0.92);
    roll.rotation.y = rot;
  }

  put(parent, new THREE.CylinderGeometry(0.020, 0.020, 0.048, 10), glassJar, [x + 0.082, y + 0.024, z + 0.20], false);
  put(parent, new THREE.CylinderGeometry(0.017, 0.017, 0.034, 10), chimiMat, [x + 0.082, y + 0.019, z + 0.20], false);
  put(parent, new THREE.CylinderGeometry(0.021, 0.021, 0.009, 10), std(0x9e242b, 0.5), [x + 0.082, y + 0.051, z + 0.20], false);
}

/** Tonel de roble bodeguero decorativo junto a la entrada del restaurante. */
function createWineBarrel(parent: THREE.Object3D, x: number, z: number): void {
  const bGroup = new THREE.Group();
  bGroup.position.set(x, 0, z);
  const oakMat = std(0x6b4426, 0.84);
  const hoopMat = std(0x2b2d2f, 0.45, { metalness: 0.78 });

  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.23, 0.0),
    new THREE.Vector2(0.28, 0.22),
    new THREE.Vector2(0.29, 0.41),
    new THREE.Vector2(0.28, 0.60),
    new THREE.Vector2(0.23, 0.80),
    new THREE.Vector2(0.0, 0.80),
  ];
  put(bGroup, new THREE.LatheGeometry(profile, 18), oakMat, [0, 0, 0]);

  for(const [hy, hr] of [[0.09, 0.248], [0.27, 0.284], [0.53, 0.284], [0.71, 0.248]] as const) {
    const hoop = put(bGroup, new THREE.TorusGeometry(hr, 0.008, 6, 20), hoopMat, [0, hy, 0], false);
    hoop.rotation.x = Math.PI / 2;
  }

  const bottleMat = std(0x1b3820, 0.18, { metalness: 0.12 });
  put(bGroup, new THREE.CylinderGeometry(0.034, 0.034, 0.17, 12), bottleMat, [-0.05, 0.885, 0]);
  put(bGroup, new THREE.CylinderGeometry(0.012, 0.030, 0.065, 10), bottleMat, [-0.05, 1.00, 0]);
  put(bGroup, new THREE.CylinderGeometry(0.013, 0.013, 0.024, 8), std(0xb8923a, 0.35, { metalness: 0.7 }), [-0.05, 1.04, 0]);

  parent.add(bGroup);
}

/**
 * Crea el ambiente de Restaurante ("Parrilla Don Ramón") con sus 4 mesitas individuales,
 * 8 platos interactivos, cartel luminoso y pizarrón de menú en la entrada.
 */
export function createRestaurante(scene: THREE.Scene, clickable: THREE.Object3D[]) {
  const group = new THREE.Group();
  group.name = 'restaurante-environment';

  const woodDark = std(0x4e321d, 0.8);
  const woodTop = std(0x7c5333, 0.75);
  const plateMat = std(0xf8f5ee, 0.25);
  const plateRimMat = std(0x7c1f28, 0.35);
  const glassMat = std(0xd4e8e5, 0.12, { transparent: true, opacity: 0.58 });
  const wineLiquidMat = std(0x5e111a, 0.18);
  const wineBottleMat = std(0x1e3d24, 0.2, { metalness: 0.1 });
  const labelPaperMat = std(0xf4ead5, 0.75);
  const metalMat = std(0xd4d6d6, 0.25, { metalness: 0.85 });
  const ironMat = std(0x262320, 0.55, { metalness: 0.65 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d1,
    emissive: 0xffb85c,
    emissiveIntensity: 1.55,
    roughness: 0.25,
  });
  const plateMeshes: THREE.Mesh[] = [];

  // 0. Extensión del piso calcáreo damero y guirnaldas de luces cálidas sobre las Mesas 3 y 4
  const extW = 2.4, extD = 4.5;
  const extFloor = put(
    group,
    new THREE.PlaneGeometry(extW, extD),
    std(0xffffff, 0.76, { map: tiled(calcareoTexture(), extW / 0.4, extD / 0.4) }),
    [-3.15, -0.025, 0.5],
    false
  );
  extFloor.rotation.x = -Math.PI / 2;

  for(const zBeam of [-1.25, 0.55, 2.35]) {
    put(group, new THREE.BoxGeometry(2.15, 0.07, 0.07), woodDark, [-3.0, 2.55, zBeam]);
  }
  put(group, new THREE.BoxGeometry(0.08, 0.08, 4.1), woodDark, [-2.0, 2.51, 0.55]);

  const wireMat = new THREE.LineBasicMaterial({ color: 0x22201d });
  for(const xStr of [-5.95, -3.15]) {
    const pts: THREE.Vector3[] = [];
    const steps = 16;
    for(let k = 0; k <= steps; k++) {
      const t = k / steps;
      const z = -1.35 + t * 3.8;
      const sag = Math.sin(t * Math.PI) * 0.14;
      pts.push(new THREE.Vector3(xStr, 2.48 - sag, z));
      if(k > 0 && k < steps && k % 3 === 0) {
        put(group, new THREE.SphereGeometry(0.032, 8, 8), bulbMat, [xStr, 2.44 - sag, z], false);
      }
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  const tableW = 0.92, tableD = 0.86;
  const cloth = std(0xffffff, 0.5, { map: tiled(huleTexture(), 2.2, 2.2) });

  // 1. Las 4 mesitas del restaurante con sus sillas, vajilla, botella de vino, pingüino, panera y cartel de número
  RESTAURANT_TABLES.forEach((t, tIdx) => {
    const { x, z, topY, tableNumber } = t;

    // Base en cruz y columna central torneada de la mesita
    put(group, new THREE.BoxGeometry(0.52, 0.035, 0.10), woodDark, [x, 0.018, z]);
    put(group, new THREE.BoxGeometry(0.10, 0.035, 0.52), woodDark, [x, 0.018, z]);
    put(group, new THREE.CylinderGeometry(0.055, 0.07, topY - 0.04, 12), woodDark, [x, topY / 2, z]);
    put(group, new THREE.CylinderGeometry(0.10, 0.12, 0.038, 12), ironMat, [x, 0.045, z]);

    // Tapa y mantel individual
    put(group, new THREE.BoxGeometry(tableW, 0.036, tableD), woodTop, [x, topY, z]);
    put(group, new THREE.BoxGeometry(tableW + 0.08, 0.006, tableD + 0.08), cloth, [x, topY + 0.021, z]);
    for(const dx of [-1, 1]) {
      put(group, new THREE.BoxGeometry(0.006, 0.11, tableD + 0.08), cloth, [x + dx * (tableW / 2 + 0.04), topY - 0.034, z]);
    }
    for(const dz of [-1, 1]) {
      put(group, new THREE.BoxGeometry(tableW + 0.08, 0.11, 0.006), cloth, [x, topY - 0.034, z + dz * (tableD / 2 + 0.04)]);
    }

    // Sillas enfrentadas (izquierda y derecha de la mesita)
    createBistroChair(group, x - 0.74, z, Math.PI / 2);
    createBistroChair(group, x + 0.74, z, -Math.PI / 2);

    // Platos interactivos, cubiertos con mango de madera y copas de vino para los 2 asientos de la mesita
    const surfaceY = topY + 0.024;
    for(const [sOffset, side] of [[-1, 0], [1, 1]] as const) {
      const seatIndex = tIdx * 2 + side;
      const px = x + sOffset * 0.25;
      const plateMesh = put(group, new THREE.CylinderGeometry(0.135, 0.11, 0.02, 20), plateMat, [px, surfaceY + 0.01, z]);
      mark(plateMesh, 'plate', clickable, seatIndex);
      plateMeshes.push(plateMesh);
      const rim = put(group, new THREE.RingGeometry(0.108, 0.128, 20), plateRimMat, [px, surfaceY + 0.021, z], false);
      rim.rotation.x = -Math.PI / 2;

      // Cubiertos junto al plato y copa con vino tinto
      for(const czOff of [-0.17, 0.17]) {
        put(group, new THREE.BoxGeometry(0.085, 0.004, 0.012), metalMat, [px + sOffset * 0.02, surfaceY + 0.004, z + czOff], false);
        put(group, new THREE.BoxGeometry(0.062, 0.008, 0.016), woodDark, [px - sOffset * 0.05, surfaceY + 0.006, z + czOff], false);
      }
      const gx = px - sOffset * 0.04;
      const gz = z - sOffset * 0.21;
      put(group, new THREE.CylinderGeometry(0.026, 0.028, 0.005, 12), glassMat, [gx, surfaceY + 0.003, gz], false);
      put(group, new THREE.CylinderGeometry(0.004, 0.004, 0.046, 8), glassMat, [gx, surfaceY + 0.027, gz], false);
      put(group, new THREE.CylinderGeometry(0.032, 0.020, 0.056, 12), glassMat, [gx, surfaceY + 0.076, gz], false);
      put(group, new THREE.CylinderGeometry(0.027, 0.018, 0.026, 10), wineLiquidMat, [gx, surfaceY + 0.066, gz], false);
    }

    // Centro de mesa: botella de vino tinto con etiqueta, pingüino de cerámica, panera con pan, chimichurri y número de mesa
    put(group, new THREE.CylinderGeometry(0.034, 0.034, 0.16, 12), wineBottleMat, [x, surfaceY + 0.08, z + 0.22]);
    put(group, new THREE.CylinderGeometry(0.035, 0.035, 0.065, 12, 1, true), labelPaperMat, [x, surfaceY + 0.075, z + 0.22], false);
    put(group, new THREE.CylinderGeometry(0.012, 0.032, 0.07, 10), wineBottleMat, [x, surfaceY + 0.19, z + 0.22]);
    put(group, new THREE.CylinderGeometry(0.013, 0.013, 0.025, 8), std(0x8c2228, 0.5), [x, surfaceY + 0.23, z + 0.22]);

    createWinePenguin(group, x + 0.085, surfaceY, z - 0.19);
    createTableCenterpiece(group, x, surfaceY, z);

    const numTex = paperTexture(`table-num-${tableNumber}`, 128, 96, (ctx, w, h) => {
      ctx.fillStyle = '#f7efe0';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#7c1f28';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#2b211b';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText('MESA', w / 2, 34);
      ctx.font = 'bold 42px Georgia, serif';
      ctx.fillStyle = '#7c1f28';
      ctx.fillText(String(tableNumber), w / 2, 78);
    });
    const signStand = put(
      group,
      new THREE.BoxGeometry(0.08, 0.09, 0.03),
      std(0xffffff, 0.6, { map: numTex }),
      [x - 0.035, surfaceY + 0.045, z - 0.24]
    );
    signStand.rotation.y = 0.25;
  });

  // 2. Mesa auxiliar de madera bajo el borde de la pérgola para apoyar la radio sin ocupar la mesada de carnes
  put(group, new THREE.BoxGeometry(0.46, 0.035, 0.36), woodTop, [-4.6, 0.768, -1.38]);
  put(group, new THREE.BoxGeometry(0.40, 0.020, 0.30), woodDark, [-4.6, 0.28, -1.38]);
  for(const sx of [-1, 1]) {
    for(const sz of [-1, 1]) {
      put(group, new THREE.CylinderGeometry(0.018, 0.015, 0.75, 8), woodDark, [-4.6 + sx * 0.19, 0.375, -1.38 + sz * 0.14]);
    }
  }

  // Estante rústico de vinos en la medianera izquierda junto a las mesas
  put(group, new THREE.BoxGeometry(0.14, 0.035, 0.92), woodDark, [-7.82, 1.52, 0.55]);
  for(const bz of [0.22, 0.88]) {
    put(group, new THREE.BoxGeometry(0.12, 0.10, 0.03), woodDark, [-7.83, 1.46, bz]);
  }
  for(const [idx, wz] of [0.28, 0.46, 0.64, 0.82].entries()) {
    put(group, new THREE.CylinderGeometry(0.032, 0.032, 0.17, 10), wineBottleMat, [-7.80, 1.62, wz]);
    put(group, new THREE.CylinderGeometry(0.011, 0.028, 0.06, 8), wineBottleMat, [-7.80, 1.73, wz]);
    put(group, new THREE.CylinderGeometry(0.033, 0.033, 0.055, 10, 1, true), labelPaperMat, [-7.80, 1.61 + (idx % 2) * 0.01, wz], false);
  }

  // 3. Cartel de "PARRILLA AsArt" sobre la fachada de entrada con marco de madera y faroles superiores
  const bannerTex = paperTexture('parrilla-asart-banner', 640, 160, (ctx, w, h) => {
    ctx.fillStyle = '#4a151b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e6c17a';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = '#c48b45';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#fff5de';
    ctx.textAlign = 'center';
    ctx.font = 'bold 50px Georgia, serif';
    ctx.fillText('PARRILLA AsArt', w / 2, 72);
    ctx.fillStyle = '#e9a56d';
    ctx.font = 'italic 25px Georgia, serif';
    ctx.fillText('✦ El Arte del Asado · Cortes a las Brasas ✦', w / 2, 122);
  });
  put(group, new THREE.BoxGeometry(3.20, 0.64, 0.04), woodDark, [-1.6, 2.94, HOUSE_FACADE_Z - 0.03]);
  put(
    group,
    new THREE.BoxGeometry(3.1, 0.56, 0.05),
    std(0xffffff, 0.55, { map: bannerTex }),
    [-1.6, 2.94, HOUSE_FACADE_Z - 0.05]
  );
  for(const lx of [-2.62, -0.58]) {
    put(group, new THREE.BoxGeometry(0.05, 0.05, 0.16), ironMat, [lx, 3.24, HOUSE_FACADE_Z - 0.11]);
    put(group, new THREE.CylinderGeometry(0.038, 0.068, 0.055, 10), ironMat, [lx, 3.20, HOUSE_FACADE_Z - 0.17]);
    put(group, new THREE.SphereGeometry(0.032, 8, 8), bulbMat, [lx, 3.16, HOUSE_FACADE_Z - 0.17], false);
  }

  // 4. Tonel de roble bodeguero y pizarrón de menú con caballete a la izquierda de la puerta
  createWineBarrel(group, -3.48, HOUSE_FACADE_Z - 0.42);
  const menuTex = paperTexture('menu-chalkboard-asart', 256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#1f2823';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = '#f5ebd6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('MENÚ AsArt', w / 2, 50);
    ctx.fillStyle = '#e9a56d';
    ctx.font = '20px system-ui, sans-serif';
    const items = ['• Chorizo criollo', '• Morcilla', '• Matambre tiernizado', '• Vacío (jugoso / a punto)', '• Tira de costilla', '• Falda parrillera'];
    items.forEach((it, idx) => ctx.fillText(it, w / 2, 102 + idx * 42));
  });
  const easelGroup = new THREE.Group();
  easelGroup.position.set(-2.72, 0, HOUSE_FACADE_Z - 0.52);
  easelGroup.rotation.y = Math.PI - 0.16;
  const boardMesh = put(
    easelGroup,
    new THREE.BoxGeometry(0.54, 0.82, 0.035),
    std(0xffffff, 0.8, { map: menuTex }),
    [0, 0.52, 0]
  );
  boardMesh.rotation.x = -0.10;
  // Patas traseras de caballete para que apoye firme en el piso
  for(const sx of [-0.22, 0.22]) {
    const backLeg = put(easelGroup, new THREE.BoxGeometry(0.03, 0.88, 0.03), woodDark, [sx, 0.43, -0.16]);
    backLeg.rotation.x = 0.22;
  }
  group.add(easelGroup);

  scene.add(group);

  return {
    group,
    plateMeshes,
    setActive(active: boolean): void {
      group.visible = active;
      for(const p of plateMeshes) p.userData.enabled = active;
    },
  };
}
