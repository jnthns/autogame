/**
 * Stat-budget and ability-budget audit.
 *
 *   npx tsx scripts/balance-audit.ts [--strict]
 *
 * P   = hp × dmg × as × (1 + crit × 0.8) at 1★ before HERO_HP_MUL, in thousands.
 * A30 = expected ability value over 30 s at 1★ with 0 spell power
 *       (value rules: docs/overhaul/04-balance-track.md §B2.3).
 *
 * Report-only by default; `--strict` exits 1 on any hero outside tolerance.
 */
import { HEROES } from '../src/data/heroes';
import { A30_TOLERANCE, budgetRow, BUDGET_A30, BUDGET_P, P_TOLERANCE } from '../src/sim/budget';

const strict = process.argv.includes('--strict');

const pad = (s: string, w: number) => (s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const num = (x: number, w: number, d = 1) => x.toFixed(d).padStart(w);

const header = [
  pad('hero', 8),
  pad('cost', 5),
  pad('class', 9),
  '      P',
  '   Ptgt',
  '    PΔ%',
  '     A30',
  '  A30tgt',
  '  A30Δ%',
  '  flag',
].join('');

console.log(header);
console.log('-'.repeat(header.length));

let violations = 0;
for (const h of HEROES) {
  const row = budgetRow(h);
  if (!row.ok) violations++;
  console.log(
    [
      pad(h.id, 8),
      pad(String(h.cost), 5),
      pad(h.heroClass, 9),
      num(row.p, 7, 2),
      num(row.pTarget, 7, 2),
      num(row.pDelta * 100, 7),
      num(row.a30, 8),
      num(row.a30Target, 8, 0),
      num(row.a30Delta * 100, 7),
      row.ok ? '   ·' : '   ✕',
    ].join(''),
  );
}

console.log('-'.repeat(header.length));
console.log(
  `targets P ${JSON.stringify(BUDGET_P)} ±${P_TOLERANCE * 100}%  ·  A30 ${JSON.stringify(BUDGET_A30)} ±${A30_TOLERANCE * 100}%`,
);
console.log(`${violations} hero(es) outside tolerance`);

if (strict && violations > 0) process.exit(1);
