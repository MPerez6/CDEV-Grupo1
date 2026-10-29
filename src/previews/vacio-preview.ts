import * as THREE from 'three';
import { MeatModel } from '../sim/meat.ts';
import { createMeatVisual } from '../art/meat-visual.ts';
import { createMeatPreviewStage } from './meat-preview-stage.ts';
import { VACIO_FACES } from '../art/vacio-visual.ts';

const { scene, camera, renderer, controls } = createMeatPreviewStage([0, 2.65, 3.15]);
const pieces = [new MeatModel('vacio'), new MeatModel('vacio')];
pieces[1].flip();
const views = pieces.map((meat, i) => {
  const x = (i - 0.5) * 1.94;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.075, 1.24), new THREE.MeshStandardMaterial({ color: 0x8b663f, roughness: 0.76 }));
  board.position.set(x, -0.035, 0); board.receiveShadow = true; board.castShadow = true; scene.add(board);
  const view = createMeatVisual(meat, 3.5, 3.5);
  view.group.position.set(x, 0.005, 0); scene.add(view.group);
  return view;
});
function render(): void { for(const view of views) view.update(); renderer.render(scene, camera); }
function labels(): void {
  for(const [i, id] of ['left-name', 'right-name'].entries())
    document.getElementById(id)!.textContent = VACIO_FACES[pieces[i].faceDown === 'a' ? 'b' : 'a'];
}
function cameraView(profile: boolean): void {
  camera.position.set(0, profile ? 1.1 : 4.1, profile ? 3.9 : 1.2);
  document.getElementById('profile')!.setAttribute('aria-pressed', String(profile));
  document.getElementById('top')!.setAttribute('aria-pressed', String(!profile));
  controls.update(); render();
}

// Muestras visuales aisladas: no representan una cocción térmica simulada.
function appearance(state: 'raw' | 'roast' | 'burned'): void {
  for(const meat of pieces) {
    meat.layersC.fill(state === 'raw' ? 5 : 75);
    meat.brown.a = meat.brown.b = state === 'raw' ? 0 : 60;
    meat.burn.a = meat.burn.b = state === 'burned' ? 85 : 0;
  }
  for(const id of ['raw', 'roast', 'burned'])
    document.getElementById(id)!.setAttribute('aria-pressed', String(id === state));
  document.getElementById('appearance')!.textContent = state === 'raw' ? 'Crudo' : state === 'roast' ? 'Dorado' : 'Quemado';
  render();
}

for(const state of ['raw', 'roast', 'burned'] as const)
  document.getElementById(state)!.addEventListener('click', () => appearance(state));
document.getElementById('profile')!.addEventListener('click', () => cameraView(true));
document.getElementById('top')!.addEventListener('click', () => cameraView(false));
document.getElementById('flip')!.addEventListener('click', () => { for(const meat of pieces) meat.flip(); labels(); render(); });
controls.addEventListener('change', render);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); render(); });
labels(); appearance('roast'); renderer.setAnimationLoop(render);
