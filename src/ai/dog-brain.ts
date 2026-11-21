/**
 * Cerebro del perro del patio: primer NPC del proyecto (rol AI Programmer).
 * Lógica pura, sin Three.js ni DOM: recibe lo que pasa en el patio y decide estado, destino, acción animada y mensajes.
 * Todo lo que dice un mensaje lo hace el perro de verdad: cada mensaje va junto con una acción (`action`) que la vista anima.
 */
import { findPath, type NavObstacle } from './dog-nav.ts';

export type Vec2 = { x: number; z: number };
export type DogState = 'echado' | 'atento' | 'caminando' | 'pidiendo' | 'contento'
  | 'pidiendo-a-vos' | 'robando' | 'huyendo' | 'comiendo' | 'ladrando' | 'olfateando' | 'culpable';
/** Acciones animadas (la vista las representa con poses propias). */
export type DogAction = 'pata' | 'panza' | 'cabeza' | 'vuelta' | 'cola' | 'mendigar' | 'ladrar'
  | 'saltar' | 'atrapar' | 'comer' | 'olfatear' | 'culpa';
export type DogInput = {
  dt: number; player: Vec2; meatOnGrill: boolean; burning: boolean;
  /** El jugador lleva una pieza en la pinza. */
  playerHasMeat?: boolean;
  /** Pieza sola sobre la tabla de preparación (candidata a robo). */
  boardMeat?: { id: number; name: string } | null;
  /** Olor de la basura, 0..1. */
  trashSmell?: number;
  /** Muebles actuales (cambian entre Entrenamiento y Clientes). */
  obstacles?: readonly NavObstacle[];
};
export type DogEventKind = 'trick' | 'sit-by-grill' | 'bark-burning' | 'ask-food' | 'ask-gave-up' | 'steal' | 'ate' | 'sniff-trash';
export type DogEvent = { kind: DogEventKind; message: string; meatId?: number };

/** Nombre provisorio: lo define Narrativa. */
export const DOG_NAME = 'Pancho';

/**
 * Lugares del patio por donde se mueve. Sin muebles conocidos, los recorridos pasan por `beg`
 * (al costado de la parrilla); con la lista de obstáculos se usa el navegador (dog-nav.ts).
 */
export const DOG_SPOTS = {
  rest: { x: -4.7, z: -2.95 },  // echado a la izquierda del asador, delante de la esquina
  beg: { x: -3.0, z: -2.3 },    // sentado al costado de la parrilla, mirando la carne
  grill: { x: 0, z: -4.55 },
  board: { x: 3.2, z: -2.85 },  // frente a la mesa de preparación (para robar)
  boardCenter: { x: 3.23, z: -3.9 },
  trash: { x: 4.6, z: -2.6 },   // frente al tacho de basura
  wander: [{ x: -2.5, z: 0.5 }, { x: 0.5, z: 2.6 }, { x: -3.2, z: 3.3 }, { x: 3.0, z: 0.8 }, { x: 5.5, z: 1.2 }],
} as const;

export const DOG_SETTINGS = {
  walkSpeed: 1.1,          // m/s
  trotSpeed: 1.7,          // cuando viene hacia vos
  runSpeed: 2.6,           // huyendo con lo que robó
  turnSpeed: 4.0,          // rad/s
  noticeDistance: 2.4,     // se levanta a mirarte si te acercás
  happySeconds: 2.6,       // dura la alegría después de acariciarlo
  wanderEvery: 32,         // s entre paseos cuando no hay carne
  wanderDwell: 7,          // s olfateando en cada punto
  barkCooldown: 20,        // s entre ladridos por algo quemándose
  askEvery: 55,            // s entre pedidos de comida
  askFirstAfter: 25,
  askRange: 7,             // solo te pide si estás a menos de esto
  askPatience: 14,         // s que se queda pidiendo
  stealAfterAlone: 9,      // s con carne sola en la tabla y vos lejos
  stealPlayerFar: 3.5,     // m entre vos y la tabla para que se anime
  stealCooldown: 50,
  eatStolenSeconds: 9,
  eatGivenSeconds: 6,
  sniffTrashFrom: 0.5,     // olor desde el que va a olfatear el tacho
  sniffCooldown: 80,
};

/** Duración de cada acción animada (s). `mendigar` dura hasta que le des algo o se canse. */
export const ACTION_SECONDS: Record<DogAction, number> = {
  pata: 2.4, panza: 3.0, cabeza: 2.6, vuelta: 1.9, cola: 2.0, mendigar: DOG_SETTINGS.askPatience,
  ladrar: 2.4, saltar: 1.5, atrapar: 0.7, comer: DOG_SETTINGS.eatGivenSeconds, olfatear: 4.0, culpa: 2.5,
};

