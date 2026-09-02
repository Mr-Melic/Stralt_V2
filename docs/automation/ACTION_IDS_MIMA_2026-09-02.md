# ACTION_IDs — 2026-09-02 Mechanic Interaction Matrix Auditor

Durable ledger for the Report Action Orchestrator.  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
HEAD inspected: `58302bc` (`Merge pull request #258`)  
Gameplay code: not modified.

Do not re-file still-OPEN 08-31 / 09-01 items (`MIMA-2026-08-31-001/002/005/008`, `MIMA-2026-09-01-001/002/005/006`). Do not clone draft **#259** (EOP GameKey migration). Pacifist **preview** and recap persist-pending are closed on this HEAD.

---

ACTION_ID: MIMA-2026-09-02-001  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Frozen Terrain doubles player preview MP but not enemy/summon AI reach; Slime Flood does both  
CATEGORY: MP + terrain + AI pathfinding + summons  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Both modifiers announce “movement costs doubled” and share `onMpCost: (c) => c * 2` (`mapModifiers.ts` 155–172). Player highlight uses `mapModifierRegistry.applyMpCost` (`WorldExploration.tsx` 7118–7124) so Frozen and Slime both paint a 3-tile ring on 6 MP. Enemy and summon AI `computeReachable` uses `const costPerTile = ctx.isSlimeFlood ? 2 : 1` (`enemyAI.ts` 342) with `ENEMY_REACHABLE_STEP_BUDGET` 3. WX passes `isSlimeFlood: isSlimeFloodRef.current` into both AI contexts (15273, 16433) and never a Frozen flag — `_isFrozenTerrain` is assigned and unused (2295). Summon executor hardcodes `mpCostPerTile: 1` (15317). On Frozen, a hunter/wolf still plans a 3-step approach while the player’s green tiles stop at 1–2; on Slime the AI already budgets 2×. Distinct from MIMA-2026-09-01-001 (player **execute** still 1× on both modifiers). Tests cover `applyMpCost` isolation (`mapModifiers.cost.test.ts`) and charger reach with `isSlimeFlood: false` only.  
EXPECTED_INTERACTION: Any rule that doubles movement cost applies to player highlight, player debit, summon-control debit, and AI reachable budget. Frozen and Slime Flood that share the same announce must share the same consumers.  
ACTUAL_INTERACTION: Frozen is preview-only for the player and invisible to AI; Slime Flood at least shrinks AI reach.  
SYSTEMS_AFFECTED: MP, terrain (frozen_terrain vs slime_flood), AI pathfinding, summons  
RECOMMENDED_ACTION: Replace `ctx.isSlimeFlood ? 2 : 1` with `applyMpCost(1, activeModifierTypes)` (or pass a numeric `mpCostPerTile` from WX). Wire summon executor to the same number. Do not change the 2× formula. Tests: Frozen `computeReachable` from a 3-budget origin yields the same keys as Slime. Do not fold the player-execute 1× hole into this PR unless 09-01-001 is implemented in the same helper.  
AUTONOMY: IMPLEMENT_HELPER_THEN_AI_CALL_SITE  
DEPENDENCIES: MIMA-2026-09-01-001 if a shared `battleWalkMpCost` is extracted first. Distinct from 08-31-001 (hazards).  
REGRESSION_RISK: MEDIUM — Frozen fights become slower for AI; do not also double player execute in the same change without the leftover-MP stranding test from 09-01-001.  
VALIDATION_REQUIRED: `computeReachable` fixture with `frozen_terrain`; playtest Frozen hunter vs player 6 MP ring.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-02-002  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Battle-start destack and progression unseal teleport units onto lava/spikes/ice with no landing  
CATEGORY: occupancy + hazards + summons + teleport + challenges  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `isCellFree` (`occupancy.ts` 74–76) is bounds + walkable + barrier + portal + void + occupied — **no** `hazardTiles`. `findBattleStartCell` (`battleStartPlacement.ts` 63) picks the max-spacing free cell and WX teleports the player and every enemy there at encounter start (11964–12027). Tests (`battleStartPlacement.test.ts`) never seed lava. After #246 that destack is more aggressive (leftover islands / stacked rats). Independently, `resolveProgressionSafeOccupantCell` / `resolveControlledSummonMoveDest` (`occupancy.ts` 358–417) **slide** a summon off a reserved bridge onto `findNearestFreeCell`, which is the same hazard-blind passability. `executeSummonAction.applyMovement` then commits that cell with no landing (`summonExecutor.ts` 113–148). Enemy **walk** landing still pays 8–15 lava + Burning (`WorldExploration.tsx` 16960–17040). Player walk pays the same in the stepper (11533–11588) and records challenge damage. A destack or unseal onto lava is 0 HP until the unit later **steps**, so Untouchable / under-N-damage can start the fight standing on a tile that a walk would fail. Distinct from 08-31-001 (Swap) and 08-31-002 (controlled dest occupancy, now closed).  
EXPECTED_INTERACTION: Occupancy relocators prefer a non-hazard free cell; if they must land on lava/spikes/ice, the same landing helper as enemy walk runs (challenge HP for the player).  
ACTUAL_INTERACTION: Spacing/unseal wins; hazard tiles are treated as ordinary floor.  
SYSTEMS_AFFECTED: occupancy, hazards, summons, battle start, challenges  
RECOMMENDED_ACTION: Teach `findNearestFreeCell` / `findBattleStartCell` an optional `avoid: (cell) => boolean` for lava/spikes/ice (and live rift). After a forced land, call the shared `applyHazardLanding` from 08-31-001. Tests: max-spacing cell is lava ⇒ next-best floor; unseal slide skips lava when a safe neighbor exists. Do not change destack spacing numbers.  
AUTONOMY: IMPLEMENT_HELPER_THEN_OCCUPANCY_CALLS  
DEPENDENCIES: MIMA-2026-08-31-001 if landing is extracted once. Do not grow a third lava block in WX.  
REGRESSION_RISK: MEDIUM — over-avoiding can fail cramped maps; fallback must still place a unique floor.  
VALIDATION_REQUIRED: Placement fixture with one lava at the would-be destack cell; playtest stacked-rat map with a lava pool.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-02-003  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: GameKey redeem commits canister Doka without honouring an unpaid death 20/40 cut  
CATEGORY: rewards + death + persistence  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: #258 added `redeemGameKeyThroughPersist` (`shopPurchase.ts` 210–239): enqueue, `getCallerDokaBalance` → `redeemGameKey` → commit `committedDokaAfterShopCreditOnLock` (max of lock snapshot and credited). No `applyUnpaidDeathPenaltyToWrite`. HUD Buy Doka has no `inBattle` / recap / death-realm gate (`WorldExploration.tsx` 17795–17800); recap overlay is `pointer-events: none` so the chip stays live. Absolute spends (`persistAbsoluteProgress` 13237–13246) **do** honour pending death. Portal / ground / dungeon-complete one-shots were restacked in #256 so they cannot remint after a transport miss. GameKey is a new earn that writes the live wallet via `creditLiveDoka` (`DokaGameKeyShop.tsx` 187–189) from the uncut-or-already-credited canister. `resolvePendingDeathReplay` can still subtract the original loss on a later `saveBattleStats`, but the persist lock and HUD can sit above that until the next absolute write — the same class of race #256 closed for pickups. Tests (`shopPurchase.test.ts`) cover redeem gain/no-op, not pending death.  
EXPECTED_INTERACTION: Any persist-lock Doka credit (shop, GameKey, pickup, portal) either applies the unpaid 20/40 to the committed snapshot or leaves the pending marker and does not raise UI above an honoured wallet.  
ACTUAL_INTERACTION: Pickup/portal/heal paths honour or settle; GameKey commit is raw canister Doka and is available mid-battle and during recap.  
SYSTEMS_AFFECTED: GameKey shop, death penalty, persist lock, HUD wallet  
RECOMMENDED_ACTION: In `redeemGameKeyThroughPersist` (and the UI credit), if `readPendingDeathPenaltyAnywhere` is set, commit `applyUnpaidDeathPenaltyToWrite(pending, xp, credited).doka` (or settle then credit). Do not recut a `cutConfirmed` wallet. Tests: pending 80 Doka loss + redeem 1000 ⇒ lock Doka 920 (uncut 200+1000−80) or equivalent; `cutConfirmed` redeem does not subtract again. Do not change redeem canister math.  
AUTONOMY: IMPLEMENT_HELPER_THEN_SHOP_CREDIT  
DEPENDENCIES: Do not clone #259. Reuse `applyUnpaidDeathPenaltyToWrite` from #256.  
REGRESSION_RISK: MEDIUM — must not tax a GameKey after the death cut already landed.  
VALIDATION_REQUIRED: Unit test on the persist helper; playtest redeem after a failed death persist.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-02-004  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Boss VOID_TILES announce pass-through damage but never enter void occupancy or the walk hazard stepper  
CATEGORY: boss phases + hazards + terrain + death  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `applyVoidTiles` (`useBossSystem.ts` 445–480) returns `newVoidTiles`, `newHazardTiles` with `type: "void"`, and a log “damage anyone passing through.” WX consumes **only** `res.newHazardTiles` (16176–16191) into `currentMap.hazardTiles`. There is no `newVoidTiles` read in `WorldExploration.tsx`. Player/enemy landing switches are `lava` / `ice` / `spikes` only (11535–11588, 16963–17040). Occupancy `voidTiles` is a different set (impassable). Type `"void"` in `hazardTiles` is therefore neither a walk tick nor a block. Distinct from MIMA-2026-08-31-008 (map-modifier Void Rift **tile** + global tick).  
EXPECTED_INTERACTION: The announced rule is real: either the cells join `map.voidTiles` (impassable, update the log) **or** walk/landing treats hazard type `"void"` like a damage tile. Preview and execute must match.  
ACTUAL_INTERACTION: Cosmetic hazard keys; units path through for 0 HP.  
SYSTEMS_AFFECTED: boss phases, hazards, terrain, occupancy, player feedback  
RECOMMENDED_ACTION: Pick one rule. If impassable: apply `newVoidTiles` to `currentMap.voidTiles` and change the log. If damage: add `"void"` to the shared landing helper (same numbers as the ability spec). Tests: after VOID_TILES, either `isCellFree` is false on those cells or a step deals the documented HP. Do not change RAF.  
AUTONOMY: IMPLEMENT_ONE_WX_CONSUME_OR_LANDING_BRANCH  
DEPENDENCIES: MIMA-2026-08-31-001 if landing is shared. Do not conflate with Void Rift modifier.  
REGRESSION_RISK: MEDIUM — making them void can seal Boss Rush corridors; prefer damage-on-step if solvability tests fail.  
VALIDATION_REQUIRED: Boss ability fixture; solvability if cells become impassable.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-02-005  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Pacifist Run still succeeds when a player-side summon deals the only damage  
CATEGORY: achievements + summons + targeting  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Preview half of MIMA-2026-09-01-003 is closed (`shouldApplyHealBuffSideEffectOnRangePreview` → false; tests in `targeting.test.ts`). Victory still awards from `battleOnlyHealBuffSpellsRef` (`WorldExploration.tsx` 12613–12614). `recordPlayerSpellType` flips only damage/drain/aoe/dot/pushback/attract/cc/teleport (17108–17121). Summon catalog is `targetType: "ground"` / `effectType: "summon"`. Kit melee/cast goes through `summonCtx.dealDamage` (`summonExecutor.ts` 164–166, 226) and never touches the ref. Casting Summon Dire Wolf and idling still grants Pacifist. Feat copy is “Win a battle using only heal or buff spells.” No test asserts wolf melee ⇒ ref false.  
EXPECTED_INTERACTION: Pacifist fails if the player or a player-side summon deals damage. Preview stays a no-op.  
ACTUAL_INTERACTION: Looking at Strike is fixed; summon kills still pay the feat.  
SYSTEMS_AFFECTED: achievements, summons, recap unlocks  
RECOMMENDED_ACTION: Flip the ref when a player-side summon `dealDamage` lands (and optionally when `effectType === "summon"` is resolved). Leave Wisp-only / Barrier / Timestep / Mirror legal. Tests: select Strike → true; wolf melee → false; heal-only → true. Do not revert the preview gate.  
AUTONOMY: IMPLEMENT_ONE_DEALDAMAGE_HOOK  
DEPENDENCIES: Remainder of MIMA-2026-09-01-003. Distinct from #247 (wallet/level feats after credit).  
REGRESSION_RISK: LOW if only summon damage flips; MEDIUM if summon-cast itself is marked offensive (Wisp-only runs would fail).  
VALIDATION_REQUIRED: Helper test; playtest summon-only kill.  
STATUS: NEW  

