import * as THREE from 'three';
import type { TargetKind } from '../gameplay/targets.ts';
export function box(parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], color: THREE.ColorRepresentation, cast = true): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function label(parent: THREE.Object3D, content: string, position: THREE.Vector3, scale = 1): void {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  ctx.fillStyle = 'rgba(34,28,22,0.87)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#d0b889';
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.font = 'bold 39px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6ead8';
  ctx.fillText(content, 256, 67, 485);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95 * scale, 0.24 * scale), mat);
  m.position.copy(position);
  parent.add(m);
}

export function mark(mesh: THREE.Mesh, kind: TargetKind, clickable: THREE.Object3D[], index?: number): void {
  mesh.userData.kind = kind;
  if(index !== undefined) mesh.userData.index = index;
  clickable.push(mesh);
}
