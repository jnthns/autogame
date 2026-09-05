# B6 report — three of eight bands hold; five are blocked upstream

B6 ran the tuning pass over the dials B1–B5 own. **Three of the eight targets in
`02-proposal.md` §1.7 hold on both seeds. Five do not, and none of the five can
be reached by moving a dial** — each is blocked by a structural cause already
written up in the phase report that found it. Per the stop condition, B6 does
not invent mechanics; this is the consolidated statement of where the overhaul
stands and what has to change next.

All numbers: `decent` policy, n = 1,000, seeds 1 and 7 (disjoint match sets —
`--seed` now strides by 100,003 so two seeds no longer share 99% of their runs).

## The scoreboard

| Metric | Band | seed 1 | seed 7 | |
|---|---|---|---|---|
| Median PvP fight length | 15–30 s | **16.3** | **16.3** | ✅ |
| PvP fights hitting the 45 s timer | < 10% | **2.3%** | **2.3%** | ✅ |
| `econ` within 10 points of `decent` (B3) | ≤ 10 | **3.4** | — | ✅ |
| Hyper Roll win rate, Mortal / Hard / Mythic | 55–65 / 35–45 / 15–25 | 19.1 / 1.6 / 0.0 | 20.2 / 1.8 / 0.1 | ❌ |
| Boss win rate (Mortal) r4 / r8 / r12 | 70–80 / 55–65 / 45–55 | 0.3 / 1.3 / 0.3 | 0.2 / 1.5 / 0.0 | ❌ |
| Ability share of damage | 35–45% | **19.8** | **19.6** | ❌ |
| Any hero's win-rate delta in draft vs not | ±6 points | spread **42.0** | — | ❌ |
| 3★ before round 4 | < 3% | **96.7** | **96.3** | ❌ |
| Gauntlet median bosses cleared | 10–14 | **3** | — | ❌ |

Policy ordering is sane, which says the game is at least coherent:
`decent 19.7 > econ 16.3 > greedy 9.0 > random 0.3`.

## What the dials were set to

| Dial | Range | Landed | Why |
|---|---|---|---|
| `HERO_HP_MUL` | [1.3, 1.8] | **1.8** | Longest fights and the only lever that helps a board survive a boss. |
| `A30_SCALE` (`BUDGET_A30` × k) | [0.8, 1.25] | **1.25** | Maximum ability share reachable. |
| `BOSS_HP_TEAM_MULT` | [7, 12] | **7** (min) | See B5-report. |
| `BOSS_DPS_BURN_SECONDS` | [30, 50] | **30** (min) | See B5-report. |
| `BOSS_BOARD_SURVIVAL` | [20, 32] | **32** (max) | See B5-report. |
| `BOSS_INCOMING_MULT` | [1.8, 2.8] | **2.8** (max) | See B5-report. |
| `FOE_SCALE` / `BOT_INCOME_BONUS` | — | as specified | Mortal is pinned at 1.0 / +0 by §1.5, so there is no Mortal win-rate lever here. |

The grid that settled `HERO_HP_MUL` and `A30_SCALE` (n = 300, seed 1):

| HP_MUL | A30_SCALE | win% | fight s | ability% |
|---|---|---|---|---|
| 1.8 | 0.80 | 17.7 | 16.3 | 15.6 |
| **1.8** | **1.25** | **22.0** | **16.1** | **20.0** |
| 1.6 | 1.25 | 23.3 | 15.1 | 19.2 |
| 1.3 | 1.25 | 27.3 | 12.7 | 18.9 |

`HP_MUL 1.3` wins more but drops fight length out of band, so it trades a met
band for an unmet one. The landed pair maximises band coverage.

## Why each unmet band is blocked, and what unblocks it

### Win rate (all three difficulties) — blocked by the boss bands

A boss loss costs `LOSS_BASE + 2×4 + 6`: 20 HP at round 4, 22 at round 8, 24 at
round 12. **Three boss rounds are 66 of the player's 100 HP**, and the player
loses ~99% of them. Matches end at a median of round 11 with the player dead.
No PvP dial can pay that back, and Mortal has no dial at all — `FOE_SCALE` and
`BOT_INCOME_BONUS` are both pinned at their identity values for Mortal by §1.5.

