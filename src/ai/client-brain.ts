import { CONFIG } from '../sim/parameters.ts';
import { MEAT_CATALOG, MEAT_THERMAL as P, type MeatKind } from '../sim/meatCatalog.ts';
import type { MeatModel } from '../sim/meat.ts';
import { yawTo, type Vec2 } from './dog-brain.ts';

export type DesiredDoneness = 'jugoso' | 'a-punto' | 'bien-cocido';
export type ClientState = 'entrando' | 'esperando' | 'comiendo' | 'saliendo';

export type ClientProfile = {
  name: string;
  gender: 'm' | 'f';
  shirtColor: number;
  jacketColor?: number;
  pantsColor: number;
  skinColor: number;
  hairColor: number;
  facialHair?: 'mustache' | 'beard' | 'none';
  hat?: 'boina' | 'gorra' | 'none';
};

export const CLIENT_PROFILES: readonly ClientProfile[] = [
  { name: 'Don Horacio', gender: 'm', shirtColor: 0xd8e2eb, jacketColor: 0x3b4d63, pantsColor: 0x2a2e35, skinColor: 0xe2b492, hairColor: 0xd4d4d4, facialHair: 'mustache', hat: 'boina' },
  { name: 'Marta', gender: 'f', shirtColor: 0xb83b4e, pantsColor: 0x2f3b4c, skinColor: 0xeec4a2, hairColor: 0x4a2c18, facialHair: 'none', hat: 'none' },
  { name: 'Cacho', gender: 'm', shirtColor: 0x4a6b42, jacketColor: 0x5c4632, pantsColor: 0x36322b, skinColor: 0xd9a67e, hairColor: 0x241d18, facialHair: 'beard', hat: 'gorra' },
  { name: 'Sofi', gender: 'f', shirtColor: 0xe09238, pantsColor: 0x2b394a, skinColor: 0xf2caa8, hairColor: 0x6e3d20, facialHair: 'none', hat: 'none' },
  { name: 'El Tío Raúl', gender: 'm', shirtColor: 0xecdcc6, jacketColor: 0x6b3828, pantsColor: 0x282828, skinColor: 0xdca882, hairColor: 0xa2a2a2, facialHair: 'mustache', hat: 'boina' },
  { name: 'Lucía', gender: 'f', shirtColor: 0x684888, pantsColor: 0x303640, skinColor: 0xebbd9e, hairColor: 0x221a16, facialHair: 'none', hat: 'none' },
  { name: 'Beto', gender: 'm', shirtColor: 0x366478, pantsColor: 0x3a352e, skinColor: 0xe0b08c, hairColor: 0x38281c, facialHair: 'beard', hat: 'none' },
  { name: 'Doña Rosa', gender: 'f', shirtColor: 0x3d7856, jacketColor: 0x8a7968, pantsColor: 0x2e2e34, skinColor: 0xebc0a0, hairColor: 0xc8c4be, facialHair: 'none', hat: 'none' },
];

export type RestaurantTableSpec = {
  tableNumber: number;
  x: number;
  z: number;
  topY: number;
};

/**
 * Las 4 mesitas del restaurante "Parrilla Don Ramón" en Modo Clientes.
 * Dejan pasillos amplios para caminar entre ellas y acercarse a servir cada plato.
 */
export const RESTAURANT_TABLES: readonly RestaurantTableSpec[] = [
  { tableNumber: 1, x: -6.0, z: -0.45, topY: 0.76 },
  { tableNumber: 2, x: -6.0, z:  1.65, topY: 0.76 },
  { tableNumber: 3, x: -3.2, z: -0.35, topY: 0.76 },
  { tableNumber: 4, x: -3.2, z:  1.75, topY: 0.76 },
];

export type SeatInfo = {
  index: number;
  tableNumber: number;
  chairPos: Vec2;
  approachPos: Vec2;
  platePos: { x: number; y: number; z: number };
  sitYaw: number;
  sideLabel: string;
};

/**
 * 8 asientos (2 por cada una de las 4 mesitas del restaurante: lado izquierdo y lado derecho).
 */
