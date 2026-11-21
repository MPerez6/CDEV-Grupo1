import * as THREE from 'three';

/**
 * Cuerpo del perro (criollo mediano, caramelo con pecho y patas blancas) armado como un esqueleto simple:
 * cada articulación es un Group que la animación rota. El +z local es el frente.
 */
export type DogLeg = { hip: THREE.Group; knee: THREE.Group; front: boolean; side: number };
export type DogRig = {
  root: THREE.Group; body: THREE.Group; neck: THREE.Group; head: THREE.Group; jaw: THREE.Group;
  ears: THREE.Group[]; legs: DogLeg[]; tail: THREE.Group[]; tongue: THREE.Mesh; mouth: THREE.Object3D;
  /** Caja invisible para apuntarlo con la mira. */
  hit: THREE.Mesh;
};

/** Medidas usadas por las poses. */
export const DOG_DIMENSIONS = {
  legUpper: 0.17, legLower: 0.17, backUpper: 0.18, backLower: 0.17, standHeight: 0.4,
  shoulderZ: 0.17, hipZ: -0.18, neckLength: 0.17,
} as const;

function palette() {
  const std = (color: number, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  return {
    fur: std(0xc4863f), furDark: std(0x8a5626), white: std(0xf1e6d2), nose: std(0x16110e, 0.35),
    eye: std(0x1c130c, 0.2), shine: new THREE.MeshBasicMaterial({ color: 0xffffff }), tongue: std(0xd9667a, 0.5),
    collar: std(0xb3262c, 0.55), tag: new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.3, metalness: 0.8 }),
  };
}

/** Elipsoide (esfera escalada) en una posición. */
function blob(parent: THREE.Object3D, mat: THREE.Material, scale: [number, number, number], pos: [number, number, number], seg = 14): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(8, seg - 4)), mat);
  mesh.scale.set(...scale); mesh.position.set(...pos);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Segmento que cuelga hacia -y desde su pivote (huesos de las patas, cuello, cola). */
function limb(parent: THREE.Object3D, mat: THREE.Material, rTop: number, rBottom: number, length: number, up = false): THREE.Mesh {
  const geometry = new THREE.CapsuleGeometry((rTop + rBottom) / 2, length, 4, 10);
  // Afinar la cápsula hacia la punta para que la pata no sea un tubo.
  const pos = geometry.attributes.position;
  for(let i = 0;i < pos.count;i++) {
    const t = (pos.getY(i) + length / 2) / length; // 0 abajo, 1 arriba
    const r = rBottom + (rTop - rBottom) * Math.min(1, Math.max(0, t));
    const k = r / ((rTop + rBottom) / 2);
    pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k);
  }
  geometry.computeVertexNormals();
  geometry.translate(0, up ? length / 2 : -length / 2, 0);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildTorso(body: THREE.Group, m: ReturnType<typeof palette>): void {
  blob(body, m.fur, [0.125, 0.155, 0.17], [0, 0.015, 0.13]);   // pecho profundo
  blob(body, m.fur, [0.112, 0.125, 0.2], [0, 0.01, -0.02]);    // costillas
  blob(body, m.fur, [0.112, 0.118, 0.13], [0, 0.025, -0.17]);  // lomo y cadera
  blob(body, m.white, [0.085, 0.11, 0.08], [0, -0.035, 0.235]); // babero blanco
  blob(body, m.white, [0.08, 0.05, 0.17], [0, -0.095, 0.03]);   // panza clara
}

