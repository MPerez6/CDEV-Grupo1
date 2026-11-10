import * as THREE from 'three';
import { HOUSE_FACADE_Z, PATIO_TREE, PERGOLA } from './layout.ts';
import {
  barkTexture,
  BRICK_TILE,
  brickTexture,
  calcareoTexture,
  chapaTexture,
  leafTexture,
  plasterTexture,
  seeded,
  tiled,
  treeFoliageTexture,
} from './textures.ts';

/**
 * Identidad de barrio del patio: medianeras de ladrillo, enredaderas realistas (santa rita y jazmín/hiedra),
 * árbol de patio en cantero de ladrillo, sendero de lajas, portón de chapa, casas vecinas y fachada.
 */
export function createBarrio(scene: THREE.Scene): void {
  createWalls(scene);
  createSantaRita(scene);
  createRightWallVine(scene);
  createPatioTree(scene);
  createGate(scene);
  createNeighbours(scene);
  createFacade(scene);
  createCalcareoFloor(scene);
}

function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
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

const std = (
  color: THREE.ColorRepresentation,
  roughness = 0.95,
  extra: THREE.MeshStandardMaterialParameters = {}
) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

/** Medianeras de ladrillo a la vista con carga de cemento arriba, pilares, faroles coloniales y cantero floral derecho. */
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

  // Pilares de ladrillo con faroles coloniales de hierro forjado en las medianeras laterales
  const pilasterMat = std(0xffffff, 0.96, { map: tiled(brick, 0.8, 3 / BRICK_TILE.h) });
  const capMat = std(0x9d978c, 0.9);
  const ironMat = std(0x22201d, 0.55, { metalness: 0.65 });
  const lanternGlass = new THREE.MeshStandardMaterial({
    color: 0xfff3d1,
    emissive: 0xffb85c,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });

  for(const sx of [-1, 1] as const) {
    for(const zPil of [-4.2, -0.4, 3.2]) {
      const px = sx * 7.86;
      mesh(scene, new THREE.BoxGeometry(0.24, 3.04, 0.28), pilasterMat, [px, 1.47, zPil], false);
      mesh(scene, new THREE.BoxGeometry(0.30, 0.09, 0.34), capMat, [px, 3.02, zPil], false);

      // Farol colonial adosado al pilar
      const lx = sx * 7.66;
      mesh(scene, new THREE.BoxGeometry(0.18, 0.03, 0.03), ironMat, [lx + sx * 0.06, 2.22, zPil], false);
      mesh(scene, new THREE.CylinderGeometry(0.08, 0.05, 0.18, 6), lanternGlass, [lx, 2.28, zPil], false);
      mesh(scene, new THREE.ConeGeometry(0.11, 0.08, 6), ironMat, [lx, 2.40, zPil], false);
    }
  }

  // Cantero bajo de ladrillo con matas de lavanda y agapantos junto a la medianera derecha
  const planterBrick = std(0xffffff, 0.95, { map: tiled(brick, 1.8, 0.25) });
  mesh(scene, new THREE.BoxGeometry(0.42, 0.22, 3.4), planterBrick, [7.72, 0.08, -0.25]);
  mesh(scene, new THREE.BoxGeometry(0.46, 0.04, 3.46), capMat, [7.72, 0.20, -0.25], false);
  mesh(scene, new THREE.BoxGeometry(0.36, 0.19, 3.32), std(0x2d2218, 1), [7.74, 0.09, -0.25], false);

  const bushLeaf = new THREE.MeshStandardMaterial({
    map: treeFoliageTexture(),
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.72,
  });
  const lavMat = std(0x7c5bc4, 0.65);
  const stemMat = std(0x3b5e28, 0.85);
  for(let k = 0; k < 9; k++) {
    const pz = -1.65 + k * 0.35;
    const clump = mesh(scene, new THREE.PlaneGeometry(0.28, 0.28), bushLeaf, [7.68, 0.28, pz]);
    clump.rotation.set(-Math.PI / 3, (k * 1.1) % Math.PI, 0);
    for(const dx of [-0.05, 0.04]) {
      mesh(scene, new THREE.CylinderGeometry(0.006, 0.006, 0.22, 5), stemMat, [7.68 + dx, 0.31, pz + dx * 0.5], false);
      mesh(scene, new THREE.CylinderGeometry(0.018, 0.022, 0.09, 6), lavMat, [7.68 + dx, 0.44, pz + dx * 0.5], false);
    }
  }
}

