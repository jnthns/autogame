import { MATCH_DEFAULTS, PLAYER_ROW_START } from '../data/constants';
import { HERO_MAP, isMeleeHero } from '../data/heroes';
import { applyMerges, cap, countHeroStar, gameActions, rollShop, sellValue } from '../game/engine';
import { shopPrice, unitPower } from '../game/hyperRoll';
import { random } from '../game/rng';
import type { GameState, Unit } from '../game/types';

export type PolicyName = 'decent' | 'greedy' | 'econ' | 'random';

export interface PlanContext {
  draft: string[];
  cap: number;
  round: number;
}

export interface Policy {
  name: PolicyName;
  /** Mutates `g` through `gameActions` to spend the plan phase. */
  plan(g: GameState, ctx: PlanContext): void;
  chooseRelic(picks: string[], board: Unit[]): string;
  chooseRelicHolder(rid: string, board: Unit[]): Unit;
}

const BENCH_MAX = 8;
/** Rows are absolute: the player half is 6–11. */
const MELEE_ROWS = [PLAYER_ROW_START, PLAYER_ROW_START + 1];
const RANGED_ROWS = [PLAYER_ROW_START + 3, PLAYER_ROW_START + 4];
const COL_ORDER = [2, 3, 1, 4, 0, 5];

function roster(g: GameState): Unit[] {
  return [...g.board, ...g.bench];
}

function ownsCopy(g: GameState, hid: string, star: 1 | 2): boolean {
  return countHeroStar(g, hid, star) > 0;
}

function nextInterestThreshold(gold: number): number {
  return Math.min(30, (Math.floor(gold / 10) + 1) * 10);
}

function sharesIdentity(g: GameState, hid: string): boolean {
  const owned = roster(g);
  if (!owned.length) return true;
  const h = HERO_MAP[hid];
  return owned.some((u) => {
    const o = HERO_MAP[u.hid];
    return o.heroClass === h.heroClass || o.traits.some((t) => h.traits.includes(t));
  });
}

function buyOffer(g: GameState, i: number): boolean {
  const offer = g.shop[i];
  if (!offer) return false;
  if (g.gold < shopPrice(offer) || g.bench.length >= BENCH_MAX) return false;
  const before = countHeroStar(g, offer.hid, 2);
  gameActions.buy(g, i);
  applyMerges(g, { boughtHid: offer.hid, twoStarBeforeBuy: before });
  return true;
}

function sellWeakestBench(g: GameState): boolean {
  if (!g.bench.length) return false;
  let worst = g.bench[0];
  g.bench.forEach((u) => {
    if (unitPower(u) < unitPower(worst)) worst = u;
  });
  const i = g.bench.findIndex((u) => u.u === worst.u);
  if (i < 0) return false;
  g.gold += sellValue(worst);
  g.bench.splice(i, 1);
  return true;
}

/** Move the strongest `capN` units onto the board; melee front, ranged back. */
export function placeBoard(g: GameState, capN: number): void {
  const all = roster(g).slice().sort((a, b) => unitPower(b) - unitPower(a));
  const chosen = all.slice(0, capN);
  const benched = all.slice(capN);
  g.board = chosen;
  g.bench = benched;
  benched.forEach((u) => {
    delete u.r;
    delete u.c;
  });
  const used = new Set<string>();
  const take = (rows: number[]): { r: number; c: number } | null => {
    for (const r of rows) {
      for (const c of COL_ORDER) {
        if (!used.has(`${r},${c}`)) return { r, c };
      }
    }
    for (let r = PLAYER_ROW_START; r < PLAYER_ROW_START + 6; r++) {
      for (const c of COL_ORDER) {
        if (!used.has(`${r},${c}`)) return { r, c };
      }
    }
    return null;
  };
  chosen.forEach((u) => {
    const melee = isMeleeHero(HERO_MAP[u.hid]);
    const pos = take(melee ? MELEE_ROWS : RANGED_ROWS);
    if (!pos) return;
    used.add(`${pos.r},${pos.c}`);
    u.r = pos.r;
    u.c = pos.c;
  });
}

function pickHolder(board: Unit[]): Unit {
  const eligible = board.filter((u) => u.relics.length < 3);
  const pool = eligible.length ? eligible : board;
  return pool.slice().sort((a, b) => unitPower(b) - unitPower(a))[0];
}

