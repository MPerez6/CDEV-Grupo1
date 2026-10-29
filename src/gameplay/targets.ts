export type TargetKind = 'fuel-coal' | 'fuel-small-wood' | 'fuel-large-wood' | 'tinder' | 'brazier' | 'tinder-pad' | 'tray' | 'grill-cell' | 'meat' | 'board';

export type InteractionTarget = { kind: TargetKind; index?: number; meatId?: number };