/**
 * Santa Rita (buganvilla) realista trepando por la medianera izquierda y doblando hacia el fondo:
 * - Cantero bajo de ladrillo con tierra.
 * - Ramas leñosas principales y tallos secundarios adheridos al muro y desbordando por la carga superior.
 * - Follaje denso que sigue las ramas y racimos de brácteas florales en tonos magenta, fucsia y violeta.
 */
function createSantaRita(scene: THREE.Scene): void {
  const rand = seeded(7);
  const bark = barkTexture();
  const stemMat = std(0x634832, 0.94, { map: tiled(bark, 1, 4) });
  const greenStemMat = std(0x4f5a30, 0.88);
  const brickMat = std(0xffffff, 0.95, { map: tiled(brickTexture(), 1.6, 0.25) });

  // Cantero largo al pie de la medianera izquierda
  mesh(scene, new THREE.BoxGeometry(0.42, 0.22, 4.8), brickMat, [-7.72, 0.08, -4.55]);
  mesh(scene, new THREE.BoxGeometry(0.46, 0.04, 4.86), std(0x9e978b), [-7.72, 0.20, -4.55], false);
  mesh(scene, new THREE.BoxGeometry(0.36, 0.19, 4.72), std(0x2d2218, 1), [-7.74, 0.09, -4.55], false);

  // Generamos tallos leñosos principales que suben y se ramifican por la pared (x ~ -7.88) y el rincón del fondo
  const vinePoints: THREE.Vector3[] = [];
  const mainRootsZ = [-6.6, -5.7, -4.8, -3.9, -2.9];

  for(let rIdx = 0; rIdx < mainRootsZ.length; rIdx++) {
    const baseZ = mainRootsZ[rIdx];
    const pts: THREE.Vector3[] = [];
    const segs = 9;
    let curZ = baseZ;
    for(let s = 0; s <= segs; s++) {
      const t = s / segs;
      const y = 0.15 + t * 2.95;
      curZ += (rand() - 0.48) * 0.38;
      // Al llegar arriba (t > 0.85) se vuelca sobre el lomo de la medianera
      const spillX = t > 0.82 ? (t - 0.82) * 0.9 : 0;
      const p = new THREE.Vector3(-7.86 + spillX + rand() * 0.03, y, THREE.MathUtils.clamp(curZ, -6.95, -2.1));
      pts.push(p);
      if(s >= 2) vinePoints.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    mesh(scene, new THREE.TubeGeometry(curve, 28, 0.022 - rIdx * 0.0015, 6, false), stemMat, [0, 0, 0]);

    // 2 ramas laterales por cada tronco principal
    for(const branchSide of [-1, 1]) {
      const startFrac = 0.32 + rand() * 0.38;
      const origin = curve.getPoint(startFrac);
      const bPts: THREE.Vector3[] = [origin];
      for(let b = 1; b <= 5; b++) {
        const bt = b / 5;
        const by = Math.min(3.15, origin.y + bt * (0.9 + rand() * 0.6));
        const bz = THREE.MathUtils.clamp(origin.z + branchSide * bt * (0.65 + rand() * 0.55), -6.98, -1.95);
        const bx = -7.86 + (by > 2.95 ? 0.12 + rand() * 0.18 : 0.02);
        const bp = new THREE.Vector3(bx, by, bz);
        bPts.push(bp);
        vinePoints.push(bp);
      }
      const bCurve = new THREE.CatmullRomCurve3(bPts);
      mesh(scene, new THREE.TubeGeometry(bCurve, 16, 0.011, 5, false), greenStemMat, [0, 0, 0]);
    }
  }

  // Rama que dobla por la esquina hacia la medianera del fondo (z ~ -7.01)
  const cornerPts: THREE.Vector3[] = [];
  for(let i = 0; i <= 7; i++) {
    const t = i / 7;
    const p = new THREE.Vector3(-7.85 + t * 2.3, 2.35 + Math.sin(t * Math.PI) * 0.68, -7.01 + rand() * 0.03);
    cornerPts.push(p);
    vinePoints.push(p);
  }
  mesh(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cornerPts), 22, 0.015, 6, false), stemMat, [0, 0, 0]);

  // Geometría de hoja ligeramente arqueada
  const leafGeo = new THREE.PlaneGeometry(0.19, 0.19, 2, 2);
  const lp = leafGeo.getAttribute('position');
  for(let i = 0; i < lp.count; i++) {
    lp.setZ(i, -(lp.getX(i) ** 2 + lp.getY(i) ** 2) * 1.1);
  }
  leafGeo.computeVertexNormals();

  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTexture(),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.76,
  });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, 980);
  leaves.castShadow = true;
  leaves.receiveShadow = true;

  // Geometría de ramillete de brácteas de Santa Rita (3 pétalos de papel cruzados)
  const bractGeo = new THREE.DodecahedronGeometry(0.042, 0);
  bractGeo.scale(1.15, 0.65, 1.0);
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.58,
  });
  const flowers = new THREE.InstancedMesh(bractGeo, flowerMat, 640);
  flowers.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for(let i = 0; i < leaves.count; i++) {
    const anchor = vinePoints[i % vinePoints.length];
    const spreadY = (rand() - 0.45) * 0.42;
    const spreadZ = (rand() - 0.5) * 0.45;
    const isCorner = anchor.z < -6.96 && anchor.x > -7.7;

    const ly = THREE.MathUtils.clamp(anchor.y + spreadY, 0.24, 3.24);
    const overhang = ly > 2.95 ? (rand() - 0.25) * 0.35 : rand() * 0.08;
    const lx = isCorner ? anchor.x + spreadZ : -7.86 + overhang;
    const lz = isCorner ? -7.00 + rand() * 0.08 : THREE.MathUtils.clamp(anchor.z + spreadZ, -7.0, -1.85);

    dummy.position.set(lx, ly, lz);
    dummy.rotation.set(
      (rand() - 0.5) * 1.0,
      (isCorner ? 0 : Math.PI / 2) + (rand() - 0.5) * 1.0,
      rand() * Math.PI * 2
    );
    dummy.scale.setScalar(0.75 + rand() * 0.70);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, color.setHSL(0.26 + rand() * 0.07, 0.48 + rand() * 0.22, 0.20 + rand() * 0.14));
  }

  // Racimos florales densos en la parte media y alta de las ramas
  for(let i = 0; i < flowers.count; i++) {
    // Agrupamos de a 4 brácteas por racimo floral
    const clusterSeed = Math.floor(i / 4);
    const anchor = vinePoints[(clusterSeed * 7) % vinePoints.length];
    const isCorner = anchor.z < -6.96 && anchor.x > -7.7;
    const cy = THREE.MathUtils.clamp(anchor.y + 0.15 + ((clusterSeed * 13) % 10) * 0.04, 0.85, 3.26);
    const cz = isCorner ? -6.98 : THREE.MathUtils.clamp(anchor.z + ((clusterSeed % 5) - 2) * 0.12, -6.95, -1.95);
    const cx = isCorner
      ? anchor.x + ((clusterSeed % 5) - 2) * 0.12
      : -7.82 + (cy > 2.95 ? (rand() - 0.2) * 0.32 : rand() * 0.10);

    dummy.position.set(
      cx + (rand() - 0.5) * 0.09,
      cy + (rand() - 0.5) * 0.09,
      cz + (rand() - 0.5) * 0.09
    );
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.set(0.85 + rand() * 0.6, 0.65 + rand() * 0.5, 0.85 + rand() * 0.6);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);

    // Tonos vibrantes de Santa Rita: magenta intenso, fucsia, púrpura-rosado y coral
    const huePick = rand();
    const hue = huePick < 0.7 ? 0.90 + rand() * 0.05 : 0.84 + rand() * 0.05;
    flowers.setColorAt(i, color.setHSL(hue, 0.78 + rand() * 0.18, 0.42 + rand() * 0.16));
  }

  scene.add(leaves, flowers);
}

