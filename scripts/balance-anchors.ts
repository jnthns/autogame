/**
 * Re-derives REF_ANCHORS from the reference team: the player's own board under
 * the `decent` policy with random drafts — not the bot's board.
 *
 *   npx tsx scripts/balance-anchors.ts --mode bot --difficulty normal --n 1000 --seed 1,7
 *   npx tsx scripts/balance-anchors.ts --mode bot --difficulty normal --n 1000 --seed 1,7 --legacy
 *
 * Several comma-separated seeds are pooled into one median, n matches each.
 *
 * At each anchor round it takes the median, over matches still alive at that
 * round, of the player's team HP, auto-attack DPS and HP per board unit, all
 * read from RoundRecord after traits and the mode HP multiplier. Round 16 is
 * extrapolated on the 8→12 slope.
 *
 * The final anchors are those medians × LEGACY_ANCHOR_OFFSET, with the DPS
 * anchor also × (this tree's realized damage per auto DPS ÷ LEGACY_DPS_REALIZATION).
 * Both corrections are applied here and nowhere else; round 16 takes the
 * round-12 corrections. The curve is self-referential — bosses are fitted to
 * it, and it is measured against them — so it is iterated in-process until no
 * anchor moves by more than --tol, using the same match seeds each pass.
 *
 * Realized damage per auto DPS is, per fight at that round, the player's total
 * damage dealt ÷ fight seconds ÷ auto DPS at fight start; the median is used.
 *
 * --legacy measures one pass against the tree's own REF_ANCHORS and prints
 * REF_ANCHORS / median as the offset, and the realized ratio, instead. It is
 * run on a checkout of main.
 *
 * Prints tables only; it does not edit any file.
 */
import { USER_DRAFT_MAX } from '../src/data/constants';
import { HEROES } from '../src/data/heroes';
import * as curve from '../src/data/bossCurve';
import { runMatch, type MatchRecord } from '../src/sim/runMatch';
import type { PolicyName } from '../src/sim/policies';
import type { Difficulty, GameMode } from '../src/game/types';
import { seeded } from '../src/game/rng';

type RefTeam = curve.RefTeam;
type Anchors = Record<number, RefTeam>;

const MEASURED_ROUNDS = [1, 4, 8, 12] as const;
const EXTRAPOLATED_ROUND = 16;
const STATS = ['hp', 'dps', 'avgHp'] as const;

/** Must match balance-sim so both scripts see the same matches per seed. */
const SEED_STRIDE = 100_003;

const { REF_ANCHORS } = curve;
/** Read through the namespace so --legacy still runs on main, which has no offset. */
const legacyCurve = curve as { LEGACY_ANCHOR_OFFSET?: Anchors; LEGACY_DPS_REALIZATION?: Record<number, number> };
const offsets = legacyCurve.LEGACY_ANCHOR_OFFSET;
const legacyRealization = legacyCurve.LEGACY_DPS_REALIZATION;

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

