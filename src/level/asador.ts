import * as THREE from 'three';
import type { TargetKind } from '../gameplay/targets.ts';

/** Distribución visual. Las dimensiones físicas de la simulación viven en sim/parameters.ts. */
export const ASADOR_LAYOUT = {
  hearthTop: 0.83,
  brazierPosition: [-2.65, 0.762, -4.70] as [number, number, number],
  brazierScale: 0.68,
  bounds: { x0: -3.90, x1: 1.90, z0: -6.10, z1: -3.10 },
};

type Labeler = (parent: THREE.Object3D, text: string, position: THREE.Vector3, scale?: number) => void;

export function createAsador(scene: THREE.Scene, clickable: THREE.Object3D[], addLabel: Labeler): void {
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb5b1a6, roughness: 1 });
  const mortar = new THREE.MeshStandardMaterial({ color: 0x8b8070, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x725039, roughness: 1 });
  const endWood = new THREE.MeshStandardMaterial({ color: 0xb28b58, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x313330, roughness: 0.9, metalness: 0.3 });
  const cube = (size: [number, number, number], pos: [number, number, number], material: THREE.Material, parent: THREE.Object3D = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Estructura portante y cuatro huecos de guardado debajo de la mesada común.
  cube([5.8, 0.16, 2.88], [-1.0, 0.75, -4.54], mortar);
  cube([5.8, 0.10, 2.88], [-1.0, 0.06, -4.54], concrete);
  cube([5.8, 0.62, 0.18], [-1.0, 0.40, -5.89], mortar);
  for(const x of [-3.78, -2.36, -1.0, 0.36, 1.78])
    cube([0.16, 0.60, 2.70], [x, 0.39, -4.54], concrete);
  for(const x of [-3.78, 1.78]) {
    cube([0.24, 1.74, 2.70], [x, 1.67, -4.54], concrete);
  }

  // Ladrillos con juntas reales y tonos más oscuros en el fondo del hogar.
  const brickGeometry = new THREE.BoxGeometry(0.35, 0.145, 0.10);
  const brickMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const positions: { x: number; y: number; z: number; turn: boolean; shade: number }[] = [];
  for(let row = 0;row < 10;row++) {
    const y = 0.91 + row * 0.153;
    for(let col = 0;col < 14;col++) {
      positions.push({
        x: -3.50 + col * 0.365 + (row % 2) * 0.09, y, z: -5.77, turn: false,
        shade: Math.min(0.75, 0.27 + row * 0.034 + Math.sin(col * 5 + row) * 0.06)
      });
    }
    for(const x of [-3.60, 1.60]) for(let col = 0;col < 7;col++) {
      positions.push({
        x, y, z: -5.57 + col * 0.365, turn: true,
        shade: 0.40 + col * 0.045 + Math.sin(col + row * 7) * 0.05
      });
    }
  }
  const bricks = new THREE.InstancedMesh(brickGeometry, brickMaterial, positions.length);
  const transform = new THREE.Object3D();
  const brickColor = new THREE.Color();
  positions.forEach((p, i) => {
    transform.position.set(p.x, p.y, p.z);
    transform.rotation.y = p.turn ? Math.PI / 2 : 0;
    transform.updateMatrix();
    bricks.setMatrixAt(i, transform.matrix);
    brickColor.setRGB(p.shade, p.shade * 0.65, p.shade * 0.44);
    bricks.setColorAt(i, brickColor);
  });
  bricks.castShadow = true;
  bricks.receiveShadow = true;
  scene.add(bricks);
  cube([5.60, 1.74, 0.16], [-1.0, 1.67, -5.89], mortar);

  // Borde de ladrillos de la mesada y piso refractario, sin placas negras.
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xa47e5d, roughness: 1 });
  for(let i = 0;i < 25;i++) cube([0.217, 0.155, 0.15], [-3.78 + i * 0.23, 0.75, -3.12], edgeMaterial);
  const tileMaterial = new THREE.MeshStandardMaterial({ color: 0x9b8065, roughness: 1 });
  for(let x = 0;x < 15;x++) for(let z = 0;z < 7;z++) {
    cube([0.341, 0.018, 0.348], [-3.46 + x * 0.35, 0.823, -5.60 + z * 0.358], tileMaterial);
  }

  // Campana de mampostería: abierta por abajo, sin caños, cadenas ni regulación.
  cube([5.80, 0.20, 0.24], [-1.0, 2.44, -3.23], concrete);
  const hoodGeometry = new THREE.BufferGeometry();
  hoodGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -3.9, 2.54, -3.11, 1.9, 2.54, -3.11, 1.9, 2.54, -6.0, -3.9, 2.54, -6.0,
    -2.13, 3.65, -4.22, 0.13, 3.65, -4.22, 0.13, 3.65, -5.80, -2.13, 3.65, -5.80,
  ], 3));
  hoodGeometry.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
  hoodGeometry.computeVertexNormals();
  const hoodMaterial = concrete.clone();
  hoodMaterial.side = THREE.DoubleSide;
  hoodMaterial.flatShading = true;
  const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
  hood.castShadow = true;
  hood.receiveShadow = true;
  scene.add(hood);
  cube([2.27, 0.15, 1.59], [-1.0, 3.66, -5.01], concrete);
  cube([1.15, 1.20, 1.10], [-1.0, 4.25, -5.10], concrete);

  const log = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number, length: number, seed: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.91, radius, length, 11), [wood, endWood, endWood]);
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = Math.sin(seed) * 0.04;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    for(const fraction of [0.35, 0.65]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * fraction, 0.002, 3, 16), wood);
      ring.position.set(x, y, z + length / 2 + 0.002);
      parent.add(ring);
    }
  };
  const specs: { x: number; text: string; kind: TargetKind }[] = [
    { x: -3.07, text: 'LEÑA GRUESA [E]', kind: 'fuel-large-wood' },
    { x: -1.68, text: 'LEÑA FINA [E]', kind: 'fuel-small-wood' },
    { x: -0.32, text: 'CARBÓN VEGETAL [E]', kind: 'fuel-coal' },
    { x: 1.07, text: 'PAPEL / RAMITAS [E]', kind: 'tinder' },
  ];
  for(const item of specs) {
    const contents = new THREE.Group();
    contents.position.set(item.x, 0, -3.85);
    scene.add(contents);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.13, 0.48, 1.15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(item.x, 0.35, -3.79);
    hit.userData.kind = item.kind;
    scene.add(hit);
    clickable.push(hit);
    addLabel(scene, item.text, new THREE.Vector3(item.x, 0.75, -3.028), 0.84);
    if(item.kind === 'fuel-large-wood' || item.kind === 'fuel-small-wood') {
      const fine = item.kind === 'fuel-small-wood';
      const columns = fine ? 9 : 5;
      const radius = fine ? 0.043 : 0.095;
      const spacing = fine ? 0.105 : 0.21;
      for(let row = 0;row < 3;row++) for(let col = 0;col < columns - row % 2;col++) {
        const x = (col - (columns - 1) / 2 + (row % 2) * 0.5) * spacing;
        log(contents, x, 0.12 + radius + row * radius * 1.72, Math.sin(col * 7 + row) * 0.045,
          radius * (0.9 + (col % 3) * 0.05), 0.97 + Math.sin(col + row * 3) * 0.09, col + row);
      }
    } else if(item.kind === 'fuel-coal') {
      for(const x of [-0.52, 0.52]) cube([0.035, 0.28, 1.05], [x, 0.25, 0], wood, contents);
      cube([1.07, 0.16, 0.035], [0, 0.20, 0.54], wood, contents);
      const coalMaterial = new THREE.MeshStandardMaterial({ color: 0x252625, roughness: 1 });
      for(let i = 0;i < 36;i++) {
        const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.073 + (i % 3) * 0.008, 0), coalMaterial);
        coal.position.set((i % 6 - 2.5) * 0.16, 0.19 + Math.floor(i / 18) * 0.12, (Math.floor(i / 6) % 3 - 1) * 0.25);
        coal.rotation.set(i * 0.8, i * 1.3, i * 0.3);
        coal.castShadow = true;
        contents.add(coal);
      }
    } else {
      cube([1.04, 0.035, 0.94], [0, 0.14, 0], wood, contents);
      for(const x of [-0.51, 0.51]) for(const y of [0.22, 0.33])
        cube([0.035, 0.075, 0.96], [x, y, 0], wood, contents);
      for(const z of [-0.47, 0.47]) for(const y of [0.22, 0.33])
        cube([1.04, 0.075, 0.035], [0, y, z], wood, contents);
      const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xd6ccb6, roughness: 1 });
      for(let i = 0;i < 9;i++) {
        const paper = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), paperMaterial);
        paper.position.set(Math.sin(i * 2.4) * 0.31, 0.24 + (i % 2) * 0.08, Math.cos(i * 2.4) * 0.28);
        paper.scale.set(1.35, 0.55, 0.9);
        contents.add(paper);
      }
      for(let i = 0;i < 7;i++) log(contents, (i - 3) * 0.085, 0.37, -0.03, 0.012, 0.62, i);
      cube([0.72, 0.06, 0.007], [0, 0.28, 0.492], iron, contents);
    }
  }
}
