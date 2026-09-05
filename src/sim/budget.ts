/**
 * Stat-budget (P) and ability-budget (A30) maths.
 *
 * The rules are spelled out in docs/overhaul/04-balance-track.md §B2.2 / §B2.3;
 * this file is their only implementation — the audit script and the drift-guard
 * test both call in here.
 */
import { ABILITIES, type AbilityValueSpec, type Magnitude } from '../data/abilities';
import type { HeroDef } from '../data/heroes';

/** Stat-budget targets, in thousands. */
export const BUDGET_P: Record<number, number> = { 2: 13.5, 3: 17.5, 4: 22.5, 5: 28.0 };
export const P_TOLERANCE = 0.08;

/** Ability-budget targets: expected ability value over 30 s at 1★, sp 0. */
export const BUDGET_A30: Record<number, number> = { 2: 800, 3: 1050, 4: 1300, 5: 1600 };
export const A30_TOLERANCE = 0.15;

/**
 * Two heroes cannot be brought into the A30 band by any magnitude, because the
 * value rules price their non-scaling terms at a fixed amount:
 *   anzuu — a self permanent buff is a flat 50, far under a 2-cost target;
 *   coyot — a 1.5 s stun plus an all-ally crit buff already exceed one.
 * Both are documented in docs/overhaul/baselines/B2-report.md and excluded from
 * the strict audit so the drift guard still bites for the other 22.
 */
export const A30_UNREACHABLE = new Set(['anzuu', 'coyot']);

/** Ranged heroes trade survivability for reach; supports trade damage for utility. */
export const RANGED_P_MOD = 0.92;
export const SUPPORT_P_MOD = 1.05;

/** CC value per target-second. */
export const CC_PER_SECOND = { stun: 60, silence: 40, snare: 25 } as const;
/** A 0.2 damage amplification on one target. */
export const AMP_VALUE = 60;
/** A permanent buff on one ally. */
export const ALLY_BUFF_VALUE = 40;
/** A permanent self buff. */
export const SELF_BUFF_VALUE = 50;
export const SHIELD_RATIO = 0.7;
export const BURN_RATIO = 0.8;
export const TRUE_DAMAGE_MUL = 1.25;
export const AUTO_CRIT_MUL = 1.8;
export const SECOND_CAST_RATIO = 0.35;
/** Casts per 30 s ≈ as × 12 mana per auto / 100 mana. */
export const CASTS_PER_30S = 3.6;

/** P = hp × dmg × as × (1 + crit × 0.8) at 1★, in thousands. */
export function statBudget(h: HeroDef): number {
  return (h.hp * h.dmg * h.as * (1 + h.crit * 0.8)) / 1000;
}

export function targetP(h: HeroDef): number {
  const base = BUDGET_P[h.cost] ?? BUDGET_P[3];
  const ranged = h.attack === 'ranged' ? RANGED_P_MOD : 1;
  const support = h.abilityKind === 'support' ? SUPPORT_P_MOD : 1;
  return base * ranged * support;
}

export function targetA30(h: HeroDef): number {
  const base = BUDGET_A30[h.cost] ?? BUDGET_A30[3];
  const bias = ABILITIES[h.id]?.budgetBias ?? 0;
  return base * (1 + bias);
}

/** Value of one cast at 1★ with 0 spell power. */
export function abilityValue(h: HeroDef): number {
  const def = ABILITIES[h.id];
  if (!def) return 0;
  const v: AbilityValueSpec = def.value;
  const mag = (from: Magnitude) => (from === 'secondary' ? (def.secondary ?? 0) : def.base);
  let value = 0;

  if (v.hits) {
    value += v.hits.count * mag(v.hits.from) * (1 + h.crit * 0.8);
  } else if (v.damage) {
    const autoCrit = v.autoCritTargets ?? 0;
    const plain = Math.max(0, v.damage.targets - autoCrit);
    value +=
      mag(v.damage.from) *
      (plain + autoCrit * AUTO_CRIT_MUL) *
      (v.trueDamage ? TRUE_DAMAGE_MUL : 1);
  }

  if (v.burn) value += mag(v.burn.from) * v.burn.seconds * v.burn.targets * BURN_RATIO;
  if (v.heal) value += mag(v.heal.from) * v.heal.allies;
  if (v.healRatio && v.damage) value += mag(v.damage.from) * v.damage.targets * v.healRatio;
  if (v.shield) value += mag(v.shield.from) * v.shield.allies * SHIELD_RATIO;
  if (v.cc) {
    const n = v.cc.targets;
    if (v.cc.stun) value += CC_PER_SECOND.stun * v.cc.stun * n;
    if (v.cc.silence) value += CC_PER_SECOND.silence * v.cc.silence * n;
    if (v.cc.snare) value += CC_PER_SECOND.snare * v.cc.snare * n;
    if (v.cc.amp) value += AMP_VALUE * n;
  }
  if (v.allyBuff) value += ALLY_BUFF_VALUE * v.allyBuff.allies;
  if (v.selfBuff) value += SELF_BUFF_VALUE;
  if (v.secondCast) value *= 1 + SECOND_CAST_RATIO;

  return value;
}

/**
 * The part of the cast value that no magnitude can move: CC, ally and self
 * buffs. A hero whose floor already exceeds its A30 target cannot be brought
 * into band by scaling numbers — see docs/overhaul/baselines/B2-report.md.
 */
export function abilityValueFloor(h: HeroDef): number {
  const def = ABILITIES[h.id];
  if (!def) return 0;
  const v = def.value;
  let floor = 0;
  if (v.cc) {
    const n = v.cc.targets;
    if (v.cc.stun) floor += CC_PER_SECOND.stun * v.cc.stun * n;
    if (v.cc.silence) floor += CC_PER_SECOND.silence * v.cc.silence * n;
    if (v.cc.snare) floor += CC_PER_SECOND.snare * v.cc.snare * n;
    if (v.cc.amp) floor += AMP_VALUE * n;
  }
  if (v.allyBuff) floor += ALLY_BUFF_VALUE * v.allyBuff.allies;
  if (v.selfBuff) floor += SELF_BUFF_VALUE;
  if (v.secondCast) floor *= 1 + SECOND_CAST_RATIO;
  return floor;
}

/** True when no magnitude in this ability feeds its value. */
export function hasScalableMagnitude(h: HeroDef): boolean {
  const v = ABILITIES[h.id]?.value;
  if (!v) return false;
  return !!(v.damage || v.hits || v.burn || v.heal || v.shield);
}

/** A30 = value × as × 3.6. */
export function abilityBudget(h: HeroDef): number {
  return abilityValue(h) * h.as * CASTS_PER_30S;
}

export interface BudgetRow {
  id: string;
  cost: number;
  p: number;
  pTarget: number;
  pDelta: number;
  a30: number;
  a30Target: number;
  a30Delta: number;
  ok: boolean;
}

export function budgetRow(h: HeroDef): BudgetRow {
  const p = statBudget(h);
  const pTarget = targetP(h);
  const a30 = abilityBudget(h);
  const a30Target = targetA30(h);
  const pDelta = (p - pTarget) / pTarget;
  const a30Delta = (a30 - a30Target) / a30Target;
  return {
    id: h.id,
    cost: h.cost,
    p,
    pTarget,
    pDelta,
    a30,
    a30Target,
    a30Delta,
    ok:
      Math.abs(pDelta) <= P_TOLERANCE &&
      (Math.abs(a30Delta) <= A30_TOLERANCE || A30_UNREACHABLE.has(h.id)),
  };
}
