# ACTION_IDs — 2026-09-02 Save / Data Evolution Guardian

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Save/Data Evolution Guardian.  
Audit: [`DATA_EVOLUTION_AUDIT_2026-09-02.md`](./DATA_EVOLUTION_AUDIT_2026-09-02.md).  
Prior: `ACTION_IDS_SDEG_2026-09-01.md`.  
Do not clone #259. Do not restuff shipped migration NewActor types.

---

## Closed / landed since 2026-09-01

ACTION_ID: SDEG-2026-09-01-001  
STATUS: IMPLEMENTED  
EVIDENCE: `saveBattleStats` writes `level = character.level` (`main.mo` 2032). Vehicles #209 / #215 merged.

ACTION_ID: SDEG-2026-09-01-002  
STATUS: IMPLEMENTED  
EVIDENCE: `updateCharacter` keep-store spell arrays (`main.mo` 421–427). Vehicles #209 / #215 merged.

ACTION_ID: SDEG-2026-08-31-009  
STATUS: IMPLEMENTED  
EVIDENCE: Keep-store superseded union+max.

ACTION_ID: SDEG-2026-08-31-007 (Boss Rush half)  
STATUS: IMPLEMENTED  
EVIDENCE: `shouldCountBossRushRun` + `completeBossRushRoom` (`main.mo` 3284–3286). Dungeon half remains OPEN.

ACTION_ID: SDEG-2026-09-01-006  
STATUS: IMPLEMENTED  
EVIDENCE: `getPersistedPiecePattern` in `pieceArt.ts` 653–658; WX portrait 3680 + player draw 8342 (this run).

ACTION_ID: SDEG-2026-09-01-003  
STATUS: SUPERSEDED  
EVIDENCE: Linear cap landed via #209. Silent cut mitigated by SDEG-2026-09-02-003 (grandfather). Victory-floor clash is SDEG-2026-09-02-001.

---

## Carry-forward (still OPEN)

