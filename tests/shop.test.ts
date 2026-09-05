import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DRAFT } from '../src/data/constants';
import { SHOP_ODDS, shopOdds } from '../src/data/economy';
import { HERO_MAP } from '../src/data/heroes';
import { rollShopOffers, sellValue } from '../src/game/engine';
import { seeded, setRng } from '../src/game/rng';

beforeEach(() => {
  setRng(seeded(1));
});

describe('shop odds', () => {
  it('every row sums to 100', () => {
    for (const [round, row] of Object.entries(SHOP_ODDS)) {
      expect(row.reduce((a, b) => a + b, 0), `round ${round}`).toBe(100);
    }
  });

  it('cost-5 odds are 0 before round 5', () => {
    for (let r = 1; r <= 4; r++) expect(shopOdds(r)[3]).toBe(0);
  });

  it('clamps to the first and last row', () => {
    expect(shopOdds(0)).toEqual(SHOP_ODDS[1]);
    expect(shopOdds(18)).toEqual(SHOP_ODDS[13]);
  });
});

describe('rollShopOffers', () => {
  it('shows at least 3 distinct heroes over 200 round-1 rolls of the default draft', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      rollShopOffers(DEFAULT_DRAFT, 1).forEach((o) => o && seen.add(o.hid));
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('does not lock a single-cheap-hero draft onto that hero', () => {
    // jorm 4, anans 2, kitsu 3, taniw 3, ifrit 4, thund 3 — the old maxShopCost
    // gate made round 1 all Anansi, which three-starred by round 3.
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      rollShopOffers(DEFAULT_DRAFT, 1).forEach((o) => {
        if (o) counts[o.hid] = (counts[o.hid] ?? 0) + 1;
      });
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(counts.anans / total).toBeLessThan(0.9);
  });

  it('falls back down and up when a tier is empty', () => {
    const fives = ['quetz', 'zirni', 'sphin', 'simur', 'levia', 'wendi'];
    for (let i = 0; i < 50; i++) {
      const slots = rollShopOffers(fives, 1);
      expect(slots.some(Boolean)).toBe(true);
      slots.forEach((o) => {
        if (o) expect(HERO_MAP[o.hid].cost).toBe(5);
      });
    }
  });

  it('only offers what the draft contains at any round', () => {
    const draft = ['anans', 'kitsu', 'jorm'];
    for (let round = 1; round <= 13; round++) {
      rollShopOffers(draft, round).forEach((o) => {
        if (o) expect(draft).toContain(o.hid);
      });
    }
  });
});

describe('sell tax', () => {
  it('1★ of a 2-cost sells for 1', () => {
    expect(sellValue({ u: 'a', hid: 'anans', star: 1, relics: [] })).toBe(1);
  });

  it('1★ of a 5-cost sells for 4', () => {
    expect(sellValue({ u: 'a', hid: 'quetz', star: 1, relics: [] })).toBe(4);
  });

  it('2★ and 3★ are unchanged', () => {
    expect(sellValue({ u: 'b', hid: 'anans', star: 2, relics: [] })).toBe(3);
    expect(sellValue({ u: 'c', hid: 'anans', star: 3, relics: [] })).toBe(6);
  });
});
