import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOSS_ANCHOR,
  BOSS_AS,
  BOSS_AUTO_SHARE,
  BOSS_BOARD_SURVIVAL,
  BOSS_BURN_SECONDS,
  BOSS_CAST_PERIOD_SECONDS,
  BOSS_HP_TEAM_MULT,
  BOSS_INCOMING_MULT,
  HERO_HP_MUL,
} from '../src/data/constants';
import { BOSS_KIT_SCALE } from '../src/data/bosses';
import { REF_ANCHORS, refEffectiveDps, refTeam } from '../src/data/bossCurve';
import {
  applyTraits,
  bossCastDamage,
  CombatEngine,
  combatant,
  combatOpponents,
  createGame,
  fitBossToTeam,
  resetUidCounter,
  uid,
} from '../src/game/engine';
import { seeded, setRng } from '../src/game/rng';
import type { Combatant, Unit } from '../src/game/types';

beforeEach(() => {
  setRng(seeded(1));
  resetUidCounter();
});

function bossFor(round: number, board: Unit[], gauntlet = false): Combatant {
  const g = createGame(gauntlet ? 'gauntlet' : 'bot');
  g.round = round;
  g.board = board;
  const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
  applyTraits(mine);
  const theirs = combatOpponents(g).map((u) => combatant(u, 'foe', g.heroHpMul));
  fitBossToTeam(theirs, round, { gauntlet });
  return theirs.find((u) => u.boss)!;
}

const oneUnit: Unit[] = [{ u: 'a', hid: 'anans', star: 1, relics: [], r: 8, c: 1 }];
const sixTwoStar: Unit[] = ['anans', 'golem', 'taniw', 'kitsu', 'jorm', 'thund'].map((hid, i) => ({
  u: `u${i}`,
  hid,
  star: 2 as const,
  relics: [],
  r: 8 + (i % 2),
  c: i % 3,
}));

describe('the boss curve is absolute', () => {
  it('round 8 HP is identical for a 1-unit board and a 6-unit 2★ board', () => {
    expect(bossFor(8, oneUnit).maxHp).toBe(bossFor(8, sixTwoStar).maxHp);
  });

  it('grows with the round', () => {
    const r4 = bossFor(4, oneUnit).maxHp;
    const r8 = bossFor(8, oneUnit).maxHp;
    const r12 = bossFor(12, oneUnit).maxHp;
    expect(r12).toBeGreaterThan(r8);
    expect(r8).toBeGreaterThan(r4);
  });

  it('a gauntlet boss ramps faster than a ranked one at the same round', () => {
    expect(bossFor(12, oneUnit, true).maxHp).toBeGreaterThan(bossFor(12, oneUnit).maxHp);
  });

  it('takes the same incoming damage at every round', () => {
    expect(bossFor(4, oneUnit).bossTaken).toBe(BOSS_INCOMING_MULT);
    expect(bossFor(12, oneUnit).bossTaken).toBe(BOSS_INCOMING_MULT);
  });
});

