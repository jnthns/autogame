#!/usr/bin/env node
/**
 * Screenshot every screen in both themes at 390×844 into /screens/ (gitignored).
 *
 *   npm run screens
 *
 * Drives the dev server through the `?screen=…` debug URL that `useGame` reads
 * in dev builds only. Requires Playwright; Chromium is pre-installed at
 * /opt/pw-browsers/chromium in the container image.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'screens');
const PORT = Number(process.env.SCREENS_PORT ?? 5199);
const BASE = `http://localhost:${PORT}`;

/** name → query string. `phase=combat` starts a fight and freezes it at tick 40. */
const STATES = [
  ['home', 'screen=home'],
  ['modes', 'screen=modes'],
  ['build', 'screen=build'],
  ['settings', 'screen=settings'],
  ['game-plan', 'screen=game&mode=bot&round=8&phase=plan'],
  ['game-combat', 'screen=game&mode=bot&round=8&phase=combat'],
  ['game-boss', 'screen=game&mode=bot&round=12&phase=plan'],
];

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('playwright is not installed — run `npm i -D playwright` first.');
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });

  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  const stop = () => server.kill('SIGTERM');
  process.on('exit', stop);

  await waitForServer(BASE);

  const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  for (const [name, query] of STATES) {
    for (const theme of ['light', 'dark']) {
      await page.goto(`${BASE}/?${query}&theme=${theme}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(query.includes('combat') ? 1200 : 400);
      const file = resolve(OUT, `${name}-${theme}.png`);
      await page.screenshot({ path: file });
      console.log(`wrote ${file}`);
    }
  }

  await browser.close();
  stop();
}

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`dev server did not come up on ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
