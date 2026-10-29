import * as THREE from 'three';
import type { MeatModel, Side } from '../sim/meat.ts';
import { createMatambreVisual } from './matambre-visual.ts';
import { createVacioVisual } from './vacio-visual.ts';

export type MeatVisual = { group: THREE.Group; pickMeshes: THREE.Mesh[]; update: () => void };

/** Geometría y color exclusivamente visuales; dimensiones tomadas del catálogo. */
export function createMeatVisual(meat: MeatModel, scaleX: number, scaleZ: number): MeatVisual {
  if(meat.definition.kind === 'matambre') return createMatambreVisual(meat, scaleX, scaleZ);
  if(meat.definition.kind === 'vacio') return createVacioVisual(meat, scaleX, scaleZ);
  const d = meat.definition, size = meat.dimensions;
  const group = new THREE.Group(), projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();
  group.name = `meat-${d.kind}-${meat.id}`;
  projection.scale.set(scaleX, 3, scaleZ);
  group.add(projection); projection.add(orientation); orientation.add(body);
  const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, side: THREE.DoubleSide });
  const faces = { a: material(d.rawColor), b: material(d.rawColor) };
  const flesh = material(d.rawColor), fat = material(0xe4d6ac), bone = material(0xe8dfc5);
  const pickMeshes: THREE.Mesh[] = [];
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    const part = new THREE.Mesh(geometry, mat);
    part.castShadow = true; part.receiveShadow = true;
    part.userData.kind = 'meat'; part.userData.meatId = meat.id;
    body.add(part); pickMeshes.push(part);
    return part;
  }
  if(d.geometry === 'flat') {
    const shape = new THREE.Shape(d.outline.map(p => new THREE.Vector2(p.x * size.widthM, p.z * size.depthM)));
    const volume = mesh(new THREE.ExtrudeGeometry(shape, { depth: d.thicknessM, bevelEnabled: false, steps: 1 }), flesh);
    volume.rotation.x = -Math.PI / 2;
    for(const side of ['a', 'b'] as const) {
      const face = mesh(new THREE.ShapeGeometry(shape), faces[side]);
      face.rotation.x = -Math.PI / 2;
      face.position.y = side === 'a' ? -0.0002 : d.thicknessM + 0.0002;
    }
    if(d.fatCover > 0) {
      const cover = mesh(new THREE.ShapeGeometry(shape), fat);
      cover.rotation.x = -Math.PI / 2;
      cover.scale.set(0.9, d.fatCover, 1);
      cover.position.y = d.thicknessM + 0.0008;
    }
    for(let i = 0;i < d.boneCount;i++) {
      const rib = mesh(new THREE.CylinderGeometry(0.008, 0.007, size.depthM * 0.92, 8), bone);
      rib.rotation.x = Math.PI / 2;
      rib.position.set((i + 0.5) / d.boneCount * size.widthM - size.widthM / 2, d.thicknessM * 0.92, 0);
    }
    if(d.kind === 'falda') {
      for(let i = 0;i < 4;i++) {
        const seam = mesh(new THREE.BoxGeometry(size.widthM * 0.55, 0.001, 0.003), fat);
        seam.position.set(0, d.thicknessM + 0.001, (i - 1.5) * size.depthM * 0.16);
        seam.rotation.y = (i - 1.5) * 0.1;
      }
    }
  } else {
    for(const [i, side] of(['a', 'b'] as const).entries()) {
      const half = mesh(new THREE.CylinderGeometry(d.thicknessM / 2, d.thicknessM / 2,
        size.widthM, 20, 1, true, i * Math.PI, Math.PI), faces[side]);
      half.rotation.z = -Math.PI / 2;
      half.position.y = d.thicknessM / 2;
    }
    for(const sign of [-1, 1]) {
      const end = mesh(new THREE.SphereGeometry(d.thicknessM * 0.48, 12, 8), flesh);
      end.scale.set(0.12, 1, 1);
      end.position.set(sign * size.widthM * 0.48, d.thicknessM / 2, 0);
      const tie = mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.009, 6), fat);
      tie.rotation.z = Math.PI / 2;
      tie.position.set(sign * size.widthM * 0.49, d.thicknessM / 2, 0);
    }
    if(d.kind === 'chorizo') {
      for(let i = 0;i < 16;i++) {
        const speck = mesh(new THREE.SphereGeometry(0.0014, 5, 4), fat);
        const angle = i * 2.4;
        speck.position.set(((i * 7 % 17) / 17 - 0.5) * size.widthM * 0.85,
          d.thicknessM / 2 + Math.cos(angle) * d.thicknessM * 0.49, Math.sin(angle) * d.thicknessM * 0.49);
      }
    }
  }
  const marks = { a: material(0x30231b), b: material(0x30231b) };
  for(const side of ['a', 'b'] as const) {
    marks[side].transparent = true;
    for(let i = 0;i < 6;i++) {
      const line = mesh(new THREE.BoxGeometry(0.002, 0.0006, size.depthM * (d.geometry === 'flat' ? 0.48 : 0.68)), marks[side]);
      line.position.set((i - 2.5) * size.widthM / 8, side === 'a' ? -0.0006 : d.thicknessM + 0.0006, 0);
    }
  }
  function colorFor(side: Side): THREE.Color {
    const color = new THREE.Color(d.rawColor);
    const layer = d.geometry === 'cylinder' || side === 'a' ? 0 : 4;
    if(!d.precooked) color.lerp(new THREE.Color(0xac8471), Math.max(0, Math.min(0.35, (meat.layersC[layer] - 40) / 100)));
    color.lerp(new THREE.Color(d.precooked ? 0x29201c : 0x986038), Math.min(1, meat.brown[side] / 65));
    return color.lerp(new THREE.Color(0x17110e), Math.min(1, Math.max(meat.burn[side], meat.casingDamage[side]) / 65));
  }
  return {
    group, pickMeshes, update() {
      orientation.rotation.y = meat.quarterTurns * Math.PI / 2;
      body.rotation.x = meat.faceDown === 'a' ? 0 : Math.PI;
      body.position.y = meat.faceDown === 'a' ? 0 : d.thicknessM;
      for(const side of ['a', 'b'] as const) {
        faces[side].color.copy(colorFor(side));
        marks[side].opacity = Math.min(0.8, Math.max(meat.brown[side], meat.casingDamage[side]) / 100);
        faces[side].roughness = 0.84 + Math.min(0.16, meat.casingDamage[side] / 200);
      }
      flesh.color.copy(colorFor(meat.faceDown === 'a' ? 'b' : 'a'));
      fat.color.set(0xe4d6ac).lerp(new THREE.Color(0x9e7a42), Math.min(1, meat.brown.b / 85));
      fat.color.lerp(new THREE.Color(0x34241b), Math.min(1, meat.burn.b / 70));
      group.scale.setScalar(meat.location === 'carried' ? 0.65 : 1);
      for(const part of pickMeshes) part.userData.enabled = meat.location !== 'carried';
    }
  };
}
