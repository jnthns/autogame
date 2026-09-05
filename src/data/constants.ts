/**
 * Palette handles are token references, not literals, so every inline use is
 * theme-aware. The values themselves live in src/styles/tokens.css.
 */
export const JADE = 'var(--om-jade)';
export const SAF = 'var(--om-saffron)';
export const BONE = 'var(--om-bone)';
export const INK = 'var(--om-ink)';
export const RUST = 'var(--om-rust)';
export const SKY = 'var(--om-sky)';
export const VIOLET = 'var(--om-violet)';
export const MUTED = 'var(--om-muted)';

/**
 * Star multipliers. A 2★ is two copies and a 3★ is four, so the old 1.85/3.4
 * made every merge strictly better than spending the same gold on breadth.
 */
export const STARMUL = [1, 1, 1.65, 2.6] as const;

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
/**
 * Boss HP is set so the *reference* team for the round (src/data/bossCurve.ts)
 * burns it down in BOSS_BURN_SECONDS, never from the live board — see B5.
 * The fight is winnable exactly when that is comfortably under
 * BOSS_BOARD_SURVIVAL, which is the whole point of budgeting both.
 */
export const BOSS_BURN_SECONDS = 19;
/** Sanity floor on the HP pool, so a low-DPS reference cannot make a trivial boss. */
export const BOSS_HP_TEAM_MULT = 3;
/**
 * Seconds for the boss's *total* output — board-wide autos plus its kit — to
 * wipe an idle reference board. Pricing autos alone is what made every boss
 * unwinnable before B7: the kit was three times the autos and unbudgeted.
 */
export const BOSS_BOARD_SURVIVAL = 30;
/** Share of that output carried by the autos; the remainder is the kit. */
export const BOSS_AUTO_SHARE = 0.55;
/**
 * Measured cadence of boss casts — 8.7 s at round 4, 7.1 s at round 8, 7.2 s at
 * round 12 over 30 seeded fights. The kit budget is spread across this period.
 */
export const BOSS_CAST_PERIOD_SECONDS = 7.5;
/** Floor on boss attack, so the autos never round away entirely. */
export const BOSS_MIN_ATK = 16;
export const BOSS_AS = 0.52;
/** Boss fights last longer so the 10× HP pool can actually be burned. */
export const BOSS_COMBAT_LIMIT = 75;
export const COMBAT_LIMIT = 45;
/**
 * Incoming damage multiplier vs bosses. One value for every difficulty: BOSS_SCALE
 * is the difficulty lever, so the two no longer compound.
 */
export const BOSS_INCOMING_MULT = 2.8;

export const BOARD_CELL_WIDTH_PCT = 100 / BOARD_COLS;
export const BOARD_CELL_HEIGHT_PCT = 100 / BOARD_ROWS;
export const BOARD_BG_TILE_SIZE = `${BOARD_CELL_WIDTH_PCT}% ${BOARD_CELL_HEIGHT_PCT}%`;

/** Slow board-cap ramp so 2-copy merges do not fill the field too early. */
export const BOT_BOARD_CAPS = [2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10] as const;

/** Marathon ramps a bit higher over 18 rounds (max 12 units). */
export const MARATHON_BOARD_CAPS = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 12] as const;

/** Practice sandbox allows the full 6×6 player board. */
export const PRACTICE_BOARD_CAP = BOARD_SIDE_ROWS * BOARD_COLS;

export const DEFAULT_DRAFT = ['jorm', 'anans', 'kitsu', 'taniw', 'ifrit', 'thund'];
export const DRAFT_STORAGE_KEY = 'om_draft';

/** Player shop pool cap for Hyper Roll, Marathon, and other ranked bot matches. */
export const USER_DRAFT_MAX = 6;
/** Bot shop draws from a wider hero pool than the player. */
export const BOT_DRAFT_SIZE = 12;

/** Global combat HP multiplier — applied before mode-specific bonuses. */
export const HERO_HP_MUL = 1.8;

export const MARATHON = {
  matchRounds: 18,
  heroHpMul: 1.5,
} as const;

/** Endless boss-only mode — board caps ramp like marathon then plateau at 12. */
export const GAUNTLET_BOARD_CAPS = [
  2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 12,
] as const;

export const GAUNTLET = {
  /** Effectively endless — UI shows round count only. */
  matchRounds: 9999,
  startLives: 3,
  startGold: 30,
  goldPenalty: 2,
  baseGoldReward: 6,
  goldPerRound: 1,
  baseRoundIncome: 3,
  roundScalePerRound: 0.1,
  boardPowerDivisor: 160,
  unlockCost4Round: 20,
  unlockCost5Round: 40,
  exclusiveRelicRound: 12,
} as const;

export function costTone(c: number): string {
  return c >= 5 ? VIOLET : c >= 4 ? RUST : c >= 3 ? JADE : MUTED;
}
