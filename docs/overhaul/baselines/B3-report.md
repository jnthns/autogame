# B3 report — interest is unreachable at this income scale

B3 landed the TFT-lite economy in full. One of its three acceptance bands is
met, one is met with a caveat, and one — `interest avg ≥ 8` — is **0.0** and
cannot be reached with any dial B3 owns.

## Landed

| Item | State |
|---|---|
| `INCOME_BASE`, `WIN_BONUS`, `INTEREST_PER/MAX`, `STREAK_GOLD` in economy.ts | ✅ |
| Signed `streak` / `foeStreak` replacing the two loss counters, `lastSurvivors` on state | ✅ |
| `incomeBreakdown()` driving player, bot, fast-forward and gauntlet income | ✅ |
| Loss damage from the **winner's** survivors, capped, with the boss surcharge | ✅ `tests/economy.test.ts` |
| `resolveRound(g, win, maxR, survivors)`, wired from `useGame` and `runMatch` | ✅ |
| `RELIC_ROUNDS`, win/loss pick counts, "ROUND LOST · A LESSER SPOIL" | ✅ |
| HUD income chip with a tap-to-expand breakdown | ✅ |
| `MATCH_DEFAULTS` and friends moved off `constants.ts` (B1 re-exports deleted) | ✅ |

## The bands

| Band | Result |
|---|---|
| `econ` within 10 points of `decent` | ✅ **4.3** (44.7 vs 49.0) — the economy is not a trap |
| `goldFlow avg` 125–145 | ❌ **66.7** |
| `interest avg ≥ 8` | ❌ **0.0** (`econ` policy: 0.2) |

`streakGold avg` is **5.9**, so the streak half of the economy works as designed.

## Why interest is zero

Income is 4–6 gold a round. A shop slot costs 2–8 and a reroll costs 2. A policy
that is still filling a board — which is every policy before round 10, because
the caps ramp to 10 units and the bench holds 8 — spends below 10 gold every
single round, so `floor(gold / 10)` is 0 when income is paid.

This is not the reference policy being greedy. The `econ` policy, which buys
only merges and cost-≤3 heroes and never rerolls before round 7, earns **0.2**.

Dials tried:

| Dial | interest avg (decent / econ) |
|---|---|
| as specified | 0.0 / 0.2 |
| `INCOME_BASE` +1 (5/6/7 — the full B3 range) | 0.0 / — |
| `INTEREST_PER` 10 → 5 (outside B3's dials, probed) | 0.2 / 1.8 |

Even halving the threshold leaves the reference policy at 0.2. The problem is
the ratio, not the threshold: `INTEREST_PER = 10` is TFT's number, and TFT pays
2–5 base income against a 50-gold bank. Here the whole match moves ~67 gold.

## What would fix it (for B6)

Interest only exists if *holding* gold can beat *spending* it for a round. Two
directions, both needing a dial B3 does not own:

1. **Raise the income scale and the prices together.** Roughly double
   `INCOME_BASE` (8/10/12) and leave `INTEREST_PER` at 10, so banking one round
   is a real choice. Also fixes `goldFlow avg`, which needs ~10/round to reach
   125–145 over 13 rounds.
2. **Drop `INTEREST_PER` to 4 and lift `INTEREST_MAX` to 4.** Cheaper, and it
   makes interest visible early, but it pays out in ones and reads as noise
   rather than as a decision.

Option 1 is the recommendation: it makes both unmet bands one dial, and the
`goldFlow` band is otherwise unreachable — the specified table tops out near
85 gold a match even if the player never spends.

Note `INCOME_BASE` +1 also moved Mortal win% from 49.0 to 57.0, into the 55–65
target band, so B6 should expect these two to move together.
