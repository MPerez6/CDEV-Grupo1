/**
 * Cerebro del perro del patio: primer NPC del proyecto (rol AI Programmer).
 * Lógica pura, sin Three.js ni DOM: recibe lo que pasa en el patio y decide estado, destino y mensajes.
 * Es la base que después pueden reutilizar los clientes del Modo Clientes (estados + destinos + reacciones).
 */
export type Vec2 = { x: number; z: number };
export type DogState = 'echado' | 'atento' | 'caminando' | 'pidiendo' | 'contento';
export type DogInput = { dt: number; player: Vec2; meatOnGrill: boolean; burning: boolean };
export type DogEvent = { kind: 'sit-by-grill' | 'bark-burning'; message: string };

/** Nombre provisorio: lo define Narrativa. */
export const DOG_NAME = 'Pancho';

/**
 * Lugares del patio por donde se mueve. Todos los recorridos pasan por `beg` (al costado de la parrilla),
 * así ningún tramo atraviesa el asador, la mesa de preparación, la mesa familiar ni los postes de la parra.
 */
export const DOG_SPOTS = {
  rest: { x: -4.7, z: -2.95 },  // echado a la izquierda del asador, delante de la esquina
  beg: { x: -3.0, z: -2.3 },    // sentado al costado de la parrilla, mirando la carne
  grill: { x: 0, z: -4.55 },
  wander: [{ x: -2.5, z: 0.5 }, { x: 0.5, z: 2.6 }, { x: -3.2, z: 3.3 }, { x: 3.0, z: 0.8 }, { x: 5.5, z: 1.2 }],
} as const;

export const DOG_SETTINGS = {
  walkSpeed: 1.1,          // m/s
  turnSpeed: 4.0,          // rad/s
  noticeDistance: 2.4,     // se levanta a mirarte si te acercás
  happySeconds: 2.6,       // dura la alegría después de acariciarlo
  wanderEvery: 32,         // s entre paseos cuando no hay carne
  wanderDwell: 7,          // s olfateando en cada punto
  barkCooldown: 20,        // s entre ladridos por algo quemándose
};

const PET_LINES = [
  `${DOG_NAME} mueve la cola.`,
  `${DOG_NAME} te da la pata.`,
  `${DOG_NAME} se tira panza arriba... casi.`,
  `${DOG_NAME} te mira esperando un pedacito de chorizo.`,
  `${DOG_NAME} te apoya la cabeza en la rodilla.`,
];

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
/** Ángulo para Three.js: con rotation.y = yaw, el +z local apunta hacia (sin yaw, cos yaw). */
export const yawTo = (from: Vec2, to: Vec2) => Math.atan2(to.x - from.x, to.z - from.z);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Recorrido entre dos lugares conocidos, siempre pasando por el costado de la parrilla. */
export function dogRoute(from: Vec2, to: Vec2): Vec2[] {
  const beg = DOG_SPOTS.beg;
  if(dist(from, beg) < 0.3 || dist(to, beg) < 0.3) return [{ ...to }];
  return [{ ...beg }, { ...to }];
}

export class DogBrain {
  pos: Vec2 = { ...DOG_SPOTS.rest };
  yaw = 0.3;
  state: DogState = 'echado';
  /** Hacia dónde mira la cabeza (puede ser distinto del cuerpo). */
  lookAt: Vec2 | null = null;
  /** Ganas de mover la cola: 0 quieto, 1 a full. */
  wag = 0;
  private path: Vec2[] = [];
  private goal: 'rest' | 'beg' | 'wander' = 'rest';
  private time = 0;
  private happy = 0;
  private wanderClock = DOG_SETTINGS.wanderEvery * 0.5;
  private dwell = 0;
  private wanderIndex = 0;
  private lastBark = -Infinity;
  private announcedBeg = false;

  get moving(): boolean { return this.path.length > 0; }

  /** Acariciar: responde aunque esté caminando. Devuelve el mensaje para el HUD. */
  pet(player: Vec2, burning = false): string {
    this.happy = DOG_SETTINGS.happySeconds;
    this.lookAt = { ...player };
    if(burning) return `${DOG_NAME} se deja acariciar, pero mira la parrilla: algo se está quemando.`;
    return PET_LINES[Math.floor(this.time * 7) % PET_LINES.length];
  }

  private goTo(goal: 'rest' | 'beg' | 'wander', target: Vec2): void {
    this.goal = goal;
    this.path = dogRoute(this.pos, target);
  }

  tick(input: DogInput): DogEvent[] {
    const { dt } = input;
    const events: DogEvent[] = [];
    this.time += dt;

    // Reacción del entorno: si algo se quema, ladra (sin repetirse cada segundo).
    if(input.burning && this.time - this.lastBark >= DOG_SETTINGS.barkCooldown) {
      this.lastBark = this.time;
      events.push({ kind: 'bark-burning', message: `${DOG_NAME} ladra: ¡algo se está quemando!` });
    }

    // Elegir destino.
    const atGoalIdle = !this.moving;
    if(input.meatOnGrill && this.goal !== 'beg') this.goTo('beg', DOG_SPOTS.beg);
    else if(!input.meatOnGrill && this.goal === 'beg') { this.announcedBeg = false; this.goTo('rest', DOG_SPOTS.rest); }
    else if(!input.meatOnGrill && atGoalIdle) {
      if(this.goal === 'rest') {
        this.wanderClock -= dt;
        if(this.wanderClock <= 0) {
          const spot = DOG_SPOTS.wander[this.wanderIndex++ % DOG_SPOTS.wander.length];
          this.goTo('wander', spot);
          this.dwell = DOG_SETTINGS.wanderDwell;
        }
      } else if(this.goal === 'wander') {
        this.dwell -= dt;
        if(this.dwell <= 0) { this.wanderClock = DOG_SETTINGS.wanderEvery; this.goTo('rest', DOG_SPOTS.rest); }
      }
    }

    // Moverse por el recorrido.
    if(this.moving) {
      const next = this.path[0];
      const d = dist(this.pos, next);
      const step = DOG_SETTINGS.walkSpeed * dt;
      this.turnToward(yawTo(this.pos, next), dt);
      if(d <= step) { this.pos = { ...next }; this.path.shift(); }
      else { this.pos.x += (next.x - this.pos.x) / d * step; this.pos.z += (next.z - this.pos.z) / d * step; }
      if(!this.moving && this.goal === 'beg' && !this.announcedBeg) {
        this.announcedBeg = true;
        events.push({ kind: 'sit-by-grill', message: `${DOG_NAME} se sentó al lado de la parrilla: huele el asado.` });
      }
    }

    // Estado y mirada.
    const nearPlayer = dist(this.pos, input.player) < DOG_SETTINGS.noticeDistance;
    if(this.happy > 0) {
      this.happy -= dt;
      this.state = 'contento';
      this.lookAt = { ...input.player };
      if(!this.moving) this.turnToward(yawTo(this.pos, input.player), dt);
      this.wag = 1;
    } else if(this.moving) {
      this.state = 'caminando';
      this.lookAt = null;
      this.wag = 0.35;
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
    return events;
  }

  private turnToward(target: number, dt: number): void {
    const diff = wrap(target - this.yaw);
    const max = DOG_SETTINGS.turnSpeed * dt;
    this.yaw = wrap(this.yaw + Math.max(-max, Math.min(max, diff)));
  }
}
