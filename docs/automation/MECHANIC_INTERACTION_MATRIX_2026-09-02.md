# Mechanic interaction matrix — 2026-09-02

**Auditor:** Mechanic Interaction Matrix Auditor  
**HEAD:** `58302bc` (after #258 GameKey shop / #255 persist cluster / #250 combat parity / #246 destack)  
**Gameplay code:** not modified.

Pairs are scored only when current source shows a real join. “Watch enemy cast → unlock spell” still does not exist (`ownedSpells` = starter ∪ backend catalog). Drain self-heal vs `no_healing` remains design unless product says otherwise. Attack Nearest origin is **player tile** on purpose (`attackNearestLiveCasterPos`); do not treat that as summon-control drift.

## Priority surfaces (changed since 2026-09-01 matrix on `dd275aa`)

| Merge / surface | Why it matters for pairs |
| :--- | :--- |
| #258 GameKey shop | New Doka credit path on the persist lock; HUD shop stays live in battle / recap |
| #256 / #183 death replay | Unpaid 20/40 honoured on portal / pickup / `saveBattleStats`; GameKey credit was not in that set |
| #246 destack / leftover islands | Battle-start `findBattleStartCell` teleports units; `isCellFree` has no hazard axis |
| #256 dual-path vacate | Controlled + AI unseal **slides** onto a nearest free cell |
| #232 / #256 Pacifist preview | Range paint no longer fails the feat; summon-kill leftover remains |
| #234 BuffShop `healUsed` | Potions fail no-heal; Wisp / summon `heal` still does not |
| #211 / #243 recap + leftover walk | Overlay **and** `victoryPersistPending` now gate canvas + RAF + `shouldAllowBattleTrigger` |
| #239 enemy AI walk commit | Enemy landing pays lava/ice/spikes; player-side summon AI still does not |
| #250 highlight / live gate | Preview === execute for casts; walk path is still a second A* |
| Draft **#259** | EOP GameKey stables — backend only; do not clone |

## Still OPEN from prior matrices (do not re-file)

| ID | Pair | Status on `58302bc` |
| :--- | :--- | :--- |
| MIMA-2026-08-31-001 | Swap × lava/ice/rift/thorns | `swapPositions` 9436–9448 still copies coords only |
| MIMA-2026-08-31-002 | Controlled-summon walk × **hazards** | Dest occupancy **closed** (`resolveControlledSummonMoveDest`). Instant teleport + no landing remain. MP is still `findPath.length` (1×) |
| MIMA-2026-08-31-005 | Push/pull × hazards | Occupancy **tests exist** (`occupancy.passability.test.ts`). Still **zero** `resolvePlayerCast` call sites. REPORT_ONLY |
| MIMA-2026-08-31-008 | AI/summon × Void Rift **walk** tile | Player-side summons now pay turn-start `VOID_RIFT_TICK` (14573–14599). Walk-on-tile extra is still player-walk-only; `voidRiftTile` is not in `hazardTiles` |
| MIMA-2026-09-01-001 | Frozen/Slime preview 2× vs execute 1× | Highlight `applyMpCost` 7118–7124; debit `const cost = path.length` 10663 / 11278. Hover Manhattan 8574–8582. Summon-control still uses **player** `currentBattleMp` |
| MIMA-2026-09-01-002 | Barrier / occupants × player walk path | `getMpReachableTiles` skips barriers 7143, not occupants. `findPath` 4427–4528 still walls/void/portals only. Stepper writes intermediates 11404–11412 |
| MIMA-2026-09-01-005 | no_healing × Wisp / summon heal | Potion path closed. Both `heal` callbacks 9238–9253 / 15104–15119 still skip `challengeHealUsedRef` |
| MIMA-2026-09-01-006 | Summon AI walk × lava/ice/spikes | `decideSummonAction` never calls `filterHazardCandidates` (only enemy `stepAway` 604). `mpCostPerTile: 1` 15317. No landing block |

## Closed since last matrix (do not re-open)

| ID | Pair | Closed by |
| :--- | :--- | :--- |
| 09-01-003 preview half | Pacifist × range highlight | #232 / `shouldApplyHealBuffSideEffectOnRangePreview` |
| 09-01-004 | Recap dismiss × pending `applyRewards` | `victoryPersistPendingRef` at both canvas gates + `shouldAllowBattleTrigger` 11904 |
| 08-31-002 occupancy half | Controlled summon × stack on player | `resolveControlledSummonMoveDest` + tests |
| BuffShop potions | no_healing × item heal | #234 `recordChallengeItemHealUsed` |
| Leftover walk × lava recap | In-flight RAF after victory | #243 `shouldAbortMovementRaf` |

## Matrix (evidence-backed)

| Pair | Should | Do (on `main`) | Gap |
| :--- | :--- | :--- | :--- |
| Frozen Terrain × enemy/summon AI reach | Same 2× as Slime Flood | `isSlimeFlood ? 2 : 1` only | [001](./ACTION_IDS_MIMA_2026-09-02.md) |
| Battle-start destack × lava/spikes/ice | Avoid or land | `isCellFree` only | [002](./ACTION_IDS_MIMA_2026-09-02.md) |
| Unseal slide × lava | Same landing as walk | Nearest free cell, no hazard | [002](./ACTION_IDS_MIMA_2026-09-02.md) |
| GameKey redeem × unpaid death 20/40 | Honour pending cut | Shop commit is raw canister Doka | [003](./ACTION_IDS_MIMA_2026-09-02.md) |
| Boss VOID_TILES × walk / occupancy | Pass-through damage **or** block | `newVoidTiles` unused; type `"void"` ignored | [004](./ACTION_IDS_MIMA_2026-09-02.md) |
| Pacifist × player-side summon damage | Fail feat | Ref stays true | [005](./ACTION_IDS_MIMA_2026-09-02.md) |
| Twin Monarchs Dawn +10 × healing | Apply HP **or** silent | Log only (`damageToPlayer > 0`) | [006](./ACTION_IDS_MIMA_2026-09-02.md) |
| Swap × hazards | Same as walk | Still no | 08-31-001 |
| Frozen/Slime × player walk execute | 2× MP | Preview 2×, debit 1× | 09-01-001 |
| Barrier × player walk path | Impassable intermediates | Dest highlight yes; A* no | 09-01-002 |
| no_healing × Wisp heal | Fail | Player Blood Mend only | 09-01-005 |
| Summon AI × lava landing | Same as enemy | Enemy landing only | 09-01-006 |
| Push/pull × hazards | If shipped | Unwired; occupancy tests exist | 08-31-005 |
| Recap / persist-pending × lava / encounter | Block | Yes | closed |
| Pacifist × Strike highlight | Stay true | Yes | closed |
| Achievement × spell observation | — | No observe path | not invented |
| Drain × no_healing | Design | Self-heal unmarked | not filed |

## Missing tests (actionable)

1. Frozen map: enemy `computeReachable` step budget matches `applyMpCost` (001).
2. `findBattleStartCell` with a lava tile at max spacing does not pick that cell **or** a landing helper runs (002).
3. Unseal slide onto lava commits store HP + Burning (002).
4. Unpaid death pending + `redeemGameKeyThroughPersist` leaves lock Doka at least `credited - dokaLost` (003).
5. Boss `VOID_TILES`: either `map.voidTiles` gains the cells **or** walk-on type `"void"` ticks damage; log matches (004).
6. Wolf melee / summon `dealDamage` flips pacifist ref (005).
7. Dawn `damageToPlayer: -10` either heals or is not announced (006).
8. Still missing from 08-31 / 09-01: Swap lava; Frozen player execute 2×; findPath ∩ barriers === ∅; Wisp `healUsed`; summon AI dest === lava.

Actionable records: [`ACTION_IDS_MIMA_2026-09-02.md`](./ACTION_IDS_MIMA_2026-09-02.md).
