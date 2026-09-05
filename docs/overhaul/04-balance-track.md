# 04 · Balance track (B1–B6)

Every phase lists: goal, files, exact changes, dials with ranges, tests to add, acceptance. Numbers not listed as dials are fixed for that phase. Run `npm test` and `npm run sim:balance` after each phase and paste the summary in the commit.

---

## B1 · Shop odds, draft integrity, sell tax

**Goal**: kill the "five Anansi" opening (audit A1) and make scouting cost something (A6).
**Files**: `src/data/economy.ts` (new), `src/game/hyperRoll.ts`, `src/game/engine.ts` (`rollShopOffers`, `sellValue`), `src/components/screens/BuildScreen.tsx` (one warning chip), `tests/shop.test.ts`.

### B1.1 Odds table
Create `src/data/economy.ts` and move `MATCH_DEFAULTS`, `HYPER_ROLL_ROUNDS`, `BOSS_ROUNDS`, `MARATHON_BOSS_ROUNDS` there from `constants.ts` (re-export from `constants.ts` for one phase, then delete the re-exports in B3). Add:

```ts
/** Probability (percent) of each cost tier per round entered. Rows sum to 100. */
export const SHOP_ODDS: Record<number, [c2: number, c3: number, c4: number, c5: number]> = {
  1: [70, 30, 0, 0],   2: [70, 30, 0, 0],
  3: [55, 35, 10, 0],  4: [55, 35, 10, 0],
  5: [40, 40, 18, 2],  6: [40, 40, 18, 2],
  7: [30, 38, 25, 7],  8: [30, 38, 25, 7],
  9: [22, 33, 30, 15], 10: [22, 33, 30, 15],
  11: [15, 28, 35, 22], 12: [15, 28, 35, 22],
  13: [12, 25, 35, 28],
};
export function shopOdds(round: number): [number, number, number, number] {
  return SHOP_ODDS[Math.min(13, Math.max(1, round))];
}
```

Marathon rounds 14–18 use row 13. Gauntlet uses `min(13, round)`.

### B1.2 Roll algorithm (replaces `maxShopCost` filtering in `rollShopOffers`)
For each of the 5 slots: sample a tier from `shopOdds(round)`; let `pool = draft.filter(cost === tier)`; if empty, fall back in this order: tier−1, tier+1, tier−2, tier+2, tier−3 (bounded to 2..5); pick uniformly from the pool. Then `collapseShopOffers` as today. `shopWeight()` and `maxShopCost()` are deleted; the bot uses the same function with its 12-hero draft.

### B1.3 Draft warning
`BuildScreen.tsx`: if the draft has no hero of cost ≤ 3, show a chip "SLOW START · no 2- or 3-cost creature" using the existing chip style (this is the one UI touch in B1; after D2 it becomes `.om-chip--warn`).

### B1.4 Sell tax
`sellValue`: 1★ → `Math.max(1, cost - 1)`. 2★ and 3★ unchanged. Update the copy in the sell button (it already prints `sv`).

### Dials
- `SHOP_ODDS` rows may shift by ±10 points per cell in B6, rows must still sum to 100 and cost-5 odds must be 0 before round 5.

### Tests (`tests/shop.test.ts`)
- With `DEFAULT_DRAFT` and seed 1, 200 rolls at round 1 contain ≥ 3 distinct hero ids.
- Tier fallback: a draft of only 5-costs at round 1 yields only 5-costs (no crash, no empty slots).
- `sellValue` 1★ of a 2-cost = 1; of a 5-cost = 4.
- Rows of `SHOP_ODDS` sum to 100.

### Acceptance
- Sim `3★<r4 %` < 3% with the default draft (was ~100%).
- Sim `win%` on Mortal is recorded; no band yet (B6 owns bands).

---

## B2 · Stat budget, star multipliers, ability data

**Goal**: every hero is worth its cost (A2, A3, A4); ability numbers become data.
**Files**: `src/data/constants.ts` (`STARMUL`), `src/data/heroes.ts` (hp, dmg, new `abilityKind`), `src/data/abilities.ts` (new), `src/game/engine.ts` (`cast()`, `hurt()`, `applyTraits`), `scripts/balance-audit.ts` (strict mode), `tests/budget.test.ts`.

### B2.1 Star multipliers
`STARMUL = [1, 1, 1.65, 2.6]`. Dial: 2★ ∈ [1.55, 1.75], 3★ ∈ [2.4, 2.9].

