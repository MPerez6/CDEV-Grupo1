import { SimulationWorld } from '../sim/world.ts';
import { FixedStepClock } from '../sim/clock.ts';
import { MEAT_KINDS } from '../sim/meatCatalog.ts';
import { ASADOR_LAYOUT } from '../level/asador.ts';
import { CHAIR_STACK_BOUNDS, FAMILY_TABLE_BOUNDS, PERGOLA_POST_BOUNDS, PREP_TABLE_BOUNDS, RADIO_POSITION } from '../level/layout.ts';
import { createAudio } from '../audio/audio.ts';
import { createRadioAudio } from '../audio/radio.ts';
import { createDog } from '../ai/dog.ts';
import * as THREE from 'three';
import { createHud } from '../ui/hud.ts';
import { createGameplay } from '../gameplay/actions.ts';
import { createPlayer } from '../gameplay/player.ts';
import { bindGameplayInput, bindPokerSweep, bindPrimaryAction } from '../gameplay/input.ts';
import { createScene } from './scene.ts';
import { createRenderer } from './renderer.ts';

export function startApplication(app: HTMLElement): () => void {
  const world = new SimulationWorld();
  for(const kind of MEAT_KINDS.slice(1)) world.addMeat(kind);
  world.addMeat('vacio'); // Segunda pieza de la muestra actual.
  const ui = createHud(app, world.message);
  const visual = createScene();
  const renderer = createRenderer(); app.prepend(renderer.domElement);
  const player = createPlayer(visual.camera, visual.clickable, [
    ASADOR_LAYOUT.bounds, PREP_TABLE_BOUNDS, FAMILY_TABLE_BOUNDS, CHAIR_STACK_BOUNDS, ...PERGOLA_POST_BOUNDS,
  ]);
  const { controls, keys } = player;
  const radio = createRadioAudio(RADIO_POSITION);
  const radioLed = visual.scene.getObjectByName('radio-led') as THREE.Mesh | undefined;
  const syncRadioLed = () => {
    const mat = radioLed?.material as THREE.MeshStandardMaterial | undefined;
    if(mat) mat.emissiveIntensity = radio.isOn() ? 1.6 : 0;
  };
  // Primer NPC: el perro del patio (src/ai).
  const dog = createDog(visual.scene, visual.clickable);
  const playerXZ = () => ({ x: visual.camera.position.x, z: visual.camera.position.z });
  const somethingBurning = () => world.meats.some(m => m.onGrill && Math.max(m.burn.a, m.burn.b, m.casingDamage.a, m.casingDamage.b) >= 10);
  const gameplay = createGameplay(world, ui.showMessage, visual.triggerToolAction, {
    toggleRadio: () => { const message = radio.toggle(); syncRadioLed(); return message; },
    petDog: () => dog.pet(playerXZ(), somethingBurning()),
  });
  const audio = createAudio();
  const listenerForward = new THREE.Vector3();
  // Solo en `npm run dev`: acceso para pruebas y capturas (Vite lo elimina del build de producción).
  if((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
    (window as unknown as Record<string, unknown>).__asado = { world, camera: visual.camera, dog, ui };
  const target = () => player.target(gameplay.activeTool, { carryingMeat: world.carriedMeatId !== null, shovelLoaded: world.carried !== null && world.carried !== undefined });
  const unbindKeys = bindGameplayInput(window, {
    isPlaying: () => controls.isLocked, keys, gameplay, getTarget: target, toggleDebug: ui.toggleDebug,
  });
  const unbindClick = bindPrimaryAction(document, () => controls.isLocked, () => gameplay.primaryAction(target()));
  const unbindSweep = bindPokerSweep(document, {
    isPlaying: () => controls.isLocked, gameplay, getTarget: target,
  });
  const unbindPlay = ui.onPlay(() => { audio.start(); radio.start(); controls.lock(); });
  const onLock = () => { ui.setPlaying(true); radio.start(); };
  const onUnlock = () => { ui.setPlaying(false); keys.clear(); audio.pause(); radio.pause(); };
  controls.addEventListener('lock', onLock); controls.addEventListener('unlock', onUnlock);
  const resize = () => {
    visual.camera.aspect = window.innerWidth / window.innerHeight;
    visual.camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);
  const clock = new FixedStepClock();
  let previous = performance.now(), elapsedReal = 0, uiTimer = 0, frameId = 0;
  const visibility = () => { previous = performance.now(); };
  document.addEventListener('visibilitychange', visibility);
  const updateHud = () => ui.update(world, { activeTool: gameplay.activeTool, target: controls.isLocked ? target() : null });
  function frame(now: number): void {
    frameId = requestAnimationFrame(frame);
    const frameSeconds = Math.max(0, (now - previous) / 1000);
    const realDt = Math.min(frameSeconds, 0.05);
    previous = now; elapsedReal += realDt;
    player.move(realDt);
    if(controls.isLocked && !document.hidden) clock.advance(frameSeconds, dt => world.tick(dt));
    visual.updateVisuals(world, elapsedReal, gameplay.activeTool);
    uiTimer += realDt;
    if(uiTimer > 0.15) { updateHud(); uiTimer = 0; }
    audio.update(Math.max(0, ...world.meats.map(meat => world.meatFluxWm2(meat))), controls.isLocked);
    if(controls.isLocked) {
      const dogEvents = dog.update({ dt: realDt, player: playerXZ(), meatOnGrill: world.meats.some(m => m.onGrill), burning: somethingBurning() }, elapsedReal);
      for(const event of dogEvents) ui.showMessage(event.message);
    }
    visual.camera.getWorldDirection(listenerForward);
    radio.update(visual.camera.position, listenerForward);
    renderer.render(visual.scene, visual.camera);
  }
  updateHud(); frameId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(frameId);
    unbindKeys(); unbindClick(); unbindSweep(); unbindPlay();
    window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
    controls.removeEventListener('lock', onLock); controls.removeEventListener('unlock', onUnlock);
    controls.unlock(); controls.dispose(); audio.dispose(); radio.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
