import {
  BONE,
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_SIDE_ROWS,
  BOSS_ANCHOR,
  BOSS_AS,
  BOSS_BOARD_SURVIVAL,
  BOSS_COMBAT_LIMIT,
  BOSS_INCOMING_MULT,
  BOSS_DPS_BURN_SECONDS,
  BOSS_FOOTPRINT,
  BOSS_HP_TEAM_MULT,
  BOSS_RANGE,
  BOT_BOARD_CAPS,
  BOT_DRAFT_SIZE,
  COMBAT_LIMIT,
  GAUNTLET,
  HERO_HP_MUL,
  MARATHON,
  MARATHON_BOARD_CAPS,
  MERGE_COPIES,
  PLAYER_ROW_START,
  PRACTICE_BOARD_CAP,
  RUST,
  SAF,
  SKY,
  JADE,
  STARMUL,
  USER_DRAFT_MAX,
} from '../data/constants';
import { ABILITIES } from '../data/abilities';
import { BOSS_KIT_SCALE, BOSS_KITS, type BossKitId } from '../data/bosses';
import { bossRoundMul, refTeam } from '../data/bossCurve';
import { CLASSES, type ClassName } from '../data/classes';
import { HEROES, HERO_MAP, isMeleeHero } from '../data/heroes';
import { RELIC_MAP, RELICS } from '../data/relics';
import { TRAITS, type TraitName } from '../data/traits';
import { random, shuffle } from './rng';
import {
  BOSS_SURVIVOR_COUNT,
  BOT_INCOME_BONUS,
  incomeBreakdown,
  INTEREST_MAX,
  INTEREST_PER,
  lossDamage,
  MATCH_DEFAULTS,
  RELIC_ROUNDS,
} from '../data/economy';
import {
  collapseShopOffers,
  getBossEncounter,
  isBossRound,
  makeBossUnits,
  rollShopTier,
  shopPrice,
  unitPower,
} from './hyperRoll';
import {
  getGauntletEncounter,
  gauntletBoardCap,
  gauntletRoundIncome,
  makeGauntletBossUnits,
} from './gauntlet';
import type {
  ActiveTrait,
  Combatant,
  CombatFxKind,
  CombatFxPayload,
  CombatSpeed,
  Difficulty,
  GameMode,
  GameState,
  OverlayKind,
  Selection,
  ShopOffer,
  Unit,
  FloaterVariant,
} from './types';

let uidCounter = 0;
export const uid = () => `u${++uidCounter}`;

export function resetUidCounter() {
  uidCounter = 0;
}

export function isRankedMode(mode: GameMode): boolean {
  return mode === 'bot' || mode === 'marathon';
}

export function isGauntletMode(mode: GameMode): boolean {
  return mode === 'gauntlet';
}

export function usesDifficulty(mode: GameMode): boolean {
  return isRankedMode(mode) || isGauntletMode(mode);
}

export function matchRoundsFor(mode: GameMode): number {
  if (mode === 'gauntlet') return GAUNTLET.matchRounds;
  return mode === 'marathon' ? MARATHON.matchRounds : MATCH_DEFAULTS.matchRounds;
}

export function heroHpMulFor(mode: GameMode): number {
  const marathonExtra = mode === 'marathon' ? MARATHON.heroHpMul : 1;
  return HERO_HP_MUL * marathonExtra;
}

export function playerShopPool(draft: string[]): string[] {
  const base = draft.length ? draft : HEROES.slice(0, USER_DRAFT_MAX).map((h) => h.id);
  return base.slice(0, USER_DRAFT_MAX);
}

export function pickBotDraft(): string[] {
  const perTier = Math.max(2, Math.floor(BOT_DRAFT_SIZE / 3));
  const low = shuffle(HEROES.filter((h) => h.cost <= 2));
  const mid = shuffle(HEROES.filter((h) => h.cost === 3));
  const high = shuffle(HEROES.filter((h) => h.cost >= 4));
  const pick = (arr: typeof HEROES, n: number) => arr.slice(0, Math.min(n, arr.length));
  return [...pick(low, perTier), ...pick(mid, perTier), ...pick(high, perTier)]
    .map((h) => h.id)
    .slice(0, BOT_DRAFT_SIZE);
}

export function createGame(
  mode: GameMode,
  opts?: { speed?: CombatSpeed; startRound?: number; draft?: string[] },
): GameState {
  const hp = MATCH_DEFAULTS.startHealth;
  const speed = opts?.speed === 2 || opts?.speed === 4 ? opts.speed : 1;
  const g: GameState = {
    mode,
    matchRounds: matchRoundsFor(mode),
    heroHpMul: heroHpMulFor(mode),
    round: 1,
    gold: mode === 'practice' ? 999 : mode === 'gauntlet' ? GAUNTLET.startGold : MATCH_DEFAULTS.startGold,
    myHp: hp,
    foeHp: hp,
    maxHp: hp,
    streak: 0,
    foeStreak: 0,
    lastSurvivors: { me: 0, foe: 0 },
    bench: [],
    board: [],
    foe: [],
    foeBench: [],
    foeGold: mode === 'practice' ? 0 : mode === 'gauntlet' ? 0 : MATCH_DEFAULTS.startGold,
    foeDraft: mode === 'practice' || mode === 'gauntlet' ? [] : pickBotDraft(),
    foeShop: [],
    shop: [],
    freeRerolls: 0,
    sel: null,
    speed,
    phase: 'plan',
    lastResult: null,
    gauntletLives: mode === 'gauntlet' ? GAUNTLET.startLives : undefined,
    gauntletGoldPenalty: mode === 'gauntlet' ? 0 : undefined,
    gauntletRoundsCleared: mode === 'gauntlet' ? 0 : undefined,
  };
  if (isRankedMode(mode)) {
    runBotTurn(g);
    const target = mode === 'bot' ? opts?.startRound : undefined;
    if (target && target > 1) {
      fastForwardMatch(g, target);
      seedDebugPlayer(g, opts?.draft ?? [], target);
    }
  }
  return g;
}

function seedDebugPlayer(g: GameState, draft: string[], round: number): void {
  const pool = playerShopPool(draft);
  const n = Math.min(cap(round, g.matchRounds), Math.max(3, pool.length));
  const star: 1 | 2 = round >= 8 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    g.board.push({
      u: uid(),
      hid: pool[i % pool.length],
      star,
      relics: [],
      r: 4 + Math.floor(i / 4),
      c: i % 4,
    });
  }
  g.gold = Math.max(g.gold, 18);
}

function fastForwardMatch(g: GameState, target: number): void {
  const capR = Math.min(target, g.matchRounds);
  for (let r = 1; r < capR; r++) {
    g.round++;
    g.gold += incomeBreakdown(g.round, g.gold, g.streak, false).total;
    g.foeGold += incomeBreakdown(g.round, g.foeGold, g.foeStreak, null).total;
    runBotTurn(g);
  }
  g.phase = 'plan';
  g.sel = null;
  g.lastResult = null;
}

export function cap(round: number, maxR: number = MATCH_DEFAULTS.matchRounds, mode: GameMode = 'bot'): number {
  if (mode === 'practice') return PRACTICE_BOARD_CAP;
  if (mode === 'gauntlet') return gauntletBoardCap(round);
  const table =
    mode === 'marathon' || maxR > MATCH_DEFAULTS.matchRounds ? MARATHON_BOARD_CAPS : BOT_BOARD_CAPS;
  return table[Math.min(round, maxR) - 1] ?? table[table.length - 1];
}

export function unitFootprint(u: { footprint?: number; boss?: boolean }): number {
  return u.footprint ?? (u.boss ? BOSS_FOOTPRINT : 1);
}

export function occupiesCell(u: { r: number; c: number; footprint?: number; boss?: boolean }, r: number, c: number): boolean {
  const fp = unitFootprint(u);
  return r >= u.r && r < u.r + fp && c >= u.c && c < u.c + fp;
}

