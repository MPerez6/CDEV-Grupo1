import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

import { SimulationWorld } from '../src/sim/world.ts';
import { newEmber } from '../src/sim/embers.ts';
import { CONFIG } from '../src/sim/parameters.ts';
import { createGrill } from '../src/level/grill.ts';
import { createGrillEmbers } from '../src/effects/grill-embers.ts';
import { createToolViews } from '../src/art/tool-views.ts';
import { createMeatViews } from '../src/art/meat-views.ts';
import { selectTargetFromRay } from '../src/gameplay/player.ts';
import { createGameplay, type ToolAnimationDetail, type ToolAnimationEvent } from '../src/gameplay/actions.ts';
import { bindPokerSweep, bindPrimaryAction } from '../src/gameplay/input.ts';
import { ASADOR_LAYOUT } from '../src/level/asador.ts';
import { GRILL_LAYOUT } from '../src/level/layout.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createHeadlessStage() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(76, 16 / 9, 0.04, 80);
  scene.add(camera);
  const clickable: THREE.Object3D[] = [];
  const grill = createGrill(scene, clickable);
  const embers = createGrillEmbers(grill.coalMeshes);
  const tools = createToolViews(camera);
  const meats = createMeatViews(scene, camera, clickable, tools.carriedMeatAnchor);
  return {
    scene,
    camera,
    clickable,
    triggerToolAction: tools.triggerAction,
    updateVisuals(world: SimulationWorld, elapsedReal: number, activeTool = 0): void {
      embers.update(world, elapsedReal);
      tools.update(world, activeTool, elapsedReal);
      meats.update(world);
    },
  };
}

function prepareReadyEmber(world: SimulationWorld): void {
  world.brazier.addFuel('charcoal');
  world.brazier.addTinder();
  world.brazier.ignite();
  for(let i = 0;i < 420;i++) world.tick(5);
  world.brazier.hit();
}

test('Los 5 modelos GLB optimizados existen en src/assets/tools con cabecera binaria glTF v2 válida', () => {
  const expectedFiles = [
    'encendedor_apagado.glb',
    'encendedor_encendido.glb',
    'pala.glb',
    'pinza.glb',
    'atizador.glb',
  ];
  const toolsDir = path.resolve(__dirname, '../src/assets/tools');
  for(const file of expectedFiles) {
    const fullPath = path.join(toolsDir, file);
    assert.ok(fs.existsSync(fullPath), `Falta el modelo ${file}`);
    const buf = fs.readFileSync(fullPath);
    assert.ok(buf.byteLength > 1024, `El archivo ${file} está vacío o truncado`);
    assert.equal(buf.toString('ascii', 0, 4), 'glTF', `Cabecera inválida en ${file}`);
    assert.equal(buf.readUInt32LE(4), 2, `Versión glTF inválida en ${file}`);
  }
});