const decent: Policy = {
  name: 'decent',
  plan(g, ctx) {
    let rerolls = 0;
    const capN = ctx.cap;
    for (let pass = 0; pass < 8; pass++) {
      let acted = false;

      // 1. Any offer that completes a merge.
      for (let i = 0; i < g.shop.length; i++) {
        const offer = g.shop[i];
        if (!offer) continue;
        const completes =
          ownsCopy(g, offer.hid, offer.star === 1 ? 1 : 2) ||
          (offer.star === 1 && ownsCopy(g, offer.hid, 2) && countHeroStar(g, offer.hid, 2) >= 2);
        if (!completes) continue;
        if (g.bench.length >= BENCH_MAX) sellWeakestBench(g);
        if (buyOffer(g, i)) acted = true;
      }

      // 2. Highest-cost affordable offer that shares an identity with the board.
      if (roster(g).length < capN + 3) {
        const ranked = g.shop
          .map((offer, i) => ({ offer, i }))
          .filter((x) => x.offer && sharesIdentity(g, x.offer.hid))
          .sort((a, b) => HERO_MAP[b.offer!.hid].cost - HERO_MAP[a.offer!.hid].cost);
        for (const { i } of ranked) {
          if (buyOffer(g, i)) {
            acted = true;
            break;
          }
        }
      }

      // 3. Reroll while it is affordable and the board still wants copies.
      const rerollCost = g.freeRerolls > 0 ? 0 : MATCH_DEFAULTS.rerollCost;
      const wantsUnits = roster(g).length < capN;
      const chasingThree = [...g.board, ...g.bench].some(
        (u) => u.star === 2 && countHeroStar(g, u.hid, 2) >= 1,
      );
      const keepsInterest =
        ctx.round > 9 || g.freeRerolls > 0 || g.gold - rerollCost >= nextInterestThreshold(g.gold) - 10;
      if (
        rerolls < 3 &&
        ctx.round >= 2 &&
        (wantsUnits || chasingThree) &&
        g.gold >= rerollCost + 4 &&
        keepsInterest
      ) {
        gameActions.reroll(g, ctx.draft);
        rerolls++;
        acted = true;
      }

      if (!acted) break;
    }
    placeBoard(g, capN);
  },
  chooseRelic(picks, board) {
    const hasBigMelee = board.some((u) => u.star >= 2 && isMeleeHero(HERO_MAP[u.hid]));
    const order = hasBigMelee ? ['jade', 'root', 'ember', 'quill'] : ['ember', 'quill', 'jade', 'root'];
    for (const want of order) {
      const hit = picks.find((p) => p === want);
      if (hit) return hit;
    }
    return picks[0];
  },
  chooseRelicHolder(_rid, board) {
    return pickHolder(board);
  },
};

const greedy: Policy = {
  name: 'greedy',
  plan(g, ctx) {
    for (let pass = 0; pass < 12; pass++) {
      const ranked = g.shop
        .map((offer, i) => ({ offer, i }))
        .filter((x) => x.offer)
        .sort((a, b) => shopPrice(b.offer!) - shopPrice(a.offer!));
      let bought = false;
      for (const { i } of ranked) {
        if (g.bench.length >= BENCH_MAX) sellWeakestBench(g);
        if (buyOffer(g, i)) bought = true;
      }
      if (bought) continue;
      if (g.gold < MATCH_DEFAULTS.rerollCost && g.freeRerolls <= 0) break;
      gameActions.reroll(g, ctx.draft);
    }
    placeBoard(g, ctx.cap);
  },
  chooseRelic: decent.chooseRelic,
  chooseRelicHolder: decent.chooseRelicHolder,
};

const econ: Policy = {
  name: 'econ',
  plan(g, ctx) {
    for (let pass = 0; pass < 6; pass++) {
      let acted = false;
      for (let i = 0; i < g.shop.length; i++) {
        const offer = g.shop[i];
        if (!offer) continue;
        const merges = ownsCopy(g, offer.hid, offer.star === 1 ? 1 : 2);
        if (!merges && HERO_MAP[offer.hid].cost > 3) continue;
        if (g.bench.length >= BENCH_MAX) sellWeakestBench(g);
        if (buyOffer(g, i)) acted = true;
      }
      if (ctx.round >= 7 && g.gold >= MATCH_DEFAULTS.rerollCost + 20) {
        gameActions.reroll(g, ctx.draft);
        acted = true;
      }
      if (!acted) break;
    }
    placeBoard(g, ctx.cap);
  },
  chooseRelic: decent.chooseRelic,
  chooseRelicHolder: decent.chooseRelicHolder,
};

const randomPolicy: Policy = {
  name: 'random',
  plan(g, ctx) {
    for (let pass = 0; pass < 6; pass++) {
      const roll = random();
      if (roll < 0.6) {
        const i = Math.floor(random() * g.shop.length);
        if (g.bench.length >= BENCH_MAX) sellWeakestBench(g);
        buyOffer(g, i);
      } else if (roll < 0.85) {
        gameActions.reroll(g, ctx.draft);
      } else {
        sellWeakestBench(g);
      }
    }
    placeBoard(g, ctx.cap);
  },
  chooseRelic(picks) {
    return picks[Math.floor(random() * picks.length)] ?? picks[0];
  },
  chooseRelicHolder(_rid, board) {
    return board[Math.floor(random() * board.length)] ?? board[0];
  },
};

export const POLICIES: Record<PolicyName, Policy> = {
  decent,
  greedy,
  econ,
  random: randomPolicy,
};

export function getPolicy(name: PolicyName): Policy {
  return POLICIES[name] ?? decent;
}

/** Convenience for the sim: refresh the shop the way the app does on entering a round. */
export function openShop(g: GameState, draft: string[]): void {
  rollShop(g, draft, true);
}

export { cap };
