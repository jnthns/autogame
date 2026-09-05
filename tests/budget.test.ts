import { beforeEach, describe, expect, it } from 'vitest';
import { HERO_HP_MUL, STARMUL } from '../src/data/constants';
import { HEROES } from '../src/data/heroes';
import { ABILITIES } from '../src/data/abilities';
import { CombatEngine, combatant } from '../src/game/engine';
import { seeded, setRng } from '../src/game/rng';
import {
  A30_TOLERANCE,
  A30_UNREACHABLE,
  budgetRow,
  P_TOLERANCE,
} from '../src/sim/budget';

beforeEach(() => {
  setRng(seeded(1));
});

describe('stat budget', () => {
  it.each(HEROES.map((h) => [h.id, h] as const))('%s is within the P band', (_id, h) => {
    const row = budgetRow(h);
    expect(Math.abs(row.pDelta)).toBeLessThanOrEqual(P_TOLERANCE);
  });
});

describe('ability budget', () => {
  const scalable = HEROES.filter((h) => !A30_UNREACHABLE.has(h.id));

  it.each(scalable.map((h) => [h.id, h] as const))('%s is within the A30 band', (_id, h) => {
    const row = budgetRow(h);
    expect(Math.abs(row.a30Delta)).toBeLessThanOrEqual(A30_TOLERANCE);
  });

  it('every hero has an ability row', () => {
    HEROES.forEach((h) => expect(ABILITIES[h.id], h.id).toBeTruthy());
  });

  it('no budgetBias exceeds ±0.10', () => {
    Object.entries(ABILITIES).forEach(([id, def]) => {
      expect(Math.abs(def.budgetBias ?? 0), id).toBeLessThanOrEqual(0.1);
    });
  });
});

describe('star multipliers', () => {
  it('a 2★ is worth less than three 1★ of effective power', () => {
    expect(STARMUL[2] * STARMUL[2]).toBeLessThan(3.0);
  });

  it('a 3★ stays under the 8.5 effective-power ceiling', () => {
    expect(STARMUL[3] * STARMUL[3]).toBeLessThan(8.5);
  });
});

describe('Taniwha damage buff', () => {
  it("increases an ally's next attack by 15%", () => {
    const mk = (hid: string, side: 'me' | 'foe', r: number, c: number) =>
      combatant({ u: `${hid}-${r}`, hid, star: 1, relics: [], r, c }, side, HERO_HP_MUL);
    const ally = mk('camaz', 'me', 6, 2);
    const foe = mk('golem', 'foe', 5, 2);
    foe.maxHp = 1e6;
    foe.hp = 1e6;
    ally.crit = 0;

    const eng = new CombatEngine(
      () => undefined,
      () => undefined,
    );
    eng.C = [ally, foe];
    const plain = eng.hurt(ally, foe, 100, 'phys');

    ally.dmgBuff = 0.15;
    ally.dmgBuffT = 4;
    const buffed = eng.hurt(ally, foe, 100, 'phys');

    expect(buffed / plain).toBeCloseTo(1.15, 5);
  });

  it('expires with its timer', () => {
    const u = combatant({ u: 'a', hid: 'camaz', star: 1, relics: [], r: 6, c: 2 }, 'me', HERO_HP_MUL);
    const foe = combatant({ u: 'b', hid: 'golem', star: 1, relics: [], r: 5, c: 2 }, 'foe', HERO_HP_MUL);
    foe.maxHp = 1e6;
    foe.hp = 1e6;
    u.dmgBuff = 0.15;
    u.dmgBuffT = 4;
    const eng = new CombatEngine(
      () => undefined,
      () => undefined,
    );
    eng.C = [u, foe];
    for (let i = 0; i < 60; i++) eng.simTick(0.1);
    expect(u.dmgBuff).toBe(0);
  });
});
