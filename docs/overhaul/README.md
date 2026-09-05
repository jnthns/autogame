# Twelve Omens Overhaul Plan

This folder is the executable plan for overhauling Twelve Omens in two tracks:

- **Design track** (motion, styling, feedback, consistency): `05-design-track.md`
- **Balance track** (stat and star scaling, economy, rewards and punishment, bosses, difficulty): `04-balance-track.md`

Both tracks depend on **Phase 0** (`03-phase-0-sim.md`): a headless simulator, a seeded RNG, a unit test harness, and a stat-budget audit script. Phase 0 is what makes the balance numbers measurable instead of guessed.

Read in this order: `01-audit.md` (what is wrong today, with file and line evidence), `02-proposal.md` (the ideal end state), then the phase files.

## Decisions already made (do not re-litigate)

These were settled with the owner before this plan was written.

| Decision | Choice |
|---|---|
| Visual identity | **Keep** the brutalist pixel style: Alfa Slab One display, Barlow Semi Condensed body, Space Mono numerals, 2px/3px ink borders, hard offset shadows, square corners, bone/ink/jade/saffron/rust palette. The overhaul is motion, consistency, feedback, and theming, not a restyle. |
| Reference mode | **Hyper Roll** (`bot`, 13 rounds). Marathon and Gauntlet derive their curves from Hyper Roll. |
| Difficulty targets | Scripted "decent" policy win rate on Hyper Roll: Mortal 55–65%, Hard 35–45%, Mythic 15–25%. |
| Economy model | **TFT-lite**: interest on banked gold, win and loss streak gold, 1★ sell tax, loss damage tied to surviving winner units. Board caps stay round-based (no XP purchase). |
| Hero rebalance depth | **Systemic first**: a cost-based stat budget and ability budget every hero must satisfy, then a per-hero outlier pass. No bespoke redesign of individual heroes. |
| Rules locked by the Aug 29 commits (`45e8227`, `c285056`) | Solo 4×4 rooted boss at `BOSS_ANCHOR` with board-wide AOE autos; ranged units never attack at distance < 2 and kite; `MERGE_COPIES = 2`; shop pair-collapse into a 2★ offer at 2× price; player draft of 6, bot draft of 12; boss rounds 4/8/12 (and 16 in Marathon); 6×6 halves. The **dials around** these rules (boss HP curve, boss attack, taken multiplier, star multipliers, odds) are open. |

## Invariants the implementing agent must preserve

1. Every numeric balance value lives in `src/data/constants.ts`, `src/data/heroes.ts`, `src/data/abilities.ts` (new), `src/data/economy.ts` (new), or `src/data/relics.ts`. **No numeric literal that affects balance may be added to `src/game/engine.ts`** beyond what the phase explicitly moves. If a phase needs a new number, it adds a named constant.
2. `npm test` and `npm run sim:balance` must pass after every phase. A phase that cannot hit its acceptance band within its stated dial ranges **stops and reports** rather than inventing a new mechanic.
3. Design phases do not change gameplay numbers. Balance phases do not touch `src/components/**` or `src/index.css` except where a phase explicitly lists a UI file (for example the income breakdown in B3).
4. `Math.random` is not called anywhere under `src/game/**` after Phase 0. All randomness goes through `src/game/rng.ts`.
5. No hex color literal and no literal animation duration in any `.tsx` under `src/components/**` after D1, except the files allow-listed in `scripts/check-styles.mjs`.
6. One phase per commit (or PR). Commit messages name the phase id (`S0`, `B1`…`B6`, `D1`…`D6`) and, for balance phases, paste the `sim:balance` summary table.

## Phase order and dependencies

```
S0 (sim + tests + rng + audit script)
 ├─ D1 (tokens, style lint, dark-theme fix)
 │   └─ D2 (component CSS, GameScreen split)         ← do this before any other component work
 │       ├─ D3 (plan-phase feedback + motion system)   ← needs B3 for the income breakdown chip
 │       ├─ D4 (combat choreography)
 │       └─ D5 (round flow, boss intro, transitions)
 │           └─ D6 (polish, a11y, perf verification)
 ├─ B1 (shop odds + draft integrity + sell tax)
 │   └─ B2 (stat budget, star multipliers, ability data extraction)
 │       └─ B3 (economy: income table, interest, streaks, loss damage, relic cadence)
 │           └─ B4 (opponent fairness: bot relics, bot income, difficulty de-dup, dead code)
 │               └─ B5 (absolute boss curve; Marathon and Gauntlet derivations)
 │                   └─ B6 (tuning pass to targets; per-hero outliers; baseline commit)
```

Recommended serial order if one agent does everything: **S0, D1, D2, B1, B2, B3, D3, B4, B5, D4, D5, B6, D6.**

## Commands (after S0)

| Command | Purpose |
|---|---|
| `npm test` | Vitest unit tests (rules, economy, budgets, boss invariants). |
| `npm run sim:balance -- --mode bot --difficulty normal --n 500 --seed 1` | Headless matches; prints the summary table and writes `docs/overhaul/baselines/<label>.json`. |
| `npm run audit:budget` | Prints every hero's stat budget and ability budget vs target; non-zero exit if any hero is outside tolerance. |
| `npm run check:styles` | Fails on hex literals or inline durations in component TSX. |
| `npm run screens` | Playwright screenshots of every screen, light and dark, 390×844, into `/screens/` (gitignored). |
| `npm run build` | `tsc -b && vite build`; must stay green. |

## Definition of done (whole overhaul)

- All six balance acceptance bands in `04-balance-track.md` §B6 are met on the committed baseline.
- All design acceptance checks in `05-design-track.md` §D6 pass, and `npm run screens` output has been eyeballed in both themes.
- `docs/overhaul/baselines/final.json` is committed and the README of the repo links to this folder.

## Glossary

- **P (stat budget)**: `hp × dmg × as × (1 + crit × 0.8)` at 1★ before `HERO_HP_MUL`. Units: thousands.
- **A30 (ability budget)**: expected ability value over 30 s of combat at 1★ with 0 spell power. See `04-balance-track.md` §B2 for the value rules.
- **Reference board / reference policy**: the scripted player in `src/sim/policies.ts` named `decent`. All win-rate targets are measured with it.
- **Dial**: a named constant a phase is allowed to change, with the allowed range listed in the phase.
