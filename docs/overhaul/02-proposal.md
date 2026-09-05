# 02 · Proposal: the ideal end state

This is the target the phases build toward. Numbers here are the *initial* values; Phase B6 tunes them inside the stated dial ranges until the sim hits its bands.

## 1. Balance and economy

### 1.1 Every hero is worth its cost
- A hero's **stat budget** P (hp × dmg × as × (1 + crit × 0.8), thousands) is set by cost: **2 → 13.5, 3 → 17.5, 4 → 22.5, 5 → 28.0**, ±8%. Ranged heroes pay a 0.92× range tax. Heroes whose ability is pure support (`abilityKind: 'support'`) get 1.05×.
- A hero's **ability budget** A30 (expected value over 30 s, normalised by cast rate) is set by cost: **2 → 800, 3 → 1,050, 4 → 1,300, 5 → 1,600**, ±15%.
- A hero may trade up to 10% between the two budgets (a weak-ability bruiser can sit at +10% stats, −10% ability) and the trade is recorded in `src/data/abilities.ts` as `budgetBias`.
- Ability numbers move out of the `switch` in `engine.ts` into `src/data/abilities.ts`, so tuning is data-only and the audit script can read them.

### 1.2 Merging is strong, not everything
- `STARMUL` becomes **[1, 1, 1.65, 2.6]**. Effective power 2.7× at 2★ (for 2× gold), 6.8× at 3★ (for 4× gold). Dial range: 2★ in [1.55, 1.75], 3★ in [2.4, 2.9].
- Shop cost gating becomes a **per-round odds table** across the whole draft (no hard cutoff), with tier fallback when the draft has no hero of the rolled tier. The default draft shows at least three distinct heroes in the opening rounds.

### 1.3 The economy has decisions
- **Income table** by round entered: 1–3: 4, 4–7: 5, 8+: 6. **Win bonus** +1.
- **Interest**: +1 per 10 gold banked, max +3 (30 gold).
- **Streak gold**: a win or loss streak of 2–3 pays +1, 4+ pays +2.
- **Sell**: 1★ refunds cost − 1 (min 1); 2★ refunds 2·cost − 1; 3★ refunds 3·cost (unchanged for 2★ and 3★).
- **Reroll** stays 2. Bench stays 8. Start gold stays 10. HP stays 100.
- About 130–140 gold flows through a match instead of 107, but a gold now has an opportunity cost.

### 1.4 Rewards and punishment are legible
- **Relics land on fixed rounds** (3, 6, 9, 11, plus boss rounds 8 and 12) regardless of result. Winners pick from 3, losers from 2. Both players can plan around them; the loser is not locked out.
- **Loss damage** = base by round (1–3: 4, 4–7: 6, 8–11: 8, 12+: 10) + 2 per surviving winner unit (cap 8 units). Losing narrowly costs 6; being wiped in round 13 costs 26. Streaks no longer add damage; they add gold (comeback).
- **Boss loss** = base + 6, no gold. Boss win = existing gold and free rolls.
- The HUD shows the next-round income breakdown ("+5 base · +1 win · +2 interest · +1 streak") so the reward is visible before the choice is made.

### 1.5 The opponent is fair and visible
- The bot receives relics on the same rounds and binds them to its highest-power unit.
- Difficulty is expressed as **bot income** (+0 / +1 / +2 per round) plus modest combat multipliers (HP 1 / 1.15 / 1.3, attack 1 / 1.10 / 1.20), instead of hidden 1.4× HP.
- Boss difficulty uses one lever: `BOSS_SCALE` (HP 1 / 1.2 / 1.45, attack 1 / 1.10 / 1.20, attack speed 1 / 1.05 / 1.10). The taken multiplier is a single constant.

### 1.6 Bosses reward growth
- Boss HP and attack are derived from a **reference board curve** by round, not from the live board. A player who out-grows the curve beats the boss faster; one who falls behind loses to it. The curve is calibrated from the sim's reference policy at rounds 4, 8, 12, 16 and interpolated.
- Boss kit numbers (`bossCast`) scale from the same curve so all three kits feel equally dangerous.
- Marathon uses the same curve with its 18-round caps; Gauntlet extrapolates the curve beyond round 12 at +9%/round (existing `roundMul`) and keeps lives, tolls, and exclusive relics.

