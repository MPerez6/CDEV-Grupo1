import { SimulationWorld } from '../sim/world.ts';
import { FixedStepClock } from '../sim/clock.ts';
import { MEAT_KINDS } from '../sim/meatCatalog.ts';
import { ASADOR_LAYOUT } from '../level/asador.ts';
import { PREP_TABLE_BOUNDS } from '../level/layout.ts';
import { createAudio } from '../audio/audio.ts';
import { createHud } from '../ui/hud.ts';
import { createGameplay } from '../gameplay/actions.ts';
import { createPlayer } from '../gameplay/player.ts';
import { bindGameplayInput, bindPrimaryAction } from '../gameplay/input.ts';
import { createScene } from './scene.ts';
import { createRenderer } from './renderer.ts';

export function startApplication(app: HTMLElement): () => void {
  const world = new SimulationWorld();
  for(const kind of MEAT_KINDS.slice(1)) world.addMeat(kind);
  world.addMeat('vacio'); // Segunda pieza de la muestra actual.
  const ui = createHud(app, world.message);
  const visual = createScene();
  const renderer = createRenderer(); app.prepend(renderer.domElement);
  const player = createPlayer(visual.camera, visual.clickable, [ASADOR_LAYOUT.bounds, PREP_TABLE_BOUNDS]);
  const { controls, keys } = player;
  const gameplay = createGameplay(world, ui.showMessage);
  const audio = createAudio();
  const target = () => player.target(gameplay.activeTool);
  const unbindKeys = bindGameplayInput(window, {
    isPlaying: () => controls.isLocked, keys, gameplay, getTarget: target, toggleDebug: ui.toggleDebug,
  });
  const unbindClick = bindPrimaryAction(document, () => controls.isLocked, () => gameplay.primaryAction(target()));
  const unbindPlay = ui.onPlay(() => { audio.start(); controls.lock(); });
  const onLock = () => ui.setPlaying(true);
  const onUnlock = () => { ui.setPlaying(false); keys.clear(); audio.pause(); };
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
    visual.updateVisuals(world, elapsedReal);
    uiTimer += realDt;
    if(uiTimer > 0.15) { updateHud(); uiTimer = 0; }
    audio.update(Math.max(0, ...world.meats.map(meat => world.meatFluxWm2(meat))), controls.isLocked);
    renderer.render(visual.scene, visual.camera);
  }
  updateHud(); frameId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(frameId);
    unbindKeys(); unbindClick(); unbindPlay();
    window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
    controls.removeEventListener('lock', onLock); controls.removeEventListener('unlock', onUnlock);
    controls.unlock(); controls.dispose(); audio.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
