# ACTION_IDs — 2026-09-01 Save / Data Evolution Guardian

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Save/Data Evolution Guardian.  
Audit: [`DATA_EVOLUTION_AUDIT_2026-09-01.md`](./DATA_EVOLUTION_AUDIT_2026-09-01.md).  
Prior ledger: `ACTION_IDS_2026-08-31.md` SDEG-2026-08-31-001…012.  
Do not clone draft Motoko from #209 / #215. Do not implement gameplay from this file unless a later human or orchestrator picks an ID.

---

## Carry-forward (2026-08-31)

ACTION_ID: SDEG-2026-08-31-001  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Wire the live actor to the migration chain before any required-field add  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `src/backend/main.mo` line 40 is still `actor {`. `mops.toml` chain is `src/backend/migrations` with `check-limit = 3`. Live source now has `adminAuditLog` and `*Prev` rollback stables that `20260827` NewActor does not list. Attaching today’s chain is not a no-op (see SDEG-2026-09-01-005).  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `src/backend/migrations/*`; `mops.toml`  
RECOMMENDED_ACTION: Before the next required persist field: (1) refresh inlined OldActor/NewActor to the live stable shape; (2) attach `(with migration = Migration.run)` on canonical `main.mo` only; (3) add one-shot `var migrationGeneration`. First wired module must copy player maps. Do not deploy `backend_extended`.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-002; SDEG-2026-09-01-005  
MIGRATION_REQUIREMENT: YES — attaching the annotation is itself an upgrade.  
REGRESSION_RISK: HIGH if inlined types do not match the live canister.  
VALIDATION_REQUIRED: `caffeine check` / `mops check` vs `.old`; fixture principal with 12-field Character, Doka, spellLevelKeys, achievements, dungeon, rush still loads.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-002  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Refresh inlined migration types before the chain can be attached  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live `AdminTypes.SpellConfig` (`types/admin.mo` 92–127) now has `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef`. `20260831_000000.mo` seeds those on catalog rows. `20260827_000000.mo` inlined SpellConfig (117–147) still omits them. `20260827` NewActor also omits rollback stables present on live `main.mo`.  
SYSTEMS_AFFECTED: `src/backend/migrations/20260827_000000.mo`; `20260831_000000.mo`; `types/admin.mo`  
RECOMMENDED_ACTION: Diff every live `let`/`var` against the tail NewActor. Add missing fields as optional or defaulted. Do not attach the chain until inlined types match. Do not treat 20260831 OldActor=`{spellConfigs}` as that match.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: Migration compiles against the live stable dump; summon spells still round-trip.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-003  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Stop the every-upgrade OLD_SPELL_IDS purge; remap ownership instead  
CATEGORY: content-id-stability  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `main.mo` 714–724 still `spellConfigs.remove`s `blood_nova`…`physical_attack` on every start/upgrade. `WorldExploration.tsx` 2354–2391 still hides the same ids **and names**. `upgradeSpell` 943–945 errors `Spell not found`. Player `spellLevelKeys` are not remapped. `physical_attack` is a live starter (`spellData.ts` 10) and a purged backend id.  
SYSTEMS_AFFECTED: `main.mo`; `WorldExploration.tsx`; `upgradeSpell`; `spellLevelKeys`  
RECOMMENDED_ACTION: Replace boot purge with one-shot `oldSpellIdsPurged` / `migrationGeneration`. Persist `oldId → newId` and remap keys once (max level if both exist). Keep retired ids in configs as `usableByPlayer = false`. Never delete `physical_attack` while it is a starter.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES — idempotent; replay must not double-map or zero levels.  
REGRESSION_RISK: HIGH if aliases are wrong.  
VALIDATION_REQUIRED: Fixture `spellLevelKeys = ["fireball","physical_attack"]` levels 3/2 still owns equivalents after two upgrades.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-004  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Persist owned spell ids (and discovery) separately from the live catalog  
CATEGORY: spell-discovery  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 311–318) returns true for every `usableByPlayer !== false`. `ownedSpells` (`WorldExploration.tsx` 2410–2438) unions starters + keys + bar + that catalog. `createCharacter` still stores empty keys (`_starterCharacter` 215–216). `setSpellBarOrder` 1642–1644 drops ids not in `spellLevelKeys`. `upgradeSpell` 1004–1008 **appends** any usable catalog id on first paid upgrade. No `ownedSpellIds` / observe / commit APIs in `src/backend`.  
SYSTEMS_AFFECTED: Character `spellLevelKeys`; `setSpellBarOrder`; `starterSpells`; `upgradeSpell`; future discovery  
RECOMMENDED_ACTION: Stored ownership set. Empty keys on old rows = starters ∪ upgraded ids, not catalog-all and not empty. Filter bar against owned ∪ starters. `upgradeSpell` must require already-owned (or a grant writer). Add optional `discoveredSpellIds` only with default `[]` after SDEG-001. Achievement unlocks write ids.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-003; SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: MEDIUM — under-seed bricks the bar; over-seed re-grants the catalog.  
VALIDATION_REQUIRED: Old empty-keys character still has starters; admin add does not appear in another account’s book; retired id with level > 0 remains.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-005  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Hydrate BuffShop from canister inventory; stop paid items living only in localStorage  
CATEGORY: inventory  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Official `BuffShop.tsx` 85–95 still reads/writes `${principalId}_inventory`. `versionGate.ts` 11 keeps `*_inventory`. Canister `buffInventories` (`main.mo` 2396, `purchaseBuff` / `useBuffItem`) is unused by that UI.  
SYSTEMS_AFFECTED: `BuffShop.tsx`; `buffInventories`; `versionGate.ts`; persist lock  
RECOMMENDED_ACTION: Buy/use through canister APIs on `createProgressPersist`. Hydrate from `getBuffInventory(slot)`. Cache only. Slot-scope the key.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: YES — copy localStorage into empty canister slots once; never overwrite a non-empty stack.  
REGRESSION_RISK: MEDIUM if a stale cache wins.  
VALIDATION_REQUIRED: Buy on A, login on B, stacks match; version bump does not duplicate or wipe.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-006  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Add a Character write generation so stale clients cannot clobber newer XP/Doka  
CATEGORY: stale-client  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `writeGeneration` / `schemaVersion` still grep-empty. `saveBattleStats` (`main.mo` 1767–1769) still `min` for Doka/XP so a stale heal/death snapshot can cut leftover after `applyRewards`. #107 clamp is on main (SDEG-012 done); it does not replace generation.  
SYSTEMS_AFFECTED: `saveBattleStats`; `applyRewards`; persist lock; Character  
RECOMMENDED_ACTION: Optional `writeGeneration : ?Nat` (default 0). Increment on success. Reject older absolute writes except signed death. Do not land in a third `saveBattleStats` PR while #209/#215 are open — extend those or wait.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001; #209 / #215  
MIGRATION_REQUIREMENT: YES — optional/defaulted field.  
REGRESSION_RISK: HIGH if death retries use a stale generation.  
VALIDATION_REQUIRED: applyRewards then stale saveBattleStats does not cut leftover; death 20/40 still lands.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-007  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Make dungeon and Boss Rush progress writes idempotent and slot-scoped  
CATEGORY: progress-idempotency  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `dungeonRecords` is Principal-keyed (`main.mo` 2522–2552). `updateDungeonProgress` always does `totalMapsCompleted + 1`. Depth is clamped to 16 (`AdminGuard.MAX_DUNGEON_DEPTH`) — content bound, not a player-level cap. `completeBossRushRoom` 2965 still `+ 1` when `roomIndex == 9` with no “already counted this run” guard. #209 drafts a rush-only fix; dungeon half is untouched.  
SYSTEMS_AFFECTED: `dungeonRecords`; `bossRushStates`; `completeBossRushRoom`; `updateDungeonProgress`  
RECOMMENDED_ACTION: Key dungeon by `principal#slot` (migrate Principal-only rows onto slot 1). Increment maps only when `depth` increases. Increment rush runs only when `highestRoomCompleted` first reaches 10 (or #209’s equivalent once-per-master).  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001; do not clone #209 rush hunk if that PR is the vehicle  
MIGRATION_REQUIREMENT: YES — copy Principal record to slot1; do not duplicate on replay.  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Double updateDungeonProgress(depth=2) → +1 map; two slots keep separate chains; double complete room 9 → +1 run.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-008  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Snapshot achievement reward at unlock; keep progress when config is retired  
CATEGORY: achievements  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `adminDeleteAchievementConfig` (`main.mo` 2064–2084) now soft-retires when any progress row exists. `claimAchievementReward` 2149–2172 no longer requires `active` and still pays. Remaining hole: claim uses **current** `config.dokaReward` (admin can change after unlock). Conditions are still frontend strings (`first_battle_win`, `level_10`).  
SYSTEMS_AFFECTED: `achievementConfigs`; `achievementProgress`; `AchievementsPanel`  
RECOMMENDED_ACTION: Soft-delete only (already mostly done). Add optional `dokaRewardAtUnlock : ?Nat` (default current config). Renames keep `id`.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: Optional field only.  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unlock, deactivate, claim still pays once at the unlock-time amount; second claim `#err`.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-009  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: updateCharacter must not wipe or mint spell levels  
CATEGORY: spell-levels  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Union+max `_mergeSpellLevels` is on main (`main.mo` 289–315, 447–459). Prevents wipe. Allows incoming-only ids and raised levels (mint). #209/#215 switch to keep-store. Frontend contract should stay “appearance never writes arrays.”  
SYSTEMS_AFFECTED: `updateCharacter`; `upgradeSpell`  
RECOMMENDED_ACTION: Keep-store is the correct next step (SDEG-2026-09-01-002). Do not revert to full replace. `upgradeSpell` remains the only increment path. `saveBattleStats` must keep ignoring the arrays.  
AUTONOMY: IMPLEMENT (union+max landed); HUMAN (keep-store via #209/#215)  
DEPENDENCIES: SDEG-2026-09-01-002  
MIGRATION_REQUIREMENT: None (behavior-only).  
REGRESSION_RISK: LOW for keep-store; MEDIUM if union+max stays.  
VALIDATION_REQUIRED: Appearance with extra keys → stored keys unchanged; incoming lower level → keep store.  
STATUS: IMPLEMENTED  

---

ACTION_ID: SDEG-2026-08-31-010  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: XP helpers must not use JS Number as a silent max level  
CATEGORY: unbounded-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Shared helper landed 2026-08-31. This run replaced WX HUD init `100 * 2 ** (savedLevel - 1)` with `xpForNextLevel` (`WorldExploration.tsx` 3230). Recap/select already use the helper. Remaining Number leaks: `Number(experience)` on hydrate (HUD only); `getEnemyHPForLevel` Float; `readApplyRewardsOk` uses `Number(newXp)`.  
SYSTEMS_AFFECTED: `xpCurve.ts`; `WorldExploration.tsx`; leftover Number hydrates  
RECOMMENDED_ACTION: Landed for HUD init. Do not change `getEnemyHPForLevel` without a human. Keep leftover XP on the wire as bigint where persist reads it.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: `xpCurve.test.ts`; WX init at level 1/2 is 100/200.  
STATUS: IMPLEMENTED  

---

ACTION_ID: SDEG-2026-08-31-011  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Do not deploy dfx.json backend_extended (15-field stats) over the 12-field live actor  
CATEGORY: deploy-hazard  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live CharacterStats is 12 fields (`main.mo` 137–150). `dfx.json` still points at `src/backend_extended/main.mo`. Root `backend_extended/main.mo` 46–61 still has `wp`/`wr`/`scp` and no `killCount`.  
SYSTEMS_AFFECTED: `dfx.json`; `backend_extended/`; bindgen; live canister  
RECOMMENDED_ACTION: Point dfx at `src/backend/main.mo` only after a planned upgrade. Never “fix” bindgen to 15 fields.  
AUTONOMY: HUMAN  
DEPENDENCIES: Live canister upgrade plan  
MIGRATION_REQUIREMENT: YES if the deployed actor is still 15-field  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: After any deploy, `getCharacter` + `updateCharacter` with 12-field payload including `killCount` succeeds.  
STATUS: OPEN  

---

ACTION_ID: SDEG-2026-08-31-012  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Review #107 absolute-write clamp; do not open a second saveBattleStats PR  
CATEGORY: stale-client  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: #107 is **closed/merged**. `saveBattleStats` 1767–1768 refuses Doka/XP mints. Death 20/40 can still decrease. Does not ignore client level (09-01-001) and does not add generation (006).  
SYSTEMS_AFFECTED: `saveBattleStats`  
RECOMMENDED_ACTION: No clone. Next persist PR should be generation (006) or the #209/#215 level keep, not another mint clamp.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: n/a  
VALIDATION_REQUIRED: Death cut still persists; applyRewards then heal snapshot cannot raise Doka.  
STATUS: IMPLEMENTED  

---

## New (2026-09-01)

ACTION_ID: SDEG-2026-09-01-001  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: saveBattleStats must ignore client level (applyRewards is the sole writer)  
CATEGORY: stale-client  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Comment at `main.mo` 1688–1692 says the client level is ignored. Parameter is `_level` but 1769 still writes `min(incoming, stored)`. A stale heal/death snapshot after `applyRewards` demotes the character. Incoming 0 would store level 0. Frontend `clampSaveBattleStatsWrite` already keeps `stored.level` (`absoluteStatsClamp.ts` 23–31). Death penalty does not change level (`deathPenalty.ts` 47–60). Drafts #209 and #215 already set `writeLevel = character.level`.  
SYSTEMS_AFFECTED: `saveBattleStats`; persist lock; death/heal/shop snapshots  
RECOMMENDED_ACTION: Land via #209 or #215. Do not open a third Motoko PR. This run only locked the frontend helper test.  
AUTONOMY: HUMAN  
DEPENDENCIES: #209 or #215  
MIGRATION_REQUIREMENT: None (behavior-only; idempotent).  
REGRESSION_RISK: LOW — official death/heal/shop never intend to change level.  
VALIDATION_REQUIRED: applyRewards 5→6 then stale `_level=5` keeps 6; death 20/40 still cuts XP/Doka.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-01-002  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Appearance updates must keep stored spell arrays (no union+max mint)  
CATEGORY: spell-levels  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `_mergeSpellLevels` unions incoming keys and takes `Nat.max` (`main.mo` 289–315). A raw appearance payload can add a retired id (`upgradeSpell` then `found=true` and skips the usableByPlayer gate at 979) or raise a paid level. Empty incoming already keeps the store (wipe is closed). #209/#215 keep stored arrays.  
SYSTEMS_AFFECTED: `updateCharacter`; `upgradeSpell`; CharacterCreation  
RECOMMENDED_ACTION: Land keep-store via #209 or #215. Do not clone. Do not revert to replace.  
AUTONOMY: HUMAN  
DEPENDENCIES: #209 or #215  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: LOW — official editor already sends stored keys or [].  
VALIDATION_REQUIRED: Incoming extra id + level 99 → stored unchanged.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-01-003  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Do not approve #209 HP-cap tighten as a silent player-HP migration  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live `saveBattleStats` cap is `character.level * 200 + 100` (`main.mo` 1731). Official linear max is `100 * (1 + (level-1) * 0.05)` (`deathPenalty.ts` 132–140; `longHorizonSim.ts` `linearPlayerMaxHp` vs `updateCharacterMaxHpAllowed`). #209 changes the canister cap to the linear formula. Any HP stored under the old cap (heal/jackpot using client `maxHp`, or a yesterday snapshot at 300 at level 1) is **cut** on the next absolute write.  
SYSTEMS_AFFECTED: `saveBattleStats`; heals; jackpot; idle hydrate  
RECOMMENDED_ACTION: Reject that hunk until a cohort check proves official paths never persist above the linear max. If a tighten is required, migrate with `min(storedHp, newCap)` documented as a one-shot and a generation so it cannot re-cut.  
AUTONOMY: HUMAN  
DEPENDENCIES: #209  
MIGRATION_REQUIREMENT: YES if the cap is tightened on existing rows.  
REGRESSION_RISK: HIGH — silent HP loss on old saves.  
VALIDATION_REQUIRED: Level-1 row with hp=300 (if any official path produced it) must not become 100 on heal; official maxHp heal still persists.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-01-004  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Split applyRewards anti-mint ceilings from official high-level payouts  
CATEGORY: unbounded-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `applyRewards` 1798–1799 rejects `dokaDelta > 100_000` / `xpDelta > 500_000`. `clampApplyRewardsDeltas` (`applyRewardsResult.ts` 46–61) silently `Math.min`s so persist cannot `#err`. Comment and `rewardResolver.loss.test.ts` 120–140 document that victory 0.01% of `level * [1, 1e9]` (and dungeon 4× + fever) exceeds the cap. A level-2+ max Doka roll is truncated; leftover is never written. No stored max level, but payouts assume one.  
SYSTEMS_AFFECTED: `applyRewards`; `rewardResolver.ts`; recap advertised vs committed  
RECOMMENDED_ACTION: Keep a raw-client ceiling if needed, but official payouts must persist in full (chunked calls, higher official-signed cap, or a curve that cannot exceed the ceiling). Recap must not advertise more than the committed grant. Do not “fix” by lowering the victory band without a human (economy).  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None (no schema). Wallet rows stay Nat.  
REGRESSION_RISK: HIGH if the ceiling is removed without another mint guard; MEDIUM if official grants are chunked twice.  
VALIDATION_REQUIRED: High-level jackpot roll: recap Doka == canister delta; raw client Nat-max still `#err`.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-01-005  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: 20260831 OldActor is check-stable only — never a live player-data source  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `20260831_000000.mo` OldActor is `{ spellConfigs }` (119–121). `migration` copies only that map and **defaults** rollback vars (141–190). `20260827` NewActor still has `characterSlots`, `dokaBalances`, achievements, dungeon, rush (322–354). Attaching the current chain to a populated canister would fail compat or drop those maps. `mops.toml` comments say empty-canister genesis; `check-limit = 3` is the Caffeine `.old` path.  
SYSTEMS_AFFECTED: migration chain; live upgrade; Caffeine import  
RECOMMENDED_ACTION: Do not attach `(with migration)` until a new module’s OldActor is the full live shape. Keep 20260831 as the empty-previous tail. Document in ARCHITECTURE that check-stable ≠ live upgrade.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001; SDEG-2026-08-31-002  
MIGRATION_REQUIREMENT: YES — any live attach must copy every player map.  
REGRESSION_RISK: HIGH — data loss if mis-attached.  
VALIDATION_REQUIRED: `mops check` still green; a review comment on any PR that adds `(with migration)` to `main.mo` must show OldActor field parity with live `let`/`var`.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-09-01-006  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Unknown or retired pieceType must use getCreaturePattern fallback  
CATEGORY: visuals  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `getCreaturePattern` (`pieceArt.ts` 631–645) falls back to `chessPiecePatterns.king.front`. WX portrait 3737 and player draw 8925 index `chessPiecePatterns[pieceType]` with no fallback. `createCharacter`/`updateCharacter` reject unknown types (`_isKnownPieceType` 162–165), so official new rows are safe. A renamed piece or a pre-validation row throws and can take down the session. Sprite URL delete does **not** corrupt Character (`adminDeletePlayerSpriteConfig` 833–838).  
SYSTEMS_AFFECTED: `WorldExploration.tsx` portrait/draw; `pieceArt.ts`  
RECOMMENDED_ACTION: Route those two lookups through `getCreaturePattern` (or equivalent `?? king.front`). Do not make `spriteUrl` required. Do not rewrite the RAF loop beyond the lookup.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: LOW for fallback; MEDIUM if the RAF body is rewritten.  
VALIDATION_REQUIRED: Character with `pieceType: "unknown"` paints king.front; king/queen unchanged; delete sprite config leaves the row loadable.  
STATUS: NEW  

---
