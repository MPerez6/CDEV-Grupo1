import * as THREE from 'three';
import { MEAT_KINDS, type MeatKind } from '../sim/meatCatalog.ts';
import type { Point2 } from '../sim/meatCatalog.ts';
import type { MeatModel } from '../sim/meat.ts';
import { CONFIG } from '../sim/parameters.ts';

export const PREP_TABLE = { x: 3.23, z: -4.04, width: 2.18, depth: 1.36, top: 1.02 };
export const PREP_TABLE_BOUNDS = {
  x0: PREP_TABLE.x - PREP_TABLE.width / 2, x1: PREP_TABLE.x + PREP_TABLE.width / 2,
  z0: PREP_TABLE.z - PREP_TABLE.depth / 2, z1: PREP_TABLE.z + PREP_TABLE.depth / 2,
};
export const PREP_BOARD = { width: 1.72, depth: 0.94, thickness: 0.045 };
export function boardPosition(): THREE.Vector3 {
  return new THREE.Vector3(PREP_TABLE.x, PREP_TABLE.top + PREP_BOARD.thickness + 0.002, PREP_TABLE.z + 0.14);
}

export const FRIDGE = { x: 5.86, z: -4.48, width: 2.66, depth: 1.1, height: 2.44, shelves: [0.43, 1.08, 1.73] } as const;
export const FRIDGE_BOUNDS = {
  x0: FRIDGE.x - FRIDGE.width / 2, x1: FRIDGE.x + FRIDGE.width / 2,
  z0: FRIDGE.z - FRIDGE.depth / 2, z1: FRIDGE.z + FRIDGE.depth / 2,
};
export const FRIDGE_CUT_SCALE = 0.74;
export const BOARD_CUT_SCALE = 0.76;
export function fridgePosition(kind: MeatKind): THREE.Vector3 {
  const slot = MEAT_KINDS.indexOf(kind);
  return new THREE.Vector3(
    FRIDGE.x + (slot % 2 === 0 ? -0.635 : 0.635),
    FRIDGE.shelves[Math.floor(slot / 2)] + 0.012,
    FRIDGE.z + 0.035,
  );
}


export const GRILL_LAYOUT = { left: -1.3, front: -3.55, width: 2.6, depth: 2.0 };

const boardScaleX = BOARD_CUT_SCALE * GRILL_LAYOUT.width / CONFIG.grillWidthM;
const boardScaleZ = BOARD_CUT_SCALE * GRILL_LAYOUT.depth / CONFIG.grillDepthM;
export function boardMeatPosition(meat: MeatModel): THREE.Vector3 {
  const p = boardPosition(), cut = meat.portion;
  if (cut) {
    p.x += cut.boardCenterM.x * boardScaleX;
    p.z -= cut.boardCenterM.z * boardScaleZ;
  }
  return p;
}
export function boardToOriginal(meat: MeatModel, p: Point2): Point2 {
  const base = boardMeatPosition(meat), center = meat.portion?.centerM;
  return { x: (p.x - base.x) / boardScaleX + (center?.x ?? 0),
    z: (base.z - p.z) / boardScaleZ * (meat.faceDown === 'a' ? 1 : -1) + (center?.z ?? 0) };
}
export function originalToBoard(meat: MeatModel, p: Point2): Point2 {
  const base = boardMeatPosition(meat), center = meat.portion?.centerM;
  return { x: base.x + (p.x - (center?.x ?? 0)) * boardScaleX,
    z: base.z - (p.z - (center?.z ?? 0)) * boardScaleZ * (meat.faceDown === 'a' ? 1 : -1) };
}

// --- Ambientación del patio (propuesta rama escenario-patio). Solo decorado: no participa de la simulación. ---
/** Mesa familiar bajo la parra, a la izquierda. Centro y medidas de la tapa (m). */
export const FAMILY_TABLE = { x: -5.6, z: 0.4, width: 1.1, length: 2.4, top: 0.76 };
/** Límite de colisión de mesa + sillas (Modo Entrenamiento). */
export const FAMILY_TABLE_BOUNDS = { x0: -6.95, x1: -4.25, z0: -0.95, z1: 1.75 };
/** Límites de colisión de las 4 mesas individuales de restaurante (Modo Clientes). */
export const RESTAURANT_TABLE_BOUNDS = [
  { x0: -6.75, x1: -5.25, z0: -0.92, z1: 0.02 },
  { x0: -6.75, x1: -5.25, z0: 1.18, z1: 2.12 },
  { x0: -3.95, x1: -2.45, z0: -0.82, z1: 0.12 },
  { x0: -3.95, x1: -2.45, z0: 1.28, z1: 2.22 },
];
/** Pérgola de la parra: esquinas de los postes y altura de la parra. */
export const PERGOLA = { x0: -7.3, x1: -4.0, z0: -1.6, z1: 2.6, height: 2.55 };
export const PERGOLA_POST_BOUNDS = [
  [PERGOLA.x0, PERGOLA.z0], [PERGOLA.x1, PERGOLA.z0], [PERGOLA.x0, PERGOLA.z1], [PERGOLA.x1, PERGOLA.z1],
].map(([x, z]) => ({ x0: x - 0.08, x1: x + 0.08, z0: z - 0.08, z1: z + 0.08 }));
/** Sillas de plástico apiladas contra la medianera izquierda. */
export const CHAIR_STACK = { x: -6.95, z: 3.75 };
export const CHAIR_STACK_BOUNDS = { x0: CHAIR_STACK.x - 0.32, x1: CHAIR_STACK.x + 0.32, z0: CHAIR_STACK.z - 0.32, z1: CHAIR_STACK.z + 0.32 };
/** Árbol del patio con su cantero circular de ladrillo. */
export const PATIO_TREE = { x: -5.85, z: -4.85, radius: 0.72 };
export const PATIO_TREE_BOUNDS = {
  x0: PATIO_TREE.x - PATIO_TREE.radius,
  x1: PATIO_TREE.x + PATIO_TREE.radius,
  z0: PATIO_TREE.z - PATIO_TREE.radius,
  z1: PATIO_TREE.z + PATIO_TREE.radius,
};
/** Radio portátil sobre la cabecera de la mesa (fuente del audio espacial). */
export const RADIO_POSITION: [number, number, number] = [-5.6, 0.86, -0.55];
/** Fachada de la casa (detrás del punto de inicio). */
export const HOUSE_FACADE_Z = 4.95;
