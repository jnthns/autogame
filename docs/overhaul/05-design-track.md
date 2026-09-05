# 05 · Design track (D1–D6)

Identity is fixed (see README). These phases add tokens, structure, motion, feedback, and performance without changing a single gameplay number. Each phase ends with `npm run build`, `npm run check:styles`, and `npm run screens` (from D1 on) with a look at both themes.

---

## D1 · Tokens, style lint, dark-theme fix

**Files**: `src/styles/tokens.css` (new), `src/index.css` (import tokens at top; delete the `--om-*` blocks now in tokens; delete the `.phone.reduce-motion` `!important` block at the end), `scripts/check-styles.mjs` (new), `scripts/screens.mjs` (new), `src/hooks/useGame.ts` (URL debug: `?screen=`), `package.json`.

### D1.1 `tokens.css` (verbatim starting point)
```css
:root {
  /* Brand palette (fixed) */
  --om-ink: #14120e; --om-bone: #f2e9d4; --om-jade: #1b6b52; --om-saffron: #e8a317;
  --om-rust: #b4442b; --om-sky: #4c7bd1; --om-violet: #7a3e9d; --om-ember: #d0553a;
  --om-sand: #dfd3b6; --om-parchment: #e7dcc2; --om-dust: #cfc3a6; --om-stone: #8a8271;
  /* Type */
  --font-display: 'Alfa Slab One', serif;
  --font-body: 'Barlow Semi Condensed', system-ui, sans-serif;
  --font-mono: 'Space Mono', monospace;
  --text-2xs: 9px; --text-xs: 11px; --text-sm: 13px; --text-md: 15px; --text-lg: 17px;
  --text-xl: 21px; --text-2xl: 26px; --text-display: 42px;
  --track-wide: 0.1em; --track-wider: 0.14em;
  /* Space */
  --sp-1: 2px; --sp-2: 4px; --sp-3: 6px; --sp-4: 8px; --sp-5: 12px; --sp-6: 16px; --sp-7: 20px; --sp-8: 24px;
  /* Borders and hard shadows (no blur, no radius) */
  --bw-1: 1px; --bw-2: 2px; --bw-3: 3px;
  /* Motion */
  --dur-instant: 80ms; --dur-fast: 140ms; --dur-base: 220ms; --dur-slow: 360ms;
  --dur-deliberate: 600ms; --dur-linger: 1300ms;
  --ease-out: cubic-bezier(.2,.9,.3,1); --ease-snap: cubic-bezier(.2,.9,.3,1.2);
  --ease-in: cubic-bezier(.5,0,.9,.4); --ease-in-out: cubic-bezier(.6,0,.2,1);
  /* Layers */
  --z-board-bg: 0; --z-cells: 1; --z-unit: 10; --z-boss: 15; --z-unit-sel: 20; --z-fx: 27;
  --z-floater: 30; --z-banner: 31; --z-sheet: 40; --z-overlay: 50;
}
.phone {
  /* Semantic, light */
  --om-bg: var(--om-bone); --om-fg: var(--om-ink); --om-muted: #6b6455; --om-muted-2: var(--om-stone);
  --om-card: var(--om-bone); --om-surface-2: var(--om-parchment); --om-surface-3: var(--om-sand);
  --om-disabled: var(--om-dust); --om-line: var(--om-ink); --om-board: var(--om-sand); --om-synergy: var(--om-parchment);
  --om-hud-bg: var(--om-ink); --om-hud-fg: var(--om-bone); --om-hud-line: #6b6455;
  --om-good: var(--om-jade); --om-bad: var(--om-rust); --om-accent: var(--om-saffron); --om-info: var(--om-sky);
  --om-on-accent: var(--om-ink); --om-on-good: var(--om-bone); --om-on-bad: var(--om-bone);
  --shadow-hard-sm: 2px 2px 0 var(--om-line); --shadow-hard-md: 3px 3px 0 var(--om-line);
  --shadow-hard-lg: 5px 5px 0 var(--om-line); --shadow-hard-accent: 7px 7px 0 var(--om-accent);
}
.phone.theme-dark {
  --om-bg: #1a1610; --om-fg: var(--om-bone); --om-muted: #b8ad93; --om-muted-2: #8f8878;
  --om-card: #241e16; --om-surface-2: #2c2418; --om-surface-3: #332a1d; --om-disabled: #4a4234;
  --om-line: #c4b89a; --om-board: #2c2418; --om-synergy: #1f1b16;
  --om-hud-bg: #0e0d0a; --om-hud-fg: var(--om-bone); --om-hud-line: #4a4234;
}
.phone.reduce-motion {
  --dur-instant: 0ms; --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; --dur-deliberate: 0ms; --dur-linger: 350ms;
}
```
Rule: chips and buttons that sit on a **colored** background (saffron, jade, rust) always use `--om-ink` borders regardless of theme; surfaces use `--om-line`.

