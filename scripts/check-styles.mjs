#!/usr/bin/env node
/**
 * Style lint: components must not carry raw colors or hard-coded motion.
 *
 *   node scripts/check-styles.mjs           # strict (default from D2 on)
 *   node scripts/check-styles.mjs --report  # print counts, always exit 0
 *
 * Colors belong in src/styles/tokens.css and reach components as `var(--om-*)`;
 * durations belong to the `--dur-*` scale so reduced motion can zero them.
 * src/data/** and src/game/** are not scanned — palette handles live there.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = process.argv.includes('--report');

/** Colors are data in these files (sprite art, FX profiles, wallpapers). */
const ALLOW = new Set([
  'src/components/CombatFxLayer.tsx',
  'src/components/PixelSprite.tsx',
  'src/components/BattlegroundPreview.tsx',
  'src/components/BattlegroundBoardBackground.tsx',
]);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const INLINE_DURATION = /(animation|transition)\s*:\s*['"`][^'"`]*\d+(\.\d+)?m?s/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const files = [...walk(resolve(ROOT, 'src/components')), resolve(ROOT, 'src/App.tsx')];

let total = 0;
const rows = [];
for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (ALLOW.has(rel)) continue;
  const src = readFileSync(file, 'utf8');
  const hex = src.match(HEX) ?? [];
  const dur = src.match(INLINE_DURATION) ?? [];
  if (hex.length || dur.length) {
    rows.push({ rel, hex: hex.length, dur: dur.length, samples: [...hex.slice(0, 3), ...dur.slice(0, 2)] });
    total += hex.length + dur.length;
  }
}

if (!rows.length) {
  console.log('check:styles — clean (no hex literals, no inline durations)');
  process.exit(0);
}

rows.sort((a, b) => b.hex + b.dur - (a.hex + a.dur));
for (const r of rows) {
  console.log(`${String(r.hex).padStart(4)} hex  ${String(r.dur).padStart(3)} dur  ${r.rel}`);
  if (report) console.log(`               ${r.samples.join(' ')}`);
}
console.log(`\n${total} violation(s) in ${rows.length} file(s)`);

if (!report) {
  console.log('Move colors to src/styles/tokens.css and durations to the --dur-* scale.');
  process.exit(1);
}
