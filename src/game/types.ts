export type Screen = 'home' | 'modes' | 'build' | 'game' | 'settings';
export type GameMode = 'practice' | 'bot' | 'marathon' | 'gauntlet';
export type Phase = 'plan' | 'combat' | 'result';
export type Difficulty = 'normal' | 'hard' | 'mythic';
export type CombatSpeed = 1 | 2 | 4;

export interface ShopOffer {
  hid: string;
  star: 1 | 2;
}

export interface Unit {
  u: string;
  hid: string;
  star: 1 | 2 | 3;
  relics: string[];
  r?: number;
  c?: number;
  boss?: boolean;
  /** Encounter kit id for boss casts (aoe / buff / debuff). */
  bossKit?: string;
  scaleHp?: number;
  scaleAtk?: number;
}

export interface Selection {
  u: string;
  from: 'bench' | 'board';
}

export interface BossRewardGrant {
  gold: number;
  freeRerolls: number;
  relic: boolean;
}

export interface GameState {
  mode: GameMode;
  matchRounds: number;
  heroHpMul: number;
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
  foeBench: Unit[];
  foeGold: number;
  foeDraft: string[];
  foeShop: (ShopOffer | null)[];
  shop: (ShopOffer | null)[];
  freeRerolls: number;
  sel: Selection | null;
  speed: number;
  phase: Phase;
  log: string;
  lastResult: { win: boolean; dmg: number; boss?: boolean } | null;
  /** Gauntlet-only: remaining lives (starts at 3). */
  gauntletLives?: number;
  /** Gold deducted at the start of the next shop phase after a boss loss. */
  gauntletGoldPenalty?: number;
  /** Bosses defeated this run (score). */
  gauntletRoundsCleared?: number;
}

export type FloaterVariant = 'damage' | 'crit' | 'heal' | 'death' | 'info';

export interface Floater {
  k: string;
  r: number;
  c: number;
  text: string;
  color: string;
  size: string;
  variant: FloaterVariant;
  /** Horizontal offset as fraction of cell width (±15%). */
  jitter: number;
  t: number;
}

export type CombatFxKind = 'phys' | 'magic' | 'crit' | 'true' | 'cast';

export interface CombatFx {
  k: string;
  kind: CombatFxKind;
  hid: string;
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  melee: boolean;
  t: number;
}

export type CombatFxPayload = Omit<CombatFx, 'k' | 't'>;

export type OverlayKind =
  | {
      kind: 'result';
      win: boolean;
      dmg: number;
      offer: boolean;
      boss?: { name: string; period: number; reward?: BossRewardGrant };
    }
  | { kind: 'relic'; picks: string[] }
  | { kind: 'bind'; rid: string }
  | { kind: 'spar'; win: boolean }
  | { kind: 'over'; win: boolean; unlocked?: string[]; unlockedBattlegrounds?: string[] };

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
  /** Melee heroes only attack adjacent; ranged heroes only attack at range. */
  melee: boolean;
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
  /** Outgoing damage bonus (Taniwha), and the seconds left on it. */
  dmgBuff?: number;
  dmgBuffT?: number;
  /** Grid footprint in cells (1 = normal, 4 = multi-tile boss). */
  footprint?: number;
  boss?: boolean;
  bossKit?: string;
  /** Incoming damage multiplier vs this boss (set from trial difficulty). */
  bossTaken?: number;
  rooted?: boolean;
}

export interface ActiveTrait {
  name: string;
  count: number;
  lvl: number;
  label: string;
  glyph: string;
  desc: string;
  kind: 'trait' | 'class';
}
