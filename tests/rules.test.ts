import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOSS_ANCHOR,
  BOSS_FOOTPRINT,
  BOSS_HP_TEAM_MULT,
  BOSS_RANGE,
  BOT_BOARD_CAPS,
  BOT_DRAFT_SIZE,
  GAUNTLET,
  HERO_HP_MUL,
  MARATHON,
  MARATHON_BOSS_ROUNDS,
  MATCH_DEFAULTS,
  MERGE_COPIES,
} from '../src/data/constants';
import { HEROES, HERO_MAP } from '../src/data/heroes';
import {
  applyMerges,
  applyTraits,
  CombatEngine,
  combatant,
  combatOpponents,
  countHeroStar,
  createGame,
  fitBossToTeam,
  gameActions,
  mergeUnitLists,
  resetUidCounter,
  sellValue,
  uid,
} from '../src/game/engine';
import {
  boardPower,
  gauntletGoldReward,
  getGauntletEncounter,
  makeGauntletBossUnits,
  pickGauntletRelics,
} from '../src/game/gauntlet';
import {
  BOSS_ENCOUNTERS,
  BOSS_ROUNDS,
  HYPER_ROLL_ROUNDS,
  collapseShopOffers,
  getBossEncounter,
  isBossRound,
  periodInfo,
  shopPrice,
} from '../src/game/hyperRoll';
import { seeded, setRng } from '../src/game/rng';
import type { Unit } from '../src/game/types';

beforeEach(() => {
  setRng(seeded(1));
  resetUidCounter();
});

describe('round structure', () => {
  it('Hyper Roll is 13 rounds', () => {
    expect(HYPER_ROLL_ROUNDS).toBe(13);
  });

  it('Bosses land on 4, 8, 12', () => {
    expect(BOSS_ROUNDS.join(',')).toBe('4,8,12');
  });

  it('marathon bosses land on 4, 8, 12, 16', () => {
    expect(MARATHON_BOSS_ROUNDS.join(',')).toBe('4,8,12,16');
  });

  it('early board caps stay tight', () => {
    expect(BOT_BOARD_CAPS[0]).toBe(2);
    expect(BOT_BOARD_CAPS[3]).toBe(3);
    expect(BOT_BOARD_CAPS[7]).toBe(5);
  });

  it.each([1, 2, 3, 5, 6, 7, 9, 10, 11, 13])('round %i is PvP/bot', (r) => {
    expect(isBossRound(r)).toBe(false);
  });

  it('round 4 is period 1 boss', () => {
    expect(periodInfo(4).isBoss).toBe(true);
    expect(periodInfo(4).period).toBe(1);
  });

  it('round 8 is period 2', () => {
    expect(periodInfo(8).period).toBe(2);
  });

  it('round 12 is period 3', () => {
    expect(periodInfo(12).period).toBe(3);
  });

  it('round 13 is final PvP', () => {
    expect(periodInfo(13).isFinal).toBe(true);
    expect(periodInfo(13).isBoss).toBe(false);
  });

  it('three boss encounters', () => {
    expect(BOSS_ENCOUNTERS.length).toBe(3);
  });

  it('mini-boss pays 6 gold', () => {
    expect(getBossEncounter(4)?.reward.gold).toBe(6);
  });

  it('mid boss offers a relic', () => {
    expect(getBossEncounter(8)?.reward.relic).toBe(true);
  });

  it('final boss pays 14 gold', () => {
    expect(getBossEncounter(12)?.reward.gold).toBe(14);
  });
});