### 1.7 Targets (measured, not asserted)
| Metric | Band |
|---|---|
| Hyper Roll win rate, `decent` policy, Mortal / Hard / Mythic | 55–65% / 35–45% / 15–25% |
| Median PvP fight length | 15–30 s game time |
| PvP fights reaching the 45 s timer | < 10% |
| Boss win rate (Mortal) rounds 4 / 8 / 12 | 70–80% / 55–65% / 45–55% |
| Ability share of total damage dealt (all heroes, Mortal) | 35–45% |
| Any single hero's win-rate delta when in draft vs not | within ±6 points |
| 3★ unit before round 4 | < 3% of matches |
| Gauntlet median bosses cleared (Mortal) | 10–14 |

## 2. Design and motion

### 2.1 One source of truth for style
- `src/styles/tokens.css` holds palette, semantic theme colors (light and dark), type scale, spacing, border widths, hard-shadow presets, z-index scale, and **motion tokens** (durations and easings).
- `src/styles/components.css` holds reusable classes (`.om-btn`, `.om-chip`, `.om-card`, `.om-bar`, `.om-shop-card`, `.om-modal`, …). Screens compose classes; inline styles are reserved for geometry computed at runtime (board percentages, FX angles).
- `scripts/check-styles.mjs` fails the build on hex literals or literal durations in component TSX. The lint is what keeps the next agent from drifting back to inline styles.
- Dark theme works everywhere because every surface color comes from a token.

### 2.2 A motion vocabulary
| Token | Value | Used for |
|---|---|---|
| `--dur-instant` | 80 ms | button press, hit flinch |
| `--dur-fast` | 140 ms | placement bounce, chip toggles, sell dissolve |
| `--dur-base` | 220 ms | unit movement, screen transitions, modal rise |
| `--dur-slow` | 360 ms | merge burst, HP bar drain, synergy activation |
| `--dur-deliberate` | 600 ms | fight-start stamp, result sequencing |
| `--dur-linger` | 1,300 ms | damage floaters |
| `--ease-out` | cubic-bezier(.2,.9,.3,1) | most exits and movement |
| `--ease-snap` | cubic-bezier(.2,.9,.3,1.2) | stamps, merges, anything "brutalist" |
| `--ease-in-out` | cubic-bezier(.6,0,.2,1) | bar fills |

Rules: user-triggered feedback finishes within `--dur-base`; combat FX within 500 ms; the only infinite animations on the game screen are the COMBAT pulse and the low-HP blink. Reduced motion sets every duration token to 0 ms except `--dur-linger` (350 ms), so no `!important` overrides are needed.

### 2.3 Every action answers back (plan phase)
- **Roll**: cards deal in with a 40 ms stagger.
- **Buy**: card punches, bench slot lands (scale 1.15 → 1), gold counter counts down with a spend flash.
- **Merge**: the merged unit bursts (scale 1.3 → 1 with a saffron ring), the star badge pops, the existing "★★" floater stays.
- **Place**: drop-in bounce. **Swap**: both units slide (they already do via position transition).
- **Sell**: gold floater at the bench slot and a gain flash on the counter.
- **Synergy tier reached**: chip pulses and fills.
- **Income preview** chip in the HUD updates live as gold changes.

### 2.4 Combat reads at a glance
- Attacker lunge (kept), **target flinch** (2 px recoil + brightness flash, 120 ms), **death** (drop 6 px, fade, 260 ms, then a rust ✕ marker for 600 ms), **heal** and **shield** rims, **low-HP blink** under 25%.
- Movement uses `transform` with `--dur-base`.
- Board shake is rate-limited (600 ms) and reserved for big hits (≥ 12% of target max HP) or player-side crits.
- Boss rounds open with a 900 ms **boss introduction** (name, kit line) before the engine starts.
- Fight start: shop panel collapses into the combat bar with a "FIGHT" stamp.
- Result: HP bar drains with a damage number, then the result modal stamps.

### 2.5 Screens feel connected
- Screen changes cross-fade and slide 12 px over `--dur-base`.
- Relic cards deal in; unlock cards on the game-over modal deal in.
- Touch targets are ≥ 40 px; star badges are pixel icons, not 8 px text.
- Optional haptics on buy, merge, and boss kill.

### 2.6 It stays fast
- Cell grid is memoised; floaters and FX are pruned by age inside the tick; no per-item timers.
- No long task over 50 ms during a 30 s combat at ×1 on a mid-range phone profile.