export const CLIENT_SEATS: readonly SeatInfo[] = RESTAURANT_TABLES.flatMap((t, tIdx) => [
  {
    index: tIdx * 2,
    tableNumber: t.tableNumber,
    chairPos: { x: t.x - 0.74, z: t.z },
    approachPos: { x: t.x - 1.05, z: t.z },
    platePos: { x: t.x - 0.25, y: t.topY + 0.042, z: t.z },
    sitYaw: Math.PI / 2,
    sideLabel: `Mesa ${t.tableNumber} (izq.)`,
  },
  {
    index: tIdx * 2 + 1,
    tableNumber: t.tableNumber,
    chairPos: { x: t.x + 0.74, z: t.z },
    approachPos: { x: t.x + 1.05, z: t.z },
    platePos: { x: t.x + 0.25, y: t.topY + 0.042, z: t.z },
    sitYaw: -Math.PI / 2,
    sideLabel: `Mesa ${t.tableNumber} (der.)`,
  },
]);

/** Posición de la puerta de entrada del restaurante (en la fachada sur z = 4.95, x = -1.6). */
export const DOOR_THRESHOLD: Vec2 = { x: -1.52, z: 4.92 };
export const DOOR_SPAWN: Vec2 = { x: -1.52, z: 5.55 };
export const DOOR_INSIDE: Vec2 = { x: -1.52, z: 3.85 };

export function routeToSeat(seatIndex: number): Vec2[] {
  const seat = CLIENT_SEATS[seatIndex];
  const aisleZ = seat.chairPos.z > 0.6 ? 2.95 : 0.65;
  return [
    { ...DOOR_THRESHOLD },
    { ...DOOR_INSIDE },
    { x: seat.approachPos.x, z: aisleZ },
    { ...seat.approachPos },
    { ...seat.chairPos },
  ];
}

export function routeFromSeat(seatIndex: number): Vec2[] {
  const seat = CLIENT_SEATS[seatIndex];
  const aisleZ = seat.chairPos.z > 0.6 ? 2.95 : 0.65;
  return [
    { ...seat.approachPos },
    { x: seat.approachPos.x, z: aisleZ },
    { ...DOOR_INSIDE },
    { ...DOOR_THRESHOLD },
    { ...DOOR_SPAWN },
  ];
}

export type ClientOrder = {
  kind: MeatKind;
  doneness: DesiredDoneness;
  maxPatienceSeconds: number;
};

export type DeliveryGrade = 'excelente' | 'bueno' | 'regular' | 'malo';

export type ClientReactionKind =
  | 'ninguna'
  | 'feliz'
  | 'queja-punto'
  | 'enojo-corte'
  | 'enojo-crudo'
  | 'enojo-quemado'
  | 'enojo-espera';

export type AngerGesture =
  | 'golpe-mesa'
  | 'brazos-abiertos'
  | 'brazos-cruzados'
  | 'rechazo-plato'
  | 'manos-cabeza';

export type DeliveryEvaluation = {
  grade: DeliveryGrade;
  reactionKind: ClientReactionKind;
  angerGesture?: AngerGesture;
  shortTitle: string;
  scoreDelta: number;
  tipPesos: number;
  cutBonusPts: number;
  donenessPts: number;
  speedBonusPts: number;
  feedback: string;
};

/** Propina base sugerida según la complejidad y valor del corte en la parrilla. */
export const CUT_BASE_TIP: Readonly<Record<MeatKind, number>> = {
  chorizo: 1100,
  morcilla: 1100,
  matambre: 1400,
  falda: 1450,
  vacio: 1700,
  costilla: 1850,
};

export function maxPotentialTip(kind: MeatKind): number {
  return CUT_BASE_TIP[kind] + 900;
}

/** Propina potencial en vivo según la paciencia restante del cliente. */
export function estimateOrderTip(kind: MeatKind, patienceRatio: number): number {
  return Math.round((CUT_BASE_TIP[kind] + Math.max(0, Math.min(1, patienceRatio)) * 900) / 50) * 50;
}

