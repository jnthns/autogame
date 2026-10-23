import type { ProgressState } from './progress';
import type { TraitName } from './traits';

export type BattlegroundUnlock =
  | { kind: 'always' }
  | { kind: 'wins'; n: number }
  | { kind: 'botMatches'; n: number }
  | { kind: 'trait'; trait: TraitName; n: number };

export type BattlegroundGroup = 'Starter' | 'Match Play' | 'Victories' | 'Synergies' | 'Mastery';

export type BattlegroundMotif =
  | 'dunes'
  | 'waves'
  | 'grove'
  | 'split'
  | 'web'
  | 'coil'
  | 'cliffs'
  | 'deep'
  | 'flames'
  | 'pyramid';

/** Flat art colours: sky→ground gradient, one motif fill, sun/moon/highlight glow. */
export interface BattlegroundPalette {
  sky: string;
  ground: string;
  motif: string;
  glow: string;
}

export interface BattlegroundDef {
  id: string;
  name: string;
  theme: string;
  group: BattlegroundGroup;
  unlock: BattlegroundUnlock;
  motif: BattlegroundMotif;
  light: BattlegroundPalette;
  dark: BattlegroundPalette;
}

export const BATTLEGROUNDS: BattlegroundDef[] = [
  {
    id: 'plain',
    name: 'Training Sands',
    theme: 'Neutral yard',
    group: 'Starter',
    unlock: { kind: 'always' },
    motif: 'dunes',
    light: { sky: '#E9DDBD', ground: '#DCCBA2', motif: '#D1BE90', glow: '#F1E5C4' },
    dark: { sky: '#2B251B', ground: '#342C1F', motif: '#3E3424', glow: '#43372A' },
  },
  {
    id: 'tide',
    name: 'Tide Ward',
    theme: 'Inspired by Taniwha',
    group: 'Starter',
    unlock: { kind: 'always' },
    motif: 'waves',
    light: { sky: '#D5E5E1', ground: '#BDD6D1', motif: '#ABCAC4', glow: '#E4EFEB' },
    dark: { sky: '#10252D', ground: '#153038', motif: '#1B3B43', glow: '#23474F' },
  },
  {
    id: 'foxfire',
    name: 'Foxfire Grove',
    theme: 'Inspired by Kitsune',
    group: 'Starter',
    unlock: { kind: 'always' },
    motif: 'grove',
    light: { sky: '#EEDCCB', ground: '#DFC8B3', motif: '#D1B69E', glow: '#F6E6CF' },
    dark: { sky: '#1C1720', ground: '#241C26', motif: '#2E2330', glow: '#3F2A22' },
  },
  {
    id: 'storm',
    name: 'Split Sky',
    theme: 'Inspired by Thunderbird',
    group: 'Match Play',
    unlock: { kind: 'botMatches', n: 5 },
    motif: 'split',
    light: { sky: '#D7DDEC', ground: '#C6CEE2', motif: '#B7C1DA', glow: '#E6EAF4' },
    dark: { sky: '#131A2F', ground: '#18213A', motif: '#202B48', glow: '#2D3B5F' },
  },
  {
    id: 'web',
    name: 'Web Hollow',
    theme: 'Inspired by Anansi',
    group: 'Victories',
    unlock: { kind: 'wins', n: 5 },
    motif: 'web',
    light: { sky: '#E5DCEB', ground: '#D6CAE0', motif: '#C8B9D5', glow: '#EFE8F3' },
    dark: { sky: '#191221', ground: '#20162A', motif: '#2B1E37', glow: '#3B2949' },
  },
  {
    id: 'coil',
    name: 'Ouroboros Mire',
    theme: 'Inspired by Jörmungandr',
    group: 'Match Play',
    unlock: { kind: 'botMatches', n: 15 },
    motif: 'coil',
    light: { sky: '#D9E5D4', ground: '#C6D8C0', motif: '#B6CCAF', glow: '#E7EFE2' },
    dark: { sky: '#121F18', ground: '#17281F', motif: '#1F3329', glow: '#2B4535' },
  },
  {
    id: 'dive',
    name: 'Sunward Cliffs',
    theme: 'Inspired by Garuda',
    group: 'Victories',
    unlock: { kind: 'wins', n: 15 },
    motif: 'cliffs',
    light: { sky: '#F3DDC4', ground: '#E9C9A6', motif: '#DDB892', glow: '#F9E8CC' },
    dark: { sky: '#291611', ground: '#331B14', motif: '#3F2219', glow: '#4C2A1D' },
  },
  {
    id: 'billabong',
    name: 'Drowning Deep',
    theme: 'Inspired by Bunyip',
    group: 'Synergies',
    unlock: { kind: 'trait', trait: 'Guardian', n: 2 },
    motif: 'deep',
    light: { sky: '#D0DED4', ground: '#BACEC1', motif: '#AAC2B3', glow: '#DEE9E1' },
    dark: { sky: '#0F1E19', ground: '#13261F', motif: '#1A3027', glow: '#223E32' },
  },
  {
    id: 'inferno',
    name: 'Smokeless Fire',
    theme: 'Inspired by Ifrit',
    group: 'Mastery',
    unlock: { kind: 'wins', n: 50 },
    motif: 'flames',
    light: { sky: '#F0D8C8', ground: '#E4C0AA', motif: '#D8AD94', glow: '#F7E3D2' },
    dark: { sky: '#1B100D', ground: '#241410', motif: '#301913', glow: '#4A2416' },
  },
  {
    id: 'throne',
    name: 'Riddle Sands',
    theme: 'Inspired by Sphinx',
    group: 'Mastery',
    unlock: { kind: 'wins', n: 100 },
    motif: 'pyramid',
    light: { sky: '#F0E3C3', ground: '#E4D2A6', motif: '#D7C190', glow: '#F7ECD0' },
    dark: { sky: '#28201A', ground: '#312718', motif: '#3C301D', glow: '#463823' },
  },
];

