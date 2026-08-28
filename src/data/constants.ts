export const JADE = '#1B6B52';
export const SAF = '#E8A317';
export const BONE = '#F2E9D4';
export const INK = '#14120E';
export const RUST = '#B4442B';

export const STARMUL = [1, 1, 1.85, 3.4] as const;
export const CAPS = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];

export const DEFAULT_DRAFT = ['jorm', 'anans', 'kitsu', 'taniw', 'ifrit', 'thund'];
export const DRAFT_STORAGE_KEY = 'om_draft';

export const MATCH_DEFAULTS = {
  matchRounds: 12,
  startHealth: 100,
  rerollCost: 2,
} as const;

export function costTone(c: number): string {
  return c >= 5 ? '#7A3E9D' : c >= 4 ? RUST : c >= 3 ? JADE : '#4a4436';
}