function unitCenter(u: { r: number; c: number; footprint?: number; boss?: boolean }) {
  const fp = unitFootprint(u);
  return { r: u.r + (fp - 1) / 2, c: u.c + (fp - 1) / 2 };
}

function cellBlocked(C: Combatant[], r: number, c: number, skip?: string): boolean {
  return C.some((o) => o.alive && o.u !== skip && occupiesCell(o, r, c));
}

/**
 * Five slots, each an independent tier roll from the round's odds row followed
 * by a uniform pick inside that tier. Both the player and the bot use this;
 * only the draft differs.
 */
export function rollShopOffers(draft: string[], round = 1): (ShopOffer | null)[] {
  const base = playerShopPool(draft);
  const byTier = new Map<number, string[]>();
  base.forEach((id) => {
    const cost = HERO_MAP[id].cost;
    const list = byTier.get(cost) ?? [];
    list.push(id);
    byTier.set(cost, list);
  });
  const has = (tier: number) => (byTier.get(tier)?.length ?? 0) > 0;
  const raw = [0, 0, 0, 0, 0].map(() => {
    const tier = rollShopTier(round, has);
    const pool = byTier.get(tier) ?? base;
    return pool[Math.floor(random() * pool.length)] ?? base[0];
  });
  return collapseShopOffers(raw);
}

export function rollShop(g: GameState, draft: string[]): void {
  g.shop = rollShopOffers(draft, g.round);
}

export function traitCounts(ids: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  ids.forEach((id) =>
    HERO_MAP[id].traits.forEach((t: string) => {
      c[t] = (c[t] || 0) + 1;
    }),
  );
  return c;
}

export function classCounts(ids: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  ids.forEach((id) => {
    const cls = HERO_MAP[id].heroClass;
    c[cls] = (c[cls] || 0) + 1;
  });
  return c;
}

export function activeTraits(ids: string[]): ActiveTrait[] {
  const c = traitCounts(ids);
  return Object.keys(c)
    .map((name) => {
      const def = TRAITS[name as TraitName];
      let lvl = 0;
      let label = '';
      def.tiers.forEach(([n, txt]) => {
        if (c[name] >= n) {
          lvl++;
          label = txt;
        }
      });
      return { name, count: c[name], lvl, label, glyph: def.glyph, desc: def.desc, kind: 'trait' as const };
    })
    .sort((a, b) => b.lvl - a.lvl || b.count - a.count);
}

export function activeClasses(ids: string[]): ActiveTrait[] {
  const c = classCounts(ids);
  return Object.keys(c)
    .map((name) => {
      const def = CLASSES[name as ClassName];
      let lvl = 0;
      let label = '';
      def.tiers.forEach(([n, txt]) => {
        if (c[name] >= n) {
          lvl++;
          label = txt;
        }
      });
      return { name, count: c[name], lvl, label, glyph: def.glyph, desc: def.desc, kind: 'class' as const };
    })
    .sort((a, b) => b.lvl - a.lvl || b.count - a.count);
}

export function activeSynergies(ids: string[]): ActiveTrait[] {
  return [...activeTraits(ids), ...activeClasses(ids)].sort((a, b) => b.lvl - a.lvl || b.count - a.count);
}

function findUnit(g: GameState, sel: Selection): { u: Unit; from: 'bench' | 'board' } | null {
  const list = sel.from === 'bench' ? g.bench : g.board;
  const u = list.find((x) => x.u === sel.u);
  return u ? { u, from: sel.from } : null;
}

function moveToBench(g: GameState, u: Unit): void {
  const i = g.board.findIndex((x) => x.u === u.u);
  if (i >= 0) g.board.splice(i, 1);
  delete u.r;
  delete u.c;
  g.bench.push(u);
}

function moveToBoard(g: GameState, u: Unit, r: number, c: number, maxR: number): boolean {
  const i = g.bench.findIndex((x) => x.u === u.u);
  if (i >= 0) {
    if (g.board.length >= cap(g.round, maxR, g.mode)) return false;
    g.bench.splice(i, 1);
    g.board.push(u);
  }
  u.r = r;
  u.c = c;
  return true;
}

function swapUnits(
  g: GameState,
  a: { u: Unit; from: 'bench' | 'board' },
  b: { u: Unit; from: 'bench' | 'board' },
  maxR: number,
): void {
  if (a.from === 'board' && b.from === 'board') {
    const t = { r: a.u.r!, c: a.u.c! };
    a.u.r = b.u.r;
    a.u.c = b.u.c;
    b.u.r = t.r;
    b.u.c = t.c;
    return;
  }
  if (a.from === 'bench' && b.from === 'board') {
    const r = b.u.r!;
    const c = b.u.c!;
    moveToBench(g, b.u);
    moveToBoard(g, a.u, r, c, maxR);
    return;
  }
  if (a.from === 'board' && b.from === 'bench') {
    const r = a.u.r!;
    const c = a.u.c!;
    moveToBench(g, a.u);
    moveToBoard(g, b.u, r, c, maxR);
  }
}

function combineUnits(
  board: Unit[],
  bench: Unit[],
  take: { u: Unit; on: 'bench' | 'board' }[],
  hid: string,
  star: 2 | 3,
  onPop?: (r: number, c: number, text: string) => void,
): void {
  const host = take.find((x) => x.on === 'board') || take[0];
  const relics: string[] = [];
  take.forEach((x) =>
    x.u.relics.forEach((r) => {
      if (relics.length < 3) relics.push(r);
    }),
  );
  const spot = host.on === 'board' ? { r: host.u.r!, c: host.u.c! } : null;
  take.forEach((x) => {
    const l = x.on === 'bench' ? bench : board;
    const i = l.findIndex((y) => y.u === x.u.u);
    if (i >= 0) l.splice(i, 1);
  });
  const nu: Unit = { u: uid(), hid, star, relics };
  if (spot) {
    nu.r = spot.r;
    nu.c = spot.c;
    board.push(nu);
  } else {
    bench.push(nu);
  }
  onPop?.(
    spot ? spot.r : 7,
    spot ? spot.c : 0,
    `${star}★ ${HERO_MAP[hid].name.split(' ')[0]}`,
  );
}

export function countHeroStar(g: GameState, hid: string, star: 1 | 2 | 3): number {
  return [...g.board, ...g.bench].filter((u) => u.hid === hid && u.star === star).length;
}

/** When 2× 2★ already exist, buying any copy merges them to 3★ (shop trigger). */
function pairMergeTwos(
  g: GameState,
  hid: string,
  onPop?: (r: number, c: number, text: string) => void,
): void {
  const twos: { u: Unit; on: 'bench' | 'board' }[] = [];
  g.board.forEach((u) => {
    if (u.hid === hid && u.star === 2) twos.push({ u, on: 'board' });
  });
  g.bench.forEach((u) => {
    if (u.hid === hid && u.star === 2) twos.push({ u, on: 'bench' });
  });
  if (twos.length < MERGE_COPIES) return;
  twos.sort((a, b) => (a.on === 'board' ? -1 : 1) - (b.on === 'board' ? -1 : 1));
  combineUnits(g.board, g.bench, twos.slice(0, MERGE_COPIES), hid, 3, onPop);
}

