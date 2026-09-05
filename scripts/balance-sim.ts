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

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
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
      seed: args.seed + i,
    });
    records.push(m);
    drafted.push({ draft, win: m.win });
  }

  const allRounds = records.flatMap((m) => m.rounds);
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
  const goldFlow = records.map((m) => m.rounds.reduce((s, r) => s + Math.max(0, r.income), 0));
  const interestFlow = records.map((m) => m.rounds.reduce((s, r) => s + r.incomeInterest, 0));
  const streakFlow = records.map((m) => m.rounds.reduce((s, r) => s + r.incomeStreak, 0));

  const head = `mode=${args.mode} diff=${args.difficulty} policy=${args.policy} n=${args.n} seed=${args.seed}`;
  const lines = [
    head,
    `win%           ${f(pct(wins, records.length))}`,
    `medFightSec    ${f(median(allRounds.map((r) => r.fightSeconds)))}`,
    `timeout%       ${f(pct(allRounds.filter((r) => r.timedOut).length, allRounds.length))}`,
    `boss4 win%     ${f(bossWinPct(records, 4))}   boss8 win% ${f(bossWinPct(records, 8))}   boss12 win% ${f(bossWinPct(records, 12))}`,
    `abilityShare%  ${f(pct(abilityDmg, abilityDmg + autoDmg))}`,
    `3★<r4 %        ${f(pct(earlyThree, records.length))}`,
    `goldFlow avg   ${f(mean(goldFlow))}   interest avg ${f(mean(interestFlow))}   streakGold avg ${f(mean(streakFlow))}`,
    `medRounds      ${f(median(records.map((m) => m.rounds.length)))}`,
    `medRoundsClear ${f(median(records.map((m) => m.roundsCleared)))}`,
  ];

  if (args.randomDrafts) {
    const deltas = heroDeltas(drafted);
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