test('La pala permite soltar brasas en cualquier punto bajo la parrilla, incluyendo el fondo y debajo de carnes', () => {
  const world = new SimulationWorld();
  const vacio = world.addMeat('vacio');
  const chorizo = world.addMeat('chorizo');

  // Colocamos carnes grandes adelante-izquierda y medio-derecha para comprobar que NO bloquean la pala.
  assert.equal(world.takeMeat(world.meat.id), true);
  assert.equal(world.placeMeat(0), true); // Matambre adelante-izquierda
  assert.equal(world.takeMeat(vacio.id), true);
  assert.equal(world.placeMeat(11), true); // Vacío medio-derecha

  const visual = createHeadlessStage();
  visual.updateVisuals(world, 0.1, 1);
  visual.scene.updateMatrixWorld(true);

  // Ningún objeto de las herramientas en primera persona debe entrar en clickable.
  const cameraDescendants = new Set<THREE.Object3D>();
  visual.camera.traverse(obj => cameraDescendants.add(obj));
  for(const item of visual.clickable) {
    assert.equal(cameraDescendants.has(item), false, 'Un objeto acoplado a la cámara entró en clickable');
  }

  // Jugador parado frente a la mesada (fuera de ASADOR_LAYOUT.bounds.z1 = -3.10).
  const raycaster = new THREE.Raycaster();
  raycaster.far = 5.0;

  const aimFromPlayer = (playerPos: [number, number, number], lookAtPos: [number, number, number], activeTool: number) => {
    visual.camera.position.set(...playerPos);
    visual.camera.lookAt(...lookAtPos);
    visual.camera.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(0, 0), visual.camera);
    return selectTargetFromRay(raycaster, visual.clickable, activeTool);
  };

  // 1) Apuntando directo a la parte de atrás del piso refractario bajo la parrilla (fila trasera: sectores 18..23).
  for(const x of [-1.05, -0.35, 0.45, 1.05]) {
    const backTarget = aimFromPlayer([x * 0.7, 1.68, -2.80], [x, ASADOR_LAYOUT.hearthTop + 0.02, -5.42], 1);
    assert.ok(backTarget, `No detectó el fondo bajo la parrilla en x=${x}`);
    assert.equal(backTarget.kind, 'grill-cell');
    assert.ok(backTarget.emberPointM, 'Falta coordenada libre emberPointM');
    assert.ok(backTarget.emberPointM.z > CONFIG.grillDepthM * 0.75, `La coordenada Z (${backTarget.emberPointM.z}) no cayó atrás`);
    assert.ok((backTarget.index ?? -1) >= 18 && (backTarget.index ?? -1) <= 23, `Sector esperado en fila trasera (18..23), recibido ${backTarget.index}`);
  }

  // 2) Apuntando bajo el travesaño trasero contra la pared refractaria del fondo.
  const backWallTarget = aimFromPlayer([0, 1.68, -2.80], [0.2, ASADOR_LAYOUT.hearthTop + 0.14, -5.66], 1);
  assert.ok(backWallTarget, 'No detectó el tope trasero bajo la parrilla');
  assert.equal(backWallTarget.kind, 'grill-cell');
  assert.ok((backWallTarget.index ?? -1) >= 18, `El tope trasero debe caer en la fila del fondo, dio ${backWallTarget.index}`);

  // 3) Apuntando exactamente debajo del matambre en primera fila: con pala ignora la carne y da en el piso de brasas.
  const matambreWorldX = GRILL_LAYOUT.left + (world.meat.positionM.x / CONFIG.grillWidthM) * GRILL_LAYOUT.width;
  const matambreWorldZ = GRILL_LAYOUT.front - (world.meat.positionM.z / CONFIG.grillDepthM) * GRILL_LAYOUT.depth;
  const underMeatWithShovel = aimFromPlayer([matambreWorldX, 1.68, -2.80], [matambreWorldX, ASADOR_LAYOUT.hearthTop + 0.02, matambreWorldZ], 1);
  assert.ok(underMeatWithShovel);
  assert.equal(underMeatWithShovel.kind, 'grill-cell');
  assert.ok(underMeatWithShovel.emberPointM);

  // Con la pinza (slot 2), mirar al matambre sigue seleccionando la carne normalmente.
  const meatWithTongs = aimFromPlayer([matambreWorldX, 1.68, -2.80], [matambreWorldX, 1.18, matambreWorldZ], 2);
  assert.ok(meatWithTongs);
  assert.equal(meatWithTongs.kind, 'meat');
  assert.equal(meatWithTongs.meatId, world.meat.id);

  // 4) Depositamos brasas reales en el fondo de la parrilla y comprobamos posición visual y flujo térmico.
  prepareReadyEmber(world);
  const gameplay = createGameplay(world);
  gameplay.equip(1); // Pala
  world.carried = world.brazier.takeFromTray();
  assert.equal(world.carried?.state, 'ready');

  const rearSpot = aimFromPlayer([0.3, 1.68, -2.80], [0.65, ASADOR_LAYOUT.hearthTop + 0.02, -5.45], 1);
  assert.ok(rearSpot && rearSpot.index !== undefined);
  gameplay.primaryAction(rearSpot);

  assert.equal(world.carried, null);
  const rearCellEmbers = world.grill.cells[rearSpot.index];
  assert.equal(rearCellEmbers.length, 1);
  assert.ok(rearCellEmbers[0].positionM);
  assert.ok(rearCellEmbers[0].positionM.z > 0.45);

  // Verificamos que la porción 3D se ubique atrás en coordenadas de escena y entregue calor a un corte en el fondo.
  visual.updateVisuals(world, 0.5, 1);
  let emberGroup: THREE.Object3D | undefined;
  visual.scene.traverse(obj => {
    if(obj.name === 'ember-portion' && obj.userData.emberId === rearCellEmbers[0].id) emberGroup = obj;
  });
  assert.ok(emberGroup, 'No se creó la porción visual de brasas en el fondo');
  assert.ok(emberGroup.position.z < -5.1, `La brasa visual quedó adelante (z=${emberGroup.position.z})`);

  assert.equal(world.takeMeat(chorizo.id), true);
  assert.equal(world.placeMeat(rearSpot.index), true);
  world.tick(1);
  assert.ok(world.meatFluxWm2(chorizo) > 0, 'Las brasas en la fila trasera deben irradiar calor a la carne del fondo');
});