export function mergeUnitLists(
  board: Unit[],
  bench: Unit[],
  onPop?: (r: number, c: number, text: string) => void,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const star of [1, 2] as const) {
      const groups: Record<string, { u: Unit; on: 'bench' | 'board' }[]> = {};
      bench.forEach((u) => {
        if (u.star === star) (groups[u.hid] = groups[u.hid] || []).push({ u, on: 'bench' });
      });
      board.forEach((u) => {
        if (u.star === star) (groups[u.hid] = groups[u.hid] || []).push({ u, on: 'board' });
      });
      for (const hid in groups) {
        const arr = groups[hid];
        if (arr.length < MERGE_COPIES) continue;
        arr.sort((a, b) => (a.on === 'board' ? -1 : 1) - (b.on === 'board' ? -1 : 1));
        combineUnits(board, bench, arr.slice(0, MERGE_COPIES), hid, (star + 1) as 2 | 3, onPop);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
}

export function mergeUnits(g: GameState, onPop?: (r: number, c: number, text: string) => void): void {
  mergeUnitLists(g.board, g.bench, onPop);
}

export function applyMerges(
  g: GameState,
  opts?: { boughtHid?: string; twoStarBeforeBuy?: number },
  onPop?: (r: number, c: number, text: string) => void,
): void {
  mergeUnits(g, onPop);
  if (opts?.boughtHid && (opts.twoStarBeforeBuy ?? 0) >= 2) {
    pairMergeTwos(g, opts.boughtHid, onPop);
  }
}

/**
 * 1★ pays a one-gold scout tax so rolling through the shop and dumping the
 * misses costs something; combined units pay a combine tax so 2-copy merges do
 * not print gold.
 */
export function sellValue(u: Unit): number {
  const cost = HERO_MAP[u.hid].cost;
  if (u.star === 1) return Math.max(1, cost - 1);
  if (u.star === 2) return Math.max(1, cost * MERGE_COPIES - 1);
  return Math.max(1, cost * 3);
}

export function combatOpponents(g: GameState): Unit[] {
  if (g.mode === 'gauntlet') return makeGauntletBossUnits(g.round);
  if ((g.mode === 'bot' || g.mode === 'marathon') && isBossRound(g.round, g.matchRounds)) {
    return makeBossUnits(g.round, g.matchRounds);
  }
  return g.foe;
}

function placeBotBoard(units: Unit[], capN: number): { board: Unit[]; bench: Unit[] } {
  const ranked = units.slice().sort((a, b) => unitPower(b) - unitPower(a));
  const board = ranked.slice(0, capN);
  const bench = ranked.slice(capN);
  const tanks = board.filter((u) => isMeleeHero(HERO_MAP[u.hid]));
  const ranged = board.filter((u) => !isMeleeHero(HERO_MAP[u.hid]));
  const cells: { r: number; c: number }[] = [];
  for (const r of [5, 4, 3, 2, 1, 0]) {
    for (const c of [2, 3, 1, 4, 0, 5]) cells.push({ r, c });
  }
  // Rows 0–2 only: a ranged bot unit that starts on row 3 is already inside a
  // player kiter's dead zone on the first tick.
  const backCells: { r: number; c: number }[] = [];
  for (const r of [0, 1, 2]) {
    for (const c of [2, 3, 1, 4, 0, 5]) backCells.push({ r, c });
  }
  const used = new Set<string>();
  const takeCell = (pool: { r: number; c: number }[]) => {
    const cell = pool.find((p) => !used.has(`${p.r},${p.c}`));
    return cell ?? cells.find((p) => !used.has(`${p.r},${p.c}`));
  };
  tanks.forEach((u) => {
    const pos = takeCell(cells);
    if (!pos) return;
    used.add(`${pos.r},${pos.c}`);
    u.r = pos.r;
    u.c = pos.c;
  });
  ranged.forEach((u) => {
    const pos = takeCell(backCells);
    if (!pos) return;
    used.add(`${pos.r},${pos.c}`);
    u.r = pos.r;
    u.c = pos.c;
  });
  bench.forEach((u) => {
    delete u.r;
    delete u.c;
  });
  return { board, bench };
}

function botOwns(g: GameState, hid: string): boolean {
  return g.foe.some((u) => u.hid === hid) || g.foeBench.some((u) => u.hid === hid);
}

function botBuy(g: GameState, i: number): boolean {
  const offer = g.foeShop[i];
  if (!offer) return false;
  const cost = shopPrice(offer);
  if (g.foeGold < cost || g.foeBench.length >= 8) return false;
  g.foeGold -= cost;
  g.foeShop = g.foeShop.map((s, j) => (j === i ? null : s));
  g.foeBench.push({ u: uid(), hid: offer.hid, star: offer.star, relics: [] });
  return true;
}

function botWanted(g: GameState, hid: string): boolean {
  if (botOwns(g, hid)) return true;
  const cost = HERO_MAP[hid].cost;
  const capN = cap(g.round, g.matchRounds);
  const onField = g.foe.length + g.foeBench.length;
  if (onField < capN) return true;
  if (cost <= 2 && g.round <= 4) return true;
  if (cost >= 4 && g.round >= 7 && g.foeGold >= cost + MATCH_DEFAULTS.rerollCost) return true;
  return false;
}

function botSellWeakest(g: GameState): boolean {
  const pool = g.foeBench.length ? g.foeBench : g.foe.filter((u) => u.star === 1);
  if (!pool.length) return false;
  let worst = pool[0];
  let worstP = unitPower(worst);
  pool.forEach((u) => {
    const p = unitPower(u);
    if (p < worstP || (p === worstP && u.star < worst.star)) {
      worst = u;
      worstP = p;
    }
  });
  const list = g.foeBench.includes(worst) ? g.foeBench : g.foe;
  const idx = list.findIndex((x) => x.u === worst.u);
  if (idx < 0) return false;
  g.foeGold += sellValue(worst);
  list.splice(idx, 1);
  return true;
}

/**
 * The bot carries relics too, on the same schedule the player is offered them.
 * Without this the player's board silently gains three stacking modifiers over
 * a match and the bot's does not.
 */
export function grantBotRelic(g: GameState): void {
  if (!isRankedMode(g.mode)) return;
  const eligible = g.foe.filter((u) => u.relics.length < 3);
  if (!eligible.length) return;
  const holder = eligible.slice().sort((a, b) => unitPower(b) - unitPower(a))[0];
  const [rid] = pickRelics(1);
  if (rid) holder.relics.push(rid);
}

export function runBotTurn(g: GameState): void {
  if (!isRankedMode(g.mode)) return;
  g.foeShop = rollShopOffers(g.foeDraft.length ? g.foeDraft : HEROES.map((h) => h.id), g.round);

  const tryBuys = () => {
    let bought = false;
    for (let i = 0; i < g.foeShop.length; i++) {
      const hid = g.foeShop[i]?.hid;
      if (!hid || !botWanted(g, hid)) continue;
      if (g.foeBench.length >= 8) botSellWeakest(g);
      if (botBuy(g, i)) bought = true;
    }
    mergeUnitLists(g.foe, g.foeBench);
    return bought;
  };

  for (let pass = 0; pass < 5; pass++) {
    if (!tryBuys()) break;
  }

  const usefulLeft = g.foeShop.some((offer) => offer && botOwns(g, offer.hid));
  const keepsInterest =
    g.round >= 9 ||
    g.foeGold - MATCH_DEFAULTS.rerollCost >=
      Math.min(INTEREST_MAX, Math.floor(g.foeGold / INTEREST_PER)) * INTEREST_PER;
  if (!usefulLeft && keepsInterest && g.foeGold >= MATCH_DEFAULTS.rerollCost + 3) {
    g.foeGold -= MATCH_DEFAULTS.rerollCost;
    g.foeShop = rollShopOffers(g.foeDraft, g.round);
    tryBuys();
    tryBuys();
  }

  while (g.foeBench.length > 8) botSellWeakest(g);

  const placed = placeBotBoard([...g.foe, ...g.foeBench], cap(g.round, g.matchRounds));
  g.foe = placed.board;
  g.foeBench = placed.bench;

  if (!g.foe.length) {
    const hid = g.foeDraft[0] || 'golem';
    const cost = HERO_MAP[hid].cost;
    if (g.foeGold >= cost || g.foeGold >= 1) {
      g.foeGold = Math.max(0, g.foeGold - Math.min(g.foeGold, cost));
      g.foe.push({ u: uid(), hid, star: 1, relics: [], r: 3, c: 1 });
    }
  }
}

const FOE_SCALE: Record<Difficulty, { hp: number; atk: number }> = {
  normal: { hp: 1, atk: 1 },
  hard: { hp: 1.15, atk: 1.1 },
  mythic: { hp: 1.3, atk: 1.2 },
};

const BOSS_SCALE: Record<Difficulty, { hp: number; atk: number; as: number }> = {
  normal: { hp: 1, atk: 1, as: 1 },
  hard: { hp: 1.2, atk: 1.1, as: 1.05 },
  mythic: { hp: 1.45, atk: 1.2, as: 1.1 },
};

/** Practice sandbox only — ranked modes fight the persistent bot board. */
export function makeFoeBoard(g: GameState): void {
  const n = Math.min(3 + Math.floor(g.round * 0.7), 12);
  const ids = shuffle(HEROES.map((h) => h.id)).slice(0, n);
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < BOARD_SIDE_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) cells.push({ r, c });
  const shuffledCells = shuffle(cells);
  g.foe = ids.map((hid, i) => {
    const star: 1 | 2 | 3 =
      g.round >= 9 ? (random() < 0.4 ? 3 : 2) : g.round >= 5 ? (random() < 0.5 ? 2 : 1) : 1;
    const pos = shuffledCells[i];
    return { u: uid(), hid, star, relics: [], r: pos.r, c: pos.c };
  });
}

