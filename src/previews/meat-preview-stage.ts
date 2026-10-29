import * as THREE from 'three';
import { createRenderer } from '../core/renderer.ts';
import { createPreviewLighting } from '../lighting/lighting.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Iluminación y cámara compartidas por las muestras de materiales. */
export function createMeatPreviewStage(cameraPosition: [number, number, number] = [0, 3.7, 2.3]) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x242421);
  const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.02, 30);
  camera.position.set(...cameraPosition);
  const renderer = createRenderer({ pixelRatioLimit: 1.5, exposure: 1, preserveDrawingBuffer: true });
  document.body.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.12, 0); controls.minDistance = 2.6; controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.46; controls.enablePan = false;
  controls.update();
  createPreviewLighting(scene);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x353630, roughness: 0.96 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; floor.receiveShadow = true; scene.add(floor);

  return { scene, camera, renderer, controls };
}
