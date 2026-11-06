import * as THREE from 'three';
import { PERGOLA } from './layout.ts';
import { leafTexture, seeded } from './textures.ts';

/**
 * Pérgola de madera con parra sobre la mesa familiar (propuesta). Las hojas dejan huecos
 * para que el sol tire sombra moteada sobre la mesa y las baldosas.
 */
export function createParra(scene: THREE.Scene): void {
  const { x0, x1, z0, z1, height } = PERGOLA;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.95 });
  const add = (geometry: THREE.BufferGeometry, pos: [number, number, number], material: THREE.Material = wood) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  // Postes y vigas.
  for(const x of [x0, x1]) for(const z of [z0, z1]) add(new THREE.BoxGeometry(0.12, height, 0.12), [x, height / 2 - 0.03, z]);
  for(const z of [z0, z1]) add(new THREE.BoxGeometry(x1 - x0 + 0.5, 0.14, 0.08), [(x0 + x1) / 2, height, z]);
  for(let x = x0;x <= x1 + 0.01;x += (x1 - x0) / 5) add(new THREE.BoxGeometry(0.06, 0.08, z1 - z0 + 0.4), [x, height + 0.1, (z0 + z1) / 2]);

  // Tronco retorcido de la vid subiendo por el poste del fondo.
  const trunkPath = new THREE.CatmullRomCurve3(Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    return new THREE.Vector3(x0 + 0.14 + Math.sin(t * 9) * 0.05, t * (height + 0.12), z0 + 0.12 + Math.cos(t * 7) * 0.05);
  }));
  add(new THREE.TubeGeometry(trunkPath, 40, 0.045, 7, false), [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }));

  // Hojas: agrupadas con huecos (ruido por celdas) para la sombra moteada.
  const rand = seeded(29);
  const count = 1100;
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), count);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const density = (x: number, z: number) => 0.5 + 0.5 * Math.sin(x * 2.3 + 1.7) * Math.cos(z * 1.9 - 0.4) + 0.25 * Math.sin(x * 5.1 + z * 4.3);
  let placed = 0;
  while(placed < count) {
    const x = x0 - 0.25 + rand() * (x1 - x0 + 0.5), z = z0 - 0.25 + rand() * (z1 - z0 + 0.5);
    if(rand() > density(x, z)) continue;
    dummy.position.set(x, height + 0.16 + rand() * 0.16, z);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.6, rand() * Math.PI * 2);
    dummy.scale.setScalar(0.8 + rand() * 0.7);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    leaves.setColorAt(placed, color.setHSL(0.24 + rand() * 0.07, 0.42 + rand() * 0.2, 0.24 + rand() * 0.14));
    placed++;
  }
  scene.add(leaves);

  // Racimos de uva colgando.
  const grapeMat = new THREE.MeshStandardMaterial({ color: 0x3b2346, roughness: 0.35 });
  const grapes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), grapeMat, 16 * 22);
  grapes.castShadow = true;
  let g = 0;
  for(let b = 0;b < 16;b++) {
    const bx = x0 + 0.3 + rand() * (x1 - x0 - 0.6), bz = z0 + 0.3 + rand() * (z1 - z0 - 0.6);
    for(let k = 0;k < 22;k++) {
      const depth = rand();
      const spread = 0.07 * (1 - depth * 0.8);
      dummy.position.set(bx + (rand() - 0.5) * spread * 2, height + 0.05 - depth * 0.24, bz + (rand() - 0.5) * spread * 2);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      grapes.setMatrixAt(g++, dummy.matrix);
    }
  }
  scene.add(grapes);
}
