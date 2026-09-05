# B5 report — the boss fit produces unwinnable fights by construction

B5 landed the absolute curve: bosses are now fitted to a measured reference
team for the round instead of to the live board, so growing your board makes a
boss easier rather than bigger. It also found and fixed the reason boss rounds
have read **0% at every difficulty since the S0 baseline** — but the boss win
bands are still unmet, and the cause is arithmetic in the specified fit model.

## Landed

| Item | State |
|---|---|
| `src/data/bossCurve.ts` — REF_ANCHORS measured from `b4.json`, `refTeam()` piecewise-linear, extrapolating past 16 | ✅ |
| `fitBossToTeam(foes, round, opts)` — the `allies` parameter is gone | ✅ |
| Kit magnitudes as `ref.avgHp × K` in `BOSS_KIT_SCALE` | ✅ |
| Gauntlet drops `power`; `boardPower` survives for the banner and score only | ✅ |
| `matchSim.ts`, `scripts/run-match-sim.ts` and the `sim` script deleted | ✅ |
| `tests/boss.test.ts`, including the independence invariant | ✅ |

### The bug that was hiding everything

`CombatEngine.dist()` measured Chebyshev distance between unit **centres**. The
centre of a 4×4 boss is 1.5 cells inside its own body, so no melee hero could
ever get within its attack range of 1 — the cells it would have to stand on are
the boss's own. **Half the roster dealt literally zero damage on every boss
round**, at every difficulty, since the 4×4 boss landed in `45e8227`.

`dist()` now measures between footprints. For 1×1 units the result is identical
to the old centre distance, so nothing about PvP combat changes; for the boss it
is the distance to its nearest occupied cell. Melee engage, ranged still hold
their 2-cell dead zone, and a boss now actually takes damage:

| Round | boss HP burned, before → after |
|---|---|
| 4 | 0% → 11% |
| 8 | 0% → 26% |

## The bands are still unmet

| Band | Target | Result |
|---|---|---|
| boss4 win% | 70–80 | **0.0** |
| boss8 win% | 55–65 | **0.7** |
| boss12 win% | 45–55 | **0.0** |
| Gauntlet median cleared | 10–14 | **3** |

Dials are at the most generous corner their stated ranges allow:
`BOSS_HP_TEAM_MULT = 7` (min), `BOSS_DPS_BURN_SECONDS = 30` (min),
`BOSS_BOARD_SURVIVAL = 32` (max), `BOSS_INCOMING_MULT = 2.8` (max).

## Why no dial reaches them

The fit model decides the fight before it starts. Two numbers:

- **Burn time** — how long the reference board needs to kill the boss:
  `hp / (ref.dps × BOSS_INCOMING_MULT)`. The `pad` term *raises* HP whenever
  that would come in under `BOSS_DPS_BURN_SECONDS`, so burn time is
  `max(BOSS_DPS_BURN_SECONDS, …)` — it can never be under **30 s**.
- **Board survival** — how long the board lasts: `BOSS_BOARD_SURVIVAL`, which
  the constant's own comment defines as *autos only*, capped at **32 s**.

The ranges the phase allows are `burn ∈ [30, 50]` and `survival ∈ [20, 32]`.
They overlap at exactly one point — burn 30 against survival 32 — so the best
case the model can express is a fight the board survives by two seconds. A 70%
win rate at round 4 needs burn to be roughly *half* survival.

And 32 s is optimistic, because it ignores the kit. At round 4 the Clay Colossus
slams for `avgHp × 0.27 = 250` board-wide; the boss reaches 100 mana every 3–4 s
(12 per auto plus 5 per hit taken from three heroes). That is ~70 damage/second
on top of the autos, against an average unit HP of 925. Measured first hero
death is **8.7 s**, not 32.

Probes, all with the dials at the corner above:

| Kit `slam` | boss4 | boss8 | boss12 |
|---|---|---|---|
| 0.27 (as specified) | 0.0 | 0.7 | 0.0 |
| 0.216 (−20%, the full B5 dial) | 0.0 | 1.5 | 0.0 |
| 0.14 (−48%, out of range) | 0.0 | 5.5 | 0.0 |
| 0.07 (−74%, out of range) | 3.5 | 31.5 | 0.0 |
| 0.03 (−89%, out of range) | 8.0 | 58.0 | 0.0 |

Even with the kit effectively deleted, round 4 reaches 8% and round 12 stays at
zero. The HP pool itself is the binding constraint at that point.

## What would fix it

Two changes, neither of which is a dial:

1. **Budget the kit into the boss's output.** `BOSS_BOARD_SURVIVAL` should mean
   "seconds for the boss's *whole* output to wipe an idle reference board", and
   `atk` should be solved for after subtracting expected cast damage over that
   window, rather than `ref.avgHp / (BOSS_AS × BOSS_BOARD_SURVIVAL)` which
   prices autos alone. One formula change in `fitBossToTeam`.
2. **Let burn go below survival with real margin.** Either widen
   `BOSS_DPS_BURN_SECONDS` down to ~12–15 or drop `BOSS_HP_TEAM_MULT` to ~3.5.
   With burn ≈ 15 s against a genuine 30 s survival, round 4 lands in band and
   the later rounds have room to be tuned by the round multiplier.

The round-12 anchor is also worth re-measuring: `REF_ANCHORS[12]` came from the
117 of 300 B4 matches that were still alive at round 12, which is a
survivorship-biased sample and overstates the typical board — and therefore
oversizes the round-12 boss. Re-derive it once matches routinely reach round 13.

Both are structural, so per the invariant in `README.md` §2 B5 stops here rather
than inventing them. B6 owns the tuning pass and cannot reach these bands
either; recommend taking change 1 and 2 together, with the owner's sign-off,
before B6 runs.
