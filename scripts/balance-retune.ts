/**
 * Solve the hero stat rows and ability magnitudes for their budgets.
 *
 *   npx tsx scripts/balance-retune.ts            # print the plan
 *   npx tsx scripts/balance-retune.ts --json     # emit it as JSON to apply
 *
 * Mechanical, per docs/overhaul/04-balance-track.md §B2.2 and §B2.4:
 *   stats    k = sqrt(targetP / P); hp' = round(hp × k / 5) × 5; dmg' = round(dmg × k),
 *            then a ±5 hp nudge to absorb the rounding.
 *   ability  scale every magnitude the value spec reads (base, and `secondary`
 *            when it is a magnitude) by the factor that lands A30 on target,
 *            keeping durations. Solved numerically because burn, heal-off-damage
 *            and the second-cast multiplier are not all linear in one term.
 */
import { ABILITIES } from '../src/data/abilities';
import { HEROES, type HeroDef } from '../src/data/heroes';
import {
  abilityValueFloor,
  A30_TOLERANCE,
  CASTS_PER_30S,
  hasScalableMagnitude,
  P_TOLERANCE,
  statBudget,
  abilityBudget,
  targetA30,
  targetP,
} from '../src/sim/budget';

interface StatPlan {
  id: string;
  hp: number;
  dmg: number;
  pBefore: number;
  pAfter: number;
}

interface AbilityPlan {
  id: string;
  base: number;
  secondary?: number;
  a30Before: number;
  a30After: number;
  unreachable?: 'floor-above-target' | 'no-magnitude';
}

function roundStep(x: number): number {
  return x >= 50 ? Math.round(x / 5) * 5 : Math.max(1, Math.round(x));
}

function planStats(h: HeroDef): StatPlan {
  const pBefore = statBudget(h);
  const target = targetP(h);
  const k = Math.sqrt(target / pBefore);
  const dmg = Math.max(1, Math.round(h.dmg * k));
  let hp = Math.max(5, Math.round((h.hp * k) / 5) * 5);
  const err = (candidate: number) =>
    Math.abs((candidate * dmg * h.as * (1 + h.crit * 0.8)) / 1000 - target);
  for (const nudge of [-5, 5]) {
    if (err(hp + nudge) < err(hp)) hp += nudge;
  }
  return { id: h.id, hp, dmg, pBefore, pAfter: (hp * dmg * h.as * (1 + h.crit * 0.8)) / 1000 };
}

/** A30 with every value-bearing magnitude of this ability multiplied by `s`. */
function a30At(h: HeroDef, s: number): number {
  const def = ABILITIES[h.id];
  const saved = { base: def.base, secondary: def.secondary };
  def.base = def.base * s;
  if (def.secondaryKind === 'magnitude' && def.secondary != null) def.secondary = def.secondary * s;
  const out = abilityBudget(h);
  def.base = saved.base;
  def.secondary = saved.secondary;
  return out;
}

function planAbility(h: HeroDef): AbilityPlan {
  const def = ABILITIES[h.id];
  const before = abilityBudget(h);
  const target = targetA30(h);
  if (!hasScalableMagnitude(h) || def.base === 0) {
    return { id: h.id, base: def.base, secondary: def.secondary, a30Before: before, a30After: before, unreachable: 'no-magnitude' };
  }
  const floorA30 = abilityValueFloor(h) * h.as * CASTS_PER_30S;
  if (floorA30 > target * (1 + A30_TOLERANCE)) {
    return {
      id: h.id,
      base: def.base,
      secondary: def.secondary,
      a30Before: before,
      a30After: before,
      unreachable: 'floor-above-target',
    };
  }
  let lo = 0;
  let hi = 32;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (a30At(h, mid) < target) lo = mid;
    else hi = mid;
  }
  const s = (lo + hi) / 2;
  const base = roundStep(def.base * s);
  const secondary =
    def.secondaryKind === 'magnitude' && def.secondary != null
      ? roundStep(def.secondary * s)
      : def.secondary;
  const saved = { base: def.base, secondary: def.secondary };
  def.base = base;
  if (secondary != null) def.secondary = secondary;
  const a30After = abilityBudget(h);
  def.base = saved.base;
  def.secondary = saved.secondary;
  return { id: h.id, base, secondary, a30Before: before, a30After };
}

const stats = HEROES.map(planStats);
const abilities = HEROES.map(planAbility);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ stats, abilities }, null, 2));
} else {
  const pad = (s: string, w: number) => s.padEnd(w);
  const n = (x: number, w: number, d = 1) => x.toFixed(d).padStart(w);
  console.log(`${pad('hero', 8)}   hp    dmg      P →      P'      A30 →     A30'  note`);
  HEROES.forEach((h, i) => {
    const s = stats[i];
    const a = abilities[i];
    const pOk = Math.abs(s.pAfter - targetP(h)) / targetP(h) <= P_TOLERANCE;
    const aOk = Math.abs(a.a30After - targetA30(h)) / targetA30(h) <= A30_TOLERANCE;
    console.log(
      `${pad(h.id, 8)}${String(h.hp).padStart(4)}→${String(s.hp).padStart(4)}` +
        `${String(h.dmg).padStart(4)}→${String(s.dmg).padStart(3)}` +
        `${n(s.pBefore, 8, 2)}→${n(s.pAfter, 7, 2)}` +
        `${n(a.a30Before, 9)}→${n(a.a30After, 8)}` +
        `  ${pOk ? '' : 'P!'}${aOk ? '' : 'A!'}${a.unreachable ? ` ${a.unreachable}` : ''}`,
    );
  });
}
