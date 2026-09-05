# B7 report — the two rule changes, and where the bands landed

B7 takes the two structural changes `B6-report.md` said were needed but that no
dial in the plan could reach: the boss fit model, and a copy pool. Both are new
rules rather than dials, taken deliberately and with the owner's sign-off.

**Result: 5 of the 8 targets in `02-proposal.md` §1.7 now hold, up from 3, and
the two that were catastrophically broken — every boss unwinnable, the gauntlet
clearing 3 — are fixed.** Two bands remain unmet and one regressed; all three
are named below with what they would cost to fix.

## The scoreboard

`decent` policy, n = 1,000, seeds 1 and 7 (disjoint match sets).

| Metric | Band | seed 1 | seed 7 | |
|---|---|---|---|---|
| Win rate, Mortal | 55–65 | **64.4** | 67.4 | ✅ |
| Win rate, Hard | 35–45 | **40.7** | **43.0** | ✅ |
| Win rate, Mythic | 15–25 | **17.1** | **17.6** | ✅ |
| Median PvP fight | 15–30 s | **16.3** | **15.9** | ✅ |
| PvP fights hitting the timer | < 10% | **4.2%** | **4.1%** | ✅ |
| Ability share of damage | 35–45% | **37.3** | **37.3** | ✅ |
| Gauntlet median bosses cleared | 10–14 | **11** | — | ✅ |
| Boss win rate, r4 / r8 / r12 | 70–80 / 55–65 / 45–55 | 68.2 / 71.3 / **46.0** | 68.7 / 72.2 / **44.7** | ⚠️ 1 of 3 |
| Hero win-rate delta in draft vs not | ±6 points | spread **31.9** | — | ❌ |
| 3★ before round 4 | < 3% | **91.3** | **91.0** | ❌ |

Before B7, for comparison: Mortal 19.1, Hard 1.6, Mythic 0.0, bosses
0.3 / 1.3 / 0.3, gauntlet 3, ability share 19.8.

Policy ordering stays sane: `decent 65.8 > econ 44.8 > greedy 40.3 > random 1.3`.

## Change 1 — the boss fit model

The old model priced the boss's **autos only** against board survival, while
its kit did three times as much damage, unbudgeted. And the `pad` term forced
burn time to at least `BOSS_DPS_BURN_SECONDS`, whose allowed range overlapped
`BOSS_BOARD_SURVIVAL` at a single point. Every boss was unwinnable by
construction.

Now:

- `BOSS_BOARD_SURVIVAL` (30 s) means what it says — seconds for the boss's
  **whole** output to wipe an idle reference board. `BOSS_AUTO_SHARE` (0.55)
  splits that between the board-wide autos and the kit, and the kit's share is
  spread over `BOSS_CAST_PERIOD_SECONDS` (7.5 s, measured over 30 seeded fights
  at 8.7 / 7.1 / 7.2 s for rounds 4 / 8 / 12).
- `BOSS_KIT_SCALE.slam` stopped being an absolute fraction of unit HP and became
  a **relative weight around 1.0**. Since each boss round uses a different kit,
  those weights are the only per-round difficulty lever there is, so they are
  dialled ±30% rather than ±20%.
- The pad is gone. HP is simply what the reference board burns down in
  `BOSS_BURN_SECONDS` (19 s), times the round multiplier. That is comfortably
  under survival, and the gap between the two *is* the boss win rate.

Three things fell out of doing this properly:

1. **The World Coil's burning ground was worth more than its own slam.** It was
   a flat 5% of unit HP per second for 4 seconds — 280 damage against a 173
   slam. It is now a `burnShare` of the kit's budget (0.4), taken *out of* the
   slam rather than added on top. This alone was the round-12 cliff: r12 went
   from 0.6% to 80% in one change.
2. **The Storm Court had no defensive layer at all.** Its kit shields *allies*,
   and the locked solo-boss rule means it has none, so the ward evaporated every
   cast. It now wards itself when it fights alone, which is what its ability
   text says it does.
3. **`ref.dps` counts auto-attacks only.** With abilities at 37% of damage, the
   HP fit was quietly a third too small. `REF_ABILITY_UPLIFT` (1.6) makes that
   explicit, so `BOSS_BURN_SECONDS` means real seconds and raising the ability
   budget no longer silently makes bosses easier.

