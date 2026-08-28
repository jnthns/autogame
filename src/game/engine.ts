import { CAPS, MATCH_DEFAULTS, SAF, STARMUL } from '../data/constants';
import { CLASSES, type ClassName } from '../data/classes';
import { HEROES, HERO_MAP } from '../data/heroes';
import { RELIC_MAP, RELICS } from '../data/relics';
import { TRAITS, type TraitName } from '../data/traits';
import {
  getBossEncounter,
  isBossRound,
  lossDamage,
  makeBossUnits,
  roundIncome,
  shopWeight,
  unitPower,
} from './hyperRoll';
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
  Unit,
} from './types';

let uidCounter = 0;
export const uid = () => `u${++uidCounter}`;

export function resetUidCounter() {
  uidCounter = 0;
}

export function pickBotDraft(): string[] {
  const low = HEROES.filter((h) => h.cost <= 2).sort(() => Math.random() - 0.5);
  const mid = HEROES.filter((h) => h.cost === 3).sort(() => Math.random() - 0.5);
  const high = HEROES.filter((h) => h.cost >= 4).sort(() => Math.random() - 0.5);
  const pick = (arr: typeof HEROES, n: number) => arr.slice(0, Math.min(n, arr.length));
  return [...pick(low, 2), ...pick(mid, 2), ...pick(high, 2)].map((h) => h.id);
}

export function createGame(
  mode: GameMode,
  opts?: { speed?: CombatSpeed; startRound?: number; draft?: string[] },
): GameState {
  const hp = MATCH_DEFAULTS.startHealth;
  const speed = opts?.speed === 2 || opts?.speed === 4 ? opts.speed : 1;
  const g: GameState = {
    mode,
    matchRounds: MATCH_DEFAULTS.matchRounds,
    round: 1,
    gold: mode === 'practice' ? 999 : 14,
    myHp: hp,
    foeHp: hp,
    maxHp: hp,
    lossStreak: 0,
    foeLossStreak: 0,
    bench: [],
    board: [],
    foe: [],
    foeBench: [],
    foeGold: mode === 'practice' ? 0 : 14,
    foeDraft: mode === 'practice' ? [] : pickBotDraft(),
    foeShop: [],
    shop: [],
    freeRerolls: 0,
    sel: null,
    speed,
    phase: 'plan',
    log: '',
    lastResult: null,
  };
  if (mode === 'bot') {
    runBotTurn(g);
    const target = opts?.startRound;
    if (target && target > 1) {
      fastForwardMatch(g, target);
      seedDebugPlayer(g, opts.draft ?? [], target);
    }
  }
  return g;
}

function seedDebugPlayer(g: GameState, draft: string[], round: number): void {
  const pool = (draft.length ? draft : HEROES.slice(0, 6).map((h) => h.id)).slice(0, 6);
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
    g.gold += roundIncome(g.round, false);
    g.foeGold += roundIncome(g.round, null);
    runBotTurn(g);
  }
  g.phase = 'plan';
  g.sel = null;
  g.lastResult = null;
}

export function cap(round: number, maxR: number = MATCH_DEFAULTS.matchRounds): number {
  return CAPS[Math.min(round, maxR) - 1] ?? CAPS[CAPS.length - 1];
}

