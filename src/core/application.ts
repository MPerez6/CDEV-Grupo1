import { SimulationWorld } from '../sim/world.ts';
import { FixedStepClock } from '../sim/clock.ts';
import { MEAT_KINDS } from '../sim/meatCatalog.ts';
import { ASADOR_LAYOUT } from '../level/asador.ts';
import { CHAIR_STACK_BOUNDS, FAMILY_TABLE_BOUNDS, PATIO_TREE_BOUNDS, PERGOLA_POST_BOUNDS, PREP_TABLE_BOUNDS, RADIO_POSITION, RESTAURANT_TABLE_BOUNDS } from '../level/layout.ts';
import { createAudio } from '../audio/audio.ts';
import { createRadioAudio } from '../audio/radio.ts';
import { createCarbonAudio } from '../audio/carbon.ts';
import { createEncendedorAudio } from '../audio/encendedor.ts';
import { createPalitaAudio } from '../audio/palita.ts';
import { createPasosAudio } from '../audio/pasos.ts';
import { createPerroAudio } from '../audio/perro.ts';
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
  const baseObstacles = [ASADOR_LAYOUT.bounds, PREP_TABLE_BOUNDS, CHAIR_STACK_BOUNDS, PATIO_TREE_BOUNDS, ...PERGOLA_POST_BOUNDS];
  const activeObstacles = [...baseObstacles, FAMILY_TABLE_BOUNDS];
  const player = createPlayer(visual.camera, visual.clickable, activeObstacles);
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
  const encendedorAudio = createEncendedorAudio();
  const palitaAudio = createPalitaAudio();
  const pasosAudio = createPasosAudio();
  const perroAudio = createPerroAudio();
  
  const gameplay = createGameplay(
    world,
    ui.showMessage,

    (event, detail) => {

      // Mantener las animaciones del juego
      visual.triggerToolAction(event, detail);

      // Reproducir el encendedor
      if (
        event === 'lighter-flick' ||
        event === 'ignite'
      ) {
        encendedorAudio.play();
      }

      if (event === 'shovel-scoop') {
        palitaAudio.play();
      }

    },

    {
      toggleRadio: () => {
        const message = radio.toggle();
        syncRadioLed();
        return message;
      },
      petDog: () => {
        const mensaje = dog.pet(
          playerXZ(),
          somethingBurning()
        );

        perroAudio.play();

        return mensaje;
      },
    }
  );

  const audio = createAudio();
  //sonido del carbon
  const carbonAudio = createCarbonAudio();
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
  const unbindPlay = ui.onPlay(mode => {
    if(mode === 'clients') {
      world.clients.reset(true);
      activeObstacles.splice(0, activeObstacles.length, ...baseObstacles, ...RESTAURANT_TABLE_BOUNDS);
      ui.showMessage('Modo Clientes activo: salón de Parrilla AsArt habilitado. Los comensales entrarán por la puerta.');
    } else if(mode === 'training') {
      world.clients.reset(false);
      activeObstacles.splice(0, activeObstacles.length, ...baseObstacles, FAMILY_TABLE_BOUNDS);
    }
    audio.start(); carbonAudio.start(); pasosAudio.start(); radio.start(); controls.lock();
  });
  const onLock = () => { ui.setPlaying(true); radio.start(); pasosAudio.start; };
  const onUnlock = () => { ui.setPlaying(false); keys.clear(); audio.pause(); carbonAudio.pause(); pasosAudio.pause(); radio.pause(); };
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
  //variables de pasos
  let distanciaAcumulada = 0;
  let ultimaX = visual.camera.position.x;
  let ultimaZ = visual.camera.position.z;
  function frame(now: number): void {
    frameId = requestAnimationFrame(frame);
    const frameSeconds = Math.max(0, (now - previous) / 1000);
    const realDt = Math.min(frameSeconds, 0.05);
    previous = now; elapsedReal += realDt;
    player.move(realDt);
    
    const x = visual.camera.position.x;
    const z = visual.camera.position.z;

    const recorrido = Math.hypot(
      x - ultimaX,
      z - ultimaZ
    );

    ultimaX = x;
    ultimaZ = z;

    if (controls.isLocked && !document.hidden) {
      // Distancia aproximada entre pisadas
      if (recorrido > 0.001 && recorrido < 1) {
        distanciaAcumulada += recorrido;

        if (distanciaAcumulada >= 0.7) {
          pasosAudio.playStep();
          distanciaAcumulada -= 0.7;
        }
      }
    } else {
      distanciaAcumulada = 0;
    }

    if(controls.isLocked && !document.hidden) clock.advance(frameSeconds, dt => world.tick(dt));
    visual.updateVisuals(world, elapsedReal, gameplay.activeTool);
    uiTimer += realDt;
    if(uiTimer > 0.15) { updateHud(); uiTimer = 0; }
    audio.update(Math.max(0, ...world.meats.map(meat => world.meatFluxWm2(meat))), controls.isLocked);
    //carbon sonido 

  const brazier = world.brazier;

  // Actividad de combustión del carbón
  const actividadCarbon = brazier.fuel
    .filter(fuel => fuel.kind === 'charcoal')
    .reduce((total, fuel) => {
      const progreso = fuel.progress;

      const masaRestante =
        fuel.ember.initialMassG > 0
          ? fuel.ember.massG / fuel.ember.initialMassG
          : 0;

      return total + progreso * progreso
        * masaRestante;
    }, 0);

  // Intensidad normalizada entre 0 y 1
  const intensidadCarbon = brazier.lit
    ? Math.min(
        1,
        (brazier.tinderBurning ? 0.12 : 0) +
        actividadCarbon / 3
      )
    : 0;


  const [bx, , bz] = ASADOR_LAYOUT.brazierPosition;

  // Distancia horizontal entre jugador y brasero
  const distancia = Math.hypot(
    visual.camera.position.x - bx,
    visual.camera.position.z - bz
  );

  // Hasta 2 metros: volumen completo
  // A partir de 10 metros: silencio
  const distanciaMin = 2;
  const distanciaMax = 10;

  const proporcion = Math.max(
    0,
    Math.min(
      1,
      (distanciaMax - distancia) /
      (distanciaMax - distanciaMin)
    )
  );

  // Caída progresiva del volumen
  const factorDistancia = proporcion * proporcion;
    // Actualizar sonido
  carbonAudio.update(
    controls.isLocked && !document.hidden
      ? intensidadCarbon
      : 0,
    factorDistancia
  );


    if(controls.isLocked) {
      const dogEvents = dog.update({ dt: realDt, player: playerXZ(), meatOnGrill: world.meats.some(m => m.onGrill), burning: somethingBurning() }, elapsedReal);
      for(const event of dogEvents) ui.showMessage(event.message);
      const clientEvents = world.updateClients(realDt);
      for(const event of clientEvents) ui.showMessage(event.message);
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
    controls.unlock(); controls.dispose(); audio.dispose(); carbonAudio.dispose(); encendedorAudio.dispose(); palitaAudio.dispose(); pasosAudio.dispose(); perroAudio.dispose(); radio.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