`REF_ANCHORS` was also re-derived twice — the curve is self-referential, since
bosses are fitted to it and it is measured against them, so it was iterated
until the anchors stopped moving. The round-12 anchor now comes from a 60%
sample rather than the survivorship-biased 39% B5 had.

## Change 2 — the copy pool

`COPIES_BY_COST = { 2: 12, 3: 10, 4: 8, 5: 6 }`, held on `GameState.pool` and
**shared between the player and the bot**: a hero the bot is buying genuinely
dries up for you. Buying takes 1 copy for a 1★ offer and 2 for a 2★; selling
returns 1, 2 or 4 by star. Practice is exempt (`pool: null`) — with 999 gold and
free rolls it would drain the pool in six rolls and stop being a sandbox.

Plus `MAX_COPIES_PER_ROLL = 2`: one roll may show at most two copies of a hero,
which collapse into a single 2★ offer. The pool alone does not stop the opening
degeneracy — a 6-hero draft can put one hero in a whole cost tier, so a 70/30
odds row would still hand out ~3.5 copies in one roll.

## The three that did not land

### `3★ before round 4` — 91.3%, band < 3%

The per-roll cap kills the *one-roll* 3★, but not the *one-round* 3★: with 10
starting gold you can buy a 4-gold 2★ offer, reroll for 2, and buy a second, and
that is a 3★ on round one for exactly 10 gold.

The only thing that stops it is capping the roll at **one** copy — which
measured `3★<r4` at **19.0%** and ability share at 43.9%, but drops Mortal win
rate to 38.7% and, more importantly, **disables shop pair-collapse entirely**.
That rule is locked by `c285056` and the plan's README says not to re-litigate
it, so B7 keeps the cap at 2 and leaves this band unmet. It is a genuine
either/or for the owner: pair-collapse, or the 3★ band — not both.

### Hero delta spread — 31.9, band ±6 (spread ≤ 12)

Down from 42.0 but nowhere near band. Unchanged diagnosis from B6: P and A30
price a hero in isolation, and Griffin, Golem and Taniwha (+11.6, +11.4, +10.2)
all sit on Guardian/Warden stacks the budget never sees, while Kitsune (−20.3)
is a crit-scaling hero whose payoff the budget cannot express either. **This
needs a trait budget, which no phase in the plan defines.**

### `econ` within 10 points of `decent` — regressed from 3.4 to 21.0

A B3 band that used to hold. The copy pool and the winnable bosses both reward
committing to a board, which is exactly what the `econ` policy declines to do.
Worth a look before calling the economy finished — the risk is that banking gold
is now strictly worse than spending it, which was the trap B3 set out to avoid.
It is a policy-level measurement, not a crash, so it does not block shipping.

## Dials as landed

| Dial | Value | Note |
|---|---|---|
| `BOSS_BURN_SECONDS` | 19 | Real seconds now that the uplift is explicit |
| `BOSS_BOARD_SURVIVAL` | 30 | Total output, not autos |
| `BOSS_AUTO_SHARE` | 0.55 | |
| `BOSS_CAST_PERIOD_SECONDS` | 7.5 | Measured |
| `ROUND_MUL_RANKED` | 0.025 | Was 0.04; the curve already carries most growth |
| `BOSS_KIT_SCALE` clay / storm / coil | 0.72 / 1.15 / 1.1 | The per-round difficulty lever |
| `A30_SCALE` | 2.0 | Beyond the plan's [0.8, 1.25]; B6-report recommended widening it |
| `HERO_HP_MUL` | 1.8 | Unchanged from B6 |
| `FOE_SCALE` hard / mythic | 1.10/1.06 · 1.18/1.10 | Retuned for the difficulty bands |
| `COPIES_BY_COST` | 12/10/8/6 | |
| `MAX_COPIES_PER_ROLL` | 2 | |

Anansi joins `A30_UNREACHABLE` alongside Anzû and Coyote: its ability is pure
control, so no magnitude feeds its value, and doubling the ability targets put
it 45% under. The retune deliberately never touches durations.

Baselines: `final.json`, `final-{normal,hard,mythic}-s{1,7}.json`,
`final-gauntlet.json`, `final-drafts.json`.