describe('selling', () => {
  const cost = HERO_MAP.anans.cost;

  it('1★ sells for cost minus the scout tax', () => {
    expect(sellValue({ u: 'a', hid: 'anans', star: 1, relics: [] })).toBe(Math.max(1, cost - 1));
  });

  it('2★ sells with combine tax', () => {
    expect(sellValue({ u: 'b', hid: 'anans', star: 2, relics: [] })).toBe(cost * MERGE_COPIES - 1);
  });

  it('3★ sells for 3×cost', () => {
    expect(sellValue({ u: 'c', hid: 'anans', star: 3, relics: [] })).toBe(cost * 3);
  });

  it('sell removes the roster unit, refunds immediately, clears selection', () => {
    const g = createGame('bot');
    g.phase = 'plan';
    g.gold = 10;
    g.bench = [{ u: 'sell-me', hid: 'anans', star: 1, relics: [] }];
    g.sel = { u: 'sell-me', from: 'bench' };
    gameActions.sell(g);
    expect(g.bench.length).toBe(0);
    expect(g.gold).toBe(10 + Math.max(1, HERO_MAP.anans.cost - 1));
    expect(g.sel).toBeNull();
  });

  it('cannot sell during combat', () => {
    const g = createGame('bot');
    g.phase = 'combat';
    g.gold = 10;
    g.board = [{ u: 'locked', hid: 'anans', star: 1, relics: [], r: 5, c: 1 }];
    g.sel = { u: 'locked', from: 'board' };
    gameActions.sell(g);
    expect(g.board.length).toBe(1);
    expect(g.gold).toBe(10);
  });
});

describe('merging', () => {
  it('2×1★ on bench → 2★', () => {
    const bench: Unit[] = [
      { u: uid(), hid: 'anans', star: 1, relics: [] },
      { u: uid(), hid: 'anans', star: 1, relics: [] },
    ];
    const board: Unit[] = [];
    mergeUnitLists(board, bench);
    expect(bench.length).toBe(1);
    expect(bench[0].star).toBe(2);
    expect(board.length).toBe(0);
  });

  it('2×2★ on board → 3★ with no duplicate 2★', () => {
    const board: Unit[] = [
      { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 },
      { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 1 },
    ];
    const bench: Unit[] = [];
    mergeUnitLists(board, bench);
    expect(board.length).toBe(1);
    expect(board[0].star).toBe(3);
    expect([...board, ...bench].some((u) => u.hid === 'anans' && u.star === 2)).toBe(false);
  });

  it('2×2★ + buy 1★ → 1×3★ + 1×1★', () => {
    const g = createGame('practice');
    g.board = [
      { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 },
      { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 1 },
    ];
    g.bench = [];
    g.shop = [{ hid: 'anans', star: 1 }, null, null, null, null];
    g.gold = 99;
    const twoBefore = countHeroStar(g, 'anans', 2);
    gameActions.buy(g, 0);
    applyMerges(g, { boughtHid: 'anans', twoStarBeforeBuy: twoBefore });
    const all = [...g.board, ...g.bench].filter((u) => u.hid === 'anans');
    expect(all.filter((u) => u.star === 3).length).toBe(1);
    expect(all.filter((u) => u.star === 1).length).toBe(1);
    expect(all.filter((u) => u.star === 2).length).toBe(0);
  });

  it('bench+board 2×2★ merges across deck and board', () => {
    const g = createGame('practice');
    g.board = [{ u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 }];
    g.bench = [{ u: uid(), hid: 'anans', star: 2, relics: [] }];
    mergeUnitLists(g.board, g.bench);
    expect(g.board.length).toBe(1);
    expect(g.board[0].star).toBe(3);
    expect(g.bench.length).toBe(0);
  });

  it('3×1★ → 1×2★ + leftover 1★', () => {
    const bench: Unit[] = [
      { u: uid(), hid: 'anans', star: 1, relics: [] },
      { u: uid(), hid: 'anans', star: 1, relics: [] },
      { u: uid(), hid: 'anans', star: 1, relics: [] },
    ];
    mergeUnitLists([], bench);
    expect(bench.filter((u) => u.star === 2).length).toBe(1);
    expect(bench.filter((u) => u.star === 1).length).toBe(1);
  });
});

describe('shop offers', () => {
  it('duplicate shop copies collapse to one offer', () => {
    const slots = collapseShopOffers(['anans', 'anans', 'jorm', null, 'kitsu']);
    expect(slots.filter(Boolean).length).toBe(3);
    expect(slots.some((s) => s && s.hid === 'anans' && s.star === 2)).toBe(true);
  });

  it('2★ shop costs two copies', () => {
    expect(shopPrice({ hid: 'anans', star: 2 })).toBe(HERO_MAP.anans.cost * MERGE_COPIES);
  });

  it('1★ shop costs the hero cost', () => {
    expect(shopPrice({ hid: 'anans', star: 1 })).toBe(HERO_MAP.anans.cost);
  });
});