/**
 * Enredadera de hiedra y jazmín trepando en la esquina derecha/fondo de la medianera
 * para equilibrar el verde de las paredes del patio.
 */
function createRightWallVine(scene: THREE.Scene): void {
  const rand = seeded(103);
  const stemMat = std(0x524632, 0.92);
  const anchors: THREE.Vector3[] = [];

  for(let b = 0; b < 4; b++) {
    const zBase = -6.8 + b * 0.85;
    const pts: THREE.Vector3[] = [];
    for(let s = 0; s <= 7; s++) {
      const t = s / 7;
      const p = new THREE.Vector3(
        7.87 - (t > 0.8 ? (t - 0.8) * 0.6 : 0),
        0.1 + t * 2.95,
        zBase + Math.sin(t * 5 + b) * 0.28
      );
      pts.push(p);
      if(s >= 2) anchors.push(p);
    }
    mesh(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.015, 5, false), stemMat, [0, 0, 0]);
  }

  const leaves = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.17, 0.17),
    new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.72 }),
    380
  );
  const blossoms = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.022, 6, 5),
    std(0xfff9e8, 0.55),
    110
  );
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for(let i = 0; i < leaves.count; i++) {
    const a = anchors[i % anchors.length];
    dummy.position.set(
      7.85 - rand() * 0.08,
      THREE.MathUtils.clamp(a.y + (rand() - 0.45) * 0.45, 0.25, 3.18),
      THREE.MathUtils.clamp(a.z + (rand() - 0.5) * 0.5, -7.0, -3.4)
    );
    dummy.rotation.set((rand() - 0.5) * 0.9, -Math.PI / 2 + (rand() - 0.5) * 0.9, rand() * Math.PI * 2);
    dummy.scale.setScalar(0.7 + rand() * 0.6);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, color.setHSL(0.29 + rand() * 0.05, 0.50 + rand() * 0.2, 0.18 + rand() * 0.12));
  }

  for(let i = 0; i < blossoms.count; i++) {
    const a = anchors[(i * 3) % anchors.length];
    dummy.position.set(7.82 - rand() * 0.08, a.y + (rand() - 0.5) * 0.35, a.z + (rand() - 0.5) * 0.35);
    dummy.scale.set(1.2, 0.7, 1.2);
    dummy.updateMatrix();
    blossoms.setMatrixAt(i, dummy.matrix);
  }
  scene.add(leaves, blossoms);
}

