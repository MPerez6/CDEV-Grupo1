import * as THREE from 'three';
import { MEAT_CATALOG } from '../sim/meatCatalog.ts';
import {
  type ClientActor,
  type ClientManager,
  donenessShortLabel,
  estimateOrderTip,
} from './client-brain.ts';

type ClientVisual = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  skinMat: THREE.MeshStandardMaterial;
  baseSkinColor: THREE.Color;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  mouth: THREE.Mesh;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  utensils: THREE.Group[];
  angerSymbol: THREE.Group;
  leftThigh: THREE.Group;
  rightThigh: THREE.Group;
  leftCalf: THREE.Group;
  rightCalf: THREE.Group;
  hitbox: THREE.Mesh;
  badge: THREE.Sprite;
  badgeCanvas: HTMLCanvasElement;
  badgeTexture: THREE.CanvasTexture;
  lastBadgeKey: string;
};

function drawBadge(
  canvas: HTMLCanvasElement,
  actor: ClientActor
): void {
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const isAngry = actor.isAngry;
  const isComplaint = actor.reactionKind === 'queja-punto';
  const isLowPatience = actor.state === 'esperando' && actor.patienceRatio < 0.25;

  // Fondo y borde según estado emocional
  if(isAngry || isLowPatience) {
    ctx.fillStyle = 'rgba(48, 12, 12, 0.94)';
    ctx.strokeStyle = '#ff4d4d';
  } else if(isComplaint) {
    ctx.fillStyle = 'rgba(46, 28, 10, 0.93)';
    ctx.strokeStyle = '#f59e0b';
  } else if(actor.state === 'comiendo') {
    ctx.fillStyle = 'rgba(18, 34, 18, 0.92)';
    ctx.strokeStyle = '#8fcf6a';
  } else {
    ctx.fillStyle = 'rgba(22, 18, 15, 0.90)';
    ctx.strokeStyle = 'rgba(255, 225, 185, 0.42)';
  }

  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, 22);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f3d9b7';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(actor.profile.name, w / 2, 36);

  // 1. Cliente enojado (por corte equivocado, crudo, quemado o espera agotada)
  if(isAngry) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(actor.reactionTitle ?? '😡 ¡ENOJADO!', w / 2, 72);

    ctx.fillStyle = '#ffd6d6';
    ctx.font = 'bold 18px system-ui, sans-serif';
    if(actor.reactionKind === 'enojo-corte' && actor.servedKindName) {
      ctx.fillText(`Trajiste ${actor.servedKindName}`, w / 2, 99);
    } else if(actor.reactionKind === 'enojo-crudo') {
      ctx.fillText('¡Rechaza el plato!', w / 2, 99);
    } else if(actor.reactionKind === 'enojo-quemado') {
      ctx.fillText('¡Rechaza el plato quemado!', w / 2, 99);
    } else {
      ctx.fillText('¡Se retira indignado!', w / 2, 99);
    }

    const ptsStr = `${actor.lastScoreDelta} pts · Sin propina ($0)`;
    ctx.fillStyle = '#ff9999';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(ptsStr, w / 2, 125);
    return;
  }

  // 2. Cliente quejándose por el punto de cocción (regular)
  if(actor.state === 'comiendo' && isComplaint) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 23px system-ui, sans-serif';
    ctx.fillText(actor.reactionTitle ?? '😒 Punto errado', w / 2, 70);
    ctx.fillStyle = '#fde68a';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(
      actor.reactionTimerSeconds > 0 ? 'Reclamando por la cocción...' : 'Comiendo a desgano',
      w / 2,
      97
    );
    const sign = actor.lastScoreDelta >= 0 ? `+${actor.lastScoreDelta}` : `${actor.lastScoreDelta}`;
    const tipPart = actor.lastTipPesos > 0 ? `Propina +$${actor.lastTipPesos.toLocaleString('es-AR')}` : 'Sin propina ($0)';
    ctx.fillStyle = actor.lastScoreDelta >= 0 ? '#fcd34d' : '#fca5a5';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`${sign} pts · ${tipPart}`, w / 2, 124);
    return;
  }

  // 3. Cliente comiendo contento (excelente / bueno)
  if(actor.state === 'comiendo') {
    ctx.fillStyle = '#8fcf6a';
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText(actor.reactionTitle ?? '😋 ¡Comiendo!', w / 2, 70);
    ctx.fillStyle = '#d8cbb8';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(MEAT_CATALOG[actor.order.kind].name, w / 2, 97);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`+${actor.lastScoreDelta} pts · +$${actor.lastTipPesos.toLocaleString('es-AR')}`, w / 2, 124);
    return;
  }

  // 4. Cliente esperando su pedido
  const cutName = MEAT_CATALOG[actor.order.kind].name;
  const pointLabel = donenessShortLabel(actor.order.doneness, actor.order.kind);
  const potentialTip = estimateOrderTip(actor.order.kind, actor.patienceRatio);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.fillText(cutName, w / 2, 68);

  ctx.fillStyle = isLowPatience ? '#ff6b6b' : '#e9a56d';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(
    isLowPatience ? `💢 ¡Apurate! · ${pointLabel}` : `${pointLabel} · +$${potentialTip.toLocaleString('es-AR')}`,
    w / 2,
    95
  );

  const ratio = actor.patienceRatio;
  const barX = 28, barY = 114, barW = w - 56, barH = 11;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = ratio > 0.5 ? '#8fcf6a' : ratio > 0.25 ? '#e6b84c' : '#ff4d4d';
  ctx.fillRect(barX, barY, Math.max(4, barW * ratio), barH);
}