describe('bot match', () => {
  it('starts a 13-round hyper roll with a placed bot board', () => {
    const g = createGame('bot');
    expect(g.matchRounds).toBe(13);
    expect(g.gold).toBe(MATCH_DEFAULTS.startGold);
    expect(g.heroHpMul).toBe(HERO_HP_MUL);
    expect(g.foeDraft.length).toBe(BOT_DRAFT_SIZE);
    expect(g.round).toBe(1);
    expect(g.foe.length).toBeGreaterThan(0);
  });

  it('PvP combat uses the persistent bot board', () => {
    const g = createGame('bot');
    expect(combatOpponents(g).map((u) => u.u).join(',')).toBe(g.foe.map((u) => u.u).join(','));
  });

  it('bot roster persists across rounds', () => {
    const g = createGame('bot');
    const ids1 = new Set([...g.foe, ...g.foeBench].map((u) => u.u));
    g.phase = 'plan';
    gameActions.nextRound(g, g.foeDraft);
    const ids2 = new Set([...g.foe, ...g.foeBench].map((u) => u.u));
    expect(g.round).toBe(2);
    expect(g.foe.length).toBeGreaterThan(0);
    expect([...ids1].filter((id) => ids2.has(id)).length).toBeGreaterThan(0);
  });

  it('round 4 combat is the boss pack and leaves the bot board alone', () => {
    const g = createGame('bot');
    g.round = 4;
    const opp = combatOpponents(g);
    expect(opp.length).toBeGreaterThan(0);
    expect(opp.every((u) => u.u.startsWith('boss-'))).toBe(true);
    expect(g.foe.every((u) => !u.u.startsWith('boss-'))).toBe(true);
  });

  it('beating a boss grants gold and a free roll without HP swings', () => {
    const g = createGame('bot');
    g.round = 4;
    const goldBefore = g.gold;
    const hpBefore = g.myHp;
    const foeHpBefore = g.foeHp;
    const result = gameActions.resolveRound(g, true, g.matchRounds);
    expect(result.kind).toBe('result');
    expect(result.kind === 'result' && result.win).toBe(true);
    expect(result.kind === 'result' && !!result.boss).toBe(true);
    expect(g.gold).toBe(goldBefore + 6);
    expect(g.freeRerolls).toBeGreaterThanOrEqual(1);
    expect(g.foeHp).toBe(foeHpBefore);
    expect(g.myHp).toBe(hpBefore);
  });

  it('boss loss is not a soft-lock', () => {
    const g = createGame('bot');
    g.round = 4;
    g.phase = 'plan';
    g.myHp = 100;
    const loss = gameActions.resolveRound(g, false, g.matchRounds);
    expect(loss.kind).toBe('result');
    expect(loss.kind === 'result' && loss.win).toBe(false);
    expect(g.myHp).toBeLessThan(100);
    expect(g.myHp).toBeGreaterThan(0);
  });
});

describe('marathon', () => {
  it('is 18 rounds with stacked HP multipliers', () => {
    const m = createGame('marathon');
    expect(m.matchRounds).toBe(18);
    expect(m.heroHpMul).toBe(HERO_HP_MUL * MARATHON.heroHpMul);
    expect(m.foeDraft.length).toBe(BOT_DRAFT_SIZE);
    expect(m.foe.length).toBeGreaterThan(0);
    expect(combatOpponents(m).every((u) => !u.u.startsWith('boss-'))).toBe(true);
  });

  it('round 4 is a solo 4×4 boss', () => {
    const m = createGame('marathon');
    m.round = 4;
    const boss = combatOpponents(m);
    expect(boss.length).toBe(1);
    expect(boss[0].boss).toBe(true);
  });

  it('round 16 reuses Clay Colossus and is marathon-only', () => {
    expect(getBossEncounter(16, 18)?.id).toBe('clay-colossus');
    expect(isBossRound(16, 18)).toBe(true);
    expect(isBossRound(16)).toBe(false);
  });
});

