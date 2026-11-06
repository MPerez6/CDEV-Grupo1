import { CONFIG } from '../sim/parameters.ts';
import { MEAT_THERMAL as P } from '../sim/meatCatalog.ts';
import type { MeatModel } from '../sim/meat.ts';

/**
 * Ficha de cocción (UI): traduce el estado que ya calcula la simulación a lenguaje de asador.
 * Solo lee la carne; no modifica la simulación. Función pura para poder probarla sin DOM.
 */
export type Tone = 'raw' | 'progress' | 'ready' | 'over';
export type FaceView = { name: string; down: boolean; label: string; tone: Tone };
export type MeatCard = {
  name: string;
  place: string;
  doneness: string;
  tone: Tone;
  /** 0 a 1: cuánto le falta al centro para llegar al objetivo. */
  progress: number;
  center: string;
  faces: FaceView[];
  hint: string;
};

const START_C = 5;
const REHEAT_C = 60; // referencia visual para la morcilla precocida (sin objetivo definido en la simulación)

export function faceLabel(brown: number, burn: number): { label: string; tone: Tone } {
  if(burn >= P.burnedThreshold) return { label: 'Quemada', tone: 'over' };
  if(burn >= P.objectiveMaxBurn) return { label: 'Empieza a quemarse', tone: 'over' };
  if(brown > CONFIG.meatBrowningMax) return { label: 'Muy tostada', tone: 'over' };
  if(brown >= CONFIG.meatBrowningMin) return { label: 'Dorada', tone: 'ready' };
  if(brown >= 8) return { label: 'Tomando color', tone: 'progress' };
  return { label: 'Cruda', tone: 'raw' };
}

function doneness(meat: MeatModel): { label: string; tone: Tone } {
  if(meat.objectiveAchieved) return { label: '¡A punto! Sacala', tone: 'ready' };
  switch(meat.state) {
    case 'burned': return { label: 'Quemada', tone: 'over' };
    case 'dry': return { label: 'Pasada y seca', tone: 'over' };
    case 'cooked': return { label: 'Cocida', tone: 'ready' };
    case 'undercooked': return { label: 'Le falta', tone: 'progress' };
    case 'precooked': return { label: 'Precocida: calentala', tone: 'raw' };
    case 'reheating': return { label: 'Calentándose', tone: 'progress' };
    default: return { label: 'Cruda', tone: 'raw' };
  }
}

function hint(meat: MeatModel, carried: boolean): string {
  if(carried) return 'Clic sobre un sector con brasas para apoyarla.';
  if(meat.location === 'board') return 'Agarrala con la pinza (3 + E) y llevala a la parrilla.';
  if(meat.state === 'burned') return 'Ya se quemó: sacala de la parrilla.';
  if(meat.objectiveAchieved) return 'Está en su punto: levantala con la pinza (E).';
  const down = meat.faceDown, up = down === 'a' ? 'b' : 'a';
  const turnKey = meat.definition.geometry === 'cylinder' ? 'rodala (R)' : 'dala vuelta (R)';
  if(meat.burn[down] >= 5) return `Se está quemando abajo: ${turnKey} o pasala a menos fuego.`;
  if(meat.brown[down] >= CONFIG.meatBrowningMin && meat.brown[up] < CONFIG.meatBrowningMin) return `La cara de abajo ya doró: ${turnKey}.`;
  if(meat.state === 'dry') return 'Se está secando: sacala ya.';
  return 'Dejala hacer y mirá cómo dora la cara de abajo.';
}

export function describeMeat(meat: MeatModel, carried = false): MeatCard {
  const target = meat.definition.target;
  const goalC = target ? target.minC : REHEAT_C;
  const progress = Math.min(1, Math.max(0, (meat.centerC - START_C) / (goalC - START_C)));
  const range = target ? `objetivo ${target.minC}${target.maxC === null ? '+' : `–${target.maxC}`} °C` : 'precocida';
  const cyl = meat.definition.geometry === 'cylinder';
  const faces = (['a', 'b'] as const).map(side => {
    const f = faceLabel(meat.brown[side], Math.max(meat.burn[side], meat.casingDamage[side]));
    return { name: cyl ? (side === 'a' ? 'Lado 1' : 'Lado 2') : (side === 'a' ? 'Cara A' : 'Cara B'), down: meat.onGrill && meat.faceDown === side, ...f };
  });
  const d = doneness(meat);
  return {
    name: meat.definition.name,
    place: carried ? 'En la pinza' : meat.location === 'grill' ? 'En la parrilla' : 'En la tabla',
    doneness: d.label,
    tone: d.tone,
    progress,
    center: `Centro ≈ ${Math.round(meat.centerC)} °C · ${range}`,
    faces,
    hint: hint(meat, carried),
  };
}
