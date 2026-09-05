#!/usr/bin/env node
/**
 * Trace a round-8 combat and report the longest task.
 *
 *   npm run perf:combat
 *
 * Acceptance (D4): a 30 s Mortal round-8 combat at ×1 shows no long task over
 * 50 ms on desktop Chromium. Exits 1 if one does.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PERF_PORT ?? 5198);
const BASE = `http://localhost:${PORT}`;
const LONG_TASK_MS = 50;
const SAMPLE_MS = 30_000;

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('playwright is not installed — run `npm i -D playwright` first.');
    process.exit(1);
  }

  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  const stop = () => server.kill('SIGTERM');
  process.on('exit', stop);
  await waitForServer(BASE);

  const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/?screen=game&mode=bot&round=8&phase=combat`, { waitUntil: 'networkidle' });

  const tasks = await page.evaluate(async (ms) => {
    const seen = [];
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) seen.push(Math.round(entry.duration));
    });
    try {
      obs.observe({ entryTypes: ['longtask'] });
    } catch {
      return { supported: false, seen };
    }
    await new Promise((r) => setTimeout(r, ms));
    obs.disconnect();
    return { supported: true, seen };
  }, SAMPLE_MS);

  await browser.close();
  stop();

  if (!tasks.supported) {
    console.log('longtask observer unavailable in this build — no measurement taken');
    return;
  }
  const worst = tasks.seen.length ? Math.max(...tasks.seen) : 0;
  console.log(`long tasks: ${tasks.seen.length}, worst ${worst} ms (budget ${LONG_TASK_MS} ms)`);
  if (worst > LONG_TASK_MS) {
    console.error(`FAIL: a task ran ${worst} ms`);
    process.exit(1);
  }
  console.log('PASS');
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