export function donenessLabel(doneness: DesiredDoneness, kind: MeatKind): string {
  if(MEAT_CATALOG[kind].precooked) return 'Calentita y sin romper';
  if(MEAT_CATALOG[kind].geometry === 'cylinder') return 'Dorado y caliente';
  if(doneness === 'jugoso') return 'Jugoso (58–67 °C)';
  if(doneness === 'a-punto') return 'A punto (68–74 °C)';
  return 'Bien cocido (75–84 °C)';
}

export function donenessShortLabel(doneness: DesiredDoneness, kind: MeatKind): string {
  if(MEAT_CATALOG[kind].precooked) return 'Caliente';
  if(MEAT_CATALOG[kind].geometry === 'cylinder') return 'Caliente y dorado';
  if(doneness === 'jugoso') return 'Jugoso';
  if(doneness === 'a-punto') return 'A punto';
  return 'Bien cocido';
}

const WRONG_CUT_GESTURES: readonly AngerGesture[] = [
  'brazos-abiertos',
  'golpe-mesa',
  'brazos-cruzados',
  'manos-cabeza',
];

/** Evalúa qué tan bien cumple la pieza entregada con el pedido del cliente, desglosando puntos y propina. */
export function evaluateDelivery(order: ClientOrder, meat: MeatModel, patienceRatio: number): DeliveryEvaluation {
  const wrongCut = meat.definition.kind !== order.kind;
  const orderedName = MEAT_CATALOG[order.kind].name;
  const servedName = meat.definition.name;
  const maxBurn = Math.max(meat.burn.a, meat.burn.b, meat.casingDamage.a, meat.casingDamage.b);
  const avgBrown = (meat.brown.a + meat.brown.b) * 0.5;
  const minBrown = Math.min(meat.brown.a, meat.brown.b);
  // Para embutidos consideramos también el calor de las capas exteriores además del núcleo
  const effectiveC = meat.definition.geometry === 'cylinder'
    ? Math.max(meat.centerC, (meat.layersC[0] + meat.layersC[1] + meat.layersC[2]) / 3 * 0.85)
    : meat.centerC;
  const centerC = meat.centerC;
  const baseTipForCut = CUT_BASE_TIP[order.kind];

  // 1. Corte quemado / carbonizado: furia inmediata
  if(maxBurn >= P.burnedThreshold) {
    const gestures: readonly AngerGesture[] = ['rechazo-plato', 'manos-cabeza', 'golpe-mesa'];
    const g = gestures[meat.id % gestures.length];
    return {
      grade: 'malo',
      reactionKind: 'enojo-quemado',
      angerGesture: g,
      shortTitle: '🔥 ¡QUEMADO!',
      scoreDelta: -30,
      tipPesos: 0,
      cutBonusPts: 0,
      donenessPts: -30,
      speedBonusPts: 0,
      feedback: wrongCut
        ? `¡Pedí ${orderedName} y encima me traés un ${servedName} carbonizado!`
        : `¡Esto es carbón puro! Se te quemó todo el ${servedName}, incomible.`,
    };
  }

  // 2. Corte crudo (o helado si es morcilla precocida)
  const isColdPrecooked = meat.definition.precooked && effectiveC < 32;
  const isRawMeat = !meat.definition.precooked && (effectiveC < 38 || (avgBrown < 8 && centerC < 45));
  if(isColdPrecooked || isRawMeat) {
    const gestures: readonly AngerGesture[] = ['rechazo-plato', 'brazos-abiertos', 'brazos-cruzados'];
    const g = gestures[meat.id % gestures.length];
    const title = meat.definition.precooked ? '🥶 ¡ESTÁ FRÍA!' : '🥩 ¡ESTÁ CRUDO!';
    const detail = meat.definition.precooked
      ? `¡Esta ${servedName} está helada de heladera (${Math.round(centerC)} °C), calentala en la parrilla!`
      : `¡Llevate esto de acá, está crudo y frío en el centro (${Math.round(centerC)} °C)!`;
    return {
      grade: 'malo',
      reactionKind: 'enojo-crudo',
      angerGesture: g,
      shortTitle: title,
      scoreDelta: -25,
      tipPesos: 0,
      cutBonusPts: 0,
      donenessPts: -25,
      speedBonusPts: 0,
      feedback: wrongCut
        ? `¡No es ${orderedName} y encima este ${servedName} está frío (${Math.round(centerC)} °C)!`
        : detail,
    };
  }

  // 3. Corte equivocado (pidió otro corte distinto)
  if(wrongCut) {
    const g = WRONG_CUT_GESTURES[(meat.id + order.kind.length) % WRONG_CUT_GESTURES.length];
    const complaints = [
      `¡Eh, maestro! ¡Yo te pedí ${orderedName} y me trajiste ${servedName}!`,
      `¿Me estás cargando? ¡Anotaste cualquier cosa, pedí ${orderedName}, no ${servedName}!`,
      `¡No, che! Yo esperaba ${orderedName} (${donenessShortLabel(order.doneness, order.kind).toLowerCase()}), no ${servedName}.`,
    ];
    return {
      grade: 'malo',
      reactionKind: 'enojo-corte',
      angerGesture: g,
      shortTitle: `😡 ¡PEDÍ ${orderedName.toUpperCase()}!`,
      scoreDelta: -20,
      tipPesos: 0,
      cutBonusPts: -20,
      donenessPts: 0,
      speedBonusPts: 0,
      feedback: complaints[meat.id % complaints.length],
    };
  }

  let pointScore = 0;
  let pointNote = '';
  let shortComplaint = '😒 Punto errado';

  if(meat.definition.precooked) {
    if(effectiveC >= 48 && centerC <= 85 && maxBurn < 14) {
      pointScore = 96;
      pointNote = 'bien calentita y sin romper la tripa';
    } else if(effectiveC >= 32) {
      pointScore = 74;
      pointNote = 'rica, apenas tibia en el centro';
    }
  } else if(meat.definition.geometry === 'cylinder') {
    if(effectiveC >= 62 && minBrown >= CONFIG.meatBrowningMin * 0.65 && maxBurn < 14) {
      pointScore = 96;
      pointNote = 'doradito y jugoso';
    } else if(effectiveC >= 48 && avgBrown >= 14) {
      pointScore = 74;
      pointNote = 'rico, aunque le faltó un toque parejo';
    } else {
      pointScore = 48;
      pointNote = 'le faltó un poco de fuego en el centro';
      shortComplaint = '😒 ¡Faltó fuego!';
    }
  } else {
    const ranges: Record<DesiredDoneness, [number, number]> = {
      'jugoso': [54, 67.5],
      'a-punto': [66, 75.5],
      'bien-cocido': [74, 85],
    };
    const [minTarget, maxTarget] = ranges[order.doneness];
    const brownBonus = minBrown >= CONFIG.meatBrowningMin ? 14 : avgBrown >= 20 ? 6 : -8;
    const dryPenalty = meat.juiciness < P.dryJuice ? 25 : 0;

    if(centerC >= minTarget && centerC <= maxTarget && dryPenalty === 0) {
      pointScore = Math.min(100, 88 + brownBonus);
      pointNote = `justo ${donenessShortLabel(order.doneness, order.kind).toLowerCase()}`;
    } else {
      const distC = centerC < minTarget ? minTarget - centerC : Math.max(0, centerC - maxTarget);
      pointScore = Math.max(25, Math.round(80 - distC * 3.8 + brownBonus - dryPenalty));
      if(dryPenalty > 0 || centerC > maxTarget) {
        pointNote = `te pedí ${donenessShortLabel(order.doneness, order.kind).toLowerCase()} y vino pasado/seco`;
        shortComplaint = `😠 ¡Pasado! Pedí ${donenessShortLabel(order.doneness, order.kind)}`;
      } else {
        pointNote = `te pedí ${donenessShortLabel(order.doneness, order.kind).toLowerCase()} y le faltó cocción`;
        shortComplaint = `😠 ¡Faltó punto! Pedí ${donenessShortLabel(order.doneness, order.kind)}`;
      }
    }
  }

  const cutBonusPts = 25;
  const speedBonusPts = Math.round(patienceRatio * 30);

  if(pointScore >= 84) {
    const donenessPts = pointScore - cutBonusPts;
    const totalScore = cutBonusPts + donenessPts + speedBonusPts;
    const tip = Math.round((baseTipForCut + patienceRatio * 900) / 50) * 50;
    return {
      grade: 'excelente',
      reactionKind: 'feliz',
      shortTitle: '😋 ¡EXQUISITO!',
      scoreDelta: totalScore,
      tipPesos: tip,
      cutBonusPts,
      donenessPts,
      speedBonusPts,
      feedback: `¡Un espectáculo ese ${servedName}, ${pointNote}!`,
    };
  }
  if(pointScore >= 64) {
    const donenessPts = pointScore - cutBonusPts;
    const totalScore = cutBonusPts + donenessPts + Math.round(speedBonusPts * 0.75);
    const tip = Math.round((baseTipForCut * 0.65 + patienceRatio * 450) / 50) * 50;
    return {
      grade: 'bueno',
      reactionKind: 'feliz',
      shortTitle: '👌 ¡Muy rico!',
      scoreDelta: totalScore,
      tipPesos: tip,
      cutBonusPts,
      donenessPts,
      speedBonusPts: Math.round(speedBonusPts * 0.75),
      feedback: `¡Muy rico el ${servedName}! (${pointNote})`,
    };
  }
  const regularTip = pointScore >= 42 ? Math.round((baseTipForCut * 0.22) / 50) * 50 : 0;
  const regularScore = pointScore >= 42 ? 20 : -10;
  return {
    grade: 'regular',
    reactionKind: 'queja-punto',
    angerGesture: 'brazos-abiertos',
    shortTitle: shortComplaint,
    scoreDelta: regularScore,
    tipPesos: regularTip,
    cutBonusPts,
    donenessPts: regularScore - cutBonusPts,
    speedBonusPts: 0,
    feedback: `Mirá que ${pointNote}... Lo como igual porque tengo hambre${regularTip > 0 ? ', te dejo una propina mínima' : ', pero sin propina'}.`,
  };
}