export function scaleFoeCombatants(list: Combatant[], difficulty: Difficulty): void {
  const s = FOE_SCALE[difficulty];
  if (s.hp === 1 && s.atk === 1) return;
  list.forEach((c) => {
    if (c.boss) {
      const bs = BOSS_SCALE[difficulty];
      c.maxHp = Math.round(c.maxHp * bs.hp);
      c.hp = c.maxHp;
      c.atk = Math.round(c.atk * bs.atk);
      c.as = c.as * bs.as;
      c.cd = 1 / c.as;
      return;
    }
    c.maxHp = Math.round(c.maxHp * s.hp);
    c.hp = c.maxHp;
    c.atk = Math.round(c.atk * s.atk);
  });
}

export function combatant(u: Unit, side: 'me' | 'foe', heroHpMul = 1): Combatant {
  const h = HERO_MAP[u.hid];
  const m = STARMUL[u.star];
  const hpScale = u.scaleHp ?? 1;
  const atkScale = u.scaleAtk ?? 1;
  const isBoss = !!u.boss;
  const melee = isBoss ? false : isMeleeHero(h);
  const o: Combatant = {
    u: u.u,
    hid: u.hid,
    star: u.star,
    side,
    r: isBoss ? BOSS_ANCHOR.r : u.r!,
    c: isBoss ? BOSS_ANCHOR.c : u.c!,
    glyph: h.glyph,
    name: h.name,
    maxHp: Math.round(h.hp * m * hpScale * heroHpMul),
    hp: 0,
    atk: h.dmg * m * atkScale,
    as: isBoss ? BOSS_AS : h.as,
    range: isBoss ? BOSS_RANGE : h.range,
    melee,
    crit: h.crit,
    critDmg: 0.8,
    mana: 0,
    startMana: isBoss ? 40 : 0,
    sp: 0,
    dr: 0,
    lifesteal: 0,
    shield: 0,
    amp: 0,
    stun: 0,
    silence: 0,
    snare: 0,
    burn: 0,
    burnT: 0,
    cd: 1 / (isBoss ? BOSS_AS : h.as),
    mv: 0.4,
    alive: true,
    cast2: false,
    boss: isBoss,
    bossKit: u.bossKit,
    bossTaken: isBoss ? BOSS_INCOMING_MULT : undefined,
    footprint: isBoss ? BOSS_FOOTPRINT : 1,
    rooted: isBoss,
  };
  o.hp = o.maxHp;
  (u.relics || []).forEach((rid) => {
    const r = RELIC_MAP[rid];
    if (r) r.apply(o);
  });
  return o;
}

/**
 * Fit every boss to the *reference* team for the round, not to the live board.
 * Growing your board therefore makes the fight easier, which is the whole point
 * of growing it; the round number alone decides how big the boss is.
 */
export function fitBossToTeam(foes: Combatant[], round: number, opts?: { gauntlet?: boolean }): void {
  const bosses = foes.filter((u) => u.boss);
  if (!bosses.length) return;
  const ref = refTeam(round);
  const roundMul = bossRoundMul(round, !!opts?.gauntlet);
  const floor = BOSS_HP_TEAM_MULT * ref.hp * roundMul;
  const burn = floor / (ref.dps * BOSS_INCOMING_MULT);
  const pad = burn < BOSS_DPS_BURN_SECONDS ? BOSS_DPS_BURN_SECONDS / burn : 1;
  const target = Math.max(1, Math.round(floor * pad));
  const atk = Math.max(16, ref.avgHp / (BOSS_AS * BOSS_BOARD_SURVIVAL));

  bosses.forEach((b) => {
    b.maxHp = target;
    b.hp = target;
    b.atk = atk;
    b.as = BOSS_AS;
    b.cd = 1 / BOSS_AS;
    b.range = BOSS_RANGE;
    b.melee = false;
    b.r = BOSS_ANCHOR.r;
    b.c = BOSS_ANCHOR.c;
    b.footprint = BOSS_FOOTPRINT;
    b.rooted = true;
    b.bossTaken = BOSS_INCOMING_MULT;
    b.bossRound = round;
    b.bossGauntlet = !!opts?.gauntlet;
  });
}

export function applyTraits(list: Combatant[]): void {
  const c: Record<string, number> = {};
  list.forEach((u) => {
    if (u.boss) return;
    HERO_MAP[u.hid].traits.forEach((t: string) => {
      c[t] = (c[t] || 0) + 1;
    });
  });
  const lvl = (n: string) => c[n] || 0;
  list.forEach((u) => {
    if (u.boss) return;
    const tr = HERO_MAP[u.hid].traits;
    if (tr.includes('Serpent'))
      u.lifesteal += lvl('Serpent') >= 4 ? 0.35 : lvl('Serpent') >= 2 ? 0.15 : 0;
    if (tr.includes('Sky')) u.as *= lvl('Sky') >= 3 ? 1.45 : lvl('Sky') >= 2 ? 1.2 : 1;
    if (tr.includes('Trickster')) {
      if (lvl('Trickster') >= 2) u.crit += 0.2;
      if (lvl('Trickster') >= 3) u.critDmg += 0.5;
    }
    if (tr.includes('Ancestor')) {
      if (lvl('Ancestor') >= 3) {
        u.startMana += 60;
        u.sp += 25;
      } else if (lvl('Ancestor') >= 2) u.startMana += 30;
    }
    if (tr.includes('Guardian') && lvl('Guardian') >= 2) {
      u.maxHp += 80;
      u.hp += 80;
    }
    if (tr.includes('Infernal'))
      u.scorch = lvl('Infernal') >= 4 ? 150 : lvl('Infernal') >= 2 ? 60 : 0;
  });
  if (lvl('Guardian') >= 4)
    list.forEach((u) => {
      u.maxHp += 80;
      u.hp += 80;
    });
  if (lvl('Colossal') >= 2)
    list.forEach((u) => {
      u.maxHp = Math.round(u.maxHp * 1.12);
      u.hp = u.maxHp;
      u.atk *= 1.1;
    });

  const cc: Record<string, number> = {};
  list.forEach((u) => {
    if (u.boss) return;
    const cls = HERO_MAP[u.hid].heroClass;
    cc[cls] = (cc[cls] || 0) + 1;
  });
  const clvl = (n: ClassName) => cc[n] || 0;

  if (clvl('Warden') >= 4) {
    list.forEach((u) => {
      u.maxHp = Math.round(u.maxHp * 1.15);
      u.hp = Math.min(u.maxHp, Math.round(u.hp * 1.15));
      u.atk *= 0.85;
      if (HERO_MAP[u.hid].heroClass === 'Warden') u.dr = Math.min(0.6, u.dr + 0.2);
    });
  } else if (clvl('Warden') >= 2) {
    list.forEach((u) => {
      if (HERO_MAP[u.hid].heroClass !== 'Warden') return;
      u.maxHp = Math.round(u.maxHp * 1.2);
      u.hp = Math.min(u.maxHp, Math.round(u.hp * 1.2));
      u.dr = Math.min(0.6, u.dr + 0.12);
      u.atk *= 0.88;
    });
  }

  if (clvl('Striker') >= 4) {
    list.forEach((u) => {
      u.atk *= 1.12;
      u.maxHp = Math.round(u.maxHp * 0.88);
      u.hp = Math.min(u.maxHp, u.hp);
      if (HERO_MAP[u.hid].heroClass === 'Striker') u.crit += 0.18;
    });
  } else if (clvl('Striker') >= 2) {
    list.forEach((u) => {
      if (HERO_MAP[u.hid].heroClass !== 'Striker') return;
      u.atk *= 1.2;
      u.crit += 0.12;
      u.maxHp = Math.round(u.maxHp * 0.88);
      u.hp = Math.min(u.maxHp, u.hp);
    });
  }

  if (clvl('Invoker') >= 4) {
    list.forEach((u) => {
      u.as *= 0.88;
      if (HERO_MAP[u.hid].heroClass === 'Invoker') u.sp += 50;
    });
  } else if (clvl('Invoker') >= 2) {
    list.forEach((u) => {
      if (HERO_MAP[u.hid].heroClass !== 'Invoker') return;
      u.sp += 30;
      u.as *= 0.85;
    });
  }

  if (clvl('Herald') >= 4) {
    list.forEach((u) => {
      u.shield += 140;
      u.dr = Math.min(0.6, u.dr + 0.1);
      u.atk *= 0.88;
    });
  } else if (clvl('Herald') >= 2) {
    list.forEach((u) => {
      u.shield += 70;
      if (HERO_MAP[u.hid].heroClass === 'Herald') u.atk *= 0.85;
    });
  }

  list.forEach((u) => {
    u.mana = Math.min(90, u.startMana);
    u.cd = 1 / u.as;
  });
}

