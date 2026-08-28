export type Screen = 'home' | 'modes' | 'build' | 'game';
export type GameMode = 'practice' | 'bot';
export type Phase = 'plan' | 'combat' | 'result';

export interface Unit {
  u: string;
  hid: string;
  star: 1 | 2 | 3;
  relics: string[];
  r?: number;
  c?: number;
}

export interface Selection {
  u: string;
  from: 'bench' | 'board';
}

export interface GameState {
  mode: GameMode;
  round: number;
  gold: number;
  myHp: number;
  foeHp: number;
  maxHp: number;
  lossStreak: number;
  foeLossStreak: number;
  bench: Unit[];
  board: Unit[];
  foe: Unit[];
  shop: (string | null)[];
  sel: Selection | null;
  speed: number;
  phase: Phase;
  log: string;
  lastResult: { win: boolean; dmg: number } | null;
}

export interface Floater {
  k: string;
  r: number;
  c: number;
  text: string;
  color: string;
  size: string;
  t: number;
}

export type OverlayKind =
  | { kind: 'result'; win: boolean; dmg: number; offer: boolean }
  | { kind: 'relic'; picks: string[] }
  | { kind: 'bind'; rid: string }
  | { kind: 'spar'; win: boolean }
  | { kind: 'over'; win: boolean };

export interface SheetHero {
  kind: 'hero';
  hid: string;
  star: number;
  relics: string[];
  side: 'me' | 'foe';
}

export interface SheetTraits {
  kind: 'traits';
}

export type SheetState = SheetHero | SheetTraits | null;

export interface Combatant {
  u: string;
  hid: string;
  star: number;
  side: 'me' | 'foe';
  r: number;
  c: number;
  glyph: string;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  as: number;
  range: number;
  crit: number;
  critDmg: number;
  mana: number;
  startMana: number;
  sp: number;
  dr: number;
  lifesteal: number;
  shield: number;
  amp: number;
  stun: number;
  silence: number;
  snare: number;
  burn: number;
  burnT: number;
  scorch?: number;
  cd: number;
  mv: number;
  alive: boolean;
  cast2: boolean;
  buffT?: number;
  buffAs?: number;
  dmgBuff?: number;
}

export interface ActiveTrait {
  name: string;
  count: number;
  lvl: number;
  label: string;
  glyph: string;
  desc: string;
}