function buildClientVisual(actor: ClientActor, clickable: THREE.Object3D[]): ClientVisual {
  const { profile } = actor;
  const std = (color: number, roughness = 0.82, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const baseSkinColor = new THREE.Color(profile.skinColor);
  const skinMat = std(profile.skinColor, 0.68);
  const lipMat = std(new THREE.Color(profile.skinColor).lerp(new THREE.Color(0xa83838), 0.45).getHex(), 0.6);
  const shirtMat = std(profile.shirtColor, 0.84);
  const jacketMat = profile.jacketColor ? std(profile.jacketColor, 0.88) : null;
  const pantsMat = std(profile.pantsColor, 0.88);
  const hairMat = std(profile.hairColor, 0.86);
  const darkMat = std(0x1b1815, 0.45);
  const whiteMat = std(0xfaf8f5, 0.3);
  const leatherMat = std(0x3a2618, 0.65);
  const metalMat = std(0xd8dada, 0.25, 0.9);

  const root = new THREE.Group();
  root.name = `client-${actor.id}`;
  const body = new THREE.Group();
  root.add(body);

  const part = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    scale?: [number, number, number]
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if(scale) m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // 1. Torso anatómico con pecho, hombros, cuello de camisa, cinturón y saco/chaleco opcional
  const chestW = profile.gender === 'f' ? 0.94 : 1.05;
  part(body, new THREE.CylinderGeometry(0.145 * chestW, 0.125, 0.36, 16), shirtMat, [0, 0.25, 0], [1.12, 1, 0.78]);
  part(body, new THREE.SphereGeometry(0.145 * chestW, 14, 10), shirtMat, [0, 0.41, 0], [1.15, 0.48, 0.78]);
  part(body, new THREE.CylinderGeometry(0.068, 0.078, 0.045, 12), shirtMat, [0, 0.46, 0.005]);

  if(jacketMat) {
    for(const s of [-1, 1]) {
      part(body, new THREE.BoxGeometry(0.11, 0.37, 0.22), jacketMat, [s * 0.095, 0.25, 0.005]);
    }
    part(body, new THREE.BoxGeometry(0.29, 0.38, 0.11), jacketMat, [0, 0.25, -0.055]);
  }

  // Cinturón con hebilla metálica y cadera/pelvis
  part(body, new THREE.CylinderGeometry(0.128, 0.130, 0.038, 16), leatherMat, [0, 0.065, 0], [1.1, 1, 0.8]);
  part(body, new THREE.BoxGeometry(0.045, 0.042, 0.02), metalMat, [0, 0.065, 0.102]);
  part(body, new THREE.SphereGeometry(0.132, 14, 10), pantsMat, [0, 0.02, 0], [1.08, 0.65, 0.82]);

  // 2. Cuello y cabeza esculpida con rasgos faciales expresivos
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0.01);
  body.add(head);

  part(head, new THREE.CylinderGeometry(0.052, 0.058, 0.09, 12), skinMat, [0, -0.03, -0.005]);
  part(head, new THREE.SphereGeometry(0.112, 18, 14), skinMat, [0, 0.085, 0], [0.94, 1.08, 0.98]);
  part(head, new THREE.SphereGeometry(0.088, 14, 10), skinMat, [0, 0.035, 0.022], [0.88, 0.78, 0.92]);

  for(const s of [-1, 1]) {
    part(head, new THREE.SphereGeometry(0.024, 8, 8), skinMat, [s * 0.104, 0.078, -0.005], [0.45, 1.0, 0.7]);
  }

  const brows: THREE.Mesh[] = [];
  for(const s of [-1, 1]) {
    part(head, new THREE.SphereGeometry(0.018, 10, 8), whiteMat, [s * 0.038, 0.092, 0.096], [1.0, 0.78, 0.55]);
    part(head, new THREE.SphereGeometry(0.0095, 8, 8), darkMat, [s * 0.038, 0.092, 0.105]);
    const brow = part(head, new THREE.BoxGeometry(0.034, 0.008, 0.014), hairMat, [s * 0.039, 0.114, 0.099]);
    brows.push(brow);
  }

  const noseBridge = part(head, new THREE.ConeGeometry(0.016, 0.042, 8), skinMat, [0, 0.076, 0.108], [0.85, 1, 1.1]);
  noseBridge.rotation.x = Math.PI * 0.38;
  part(head, new THREE.SphereGeometry(0.013, 8, 8), skinMat, [0, 0.064, 0.118]);

  const mouth = part(head, new THREE.BoxGeometry(0.036, 0.009, 0.012), lipMat, [0, 0.036, 0.102]);
  if(profile.facialHair === 'mustache') {
    const mLeft = part(head, new THREE.CapsuleGeometry(0.008, 0.022, 4, 6), hairMat, [-0.014, 0.047, 0.106]);
    mLeft.rotation.z = Math.PI / 2.3;
    const mRight = part(head, new THREE.CapsuleGeometry(0.008, 0.022, 4, 6), hairMat, [0.014, 0.047, 0.106]);
    mRight.rotation.z = -Math.PI / 2.3;
  } else if(profile.facialHair === 'beard') {
    part(head, new THREE.SphereGeometry(0.089, 12, 10), hairMat, [0, 0.028, 0.024], [0.90, 0.68, 0.94]);
  }

  part(head, new THREE.SphereGeometry(0.116, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat, [0, 0.095, -0.006]).rotation.x = -0.22;
  if(profile.gender === 'f') {
    for(const s of [-1, 1]) {
      part(head, new THREE.CapsuleGeometry(0.032, 0.11, 4, 8), hairMat, [s * 0.092, 0.04, -0.015]);
    }
    part(head, new THREE.SphereGeometry(0.055, 10, 8), hairMat, [0, 0.055, -0.105]);
  }

  if(profile.hat === 'boina') {
    const beret = part(head, new THREE.CylinderGeometry(0.132, 0.108, 0.036, 16), std(0x282624, 0.9), [0.012, 0.186, 0.005]);
    beret.rotation.z = -0.14;
    part(head, new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6), std(0x282624, 0.9), [0.012, 0.21, 0.005]);
  } else if(profile.hat === 'gorra') {
    part(head, new THREE.SphereGeometry(0.119, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), std(0x263b52, 0.8), [0, 0.108, 0]);
    const visor = part(head, new THREE.BoxGeometry(0.135, 0.012, 0.095), std(0x263b52, 0.8), [0, 0.126, 0.108]);
    visor.rotation.x = 0.14;
  }

  // Símbolo 3D de furia/humo rojo sobre la cabeza cuando se enoja
  const angerSymbol = new THREE.Group();
  angerSymbol.position.set(0, 0.28, 0);
  const angerMat = new THREE.MeshStandardMaterial({
    color: 0xff2e2e,
    emissive: 0xcc1111,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
  for(const sx of [-1, 1]) {
    const bolt = part(angerSymbol, new THREE.ConeGeometry(0.018, 0.075, 5), angerMat, [sx * 0.09, 0.02, 0.04]);
    bolt.rotation.z = sx * -0.45;
  }
  part(angerSymbol, new THREE.CylinderGeometry(0.014, 0.008, 0.065, 8), angerMat, [0, 0.04, 0.05]);
  part(angerSymbol, new THREE.SphereGeometry(0.012, 8, 8), angerMat, [0, -0.01, 0.05]);
  angerSymbol.visible = false;
  head.add(angerSymbol);

  // 3. Brazos con hombro, codo, antebrazo, mano esculpida y cubiertos
  const utensils: THREE.Group[] = [];
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * (0.168 * chestW), 0.39, 0);
    const sleeveMat = jacketMat ?? shirtMat;
    part(shoulder, new THREE.SphereGeometry(0.046, 10, 8), sleeveMat, [0, 0, 0]);
    part(shoulder, new THREE.CylinderGeometry(0.042, 0.036, 0.21, 10), sleeveMat, [0, -0.11, 0]);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.22, 0);
    part(elbow, new THREE.SphereGeometry(0.035, 8, 8), skinMat, [0, 0, 0]);
    part(elbow, new THREE.CylinderGeometry(0.034, 0.027, 0.19, 10), skinMat, [0, -0.10, 0]);

    const hand = new THREE.Group();
    hand.position.set(0, -0.21, 0);
    part(hand, new THREE.BoxGeometry(0.032, 0.058, 0.048), skinMat, [0, -0.02, 0]);
    part(hand, new THREE.CapsuleGeometry(0.009, 0.022, 4, 6), skinMat, [0, -0.01, 0.028]).rotation.x = 0.5;

    const toolGroup = new THREE.Group();
    toolGroup.position.set(0, -0.03, 0.03);
    toolGroup.rotation.x = Math.PI / 2;
    part(toolGroup, new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6), leatherMat, [0, -0.02, 0]);
    if(side === -1) {
      part(toolGroup, new THREE.BoxGeometry(0.018, 0.05, 0.003), metalMat, [0, 0.04, 0]);
    } else {
      part(toolGroup, new THREE.BoxGeometry(0.004, 0.065, 0.014), metalMat, [0, 0.045, 0]);
    }
    toolGroup.visible = false;
    hand.add(toolGroup);
    utensils.push(toolGroup);

    elbow.add(hand);
    shoulder.add(elbow);
    body.add(shoulder);
    return { shoulder, elbow };
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // 4. Piernas con muslo, rodilla, pantorrilla y zapato
  const makeLeg = (side: -1 | 1) => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.078, -0.01, 0);
    part(thigh, new THREE.CylinderGeometry(0.060, 0.048, 0.30, 12), pantsMat, [0, -0.15, 0]);
    part(thigh, new THREE.SphereGeometry(0.049, 10, 8), pantsMat, [0, -0.30, 0]);

    const calf = new THREE.Group();
    calf.position.set(0, -0.30, 0);
    part(calf, new THREE.CylinderGeometry(0.046, 0.036, 0.29, 12), pantsMat, [0, -0.145, 0]);

    part(calf, new THREE.BoxGeometry(0.082, 0.048, 0.165), leatherMat, [0, -0.305, 0.032]);
    part(calf, new THREE.SphereGeometry(0.041, 10, 8), leatherMat, [0, -0.302, 0.095], [1, 0.58, 1.1]);
    part(calf, new THREE.BoxGeometry(0.086, 0.014, 0.175), darkMat, [0, -0.328, 0.034]);

    thigh.add(calf);
    body.add(thigh);
    return { thigh, calf };
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 1.45, 0.54),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.set(0, 0.72, 0);
  hitbox.userData.kind = 'client';
  hitbox.userData.index = actor.seatIndex;
  root.add(hitbox);
  clickable.push(hitbox);

  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 340;
  badgeCanvas.height = 148;
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace = THREE.SRGBColorSpace;
  const badgeMat = new THREE.SpriteMaterial({ map: badgeTexture, transparent: true, depthTest: true });
  const badge = new THREE.Sprite(badgeMat);
  badge.scale.set(0.94, 0.42, 1);
  badge.position.set(0, 1.56, 0);
  root.add(badge);

  return {
    root,
    body,
    head,
    skinMat,
    baseSkinColor,
    leftBrow: brows[0],
    rightBrow: brows[1],
    mouth,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    utensils,
    angerSymbol,
    leftThigh: leftLeg.thigh,
    rightThigh: rightLeg.thigh,
    leftCalf: leftLeg.calf,
    rightCalf: rightLeg.calf,
    hitbox,
    badge,
    badgeCanvas,
    badgeTexture,
    lastBadgeKey: '',
  };
}

