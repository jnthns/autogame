import { BOSS_ANCHOR, BOSS_FOOTPRINT, BOSS_HP_TEAM_MULT, BOSS_RANGE, HERO_HP_MUL, GAUNTLET, MARATHON, MERGE_COPIES, BOT_DRAFT_SIZE } from '../data/constants';
import { HEROES, HERO_MAP } from '../data/heroes';
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
} from './engine';
import {
  boardPower,
  gauntletGoldReward,
  getGauntletEncounter,
  makeGauntletBossUnits,
  pickGauntletRelics,
} from './gauntlet';
import {
  BOSS_ENCOUNTERS,
  BOSS_ROUNDS,
  HYPER_ROLL_ROUNDS,
  getBossEncounter,
  isBossRound,
  maxShopCost,
  periodInfo,
  shopWeight,
} from './hyperRoll';
import type { Unit } from './types';

function check(cond: boolean, msg: string, lines: string[]): boolean {
  lines.push(cond ? `ok  ${msg}` : `FAIL  ${msg}`);
  return cond;
}

export function runMatchSim(): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;
  const assert = (cond: boolean, msg: string) => {
    ok = check(cond, msg, lines) && ok;
  };

  assert(HYPER_ROLL_ROUNDS === 13, 'Hyper Roll is 13 rounds');
  assert(BOSS_ROUNDS.join(',') === '4,8,12', 'Bosses land on 4, 8, 12');
  for (const r of [1, 2, 3, 5, 6, 7, 9, 10, 11, 13]) {
    assert(!isBossRound(r), `round ${r} is PvP/bot`);
  }
  assert(periodInfo(4).isBoss && periodInfo(4).period === 1, 'round 4 is period 1 boss');
  assert(periodInfo(8).period === 2, 'round 8 is period 2');
  assert(periodInfo(12).period === 3, 'round 12 is period 3');
  assert(periodInfo(13).isFinal && !periodInfo(13).isBoss, 'round 13 is final PvP');
  assert(BOSS_ENCOUNTERS.length === 3, 'three boss encounters');
  assert(getBossEncounter(4)?.reward.gold === 6, 'mini-boss pays 6 gold');
  assert(getBossEncounter(8)?.reward.relic === true, 'mid boss offers a relic');
  assert(getBossEncounter(12)?.reward.gold === 14, 'final boss pays 14 gold');
  assert(shopWeight(1) === 6 && shopWeight(5) === 2, 'shop odds match cost table 7-cost');
  assert(maxShopCost(1) === 2 && maxShopCost(4) === 3 && maxShopCost(7) === 4 && maxShopCost(10) === 5, 'shop tier unlocks by round');

  const one: Unit = { u: 'a', hid: 'anans', star: 1, relics: [] };
  const two: Unit = { u: 'b', hid: 'anans', star: 2, relics: [] };
  const three: Unit = { u: 'c', hid: 'anans', star: 3, relics: [] };
  const cost = HERO_MAP.anans.cost;
  assert(sellValue(one) === cost, `1★ sells for full cost (${cost})`);
  assert(sellValue(two) === cost * MERGE_COPIES, `2★ sells for ${MERGE_COPIES}×cost (${cost * MERGE_COPIES})`);
  assert(
    sellValue(three) === cost * MERGE_COPIES * MERGE_COPIES - 1,
    `3★ sells for ${MERGE_COPIES * MERGE_COPIES}×cost − 1 (${cost * MERGE_COPIES * MERGE_COPIES - 1})`,
  );

  resetUidCounter();
  const g = createGame('bot');
  assert(g.matchRounds === 13, 'bot match is 13 rounds');
  assert(g.heroHpMul === HERO_HP_MUL, 'bot match uses global hero HP multiplier');
  assert(g.foeDraft.length === BOT_DRAFT_SIZE, `bot shop pool is ${BOT_DRAFT_SIZE} heroes`);
  assert(g.round === 1, 'starts round 1');
  assert(g.foe.length > 0, 'bot places a board on round 1');
  const ids1 = new Set([...g.foe, ...g.foeBench].map((u) => u.u));
  const snapshot1 = g.foe.map((u) => u.hid).sort().join(',');
  const opp1 = combatOpponents(g);
  assert(
    opp1.map((u) => u.u).join(',') === g.foe.map((u) => u.u).join(','),
    'PvP combat uses the persistent bot board',
  );

  g.phase = 'plan';
  gameActions.nextRound(g, g.foeDraft);
  const ids2 = new Set([...g.foe, ...g.foeBench].map((u) => u.u));
  const overlap = [...ids1].filter((id) => ids2.has(id)).length;
  assert(g.round === 2, 'nextRound increments');
  assert(g.foe.length > 0, 'bot board still present after nextRound');
  assert(overlap > 0, `bot roster persists across rounds (kept ${overlap}/${ids1.size} uids)`);

  g.round = 4;
  const bossOpp = combatOpponents(g);
  assert(bossOpp.length > 0 && bossOpp.every((u) => u.u.startsWith('boss-')), 'round 4 combat is the boss pack');
  assert(
    g.foe.every((u) => !u.u.startsWith('boss-')),
    'boss fight does not overwrite the persistent bot board',
  );

  const goldBefore = g.gold;
  const hpBefore = g.myHp;
  const foeHpBefore = g.foeHp;
  const result = gameActions.resolveRound(g, true, g.matchRounds);
  assert(result.kind === 'result' && result.win, 'beating a boss is a result overlay');
  assert(result.kind === 'result' && !!result.boss, 'overlay names the boss');
  assert(g.gold === goldBefore + 6, 'mini-boss gold is granted immediately');
  assert(g.freeRerolls >= 1, 'mini-boss grants a free shop roll');
  assert(g.foeHp === foeHpBefore, 'boss win does not damage the bot');
  assert(g.myHp === hpBefore, 'boss win does not damage the player');

  g.round = 4;
  g.phase = 'plan';
  g.myHp = 100;
  g.lossStreak = 0;
  const loss = gameActions.resolveRound(g, false, g.matchRounds);
  assert(loss.kind === 'result' && !loss.win, 'boss loss is not a soft-lock');
  assert(g.myHp < 100 && g.myHp > 0, 'boss loss deals standard HP, match continues');

  resetUidCounter();
  const sellG = createGame('bot');
  sellG.phase = 'plan';
  sellG.gold = 10;
  sellG.bench = [{ u: 'sell-me', hid: 'anans', star: 1, relics: [] }];
  sellG.sel = { u: 'sell-me', from: 'bench' };
  gameActions.sell(sellG);
  assert(sellG.bench.length === 0, 'sell removes the roster unit');
  assert(sellG.gold === 10 + cost, 'sell refunds immediately');
  assert(sellG.sel === null, 'sell clears selection');

  sellG.phase = 'combat';
  sellG.board = [{ u: 'locked', hid: 'anans', star: 1, relics: [], r: 5, c: 1 }];
  sellG.sel = { u: 'locked', from: 'board' };
  const lockedGold = sellG.gold;
  gameActions.sell(sellG);
  assert(sellG.board.length === 1 && sellG.gold === lockedGold, 'cannot sell during combat');

  resetUidCounter();
  const bench: Unit[] = [
    { u: uid(), hid: 'anans', star: 1, relics: [] },
    { u: uid(), hid: 'anans', star: 1, relics: [] },
  ];
  const board: Unit[] = [];
  mergeUnitLists(board, bench);
  assert(bench.length === 1 && bench[0].star === 2 && board.length === 0, '2×1★ on bench → 2★');

  resetUidCounter();
  board.length = 0;
  bench.length = 0;
  board.push(
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 },
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 1 },
  );
  mergeUnitLists(board, bench);
  assert(board.length === 1 && board[0].star === 3, '2×2★ on board → 3★');
  assert(
    ![...board, ...bench].some((u) => u.hid === 'anans' && u.star === 2),
    '2×2★ leaves no duplicate 2★',
  );

  resetUidCounter();
  const mergeG = createGame('practice');
  mergeG.board = [
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 },
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 1 },
  ];
  mergeG.bench = [];
  mergeG.shop = ['anans', null, null, null, null];
  mergeG.gold = 99;
  const twoBefore = countHeroStar(mergeG, 'anans', 2);
  gameActions.buy(mergeG, 0);
  applyMerges(mergeG, { boughtHid: 'anans', twoStarBeforeBuy: twoBefore });
  const all = [...mergeG.board, ...mergeG.bench].filter((u) => u.hid === 'anans');
  assert(
    all.filter((u) => u.star === 3).length === 1 &&
      all.filter((u) => u.star === 1).length === 1 &&
      all.filter((u) => u.star === 2).length === 0,
    '2×2★ + buy 1★ → 1×3★ + 1×1★',
  );

  resetUidCounter();
  const moveG = createGame('practice');
  moveG.board = [{ u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 }];
  moveG.bench = [{ u: uid(), hid: 'anans', star: 2, relics: [] }];
  mergeUnitLists(moveG.board, moveG.bench);
  assert(
    moveG.board.length === 1 && moveG.board[0].star === 3 && moveG.bench.length === 0,
    'bench+board 2×2★ merges across deck and board',
  );

  resetUidCounter();
  const leftover: Unit[] = [
    { u: uid(), hid: 'anans', star: 1, relics: [] },
    { u: uid(), hid: 'anans', star: 1, relics: [] },
    { u: uid(), hid: 'anans', star: 1, relics: [] },
  ];
  const leftoverBoard: Unit[] = [];
  mergeUnitLists(leftoverBoard, leftover);
  assert(
    leftover.filter((u) => u.star === 2).length === 1 && leftover.filter((u) => u.star === 1).length === 1,
    '3×1★ → 1×2★ + leftover 1★',
  );

  gameActions.nextRound(g, g.foeDraft);
  const snapshotLater = g.foe.map((u) => u.hid).sort().join(',');
  lines.push(`info bot round1 [${snapshot1}] later [${snapshotLater}] cap=${g.foe.length}`);

  resetUidCounter();
  const marathon = createGame('marathon');
  assert(marathon.matchRounds === 18, 'marathon is 18 rounds');
  assert(marathon.heroHpMul === HERO_HP_MUL * MARATHON.heroHpMul, 'marathon stacks global and mode HP multipliers');
  assert(marathon.foeDraft.length === BOT_DRAFT_SIZE, `marathon bot pool is ${BOT_DRAFT_SIZE} heroes`);
  assert(marathon.foe.length > 0, 'marathon starts with a bot board');
  assert(combatOpponents(marathon).every((u) => !u.u.startsWith('boss-')), 'marathon has no period bosses');

  resetUidCounter();
  const gauntlet = createGame('gauntlet');
  assert(gauntlet.mode === 'gauntlet', 'gauntlet mode flag');
  assert(gauntlet.gold === GAUNTLET.startGold, 'gauntlet starts with 8 gold');
  assert(gauntlet.gauntletLives === GAUNTLET.startLives, 'gauntlet starts with 3 lives');
  assert(gauntlet.foe.length === 0, 'gauntlet has no bot board');
  const gBoss = combatOpponents(gauntlet);
  assert(gBoss.length > 0 && gBoss.every((u) => u.u.startsWith('gauntlet-')), 'gauntlet round 1 is a boss pack');
  assert(gBoss.some((u) => u.boss), 'gauntlet boss pack includes a boss unit');
  const power = boardPower([{ u: 'x', hid: 'anans', star: 2, relics: [], r: 4, c: 0 }]);
  assert(power === HERO_MAP.anans.cost * 2, 'board power uses cost × star');
  assert(gauntletGoldReward(1) === GAUNTLET.baseGoldReward + GAUNTLET.goldPerRound, 'gauntlet gold scales by round');
  assert(getGauntletEncounter(5, power).reward.relic === true, 'every gauntlet boss offers a relic');
  assert(makeGauntletBossUnits(10, 20).length >= 2, 'gauntlet bosses scale with round');
  assert(pickGauntletRelics(25).length === 3, 'gauntlet relic picker returns 3 offers');

  gauntlet.phase = 'plan';
  gauntlet.board = [{ u: 'me', hid: 'anans', star: 1, relics: [], r: 4, c: 0 }];
  const gWin = gameActions.resolveRound(gauntlet, true, gauntlet.matchRounds);
  assert(gWin.kind === 'result' && gWin.win && gWin.offer, 'gauntlet boss win always offers relic');
  assert(gauntlet.gauntletRoundsCleared === 1, 'gauntlet tracks cleared rounds');

  resetUidCounter();
  const gLoss = createGame('gauntlet');
  gLoss.phase = 'plan';
  const gLossGoldBefore = gLoss.gold;
  const lossResult = gameActions.resolveRound(gLoss, false, gLoss.matchRounds);
  assert(lossResult.kind === 'result' && !lossResult.win, 'gauntlet boss loss continues with lives');
  assert(gLoss.gauntletLives === 2, 'gauntlet loses one life on boss defeat');
  assert(gLoss.gauntletGoldPenalty === GAUNTLET.goldPenalty, 'gauntlet sets gold penalty after loss');
  gameActions.nextRound(gLoss, []);
  assert(gLoss.gold === gLossGoldBefore - GAUNTLET.goldPenalty + 4, 'gauntlet applies gold penalty then round income');

  gLoss.gauntletLives = 0;
  gLoss.phase = 'plan';
  const over = gameActions.resolveRound(gLoss, false, gLoss.matchRounds);
  assert(over.kind === 'over', 'gauntlet ends at zero lives');

  for (const h of HEROES) {
    if (h.attack === 'melee') {
      assert(h.range === 1, `${h.id} melee-only uses range 1`);
    } else {
      assert(h.range >= 3 && h.range <= 4, `${h.id} ranged-only uses range 3–4`);
    }
  }
  assert(
    HEROES.filter((h) => h.attack === 'melee').length >= 8 &&
      HEROES.filter((h) => h.attack === 'ranged').length >= 8,
    'roster splits melee-only and ranged-only',
  );

  resetUidCounter();
  const hpG = createGame('bot');
  hpG.round = 4;
  hpG.board = [
    { u: uid(), hid: 'anans', star: 1, relics: [], r: 8, c: 1 },
    { u: uid(), hid: 'golem', star: 1, relics: [], r: 8, c: 2 },
    { u: uid(), hid: 'taniw', star: 1, relics: [], r: 9, c: 1 },
  ];
  const mine = hpG.board.map((u) => combatant(u, 'me', hpG.heroHpMul));
  applyTraits(mine);
  const theirs = combatOpponents(hpG).map((u) => combatant(u, 'foe', hpG.heroHpMul));
  fitBossToTeam(theirs, mine, hpG.round);
  const teamHp = mine.reduce((s, u) => s + u.maxHp, 0);
  const boss = theirs.find((u) => u.boss);
  assert(!!boss, 'period 1 fight has a boss unit');
  assert(boss!.footprint === BOSS_FOOTPRINT, 'boss occupies a 4×4 footprint');
  assert(boss!.r === BOSS_ANCHOR.r && boss!.c === BOSS_ANCHOR.c, 'boss is pinned to the 4×4 anchor');
  assert(boss!.rooted === true, 'boss is rooted');
  assert(boss!.range >= BOSS_RANGE, 'boss has board-wide range');
  assert(boss!.maxHp >= BOSS_HP_TEAM_MULT * teamHp, 'boss HP is at least 10× the current team');
  assert(theirs.filter((u) => u.boss).length === 1, 'exactly one 4×4 boss per encounter');
  theirs
    .filter((u) => !u.boss)
    .forEach((u) => {
      assert(
        u.r < BOSS_ANCHOR.r ||
          u.r >= BOSS_ANCHOR.r + BOSS_FOOTPRINT ||
          u.c < BOSS_ANCHOR.c ||
          u.c >= BOSS_ANCHOR.c + BOSS_FOOTPRINT,
        `${u.hid} minion does not overlap the 4×4 boss`,
      );
    });

  const later = createGame('bot');
  later.round = 12;
  later.board = hpG.board.map((u) => ({ ...u, star: 2 as const, u: uid() }));
  const mine2 = later.board.map((u) => combatant(u, 'me', later.heroHpMul));
  applyTraits(mine2);
  const theirs2 = combatOpponents(later).map((u) => combatant(u, 'foe', later.heroHpMul));
  fitBossToTeam(theirs2, mine2, later.round);
  const boss12 = theirs2.find((u) => u.boss)!;
  const team2 = mine2.reduce((s, u) => s + u.maxHp, 0);
  assert(boss12.maxHp >= BOSS_HP_TEAM_MULT * team2, 'later bosses still hold the 10× HP floor');
  assert(boss12.maxHp > boss!.maxHp, 'boss HP scales up with a stronger board and later round');

  const player = combatant({ u: 'p', hid: 'anans', star: 1, relics: [], r: 10, c: 0 }, 'me', HERO_HP_MUL);
  const rooted = { ...boss! };
  rooted.r = BOSS_ANCHOR.r;
  rooted.c = BOSS_ANCHOR.c;
  rooted.hp = rooted.maxHp;
  rooted.alive = true;
  const eng = new CombatEngine(
    () => undefined,
    () => undefined,
  );
  eng.C = [player, rooted];
  for (let i = 0; i < 80; i++) eng.simTick(0.1);
  assert(rooted.r === BOSS_ANCHOR.r && rooted.c === BOSS_ANCHOR.c, 'boss never walks off its anchor');

  return { ok, lines };
}