describe('gauntlet', () => {
  it('starts with lives, gold, and a boss pack', () => {
    const g = createGame('gauntlet');
    expect(g.mode).toBe('gauntlet');
    expect(g.gold).toBe(GAUNTLET.startGold);
    expect(g.gauntletLives).toBe(GAUNTLET.startLives);
    expect(g.foe.length).toBe(0);
    const boss = combatOpponents(g);
    expect(boss.length).toBeGreaterThan(0);
    expect(boss.every((u) => u.u.startsWith('gauntlet-'))).toBe(true);
    expect(boss.some((u) => u.boss)).toBe(true);
  });

  it('board power uses cost × star', () => {
    expect(boardPower([{ u: 'x', hid: 'anans', star: 2, relics: [], r: 4, c: 0 }])).toBe(
      HERO_MAP.anans.cost * 2,
    );
  });

  it('gauntlet gold scales by round', () => {
    expect(gauntletGoldReward(1)).toBe(GAUNTLET.baseGoldReward + GAUNTLET.goldPerRound);
  });

  it('every gauntlet boss offers a relic and is a solo 4×4', () => {
    expect(getGauntletEncounter(5, 10).reward.relic).toBe(true);
    expect(makeGauntletBossUnits(10, 20).length).toBe(1);
  });

  it('gauntlet relic picker returns 3 offers', () => {
    expect(pickGauntletRelics(25).length).toBe(3);
  });

  it('boss win offers a relic and tracks cleared rounds', () => {
    const g = createGame('gauntlet');
    g.phase = 'plan';
    g.board = [{ u: 'me', hid: 'anans', star: 1, relics: [], r: 4, c: 0 }];
    const win = gameActions.resolveRound(g, true, g.matchRounds);
    expect(win.kind === 'result' && win.win && win.offer).toBe(true);
    expect(g.gauntletRoundsCleared).toBe(1);
  });

  it('a loss costs a life and sets the gold penalty', () => {
    const g = createGame('gauntlet');
    g.phase = 'plan';
    const goldBefore = g.gold;
    const loss = gameActions.resolveRound(g, false, g.matchRounds);
    expect(loss.kind === 'result' && !loss.win).toBe(true);
    expect(g.gauntletLives).toBe(2);
    expect(g.gauntletGoldPenalty).toBe(GAUNTLET.goldPenalty);
    gameActions.nextRound(g, []);
    expect(g.gold).toBe(goldBefore - GAUNTLET.goldPenalty + gauntletIncomeRound2());
  });

  it('ends at zero lives', () => {
    const g = createGame('gauntlet');
    g.gauntletLives = 0;
    g.phase = 'plan';
    expect(gameActions.resolveRound(g, false, g.matchRounds).kind).toBe('over');
  });
});

function gauntletIncomeRound2(): number {
  // round 2 income: base only, no gold banked past the interest threshold after the penalty.
  return GAUNTLET.baseRoundIncome;
}

describe('roster shape', () => {
  it.each(HEROES.map((h) => [h.id, h] as const))('%s uses a legal attack range', (_id, h) => {
    if (h.attack === 'melee') expect(h.range).toBe(1);
    else {
      expect(h.range).toBeGreaterThanOrEqual(3);
      expect(h.range).toBeLessThanOrEqual(4);
    }
  });

  it('roster splits melee-only and ranged-only', () => {
    expect(HEROES.filter((h) => h.attack === 'melee').length).toBeGreaterThanOrEqual(12);
    expect(HEROES.filter((h) => h.attack === 'ranged').length).toBeGreaterThanOrEqual(6);
  });

  it.each(['anans', 'kitsu', 'coyot', 'nuwa'])('%s stays melee from lore', (id) => {
    expect(HERO_MAP[id].attack).toBe('melee');
    expect(HERO_MAP[id].range).toBe(1);
  });

  it('Garuda and Camazotz stay adjacent', () => {
    expect(HERO_MAP.garud.attack).toBe('melee');
    expect(HERO_MAP.camaz.attack).toBe('melee');
  });
});

