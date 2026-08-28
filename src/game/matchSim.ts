import { HERO_MAP } from '../data/heroes';
import {
  applyMerges,
  combatOpponents,
  countHeroStar,
  createGame,
  gameActions,
  mergeUnitLists,
  resetUidCounter,
  sellValue,
  uid,
} from './engine';
import {
  BOSS_ENCOUNTERS,
  BOSS_ROUNDS,
  HYPER_ROLL_ROUNDS,
  getBossEncounter,
  isBossRound,
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

  const one: Unit = { u: 'a', hid: 'anans', star: 1, relics: [] };
  const two: Unit = { u: 'b', hid: 'anans', star: 2, relics: [] };
  const three: Unit = { u: 'c', hid: 'anans', star: 3, relics: [] };
  const cost = HERO_MAP.anans.cost;
  assert(sellValue(one) === cost, `1★ sells for full cost (${cost})`);
  assert(sellValue(two) === cost * 3 - 1, `2★ sells for 3×cost − 1 (${cost * 3 - 1})`);
  assert(sellValue(three) === cost * 5 - 1, `3★ sells for 5×cost − 1 (${cost * 5 - 1})`);

  resetUidCounter();
  const g = createGame('bot');
  assert(g.matchRounds === 13, 'bot match is 13 rounds');
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
    { u: uid(), hid: 'anans', star: 1, relics: [] },
  ];
  const board: Unit[] = [];
  mergeUnitLists(board, bench);
  assert(bench.length === 1 && bench[0].star === 2 && board.length === 0, '3×1★ → 2★');

  resetUidCounter();
  board.length = 0;
  bench.length = 0;
  board.push(
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 },
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 1 },
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 5, c: 0 },
  );
  mergeUnitLists(board, bench);
  assert(board.length === 1 && board[0].star === 3, '3×2★ → 3★');
  assert(
    ![...board, ...bench].some((u) => u.hid === 'anans' && u.star === 2),
    '3×2★ leaves no duplicate 2★',
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
  moveG.board = [
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 0 },
    { u: uid(), hid: 'anans', star: 2, relics: [], r: 4, c: 1 },
  ];
  moveG.bench = [{ u: uid(), hid: 'anans', star: 2, relics: [] }];
  mergeUnitLists(moveG.board, moveG.bench);
  assert(
    moveG.board.length === 1 && moveG.board[0].star === 3 && moveG.bench.length === 0,
    'bench+board 3×2★ merges on placement check',
  );

  gameActions.nextRound(g, g.foeDraft);
  const snapshotLater = g.foe.map((u) => u.hid).sort().join(',');
  lines.push(`info bot round1 [${snapshot1}] later [${snapshotLater}] cap=${g.foe.length}`);

  return { ok, lines };
}
