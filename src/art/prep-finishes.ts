import * as THREE from 'three';

function texture(width: number, height: number, paint: (x: number, y: number) => number[]) {
  const bytes = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const c = paint(x, y);
    for (let k=0;k<3;k++) bytes[i+k] = THREE.MathUtils.clamp(c[k],0,255);
    bytes[i+3] = 255;
  }
  const map = new THREE.DataTexture(bytes,width,height);
  map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
  map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}
const grain = (x: number, y: number) => THREE.MathUtils.euclideanModulo(Math.sin(83.17*x + 37.33*y)*31871.13,1);
let reflection: THREE.DataTexture, timber: THREE.DataTexture, salt: THREE.DataTexture;
export function patioReflection() {
  reflection ??= texture(128,64,(x,y) => {
    const sky = y/64, shade = sky < .46 ? .36 : .76;
    const window = Math.exp(-(((x-37)/11)**2 + ((y-39)/6)**2)) + .85*Math.exp(-(((x-94)/6)**2 + ((y-45)/12)**2));
    return [90*shade+window*210,100*shade+window*202,108*shade+window*195];
  });
  reflection.mapping = THREE.EquirectangularReflectionMapping;
  return reflection;
}
export function metalFinish(roughness = .24) {
  return new THREE.MeshStandardMaterial({ color:0xd4d5d3, envMap:patioReflection(), envMapIntensity:1.10, roughness, metalness:.83 });
}
export function walnutFinish() {
  timber ??= texture(128,256,(x,y) => {
    const bend = x + 3.2*Math.sin(y*.022+x*.043) + .9*Math.sin(y*.071);
    const rings = Math.sin(bend*.50)*.5+.5, fiber = Math.pow(.5+.5*Math.sin(bend*2.2),7);
    const tone = 34*rings - 19*fiber + (grain(x,y)-.5)*11;
    return [119+tone,72+tone*.74,42+tone*.47];
  });
  return new THREE.MeshPhysicalMaterial({color:0xf1d6bb, map:timber, roughness:.37, clearcoat:.24, clearcoatRoughness:.33});
}
export function coarseSalt() {
  salt ??= texture(128,128,(x,y)=>{
    const g = grain(Math.floor(x/2),Math.floor(y/2)), fine = grain(x,y);
    const v = 195 + g*48 + fine*12;
    return [v,v*.984,v*.951];
  });
  return new THREE.MeshStandardMaterial({map:salt,roughness:.76});
}
export function paperLabel(text: string, radius: number, height: number, centerY: number) {
  const canvas = document.createElement('canvas');canvas.width=384; canvas.height=120;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle='#e1d5b7'; ctx.fillRect(0,0,384,120);
  ctx.strokeStyle='#7c6243'; ctx.lineWidth=3;ctx.strokeRect(7,7,370,106);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#3b3124';
  ctx.font='italic 600 59px Georgia, serif';ctx.fillText(text,192,64,340);
  const ink = new THREE.CanvasTexture(canvas); ink.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,36,1,true,-1.20,2.4),
    new THREE.MeshStandardMaterial({map:ink,roughness:.86,polygonOffset:true,polygonOffsetFactor:-1}));
  label.position.y=centerY;return label;
}