export const BATTLEGROUND_MAP = Object.fromEntries(BATTLEGROUNDS.map((b) => [b.id, b])) as Record<
  string,
  BattlegroundDef
>;

export function battlegroundUnlockNeed(bg: BattlegroundDef): number {
  if (bg.unlock.kind === 'always') return 0;
  return bg.unlock.n;
}

export function battlegroundUnlockCurrent(id: string, p: ProgressState): number {
  const bg = BATTLEGROUND_MAP[id];
  if (!bg) return 0;
  const u = bg.unlock;
  if (u.kind === 'always') return 1;
  if (u.kind === 'wins') return p.wins;
  if (u.kind === 'botMatches') return p.botMatches;
  return p.traitWins[u.trait] ?? 0;
}

export function battlegroundUnlocked(id: string, p: ProgressState): boolean {
  const bg = BATTLEGROUND_MAP[id];
  if (!bg) return false;
  if (bg.unlock.kind === 'always') return true;
  return battlegroundUnlockCurrent(id, p) >= bg.unlock.n;
}

export function battlegroundUnlockLabel(id: string): string {
  const bg = BATTLEGROUND_MAP[id];
  if (!bg) return '';
  const u = bg.unlock;
  if (u.kind === 'always') return 'Always available';
  if (u.kind === 'wins') return u.n === 1 ? 'Win 1 bot match' : `Win ${u.n} bot matches`;
  if (u.kind === 'botMatches') return u.n === 1 ? 'Play 1 bot match' : `Play ${u.n} bot matches`;
  const syn = u.trait.toUpperCase();
  return u.n === 1
    ? `Win 1 bot match with ${syn} active`
    : `Win ${u.n} bot matches with ${syn} active`;
}

export function unlockedBattlegroundIds(p: ProgressState): string[] {
  return BATTLEGROUNDS.filter((b) => battlegroundUnlocked(b.id, p)).map((b) => b.id);
}

export function newlyUnlockedBattlegrounds(before: ProgressState, after: ProgressState): string[] {
  const prev = new Set(unlockedBattlegroundIds(before));
  return BATTLEGROUNDS.filter((b) => !prev.has(b.id) && battlegroundUnlocked(b.id, after)).map(
    (b) => b.id,
  );
}
