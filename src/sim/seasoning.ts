export const SEASONINGS = ['salt', 'chimichurri', 'brine'] as const;
export type Seasoning = typeof SEASONINGS[number];

export const SEASONING_LABELS: Readonly<Record<Seasoning, string>> = {
  salt: 'Sal gruesa',
  chimichurri: 'Chimichurri',
  brine: 'Salmuera',
};
