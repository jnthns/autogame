export type BossKitId = 'clay' | 'storm' | 'coil';

/**
 * How the three kits differ. `slam` is a *relative* weight around 1.0: the
 * absolute slam damage comes from the boss's damage budget (see
 * `bossSlamDamage` in engine.ts), so a heavier kit trades nothing but flavour
 * against a lighter one. Shields and burn stay fractions of the reference
 * team's average unit HP, so they mean the same thing at every round.
 *
 * Because each boss round uses a different kit — clay at 4, storm at 8, coil at
 * 12 — these weights double as the only per-round difficulty lever there is.
 *
 * Dial: each ±30% of parity.
 */
export interface BossKitScale {
  /** Relative AOE slam weight; the budget supplies the magnitude. */
  slam: number;
  /** Shield the boss (or its allies) gain, as a fraction of average unit HP. */
  shield: number;
  /**
   * Fraction of this kit's damage delivered as burning ground instead of
   * upfront. It comes *out of* the slam, not on top of it — the World Coil's
   * burn used to be a flat fraction of unit HP and was worth more than its own
   * slam, which is why round 12 was the one boss nobody ever beat.
   */
  burnShare?: number;
  /** Seconds the burning ground lasts. */
  burnSeconds?: number;
}

export const BOSS_KIT_SCALE: Record<BossKitId, BossKitScale> = {
  clay: { slam: 0.72, shield: 0.38 },
  storm: { slam: 1.15, shield: 0.25 },
  coil: { slam: 1.1, shield: 0.29, burnShare: 0.4, burnSeconds: 4 },
};

export interface BossKit {
  id: BossKitId;
  ability: string;
  abilityText: string;
  banner: string;
}

/** Every boss kit is a long-range AOE slam plus a self/ally buff and a board-wide debuff. */
export const BOSS_KITS: Record<BossKitId, BossKit> = {
  clay: {
    id: 'clay',
    ability: 'Name of Clay',
    abilityText:
      'Slams the whole field for magic damage, then hardens: huge self-shield and damage reduction. Every enemy is snared and marked to take extra damage.',
    banner: 'Name of Clay — the field hardens',
  },
  storm: {
    id: 'storm',
    ability: 'Judgment Gale',
    abilityText:
      'Lightning rakes every enemy. The court steels itself: attack speed and a ward. The two weakest heroes are stunned.',
    banner: 'Judgment Gale — the court strikes',
  },
  coil: {
    id: 'coil',
    ability: 'World-Coil',
    abilityText:
      'The serpent encircles the board: magic damage, burning ground, and a silence. The coil drinks — the boss heals and steals life from every hit.',
    banner: 'World-Coil — all allies struck',
  },
};
