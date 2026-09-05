/**
 * Ability numbers as data.
 *
 * `base`/`secondary`/`duration` are the numbers `CombatEngine.cast()` uses.
 * `value` describes the shape of the cast so `scripts/balance-audit.ts` can
 * price it with the A30 rules in docs/overhaul/04-balance-track.md §B2.3 —
 * no judgement, no per-hero special cases in the audit.
 */

export interface AbilityValueSpec {
  /** Which field carries the direct-damage number (default `base`). */
  damageFrom?: 'base' | 'secondary';
  /** Expected number of enemies the direct damage lands on. */
  targets?: number;
  /** How many of those targets are struck by an auto-crit hit (valued ×1.8). */
  autoCritTargets?: number;
  /** True damage is valued ×1.25. */
  trueDamage?: boolean;
  /** Random-target multi-hit (Kitsune): hits × base × (1 + crit × 0.8). */
  hits?: number;
  burn?: { perSec: number; seconds: number; targets: number };
  /** Flat healing, valued ×1.0 per point. */
  heal?: { amount: number; allies: number };
  /** Heal off damage dealt: dealt × ratio. */
  healRatio?: number;
  /** Shields are valued ×0.7; `allies: 4` for a whole-board shield. */
  shield?: { amount: number; allies: number };
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
  /** Primary number the `cast()` case uses (damage, heal, or shield). */
  base: number;
  /** Secondary number where the case uses two (hit count, burn per second, …). */
  secondary?: number;
  /** Seconds of stun / snare / silence / buff used by the case. */
  duration?: number;
  /** ±0.10 max. Positive = stats over ability. Must be justified in a comment. */
  budgetBias?: number;
  value: AbilityValueSpec;
}

export const ABILITIES: Record<string, AbilityDef> = {
  // Coils adjacent enemies, heals for half the damage dealt.
  jorm: { base: 220, value: { targets: 1.5, healRatio: 0.5 } },
  // Gale down the row: total damage split among everyone hit, plus an all-ally haste.
  quetz: { base: 300, duration: 4, value: { targets: 1, allyBuff: { allies: 4 } } },
  // Three arcs; every arc after the first crits automatically.
  thund: { base: 180, secondary: 3, value: { targets: 3, autoCritTargets: 2 } },
  // Snare + damage amplification on the two nearest enemies.
  anans: { base: 0, duration: 2, value: { cc: { snare: 2, amp: true, targets: 2 } } },
  // Drags the highest-attack enemy under and silences it.
  bunyi: { base: 160, duration: 3, value: { targets: 1, cc: { silence: 3, targets: 1 } } },
  // Rake plus a self shield.
  garud: { base: 260, secondary: 300, value: { targets: 1, shield: { amount: 300, allies: 1 } } },
  // Nine wisps at random enemies, each able to crit.
  kitsu: { base: 70, secondary: 9, value: { hits: 9 } },
  // 2×2 pillar plus burning ground.
  ifrit: {
    base: 280,
    secondary: 40,
    duration: 4,
    value: { targets: 1.5, burn: { perSec: 40, seconds: 4, targets: 1.5 } },
  },
  // Three cones; heads regrow for a free second cast under 30% HP.
  zirni: { base: 200, value: { targets: 3, secondCast: true } },
  // Board-wide shield; shielded allies deal more damage.
  taniw: {
    base: 220,
    value: { shield: { amount: 220, allies: 4 }, allyBuff: { allies: 4 } },
  },
  // Steals spell power and keeps it for the round.
  anzuu: { base: 25, value: { selfBuff: true } },
  // Riddle: stun plus true damage on the two lowest-HP enemies.
  sphin: {
    base: 240,
    duration: 2.5,
    value: { targets: 2, trueDamage: true, cc: { stun: 2.5, targets: 2 } },
  },
  // Drags the nearest enemy under, snares, heals for half the damage.
  kelpi: { base: 150, duration: 2.5, value: { targets: 1, healRatio: 0.5, cc: { snare: 2.5, targets: 1 } } },
  // Cleanse plus a board-wide shield.
  barng: { base: 160, value: { shield: { amount: 160, allies: 4 } } },
  // Stun a random enemy; the board keeps the crit for the round.
  coyot: {
    base: 140,
    duration: 1.5,
    value: { targets: 1, cc: { stun: 1.5, targets: 1 }, allyBuff: { allies: 4 } },
  },
  // Shields the lowest-HP ally and rakes what is next to them.
  griff: { base: 180, secondary: 250, value: { targets: 1.5, shield: { amount: 250, allies: 1 } } },
  // Self shield plus an adjacent pulse.
  golem: { base: 90, secondary: 320, value: { targets: 1.5, shield: { amount: 320, allies: 1 } } },
  // Keen on the lowest-HP enemy; true damage under 40%.
  bansh: { base: 200, duration: 2, value: { targets: 1, cc: { stun: 2, targets: 1 } } },
  // Three heads strike and each connection heals.
  hydra: { base: 160, secondary: 40, value: { targets: 3, heal: { amount: 120, allies: 1 } } },
  // Repairs the two most wounded allies and hardens them.
  nuwa: { base: 200, value: { heal: { amount: 200, allies: 2 }, allyBuff: { allies: 2 } } },
  // Tears the nearest enemy and heals for everything dealt.
  camaz: { base: 240, value: { targets: 1, healRatio: 1 } },
  // Heals the board, hastes it, and burns the two nearest enemies.
  simur: {
    base: 160,
    secondary: 200,
    duration: 4,
    value: {
      damageFrom: 'secondary',
      targets: 2,
      heal: { amount: 160, allies: 4 },
      allyBuff: { allies: 4 },
    },
  },
  // Everything within two tiles takes damage and is snared.
  levia: { base: 220, duration: 1.5, value: { targets: 2, cc: { snare: 1.5, targets: 2 } } },
  // Feasts, steals max HP, and grows its attack for the round.
  wendi: { base: 280, secondary: 0.1, value: { targets: 1, selfBuff: true } },
};

export function abilityOf(hid: string): AbilityDef | undefined {
  return ABILITIES[hid];
}
