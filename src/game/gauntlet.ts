import { BOSS_ANCHOR, GAUNTLET, GAUNTLET_BOARD_CAPS } from '../data/constants';
import { HERO_MAP } from '../data/heroes';
import { CLASSES, type ClassName } from '../data/classes';
import { GAUNTLET_RELIC_IDS, RELICS } from '../data/relics';
import { TRAITS, type TraitName } from '../data/traits';
import { BOSS_ENCOUNTERS, type BossEncounter, type BossUnitSpec, rewardLines } from './hyperRoll';
import type { Unit } from './types';

export { rewardLines };

function synergyTierBonus(ids: string[]): number {
  const traitC: Record<string, number> = {};
  const classC: Record<string, number> = {};
  ids.forEach((id) => {
    const h = HERO_MAP[id];
    if (!h) return;
    h.traits.forEach((t) => {
      traitC[t] = (traitC[t] || 0) + 1;
    });
    classC[h.heroClass] = (classC[h.heroClass] || 0) + 1;
  });
  let bonus = 0;
  Object.keys(traitC).forEach((name) => {
    const def = TRAITS[name as TraitName];
    let lvl = 0;
    def.tiers.forEach(([need]) => {
      if (traitC[name] >= need) lvl++;
    });
    bonus += lvl * 3;
  });
  Object.keys(classC).forEach((name) => {
    const def = CLASSES[name as ClassName];
    let lvl = 0;
    def.tiers.forEach(([need]) => {
      if (classC[name] >= need) lvl++;
    });
    bonus += lvl * 3;
  });
  return bonus;
}

/** Unit power for gauntlet scaling: cost × star level. */
export function gauntletUnitPower(u: Unit): number {
  const cost = HERO_MAP[u.hid]?.cost ?? 1;
  return cost * u.star;
}

/** Board power = sum(unit cost × star) + synergy bonus from active trait/class tiers. */
export function boardPower(board: Unit[]): number {
  const units = board.reduce((s, u) => s + gauntletUnitPower(u), 0);
  const synergyBonus = synergyTierBonus(board.map((u) => u.hid));
  return units + synergyBonus;
}

function roundScale(round: number): number {
  return 1 + (round - 1) * GAUNTLET.roundScalePerRound;
}

function powerScale(power: number): number {
  return 1 + power / GAUNTLET.boardPowerDivisor;
}

function scaledStar(base: 1 | 2 | 3, round: number): 1 | 2 | 3 {
  if (round >= 30) return 3;
  if (round >= 15) return base >= 2 ? 3 : 2;
  if (round >= 8) return base >= 2 ? 2 : base;
  return base;
}

function buildScaledUnits(template: BossUnitSpec[], round: number, power: number): BossUnitSpec[] {
  const rs = roundScale(round);
  const ps = powerScale(power);
  const combined = rs * ps;
  return template.map((spec) => ({
    ...spec,
    star: scaledStar(spec.star, round),
    // The 4×4 boss HP/ATK is fitted to the live player board in combat; minions still scale.
    scaleHp: spec.boss ? 1 : spec.scaleHp * combined,
    scaleAtk: spec.boss ? 1 : spec.scaleAtk * Math.sqrt(combined),
    boss: spec.boss ?? false,
    bossKit: spec.bossKit,
  }));
}

/** Rotate boss templates and scale by round number + player board power. */
export function getGauntletEncounter(round: number, power: number): BossEncounter {
  const template = BOSS_ENCOUNTERS[(round - 1) % BOSS_ENCOUNTERS.length];
  const period = Math.min(4, Math.ceil(round / 4));
  const suffix = round > BOSS_ENCOUNTERS.length ? ` · Wave ${round}` : '';
  return {
    round,
    period,
    id: `${template.id}-w${round}`,
    name: `${template.name}${suffix}`,
    blurb: template.blurb,
    units: buildScaledUnits(template.units, round, power),
    reward: {
      gold: gauntletGoldReward(round),
      freeRerolls: round >= 12 ? 2 : round >= 6 ? 1 : 0,
      relic: true,
    },
  };
}

export function gauntletGoldReward(round: number): number {
  return GAUNTLET.baseGoldReward + round * GAUNTLET.goldPerRound;
}

export function gauntletRoundIncome(round: number): number {
  return GAUNTLET.baseRoundIncome + Math.min(4, Math.floor(round / 5));
}

export function gauntletBoardCap(round: number): number {
  if (round <= GAUNTLET_BOARD_CAPS.length) return GAUNTLET_BOARD_CAPS[round - 1] ?? 12;
  return Math.min(12, 10 + Math.floor((round - GAUNTLET_BOARD_CAPS.length) / 4));
}

export function makeGauntletBossUnits(round: number, power: number): Unit[] {
  const enc = getGauntletEncounter(round, power);
  return enc.units.map((spec, i) => {
    const isBoss = spec.boss ?? i === 0;
    return {
      u: `gauntlet-${round}-${i}`,
      hid: spec.hid,
      star: spec.star,
      relics: [],
      r: isBoss ? BOSS_ANCHOR.r : spec.r,
      c: isBoss ? BOSS_ANCHOR.c : spec.c,
      boss: isBoss,
      bossKit: isBoss ? spec.bossKit ?? 'clay' : undefined,
      scaleHp: spec.scaleHp,
      scaleAtk: spec.scaleAtk,
    };
  });
}

/** Pick relic offers — gauntlet exclusives appear at higher rounds. */
export function pickGauntletRelics(round: number, count = 3): string[] {
  const standard = RELICS.filter((r) => !r.gauntletOnly).map((r) => r.id);
  const exclusive = GAUNTLET_RELIC_IDS.filter((id) => {
    const def = RELICS.find((r) => r.id === id);
    return def && round >= (def.minRound ?? 0);
  });
  const pool =
    round >= GAUNTLET.exclusiveRelicRound && exclusive.length
      ? [...standard, ...exclusive, ...exclusive]
      : standard;
  return pool
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

export function gauntletMilestoneRound(round: number): 'cost4' | 'cost5' | null {
  if (round >= GAUNTLET.unlockCost5Round) return 'cost5';
  if (round >= GAUNTLET.unlockCost4Round) return 'cost4';
  return null;
}

export function gauntletScore(roundsCleared: number): number {
  return roundsCleared;
}

export type GauntletBestRun = { round: number; lives: number };

export function isBetterGauntletRun(a: GauntletBestRun | undefined, round: number, lives: number): boolean {
  if (!a) return round > 0;
  if (round !== a.round) return round > a.round;
  return lives > a.lives;
}
