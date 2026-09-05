# 03 · Phase S0: simulator, seeded RNG, tests, budget audit

**Goal**: make every balance claim measurable and reproducible before any number changes.
**Touches**: `package.json`, `src/game/rng.ts` (new), `src/game/engine.ts`, `src/game/gauntlet.ts`, `src/hooks/useGame.ts` (RNG wiring only), `src/sim/**` (new), `scripts/balance-sim.ts` (new), `scripts/balance-audit.ts` (new), `tests/**` (new), `vitest.config.ts` (new), `docs/overhaul/baselines/` (new).
**Does not touch**: any balance number, any component, any CSS.

## S0.1 Seeded RNG

Create `src/game/rng.ts`:

```ts
export type Rng = () => number; // [0, 1)
let current: Rng = Math.random;
export const random: Rng = () => current();
export function setRng(fn: Rng) { current = fn; }
export function resetRng() { current = Math.random; }
/** mulberry32: small, fast, deterministic. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[]): T[] { /* Fisher–Yates using random() */ }
```

Replace every `Math.random` in `src/game/engine.ts` (16 sites), `src/game/gauntlet.ts` (1), and `src/game/hyperRoll.ts` (0 today) with `random()`; replace every `.sort(() => Math.random() - 0.5)` with `shuffle()`. `useGame.ts` keeps `Math.random` only for floater jitter and keys (cosmetic).

**Guard**: add to `package.json` scripts `"check:rng": "! grep -rn 'Math.random' src/game --include=*.ts | grep -v 'src/game/rng.ts'"` and run it in `npm test` via `pretest`.

## S0.2 Test runner