### B2.2 Stat budget
Targets (thousands): `BUDGET_P = { 2: 13.5, 3: 17.5, 4: 22.5, 5: 28.0 }`, tolerance ±8%.
Modifiers: ranged ×0.92; `abilityKind === 'support'` ×1.05. `support` heroes: anans, taniw, barng, nuwa (their casts deal no direct damage). Add `abilityKind: 'damage' | 'support'` to `HeroDef`.

Procedure per hero (mechanical, no judgement): `k = sqrt(target / P_current)`; `hp' = round(hp × k / 5) × 5`; `dmg' = round(dmg × k)`. Do not change `as`, `crit`, `range`, `attack`. Re-run the audit; any hero still outside ±8% (rounding) gets a ±5 hp nudge. Record the before/after table in the commit body.

Reference P today (thousands): jorm 20.1, quetz 17.1, thund 16.1, anans 15.0, bunyi 10.9, garud 22.2, kitsu 14.9, ifrit 14.9, zirni 21.2, taniw 13.8, anzuu 14.9, sphin 15.6, kelpi 12.4, barng 11.0, coyot 15.0, griff 17.8, golem 11.9, bansh 14.1, hydra 17.8, nuwa 15.1, camaz 20.4, simur 18.2, levia 19.8, wendi 21.9.

### B2.3 Ability data extraction
Create `src/data/abilities.ts`:

```ts
export interface AbilityDef {
  /** Primary number the cast() case uses (damage, heal, or shield). */
  base: number;
  /** Secondary number where the case uses two (e.g. Kitsune hit count, Wendigo steal %). */
  secondary?: number;
  /** Seconds of stun / snare / silence / buff used by the case. */
  duration?: number;
  /** ±0.10 max. Positive = stats over ability. Must be justified in a comment. */
  budgetBias?: number;
}
export const ABILITIES: Record<string, AbilityDef> = { /* one row per hero, values copied verbatim from cast() */ };
```

`cast()` reads `ABILITIES[u.hid]` instead of literals. Remove `case 'boss'`. Fix `dmgBuff`: `hurt()` and the auto path multiply outgoing damage by `1 + (src.dmgBuff || 0)`, and Taniwha's buff expires with `buffT` (reuse the existing 4 s buff timer pattern). Cap `crit` at 1.0 where it is read.

### B2.4 A30 value rules (implement exactly; used by the audit script)
Per cast at 1★, sp = 0, `m = 1`:
- Direct damage: `base × targets`. Expected targets: single = 1; `near(n)` = min(n, 3); "adjacent to caster / target" = 1.5; "within 2" = 2; "all enemies" = 4; "split among hit" counts once.
- True damage ×1.25. Auto-crit hits ×1.8. Random-target multi-hit (Kitsune) = hits × base × (1 + crit × 0.8).
- Burn: `burn/s × seconds × targets × 0.8`. Heal: ×1.0 (heal-off-damage: dealt × ratio). Shield: ×0.7 (all allies = 4 allies).
- CC per target-second: stun 60, silence 40, snare 25. Amp 0.2 on a target = 60. Permanent all-ally buff (crit +15%, AS +20% for 4 s, DR +15%) = 40 per ally affected, 4 allies. Self permanent buffs (Anzû, Wendigo attack) = 50 per cast.
- Conditional second cast (Zmey) = +35% of the cast value.
- `A30 = value × as × 3.6` (casts per 30 s ≈ as × 12 mana / 100).

Targets: `BUDGET_A30 = { 2: 800, 3: 1050, 4: 1300, 5: 1600 }`, tolerance ±15%, plus `budgetBias`.

Procedure: scale `base` (and `secondary` where it is a damage number) by `target / A30_current`; keep durations. Then recheck P if `budgetBias` was used.

### B2.5 Audit strict mode
`npm run audit:budget --strict` exits 1 on any violation; `npm test` includes `tests/budget.test.ts` which asserts the same (this is the drift guard for every later phase).

### Tests
- All 24 heroes within tolerance for P and A30.
- `STARMUL[2] × STARMUL[2]` (effective P at 2★) < 3.0 and `STARMUL[3]²` < 8.5.
- Taniwha's cast increases an ally's next auto-attack damage by 15% (regression for the dead `dmgBuff`).

