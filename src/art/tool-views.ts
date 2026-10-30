import * as THREE from 'three';
import type { SimulationWorld } from '../sim/world.ts';
import type { ToolAnimationDetail, ToolAnimationEvent } from '../gameplay/actions.ts';
import { createEmberScatter, type EmberScatter } from '../effects/ember-scatter.ts';
import { createToolModels, type TongsRig } from './tool-models.ts';

type ActiveAction = {
  event: ToolAnimationEvent;
  startedAt: number;
  duration: number;
  dirX: number;
  dirZ: number;
};

type SparkParticle = {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  speed: number;
};

const ACTION_DURATIONS: Record<ToolAnimationEvent, number> = {
  'equip': 0.26,
  'ignite': 1.18,
  'lighter-flick': 0.76,
  'shovel-scoop': 0.54,
  'shovel-deposit': 0.58,
  'shovel-return': 0.58,
  'shovel-tap': 0.28,
  'tongs-grab': 0.48,
  'tongs-release': 0.48,
  'tongs-flip': 0.60,
  'tongs-rotate': 0.40,
  'tongs-clack': 0.36,
  'poker-hit': 0.52,
  'poker-rake': 0.44,
  'poker-swing': 0.34,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function segment(t: number, start: number, end: number): number {
  if(end <= start) return 0;
  return clamp01((t - start) / (end - start));
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tempLeftDelta = new THREE.Quaternion();
const tempRightDelta = new THREE.Quaternion();

function setTongsClamp(rig: TongsRig, clampRad: number): void {
  tempLeftDelta.setFromAxisAngle(Y_AXIS, clampRad);
  tempRightDelta.setFromAxisAngle(Y_AXIS, -clampRad);
  rig.leftArm.quaternion.copy(rig.baseLeftQuat).multiply(tempLeftDelta);
  rig.rightArm.quaternion.copy(rig.baseRightQuat).multiply(tempRightDelta);
}

/** Vista en primera persona y animaciones articuladas de las cuatro herramientas del asador. */
export function createToolViews(camera: THREE.Camera) {
  const root = new THREE.Group();
  root.name = 'first-person-tools';
  camera.add(root);

  const models = createToolModels();
  root.add(
    models.lighter.group,
    models.shovel.group,
    models.tongs.group,
    models.offhandTongs.group,
    models.poker.group,
  );

  // Escalas y encuadre ergonómico en espacio de cámara (near = 0.04).
  models.lighter.group.scale.setScalar(1.32);
  models.shovel.group.scale.setScalar(0.86);
  models.tongs.group.scale.setScalar(0.94);
  models.offhandTongs.group.scale.setScalar(0.90);
  models.poker.group.scale.setScalar(0.95);
  models.offhandTongs.group.visible = false;

  // Ancla compartida para que meat-views monte cualquier corte entre las paletas de la pinza.
  const carriedMeatAnchor = new THREE.Group();
  carriedMeatAnchor.name = 'tongs-carried-meat-anchor';
  carriedMeatAnchor.scale.setScalar(0.42);
  carriedMeatAnchor.rotation.z = Math.PI / 2;
  carriedMeatAnchor.position.set(0, 0, -0.024);
  models.tongs.meatSocket.add(carriedMeatAnchor);

  // Luces puntuales locales para la llama del encendedor y las brasas cargadas en la pala.
  const flameLight = new THREE.PointLight(0xff9b38, 0, 1.35, 1.8);
  models.lighter.flameSocket.add(flameLight);

  const shovelGlowLight = new THREE.PointLight(0xff4d14, 0, 1.15, 1.8);
  shovelGlowLight.position.set(0, 0.035, 0);
  models.shovel.emberSocket.add(shovelGlowLight);

  // Chispas del chispero del encendedor.
  const flintSparkGeo = new THREE.SphereGeometry(0.0014, 4, 4);
  const flintSparkMat = new THREE.MeshBasicMaterial({ color: 0xffdf7a });
  const flintSparks: SparkParticle[] = [];
  for(let i = 0;i < 8;i++) {
    const mesh = new THREE.Mesh(flintSparkGeo, flintSparkMat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    models.lighter.onModel.add(mesh);
    const angle = 2.35 + (i / 7 - 0.5) * 0.85;
    const zSpread = ((i % 3) - 1) * 0.28;
    flintSparks.push({
      mesh,
      dir: new THREE.Vector3(Math.cos(angle), Math.sin(angle) * 0.85 + 0.25, zSpread).normalize(),
      speed: 0.055 + (i % 4) * 0.014,
    });
  }

  // Chispas incandescentes al golpear el brasero con el atizador.
  const pokerSparkGeo = new THREE.SphereGeometry(0.0032, 4, 4);
  const pokerSparkMat = new THREE.MeshBasicMaterial({ color: 0xff7b24 });
  const pokerSparks: SparkParticle[] = [];
  for(let i = 0;i < 10;i++) {
    const mesh = new THREE.Mesh(pokerSparkGeo, pokerSparkMat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    models.poker.tipSocket.add(mesh);
    const phi = i * 2.39996;
    pokerSparks.push({
      mesh,
      dir: new THREE.Vector3(Math.cos(phi) * 0.8, 0.45 + (i % 3) * 0.3, Math.sin(phi) * 0.8).normalize(),
      speed: 0.14 + (i % 4) * 0.04,
    });
  }

  // Estado animado.
  const pendingEvents: { event: ToolAnimationEvent; detail?: ToolAnimationDetail }[] = [];
  let currentAction: ActiveAction | null = null;
  let equipStartedAt = -10;
  let lastTool = -1;
  let wheelAngle = 0;
  let tongsCarryBlend = 0;
  let prevCamPos: THREE.Vector3 | null = null;
  let walkPhase = 0;
  let walkAmplitude = 0;
  let lastElapsed = 0;

  // Brasas o carbón inmaduro visibles sobre la hoja de la pala.
  let carriedKey: string | null = null;
  let carriedScatter: EmberScatter | null = null;

  function syncShovelPayload(world: SimulationWorld, elapsedReal: number): void {
    const carried = world.carried;
    if(!carried) {
      if(carriedScatter) {
        carriedScatter.dispose();
        carriedScatter = null;
        carriedKey = null;
      }
      shovelGlowLight.intensity = 0;
      return;
    }

    const nextKey = carried.state === 'ready'
      ? `ready-${carried.ember.id}`
      : `immature-${carried.fuel.ember.id}`;

    if(carriedKey !== nextKey || !carriedScatter) {
      carriedScatter?.dispose();
      const ready = carried.state === 'ready';
      carriedScatter = createEmberScatter(
        ready ? carried.ember.id : carried.fuel.ember.id + 10_000,
        {
          spreadX: ready ? 0.045 : 0.032,
          spreadZ: ready ? 0.050 : 0.036,
          size: ready ? 0.0155 : 0.022,
          count: ready ? 14 : 4,
        },
      );
      carriedScatter.fragments.castShadow = false;
      carriedScatter.group.position.set(0, 0.008, 0);
      carriedKey = nextKey;
    }

    if(carriedScatter.group.parent !== models.shovel.emberSocket) {
      models.shovel.emberSocket.add(carriedScatter.group);
    }

    if(carried.state === 'ready') {
      carriedScatter.update(carried.ember, elapsedReal, { heat: 1 });
      const ratio = carried.ember.initialMassG > 0
        ? clamp01(carried.ember.massG / carried.ember.initialMassG)
        : 0;
      shovelGlowLight.intensity = models.shovel.group.visible
        ? (0.42 + Math.sin(elapsedReal * 7.5) * 0.06) * ratio
        : 0;
    } else {
      carriedScatter.update(carried.fuel.ember, elapsedReal, { heat: carried.fuel.progress * 0.45 });
      shovelGlowLight.intensity = 0;
    }
  }

  function updateLighterRig(lidOpen: number, flameAmount: number, sparkProgress: number, elapsedReal: number, dt: number, spinWheel: boolean): void {
    const open = clamp01(lidOpen);
    const lit = clamp01(flameAmount);
    const showArticulated = open > 0.002 || lit > 0.002;
    models.lighter.offModel.visible = !showArticulated;
    models.lighter.onModel.visible = showArticulated;

    if(showArticulated) {
      models.lighter.lidNode.quaternion.slerpQuaternions(
        models.lighter.closedLidQuat,
        models.lighter.openLidQuat,
        open,
      );
      models.lighter.camNode.quaternion.slerpQuaternions(
        models.lighter.closedCamQuat,
        models.lighter.openCamQuat,
        open,
      );
      if(spinWheel) {
        wheelAngle -= dt * 26;
      }
      models.lighter.wheelNode.rotation.set(0, 0, wheelAngle);

      models.lighter.flameNode.visible = lit > 0.01;
      if(lit > 0.01) {
        const flickerY = 1 + Math.sin(elapsedReal * 37) * 0.11 + Math.cos(elapsedReal * 53) * 0.06;
        const flickerXZ = 1 + Math.cos(elapsedReal * 41) * 0.07;
        models.lighter.flameNode.scale.set(lit * flickerXZ, lit * flickerY, lit * flickerXZ);
        models.lighter.flameNode.rotation.z = Math.sin(elapsedReal * 29) * 0.07;
        flameLight.intensity = lit * (0.72 + Math.sin(elapsedReal * 33) * 0.14);
      } else {
        flameLight.intensity = 0;
      }
    } else {
      models.lighter.flameNode.visible = false;
      flameLight.intensity = 0;
    }

    const showSparks = sparkProgress > 0 && sparkProgress < 1 && models.lighter.group.visible;
    for(const spark of flintSparks) {
      spark.mesh.visible = showSparks;
      if(showSparks) {
        const p = sparkProgress;
        spark.mesh.position.set(
          0.0117 + spark.dir.x * spark.speed * p,
          0.0305 + spark.dir.y * spark.speed * p - 0.045 * p * p,
          spark.dir.z * spark.speed * p,
        );
        spark.mesh.scale.setScalar(Math.max(0.15, 1 - p * 0.85));
      }
    }
  }

  function updatePokerSparks(sparkProgress: number): void {
    const active = sparkProgress > 0 && sparkProgress < 1 && models.poker.group.visible;
    for(const spark of pokerSparks) {
      spark.mesh.visible = active;
      if(active) {
        const p = sparkProgress;
        spark.mesh.position.set(
          spark.dir.x * spark.speed * p,
          spark.dir.y * spark.speed * p - 0.16 * p * p,
          spark.dir.z * spark.speed * p,
        );
        spark.mesh.scale.setScalar(Math.max(0.1, 1 - p));
      }
    }
  }

  function triggerAction(event: ToolAnimationEvent, detail?: ToolAnimationDetail): void {
    pendingEvents.push({ event, detail });
  }

  function update(world: SimulationWorld, activeTool: number, elapsedReal: number): void {
    const dt = Math.max(0, Math.min(0.1, elapsedReal - lastElapsed));
    lastElapsed = elapsedReal;

    if(lastTool !== activeTool) {
      if(lastTool !== -1) equipStartedAt = elapsedReal;
      lastTool = activeTool;
    }

    while(pendingEvents.length > 0) {
      const { event, detail } = pendingEvents.shift()!;
      if(event === 'equip') {
        equipStartedAt = elapsedReal;
      } else {
        currentAction = {
          event,
          startedAt: elapsedReal,
          duration: ACTION_DURATIONS[event],
          dirX: detail?.dirX ?? 0,
          dirZ: detail?.dirZ ?? 1,
        };
      }
    }

    // Balanceo de caminata e inercia respiratoria suave.
    if(!prevCamPos) {
      prevCamPos = camera.position.clone();
    } else {
      const moved = Math.hypot(camera.position.x - prevCamPos.x, camera.position.z - prevCamPos.z);
      prevCamPos.copy(camera.position);
      const speed = dt > 1e-4 ? Math.min(1, moved / (2.55 * dt)) : 0;
      walkAmplitude += (speed - walkAmplitude) * Math.min(1, dt * 10 || 0.25);
      walkPhase += dt * (2.2 + walkAmplitude * 6.8);
    }

    const swayX = Math.cos(walkPhase) * 0.0085 * walkAmplitude + Math.sin(elapsedReal * 1.6) * 0.0018;
    const swayY = -Math.abs(Math.sin(walkPhase)) * 0.0095 * walkAmplitude + Math.cos(elapsedReal * 2.1) * 0.0022;

    const equipT = clamp01((elapsedReal - equipStartedAt) / ACTION_DURATIONS.equip);
    const equipDrop = 1 - easeOutCubic(equipT);

    let actionEvent: ToolAnimationEvent | null = null;
    let actionT = 0;
    if(currentAction) {
      actionT = (elapsedReal - currentAction.startedAt) / currentAction.duration;
      if(actionT >= 1) {
        currentAction = null;
        actionT = 0;
      } else {
        actionEvent = currentAction.event;
      }
    }

    // Visibilidad por herramienta activa.
    models.lighter.group.visible = activeTool === 0;
    models.shovel.group.visible = activeTool === 1;
    models.tongs.group.visible = activeTool === 2;
    models.poker.group.visible = activeTool === 3;

    // Si hay carne sostenida y se equipa otra herramienta, la mano izquierda sostiene la pinza con el corte.
    const holdingMeat = world.carriedMeatId !== null;
    const showOffhandTongs = holdingMeat && activeTool !== 2;
    models.offhandTongs.group.visible = showOffhandTongs;
    const targetMeatSocket = showOffhandTongs ? models.offhandTongs.meatSocket : models.tongs.meatSocket;
    if(carriedMeatAnchor.parent !== targetMeatSocket) {
      targetMeatSocket.add(carriedMeatAnchor);
    }
    if(showOffhandTongs) {
      models.offhandTongs.group.position.set(-0.26 + swayX * 0.6, -0.215 + swayY * 0.6, -0.27);
      models.offhandTongs.group.rotation.set(-0.06, -0.26, -1.18);
      setTongsClamp(models.offhandTongs, 0.052);
    }

    // Actualiza carga de brasas en la pala.
    syncShovelPayload(world, elapsedReal);

    // 1. ENCENDEDOR (slot 0)
    {
      let dx = 0, dy = 0, dz = 0, dpitch = 0, dyaw = 0, droll = 0;
      let lidOpen = 0, flame = 0, sparkP = 0, spinWheel = false;

      if(actionEvent === 'ignite') {
        const t = actionT;
        if(t < 0.18) {
          const p = easeOutCubic(segment(t, 0, 0.18));
          lidOpen = Math.min(1, p * 1.04);
          dy = 0.016 * p;
          droll = -0.15 * Math.sin(p * Math.PI);
        } else if(t < 0.34) {
          const p = segment(t, 0.18, 0.34);
          lidOpen = 1;
          spinWheel = true;
          sparkP = p;
          flame = easeOutCubic(segment(t, 0.22, 0.34));
          dy = 0.016 - 0.010 * Math.sin(p * Math.PI);
          dpitch = -0.08 * p;
        } else if(t < 0.82) {
          const reach = Math.sin(segment(t, 0.34, 0.82) * Math.PI);
          const hold = easeInOutCubic(Math.min(segment(t, 0.34, 0.52), 1 - segment(t, 0.68, 0.82)));
          lidOpen = 1;
          flame = 1;
          dx = -0.045 * hold;
          dy = 0.016 - 0.048 * hold;
          dz = -0.145 * hold;
          dpitch = -0.08 - 0.24 * hold;
          dyaw = -0.14 * hold + 0.02 * reach;
        } else {
          const closeP = easeInOutCubic(segment(t, 0.82, 1));
          lidOpen = 1 - closeP;
          flame = 1 - clamp01(closeP * 2.2);
          droll = 0.10 * Math.sin(closeP * Math.PI);
        }
      } else if(actionEvent === 'lighter-flick') {
        const t = actionT;
        if(t < 0.22) {
          const p = easeOutCubic(segment(t, 0, 0.22));
          lidOpen = p;
          dy = 0.014 * p;
          droll = -0.12 * Math.sin(p * Math.PI);
        } else if(t < 0.42) {
          const p = segment(t, 0.22, 0.42);
          lidOpen = 1;
          spinWheel = true;
          sparkP = p;
          flame = easeOutCubic(segment(t, 0.28, 0.42));
          dy = 0.014 - 0.008 * Math.sin(p * Math.PI);
        } else if(t < 0.74) {
          lidOpen = 1;
          flame = 1;
          dy = 0.014;
        } else {
          const closeP = easeInOutCubic(segment(t, 0.74, 1));
          lidOpen = 1 - closeP;
          flame = 1 - clamp01(closeP * 2.2);
          dy = 0.014 * (1 - closeP);
        }
      }

      const eq = activeTool === 0 ? equipDrop : 0;
      models.lighter.group.position.set(
        0.145 + swayX + dx,
        -0.108 + swayY + dy - eq * 0.14,
        -0.245 + dz + eq * 0.04,
      );
      models.lighter.group.rotation.set(
        0.08 + dpitch - eq * 0.28,
        -0.34 + dyaw,
        0.05 + droll,
      );
      updateLighterRig(lidOpen, flame, sparkP, elapsedReal, dt, spinWheel);
    }

    // 2. PALA (slot 1)
    {
      let dx = 0, dy = 0, dz = 0, dpitch = 0, dyaw = 0, droll = 0;
      const hasPayload = world.carried !== null;

      if(actionEvent === 'shovel-scoop') {
        const t = actionT;
        if(t < 0.36) {
          const p = easeOutCubic(segment(t, 0, 0.36));
          dy = -0.095 * p;
          dz = -0.21 * p;
          dpitch = -0.22 * p;
        } else if(t < 0.64) {
          const p = easeInOutCubic(segment(t, 0.36, 0.64));
          dy = -0.095 + 0.025 * p;
          dz = -0.21 - 0.065 * Math.sin(p * Math.PI);
          dpitch = -0.22 + 0.28 * p;
        } else {
          const p = easeInOutCubic(segment(t, 0.64, 1));
          dy = -0.070 * (1 - p);
          dz = -0.21 * (1 - p);
          dpitch = 0.06 * (1 - p);
        }
      } else if(actionEvent === 'shovel-deposit') {
        const t = actionT;
        if(t < 0.34) {
          const p = easeOutCubic(segment(t, 0, 0.34));
          dx = -0.03 * p;
          dy = -0.045 * p;
          dz = -0.25 * p;
          dpitch = -0.14 * p;
        } else if(t < 0.70) {
          const p = Math.sin(segment(t, 0.34, 0.70) * Math.PI);
          dx = -0.03 - 0.025 * p;
          dy = -0.045 - 0.02 * p;
          dz = -0.25;
          dpitch = -0.14 - 0.24 * p;
          droll = -0.78 * p;
        } else {
          const p = easeInOutCubic(segment(t, 0.70, 1));
          dx = -0.03 * (1 - p);
          dy = -0.045 * (1 - p);
          dz = -0.25 * (1 - p);
          dpitch = -0.14 * (1 - p);
        }
      } else if(actionEvent === 'shovel-return') {
        const t = actionT;
        if(t < 0.26) {
          const p = easeOutCubic(segment(t, 0, 0.26));
          dy = -0.05 * p;
          dz = 0.03 * p;
          dpitch = -0.16 * p;
        } else if(t < 0.62) {
          const p = easeOutCubic(segment(t, 0.26, 0.62));
          dy = -0.05 + 0.145 * p;
          dz = 0.03 - 0.25 * p;
          dpitch = -0.16 + 0.58 * p;
          dyaw = 0.08 * p;
        } else {
          const p = easeInOutCubic(segment(t, 0.62, 1));
          dy = 0.095 * (1 - p);
          dz = -0.22 * (1 - p);
          dpitch = 0.42 * (1 - p);
          dyaw = 0.08 * (1 - p);
        }
      } else if(actionEvent === 'shovel-tap') {
        const pulse = Math.sin(actionT * Math.PI);
        dz = -0.075 * pulse;
        dy = -0.02 * pulse;
        dpitch = -0.10 * pulse;
      }

      const eq = activeTool === 1 ? equipDrop : 0;
      const carryPitch = hasPayload ? 0.035 : 0;
      models.shovel.group.position.set(
        0.24 + swayX + dx,
        -0.195 + swayY + dy - eq * 0.16,
        -0.19 + dz + eq * 0.05,
      );
      models.shovel.group.rotation.set(
        -0.06 + carryPitch + dpitch - eq * 0.30,
        0.24 + dyaw,
        -0.04 + droll,
      );
    }

    // 3. PINZA (slot 2)
    {
      const targetCarry = holdingMeat ? 1 : 0;
      tongsCarryBlend += (targetCarry - tongsCarryBlend) * Math.min(1, dt * 12 || 1);

      let dx = 0, dy = 0, dz = 0, dpitch = 0, dyaw = 0, droll = 0;
      let clampRad = tongsCarryBlend * 0.052;

      if(actionEvent === 'tongs-grab') {
        const t = actionT;
        if(t < 0.42) {
          const p = easeOutCubic(segment(t, 0, 0.42));
          dx = -0.03 * p;
          dy = -0.055 * p;
          dz = -0.22 * p;
          dpitch = -0.14 * p;
          clampRad = -0.022 * p;
        } else if(t < 0.60) {
          const p = easeOutCubic(segment(t, 0.42, 0.60));
          dx = -0.03;
          dy = -0.055 + 0.025 * p;
          dz = -0.22;
          dpitch = -0.14 + 0.08 * p;
          clampRad = -0.022 + 0.078 * p;
        } else {
          const p = easeInOutCubic(segment(t, 0.60, 1));
          dx = -0.03 * (1 - p);
          dy = -0.030 * (1 - p);
          dz = -0.22 * (1 - p);
          dpitch = -0.06 * (1 - p);
          clampRad = 0.052;
        }
      } else if(actionEvent === 'tongs-release') {
        const t = actionT;
        if(t < 0.42) {
          const p = easeOutCubic(segment(t, 0, 0.42));
          dx = -0.03 * p;
          dy = -0.065 * p;
          dz = -0.22 * p;
          dpitch = -0.16 * p;
          droll = -0.75 * (1 - tongsCarryBlend) * p;
          clampRad = 0.052;
        } else if(t < 0.66) {
          const p = easeOutCubic(segment(t, 0.42, 0.66));
          dx = -0.03;
          dy = -0.065;
          dz = -0.22;
          dpitch = -0.16;
          clampRad = 0.052 - 0.076 * p;
        } else {
          const p = easeInOutCubic(segment(t, 0.66, 1));
          dx = -0.03 * (1 - p);
          dy = -0.065 * (1 - p);
          dz = -0.22 * (1 - p);
          dpitch = -0.16 * (1 - p);
          clampRad = -0.024 * (1 - p);
        }
      } else if(actionEvent === 'tongs-flip') {
        const t = actionT;
        if(t < 0.24) {
          const p = easeOutCubic(segment(t, 0, 0.24));
          dx = -0.04 * p;
          dy = -0.04 * p;
          dz = -0.21 * p;
          droll = -0.85 * p;
          clampRad = 0.060 * p;
        } else if(t < 0.76) {
          const p = easeInOutCubic(segment(t, 0.24, 0.76));
          dx = -0.04;
          dy = -0.04 + 0.075 * Math.sin(p * Math.PI);
          dz = -0.21;
          dpitch = 0.14 * Math.sin(p * Math.PI);
          droll = -0.85 + Math.PI * 0.96 * p;
          clampRad = 0.060;
        } else {
          const p = easeInOutCubic(segment(t, 0.76, 1));
          dx = -0.04 * (1 - p);
          dz = -0.21 * (1 - p);
          droll = (-0.85 + Math.PI * 0.96) * (1 - p);
          clampRad = 0.060 * (1 - p);
        }
      } else if(actionEvent === 'tongs-rotate') {
        const pulse = Math.sin(actionT * Math.PI);
        dx = -0.035 * pulse;
        dz = (holdingMeat ? -0.06 : -0.17) * pulse;
        dyaw = 0.34 * pulse;
        droll = 0.26 * pulse;
        if(!holdingMeat) clampRad = 0.055 * pulse;
      } else if(actionEvent === 'tongs-clack') {
        const doublePulse = Math.pow(Math.sin(actionT * Math.PI * 2), 2);
        clampRad = Math.max(clampRad, 0.078 * doublePulse);
        dy = 0.008 * doublePulse;
        dz = -0.03 * Math.sin(actionT * Math.PI);
      }

      const eq = activeTool === 2 ? equipDrop : 0;
      const baseX = THREE.MathUtils.lerp(0.245, 0.205, tongsCarryBlend);
      const baseY = THREE.MathUtils.lerp(-0.195, -0.175, tongsCarryBlend);
      const baseZ = THREE.MathUtils.lerp(-0.24, -0.22, tongsCarryBlend);
      const baseRoll = THREE.MathUtils.lerp(-0.30, -1.18, tongsCarryBlend);

      models.tongs.group.position.set(
        baseX + swayX + dx,
        baseY + swayY + dy - eq * 0.16,
        baseZ + dz + eq * 0.05,
      );
      models.tongs.group.rotation.set(
        -0.06 + dpitch - eq * 0.28,
        0.23 + dyaw,
        baseRoll + droll,
      );
      setTongsClamp(models.tongs, clampRad);
    }

    // 4. ATIZADOR (slot 3)
    {
      let dx = 0, dy = 0, dz = 0, dpitch = 0, dyaw = 0, droll = 0;
      let sparkP = 0;

      if(actionEvent === 'poker-hit') {
        const t = actionT;
        if(t < 0.24) {
          const p = easeOutCubic(segment(t, 0, 0.24));
          dx = 0.025 * p;
          dy = 0.045 * p;
          dz = 0.065 * p;
          dpitch = 0.24 * p;
          dyaw = -0.08 * p;
        } else if(t < 0.42) {
          const p = easeInOutCubic(segment(t, 0.24, 0.42));
          dx = 0.025 - 0.075 * p;
          dy = 0.045 - 0.10 * p;
          dz = 0.065 - 0.335 * p;
          dpitch = 0.24 - 0.46 * p;
          dyaw = -0.08 + 0.18 * p;
        } else if(t < 0.68) {
          const p = segment(t, 0.42, 0.68);
          const vib = Math.sin(p * Math.PI * 5) * Math.exp(-p * 3.5);
          sparkP = segment(t, 0.40, 0.86);
          dx = -0.05 + 0.02 * p;
          dy = -0.055 + 0.025 * p + vib * 0.008;
          dz = -0.27 + 0.09 * p;
          dpitch = -0.22 + 0.08 * p + vib * 0.05;
          dyaw = 0.10 - 0.04 * p;
          droll = vib * 0.06;
        } else {
          const p = easeInOutCubic(segment(t, 0.68, 1));
          sparkP = segment(t, 0.40, 0.86);
          dx = -0.03 * (1 - p);
          dy = -0.03 * (1 - p);
          dz = -0.18 * (1 - p);
          dpitch = -0.14 * (1 - p);
          dyaw = 0.06 * (1 - p);
        }
      } else if(actionEvent === 'poker-rake' && currentAction) {
        const t = actionT;
        const rx = currentAction.dirX;
        const rz = currentAction.dirZ; // +1 empuja hacia el fondo (-Z cámara), -1 arrastra hacia adelante (+Z cámara)
        const startX = -0.055 * rx - 0.025;
        const endX = 0.125 * rx - 0.025;
        const startZ = rz < 0 ? -0.28 : -0.11;
        const endZ = rz < 0 ? -0.07 : -0.29 - 0.03 * rz;

        if(t < 0.28) {
          const p = easeOutCubic(segment(t, 0, 0.28));
          // Si arrastra hacia adelante, levanta levemente al pasar por encima de la brasa antes de engancharla atrás.
          const hookArc = rz < -0.2 ? Math.sin(p * Math.PI) * 0.035 : 0;
          dx = startX * p;
          dy = -0.062 * p + hookArc;
          dz = startZ * p;
          dpitch = (-0.18 + hookArc * 1.4) * p;
          dyaw = 0.12 * rx * p;
        } else if(t < 0.74) {
          const p = easeInOutCubic(segment(t, 0.28, 0.74));
          sparkP = segment(t, 0.28, 0.82);
          dx = THREE.MathUtils.lerp(startX, endX, p);
          dy = -0.062 - 0.012 * Math.sin(p * Math.PI);
          dz = THREE.MathUtils.lerp(startZ, endZ, p);
          dpitch = -0.18 - 0.08 * rz * Math.sin(p * Math.PI);
          dyaw = THREE.MathUtils.lerp(0.12 * rx, -0.24 * rx, p);
          droll = -0.16 * rx * Math.sin(p * Math.PI);
        } else {
          const p = easeInOutCubic(segment(t, 0.74, 1));
          sparkP = segment(t, 0.28, 0.82);
          dx = endX * (1 - p);
          dy = (-0.062 + 0.03 * Math.sin(p * Math.PI)) * (1 - p);
          dz = endZ * (1 - p);
          dpitch = -0.18 * (1 - p);
          dyaw = -0.24 * rx * (1 - p);
        }
      } else if(actionEvent === 'poker-swing') {
        const pulse = Math.sin(actionT * Math.PI);
        dx = -0.025 * pulse;
        dy = -0.025 * pulse;
        dz = -0.145 * pulse;
        dpitch = -0.15 * pulse;
      }

      const eq = activeTool === 3 ? equipDrop : 0;
      models.poker.group.position.set(
        0.245 + swayX + dx,
        -0.195 + swayY + dy - eq * 0.16,
        -0.21 + dz + eq * 0.05,
      );
      models.poker.group.rotation.set(
        -0.05 + dpitch - eq * 0.30,
        0.25 + dyaw,
        -0.06 + droll,
      );
      updatePokerSparks(sparkP);
    }
  }

  return {
    root,
    models,
    carriedMeatAnchor,
    triggerAction,
    update,
  };
}
export type ToolViewsController = ReturnType<typeof createToolViews>;

