import * as THREE from 'three';
import type { SmokeLevel } from './smoke-sources.ts';

/** Tiro de la campana: el humo que sube se curva hacia la boca de la chimenea. */
export interface SmokeDraft { x: number; z: number; fromY: number; strength: number }

/** Boca de la chimenea del asador (ver la campana en level/asador.ts). */
export const HOOD_DRAFT: SmokeDraft = { x: -1.0, z: -5.0, fromY: 2.2, strength: 1.4 };

export interface SmokeSystemOptions {
  capacity: number;
  /** Partículas por segundo con `amount = 1`. */
  maxRate: number;
  /** Vida en segundos reales. */
  life: number;
  /** Diámetro al nacer y al morir (m). */
  size: [number, number];
  /** Velocidad de ascenso (m/s). */
  rise: number;
  /** Radio horizontal de nacimiento (m). */
  spread: number;
  /** Opacidad máxima de una partícula. */
  opacity: number;
  draft?: SmokeDraft;
  /** Altura donde el humo ya se disipó por completo. */
  ceilingY?: number;
  /** Colores claro y oscuro (por defecto, humo gris). Sirve también para el vaho verdoso de la basura. */
  colors?: [number, number];
}

interface Particle {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  size0: number;
  size1: number;
  peak: number;
  spin: number;
}

const LIGHT_SMOKE = new THREE.Color(0xd8d6d1);
const DARK_SMOKE = new THREE.Color(0x3b3734);
const FADE_IN = 0.14;

let sharedTexture: THREE.Texture | null | undefined;
/** Mancha blanda con bordes irregulares, generada una vez (sin archivos externos). */
function smokeTexture(): THREE.Texture | null {
  if(sharedTexture !== undefined) return sharedTexture;
  if(typeof document === 'undefined') { sharedTexture = null; return null; }
  const size = 128, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if(!ctx) { sharedTexture = null; return null; }
  // Varias manchas radiales superpuestas dan un borde orgánico en vez de un disco perfecto.
  for(let i = 0;i < 9;i++) {
    const angle = i * 2.39996, radius = i === 0 ? 0 : 14 + (i % 3) * 7;
    const cx = size / 2 + Math.cos(angle) * radius, cy = size / 2 + Math.sin(angle) * radius;
    const r = i === 0 ? 58 : 30 + (i % 4) * 6;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${i === 0 ? 0.42 : 0.2})`);
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  sharedTexture = texture;
  return texture;
}

/**
 * Pool de sprites de humo en coordenadas de mundo. Solo representa: lee niveles de humo
 * ya calculados y nunca toca la simulación.
 */
export function createSmokeSystem(scene: THREE.Scene, options: SmokeSystemOptions) {
  const group = new THREE.Group();
  group.name = 'smoke';
  scene.add(group);
  const free: Particle[] = [];
  const alive: Particle[] = [];
  const accumulators = new Map<string, number>();
  let created = 0;
  const light = new THREE.Color(options.colors?.[0] ?? LIGHT_SMOKE.getHex());
  const dark = new THREE.Color(options.colors?.[1] ?? DARK_SMOKE.getHex());

  function acquire(): Particle | null {
    const reused = free.pop();
    if(reused) return reused;
    if(created >= options.capacity) return null;
    created++;
    const material = new THREE.SpriteMaterial({
      map: smokeTexture(), color: LIGHT_SMOKE.clone(), transparent: true, opacity: 0, depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 3;
    group.add(sprite);
    return { sprite, material, velocity: new THREE.Vector3(), age: 0, life: 1, size0: 0, size1: 0, peak: 0, spin: 0 };
  }

  function spawn(origin: THREE.Vector3, level: SmokeLevel): void {
    const p = acquire();
    if(!p) return;
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * options.spread;
    p.sprite.position.set(origin.x + Math.cos(a) * r, origin.y, origin.z + Math.sin(a) * r);
    p.velocity.set((Math.random() - 0.5) * 0.08, options.rise * (0.75 + Math.random() * 0.5), (Math.random() - 0.5) * 0.08);
    p.age = 0;
    p.life = options.life * (0.8 + Math.random() * 0.4);
    // El humo oscuro de quemado es más grande y denso.
    p.size0 = options.size[0] * (0.8 + Math.random() * 0.4);
    p.size1 = options.size[1] * (0.85 + Math.random() * 0.3) * (1 + level.darkness * 0.35);
    p.peak = options.opacity * (0.6 + 0.4 * level.amount) * (1 + level.darkness * 0.5);
    p.spin = (Math.random() - 0.5) * 0.6;
    p.material.rotation = Math.random() * Math.PI * 2;
    p.material.color.copy(light).lerp(dark, level.darkness);
    p.sprite.visible = true;
    p.sprite.scale.setScalar(p.size0);
    alive.push(p);
  }

  return {
    group,
    /** Emite desde `origin` según el nivel; `key` separa los acumuladores de cada fuente. */
    emit(key: string, origin: THREE.Vector3, level: SmokeLevel, dt: number): void {
      if(level.amount <= 0 || dt <= 0) { accumulators.delete(key); return; }
      let pending = (accumulators.get(key) ?? Math.random()) + level.amount * options.maxRate * dt;
      while(pending >= 1) { spawn(origin, level); pending -= 1; }
      accumulators.set(key, pending);
    },
    update(dt: number, elapsedReal: number): void {
      if(dt <= 0) return;
      const draft = options.draft;
      for(let i = alive.length - 1;i >= 0;i--) {
        const p = alive[i];
        p.age += dt;
        const t = p.age / p.life;
        const y = p.sprite.position.y;
        if(t >= 1 || (options.ceilingY !== undefined && y > options.ceilingY)) {
          p.sprite.visible = false; p.material.opacity = 0;
          alive.splice(i, 1); free.push(p);
          continue;
        }
        // Brisa suave del patio y turbulencia: cada partícula ondula distinto.
        p.velocity.x += Math.sin(elapsedReal * 1.3 + p.life * 7) * 0.16 * dt;
        p.velocity.z += Math.cos(elapsedReal * 1.1 + p.life * 5) * 0.12 * dt;
        if(draft && y > draft.fromY) {
          const pull = draft.strength * Math.min(1, (y - draft.fromY) / 0.6) * dt;
          p.velocity.x += (draft.x - p.sprite.position.x) * pull;
          p.velocity.z += (draft.z - p.sprite.position.z) * pull;
        }
        // Solo se frena lo horizontal: el humo caliente sigue subiendo a ritmo casi constante.
        const drag = 1 - 0.6 * dt;
        p.velocity.x *= drag; p.velocity.z *= drag;
        p.sprite.position.addScaledVector(p.velocity, dt);
        p.sprite.scale.setScalar(p.size0 + (p.size1 - p.size0) * Math.sqrt(t));
        p.material.rotation += p.spin * dt;
        let fade = t < FADE_IN ? t / FADE_IN : Math.pow((1 - t) / (1 - FADE_IN), 1.4);
        // Se disipa al entrar al conducto en vez de cortarse de golpe contra la campana.
        if(options.ceilingY !== undefined) fade *= Math.min(1, Math.max(0, (options.ceilingY - y) / 0.7));
        p.material.opacity = p.peak * fade;
      }
    },
    /** Partículas vivas (para pruebas y diagnóstico). */
    get activeCount(): number { return alive.length; },
    clear(): void {
      for(const p of alive) { p.sprite.visible = false; p.material.opacity = 0; free.push(p); }
      alive.length = 0; accumulators.clear();
    },
  };
}

export type SmokeSystem = ReturnType<typeof createSmokeSystem>;
