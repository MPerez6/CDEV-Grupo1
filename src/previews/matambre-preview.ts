import * as THREE from 'three';
import { createMeatPreviewStage } from './meat-preview-stage.ts';
import { MeatModel } from '../sim/meat.ts';
import { createMeatVisual } from '../art/meat-visual.ts';

// Estados de muestra independientes de la partida: revisar apariencia, no validar cocción.
const { scene, camera, renderer, controls } = createMeatPreviewStage();
const raw = new MeatModel('matambre'), cooked = new MeatModel('matambre');
const pieces = [raw, cooked];
const views = pieces.map((meat, i) => {
  const x = (i - 0.5) * 2.08;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.075, 1.24), new THREE.MeshStandardMaterial({ color: 0x8b663f, roughness: 0.76 }));
  board.position.set(x, -0.035, 0); board.receiveShadow = true; board.castShadow = true; scene.add(board);
  const view = createMeatVisual(meat, 3.2, 3.2);
  view.group.position.set(x, 0.005, 0); scene.add(view.group);
  return view;
});
function render(): void { for(const view of views) view.update(); renderer.render(scene, camera); }
function state(charred: boolean): void {
  cooked.brown.a = cooked.brown.b = 60;
  cooked.burn.a = cooked.burn.b = charred ? 85 : 0;
  cooked.layersC.fill(charred ? 95 : 70);
  document.getElementById('golden')!.setAttribute('aria-pressed', String(!charred));
  document.getElementById('charred')!.setAttribute('aria-pressed', String(charred));
  document.getElementById('state-name')!.textContent = charred ? 'Quemado' : 'Dorado';
  document.getElementById('state-note')!.textContent = charred ? 'Carbonización irregular de la superficie' : 'Grasa tostada y superficie caramelizada';
  render();
}
document.getElementById('golden')!.addEventListener('click', () => state(false));
document.getElementById('charred')!.addEventListener('click', () => state(true));
document.getElementById('turn')!.addEventListener('click', () => {
  for(const meat of pieces) meat.flip();
  document.getElementById('turn')!.setAttribute('aria-pressed', String(raw.faceDown === 'b')); render();
});
controls.addEventListener('change', render);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); render(); });
state(false);
// La textura termina de cargar después del primer cuadro.
renderer.setAnimationLoop(render);