/**
 * Árbol del patio (Limonero / árbol frutal de patio argentino) en cantero circular de ladrillo:
 * - Cantero de ladrillo visto con bordillo de cemento, tierra fértil, raíces superficiales y plantas bajas.
 * - Tronco añoso curvo con corteza texturada, 6 ramas primarias y 14 secundarias abiertas en copa.
 * - Copa frondosa multicapa con 1.500 ramilletes de hojas, limones dorados y flores de azahar.
 */
function createPatioTree(scene: THREE.Scene): void {
  const { x: tx, z: tz, radius: planterR } = PATIO_TREE;
  const rand = seeded(137);
  const bark = barkTexture();
  const trunkMat = std(0x69503c, 0.94, { map: tiled(bark, 2, 5) });
  const branchMat = std(0x5b4634, 0.92, { map: tiled(bark, 1, 3) });
  const planterBrick = std(0xffffff, 0.95, { map: tiled(brickTexture(), 2.4, 0.35) });
  const rimMat = std(0xa8a194, 0.88);
  const soilMat = std(0x2c2117, 1.0);

  // 1. Cantero circular de ladrillo a la vista
  const planterH = 0.30;
  mesh(scene, new THREE.CylinderGeometry(planterR, planterR + 0.03, planterH, 24, 1, true), planterBrick, [tx, planterH / 2 - 0.03, tz]);
  mesh(scene, new THREE.CylinderGeometry(planterR - 0.09, planterR - 0.09, planterH, 24, 1, true), planterBrick, [tx, planterH / 2 - 0.03, tz]);
  const rim = mesh(scene, new THREE.RingGeometry(planterR - 0.11, planterR + 0.03, 24), rimMat, [tx, planterH - 0.028, tz], false);
  rim.rotation.x = -Math.PI / 2;
  const soil = mesh(scene, new THREE.CircleGeometry(planterR - 0.09, 24), soilMat, [tx, planterH - 0.06, tz], false);
  soil.rotation.x = -Math.PI / 2;

  // 2. Tronco principal orgánico con ensanchamiento basal y raíces superficiales
  const forkPos = new THREE.Vector3(tx + 0.05, 1.92, tz + 0.04);
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(tx, 0.12, tz),
    new THREE.Vector3(tx - 0.04, 0.72, tz + 0.03),
    new THREE.Vector3(tx + 0.02, 1.35, tz - 0.02),
    forkPos,
  ]);
  mesh(scene, new THREE.TubeGeometry(trunkCurve, 28, 0.145, 12, false), trunkMat, [0, 0, 0]);
  // Base ensanchada (root flare)
  mesh(scene, new THREE.CylinderGeometry(0.14, 0.23, 0.36, 12), trunkMat, [tx - 0.01, 0.28, tz + 0.01]);

  // Raíces superficiales en la tierra del cantero
  for(let r = 0; r < 5; r++) {
    const ang = (r / 5) * Math.PI * 2 + 0.3;
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tx + Math.cos(ang) * 0.11, 0.28, tz + Math.sin(ang) * 0.11),
      new THREE.Vector3(tx + Math.cos(ang) * 0.28, 0.23, tz + Math.sin(ang) * 0.28),
      new THREE.Vector3(tx + Math.cos(ang) * 0.48, 0.19, tz + Math.sin(ang) * 0.48),
    ]);
    mesh(scene, new THREE.TubeGeometry(rootCurve, 10, 0.042, 6, false), trunkMat, [0, 0, 0]);
  }

  // 3. Ramas primarias y secundarias abiertas formando la estructura de la copa
  const crownNodes: { center: THREE.Vector3; radius: number }[] = [];
  const numBoughs = 6;
  for(let b = 0; b < numBoughs; b++) {
    const angle = (b / numBoughs) * Math.PI * 2 + (rand() - 0.5) * 0.28;
    const reach = 1.05 + rand() * 0.38;
    const midY = 2.55 + rand() * 0.25;
    const topY = 3.15 + rand() * 0.45;

    const midPt = new THREE.Vector3(
      forkPos.x + Math.cos(angle) * reach * 0.52,
      midY,
      forkPos.z + Math.sin(angle) * reach * 0.52
    );
    const endPt = new THREE.Vector3(
      forkPos.x + Math.cos(angle) * reach,
      topY,
      forkPos.z + Math.sin(angle) * reach
    );

    const boughCurve = new THREE.CatmullRomCurve3([forkPos, midPt, endPt]);
    mesh(scene, new THREE.TubeGeometry(boughCurve, 20, 0.068, 8, false), branchMat, [0, 0, 0]);
    crownNodes.push({ center: endPt.clone().add(new THREE.Vector3(0, 0.22, 0)), radius: 0.82 });

    // 2 sub-ramas secundarias por cada rama maestra
    for(const side of [-1, 1]) {
      const subAngle = angle + side * (0.42 + rand() * 0.22);
      const subReach = reach + 0.42 + rand() * 0.28;
      const subEnd = new THREE.Vector3(
        forkPos.x + Math.cos(subAngle) * subReach,
        topY + 0.32 + rand() * 0.42,
        forkPos.z + Math.sin(subAngle) * subReach
      );
      const subCurve = new THREE.CatmullRomCurve3([
        midPt.clone().lerp(endPt, 0.45),
        endPt.clone().lerp(subEnd, 0.5).add(new THREE.Vector3(0, 0.14, 0)),
        subEnd,
      ]);
      mesh(scene, new THREE.TubeGeometry(subCurve, 14, 0.036, 6, false), branchMat, [0, 0, 0]);
      crownNodes.push({ center: subEnd.clone().add(new THREE.Vector3(0, 0.15, 0)), radius: 0.72 });
    }
  }
  // Cúpula central alta de la copa
  const topCrown = new THREE.Vector3(forkPos.x, 3.85, forkPos.z);
  const centerBranch = new THREE.CatmullRomCurve3([
    forkPos,
    new THREE.Vector3(forkPos.x - 0.08, 2.85, forkPos.z + 0.06),
    new THREE.Vector3(forkPos.x + 0.04, 3.65, forkPos.z - 0.04),
  ]);
  mesh(scene, new THREE.TubeGeometry(centerBranch, 16, 0.055, 7, false), branchMat, [0, 0, 0]);
  crownNodes.push({ center: topCrown, radius: 0.95 });

  // 4. Copa frondosa de ramilletes foliares
  const foliageGeo = new THREE.PlaneGeometry(0.42, 0.42, 2, 2);
  const fp = foliageGeo.getAttribute('position');
  for(let i = 0; i < fp.count; i++) {
    fp.setZ(i, -(fp.getX(i) ** 2 + fp.getY(i) ** 2) * 0.65);
  }
  foliageGeo.computeVertexNormals();

  const foliageMat = new THREE.MeshStandardMaterial({
    map: treeFoliageTexture(),
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.70,
  });
  const foliageCount = 1520;
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, foliageCount);
  foliage.castShadow = true;
  foliage.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for(let i = 0; i < foliageCount; i++) {
    const node = crownNodes[i % crownNodes.length];
    // Distribución esférica achatada alrededor de cada sub-copa
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = node.radius * (0.35 + 0.65 * Math.cbrt(rand()));

    const lx = node.center.x + Math.sin(phi) * Math.cos(theta) * r * 1.15;
    const ly = node.center.y + Math.cos(phi) * r * 0.78;
    const lz = node.center.z + Math.sin(phi) * Math.sin(theta) * r * 1.15;

    dummy.position.set(lx, ly, lz);
    dummy.rotation.set((rand() - 0.5) * 1.5, rand() * Math.PI * 2, (rand() - 0.5) * 1.5);
    dummy.scale.setScalar(0.75 + rand() * 0.75);
    dummy.updateMatrix();
    foliage.setMatrixAt(i, dummy.matrix);

    // Gradiente de iluminación natural: hojas más doradas/claras arriba, más intensas abajo
    const sunHeight = THREE.MathUtils.clamp((ly - 2.4) / 2.0, 0, 1);
    foliage.setColorAt(
      i,
      color.setHSL(0.24 + rand() * 0.06, 0.50 + rand() * 0.20, 0.19 + sunHeight * 0.16 + rand() * 0.06)
    );
  }
  scene.add(foliage);

  // 5. Limones maduros y flores de azahar entre el follaje del árbol
  const lemonGeo = new THREE.SphereGeometry(0.036, 10, 8);
  lemonGeo.scale(0.82, 1.28, 0.82);
  const lemonMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4c82a,
    roughness: 0.34,
    clearcoat: 0.28,
  });
  const lemons = new THREE.InstancedMesh(lemonGeo, lemonMat, 42);
  lemons.castShadow = true;

  for(let i = 0; i < lemons.count; i++) {
    const node = crownNodes[(i * 3) % crownNodes.length];
    const ang = rand() * Math.PI * 2;
    const dist = (0.3 + rand() * 0.55) * node.radius;
    dummy.position.set(
      node.center.x + Math.cos(ang) * dist,
      node.center.y - 0.12 + (rand() - 0.5) * 0.45,
      node.center.z + Math.sin(ang) * dist
    );
    dummy.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI, (rand() - 0.5) * 0.4);
    dummy.scale.setScalar(0.85 + rand() * 0.35);
    dummy.updateMatrix();
    lemons.setMatrixAt(i, dummy.matrix);
  }
  scene.add(lemons);

  // Matas verdes y flores bajas dentro del cantero del árbol
  const borderPlants = new THREE.InstancedMesh(
    foliageGeo,
    foliageMat,
    28
  );
  for(let i = 0; i < borderPlants.count; i++) {
    const ang = (i / borderPlants.count) * Math.PI * 2 + (rand() - 0.5) * 0.2;
    const rad = 0.28 + rand() * (planterR - 0.42);
    dummy.position.set(tx + Math.cos(ang) * rad, planterH + 0.04 + rand() * 0.06, tz + Math.sin(ang) * rad);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.6, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.42 + rand() * 0.25);
    dummy.updateMatrix();
    borderPlants.setMatrixAt(i, dummy.matrix);
    borderPlants.setColorAt(i, color.setHSL(0.27 + rand() * 0.05, 0.55, 0.24 + rand() * 0.10));
  }
  scene.add(borderPlants);
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
  // Puerta de madera con marco, hueco interior y hoja batiente sobre bisagras ('entrance-door-pivot').
  const wood = std(0x6a4127, 0.8);
  mesh(scene, new THREE.BoxGeometry(1.08, 2.18, 0.08), std(0x3e3a35, 0.8), [-1.6, 1.09, z - 0.02], false);
  // Vano oscuro del interior que se ve cuando la puerta se abre al paso de los clientes
  mesh(scene, new THREE.BoxGeometry(0.94, 2.06, 0.04), std(0x16120e, 0.98), [-1.6, 1.03, z + 0.01], false);

  const doorPivot = new THREE.Group();
  doorPivot.name = 'entrance-door-pivot';
  // Bisagra en el marco izquierdo mirando desde el patio (x = -2.06) para que la hoja abra hacia la izquierda sin chocar al cliente ni a la maceta
  doorPivot.position.set(-2.06, 0, z - 0.04);
  mesh(doorPivot, new THREE.BoxGeometry(0.92, 2.04, 0.055), wood, [0.46, 1.03, 0], true);
  for(const y of [0.55, 1.5]) {
    mesh(doorPivot, new THREE.BoxGeometry(0.7, 0.62, 0.02), std(0x5a3620, 0.8), [0.46, y, -0.035], false);
  }
  mesh(doorPivot, new THREE.SphereGeometry(0.035, 10, 8), std(0xc9a64a, 0.3, { metalness: 0.9 }), [0.81, 1.0, -0.05], false);
  mesh(doorPivot, new THREE.SphereGeometry(0.035, 10, 8), std(0xc9a64a, 0.3, { metalness: 0.9 }), [0.81, 1.0, 0.05], false);
  scene.add(doorPivot);
  // Cornisa moldurada superior y alero de tejas coloniales sobre la fachada
  mesh(scene, new THREE.BoxGeometry(16.25, 0.12, 0.14), std(0xc4b9a6), [0, 3.28, z - 0.04], false);
  const tileMat = std(0xa84b2b, 0.78);
  for(let tx = -7.8; tx <= 7.8; tx += 0.30) {
    const roofTile = mesh(scene, new THREE.CylinderGeometry(0.065, 0.075, 0.42, 8, 1, false, 0, Math.PI), tileMat, [tx, 3.38, z - 0.10], false);
    roofTile.rotation.x = Math.PI / 2 + 0.25;
  }

  // Ventana: marco blanco, postigos laterales de madera, vidrio, cortina y reja de hierro.
  const shutterMat = std(0x4b3321, 0.82);
  for(const sx of [-1, 1]) {
    mesh(scene, new THREE.BoxGeometry(0.32, 1.20, 0.035), shutterMat, [2.0 + sx * 0.90, 1.55, z - 0.03], false);
  }
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
  // Macetas de barro torneadas con tierra negra, tallos, hojas reales y flores (malvones) junto a la fachada.
  createFacadePlanters(scene, z);
}

