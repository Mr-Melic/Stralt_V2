# ACTION_IDs — 2026-09-02 Advanced Enemy AI Evolution Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source automation: Advanced Enemy AI Evolution Designer (`67b03c2f-a492-11f1-a7d1-d6b4613131ce`).  
Design: [`docs/ENEMY_AI_EVOLUTION.md`](../ENEMY_AI_EVOLUTION.md), [`docs/ENEMY_AI_EVOLUTION_2026-09-01.md`](../ENEMY_AI_EVOLUTION_2026-09-01.md), [`docs/ENEMY_AI_EVOLUTION_2026-09-02.md`](../ENEMY_AI_EVOLUTION_2026-09-02.md).

This run ships **docs only**. Do not implement gameplay from these IDs unless a later human or orchestrator explicitly picks one.

## Still-open IDs (line numbers refreshed; not re-filed)

| ACTION_ID | Live evidence (2026-09-02) |
| :--- | :--- |
| `AEE-2026-08-31-001` | `computeAITier` still `combatMath.ts` 36–52. Spawn WX **5823 / 5951**. Gates WX **15597** (`>= 5`) and **15683** (`>= 10`). |
| `AEE-2026-08-31-002` | Fire Bolt WX **16792–16800**. Ally heal WX **16736**. `decideEnemyAction` still ignores `currentAp`/`currentMp`. |
| `AEE-2026-08-31-003` | `inferArchetype` 423–426 still heal-first. |
| `AEE-2026-09-01-001` | `findNearestLegalCastTile` 763–804. Player helper `targeting.ts` 415+. |
| `AEE-2026-09-01-002` | `computeReachable` 352 still `ENEMY_REACHABLE_STEP_BUDGET`. |
| `AEE-2026-09-01-003` | Kit assign WX **12035**. |
| `AEE-2026-09-01-004` | Snapshot WX **16362–16391** still omits AP/MP/RES/effects. |
| `AEE-2026-09-01-005` | Setter 940 / 1526; `scoreTargets` 502–525 unread. |
| `AEE-2026-09-01-006` | Erratic log WX **15647–15653**; betrayal WX **15683–15700**. |
| `AEE-2026-09-01-007` | Summoner chance WX **12047–12049**; skip 1828–1875. |
| `AEE-2026-09-01-008` | `pickBossKitSpell` still `new Map()` (`useBossAI.ts` 169–173 and every sibling). |
| `AEE-2026-09-01-009` | `usableByEnemy: true` utilities unchanged in `spellData.ts`. |
| `AEE-2026-09-01-010` | T6+ still proposed only. 2026-09-02 adds FUT-24…35 after 01–23. |

P0 remains **AEE-2026-08-31-002** (Fire Bolt / apply honesty) then **001** (relative eligibility). Do not start FUT-24+ first.

---

