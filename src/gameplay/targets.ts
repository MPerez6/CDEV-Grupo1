export type TargetKind = 'fuel-coal' | 'fuel-small-wood' | 'fuel-large-wood' | 'tinder' | 'brazier' | 'tinder-pad' | 'tray' | 'grill-cell' | 'meat' | 'board';

export type PokerAim = {
  dirX: number;
  dirZ: number;
  pitchDown: number;
};

export type InteractionTarget = {
  kind: TargetKind;
  index?: number;
  meatId?: number;
  emberPointM?: { x: number; z: number };
  pokerAim?: PokerAim;
};
