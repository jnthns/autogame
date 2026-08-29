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

/** Boss occupies a 4×4 block on the 6×6 foe half and never leaves it. */
export const BOSS_FOOTPRINT = 4;
export const BOSS_ANCHOR = { r: 1, c: 1 } as const;
/** Chebyshev range that covers the whole 12×6 board from the 4×4 boss. */
export const BOSS_RANGE = 12;
/** Same-star copies needed to combine into the next star (board + bench). */
export const MERGE_COPIES = 2;
/** Boss HP is at least this many times the current player board's total HP. */
export const BOSS_HP_TEAM_MULT = 10;
/** If player DPS would burn the HP floor faster than this, pad boss HP. */
export const BOSS_DPS_BURN_SECONDS = 42;
/** Seconds for boss AOE autos to wipe an idle board. */
export const BOSS_BOARD_SURVIVAL = 24;
export const BOSS_AS = 0.52;
/** Boss fights last longer so the 10× HP pool can actually be burned. */
export const BOSS_COMBAT_LIMIT = 75;
export const COMBAT_LIMIT = 45;
/**
 * Incoming damage vs bosses. Player DPS compounds (stars × crit × haste × spells)
 * much faster than HP, so the 10× health pool would be unkillable on a thin board
 * and trivial on a stacked one without this lever.
 */
export const BOSS_DAMAGE_TAKEN = 2.35;

export const BOARD_CELL_WIDTH_PCT = 100 / BOARD_COLS;
export const BOARD_CELL_HEIGHT_PCT = 100 / BOARD_ROWS;
export const BOARD_BG_TILE_SIZE = `${BOARD_CELL_WIDTH_PCT}% ${BOARD_CELL_HEIGHT_PCT}%`;

/** TFT-style board caps per round for bot matches on a 6×6 grid (max 12 units). */
export const BOT_BOARD_CAPS = [2, 3, 3, 5, 5, 7, 7, 9, 9, 10, 11, 12] as const;

/** Marathon ramps a bit higher over 18 rounds (max 12 units). */
export const MARATHON_BOARD_CAPS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11, 12] as const;

/** Practice sandbox allows the full 6×6 player board. */
export const PRACTICE_BOARD_CAP = BOARD_SIDE_ROWS * BOARD_COLS;

/** @deprecated Use BOT_BOARD_CAPS — kept for imports that expect CAPS. */
export const CAPS = [...BOT_BOARD_CAPS];

export const DEFAULT_DRAFT = ['jorm', 'anans', 'kitsu', 'taniw', 'ifrit', 'thund'];
export const DRAFT_STORAGE_KEY = 'om_draft';

/** Player shop pool cap for Hyper Roll, Marathon, and other ranked bot matches. */
export const USER_DRAFT_MAX = 6;
/** Bot shop draws from a wider hero pool than the player. */
export const BOT_DRAFT_SIZE = 12;

/** Global combat HP multiplier — applied before mode-specific bonuses. */
export const HERO_HP_MUL = 1.5;

export const MATCH_DEFAULTS = {
  matchRounds: 13,
  startHealth: 100,
  rerollCost: 2,
} as const;

export const HYPER_ROLL_ROUNDS = 13;
export const BOSS_ROUNDS = [4, 8, 12] as const;

export const MARATHON = {
  matchRounds: 18,
  heroHpMul: 1.5,
} as const;

/** Endless boss-only mode — board caps ramp like marathon then plateau at 12. */
export const GAUNTLET_BOARD_CAPS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11, 12,
] as const;

export const GAUNTLET = {
  /** Effectively endless — UI shows round count only. */
  matchRounds: 9999,
  startLives: 3,
  startGold: 8,
  goldPenalty: 2,
  baseGoldReward: 8,
  goldPerRound: 2,
  baseRoundIncome: 4,
  roundScalePerRound: 0.07,
  boardPowerDivisor: 180,
  unlockCost4Round: 20,
  unlockCost5Round: 40,
  exclusiveRelicRound: 12,
} as const;

export function costTone(c: number): string {
  return c >= 5 ? '#7A3E9D' : c >= 4 ? RUST : c >= 3 ? JADE : '#4a4436';
}