type Trick = { action: DogAction; line: string; needsClose?: boolean };
const TRICKS: Trick[] = [
  { action: 'cola', line: `${DOG_NAME} mueve la cola con todo el cuerpo.` },
  { action: 'pata', line: `${DOG_NAME} se sienta y te da la pata.` },
  { action: 'panza', line: `${DOG_NAME} se tira panza arriba para que lo rasques.` },
  { action: 'cabeza', line: `${DOG_NAME} te apoya la cabeza en la rodilla.`, needsClose: true },
  { action: 'vuelta', line: `${DOG_NAME} da una vuelta persiguiéndose la cola de contento.` },
];

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
/** Ángulo para Three.js: con rotation.y = yaw, el +z local apunta hacia (sin yaw, cos yaw). */
export const yawTo = (from: Vec2, to: Vec2) => Math.atan2(to.x - from.x, to.z - from.z);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Punto a `gap` metros de `target`, del lado de `from`. */
const approach = (from: Vec2, target: Vec2, gap: number): Vec2 => {
  const d = dist(from, target) || 1;
  return { x: target.x + (from.x - target.x) / d * gap, z: target.z + (from.z - target.z) / d * gap };
};

/** Recorrido entre dos lugares conocidos, siempre pasando por el costado de la parrilla. */
export function dogRoute(from: Vec2, to: Vec2): Vec2[] {
  const beg = DOG_SPOTS.beg;
  if(dist(from, beg) < 0.3 || dist(to, beg) < 0.3) return [{ ...to }];
  return [{ ...beg }, { ...to }];
}

type Goal = 'rest' | 'beg' | 'wander' | 'player' | 'board' | 'flee' | 'trash';

export class DogBrain {
  pos: Vec2 = { ...DOG_SPOTS.rest };
  yaw = 0.3;
  state: DogState = 'echado';
  /** Hacia dónde mira la cabeza (puede ser distinto del cuerpo). */
  lookAt: Vec2 | null = null;
  /** Ganas de mover la cola: 0 quieto, 1 a full. */
  wag = 0;
  /** Acción animada en curso y segundos desde que empezó. */
  action: DogAction | null = null;
  actionTime = 0;
  /** Lo que lleva en la boca. */
  carrying: { meatId: number; name: string; stolen: boolean } | null = null;
  /** Velocidad actual (la vista ajusta el paso: caminar, trotar, correr). */
  speed = 0;
  private path: Vec2[] = [];
  private goal: Goal = 'rest';
  private time = 0;
  private happy = 0;
  private wanderClock = DOG_SETTINGS.wanderEvery * 0.5;
  private dwell = 0;
  private wanderIndex = 0;
  private lastBark = -Infinity;
  private announcedBeg = false;
  private obstacles: readonly NavObstacle[] | null = null;
  private pendingTrick: Trick | null = null;
  private trickIndex = 0;
  private askCooldown = DOG_SETTINGS.askFirstAfter;
  private stealCooldown = DOG_SETTINGS.stealCooldown * 0.3;
  private sniffCooldown = 0;
  private boardAlone = 0;
  private stealTarget: { id: number; name: string } | null = null;
  private repathClock = 0;

  get moving(): boolean { return this.path.length > 0; }
  /** Está ocupado con algo propio (no lo interrumpen los paseos ni la parrilla). */
  private get busy(): boolean {
    return this.action !== null || this.carrying !== null || this.goal === 'player' || this.goal === 'board'
      || this.goal === 'flee' || this.goal === 'trash' || this.pendingTrick !== null;
  }

  /** Acariciar (E): hace un truco distinto cada vez; si está lejos, primero viene. Devuelve el mensaje. */
  pet(player: Vec2, burning = false): string {
    this.lookAt = { ...player };
    if(this.carrying) return `${DOG_NAME} gruñe bajito y no suelta ${this.carrying.name}: sacáselo con la pinza (3).`;
    if(this.action === 'mendigar') {
      this.happy = DOG_SETTINGS.happySeconds;
      return `${DOG_NAME} se deja acariciar pero sigue mirándote las manos: dale algo con la pinza (3 + clic en él).`;
    }
    this.happy = DOG_SETTINGS.happySeconds;
    if(burning) {
      this.startAction('cola');
      return `${DOG_NAME} se deja acariciar, pero mira la parrilla: algo se está quemando.`;
    }
    const trick = TRICKS[this.trickIndex++ % TRICKS.length];
    const gap = trick.needsClose ? 0.55 : 0.85;
    if(dist(this.pos, player) > gap + 0.45) {
      this.pendingTrick = trick;
      this.goTo('player', approach(this.pos, player, gap));
      return `${DOG_NAME} viene trotando hacia vos.`;
    }
    this.yaw = yawTo(this.pos, player);
    this.startAction(trick.action);
    return trick.line;
  }