export type LastDeliverySummary = {
  clientName: string;
  tableNumber: number;
  cutName: string;
  grade: DeliveryGrade;
  shortTitle: string;
  scoreDelta: number;
  streakBonusPts: number;
  tipPesos: number;
  streakBonusTip: number;
};

export class ClientActor {
  public readonly id: number;
  public readonly profile: ClientProfile;
  public readonly seatIndex: number;
  public readonly order: ClientOrder;
  public state: ClientState = 'entrando';
  public pos: Vec2 = { ...DOOR_SPAWN };
  public yaw = Math.PI;
  public route: Vec2[];
  public patienceSeconds: number;
  public eatTimerSeconds = 0;
  public reactionTimerSeconds = 0;
  public servedMeatId: number | null = null;
  public servedKindName: string | null = null;
  public lastReaction: string | null = null;
  public reactionKind: ClientReactionKind = 'ninguna';
  public angerGesture: AngerGesture = 'brazos-abiertos';
  public reactionTitle: string | null = null;
  public lastScoreDelta = 0;
  public lastTipPesos = 0;

  constructor(id: number, profile: ClientProfile, seatIndex: number, order: ClientOrder) {
    this.id = id;
    this.profile = profile;
    this.seatIndex = seatIndex;
    this.order = order;
    this.patienceSeconds = order.maxPatienceSeconds;
    this.angerGesture = WRONG_CUT_GESTURES[id % WRONG_CUT_GESTURES.length];
    this.route = routeToSeat(seatIndex);
  }

