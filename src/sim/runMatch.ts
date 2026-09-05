import { BOSS_COMBAT_LIMIT, COMBAT_LIMIT, DEFAULT_DRAFT, GAUNTLET } from '../data/constants';
import { incomeBreakdown, RELIC_PICKS_LOSS, RELIC_PICKS_WIN } from '../data/economy';
import { HERO_MAP } from '../data/heroes';
import {
  applyTraits,
  cap,
  CombatEngine,
  combatant,
  combatOpponents,
  createGame,
  fitBossToTeam,
  gameActions,
  isGauntletMode,
  isRankedMode,
  pickRelics,
  resetUidCounter,
  rollShop,
  scaleFoeCombatants,
  usesDifficulty,
} from '../game/engine';
import { pickGauntletRelics } from '../game/gauntlet';
import { isBossRound } from '../game/hyperRoll';
import { seeded, setRng } from '../game/rng';
import type { Combatant, Difficulty, GameMode, GameState, Unit } from '../game/types';
import { getPolicy, type PolicyName } from './policies';

/** Hard stop so an endless gauntlet run terminates. */
export const GAUNTLET_ROUND_LIMIT = 60;

export interface MatchOptions {
  mode: Exclude<GameMode, 'practice'>;
  difficulty: Difficulty;
  draft?: string[];
  policy?: PolicyName;
  seed: number;
  /** Sim tick size multiplier; 1 = 0.1 s ticks. */
  speed?: number;
}

export interface RoundRecord {
  round: number;
  boss: boolean;
  win: boolean;
  dmg: number;
  fightSeconds: number;
  timedOut: boolean;
  goldBefore: number;
  goldAfter: number;
  income: number;
  incomeBase: number;
  incomeWin: number;
  incomeInterest: number;
  incomeStreak: number;
  boardStars: number[];
  boardCost: number[];
  foeBoardStars: number[];
  survivorsMe: number;
  survivorsFoe: number;
  teamHp: number;
  teamDps: number;
  dmgByHero: Record<string, { auto: number; ability: number }>;
  relicTaken?: string;
}

export interface MatchRecord {
  win: boolean;
  rounds: RoundRecord[];
  finalHp: number;
  foeFinalHp: number;
  /** First round a 3★ existed on the player board or bench. */
  threeStarRound: number | null;
  roundsCleared: number;
  seed: number;
}

function teamDpsOf(list: Combatant[]): number {
  return list.reduce((s, u) => s + u.atk * u.as * (1 + (u.crit || 0) * (u.critDmg || 0)), 0);
}

function aliveCount(list: Combatant[], side: 'me' | 'foe'): number {
  return list.filter((u) => u.alive && u.side === side).length;
}

export function runMatch(opts: MatchOptions): MatchRecord {
  setRng(seeded(opts.seed));
  resetUidCounter();

  const draft = opts.draft?.length ? opts.draft : [...DEFAULT_DRAFT];
  const policy = getPolicy(opts.policy ?? 'decent');
  const g: GameState = createGame(opts.mode);
  rollShop(g, draft, true);

  const rounds: RoundRecord[] = [];
  let threeStarRound: number | null = null;
  let roundsCleared = 0;
  const maxRound = opts.mode === 'gauntlet' ? GAUNTLET_ROUND_LIMIT : g.matchRounds;

  for (let guard = 0; guard < maxRound + 4; guard++) {
    const round = g.round;
    const goldBefore = g.gold;

    policy.plan(g, { draft, cap: cap(round, g.matchRounds, g.mode), round });

    if (threeStarRound == null && [...g.board, ...g.bench].some((u) => u.star === 3)) {
      threeStarRound = round;
    }
    if (!g.board.length) {
      // Nothing placeable — the policy is broke; count it as a loss and move on.
      g.board = g.bench.splice(0, 1).map((u) => ({ ...u, r: 7, c: 2 }) as Unit);
    }

    const { record, win } = fightRound(g, opts, round);
    record.goldBefore = goldBefore;

    const before = { myHp: g.myHp, foeHp: g.foeHp };
    const result = gameActions.resolveRound(g, win, g.matchRounds, {
      me: record.survivorsMe,
      foe: record.survivorsFoe,
    });
    record.dmg = Math.max(before.myHp - g.myHp, before.foeHp - g.foeHp);
    if (win) roundsCleared = round;

    if (result.kind === 'result' && result.offer) {
      const count = win ? RELIC_PICKS_WIN : RELIC_PICKS_LOSS;
      const picks = isGauntletMode(g.mode) ? pickGauntletRelics(g.round, count) : pickRelics(count);
      if (picks.length && g.board.length) {
        const rid = policy.chooseRelic(picks, g.board);
        const holder = policy.chooseRelicHolder(rid, g.board);
        if (holder) gameActions.bindRelic(g, rid, holder);
        record.relicTaken = rid;
      }
    }

    rounds.push(record);

    if (result.kind === 'over') {
      return {
        win: result.win,
        rounds,
        finalHp: g.myHp,
        foeFinalHp: g.foeHp,
        threeStarRound,
        roundsCleared,
        seed: opts.seed,
      };
    }

    const goldBeforeIncome = g.gold;
    const breakdown = incomeBreakdown(
      g.round + 1,
      goldBeforeIncome,
      g.streak,
      g.lastResult && !g.lastResult.boss ? g.lastResult.win : null,
    );
    gameActions.nextRound(g, draft);
    record.goldAfter = g.gold;
    record.income = g.gold - goldBeforeIncome;
    record.incomeBase = breakdown.base;
    record.incomeWin = breakdown.win;
    record.incomeInterest = breakdown.interest;
    record.incomeStreak = breakdown.streak;
    if (g.round > maxRound) break;
  }

  return {
    win: g.myHp > 0 && g.foeHp <= 0,
    rounds,
    finalHp: g.myHp,
    foeFinalHp: g.foeHp,
    threeStarRound,
    roundsCleared,
    seed: opts.seed,
  };
}

