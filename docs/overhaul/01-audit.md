# 01 · Audit of the current build

Evidence is cited as `path:line` against commit `a41da60` (main, 2026-08-29). Line numbers drift after edits; the symbol names do not.

## A. Balance and economy

### A1. The default draft degenerates the early shop into "five Anansi"
- `maxShopCost()` (`src/game/hyperRoll.ts:53`) hard-caps shop cost at 2 for rounds 1–4.
- `rollShopOffers()` (`src/game/engine.ts:217`) filters the 6-hero draft by that cap. The default draft (`DEFAULT_DRAFT`, `src/data/constants.ts`) is jorm 4, anans 2, kitsu 3, taniw 3, ifrit 4, thund 3. Only Anansi passes, so the pool is `[anans]` and every roll is five Anansi.
- `collapseShopOffers()` (`src/game/hyperRoll.ts:202`) then folds those into two 2★ offers plus one 1★. With 10 starting gold a player buys a 2★ (4g) and a 1★ (2g) on round 1 and has a 3★ Anansi by round 2 or 3, every match.
- Anansi has 35% base crit (`src/data/heroes.ts` `crit: 0.35`) and an ability that does no damage but amps two targets. A guaranteed 3★ of it by round 3 decides the first period.
- The bot draft is 12 heroes with 4 per tier (`pickBotDraft`, `src/game/engine.ts:104`), so the bot never gets this degenerate acceleration. This is the single largest balance defect.

### A2. Star scaling is steeper than the merge cost
- `STARMUL = [1, 1, 1.85, 3.4]` (`src/data/constants.ts:7`) multiplies **both** HP and attack (`combatant()`, `src/game/engine.ts:674`) and every ability base (`cast()`, `src/game/engine.ts:1131` via `m`).
- Effective power (HP × DPS) is therefore 3.4× at 2★ and 11.6× at 3★, for 2× and 4× the gold under `MERGE_COPIES = 2`. Power per gold: 1.7× at 2★, 2.9× at 3★. Merging dominates every other decision.

### A3. Hero stats do not follow cost
Stat budget P = hp × dmg × as × (1 + crit × 0.8), thousands, from `src/data/heroes.ts`:

| cost | heroes (P) |
|---|---|
| 2 | anans 15.0, coyot 15.0, anzuu 14.9, kelpi 12.4, bunyi 10.9, barng 11.0 |
| 3 | griff 17.8, thund 16.1, kitsu 14.9, bansh 14.1, taniw 13.8, golem 11.9 |
| 4 | garud 22.2, jorm 20.1, camaz 20.4, hydra 17.8, nuwa 15.1, ifrit 14.9 |
| 5 | wendi 21.9, zirni 21.2, levia 19.8, simur 18.2, quetz 17.1, sphin 15.6 |

A 2-cost Coyote (15.0) has the same budget as a 4-cost Ifrit (14.9). Golem (3-cost, 11.9) is below every 2-cost except Bunyip and Barong. There is no range tax: ranged heroes get the same budget as melee despite never taking melee hits while kiting.

### A4. Ability values vary about 11× across heroes of similar cost
Per-cast value at 1★ (rules in `04-balance-track.md` §B2), normalised to casts per 30 s (`A30 = value × as × 3.6`):
- Outliers high: Thunderbird ~2,830 (3-cost; two auto-crit arcs at 1.8×, `engine.ts:1174`), Kitsune ~2,780 (3-cost; nine hits, `engine.ts:1197`), Simurgh ~3,780 (5-cost), Sphinx ~2,270 (5-cost), Taniwha ~1,660 (3-cost), Barong ~1,210 (2-cost).
- Outliers low: Anzû ~300 (2-cost), Wendigo ~1,080 (5-cost), Zmey ~1,300 (5-cost).
- Targets by cost (§B2): 800 / 1,050 / 1,300 / 1,600. Half the roster is outside ±15%.

### A5. Dead or inert mechanics
- `dmgBuff` is set by Taniwha's cast (`engine.ts` `case 'taniw'`) but **never read** in `hurt()` or the auto-attack path. Taniwha's "+15% damage" does nothing.
- `case 'boss'` in `cast()` (`engine.ts:1148`) can never match; no hero id is `boss`.
- `makeFoeBoard()` branches on `g.mode === 'bot'` (`engine.ts:645`, `:647`) but is only called for practice (`useGame.ts` `startCombat`). `FOE_SCALE.extra` is likewise only consumed there. Dead.
- `g.log` is never assigned; the combat bar shows the fallback string forever.
- `CAPS` (`constants.ts`) and `fxColors()` (`combatFx.ts`) are marked deprecated and unused.
- `gauntlet.ts` `powerScale()` and `buildScaledUnits` scale minions, but every gauntlet encounter is a solo boss, so board power only affects the banner text.

### A6. Economy has no decisions in it
- Income (`roundIncome`, `hyperRoll.ts:91`) is `4 + win + min(2, floor(round/5))`. No interest, no streaks. Banking gold is never rewarded, so the correct play is always to spend to zero.
- 1★ sells for full cost (`sellValue`, `engine.ts:464`). Buying a unit to look at it is free; the bench is a free scouting buffer.
- Roughly 107 gold flows through a Hyper Roll match (10 start + 61 income + ~6 win bonuses + 30 boss gold). Rerolls cost 2.

### A7. Rewards only snowball, punishment only bleeds
- Relic offers require a win: `offer = win && (round % 2 === 1 || round >= 7)` (`engine.ts:1605`). A losing player gets nothing for nine rounds; a winning one can collect up to nine relics. The bot never receives relics at all, so late-game bot boards are propped up by hidden multipliers instead.
- Loss damage (`lossDamage`, `hyperRoll.ts:96`) is `8 + 4(streak−1) + 2·floor(round/3)`. It ignores how badly the fight was lost. A 1-unit-left loss and a wipe cost the same.
- Loss streaks compound damage **and** give no compensation, which is the opposite of comeback design.