export class CombatEngine {
  C: Combatant[] = [];
  time = 0;

  constructor(
    private onPop: (
      r: number,
      c: number,
      text: string,
      color: string,
      size?: string,
      variant?: FloaterVariant,
    ) => void,
    private onBanner: (text: string) => void,
    private onFx?: (fx: CombatFxPayload) => void,
    /** Simulator hook for damage attribution — never affects combat. */
    private onDamage?: (
      src: Combatant | null,
      target: Combatant,
      amount: number,
      kind: string,
      fromCast: boolean,
    ) => void,
  ) {}

  /** >0 while a cast is resolving, so the sim can split ability damage from autos. */
  private castDepth = 0;

  private emitFx(src: Combatant, t: Combatant, kind: CombatFxKind) {
    const from = unitCenter(src);
    const to = unitCenter(t);
    this.onFx?.({
      kind,
      hid: src.hid,
      fromR: from.r,
      fromC: from.c,
      toR: to.r,
      toC: to.c,
      melee: src.melee || this.dist(src, t) <= 1,
    });
  }

  /**
   * Chebyshev distance between the two units' *footprints*.
   *
   * For 1×1 units this is exactly the old centre-to-centre distance. For a 4×4
   * boss it is the distance to its nearest occupied cell, which is what makes
   * the boss reachable at all: a melee hero attacks at distance ≤ 1, and the
   * centre of a 4×4 block is 1.5 cells inside its own body, so measuring from
   * the centre put every boss permanently out of melee range.
   */
  dist(
    a: { r: number; c: number; footprint?: number; boss?: boolean },
    b: { r: number; c: number; footprint?: number; boss?: boolean },
  ) {
    const af = unitFootprint(a);
    const bf = unitFootprint(b);
    const gap = (a0: number, aSize: number, b0: number, bSize: number) =>
      Math.max(a0 - (b0 + bSize - 1), b0 - (a0 + aSize - 1), 0);
    return Math.max(gap(a.r, af, b.r, bf), gap(a.c, af, b.c, bf));
  }