function buildHead(head: THREE.Group, m: ReturnType<typeof palette>): { jaw: THREE.Group; ears: THREE.Group[]; tongue: THREE.Mesh; mouth: THREE.Object3D } {
  blob(head, m.fur, [0.092, 0.085, 0.1], [0, 0.02, 0]);           // cráneo
  blob(head, m.fur, [0.075, 0.06, 0.06], [0, 0.04, 0.045]);        // frente / stop
  const snout = limb(head, m.white, 0.04, 0.05, 0.08, true);       // hocico hacia adelante
  snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.012, 0.045);
  blob(head, m.fur, [0.044, 0.03, 0.07], [0, 0.012, 0.1]);         // caña nasal caramelo
  blob(head, m.nose, [0.025, 0.019, 0.02], [0, 0.005, 0.178]);     // trufa
  for(const s of [-1, 1]) {
    blob(head, m.eye, [0.015, 0.016, 0.012], [s * 0.043, 0.045, 0.082], 10);
    blob(head, m.shine, [0.004, 0.004, 0.003], [s * 0.039, 0.05, 0.093], 6);
    blob(head, m.white, [0.03, 0.03, 0.03], [s * 0.026, -0.015, 0.13], 10); // cachetes del hocico
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.042, 0.04); head.add(jaw);
  const lower = limb(jaw, m.white, 0.026, 0.032, 0.07, true);
  lower.rotation.x = Math.PI / 2; lower.position.set(0, 0, 0.0);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.07), m.tongue);
  tongue.position.set(0, 0.012, 0.075); jaw.add(tongue);
  const mouth = new THREE.Object3D(); mouth.position.set(0, 0.0, 0.13); jaw.add(mouth);
  const ears: THREE.Group[] = [];
  for(const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * 0.068, 0.085, -0.02); ear.rotation.z = s * 0.5; head.add(ear);
    const flap = blob(ear, m.furDark, [0.022, 0.062, 0.046], [s * 0.012, -0.05, 0]);
    flap.rotation.z = s * 0.15;
    ears.push(ear);
  }
  return { jaw, ears, tongue, mouth };
}

function buildLegs(body: THREE.Group, m: ReturnType<typeof palette>): DogLeg[] {
  const legs: DogLeg[] = [];
  const D = DOG_DIMENSIONS;
  for(const front of [true, false]) for(const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.072, -0.045, front ? D.shoulderZ : D.hipZ);
    body.add(hip);
    if(front) blob(hip, m.fur, [0.045, 0.075, 0.06], [0, -0.02, 0.0]);  // hombro
    else blob(hip, m.fur, [0.058, 0.095, 0.085], [0, 0.015, 0.005]);   // muslo pegado a la cadera
    const upperLen = front ? D.legUpper : D.backUpper, lowerLen = front ? D.legLower : D.backLower;
    limb(hip, m.fur, front ? 0.036 : 0.045, 0.028, upperLen);
    const knee = new THREE.Group(); knee.position.y = -upperLen; hip.add(knee);
    limb(knee, front ? m.white : m.fur, 0.027, 0.022, lowerLen);
    const paw = blob(knee, m.white, [0.032, 0.02, 0.042], [0, -lowerLen - 0.005, 0.016], 10);
    paw.receiveShadow = true;
    legs.push({ hip, knee, front, side });
  }
  return legs;
}

function buildTail(body: THREE.Group, m: ReturnType<typeof palette>): THREE.Group[] {
  const tail: THREE.Group[] = [];
  let parent: THREE.Object3D = body;
  const radii = [0.024, 0.02, 0.016, 0.012];
  for(let i = 0;i < 4;i++) {
    const seg = new THREE.Group();
    if(i === 0) seg.position.set(0, 0.07, -0.27); else seg.position.y = 0.075;
    parent.add(seg);
    limb(seg, i === 3 ? m.white : m.fur, radii[i], radii[i] * 0.8, 0.075, true);
    tail.push(seg); parent = seg;
  }
  return tail;
}

export function createDogModel(): DogRig {
  const m = palette();
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = DOG_DIMENSIONS.standHeight; root.add(body);
  buildTorso(body, m);
  const neck = new THREE.Group(); neck.position.set(0, 0.075, 0.24); body.add(neck);
  limb(neck, m.fur, 0.07, 0.085, DOG_DIMENSIONS.neckLength, true);
  blob(neck, m.white, [0.06, 0.09, 0.05], [0, 0.07, 0.045]); // garganta blanca
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.014, 8, 20), m.collar);
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.04; neck.add(collar);
  blob(neck, m.tag, [0.016, 0.016, 0.006], [0, 0.0, 0.095], 8);
  const head = new THREE.Group(); head.position.y = DOG_DIMENSIONS.neckLength + 0.02; neck.add(head);
  const { jaw, ears, tongue, mouth } = buildHead(head, m);
  const legs = buildLegs(body, m);
  const tail = buildTail(body, m);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.85), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(0, 0.3, 0.04);
  root.add(hit);
  return { root, body, neck, head, jaw, ears, legs, tail, tongue, mouth, hit };
}
