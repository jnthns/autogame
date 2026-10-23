/**
 * The reference team curve: what a competent board actually looks like at each
 * round, measured rather than guessed.
 *
 * Bosses are fitted to *this* instead of to the live board, so growing your
 * board makes the boss easier rather than bigger — the rubber-band the audit
 * called out (A8). One curve feeds Hyper Roll, Marathon and the Gauntlet.
 */

export interface RefTeam {
  /** Total team HP after traits and the mode HP multiplier. */
  hp: number;
  /** Team DPS including crit. */
  dps: number;
  /** HP of the average unit on that board. */
  avgHp: number;
}

/**
 * main's REF_ANCHORS trailed its real boards, so the boss difficulty players
 * know (B8) was fitted to a team smaller than theirs. This keeps that
 * difficulty: anchor / median board, per round and stat, measured on main at
 * 268c18c with `scripts/balance-anchors.ts --mode bot --difficulty normal
 * --n 1000 --seed 1,7 --legacy` (n = 2000). Round 16 uses the round-12 offset.
 */
export const LEGACY_ANCHOR_OFFSET: Record<number, RefTeam> = {
  1: { hp: 1.057, dps: 1.241, avgHp: 0.938 },
  4: { hp: 0.923, dps: 1.027, avgHp: 0.877 },
  8: { hp: 0.874, dps: 1.032, avgHp: 0.861 },
  12: { hp: 0.857, dps: 0.976, avgHp: 0.829 },
};

/**
 * B8's realized damage per point of auto DPS at each anchor round: the player's
 * total damage ÷ fight seconds ÷ auto DPS, median per fight. Three-copy merges
 * shifted this ratio by round (lower at r4 without the early 3★, higher at r12),
 * but the boss fit converts auto DPS with a fixed 1.6 uplift, so the DPS anchor
 * is scaled by (this tree's ratio ÷ this one) to keep B8's real kill times.
 * Measured with the same main run as LEGACY_ANCHOR_OFFSET. Round 1 has no boss,
 * so its ratio is against ordinary foes. Round 16 uses the round-12 ratio.
 */
export const LEGACY_DPS_REALIZATION: Record<number, number> = {
  1: 0.886,
  4: 2.284,
  8: 2.469,
  12: 2.674,
};

/**
 * Medians of the player's board under the `decent` policy on Mortal with random
 * drafts, × LEGACY_ANCHOR_OFFSET and the realized-damage DPS factor (both
 * applied only in `scripts/balance-anchors.ts`), from `scripts/balance-anchors.ts --seed 1,7`
 * (n = 2000), re-measured after three-copy merges shrank boards. Round 12 is
 * the 54% of matches still alive there, so it leans towards stronger boards.
 *
 * The B5 numbers came from the 39% of matches still alive at round 12, which
 * was survivorship-biased and oversized the round-12 boss. The curve is
 * self-referential — bosses are fitted to it and it is measured against them —
 * so the script iterates until the anchors stop moving.
 *
 * `dps` is auto-attack DPS only; ability damage is deliberately outside it, so
 * raising the ability budget makes bosses easier rather than rescaling them.
 *
 * Round 16 is extrapolated on the 8→12 slope — Marathon matches still do not
 * reach it often enough to take a median from.
 */
export const REF_ANCHORS: Record<number, RefTeam> = {
  1: { hp: 1186, dps: 123, avgHp: 637 },
  4: { hp: 2667, dps: 231, avgHp: 899 },
  8: { hp: 4984, dps: 526, avgHp: 1013 },
  12: { hp: 8855, dps: 1023, avgHp: 1002 },
  16: { hp: 12822, dps: 1512, avgHp: 1029 },
};

const ANCHOR_ROUNDS = Object.keys(REF_ANCHORS)
  .map(Number)
  .sort((a, b) => a - b);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function between(lo: number, hi: number, round: number): RefTeam {
  const a = REF_ANCHORS[lo];
  const b = REF_ANCHORS[hi];
  const t = (round - lo) / (hi - lo);
  return {
    hp: lerp(a.hp, b.hp, t),
    dps: lerp(a.dps, b.dps, t),
    avgHp: lerp(a.avgHp, b.avgHp, t),
  };
}

/** Piecewise-linear between anchors; past 16, the 12→16 slope continues. */
export function refTeam(round: number): RefTeam {
  const first = ANCHOR_ROUNDS[0];
  const last = ANCHOR_ROUNDS[ANCHOR_ROUNDS.length - 1];
  if (round <= first) return { ...REF_ANCHORS[first] };
  if (round >= last) {
    const prev = ANCHOR_ROUNDS[ANCHOR_ROUNDS.length - 2];
    const span = last - prev;
    const over = (round - last) / span;
    const a = REF_ANCHORS[prev];
    const b = REF_ANCHORS[last];
    return {
      hp: b.hp + (b.hp - a.hp) * over,
      dps: b.dps + (b.dps - a.dps) * over,
      avgHp: b.avgHp + (b.avgHp - a.avgHp) * over,
    };
  }
  for (let i = 0; i < ANCHOR_ROUNDS.length - 1; i++) {
    const lo = ANCHOR_ROUNDS[i];
    const hi = ANCHOR_ROUNDS[i + 1];
    if (round >= lo && round <= hi) return between(lo, hi, round);
  }
  return { ...REF_ANCHORS[last] };
}

/**
 * `dps` in the anchors is auto-attack damage only, but abilities are ~37% of
 * what a board actually deals (measured: `abilityShare%` in the final
 * baseline). Effective output is therefore dps / (1 − 0.37) ≈ dps × 1.6, and
 * the boss HP fit uses that — otherwise raising the ability budget would
 * silently make every boss easier.
 */
export const REF_ABILITY_UPLIFT = 1.6;

/** Effective damage per second of the reference board, abilities included. */
export function refEffectiveDps(round: number): number {
  return refTeam(round).dps * REF_ABILITY_UPLIFT;
}

/**
 * Per-round growth *on top of* the reference curve.
 *
 * Ranked is small — the curve itself already quadruples between rounds 1 and
 * 12, so the old 0.04 stacked on that made round 12 unwinnable while round 4
 * was trivial. The gauntlet keeps its steeper ramp because it replays the same
 * few rounds of the curve forever and needs somewhere to get harder.
 */
export const ROUND_MUL_RANKED = 0.025;
export const GAUNTLET_ROUND_MUL = 0.09;

export function bossRoundMul(round: number, gauntlet: boolean): number {
  return 1 + Math.max(0, round - 1) * (gauntlet ? GAUNTLET_ROUND_MUL : ROUND_MUL_RANKED);
}