function fightRound(
  g: GameState,
  opts: MatchOptions,
  round: number,
): { record: RoundRecord; win: boolean } {
  const difficulty = usesDifficulty(g.mode) ? opts.difficulty : 'normal';
  const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
  const theirs = combatOpponents(g).map((u) => combatant(u, 'foe', g.heroHpMul));
  applyTraits(mine);
  applyTraits(theirs);
  if (theirs.some((u) => u.boss)) {
    fitBossToTeam(theirs, mine, round, { difficulty, gauntlet: isGauntletMode(g.mode) });
  }
  if (usesDifficulty(g.mode)) scaleFoeCombatants(theirs, difficulty);

  const teamHp = mine.reduce((s, u) => s + u.maxHp, 0);
  const teamDps = teamDpsOf(mine);

  const dmgByHero: Record<string, { auto: number; ability: number }> = {};
  const eng = new CombatEngine(
    () => undefined,
    () => undefined,
    undefined,
    (src, _target, amount, _kind, fromCast) => {
      if (!src || src.side !== 'me') return;
      const row = (dmgByHero[src.hid] ||= { auto: 0, ability: 0 });
      if (fromCast) row.ability += amount;
      else row.auto += amount;
    },
  );
  eng.C = mine.concat(theirs);

  const step = 0.1 * (opts.speed ?? 1);
  const limit = theirs.some((u) => u.boss) ? BOSS_COMBAT_LIMIT : COMBAT_LIMIT;
  let guard = 0;
  while (!eng.isDone() && guard++ < 5000) {
    eng.time += step;
    eng.simTick(step);
  }
  const win = eng.getWinner();

  const record: RoundRecord = {
    round,
    boss: theirs.some((u) => u.boss),
    win,
    dmg: 0,
    fightSeconds: Math.round(eng.time * 10) / 10,
    timedOut: eng.time > limit,
    goldBefore: 0,
    goldAfter: 0,
    income: 0,
    incomeBase: 0,
    incomeWin: 0,
    incomeInterest: 0,
    incomeStreak: 0,
    boardStars: g.board.map((u) => u.star),
    boardCost: g.board.map((u) => HERO_MAP[u.hid]?.cost ?? 0),
    foeBoardStars: theirs.map((u) => u.star),
    survivorsMe: aliveCount(eng.C, 'me'),
    survivorsFoe: aliveCount(eng.C, 'foe'),
    teamHp: Math.round(teamHp),
    teamDps: Math.round(teamDps),
    dmgByHero,
  };
  return { record, win };
}

export function isBossRoundFor(g: GameState, round: number): boolean {
  return isRankedMode(g.mode) ? isBossRound(round, g.matchRounds) : g.mode === 'gauntlet';
}

export const GAUNTLET_START_LIVES = GAUNTLET.startLives;