### Acceptance
- Audit strict passes.
- Sim `abilityShare%` moves toward 35–45 (record; B6 finalises).
- Sim `heroDelta` spread (max − min) shrinks versus baseline by at least half.

---

## B3 · Economy

**Goal**: TFT-lite economy with visible income; punishment scales with the margin of loss; relics on a schedule (A6, A7).
**Files**: `src/data/economy.ts`, `src/game/types.ts` (`GameState`), `src/game/hyperRoll.ts` (`roundIncome`, `lossDamage` replaced), `src/game/engine.ts` (`resolveRound`, `nextRound`, `createGame`), `src/game/gauntlet.ts` (`gauntletRoundIncome` gains interest), `src/components/game/GameHud.tsx` (income chip; if D2 has not landed yet, put it in `GameScreen.tsx` header and D2 moves it), `src/components/game/OverlayModal.tsx` (copy), `tests/economy.test.ts`.

### B3.1 Constants (`economy.ts`)
```ts
export const INCOME_BASE = (round: number) => (round <= 3 ? 4 : round <= 7 ? 5 : 6);
export const WIN_BONUS = 1;
export const INTEREST_PER = 10;     // gold per +1
export const INTEREST_MAX = 3;
export const STREAK_GOLD = (streak: number) => (Math.abs(streak) >= 4 ? 2 : Math.abs(streak) >= 2 ? 1 : 0);
export const LOSS_BASE = (round: number) => (round <= 3 ? 4 : round <= 7 ? 6 : round <= 11 ? 8 : 10);
export const LOSS_PER_SURVIVOR = 2;
export const LOSS_SURVIVOR_CAP = 8;
export const BOSS_LOSS_EXTRA = 6;
export const RELIC_ROUNDS = [3, 6, 9, 11] as const;   // plus boss rounds whose reward.relic is true
export const RELIC_PICKS_WIN = 3;
export const RELIC_PICKS_LOSS = 2;
```

### B3.2 State
Replace `lossStreak` / `foeLossStreak` with signed `streak` / `foeStreak` (+n wins in a row, −n losses). Add `lastSurvivors: { me: number; foe: number }`. Update every reader (`OverlayModal` copy uses `game.lossStreak`).

