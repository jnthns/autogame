import { BOSS_KITS, type BossKitId } from '../data/bosses';
import {
  BOSS_ANCHOR,
  BOSS_ROUNDS,
  HYPER_ROLL_ROUNDS,
  MARATHON_BOSS_ROUNDS,
  MERGE_COPIES,
} from '../data/constants';
import { HERO_MAP } from '../data/heroes';
import type { BossRewardGrant, ShopOffer, Unit } from './types';

export { BOSS_ROUNDS, HYPER_ROLL_ROUNDS };

export interface BossUnitSpec {
  hid: string;
  star: 1 | 2 | 3;
  r: number;
  c: number;
  scaleHp: number;
  scaleAtk: number;
  boss?: boolean;
  bossKit?: BossKitId;
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
  if (round >= matchRounds || round >= 12) return 5;
  if (round >= 9) return 4;
  if (round >= 5) return 3;
  return 2;
}

export function bossRoundsFor(matchRounds: number = HYPER_ROLL_ROUNDS): readonly number[] {
  return matchRounds > HYPER_ROLL_ROUNDS ? MARATHON_BOSS_ROUNDS : BOSS_ROUNDS;
}

export function isBossRound(round: number, matchRounds: number = HYPER_ROLL_ROUNDS): boolean {
  return bossRoundsFor(matchRounds).includes(round);
}

export function isFinalRound(round: number, matchRounds = HYPER_ROLL_ROUNDS): boolean {
  return round >= matchRounds;
}

export function periodInfo(round: number, matchRounds = HYPER_ROLL_ROUNDS): PeriodInfo {
  const rounds = bossRoundsFor(matchRounds);
  const isFinal = round >= matchRounds;
  const isBoss = !isFinal && rounds.includes(round);
  const period = isFinal ? rounds.length + 1 : Math.min(rounds.length, Math.max(1, Math.ceil(round / 4)));
  const nextBoss = rounds.find((r) => r >= round) ?? null;
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
  const winBonus = pvpWin === true ? 1 : 0;
  return 4 + winBonus + Math.min(2, Math.floor(roundAfter / 5));
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
    blurb: `A 4×4 clay sentinel that never moves. ${BOSS_KITS.clay.abilityText}`,
    units: [
      {
        hid: 'golem',
        star: 1,
        r: BOSS_ANCHOR.r,
        c: BOSS_ANCHOR.c,
        scaleHp: 1,
        scaleAtk: 1,
        boss: true,
        bossKit: 'clay',
      },
    ],
    reward: { gold: 6, freeRerolls: 1, relic: false },
  },
  {
    round: 8,
    period: 2,
    id: 'storm-court',
    name: 'Storm Court',
    blurb: `A rooted 4×4 sky court. ${BOSS_KITS.storm.abilityText}`,
    units: [
      {
        hid: 'griff',
        star: 2,
        r: BOSS_ANCHOR.r,
        c: BOSS_ANCHOR.c,
        scaleHp: 1,
        scaleAtk: 1,
        boss: true,
        bossKit: 'storm',
      },
    ],
    reward: { gold: 10, freeRerolls: 1, relic: true },
  },
  {
    round: 12,
    period: 3,
    id: 'world-coil',
    name: 'World Coil',
    blurb: `The World Serpent fills four tiles and does not leave them. ${BOSS_KITS.coil.abilityText}`,
    units: [
      {
        hid: 'jorm',
        star: 2,
        r: BOSS_ANCHOR.r,
        c: BOSS_ANCHOR.c,
        scaleHp: 1,
        scaleAtk: 1,
        boss: true,
        bossKit: 'coil',
      },
    ],
    reward: { gold: 14, freeRerolls: 2, relic: true },
  },
];

export function getBossEncounter(round: number, matchRounds: number = HYPER_ROLL_ROUNDS): BossEncounter | null {
  const rounds = bossRoundsFor(matchRounds);
  const idx = rounds.indexOf(round);
  if (idx < 0) return null;
  const template = BOSS_ENCOUNTERS[idx % BOSS_ENCOUNTERS.length];
  return {
    ...template,
    round,
    period: idx + 1,
    name: idx >= BOSS_ENCOUNTERS.length ? `${template.name} · Reprise` : template.name,
  };
}

export function makeBossUnits(round: number, matchRounds: number = HYPER_ROLL_ROUNDS): Unit[] {
  const enc = getBossEncounter(round, matchRounds);
  if (!enc) return [];
  return enc.units.map((spec, i) => {
    const isBoss = spec.boss ?? i === 0;
    return {
      u: `boss-${round}-${i}`,
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

export function shopPrice(offer: ShopOffer): number {
  const cost = HERO_MAP[offer.hid].cost;
  return offer.star === 1 ? cost : cost * MERGE_COPIES;
}

/** Collapse duplicate 1★ shop rolls into a single 2★ offer (pay for both copies). */
export function collapseShopOffers(hids: (string | null)[]): (ShopOffer | null)[] {
  const slots: (ShopOffer | null)[] = hids.map((hid) => (hid ? { hid, star: 1 as const } : null));
  const pending = new Map<string, number>();
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s || s.star !== 1) continue;
    const prev = pending.get(s.hid);
    if (prev != null && slots[prev]) {
      slots[prev] = { hid: s.hid, star: 2 };
      slots[i] = null;
      pending.delete(s.hid);
    } else {
      pending.set(s.hid, i);
    }
  }
  return slots;
}

export function rewardLines(reward: BossRewardGrant): string[] {
  const lines = [`◈${reward.gold}`];
  if (reward.freeRerolls > 0) {
    lines.push(reward.freeRerolls === 1 ? '1 free roll' : `${reward.freeRerolls} free rolls`);
  }
  if (reward.relic) lines.push('relic offer');
  return lines;
}

export function unitPower(u: Unit): number {
  const cost = HERO_MAP[u.hid]?.cost ?? 1;
  const copies = u.star === 1 ? 1 : u.star === 2 ? MERGE_COPIES : MERGE_COPIES * MERGE_COPIES;
  return cost * copies;
}
