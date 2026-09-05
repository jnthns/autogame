/**
 * Ability numbers as data.
 *
 * `base` and `secondary` are the magnitudes `CombatEngine.cast()` uses;
 * `duration` is the seconds of stun / snare / silence / buff. `value` says how
 * the cast is *shaped*, referencing those fields rather than repeating them, so
 * scripts/balance-audit.ts can price every ability with the A30 rules in
 * docs/overhaul/04-balance-track.md §B2.3 — no per-hero special cases — and the
 * retune in §B2.4 can scale the magnitudes without touching the shape.
 */

/** Where a value term reads its magnitude from. */
export type Magnitude = 'base' | 'secondary';

export interface AbilityValueSpec {
  /** Direct damage: which field carries it and how many enemies it lands on. */
  damage?: { from: Magnitude; targets: number };
  /** How many of those targets are struck by an auto-crit hit (valued ×1.8). */
  autoCritTargets?: number;
  /** True damage is valued ×1.25. */
  trueDamage?: boolean;
  /** Random-target multi-hit (Kitsune): hits × base × (1 + crit × 0.8). */
  hits?: { from: Magnitude; count: number };
  /** Burning ground: perSec × seconds × targets × 0.8. */
  burn?: { from: Magnitude; seconds: number; targets: number };
  /** Flat healing, valued ×1.0 per point. */
  heal?: { from: Magnitude; allies: number };
  /** Heal off damage dealt: dealt × ratio. */
  healRatio?: number;
  /** Shields are valued ×0.7; `allies: 4` for a whole-board shield. */
  shield?: { from: Magnitude; allies: number };
  /** CC per target-second: stun 60, silence 40, snare 25; amp 0.2 = 60 flat. */
  cc?: { stun?: number; silence?: number; snare?: number; amp?: boolean; targets: number };
  /** Permanent all-ally buff (crit, AS, DR): 40 per ally affected. */
  allyBuff?: { allies: number };
  /** Self permanent buff (Anzû, Wendigo): 50 per cast. */
  selfBuff?: boolean;
  /** Conditional free second cast (Zmey): +35% of the cast value. */
  secondCast?: boolean;
}

export interface AbilityDef {
  /** Primary magnitude the `cast()` case uses (damage, heal, or shield). */
  base: number;
  /** Secondary number: a magnitude, a hit count, or a fraction — see `secondaryKind`. */
  secondary?: number;
  /** Only a `magnitude` secondary is rescaled by the ability-budget retune. */
  secondaryKind?: 'magnitude' | 'count' | 'fraction';
  /** Seconds of stun / snare / silence / buff. Retunes never touch these. */
  duration?: number;
  /** ±0.10 max. Positive = stats over ability. Must be justified in a comment. */
  budgetBias?: number;
  value: AbilityValueSpec;
}

