import { BOSS_ROUNDS, HYPER_ROLL_ROUNDS, MATCH_DEFAULTS } from '../data/constants';
import { HERO_MAP } from '../data/heroes';
import type { BossRewardGrant, Unit } from './types';

export { BOSS_ROUNDS, HYPER_ROLL_ROUNDS };

export interface BossUnitSpec {
  hid: string;
  star: 1 | 2 | 3;
  r: number;
  c: number;
  scaleHp: number;
  scaleAtk: number;
  boss?: boolean;
}

export interface BossEncounter {
  round: number;
  period: number;
  id: string;
  name: string;
  blurb: string;
  units: BossUnitSpec[];
  reward: BossRewardGrant;
}

export interface PeriodInfo {
  round: number;
  period: number;
  label: string;
  isBoss: boolean;
  isFinal: boolean;
  nextBossRound: number | null;
  roundsUntilBoss: number | null;
  encounter: 'bot' | 'boss' | 'final';
}

/** Same cost-weight table the player shop uses: cheaper heroes appear more often. */
export function shopWeight(cost: number): number {
  return Math.max(1, 7 - cost);
}

/** Max hero cost tier available in the shop for a given round. */
export function maxShopCost(round: number, matchRounds: number = HYPER_ROLL_ROUNDS): number {
  if (round >= matchRounds || round >= 10) return 5;
  if (round >= 7) return 4;
  if (round >= 4) return 3;
  return 2;
}

export function isBossRound(round: number): boolean {
  return (BOSS_ROUNDS as readonly number[]).includes(round);
}

export function isFinalRound(round: number, matchRounds = HYPER_ROLL_ROUNDS): boolean {
  return round >= matchRounds;
}

export function periodInfo(round: number, matchRounds = HYPER_ROLL_ROUNDS): PeriodInfo {
  const isFinal = round >= matchRounds;
  const isBoss = isBossRound(round);
  const period = isFinal ? 4 : Math.min(3, Math.max(1, Math.ceil(round / 4)));
  const nextBoss = BOSS_ROUNDS.find((r) => r >= round) ?? null;
  const encounter: PeriodInfo['encounter'] = isFinal ? 'final' : isBoss ? 'boss' : 'bot';
  return {
    round,
    period,
    label: isFinal ? 'FINAL' : `PERIOD ${period}`,
    isBoss,
    isFinal,
    nextBossRound: isFinal ? null : nextBoss,
    roundsUntilBoss: isFinal || nextBoss == null ? null : nextBoss - round,
    encounter,
  };
}

export function roundIncome(roundAfter: number, pvpWin: boolean | null): number {
  const winBonus = pvpWin === true ? 2 : 0;
  return 5 + winBonus + Math.min(3, Math.floor(roundAfter / 4));
}

export function lossDamage(round: number, streak: number): number {
  return 8 + 4 * (streak - 1) + Math.floor(round / 3) * 2;
}

export const BOSS_ENCOUNTERS: BossEncounter[] = [
  {
    round: 4,
    period: 1,
    id: 'clay-colossus',
    name: 'Clay Colossus',
    blurb: 'A clay sentinel and its attendant. Fat HP, slow swings.',
    units: [
      { hid: 'golem', star: 1, r: 1, c: 1, scaleHp: 1.7, scaleAtk: 0.78, boss: true },
      { hid: 'barng', star: 1, r: 0, c: 0, scaleHp: 1.1, scaleAtk: 0.9 },
    ],
    reward: { gold: 6, freeRerolls: 1, relic: false },
  },
  {
    round: 8,
    period: 2,
    id: 'storm-court',
    name: 'Storm Court',
    blurb: 'A sky court: two-star frontline and a backline spark.',
    units: [
      { hid: 'griff', star: 2, r: 1, c: 1, scaleHp: 1.15, scaleAtk: 0.95, boss: true },
      { hid: 'golem', star: 1, r: 0, c: 0, scaleHp: 1.2, scaleAtk: 0.9 },
      { hid: 'thund', star: 2, r: 0, c: 5, scaleHp: 1.1, scaleAtk: 1.0 },
      { hid: 'kitsu', star: 1, r: 5, c: 0, scaleHp: 1.05, scaleAtk: 0.95 },
    ],
    reward: { gold: 10, freeRerolls: 1, relic: true },
  },
  {
    round: 12,
    period: 3,
    id: 'world-coil',
    name: 'World Coil',
    blurb: 'The last omen before the Adversary. Heavy two-stars, beatable with a built board.',
    units: [
      { hid: 'jorm', star: 2, r: 1, c: 1, scaleHp: 1.3, scaleAtk: 0.95, boss: true },
      { hid: 'hydra', star: 2, r: 0, c: 0, scaleHp: 1.15, scaleAtk: 0.95 },
      { hid: 'levia', star: 2, r: 0, c: 5, scaleHp: 1.15, scaleAtk: 0.95 },
      { hid: 'ifrit', star: 2, r: 5, c: 0, scaleHp: 1.1, scaleAtk: 1.0 },
      { hid: 'taniw', star: 1, r: 5, c: 5, scaleHp: 1.05, scaleAtk: 0.9 },
    ],
    reward: { gold: 14, freeRerolls: 2, relic: true },
  },
];

export function getBossEncounter(round: number): BossEncounter | null {
  return BOSS_ENCOUNTERS.find((b) => b.round === round) ?? null;
}

export function makeBossUnits(round: number): Unit[] {
  const enc = getBossEncounter(round);
  if (!enc) return [];
  return enc.units.map((spec, i) => ({
    u: `boss-${round}-${i}`,
    hid: spec.hid,
    star: spec.star,
    relics: [],
    r: spec.r,
    c: spec.c,
    boss: spec.boss ?? i === 0,
    scaleHp: spec.scaleHp,
    scaleAtk: spec.scaleAtk,
  }));
}

export function rewardLines(reward: BossRewardGrant): string[] {
  const lines = [`◈${reward.gold}`];
  if (reward.freeRerolls > 0) {
    lines.push(reward.freeRerolls === 1 ? '1 free roll' : `${reward.freeRerolls} free rolls`);
  }
  if (reward.relic) lines.push('relic offer');
  return lines;
}

export function debugRoundFromUrl(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const n = Number(new URLSearchParams(window.location.search).get('round'));
    if (!Number.isFinite(n) || n < 1 || n > MATCH_DEFAULTS.matchRounds) return undefined;
    return Math.floor(n);
  } catch {
    return undefined;
  }
}

export function unitPower(u: Unit): number {
  const cost = HERO_MAP[u.hid]?.cost ?? 1;
  const copies = u.star === 3 ? 9 : u.star === 2 ? 3 : 1;
  return cost * copies;
}