function measure(records: MatchRecord[]): { anchors: Anchors; samples: Record<number, number> } {
  const anchors: Anchors = {};
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

function realization(records: MatchRecord[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const round of MEASURED_ROUNDS) {
    const rows = records.flatMap((m) =>
      m.rounds.filter((r) => r.round === round && r.fightSeconds > 0 && r.teamDps > 0),
    );
    const dealt = (r: (typeof rows)[number]) =>
      Object.values(r.dmgByHero).reduce((a, x) => a + x.auto + x.ability, 0);
    out[round] = Math.round(median(rows.map((r) => dealt(r) / r.fightSeconds / r.teamDps)) * 1000) / 1000;
  }
  return out;
}

function withCorrections(measured: Anchors, offset: Anchors, dpsFactor: Record<number, number>): Anchors {
  const out: Anchors = {};
  for (const round of [...MEASURED_ROUNDS, EXTRAPOLATED_ROUND]) {
    const from = round === EXTRAPOLATED_ROUND ? 12 : round;
    const o = offset[from];
    out[round] = {
      hp: Math.round(measured[round].hp * o.hp),
      dps: Math.round(measured[round].dps * o.dps * dpsFactor[from]),
      avgHp: Math.round(measured[round].avgHp * o.avgHp),
    };
  }
  return out;
}

function maxRelativeChange(next: Anchors): number {
  let worst = 0;
  for (const [round, team] of Object.entries(next)) {
    const prev = REF_ANCHORS[Number(round)];
    for (const key of STATS) {
      worst = Math.max(worst, Math.abs(team[key] - prev[key]) / prev[key]);
    }
  }
  return worst;
}

function formatRounds(name: string, table: Record<number, number>): string {
  const rows = Object.keys(table)
    .map(Number)
    .sort((x, y) => x - y)
    .map((r) => `  ${r}: ${table[r]},`);
  return [`export const ${name}: Record<number, number> = {`, ...rows, '};'].join('\n');
}

function format(name: string, table: Anchors): string {
  const rows = Object.keys(table)
    .map(Number)
    .sort((x, y) => x - y)
    .map((r) => `  ${r}: { hp: ${table[r].hp}, dps: ${table[r].dps}, avgHp: ${table[r].avgHp} },`);
  return [`export const ${name}: Record<number, RefTeam> = {`, ...rows, '};'].join('\n');
}

function main(): void {
  const argv = process.argv.slice(2);
  const mode = (argValue(argv, 'mode') ?? 'bot') as Exclude<GameMode, 'practice'>;
  const difficulty = (argValue(argv, 'difficulty') ?? 'normal') as Difficulty;
  const policy = (argValue(argv, 'policy') ?? 'decent') as PolicyName;
  const n = Number(argValue(argv, 'n') ?? 1000);
  const seeds = (argValue(argv, 'seed') ?? '1').split(',').map(Number);
  const legacy = argv.includes('--legacy');
  const iters = legacy ? 1 : Number(argValue(argv, 'iters') ?? 6);
  const tol = Number(argValue(argv, 'tol') ?? 0.01);

  const matches = seeds.flatMap((seed) => {
    const draftRng = seeded(seed * 7919 + 13);
    return Array.from({ length: n }, (_, i) => ({ draft: randomDraft(draftRng), seed: seed * SEED_STRIDE + i }));
  });
  const unit: Anchors = Object.fromEntries(MEASURED_ROUNDS.map((r) => [r, { hp: 1, dps: 1, avgHp: 1 }]));
  const offset = legacy ? unit : (offsets ?? unit);

  console.log(
    `mode=${mode} diff=${difficulty} policy=${policy} n=${n} seeds=${seeds.join(',')} drafts=random board=player${legacy ? ' legacy' : ''}`,
  );
  console.log(format('START_ANCHORS', REF_ANCHORS));

  let measured: Anchors = {};
  let realized: Record<number, number> = {};
  let dpsFactor: Record<number, number> = Object.fromEntries(MEASURED_ROUNDS.map((r) => [r, 1]));
  for (let pass = 1; pass <= iters; pass++) {
    const records = matches.map(({ draft, seed }) => runMatch({ mode, difficulty, draft, policy, seed }));
    const result = measure(records);
    measured = result.anchors;
    realized = realization(records);
    const alive = MEASURED_ROUNDS.map((r) => `r${r} ${result.samples[r]}/${matches.length}`).join('  ');
    if (legacy) {
      console.log(`pass ${pass}  sampled ${alive}`);
      break;
    }
    if (legacyRealization) {
      dpsFactor = Object.fromEntries(
        MEASURED_ROUNDS.map((r) => [r, Math.round((realized[r] / legacyRealization[r]) * 1000) / 1000]),
      );
    }
    const next = withCorrections(measured, offset, dpsFactor);
    const change = maxRelativeChange(next);
    console.log(`pass ${pass}  max change ${(change * 100).toFixed(1)}%  sampled ${alive}`);
    for (const [round, team] of Object.entries(next)) Object.assign(REF_ANCHORS[Number(round)], team);
    if (change < tol) break;
  }

  console.log(format('MEASURED_ANCHORS', measured));
  if (legacy) {
    const legacyOffset: Anchors = {};
    for (const round of MEASURED_ROUNDS) {
      const ratio = (key: (typeof STATS)[number]) =>
        Math.round((REF_ANCHORS[round][key] / measured[round][key]) * 1000) / 1000;
      legacyOffset[round] = { hp: ratio('hp'), dps: ratio('dps'), avgHp: ratio('avgHp') };
    }
    console.log(format('LEGACY_ANCHOR_OFFSET', legacyOffset));
    console.log(formatRounds('LEGACY_DPS_REALIZATION', realized));
    return;
  }
  console.log(format('LEGACY_ANCHOR_OFFSET', offset));
  console.log(formatRounds('MEASURED_DPS_REALIZATION', realized));
  console.log(formatRounds('DPS_ANCHOR_FACTOR', dpsFactor));
  console.log(format('REF_ANCHORS', REF_ANCHORS));
}

main();