  /** Le das algo de comer. Devuelve el mensaje o null si no lo puede agarrar. */
  give(meatId: number, name: string, player: Vec2): string | null {
    if(this.carrying) return null;
    this.carrying = { meatId, name, stolen: false };
    this.pendingTrick = null;
    this.path = [];
    this.yaw = yawTo(this.pos, player);
    this.startAction('atrapar');
    this.askCooldown = DOG_SETTINGS.askEvery;
    return `Le diste ${name} a ${DOG_NAME}: lo agarra al vuelo y se lo lleva a su rincón para comerlo.`;
  }

  /** Le sacaron de la boca lo que tenía (con la pinza). */
  loseCarried(): void {
    if(!this.carrying) return;
    this.carrying = null;
    this.path = [];
    this.goal = 'rest';
    this.startAction('culpa');
  }

  tick(input: DogInput): DogEvent[] {
    const { dt } = input;
    const events: DogEvent[] = [];
    this.time += dt;
    if(input.obstacles) this.obstacles = input.obstacles;
    this.askCooldown -= dt; this.stealCooldown -= dt; this.sniffCooldown -= dt;

    // Algo se quema: ladra de verdad (acción), mirando la parrilla. Como mucho cada 20 s.
    if(input.burning && this.time - this.lastBark >= DOG_SETTINGS.barkCooldown) {
      this.lastBark = this.time;
      events.push({ kind: 'bark-burning', message: `${DOG_NAME} ladra: ¡algo se está quemando!` });
      if(!this.carrying && (this.action === null || this.action === 'mendigar')) {
        this.path = [];
        this.yaw = yawTo(this.pos, DOG_SPOTS.grill);
        this.startAction('ladrar');
      }
    }

    if(this.action) this.advanceAction(dt, input, events);
    else this.chooseGoal(input, events);
    this.move(dt, input, events);
    this.updateMood(dt, input);
    return events;
  }

  private startAction(action: DogAction): void {
    this.action = action;
    this.actionTime = 0;
  }

  private advanceAction(dt: number, input: DogInput, events: DogEvent[]): void {
    this.actionTime += dt;
    const action = this.action as DogAction;
    const duration = action === 'comer' && this.carrying?.stolen ? DOG_SETTINGS.eatStolenSeconds : ACTION_SECONDS[action];
    if(action === 'mendigar') {
      // Si te alejás, te sigue; si no le das nada, se cansa.
      if(dist(this.pos, input.player) > 1.7) { this.action = null; this.goTo('player', approach(this.pos, input.player, 0.8)); return; }
      this.yaw += Math.max(-DOG_SETTINGS.turnSpeed * dt, Math.min(DOG_SETTINGS.turnSpeed * dt, wrap(yawTo(this.pos, input.player) - this.yaw)));
    }
    if(action === 'saltar' && this.stealTarget && !this.carrying && this.actionTime >= 0.8) {
      if(input.boardMeat?.id === this.stealTarget.id && dist(input.player, DOG_SPOTS.boardCenter) > 2.0) {
        this.carrying = { meatId: this.stealTarget.id, name: this.stealTarget.name, stolen: true };
        events.push({ kind: 'steal', meatId: this.stealTarget.id,
          message: `🐕 ¡${DOG_NAME} se robó ${this.stealTarget.name} de la tabla! Corré a sacárselo con la pinza (3 + clic) antes de que se lo coma.` });
      }
      this.stealTarget = null;
    }
    if(this.actionTime < duration) return;
    this.action = null;
    if(action === 'mendigar') {
      this.askCooldown = DOG_SETTINGS.askEvery;
      events.push({ kind: 'ask-gave-up', message: `${DOG_NAME} se cansó de pedir y vuelve a su lugar, ofendido.` });
      this.goTo('rest', DOG_SPOTS.rest);
    } else if(action === 'saltar') {
      this.stealCooldown = DOG_SETTINGS.stealCooldown;
      this.goTo(this.carrying ? 'flee' : 'rest', DOG_SPOTS.rest);
    } else if(action === 'atrapar') {
      this.goTo('flee', DOG_SPOTS.rest);
    } else if(action === 'comer' && this.carrying) {
      events.push({ kind: 'ate', meatId: this.carrying.meatId,
        message: this.carrying.stolen ? `${DOG_NAME} se terminó ${this.carrying.name} que te robó y se relame.`
          : `${DOG_NAME} se terminó ${this.carrying.name} y te mira agradecido.` });
      this.carrying = null;
      this.happy = DOG_SETTINGS.happySeconds;
      this.goal = 'rest';
    } else if(action === 'olfatear') {
      this.goTo('rest', DOG_SPOTS.rest);
    }
  }

