export type BossKitId = 'clay' | 'storm' | 'coil';

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
      'Lightning rakes every enemy. Surviving omen-allies gain attack speed and a ward. The two weakest heroes are stunned.',
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
