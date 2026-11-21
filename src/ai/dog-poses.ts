/**
 * Poses del perro: ángulos de cada articulación para cada estado/acción. Lógica pura (sin Three.js)
 * para poder probarla. Los ángulos de las patas son respecto del piso (la vista compensa la inclinación del cuerpo);
 * positivo = la pata va hacia atrás. `pitch` positivo baja el frente; `headTilt` positivo baja el hocico.
 */
import type { DogAction, DogState } from './dog-brain.ts';

export type DogPose = {
  y: number; pitch: number; roll: number;
  neck: number; headTilt: number; headRoll: number; headYaw: number; jaw: number;
  /** Delanteras y traseras: [izquierda, derecha] para poder levantar una sola. */
  fu: [number, number]; fl: [number, number]; bu: [number, number]; bl: [number, number];
  tail: number; tailCurl: number; ears: number; extraYaw: number;
};

const base = (): DogPose => ({
  y: 0.4, pitch: 0, roll: 0, neck: 0.6, headTilt: 0.08, headRoll: 0, headYaw: 0, jaw: 0,
  fu: [0, 0], fl: [0, 0], bu: [-0.3, -0.3], bl: [0.55, 0.55], tail: -0.6, tailCurl: -0.22, ears: 0, extraYaw: 0,
});
const both = (v: number): [number, number] => [v, v];

export const STAND: DogPose = base();
export const LYING: DogPose = {
  ...base(), y: 0.12, neck: 0.35, headTilt: 0.05, fu: both(-1.5), fl: both(0.05), bu: both(-1.3), bl: both(2.5),
  tail: -1.55, tailCurl: 0.08,
};
export const SITTING: DogPose = {
  ...base(), y: 0.27, pitch: -0.75, neck: 0.4, headTilt: 0.05, bu: both(-1.45), bl: both(2.65), tail: -1.5, tailCurl: 0.12,
};

/** Pose objetivo según el estado y la acción en curso; `t` = segundos desde que empezó la acción. */
export function dogPose(state: DogState, action: DogAction | null, t: number, wagging: number): DogPose {
  const sway = Math.sin(t * 6);
  switch(action) {
    case 'pata': {
      const p = { ...SITTING, fu: [0, -1.15 + 0.15 * Math.sin(t * 7)] as [number, number], fl: [0, 0.35] as [number, number] };
      return { ...p, headTilt: -0.15, headRoll: 0.18 };
    }
    case 'panza': {
      const k = Math.min(1, t / 0.6);
      const wiggle = 0.25 * Math.sin(t * 9);
      return { ...LYING, y: 0.15, roll: 2.55 * k, fu: both(-0.6 + wiggle), fl: both(0.9), bu: both(-0.8 - wiggle), bl: both(1.2),
        neck: 0.25, headTilt: 0.25, tail: -1.3 + wiggle, jaw: 0.25 };
    }
    case 'cabeza':
      return { ...SITTING, neck: 1.0, headTilt: 0.25, headRoll: 0.3 * Math.sin(t * 1.5), ears: 0.4 };
    case 'mendigar':
      return { ...SITTING, y: 0.31, pitch: -1.05, fu: both(-0.95), fl: both(1.6), neck: 0.3, headTilt: -0.35,
        headRoll: 0.22 * Math.sin(t * 1.3), jaw: 0.12 + 0.06 * Math.sin(t * 3) };
    case 'vuelta':
      return { ...gait(STAND, t * 12, 1.6), extraYaw: Math.min(1, t / 1.6) * Math.PI * 2, tail: -1.0, ears: 0.3 };
    case 'cola': {
      // Reverencia de juego: el frente baja y rebota, la cola a full.
      const bow = 0.5 + 0.5 * Math.sin(t * 5);
      return { ...STAND, y: 0.34 + 0.03 * bow, pitch: 0.38, fu: both(-0.95), fl: both(0.95), neck: 0.45, headTilt: -0.25,
        roll: 0.06 * sway, tail: -1.05, jaw: 0.2 };
    }
    case 'ladrar': {
      const pulse = Math.max(0, Math.sin(t * 13));
      return { ...STAND, pitch: 0.06 * pulse, neck: 0.75 + 0.12 * pulse, headTilt: -0.2, jaw: 0.6 * pulse, ears: 0.5 * pulse, tail: -0.9 };
    }
    case 'saltar': {
      const up = Math.min(1, t / 0.5), grab = t > 0.6 && t < 1.1 ? Math.sin((t - 0.6) / 0.5 * Math.PI) : 0;
      return { ...STAND, y: 0.4 + 0.24 * up, pitch: -1.2 * up, fu: both(-0.9 * up), fl: both(0.5 * up), bu: both(0), bl: both(0.15),
        neck: 0.45, headTilt: 0.2 + 0.6 * grab, jaw: 0.5 * grab, tail: -0.9 };
    }
    case 'atrapar': {
      const snap = Math.sin(Math.min(1, t / 0.7) * Math.PI);
      return { ...STAND, neck: 0.8, headTilt: -0.3 + 0.5 * snap, jaw: 0.55 * (1 - Math.min(1, t / 0.35)) };
    }
    case 'comer':
      return { ...LYING, neck: 0.95, headTilt: 0.75 + 0.08 * Math.sin(t * 9), jaw: 0.18 * Math.abs(Math.sin(t * 9)), headYaw: 0.15 * Math.sin(t * 2) };
    case 'olfatear':
      return { ...STAND, neck: 1.25, headTilt: 0.55, headYaw: 0.45 * Math.sin(t * 3.2), tail: -0.35 };
    case 'culpa':
      return { ...LYING, neck: 0.15, headTilt: 0.35, ears: 1.0, tail: -1.7, tailCurl: 0 };
    default:
      break;
  }
  if(state === 'echado') return LYING;
  if(state === 'pidiendo' || state === 'contento') return { ...SITTING, headRoll: state === 'contento' ? 0.25 * Math.sin(t * 3) : 0 };
  void wagging;
  return STAND;
}