  private chooseGoal(input: DogInput, events: DogEvent[]): void {
    const player = input.player;
    // Robo: carne sola en la tabla y vos lejos un buen rato.
    const playerFarFromBoard = dist(player, DOG_SPOTS.boardCenter) > DOG_SETTINGS.stealPlayerFar;
    this.boardAlone = input.boardMeat && playerFarFromBoard ? this.boardAlone + input.dt : 0;
    if(this.busy) return;
    if(input.boardMeat && this.boardAlone >= DOG_SETTINGS.stealAfterAlone && this.stealCooldown <= 0) {
      this.stealTarget = { ...input.boardMeat };
      this.goTo('board', DOG_SPOTS.board);
      return;
    }
    // Pedir comida: se acerca, se sienta y te mira.
    if(this.askCooldown <= 0 && (input.playerHasMeat || input.meatOnGrill) && dist(this.pos, player) < DOG_SETTINGS.askRange) {
      this.goTo('player', approach(this.pos, player, 0.8));
      events.push({ kind: 'ask-food', message: `${DOG_NAME} se te acerca a pedirte un pedacito: dale algo con la pinza (3 + clic en él).` });
      return;
    }
    // Basura con olor: va a olfatear el tacho (pista para sacar la bolsa).
    // Con olor insoportable lo atrae aunque haya carne en la parrilla.
    const smell = input.trashSmell ?? 0;
    if(smell >= DOG_SETTINGS.sniffTrashFrom && this.sniffCooldown <= 0 && (!input.meatOnGrill || smell >= 0.8)) {
      this.sniffCooldown = DOG_SETTINGS.sniffCooldown;
      this.goTo('trash', DOG_SPOTS.trash);
      return;
    }
    const atGoalIdle = !this.moving;
    if(input.meatOnGrill && this.goal !== 'beg') this.goTo('beg', DOG_SPOTS.beg);
    else if(!input.meatOnGrill && this.goal === 'beg') { this.announcedBeg = false; this.goTo('rest', DOG_SPOTS.rest); }
    else if(!input.meatOnGrill && atGoalIdle) {
      if(this.goal === 'rest') {
        this.wanderClock -= input.dt;
        if(this.wanderClock <= 0) {
          const spot = DOG_SPOTS.wander[this.wanderIndex++ % DOG_SPOTS.wander.length];
          this.goTo('wander', spot);
          this.dwell = DOG_SETTINGS.wanderDwell;
        }
      } else if(this.goal === 'wander') {
        this.dwell -= input.dt;
        if(this.dwell <= 0) { this.wanderClock = DOG_SETTINGS.wanderEvery; this.goTo('rest', DOG_SPOTS.rest); }
      }
    }
  }

  private goTo(goal: Goal, target: Vec2): void {
    this.goal = goal;
    const route = this.obstacles ? findPath(this.pos, target, this.obstacles) : null;
    this.path = route ?? (goal === 'player' || goal === 'board' || goal === 'trash' ? [{ ...target }] : dogRoute(this.pos, target));
  }

  private move(dt: number, input: DogInput, events: DogEvent[]): void {
    // Si vas caminando mientras viene hacia vos, corrige el rumbo.
    if(this.goal === 'player' && this.moving) {
      this.repathClock -= dt;
      const end = this.path[this.path.length - 1];
      if(this.repathClock <= 0 && dist(end, input.player) > 1.2) {
        this.repathClock = 0.8;
        this.goTo('player', approach(this.pos, input.player, this.pendingTrick?.needsClose ? 0.55 : 0.8));
      }
    }
    if(!this.moving) { this.speed = 0; return; }
    const next = this.path[0];
    const d = dist(this.pos, next);
    this.speed = this.goal === 'flee' ? DOG_SETTINGS.runSpeed : this.goal === 'player' ? DOG_SETTINGS.trotSpeed : DOG_SETTINGS.walkSpeed;
    const step = this.speed * dt;
    this.turnToward(yawTo(this.pos, next), dt);
    if(d <= step) { this.pos = { ...next }; this.path.shift(); }
    else { this.pos.x += (next.x - this.pos.x) / d * step; this.pos.z += (next.z - this.pos.z) / d * step; }
    if(this.moving) return;
    this.arrive(input, events);
  }

