import { beforeEach, describe, expect, it } from 'vitest';
import { BOSS_INCOMING_MULT, HERO_HP_MUL } from '../src/data/constants';
import { BOT_INCOME_BONUS, RELIC_ROUNDS } from '../src/data/economy';
import { isMeleeHero, HERO_MAP } from '../src/data/heroes';
import {
  applyTraits,
  combatant,
  combatOpponents,
  createGame,
  fitBossToTeam,
  gameActions,
  resetUidCounter,
  scaleFoeCombatants,
} from '../src/game/engine';
import { seeded, setRng } from '../src/game/rng';
import type { Difficulty } from '../src/game/types';

beforeEach(() => {
  setRng(seeded(1));
  resetUidCounter();
});

function countBotRelics(g: ReturnType<typeof createGame>): number {
  return g.foe.reduce((s, u) => s + u.relics.length, 0);
}

describe('bot relics', () => {
  it('gains exactly one relic on a relic round', () => {
    const g = createGame('bot');
    g.round = RELIC_ROUNDS[0] - 1;
    g.phase = 'result';
    g.lastResult = { win: true, dmg: 0, boss: false };
    const before = countBotRelics(g);
    gameActions.nextRound(g, g.foeDraft);
    expect(g.round).toBe(RELIC_ROUNDS[0]);
    expect(countBotRelics(g)).toBe(before + 1);
  });

  it('gains nothing on a plain round', () => {
    const g = createGame('bot');
    g.round = 1;
    g.phase = 'result';
    g.lastResult = { win: true, dmg: 0, boss: false };
    const before = countBotRelics(g);
    gameActions.nextRound(g, g.foeDraft);
    expect(g.round).toBe(2);
    expect(countBotRelics(g)).toBe(before);
  });

  it('binds to the strongest unit with room', () => {
    const g = createGame('bot');
    g.round = RELIC_ROUNDS[0] - 1;
    g.phase = 'result';
    g.lastResult = { win: true, dmg: 0, boss: false };
    gameActions.nextRound(g, g.foeDraft);
    const carriers = g.foe.filter((u) => u.relics.length > 0);
    expect(carriers.length).toBe(1);
    const best = g.foe
      .slice()
      .sort((a, b) => HERO_MAP[b.hid].cost * b.star - HERO_MAP[a.hid].cost * a.star)[0];
    expect(HERO_MAP[carriers[0].hid].cost * carriers[0].star).toBe(
      HERO_MAP[best.hid].cost * best.star,
    );
  });
});

describe('difficulty is bought with the bot wallet', () => {
  it('mythic pays 2 more a round than mortal, hard 1', () => {
    expect(BOT_INCOME_BONUS.normal).toBe(0);
    expect(BOT_INCOME_BONUS.hard).toBe(1);
    expect(BOT_INCOME_BONUS.mythic).toBe(2);
  });

  /** Same seed, same start: the only difference is the wallet. */
  function botPowerAfter(difficulty: Difficulty, rounds: number): number {
    setRng(seeded(4));
    resetUidCounter();
    const g = createGame('bot');
    for (let i = 0; i < rounds; i++) {
      g.phase = 'result';
      g.lastResult = { win: false, dmg: 0, boss: false };
      gameActions.nextRound(g, g.foeDraft, difficulty);
    }
    return [...g.foe, ...g.foeBench].reduce((s, u) => s + HERO_MAP[u.hid].cost * u.star, 0) + g.foeGold;
  }

  it('a richer bot ends up with a richer board', () => {
    const normal = botPowerAfter('normal', 8);
    const mythic = botPowerAfter('mythic', 8);
    expect(mythic).toBeGreaterThan(normal);
  });
});

describe('boss difficulty is one lever', () => {
  function bossAt(difficulty: Difficulty) {
    const g = createGame('bot');
    g.round = 8;
    g.board = [
      { u: 'a', hid: 'anans', star: 1, relics: [], r: 8, c: 1 },
      { u: 'b', hid: 'golem', star: 1, relics: [], r: 8, c: 2 },
    ];
    const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
    applyTraits(mine);
    const theirs = combatOpponents(g).map((u) => combatant(u, 'foe', g.heroHpMul));
    fitBossToTeam(theirs, mine, g.round);
    scaleFoeCombatants(theirs, difficulty);
    return theirs.find((u) => u.boss)!;
  }

  it('mythic HP is 1.45× mortal', () => {
    expect(bossAt('mythic').maxHp).toBe(Math.round(bossAt('normal').maxHp * 1.45));
  });

  it('bossTaken is identical at every difficulty', () => {
    expect(bossAt('normal').bossTaken).toBe(BOSS_INCOMING_MULT);
    expect(bossAt('hard').bossTaken).toBe(BOSS_INCOMING_MULT);
    expect(bossAt('mythic').bossTaken).toBe(BOSS_INCOMING_MULT);
  });
});

describe('bot placement', () => {
  it('never starts a ranged unit on row 3', () => {
    for (let seed = 1; seed <= 20; seed++) {
      setRng(seeded(seed));
      resetUidCounter();
      const g = createGame('bot');
      g.foe
        .filter((u) => !isMeleeHero(HERO_MAP[u.hid]))
        .forEach((u) => expect(u.r, `seed ${seed} ${u.hid}`).toBeLessThan(3));
    }
  });

  it('keeps every unit inside the foe half', () => {
    const g = createGame('bot');
    g.foe.forEach((u) => {
      expect(u.r).toBeGreaterThanOrEqual(0);
      expect(u.r).toBeLessThan(6);
    });
  });
});

describe('practice sandbox', () => {
  it('makes a foe board that never carries a boss', () => {
    const g = createGame('practice');
    g.round = 4;
    const opponents = combatOpponents(g);
    expect(opponents.every((u) => !u.boss)).toBe(true);
    const mine = [combatant({ u: 'p', hid: 'anans', star: 1, relics: [], r: 8, c: 1 }, 'me', HERO_HP_MUL)];
    expect(mine.length).toBe(1);
  });
});
