import * as THREE from 'three';
import { createAsador } from './asador.ts';
import { label } from './primitives.ts';
import { createBarrio } from './barrio.ts';
import { createParra } from './parra.ts';
import { createMesaFamiliar } from './mesa-familiar.ts';
import { createDetalles } from './detalles.ts';
import { patioSlabTexture, tiled } from './textures.ts';

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
}