ACTION_ID: AEE-2026-09-02-001  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Side-aware legality helper — do not pass raw `isTileCastableLive` into enemy decide  
CATEGORY: combat-ai  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `isTileCastableLive` (`targeting.ts` 415+) `ally` branch requires `e.side === "player"` (476–495). `minRange ?? 1` (427). `spellRangeBase` uses `max(1, Number(range))` (111–115). Player LoS is opt-in (117–126). Parent SYS-06 said “extract from `isTileCastableLive`”; doing that unchanged makes enemy ally heals illegal and would apply player LoS to enemies.  
RECOMMENDED_ACTION: AI-SYS-13 + SYS-06 + SYS-11 + SYS-20. Helper takes `side`. Self/range-0 must stay legal.  
DEPENDENCIES: AEE-2026-08-31-002 (apply must not Fire-Bolt a rejected dest)  
REGRESSION_RISK: HIGH if the player helper is swapped in wholesale  
VALIDATION_REQUIRED: TS-SIDEALLY, TS-LINEAR, TS-MINR, TS-MAXR  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-002  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Summon decide snapshot — fill occupied; filter cooldowns  
CATEGORY: combat-ai  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Pack fills `aiOccupied` (WX 16397–16404). Summon path does `const aiOccupied = new Set()` (WX 15250) and passes it as `ctx.occupied` (15260). `availableSpells: summonEnemy.spells ?? []` (15265) is not cooldown-filtered. `findKitSpell` prefers available (1724–1731). Executor then rejects occupied dests (`summonExecutor.ts` 119–123) — wasted turn, not a cheat walk.  
RECOMMENDED_ACTION: AI-SYS-14. Mirror pack snapshot. Do not “fix” by ignoring occupancy in the executor.  
DEPENDENCIES: None for occupied/CD; SYS-10 later for effects  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: TS-SUMOCC, TS-SUMCD  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-003  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Bill 4-dir path MP, not Chebyshev teleport  
CATEGORY: combat-ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Decide BFS is 4-dir with step budget (`enemyAI.ts` 343–352). Summon executor charges `chebyshev(origin, dest) * mpCostPerTile` (56, 125–126). Dest (2,1) is Chebyshev 2 and 4-dir cost 3. Pack apply still does not debit MP (SYS-05).  
RECOMMENDED_ACTION: AI-SYS-15 + SYS-07. Missing MP ⇒ 0 walk, not silent 3.  
DEPENDENCIES: AEE-2026-08-31-002; AEE-2026-09-01-002  
VALIDATION_REQUIRED: TS-PATHMP  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-004  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Boss kit legality + delete Final Pawn kit-less bolt  
CATEGORY: combat-ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Every boss decide prefers `pickBossKitSpell(..., new Map())` (`useBossAI.ts` 169–173 and copies). Final Pawn fires a kit-less ranged attack at Manhattan 1 < d ≤ 3 (992–1001) — same class as Fire Bolt. `KNIGHT_JUMP_IGNORE_WALLS` (408–438) is a tagged ability; do not copy to pack. `currentTurn % 1 === 0` (1152) is always true.  
RECOMMENDED_ACTION: AI-SYS-16. Pass live cooldown map (AEE-2026-09-01-008). Range/LoS/AP/MP via SYS-13. Remove pawn bolt or replace with a profiled kit id. Wall-jump stays Cavalier-only.  
DEPENDENCIES: AEE-2026-09-01-008; AEE-2026-09-02-001 for shared legality  
VALIDATION_REQUIRED: TS-BOSSWALL, TS-PAWNBOLT, TS-BOSSCD  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-005  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Seed minion AP/MP; 0 must not mean walk-3  
CATEGORY: combat-ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Boss minion/ghost spawn sets `ap: 0, mp: 0`, `intelligence: 0` (WX 16243–16248). After SYS-07, 0 MP is no walk. Today decide ignores those fields and uses `ENEMY_REACHABLE_STEP_BUDGET = 3`. Player summons seed via `summonSpawn.ts` 177–179.  
RECOMMENDED_ACTION: AI-SYS-21. Seed from piece/boss-minion table. Unset vs zero: unset → 0 this turn (no cheat 3), then fix spawn.  
DEPENDENCIES: AEE-2026-09-01-002  
VALIDATION_REQUIRED: TS-MINIONMP  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-006  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Drop `name.includes` summon routing  
CATEGORY: combat-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `inferSummonArchetype` (`enemyAI.ts` 195–217) falls back to `"wolf"|"golem"|"wisp"|"archer"|"bomber"` in `summon.name`. Spell scoring already forbids name heuristics.  
RECOMMENDED_ACTION: AI-SYS-17. Read `summonAI` + kiter/kamikaze aliases only.  
DEPENDENCIES: None  
VALIDATION_REQUIRED: TS-NAME  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-007  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Dormant Enemy fields must not become level/AI-tier gates  
CATEGORY: combat-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `intelligence`, `campTurnCount`, `escapeRouteTriggered` (`gameTypes.ts` 307, 339–340). Minions write `intelligence: 0` (WX 16248). Decide does not read them today. Brief forbids “Level X always equals AI tier Y”; these fields are the next accidental table.  
RECOMMENDED_ACTION: AI-SYS-18. `escapeRouteTriggered` may be a debug flag for POS-08 only.  
DEPENDENCIES: AEE-2026-08-31-001  
VALIDATION_REQUIRED: TS-INTEL  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-008  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Overkill spill is retarget, not hidden splash  
CATEGORY: combat-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `applyOverkillSpread` (`enemyAI.ts` 669+) switches `targetId` when excess > `AI_OVERKILL_SPILL_FRACTION`. Apply deals one hit. Implementing leftover as a second damage event would be a cheat.  
RECOMMENDED_ACTION: AI-SYS-19. Multi-hit is FUT-19 with a profiled spell, not this helper.  
DEPENDENCIES: None  
VALIDATION_REQUIRED: TS-OVERKILL  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-009  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Charger commit uses path/MP, not Chebyshev budget+1  
CATEGORY: combat-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `canReach = dist <= ENEMY_REACHABLE_STEP_BUDGET + 1` (`enemyAI.ts` 1178–1179) ignores walls. Open-field Chebyshev 3 with a 6-step maze still “commits.”  
RECOMMENDED_ACTION: AI-FUT-26 after SYS-07. Adjacent rule stays Chebyshev to match player `targetType: "enemy"` (`targeting.ts` 570–623). Do not copy boss Manhattan adjacency into pack melee.  
DEPENDENCIES: AEE-2026-09-01-002  
VALIDATION_REQUIRED: TS-CHARGEPATH  
STATUS: NEW

ACTION_ID: AEE-2026-09-02-010  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: T6+ FUT-24…35 are stackable scorers after honesty slices  
CATEGORY: combat-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: 2026-09-02 catalog specifies authored hazards, DoT stacks, path-aware commit, split/clone blackboard, public anchors, sacrifice-vs-log, chain-on-shock, mark metadata, initiative-strip AP, sim kit twin, mirror-without-replay, barrier Manhattan. Eligibility remains parent §4 sigmoid.  
RECOMMENDED_ACTION: One module per PR with `enemyAI*.test.ts`. Never `if (level >= X)`. Not before AEE-2026-08-31-002 and AEE-2026-09-02-001…005.  
DEPENDENCIES: AEE-2026-08-31-001…003; AEE-2026-09-01-001…005; AEE-2026-09-02-001…005  
REGRESSION_RISK: HIGH if stacked before legality  
VALIDATION_REQUIRED: Per-module TEST_SCENARIOS in `ENEMY_AI_EVOLUTION_2026-09-02.md`  
STATUS: NEW
