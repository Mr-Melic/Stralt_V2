# ACTION_IDs — 2026-08-31 Mechanic Interaction Matrix Auditor

Durable ledger for the Report Action Orchestrator.  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
HEAD inspected: `22503b5` (`fix: keep generated maps solvable across seeds (#110)`)  
Gameplay code: not modified.

Do not implement a second PR for an ID that is already OPEN or that matches an open PR title (#114, #108, #107).  
Prior week process IDs: `docs/automation/ACTION_IDS_2026-08-30.md`.

---

ACTION_ID: MIMA-2026-08-31-001  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Swap (teleport) landing skips lava, spikes, ice, and Void Rift walk damage  
CATEGORY: teleport + hazards + challenges  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `resolvePlayerCast` Swap calls `swapPositions` (`spellEngine.ts` 766–774). The WX callback (`WorldExploration.tsx` 9734–9747) copies coordinates through the combatant store and does not call `applyBattleWalkHazards` (10209–10248) or the movement-path hazard stepper (11626–11687). Player mouse/touch walk after #109 charges Thorned Ground and Void Rift; lava 8–15 / spikes 5–10 / ice slow only run inside the path stepper. Swap onto those tiles deals 0 HP, applies no Burning/Frozen, and does not increment `challengeTotalDamageRef` — Untouchable / under-50-damage can complete a fight that a walk onto the same tile would fail.  
EXPECTED_INTERACTION: Any rule that damages or debuffs a unit for occupying a hazard tile should run after Swap the same as after a completed walk step.  
ACTUAL_INTERACTION: Instant coordinate swap; hazard and challenge hooks never see the new cell.  
SYSTEMS_AFFECTED: teleport (Swap), hazards (lava/spikes/ice/void/thorned), challenges, statuses  
RECOMMENDED_ACTION: Extract a pure `applyHazardLanding(unit, dest, pathLength)` used by the walk stepper, `applyBattleWalkHazards`, and `swapPositions`. Do not change damage numbers. Add helper tests: swap onto lava increments challenge damage; swap onto ice applies Frozen; swap onto live rift tile charges `VOID_RIFT_TICK`.  
AUTONOMY: IMPLEMENT_HELPER_THEN_ONE_WX_CALL  
DEPENDENCIES: None. Distinct from #109 (walk input parity) and #114 (plague/LoS).  
REGRESSION_RISK: MEDIUM — must not double-charge a walk that already ran the stepper.  
VALIDATION_REQUIRED: Unit tests for the helper; playtest Swap onto lava / rift during an Untouchable offer.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-08-31-002  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Player-controlled summon walk ignores occupancy and tile hazards  
CATEGORY: summons + occupancy + hazards + LoS/pathing  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Occupancy contract (`occupancy.ts` 1–20, 78–89) requires every position change to go through `isCellFree` (bounds, walkable, barrier, portal, void, occupied). Enemy AI does (`enemyAI.ts` 393–395, 16886–16965 apply lava/ice/spikes and commit store HP). Player summon control (`WorldExploration.tsx` 10272–10292) uses `findPath` (4811–4915: walls, void, in-battle portals only — no combatant occupancy) then `updateCombatant` to the destination. No `isCellFree`, no per-step lava/spikes/ice, no `voidRiftWalkDamage`. A controlled Wolf can stack on the player or a hostile and stand on lava without the 8–15 HP + Burning the enemy path applies.  
EXPECTED_INTERACTION: Controlled summons obey the same occupancy and hazard landing rules as enemy movement.  
ACTUAL_INTERACTION: Instant path teleport; stacking legal; hazards skipped.  
SYSTEMS_AFFECTED: summons, occupancy, hazards, portals (path blocks portals but occupancy is still skipped on non-portal tiles), targeting  
RECOMMENDED_ACTION: Reject occupied / barrier destinations before the store write; after a legal move, run the same enemy hazard-landing helper (or `applyHazardLanding` from 001). Tests: path onto occupied tile is a no-op; path onto lava commits store HP and can be lethal.  
AUTONOMY: IMPLEMENT_HELPER_THEN_ONE_WX_CALL  
DEPENDENCIES: MIMA-2026-08-31-001 if landing is extracted once.  
REGRESSION_RISK: MEDIUM — do not change summon lifespan, AP budget, or AI executor.  
VALIDATION_REQUIRED: Helper tests; control-mode walk onto lava and onto the player tile.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-08-31-003  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Victory recap wrapper still lets lava/spikes run during applyRewards  
CATEGORY: rewards + death + hazards + persistence  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Architecture documents the hole (`docs/ARCHITECTURE.md` 249): recap wrapper is `pointer-events: none`; lava/spike under the card still receive input while persist is in flight. `handleBattleEnd` (`WorldExploration.tsx` 12710–12768) shows recap first, then enqueues `resolveBattleRewards`. Comments at 12764–12768 and `shouldApplyVictoryLiveHydrate` acknowledge a lava death during the await. #111 closed shop/portal/spend races; it did not lock world input for the recap window. No test asserts “recap visible ⇒ movement/hazard clicks ignored.”  
EXPECTED_INTERACTION: While the victory recap is up and the persist enqueue has not committed, world clicks must not walk onto hazards or start another encounter.  
ACTUAL_INTERACTION: Overlay does not eat events; player can walk, take lava, trip Death Realm, and race `persistDeathPenalty` against the in-flight credit.  
SYSTEMS_AFFECTED: rewards, persistence, death, hazards, portals  
RECOMMENDED_ACTION: Gate `handleCanvasClick` / touch / movement when recap is showing or `progressPersist.pending > 0` after victory (helper + one call site). Do not change `applyRewards` math. Add a persist-lock test: pending credit + simulated lava must not enqueue death before commit.  
AUTONOMY: IMPLEMENT_HELPER_THEN_ONE_WX_CALL  
DEPENDENCIES: None. Do not fold into #111 clones. Distinct from #108 (HUD leftover XP).  
REGRESSION_RISK: MEDIUM — recap card buttons (heal/shop) must keep `pointer-events: auto`.  
VALIDATION_REQUIRED: Helper test for the gate; playtest dismiss-recap-then-walk still works.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-08-31-004  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Victory recap XP bar uses level×100 instead of the persist curve  
CATEGORY: rewards + persistence + player feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Canonical curve is `100 * 2^(N-1)` (`utils/xpCurve.ts` 10–13; `docs/ARCHITECTURE.md` 128–136). Victory recap sets `xpForNextLevel: (characterStats.level || 1) * 100` (`WorldExploration.tsx` 12719). Equal at levels 1–2; at level 3 persist needs 400 and the bar uses 300. `PostBattleRecap.tsx` 46–48 / 303 render that denominator as “current / next” and leftover. Draft #108 shows leftover XP; it does not replace this formula.  
EXPECTED_INTERACTION: Recap and HUD leftover must use `xpForNextLevel(level)` so they match `applyRewards`.  
ACTUAL_INTERACTION: Recap bar and “XP until next” contradict the canister from level 3 up.  
SYSTEMS_AFFECTED: rewards, persistence, recap UI  
RECOMMENDED_ACTION: Pass `xpForNextLevel(characterStats.level)` into recap data. If #108 is kept, rebase it onto this one-line fix rather than a second HUD rewrite.  
AUTONOMY: IMPLEMENT_ONE_LINER_OR_FOLD_INTO_108  
DEPENDENCIES: #108 (leftover HUD). Do not open a competing recap rewrite.  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Recap fixture at level 3 shows 400, not 300.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-08-31-005  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Push/pull resolvers exist but are unwired; no hazard or occupancy tests  
CATEGORY: push + pull + hazards + occupancy  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `applyPushback` / `applyAttract` (`occupancy.ts` 236–315) are the documented movement resolvers. `grep` finds **zero** production call sites and **zero** tests. `resolvePlayerCast` has no pushback/attract branch. Catalog (`data/spellData.ts`) has no `effectType: "pushback"|"attract"` spells. Targeting and pacifist lists still treat those categories as offensive (`targeting.ts` 42–51; `WorldExploration.tsx` 17034–17043). An admin-defined pushback spell would spend AP, record an offensive type, and not move the target — so it also cannot interact with hazards.  
EXPECTED_INTERACTION: If push/pull are player-facing, they must use `isCellFree`, stop before occupied/portal/void/barrier, and then apply hazard landing (001). If they are not shipping, targeting/admin should not advertise them.  
ACTUAL_INTERACTION: Dead resolvers; no interaction with hazards, LoS, or portals.  
SYSTEMS_AFFECTED: push, pull, occupancy, hazards, admin spells  
RECOMMENDED_ACTION: REPORT_ONLY unless a human adds a catalog spell. Then wire `resolvePlayerCast` → `applyPushback`/`applyAttract` → hazard landing, and add occupancy tests (wall stop, no stack, lava landing). Do not invent spells for complexity.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: MIMA-2026-08-31-001 if landing is shared.  
REGRESSION_RISK: HIGH if someone wires movement without tests.  
VALIDATION_REQUIRED: Occupancy unit tests before any WX call.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-08-31-006  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Live cast / Attack Nearest ignore barrier LoS that the preview uses  
CATEGORY: LoS + range + targeting  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `computeTargetableTiles` takes `barrierTiles` and blocks Bresenham (`targeting.ts` 95, 184, 212, 250, 279, 317). `isTileCastableLive` (387–394) has no barrier map; comment at 476–478 states barriers are not passed. `pickNearestLiveHostileTile` (683–690) and Attack Nearest (`WorldExploration.tsx` 17252–17259) use that live gate. Sprite-click can snipe a hostile the blue ring never offered.  
EXPECTED_INTERACTION: Preview and live execute use the same wall + barrier LoS.  
ACTUAL_INTERACTION: Preview honors barriers; live/Attack Nearest do not (on `main`).  
SYSTEMS_AFFECTED: LoS, range, Attack Nearest, Barrier, challenges (`direct_hit` if a blocked snipe counts)  
RECOMMENDED_ACTION: Do **not** open a new PR. Draft **#114** already passes `barrierTilesRef` into the live gate.  
AUTONOMY: DO_NOT_IMPLEMENT  
DEPENDENCIES: https://github.com/Mr-Melic/stralt/pull/114  
REGRESSION_RISK: HIGH if a second targeting rewrite races #114 (see AQA-2026-08-30-011).  
VALIDATION_REQUIRED: After #114 merges, `isTileCastableLive` + barrier fixture in `targeting.test.ts` (current tests pass empty `barrierTiles` Maps).  
STATUS: IN_FLIGHT  

---

ACTION_ID: MIMA-2026-08-31-007  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Player plague tick can lose to last-hostile victory on the same turn  
CATEGORY: statuses + death + victory + rewards  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Enemy plague/DoT commits store HP and `processCombatantDeath` on the same tick (`battleSetup.ts` `shouldDispatchEnemyAiAfterTurnStart`, WX enemy/summon branches). Player turn-start plague on `main` still goes through `setCharacterStats` and the post-paint HP-watch. A 1–2 HP player can receive AP, kill the last hostile, and `shouldAwardVictory` can credit XP/Doka on a lost fight. `handleBattleEnd` returns immediately if `deathTriggeredRef` is already set (12539–12541), so the race is “victory first.”  
EXPECTED_INTERACTION: Lethal player plague must set death and refuse victory before the player acts or last-hostile persist runs.  
ACTUAL_INTERACTION: Death is deferred; victory can win the race.  
SYSTEMS_AFFECTED: statuses (plague), death, victory, rewards, challenges  
RECOMMENDED_ACTION: Do **not** open a new PR. Draft **#114** applies `hpAfterIncomingDamage` + `_handlePlayerDeath` and `shouldContinuePlayerTurnAfterHazard`.  
AUTONOMY: DO_NOT_IMPLEMENT  
DEPENDENCIES: https://github.com/Mr-Melic/stralt/pull/114  
REGRESSION_RISK: HIGH if another hunter edits the player turn-start plague block in WX.  
VALIDATION_REQUIRED: After #114: lethal plague ⇒ no `applyRewards`; challenge persist entries empty.  
STATUS: IN_FLIGHT  

---

ACTION_ID: MIMA-2026-08-31-008  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Void Rift walk damage after #109 is player-walk-only  
CATEGORY: hazards + AI pathfinding + summons  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: #109 added `voidRiftWalkDamage` / `battleWalkHazardDamages` (`battleSetup.ts` 268–296) for player mouse/touch. Enemy walk landing (16886–16965) reads `currentMap.hazardTiles` (`lava`/`ice`/`spikes` only). `voidRiftTile` is React state, not that map. `filterHazardCandidates` (`enemyAI.ts` 397–414) therefore cannot avoid the rift. Turn-start still applies a global `VOID_RIFT_TICK` via modifiers; the extra “stepped on the warped tile” charge is player-walk-only. Announce text tells the player to avoid the tile (`WorldExploration.tsx` 14415–14417).  
EXPECTED_INTERACTION: Either every combatant landing on the live rift tile pays the walk tick, or AI/summons also treat that cell as a hazard to avoid when low HP.  
ACTUAL_INTERACTION: Only the player walk path pays; enemies/summons can occupy the announced tile without the walk debit.  
SYSTEMS_AFFECTED: hazards, terrain, AI pathfinding, summons  
RECOMMENDED_ACTION: After 001/002 landing helper exists, pass `voidRiftTile` into enemy/summon landing. Add a test: dest === rift ⇒ `VOID_RIFT_TICK` for a non-player id. Do not change the global turn-start tick.  
AUTONOMY: REPORT_ONLY until 001/002 land  
DEPENDENCIES: MIMA-2026-08-31-001, MIMA-2026-08-31-002  
REGRESSION_RISK: LOW if only landing is extended.  
VALIDATION_REQUIRED: Enemy walk onto live rift commits store HP by 3.  
STATUS: NEW  