### A8. Bosses rubber-band to the player's board
- `fitBossToTeam()` (`engine.ts:737`) sets boss HP to `10 × teamHp × roundMul`, padded so the player's auto-attack DPS needs at least 42 s (`BOSS_DPS_BURN_SECONDS`), and boss attack to wipe an idle board in 24 s (`BOSS_BOARD_SURVIVAL`).
- Because both HP and attack are derived from the live board, buying more or better units does not make the boss easier. Only mechanics outside `teamDps()` (shields, heals, lifesteal, spell damage, DR) move the outcome. Growth is not rewarded.
- Difficulty double-dips: `BOSS_TAKEN_BY_DIFFICULTY` (`constants.ts:38`) lowers the incoming multiplier from 2.35 to 1.65 on Mythic (0.70× damage) **and** `BOSS_SCALE.mythic` (`engine.ts:619`) multiplies HP by 1.5 on top, so a Mythic boss is about 2.1× tankier and swings 1.3× harder at 1.15× speed.

### A9. Combat pacing and tie-breaks
- PvP timer is 45 s (`COMBAT_LIMIT`); tie-break is the sum of HP fractions of survivors (`getWinner`, `engine.ts`). Wide boards of tanks are favoured on timeout. No measurement of how often fights time out exists.
- Mana: +12 per auto, +5 per hit taken, cast at 100 (`engine.ts:968`, `:1393`). Fast attackers cast about twice as often as slow ones, and ability bases do not account for it.
- Crit damage is a flat 0.8 (`engine.ts:697`); crit chance is uncapped (Trickster 3 + Split Mirror + Striker 4 exceed 100%).

### A10. Test coverage
- The only check is `npm run sim` (`src/game/matchSim.ts`), a rules assertion script. It cannot tell whether the game is fun, fair, or too fast. There is no test runner in `package.json`.
- The engine calls `Math.random` in 17 places across `src/game/**`, so nothing is reproducible.

## B. Design, motion, and styling

### B1. Styling is inline and untokened
- `GameScreen.tsx` is 1,543 lines with 156 inline `style={{}}` objects; the app has about 380 total. Colors are literal: `GameScreen.tsx` alone has 29 hard-coded `BONE` backgrounds or `#14120E` borders.
- Type sizes used: 7, 8, 9, 10, 11, 12, 13, 15, 17, 21, 22, 24, 26, 42 px. No scale.
- Animation durations are scattered literals: 0.2 s, 0.22 s, 0.3 s, 0.4 s, 0.5 s, 1 s, 1.3 s inline in TSX; 0.45 s / 0.5 s constants in `CombatFxLayer.tsx`; 700 ms / 1,300 ms / 1,100 ms / 500 ms timeouts in `useGame.ts:133,142,278,299`. No shared easing.

### B2. Dark theme is partially broken on the game screen
- `.phone.theme-dark` redefines `--om-*` tokens (`src/index.css:720`), but the game screen paints `background: BONE` on the bench slots, shop cards, shop panel, and overlay modal, and uses `INK`/`#14120E` borders directly. In dark mode the board area is dark while the shop and modals stay cream.

### B3. Missing feedback
- **Death**: units vanish the frame `alive` flips (`src.filter(u => u.alive !== false)` in the board render). No fall, fade, or marker.
- **Buy / place / sell / merge / roll**: no motion. Merge only shows a text pop (`applyMerges` → `pop`).
- **Gold**: number changes instantly; no count or flash.
- **Synergy activation**: chip color changes with no transition.
- **Fight start**: shop panel swaps to the combat bar instantly; no "FIGHT" beat, no boss introduction beyond a static banner.
- **Result**: HP bars tween 0.4 s but the modal stamps at the same time; damage is not shown as a number near the bar.
- **Screens**: Home → Modes → Build → Game swap instantly (`App.tsx` conditional render).

### B4. Combat readability
- Board shake fires on **any** crit from either side (`GameScreen.tsx:93–105`); with 35%-crit Anansi the board shakes almost continuously.
- The target of a hit has no flinch or flash; `HitFlash` is an overlay circle only.
- Unit movement animates `left`/`top` (`transition: 'left 0.3s, top 0.3s'`), which forces layout each step; `transform` is already in use for lunges and should carry position too.
- Star badge is 8 px text `★★★`; boss badge is 7 px. Under 34 px unit size these are illegible on a phone.

### B5. Rendering churn
- Each 100 ms tick calls `setCombatants([...eng.C])` and `setTick()`, re-rendering the 72-cell grid and every unit. The cell grid depends only on selection and occupancy and should be memoised.
- Every floater and FX item schedules its own `setTimeout` for removal (`useGame.ts:133,142`). Prune by age in the tick instead.

### B6. Touch targets and accessibility
- Game header back button is 24×24 (`GameScreen.tsx:139`). Bench slots are 36 px. Minimum should be 40 px hit area.
- Reduced motion is honoured via `!important` overrides (`index.css:981–1003`) rather than tokens, so every new animation needs a new override.

### B7. What is already good and should be kept
- The combat FX system (`combatFx.ts` profiles per hero, `CombatFxLayer.tsx` patterns) is rich and data-driven. It needs a shared duration source, not a rewrite.
- The home parade, the stamp entrance on modals, and the hard-shadow button press (`.btn-active:active`) are the identity. Reuse the `omStamp` easing as the app-wide "snap" easing.
- Settings already expose `reduceVfx`, `reduceMotion`, `darkMode`, `difficulty`, `defaultSpeed`.