- Add devDependencies: `vitest@^3` (compatible with Vite 6), `@vitest/coverage-v8` optional.
- `vitest.config.ts`: `test: { include: ['tests/**/*.test.ts'], environment: 'node' }`.
- Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"pretest": "npm run check:rng"`.
- Port `src/game/matchSim.ts` assertions into `tests/rules.test.ts` one `it()` per assertion, keeping the messages. Keep `npm run sim` working until B5 rewrites the boss assertions, then delete `matchSim.ts` and `scripts/run-match-sim.ts` in B5.
- Every test calls `setRng(seeded(1))` in `beforeEach`.

## S0.3 Headless match runner

`src/sim/runMatch.ts` exports:

```ts
export interface MatchOptions {
  mode: 'bot' | 'marathon' | 'gauntlet';
  difficulty: Difficulty;
  draft: string[];             // player draft, default DEFAULT_DRAFT
  policy: PolicyName;          // 'decent' | 'greedy' | 'econ' | 'random'
  seed: number;
  speed?: number;              // sim tick multiplier, default 1 (0.1 s ticks)
}
export interface RoundRecord {
  round: number; boss: boolean; win: boolean; dmg: number;
  fightSeconds: number; timedOut: boolean;
  goldBefore: number; goldAfter: number; income: number;
  boardStars: number[]; boardCost: number[]; foeBoardStars: number[];
  survivorsMe: number; survivorsFoe: number;
  dmgByHero: Record<string, { auto: number; ability: number }>;
  relicTaken?: string;
}
export interface MatchRecord {
  win: boolean; rounds: RoundRecord[]; finalHp: number; foeFinalHp: number;
  threeStarRound: number | null; // first round a 3★ existed on player board/bench
  seed: number;
}
export function runMatch(opts: MatchOptions): MatchRecord;
```

Implementation rules:
- Reuse the real code: `createGame`, `rollShop`, `gameActions.*`, `applyMerges`, `combatant`, `applyTraits`, `fitBossToTeam`, `scaleFoeCombatants`, `CombatEngine`. Do **not** reimplement combat. The engine's constructor callbacks (`onPop`, `onBanner`, `onFx`) receive no-op functions.
- To attribute damage, `CombatEngine.hurt()` gains an optional `onDamage?: (src, target, amount, kind) => void` hook (constructor param, default undefined). This is the only engine change in S0 and it must not alter behaviour.
- Combat loop: `while (!eng.isDone()) eng.simTick(0.1)`; record `eng.time` as `fightSeconds`; `timedOut = eng.time > limit`.
- The relic pick uses the policy's `chooseRelic(picks, board)`; the bind uses `chooseRelicHolder`.
- Gauntlet runs until lives reach 0 or round 60 (hard stop; record `roundsCleared`).

## S0.4 Policies

`src/sim/policies.ts`. Each policy implements:

```ts
export interface Policy {
  name: PolicyName;
  plan(g: GameState, ctx: { draft: string[]; cap: number; round: number }): void; // mutates g via gameActions
  chooseRelic(picks: string[], board: Unit[]): string;
  chooseRelicHolder(rid: string, board: Unit[]): Unit;
}
```

- **`decent`** (the reference policy; all bands use it):
  1. Buy any offer that completes a merge (same `hid` already owned at same star) if affordable.
  2. Buy the highest-cost affordable offer that shares a trait or class with the current board while board + bench < cap + 3.
  3. Reroll while gold ≥ reroll cost + 4 and round ≥ 2 and (bench + board have < cap units OR an owned 2★ pair is one copy from 3★), at most 3 rerolls per round.
  4. After B3 lands: never reroll below the next interest threshold (10/20/30) when round ≤ 9.
  5. Sell the lowest `unitPower` bench unit when the bench is full and a merge buy is blocked.
  6. Place: sort board candidates by `unitPower` desc, take `cap`; melee in rows 6–7 centred (cols 2,3,1,4,0,5), ranged in rows 9–10 (rows are absolute: player half is 6–11).
  7. Relic: prefer `ember`/`quill` for the highest-DPS unit, `jade`/`root` if the board has a 2★+ melee, else the first pick. Holder: highest `unitPower` unit with < 3 relics.
- **`greedy`**: always buy the most expensive affordable, reroll to zero gold.
- **`econ`**: never reroll before round 7, sit on interest, buy only merges and cost ≤ 3.
- **`random`**: uniform random legal actions (baseline floor).

## S0.5 CLI and report

`scripts/balance-sim.ts` (run with `npx tsx`): flags `--mode`, `--difficulty`, `--n` (default 300), `--seed` (default 1), `--policy` (default decent), `--draft` (comma ids, default DEFAULT_DRAFT), `--label` (writes `docs/overhaul/baselines/<label>.json`), `--drafts random` (sample a random legal 6-hero draft per match from the unlocked-all pool, used for per-hero deltas).

Printed summary (fixed column order so commit messages are comparable):

```
mode=bot diff=normal policy=decent n=500 seed=1
win%            61.2
medFightSec     22.4
timeout%         6.8
boss4 win%      74.0   boss8 win%  58.6   boss12 win%  49.0
abilityShare%   41.3
3★<r4 %          1.2
goldFlow avg   134.7   interest avg 11.2   streakGold avg 5.9
heroDelta       kitsu +9.1 ▲  thund +7.4 ▲  anzuu -6.9 ▼  ... (top/bottom 3)
```

`heroDelta` = win% when hero is in the draft minus win% when it is not, using `--drafts random`, n ≥ 1,000.

The JSON baseline stores the full per-match records so later phases can diff.

## S0.6 Budget audit

`scripts/balance-audit.ts` prints one row per hero: cost, class, P, P target, P delta%, A30, A30 target, A30 delta%, flag. Exit code 1 if any |delta| exceeds tolerance **once B2 has landed**; in S0 it runs in report-only mode (`--strict` flag off) so the baseline shows the pre-overhaul spread. The value rules for A30 are in `04-balance-track.md` §B2.3 and must be implemented exactly as written there.

## S0.7 Acceptance for S0

- `npm test` green with every former `matchSim` assertion ported.
- `npm run check:rng` passes.
- `npm run sim:balance -- --label 00-baseline` writes `docs/overhaul/baselines/00-baseline.json` and the summary is pasted into the S0 commit message.
- `npm run sim:balance -- --label 00-baseline-hard --difficulty hard` and `--difficulty mythic` likewise.
- `npm run audit:budget` prints the table (report-only).
- Running the same command twice with the same seed yields byte-identical JSON.
- `npm run build` still passes; the app behaves identically (RNG swap only).

## S0.8 Known traps

- `createGame('bot')` calls `runBotTurn` immediately; seed the RNG **before** `createGame`.
- `useGame.startCombat` applies `scaleFoeCombatants` only when `usesDifficulty(mode)`, and `fitBossToTeam` before it. Mirror that order in `runMatch` or boss numbers will differ from the app.
- `applyTraits` caps start mana at 90 and resets `cd`; call it after relics are applied (it already is, inside `combatant` → relic apply → `applyTraits` in `startCombat`). Keep the order: `combatant()` (applies relics) → `applyTraits()` → `fitBossToTeam()` → `scaleFoeCombatants()`.
