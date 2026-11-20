import * as THREE from 'three';
import type { MeatModel } from '../sim/meat.ts';

let fibers: THREE.DataTexture;
function fiberMap() {
  if (fibers) return fibers;
  const size=128, pixels = new Uint8Array(size*size*4);
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const r = THREE.MathUtils.euclideanModulo(Math.sin(x*89.1+y*73.3)*39485.7,1);
    const wave = Math.sin(x*.31+y*.93+Math.sin(x*.19+y*.095)*2.9);
    const shade = 218+8*wave+15*r+(wave>.92&&r>.7?9:0);
    const i=(y*size+x)*4; pixels.set([shade,shade-3,shade-5,255],i);
  }
  fibers = new THREE.DataTexture(pixels,size,size);
  fibers.colorSpace=THREE.SRGBColorSpace; fibers.wrapS=fibers.wrapT=THREE.RepeatWrapping;
  fibers.generateMipmaps=true; fibers.magFilter=THREE.LinearFilter; fibers.minFilter=THREE.LinearMipmapLinearFilter; fibers.needsUpdate=true;
  return fibers;
}
export function cutSurface(meat: MeatModel) {
  const raw = new THREE.Color(meat.definition.precooked ? 0x4f3232 : meat.definition.geometry === 'cylinder' ? 0xcd8370 : 0xcb7d7a);
  const cooked = new THREE.Color(meat.definition.precooked ? 0x503533 : 0xa37c66);
  const material = new THREE.MeshStandardMaterial({name:'interior-del-corte',map:fiberMap(),color:raw,roughness:.64,side:THREE.DoubleSide});
  material.onBeforeRender = () => material.color.copy(raw).lerp(cooked, THREE.MathUtils.smoothstep(meat.centerC,36,79));
  return material;
}
