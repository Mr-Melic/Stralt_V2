# Mechanic interaction matrix — 2026-09-01

**Auditor:** Mechanic Interaction Matrix Auditor  
**HEAD:** `dd275aa` (after #182 / #179 / #175 / #172 / #171 / #166 cluster)  
**Gameplay code:** not modified.

Pairs are scored only when current source shows a real join. “Watch enemy cast → unlock spell” still does not exist (`ownedSpells` = starter ∪ backend catalog). Player LoS is opt-in (`playerSpellRequiresLos` / `!!spell.lineOfSight`) while enemy AI defaults LoS on — documented policy in `targeting.ts` 107–110, not filed as a defect.

## Priority surfaces (changed since 2026-08-31 matrix)

| Merge / surface | Why it matters for pairs |
| :--- | :--- |
| #166 recap canvas gate | Closes overlay click-through; **dismiss + pending persist** still open |
| #114 / #157 / #172 live LoS + preview/execute | Barrier honoured on **cast**; not on **walk path** |
| #175 double-victory / death replay | `battleEndedRef` survives cleanup |
| #179 destack / dual-path summons | Spawn reserved cells covered; AI landing still skip hazards |
| #170 Sacrifice → challenge HP | Player self-hit counts; summon heal still does not |
| Summon control kit + budget | Casts gated; **walk** still occupancy/hazard/MP-blind |
| #183 draft | Death replay after portal / Doka-only — do not clone |

## Still OPEN from 2026-08-31 (do not re-file)

| ID | Pair | Status on `dd275aa` |
| :--- | :--- | :--- |
| MIMA-2026-08-31-001 | Swap × lava/ice/rift/thorns | `swapPositions` 10009–10021 still copies coords only |
| MIMA-2026-08-31-002 | Controlled-summon walk × occupancy/hazards | 10583–10594 / 11324–11335 still `findPath` + `updateCombatant` |
| MIMA-2026-08-31-005 | Push/pull × hazards | Resolvers + occupancy tests exist; **zero** `resolvePlayerCast` call sites. REPORT_ONLY |
| MIMA-2026-08-31-008 | AI/summon × Void Rift walk tile | `voidRiftTile` is React state; enemy landing reads `hazardTiles` only |

## Closed since last matrix (do not re-open)

| ID | Pair | Closed by |
| :--- | :--- | :--- |
| 003 | Recap overlay × lava clicks | #166 (`battleRecapOpen` only — leftover is 2026-09-01-004) |
| 004 | Recap XP bar × persist curve | #108 / `xpForNextLevel` |
| 006 | Barrier LoS × live cast / Attack Nearest | #114 / #157 / #172 |
| 007 | Player plague × last-hostile victory | #114 + `shouldContinuePlayerTurnAfterHazard` |

## Matrix (evidence-backed)

| Pair | Should | Do (on `main`) | Gap |
| :--- | :--- | :--- | :--- |
| Frozen/Slime × walk execute | 2× MP | Preview 2×, debit 1× | [001](./ACTION_IDS_MIMA_2026-09-01.md) |
| Summon-control highlight × summon MP | Same budget | Player `currentBattleMp` | [001](./ACTION_IDS_MIMA_2026-09-01.md) |
| Barrier × player walk path | Impassable | Dest highlight yes; A* no | [002](./ACTION_IDS_MIMA_2026-09-01.md) |
| Occupancy × player walk intermediates | `isCellFree` | Dest only | [002](./ACTION_IDS_MIMA_2026-09-01.md) |
| Pacifist × targeting preview | No | Highlight flips flag | [003](./ACTION_IDS_MIMA_2026-09-01.md) |
| Pacifist × summon kills | Fail feat | Flag stays true | [003](./ACTION_IDS_MIMA_2026-09-01.md) |
| Recap dismiss × pending `applyRewards` | Block world | Overlay only | [004](./ACTION_IDS_MIMA_2026-09-01.md) |
| Reward persist × new encounter | Wait | `shouldAllowBattleTrigger` ignores pending | [004](./ACTION_IDS_MIMA_2026-09-01.md) |
| no_healing × Wisp / summon heal | Fail | `heal` callbacks skip flag | [005](./ACTION_IDS_MIMA_2026-09-01.md) |
| Summon AI walk × lava/ice/spikes | Same as enemy | Enemy landing only | [006](./ACTION_IDS_MIMA_2026-09-01.md) |
| Swap × hazards | Same as walk | Still no | 08-31-001 |
| Controlled summon × occupancy/hazards | Same as enemy | Still no | 08-31-002 |
| Push/pull × hazards | If shipped | Unwired | 08-31-005 |
| AI path × Void Rift tile | Avoid or tick | Not in `hazardTiles` | 08-31-008 |
| DoT × last enemy | Victory | Yes | tests exist |
| Player plague × victory | Death wins | Yes | #114 |
| Barrier × live cast | Same as preview | Yes | #172 |
| Death × challenge persist | Fail, no pay | Early-return | — |
| Summon spawn × portal/corridor | Not seal | Reserved + dual-path tests | #179 |
| Achievement × spell observation | — | No observe path | not invented |
| Drain × no_healing | Design | Self-heal unmarked | not filed |

## Missing tests (actionable)

1. Frozen 6 MP: one 3-tile walk leaves 0; two shorter walks cannot exceed 3 tiles (001).
2. Summon-control highlight uses summon `currentMp`, not player battle MP (001).
3. findPath / walk stepper never occupies a barrier or living combatant (002).
4. `getSpellRangeTiles` does not flip pacifist; wolf melee does (003).
5. `shouldIgnoreWorldInputDuringRecap(false, true)` already green — wire the second arg; block `shouldAllowBattleTrigger` while pending (004).
6. In-battle Wisp `heal` ⇒ `healUsed` (005).
7. Summon AI dest === lava commits store HP (006).
8. Still missing from 08-31: Swap lava; controlled-summon `isCellFree`; enemy dest === `voidRiftTile`.

Actionable records: [`ACTION_IDS_MIMA_2026-09-01.md`](./ACTION_IDS_MIMA_2026-09-01.md).
