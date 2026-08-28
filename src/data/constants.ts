export const JADE = '#1B6B52';
export const SAF = '#E8A317';
export const BONE = '#F2E9D4';
export const INK = '#14120E';
export const RUST = '#B4442B';

export const STARMUL = [1, 1, 1.85, 3.4] as const;

/** Columns per side (player and foe each occupy a 6×6 half). */
export const BOARD_COLS = 6;
/** Rows per side — foe rows 0–5, player rows 6–11. */
export const BOARD_SIDE_ROWS = 6;
export const BOARD_ROWS = BOARD_SIDE_ROWS * 2;
export const PLAYER_ROW_START = BOARD_SIDE_ROWS;
export const BOARD_CELL_COUNT = BOARD_COLS * BOARD_ROWS;

/** Boss occupies a 3×3 block on the 6×6 foe half (was 2×2 on 4×4). */
export const BOSS_FOOTPRINT = 3;
export const BOSS_ANCHOR = { r: 1, c: 1 } as const;

export const BOARD_CELL_WIDTH_PCT = 100 / BOARD_COLS;
export const BOARD_CELL_HEIGHT_PCT = 100 / BOARD_ROWS;
export const BOARD_BG_TILE_SIZE = `${BOARD_CELL_WIDTH_PCT}% ${BOARD_CELL_HEIGHT_PCT}%`;

/** TFT-style board caps per round for bot matches on a 6×6 grid (max 12 units). */
export const BOT_BOARD_CAPS = [2, 3, 3, 5, 5, 7, 7, 9, 9, 10, 11, 12] as const;

/** Practice sandbox allows the full 6×6 player board. */
export const PRACTICE_BOARD_CAP = BOARD_SIDE_ROWS * BOARD_COLS;

/** Bot-match rounds that spawn a boss instead of a normal foe board. */
export const BOSS_ROUNDS = [4, 8, 12] as const;

/** @deprecated Use BOT_BOARD_CAPS — kept for imports that expect CAPS. */
export const CAPS = [...BOT_BOARD_CAPS];

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
