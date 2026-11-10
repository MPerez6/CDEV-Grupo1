import * as THREE from 'three';
import { createAsador } from './asador.ts';
import { boardPosition } from './layout.ts';
import { label, mark } from './primitives.ts';
import { createBarrio } from './barrio.ts';
import { createParra } from './parra.ts';
import { createMesaFamiliar } from './mesa-familiar.ts';
import { createDetalles } from './detalles.ts';
import { cuttingBoardTexture, patioSlabTexture, tiled, woodPlankTexture } from './textures.ts';

export function createPatio(scene: THREE.Scene, clickable: THREE.Object3D[]): void {
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.18, 15),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tiled(patioSlabTexture(), 11, 9),
      roughness: 0.88,
    })
  );
  ground.position.set(0, -0.12, -1.9);
  ground.receiveShadow = true;
  scene.add(ground);

  createBarrio(scene);
  createParra(scene);
  createMesaFamiliar(scene, clickable);
  createDetalles(scene);
  createAsador(scene, clickable, label);

  // Mesada rústica de madera para preparación de los cortes con tablas acanaladas
  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tiled(woodPlankTexture(), 2, 1),
    roughness: 0.86,
  });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.9 });
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cuttingBoardTexture(),
    roughness: 0.78,
  });

  const addMesh = (geo: THREE.BufferGeometry, pos: [number, number, number], mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  addMesh(new THREE.BoxGeometry(4.6, 0.14, 2.9), [4.55, 0.95, -3.4], plankMat);
  // Faldón perimetral, estante inferior de listones y travesaños inferiores de la mesa
  addMesh(new THREE.BoxGeometry(4.3, 0.09, 2.6), [4.55, 0.84, -3.4], legMat);
  addMesh(new THREE.BoxGeometry(4.06, 0.04, 2.25), [4.55, 0.27, -3.4], plankMat);
  for(const z of [-4.6, -2.2]) {
    addMesh(new THREE.BoxGeometry(4.1, 0.06, 0.08), [4.55, 0.24, z], legMat);
  }
  for(const x of [2.5, 6.6]) {
    addMesh(new THREE.BoxGeometry(0.08, 0.06, 2.4), [x, 0.24, -3.4], legMat);
    for(const z of [-4.6, -2.2]) {
      addMesh(new THREE.BoxGeometry(0.14, 0.85, 0.14), [x, 0.47, z], legMat);
    }
  }

  for(let i = 0; i < 7; i++) {
    const p = boardPosition(i);
    const board = addMesh(new THREE.BoxGeometry(1.4, 0.05, 0.88), [p.x, 1.07, p.z], boardMat);
    mark(board, 'board', clickable);
  }

  // Condimentos parrilleros (sal gruesa, chimichurri, salmuera y taco de cuchillos) en el borde trasero libre de la mesada
  const glassJar = new THREE.MeshStandardMaterial({ color: 0xe4f0ec, roughness: 0.14, transparent: true, opacity: 0.62 });
  const saltMat = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.75 });
  const brineBottle = new THREE.MeshStandardMaterial({ color: 0x2c4c32, roughness: 0.22, transparent: true, opacity: 0.78 });
  const chimiMat = new THREE.MeshStandardMaterial({ color: 0x733915, roughness: 0.48 });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x8f2428, roughness: 0.45 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd8dadb, roughness: 0.25, metalness: 0.85 });

  // Frasco de sal parrillera
  addMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 12), [5.85, 1.10, -4.52], glassJar);
  addMesh(new THREE.CylinderGeometry(0.058, 0.058, 0.11, 12), [5.85, 1.08, -4.52], saltMat);
  addMesh(new THREE.CylinderGeometry(0.068, 0.068, 0.025, 12), [5.85, 1.19, -4.52], lidMat);

  // Frasco de chimichurri casero
  addMesh(new THREE.CylinderGeometry(0.058, 0.058, 0.14, 12), [6.05, 1.09, -4.52], glassJar);
  addMesh(new THREE.CylinderGeometry(0.052, 0.052, 0.10, 12), [6.05, 1.07, -4.52], chimiMat);
  addMesh(new THREE.CylinderGeometry(0.060, 0.060, 0.022, 12), [6.05, 1.17, -4.52], lidMat);

  // Botella de salmuera criolla con corcho
  addMesh(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 12), [6.24, 1.13, -4.52], brineBottle);
  addMesh(new THREE.CylinderGeometry(0.018, 0.045, 0.08, 10), [6.24, 1.27, -4.52], brineBottle);
  addMesh(new THREE.CylinderGeometry(0.014, 0.016, 0.035, 8), [6.24, 1.32, -4.52], legMat);

  // Taco de madera inclinado con cuchilla y tenedor trinchante
  const knifeBlock = addMesh(new THREE.BoxGeometry(0.16, 0.20, 0.12), [6.48, 1.11, -4.50], legMat);
  knifeBlock.rotation.x = 0.24;
  addMesh(new THREE.BoxGeometry(0.028, 0.11, 0.038), [6.45, 1.24, -4.48], legMat);
  addMesh(new THREE.BoxGeometry(0.006, 0.04, 0.036), [6.45, 1.19, -4.48], steelMat);
  addMesh(new THREE.BoxGeometry(0.024, 0.10, 0.030), [6.51, 1.23, -4.48], legMat);

  label(scene, 'PREPARACIÓN', new THREE.Vector3(4.55, 0.84, -1.93), 0.88);
}