  target(u: Combatant): Combatant | null {
    let best: Combatant | null = null;
    let bd = 99;
    this.C.forEach((o) => {
      if (o.alive && o.side !== u.side) {
        const d = this.dist(u, o);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
    });
    return best;
  }

  private bossBasicAttack(u: Combatant) {
    const crit = random() < Math.min(1, u.crit);
    const dmg = u.atk * (crit ? 1 + u.critDmg : 1);
    const kind = crit ? 'crit' : 'phys';
    this.enemiesOf(u).forEach((o) => {
      if (this.dist(u, o) <= u.range) this.hurt(u, o, dmg, kind);
    });
  }

  hurt(src: Combatant | null, t: Combatant, amount: number, kind: string): number {
    if (!t.alive) return 0;
    const out = amount * (1 + (src?.dmgBuff || 0));
    let dmg = out * (1 - (t.dr || 0)) * (1 + (t.amp || 0));
    if (kind === 'true') dmg = out;
    if (t.boss) dmg *= t.bossTaken ?? BOSS_INCOMING_MULT;
    if (t.shield > 0) {
      const a = Math.min(t.shield, dmg);
      t.shield -= a;
      dmg -= a;
    }
    t.hp -= dmg;
    t.mana = Math.min(100, t.mana + 5);
    if (dmg > 0) this.onDamage?.(src, t, dmg, kind, this.castDepth > 0);
    if (dmg > 0) {
      const popPos = unitCenter(t);
      const isCrit = kind === 'crit';
      const isMagic = kind === 'magic';
      this.onPop(
        popPos.r,
        popPos.c,
        `-${Math.round(dmg)}`,
        isMagic ? SKY : isCrit ? SAF : BONE,
        isCrit ? 'var(--crit-font)' : 'var(--damage-font)',
        isCrit ? 'crit' : 'damage',
      );
      if (src) {
        const fxKind: CombatFxKind =
          kind === 'magic' ? 'magic' : kind === 'crit' ? 'crit' : kind === 'true' ? 'true' : 'phys';
        this.emitFx(src, t, fxKind);
      }
    }
    if (src && src.lifesteal > 0 && dmg > 0)
      src.hp = Math.min(src.maxHp, src.hp + dmg * src.lifesteal);
    if (t.hp <= 0) {
      t.alive = false;
      t.hp = 0;
      const popPos = unitCenter(t);
      this.onPop(popPos.r, popPos.c, '✕', RUST, 'var(--crit-font)', 'death');
    }
    return dmg;
  }

  silentHurt(t: Combatant, amt: number) {
    if (!t.alive) return;
    t.hp -= amt;
    if (t.hp <= 0) {
      t.hp = 0;
      t.alive = false;
      this.onPop(t.r, t.c, '✕', RUST, 'var(--crit-font)', 'death');
    }
  }

  heal(u: Combatant, amt: number) {
    if (!u.alive || amt <= 0) return;
    const got = Math.min(u.maxHp - u.hp, amt);
    if (got <= 0) return;
    u.hp += got;
    const popPos = unitCenter(u);
    this.onPop(popPos.r, popPos.c, `+${Math.round(got)}`, JADE, 'var(--heal-font)', 'heal');
  }

  enemiesOf(u: Combatant) {
    return this.C.filter((o) => o.alive && o.side !== u.side);
  }

  alliesOf(u: Combatant) {
    return this.C.filter((o) => o.alive && o.side === u.side);
  }

  stepToward(u: Combatant, t: Combatant) {
    if (u.rooted || u.boss) return;
    const dr = Math.sign(t.r - u.r);
    const dc = Math.sign(t.c - u.c);
    const tries: [number, number][] = [
      [dr, dc],
      [dr, 0],
      [0, dc],
    ];
    for (const [a, b] of tries) {
      const nr = u.r + a;
      const nc = u.c + b;
      if (nr < 0 || nr > BOARD_ROWS - 1 || nc < 0 || nc > BOARD_COLS - 1) continue;
      if (cellBlocked(this.C, nr, nc, u.u)) continue;
      u.r = nr;
      u.c = nc;
      return;
    }
  }

  stepAway(u: Combatant, t: Combatant) {
    if (u.rooted || u.boss) return false;
    const dr = Math.sign(u.r - t.r) || (u.r <= t.r ? -1 : 1);
    const dc = Math.sign(u.c - t.c) || (u.c <= t.c ? -1 : 1);
    const tries: [number, number][] = [
      [dr, dc],
      [dr, 0],
      [0, dc],
      [-dr, 0],
      [0, -dc],
    ];
    for (const [a, b] of tries) {
      const nr = u.r + a;
      const nc = u.c + b;
      if (nr < 0 || nr > BOARD_ROWS - 1 || nc < 0 || nc > BOARD_COLS - 1) continue;
      if (cellBlocked(this.C, nr, nc, u.u)) continue;
      u.r = nr;
      u.c = nc;
      return true;
    }
    return false;
  }

  inAttackRange(u: Combatant, d: number): boolean {
    if (u.boss) return d <= u.range;
    if (u.melee) return d <= 1;
    return d >= 2 && d <= u.range;
  }

  private bossCast(u: Combatant) {
    const E = this.enemiesOf(u);
    const A = this.alliesOf(u).filter((a) => a.u !== u.u);
    const sp = u.sp || 0;
    const m = STARMUL[u.star as 1 | 2 | 3];
    const kit = (u.bossKit as BossKitId) || 'clay';
    const k = BOSS_KIT_SCALE[kit];
    // Kit magnitudes track the reference board's average unit, so a slam is
    // always worth about the same fraction of a hero at every round.
    const unit = refTeam(u.bossRound ?? 4).avgHp;
    const slam = (unit * k.slam + sp) * m;
    const shield = (unit * k.shield + sp) * m;
    const fxTarget = E[0] || u;
    this.emitFx(u, fxTarget, 'cast');

    if (kit === 'storm') {
      E.forEach((o) => this.hurt(u, o, slam, 'magic'));
      A.forEach((ally) => {
        ally.shield += shield;
        this.applyAsBuff(ally, 1.22, 4);
      });
      this.applyAsBuff(u, 1.12, 4);
      E.slice()
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
        .slice(0, 2)
        .forEach((o) => {
          o.stun = Math.max(o.stun, 2);
        });
      return;
    }

    if (kit === 'coil') {
      E.forEach((o) => {
        this.hurt(u, o, slam, 'magic');
        o.burn = unit * (k.burn ?? 0) * m;
        o.burnT = 4;
        o.amp = Math.max(o.amp || 0, 0.16);
        o.silence = Math.max(o.silence, 1.4);
      });
      this.heal(u, Math.round(u.maxHp * 0.035));
      u.lifesteal = Math.min(0.35, (u.lifesteal || 0) + 0.08);
      u.shield += shield;
      return;
    }

    // clay — default
    E.forEach((o) => {
      this.hurt(u, o, slam, 'magic');
      o.snare = Math.max(o.snare, 2.2);
      o.amp = Math.max(o.amp || 0, 0.14);
    });
    u.shield += shield;
    u.dr = Math.min(0.5, (u.dr || 0) + 0.1);
  }

  cast(u: Combatant, t: Combatant) {
    this.castDepth++;
    try {
      this.castInner(u, t);
    } finally {
      this.castDepth--;
    }
  }

  private castInner(u: Combatant, t: Combatant) {
    u.mana = 0;
    if (u.boss) {
      this.bossCast(u);
      return;
    }
    const sp = u.sp || 0;
    const m = STARMUL[u.star as 1 | 2 | 3];
    const a = ABILITIES[u.hid];
    this.emitFx(u, t, 'cast');
    const E = this.enemiesOf(u);
    const A = this.alliesOf(u);
    const near = (n: number) =>
      E.slice()
        .sort((x, y) => this.dist(u, x) - this.dist(u, y))
        .slice(0, n);
    /** A magnitude at this star, with spell power folded in. */
    const mag = (base: number) => (base + sp) * m;

    if (!a) {
      this.hurt(u, t, mag(200), 'magic');
      return;
    }

    switch (u.hid) {
      case 'jorm': {
        let tot = 0;
        E.forEach((o) => {
          if (this.dist(u, o) <= 1) tot += this.hurt(u, o, mag(a.base), 'magic');
        });
        u.hp = Math.min(u.maxHp, u.hp + tot / 2);
        break;
      }
      case 'quetz': {
        const hit = E.filter((o) => o.c === t.c || this.dist(u, o) <= 2);
        const per = mag(a.base) / Math.max(1, hit.length);
        hit.forEach((o) => this.hurt(u, o, per, 'magic'));
        A.forEach((ally) => this.applyAsBuff(ally, 1.25, a.duration ?? 4));
        break;
      }
      case 'thund':
        near(3).forEach((o, i) =>
          this.hurt(u, o, mag(a.base) * (i ? 1 + u.critDmg : 1), i ? 'crit' : 'magic'),
        );
        break;
      case 'anans':
        near(2).forEach((o) => {
          o.snare = a.duration ?? 2;
          o.amp = 0.2;
        });
        break;
      case 'bunyi': {
        const b = E.slice().sort((x, y) => y.atk - x.atk)[0];
        if (b) {
          this.hurt(u, b, mag(a.base), 'magic');
          b.silence = a.duration ?? 3;
        }
        break;
      }
      case 'garud':
        this.hurt(u, t, mag(a.base), 'phys');
        u.shield += (a.secondary ?? 0) * m;
        break;
      case 'kitsu':
        for (let i = 0; i < (a.secondary ?? 9); i++) {
          const o = E[Math.floor(random() * E.length)];
          if (!o) break;
          const crit = random() < Math.min(1, u.crit);
          this.hurt(u, o, (a.base + sp / 3) * m * (crit ? 1 + u.critDmg : 1), crit ? 'crit' : 'magic');
        }
        break;
      case 'ifrit':
        E.forEach((o) => {
          if (this.dist(o, t) <= 1) {
            this.hurt(u, o, mag(a.base), 'magic');
            o.burn = (a.secondary ?? 0) * m;
            o.burnT = a.duration ?? 4;
          }
        });
        break;
      case 'zirni':
        near(3).forEach((o) => this.hurt(u, o, mag(a.base), 'magic'));
        if (!u.cast2 && u.hp < u.maxHp * 0.35) {
          u.cast2 = true;
          u.mana = 100;
        }
        break;
      case 'taniw':
        A.forEach((ally) => {
          ally.shield += mag(a.base);
          ally.dmgBuff = 0.15;
          ally.dmgBuffT = 4;
        });
        break;
      case 'anzuu': {
        const b = E.slice().sort((x, y) => y.mana - x.mana)[0];
        if (b) {
          b.sp = (b.sp || 0) - a.base;
          u.sp = (u.sp || 0) + a.base;
          u.atk *= 1.08;
        }
        break;
      }
      case 'sphin':
        E.slice()
          .sort((x, y) => x.hp - y.hp)
          .slice(0, 2)
          .forEach((o) => {
            o.stun = a.duration ?? 2.5;
            this.hurt(u, o, mag(a.base), 'true');
          });
        break;
      case 'kelpi': {
        const b = near(1)[0];
        if (b) {
          const dealt = this.hurt(u, b, mag(a.base), 'magic');
          b.snare = a.duration ?? 2.5;
          this.heal(u, dealt / 2);
        }
        break;
      }
      case 'barng':
        A.forEach((ally) => {
          ally.stun = 0;
          ally.snare = 0;
          ally.shield += mag(a.base);
        });
        break;
      case 'coyot': {
        const o = E[Math.floor(random() * E.length)];
        if (o) {
          this.hurt(u, o, mag(a.base), 'magic');
          o.stun = a.duration ?? 1.5;
        }
        A.forEach((ally) => {
          ally.crit = Math.min(1, ally.crit + 0.15);
        });
        break;
      }
      case 'griff': {
        const ally = A.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0] || u;
        ally.shield += mag(a.secondary ?? 0);
        E.forEach((o) => {
          if (this.dist(ally, o) <= 1) this.hurt(u, o, mag(a.base), 'phys');
        });
        break;
      }
      case 'golem':
        u.shield += mag(a.secondary ?? 0);
        E.forEach((o) => {
          if (this.dist(u, o) <= 1) this.hurt(u, o, mag(a.base), 'magic');
        });
        break;
      case 'bansh': {
        const o = E.slice().sort((x, y) => x.hp - y.hp)[0];
        if (o) {
          o.stun = a.duration ?? 2;
          const exec = o.hp < o.maxHp * 0.4;
          this.hurt(u, o, mag(a.base), exec ? 'true' : 'magic');
        }
        break;
      }
      case 'hydra': {
        let hits = 0;
        near(3).forEach((o) => {
          this.hurt(u, o, mag(a.base), 'magic');
          hits++;
        });
        this.heal(u, (a.secondary ?? 0) * m * hits);
        break;
      }
      case 'nuwa':
        A.slice()
          .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)
          .slice(0, 2)
          .forEach((ally) => {
            this.heal(ally, mag(a.base));
            ally.dr = Math.min(0.6, (ally.dr || 0) + 0.15);
          });
        break;
      case 'camaz': {
        const nearTarget = near(1)[0] || t;
        const dealt = this.hurt(u, nearTarget, mag(a.base), 'phys');
        this.heal(u, dealt);
        break;
      }
      case 'simur':
        A.forEach((ally) => {
          this.heal(ally, mag(a.base));
          this.applyAsBuff(ally, 1.2, a.duration ?? 4);
        });
        near(2).forEach((o) => this.hurt(u, o, mag(a.secondary ?? 0), 'magic'));
        break;
      case 'levia':
        E.forEach((o) => {
          if (this.dist(u, o) <= 2) {
            this.hurt(u, o, mag(a.base), 'magic');
            o.snare = a.duration ?? 1.5;
          }
        });
        break;
      case 'wendi': {
        const steal = Math.round(t.hp * (a.secondary ?? 0.1));
        this.hurt(u, t, mag(a.base), 'phys');
        if (steal > 0) {
          u.maxHp += steal;
          this.heal(u, steal);
          u.atk *= 1.08;
        }
        break;
      }
      default:
        this.hurt(u, t, mag(a.base), 'magic');
    }
  }

  /** One attack-speed buff at a time, restored when `buffT` runs out. */
  private applyAsBuff(u: Combatant, mul: number, seconds: number) {
    if (u.buffAs) return;
    u.buffAs = mul;
    u.as *= mul;
    u.buffT = seconds;
  }

  simTick(dt: number) {
    const alive = this.C.filter((u) => u.alive);
    alive.forEach((u) => {
      u.stun = Math.max(0, u.stun - dt);
      u.silence = Math.max(0, u.silence - dt);
      u.snare = Math.max(0, u.snare - dt);
      if (u.burnT > 0) {
        u.burnT -= dt;
        this.silentHurt(u, u.burn * dt);
      }
      if (u.buffT && u.buffT > 0) {
        u.buffT -= dt;
        if (u.buffT <= 0 && u.buffAs) {
          u.as /= u.buffAs;
          u.buffAs = 0;
        }
      }
      if (u.dmgBuffT && u.dmgBuffT > 0) {
        u.dmgBuffT -= dt;
        if (u.dmgBuffT <= 0) u.dmgBuff = 0;
      }
      if (u.stun > 0) return;
      const t = this.target(u);
      if (!t) return;
      if (u.mana >= 100 && u.silence <= 0) {
        if (u.boss) {
          const kit = BOSS_KITS[(u.bossKit as BossKitId) || 'clay'];
          this.onBanner(kit?.banner ?? 'Cataclysm — all allies struck');
        } else if (u.side === 'me') this.onBanner(HERO_MAP[u.hid].ability);
        this.cast(u, t);
        return;
      }
      const d = this.dist(u, t);
      if (this.inAttackRange(u, d)) {
        u.cd -= dt;
        if (u.cd <= 0) {
          u.cd = 1 / u.as;
          if (u.boss) {
            this.bossBasicAttack(u);
          } else {
            const crit = random() < Math.min(1, u.crit);
            const dmg = u.atk * (crit ? 1 + u.critDmg : 1);
            this.hurt(u, t, dmg, crit ? 'crit' : 'phys');
          }
          u.mana = Math.min(100, u.mana + 12);
          if (u.scorch) {
            this.C.forEach((o) => {
              if (o.alive && o.side !== u.side && this.dist(o, t) <= 1 && o !== t)
                this.silentHurt(o, u.scorch! * dt * 2);
            });
          }
        }
      } else if (!u.rooted && !u.boss && u.snare <= 0) {
        u.mv -= dt;
        if (u.mv <= 0) {
          u.mv = 0.45;
          if (!u.melee && d < 2) this.stepAway(u, t);
          else this.stepToward(u, t);
        }
      }
    });
  }

  tick(speed: number) {
    for (let k = 0; k < speed; k++) {
      this.time += 0.1;
      this.simTick(0.1);
    }
  }

  getWinner(): boolean {
    const mine = this.C.filter((u) => u.side === 'me' && u.alive);
    const theirs = this.C.filter((u) => u.side === 'foe' && u.alive);
    const bosses = this.C.filter((u) => u.boss);
    if (bosses.length) {
      if (!mine.length) return false;
      return bosses.every((b) => !b.alive);
    }
    if (mine.length && !theirs.length) return true;
    if (!mine.length && theirs.length) return false;
    const f = (a: Combatant[]) => a.reduce((s, u) => s + u.hp / u.maxHp, 0);
    return f(mine) >= f(theirs);
  }

  isDone(): boolean {
    const mine = this.C.filter((u) => u.side === 'me' && u.alive);
    const theirs = this.C.filter((u) => u.side === 'foe' && u.alive);
    const bosses = this.C.filter((u) => u.boss);
    const limit = bosses.length ? BOSS_COMBAT_LIMIT : COMBAT_LIMIT;
    if (bosses.length) {
      if (!mine.length) return true;
      if (bosses.every((b) => !b.alive)) return true;
      return this.time > limit;
    }
    return !mine.length || !theirs.length || this.time > limit;
  }
}