### D1.2 Style lint
`scripts/check-styles.mjs`: scan `src/components/**/*.tsx` and `src/App.tsx`. Fail on regex `#[0-9a-fA-F]{3,8}\b` and on `(animation|transition)\s*:\s*['"\`][^'"\`]*\d+(\.\d+)?m?s`. Allow-list (colors are data there): `src/components/CombatFxLayer.tsx`, `src/components/PixelSprite.tsx`, `src/components/BattlegroundPreview.tsx`, `src/components/BattlegroundBoardBackground.tsx`. `src/data/**` and `src/game/**` are not scanned. Script `"check:styles"`; also run in `prebuild`.

In D1 the lint runs in **report mode** (prints counts per file); D2 turns it strict. Also in D1: convert `src/data/constants.ts` color exports (`JADE`, `SAF`, …) into `var(--om-*)` strings so existing inline uses become theme-aware immediately (`export const JADE = 'var(--om-jade)'`). `costTone()` returns tokens too (`--om-violet`, `--om-rust`, `--om-jade`, `--om-muted`).

### D1.3 Dark theme fix (immediate, before D2)
Replace `background: BONE` / `INK` literals on the game screen surfaces (bench slots, shop panel, shop cards, synergy chips at level 0, overlay modal, sheet modal) with `var(--om-card)` / `var(--om-surface-2)` / `var(--om-hud-bg)`. The HUD header stays ink in both themes by design (`--om-hud-bg`).

### D1.4 Screenshot script
`scripts/screens.mjs` (Playwright, Chromium at `/opt/pw-browsers/chromium` or the default): builds are not required; start `vite` on a port, visit `?screen=home|modes|build|settings|game&mode=bot&round=8&phase=plan|combat&theme=dark|light`, viewport 390×844, save `screens/<name>-<theme>.png`. `useGame` reads `screen`, `mode`, `round`, `phase`, `theme` from the URL in dev only (`import.meta.env.DEV`); `phase=combat` calls `startCombat` after mount and pauses the timer at tick 40 for a stable frame. `/screens/` is already gitignored.

### Acceptance
- Both themes render the game screen with no cream panels in dark mode (screenshot check).
- `npm run check:styles` prints the per-file counts; `npm run build` passes.

---

## D2 · Component CSS and GameScreen split

**Files**: `src/styles/components.css` (new, imported by `index.css`), `src/components/game/*.tsx` (new), `src/components/screens/GameScreen.tsx` (shrinks to composition), `src/App.tsx` (imports), every screen (`HomeScreen`, `ModesScreen`, `BuildScreen`, `SettingsScreen`, `InspectModal`) migrated to classes.

### D2.1 Classes (names are the contract; later phases attach animations to them)
- Buttons: `.om-btn` (border `--bw-2`, font-body 700, uppercase, `--track-wide`), modifiers `--primary` (jade), `--danger` (rust), `--accent` (saffron), `--ghost`, `--sm`, `--lg` (display font, `--bw-3`, `--shadow-hard-md`), `--icon` (40×40 hit box, glyph centred). Press: `:active { transform: translate(3px,3px) }` for `--lg`, 2px otherwise (replaces `.btn-active`).
- Chips: `.om-chip`, `--active` (ink), `--tier2` (saffron), `--class-tier2` (sky), `--warn` (rust outline), `--muted`.
- Surfaces: `.om-panel` (bg `--om-card`, border `--bw-3`), `.om-card` (+ `--shadow-hard-lg`), `.om-card__banner` (colored header strip), `.om-modal__scrim`, `.om-modal` (`--shadow-hard-accent`, `omStamp`), `.om-sheet`.
- HUD: `.om-hud`, `.om-hud__title`, `.om-hud__stat`, `.om-hud__gold`, `.om-hud__income`, `.om-hud__lives`.
- Bars: `.om-bar` (track), `.om-bar__fill`, modifiers `--hp-me`, `--hp-foe`, `--mana`, `--unit` (5 px), `--unit-mana` (4 px).
- Board: `.om-board`, `.om-board__grid`, `.om-cell`, `.om-cell--mine`, `--foe`, `--drop` (selection target), `.om-unit` (positioned wrapper), `.om-unit__body` (button), `.om-unit--sel`, `--boss`, `--stunned`, `.om-badge-star`, `.om-badge-boss`, `.om-relic-strip`.
- Bench and shop: `.om-bench`, `.om-slot`, `.om-slot--empty`, `.om-shop`, `.om-shop-card`, `--sold`, `--locked`, `.om-shop-card__price`, `.om-shop-actions`.
- Text: `.slab`, `.mono`, `.om-muted` (existing), `.om-label` (2xs uppercase wide), `.om-body`.