  /** Llegó al destino: lo que hace depende de para qué fue. */
  private arrive(input: DogInput, events: DogEvent[]): void {
    this.speed = 0;
    switch(this.goal) {
      case 'beg':
        if(!this.announcedBeg) {
          this.announcedBeg = true;
          events.push({ kind: 'sit-by-grill', message: `${DOG_NAME} se sentó al lado de la parrilla: huele el asado.` });
        }
        break;
      case 'player': {
        this.yaw = yawTo(this.pos, input.player);
        const trick = this.pendingTrick;
        this.pendingTrick = null;
        this.goal = 'rest';
        if(trick) { this.startAction(trick.action); events.push({ kind: 'trick', message: trick.line }); }
        else this.startAction('mendigar');
        break;
      }
      case 'board':
        this.yaw = yawTo(this.pos, DOG_SPOTS.boardCenter);
        if(input.boardMeat && this.stealTarget && input.boardMeat.id === this.stealTarget.id) this.startAction('saltar');
        else { this.stealTarget = null; this.goTo('rest', DOG_SPOTS.rest); }
        break;
      case 'flee':
        this.goal = 'rest';
        if(this.carrying) this.startAction('comer');
        break;
      case 'trash':
        this.yaw = yawTo(this.pos, { x: DOG_SPOTS.trash.x, z: DOG_SPOTS.trash.z - 1 });
        this.startAction('olfatear');
        events.push({ kind: 'sniff-trash', message: `${DOG_NAME} olfatea el tacho de basura: ya huele mal, hay que sacar la bolsa.` });
        break;
      default:
        break;
    }
  }

  private updateMood(dt: number, input: DogInput): void {
    const nearPlayer = dist(this.pos, input.player) < DOG_SETTINGS.noticeDistance;
    if(this.happy > 0) this.happy -= dt;
    const a = this.action;
    if(a === 'comer') { this.state = 'comiendo'; this.lookAt = null; this.wag = 0.7; return; }
    if(a === 'mendigar') { this.state = 'pidiendo-a-vos'; this.lookAt = { ...input.player }; this.wag = 0.8; return; }
    if(a === 'ladrar') { this.state = 'ladrando'; this.lookAt = { ...DOG_SPOTS.grill }; this.wag = 0.2; return; }
    if(a === 'saltar') { this.state = 'robando'; this.lookAt = { ...DOG_SPOTS.boardCenter }; this.wag = 0.9; return; }
    if(a === 'olfatear') { this.state = 'olfateando'; this.lookAt = null; this.wag = 0.3; return; }
    if(a === 'culpa') { this.state = 'culpable'; this.lookAt = { ...input.player }; this.wag = 0.1; return; }
    if(a !== null) { this.state = 'contento'; this.lookAt = { ...input.player }; this.wag = 1; return; }
    if(this.carrying && this.moving) { this.state = 'huyendo'; this.lookAt = null; this.wag = 0.6; return; }
    if(this.happy > 0) {
      this.state = 'contento';
      this.lookAt = { ...input.player };
      if(!this.moving) this.turnToward(yawTo(this.pos, input.player), dt);
      this.wag = 1;
    } else if(this.moving) {
      this.state = 'caminando';
      this.lookAt = this.goal === 'player' ? { ...input.player } : null;
      this.wag = this.goal === 'player' ? 0.8 : 0.35;
    } else if(this.goal === 'beg') {
      this.state = 'pidiendo';
      this.turnToward(yawTo(this.pos, DOG_SPOTS.grill), dt);
      this.lookAt = { ...DOG_SPOTS.grill };
      this.wag = 0.45;
    } else if(nearPlayer || this.goal === 'wander') {
      this.state = 'atento';
      this.lookAt = nearPlayer ? { ...input.player } : null;
      this.wag = nearPlayer ? 0.6 : 0.25;
    } else {
      this.state = 'echado';
      this.lookAt = null;
      this.wag = 0.05;
    }
  }

  private turnToward(target: number, dt: number): void {
    const diff = wrap(target - this.yaw);
    const max = DOG_SETTINGS.turnSpeed * dt;
    this.yaw = wrap(this.yaw + Math.max(-max, Math.min(max, diff)));
  }
}
