import * as THREE from 'three';

type CloudPuff = {
  mesh: THREE.Object3D;
  baseY: number;
  baseScaleX: number;
  baseScaleY: number;
  baseScaleZ: number;
  phase: number;
};

type CloudCluster = {
  group: THREE.Group;
  puffs: CloudPuff[];
  speedX: number;
  speedZ: number;
  bobPhase: number;
  baseY: number;
  boundRadius: number;
};

type BirdVisual = {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftWingInner: THREE.Group;
  leftWingOuter: THREE.Group;
  rightWingInner: THREE.Group;
  rightWingOuter: THREE.Group;
  tail: THREE.Mesh;
  mode: 'patrol' | 'circle';
  // Para vuelo recto/ondulante ('patrol')
  startX: number;
  startZ: number;
  dirX: number;
  dirZ: number;
  speed: number;
  spanDistance: number;
  progress: number;
  baseY: number;
  waveAmp: number;
  waveFreq: number;
  // Para vuelo circular térmico ('circle')
  centerX: number;
  centerZ: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  // Ciclo de aleteo vs planeo
  flapFreq: number;
  flapPhase: number;
  glideCycleSpeed: number;
};

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

/** Textura equirectangular del cielo diurno argentino con gradiente cenit-horizonte y cirros suaves. */
function createSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Gradiente atmosférico desde el cenit azul profundo hasta el horizonte cálido
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0.00, '#1e5794');
  grad.addColorStop(0.18, '#3474b4');
  grad.addColorStop(0.36, '#5897cf');
  grad.addColorStop(0.47, '#8bc0e6');
  grad.addColorStop(0.51, '#c6e1f2');
  grad.addColorStop(0.55, '#e8e2d5');
  grad.addColorStop(1.00, '#d8cfc0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Venas sutiles de nubes altas (cirros) en la franja superior del cielo
  const rand = seeded(409);
  ctx.save();
  for(let i = 0; i < 55; i++) {
    const cx = rand() * canvas.width;
    const cy = (0.14 + rand() * 0.30) * canvas.height;
    const rx = 50 + rand() * 140;
    const ry = 4 + rand() * 14;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
    const alpha = 0.04 + rand() * 0.07;
    g.addColorStop(0, `rgba(255, 252, 245, ${alpha})`);
    g.addColorStop(0.6, `rgba(245, 250, 255, ${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, (rand() - 0.5) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Textura radial para el halo solar. */
function createSunGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0.00, 'rgba(255, 255, 245, 1.0)');
  g.addColorStop(0.14, 'rgba(255, 246, 210, 0.92)');
  g.addColorStop(0.35, 'rgba(255, 224, 155, 0.38)');
  g.addColorStop(0.68, 'rgba(255, 205, 130, 0.10)');
  g.addColorStop(1.00, 'rgba(255, 200, 120, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Geometría de mota de nube 3D con colores por vértice (blanco cálido arriba, gris azulado en la base). */
function createCloudPuffGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const topColor = new THREE.Color(0xffffff);
  const midColor = new THREE.Color(0xf4f7fa);
  const bottomColor = new THREE.Color(0xb6c8d9);
  const tmpColor = new THREE.Color();

  for(let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Base de cúmulo más chata abajo y abombada arriba
    if(y < 0) y *= 0.58;
    const ripple = 1 + 0.08 * Math.sin(x * 3.7 + z * 2.9) * Math.cos(y * 3.1);
    x *= ripple;
    z *= ripple;
    pos.setXYZ(i, x, y, z);

    const h = THREE.MathUtils.clamp((y + 0.58) / 1.58, 0, 1);
    if(h > 0.55) {
      tmpColor.copy(midColor).lerp(topColor, (h - 0.55) / 0.45);
    } else {
      tmpColor.copy(bottomColor).lerp(midColor, h / 0.55);
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Construye un pájaro 3D articulado con cuerpo, cabeza, pico, cola abanicada y alas de 2 segmentos. */
function buildBirdMesh(
  bodyColor: number,
  wingColor: number,
  breastColor: number,
  scale: number
): {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftWingInner: THREE.Group;
  leftWingOuter: THREE.Group;
  rightWingInner: THREE.Group;
  rightWingOuter: THREE.Group;
  tail: THREE.Mesh;
} {
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.78 });
  const wingMat = new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.74, side: THREE.DoubleSide });
  const breastMat = new THREE.MeshStandardMaterial({ color: breastColor, roughness: 0.80 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.5 });

  // Torso aerodinámico
  const torsoGeo = new THREE.SphereGeometry(0.11, 10, 8);
  torsoGeo.scale(0.78, 0.68, 1.75);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  bodyGroup.add(torso);

  // Pecho claro
  const breastGeo = new THREE.SphereGeometry(0.095, 8, 6);
  breastGeo.scale(0.72, 0.58, 1.35);
  const breast = new THREE.Mesh(breastGeo, breastMat);
  breast.position.set(0, -0.022, 0.04);
  bodyGroup.add(breast);

  // Cabeza y pico apuntando hacia +Z
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), bodyMat);
  head.position.set(0, 0.038, 0.19);
  bodyGroup.add(head);

  const beakGeo = new THREE.ConeGeometry(0.022, 0.075, 6);
  beakGeo.rotateX(Math.PI / 2);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.position.set(0, 0.032, 0.27);
  bodyGroup.add(beak);

  // Cola en abanico hacia -Z
  const tailGeo = new THREE.BufferGeometry();
  const tailVerts = new Float32Array([
    0, 0.01, -0.15,
    -0.095, 0.0, -0.34,
    0.095, 0.0, -0.34,
  ]);
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
  tailGeo.computeVertexNormals();
  const tail = new THREE.Mesh(tailGeo, wingMat);
  bodyGroup.add(tail);

  // Alas articuladas en 2 tramos (hombro -> codo -> punta de plumas primarias)
  const makeWing = (side: -1 | 1) => {
    const innerPivot = new THREE.Group();
    innerPivot.position.set(side * 0.065, 0.02, 0.03);

    const innerGeo = new THREE.BoxGeometry(0.24, 0.016, 0.16);
    innerGeo.translate(side * 0.12, 0, -0.01);
    const innerMesh = new THREE.Mesh(innerGeo, wingMat);
    innerMesh.rotation.y = side * -0.12;
    innerPivot.add(innerMesh);

    const outerPivot = new THREE.Group();
    outerPivot.position.set(side * 0.23, 0, -0.01);

    const outerGeo = new THREE.BufferGeometry();
    const s = side;
    const outerVerts = new Float32Array([
      0, 0, 0.07,
      0, 0, -0.08,
      s * 0.28, 0, -0.06,
      0, 0, 0.07,
      s * 0.28, 0, -0.06,
      s * 0.22, 0, 0.03,
    ]);
    outerGeo.setAttribute('position', new THREE.BufferAttribute(outerVerts, 3));
    outerGeo.computeVertexNormals();
    const outerMesh = new THREE.Mesh(outerGeo, wingMat);
    outerPivot.add(outerMesh);

    innerPivot.add(outerPivot);
    bodyGroup.add(innerPivot);
    return { innerPivot, outerPivot };
  };

  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);

  return {
    root,
    bodyGroup,
    leftWingInner: leftWing.innerPivot,
    leftWingOuter: leftWing.outerPivot,
    rightWingInner: rightWing.innerPivot,
    rightWingOuter: rightWing.outerPivot,
    tail,
  };
}

/**
 * Crea el cielo realista con domo atmosférico, sol con corona luminosa,
 * cúmulos volumétricos animados por la brisa y bandadas de pájaros con aleteo y planeo.
 */
export function createSky(scene: THREE.Scene) {
  const rand = seeded(777);
  const skyRoot = new THREE.Group();
  skyRoot.name = 'sky-system';
  scene.add(skyRoot);

  // 1. Domo celeste con gradiente cenit-horizonte
  const skyDomeGeo = new THREE.SphereGeometry(132, 36, 24);
  const skyDomeMat = new THREE.MeshBasicMaterial({
    map: createSkyDomeTexture(),
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
  skyRoot.add(skyDome);

  // 2. Disco solar y halo luminoso en la dirección de la luz principal (2, 9, 5)
  const sunDir = new THREE.Vector3(2, 9, 5).normalize();
  const sunPos = sunDir.clone().multiplyScalar(118);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffdf2, fog: false })
  );
  sunDisc.position.copy(sunPos);
  skyRoot.add(sunDisc);

  const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createSunGlowTexture(),
      color: 0xffe9ba,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  sunHalo.position.copy(sunPos);
  sunHalo.scale.set(34, 34, 1);
  skyRoot.add(sunHalo);

  // 3. Nubes volumétricas 3D en movimiento
  const puffGeo = createCloudPuffGeometry();
  const cloudMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    fog: true,
  });

  const clouds: CloudCluster[] = [];
  const cloudCount = 20;
  const boundRadius = 86;

  for(let c = 0; c < cloudCount; c++) {
    const group = new THREE.Group();
    const angle = (c / cloudCount) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const dist = 16 + rand() * 64;
    const baseY = 19 + rand() * 17;

    group.position.set(Math.cos(angle) * dist, baseY, Math.sin(angle) * dist);
    group.rotation.y = rand() * Math.PI * 2;

    const puffs: CloudPuff[] = [];
    const puffCount = 6 + Math.floor(rand() * 5);
    const cloudWidth = 3.6 + rand() * 4.5;

    for(let p = 0; p < puffCount; p++) {
      const mesh = new THREE.Mesh(puffGeo, cloudMat);
      const frac = puffCount > 1 ? p / (puffCount - 1) - 0.5 : 0;
      const px = frac * cloudWidth + (rand() - 0.5) * 1.4;
      const pz = (rand() - 0.5) * (cloudWidth * 0.52);
      // Los cúmulos son más altos en el centro y más bajos en los bordes
      const centerWeight = 1 - Math.min(1, Math.abs(frac) * 1.45);
      const py = centerWeight * (0.9 + rand() * 0.9);

      const sx = (1.5 + rand() * 1.5) * (0.75 + centerWeight * 0.45);
      const sy = (1.0 + rand() * 0.95) * (0.70 + centerWeight * 0.50);
      const sz = (1.4 + rand() * 1.3) * (0.75 + centerWeight * 0.40);

      mesh.position.set(px, py, pz);
      mesh.scale.set(sx, sy, sz);
      mesh.rotation.y = rand() * Math.PI * 2;
      group.add(mesh);

      puffs.push({
        mesh,
        baseY: py,
        baseScaleX: sx,
        baseScaleY: sy,
        baseScaleZ: sz,
        phase: rand() * Math.PI * 2,
      });
    }

    skyRoot.add(group);
    const speedScale = 0.48 + (baseY - 19) * 0.018 + rand() * 0.24;
    clouds.push({
      group,
      puffs,
      speedX: speedScale * 0.92,
      speedZ: speedScale * 0.34,
      bobPhase: rand() * Math.PI * 2,
      baseY,
      boundRadius,
    });
  }

  // 4. Bandadas y pájaros 3D animados (horneros, torcazas, golondrinas y aves planeando alto)
  const birds: BirdVisual[] = [];

  // Paletas de aves típicas argentinas:
  // - Hornero / gorrión (pardo rojizo y pecho claro)
  // - Torcaza / paloma (gris azulado y pecho rosado suave)
  // - Golondrina (azul pizarra oscuro y pecho blanco)
  const palettes: readonly [number, number, number][] = [
    [0x6e4a35, 0x593a28, 0xd8c3a5],
    [0x6b737d, 0x525962, 0xc8bfc4],
    [0x2f3b4c, 0x232d3b, 0xedeff2],
  ];

  // A) 4 bandadas cruzando el cielo sobre el patio y los techos vecinos a distintas alturas y direcciones
  const flockConfigs = [
    { count: 4, startX: -32, startZ: -16, dirX: 0.94, dirZ: 0.34, baseY: 9.6, speed: 3.4, span: 64, paletteIdx: 1 },
    { count: 3, startX: 30, startZ: -20, dirX: -0.91, dirZ: 0.41, baseY: 12.4, speed: 3.9, span: 62, paletteIdx: 2 },
    { count: 3, startX: -28, startZ: -4, dirX: 0.89, dirZ: -0.45, baseY: 8.6, speed: 3.1, span: 58, paletteIdx: 0 },
    { count: 4, startX: 26, startZ: -26, dirX: -0.80, dirZ: 0.60, baseY: 15.2, speed: 3.7, span: 66, paletteIdx: 1 },
  ];

  for(const [fIdx, cfg] of flockConfigs.entries()) {
    const [bodyCol, wingCol, breastCol] = palettes[cfg.paletteIdx];
    // Vector perpendicular para formación en V abierta
    const perpX = -cfg.dirZ;
    const perpZ = cfg.dirX;

    for(let b = 0; b < cfg.count; b++) {
      const built = buildBirdMesh(bodyCol, wingCol, breastCol, 0.88 + (b % 2) * 0.10);
      const wingSlot = b === 0 ? 0 : (b % 2 === 1 ? 1 : -1) * Math.ceil(b / 2);
      const offsetBack = Math.abs(wingSlot) * 1.35;
      const offsetSide = wingSlot * 1.45;

      const sx = cfg.startX - cfg.dirX * offsetBack + perpX * offsetSide;
      const sz = cfg.startZ - cfg.dirZ * offsetBack + perpZ * offsetSide;

      skyRoot.add(built.root);
      birds.push({
        ...built,
        mode: 'patrol',
        startX: sx,
        startZ: sz,
        dirX: cfg.dirX,
        dirZ: cfg.dirZ,
        speed: cfg.speed,
        spanDistance: cfg.span,
        progress: (fIdx * 23 + b * 3.2) % cfg.span,
        baseY: cfg.baseY + (b % 2) * 0.45,
        waveAmp: 0.28 + (b % 3) * 0.08,
        waveFreq: 0.9 + fIdx * 0.2,
        centerX: 0,
        centerZ: 0,
        orbitRadius: 0,
        orbitSpeed: 0,
        orbitAngle: 0,
        flapFreq: 11.5 + (b % 3) * 1.1,
        flapPhase: b * 1.3 + fIdx * 2.1,
        glideCycleSpeed: 1.15 + (b % 2) * 0.2,
      });
    }
  }

  // B) 2 aves planeando en círculos térmicos altos cerca de las nubes
  const circlingConfigs = [
    { cx: -6, cz: -14, radius: 16, y: 23.5, speed: 0.24, angle0: 0.4, scale: 1.25 },
    { cx: 8, cz: -8, radius: 21, y: 26.8, speed: -0.19, angle0: 2.6, scale: 1.32 },
  ];

  for(const [cIdx, cfg] of circlingConfigs.entries()) {
    const built = buildBirdMesh(0x4b382a, 0x38281d, 0xcab49b, cfg.scale);
    skyRoot.add(built.root);
    birds.push({
      ...built,
      mode: 'circle',
      startX: 0,
      startZ: 0,
      dirX: 0,
      dirZ: 0,
      speed: 0,
      spanDistance: 0,
      progress: 0,
      baseY: cfg.y,
      waveAmp: 0.55,
      waveFreq: 0.45,
      centerX: cfg.cx,
      centerZ: cfg.cz,
      orbitRadius: cfg.radius,
      orbitSpeed: cfg.speed,
      orbitAngle: cfg.angle0,
      flapFreq: 7.8,
      flapPhase: cIdx * 2.4,
      glideCycleSpeed: 0.55,
    });
  }

  let lastTime = 0;

  return {
    update(elapsedReal: number): void {
      const dt = lastTime > 0 ? Math.min(0.1, Math.max(0, elapsedReal - lastTime)) : 0.016;
      lastTime = elapsedReal;

      // Sutil pulso del halo solar
      const haloPulse = 34 + Math.sin(elapsedReal * 0.8) * 1.1;
      sunHalo.scale.set(haloPulse, haloPulse, 1);

      // 1. Actualizar deriva y respiración suave de las nubes 3D
      for(const cloud of clouds) {
        cloud.group.position.x += cloud.speedX * dt;
        cloud.group.position.z += cloud.speedZ * dt;
        cloud.group.position.y = cloud.baseY + Math.sin(elapsedReal * 0.35 + cloud.bobPhase) * 0.22;

        // Envolver suavemente cuando cruzan el horizonte lejano
        if(cloud.group.position.x > cloud.boundRadius) cloud.group.position.x -= cloud.boundRadius * 2;
        if(cloud.group.position.x < -cloud.boundRadius) cloud.group.position.x += cloud.boundRadius * 2;
        if(cloud.group.position.z > cloud.boundRadius) cloud.group.position.z -= cloud.boundRadius * 2;
        if(cloud.group.position.z < -cloud.boundRadius) cloud.group.position.z += cloud.boundRadius * 2;

        for(const puff of cloud.puffs) {
          const breathe = Math.sin(elapsedReal * 0.65 + puff.phase);
          puff.mesh.position.y = puff.baseY + breathe * 0.08;
          puff.mesh.scale.set(
            puff.baseScaleX * (1 + breathe * 0.025),
            puff.baseScaleY * (1 - breathe * 0.020),
            puff.baseScaleZ * (1 + breathe * 0.025)
          );
        }
      }

      // 2. Actualizar trayectoria, inclinación (banking) y aleteo/planeo de cada pájaro
      for(const bird of birds) {
        if(bird.mode === 'patrol') {
          bird.progress = (bird.progress + bird.speed * dt) % bird.spanDistance;
          const lateralSway = Math.sin(elapsedReal * bird.waveFreq + bird.flapPhase) * 1.25;
          const perpX = -bird.dirZ;
          const perpZ = bird.dirX;

          const x = bird.startX + bird.dirX * bird.progress + perpX * lateralSway;
          const z = bird.startZ + bird.dirZ * bird.progress + perpZ * lateralSway;
          const y = bird.baseY + Math.sin(elapsedReal * (bird.waveFreq * 1.4) + bird.flapPhase) * bird.waveAmp;

          bird.root.position.set(x, y, z);

          // Orientación hacia la dirección de avance + leve guiñada por la ondulación lateral
          const swayDeriv = Math.cos(elapsedReal * bird.waveFreq + bird.flapPhase) * bird.waveFreq * 0.16;
          bird.root.rotation.y = Math.atan2(bird.dirX + perpX * swayDeriv, bird.dirZ + perpZ * swayDeriv);
          bird.bodyGroup.rotation.z = -swayDeriv * 0.65;
        } else {
          // Vuelo circular en térmica alta
          const angle = bird.orbitAngle + elapsedReal * bird.orbitSpeed;
          const x = bird.centerX + Math.cos(angle) * bird.orbitRadius;
          const z = bird.centerZ + Math.sin(angle) * bird.orbitRadius;
          const y = bird.baseY + Math.sin(elapsedReal * bird.waveFreq + bird.flapPhase) * bird.waveAmp;

          bird.root.position.set(x, y, z);
          const dirSign = bird.orbitSpeed >= 0 ? 1 : -1;
          const tx = -Math.sin(angle) * dirSign;
          const tz = Math.cos(angle) * dirSign;
          bird.root.rotation.y = Math.atan2(tx, tz);
          // Inclinación lateral (alabeo) al girar en círculo
          bird.bodyGroup.rotation.z = dirSign * 0.26;
        }

        // Alternancia natural entre ráfagas de aleteo activo y planeo con alas extendidas
        const glideSignal = Math.sin(elapsedReal * bird.glideCycleSpeed + bird.flapPhase);
        const isGliding = bird.mode === 'circle' ? glideSignal > -0.35 : glideSignal > 0.38;

        if(isGliding) {
          // Planeo: alas abiertas en leve diedro positivo y micro-ajuste con la brisa
          const breeze = Math.sin(elapsedReal * 3.2 + bird.flapPhase) * 0.05;
          bird.leftWingInner.rotation.z = -0.10 + breeze;
          bird.leftWingOuter.rotation.z = -0.08 + breeze * 0.8;
          bird.rightWingInner.rotation.z = 0.10 - breeze;
          bird.rightWingOuter.rotation.z = 0.08 - breeze * 0.8;
          bird.bodyGroup.position.y = breeze * 0.03;
          bird.tail.rotation.x = 0.06;
        } else {
          // Aleteo articulado en dos segmentos (hombro + extremo primario con desfase)
          const phase = elapsedReal * bird.flapFreq + bird.flapPhase;
          const innerStroke = Math.sin(phase);
          const outerStroke = Math.sin(phase - 0.55);

          bird.leftWingInner.rotation.z = innerStroke * 0.62;
          bird.leftWingOuter.rotation.z = outerStroke * 0.48 - (innerStroke < 0 ? 0.18 : 0);
          bird.rightWingInner.rotation.z = -innerStroke * 0.62;
          bird.rightWingOuter.rotation.z = -outerStroke * 0.48 + (innerStroke < 0 ? 0.18 : 0);

          // Pequeño contramovimiento vertical del cuerpo al batir las alas
          bird.bodyGroup.position.y = -innerStroke * 0.024;
          bird.tail.rotation.x = 0.10 + innerStroke * 0.08;
        }
      }
    },
  };
}