/** Aplica uno de los 5 gestos corporales de enojo/reclamo cuando el cliente recibe algo incorrecto. */
function applyAngerSeatedPose(vis: ClientVisual, actor: ClientActor, elapsedReal: number): void {
  const t = elapsedReal * 7.5 + actor.id;
  const wave = Math.sin(t);
  const fastWave = Math.sin(t * 1.6);

  switch(actor.angerGesture) {
    case 'golpe-mesa': {
      // Inclinado hacia adelante golpeando el puño derecho contra la mesa
      const slam = Math.abs(Math.sin(t * 1.1));
      vis.body.rotation.set(0.22 + slam * 0.05, wave * 0.04, 0);
      vis.leftShoulder.rotation.set(-0.62, 0.18, 0.10);
      vis.leftElbow.rotation.set(-0.92, 0, 0);
      vis.rightShoulder.rotation.set(-1.35 + slam * 0.78, -0.12, -0.10);
      vis.rightElbow.rotation.set(-0.65 - slam * 0.25, 0, 0);
      vis.head.rotation.set(0.12, fastWave * 0.28, 0);
      break;
    }
    case 'brazos-cruzados': {
      // Se tira hacia atrás en la silla con los brazos cruzados e indignado mirando hacia un costado
      vis.body.rotation.set(-0.14, 0.12, 0);
      vis.leftShoulder.rotation.set(-0.75, -0.58, -0.35);
      vis.rightShoulder.rotation.set(-0.75, 0.58, 0.35);
      vis.leftElbow.rotation.set(-1.45, 0, 0);
      vis.rightElbow.rotation.set(-1.45, 0, 0);
      vis.head.rotation.set(-0.06, 0.55 + wave * 0.08, 0.05);
      break;
    }
    case 'rechazo-plato': {
      // Se echa hacia atrás empujando/rechazando el plato con una mano y abanicando con la otra
      vis.body.rotation.set(-0.12, wave * 0.06, 0);
      vis.leftShoulder.rotation.set(-1.15, 0.15, 0.12);
      vis.leftElbow.rotation.set(-0.25, 0, 0);
      vis.rightShoulder.rotation.set(-1.28, -0.22, -0.25 + fastWave * 0.32);
      vis.rightElbow.rotation.set(-1.15, 0, 0);
      vis.head.rotation.set(-0.08, fastWave * 0.36, 0);
      break;
    }
    case 'manos-cabeza': {
      // Se agarra la cabeza con ambas manos sin poder creer lo que le trajeron
      vis.body.rotation.set(0.05, wave * 0.10, wave * 0.05);
      vis.leftShoulder.rotation.set(-1.55, 0.32, 0.58);
      vis.rightShoulder.rotation.set(-1.55, -0.32, -0.58);
      vis.leftElbow.rotation.set(-1.82, 0, 0);
      vis.rightElbow.rotation.set(-1.82, 0, 0);
      vis.head.rotation.set(0.08, fastWave * 0.34, 0);
      break;
    }
    case 'brazos-abiertos':
    default: {
      // Abre ambos brazos a los costados reclamando ("¡¿Qué me trajiste?!")
      vis.body.rotation.set(-0.05 + Math.abs(wave) * 0.06, wave * 0.08, 0);
      vis.leftShoulder.rotation.set(-0.85 + wave * 0.22, 0.35, 0.62);
      vis.rightShoulder.rotation.set(-0.85 - wave * 0.22, -0.35, -0.62);
      vis.leftElbow.rotation.set(-0.68, 0, 0);
      vis.rightElbow.rotation.set(-0.68, 0, 0);
      vis.head.rotation.set(-0.04, fastWave * 0.38, wave * 0.06);
      break;
    }
  }
}

