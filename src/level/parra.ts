import * as THREE from 'three';
import { PERGOLA } from './layout.ts';
import { barkTexture, brickTexture, leafTexture, seeded, tiled } from './textures.ts';

/**
 * Pérgola de madera con parra sobre la mesa familiar:
 * - Estructura con bases, escuadras, tirantes, alambres de parral y guirnalda de luces cálidas.
 * - Tronco añoso retorcido en cantero de ladrillo y red de sarmientos leñosos por el techo.
 * - Follaje multicapa con caída perimetral y racimos cónicos de uvas con escobajo y brillo de pruina.
 */
export function createParra(scene: THREE.Scene): void {
  const { x0, x1, z0, z1, height } = PERGOLA;
  const bark = barkTexture();
  const wood = new THREE.MeshStandardMaterial({
    color: 0x876342,
    map: tiled(bark, 1, 3),
    roughness: 0.88,
  });
  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x694b31,
    map: tiled(bark, 1, 2),
    roughness: 0.92,
  });
  const vineBarkMat = new THREE.MeshStandardMaterial({
    color: 0x6e5239,
    map: tiled(bark, 2, 6),
    roughness: 0.96,
  });
  const shootMat = new THREE.MeshStandardMaterial({
    color: 0x5d6334,
    roughness: 0.85,
  });
  const stoneBaseMat = new THREE.MeshStandardMaterial({
    color: 0x9e978b,
    roughness: 0.95,
  });
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x767c7a,
    metalness: 0.7,
    roughness: 0.4,
  });

  const add = (
    geometry: THREE.BufferGeometry,
    pos: [number, number, number],
    material: THREE.Material = wood,
    cast = true
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...pos);
    m.castShadow = cast;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // 1. Postes con dado de base y escuadras diagonales
  for(const x of [x0, x1]) {
    for(const z of [z0, z1]) {
      add(new THREE.BoxGeometry(0.18, 0.22, 0.18), [x, 0.08, z], stoneBaseMat);
      add(new THREE.BoxGeometry(0.125, height, 0.125), [x, height / 2 - 0.02, z], darkWood);

      // Escuadras (riostras) hacia las vigas
      const dirX = x === x0 ? 1 : -1;
      const dirZ = z === z0 ? 1 : -1;
      const braceX = add(new THREE.BoxGeometry(0.42, 0.06, 0.06), [x + dirX * 0.18, height - 0.18, z], darkWood);
      braceX.rotation.z = dirX * (Math.PI / 4);
      const braceZ = add(new THREE.BoxGeometry(0.06, 0.06, 0.42), [x, height - 0.18, z + dirZ * 0.18], darkWood);
      braceZ.rotation.x = -dirZ * (Math.PI / 4);
    }
  }

  // 2. Vigas maestras, tirantes superiores y alambres tensados del parral
  const spanX = x1 - x0;
  const spanZ = z1 - z0;
  const midX = (x0 + x1) / 2;
  const midZ = (z0 + z1) / 2;

  for(const z of [z0, z1]) {
    add(new THREE.BoxGeometry(spanX + 0.56, 0.14, 0.09), [midX, height, z], darkWood);
  }
  const rafterCount = 7;
  for(let i = 0; i <= rafterCount; i++) {
    const x = x0 + (spanX * i) / rafterCount;
    add(new THREE.BoxGeometry(0.06, 0.09, spanZ + 0.48), [x, height + 0.10, midZ], wood);
  }
  // Alambres transversales donde se agarran los zarcillos
  for(let j = 0; j <= 8; j++) {
    const z = z0 - 0.1 + ((spanZ + 0.2) * j) / 8;
    const wire = add(new THREE.CylinderGeometry(0.004, 0.004, spanX + 0.4, 6), [midX, height + 0.145, z], wireMat, false);
    wire.rotation.z = Math.PI / 2;
  }

  // 3. Cantero esquinero de ladrillo y tronco añoso retorcido de la parra
  const planterX = x0 + 0.22;
  const planterZ = z0 + 0.22;
  const planterBrick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tiled(brickTexture(), 1.2, 0.4),
    roughness: 0.95,
  });
  add(new THREE.CylinderGeometry(0.28, 0.30, 0.22, 16, 1, true), [planterX, 0.08, planterZ], planterBrick);
  add(new THREE.RingGeometry(0.21, 0.29, 16), [planterX, 0.19, planterZ], stoneBaseMat, false).rotation.x = -Math.PI / 2;
  add(new THREE.CircleGeometry(0.26, 16), [planterX, 0.17, planterZ], new THREE.MeshStandardMaterial({ color: 0x2f2419, roughness: 1 }), false).rotation.x = -Math.PI / 2;

  // Dos venas leñosas trenzadas que forman el tronco viejo de la vid
  for(const strand of [0, 1]) {
    const trunkPts = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const angle = t * Math.PI * 3.2 + strand * Math.PI;
      const radius = (1 - t * 0.45) * 0.048;
      return new THREE.Vector3(
        planterX - t * 0.06 + Math.cos(angle) * radius,
        t * (height + 0.14),
        planterZ - t * 0.06 + Math.sin(angle) * radius
      );
    });
    const curve = new THREE.CatmullRomCurve3(trunkPts);
    add(new THREE.TubeGeometry(curve, 44, strand === 0 ? 0.048 : 0.034, 8, false), [0, 0, 0], vineBarkMat);
  }

  // 4. Red de brazos y sarmientos serpenteando sobre la pérgola
  const rand = seeded(29);
  const numCordons = 8;
  const branchCenters: THREE.Vector3[] = [];
  for(let c = 0; c < numCordons; c++) {
    const targetX = x0 + 0.25 + ((spanX - 0.5) * (c + 0.5)) / numCordons + (rand() - 0.5) * 0.25;
    const endZ = z1 - 0.15 - rand() * 0.35;
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(planterX - 0.05, height + 0.13, planterZ - 0.05),
      new THREE.Vector3(
        THREE.MathUtils.lerp(planterX, targetX, 0.45),
        height + 0.16 + rand() * 0.04,
        z0 + spanZ * 0.18 + (rand() - 0.5) * 0.2
      ),
      new THREE.Vector3(
        targetX + (rand() - 0.5) * 0.22,
        height + 0.15 + rand() * 0.05,
        z0 + spanZ * 0.55
      ),
      new THREE.Vector3(
        targetX + (rand() - 0.5) * 0.28,
        height + 0.14 + rand() * 0.04,
        endZ
      ),
    ];
    const cordonCurve = new THREE.CatmullRomCurve3(pts);
    const radius = 0.016 + (1 - c / numCordons) * 0.012;
    add(new THREE.TubeGeometry(cordonCurve, 32, radius, 7, false), [0, 0, 0], c < 4 ? vineBarkMat : shootMat);

    for(let s = 1; s <= 5; s++) {
      branchCenters.push(cordonCurve.getPoint(s / 6));
    }
  }

  // Sarmientos transversales secundarios
  for(let k = 0; k < 6; k++) {
    const z = z0 + 0.35 + (spanZ - 0.7) * (k / 5);
    const crossCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0 + 0.15, height + 0.15, z + (rand() - 0.5) * 0.2),
      new THREE.Vector3(midX, height + 0.18 + (rand() - 0.5) * 0.04, z + (rand() - 0.5) * 0.3),
      new THREE.Vector3(x1 - 0.15, height + 0.14, z + (rand() - 0.5) * 0.2),
    ]);
    add(new THREE.TubeGeometry(crossCurve, 24, 0.011, 6, false), [0, 0, 0], shootMat);
  }

  // 5. Follaje de parra: dosel superior denso + guirnaldas colgantes en los bordes
  const leafGeo = new THREE.PlaneGeometry(0.25, 0.25, 2, 2);
  // Curvamos levemente el plano de la hoja para que no sea rígido
  const lPos = leafGeo.getAttribute('position');
  for(let i = 0; i < lPos.count; i++) {
    const lx = lPos.getX(i), ly = lPos.getY(i);
    lPos.setZ(i, -(lx * lx + ly * ly) * 0.85);
  }
  leafGeo.computeVertexNormals();

  const canopyCount = 1450;
  const fringeCount = 260;
  const totalLeaves = canopyCount + fringeCount;
  const leaves = new THREE.InstancedMesh(
    leafGeo,
    new THREE.MeshStandardMaterial({
      map: leafTexture(),
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.72,
    }),
    totalLeaves
  );
  leaves.castShadow = true;
  leaves.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const density = (x: number, z: number) =>
    0.58 + 0.42 * Math.sin(x * 2.2 + 1.5) * Math.cos(z * 1.8 - 0.3) + 0.25 * Math.sin(x * 4.8 + z * 4.1);

  let placed = 0;
  while(placed < canopyCount) {
    const x = x0 - 0.32 + rand() * (spanX + 0.64);
    const z = z0 - 0.32 + rand() * (spanZ + 0.64);
    if(rand() > density(x, z)) continue;
    const layerY = height + 0.13 + rand() * 0.22;
    dummy.position.set(x, layerY, z);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.95, (rand() - 0.5) * 0.8, rand() * Math.PI * 2);
    dummy.scale.setScalar(0.75 + rand() * 0.75);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    // Hojas más soleadas y cálidas arriba, más frescas y oscuras abajo
    const sunFactor = (layerY - (height + 0.13)) / 0.22;
    leaves.setColorAt(
      placed,
      color.setHSL(0.24 + rand() * 0.07, 0.48 + rand() * 0.22, 0.22 + sunFactor * 0.14 + rand() * 0.08)
    );
    placed++;
  }

  // Guirnaldas de hojas que caen suavemente por los 4 bordes de la pérgola
  while(placed < totalLeaves) {
    const edgeIdx = placed % 4;
    const t = rand();
    const drop = Math.pow(rand(), 1.4) * 0.48;
    let fx = midX, fz = midZ;
    if(edgeIdx === 0) { fx = x0 - 0.06 + (rand() - 0.5) * 0.14; fz = z0 + t * spanZ; }
    else if(edgeIdx === 1) { fx = x1 + 0.06 + (rand() - 0.5) * 0.14; fz = z0 + t * spanZ; }
    else if(edgeIdx === 2) { fx = x0 + t * spanX; fz = z0 - 0.06 + (rand() - 0.5) * 0.14; }
    else { fx = x0 + t * spanX; fz = z1 + 0.06 + (rand() - 0.5) * 0.14; }

    dummy.position.set(fx, height + 0.08 - drop, fz);
    dummy.rotation.set((rand() - 0.5) * 1.2, rand() * Math.PI * 2, (rand() - 0.5) * 1.2);
    dummy.scale.setScalar(0.65 + rand() * 0.55);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    leaves.setColorAt(placed, color.setHSL(0.25 + rand() * 0.06, 0.52 + rand() * 0.18, 0.24 + rand() * 0.12));
    placed++;
  }
  scene.add(leaves);

  // 6. Racimos de uvas cónicos realistas con pedúnculo (escobajo) y brillo de pruina
  const numClusters = 26;
  const berriesPerCluster = 38;
  const grapeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.42,
    clearcoatRoughness: 0.25,
    ior: 1.45,
  });
  const berryGeo = new THREE.SphereGeometry(0.0175, 10, 8);
  berryGeo.scale(0.95, 1.12, 0.95); // Grano de uva ligeramente ovalado

  const grapes = new THREE.InstancedMesh(berryGeo, grapeMat, numClusters * berriesPerCluster);
  grapes.castShadow = true;
  grapes.receiveShadow = true;

  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.0025, 0.004, 0.14, 5),
    shootMat,
    numClusters
  );

  let g = 0;
  for(let b = 0; b < numClusters; b++) {
    // Ubicamos los racimos cerca de los sarmientos o repartidos bajo el parral
    const anchor = branchCenters[b % branchCenters.length];
    const bx = THREE.MathUtils.clamp(anchor.x + (rand() - 0.5) * 0.45, x0 + 0.25, x1 - 0.25);
    const bz = THREE.MathUtils.clamp(anchor.z + (rand() - 0.5) * 0.45, z0 + 0.25, z1 - 0.25);
    const topY = height + 0.08 + (rand() - 0.5) * 0.04;
    const clusterLen = 0.17 + rand() * 0.07;
    const tiltX = (rand() - 0.5) * 0.16;
    const tiltZ = (rand() - 0.5) * 0.16;

    // Tallo / escobajo que sostiene el racimo
    dummy.position.set(bx, topY - 0.03, bz);
    dummy.rotation.set(tiltX, 0, tiltZ);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    stems.setMatrixAt(b, dummy.matrix);

    // Distribución cónica con hombros superiores (forma real de racimo de uva)
    for(let k = 0; k < berriesPerCluster; k++) {
      const v = k / (berriesPerCluster - 1); // 0 arriba (hombros) -> 1 abajo (punta del racimo)
      // Perfil del racimo: ancho arriba con hombros dobles y afinándose en cono hacia abajo
      const shoulder = v < 0.28 ? Math.sin((v / 0.28) * Math.PI * 0.5) : Math.pow(1 - (v - 0.28) / 0.72, 0.75);
      const ringRadius = (0.010 + 0.044 * shoulder) * (0.82 + rand() * 0.32);
      const goldenAngle = k * 2.39996 + rand() * 0.35;

      // Hombro lateral asimétrico en la parte alta del racimo
      const shoulderOffset = v < 0.32 && k % 3 === 0 ? 0.016 : 0;
      const localX = Math.cos(goldenAngle) * (ringRadius + shoulderOffset);
      const localZ = Math.sin(goldenAngle) * (ringRadius + shoulderOffset * 0.6);
      const localY = -v * clusterLen;

      dummy.position.set(
        bx + localX + localY * tiltZ,
        topY + localY,
        bz + localZ - localY * tiltX
      );
      dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI, (rand() - 0.5) * 0.5);
      const berryScale = (1 - v * 0.22) * (0.88 + rand() * 0.26);
      dummy.scale.setScalar(berryScale);
      dummy.updateMatrix();
      grapes.setMatrixAt(g, dummy.matrix);

      // Variación cromática de uvas tintas / malbec (violeta profundo, ciruela, azul pruina y algún grano envero)
      const hue = 0.77 + (rand() - 0.5) * 0.08;
      const sat = 0.45 + rand() * 0.30;
      const light = 0.11 + rand() * 0.11;
      grapes.setColorAt(g, color.setHSL(hue, sat, light));
      g++;
    }
  }
  scene.add(stems, grapes);

  // 7. Guirnalda de luces cálidas tipo kermesse colgando entre las vigas bajo la parra
  const cordMat = new THREE.LineBasicMaterial({ color: 0x222222 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff4d2,
    emissive: 0xffb84d,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });
  const socketMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.7 });
  for(const z of [z0 + spanZ * 0.28, z0 + spanZ * 0.72]) {
    const pts: THREE.Vector3[] = [];
    const steps = 16;
    for(let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lx = THREE.MathUtils.lerp(x0 + 0.08, x1 - 0.08, t);
      const sag = Math.sin(t * Math.PI) * 0.18;
      const ly = height - 0.04 - sag;
      pts.push(new THREE.Vector3(lx, ly, z));
      if(i > 0 && i < steps && i % 2 === 0) {
        add(new THREE.CylinderGeometry(0.01, 0.012, 0.025, 8), [lx, ly - 0.012, z], socketMat, false);
        add(new THREE.SphereGeometry(0.022, 10, 8), [lx, ly - 0.036, z], bulbMat, false);
      }
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cordMat));
  }
}
