# ACTION_IDs — 2026-09-01 World, Dungeon & Encounter Admin Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: World, Dungeon & Encounter Admin Designer.  
Design contract: [`WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-01.md`](./WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-01.md).  
Prior IDs (still `NEW`, do not re-issue): `WDEAD-2026-08-31-001` … `015`.  
Siblings to consume, not duplicate: `WDD-2026-08-31-001`, `LHIPS-2026-08-31-*`, `EBA-2026-08-31-*`, `ENC-*` / `EED-2026-08-31-001`.

This run ships **docs only**. Do not implement production, RAF, map generation, turn, or damage-math code from this file unless a later human or orchestrator picks an ID.

HEAD audited: `dd275aa`.

---

ACTION_ID: WDEAD-2026-09-01-001  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Quarantine owner-lying controls (unread or unused knobs that look live)  
CATEGORY: admin-integrity  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Tiers tab requires `same+adj+twoAway+threeOrMore === 100` (`AdminDashboard.tsx` 3576–3591) and persists `threeOrMorePercent`, but `pickEnemyLevelFromTiers` never reads `cfg.threeOrMorePercent` — the ±3+ branch is leftover `100-same-adj-twoAway` (`combatMath.ts` 72–75, 90–97). Engine comments call `levelVarianceChance` admin-configurable (`combatMath.ts` 60–69) but frontend `TierSpawnConfig` (`gameTypes.ts` 428–434) and the Tiers tab omit it. Enemies CRUD persists `EnemyConfig` including `levelMax: 5` (`AdminDashboard.tsx` 116–127); `WorldExploration.tsx` has zero `enemyConfigs` reads. Boss Rush “Reward x” (`AdminDashboard.tsx` 6763–6779) is not the `applyRewards` payload. `WORLD_FEATURES` is unused by WX.  
SYSTEMS_AFFECTED: Admin Tiers / Enemies / Boss Rush tabs; `combatMath.ts` picker; future Drafts tab. Not RAF, not damage math.  
RECOMMENDED_ACTION: Until the 08-31 pack exists, label each unused control “does not drive live spawn.” Either wire `threeOrMorePercent` into the picker **or** remove it from the sum-100 gate and show leftover as read-only. Surface `levelVarianceChance` or drop the comment. Do not present EnemyConfig absolute HP as combat stats. Prefer DRAFT → SIMULATE → VALIDATE → ACTIVATE (`WDEAD-2026-08-31-004`) so a save cannot imply activate.  
AUTONOMY: HUMAN_APPROVE — labeling is low-risk; wiring the leftover field changes live spawn and must go through draft/sim.  
DEPENDENCIES: WDEAD-2026-08-31-002 (relative knobs replace the four buckets); WDEAD-2026-08-31-004; WDEAD-2026-08-31-006  
REGRESSION_RISK: MEDIUM if `threeOrMorePercent` is suddenly honored while owners already balanced against leftover. HIGH if EnemyConfig HP is copied onto combatants.  
VALIDATION_REQUIRED: Changing only `threeOrMorePercent` either changes a documented leftover readout or (after draft activate) changes sim ±3+ rate. A `user` role cannot see the lying knobs as “live.” `pnpm typecheck`; `pnpm check`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-002  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Isolate longHorizonSim from the owner Simulation Laboratory  
CATEGORY: simulation-lab  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `src/frontend/src/utils/longHorizonSim.ts` is a CLI observation harness (`runLongHorizonSim`, `STRESS_LEVELS` 75–77 max 5000 + 1018/1019). It reuses live `pickEnemyLevelFromTiers` / `computeAITier` (still 999 / tier-10 capped). Reports XP/HP/AI/kit-NaN/boss-guide — not families, variants, elites, formations, discovery, or estimated difficulty. `ensureLocalStorage` (299–316) installs an in-memory `localStorage` when missing. No Admin tab imports it. `WDEAD-2026-08-31-003` asked for a non-persistent owner lab; implementers could “reuse the existing sim” and inherit the wrong reports plus a persist-shaped API.  
SYSTEMS_AFFECTED: `longHorizonSim.ts` (leave as LHIPS harness); proposed `engine/encounterSim.ts`; Admin Simulation tab.  
RECOMMENDED_ACTION: Keep `longHorizonSim` as an engineer CLI. Owner lab is a separate module that calls extracted **draft** pickers only. Do not import `runLongHorizonSim` or `ensureLocalStorage` into `AdminDashboard`. Do not route the lab through WX `generateEnemies`. File header / Admin copy must say “not the owner Simulation Lab.”  
AUTONOMY: HUMAN_APPROVE for the lab; docs/labeling of `longHorizonSim` is IMPLEMENT_WHEN_PICKED.  
DEPENDENCIES: WDEAD-2026-08-31-003 (lab still to be built); WDEAD-2026-09-01-008 (overflow contract)  
REGRESSION_RISK: HIGH if Admin calls `runLongHorizonSim` in a player session (fake or real `localStorage`, live capped pickers, no isolation test).  
VALIDATION_REQUIRED: Admin Simulation bundle does not import `longHorizonSim.ts`. Spy test: 10_000 lab rolls touch zero actor methods and zero `pbv_*` / inventory keys. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-003  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: One owner catalog and one roll budget for WORLD_FEATURES plus the 22 live map modifiers  
CATEGORY: world-events  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live modifiers are 22 registry entries (`mapModifiers.ts` 152–471) rolled by the existing world two-roll. `worldFeatures.ts` adds 20 `WF-*` ids and `pickWeightedFeatures` (875–893) with independent slot chances 55/25/15 and `MAX_ROLLED_FEATURES = 3`. WX does not import `worldFeatures`. `EXISTING_MAP_MODIFIER_IDS` (912–935) prevents string collision only. `WF-MOD-CROSSWIND` / `WF-MOD-LOW_CEILING` / `WF-EVT-ECLIPSE` would stack with `paper_windstorm` / `void_rift` if both systems fire. Sibling `WDD-2026-08-31-001` is `DESIGNED` (catalog exists, not wired). `WDEAD-2026-08-31-009` asked for a catalog when none existed — do not recreate it; **own** the one that landed.  
SYSTEMS_AFFECTED: `worldFeatures.ts` weights; `mapModifiers.ts` trigger path; Admin World Events / Modifiers tabs; future pack.  
RECOMMENDED_ACTION: Single `worldEventCatalog` in the content pack. Owner sets rarity, eligibility, and whether an id is a tile, encounter, event, or modifier. One roll budget per map. Live 22 modifiers migrate in as ids (behavior stays in `mapModifierRegistry`). `WF-*` stay data, loaded from the **active** pack, not a second hardcoded array after activate. Do not place inside `mapGen.ts`. Post-`finalizePlayableLayout` overlay + solvability re-check remains the WDD placement contract.  
AUTONOMY: HUMAN_APPROVE — live modifier odds are player-facing.  
DEPENDENCIES: WDEAD-2026-08-31-004 (draft/activate); WDEAD-2026-08-31-009 (event fields); WDD-2026-08-31-001 (do not fork a third catalog)  
REGRESSION_RISK: HIGH if both rolls stay independent after “wiring worldFeatures.” MEDIUM if empty active catalog disables the 22 live modifiers.  
VALIDATION_REQUIRED: Sim reports a single feature/modifier histogram (no double-count of Crosswind + paper_windstorm unless the owner enabled both in one budget). Death Realm default still rolls []. Catalog tests in `worldFeatures.test.ts` stay green. No `mapGen.ts` hunk.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-004  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Owner feature-budget policy and skippedForBudget reporting — no silent legendary skip  
CATEGORY: spawn-admin  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `MAX_ENEMIES = 20` and `MAX_HAZARD_TILES = 50` (`gameConstants.ts` 8–10) are board-safety caps. `worldFeatures.ts` `canAddEnemies` / `canAddHazardTiles` (799–807) and Warband solvability text (425–426) **skip** extras at the cap. `MAX_ROLLED_FEATURES = 3` (30, 878) freezes event density at every player level. `WDEAD-2026-08-31-011` asked for encounter-size knobs; it did not cover this second catalog’s skip-as-content-cap. A legendary Warband on a full 1–8+depth roster never appears.  
SYSTEMS_AFFECTED: `worldFeatures.ts` budget helpers; encounter size policy; Simulation Lab reports.  
RECOMMENDED_ACTION: Owner pack fields for `featureBudget.maxRolled` and encounter `{min,max,depthCurve}`. Keep named board-safety constants (do not turn them into `levelMax`). Simulation must report `skippedForBudget` per feature id. Validate fails if a rarity≥epic id’s skip rate exceeds an owner threshold at the configured size (default: warn, do not auto-raise `MAX_ENEMIES`).  
AUTONOMY: HUMAN_APPROVE before raising board caps (initiative / leftover-roster). Budget **reporting** may ship with the lab.  
DEPENDENCIES: WDEAD-2026-08-31-003; WDEAD-2026-08-31-011; WDEAD-2026-09-01-003  
REGRESSION_RISK: HIGH if `MAX_ENEMIES` is raised inside WX without occupancy tests. LOW if only sim reports skips.  
VALIDATION_REQUIRED: Sim at size=20 + Warband weight 1.0 shows skip rate, not a fake 100% warband rate. Existing leftover-roster / summon tests still pass at size 8. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-005  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Reward curves must remain payable under official applyRewards per-call ceilings  
CATEGORY: economy  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Since the 08-31 WDEAD brief, `applyRewards` rejects `dokaDelta > 100_000` (`main.mo` ~1798) and XP above the paired 500_000 ceiling. Official client clamps first (`applyRewardsResult.ts` 37–61) because the live 0.01% jackpot band (`level * [1, 1e9]`) and dungeon 4× + Doka Fever 2× already exceed Doka max — the recap advertised a grant the canister `#err`d. `WDEAD-2026-08-31-010` asked for unbounded-looking `RewardCurve` (`base * playerLevel * difficulty`). Extreme `REWARD_MULT` 2.5 (`worldFeatures.ts` 121–126) on that jackpot is a silent clip, not more Doka. Simulation must never credit.  
SYSTEMS_AFFECTED: future event/dungeon/rush curves; `rewardResolver.ts` / `clampApplyRewardsDeltas`; Admin preview; Simulation Lab. Not a second wallet API.  
RECOMMENDED_ACTION: Keep a single funnel. Owner preview shows **theoretical** vs **payable** (after official clamp). Validate-gate: payable ≤ `APPLY_REWARDS_MAX_DOKA_DELTA` / `APPLY_REWARDS_MAX_XP_DELTA`. Prefer diminishing / relative functions so late-game event payouts stay distinct *under* the ceiling. Do not add `calculateAndAwardDoka` or a new credit method to “bypass” the clamp. Do not retune `100 * 2^(N-1)` (`LHIPS-2026-08-31-001`).  
AUTONOMY: HUMAN_APPROVE — economy.  
DEPENDENCIES: WDEAD-2026-08-31-010; WDEAD-2026-08-31-004; WDEAD-2026-09-01-003  
REGRESSION_RISK: HIGH if an implementer splits one victory into multiple `applyRewards` calls to evade the per-call max. HIGH if sim writes the persist lock.  
VALIDATION_REQUIRED: Draft preview at hypothetical level 50_000 shows payable ≤ 100_000 Doka / 500_000 XP per official call. Recap still one atomic reward. Death 20% XP / 40% Doka still `saveBattleStats`. Lab spy: zero `applyRewards`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-006  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Explicit event spell grantClass — mapAttune or observe, never upgradeSpell  
CATEGORY: world-events  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `WF-SPL-RUNE_BEARER` (`worldFeatures.ts` 498–526) specifies extra spells from `usableByEnemy === true` and “temporary attune does not call `upgradeSpell` and does not persist spellLevel arrays.” `AGENTS.md`: `upgradeSpell` is the sole spell-level writer. No live `observeSpell` / enemy-learn path exists under `src/frontend`. `WDEAD-2026-08-31-009` / `012` asked for rare-spell-bearer **probability + pool ids**, not a persist grant. An implementer who “makes the bearer drop a spell” will fork the catalog.  
SYSTEMS_AFFECTED: world-event catalog fields; battle-start kit assign (WX 12479–12507); never `upgradeSpell` / `saveBattleStats` spell arrays.  
RECOMMENDED_ACTION: Owner field `grantClass: none | mapAttune | observe`. `mapAttune` is in-memory, this map only. `observe` is reserved for a future discovery funnel and must not write spell levels in this program. Pool ids are explicit metadata (`usableByEnemy`), never name heuristics. Fix the NaN `levelZone` object pass under `WDEAD-2026-08-31-012`, not by granting spells from Admin EnemyConfig.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: WDEAD-2026-08-31-012; WDEAD-2026-08-31-009; WDEAD-2026-09-01-003  
REGRESSION_RISK: HIGH if attune writes `${principal}` spell arrays or `upgradeSpell`. MEDIUM if `observe` is implemented as a second unlock writer.  
VALIDATION_REQUIRED: After a simulated bearer kill, character spellLevel arrays and canister spell upgrades are unchanged. Live victory still uses `applyRewards` only for XP/Doka. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-007  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Event combat effects may only register as mapModifierRegistry hooks  
CATEGORY: world-events  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `WF-EVT-ECLIPSE` (`worldFeatures.ts` 642–667) proposes “+15% of the already-computed hit (post existing RES/SR).” `WF-MOD-LOW_CEILING` (614–640) proposes non-`linear` spells lose 1 `maxRange`. `mapModifiers.ts` already has `onDamageDealt` (85, 543–557) and is the required hook home for the 22 live modifiers. AGENTS.md forbids damage-math edits and name-based heuristics. A WX “if eclipse then damage *= 1.15” would be a second damage pass.  
SYSTEMS_AFFECTED: `mapModifiers.ts` registry; world-event `combatHookId`; WX must not grow a parallel `if (feature.id)` chain.  
RECOMMENDED_ACTION: Owner-activated combat/range effects are either `combatHookId` → existing registry hook or `none`. New hook bodies live in `mapModifiers.ts` (or an extracted hook module), not `WorldExploration.tsx`. Eclipse-style post-formula multiply, if a human ever wants it, is an `onDamageDealt` hook — still not a `combatMath.ts` `calcScaledDamage` edit. Range clamps read `SpellConfig.linear` / `maxRange` only.  
AUTONOMY: HUMAN_APPROVE — any `onDamageDealt` change is combat-sensitive.  
DEPENDENCIES: WDEAD-2026-09-01-003; do not combine with a damage-math specialist PR  
REGRESSION_RISK: HIGH if Eclipse is inlined in WX. MEDIUM if Low Ceiling uses spell **name** instead of `linear`.  
VALIDATION_REQUIRED: No new `calcScaledDamage` hunk. Preview vs live targeting still share one gate. `pnpm typecheck`; existing modifier tests stay green.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-008  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Simulation overflow contract — accept hypothetical level 50_000, never clamp the input  
CATEGORY: simulation-lab  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `longHorizonSim` documents `xpForNextLevel(1019)` as Infinity and `applyXpDelta(0, 1018, 1)` stuck (`longHorizonSim.ts` 424–428, `LONG_HORIZON_2026-08-31.md`). Tiers preview still `SAMPLE_LEVELS = [1, 10, 25, 50, 100, 200, 500]` (`AdminDashboard.tsx` 3619) and `tierSize` `max={100}` (3701). `pickEnemyLevelFromTiers` still caps `maxTier = floor(999/ts)` (`combatMath.ts` 58). `WDEAD-2026-08-31-003` required 50_000 support; the new harness’s stress list **omits** 10_000 / 50_000 and would teach implementers to stop at 5000 or 1018.  
SYSTEMS_AFFECTED: Admin Simulation + Tiers preview; `encounterSim` (proposed). Not `xpCurve.ts` (do not retune).  
RECOMMENDED_ACTION: Hypothetical player level is an unbounded integer field (bigint-safe display). Presets include 1 / 10 / 100 / 1_000 / 10_000 / 50_000. If XP or a picker overflows JS `Number`, the report prints overflow / offset histograms — it must not clamp the input to 999, 1018, 5000, or `tierSize` max. Remove `max={100}` from owner preview of tier size or treat it as a **bucket width**, not a level cap.  
AUTONOMY: IMPLEMENT_WHEN_PICKED with the lab (`WDEAD-2026-08-31-003`).  
DEPENDENCIES: WDEAD-2026-08-31-001 (uncapped pickers); WDEAD-2026-08-31-003; WDEAD-2026-09-01-002  
REGRESSION_RISK: LOW for live play (preview-only). HIGH if overflow is “fixed” by clamping player level in shared spawn code.  
VALIDATION_REQUIRED: Lab accepts 50_000 and returns a report (possibly with Infinity XP-to-next). Wallet unchanged. Preview at 50_000 does not rewrite `characterStats.level`. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-009  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Bind Boss Rush owner multipliers into the official applyRewards payload  
CATEGORY: boss-rush  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Admin Boss Rush tab (`AdminDashboard.tsx` 6717–6814) edits `room_N_enabled` and `room_N_reward` “x”, writes `localStorage` `bossRushConfig` then `adminSetBossRushConfig(JSON)`. Runtime rooms are `BOSS_RUSH_ROOMS` (`useBossRush.ts` 24–135) with flat 500–5000 Doka / 200–2000 XP. `persistBossRushRoomClear` (`bossRushProgress.ts` 155–198) advances `currentRoom` / `resetBossRush` then calls `completeBossRushRoom(..., 0, 0)`. `rewardResolver.ts` 164–166 adds `bossRushRoomReward` into the same `applyRewards` clamp. AGENTS.md: canister ignores client `dokaReward`/`xpReward`. The owner “x” is not paid.  
SYSTEMS_AFFECTED: Admin Boss Rush tab; `rewardResolver.computeRewardDeltas`; `bossRushProgress.ts` (keep 0, 0).  
RECOMMENDED_ACTION: Evaluated rush reward (relative curve × owner multiplier × room index) enters `bossRushRoomReward` on the official persist lock **after** `currentRoom` actually advances. `completeBossRushRoom` stays `(0, 0)`. Do not pay from the canister’s unused client reward args. Sequence / pool / relative boss scale remain `WDEAD-2026-08-31-008`. Payable amount still obeys 09-01-005.  
AUTONOMY: HUMAN_APPROVE — economy + room-0 farm guard.  
DEPENDENCIES: WDEAD-2026-08-31-008; WDEAD-2026-08-31-010; WDEAD-2026-09-01-005; WDEAD-2026-08-31-014  
REGRESSION_RISK: HIGH if jackpot room remains resumable after credit (`bossRushProgress.test.ts`). HIGH if a second wallet write is added beside `applyRewards`.  
VALIDATION_REQUIRED: Existing `bossRushProgress.test.ts` stays green. Changing owner multiplier changes the **applyRewards** delta in a unit test of `computeRewardDeltas`, not the `completeBossRushRoom` args. Sim does not write `getBossRushState`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-09-01-010  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Rest, sanctuary, and Death Realm as first-class owner eligibility contexts  
CATEGORY: world-events  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `worldFeatures.ts` `WorldFeatureRunMode` is only `exploration | dungeon | bossRush` (62). `isFeatureAllowedInContext` returns false for `deathRealm` with no owner override (786–792). Rest maps are live (`isRestMap`, WX 6099 `maxLevel: 9999`; 10% rest portal 5496–5501; white sanctuary colocates with spawn). Death Realm entry uses `maxLevel: 9999` (WX 6021) while fallback rebuilds stamp `maxLevel: 5` (14004, 14136) — the stamp stays `WDEAD-2026-08-31-001`. Flicker Gate / Gambit / Eclipse are hardcoded `EXPLORATION_ONLY` (138–139, 406, 581, 665). `WDEAD-2026-08-31-007` asked for dungeon rest **rooms**; it did not give the owner a run-mode enum on the catalog that now exists.  
SYSTEMS_AFFECTED: pack eligibility; `worldFeatures.ts` context mapping; rest / death / dungeon portal filters (`filterRunPortals`).  
RECOMMENDED_ACTION: Eligibility enum includes `exploration | dungeon | bossRush | rest | deathRealm`. Default: rest = no hostiles / optional shrine-only; deathRealm = mute. Owner may enable a quiet feature on deathRealm only via draft/validate (never encounters while death guards are armed). Do not use `levelMax` to hide regions or rest maps from high-level players. Keep `snapshotDungeonChain` before `cleanupMap`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: WDEAD-2026-09-01-003; WDEAD-2026-08-31-007 (rest-as-room still open); WDEAD-2026-08-31-001 (remove maxLevel: 5 stamps)  
REGRESSION_RISK: HIGH if rest maps start rolling Warband. HIGH if deathRealm features start encounters during the 1.5s guard.  
VALIDATION_REQUIRED: Default pack: `pickWeightedFeatures` on `deathRealm` is []. Rest map sim has zero hostiles unless the owner enabled a shrine encounter. Death guards still block portals and encounters. No `mapGen.ts` hunk.  
STATUS: NEW  
