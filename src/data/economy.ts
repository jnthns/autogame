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
