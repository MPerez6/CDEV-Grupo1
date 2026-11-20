import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { coarseSalt, metalFinish, paperLabel, patioReflection, walnutFinish } from './prep-finishes.ts';
import type { Seasoning } from '../sim/seasoning.ts';

export type PrepProp = Seasoning | 'knife';
const urls: Record<Seasoning, string> = {
  salt: new URL('../assets/preparation/salero.glb', import.meta.url).href,
  pepper: new URL('../assets/preparation/molinillo.glb', import.meta.url).href,
  chimichurri: new URL('../assets/preparation/frasco.glb', import.meta.url).href,
  brine: new URL('../assets/preparation/salmuera.glb', import.meta.url).href,
};
export const jarHeight = { salt: .169, pepper: .26, chimichurri: .18, brine: .223 };
const cached = new Map<Seasoning, Promise<THREE.Object3D>>();

function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

// Hoja con lomo, bisel y filo convergentes. El mango son dos cachas sobre la espiga.
function carvingKnife() {
  const root = new THREE.Group();
  const steel = metalFinish(.25), bevel = metalFinish(.16), walnut = walnutFinish();
  const sections = [[.025, -.045, .026], [.001, -.05, .025], [-.066, -.045, .024],
    [-.14, -.036, .022], [-.195, -.022, .019], [-.235, -.002, .015], [-.257, .012, .0123]];
  const position: number[] = [], indices: number[] = [];
  const blade = new THREE.BufferGeometry();
  for (const [z, edge, spine] of sections) {
    const thick = Math.max(.00018, Math.min(.0024, (spine - edge) * .05));
    const grind = edge + (spine - edge) * .42;
    for (const [x,y] of [[spine,thick],[grind,thick*.73],[edge,0],[grind,-thick*.73],[spine,-thick]])
      position.push(x, y, z);
  }
  for (let band = 0; band < 5; band++) {
    const start = indices.length;
    for (let i = 0; i < sections.length - 1; i++) {
      const a = i * 5 + band, b = i * 5 + (band + 1) % 5;
      indices.push(a, b, a+5, b, b+5, a+5);
    }
    blade.addGroup(start, indices.length - start, band === 1 || band === 2 ? 1 : 0);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); blade.setIndex(indices);
  blade.computeVertexNormals(); steel.side = bevel.side = THREE.DoubleSide;
  const metal = new THREE.Mesh(blade, [steel, bevel]); metal.castShadow = true; root.add(metal);
  const grip = new THREE.Shape();
  grip.moveTo(-.013, -.014); grip.quadraticCurveTo(-.021,-.033,-.013,-.055);
  grip.bezierCurveTo(-.006,-.083,-.024,-.121,-.018,-.154);
  grip.quadraticCurveTo(-.012,-.171,.012,-.163);
  grip.bezierCurveTo(.024,-.151,.021,-.116,.019,-.073);
  grip.lineTo(.024,-.021); grip.quadraticCurveTo(.021,-.010,-.013,-.014);
  function scale(material: THREE.Material, thickness: number, y: number, rounding: number) {
    const geo = new THREE.ExtrudeGeometry(grip, {depth:thickness, bevelEnabled:true, bevelThickness:rounding,
      bevelSize:rounding, bevelSegments:3, curveSegments:10});
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i=0;i<pos.count;i++) uv.setXY(i,pos.getX(i)*18+.5,pos.getZ(i)*5);
    part(root, geo, material, 0, y, 0);
  }
  scale(steel, .002, -.001, .0006); scale(walnut, .006, .003, .003); scale(walnut, .006, -.009, .003);
  part(root, new RoundedBoxGeometry(.041,.023,.012,3,.003),steel,.004,0,.019);
  for (const z of [.043,.095,.144]) part(root, new THREE.CylinderGeometry(.0033,.0033,.0244,20), bevel, .002, 0, z);
  return root;
}

function herbTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 8360;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function pixel(x: number, y: number, color: number[]) {
    const i = (((y + size) % size) * size + (x + size) % size) * 4;
    data[i] = color[0]; data[i+1] = color[1]; data[i+2] = color[2]; data[i+3] = 255;
  }
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const v = random()*27; pixel(x,y,[103+v,91+v,37+v*.35]);
  }
  const bits = [[48,66,23],[68,83,27],[78,99,37],[105,109,38],[141,54,26],[183,149,85]];
  for (let n=0; n<2200; n++) {
    const x = Math.floor(random()*size), y = Math.floor(random()*size), angle = random()*6.28;
    const c = bits[Math.floor(random()*bits.length)], width = 1+Math.floor(random()*3);
    for (let i=0; i<width+1; i++) for (let j=0; j<width; j++) pixel(x+Math.round(i*Math.cos(angle)-j*Math.sin(angle)),y+Math.round(i*Math.sin(angle)+j*Math.cos(angle)),c);
  }
  const texture = new THREE.DataTexture(data,size,size);
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}
function dressJar(kind: Seasoning, root: THREE.Object3D) {
  let saltCap: THREE.Mesh | undefined;
  const glass = () => new THREE.MeshPhysicalMaterial({color:0xe6f1df, roughness:.12,transparent:true,
    opacity:.19,depthWrite:false,side:THREE.FrontSide,clearcoat:1,envMap:patioReflection()});
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object.receiveShadow = true;
    const material = object.material as THREE.MeshStandardMaterial;
    if (kind === 'salt' && material.name === 'Glaze') {
      object.material = glass(); object.castShadow=false; object.renderOrder=2;
    }
    if (kind === 'salt' && material.name === 'Top') {
      object.material = metalFinish(.23); saltCap=object;
    }
    if (kind === 'pepper') {
      object.material = walnutFinish();
      const geometry = object.geometry, pos = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i=0;i<pos.count;i++) uv.setXY(i,Math.atan2(pos.getZ(i),pos.getX(i)) / (2*Math.PI) + .5,pos.getY(i)*2.5);
    }
    if (kind === 'chimichurri' && material.name === 'Glass') {
      object.material = glass();
      object.castShadow = false; object.renderOrder = 2;
    }
    if (kind === 'chimichurri' && material.name === 'Lid') object.visible = false;
    if (kind === 'brine' && material.name.startsWith('Label')) object.visible = false;
    if (kind === 'brine' && material.name.startsWith('Contents')) {
      object.material = new THREE.MeshPhysicalMaterial({color:0xc9ad73,roughness:.15,transparent:true,opacity:.32,depthWrite:false,clearcoat:1});
    }
    if (kind === 'brine' && material.name.startsWith('Glass')) {
      material.depthWrite = false; object.castShadow = false; object.renderOrder = 2;
    }
  });
  if (kind === 'salt' && saltCap) {
    const fill = coarseSalt();
    part(root,new THREE.CylinderGeometry(.0194,.0186,.046,48),fill,0,.029,0);
    const pile = part(root,new THREE.SphereGeometry(.0193,32,12,0,Math.PI*2,0,Math.PI/2),fill,0,.052,0);
    pile.scale.y=.18; pile.rotation.z=.07;
    const rim = metalFinish(.31);
    for (const y of [.0648,.0664,.0680]) {
      const bead=part(root,new THREE.TorusGeometry(.02163,.00048,5,48),rim,0,y,0);bead.rotation.x=Math.PI/2;
    }
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0,-1,0);
    const recess = new THREE.MeshBasicMaterial({color:0x252521});
    for(let i=0;i<7;i++) {
      const angle=i*Math.PI/3, radius=i===6?0:.007;
      ray.set(new THREE.Vector3(Math.cos(angle)*radius,.12,Math.sin(angle)*radius),down);
      const hit=ray.intersectObject(saltCap,false)[0];
      if (!hit?.face) continue;
      const hole=part(root,new THREE.CircleGeometry(.00125,12),recess,hit.point.x,hit.point.y+.00010,hit.point.z);
      hole.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),hit.face.normal.clone().transformDirection(saltCap.matrixWorld));
    }
    root.add(paperLabel('Sal gruesa',.02168,.014,.035));
  }
  if (kind === 'pepper') {
    const metal=metalFinish(.25);
    part(root,new THREE.CylinderGeometry(.013,.016,.014,24),metal,0,.549,0);
    for(const y of [.075,.083]) {
      const band=part(root,new THREE.TorusGeometry(.058,.0026,6,40),metal,0,y,0);band.rotation.x=Math.PI/2;
    }
  }
  if (kind === 'brine') root.add(paperLabel('Salmuera',.02223,.017,.046));
  if (kind === 'chimichurri') {
    const salsa = new THREE.MeshStandardMaterial({map:herbTexture(), roughness:.36});
    part(root,new THREE.CylinderGeometry(.037,.035,.064,40),salsa,0,.038,0);
    const oil = new THREE.MeshPhysicalMaterial({color:0x928636,roughness:.16,clearcoat:.7,transparent:true,opacity:.24,depthWrite:false});
    part(root,new THREE.CylinderGeometry(.0371,.0371,.002,40),oil,0,.071,0);
    const steel = new THREE.MeshStandardMaterial({color:0xbfc6bd,metalness:.53,roughness:.29});
    const spoon = part(root,new THREE.CapsuleGeometry(.0016,.098,3,8),steel,.014,.099,0);
    spoon.rotation.z = -.28;
    const bowl = part(root,new THREE.SphereGeometry(.009,12,8),steel,0,.050,0);
    bowl.scale.set(.8,1.5,.29);
    root.add(paperLabel('Chimichurri',.0432,.024,.044));
  }
}

let knife: THREE.Group | undefined;
export function makePrepProp(kind: PrepProp): THREE.Group {
  if (kind === 'knife') { knife ??= carvingKnife(); return knife.clone(); }
  const parent = new THREE.Group();
  if (typeof document === 'undefined') return parent;
  let asset = cached.get(kind);
  if (!asset) {
    asset = new GLTFLoader().loadAsync(urls[kind]).then(({scene}) => {
      const size = new THREE.Box3().setFromObject(scene);
      const height = size.max.y - size.min.y;
      dressJar(kind, scene);
      scene.scale.setScalar(jarHeight[kind] / height);
      scene.position.y = -size.min.y * scene.scale.y;
      return scene;
    });
    cached.set(kind, asset);
  }
  void asset.then(model => parent.add(model.clone()));
  return parent;
}