### D2.2 Split
| New file | Contents from `GameScreen.tsx` |
|---|---|
| `game/GameHud.tsx` | header: back, round label, gold + income chip, cap, lives, HP bars |
| `game/SynergyBar.tsx` | trait/class chips |
| `game/Board.tsx` | grid, unit layer, FX layer, floaters, banners |
| `game/BoardUnit.tsx` | one unit (sprite, badges, bars) |
| `game/CellGrid.tsx` | the 72 cells, `React.memo` on `(selKey, occupiedKey)` |
| `game/Bench.tsx` | slots + Info/Sell |
| `game/Shop.tsx` | cards + Roll/Fight |
| `game/CombatBar.tsx` | COMBAT pulse, speed toggle |
| `game/OverlayModal.tsx` | moved verbatim |
| `game/SheetModal.tsx` | moved with `SheetHeader`, `StatBox`, `TraitCardBlock` |

`GameScreen.tsx` ends ≤ 200 lines: computes `src` combatants, owns `sellArmed`/`boardShake`, composes the above.

### D2.3 Migration rule
A component is done when it has zero hex literals, zero inline durations, and inline `style` only for runtime geometry (percent positions, widths from HP fractions, FX transforms). `check-styles` goes strict at the end of D2.

### Acceptance
- `npm run check:styles` strict passes.
- Screenshots before/after D2 are visually identical in light mode except intended dark-mode fixes (compare by eye; pixel diff is not required).
- `GameScreen.tsx` ≤ 200 lines; no file under `src/components` > 500 lines.

---

## D3 · Motion system and plan-phase feedback

**Files**: `src/game/uiEvents.ts` (new), `src/hooks/useGame.ts`, `src/hooks/useCountUp.ts` (new), `src/styles/motion.css` (new: all `@keyframes` moved here from `index.css`), `game/Shop.tsx`, `game/Bench.tsx`, `game/BoardUnit.tsx`, `game/GameHud.tsx`, `game/SynergyBar.tsx`.

### D3.1 UI event bus
```ts
export type UiEvent =
  | { kind: 'roll' } | { kind: 'buy'; hid: string; benchIndex: number }
  | { kind: 'merge'; u: string; star: 2 | 3; where: 'board' | 'bench'; r?: number; c?: number; index?: number }
  | { kind: 'place'; u: string } | { kind: 'sell'; benchIndex: number | null; gold: number }
  | { kind: 'gold'; from: number; to: number } | { kind: 'synergy'; name: string; lvl: number }
  | { kind: 'fight' } | { kind: 'bossIntro'; name: string; kit: string };
export interface StampedUiEvent { e: UiEvent; t: number; k: string }
```
`useGame` keeps `uiEvents: StampedUiEvent[]`, appends from `buy`, `reroll`, `sell`, `tapCell`/`tapUnit` (place), `applyMerges`/`mergeUnits` callback (merge), and a `gold` diff after every `syncGame`; prunes entries older than 1,500 ms on the next `syncGame` or tick. Components derive classes with `recent(uiEvents, kind, predicate, maxAgeMs)`.

