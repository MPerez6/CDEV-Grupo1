import type { Point2 } from './meatCatalog.ts';
import type { Side } from './meat.ts';

export const SEASONINGS = ['salt', 'chimichurri', 'brine', 'pepper'] as const;
export type Seasoning = typeof SEASONINGS[number];
export type SeasoningGrain = { kind: Seasoning; point: Point2; origin: Point2; face: Side; seed: number };

export const SEASONING_LABELS: Readonly<Record<Seasoning, string>> = {
  salt: 'Sal gruesa',
  chimichurri: 'Chimichurri',
  brine: 'Salmuera',
  pepper: 'Pimienta',
};
