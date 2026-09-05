export type BossKitId = 'clay' | 'storm' | 'coil';

/**
 * Kit magnitudes as fractions of the reference team's average unit HP, so a
 * boss cast means the same thing at round 4 and at round 16. The values
 * reproduce the pre-B5 literals at round 4. Dial: each ±20%.
 */
export interface BossKitScale {
  /** AOE slam damage. */
  slam: number;
  /** Shield the boss (or its allies) gain. */
  shield: number;
  /** Burning ground per second, where the kit leaves any. */
  burn?: number;
}

export const BOSS_KIT_SCALE: Record<BossKitId, BossKitScale> = {
  clay: { slam: 0.27, shield: 0.48 },
  storm: { slam: 0.3, shield: 0.25 },
  coil: { slam: 0.33, shield: 0.29, burn: 0.05 },
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