function createFacadePlanters(scene: THREE.Scene, facadeZ: number): void {
  const rand = seeded(19);
  const terracotta = std(0xb55d2c, 0.82);
  const darkTerracotta = std(0x8f461e, 0.88);
  const soilMat = std(0x281e15, 0.98);
  const stemMat = std(0x3b5e28, 0.85);

  // Perfil torneado de maceta de barro con plato inferior, labio grueso y hueco interior para la tierra
  const potProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.145, 0.0),
    new THREE.Vector2(0.155, 0.032),
    new THREE.Vector2(0.125, 0.035),
    new THREE.Vector2(0.175, 0.25),
    new THREE.Vector2(0.195, 0.258),
    new THREE.Vector2(0.195, 0.305),
    new THREE.Vector2(0.162, 0.305),
    new THREE.Vector2(0.155, 0.265),
  ];
  const potGeo = new THREE.LatheGeometry(potProfile, 20);

  // Hoja arqueada con textura para las plantas de maceta
  const plantLeafGeo = new THREE.PlaneGeometry(0.16, 0.16, 2, 2);
  const plp = plantLeafGeo.getAttribute('position');
  for(let i = 0; i < plp.count; i++) {
    plp.setZ(i, -(plp.getX(i) ** 2 + plp.getY(i) ** 2) * 1.4);
  }
  plantLeafGeo.computeVertexNormals();

  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTexture(),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.72,
  });
  const bushMat = new THREE.MeshStandardMaterial({
    map: treeFoliageTexture(),
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.70,
  });

  const pots: { x: number; z: number; scale: number; flowerColors: number[] }[] = [
    { x: -0.78, z: facadeZ - 0.32, scale: 1.05, flowerColors: [0xd62432, 0xe83b48, 0xb81824] }, // Malvón rojo intenso junto a la puerta
    { x: 1.18, z: facadeZ - 0.30, scale: 0.92, flowerColors: [0xf06478, 0xe24962, 0xf78fa0] },  // Malvón rosado/salmón
    { x: 2.82, z: facadeZ - 0.32, scale: 1.0, flowerColors: [0xc82238, 0x9b2c8c, 0xf2e8dc] },   // Malvones rojos y violetas
  ];

  for(const cfg of pots) {
    const group = new THREE.Group();
    group.position.set(cfg.x, -0.025, cfg.z);
    group.scale.setScalar(cfg.scale);

    // Cuerpo de la maceta y disco de tierra negra hundido dentro del borde
    mesh(group, potGeo, terracotta, [0, 0, 0]);
    const soil = mesh(group, new THREE.CircleGeometry(0.156, 18), soilMat, [0, 0.272, 0], false);
    soil.rotation.x = -Math.PI / 2;

    // Tallos verdes que salen de la tierra y sostienen hojas y umbelas de flores
    const numStems = 6;
    for(let s = 0; s < numStems; s++) {
      const ang = (s / numStems) * Math.PI * 2 + (rand() - 0.5) * 0.45;
      const spread = 0.04 + rand() * 0.06;
      const topX = Math.cos(ang) * (spread + 0.05);
      const topZ = Math.sin(ang) * (spread + 0.05);
      const stemH = 0.42 + rand() * 0.14;

      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.03, 0.26, Math.sin(ang) * 0.03),
        new THREE.Vector3(topX * 0.65, 0.35, topZ * 0.65),
        new THREE.Vector3(topX, stemH, topZ),
      ]);
      mesh(group, new THREE.TubeGeometry(stemCurve, 8, 0.007, 5, false), stemMat, [0, 0, 0]);

      // Hojas de malvón abiertas alrededor del tallo
      for(let l = 0; l < 4; l++) {
        const lFrac = 0.35 + (l / 4) * 0.5;
        const pt = stemCurve.getPoint(lFrac);
        const lAng = ang + (l - 1.5) * 0.9 + (rand() - 0.5) * 0.3;
        const leaf = new THREE.Mesh(l % 2 === 0 ? plantLeafGeo : new THREE.PlaneGeometry(0.19, 0.19), l % 2 === 0 ? leafMat : bushMat);
        leaf.position.set(
          pt.x + Math.cos(lAng) * 0.04,
          pt.y + 0.01,
          pt.z + Math.sin(lAng) * 0.04
        );
        leaf.rotation.set(-Math.PI / 2 + 0.45 * Math.sin(lAng), lAng, (rand() - 0.5) * 0.5);
        leaf.scale.setScalar(0.85 + rand() * 0.35);
        leaf.castShadow = true;
        leaf.receiveShadow = true;
        group.add(leaf);
      }

      // Umbela floral (racimo esférico de pétalos pequeños en la punta del tallo)
      if(s < 4) {
        const flowerColor = cfg.flowerColors[s % cfg.flowerColors.length];
        const petalMat = std(flowerColor, 0.65);
        const centerPt = new THREE.Vector3(topX, stemH + 0.035, topZ);
        for(let p = 0; p < 9; p++) {
          const phi = Math.acos(1 - (2 * (p + 0.5)) / 9);
          const theta = p * 2.39996;
          const r = 0.024 + rand() * 0.01;
          const petal = mesh(
            group,
            new THREE.DodecahedronGeometry(0.018, 0),
            petalMat,
            [
              centerPt.x + Math.sin(phi) * Math.cos(theta) * r,
              centerPt.y + Math.cos(phi) * r * 0.85,
              centerPt.z + Math.sin(phi) * Math.sin(theta) * r,
            ]
          );
          petal.scale.set(1.2, 0.65, 1.2);
          petal.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        }
      }
    }

    scene.add(group);
  }

  // Jardinera rectangular baja de ladrillo/barro centrada bajo la ventana (x = 2.0)
  const boxGroup = new THREE.Group();
  boxGroup.position.set(2.0, -0.025, facadeZ - 0.28);
  mesh(boxGroup, new THREE.BoxGeometry(0.76, 0.22, 0.26), darkTerracotta, [0, 0.11, 0]);
  mesh(boxGroup, new THREE.BoxGeometry(0.80, 0.035, 0.30), terracotta, [0, 0.21, 0]);
  mesh(boxGroup, new THREE.BoxGeometry(0.70, 0.02, 0.20), soilMat, [0, 0.222, 0], false);
  for(let k = 0; k < 14; k++) {
    const lx = -0.28 + (k / 13) * 0.56 + (rand() - 0.5) * 0.04;
    const lz = (rand() - 0.5) * 0.10;
    const sprig = new THREE.Mesh(plantLeafGeo, k % 2 === 0 ? bushMat : leafMat);
    sprig.position.set(lx, 0.27 + rand() * 0.06, lz);
    sprig.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.7, rand() * Math.PI * 2, (rand() - 0.5) * 0.5);
    sprig.scale.setScalar(0.95 + rand() * 0.4);
    sprig.castShadow = true;
    boxGroup.add(sprig);
    if(k % 3 === 0) {
      const fCol = k % 6 === 0 ? 0xe83b48 : 0xfff5d6;
      for(let b = 0; b < 5; b++) {
        const fl = mesh(
          boxGroup,
          new THREE.DodecahedronGeometry(0.016, 0),
          std(fCol, 0.6),
          [lx + (rand() - 0.5) * 0.05, 0.33 + rand() * 0.05, lz + (rand() - 0.5) * 0.05]
        );
        fl.scale.set(1.2, 0.65, 1.2);
      }
    }
  }
  scene.add(boxGroup);
}

/** Piso de baldosas calcáreas bajo la parra. */
function createCalcareoFloor(scene: THREE.Scene): void {
  const w = PERGOLA.x1 - PERGOLA.x0 + 0.6, d = PERGOLA.z1 - PERGOLA.z0 + 0.6;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, 0.75, { map: tiled(calcareoTexture(), w / 0.4, d / 0.4) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((PERGOLA.x0 + PERGOLA.x1) / 2, -0.026, (PERGOLA.z0 + PERGOLA.z1) / 2);
  floor.receiveShadow = true;
  scene.add(floor);
}