### D3.2 Choreography (class → keyframe → tokens)
| Trigger | Element | Class | Motion | Duration / easing |
|---|---|---|---|---|
| roll | each `.om-shop-card` | `--deal` | translateY(8px)→0, opacity 0→1, `animation-delay: calc(var(--i) * 40ms)` | `--dur-base` / `--ease-out` |
| buy | the tapped card | `--punch` | scale .96→1 | `--dur-instant` / `--ease-out` |
| buy | landing `.om-slot` | `--land` | scale 1.15→1 | `--dur-fast` / `--ease-snap` |
| merge | `.om-unit` or `.om-slot` | `--merge` | scale 1.3→1 plus a `::after` saffron ring expanding 1→1.8 and fading | `--dur-slow` / `--ease-snap` |
| merge | `.om-badge-star` | `--pop` | scale 1.6→1 | `--dur-fast` / `--ease-snap` |
| place | `.om-unit` | `--placed` | translateY(-6px)→0 | `--dur-fast` / `--ease-snap` |
| sell | floater at slot | reuse floater `heal` variant text `+◈n` | existing float | `--dur-linger` |
| gold change | `.om-hud__gold` | `--gain` / `--spend` | background flash jade/rust → none; number tweens via `useCountUp(value, 300)` | `--dur-slow` / `--ease-out` |
| synergy lvl up | `.om-chip` | `--activated` | scale 1→1.08→1 with fill | `--dur-slow` / `--ease-snap` |
| can't afford / bench full | `.om-shop-card--locked` | `--shake` | translateX ±3px ×2 | `--dur-fast` |

Rules: attach the class only while the event is `recent`; clear with `onAnimationEnd` or the prune. Never animate `left`/`top`/`width` for these; use `transform` and `opacity` only (bars excepted).

### D3.3 Income chip
`GameHud` shows `.om-hud__income` = "+N" from `incomeBreakdown` (B3). Tap toggles a small `.om-panel` popover with the four lines. Updates on every gold change (interest preview).

### Acceptance
- Every row in the table is observable in `npm run screens` (add `?event=merge` etc. debug triggers) or by hand in dev.
- No `setTimeout` is added for animation cleanup; `check:styles` strict passes; reduced motion shows no movement (tokens at 0) but state changes still land.

---

## D4 · Combat choreography

**Files**: `game/Board.tsx`, `game/BoardUnit.tsx`, `game/CellGrid.tsx`, `src/hooks/useGame.ts` (pruning, shake gate), `src/components/CombatFxLayer.tsx` (durations from tokens), `src/styles/motion.css`.

### D4.1 Positioning via transform
`.om-unit` wrapper: `width: calc(fp × var(--cell-w)); height: calc(fp × var(--cell-h)); transform: translate(calc(c/fp × 100%), calc(r/fp × 100%)); transition: transform var(--dur-base) var(--ease-out)`. `--cell-w`/`--cell-h` are set on `.om-board` as percentages of its size. The inner `.om-unit__body` keeps the lunge transform (existing `getLungeTransform`).

### D4.2 Reactions (derived from `combatFx` and combatant diffs, no engine changes)
| Cue | Detection | Class | Motion |
|---|---|---|---|
| hit flinch | fx with `toR/toC` at this unit, age < 200 ms, kind ≠ cast | `.om-unit__body--hit` | translate 2 px away from `fromR/fromC` + `filter: brightness(1.6)` | `--dur-instant` |
| crit hit | same with `kind === 'crit'` | `--hit-crit` | 3 px + brightness 2 + saffron outline | `--dur-fast` |
| death | unit present last tick, `alive === false` now → `Board` keeps a `dying` map `{u → t}` for 900 ms | `--dying` then `.om-unit--dead-mark` | drop 6 px + fade over `--dur-slow`; then a rust ✕ `.om-badge` for 600 ms | |
| heal | floater variant `heal` at this cell, age < 250 ms | `--healed` | jade rim flash | `--dur-base` |
| shield | `shield > 0` | `--shielded` | 1 px sky outline (static) | |
| low HP | `hp / maxHp < 0.25` | `--critical` | `.om-bar__fill` opacity .6↔1 | 600 ms infinite (allowed) |
| stun | `stun > 0` (exists as boxShadow) | `--stunned` | sky outline + ⟲ badge | |
| cast | fx kind `cast` from this unit, age < 400 ms | `--casting` | `::after` ring in the hero's `ring` color from `getFxProfile` | `--dur-slow` |

### D4.3 Board shake gate
In `Board`: shake only when a new fx is `crit` **and** (`fromSide === 'me'` or the floater amount ≥ 12% of target `maxHp`); minimum 600 ms between shakes. `combatFx` payload gains `side: 'me' | 'foe'` and `amount` (engine `emitFx` already has `src` and `dmg` in scope; add the two fields to `CombatFxPayload`; this is a data-only engine touch).

### D4.4 Pruning and memo
- Remove the per-item `setTimeout`s in `useGame.pop` and `spawnFx`. Prune inside the combat `setInterval` (`now − t > TTL`) and, outside combat, in a single 250 ms interval that runs only while `floaters.length || combatFx.length || uiEvents.length`.
- `CellGrid` is `React.memo` keyed on `selKey` (`g.sel?.u ?? ''`), `occupiedKey` (sorted occupied indices joined), and `plan`.
- `CombatFxLayer` durations read `--dur-*` tokens (`BOLT_DUR` → `var(--dur-slow)` etc.).