export function rollShopOffers(draft: string[]): (string | null)[] {
  const pool = draft.length ? draft : HEROES.slice(0, 6).map((h) => h.id);
  const w = pool.map((id) => shopWeight(HERO_MAP[id].cost));
  const tot = w.reduce((a, b) => a + b, 0);
  return [0, 0, 0, 0, 0].map(() => {
    let r = Math.random() * tot;
    for (let i = 0; i < pool.length; i++) {
      r -= w[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  });
}

export function rollShop(g: GameState, draft: string[], silent = false): void {
  g.shop = rollShopOffers(draft);
  void silent;
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
    if (g.board.length >= cap(g.round, maxR)) return false;
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

/** When 2× 2★ already exist, buying any copy merges them to 3★ (TFT shop trigger). */
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
  if (twos.length !== 2) return;
  twos.sort((a, b) => (a.on === 'board' ? -1 : 1) - (b.on === 'board' ? -1 : 1));
  combineUnits(g.board, g.bench, twos, hid, 3, onPop);
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
        if (arr.length < 3) continue;
        arr.sort((a, b) => (a.on === 'board' ? -1 : 1) - (b.on === 'board' ? -1 : 1));
        combineUnits(board, bench, arr.slice(0, 3), hid, (star + 1) as 2 | 3, onPop);
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

/** TFT/DAC-style: 1★ refunds full cost; combined units pay a small combine tax. */
export function sellValue(u: Unit): number {
  const cost = HERO_MAP[u.hid].cost;
  if (u.star === 1) return cost;
  if (u.star === 2) return Math.max(1, cost * 3 - 1);
  return Math.max(1, cost * 5 - 1);
}

export function combatOpponents(g: GameState): Unit[] {
  if (g.mode === 'bot' && isBossRound(g.round)) return makeBossUnits(g.round);
  return g.foe;
}

function placeBotBoard(units: Unit[], capN: number): { board: Unit[]; bench: Unit[] } {
  const ranked = units.slice().sort((a, b) => unitPower(b) - unitPower(a));
  const board = ranked.slice(0, capN);
  const bench = ranked.slice(capN);
  const tanks = board.filter((u) => (HERO_MAP[u.hid]?.range ?? 1) <= 1);
  const ranged = board.filter((u) => (HERO_MAP[u.hid]?.range ?? 1) > 1);
  const cells: { r: number; c: number }[] = [];
  for (const r of [3, 2, 1, 0]) {
    for (const c of [1, 2, 0, 3]) cells.push({ r, c });
  }
  const backCells: { r: number; c: number }[] = [];
  for (const r of [0, 1, 2, 3]) {
    for (const c of [1, 2, 0, 3]) backCells.push({ r, c });
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
  const hid = g.foeShop[i];
  if (!hid) return false;
  const cost = HERO_MAP[hid].cost;
  if (g.foeGold < cost || g.foeBench.length >= 8) return false;
  g.foeGold -= cost;
  g.foeShop = g.foeShop.map((s, j) => (j === i ? null : s));
  g.foeBench.push({ u: uid(), hid, star: 1, relics: [] });
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

export function runBotTurn(g: GameState): void {
  if (g.mode !== 'bot') return;
  g.foeShop = rollShopOffers(g.foeDraft.length ? g.foeDraft : HEROES.map((h) => h.id));

  const tryBuys = () => {
    let bought = false;
    for (let i = 0; i < g.foeShop.length; i++) {
      const hid = g.foeShop[i];
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

  const usefulLeft = g.foeShop.some((hid) => hid && botOwns(g, hid));
  if (!usefulLeft && g.foeGold >= MATCH_DEFAULTS.rerollCost + 3) {
    g.foeGold -= MATCH_DEFAULTS.rerollCost;
    g.foeShop = rollShopOffers(g.foeDraft);
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

const FOE_SCALE: Record<Difficulty, { hp: number; atk: number; extra: number }> = {
  normal: { hp: 1, atk: 1, extra: 0 },
  hard: { hp: 1.2, atk: 1.12, extra: 0 },
  mythic: { hp: 1.4, atk: 1.28, extra: 1 },
};

export function makeFoeBoard(g: GameState, difficulty: Difficulty = 'normal'): void {
  const extra = g.mode === 'bot' ? FOE_SCALE[difficulty].extra : 0;
  const n = Math.min(2 + Math.floor(g.round * 0.45) + extra, 7);
  const ids = HEROES.map((h) => h.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, n);
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push({ r, c });
  cells.sort(() => Math.random() - 0.5);
  g.foe = ids.map((hid, i) => {
    let star: 1 | 2 | 3 =
      g.round >= 9
        ? Math.random() < 0.4
          ? 3
          : 2
        : g.round >= 5
          ? Math.random() < 0.5
            ? 2
            : 1
          : 1;
    if (g.mode === 'bot' && difficulty === 'mythic' && star < 3 && Math.random() < 0.22) {
      star = (star + 1) as 2 | 3;
    } else if (g.mode === 'bot' && difficulty === 'hard' && star === 1 && Math.random() < 0.18) {
      star = 2;
    }
    const pos = cells[i];
    return { u: uid(), hid, star, relics: [], r: pos.r, c: pos.c };
  });
}

export function scaleFoeCombatants(list: Combatant[], difficulty: Difficulty): void {
  const s = FOE_SCALE[difficulty];
  if (s.hp === 1 && s.atk === 1) return;
  list.forEach((c) => {
    c.maxHp = Math.round(c.maxHp * s.hp);
    c.hp = c.maxHp;
    c.atk = Math.round(c.atk * s.atk);
  });
}

export function combatant(u: Unit, side: 'me' | 'foe'): Combatant {
  const h = HERO_MAP[u.hid];
  const m = STARMUL[u.star];
  const hpScale = u.scaleHp ?? 1;
  const atkScale = u.scaleAtk ?? 1;
  const o: Combatant = {
    u: u.u,
    hid: u.hid,
    star: u.star,
    side,
    r: u.r!,
    c: u.c!,
    glyph: h.glyph,
    name: u.boss ? `${h.name}` : h.name,
    maxHp: Math.round(h.hp * m * hpScale),
    hp: 0,
    atk: h.dmg * m * atkScale,
    as: h.as,
    range: h.range,
    crit: h.crit,
    critDmg: 0.8,
    mana: 0,
    startMana: 0,
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
    cd: 1 / h.as,
    mv: 0.4,
    alive: true,
    cast2: false,
    boss: !!u.boss,
  };
  o.hp = o.maxHp;
  (u.relics || []).forEach((rid) => {
    const r = RELIC_MAP[rid];
    if (r) r.apply(o);
  });
  return o;
}

export function applyTraits(list: Combatant[]): void {
  const c: Record<string, number> = {};
  list.forEach((u) =>
    HERO_MAP[u.hid].traits.forEach((t: string) => {
      c[t] = (c[t] || 0) + 1;
    }),
  );
  const lvl = (n: string) => c[n] || 0;
  list.forEach((u) => {
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
    private onPop: (r: number, c: number, text: string, color: string, size?: string) => void,
    private onBanner: (text: string) => void,
    private onFx?: (fx: CombatFxPayload) => void,
  ) {}

  private emitFx(src: Combatant, t: Combatant, kind: CombatFxKind) {
    this.onFx?.({
      kind,
      hid: src.hid,
      fromR: src.r,
      fromC: src.c,
      toR: t.r,
      toC: t.c,
      melee: this.dist(src, t) <= 1,
    });
  }

  dist(a: { r: number; c: number }, b: { r: number; c: number }) {
    return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
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

  hurt(src: Combatant | null, t: Combatant, amount: number, kind: string): number {
    if (!t.alive) return 0;
    let dmg = amount * (1 - (t.dr || 0)) * (1 + (t.amp || 0));
    if (kind === 'true') dmg = amount;
    if (t.shield > 0) {
      const a = Math.min(t.shield, dmg);
      t.shield -= a;
      dmg -= a;
    }
    t.hp -= dmg;
    t.mana = Math.min(100, t.mana + 5);
    if (dmg > 0) {
      this.onPop(
        t.r,
        t.c,
        `-${Math.round(dmg)}`,
        kind === 'magic' ? '#4C7BD1' : kind === 'crit' ? SAF : '#F2E9D4',
        '13px',
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
      this.onPop(t.r, t.c, '✕', '#B4442B', '16px');
    }
    return dmg;
  }

  silentHurt(t: Combatant, amt: number) {
    if (!t.alive) return;
    t.hp -= amt;
    if (t.hp <= 0) {
      t.hp = 0;
      t.alive = false;
      this.onPop(t.r, t.c, '✕', '#B4442B', '16px');
    }
  }

  heal(u: Combatant, amt: number) {
    if (!u.alive || amt <= 0) return;
    const got = Math.min(u.maxHp - u.hp, amt);
    if (got <= 0) return;
    u.hp += got;
    this.onPop(u.r, u.c, `+${Math.round(got)}`, '#1B6B52', '13px');
  }

  enemiesOf(u: Combatant) {
    return this.C.filter((o) => o.alive && o.side !== u.side);
  }

  alliesOf(u: Combatant) {
    return this.C.filter((o) => o.alive && o.side === u.side);
  }

  stepToward(u: Combatant, t: Combatant) {
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
      if (nr < 0 || nr > 7 || nc < 0 || nc > 3) continue;
      if (this.C.some((o) => o.alive && o.r === nr && o.c === nc)) continue;
      u.r = nr;
      u.c = nc;
      return;
    }
  }

  cast(u: Combatant, t: Combatant) {
    u.mana = 0;
    const sp = u.sp || 0;
    const m = STARMUL[u.star as 1 | 2 | 3];
    if (u.side === 'me') this.onBanner(HERO_MAP[u.hid].ability);
    this.emitFx(u, t, 'cast');
    const E = this.enemiesOf(u);
    const A = this.alliesOf(u);
    const near = (n: number) =>
      E.slice()
        .sort((a, b) => this.dist(u, a) - this.dist(u, b))
        .slice(0, n);

    switch (u.hid) {
      case 'jorm': {
        let tot = 0;
        E.forEach((o) => {
          if (this.dist(u, o) <= 1) tot += this.hurt(u, o, (220 + sp) * m, 'magic');
        });
        u.hp = Math.min(u.maxHp, u.hp + tot / 2);
        break;
      }
      case 'quetz': {
        const hit = E.filter((o) => o.c === t.c || this.dist(u, o) <= 2);
        const per = ((300 + sp) * m) / Math.max(1, hit.length);
        hit.forEach((o) => this.hurt(u, o, per, 'magic'));
        A.forEach((a) => {
          if (!a.buffAs) {
            a.buffAs = 1.25;
            a.as *= 1.25;
            a.buffT = 4;
          }
        });
        break;
      }
      case 'thund':
        near(3).forEach((o, i) =>
          this.hurt(u, o, (180 + sp) * m * (i ? 1 + u.critDmg : 1), i ? 'crit' : 'magic'),
        );
        break;
      case 'anans':
        near(2).forEach((o) => {
          o.snare = 2;
          o.amp = 0.2;
        });
        break;
      case 'bunyi': {
        const b = E.slice().sort((a, c) => c.atk - a.atk)[0];
        if (b) {
          this.hurt(u, b, (160 + sp) * m, 'magic');
          b.silence = 3;
        }
        break;
      }
      case 'garud':
        this.hurt(u, t, (260 + sp) * m, 'phys');
        u.shield += 300 * m;
        break;
      case 'kitsu':
        for (let i = 0; i < 9; i++) {
          const o = E[Math.floor(Math.random() * E.length)];
          if (!o) break;
          const crit = Math.random() < u.crit;
          this.hurt(u, o, (70 + sp / 3) * m * (crit ? 1 + u.critDmg : 1), crit ? 'crit' : 'magic');
        }
        break;
      case 'ifrit':
        E.forEach((o) => {
          if (this.dist(o, t) <= 1) {
            this.hurt(u, o, (280 + sp) * m, 'magic');
            o.burn = 40 * m;
            o.burnT = 4;
          }
        });
        break;
      case 'zirni':
        near(3).forEach((o) => this.hurt(u, o, (200 + sp) * m, 'magic'));
        if (!u.cast2 && u.hp < u.maxHp * 0.35) {
          u.cast2 = true;
          u.mana = 100;
        }
        break;
      case 'taniw':
        A.forEach((a) => {
          a.shield += (220 + sp) * m;
          a.dmgBuff = 0.15;
        });
        break;
      case 'anzuu': {
        const b = E.slice().sort((a, c) => c.mana - a.mana)[0];
        if (b) {
          b.sp = (b.sp || 0) - 25;
          u.sp = (u.sp || 0) + 25;
          u.atk *= 1.08;
        }
        break;
      }
      case 'sphin':
        E.slice()
          .sort((a, b2) => a.hp - b2.hp)
          .slice(0, 2)
          .forEach((o) => {
            o.stun = 2.5;
            this.hurt(u, o, (240 + sp) * m, 'true');
          });
        break;
      case 'kelpi': {
        const b = near(1)[0];
        if (b) {
          const dealt = this.hurt(u, b, (150 + sp) * m, 'magic');
          b.snare = 2.5;
          this.heal(u, dealt / 2);
        }
        break;
      }
      case 'barng':
        A.forEach((a) => {
          a.stun = 0;
          a.snare = 0;
          a.shield += (160 + sp) * m;
        });
        break;
      case 'coyot': {
        const o = E[Math.floor(Math.random() * E.length)];
        if (o) {
          this.hurt(u, o, (140 + sp) * m, 'magic');
          o.stun = 1.5;
        }
        A.forEach((a) => {
          a.crit += 0.15;
        });
        break;
      }
      case 'griff': {
        const ally = A.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || u;
        ally.shield += (250 + sp) * m;
        E.forEach((o) => {
          if (this.dist(ally, o) <= 1) this.hurt(u, o, (180 + sp) * m, 'phys');
        });
        break;
      }
      case 'golem':
        u.shield += (320 + sp) * m;
        E.forEach((o) => {
          if (this.dist(u, o) <= 1) this.hurt(u, o, (90 + sp) * m, 'magic');
        });
        break;
      case 'bansh': {
        const o = E.slice().sort((a, b) => a.hp - b.hp)[0];
        if (o) {
          o.stun = 2;
          const exec = o.hp < o.maxHp * 0.4;
          this.hurt(u, o, (200 + sp) * m, exec ? 'true' : 'magic');
        }
        break;
      }
      case 'hydra': {
        let hits = 0;
        near(3).forEach((o) => {
          this.hurt(u, o, (160 + sp) * m, 'magic');
          hits++;
        });
        this.heal(u, 40 * m * hits);
        break;
      }
      case 'nuwa':
        A.slice()
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
          .slice(0, 2)
          .forEach((a) => {
            this.heal(a, (200 + sp) * m);
            a.dr = Math.min(0.6, (a.dr || 0) + 0.15);
          });
        break;
      case 'camaz': {
        const far = E.slice().sort((a, b) => this.dist(u, b) - this.dist(u, a))[0];
        if (far) {
          const dealt = this.hurt(u, far, (240 + sp) * m, 'phys');
          this.heal(u, dealt);
        }
        break;
      }
      case 'simur':
        A.forEach((a) => {
          this.heal(a, (160 + sp) * m);
          if (!a.buffAs) {
            a.buffAs = 1.2;
            a.as *= 1.2;
            a.buffT = 4;
          }
        });
        near(2).forEach((o) => this.hurt(u, o, (200 + sp) * m, 'magic'));
        break;
      case 'levia':
        E.forEach((o) => {
          if (this.dist(u, o) <= 2) {
            this.hurt(u, o, (220 + sp) * m, 'magic');
            o.snare = 1.5;
          }
        });
        break;
      case 'wendi': {
        const steal = Math.round(t.hp * 0.1);
        this.hurt(u, t, (280 + sp) * m, 'phys');
        if (steal > 0) {
          u.maxHp += steal;
          this.heal(u, steal);
          u.atk *= 1.08;
        }
        break;
      }
      default:
        this.hurt(u, t, (200 + sp) * m, 'magic');
    }
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
      if (u.stun > 0) return;
      const t = this.target(u);
      if (!t) return;
      if (u.mana >= 100 && u.silence <= 0) {
        this.cast(u, t);
        return;
      }
      const d = this.dist(u, t);
      if (d <= u.range) {
        u.cd -= dt;
        if (u.cd <= 0) {
          u.cd = 1 / u.as;
          const crit = Math.random() < u.crit;
          const dmg = u.atk * (crit ? 1 + u.critDmg : 1);
          this.hurt(u, t, dmg, crit ? 'crit' : 'phys');
          u.mana = Math.min(100, u.mana + 12);
          if (u.scorch) {
            this.C.forEach((o) => {
              if (o.alive && o.side !== u.side && this.dist(o, t) <= 1 && o !== t)
                this.silentHurt(o, u.scorch! * dt * 2);
            });
          }
        }
      } else if (u.snare <= 0) {
        u.mv -= dt;
        if (u.mv <= 0) {
          u.mv = 0.45;
          this.stepToward(u, t);
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
    if (mine.length && !theirs.length) return true;
    if (!mine.length && theirs.length) return false;
    const f = (a: Combatant[]) => a.reduce((s, u) => s + u.hp / u.maxHp, 0);
    return f(mine) >= f(theirs);
  }

  isDone(): boolean {
    const mine = this.C.filter((u) => u.side === 'me' && u.alive);
    const theirs = this.C.filter((u) => u.side === 'foe' && u.alive);
    return !mine.length || !theirs.length || this.time > 45;
  }
}

export const gameActions = {
  buy(g: GameState, i: number) {
    if (g.phase !== 'plan') return;
    const hid = g.shop[i];
    if (!hid) return;
    const cost = HERO_MAP[hid].cost;
    if (g.gold < cost || g.bench.length >= 8) return;
    g.gold -= cost;
    g.shop = g.shop.map((s, j) => (j === i ? null : s));
    g.bench.push({ u: uid(), hid, star: 1, relics: [] });
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
    if (g.phase !== 'plan' || r < 4) return;
    const occ = g.board.find((u) => u.r === r && u.c === c);
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

  resolveRound(g: GameState, win: boolean, maxR: number): OverlayKind {
    g.phase = 'result';
    if (g.mode === 'practice') {
      return { kind: 'spar' as const, win };
    }
    const boss = getBossEncounter(g.round);
    let dmg = 0;
    if (boss) {
      if (win) {
        g.lossStreak = 0;
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
      g.lossStreak++;
      dmg = lossDamage(g.round, g.lossStreak);
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
      g.foeLossStreak++;
      g.lossStreak = 0;
      dmg = lossDamage(g.round, g.foeLossStreak);
      g.foeHp = Math.max(0, g.foeHp - dmg);
    } else {
      g.lossStreak++;
      g.foeLossStreak = 0;
      dmg = lossDamage(g.round, g.lossStreak);
      g.myHp = Math.max(0, g.myHp - dmg);
    }
    g.lastResult = { win, dmg, boss: false };
    const over = g.myHp <= 0 || g.foeHp <= 0 || g.round >= maxR;
    if (over) return { kind: 'over' as const, win: g.foeHp <= 0 || (g.myHp > 0 && g.foeHp < g.myHp) };
    const offer = win && (g.round % 2 === 1 || g.round >= 7);
    return { kind: 'result' as const, win, dmg, offer };
  },

  nextRound(g: GameState, draft: string[]) {
    const pvpWin = g.lastResult && !g.lastResult.boss ? g.lastResult.win : null;
    const botPvpWin = g.lastResult && !g.lastResult.boss ? !g.lastResult.win : null;
    g.round++;
    g.phase = 'plan';
    g.sel = null;
    if (g.mode === 'practice') {
      g.foe = [];
      rollShop(g, draft, true);
      return;
    }
    g.gold += roundIncome(g.round, pvpWin);
    g.foeGold += roundIncome(g.round, botPvpWin);
    rollShop(g, draft, true);
    runBotTurn(g);
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
    cardBg: best ? '#F2E9D4' : '#ece2ca',
    headBg: best ? (best >= def.tiers[def.tiers.length - 1][0] ? '#E8A317' : '#14120E') : '#d8cdb2',
    headFg: best ? (best >= def.tiers[def.tiers.length - 1][0] ? '#14120E' : '#F2E9D4') : '#6b6455',
    tiers: def.tiers.map(([need, text]) => ({
      n: need,
      text,
      fg: n >= need ? '#14120E' : '#a99f86',
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
    cardBg: best ? '#e7dcc2' : '#ece2ca',
    headBg: best ? (best >= def.tiers[def.tiers.length - 1][0] ? '#4C7BD1' : '#14120E') : '#d8cdb2',
    headFg: best ? (best >= def.tiers[def.tiers.length - 1][0] ? '#F2E9D4' : '#F2E9D4') : '#6b6455',
    tiers: def.tiers.map(([need, text]) => ({
      n: need,
      text,
      fg: n >= need ? '#14120E' : '#a99f86',
      mark: n >= need ? '●' : '○',
    })),
  };
}

export function pickRelics(count = 3): string[] {
  return RELICS.map((r) => r.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
