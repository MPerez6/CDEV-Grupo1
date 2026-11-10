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
  const maxBurn = Math.max(meat.burn.a, meat.burn.b, meat.casingDamage.a, meat.casingDamage.b);
  if(maxBurn >= P.burnedThreshold || meat.state === 'burned') return { label: 'Quemada', tone: 'over' };
  if(meat.state === 'dry') return { label: 'Pasada y seca', tone: 'over' };

  const minBrown = Math.min(meat.brown.a, meat.brown.b);
  const avgBrown = (meat.brown.a + meat.brown.b) * 0.5;
  const c = meat.centerC;

  if(meat.definition.precooked) {
    if(c >= 55 && avgBrown >= 15) return { label: '¡Lista! Caliente y dorada', tone: 'ready' };
    if(meat.hasReceivedGrillHeat) return { label: 'Calentándose', tone: 'progress' };
    return { label: 'Precocida: calentala', tone: 'raw' };
  }

  if(meat.definition.geometry === 'cylinder') {
    if(c >= 68 && minBrown >= CONFIG.meatBrowningMin * 0.8) return { label: '¡A punto! Dorado parejo', tone: 'ready' };
    if(c >= 45 || avgBrown >= 12) return { label: 'Haciéndose', tone: 'progress' };
    return { label: 'Crudo', tone: 'raw' };
  }

  // Cortes vacunos planos: mostramos el punto gastronómico para las comandas de clientes
  if(c >= 74.5 && avgBrown >= 25) return { label: 'Bien cocido', tone: 'ready' };
  if(c >= 68 && minBrown >= CONFIG.meatBrowningMin) return { label: '¡A punto!', tone: 'ready' };
  if(c >= 58 && avgBrown >= 20) return { label: 'Jugoso', tone: 'ready' };
  if(c >= P.undercookedCenterC || avgBrown >= 10) return { label: 'Le falta cocción', tone: 'progress' };
  return { label: 'Cruda', tone: 'raw' };
}

function hint(meat: MeatModel, carried: boolean): string {
  if(carried) return 'Clic en la parrilla para apoyar, o en el plato de un cliente para servir.';
  if(meat.location === 'board') return 'Agarrala con la pinza (3 + E) y llevala a la parrilla.';
  if(meat.state === 'burned') return 'Ya se quemó: sacala de la parrilla.';
  if(meat.objectiveAchieved || (meat.centerC >= 58 && (meat.brown.a + meat.brown.b) >= 45))
    return 'Lista para servir: levantala con la pinza (E) y llevala al plato del cliente.';
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