describe('the fight is winnable by construction', () => {
  it.each([4, 8, 12])('the reference board burns the boss well before it dies at round %i', (round) => {
    const boss = bossFor(round, oneUnit);
    const burnSeconds = boss.maxHp / (refEffectiveDps(round) * BOSS_INCOMING_MULT);
    expect(burnSeconds).toBeLessThan(BOSS_BOARD_SURVIVAL);
    // And by a real margin, not the two seconds the pre-B7 model allowed.
    expect(BOSS_BOARD_SURVIVAL - burnSeconds).toBeGreaterThanOrEqual(5);
  });

  it('sets HP from the burn target, above the sanity floor', () => {
    const round = 8;
    const ref = refTeam(round);
    const boss = bossFor(round, oneUnit);
    expect(boss.maxHp / (refEffectiveDps(round) * BOSS_INCOMING_MULT)).toBeCloseTo(
      BOSS_BURN_SECONDS * (1 + (round - 1) * 0.025),
      0,
    );
    expect(boss.maxHp).toBeGreaterThan(BOSS_HP_TEAM_MULT * ref.hp);
  });

  it('splits the wipe budget between autos and the kit', () => {
    const round = 8;
    const ref = refTeam(round);
    const boss = bossFor(round, oneUnit);
    const autoPerSecond = boss.atk * BOSS_AS;
    // Divide the kit's own weight back out: the budget is defined at parity,
    // and each kit trades around it to set that round's difficulty.
    const cast = bossCastDamage(round, 'storm');
    const castPerSecond = cast.slam / BOSS_KIT_SCALE.storm.slam / BOSS_CAST_PERIOD_SECONDS;
    // Autos alone take longer than the survival window; the two together hit it.
    expect(ref.avgHp / autoPerSecond).toBeGreaterThan(BOSS_BOARD_SURVIVAL);
    expect(ref.avgHp / (autoPerSecond + castPerSecond)).toBeCloseTo(BOSS_BOARD_SURVIVAL, 0);
  });

  it("counts a kit's burning ground inside its damage, not on top", () => {
    const round = 12;
    const coil = bossCastDamage(round, 'coil');
    const storm = bossCastDamage(round, 'storm');
    const coilTotal = coil.slam + coil.burnPerSec * (BOSS_KIT_SCALE.coil.burnSeconds ?? 4);
    const stormTotal = storm.slam;
    expect(coil.burnPerSec).toBeGreaterThan(0);
    expect(storm.burnPerSec).toBe(0);
    // Coil is the heaviest kit, but only by its slam weight — not by 2.6×.
    expect(coilTotal / stormTotal).toBeCloseTo(
      BOSS_KIT_SCALE.coil.slam / BOSS_KIT_SCALE.storm.slam,
      5,
    );
  });
});

describe('the reference curve', () => {
  it('is monotone in HP and DPS across the anchors', () => {
    const rounds = Object.keys(REF_ANCHORS).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < rounds.length; i++) {
      expect(REF_ANCHORS[rounds[i]].hp).toBeGreaterThan(REF_ANCHORS[rounds[i - 1]].hp);
      expect(REF_ANCHORS[rounds[i]].dps).toBeGreaterThan(REF_ANCHORS[rounds[i - 1]].dps);
    }
  });

  it('interpolates between anchors and extrapolates past the last', () => {
    const six = refTeam(6);
    expect(six.hp).toBeGreaterThan(REF_ANCHORS[4].hp);
    expect(six.hp).toBeLessThan(REF_ANCHORS[8].hp);
    expect(refTeam(20).hp).toBeGreaterThan(REF_ANCHORS[16].hp);
  });

  it('clamps below the first anchor', () => {
    expect(refTeam(0)).toEqual(REF_ANCHORS[1]);
  });
});

describe('boss kits', () => {
  it('kit weights stay within ±30% of parity', () => {
    Object.values(BOSS_KIT_SCALE).forEach((k) => {
      expect(k.slam).toBeGreaterThanOrEqual(0.7);
      expect(k.slam).toBeLessThanOrEqual(1.3);
    });
  });

  it('a slam scales with the round, not with the player board', () => {
    const dummy = (round: number) => {
      const boss = bossFor(round, oneUnit);
      const target = combatant(
        { u: uid(), hid: 'golem', star: 1, relics: [], r: 8, c: 2 },
        'me',
        HERO_HP_MUL,
      );
      target.maxHp = 1e7;
      target.hp = 1e7;
      const eng = new CombatEngine(
        () => undefined,
        () => undefined,
      );
      eng.C = [boss, target];
      boss.mana = 100;
      eng.cast(boss, target);
      return 1e7 - target.hp;
    };
    expect(dummy(12)).toBeGreaterThan(dummy(4));
  });

  it('stays pinned to the anchor while casting', () => {
    const boss = bossFor(4, oneUnit);
    expect(boss.r).toBe(BOSS_ANCHOR.r);
    expect(boss.c).toBe(BOSS_ANCHOR.c);
  });
});
