/**
 * Headless balance simulator.
 *
 *   npx tsx scripts/balance-sim.ts --mode bot --difficulty normal --n 500 --seed 1
 *
 * Prints a fixed-column summary (so commit messages stay comparable) and,
 * with --label, writes the full per-match records to
 * docs/overhaul/baselines/<label>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DRAFT, USER_DRAFT_MAX } from '../src/data/constants';
import { HEROES } from '../src/data/heroes';
import { runMatch, type MatchRecord } from '../src/sim/runMatch';
import type { PolicyName } from '../src/sim/policies';
import type { Difficulty, GameMode } from '../src/game/types';
import { seeded } from '../src/game/rng';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = resolve(HERE, '../docs/overhaul/baselines');

interface Args {
  mode: Exclude<GameMode, 'practice'>;
  difficulty: Difficulty;
  n: number;
  seed: number;
  policy: PolicyName;
  draft: string[];
  label?: string;
  randomDrafts: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(`--${flag}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    mode: (get('mode') as Args['mode']) ?? 'bot',
    difficulty: (get('difficulty') as Difficulty) ?? 'normal',
    n: Number(get('n') ?? 300),
    seed: Number(get('seed') ?? 1),
    policy: (get('policy') as PolicyName) ?? 'decent',
    draft: (get('draft') ?? DEFAULT_DRAFT.join(',')).split(',').filter(Boolean),
    label: get('label'),
    randomDrafts: get('drafts') === 'random',
  };
}

/** Matches per seed before two --seed values could collide. */
const SEED_STRIDE = 100_003;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * p)];
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function pct(part: number, whole: number): number {
  return whole ? (part / whole) * 100 : 0;
}

function f(x: number, w = 6, d = 1): string {
  return x.toFixed(d).padStart(w);
}

function randomDraft(rng: () => number): string[] {
  const ids = HEROES.map((h) => h.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, USER_DRAFT_MAX);
}

function bossWinPct(records: MatchRecord[], round: number): number {
  const rows = records.flatMap((m) => m.rounds.filter((r) => r.round === round && r.boss));
  return pct(rows.filter((r) => r.win).length, rows.length);
}