  get patienceRatio(): number {
    return Math.max(0, Math.min(1, this.patienceSeconds / this.order.maxPatienceSeconds));
  }

  get isAngry(): boolean {
    return this.reactionKind === 'enojo-corte'
      || this.reactionKind === 'enojo-crudo'
      || this.reactionKind === 'enojo-quemado'
      || this.reactionKind === 'enojo-espera';
  }
}

export type ClientEvent = {
  kind: 'arrived' | 'ordered' | 'served' | 'impatient-leave';
  client: ClientActor;
  message: string;
};

const ORDER_POOL: readonly { kind: MeatKind; doneness: DesiredDoneness; patienceS: number }[] = [
  { kind: 'chorizo', doneness: 'a-punto', patienceS: 210 },
  { kind: 'morcilla', doneness: 'a-punto', patienceS: 195 },
  { kind: 'matambre', doneness: 'a-punto', patienceS: 220 },
  { kind: 'vacio', doneness: 'jugoso', patienceS: 250 },
  { kind: 'costilla', doneness: 'a-punto', patienceS: 260 },
  { kind: 'falda', doneness: 'bien-cocido', patienceS: 230 },
  { kind: 'vacio', doneness: 'a-punto', patienceS: 250 },
  { kind: 'costilla', doneness: 'jugoso', patienceS: 250 },
];