export const ABILITIES: Record<string, AbilityDef> = {
  // Coils adjacent enemies, heals for half the damage dealt.
  jorm: { base: 310, value: { damage: { from: 'base', targets: 1.5 }, healRatio: 0.5 } },
  // Gale down the row: damage split among everyone hit, plus an all-ally haste.
  quetz: {
    base: 495,
    duration: 4,
    value: { damage: { from: 'base', targets: 1 }, allyBuff: { allies: 4 } },
  },
  // Three arcs; every arc after the first crits automatically.
  thund: {
    base: 85,
    secondary: 3,
    secondaryKind: 'count',
    value: { damage: { from: 'base', targets: 3 }, autoCritTargets: 2 },
  },
  // Snare + damage amplification on the two nearest enemies. Pure control:
  // there is no magnitude to scale, so the budget rides on the durations.
  anans: { base: 0, duration: 2, value: { cc: { snare: 2, amp: true, targets: 2 } } },
  // Drags the highest-attack enemy under and silences it.
  bunyi: {
    base: 275,
    duration: 3,
    value: { damage: { from: 'base', targets: 1 }, cc: { silence: 3, targets: 1 } },
  },
  // Rake plus a self shield.
  garud: {
    base: 275,
    secondary: 325,
    secondaryKind: 'magnitude',
    value: { damage: { from: 'base', targets: 1 }, shield: { from: 'secondary', allies: 1 } },
  },
  // Nine wisps at random enemies, each able to crit.
  kitsu: { base: 33, secondary: 9, secondaryKind: 'count', value: { hits: { from: 'base', count: 9 } } },
  // 2×2 pillar plus burning ground.
  ifrit: {
    base: 255,
    secondary: 37,
    secondaryKind: 'magnitude',
    duration: 4,
    value: {
      damage: { from: 'base', targets: 1.5 },
      burn: { from: 'secondary', seconds: 4, targets: 1.5 },
    },
  },
  // Three cones; heads regrow for a free second cast under 30% HP.
  zirni: { base: 230, value: { damage: { from: 'base', targets: 3 }, secondCast: true } },
  // Board-wide shield; shielded allies deal more damage.
  taniw: {
    base: 115,
    value: { shield: { from: 'base', allies: 4 }, allyBuff: { allies: 4 } },
  },
  // Steals spell power and keeps it for the round. See B2-report.md: the value
  // rules price a self permanent buff at a flat 50, so no magnitude reaches the
  // 2-cost target; the ability is under budget by design of the rules, not the kit.
  anzuu: { base: 25, budgetBias: -0.1, value: { selfBuff: true } },
  // Riddle: stun plus true damage on the two lowest-HP enemies.
  sphin: {
    base: 195,
    duration: 2.5,
    value: {
      damage: { from: 'base', targets: 2 },
      trueDamage: true,
      cc: { stun: 2.5, targets: 2 },
    },
  },
  // Drags the nearest enemy under, snares, heals for half the damage.
  kelpi: {
    base: 165,
    duration: 2.5,
    value: {
      damage: { from: 'base', targets: 1 },
      healRatio: 0.5,
      cc: { snare: 2.5, targets: 1 },
    },
  },
  // Cleanse plus a board-wide shield.
  barng: { base: 130, value: { shield: { from: 'base', allies: 4 } } },
  // Stun a random enemy; the board keeps the crit for the round. See
  // B2-report.md: the stun and the all-ally crit alone exceed the 2-cost target.
  coyot: {
    base: 16,
    duration: 1.5,
    budgetBias: 0.1,
    value: {
      damage: { from: 'base', targets: 1 },
      cc: { stun: 1.5, targets: 1 },
      allyBuff: { allies: 4 },
    },
  },
  // Shields the lowest-HP ally and rakes what is next to them.
  griff: {
    base: 160,
    secondary: 230,
    secondaryKind: 'magnitude',
    value: { damage: { from: 'base', targets: 1.5 }, shield: { from: 'secondary', allies: 1 } },
  },
  // Self shield plus an adjacent pulse.
  golem: {
    base: 140,
    secondary: 500,
    secondaryKind: 'magnitude',
    value: { damage: { from: 'base', targets: 1.5 }, shield: { from: 'secondary', allies: 1 } },
  },
  // Keen on the lowest-HP enemy; true damage under 40%.
  bansh: {
    base: 265,
    duration: 2,
    value: { damage: { from: 'base', targets: 1 }, cc: { stun: 2, targets: 1 } },
  },
  // Three heads strike and each connection heals.
  hydra: {
    base: 170,
    secondary: 45,
    secondaryKind: 'magnitude',
    value: { damage: { from: 'base', targets: 3 }, heal: { from: 'secondary', allies: 3 } },
  },
  // Repairs the two most wounded allies and hardens them.
  nuwa: { base: 240, value: { heal: { from: 'base', allies: 2 }, allyBuff: { allies: 2 } } },
  // Tears the nearest enemy and heals for everything dealt.
  camaz: { base: 225, value: { damage: { from: 'base', targets: 1 }, healRatio: 1 } },
  // Heals the board, hastes it, and burns the two nearest enemies.
  simur: {
    base: 70,
    secondary: 90,
    secondaryKind: 'magnitude',
    duration: 4,
    value: {
      damage: { from: 'secondary', targets: 2 },
      heal: { from: 'base', allies: 4 },
      allyBuff: { allies: 4 },
    },
  },
  // Everything within two tiles takes damage and is snared.
  levia: {
    base: 470,
    duration: 1.5,
    value: { damage: { from: 'base', targets: 2 }, cc: { snare: 1.5, targets: 2 } },
  },
  // Feasts, steals max HP, and grows its attack for the round.
  wendi: {
    base: 690,
    secondary: 0.1,
    secondaryKind: 'fraction',
    value: { damage: { from: 'base', targets: 1 }, selfBuff: true },
  },
};

export function abilityOf(hid: string): AbilityDef | undefined {
  return ABILITIES[hid];
}
