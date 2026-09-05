/**
 * Economy data: match shape, shop odds, income, punishment, relic cadence.
 *
 * Everything the balance track tunes lives here rather than in the engine.
 */

export const MATCH_DEFAULTS = {
  matchRounds: 13,
  startHealth: 100,
  startGold: 10,
  rerollCost: 2,
} as const;

export const HYPER_ROLL_ROUNDS = 13;
export const BOSS_ROUNDS = [4, 8, 12] as const;
export const MARATHON_BOSS_ROUNDS = [4, 8, 12, 16] as const;

/**
 * Probability (percent) of each cost tier per round entered. Rows sum to 100.
 *
 * This replaces the old "max cost tier by round" gate, which made a 6-hero
 * draft with one cheap creature roll that creature five times a round and
 * three-star it before round 4.
 */
export const SHOP_ODDS: Record<number, [c2: number, c3: number, c4: number, c5: number]> = {
  1: [70, 30, 0, 0],
  2: [70, 30, 0, 0],
  3: [55, 35, 10, 0],
  4: [55, 35, 10, 0],
  5: [40, 40, 18, 2],
  6: [40, 40, 18, 2],
  7: [30, 38, 25, 7],
  8: [30, 38, 25, 7],
  9: [22, 33, 30, 15],
  10: [22, 33, 30, 15],
  11: [15, 28, 35, 22],
  12: [15, 28, 35, 22],
  13: [12, 25, 35, 28],
};

/** Marathon rounds 14–18 and every gauntlet round past 13 use row 13. */
export function shopOdds(round: number): [number, number, number, number] {
  return SHOP_ODDS[Math.min(13, Math.max(1, round))];
}

/** Cost tiers the odds table indexes, in row order. */
export const SHOP_TIERS = [2, 3, 4, 5] as const;

/* ── Income ────────────────────────────────────────────────────────────── */

/** Flat gold every round, before wins, interest and streaks. */
export const INCOME_BASE = (round: number): number => (round <= 3 ? 4 : round <= 7 ? 5 : 6);
export const WIN_BONUS = 1;
/** Gold banked per +1 interest, and the cap on it. */
export const INTEREST_PER = 10;
export const INTEREST_MAX = 3;
/** Win *or* loss streaks pay: sitting on a loss streak is a real strategy. */
export const STREAK_GOLD = (streak: number): number =>
  Math.abs(streak) >= 4 ? 2 : Math.abs(streak) >= 2 ? 1 : 0;

export interface IncomeBreakdown {
  base: number;
  win: number;
  interest: number;
  streak: number;
  total: number;
}

/**
 * `goldHeld` is the gold *before* income, so the interest term is what the
 * player earned by not spending. `wonLast` is null on the first round.
 */
export function incomeBreakdown(
  roundEntered: number,
  goldHeld: number,
  streak: number,
  wonLast: boolean | null,
): IncomeBreakdown {
  const base = INCOME_BASE(roundEntered);
  const win = wonLast === true ? WIN_BONUS : 0;
  const interest = Math.min(INTEREST_MAX, Math.floor(Math.max(0, goldHeld) / INTEREST_PER));
  const streakGold = STREAK_GOLD(streak);
  return { base, win, interest, streak: streakGold, total: base + win + interest + streakGold };
}

/** The next gold total that would earn another point of interest. */
export function nextInterestAt(goldHeld: number): number | null {
  const step = Math.floor(Math.max(0, goldHeld) / INTEREST_PER) + 1;
  return step > INTEREST_MAX ? null : step * INTEREST_PER;
}

/* ── Punishment ────────────────────────────────────────────────────────── */

export const LOSS_BASE = (round: number): number =>
  round <= 3 ? 4 : round <= 7 ? 6 : round <= 11 ? 8 : 10;
/** Damage scales with how much of the winner's board was still standing. */
export const LOSS_PER_SURVIVOR = 2;
export const LOSS_SURVIVOR_CAP = 8;
export const BOSS_LOSS_EXTRA = 6;
/** A boss counts as four units when it wins. */
export const BOSS_SURVIVOR_COUNT = 4;

export function lossDamage(round: number, survivors: number, boss = false): number {
  const capped = Math.max(0, Math.min(LOSS_SURVIVOR_CAP, Math.round(survivors)));
  return LOSS_BASE(round) + LOSS_PER_SURVIVOR * capped + (boss ? BOSS_LOSS_EXTRA : 0);
}

/* ── Relic cadence ─────────────────────────────────────────────────────── */

/** Plus any boss round whose reward has `relic: true`. */
export const RELIC_ROUNDS = [3, 6, 9, 11] as const;
export const RELIC_PICKS_WIN = 3;
export const RELIC_PICKS_LOSS = 2;