/** Paso al caminar/trotar/correr: patas en diagonal, rodillas que se doblan al avanzar, cuerpo que sube y baja. */
export function gait(pose: DogPose, phase: number, speed: number): DogPose {
  if(speed <= 0) return pose;
  const a = Math.min(0.85, 0.32 + speed * 0.2);
  const swing = (p: number) => Math.sin(p) * a;
  const lift = (p: number) => Math.max(0, -Math.cos(p)) * a * 1.3;
  const legs = [0, Math.PI]; // diagonales: delantera izq. con trasera der.
  return {
    ...pose,
    y: pose.y + Math.abs(Math.sin(phase)) * 0.012 * Math.min(2, speed),
    pitch: pose.pitch + Math.sin(phase * 2) * 0.03,
    fu: [pose.fu[0] - swing(phase + legs[0]), pose.fu[1] - swing(phase + legs[1])],
    fl: [pose.fl[0] + lift(phase + legs[0]), pose.fl[1] + lift(phase + legs[1])],
    bu: [pose.bu[0] - swing(phase + legs[1]), pose.bu[1] - swing(phase + legs[0])],
    bl: [pose.bl[0] + lift(phase + legs[1]) * 0.8, pose.bl[1] + lift(phase + legs[0]) * 0.8],
    ears: pose.ears + Math.sin(phase) * 0.25,
  };
}

/** Mezcla suave de una pose hacia otra (k = 0..1). */
export function blendPose(from: DogPose, to: DogPose, k: number): DogPose {
  const mix = (a: number, b: number) => a + (b - a) * k;
  const pair = (a: [number, number], b: [number, number]): [number, number] => [mix(a[0], b[0]), mix(a[1], b[1])];
  return {
    y: mix(from.y, to.y), pitch: mix(from.pitch, to.pitch), roll: mix(from.roll, to.roll), neck: mix(from.neck, to.neck),
    headTilt: mix(from.headTilt, to.headTilt), headRoll: mix(from.headRoll, to.headRoll), headYaw: mix(from.headYaw, to.headYaw),
    jaw: mix(from.jaw, to.jaw), fu: pair(from.fu, to.fu), fl: pair(from.fl, to.fl), bu: pair(from.bu, to.bu), bl: pair(from.bl, to.bl),
    tail: mix(from.tail, to.tail), tailCurl: mix(from.tailCurl, to.tailCurl), ears: mix(from.ears, to.ears),
    // El giro de "vuelta" no se suaviza: si no, al terminar desandaría la vuelta.
    extraYaw: to.extraYaw,
  };
}
