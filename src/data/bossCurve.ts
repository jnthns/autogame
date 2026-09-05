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
 * Medians of the `decent` policy on Mortal, re-measured in B7 at the final
 * dials, once the boss fix let matches routinely reach round 13 (n = 600).
 *
 * The B5 numbers came from the 39% of matches still alive at round 12, which
 * was survivorship-biased and oversized the round-12 boss. The curve is
 * self-referential — bosses are fitted to it and it is measured against them —
 * so it was re-derived twice until the anchors stopped moving.
 *
 * `dps` is auto-attack DPS only; ability damage is deliberately outside it, so
 * raising the ability budget makes bosses easier rather than rescaling them.
 *
 * Round 16 is extrapolated on the 8→12 slope — Marathon matches still do not
 * reach it often enough to take a median from.
 */
export const REF_ANCHORS: Record<number, RefTeam> = {
  1: { hp: 1663, dps: 144, avgHp: 832 },
  4: { hp: 3574, dps: 299, avgHp: 1192 },
  8: { hp: 7082, dps: 674, avgHp: 1416 },
  12: { hp: 12783, dps: 1228, avgHp: 1420 },
  16: { hp: 18484, dps: 1782, avgHp: 1424 },
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