describe('practice', () => {
  it('never spawns period turret bosses', () => {
    const g = createGame('practice');
    g.round = 4;
    expect(combatOpponents(g).every((u) => !u.boss)).toBe(true);
  });
});

describe('bosses', () => {
  function bossFight(round: number, star: 1 | 2 = 1) {
    const g = createGame('bot');
    g.round = round;
    g.board = [
      { u: uid(), hid: 'anans', star, relics: [], r: 8, c: 1 },
      { u: uid(), hid: 'golem', star, relics: [], r: 8, c: 2 },
      { u: uid(), hid: 'taniw', star, relics: [], r: 9, c: 1 },
    ];
    const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
    applyTraits(mine);
    const theirs = combatOpponents(g).map((u) => combatant(u, 'foe', g.heroHpMul));
    fitBossToTeam(theirs, mine, round);
    return { mine, theirs, boss: theirs.find((u) => u.boss)! };
  }

  it('is a single rooted 4×4 turret with board-wide range', () => {
    const { boss, theirs } = bossFight(4);
    expect(boss).toBeTruthy();
    expect(boss.footprint).toBe(BOSS_FOOTPRINT);
    expect(boss.r).toBe(BOSS_ANCHOR.r);
    expect(boss.c).toBe(BOSS_ANCHOR.c);
    expect(boss.rooted).toBe(true);
    expect(boss.range).toBeGreaterThanOrEqual(BOSS_RANGE);
    expect(theirs.filter((u) => u.boss).length).toBe(1);
    expect(theirs.length).toBe(1);
  });

  it('holds the HP floor above the live team', () => {
    const { mine, boss } = bossFight(4);
    const teamHp = mine.reduce((s, u) => s + u.maxHp, 0);
    expect(boss.maxHp).toBeGreaterThanOrEqual(BOSS_HP_TEAM_MULT * teamHp);
  });

  it('scales up with a stronger board and later round', () => {
    const early = bossFight(4);
    const late = bossFight(12, 2);
    const team2 = late.mine.reduce((s, u) => s + u.maxHp, 0);
    expect(late.boss.maxHp).toBeGreaterThanOrEqual(BOSS_HP_TEAM_MULT * team2);
    expect(late.boss.maxHp).toBeGreaterThan(early.boss.maxHp);
  });

  it('never walks off its anchor', () => {
    const { boss } = bossFight(4);
    const player = combatant({ u: 'p', hid: 'anans', star: 1, relics: [], r: 10, c: 0 }, 'me', HERO_HP_MUL);
    const rooted = { ...boss, r: BOSS_ANCHOR.r, c: BOSS_ANCHOR.c, hp: boss.maxHp, alive: true };
    const eng = new CombatEngine(
      () => undefined,
      () => undefined,
    );
    eng.C = [player, rooted];
    for (let i = 0; i < 80; i++) eng.simTick(0.1);
    expect(rooted.r).toBe(BOSS_ANCHOR.r);
    expect(rooted.c).toBe(BOSS_ANCHOR.c);
  });
});

describe('kiting', () => {
  it('ranged heroes kite out of melee instead of autoing adjacent', () => {
    const ranger = combatant({ u: 'ranger', hid: 'quetz', star: 1, relics: [], r: 7, c: 2 }, 'me', HERO_HP_MUL);
    const dummy = combatant({ u: 'dummy', hid: 'bunyi', star: 1, relics: [], r: 6, c: 2 }, 'foe', HERO_HP_MUL);
    dummy.atk = 0;
    dummy.snare = 99;
    ranger.atk = 0;
    const eng = new CombatEngine(
      () => undefined,
      () => undefined,
    );
    eng.C = [ranger, dummy];
    expect(eng.dist(ranger, dummy)).toBeLessThan(2);
    for (let i = 0; i < 30; i++) eng.simTick(0.1);
    expect(eng.dist(ranger, dummy)).toBeGreaterThanOrEqual(2);
  });
});
