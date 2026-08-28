import type { ProgressState } from './progress';
import type { TraitName } from './traits';

export type BattlegroundUnlock =
  | { kind: 'always' }
  | { kind: 'wins'; n: number }
  | { kind: 'botMatches'; n: number }
  | { kind: 'trait'; trait: TraitName; n: number };

export type BattlegroundGroup = 'Starter' | 'Match Play' | 'Victories' | 'Synergies' | 'Mastery';

export interface BattlegroundDef {
  id: string;
  name: string;
  theme: string;
  group: BattlegroundGroup;
  unlock: BattlegroundUnlock;
  /** Static image path relative to public/ (e.g. img/kitsune-battleground.png). */
  image?: string;
  p: Record<string, string>;
  d: string[];
}

export const BATTLEGROUNDS: BattlegroundDef[] = [
  {
    id: 'plain',
    name: 'Training Sands',
    theme: 'Neutral yard',
    group: 'Starter',
    unlock: { kind: 'always' },
    p: { a: '#E8D9B0', b: '#D4C294', c: '#C4B07A', k: '#B3A06A' },
    d: [
      'abababababab',
      'bcbcbcbcbcbc',
      'abababababab',
      'bcbckcbcbcbc',
      'abababababab',
      'bcbcbcbcbcbc',
      'ababkabababa',
      'bcbcbcbcbcbc',
      'abababababab',
      'bcbcbcbckcbc',
      'abababababab',
      'bcbcbcbcbcbc',
    ],
  },
  {
    id: 'tide',
    name: 'Tide Ward',
    theme: 'Inspired by Taniwha',
    group: 'Starter',
    unlock: { kind: 'always' },
    p: { w: '#2E6E8C', l: '#3F8A7A', d: '#1F4A42', s: '#7B8F5A', k: '#14120E' },
    d: [
      'wwlwwlwwlwwl',
      'wlwlwlwlwlwl',
      'lwwlwwlwwlww',
      'wlwskswlwlwl',
      'wwlwwlwwlwwl',
      'wlwlwlksklwl',
      'lwwlwwlwwlww',
      'wlwlwlwlwlwl',
      'wwlskswwlwwl',
      'wlwlwlwlwlwl',
      'lwwlwwlwwlww',
      'wlwlwlwlwlwl',
    ],
  },
  {
    id: 'foxfire',
    name: 'Foxfire Grove',
    theme: 'Inspired by Kitsune',
    group: 'Starter',
    unlock: { kind: 'always' },
    image: 'img/kitsune-battleground.png',
    p: { d: '#2A1A12', s: '#3E2A18', e: '#E07A2F', g: '#F0C13B', k: '#14120E' },
    d: [
      'dsdsdsdsdsds',
      'sdsdsedsdsds',
      'dsdsdsdsgsds',
      'sdsdsdsdsdsd',
      'dsedskdsdsds',
      'sdsdsdsdseds',
      'dsdsdsgsdsds',
      'sdsdsdsdsdsd',
      'dsdsdsdsedsd',
      'sdsgsdsdsdsd',
      'dsdsdsdsdsds',
      'sdsdsdsedsds',
    ],
  },
  {
    id: 'storm',
    name: 'Split Sky',
    theme: 'Inspired by Thunderbird',
    group: 'Match Play',
    unlock: { kind: 'botMatches', n: 5 },
    p: { n: '#1A2748', b: '#2A3F80', c: '#5C8AD6', y: '#F5C518', k: '#14120E' },
    d: [
      'nbnbbnbnbbnb',
      'bnbnbnbybnbn',
      'nbnckcnbnbbn',
      'bnbnbnbbnbnb',
      'nbybnbnbnbbn',
      'bnbnbnckcbnb',
      'nbnbbnbnbbnb',
      'bnbynbnbnbnb',
      'nbnbbnckcbbn',
      'bnbnbnbbnbnb',
      'nbnbybnbnbbn',
      'bnbnbnbbnbnb',
    ],
  },
  {
    id: 'web',
    name: 'Web Hollow',
    theme: 'Inspired by Anansi',
    group: 'Victories',
    unlock: { kind: 'wins', n: 5 },
    p: { d: '#1C1224', p: '#6B3FA0', l: '#9B6FD4', k: '#14120E', o: '#E07A2F' },
    d: [
      'kddddddddddk',
      'dkpddddddpdk',
      'ddkplpplpkdd',
      'dddpkddkpddd',
      'ddplkooklpdd',
      'ddpdkddkdpdd',
      'ddpdkddkdpdd',
      'ddplkooklpdd',
      'dddpkddkpddd',
      'ddkplpplpkdd',
      'dkpddddddpdk',
      'kddddddddddk',
    ],
  },
  {
    id: 'coil',
    name: 'Ouroboros Mire',
    theme: 'Inspired by Jörmungandr',
    group: 'Match Play',
    unlock: { kind: 'botMatches', n: 15 },
    p: { m: '#1E3A2A', g: '#1E6B45', l: '#5CC08A', k: '#14120E', y: '#F5D547' },
    d: [
      'mgmgmgmgmgmg',
      'gmkkggkkmgmg',
      'mggllllggmgm',
      'gmgllkkllgmg',
      'mgglkyyklgmg',
      'gmglkkkklgmg',
      'mgglkyyklgmg',
      'gmgllkkllgmg',
      'mggllllggmgm',
      'gmkkggkkmgmg',
      'mgmgmgmgmgmg',
      'gmgmgmgmgmgm',
    ],
  },
  {
    id: 'dive',
    name: 'Sunward Cliffs',
    theme: 'Inspired by Garuda',
    group: 'Victories',
    unlock: { kind: 'wins', n: 15 },
    p: { s: '#C4402B', o: '#E07A2F', g: '#F0C13B', r: '#8A2E1C', k: '#14120E' },
    d: [
      'sosoosososos',
      'ososggososos',
      'sosokkgososo',
      'osososososos',
      'sosorrososos',
      'ososososggos',
      'sosososokkos',
      'osososososos',
      'sosoggososos',
      'ososkkososos',
      'sosososorros',
      'osososososos',
    ],
  },
  {
    id: 'billabong',
    name: 'Drowning Deep',
    theme: 'Inspired by Bunyip',
    group: 'Synergies',
    unlock: { kind: 'trait', trait: 'Guardian', n: 2 },
    p: { d: '#1A3328', g: '#3E5233', b: '#2E6E8C', w: '#4A8AAA', k: '#14120E' },
    d: [
      'dgdgdgdgdgdg',
      'gdgdbbdgdgdg',
      'dgdgwwdgdgdg',
      'gdgdgdgkdgdg',
      'dgdbbdgdgdgd',
      'gdgwwdgdgdgd',
      'dgdgdgdgbdgd',
      'gdgdgdgdwwgd',
      'dgdgkdgdgdgd',
      'gdgdgdbbdgdg',
      'dgdgdgwwdgdg',
      'gdgdgdgdgdgd',
    ],
  },
  {
    id: 'inferno',
    name: 'Smokeless Fire',
    theme: 'Inspired by Ifrit',
    group: 'Mastery',
    unlock: { kind: 'wins', n: 50 },
    image: 'img/ifrit-battleground.png',
    p: { k: '#14120E', a: '#2A1410', r: '#B4442B', o: '#FF6B35', y: '#F5C518' },
    d: [
      'kakakakakaka',
      'akarorakakak',
      'kakoyokakaka',
      'akararakakak',
      'kakakakakaka',
      'akarorakakak',
      'kakoyokakaka',
      'akararakakak',
      'kakakakakaka',
      'akarorakakak',
      'kakoyokakaka',
      'akararakakak',
    ],
  },
  {
    id: 'throne',
    name: 'Riddle Sands',
    theme: 'Inspired by Sphinx',
    group: 'Mastery',
    unlock: { kind: 'wins', n: 100 },
    p: { s: '#D4B06A', g: '#E8C547', w: '#F5EFE0', k: '#14120E', b: '#8A6A32' },
    d: [
      'sbsbsbsbsbsb',
      'bsgkkgsbsbsb',
      'sbskwwksbsbs',
      'bsgkkgsbsbsb',
      'sbsbsbsbsbsb',
      'bsbsgkkgsbsb',
      'sbsbskwwksbs',
      'bsbsgkkgsbsb',
      'sbsbsbsbsbsb',
      'bsgkkgsbsbsb',
      'sbskwwksbsbs',
      'bsgkkgsbsbsb',
    ],
  },
];

