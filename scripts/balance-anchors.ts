/**
 * Re-derives REF_ANCHORS from the reference team: the player's own board under
 * the `decent` policy with random drafts — not the bot's board.
 *
 *   npx tsx scripts/balance-anchors.ts --mode bot --difficulty normal --n 1000 --seed 1,7
 *
 * Several comma-separated seeds are pooled into one median, n matches each.
 *
 * At each anchor round it takes the median, over matches still alive at that
 * round, of the player's team HP, auto-attack DPS and HP per board unit, all
 * read from RoundRecord after traits and the mode HP multiplier. Round 16 is
 * extrapolated on the 8→12 slope.
 *
 * The curve is self-referential — bosses are fitted to it, and it is measured
 * against them — so it is iterated in-process until no anchor moves by more than
 * --tol, using the same match seeds each pass. Prints the REF_ANCHORS it would
 * write; it does not edit any file.
 */
import { USER_DRAFT_MAX } from '../src/data/constants';
import { HEROES } from '../src/data/heroes';
import { REF_ANCHORS, type RefTeam } from '../src/data/bossCurve';
import { runMatch, type MatchRecord } from '../src/sim/runMatch';
import type { PolicyName } from '../src/sim/policies';
import type { Difficulty, GameMode } from '../src/game/types';
import { seeded } from '../src/game/rng';

const MEASURED_ROUNDS = [1, 4, 8, 12] as const;
const EXTRAPOLATED_ROUND = 16;

/** Must match balance-sim so both scripts see the same matches per seed. */
const SEED_STRIDE = 100_003;

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(`--${flag}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function randomDraft(rng: () => number): string[] {
  const ids = HEROES.map((h) => h.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, USER_DRAFT_MAX);
}

function measure(records: MatchRecord[]): { anchors: Record<number, RefTeam>; samples: Record<number, number> } {
  const anchors: Record<number, RefTeam> = {};
  const samples: Record<number, number> = {};
  for (const round of MEASURED_ROUNDS) {
    const rows = records.flatMap((m) => m.rounds.filter((r) => r.round === round && r.boardStars.length));
    samples[round] = rows.length;
    anchors[round] = {
      hp: Math.round(median(rows.map((r) => r.teamHp))),
      dps: Math.round(median(rows.map((r) => r.teamDps))),
      avgHp: Math.round(median(rows.map((r) => r.teamHp / r.boardStars.length))),
    };
  }
  const a = anchors[8];
  const b = anchors[12];
  anchors[EXTRAPOLATED_ROUND] = {
    hp: b.hp + (b.hp - a.hp),
    dps: b.dps + (b.dps - a.dps),
    avgHp: b.avgHp + (b.avgHp - a.avgHp),
  };
  return { anchors, samples };
}

function maxRelativeChange(next: Record<number, RefTeam>): number {
  let worst = 0;
  for (const [round, team] of Object.entries(next)) {
    const prev = REF_ANCHORS[Number(round)];
    for (const key of ['hp', 'dps', 'avgHp'] as const) {
      worst = Math.max(worst, Math.abs(team[key] - prev[key]) / prev[key]);
    }
  }
  return worst;
}

function format(anchors: Record<number, RefTeam>): string {
  const rows = Object.keys(anchors)
    .map(Number)
    .sort((x, y) => x - y)
    .map((r) => `  ${r}: { hp: ${anchors[r].hp}, dps: ${anchors[r].dps}, avgHp: ${anchors[r].avgHp} },`);
  return ['export const REF_ANCHORS: Record<number, RefTeam> = {', ...rows, '};'].join('\n');
}

function main(): void {
  const argv = process.argv.slice(2);
  const mode = (argValue(argv, 'mode') ?? 'bot') as Exclude<GameMode, 'practice'>;
  const difficulty = (argValue(argv, 'difficulty') ?? 'normal') as Difficulty;
  const policy = (argValue(argv, 'policy') ?? 'decent') as PolicyName;
  const n = Number(argValue(argv, 'n') ?? 1000);
  const seeds = (argValue(argv, 'seed') ?? '1').split(',').map(Number);
  const iters = Number(argValue(argv, 'iters') ?? 6);
  const tol = Number(argValue(argv, 'tol') ?? 0.01);

  const matches = seeds.flatMap((seed) => {
    const draftRng = seeded(seed * 7919 + 13);
    return Array.from({ length: n }, (_, i) => ({ draft: randomDraft(draftRng), seed: seed * SEED_STRIDE + i }));
  });

  console.log(
    `mode=${mode} diff=${difficulty} policy=${policy} n=${n} seeds=${seeds.join(',')} drafts=random board=player`,
  );
  console.log(`start\n${format(REF_ANCHORS)}`);

  for (let pass = 1; pass <= iters; pass++) {
    const records = matches.map(({ draft, seed }) => runMatch({ mode, difficulty, draft, policy, seed }));
    const { anchors, samples } = measure(records);
    const change = maxRelativeChange(anchors);
    const alive = MEASURED_ROUNDS.map((r) => `r${r} ${samples[r]}/${matches.length}`).join('  ');
    console.log(`pass ${pass}  max change ${(change * 100).toFixed(1)}%  sampled ${alive}`);
    for (const [round, team] of Object.entries(anchors)) Object.assign(REF_ANCHORS[Number(round)], team);
    if (change < tol) break;
  }

  console.log(format(REF_ANCHORS));
}

main();
