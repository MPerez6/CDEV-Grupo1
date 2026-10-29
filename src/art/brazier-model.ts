import * as THREE from 'three';
export function createBrazierModel(scene: THREE.Scene, clickable: THREE.Object3D[], placement?: { position: [number, number, number]; scale: number; hearth: boolean }) {
  const root = new THREE.Group();
  root.position.set(...(placement?.position ?? [-2.65, 0, -4.70] as [number, number, number]));
  root.scale.setScalar(placement?.scale ?? 1);
  scene.add(root);
  const iron = new THREE.MeshStandardMaterial({ color: 0x292b2c, roughness: 0.78, metalness: 0.7 });
  const rod = (a: number[], b: number[], radius = 0.022, material = iron, parent: THREE.Object3D = root) => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const target = (shape: [number, number, number] | THREE.BufferGeometry, position: [number, number, number], kind: string) => {
    // Volúmenes de selección invisibles, sin tapar la vista ni el acceso inferior.
    const mesh = new THREE.Mesh(Array.isArray(shape) ? new THREE.BoxGeometry(...shape) : shape, new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false,
    }));
    mesh.position.set(...position);
    mesh.userData.kind = kind;
    root.add(mesh);
    clickable.push(mesh);
    return mesh;
  };

  // Canasta abierta: costillas en U/V, dos largueros y cuatro patas abiertas.
  for(let i = 0;i <= 10;i++) {
    const x = -0.58 + i * 0.116;
    const points = [[x, 1.24, -0.50], [x, 0.79, -0.16], [x, 0.75, -0.10],
    [x, 0.75, 0.10], [x, 0.79, 0.16], [x, 1.24, 0.50]];
    for(let j = 1;j < points.length;j++) rod(points[j - 1], points[j], 0.017);
  }
  for(const z of [-0.50, 0.50]) {
    rod([-0.64, 1.24, z], [0.64, 1.24, z], 0.027);
    for(const x of [-0.55, 0.55]) rod([x, 1.22, z], [x * 1.28, 0.12, z * 1.3], 0.026);
  }
  for(const z of [-0.14, 0.14]) rod([-0.63, 0.77, z], [0.63, 0.77, z]);
  for(const x of [-0.58, 0.58]) {
    rod([x, 1.24, -0.50], [x, 1.24, 0.50], 0.02);
    rod([x, 0.45, -0.55], [x, 0.45, 0.55], 0.018);
  }
  // La selección también sigue la V: una caja aquí interceptaría los clics al papel.
  const basketSection = new THREE.Shape();
  basketSection.moveTo(-0.515, 1.285);
  basketSection.lineTo(-0.13, 0.735);
  basketSection.lineTo(0.13, 0.735);
  basketSection.lineTo(0.515, 1.285);
  basketSection.closePath();
  const basketTarget = new THREE.ExtrudeGeometry(basketSection, { depth: 1.27, bevelEnabled: false });
  basketTarget.rotateY(-Math.PI / 2);
  basketTarget.translate(0.635, 0, 0);
  target(basketTarget, [0, 0, 0], 'brazier');

  // Las brasas caen sobre la base refractaria, justo debajo de la canasta.
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.10, 1.70),
    new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 1 }));
  hearth.position.set(0, 0.05, 0.22);
  hearth.receiveShadow = true;
  if(placement?.hearth !== false) root.add(hearth);
  const groundTarget = target([1.30, 0.16, 1.05], [0, 0.18, 0.02], 'tray');
  groundTarget.userData.enabled = false;
  target([0.91, 0.30, 0.78], [0, 0.28, 0.03], 'tinder-pad');

  const paper = new THREE.Group();
  paper.name = 'tinder-paper';
  paper.position.set(0, 0.14, 0.04);
  root.add(paper);
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xd7ccb1, roughness: 1, side: THREE.DoubleSide });
  const printMaterial = new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 1, side: THREE.DoubleSide });
  for(let i = 0;i < 5;i++) {
    const geometry = new THREE.PlaneGeometry(0.27, 0.21, 3, 3);
    const vertices = geometry.getAttribute('position');
    for(let v = 0;v < vertices.count;v++) vertices.setZ(v, Math.sin(v * 4.1 + i) * 0.035);
    geometry.computeVertexNormals();
    const sheet = new THREE.Mesh(geometry, paperMaterial);
    sheet.rotation.set(-Math.PI / 2 + i * 0.19, i * 0.37, i * 1.7);
    sheet.position.set(Math.sin(i * 2.4) * 0.18, 0.025 + (i % 3) * 0.025, Math.cos(i * 2.4) * 0.11);
    sheet.castShadow = true;
    for(let line = 0;line < 5;line++) {
      const print = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.003), printMaterial);
      print.position.set(0, -0.065 + line * 0.027, 0.038);
      sheet.add(print);
    }
    paper.add(sheet);
  }
  const twigMaterial = new THREE.MeshStandardMaterial({ color: 0x795032, roughness: 1 });
  for(let i = 0;i < 6;i++) {
    const angle = i * 1.9;
    rod([Math.cos(angle) * -0.25, 0.08, Math.sin(angle) * -0.21],
      [Math.cos(angle) * 0.25, 0.10, Math.sin(angle) * 0.21], 0.011, twigMaterial, paper);
  }

  const brazierContents = new THREE.Group();
  root.add(brazierContents);
  const trayContents = new THREE.Group();
  trayContents.position.set(0, 0.10, 0);
  root.add(trayContents);

  return { root, groundTarget, paper, paperMaterial, brazierContents, trayContents };
}