export const BATTLEGROUND_MAP = Object.fromEntries(BATTLEGROUNDS.map((b) => [b.id, b])) as Record<
  string,
  BattlegroundDef
>;

const tileCache: Record<string, string> = {};

export function battlegroundImageUrl(id: string): string | undefined {
  const s = BATTLEGROUND_MAP[id];
  if (!s?.image) return undefined;
  return `${import.meta.env.BASE_URL}${s.image}`;
}

export function battlegroundBackgroundUrl(id: string): string {
  return battlegroundImageUrl(id) ?? battlegroundTileUrl(id);
}

export function battlegroundUsesImage(id: string): boolean {
  return Boolean(BATTLEGROUND_MAP[id]?.image);
}

export function battlegroundTileUrl(id: string): string {
  if (tileCache[id]) return tileCache[id];
  const s = BATTLEGROUND_MAP[id];
  if (!s) return '';
  const cv = document.createElement('canvas');
  cv.width = 12;
  cv.height = 12;
  const cx = cv.getContext('2d');
  if (!cx) return '';
  s.d.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      const ch = row[x];
      if (!ch) continue;
      const col = s.p[ch];
      if (!col) continue;
      cx.fillStyle = col;
      cx.fillRect(x, y, 1, 1);
    }
  });
  tileCache[id] = cv.toDataURL();
  return tileCache[id];
}

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