function heroDeltas(records: { draft: string[]; win: boolean }[]): [string, number][] {
  const out: [string, number][] = [];
  for (const h of HEROES) {
    const withHero = records.filter((r) => r.draft.includes(h.id));
    const without = records.filter((r) => !r.draft.includes(h.id));
    if (withHero.length < 20 || without.length < 20) continue;
    const d =
      pct(withHero.filter((r) => r.win).length, withHero.length) -
      pct(without.filter((r) => r.win).length, without.length);
    out.push([h.id, d]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const draftRng = seeded(args.seed * 7919 + 13);
  const records: MatchRecord[] = [];
  const drafted: { draft: string[]; win: boolean }[] = [];

  for (let i = 0; i < args.n; i++) {
    const draft = args.randomDrafts ? randomDraft(draftRng) : args.draft;
    const m = runMatch({
      mode: args.mode,
      difficulty: args.difficulty,
      draft,
      policy: args.policy,
      // Stride so two --seed values give disjoint match sets rather than
      // 99% overlapping ones (`seed 1` vs `seed 7` differing by six matches).
      seed: args.seed * SEED_STRIDE + i,
    });
    records.push(m);
    drafted.push({ draft, win: m.win });
  }

  const allRounds = records.flatMap((m) => m.rounds);
  const timeoutCounts = records.reduce(
    (sum, m) => ({
      boss: sum.boss + m.timeoutCounts.boss,
      bossTotal: sum.bossTotal + m.timeoutCounts.bossTotal,
      nonBoss: sum.nonBoss + m.timeoutCounts.nonBoss,
      nonBossTotal: sum.nonBossTotal + m.timeoutCounts.nonBossTotal,
    }),
    { boss: 0, bossTotal: 0, nonBoss: 0, nonBossTotal: 0 },
  );
  const wins = records.filter((m) => m.win).length;
  const abilityDmg = allRounds.reduce(
    (s, r) => s + Object.values(r.dmgByHero).reduce((a, x) => a + x.ability, 0),
    0,
  );
  const autoDmg = allRounds.reduce(
    (s, r) => s + Object.values(r.dmgByHero).reduce((a, x) => a + x.auto, 0),
    0,
  );
  const earlyThree = records.filter((m) => m.threeStarRound != null && m.threeStarRound < 4).length;
  const threeStarTierPct = (cost: number) =>
    pct(records.filter((m) => m.threeStars.some((s) => s.cost === cost)).length, records.length);
  const fiveStarRounds = records
    .map((m) => Math.min(...m.threeStars.filter((s) => s.cost === 5).map((s) => s.round)))
    .filter(Number.isFinite);
  const fiveStarEarly = records.filter((m) => m.threeStars.some((s) => s.cost === 5 && s.round < 8)).length;
  const threeStarBucket = (cost: number | null) => {
    const matches = records.filter((m) => {
      const highest = Math.max(...m.threeStars.map((s) => s.cost));
      return cost == null ? !m.threeStars.length : highest === cost;
    });
    return { count: matches.length, winPct: matches.length ? pct(matches.filter((m) => m.win).length, matches.length) : null };
  };
  const threeStarBuckets = [2, 3, 4, 5].map(threeStarBucket);
  const noThreeStarBucket = threeStarBucket(null);
  const bucketWinPct = ({ count, winPct }: { count: number; winPct: number | null }) =>
    `${winPct == null ? 'n/a'.padStart(6) : f(winPct)} (n=${count})`;
  const fightWinPctByTier = (cost: number) => {
    const treated = records.flatMap((m) =>
      m.rounds.filter((round) => m.threeStars.some((star) => star.cost === cost && star.round < round.round)),
    );
    const activeRounds = new Set(treated.map((round) => round.round));
    const control = records.flatMap((m) =>
      m.rounds.filter(
        (round) =>
          activeRounds.has(round.round) &&
          !m.threeStars.some((star) => star.cost === cost && star.round < round.round),
      ),
    );
    const treatedPct = pct(treated.filter((round) => round.win).length, treated.length);
    const controlPct = pct(control.filter((round) => round.win).length, control.length);
    return `${f(treatedPct)} (n=${treated.length}) vs ${f(controlPct)} (n=${control.length}) Δ${f(
      treatedPct - controlPct,
    )}`;
  };
  const goldFlow = records.map((m) => m.rounds.reduce((s, r) => s + Math.max(0, r.income), 0));
  const interestFlow = records.map((m) => m.rounds.reduce((s, r) => s + r.incomeInterest, 0));
  const streakFlow = records.map((m) => m.rounds.reduce((s, r) => s + r.incomeStreak, 0));
  const deltas = args.randomDrafts ? heroDeltas(drafted) : [];
  const fallbackMatches = records.filter((m) => m.shopFallbacks > 0);
  const fallbackSlots = records.reduce((sum, m) => sum + m.shopSlots, 0);
  const fallbackCount = records.reduce((sum, m) => sum + m.shopFallbacks, 0);
  const fiveEarlyByFallback = (hitFallback: boolean) => {
    const group = records.filter((m) => (m.shopFallbacks > 0) === hitFallback);
    return `${group.filter((m) => m.threeStars.some((s) => s.cost === 5 && s.round < 8)).length}/${group.length}`;
  };

  const head = `mode=${args.mode} diff=${args.difficulty} policy=${args.policy} n=${args.n} seed=${args.seed}`;
  const lines = [
    head,
    `win%           ${f(pct(wins, records.length))}`,
    `medFightSec    ${f(median(allRounds.map((r) => r.fightSeconds)))}`,
    `timeout%       ${f(pct(allRounds.filter((r) => r.timedOut).length, allRounds.length))}`,
    `timeout split  boss ${f(pct(timeoutCounts.boss, timeoutCounts.bossTotal))} (n=${timeoutCounts.boss}/${timeoutCounts.bossTotal})  non-boss ${f(pct(timeoutCounts.nonBoss, timeoutCounts.nonBossTotal))} (n=${timeoutCounts.nonBoss}/${timeoutCounts.nonBossTotal})`,
    `boss4 win%     ${f(bossWinPct(records, 4))}   boss8 win% ${f(bossWinPct(records, 8))}   boss12 win% ${f(bossWinPct(records, 12))}`,
    `abilityShare%  ${f(pct(abilityDmg, abilityDmg + autoDmg))}`,
    `3★<r4 %        ${f(pct(earlyThree, records.length))}`,
    `3★ by tier %  c2 ${f(threeStarTierPct(2))}  c3 ${f(threeStarTierPct(3))}  c4 ${f(threeStarTierPct(4))}  c5 ${f(threeStarTierPct(5))}`,
    `5c3★ %  ${f(pct(fiveStarRounds.length, records.length))}   earliest r  ${fiveStarRounds.length ? Math.min(...fiveStarRounds) : 0}/${percentile(fiveStarRounds, 0.1)}/${median(fiveStarRounds)}`,
    `5c3★ <r8 count  ${fiveStarEarly}`,
    `3★ win% by tier  c2 ${bucketWinPct(threeStarBuckets[0])}  c3 ${bucketWinPct(threeStarBuckets[1])}  c4 ${bucketWinPct(threeStarBuckets[2])}  c5 ${bucketWinPct(threeStarBuckets[3])}  none ${bucketWinPct(noThreeStarBucket)}`,
    `3★ fight win% by tier  c2 ${fightWinPctByTier(2)}  c3 ${fightWinPctByTier(3)}  c4 ${fightWinPctByTier(4)}  c5 ${fightWinPctByTier(5)}`,
    `shop fallback%  drafts ${f(pct(fallbackMatches.length, records.length))} (${fallbackMatches.length}/${records.length})  slots ${f(pct(fallbackCount, fallbackSlots))} (${fallbackCount}/${fallbackSlots})`,
    `5c3★ <r8 by fallback  hit ${fiveEarlyByFallback(true)}  no-hit ${fiveEarlyByFallback(false)}`,
    `heroDeltaAll   ${deltas.map(([id, d]) => `${id} ${d >= 0 ? '+' : ''}${d.toFixed(1)}`).join('  ')}`,
    `goldFlow avg   ${f(mean(goldFlow))}   interest avg ${f(mean(interestFlow))}   streakGold avg ${f(mean(streakFlow))}`,
    `medRounds      ${f(median(records.map((m) => m.rounds.length)))}`,
    `medRoundsClear ${f(median(records.map((m) => m.roundsCleared)))}`,
  ];

  if (args.randomDrafts) {
    const top = deltas.slice(0, 3).map(([id, d]) => `${id} ${d >= 0 ? '+' : ''}${d.toFixed(1)} ▲`);
    const bot = deltas
      .slice(-3)
      .map(([id, d]) => `${id} ${d >= 0 ? '+' : ''}${d.toFixed(1)} ▼`);
    lines.push(`heroDelta      ${[...top, ...bot].join('  ')}`);
    lines.push(
      `heroDeltaSpread${f(deltas.length ? deltas[0][1] - deltas[deltas.length - 1][1] : 0)}`,
    );
  }

  const summary = lines.join('\n');
  console.log(summary);

  // Baselines keep every round but collapse the per-hero damage map to two totals,
  // which is what later phases diff — the full map would be tens of megabytes.
  const trimmed = records.map((m) => ({
    ...m,
    rounds: m.rounds.map(({ dmgByHero, ...r }) => ({
      ...r,
      autoDmg: Math.round(Object.values(dmgByHero).reduce((a, x) => a + x.auto, 0)),
      abilityDmg: Math.round(Object.values(dmgByHero).reduce((a, x) => a + x.ability, 0)),
    })),
  }));

  if (args.label) {
    mkdirSync(BASELINE_DIR, { recursive: true });
    const file = resolve(BASELINE_DIR, `${args.label}.json`);
    writeFileSync(
      file,
      `${JSON.stringify({ args: { ...args }, summary: lines, records: trimmed })}\n`,
      'utf8',
    );
    console.log(`\nwrote ${file}`);
  }
}

main();