export class ClientManager {
  public enabled = false;
  public readonly clients: ClientActor[] = [];
  public score = 0;
  public tipsPesos = 0;
  public servedCount = 0;
  public lostCount = 0;
  /** Racha consecutiva de entregas buenas o excelentes. */
  public streak = 0;
  /** Resumen de la última entrega o pérdida para mostrar desglose en el HUD. */
  public lastDelivery: LastDeliverySummary | null = null;
  /** Apertura actual de la puerta de entrada (0 = cerrada, 1 = abierta). */
  public doorOpenRatio = 0;

  private nextClientId = 1;
  private orderCursor = 0;
  private spawnTimer = 2.0;
  private maxConcurrent = 4;

  /** Rango del parrillero según su puntaje de reputación. */
  get rankTitle(): string {
    if(this.score >= 700) return '👑 Leyenda AsArt';
    if(this.score >= 380) return '🔥 Maestro Parrillero';
    if(this.score >= 140) return '🥩 Asador Criollo';
    return '🪵 Aprendiz de Fogonero';
  }

  reset(enabled: boolean): void {
    this.enabled = enabled;
    this.clients.length = 0;
    this.score = 0;
    this.tipsPesos = 0;
    this.servedCount = 0;
    this.lostCount = 0;
    this.streak = 0;
    this.lastDelivery = null;
    this.doorOpenRatio = 0;
    this.nextClientId = 1;
    this.orderCursor = 0;
    this.spawnTimer = 1.5;
  }

  clientAtSeat(seatIndex: number): ClientActor | undefined {
    return this.clients.find(c => c.seatIndex === seatIndex);
  }

  clientById(id: number): ClientActor | undefined {
    return this.clients.find(c => c.id === id);
  }

