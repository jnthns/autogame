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
 * Medians of the `decent` policy on Mortal, from
 * docs/overhaul/baselines/b4.json (n = 300, seed 1).
 *
 * Round 16 is extrapolated on the 8→12 slope: Marathon matches in the B4
 * baseline did not reach it often enough to take a median from.
 */
export const REF_ANCHORS: Record<number, RefTeam> = {
  1: { hp: 1379, dps: 144, avgHp: 689 },
  4: { hp: 2775, dps: 358, avgHp: 925 },
  8: { hp: 5412, dps: 707, avgHp: 1082 },
  12: { hp: 9571, dps: 1126, avgHp: 1063 },
  16: { hp: 13730, dps: 1545, avgHp: 1063 },
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

/** Per-round growth on top of the curve. */
export const ROUND_MUL_RANKED = 0.04;
export const GAUNTLET_ROUND_MUL = 0.09;

export function bossRoundMul(round: number, gauntlet: boolean): number {
  return 1 + Math.max(0, round - 1) * (gauntlet ? GAUNTLET_ROUND_MUL : ROUND_MUL_RANKED);
}
