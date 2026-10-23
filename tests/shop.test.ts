import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DRAFT } from '../src/data/constants';
import { SHOP_ODDS, createPool, shopOdds } from '../src/data/economy';
import { HEROES, HERO_MAP } from '../src/data/heroes';
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

  it('uses the nearest drafted tier when none has non-zero odds', () => {
    const fives = ['quetz', 'zirni', 'sphin', 'simur', 'levia', 'wendi'];
    for (let i = 0; i < 50; i++) {
      const slots = rollShopOffers(fives, 1);
      expect(slots.every((o) => o?.hid && HERO_MAP[o.hid].cost === 5)).toBe(true);
    }
  });

  it('never falls forward to a zero-odds 5-cost', () => {
    setRng(seeded(71));
    const draft = ['anans', 'quetz'];
    for (let i = 0; i < 100; i++) {
      rollShopOffers(draft, 1).forEach((offer) => {
        expect(offer).not.toBeNull();
        if (offer) expect(HERO_MAP[offer.hid].cost).toBe(2);
      });
    }
  });

  it('never leaves a slot empty while the pool has copies, including one-2-cost drafts', () => {
    const rng = seeded(2024);
    const byCost = (c: number) => HEROES.filter((h) => h.cost === c).map((h) => h.id);
    const shuffled = (ids: string[]) => {
      const a = ids.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const others = HEROES.filter((h) => h.cost !== 2).map((h) => h.id);
    let oneTwoCost = 0;
    for (let d = 0; d < 120; d++) {
      const twos = d % 3;
      const draft = [...shuffled(byCost(2)).slice(0, twos), ...shuffled(others).slice(0, 6 - twos)];
      if (twos === 1) oneTwoCost++;
      const pool = createPool(HEROES.map((h) => h.id), (id) => HERO_MAP[id].cost);
      for (let round = 1; round <= 13; round++) {
        for (let roll = 0; roll < 5; roll++) {
          const slots = rollShopOffers(draft, round, pool);
          expect(slots.filter((o) => o === null).length, `${draft.join(',')} r${round}`).toBe(0);
        }
      }
    }
    expect(oneTwoCost).toBe(40);
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

  it('2★ and 3★ refund their copies less the combine tax', () => {
    expect(sellValue({ u: 'b', hid: 'anans', star: 2, relics: [] })).toBe(5);
    expect(sellValue({ u: 'c', hid: 'anans', star: 3, relics: [] })).toBe(17);
  });
});