export function createClientViews(scene: THREE.Scene, clickable: THREE.Object3D[]) {
  const visuals = new Map<number, ClientVisual>();
  const angryFlushColor = new THREE.Color(0xd9483b);

  return {
    update(manager: ClientManager, elapsedReal: number): void {
      const activeIds = new Set(manager.clients.map(c => c.id));

      for(const [id, vis] of visuals) {
        if(!activeIds.has(id)) {
          scene.remove(vis.root);
          const idx = clickable.indexOf(vis.hitbox);
          if(idx >= 0) clickable.splice(idx, 1);
          vis.badgeTexture.dispose();
          visuals.delete(id);
        }
      }

      for(const actor of manager.clients) {
        let vis = visuals.get(actor.id);
        if(!vis) {
          vis = buildClientVisual(actor, clickable);
          visuals.set(actor.id, vis);
          scene.add(vis.root);
        }

        vis.root.position.set(actor.pos.x, 0, actor.pos.z);
        vis.root.rotation.y = actor.yaw;

        const isAngry = actor.isAngry;
        const isComplainingPoint = actor.state === 'comiendo' && actor.reactionKind === 'queja-punto' && actor.reactionTimerSeconds > 0;
        const isImpatient = actor.state === 'esperando' && actor.patienceRatio < 0.35;

        // Los cubiertos solo se usan cuando realmente come (no cuando rechaza el plato furioso ni mientras reclama)
        const showUtensils = actor.state === 'comiendo' && !isAngry && !isComplainingPoint;
        for(const u of vis.utensils) u.visible = showUtensils;

        // Rubor facial de enojo, cejas fruncidas, boca abierta de reclamo y símbolo 3D de furia
        const angerIntensity = isAngry ? 0.38 : isComplainingPoint || isImpatient ? 0.18 : 0;
        vis.skinMat.color.copy(vis.baseSkinColor).lerp(angryFlushColor, angerIntensity);

        const browAngle = isAngry ? 0.42 : isComplainingPoint || isImpatient ? 0.28 : actor.reactionKind === 'feliz' ? -0.10 : 0;
        vis.leftBrow.rotation.z = -browAngle;
        vis.rightBrow.rotation.z = browAngle;
        vis.leftBrow.position.y = 0.114 - (browAngle > 0 ? 0.006 : -0.003);
        vis.rightBrow.position.y = 0.114 - (browAngle > 0 ? 0.006 : -0.003);

        const shouting = isAngry || isComplainingPoint || (actor.state === 'esperando' && actor.patienceRatio < 0.20);
        vis.mouth.scale.set(
          shouting ? 1.25 : 1.0,
          shouting ? 2.4 + Math.abs(Math.sin(elapsedReal * 10 + actor.id)) * 1.2 : 1.0,
          1.0
        );

        vis.angerSymbol.visible = isAngry || isComplainingPoint;
        if(vis.angerSymbol.visible) {
          const pulse = 1 + Math.sin(elapsedReal * 14 + actor.id) * 0.18;
          vis.angerSymbol.scale.setScalar(pulse);
          vis.angerSymbol.rotation.y = Math.sin(elapsedReal * 8) * 0.25;
        }

        if(actor.state === 'entrando' || actor.state === 'saliendo') {
          const speedFreq = actor.state === 'saliendo' && isAngry ? 10.2 : 7.2;
          const walkCycle = elapsedReal * speedFreq + actor.id * 1.7;
          const swing = Math.sin(walkCycle) * (isAngry ? 0.68 : 0.52);
          vis.body.position.set(0, 0.64 + Math.abs(Math.cos(walkCycle)) * 0.03, 0);
          vis.body.rotation.set(isAngry ? 0.10 : 0.04, Math.sin(walkCycle) * 0.06, 0);

          vis.leftThigh.rotation.x = swing;
          vis.rightThigh.rotation.x = -swing;
          vis.leftCalf.rotation.x = Math.max(0.05, -swing * 0.78);
          vis.rightCalf.rotation.x = Math.max(0.05, swing * 0.78);

          if(actor.state === 'saliendo' && isAngry) {
            // Se va caminando furioso agitando un brazo y negando con la cabeza
            vis.leftShoulder.rotation.set(-swing * 0.75, 0, 0.12);
            vis.rightShoulder.rotation.set(-1.35 + Math.sin(walkCycle * 1.3) * 0.35, 0, -0.22);
            vis.leftElbow.rotation.set(-0.55, 0, 0);
            vis.rightElbow.rotation.set(-0.85, 0, 0);
            vis.head.rotation.set(0, Math.sin(walkCycle * 1.2) * 0.32, 0);
            vis.badge.visible = true;
          } else {
            vis.leftShoulder.rotation.set(-swing * 0.65, 0, 0.05);
            vis.rightShoulder.rotation.set(swing * 0.65, 0, -0.05);
            vis.leftElbow.rotation.set(-0.35 - Math.max(0, -swing * 0.35), 0, 0);
            vis.rightElbow.rotation.set(-0.35 - Math.max(0, swing * 0.35), 0, 0);
            vis.head.rotation.set(0, Math.sin(walkCycle * 0.5) * 0.08, 0);
            vis.badge.visible = false;
          }
        } else {
          // Sentado en una de las mesitas del restaurante
          vis.body.position.set(0, 0.44, 0.02);
          vis.leftThigh.rotation.x = -Math.PI / 2 + 0.08;
          vis.rightThigh.rotation.x = -Math.PI / 2 + 0.08;
          vis.leftCalf.rotation.x = Math.PI / 2 - 0.08;
          vis.rightCalf.rotation.x = Math.PI / 2 - 0.08;

          if(actor.state === 'esperando') {
            const idleWave = Math.sin(elapsedReal * 2.1 + actor.id);
            if(actor.patienceRatio < 0.20) {
              // Muy impaciente: levanta y agita la mano llamando al parrillero
              const callWave = Math.sin(elapsedReal * 9.5 + actor.id);
              vis.body.rotation.set(0.10, callWave * 0.05, 0);
              vis.leftShoulder.rotation.set(-0.52, 0.14, 0.08);
              vis.leftElbow.rotation.set(-0.95, 0, 0);
              vis.rightShoulder.rotation.set(-2.15 + callWave * 0.25, -0.15, -0.18 + callWave * 0.18);
              vis.rightElbow.rotation.set(-0.45, 0, 0);
              vis.head.rotation.set(-0.08, callWave * 0.28, 0);
            } else if(actor.patienceRatio < 0.45) {
              // Impaciente: tamborilea los dedos rápido sobre la mesa mirando hacia la parrilla
              const tap = Math.abs(Math.sin(elapsedReal * 11 + actor.id));
              vis.body.rotation.set(0.08, 0, 0);
              vis.leftShoulder.rotation.set(-0.52, 0.14, 0.08);
              vis.rightShoulder.rotation.set(-0.58 + tap * 0.12, -0.14, -0.08);
              vis.leftElbow.rotation.set(-0.95, 0, 0);
              vis.rightElbow.rotation.set(-0.90 - tap * 0.18, 0, 0);
              vis.head.rotation.set(0, Math.sin(elapsedReal * 2.4 + actor.id) * 0.38, 0);
            } else {
              vis.body.rotation.set(0.06, 0, 0);
              vis.leftShoulder.rotation.set(-0.52, 0.14, 0.08);
              vis.rightShoulder.rotation.set(-0.52, -0.14, -0.08);
              vis.leftElbow.rotation.set(-0.95 + idleWave * 0.04, 0, 0);
              vis.rightElbow.rotation.set(-0.95 - idleWave * 0.04, 0, 0);
              vis.head.rotation.set(0, Math.sin(elapsedReal * 0.85 + actor.id) * 0.32, 0);
            }
          } else if(isAngry || isComplainingPoint) {
            // Reacción de enojo o reclamo ante corte equivocado, crudo, quemado o fuera de punto
            applyAngerSeatedPose(vis, actor, elapsedReal);
          } else {
            // Cortando y comiendo con cuchillo y tenedor sobre su plato
            const cutCycle = elapsedReal * 5.6 + actor.id;
            const cutWave = Math.sin(cutCycle);
            const reluctantShake = actor.reactionKind === 'queja-punto' ? Math.sin(elapsedReal * 4.5) * 0.20 : cutWave * 0.05;
            vis.body.rotation.set(0.15, 0, 0);
            vis.leftShoulder.rotation.set(-0.62 + cutWave * 0.08, 0.22, 0.12);
            vis.rightShoulder.rotation.set(-0.68 - cutWave * 0.18, -0.22, -0.12);
            vis.leftElbow.rotation.set(-0.92 + cutWave * 0.12, 0, 0);
            vis.rightElbow.rotation.set(-0.98 - cutWave * 0.22, 0, 0);
            vis.head.rotation.set(0.24 + Math.abs(cutWave) * 0.06, reluctantShake, 0);
          }

          vis.badge.visible = true;
        }

        if(vis.badge.visible) {
          const patienceBucket = Math.floor(actor.patienceRatio * 20);
          const complainPhase = actor.reactionTimerSeconds > 0 ? 1 : 0;
          const badgeKey = `${actor.state}:${actor.reactionKind}:${actor.reactionTitle ?? ''}:${complainPhase}:${patienceBucket}`;
          if(vis.lastBadgeKey !== badgeKey) {
            vis.lastBadgeKey = badgeKey;
            drawBadge(vis.badgeCanvas, actor);
            vis.badgeTexture.needsUpdate = true;
          }
        }
      }
    },
  };
}