### Acceptance
- A 30 s Mortal round-8 combat at ×1 shows no long task > 50 ms in a Playwright `performance` trace on desktop Chromium (script `npm run perf:combat`, added here).
- Deaths never pop instantly; shake fires at most once per 600 ms.

---

## D5 · Round flow, boss intro, screen transitions

**Files**: `src/hooks/useGame.ts` (`startCombat` sequencing, `resolveCombat` delay), `game/Shop.tsx` → `CombatBar.tsx` swap, `game/Board.tsx` (intro overlay), `game/GameHud.tsx` (bar drain + damage number), `game/OverlayModal.tsx` (relic and unlock deal-in), `src/App.tsx` + `src/components/ScreenFrame.tsx` (new).

### D5.1 Fight start
`startCombat`: emit `{kind:'fight'}`; the shop panel gets `.om-shop--collapse` (max-height → 0 over `--dur-base`), the combat bar `.om-combat-bar--enter` (rise); a "FIGHT" `.om-stamp` (existing `omStamp`, `--dur-deliberate`) sits over the board. The engine timer starts after `FIGHT_INTRO_MS = 400` (constant in `src/data/ui.ts`, new; UI timings live there, not in gameplay constants).

### D5.2 Boss intro
On boss rounds, before FIGHT: `{kind:'bossIntro', name, kit}`; `.om-boss-intro` scrim (opacity .35) with the boss name in display type and the kit banner line, `BOSS_INTRO_MS = 900`; the boss sprite gets `--boss-rise` (scale .9→1). Total delay before the engine starts is `BOSS_INTRO_MS + FIGHT_INTRO_MS`. Skippable by tap.

### D5.3 Result sequence
`resolveCombat` today waits 500 ms then shows the modal. New: `RESULT_DELAY_MS = 500` (existing), then `gameActions.resolveRound`, then set `pendingResult` for `BAR_DRAIN_MS = 360` during which `GameHud` animates the losing bar (`transition: width var(--dur-slow) var(--ease-in-out)`) and shows a `-N` floater beside it, **then** the modal. Modal keeps `omStamp`. Relic cards and unlock cards inside the modal deal in (`.om-relic-card--deal`, 60 ms stagger).

### D5.4 Screen transitions
`ScreenFrame`: `<div key={screen} className="om-screen om-screen--enter">` with opacity 0→1 and translateX(12px→0) over `--dur-base`. No exit animation (avoids double-mounted state).

### Acceptance
- Boss rounds show the intro; PvP rounds do not; tapping skips.
- The result modal never appears before the bar finishes draining.
- Screen swaps animate; reduced motion collapses all of it to instant.

---

## D6 · Polish, accessibility, verification

**Files**: `game/BoardUnit.tsx` (badges), `game/GameHud.tsx` (back button), `game/Bench.tsx`, `src/data/settings.ts` (`haptics`), `SettingsScreen.tsx`, `scripts/screens.mjs`, `scripts/perf-combat.mjs`.

- **Star badges**: replace text `★` with `.om-badge-star > i` pixel stars (5×5 px each, saffron for 3★, bone for 2★, dust for 1★), 1 px ink outline; legible at 30 px units.
- **Boss badge** ≥ 9 px display type.
- **Touch targets**: HUD back button hit box 40×40 (visual 24 via padding); bench slots `min-width: 40px`; shop cards already ≥ 56 px tall.
- **Haptics**: `settings.haptics` (default true); `navigator.vibrate?.(10)` on buy/merge, `(25)` on boss kill; guarded by feature detection.
- **Reduced motion** is token-driven only; delete any remaining `!important` overrides.
- **Contrast**: chips on saffron use ink text; muted text ≥ 4.5:1 on both themes (check the four muted tokens against `--om-bg` and `--om-card`).
- **Verification bundle**: `npm run screens` (both themes, 7 states), `npm run perf:combat`, `npm run check:styles`, `npm run build`. Attach the screenshots to the D6 PR.

### Acceptance
- All of §2 in `02-proposal.md` is observable in the screenshots or by hand.
- No file under `src/components` contains a hex literal or inline duration (lint strict).
- `README.md` of the repo gains a "Design system" paragraph pointing at `tokens.css`, `components.css`, `motion.css`, and this folder.