test('Las 4 herramientas ejecutan sus animaciones completas de acción, articulación y transporte', () => {
  const world = new SimulationWorld();
  const events: ToolAnimationEvent[] = [];
  const visual = createHeadlessStage();
  const gameplay = createGameplay(world, () => { }, event => {
    events.push(event);
    visual.triggerToolAction(event);
  });

  // 1) Encendedor: abrir tapa, girar rueda, encender llama y cerrar.
  prepareReadyEmber(world);
  const world2 = new SimulationWorld();
  world2.brazier.addFuel('charcoal');
  world2.brazier.addTinder();
  const gameplay2 = createGameplay(world2, () => { }, event => {
    events.push(event);
    visual.triggerToolAction(event);
  });
  gameplay2.primaryAction({ kind: 'tinder-pad' });
  assert.ok(events.includes('ignite'));

  let sawFlameVisible = false;
  for(let t = 0.05;t <= 1.35;t += 0.1) {
    visual.updateVisuals(world2, t, 0);
    visual.camera.traverse(obj => {
      assert.equal(Number.isFinite(obj.position.x) && Number.isFinite(obj.position.y) && Number.isFinite(obj.position.z), true);
    });
    const lighterGroup = visual.camera.getObjectByName('tool-lighter')!;
    assert.equal(lighterGroup.visible, true);
    lighterGroup.traverse(obj => {
      if(obj instanceof THREE.PointLight && obj.intensity > 0.2) {
        sawFlameVisible = true;
      }
    });
  }
  assert.equal(sawFlameVisible, true, 'El encendedor debe encender su luz de llama durante la animación ignite');

  // 2) Pala: recoger brasas muestra brasas sobre la hoja, y volcarlas las limpia.
  gameplay.equip(1);
  gameplay.primaryAction({ kind: 'tray' });
  assert.equal(world.carried?.state, 'ready');
  visual.updateVisuals(world, 2.0, 1);

  const shovelGroup = visual.camera.getObjectByName('tool-shovel')!;
  let carriedOnShovel = false;
  shovelGroup.traverse(obj => {
    if(obj.name === 'ember-portion') carriedOnShovel = true;
  });
  assert.equal(carriedOnShovel, true, 'La pala debe renderizar las brasas cargadas en su hoja');

  gameplay.primaryAction({ kind: 'grill-cell', index: 20, emberPointM: { x: 0.45, z: 0.52 } });
  visual.updateVisuals(world, 2.3, 1);
  visual.updateVisuals(world, 2.8, 1);
  carriedOnShovel = false;
  shovelGroup.traverse(obj => {
    if(obj.name === 'ember-portion') carriedOnShovel = true;
  });
  assert.equal(carriedOnShovel, false, 'La pala debe limpiar las brasas de su hoja al depositarlas');

  // 3) Pinza: agarrar carne la sujeta entre los brazos y cambiar de herramienta pasa la pinza a la mano secundaria.
  gameplay.equip(2);
  gameplay.interact({ kind: 'meat', meatId: world.meat.id });
  assert.equal(world.carriedMeatId, world.meat.id);
  visual.updateVisuals(world, 3.2, 2);

  const tongsGroup = visual.camera.getObjectByName('tool-tongs')!;
  const offhandGroup = visual.camera.getObjectByName('tool-tongs-offhand')!;
  assert.equal(tongsGroup.visible, true);
  assert.equal(offhandGroup.visible, false);
  assert.ok(tongsGroup.getObjectByName(`meat-matambre-${world.meat.id}`), 'La carne llevada debe montarse en la pinza');

  // Girar en el aire con Q y cambiar al atizador mientras se sostiene carne.
  gameplay.rotate(null);
  gameplay.equip(3);
  visual.updateVisuals(world, 3.6, 3);
  assert.equal(offhandGroup.visible, true, 'Al cambiar de herramienta con carne en mano debe mostrarse la pinza secundaria');
  assert.ok(offhandGroup.getObjectByName(`meat-matambre-${world.meat.id}`));

  // Volver a la pinza, colocar en la parrilla y dar vuelta con R.
  gameplay.equip(2);
  gameplay.primaryAction({ kind: 'grill-cell', index: 8 });
  assert.equal(world.carriedMeatId, null);
  gameplay.flip({ kind: 'meat', meatId: world.meat.id });
  visual.updateVisuals(world, 4.0, 2);

  // 4) Atizador: golpear el brasero y probar el resto de eventos sin NaN.
  gameplay.equip(3);
  gameplay.primaryAction({ kind: 'brazier' });
  const remainingEvents: ToolAnimationEvent[] = [
    'lighter-flick',
    'shovel-return',
    'shovel-tap',
    'tongs-clack',
    'poker-swing',
  ];
  let simClock = 4.2;
  for(const ev of remainingEvents) {
    visual.triggerToolAction(ev);
    for(let step = 0;step < 5;step++) {
      simClock += 0.12;
      visual.updateVisuals(world, simClock, gameplay.activeTool);
    }
  }
  assert.ok(events.includes('poker-hit'));
  assert.ok(events.includes('tongs-flip'));
  assert.ok(events.includes('tongs-rotate'));
});

