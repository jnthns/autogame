# B1 report — the `3★ < r4` band is not reachable by shop odds

`04-balance-track.md` §B1 asks for `3★<r4 %` under 3% with the default draft.
B1 landed everything else it specifies; this band is **unmet at 96.7%** (was
100% before the phase). Per the invariant in `README.md` §2, B1 stops and
reports here rather than inventing a mechanic.

## What was tried

| Dial | Value | `3★<r4 %` |
|---|---|---|
| `SHOP_ODDS` as specified | rows 1–2 `[70,30,0,0]`, rows 3–4 `[55,35,10,0]` | 96.7 |
| −10 points on the cheap cell (the full range B1 allows) | rows 1–2 `[60,40,0,0]`, rows 3–4 `[45,45,10,0]` | 95.0 |

Every other B1 acceptance item passes; the shipped table is the specified one.

## Why the odds cannot move it

Measured over 100 matches with `DEFAULT_DRAFT` and the `decent` policy, the
first 3★ appears at a **median of round 2, minimum round 1**.

The chain is arithmetic, and every link is a rule the README locks:

1. The player draft is **6 heroes** (`USER_DRAFT_MAX`). `DEFAULT_DRAFT` has
   exactly **one** cost-2 hero (Anansi), so the cost-2 pool is a single hero.
   A tier roll that lands on cost-2 *always* returns Anansi, whatever the row
   says — the odds decide how often a tier comes up, never which hero inside it.
2. The shop rolls **5 slots**, so a 70/30 row yields ~3.5 Anansi per roll and
   the −10 dial yields ~3.
3. **Shop pair-collapse** (`c285056`) turns each duplicate pair into one 2★
   offer at 2× price. Four copies in one roll therefore arrive as **two 2★
   offers, 4 gold each**.
4. **`MERGE_COPIES = 2`** (`45e8227`) merges those two 2★ into a 3★.

Total: **8 gold, one roll, round 1** — inside the 10 gold a match starts with.
No row in a four-cell odds table can price that out, because the degeneracy is
in the *pool*, not the *tier distribution*.

## Suspected structural cause

There is no **copy pool**. TFT-likes cap the number of copies of each unit that
exist across the lobby; here the shop can hand out unlimited copies of the one
hero occupying a tier. With a 6-hero draft the draft itself concentrates the
pool, and the 2-copy merge rule shortens the ladder from 9 copies to 4.

## What would fix it (for whoever owns the rule)

Roughly in order of how little they disturb the locked rules:

1. **Per-hero copies per roll.** Cap how many copies of one hero a single roll
   may contain (2 collapsing to one 2★ offer, never 4). Pure `rollShopOffers`
   data; no new state.
2. **A copy pool.** `COPIES_BY_COST = { 2: 12, 3: 10, 4: 8, 5: 6 }`, decremented
   on buy and returned on sell. This is the real fix and the one every game in
   the genre uses; it needs a pool on `GameState`.
3. **Draft minimums.** Require the draft to span at least three cost tiers, so
   no tier is ever a single hero. Cheapest to build, weakest effect — it does
   not help a two-hero tier either.

All three are new mechanics, so none belongs to B1. Recommend folding option 1
or 2 into B6 as an explicit rule change with the owner's sign-off.

## The rest of B1

| Item | State |
|---|---|
| `SHOP_ODDS` table, rows sum to 100, cost-5 gated before round 5 | ✅ `tests/shop.test.ts` |
| Per-slot tier roll with −1/+1/−2/+2/−3 fallback | ✅ |
| `shopWeight` / `maxShopCost` deleted, bot uses the same roller | ✅ |
| 1★ sell tax `max(1, cost − 1)` | ✅ |
| `SLOW START` draft warning chip | ✅ |
| Win rates recorded (no band until B6) | Mortal 75.7 · Hard 46.3 · Mythic 12.3 |
| `abilityShare%` | 15.0 → 32.5 (target 35–45 in B6) |
