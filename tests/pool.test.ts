import { beforeEach, describe, expect, it } from 'vitest';
import { COPIES_BY_COST, createPool, MAX_COPIES_PER_ROLL } from '../src/data/economy';
import { DEFAULT_DRAFT } from '../src/data/constants';
import { HEROES, HERO_MAP } from '../src/data/heroes';
import {
  createGame,
  gameActions,
  resetUidCounter,
  rollShopOffers,
  unitCopies,
} from '../src/game/engine';
import { seeded, setRng } from '../src/game/rng';

beforeEach(() => {
  setRng(seeded(1));
  resetUidCounter();
});

describe('the pool', () => {
  it('starts full for every hero, sized by cost', () => {
    // Gauntlet has no bot turn on creation, so nothing has been drawn yet.
    const g = createGame('gauntlet');
    expect(g.pool).not.toBeNull();
    HEROES.forEach((h) => {
      expect(g.pool![h.id], h.id).toBe(COPIES_BY_COST[h.cost]);
    });
  });

  it('is null in the practice sandbox', () => {
    expect(createGame('practice').pool).toBeNull();
  });

  it('counts copies by star: 1, 2, 4', () => {
    expect(unitCopies({ star: 1 })).toBe(1);
    expect(unitCopies({ star: 2 })).toBe(2);
    expect(unitCopies({ star: 3 })).toBe(4);
  });
});

describe('buying and selling move the pool', () => {
  it('a 1★ buy takes one copy and selling it back returns one', () => {
    const g = createGame('bot');
    g.phase = 'plan';
    g.gold = 50;
    g.shop = [{ hid: 'anans', star: 1 }, null, null, null, null];
    const before = g.pool!.anans;
    gameActions.buy(g, 0);
    expect(g.pool!.anans).toBe(before - 1);
    g.sel = { u: g.bench[0].u, from: 'bench' };
    gameActions.sell(g);
    expect(g.pool!.anans).toBe(before);
  });

  it('a 2★ offer takes two copies', () => {
    const g = createGame('bot');
    g.phase = 'plan';
    g.gold = 50;
    g.shop = [{ hid: 'anans', star: 2 }, null, null, null, null];
    const before = g.pool!.anans;
    gameActions.buy(g, 0);
    expect(g.pool!.anans).toBe(before - 2);
  });

  it('selling a 3★ returns all four copies', () => {
    const g = createGame('bot');
    g.phase = 'plan';
    g.pool!.anans = 0;
    g.bench = [{ u: 'three', hid: 'anans', star: 3, relics: [] }];
    g.sel = { u: 'three', from: 'bench' };
    gameActions.sell(g);
    expect(g.pool!.anans).toBe(4);
  });

  it('is shared: the bot drawing a hero drains it for the player too', () => {
    const g = createGame('bot');
    const drained = Object.entries(g.pool!).filter(
      ([id]) => g.pool![id] < COPIES_BY_COST[HERO_MAP[id].cost],
    );
    // createGame runs the bot's first turn, so something should already be gone.
    expect(drained.length).toBeGreaterThan(0);
  });
});

describe('the shop respects the pool', () => {
  it('never offers a hero the pool has run out of', () => {
    const pool = createPool(
      DEFAULT_DRAFT,
      (id) => HERO_MAP[id].cost,
    );
    DEFAULT_DRAFT.forEach((id) => {
      if (id !== 'kitsu') pool[id] = 0;
    });
    for (let i = 0; i < 100; i++) {
      rollShopOffers(DEFAULT_DRAFT, 6, pool).forEach((o) => {
        if (o) expect(o.hid).toBe('kitsu');
      });
    }
  });

  it('leaves slots empty rather than inventing copies', () => {
    const pool = createPool(DEFAULT_DRAFT, (id) => HERO_MAP[id].cost);
    DEFAULT_DRAFT.forEach((id) => {
      pool[id] = 0;
    });
    expect(rollShopOffers(DEFAULT_DRAFT, 6, pool).every((o) => o === null)).toBe(true);
  });

  it('will not collapse a pair the pool cannot pay for', () => {
    const pool = createPool(DEFAULT_DRAFT, (id) => HERO_MAP[id].cost);
    DEFAULT_DRAFT.forEach((id) => {
      pool[id] = id === 'anans' ? 1 : 0;
    });
    for (let i = 0; i < 50; i++) {
      rollShopOffers(DEFAULT_DRAFT, 1, pool).forEach((o) => {
        if (o) expect(o.star).toBe(1);
      });
    }
  });
});

describe('the per-roll copy cap', () => {
  it('never shows more than MAX_COPIES_PER_ROLL of one hero', () => {
    const pool = createPool(DEFAULT_DRAFT, (id) => HERO_MAP[id].cost);
    for (let i = 0; i < 400; i++) {
      const counts: Record<string, number> = {};
      rollShopOffers(DEFAULT_DRAFT, 1, pool).forEach((o) => {
        if (!o) return;
        // A 2★ offer is a collapsed pair, so it is worth two of the cap.
        counts[o.hid] = (counts[o.hid] ?? 0) + (o.star === 1 ? 1 : 2);
      });
      Object.entries(counts).forEach(([hid, n]) => {
        expect(n, `${hid} on roll ${i}`).toBeLessThanOrEqual(MAX_COPIES_PER_ROLL);
      });
    }
  });

  it('caps a one-hero tier at a single 2★ offer, not two', () => {
    // The old failure: five slots of Anansi collapsed into two 4-gold 2★ offers,
    // which merge straight into a 3★ for 8 gold on round one.
    const pool = createPool(DEFAULT_DRAFT, (id) => HERO_MAP[id].cost);
    for (let i = 0; i < 200; i++) {
      const twos = rollShopOffers(DEFAULT_DRAFT, 1, pool).filter(
        (o) => o && o.hid === 'anans' && o.star === 2,
      );
      expect(twos.length).toBeLessThanOrEqual(1);
    }
  });
});
