import * as THREE from 'three';
export function createRenderer(options: { pixelRatioLimit?: number; exposure?: number; preserveDrawingBuffer?: boolean } = {}): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: options.preserveDrawingBuffer ?? false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.pixelRatioLimit ?? 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? 1.2;
  return renderer;
}
