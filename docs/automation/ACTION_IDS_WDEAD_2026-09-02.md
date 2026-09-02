# ACTION_IDs — 2026-09-02 World, Dungeon & Encounter Admin Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: World, Dungeon & Encounter Admin Designer.  
Design contract: [`WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-02.md`](./WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-02.md).  
Prior IDs (still `NEW`, do not re-issue): `WDEAD-2026-08-31-001` … `015`, `WDEAD-2026-09-01-001` … `010`.  
Siblings to consume, not duplicate: `WDD-2026-08-31-001`, `WDD-2026-09-01-001`, `LHIPS-*`, `EBA-*`, `EED-*` / `ENC-*`, `FSN-*`, `AFDA-*`.

This run ships **docs only**. Do not implement production, RAF, map generation, turn, or damage-math code from this file unless a later human or orchestrator picks an ID.

HEAD audited: `58302bc`.

`WDEAD-2026-08-31-013` (unify dungeon Doka tables) is **PARTIAL**: `dungeonDokaMultiplierFor` is the single reader; depth-5 freeze remains. Do not re-issue 013.

---

ACTION_ID: WDEAD-2026-09-02-001  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Closed-interval eligibility 9999 is not uncapped progression  
CATEGORY: spawn-admin  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Admin-drift / AFDA changed `newEnemy()` / `newRegion()` from `levelMax: 5` to `DEFAULT_ELIGIBILITY_LEVEL_MAX = BigInt(9999)` (`AdminDashboard.tsx` 134–154) and added `ELIGIBILITY_BAND_HINT` (245–246, 804–805, 1037–1038) claiming high-level play still matches. Live region filter is still `level >= Number(r.levelMin) && level <= Number(r.levelMax)` (`WorldExploration.tsx` 3663). Death Realm entry uses `maxLevel: 9999` (5436) while fallback rebuilds stamp `maxLevel: 5` (13613, 13745). `pickEnemyLevelFromTiers` still `maxTier = Math.floor(999 / ts)` (`combatMath.ts` 58). Tiers preview samples only `[1, 10, 25, 50, 100, 200, 500]` (`AdminDashboard.tsx` 3833). `WDEAD-2026-08-31-001` asked to remove hard ceilings; raising the last bucket is not that work.  
SYSTEMS_AFFECTED: Admin Enemies / Regions eligibility fields; WX region match; spawn picker; future pack `relativeEligibility`. Not RAF, not damage math.  
RECOMMENDED_ACTION: Owner eligibility is relative (preferred band + open tail). Overflow fades, it does not reject. Stop teaching 9999 as “uncapped.” Do not raise 9999 to 99999. Death Realm `maxLevel: 5` stamps stay `WDEAD-2026-08-31-001`. Spawn knobs stay `WDEAD-2026-08-31-002`. Prefer DRAFT → SIMULATE → VALIDATE → ACTIVATE so a band edit cannot imply a career cap.  
AUTONOMY: HUMAN_APPROVE — changing region match is player-facing.  
DEPENDENCIES: WDEAD-2026-08-31-001; WDEAD-2026-08-31-002; WDEAD-2026-08-31-004; do not duplicate EBA-002 / AFDA finite-level flags  
REGRESSION_RISK: HIGH if existing region rows with max 5 are deleted as “legacy caps” (they are content). MEDIUM if 9999 is copied onto Death Realm as a new reject.  
VALIDATION_REQUIRED: Hypothetical player level 50_000 still matches an open-ended region in sim. A region with only a preferred band still rolls. Wallet unchanged. `pnpm typecheck`; `pnpm check`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-002  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Quarantine Boss Rush honesty copy — rewardMultiplier is loaded then discarded  
CATEGORY: admin-integrity  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Boss Rush tab `CatalogNote` (`AdminDashboard.tsx` 6942–6947) says live rooms come from `BOSS_RUSH_ROOMS` and “only parsed.rewardMultiplier is read.” `useBossRush.ts` 209–248 parses `getBossRushConfig` into `setRewardMultiplier`, but the state is `_rewardMultiplier` with **zero readers** (grep: only the setter). Room enable / per-room `x` still do not skip `BOSS_RUSH_ROOMS`. `persistBossRushRoomClear` still calls `completeBossRushRoom(..., 0, 0)`. AFDA-008 treated the parse as consumption. The honesty pass therefore shipped a new lie. `WDEAD-2026-09-01-001` / `009` stay the wiring contract; this ID is the CatalogNote false-positive.  
SYSTEMS_AFFECTED: Admin Boss Rush tab copy; `useBossRush.ts` unused state. Official credit path stays `applyRewards` after `currentRoom` advances.  
RECOMMENDED_ACTION: Relabel: parsed JSON is **not** applied to payouts or room skips until VALIDATE/ACTIVATE binds evaluated `bossRushRoomReward` (`WDEAD-2026-09-01-009`). Do not “fix” the lie by reading `_rewardMultiplier` into a second wallet write. Keep `completeBossRushRoom` at `(0, 0)`.  
AUTONOMY: IMPLEMENT_WHEN_PICKED for copy-only. HUMAN_APPROVE to bind multipliers into `computeRewardDeltas`.  
DEPENDENCIES: WDEAD-2026-09-01-001; WDEAD-2026-09-01-009; WDEAD-2026-08-31-008; WDEAD-2026-09-01-005  
REGRESSION_RISK: HIGH if jackpot room remains resumable after a new credit. HIGH if canister client `dokaReward`/`xpReward` are revived.  
VALIDATION_REQUIRED: Changing Admin “x” does not change `completeBossRushRoom` args. After copy-only, a `user` role cannot read the note as “Reward x is live.” Existing `bossRushProgress.test.ts` stays green.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-003  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Owner catalogWave and one roll budget — wave 2 must not ship WDD dual-roll as admin policy  
CATEGORY: world-events  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Catalog is 36 `WF-*` ids (`worldFeatures.ts` 159–1215): wave 1 omits `catalogWave`; wave 2 sets `catalogWave: 2` (16 ids, tests at `worldFeatures.test.ts` 140–151). `featuresInCatalogWave` exists (1230–1232) but `pickWeightedFeatures` (1372–1390) / `featuresForSlot` (1344–1350) mix both waves into `MAX_ROLLED_FEATURES = 3` (31). `docs/WORLD_DYNAMICS.md` line 44 still requires the 22 live modifiers to roll on their own two-roll. WX does not import `worldFeatures`. `WDEAD-2026-09-01-003` asked for one owner catalog / one budget when the catalog was 20 ids; wave 2 landed more hardcoded rows and reaffirmed dual-roll. Sibling `WDD-2026-09-01-001` is DESIGNED — do not fork a third array.  
SYSTEMS_AFFECTED: `worldFeatures.ts` picker inputs; Admin World Events; future pack; live `mapModifiers.ts` two-roll. Not `mapGen.ts`.  
RECOMMENDED_ACTION: Pack fields `enabledWaves` and a single `worldEventCatalog` that includes `WF-*` and the 22 modifier ids. Owner sets rarity, eligibility, slot, and whether a wave is in the mix. One roll budget per map after ACTIVATE. Until then, do not overlay. Sim reports `catalogWave` histogram so dilution is visible. Death Realm default remains []. Rest / deathRealm enum stays `WDEAD-2026-09-01-010`. Placement remains post-`finalizePlayableLayout` (WDD).  
AUTONOMY: HUMAN_APPROVE — live modifier odds are player-facing.  
DEPENDENCIES: WDEAD-2026-09-01-003; WDEAD-2026-08-31-004; WDEAD-2026-08-31-009; WDD-2026-08-31-001; WDD-2026-09-01-001  
REGRESSION_RISK: HIGH if both rolls stay independent after “wiring wave 2.” HIGH if enabling only wave 2 silently drops the 22 live modifiers.  
VALIDATION_REQUIRED: Sim with waves 1+2 and maxRolled=3 shows mix ≠ 100% wave 2. Single histogram (no Crosswind + `paper_windstorm` unless both are in one budget). `worldFeatures.test.ts` stays green. No `mapGen.ts` hunk.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-004  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Expand event grantClass with oneCast; Scourge Compact and Echo Hall only via mapModifierRegistry  
CATEGORY: world-events  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `WF-SPL-GRIMOIRE_STALKER` (`worldFeatures.ts` 1067–1095) specifies one remaining cast this map — not Rune Bearer’s full-map attune (507–526) and not `upgradeSpell`. `WF-RSK-SCOURGE_COMPACT` (1097–1124) proposes +10% of already-computed incoming hits plus the hard `applyRewards` multiplier. `WF-MOD-ECHO_HALL` (1127+) proposes `SpellConfig.linear` range +1. `WDEAD-2026-09-01-006` / `007` covered Rune Bearer / Eclipse / Low Ceiling only. No live `observeSpell` path exists. AGENTS.md: no damage-math edits, no name heuristics, `upgradeSpell` sole spell-level writer.  
SYSTEMS_AFFECTED: pack `grantClass` / `combatHookId` / `rewardCurve`; `mapModifiers.ts` registry; never WX `if (feature.id)` and never `upgradeSpell`.  
RECOMMENDED_ACTION: `grantClass: none | mapAttune | oneCast | observe`. `oneCast` is in-memory, this map only, one remaining use. `observe` reserved. Scourge incoming tax is an `onDamageDealt` hook on the already-computed hit; Echo Hall reads `linear` / `maxRange` only. Payable preview still 09-01-005. Fix NaN `levelZone` under `WDEAD-2026-08-31-012`, not by granting from EnemyConfig.  
AUTONOMY: HUMAN_APPROVE — combat-sensitive.  
DEPENDENCIES: WDEAD-2026-09-01-006; WDEAD-2026-09-01-007; WDEAD-2026-09-01-003; WDEAD-2026-09-02-003; WDEAD-2026-08-31-012  
REGRESSION_RISK: HIGH if oneCast writes spellLevel arrays. HIGH if Scourge is inlined in WX. MEDIUM if Echo Hall uses spell **name**.  
VALIDATION_REQUIRED: Simulated stalker kill leaves canister spell upgrades unchanged. No `calcScaledDamage` hunk. Payable Scourge bonus ≤ official `applyRewards` maxima. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-005  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Treat AdminGuard summon level 99 and spell minLevel 999 as content career caps, not safety  
CATEGORY: spawn-admin  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Since the 09-01 WDEAD brief, `adminGuard.mo` rejects `minLevel > 999` (375), `summonLifespan > 20` (390–391), and `summonUnitDef.level > 99` (393–394), plus `hpScale`/`damageScale` outside 0–10 (399–405) to stop Inf-HP in `getSummonBaseStats`. Lifespan 20 and finite scales are turn/numeric safety. Stored **level 99** / **minLevel 999** stop catalog content from tracking a level-5_000 caster. Product rule: never create a hard maximum level. `WDEAD-2026-08-31-001` covered picker 999 / AI 10 / dungeon depth 5 — not these new rails.  
SYSTEMS_AFFECTED: `adminGuard.mo` spell/summon validate; Admin Spells tab; future summon templates on the encounter pack. Not AP/MP ≤ 20.  
RECOMMENDED_ACTION: Keep Inf-HP / non-finite scale rejects. Keep summon lifespan as a turn budget. Replace absolute `summonUnitDef.level` with a relative offset + scale from the caster. Spell `minLevel` is preferred eligibility with open tail (same as 09-02-001), not a 999 career gate. Do not add `levelMax` on summons “to match 99.”  
AUTONOMY: HUMAN_APPROVE — catalog writes.  
DEPENDENCIES: WDEAD-2026-08-31-001; WDEAD-2026-09-02-001; Spell Admin / EBA summon fields (consume, do not fork)  
REGRESSION_RISK: HIGH if Inf-HP scale reject is removed. MEDIUM if existing spells with minLevel 1–30 are rewritten.  
VALIDATION_REQUIRED: A relative summon template still validates at hypothetical caster level 50_000. Non-finite hpScale still `#err`. Official `upgradeSpell` path unchanged. `mops check` when Motoko changes.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-006  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Simulation Laboratory isolation allow-list must include GameKey credits  
CATEGORY: simulation-lab  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Shop is now Mollie + GameKey (`AdminDashboard.tsx` 6780–6799; `shopPurchase.ts` `redeemGameKeyThroughPersist` / `processPendingPurchases`). Both enqueue on `createProgressPersist`. `WDEAD-2026-08-31-003` / `WDEAD-2026-09-01-002` listed `applyRewards` / `saveBattleStats` / `upgradeSpell` / `claimAchievementReward` / `processPendingPurchases`. They did not name `redeemGameKey`. `MAX_DOKA_GRANT = 10_000_000` (`adminSafety.ts` 7) is an operator grant rail, not a sim reward. A lab that remounts shop helpers or reuses LHIPS `ensureLocalStorage` can mint.  
SYSTEMS_AFFECTED: proposed `engine/encounterSim.ts`; Admin Simulation tab; must not import `shopPurchase.ts` credit helpers or `longHorizonSim.ts`.  
RECOMMENDED_ACTION: Spy allow-list fails on `redeemGameKey`, `processPendingPurchases`, `applyRewards`, `saveBattleStats`, `upgradeSpell`, `claimAchievementReward`, persist `commit`, and `pbv_*` / inventory keys. Lab may **display** theoretical vs payable encounter rewards (09-01-005) without calling those methods. Operator GameKey approval stays on the Purchases tab, never in Simulation.  
AUTONOMY: IMPLEMENT_WHEN_PICKED with the lab (`WDEAD-2026-08-31-003`).  
DEPENDENCIES: WDEAD-2026-08-31-003; WDEAD-2026-09-01-002; WDEAD-2026-09-01-008  
REGRESSION_RISK: HIGH if Admin Simulation imports `redeemGameKeyThroughPersist`. LOW for live play (lab-only).  
VALIDATION_REQUIRED: 10_000 lab rolls: zero actor credit methods, zero GameKey redeem, zero inventory writes. Hypothetical level 50_000 accepted. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-007  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Encounter formations and WF extra enemies must compose with destack occupancy  
CATEGORY: encounters  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: After the 09-01 WDEAD brief, leftover-island work added `destackSpawns` (`mapGen.ts` 512+) and battle-start unique occupancy via `findBattleStartCell` (`WorldExploration.tsx` 11972–12008: player ≥3, enemies ≥2, each result added to `placed`). `generateEnemies` still scatters with Chebyshev ≥ 4 then 30% family (5699–5956). Scripted formations (`docs/design/ENEMY_FORMATIONS_2026-08-31.md` `FSN-*`) and `WF-INV-WARBAND` +3–5 extras (`worldFeatures.ts` ~419) assume authored cells. Destack can relocate bodies after generate, erasing formation geometry and skipping Warband at `MAX_ENEMIES` (09-01-004). AGENTS.md: do not edit mapGen / RAF to implement this program.  
SYSTEMS_AFFECTED: proposed `engine/encounterFormations.ts`; WF extra-enemy placement; Simulation `destackRelocations` report. Live `mapGen.ts` destack stays.  
RECOMMENDED_ACTION: Formations are role offsets applied to **walkable unique** cells, then occupancy destack is allowed to slide a slot to the nearest legal cell; if a slot cannot destack, drop that slot (do not punch walls). Sim reports `destackRelocations` per formation id / WF id. Validate solvability after destack. Do not grow a 400-line WX branch; do not revert destack tests. Consume `FSN-*` / `EED-*` room sheets as data, do not duplicate catalogs.  
AUTONOMY: HUMAN_APPROVE before changing live occupancy. Reporting may ship with the lab.  
DEPENDENCIES: WDEAD-2026-08-31-005; WDEAD-2026-09-01-004; FSN-* / EED-* (consume); do not combine with a mapGen specialist PR  
REGRESSION_RISK: HIGH if destack is disabled to “keep formation art.” HIGH if Warband ignores unique occupancy and stacks.  
VALIDATION_REQUIRED: Existing destack / leftover-island tests stay green. Sim at size=20 + Warband shows skip or relocation, not overlapping cells. No `mapGen.ts` hunk from this ID. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-02-008  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Owner dungeon Doka curve must edit the unified helper — never freeze at depth 5  
CATEGORY: dungeons  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `WDEAD-2026-08-31-013` asked to unify three Doka tables before owner edits. That unify **landed**: `DUNGEON_DOKA_MULTIPLIERS` + `dungeonDokaMultiplierFor` (`portalRules.ts` 148–161) is used by WX HUD (1320), `useDungeonState.ts` 14–18, and `longHorizonSim.ts` 534. The helper still `Math.min(safeDepth, 5)` → 4.0×. Chain length is still 3–5 (WX 6325, 6417). Depth extras still `Math.min(dungeonDepth, 5)` (WX 5708–5709). LHIPS now **samples** `dungeonMultiplierAtDepth5`, which would teach an owner lab that floor 5 is the policy. `WDEAD-2026-08-31-007` / `010` still own rooms / relative rewards; this ID unlocks the editor on the unified table.  
SYSTEMS_AFFECTED: `portalRules.ts` multiplier helper (curve shape only after draft activate); Admin Dungeons tab; Simulation dungeon report. Not a second `applyRewards`.  
RECOMMENDED_ACTION: Pack `dungeonPolicy.dokaMultiplierCurve` is unbounded (log / diminishing), read by the **one** helper after ACTIVATE. Owner preview shows theoretical vs payable (09-01-005). Do not add a fourth copy in WX. Do not treat LHIPS depth-5 as the owner default. Rest-as-room and branching remain 08-31-007. Keep `snapshotDungeonChain` before `cleanupMap`.  
AUTONOMY: HUMAN_APPROVE — economy.  
DEPENDENCIES: WDEAD-2026-08-31-013 (unify done — consume); WDEAD-2026-08-31-007; WDEAD-2026-08-31-010; WDEAD-2026-09-01-005; WDEAD-2026-08-31-004  
REGRESSION_RISK: HIGH if HUD, persist, and helper diverge again. HIGH if sim credits dungeon bonus.  
VALIDATION_REQUIRED: Depth 6+ in sim is not clamped to the depth-5 cell. Official dungeon-complete bonus still claims a one-shot id then `applyRewards`. Lab spy: zero credits. `pnpm typecheck`.  
STATUS: NEW  
