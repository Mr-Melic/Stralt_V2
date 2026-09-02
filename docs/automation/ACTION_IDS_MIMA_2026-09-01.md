# ACTION_IDs — 2026-09-01 Mechanic Interaction Matrix Auditor

Durable ledger for the Report Action Orchestrator.  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
HEAD inspected: `dd275aa` (`Merge pull request #182`)  
Gameplay code: not modified.

Do not re-file OPEN 08-31 items (`MIMA-2026-08-31-001/002/005/008`) or in-flight **#183** (death-penalty after portal / Doka-only credits).  
Closed on `main` since the last matrix (`22503b5`): recap canvas gate (#166), recap XP curve (#108), barrier live LoS (#114/#157/#172), plague-death victory (#114), double-victory guard (#175).

---

ACTION_ID: MIMA-2026-09-01-001  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Frozen Terrain / Slime Flood MP doubling is preview-only; execute charges 1 MP/tile  
CATEGORY: MP + terrain + summons  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Both modifiers announce “movement costs doubled” and implement only `onMpCost: (c) => c * 2` (`mapModifiers.ts` 155–172). `getMpReachableTiles` (`WorldExploration.tsx` 7697–7707) uses `mapModifierRegistry.applyMpCost` so a 6-MP pool highlights 3 tiles. Player walk execute then charges `const cost = path.length` with no `applyMpCost` (11150–11154 mouse, 11750–11754 touch). Hover label uses `dist * applyMpCost` (9160–9165) so a 2-tile walk reads “4 MP” and deducts 2. Splitting walks yields ~5 tiles on 6 MP (preview max 3, then leftover 1-MP slices). Summon-control walk never consults the highlight: it debits `path.length` from `summon.currentMp` (10583–10594 / 11324–11335). The same highlight still uses **player** `currentBattleMp` and `getActiveCasterPos()` (7680–7684, 7699–7707), so a 2-MP player / 3-MP wolf shows 2 green tiles and then walks 3. Tests cover `applyMpCost` in isolation (`mapModifiers.cost.test.ts`) and never walk-execute.  
EXPECTED_INTERACTION: Preview, hover, player debit, and summon-control debit share one MP-cost function (including Frozen/Slime).  
ACTUAL_INTERACTION: Preview/hover double; execute is 1×; summon-control ignores the player highlight budget.  
SYSTEMS_AFFECTED: MP, terrain (slime_flood / frozen_terrain), summons (control walk), player feedback  
RECOMMENDED_ACTION: Extract `battleWalkMpCost(pathLength, modifierTypes)` used by highlight BFS, hover, player debit, and summon-control. Pass summon `currentMp` into the highlight while `activeControlledSummonId` is set. Do not change the 2× formula. Tests: 6 MP + Frozen, one 3-tile walk leaves 0; two 2-tile walks cannot exceed 3 tiles; summon highlight uses summon MP.  
AUTONOMY: IMPLEMENT_HELPER_THEN_WX_CALL_SITES  
DEPENDENCIES: None. Distinct from MIMA-2026-08-31-001/002 (hazards/occupancy).  
REGRESSION_RISK: MEDIUM — leftover MP after a legal 1× walk must not strand the player on Frozen maps if the helper is applied only to preview.  
VALIDATION_REQUIRED: Helper tests; playtest Frozen map walk split and Wolf control highlight.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-01-002  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Player battle-walk path steps through barriers and living combatants  
CATEGORY: terrain + LoS + occupancy + movement  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Occupancy contract (`occupancy.ts` 1–15, 84–95) requires every position change to pass `isCellFree` (walkable, barrier, portal, void, occupied). Player dest is rejected if occupied (11133–11145 / 11733–11745) and must sit in `getMpReachableTiles`, which skips barrier neighbors (7722). Execute then calls `findPath` (11148–11157). `findPath` (5012–5114) blocks walls, void, and in-battle portals only — **not** `barrierTilesRef` and **not** combatants. The movement stepper writes every intermediate tile (`WorldExploration.tsx` 11861–11869). A dest that is BFS-reachable *around* a Barrier can therefore animate *through* the Barrier (shorter A*) and stack on a living unit for those frames. Enemy AI / summon AI already use `isCellFree`. Barrier live-cast LoS was unified in #114/#157/#172; movement path was not. No test asserts findPath ∩ barriers === ∅.  
EXPECTED_INTERACTION: The path that is walked is a subset of the barrier-aware, occupancy-aware reachable set. Intermediate tiles are `isCellFree` (self excepted).  
ACTUAL_INTERACTION: Highlight is conservative; A* can clip through the player’s own Barrier and through hostiles.  
SYSTEMS_AFFECTED: terrain (Barrier), occupancy, LoS/pathing, summons (as occupants), player walk  
RECOMMENDED_ACTION: Teach `findPath` (or a battle-only wrapper) barriers + occupied cells, or walk the BFS parent pointers from `getMpReachableTiles` instead of a second A*. Tests: dest beyond a one-tile barrier uses the around-path; dest with an enemy on the shortest route does not step on that enemy. Do not change RAF timing or damage numbers.  
AUTONOMY: IMPLEMENT_HELPER_THEN_ONE_WX_PATH  
DEPENDENCIES: None. Do not fold into MIMA-2026-08-31-002 (that is **controlled-summon** dest with no dest check at all).  
REGRESSION_RISK: MEDIUM — over-blocking dest that is actually free (corpses are already dropped from the live list).  
VALIDATION_REQUIRED: Path fixture with a barrier between caster and dest; playtest Barrier then walk around it.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-01-003  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Pacifist feat flips on spell highlight, not on damage dealt  
CATEGORY: achievements + summons + targeting  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `getSpellRangeTiles` calls `applyHealBuffSideEffect` (`WorldExploration.tsx` 7777–7778) while computing the blue ring. That helper sets `battleOnlyHealBuffSpellsRef.current = false` for `targetType` enemy/area/line, drain, physical, or offensive `effectCategory` (`targeting.ts` 54–73). Selecting Strike / Poison Arrow to inspect range — without spending AP — fails `pacifist_run`. Victory then awards from the same ref (`WorldExploration.tsx` 13062–13064). The inverse hole: summon spells are `targetType: "ground"` / `effectType: "summon"` (`spellData.ts` 547–571) so highlight does **not** flip the flag; `recordPlayerSpellType` only treats damage/drain/aoe/dot/pushback/attract/cc/teleport as offensive (17454–17467). Player-side wolf/archer/bomber kills go through `summonExecutor` / `enemyTakesDamage` and never touch the ref. Casting Summon Dire Wolf + sitting idle still grants Pacifist. No test covers `applyHealBuffSideEffect` at the highlight call site.  
EXPECTED_INTERACTION: Pacifist fails if the player (or a player-side summon) deals damage or casts an offensive spell. Preview must not mutate feat state.  
ACTUAL_INTERACTION: Looking at Strike fails the feat; summon kills keep it.  
SYSTEMS_AFFECTED: achievements, summons, targeting preview, recap unlocks  
RECOMMENDED_ACTION: Remove `applyHealBuffSideEffect` from `getSpellRangeTiles`. Flip the ref in `executeCastAttempt` / `recordPlayerSpellType` (already lists offensive types) and when a player-side summon `dealDamage` lands. Treat `effectType === "summon"` as offensive if product wants “no minions” pacifist; otherwise only count summon damage. Tests: select Strike → ref stays true; cast Strike → false; wolf melee → false; heal-only fight → true.  
AUTONOMY: IMPLEMENT_HELPER_THEN_MOVE_ONE_CALL  
DEPENDENCIES: None. Distinct from #159 (recap unlocks display).  
REGRESSION_RISK: LOW if only the highlight side-effect moves; MEDIUM if summon-cast is also marked offensive (Wisp-only runs would fail).  
VALIDATION_REQUIRED: Helper tests; playtest select-but-don’t-cast Strike; summon-only kill.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-01-004  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Dismissing the victory recap unblocks lava walks and new encounters while applyRewards is in flight  
CATEGORY: rewards + death + hazards + persistence + portals  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: #166 added `shouldIgnoreWorldInputDuringRecap(recapVisible, victoryPersistPending)` (`recapWorldInput.ts` 10–15; tests cover `false, true` → block). Both WX call sites pass only `battleRecapOpen` (10556, 11293). `App.tsx` 498–500 `onClose` sets `battleSummary` null immediately. `handleBattleEnd` shows recap first, then `await progressPersist.enqueue(resolveBattleRewards)` (13091–13111). Comments at 13124–13128 still describe lava/spike death during that await. After dismiss: world stepper still applies lava 8–15 (`WorldExploration.tsx` 11990–12020); `shouldAllowBattleTrigger` (12346–12355) does not see recap or `pendingCount()`. `progressPersist.pendingCount()` already exists (`progressPersist.ts` 217–218). Draft **#183** is death-penalty *replay after portal / Doka-only credits* — not this input gate.  
EXPECTED_INTERACTION: While a victory credit is queued, world clicks must not walk hazards or start another encounter. HUD heal/shop stay live.  
ACTUAL_INTERACTION: Overlay click-through is closed; Continue re-opens the world under an in-flight credit.  
SYSTEMS_AFFECTED: rewards, persistence, death, hazards, encounters  
RECOMMENDED_ACTION: Pass `progressPersistRef.current.pendingCount() > 0` as the second argument at both WX gates (and a `shouldAllowBattleTrigger` persist-pending bit if encounters can fire without a canvas click). Do not change `applyRewards` math. Test: `shouldIgnoreWorldInputDuringRecap(false, true) === true` already exists; add a WX-level or helper test that victory-pending blocks `shouldAllowBattleTrigger`.  
AUTONOMY: IMPLEMENT_ONE_LINER  
DEPENDENCIES: Do not clone #183. Residual of MIMA-2026-08-31-003 / #166.  
REGRESSION_RISK: LOW — dismiss-then-walk after commit must still work; HUD `pointer-events: auto` unchanged.  
VALIDATION_REQUIRED: Helper already green; playtest Continue-immediately-then-lava on a lava map.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-01-005  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Wisp / summon-kit heals do not fail no_healing challenges  
CATEGORY: healing + summons + challenges  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `healUsed` flips only when `spell.targetType === "self" && spell.effectType === "heal"` after a **player** `executeCastAttempt` (11047–11049, 11650–11652, 17584–17590) or a Doka heal while `inBattle` (`recordInBattleChallengeHealUsed`, 18791–18795). Summon Wisp kit is `starter-heal` (`spellData.ts` 663–680). AI/control heal goes through `summonCtx.heal` (`summonExecutor.ts` 204–210) which only `setCharacterStats` HP (`WorldExploration.tsx` 9812–9827 and 15466–15481) and never writes `challengeHealUsedRef`. `handleBattleEnd` persists easy_1 / hard_1 from that ref (12871, 13304). A Wisp 12-HP Blood Mend mid-fight still pays 50 / 200 Doka. Drain self-heal remains a possible loophole (prior non-finding); this is a **summon** heal, not a drain. No challenge test covers summon `heal`.  
EXPECTED_INTERACTION: Any in-battle player HP gain that is not the documented overworld Doka-to-HP exception sets `healUsed`.  
ACTUAL_INTERACTION: Player-cast Blood Mend fails the challenge; the same spell from a Wisp does not.  
SYSTEMS_AFFECTED: healing, summons, challenges, rewards  
RECOMMENDED_ACTION: In both `heal` callbacks, if `combatantId` is the player and `inBattleRef`, set `challengeHealUsedRef` via `recordInBattleChallengeHealUsed`. Tests: wisp heal in-battle ⇒ `isChallengeCompleted(easy_1)` false; overworld Doka heal still leaves the flag unset.  
AUTONOMY: IMPLEMENT_HELPER_THEN_TWO_CALLBACKS  
DEPENDENCIES: None. Do not “fix” drain unless product asks.  
REGRESSION_RISK: LOW — overworld exception already lives in `recordInBattleChallengeHealUsed`.  
VALIDATION_REQUIRED: `challengeCompletion.test.ts` case; playtest Wisp + no_healing offer.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-01-006  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Player-side summon AI walk skips lava / spikes / ice landing that enemies pay  
CATEGORY: summons + hazards + statuses  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Enemy move landing (`WorldExploration.tsx` 17307–17372) reads `currentMap.hazardTiles`, applies lava 8–15 + Burning, ice Frozen −2 MP, spikes 5–10, and commits store HP (`enemyHpAfterHazardDamage` + `updateCombatant`). `filterHazardCandidates` (`enemyAI.ts` 398–413) only avoids those tiles below `ENEMY_HAZARD_AVOID_HP_PCT` — high-HP units walk on and pay. Player-side summon AI uses `executeSummonAction.applyMovement` (`summonExecutor.ts` 113–169): `isCellFree` + MP, **no** `hazardTiles`. WX summon helpers hardcode `mpCostPerTile: 1` (15677) and never call the enemy landing block. A high-HP Wolf can occupy lava for 0 HP while an enemy on the same tile takes 8–15. Distinct from MIMA-2026-08-31-002 (controlled walk: no `isCellFree` and instant teleport). Void-rift walk tick remains 008 (tile is not in `hazardTiles`).  
EXPECTED_INTERACTION: Any combatant landing on lava/ice/spikes uses the same landing helper.  
ACTUAL_INTERACTION: Enemy landing is wired; summon AI landing is not.  
SYSTEMS_AFFECTED: summons, hazards, statuses (Burning / Frozen)  
RECOMMENDED_ACTION: After MIMA-2026-08-31-001 extracts `applyHazardLanding`, call it from summonExecutor (or the WX apply-after-executor site) with store-HP commit. Tests: wolf dest lava ⇒ HP drop + Burning; ice ⇒ Frozen. Do not change damage bands.  
AUTONOMY: REPORT_ONLY until 08-31-001 landing helper exists  
DEPENDENCIES: MIMA-2026-08-31-001 (shared landing). Do not grow WX with a third copy of the lava block.  
REGRESSION_RISK: LOW if only landing is shared; MEDIUM if AI avoid rules change.  
VALIDATION_REQUIRED: Summon dest === lava commits store HP.  
STATUS: NEW  