test('El atizador mueve brasas bajo la parrilla según el ángulo del clic, engancha hacia adelante y barre en arrastre sin alterar masa', () => {
  const world = new SimulationWorld();
  const visual = createHeadlessStage();
  const rakeLog: { event: ToolAnimationEvent; detail?: ToolAnimationDetail }[] = [];
  const gameplay = createGameplay(world, () => { }, (event, detail) => {
    rakeLog.push({ event, detail });
    visual.triggerToolAction(event, detail);
  });
  gameplay.equip(3); // Atizador (tecla 4)

  // Colocamos una brasa en el sector 7 (col=1, fila=1 -> x=0.225, z=0.225) y un matambre arriba para verificar que la carne no bloquea al atizador.
  const ember = newEmber(50);
  ember.positionM = { x: 0.225, z: 0.225 };
  world.grill.put(7, ember);
  world.tick(10);
  const savedMass = ember.massG;
  const savedAsh = ember.ashG;

  assert.equal(world.takeMeat(world.meat.id), true);
  assert.equal(world.placeMeat(7), true); // Carne justo encima de la brasa
  visual.updateVisuals(world, 0.1, 3);
  visual.scene.updateMatrixWorld(true);

  const raycaster = new THREE.Raycaster();
  raycaster.far = 5.0;
  const toWorld = (xM: number, zM: number): [number, number, number] => [
    GRILL_LAYOUT.left + (xM / CONFIG.grillWidthM) * GRILL_LAYOUT.width,
    ASADOR_LAYOUT.hearthTop + 0.015,
    GRILL_LAYOUT.front - (zM / CONFIG.grillDepthM) * GRILL_LAYOUT.depth,
  ];
  const aimPoker = (playerPos: [number, number, number], targetWorld: [number, number, number]) => {
    visual.camera.position.set(...playerPos);
    visual.camera.lookAt(...targetWorld);
    visual.camera.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(0, 0), visual.camera);
    return selectTargetFromRay(raycaster, visual.clickable, 3);
  };

  // 1) Ángulo diagonal desde la izquierda apuntando sobre la brasa: la empuja hacia el fondo y a la derecha (+X, +Z).
  const hitDiagRight = aimPoker([-1.55, 1.68, -2.80], toWorld(ember.positionM.x, ember.positionM.z));
  assert.ok(hitDiagRight && hitDiagRight.pokerAim);
  assert.ok(hitDiagRight.pokerAim.dirX > 0.3, 'El rayo desde la izquierda debe tener componente +X');
  gameplay.primaryAction(hitDiagRight);
  assert.equal(rakeLog.at(-1)?.event, 'poker-rake');
  assert.ok(ember.positionM.x > 0.26, `Esperaba desplazamiento a la derecha (+X), actual=${ember.positionM.x}`);
  assert.ok(ember.positionM.z > 0.28, `Esperaba empuje hacia el fondo (+Z), actual=${ember.positionM.z}`);

  // 2) Enganchar detrás de la brasa (clic más profundo en Z que la brasa): la arrastra hacia adelante (-Z).
  const beforePullZ = ember.positionM.z;
  const hitBehind = aimPoker([0, 1.68, -2.80], toWorld(ember.positionM.x, ember.positionM.z + 0.08));
  assert.ok(hitBehind);
  gameplay.primaryAction(hitBehind);
  assert.ok(ember.positionM.z < beforePullZ - 0.08, `Esperaba arrastre hacia adelante (-Z), de ${beforePullZ} a ${ember.positionM.z}`);
  assert.ok((rakeLog.at(-1)?.detail?.dirZ ?? 0) < -0.5, 'La animación debe registrar dirección de arrastre (-Z)');

  // 3) Clic a la derecha de la brasa: la barre hacia la izquierda (-X).
  const beforeLeftX = ember.positionM.x;
  const hitRightSide = aimPoker([0.4, 1.68, -2.80], toWorld(ember.positionM.x + 0.08, ember.positionM.z));
  assert.ok(hitRightSide);
  gameplay.primaryAction(hitRightSide);
  assert.ok(ember.positionM.x < beforeLeftX - 0.08, `Esperaba barrido a la izquierda (-X), de ${beforeLeftX} a ${ember.positionM.x}`);

  // Conservación estricta: ni se duplicó la brasa ni cambió masa/ceniza sin avance del reloj.
  assert.equal(world.grill.emberCount, 1);
  assert.equal(ember.massG, savedMass);
  assert.equal(ember.ashG, savedAsh);

  // 4) Arrastre continuo manteniendo clic izquierdo (bindPokerSweep): llevamos la brasa hacia la derecha.
  const domMock = new EventTarget();
  let currentAim = aimPoker([0, 1.68, -2.80], toWorld(ember.positionM.x, ember.positionM.z));
  const unbindClick = bindPrimaryAction(domMock, () => true, () => gameplay.primaryAction(currentAim));
  const unbindSweep = bindPokerSweep(domMock, {
    isPlaying: () => true,
    gameplay,
    getTarget: () => currentAim,
  });

  const startX = ember.positionM.x;
  const down = new Event('mousedown');
  Object.defineProperty(down, 'button', { value: 0 });
  currentAim = aimPoker([-0.8, 1.68, -2.80], toWorld(ember.positionM.x - 0.06, ember.positionM.z));
  domMock.dispatchEvent(down);

  currentAim = aimPoker([0.5, 1.68, -2.80], toWorld(ember.positionM.x + 0.14, ember.positionM.z));
  domMock.dispatchEvent(new Event('mousemove'));
  domMock.dispatchEvent(new Event('mouseup'));

  assert.ok(ember.positionM.x > startX + 0.12, `El barrido sostenido debe desplazar la brasa hacia +X (${startX} -> ${ember.positionM.x})`);

  // Verificar que la animación direccional poker-rake corra limpia sin NaN.
  for(let t = 0.2;t <= 0.7;t += 0.1) {
    visual.updateVisuals(world, t, 3);
    const pokerGroup = visual.camera.getObjectByName('tool-poker')!;
    assert.equal(Number.isFinite(pokerGroup.position.x) && Number.isFinite(pokerGroup.position.z), true);
  }

  unbindClick();
  unbindSweep();
});