export const gameActions = {
  buy(g: GameState, i: number) {
    if (g.phase !== 'plan') return;
    const offer = g.shop[i];
    if (!offer) return;
    const cost = shopPrice(offer);
    if (g.gold < cost || g.bench.length >= 8) return;
    g.gold -= cost;
    g.shop = g.shop.map((s, j) => (j === i ? null : s));
    g.bench.push({ u: uid(), hid: offer.hid, star: offer.star, relics: [] });
  },

  sell(g: GameState) {
    if (g.phase !== 'plan' || !g.sel) return;
    const list = g.sel.from === 'bench' ? g.bench : g.board;
    const idx = list.findIndex((x) => x.u === g.sel!.u);
    if (idx < 0) return;
    const un = list[idx];
    g.gold += sellValue(un);
    list.splice(idx, 1);
    g.sel = null;
  },

  reroll(g: GameState, draft: string[]) {
    if (g.phase !== 'plan') return;
    if (g.mode === 'practice') {
      rollShop(g, draft);
      return;
    }
    if (g.freeRerolls > 0) {
      g.freeRerolls--;
      rollShop(g, draft);
      return;
    }
    const cost = MATCH_DEFAULTS.rerollCost;
    if (g.gold < cost) return;
    g.gold -= cost;
    rollShop(g, draft);
  },

  tapUnit(g: GameState, u: Unit, from: 'bench' | 'board', maxR: number) {
    if (g.phase !== 'plan') return;
    if (g.sel && g.sel.u === u.u) {
      g.sel = null;
      return;
    }
    if (g.sel) {
      const a = findUnit(g, g.sel);
      const b = { u, from };
      if (a) {
        swapUnits(g, a, b, maxR);
        g.sel = null;
      }
      return;
    }
    g.sel = { u: u.u, from };
  },

  tapCell(g: GameState, r: number, c: number, maxR: number, onPop: (text: string) => void) {
    if (g.phase !== 'plan' || r < PLAYER_ROW_START) return;
    const occ = g.board.find((u) => u.r != null && u.c != null && occupiesCell(u as Unit & { r: number; c: number }, r, c));
    if (!g.sel) {
      if (occ) gameActions.tapUnit(g, occ, 'board', maxR);
      return;
    }
    const sel = findUnit(g, g.sel);
    if (!sel) {
      g.sel = null;
      return;
    }
    if (occ) swapUnits(g, sel, { u: occ, from: 'board' }, maxR);
    else if (!moveToBoard(g, sel.u, r, c, maxR)) onPop('BOARD FULL');
    g.sel = null;
  },

  resolveRound(
    g: GameState,
    win: boolean,
    maxR: number,
    survivors?: { me: number; foe: number },
  ): OverlayKind {
    g.phase = 'result';
    if (survivors) g.lastSurvivors = survivors;
    if (g.mode === 'practice') {
      return { kind: 'spar' as const, win };
    }
    if (g.mode === 'gauntlet') {
      const enc = getGauntletEncounter(g.round);
      if (win) {
        g.streak = Math.max(0, g.streak) + 1;
        g.gold += enc.reward.gold;
        g.freeRerolls += enc.reward.freeRerolls;
        g.gauntletRoundsCleared = g.round;
        g.lastResult = { win: true, dmg: 0, boss: true };
        return {
          kind: 'result' as const,
          win: true,
          dmg: 0,
          offer: true,
          boss: { name: enc.name, period: enc.period, reward: enc.reward },
        };
      }
      g.streak = Math.min(0, g.streak) - 1;
      g.gauntletLives = Math.max(0, (g.gauntletLives ?? GAUNTLET.startLives) - 1);
      g.gauntletGoldPenalty = GAUNTLET.goldPenalty;
      g.lastResult = { win: false, dmg: 0, boss: true };
      if ((g.gauntletLives ?? 0) <= 0) {
        return { kind: 'over' as const, win: false };
      }
      return {
        kind: 'result' as const,
        win: false,
        dmg: 0,
        offer: false,
        boss: { name: enc.name, period: enc.period },
      };
    }
    const boss =
      g.mode === 'bot' || g.mode === 'marathon' ? getBossEncounter(g.round, g.matchRounds) : null;
    let dmg = 0;
    if (boss) {
      if (win) {
        g.streak = Math.max(0, g.streak) + 1;
        g.gold += boss.reward.gold;
        g.freeRerolls += boss.reward.freeRerolls;
        g.lastResult = { win: true, dmg: 0, boss: true };
        const over = g.myHp <= 0 || g.foeHp <= 0 || g.round >= maxR;
        if (over) return { kind: 'over' as const, win: g.foeHp <= 0 || (g.myHp > 0 && g.foeHp < g.myHp) };
        return {
          kind: 'result' as const,
          win: true,
          dmg: 0,
          offer: boss.reward.relic,
          boss: { name: boss.name, period: boss.period, reward: boss.reward },
        };
      }
      g.streak = Math.min(0, g.streak) - 1;
      dmg = lossDamage(g.round, BOSS_SURVIVOR_COUNT, true);
      g.myHp = Math.max(0, g.myHp - dmg);
      g.lastResult = { win: false, dmg, boss: true };
      const over = g.myHp <= 0 || g.foeHp <= 0 || g.round >= maxR;
      if (over) return { kind: 'over' as const, win: false };
      return {
        kind: 'result' as const,
        win: false,
        dmg,
        offer: false,
        boss: { name: boss.name, period: boss.period },
      };
    }
    if (win) {
      g.streak = Math.max(0, g.streak) + 1;
      g.foeStreak = Math.min(0, g.foeStreak) - 1;
      dmg = lossDamage(g.round, g.lastSurvivors.me);
      g.foeHp = Math.max(0, g.foeHp - dmg);
    } else {
      g.streak = Math.min(0, g.streak) - 1;
      g.foeStreak = Math.max(0, g.foeStreak) + 1;
      dmg = lossDamage(g.round, g.lastSurvivors.foe);
      g.myHp = Math.max(0, g.myHp - dmg);
    }
    g.lastResult = { win, dmg, boss: false };
    const over = g.myHp <= 0 || g.foeHp <= 0 || g.round >= maxR;
    if (over) return { kind: 'over' as const, win: g.foeHp <= 0 || (g.myHp > 0 && g.foeHp < g.myHp) };
    const offer = RELIC_ROUNDS.includes(g.round as (typeof RELIC_ROUNDS)[number]);
    return { kind: 'result' as const, win, dmg, offer };
  },

  nextRound(g: GameState, draft: string[], difficulty: Difficulty = 'normal') {
    const pvpWin = g.lastResult && !g.lastResult.boss ? g.lastResult.win : null;
    const botPvpWin = g.lastResult && !g.lastResult.boss ? !g.lastResult.win : null;
    g.round++;
    g.phase = 'plan';
    g.sel = null;
    if (g.mode === 'practice') {
      g.foe = [];
      rollShop(g, draft);
      return;
    }
    if (g.mode === 'gauntlet') {
      const penalty = g.gauntletGoldPenalty ?? 0;
      if (penalty > 0) {
        g.gold = Math.max(0, g.gold - penalty);
        g.gauntletGoldPenalty = 0;
      }
      g.gold += gauntletRoundIncome(g.round, g.gold);
      rollShop(g, draft);
      return;
    }
    g.gold += incomeBreakdown(g.round, g.gold, g.streak, pvpWin).total;
    g.foeGold +=
      incomeBreakdown(g.round, g.foeGold, g.foeStreak, botPvpWin).total +
      BOT_INCOME_BONUS[difficulty];
    rollShop(g, draft);
    runBotTurn(g);
    if (RELIC_ROUNDS.includes(g.round as (typeof RELIC_ROUNDS)[number]) || isBossRound(g.round, g.matchRounds)) {
      grantBotRelic(g);
    }
  },

  bindRelic(_g: GameState, rid: string, u: Unit) {
    if (u.relics.length >= 3) return;
    u.relics.push(rid);
  },
};

