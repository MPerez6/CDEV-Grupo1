import * as THREE from 'three';

export const LIGHTING_SETTINGS = {
  sunColor: 0xffecd0, sunIntensity: 2.2,
  ambientColor: 0xdde6e7, ambientIntensity: 1.1,
  fireColor: 0xff8a36, fireIntensity: 2.1, fireFlicker: 0.35,
};

export function createPatioLighting(scene: THREE.Scene): void {
  const sunlight = new THREE.DirectionalLight(LIGHTING_SETTINGS.sunColor, LIGHTING_SETTINGS.sunIntensity);
  sunlight.position.set(2, 9, 5);
  sunlight.castShadow = true;
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.bias = -0.00015;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -10;
  sunlight.shadow.camera.right = 10;
  sunlight.shadow.camera.top = 10;
  sunlight.shadow.camera.bottom = -10;
  scene.add(sunlight, new THREE.AmbientLight(LIGHTING_SETTINGS.ambientColor, LIGHTING_SETTINGS.ambientIntensity));
}

export function createFireLighting(root: THREE.Group) {
  const fireLight = new THREE.PointLight(LIGHTING_SETTINGS.fireColor, 0, 3.7, 1.4);
  fireLight.position.set(0, 0.58, 0);
  root.add(fireLight);

  return {
    light: fireLight, update(state: { lit: boolean; tinderBurning: boolean }, elapsedReal: number): void {
      fireLight.position.y = state.tinderBurning ? 0.58 : 1.05;
      fireLight.intensity = state.lit ? LIGHTING_SETTINGS.fireIntensity + LIGHTING_SETTINGS.fireFlicker * Math.sin(elapsedReal * 8) : 0;
    }
  };
}

export function createPreviewLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x595952, 1.4));
  const key = new THREE.DirectionalLight(0xfff0da, 2.4);
  key.position.set(-1.8, 5, 1.0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.003;
  key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 12;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde9f7, 0.55); fill.position.set(2, 2, -3); scene.add(fill);
}