---

ACTION_ID: MIMA-2026-09-02-006  
SOURCE_AUTOMATION: Mechanic Interaction Matrix Auditor  
TITLE: Twin Monarchs Dawn +10 HP is announced and never applied; would also skip no_healing if wired as damageToPlayer  
CATEGORY: boss phases + healing + challenges + player feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `applyDawnBuff` (`useBossSystem.ts` 1275–1301) returns `damageToPlayer: -10` with log “Dawn briefly blesses you with a +10 HP heal!” WX applies player damage only when `res.damageToPlayer > 0` (16114–16128). Negative values are ignored; HP unchanged; `challengeHealUsedRef` untouched. The same gate is why a future “wire the heal through damageToPlayer” would still not fail easy_1 / hard_1 (those flip on explicit heal / potion / Doka-in-battle). Distinct from 09-01-005 (Wisp).  
EXPECTED_INTERACTION: If the log claims +10 HP, player HP rises and no-heal challenges fail. If Dawn is flavour-only, do not log a heal.  
ACTUAL_INTERACTION: Battle log lies; HP and challenge flags stay put.  
SYSTEMS_AFFECTED: boss phases, healing, challenges, player feedback  
RECOMMENDED_ACTION: Apply `Math.min(maxHp, hp + 10)` when `damageToPlayer < 0`, or add `healPlayer` on the ability result, and call `recordInBattleChallengeHealUsed`. Or drop the heal log. Tests: Dawn roll heal ⇒ HP +10 and `healUsed` true. Do not change other Twin Monarchs damage.  
AUTONOMY: IMPLEMENT_ONE_BRANCH  
DEPENDENCIES: None. Do not fold into 09-01-005.  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Ability result fixture; playtest Twin Monarchs phase 1 every-3rd-turn buff.  
STATUS: NEW  