export function traitCard(name: string, counts: Record<string, number>) {
  const def = TRAITS[name as TraitName];
  const n = counts[name] || 0;
  let best = 0;
  def.tiers.forEach(([need]) => {
    if (n >= need) best = need;
  });
  return {
    name,
    glyph: def.glyph,
    desc: def.desc,
    countLabel: `${n} on board`,
    cardBg: best ? 'var(--om-card)' : 'var(--om-surface-2)',
    headBg: best
      ? best >= def.tiers[def.tiers.length - 1][0]
        ? 'var(--om-accent)'
        : 'var(--om-hud-bg)'
      : 'var(--om-surface-3)',
    headFg: best
      ? best >= def.tiers[def.tiers.length - 1][0]
        ? 'var(--om-on-accent)'
        : 'var(--om-hud-fg)'
      : 'var(--om-muted)',
    tiers: def.tiers.map(([need, text]) => ({
      n: need,
      text,
      fg: n >= need ? 'var(--om-fg)' : 'var(--om-muted-2)',
      mark: n >= need ? '●' : '○',
    })),
  };
}

export function classCard(name: string, counts: Record<string, number>) {
  const def = CLASSES[name as ClassName];
  const n = counts[name] || 0;
  let best = 0;
  def.tiers.forEach(([need]) => {
    if (n >= need) best = need;
  });
  return {
    name,
    glyph: def.glyph,
    desc: def.desc,
    countLabel: `${n} drafted`,
    cardBg: best ? 'var(--om-surface-2)' : 'var(--om-surface-3)',
    headBg: best
      ? best >= def.tiers[def.tiers.length - 1][0]
        ? 'var(--om-info)'
        : 'var(--om-hud-bg)'
      : 'var(--om-surface-3)',
    headFg: best ? 'var(--om-hud-fg)' : 'var(--om-muted)',
    tiers: def.tiers.map(([need, text]) => ({
      n: need,
      text,
      fg: n >= need ? 'var(--om-fg)' : 'var(--om-muted-2)',
      mark: n >= need ? '●' : '○',
    })),
  };
}

export function pickRelics(count = 3): string[] {
  return shuffle(RELICS.map((r) => r.id)).slice(0, count);
}
