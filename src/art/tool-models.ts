import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type LighterRig = {
  group: THREE.Group;
  offModel: THREE.Object3D;
  onModel: THREE.Object3D;
  lidNode: THREE.Object3D;
  wheelNode: THREE.Object3D;
  camNode: THREE.Object3D;
  flameNode: THREE.Object3D;
  flameSocket: THREE.Object3D;
  closedLidQuat: THREE.Quaternion;
  openLidQuat: THREE.Quaternion;
  closedCamQuat: THREE.Quaternion;
  openCamQuat: THREE.Quaternion;
};

export type ShovelRig = {
  group: THREE.Group;
  emberSocket: THREE.Group;
};

export type TongsRig = {
  group: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  meatSocket: THREE.Group;
  baseLeftQuat: THREE.Quaternion;
  baseRightQuat: THREE.Quaternion;
};

export type PokerRig = {
  group: THREE.Group;
  tipSocket: THREE.Group;
};

export type ToolModelsBundle = {
  lighter: LighterRig;
  shovel: ShovelRig;
  tongs: TongsRig;
  offhandTongs: TongsRig;
  poker: PokerRig;
};

let sharedEnvMap: THREE.DataTexture | undefined;

/** Mapa de reflexión equirectangular liviano para que el cromo y el hierro esmaltado reflejen cielo y patio. */
function getToolEnvMap(): THREE.DataTexture {
  if(sharedEnvMap) return sharedEnvMap;
  const width = 64, height = 32;
  const data = new Uint8Array(width * height * 4);
  for(let y = 0;y < height;y++) {
    const v = y / (height - 1); // 0 abajo (piso/brasero), 1 arriba (cielo)
    for(let x = 0;x < width;x++) {
      const u = x / width;
      const sunSpot = Math.exp(-Math.pow((u - 0.28) / 0.14, 2) - Math.pow((v - 0.76) / 0.15, 2));
      let r: number, g: number, b: number;
      if(v >= 0.48) {
        const skyT = (v - 0.48) / 0.52;
        r = 216 - 28 * skyT + 38 * sunSpot;
        g = 222 - 14 * skyT + 30 * sunSpot;
        b = 224 + 8 * skyT + 14 * sunSpot;
      } else {
        const groundT = v / 0.48;
        r = 68 + 92 * groundT;
        g = 56 + 80 * groundT;
        b = 48 + 70 * groundT;
      }
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(r)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  sharedEnvMap = tex;
  return tex;
}

function prepareViewmodelTree(root: THREE.Object3D): void {
  const envMap = getToolEnvMap();
  root.traverse(obj => {
    obj.frustumCulled = false;
    if(obj instanceof THREE.Mesh) {
      obj.castShadow = false;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for(const mat of mats) {
        if(mat instanceof THREE.MeshStandardMaterial) {
          const isFlame = obj.name === 'Llama' || mat.name.includes('Llama');
          if(isFlame) {
            mat.transparent = true;
            mat.depthWrite = false;
            mat.side = THREE.DoubleSide;
            mat.emissiveIntensity = 1.85;
            mat.roughness = 1;
            mat.metalness = 0;
          } else {
            mat.envMap = envMap;
            mat.envMapIntensity = mat.metalness > 0.8 ? 0.95 : 0.72;
          }
          mat.needsUpdate = true;
        }
      }
    }
  });
}

function reparentChildren(from: THREE.Object3D, to: THREE.Object3D): void {
  while(from.children.length > 0) {
    to.add(from.children[0]);
  }
}

export function createToolModels(): ToolModelsBundle {
  // 1. Encendedor (combina modelo cerrado y modelo abierto con llama)
  const lighterGroup = new THREE.Group();
  lighterGroup.name = 'tool-lighter';
  const offHolder = new THREE.Group();
  const onHolder = new THREE.Group();
  onHolder.visible = false;
  lighterGroup.add(offHolder, onHolder);

  const fallbackLid = new THREE.Object3D();
  fallbackLid.position.set(-0.01965, 0.01735, 0);
  const fallbackWheel = new THREE.Object3D();
  fallbackWheel.position.set(0.0117, 0.0273, 0);
  const fallbackCam = new THREE.Object3D();
  fallbackCam.position.set(-0.0132, 0.0238, 0);
  const fallbackFlame = new THREE.Object3D();
  fallbackFlame.position.set(-0.0007, 0.0342, 0);
  const flameSocket = new THREE.Group();
  flameSocket.position.set(-0.0007, 0.046, 0);
  onHolder.add(fallbackLid, fallbackWheel, fallbackCam, fallbackFlame, flameSocket);

  const lighter: LighterRig = {
    group: lighterGroup,
    offModel: offHolder,
    onModel: onHolder,
    lidNode: fallbackLid,
    wheelNode: fallbackWheel,
    camNode: fallbackCam,
    flameNode: fallbackFlame,
    flameSocket,
    closedLidQuat: new THREE.Quaternion(0, 0, 0, 1),
    openLidQuat: new THREE.Quaternion(0, 0, 0.72236395, 0.69151306),
    closedCamQuat: new THREE.Quaternion(0, 0, -0.06975649, 0.99756408),
    openCamQuat: new THREE.Quaternion(0, 0, 0.40673667, 0.91354543),
  };

  // 2. Pala (rotada Math.PI en Y para que la cuchara apunte hacia -Z de cámara)
  const shovelGroup = new THREE.Group();
  shovelGroup.name = 'tool-shovel';
  const shovelAlign = new THREE.Group();
  shovelAlign.rotation.y = Math.PI;
  shovelGroup.add(shovelAlign);
  const emberSocket = new THREE.Group();
  emberSocket.position.set(0, -0.007, 0.619);
  emberSocket.rotation.y = Math.PI;
  shovelAlign.add(emberSocket);
  const shovel: ShovelRig = { group: shovelGroup, emberSocket };

  // 3. Pinza principal y copia secundaria para mano izquierda cuando se cambia de herramienta sosteniendo carne
  function buildTongsPlaceholder(name: string): { align: THREE.Group; rig: TongsRig } {
    const group = new THREE.Group();
    group.name = name;
    const align = new THREE.Group();
    align.rotation.y = Math.PI;
    group.add(align);
    const leftArm = new THREE.Object3D();
    leftArm.position.set(-0.0215, 0, -0.096);
    const rightArm = new THREE.Object3D();
    rightArm.position.set(0.0215, 0, -0.096);
    const meatSocket = new THREE.Group();
    meatSocket.position.set(0, 0, 0.369);
    meatSocket.rotation.y = Math.PI;
    align.add(leftArm, rightArm, meatSocket);
    return {
      align,
      rig: {
        group,
        leftArm,
        rightArm,
        meatSocket,
        baseLeftQuat: leftArm.quaternion.clone(),
        baseRightQuat: rightArm.quaternion.clone(),
      },
    };
  }
  const mainTongs = buildTongsPlaceholder('tool-tongs');
  const offTongs = buildTongsPlaceholder('tool-tongs-offhand');

  // 4. Atizador
  const pokerGroup = new THREE.Group();
  pokerGroup.name = 'tool-poker';
  const pokerAlign = new THREE.Group();
  pokerAlign.rotation.y = Math.PI;
  pokerGroup.add(pokerAlign);
  const tipSocket = new THREE.Group();
  tipSocket.position.set(-0.003, -0.002, 0.514);
  pokerAlign.add(tipSocket);
  const poker: PokerRig = { group: pokerGroup, tipSocket };

  // Las pruebas de Node corren sin navegador; en el navegador se cargan los cinco GLB reales.
  if(typeof document !== 'undefined') {
    const loader = new GLTFLoader();

    loader.load(new URL('../assets/tools/encendedor_apagado.glb', import.meta.url).href, gltf => {
      prepareViewmodelTree(gltf.scene);
      offHolder.add(gltf.scene);
      const closedLid = gltf.scene.getObjectByName('Tapa_Superior');
      const closedCam = gltf.scene.getObjectByName('Leva_Resorte');
      if(closedLid) lighter.closedLidQuat.copy(closedLid.quaternion);
      if(closedCam) lighter.closedCamQuat.copy(closedCam.quaternion);
    });

    loader.load(new URL('../assets/tools/encendedor_encendido.glb', import.meta.url).href, gltf => {
      prepareViewmodelTree(gltf.scene);
      const openLid = gltf.scene.getObjectByName('Tapa_Superior');
      const wheel = gltf.scene.getObjectByName('Rueda_Chispero');
      const openCam = gltf.scene.getObjectByName('Leva_Resorte');
      const flame = gltf.scene.getObjectByName('Llama');
      const sock = gltf.scene.getObjectByName('Socket_Llama');
      if(openLid) {
        lighter.openLidQuat.copy(openLid.quaternion);
        lighter.lidNode = openLid;
      }
      if(wheel) lighter.wheelNode = wheel;
      if(openCam) {
        lighter.openCamQuat.copy(openCam.quaternion);
        lighter.camNode = openCam;
      }
      if(flame) lighter.flameNode = flame;
      if(sock) {
        flameSocket.position.copy(sock.position);
        sock.parent?.add(flameSocket);
      }
      onHolder.clear();
      onHolder.add(gltf.scene);
      if(!sock) onHolder.add(flameSocket);
    });

    loader.load(new URL('../assets/tools/pala.glb', import.meta.url).href, gltf => {
      prepareViewmodelTree(gltf.scene);
      const sock = gltf.scene.getObjectByName('Socket_Brasas');
      if(sock) {
        const nextSocket = new THREE.Group();
        nextSocket.position.copy(sock.position);
        nextSocket.rotation.y = Math.PI;
        reparentChildren(shovel.emberSocket, nextSocket);
        sock.parent?.add(nextSocket);
        shovel.emberSocket = nextSocket;
      }
      shovelAlign.clear();
      shovelAlign.add(gltf.scene);
      if(!sock) shovelAlign.add(shovel.emberSocket);
    });

    loader.load(new URL('../assets/tools/pinza.glb', import.meta.url).href, gltf => {
      prepareViewmodelTree(gltf.scene);
      const bindTongsScene = (sceneClone: THREE.Object3D, targetAlign: THREE.Group, targetRig: TongsRig): void => {
        const left = sceneClone.getObjectByName('Brazo_Izquierdo');
        const right = sceneClone.getObjectByName('Brazo_Derecho');
        const sock = sceneClone.getObjectByName('Socket_Carne');
        if(left) {
          targetRig.leftArm = left;
          targetRig.baseLeftQuat.copy(left.quaternion);
        }
        if(right) {
          targetRig.rightArm = right;
          targetRig.baseRightQuat.copy(right.quaternion);
        }
        if(sock) {
          const nextSocket = new THREE.Group();
          nextSocket.position.copy(sock.position);
          nextSocket.rotation.y = Math.PI;
          reparentChildren(targetRig.meatSocket, nextSocket);
          sock.parent?.add(nextSocket);
          targetRig.meatSocket = nextSocket;
        }
        targetAlign.clear();
        targetAlign.add(sceneClone);
        if(!sock) targetAlign.add(targetRig.meatSocket);
      };
      const secondaryClone = gltf.scene.clone(true);
      bindTongsScene(gltf.scene, mainTongs.align, mainTongs.rig);
      bindTongsScene(secondaryClone, offTongs.align, offTongs.rig);
    });

    loader.load(new URL('../assets/tools/atizador.glb', import.meta.url).href, gltf => {
      prepareViewmodelTree(gltf.scene);
      const sock = gltf.scene.getObjectByName('Socket_Punta');
      if(sock) {
        const nextSocket = new THREE.Group();
        nextSocket.position.copy(sock.position);
        reparentChildren(poker.tipSocket, nextSocket);
        sock.parent?.add(nextSocket);
        poker.tipSocket = nextSocket;
      }
      pokerAlign.clear();
      pokerAlign.add(gltf.scene);
      if(!sock) pokerAlign.add(poker.tipSocket);
    });
  }

  return {
    lighter,
    shovel,
    tongs: mainTongs.rig,
    offhandTongs: offTongs.rig,
    poker,
  };
}