  /** Avanza el movimiento, la puerta batiente, la paciencia y la llegada de clientes. */
  update(realDt: number): { events: ClientEvent[]; finishedMeatIds: number[] } {
    const events: ClientEvent[] = [];
    const finishedMeatIds: number[] = [];
    if(!this.enabled || realDt <= 0) return { events, finishedMeatIds };

    // 1. Generar nuevos clientes si hay asientos libres
    this.spawnTimer -= realDt;
    if(this.spawnTimer <= 0 && this.clients.length < this.maxConcurrent) {
      const spawned = this.spawnNextClient();
      if(spawned) {
        const seat = CLIENT_SEATS[spawned.seatIndex];
        events.push({
          kind: 'arrived',
          client: spawned,
          message: `${spawned.profile.name} abrió la puerta y va hacia la Mesa ${seat.tableNumber}.`,
        });
      }
      this.spawnTimer = 12 + (this.nextClientId % 3) * 4;
    }

    // 2. Actualizar cada cliente activo
    const walkSpeed = 1.45;
    let someoneNearDoor = false;

    for(let i = this.clients.length - 1; i >= 0; i--) {
      const c = this.clients[i];
      if(Math.hypot(c.pos.x - DOOR_THRESHOLD.x, c.pos.z - DOOR_THRESHOLD.z) < 1.85) {
        someoneNearDoor = true;
      }

      if(c.state === 'entrando' || c.state === 'saliendo') {
        const target = c.route[0];
        if(!target) {
          if(c.state === 'entrando') {
            c.state = 'esperando';
            c.yaw = CLIENT_SEATS[c.seatIndex].sitYaw;
            const cutName = MEAT_CATALOG[c.order.kind].name;
            const pointName = donenessShortLabel(c.order.doneness, c.order.kind);
            events.push({
              kind: 'ordered',
              client: c,
              message: `${c.profile.name} (${CLIENT_SEATS[c.seatIndex].sideLabel}) pide: ${cutName} · ${pointName}.`,
            });
          } else {
            this.clients.splice(i, 1);
          }
          continue;
        }

        const dx = target.x - c.pos.x;
        const dz = target.z - c.pos.z;
        const d = Math.hypot(dx, dz);
        const speedMul = c.state === 'saliendo' && c.isAngry ? 1.28 : 1.0;
        const step = walkSpeed * speedMul * realDt;
        c.yaw = yawTo(c.pos, target);
        if(d <= step) {
          c.pos.x = target.x;
          c.pos.z = target.z;
          c.route.shift();
        } else {
          c.pos.x += (dx / d) * step;
          c.pos.z += (dz / d) * step;
        }
      } else if(c.state === 'esperando') {
        c.patienceSeconds = Math.max(0, c.patienceSeconds - realDt);
        if(c.patienceSeconds <= 0) {
          c.reactionKind = 'enojo-espera';
          c.reactionTitle = '🤬 ¡SE FUE ENOJADO!';
          c.lastReaction = '¡Me cansé de esperar, no atienden más acá!';
          c.lastScoreDelta = -30;
          c.lastTipPesos = 0;
          c.state = 'saliendo';
          c.route = routeFromSeat(c.seatIndex);
          this.lostCount++;
          this.streak = 0;
          this.score = Math.max(0, this.score - 30);
          this.lastDelivery = {
            clientName: c.profile.name,
            tableNumber: CLIENT_SEATS[c.seatIndex].tableNumber,
            cutName: MEAT_CATALOG[c.order.kind].name,
            grade: 'malo',
            shortTitle: '🤬 Se fue sin comer',
            scoreDelta: -30,
            streakBonusPts: 0,
            tipPesos: 0,
            streakBonusTip: 0,
          };
          events.push({
            kind: 'impatient-leave',
            client: c,
            message: `${c.profile.name} se cansó de esperar en la Mesa ${CLIENT_SEATS[c.seatIndex].tableNumber} y se fue furioso (-30 pts).`,
          });
        }
      } else if(c.state === 'comiendo') {
        if(c.reactionTimerSeconds > 0) {
          c.reactionTimerSeconds = Math.max(0, c.reactionTimerSeconds - realDt);
        }
        c.eatTimerSeconds -= realDt;
        if(c.eatTimerSeconds <= 0) {
          if(c.servedMeatId !== null) {
            finishedMeatIds.push(c.servedMeatId);
            c.servedMeatId = null;
          }
          c.state = 'saliendo';
          c.route = routeFromSeat(c.seatIndex);
        }
      }
    }

    // 3. Animar suavemente la apertura/cierre de la puerta cuando pasa un cliente
    const targetOpen = someoneNearDoor ? 1 : 0;
    const speed = someoneNearDoor ? 4.5 : 2.8;
    this.doorOpenRatio += (targetOpen - this.doorOpenRatio) * Math.min(1, realDt * speed);

    return { events, finishedMeatIds };
  }

