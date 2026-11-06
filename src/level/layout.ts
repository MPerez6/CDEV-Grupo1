import * as THREE from 'three';
export const PREP_TABLE_BOUNDS = { x0: 2.25, x1: 6.85, z0: -4.85, z1: -1.95 };
export function boardPosition(slot: number): THREE.Vector3 {
  return new THREE.Vector3(3.0 + slot % 3 * 1.5, 1.105, -2.45 - Math.floor(slot / 3) * 0.95);
}


export const GRILL_LAYOUT = { left: -1.3, front: -3.55, width: 2.6, depth: 2.0 };

// --- Ambientación del patio (propuesta rama escenario-patio). Solo decorado: no participa de la simulación. ---
/** Mesa familiar bajo la parra, a la izquierda. Centro y medidas de la tapa (m). */
export const FAMILY_TABLE = { x: -5.6, z: 0.4, width: 1.1, length: 2.4, top: 0.76 };
/** Límite de colisión de mesa + sillas. */
export const FAMILY_TABLE_BOUNDS = { x0: -6.95, x1: -4.25, z0: -0.95, z1: 1.75 };
/** Pérgola de la parra: esquinas de los postes y altura de la parra. */
export const PERGOLA = { x0: -7.3, x1: -4.0, z0: -1.6, z1: 2.6, height: 2.55 };
export const PERGOLA_POST_BOUNDS = [
  [PERGOLA.x0, PERGOLA.z0], [PERGOLA.x1, PERGOLA.z0], [PERGOLA.x0, PERGOLA.z1], [PERGOLA.x1, PERGOLA.z1],
].map(([x, z]) => ({ x0: x - 0.08, x1: x + 0.08, z0: z - 0.08, z1: z + 0.08 }));
/** Sillas de plástico apiladas contra la medianera izquierda. */
export const CHAIR_STACK = { x: -6.95, z: 3.75 };
export const CHAIR_STACK_BOUNDS = { x0: CHAIR_STACK.x - 0.32, x1: CHAIR_STACK.x + 0.32, z0: CHAIR_STACK.z - 0.32, z1: CHAIR_STACK.z + 0.32 };
/** Radio portátil sobre la cabecera de la mesa (fuente del audio espacial). */
export const RADIO_POSITION: [number, number, number] = [-5.6, 0.86, -0.55];
/** Fachada de la casa (detrás del punto de inicio). */
export const HOUSE_FACADE_Z = 4.95;
