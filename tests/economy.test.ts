import { beforeEach, describe, expect, it } from 'vitest';
import { GAUNTLET } from '../src/data/constants';
import {
  BOSS_LOSS_EXTRA,
  BOSS_SURVIVOR_COUNT,
  incomeBreakdown,
  INTEREST_MAX,
  LOSS_BASE,
  lossDamage,
  nextInterestAt,
  RELIC_PICKS_LOSS,
  RELIC_PICKS_WIN,
  RELIC_ROUNDS,
} from '../src/data/economy';
import { createGame, gameActions, resetUidCounter } from '../src/game/engine';
import { gauntletRoundIncome } from '../src/game/gauntlet';
import { seeded, setRng } from '../src/game/rng';

beforeEach(() => {
  setRng(seeded(1));
  resetUidCounter();
});

describe('income', () => {
  it('round 5 with 23 gold on a 3-win streak having won last = 9', () => {
    const b = incomeBreakdown(5, 23, 3, true);
    expect(b).toEqual({ base: 5, win: 1, interest: 2, streak: 1, total: 9 });
  });

  it('caps interest', () => {
    expect(incomeBreakdown(9, 200, 0, null).interest).toBe(INTEREST_MAX);
  });

  it('pays a loss streak too', () => {
    expect(incomeBreakdown(9, 0, -4, false).streak).toBe(2);
    expect(incomeBreakdown(9, 0, -1, false).streak).toBe(0);
  });

  it('names the next interest threshold, and null past the cap', () => {
    expect(nextInterestAt(7)).toBe(10);
    expect(nextInterestAt(23)).toBe(30);
    expect(nextInterestAt(31)).toBeNull();
  });
});

describe('loss damage', () => {
  it('is base only when the winner has nothing standing', () => {
    expect(lossDamage(5, 0)).toBe(LOSS_BASE(5));
  });

  it('a round-13 wipe by 8 survivors costs 26', () => {
    expect(lossDamage(13, 8)).toBe(26);
  });

  it('caps the survivor term', () => {
    expect(lossDamage(13, 12)).toBe(lossDamage(13, 8));
  });

  it('a boss counts as four units plus the boss surcharge', () => {
    expect(lossDamage(8, BOSS_SURVIVOR_COUNT, true)).toBe(
      LOSS_BASE(8) + 2 * BOSS_SURVIVOR_COUNT + BOSS_LOSS_EXTRA,
    );
  });
});

describe('resolveRound', () => {
  function bot(round: number) {
    const g = createGame('bot');
    g.round = round;
    g.phase = 'plan';
    g.board = [{ u: 'p1', hid: 'anans', star: 1, relics: [], r: 7, c: 2 }];
    return g;
  }

  it('scales the damage the loser takes with the winner’s survivors', () => {
    const few = bot(9);
    gameActions.resolveRound(few, false, few.matchRounds, { me: 0, foe: 1 });
    const many = bot(9);
    gameActions.resolveRound(many, false, many.matchRounds, { me: 0, foe: 6 });
    expect(100 - many.myHp).toBeGreaterThan(100 - few.myHp);
  });

  it('tracks a signed streak across wins and losses', () => {
    const g = bot(5);
    gameActions.resolveRound(g, true, g.matchRounds, { me: 3, foe: 0 });
    expect(g.streak).toBe(1);
    g.phase = 'plan';
    gameActions.resolveRound(g, true, g.matchRounds, { me: 3, foe: 0 });
    expect(g.streak).toBe(2);
    g.phase = 'plan';
    gameActions.resolveRound(g, false, g.matchRounds, { me: 0, foe: 3 });
    expect(g.streak).toBe(-1);
  });

  it.each([...RELIC_ROUNDS])('offers a relic on round %i, win or loss', (round) => {
    const win = bot(round);
    const wr = gameActions.resolveRound(win, true, win.matchRounds, { me: 2, foe: 0 });
    expect(wr.kind === 'result' && wr.offer).toBe(true);
    const loss = bot(round);
    const lr = gameActions.resolveRound(loss, false, loss.matchRounds, { me: 0, foe: 2 });
    expect(lr.kind === 'result' && lr.offer).toBe(true);
  });

  it('never offers a relic on round 2', () => {
    const g = bot(2);
    const r = gameActions.resolveRound(g, true, g.matchRounds, { me: 2, foe: 0 });
    expect(r.kind === 'result' && r.offer).toBe(false);
  });

  it('a round-8 boss win still offers a relic', () => {
    const g = bot(8);
    const r = gameActions.resolveRound(g, true, g.matchRounds, { me: 2, foe: 0 });
    expect(r.kind === 'result' && r.offer).toBe(true);
  });

  it('a win pays more picks than a loss', () => {
    expect(RELIC_PICKS_WIN).toBeGreaterThan(RELIC_PICKS_LOSS);
  });
});

describe('gauntlet income', () => {
  it('includes the interest term', () => {
    const flat = gauntletRoundIncome(3, 0);
    expect(gauntletRoundIncome(3, 25)).toBe(flat + 2);
  });

  it('still applies the loss toll before income', () => {
    const g = createGame('gauntlet');
    g.phase = 'plan';
    const before = g.gold;
    gameActions.resolveRound(g, false, g.matchRounds, { me: 0, foe: 4 });
    gameActions.nextRound(g, []);
    const afterToll = before - GAUNTLET.goldPenalty;
    expect(g.gold).toBe(afterToll + gauntletRoundIncome(2, afterToll));
  });
});