  /** Entrega un corte de carne al cliente sentado en `seatIndex`. */
  serveSeat(seatIndex: number, meat: MeatModel): { ok: boolean; message: string; evaluation?: DeliveryEvaluation } {
    const client = this.clientAtSeat(seatIndex);
    if(!client) {
      return { ok: false, message: 'No hay ningún cliente sentado en ese plato.' };
    }
    if(client.state === 'entrando') {
      return { ok: false, message: `Esperá a que ${client.profile.name} llegue a su mesa.` };
    }
    if(client.state !== 'esperando') {
      return { ok: false, message: `${client.profile.name} ya está comiendo su pedido.` };
    }

    const evaluation = evaluateDelivery(client.order, meat, client.patienceRatio);
    let streakBonusPts = 0;
    let streakBonusTip = 0;
    if(evaluation.grade === 'excelente' || evaluation.grade === 'bueno') {
      this.streak++;
      if(this.streak >= 2) {
        const mult = Math.min(4, this.streak - 1);
        streakBonusPts = mult * 15;
        streakBonusTip = mult * 250;
      }
      this.servedCount++;
    } else if(evaluation.grade === 'regular') {
      this.streak = 0;
      this.servedCount++;
    } else {
      this.streak = 0;
      this.lostCount++;
    }

    const totalScoreDelta = evaluation.scoreDelta + streakBonusPts;
    const totalTipPesos = evaluation.tipPesos + streakBonusTip;
    this.score = Math.max(0, this.score + totalScoreDelta);
    this.tipsPesos += totalTipPesos;

    client.state = 'comiendo';
    client.reactionKind = evaluation.reactionKind;
    if(evaluation.angerGesture) client.angerGesture = evaluation.angerGesture;
    client.reactionTitle = evaluation.shortTitle;
    client.servedKindName = meat.definition.name;
    client.eatTimerSeconds = evaluation.grade === 'malo' ? 6.0 : 12.0;
    client.reactionTimerSeconds = evaluation.grade === 'malo' ? 6.0 : evaluation.grade === 'regular' ? 4.2 : 2.5;
    client.servedMeatId = meat.id;
    client.lastReaction = evaluation.feedback;
    client.lastScoreDelta = totalScoreDelta;
    client.lastTipPesos = totalTipPesos;

    this.lastDelivery = {
      clientName: client.profile.name,
      tableNumber: CLIENT_SEATS[seatIndex].tableNumber,
      cutName: meat.definition.name,
      grade: evaluation.grade,
      shortTitle: evaluation.shortTitle,
      scoreDelta: totalScoreDelta,
      streakBonusPts,
      tipPesos: totalTipPesos,
      streakBonusTip,
    };

    const sign = totalScoreDelta >= 0 ? `+${totalScoreDelta}` : `${totalScoreDelta}`;
    const streakNote = streakBonusPts > 0 ? ` · 🔥 Racha x${this.streak}` : '';
    const tipText = totalTipPesos > 0 ? ` · Propina +$${totalTipPesos.toLocaleString('es-AR')}` : ' · Sin propina ($0)';
    return {
      ok: true,
      evaluation,
      message: `${client.profile.name} (Mesa ${CLIENT_SEATS[seatIndex].tableNumber}): "${evaluation.feedback}" (${sign} pts${tipText}${streakNote})`,
    };
  }

  private spawnNextClient(): ClientActor | null {
    const occupied = new Set(this.clients.map(c => c.seatIndex));
    // Priorizamos distribuir clientes en las 4 mesas primero (un cliente por mesa y luego parejas)
    const seatOrder = [4, 0, 6, 2, 5, 1, 7, 3];
    const freeSeat = seatOrder.find(s => !occupied.has(s));
    if(freeSeat === undefined) return null;

    const id = this.nextClientId++;
    const profile = CLIENT_PROFILES[(id - 1) % CLIENT_PROFILES.length];
    const template = ORDER_POOL[this.orderCursor % ORDER_POOL.length];
    this.orderCursor++;

    const actor = new ClientActor(id, profile, freeSeat, {
      kind: template.kind,
      doneness: template.doneness,
      maxPatienceSeconds: template.patienceS,
    });
    this.clients.push(actor);
    return actor;
  }
}