### B3.3 Income
```ts
export interface IncomeBreakdown { base: number; win: number; interest: number; streak: number; total: number }
export function incomeBreakdown(roundEntered: number, goldHeld: number, streak: number, wonLast: boolean | null): IncomeBreakdown
```
`interest = min(INTEREST_MAX, floor(goldHeld / INTEREST_PER))` computed on gold **before** income. `nextRound` applies `total` to the player and the bot (the bot's streak is `foeStreak`; B4 adds the difficulty bonus). Gauntlet: `gauntletRoundIncome` adds the same interest term.

### B3.4 Loss damage
`resolveRound` computes `dmg = LOSS_BASE(round) + LOSS_PER_SURVIVOR × min(LOSS_SURVIVOR_CAP, survivorsOfWinner)`; boss loss adds `BOSS_LOSS_EXTRA` and uses `survivors = 4` (a boss counts as four units). Survivors come from the engine (`runMatch` and `useGame.startCombat` pass `eng.C.filter(alive && side === winner).length` into `resolveRound(g, win, maxR, survivors)`). On timeout the winner's alive units count.

### B3.5 Relic cadence
`resolveRound` returns `offer: true` when `RELIC_ROUNDS.includes(round)` or the boss reward has `relic: true`. `pickRelics(count)` receives `RELIC_PICKS_WIN` or `RELIC_PICKS_LOSS`. The overlay title for a loss with an offer reads "ROUND LOST · a lesser spoil".

### B3.6 HUD income chip
Next to the gold counter: `+7` with a tap-to-expand breakdown "5 base · +1 win · +1 interest". Updates as gold changes during the plan phase (interest preview).

### Dials (for B6)
`INCOME_BASE` rows ±1; `INTEREST_MAX` ∈ {3, 4}; `LOSS_BASE` rows ±2; `LOSS_PER_SURVIVOR` ∈ {1, 2, 3}; `RELIC_ROUNDS` may swap one round.

### Tests
- Income at round 5 with 23 gold, 3-win streak, won last = 5 + 1 + 2 + 1 = 9.
- Loss with 0 survivors on the winner side (timeout tie) = base only.
- Round 13 wipe by 8 survivors = 10 + 16 = 26.
- Relic offered on round 3 loss with 2 picks; on round 8 boss win with 3 picks; never on round 2.
- Gauntlet income includes interest.

### Acceptance
- Sim `goldFlow avg` 125–145 on Mortal; `interest avg` ≥ 8.
- `econ` policy win rate is within 10 points of `decent` (the economy must not be a trap).
- No band on win% yet.

---

## B4 · Opponent fairness, difficulty de-duplication, dead code

**Goal**: the bot plays the same game (A7, A8 double-dip, A5).
**Files**: `src/game/engine.ts` (`runBotTurn`, `placeBotBoard`, `FOE_SCALE`, `BOSS_SCALE`, `makeFoeBoard`, `scaleFoeCombatants`), `src/data/constants.ts`, `src/data/economy.ts`, `src/game/gauntlet.ts`, `tests/bot.test.ts`.

### B4.1 Bot relics
On every round where the player is offered relics, `runBotTurn` (or `nextRound`) grants the bot one relic: `pickRelics(1)`, bound to the bot's highest-`unitPower` unit with < 3 relics. Bot boards therefore carry relics into `combatant()` like the player's.

### B4.2 Difficulty as income
`economy.ts`: `BOT_INCOME_BONUS = { normal: 0, hard: 1, mythic: 2 }`, added in `nextRound` for ranked modes. `FOE_SCALE` becomes `{ normal: {hp: 1, atk: 1}, hard: {hp: 1.15, atk: 1.10}, mythic: {hp: 1.30, atk: 1.20} }`; delete `extra`.

### B4.3 Boss difficulty single lever
Delete `BOSS_TAKEN_BY_DIFFICULTY`; `BOSS_INCOMING_MULT = 2.35` (renamed from `BOSS_DAMAGE_TAKEN`); `fitBossToTeam` no longer takes `difficulty`. `BOSS_SCALE = { normal: {1,1,1}, hard: {hp 1.2, atk 1.10, as 1.05}, mythic: {hp 1.45, atk 1.20, as 1.10} }`.

### B4.4 Bot placement and economy sense
- `placeBotBoard`: melee in rows 4–5 (front of the foe half), ranged in rows 0–2, ordered by `unitPower` so the strongest melee is centre-front. Today ranged fill from row 0 which is correct; melee fill from row 5 downward which is correct; the change is only to skip row 3 for ranged so kiters do not start adjacent.
- `runBotTurn` reroll rule: reroll only if `foeGold − rerollCost ≥ nextInterestThreshold` or round ≥ 9, mirroring the `decent` policy.

### B4.5 Dead code
Delete: `makeFoeBoard`'s `g.mode === 'bot'` branches, `case 'boss'`, `CAPS`, `fxColors`, `g.log` (and its reader), `powerScale`/`buildScaledUnits` minion scaling in `gauntlet.ts` (keep `boardPower` for the banner), `void silent` (drop the parameter).

### Tests
- After a relic round, the bot board has exactly one more relic bound to its top unit.
- Mythic bot income per round = player base + 2.
- A Mythic boss has HP = normal × 1.45 and `bossTaken` identical to normal.

### Acceptance
- Sim Hard and Mythic win rates are ordered (Mortal > Hard > Mythic) with gaps ≥ 12 points each.

---

## B5 · Absolute boss curve; Marathon and Gauntlet derivations

**Goal**: bosses reward growth (A8); one curve feeds all modes.
**Files**: `src/data/bossCurve.ts` (new), `src/game/engine.ts` (`fitBossToTeam`, `bossCast`), `src/game/gauntlet.ts`, `src/game/hyperRoll.ts`, `tests/boss.test.ts`, delete `src/game/matchSim.ts` + `scripts/run-match-sim.ts` + the `sim` script.

### B5.1 Reference curve
```ts
/** Median player team HP and DPS of the `decent` policy on Mortal at these rounds (from sim:balance --label b4). */
export const REF_ANCHORS: Record<number, { hp: number; dps: number; avgHp: number }> = {
  1: { hp: 1050, dps: 90, avgHp: 525 },
  4: { hp: 1900, dps: 170, avgHp: 630 },
  8: { hp: 3900, dps: 330, avgHp: 780 },
  12: { hp: 9000, dps: 760, avgHp: 1000 },
  16: { hp: 11500, dps: 980, avgHp: 1150 },
};
export function refTeam(round: number): { hp: number; dps: number; avgHp: number } // piecewise-linear between anchors; beyond 16 extrapolate with the 12→16 slope
export const GAUNTLET_ROUND_MUL = 0.09; // existing
```
The seed values above are analytical estimates; **B5 must replace them with the sim's medians** from the B4 baseline (`boardStars`, `boardCost`, and the recorded team HP/DPS at those rounds; add `teamHp`/`teamDps` to `RoundRecord` if S0 did not record them).

### B5.2 `fitBossToTeam(foes, round, opts)` (allies parameter removed)
```
ref = refTeam(round)
roundMul = 1 + (round − 1) × (gauntlet ? GAUNTLET_ROUND_MUL : 0.04)      // unchanged
floor = BOSS_HP_TEAM_MULT × ref.hp × roundMul
burn = floor / (ref.dps × BOSS_INCOMING_MULT)
pad = burn < BOSS_DPS_BURN_SECONDS ? BOSS_DPS_BURN_SECONDS / burn : 1
hp = round(floor × pad)
atk = max(16, ref.avgHp / (BOSS_AS × BOSS_BOARD_SURVIVAL))
```
Everything else in the function stays (anchor, footprint, rooted, range, `bossTaken = BOSS_INCOMING_MULT`). `GameScreen`/`Board` preview calls drop the `mine` argument.

### B5.3 Kit scaling
`bossCast` bases (`170/190/210` damage, `300/160/180` shields, `32` burn) become `ref.avgHp × K` with `K` in `src/data/bosses.ts`: `clay: {slam: 0.27, shield: 0.48}`, `storm: {slam: 0.30, shield: 0.25}`, `coil: {slam: 0.33, shield: 0.29, burn: 0.05}` (chosen to reproduce today's numbers at round 4 with avgHp 630). Dial: each K ±20%.

### B5.4 Modes
- Marathon: `refTeam` at 16 is the anchor; rounds 17–18 extrapolate.
- Gauntlet: `getGauntletEncounter` no longer takes `power`; the boss uses `refTeam(min(round, 16))` × gauntlet `roundMul`. `boardPower` stays for the banner and score only.

### Dials
`BOSS_HP_TEAM_MULT` ∈ [7, 12]; `BOSS_DPS_BURN_SECONDS` ∈ [30, 50]; `BOSS_BOARD_SURVIVAL` ∈ [20, 32]; `BOSS_INCOMING_MULT` ∈ [1.8, 2.8].

### Tests (replace the old `matchSim` boss assertions)
- Boss HP at round 8 is identical for a 1-unit board and a 6-unit 2★ board (independence invariant).
- Boss HP at round 12 > round 8 > round 4.
- Boss stays rooted at the anchor for 80 ticks (ported).
- Ranged kite (ported).
- Kit damage at round 4 equals the pre-B5 literal within ±5%.

### Acceptance
- Sim boss win% (Mortal): r4 70–80, r8 55–65, r12 45–55 (B6 may tune dials to land here).
- Gauntlet median cleared 10–14 (Mortal).

---

## B6 · Tuning pass and baseline

**Goal**: land every band from `02-proposal.md` §1.7 by moving only the dials listed in B1–B5 and hero rows within their budgets.
**Files**: only `src/data/**` and `docs/overhaul/baselines/**`.

### Procedure
1. Run `sim:balance` for Mortal, Hard, Mythic (n = 1,000, seed 1) and `--drafts random` (n = 2,000) for hero deltas.
2. Adjust in this priority: (a) fight length via `HERO_HP_MUL` ∈ [1.3, 1.8]; (b) win rate via `FOE_SCALE`/`BOT_INCOME_BONUS`; (c) boss bands via B5 dials; (d) ability share via `BUDGET_A30` scale (all four targets ×k, k ∈ [0.8, 1.25]); (e) hero deltas via `budgetBias` (max ±0.10) and the ±8% / ±15% tolerances.
3. Repeat until every band holds on two different seeds (1 and 7).
4. Commit `docs/overhaul/baselines/final.json` and the summary tables for all three difficulties.

### Stop condition
If after four iterations any band is unmet, **stop** and write `docs/overhaul/baselines/B6-report.md` listing the unmet band, the dial values tried, and the suspected structural cause. Do not add mechanics.

### Acceptance
All rows of `02-proposal.md` §1.7 hold on seeds 1 and 7; `npm test` and `audit:budget --strict` green.