**Fix the boss bands first.** Win rate is downstream and will move on its own;
only then is it worth spending `FOE_SCALE` on Hard and Mythic, which currently
have no headroom to spread into (the B4 ordering band fails for the same reason).

### Boss win rate — blocked by the fit model (`B5-report.md`)

The pad term makes burn time at least `BOSS_DPS_BURN_SECONDS` (min 30 s) while
board survival is at most `BOSS_BOARD_SURVIVAL` (max 32 s), so the allowed
ranges overlap at a single point: a fight the board survives by two seconds. And
32 s prices autos only — the round-4 kit adds ~70 damage/second board-wide and
the measured first hero death is 8.7 s. Probing the kit down 89% (far outside
its ±20% dial) still reaches only 8% at round 4 and 0% at round 12.

**Needs:** budget the kit into the boss's total output, and let burn fall below
survival with real margin (`BOSS_DPS_BURN_SECONDS` ≈ 12–15, or
`BOSS_HP_TEAM_MULT` ≈ 3.5). Both are formula changes in `fitBossToTeam`.

### Ability share — blocked by the stat pass, not by the dial

B2 raised P by 15–40% across a roster that was mostly under budget, so autos got
much stronger while abilities were re-priced to a fixed A30. The dial is at its
ceiling and reaches 19.8 against a 35–45 target; the floor reaches 15.6, so the
whole `A30_SCALE` range spans four points of ability share.

**Needs:** either raise `BUDGET_A30` outright (the range should be [0.8, 2.5],
not [0.8, 1.25]), or make casts more frequent — `CASTS_PER_30S` assumes 12 mana
per auto, and mana gain is what actually decides the ratio.

### Hero delta — blocked by traits being unbudgeted, and it got worse

The spread is **42.0** (`griff +19.9 … kitsu −22.1`), up from 23.4 after B2. P
and A30 price a hero in isolation; Griffin and Golem sit on Guardian/Warden
stacks the budget never sees, and `HERO_HP_MUL 1.8` amplified exactly those HP
synergies. `budgetBias` is capped at ±0.10 — worth about 1 point of win rate.

**Needs:** a trait budget. No phase in this plan defines one. Until then this
band cannot be measured meaningfully either, because boss rounds contribute no
signal (see B5-report).

### 3★ before round 4 — blocked by there being no copy pool (`B1-report.md`)

A 6-hero draft can contain one hero for a whole cost tier, so a 70/30 odds row
hands out ~3.5 copies a roll; pair-collapse turns four copies into two 4-gold 2★
offers and `MERGE_COPIES = 2` merges those into a 3★. **8 gold, one roll, round
one.** No four-cell odds table can price that out.

**Needs:** a per-roll copy cap or a real copy pool. Both are new mechanics.

### Gauntlet median cleared — blocked by the boss bands

Every gauntlet round is a boss round, so a mode whose bosses are unwinnable
clears a median of 3. It is the boss fix, measured a second way.

## Recommended order for whoever picks this up

1. **Boss fit model** (B5-report §What would fix it). Unblocks the boss bands,
   the three win-rate bands, the B4 difficulty-ordering band and the gauntlet
   band — five of the eight — and nothing else moves until it lands.
2. **Copy pool** (B1-report §What would fix it). Unblocks the 3★ band and will
   move hero deltas, because a board that cannot instantly 3★ its cheapest hero
   drafts differently.
3. **Re-measure `REF_ANCHORS`** once matches routinely reach round 13. The
   round-12 anchor came from the 117 of 300 B4 matches still alive there, which
   is survivorship-biased and oversizes the round-12 boss.
4. **Widen `BUDGET_A30`**, then re-run this pass. Ability share is the one
   remaining band that is a genuine tuning problem rather than a structural one.

`docs/overhaul/baselines/final.json` and `final-{hard,mythic}-s{1,7}.json`,
`final-gauntlet.json` and `final-drafts.json` are the committed baselines behind
every number above.