ACTION_ID: SDEG-2026-08-31-001  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Wire the live actor to the migration chain before any required-field add  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `src/backend/main.mo` line 44 is still `actor {`. mops injects the chain anyway (#258 GameKey IC0503). #259 only adds GameKey defaults; it is not a full OldActor=live-shape attach.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `src/backend/migrations/*`; `mops.toml`  
RECOMMENDED_ACTION: After #259: new later files only. First wired module that rewrites player maps must copy every map. Do not deploy `backend_extended`.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-002; #259  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: `mops check` vs `.old` and `post-20260831.most`; fixture principal still loads.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-002  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Refresh inlined migration types before a full-chain attach  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `20260827` inlined SpellConfig still omits summon fields. #259 restores 20260831 without GameKey and adds 20260901 GameKey-only. That is not full live-shape parity.  
SYSTEMS_AFFECTED: `src/backend/migrations/*`  
RECOMMENDED_ACTION: Diff every live `let`/`var` against the tail NewActor before attaching `(with migration)` as a player rewrite.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001; #259  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: Migration compiles; summon spells and GameKey rows round-trip.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-003  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Stop the every-upgrade OLD_SPELL_IDS purge; remap ownership instead  
CATEGORY: content-id-stability  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `main.mo` 686–695 still `spellConfigs.remove`s `physical_attack` on every start. `WorldExploration.tsx` still hides by id **and name**.  
SYSTEMS_AFFECTED: `main.mo`; `WorldExploration.tsx`; `upgradeSpell`; `spellLevelKeys`  
RECOMMENDED_ACTION: One-shot `oldSpellIdsPurged` after SDEG-001. Persist `oldId → newId`. Never delete `physical_attack` while it is a starter.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES — idempotent  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: Fixture `spellLevelKeys = ["fireball","physical_attack"]` survives two upgrades.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-004  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Persist owned spell ids (and discovery) separately from the live catalog  
CATEGORY: spell-discovery  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `shouldIncludeBackendSpellInLibrary` still true unless retired. `upgradeSpell` still appends any usable catalog id (`main.mo` 1022–1026). `setSpellBarOrder` still filters to `spellLevelKeys` only.  
SYSTEMS_AFFECTED: Character; `upgradeSpell`; starters; future discovery  
RECOMMENDED_ACTION: Stored ownership set with empty-keys = starters ∪ upgraded, not catalog-all. Do not add required fields until SDEG-001.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-003; SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Old empty-keys still has starters; admin add does not appear in another account’s book.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-005  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Hydrate BuffShop from canister inventory; stop paid items living only in localStorage  
CATEGORY: inventory  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `BuffShop.tsx` 85–95 still `${principalId}_inventory`. Canister `buffInventories` unused by that UI.  
SYSTEMS_AFFECTED: `BuffShop.tsx`; `buffInventories`; `versionGate.ts`  
RECOMMENDED_ACTION: Buy/use through canister APIs on `createProgressPersist`. Copy localStorage into empty canister slots once.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Buy on A, login on B, stacks match.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-006  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Add a Character write generation so stale clients cannot clobber newer XP/Doka  
CATEGORY: stale-client  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `writeGeneration` still grep-empty. `saveBattleStats` still `min`s incoming Doka/XP so a stale heal after `applyRewards` can cut leftover.  
SYSTEMS_AFFECTED: `saveBattleStats`; `applyRewards`; Character  
RECOMMENDED_ACTION: Optional `writeGeneration : ?Nat` after SDEG-001. Reject older absolute writes except signed death.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES — optional/defaulted  
REGRESSION_RISK: HIGH if death retries use a stale generation  
VALIDATION_REQUIRED: applyRewards then stale saveBattleStats does not cut leftover.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-007  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Make dungeon progress writes idempotent and slot-scoped  
CATEGORY: progress-idempotency  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `dungeonRecords` is Principal-keyed (`main.mo` 2829–2859). `updateDungeonProgress` always `totalMapsCompleted + 1`. Rush half landed.  
SYSTEMS_AFFECTED: `dungeonRecords`; `updateDungeonProgress`  
RECOMMENDED_ACTION: Key by `principal#slot` (migrate Principal-only onto slot 1). Increment maps only when `depth` increases.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Double updateDungeonProgress(depth=2) → +1 map; two slots keep separate chains.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-008  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Snapshot achievement reward at unlock; keep progress when config is retired  
CATEGORY: achievements  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Soft-retire landed. `claimAchievementReward` still pays **current** `config.dokaReward` (`main.mo` 2484).  
SYSTEMS_AFFECTED: `achievementProgress`; `claimAchievementReward`  
RECOMMENDED_ACTION: Optional `dokaRewardAtUnlock : ?Nat`. Renames keep `id`.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: Optional field only  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unlock, deactivate, claim pays unlock-time amount once.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-011  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Do not deploy dfx.json backend_extended (15-field stats) over the 12-field live actor  
CATEGORY: deploy-hazard  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `dfx.json` still points at missing/stale `backend_extended`. Live CharacterStats is 12 fields.  
SYSTEMS_AFFECTED: `dfx.json`; `backend_extended/`; bindgen  
RECOMMENDED_ACTION: Point dfx at `src/backend/main.mo` only after a planned upgrade. Never “fix” bindgen to 15 fields.  
AUTONOMY: HUMAN  
DEPENDENCIES: Live canister upgrade plan  
MIGRATION_REQUIREMENT: YES if deployed actor is still 15-field  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: `getCharacter` + `updateCharacter` with 12-field `killCount` succeeds.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-09-01-004  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Split applyRewards anti-mint ceilings from official high-level payouts  
CATEGORY: unbounded-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `applyRewards` 2058–2059 still rejects `> 100_000` / `> 500_000`. `clampApplyRewardsDeltas` still truncates. Comment claims the ceiling is above official payouts; `rewardResolver.loss.test.ts` still documents jackpot overflow.  
SYSTEMS_AFFECTED: `applyRewards`; recap advertised vs committed  
RECOMMENDED_ACTION: Official payouts must persist in full. Recap must not advertise more than committed. Do not lower the victory band without a human.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: HIGH if the ceiling is removed without another mint guard  
VALIDATION_REQUIRED: High-level jackpot: recap Doka == canister delta.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-09-01-005  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: 20260831 OldActor is check-stable only — never a live player-data source  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Stuffing GameKey into shipped 20260831 NewActor caused Caffeine IC0503. Vehicle: #259 (restore frozen 20260831 + `20260901` empty GameKey maps).  
SYSTEMS_AFFECTED: migration chain; live upgrade  
RECOMMENDED_ACTION: Merge #259. Never edit a shipped NewActor again.  
AUTONOMY: HUMAN (#259)  
DEPENDENCIES: #259  
MIGRATION_REQUIREMENT: YES — GameKey empty defaults only  
REGRESSION_RISK: HIGH if #259 is skipped and GameKey wasm is deployed  
VALIDATION_REQUIRED: `mops check-stable …/post-20260831.most backend`; populated Caffeine `install_code` no longer traps.  
STATUS: OPEN  

---

## New (2026-09-02)

ACTION_ID: SDEG-2026-09-02-001  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Align victory HP floor with persist HP cap so L10+ victories are not clipped  
CATEGORY: unbounded-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `victoryResourceFloor` / `victoryHpFloor` is `50 + level*10` (`deathPenalty.ts` 144–154; `longHorizonSim.ts` 112–114). Linear persist max at 5% is `100 + (level-1)*5`. At level 10: 150 vs 145. `longHorizonSim.test.ts` asserts `victoryHpFloor(10) > linearPlayerMaxHp(10)`. `clampPersistedHpWrite(100, 150, 10, 5) === 145`. Grandfather only helps when **stored** already exceeds the cap.  
SYSTEMS_AFFECTED: `saveBattleStats`; post-battle hydrate; `deathPenalty.ts`  
RECOMMENDED_ACTION: Human picks one formula. Do not silently cut official victory HP. Do not raise the raw-client cap to `level*200+100` again.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None if victory floor is lowered; YES if stored HP must be rewritten  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Level-10 victory persist HP equals the HUD floor; level-1 raw 300 still cannot mint on a new row.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-02-002  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Approve #259 GameKey EOP migration; never restuff 20260831  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: #258 added `gameKeyRequests`/`gameKeyLedger`/`gameKeyReveals`/`lastGameKeyRequestAt`/`nextGameKeyRequestId` to shipped `20260831` NewActor. Live `main.mo` is `actor {` but mops injects the chain. Caffeine `install_code` on `cwofb-yqaaa-aaaap-qp45q-cai` trapped IC0503. #259 restores frozen 20260831 and adds `20260901` with empty GameKey defaults. OldActor is the post-20260831 tail **without** GameKey — not `{spellConfigs}`-only, and not a wipe of `characterSlots`.  
SYSTEMS_AFFECTED: `src/backend/migrations/20260901_000000.mo`; `mops.toml` `check-limit`; live Caffeine canister  
RECOMMENDED_ACTION: Merge #259. Subsequent persist fields → `20260902_…` or later. Do not clone this PR.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: YES — empty maps / `nextGameKeyRequestId = 0`. Idempotent. Replay must not wipe player maps.  
REGRESSION_RISK: HIGH if OldActor/NewActor field lists diverge from the deployed 20260831 tail  
VALIDATION_REQUIRED: Empty import still starts at `{}`; populated canister past 20260831 runs 20260901 only; GameKey request then redeem still credits Doka.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-02-003  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Grandfather stored HP above the live linear persist cap  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: #209 replaced `level*200+100` with `maxPersistedHp`. A row with hp=300 at level 1 (old cap) was cut on the next `saveBattleStats`. Admin lowering `statGrowthPercent` would recut. This run: `persistHpWriteCap` (`adminGuard.mo` 553–556; `saveBattleStats` 1990–1996).  
SYSTEMS_AFFECTED: `saveBattleStats`; `adminGuard.mo`; `adminSafety.ts`  
RECOMMENDED_ACTION: Landed this run. Keep on future cap changes.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None (behavior-only; one-way grandfather; not reapplied as a destructive rewrite)  
REGRESSION_RISK: LOW — new rows still cannot exceed official max; death still cuts  
VALIDATION_REQUIRED: `adminSafety.test.ts` grandfather cases; `pnpm typecheck` / `pnpm check`; `mops check`  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-02-004  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Credit or close leftover KYC purchaseRecords after GameKey replaced auto-complete  
CATEGORY: inventory  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `initiatePurchase` now always `#err` (`main.mo` 1154). `processPendingPurchases` returns 0 (`main.mo` 1306–1315). `purchaseRecords` and `shopPackages` remain stable. A player with `status=pending` from yesterday’s KYC flow never receives Doka unless `adminAddDokaToUser`.  
SYSTEMS_AFFECTED: `purchaseRecords`; admin Doka grant; Buy Doka UI  
RECOMMENDED_ACTION: Admin cohort: pending rows → grant via `adminAddDokaToUser` or mark rejected. Do not re-enable 60s auto-complete. Do not delete the map without a later migration file.  
AUTONOMY: HUMAN  
DEPENDENCIES: #259 (GameKey must deploy first)  
MIGRATION_REQUIREMENT: No schema; operational backfill  
REGRESSION_RISK: MEDIUM if pending rows are double-credited  
VALIDATION_REQUIRED: Fixture pending purchase: wallet increases once; GameKey path unchanged.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-02-005  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Do not wrap nextGameKeyRequestId onto existing gk_ keys  
CATEGORY: persist-schema  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `main.mo` 1408–1426: `nextGameKeyRequestId > 999_999_999` then `:= 1`, then `gameKeyRequests.add(id, record)` overwrites `gk_1` if still present. Nat itself is unbounded; the wrap is a silent max.  
SYSTEMS_AFFECTED: `gameKeyRequests`; `nextGameKeyRequestId`  
RECOMMENDED_ACTION: Skip occupied ids (or stop wrapping). Do not reuse a redeemed request id.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None if skip-occupied; YES if ids are rewritten  
REGRESSION_RISK: LOW until 1e9 requests; HIGH if wrap hits a live row  
VALIDATION_REQUIRED: Seed `gk_1`, set counter to wrap, next request is not `gk_1`.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-02-006  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Redeem GameKey must not be a confused-deputy credit if requester-only is the product rule  
CATEGORY: inventory  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `redeemGameKey` credits **caller**, not `userPrincipal` on the request (`main.mo` 1436–1498). Ledger marks redeemed. Gifting is possible; leaked keys drain the SKU to the redeemer while the payer’s history shows redeemed and their wallet is unchanged.  
SYSTEMS_AFFECTED: `redeemGameKey`; `dokaBalances`; `gameKeyLedger`  
RECOMMENDED_ACTION: Human confirms gift-vs-payer. If payer-only: require `caller == rec.userPrincipal`. Do not change without product sign-off.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: MEDIUM if gifts are intended  
VALIDATION_REQUIRED: Payer redeems → payer Doka += amount; second redeem `#err`.  
STATUS: NEW  
