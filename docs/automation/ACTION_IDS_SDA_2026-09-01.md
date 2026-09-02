# ACTION_IDs — 2026-09-01 Spell, Discovery & Achievement Admin Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Spell, Discovery & Achievement Admin Designer.  
Design contract: [`SPELL_ADMIN_DESIGN_2026-09-01.md`](./SPELL_ADMIN_DESIGN_2026-09-01.md) (delta) + [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md) (full studio).  
Prior IDs `SDA-2026-08-31-001` … `013` remain OPEN or PARTIAL — do not close them from this file.  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **docs only**.

HEAD: `dd275aa`.

---

ACTION_ID: SDA-2026-09-01-001  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Separate lifecycle from usableByPlayer  
CATEGORY: dependency-safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: After #116, `adminDeleteSpellConfig` (`src/backend/main.mo` 861–880) refuses to delete the six `isBuiltInSpellId` rows and otherwise writes `{ existing with usableByPlayer = false }` when `_spellReferencedByPlayers` is true. `upgradeSpell` (974–982) treats `usableByPlayer=false` as “Spell is retired.” Client helpers `shouldRejectRetiredSpellUpgrade` / `shouldIncludeBackendSpellInLibrary` (`src/frontend/src/utils/adminSafety.ts` 128–134, 310–318) use the same flag. `usableByPlayer` is documented as a cast/equip gate (`src/backend/types/admin.mo` 117). `ENEMY_ONLY` / `BOSS_ONLY` / “not yet player-castable” need that gate without implying retirement. Owned-but-never-upgraded ids are not in `spellLevelKeys`, so the current upgrade check would block the legacy upgrade 08-31 §8.2 requires.  
SYSTEMS_AFFECTED: `main.mo` `adminDeleteSpellConfig` / `upgradeSpell`; `adminGuard.mo` `isBuiltInSpellId`; `adminSafety.ts`; Admin retire control; future `lifecycle` on `SpellDefinition`  
RECOMMENDED_ACTION: Add `lifecycle: draft | active | inactive | retired`. Keep `usableByPlayer` / `usableByEnemy` as cast gates only. Retire writes `retired` + freezes `retiredRevision`. `upgradeSpell` allows owned retired ids (owned set ∪ `spellLevelKeys`), rejects unowned retired. Do not extend the `usableByPlayer=false` retire path. Validator rejects `PLAYER_LEARNABLE=true` on `ENEMY_ONLY` / `BOSS_ONLY`.  
AUTONOMY: HUMAN_APPROVE — persist shape + live actor upgrade.  
DEPENDENCIES: SDA-2026-08-31-005 (supersedes the field choice); SDA-2026-09-01-003 (owned set)  
REGRESSION_RISK: HIGH if existing `usableByPlayer=false` rows are migrated as retired when they were meant as enemy-only. Inventory those ids before flip.  
VALIDATION_REQUIRED: Retire a published id: already-owned still casts and upgrades; new character cannot learn; `usableByPlayer` can stay true for that owned cast. An `ENEMY_ONLY` active id with `usableByPlayer=false` is not treated as retired.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-002  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Align bindgen and adapters with Motoko summon fields  
CATEGORY: spell-contract  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Motoko `SpellConfig` now includes `isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`, `cooldown` (`src/backend/types/admin.mo` 121–126). Bindgen `SpellConfig` and `to_candid_record_n16` (`src/frontend/src/backend.ts` 115–145, 4050–4141) still omit the summon block. `toBackendSpellConfig` (`src/frontend/src/utils/adminContract.ts` 235–248) only maps `hitsMultiple`/`multiTarget` and `cooldown`. `useAdminSetSpellConfig` (`src/frontend/src/hooks/useSpellQueries.ts` 61–65) sends that adapter output. Same class as the 15-field vs 12-field CharacterStats lesson: source Motoko is not enough if bindgen/live actor lag.  
SYSTEMS_AFFECTED: `src/frontend/src/backend.ts`; `adminContract.ts`; `useSpellQueries.ts`; live actor upgrade  
RECOMMENDED_ACTION: Regenerate or hand-extend bindgen so Admin save/load includes the Motoko summon record. Extend `toBackendSpellConfig` / `fromBackendSpellConfig` to pass those fields through (never derive `summonAI` from `name`). Ship actor + bindgen together. Do not deploy `backend_extended/`.  
AUTONOMY: HUMAN_APPROVE — Candid shape.  
DEPENDENCIES: None for the alignment itself; SDA-2026-09-01-005 for `targetType` (still absent on Motoko).  
REGRESSION_RISK: HIGH — every `adminSetSpellConfig` / `getSpellConfigs` call. A lagging actor rejects new-field saves.  
VALIDATION_REQUIRED: Save a row with `isSummon=true`, `summonAI="hunter"`, `summonLifespan=4`, refetch; fields survive. `pnpm typecheck` + `caffeine check` / `mops check`.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-003  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Stop treating shouldIncludeBackendSpellInLibrary as ownership  
CATEGORY: ownership-persist  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `ownedSpells` is still `starterSpells` (all forced `isBaseSpell`) ∪ backend rows (`WorldExploration.tsx` 2393–2438). `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 310–318) returns true whenever `usableByPlayer !== false`. The `ownedIds` argument is `baseSpells ∪ spellLevelKeys ∪ spellBarOrder` — `baseSpells` is the entire frontend catalog (`spellData.ts` 27–663, 31 unique ids). Adding a spell in Admin with the default `usableByPlayer: true` (`AdminDashboard.tsx` 81, 2567) still grants it to every player on hydrate. No `ownedSpellIds` / `observedSpellIds` store. `ARCHITECTURE.md` persist table still has only `spellLevelKeys` / `spellBarOrder`.  
SYSTEMS_AFFECTED: `WorldExploration.tsx` ownedSpells; `adminSafety.ts`; `SpellbookModal.tsx`; `main.mo` character maps; create-character seed  
RECOMMENDED_ACTION: Implement SDA-2026-08-31-002. Catalog `getSpellConfigs` stays public and does not imply ownership. Seed create with `SYSTEM_ONLY` / innate ids that exist in the canister (09-01-007). Migrate from `spellLevelKeys ∪ spellBarOrder` plus those base ids — **not** `getSpellConfigs()` and **not** the full `starterSpells` array. After that, the library helper reads `ownedSpellIds` only (plus retired-owned). Extract the helper; do not grow WX.  
AUTONOMY: HUMAN_APPROVE — persist-lock and character-record shape.  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-09-01-001; SDA-2026-09-01-007  
REGRESSION_RISK: HIGH — under-seed drops the bar; over-seed reintroduces “everyone owns the catalog.”  
VALIDATION_REQUIRED: New character owns only innate/system ids. Admin adding a catalog spell does not change another account’s spellbook. Reload: backend wins over localStorage.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-004  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Dependency report before retire; hard-delete only drafts  
CATEGORY: dependency-safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `_spellReferencedByPlayers` (`main.mo` 243–274) only scans `spellLevelKeys` and `spellBarOrder`. `adminDeleteSpellConfig` (861–880) hard-`remove`s when that scan is false. Boss seeds still list purged ids (`admin.mo` 350+ vs `main.mo` 715–723). Admin `EnemyConfig` has no kit field, so enemy refs are invisible. Achievements have no `spellRewardIds`. Confirm copy (`AdminDashboard.tsx` 3538–3547) says the live spell is removed and dependents will break; toast is always `"Spell deleted"` (5618–5621). `adminDeleteEnemyConfig` (777–783) is still unconditional `remove`. Achievement delete (2064–2084) hard-removes when no progress rows exist.  
SYSTEMS_AFFECTED: `main.mo` admin deletes; Admin confirm/toast; future graph inspector; boss/enemy/achievement stores  
RECOMMENDED_ACTION: Build a dependency report from ids (spell → enemies, achievements, challenges, bosses, AI/summon kits, acquisition). Retire if any live ref or any character own/level/bar. Hard delete only `lifecycle=draft` with zero published revisions and zero refs; else `#err` + report. Same rule for achievements and enemy configs. UI: Retire vs Delete; toast matches the canister result; list dependents.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-09-01-001; SDA-2026-08-31-005  
REGRESSION_RISK: HIGH if hard delete remains for “no player keys” while kits still list the id.  
VALIDATION_REQUIRED: Unreferenced draft deletes. Referenced active id retires and returns ok without `remove`. Boss-pool-only ref blocks delete. Confirm does not claim “removed” on retire.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-005  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Persist targetType and combat mechanic flags  
CATEGORY: spell-contract  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Engine required fields include `targetType`, buff/debuff/DoT, `isSwap`/`isMirror`/`isTimestep`/`isSacrifice` (`src/frontend/src/engine/spellEngine.ts` 6–13; `types/gameTypes.ts` 196–237). Motoko persist (`admin.mo` 92–126) and bindgen (`backend.ts` 115–145) omit them. `AdminDashboard.tsx` has **zero** `targetType` matches. `newSpell()` (68–106) sets `cooldown` but not `targetType`. Starters in `spellData.ts` already stamp `targetType` (e.g. 21, 44, 64). Admin Save therefore cannot round-trip the metadata targeting.ts uses.  
SYSTEMS_AFFECTED: `admin.mo` SpellConfig; bindgen; `newSpell` / SpellEditor; `spellEngine.ts`; `targeting.ts`  
RECOMMENDED_ACTION: Add required `targetType` and the mechanic/status/area fields from 08-31 §3 (or an ordered `effects` list plus a compatibility projection). Editor sections: Cost & targeting, Effects, Duration & statuses, Summon. Reject activate when `targetType` is missing. Never key targeting off `spell.name`.  
AUTONOMY: HUMAN_APPROVE — Motoko + bindgen + actor together.  
DEPENDENCIES: SDA-2026-08-31-001 (remainder); SDA-2026-09-01-002  
REGRESSION_RISK: HIGH — combat reads these fields; a default of `enemy` on self-heals would break Blood Mend / Shield.  
VALIDATION_REQUIRED: Save Shield (`targetType=ally`) and a summon (`ground` + complete unit def); refetch matches. Preview and live cast still use metadata only.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-006  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Replace payload clamps with an activate-gate validator  
CATEGORY: lifecycle-tooling  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `AdminGuard.validateSpellConfig` (`adminGuard.mo` 306–344) and `adminSafety.validateSpellConfig` (`adminSafety.ts` 279–308) reject `apCost < 1` (blocks Timestep / `allowZeroAp`), do not require `targetType`, do not check summon completeness or acquisition, and do not scan name-heuristic leftovers. Admin Save (`AdminDashboard.tsx` 5595–5602) never calls the client validator — only the canister clamp runs. `newSpell()` omits `targetType`, so defaults fail a metadata-complete gate.  
SYSTEMS_AFFECTED: `adminGuard.mo`; `adminSafety.ts`; activate endpoint; SpellEditor footer  
RECOMMENDED_ACTION: Shared pure validate: required metadata (09-01 design §7), referential integrity of kit/reward ids, AP 0 only with an explicit flag (not a name), no name keys. Editor footer uses the same function. Activate calls it; draft save may be looser. Keep numeric caps.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN — once 001/005 fields exist.  
DEPENDENCIES: SDA-2026-09-01-001; SDA-2026-09-01-005; SDA-2026-08-31-011  
REGRESSION_RISK: MEDIUM — tightening without the AP 0 exception bricks Timestep if it is ever persisted.  
VALIDATION_REQUIRED: Activate rejected without `targetType`. `isTimestep` + AP 0 validates. Summon without `summonAI` fails. Client and Motoko return the same error strings.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-007  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Seed frontend starter ids into the canister; stop purging physical_attack  
CATEGORY: catalog-sync  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live combat/spellbook ids are in `spellData.ts` (`physical_attack`, `starter-shield`, `spell-swap`, `summon-dire-wolf`, …). Canister seed is `shadow_strike` … `void_collapse` (`admin.mo` 168–191). `upgradeSpell` requires `spellConfigs.get(spellId)` (`main.mo` 943–946), so Strike / summons return `#err("Spell not found")`. `physical_attack` is in `OLD_SPELL_IDS` (`main.mo` 715–723) and is removed on every start. `BUILT_IN_SPELL_IDS` (`adminSafety.ts` 9–16; `adminGuard.mo` 15–18) is the six backend ids, not the starters.  
SYSTEMS_AFFECTED: `AdminLib.defaultSpells`; `main.mo` purge; `upgradeSpell`; Spellbook costs  
RECOMMENDED_ACTION: Insert every player-facing starter/unique/summon id into `spellConfigs` with complete metadata (`targetType` included). Remove `physical_attack` from the purge list; keep purge for truly dead ids (`fireball`, `blood_nova`, …). Do not treat seed insertion as unlocking — ownership still follows 003.  
AUTONOMY: HUMAN_APPROVE — purge-list edit is irreversible on canister start.  
DEPENDENCIES: SDA-2026-08-31-007; SDA-2026-09-01-005  
REGRESSION_RISK: HIGH if purge still drops `physical_attack` after seed.  
VALIDATION_REQUIRED: `upgradeSpell("physical_attack")` and `upgradeSpell("summon-dire-wolf")` return `#ok`. Purge still removes `fireball`.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-008  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Replace name heuristics with id tombstones and explicit summonAI  
CATEGORY: no-heuristics  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `OLD_SPELL_NAMES_SET` filters by **name and id** (`WorldExploration.tsx` 2354–2390). `summonSpawn.ts` 161 sets unit name via `spell.name.replace("Summon ", "")`. `inferSummonArchetype` (`enemyAI.ts` 196–217) falls back to `summon.name` containing wolf/golem/wisp/archer/bomber after checking `summonAI`. Architecture already states `spell.name` is UI/log only.  
SYSTEMS_AFFECTED: WX catalog filter; `engine/summonSpawn.ts`; `engine/enemyAI.ts`; Admin summon editor  
RECOMMENDED_ACTION: Tombstone retired ids as an id list. Require `summonAI` and `displayName` on every summon def. Empty `summonAI` is a validation error, not a name fallback. Do not add new `includes(spell.name)` branches. Extract helpers; do not grow WX.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN — mechanical once defs have the fields.  
DEPENDENCIES: SDA-2026-08-31-006; SDA-2026-09-01-005  
REGRESSION_RISK: MEDIUM — a summon missing `summonAI` currently becomes hunter; after this it must fail validate before activate.  
VALIDATION_REQUIRED: Filter tests use ids only. Summon with `summonAI=healer` and name “Orb” still heals. Rename “Summon Dire Wolf” does not change `displayName`.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-009  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Persist acquisition flags and the observe → win → unlock default  
CATEGORY: discovery-pipeline  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: No `ENEMY_DISCOVERY` / `ACHIEVEMENT` / `CHALLENGE` / `BOSS` / `ELITE` / `SPECIAL_ENCOUNTER` / `MULTI_SOURCE` / `ENEMY_ONLY` / `BOSS_ONLY` / `SYSTEM_ONLY` field. No `OBSERVATION_REQUIRED` / `VICTORY_REQUIRED` / `PLAYER_LEARNABLE`. No `recordSpellObservation` / `commitSpellDiscoveries`. Recap is still XP/Doka only. Quality audit already marked discovery pacing `NO_MEASURABLE_EFFECT`. Combat already has assigned kits and cast apply sites (`enemyAI.ts`; WX 12483–12487) so “enemy actually used the id” is observable without name matching.  
SYSTEMS_AFFECTED: SpellDefinition; persist lock; `main.mo`; PostBattleRecap; observe hook at enemy cast apply (helper, not WX growth)  
RECOMMENDED_ACTION: Persist the closed route enum and the three flags (08-31 §4 defaults). On successful hostile cast of an eligible id, enqueue `recordSpellObservation`. On victory persist, `commitSpellDiscoveries` grants observed eligible ids (same-encounter default). Show unlocks on the existing root recap. Do not call `updateCharacter` or `upgradeSpell` to grant. Hostile summons may observe; player-side summons must not.  
AUTONOMY: HUMAN_APPROVE — touches victory persist.  
DEPENDENCIES: SDA-2026-08-31-003; SDA-2026-08-31-004; SDA-2026-09-01-003  
REGRESSION_RISK: HIGH if granted off the persist lock or on preview/AI-consider.  
VALIDATION_REQUIRED: Assigned-but-not-cast does not observe; cast then flee keeps observation without unlock; cast then win unlocks once; `ENEMY_ONLY` never unlocks; recap shows the id.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-010  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Admin-authored CORE / ADVANCED / RARE / ELITE / SIGNATURE pools  
CATEGORY: enemy-pools  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `ENEMY_KITS` is a hardcoded `Record<ChessPieceType, …>` (`enemyAI.ts` 156–193). Admin `EnemyConfig` has no spell fields (`admin.mo` 15–26). Battle start comments “10 random spells” then `buildEnemyKit` and appends wolf/archer by hardcoded id (`WorldExploration.tsx` 12479–12506).  
SYSTEMS_AFFECTED: new `enemyKits` store; Admin Kits tab; `buildEnemyKit` call site; summoner bonus  
RECOMMENDED_ACTION: Persist `EnemyKit` (08-31 §6). `resolveEnemyKit(enemyId, levelZone, tags)` reads ids only. Chess piece may supply a template when cloning a new enemy. Summoner extras become `bonusSummonSpellIds`. Empty resolve falls back to `physical_attack`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-008; SDA-2026-09-01-007; SDA-2026-09-01-008  
REGRESSION_RISK: MEDIUM — empty kit must not leave enemies unarmed.  
VALIDATION_REQUIRED: Zone 0 pawn kit matches today’s ids; missing id skipped and logged; no `starterSpells.find(id === "summon-dire-wolf")`.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-011  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Repair boss spellPoolIds and stop lying about delete  
CATEGORY: boss-kits  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `defaultBossConfigs()` (`admin.mo` 350+) still lists `fireball`, `cursed_gust`, `entangle`, `mist_form`, `blood_nova`, `obliterate`, `poison_dart`, `ice_shard`, `meteor_strike`, `plague_wave`, `inferno`, `frost_nova`. `main.mo` 715–723 removes those ids every start. Confirm dialog (`AdminDashboard.tsx` 3540–3541) claims immediate remove and broken dependents even when the canister only flips `usableByPlayer`. Toast is `"Spell deleted"` (5619–5620).  
SYSTEMS_AFFECTED: `AdminLib.defaultBossConfigs`; Boss editor chips; Admin spell confirm/toast  
RECOMMENDED_ACTION: Retarget each phase pool to live ids by **id**. Validator marks unresolved chips crimson. Confirm/toast must distinguish retire / draft-delete / rejected. Do not “fix” by matching names.  
AUTONOMY: HUMAN_APPROVE — changes boss encounter identity.  
DEPENDENCIES: SDA-2026-08-31-009; SDA-2026-09-01-004; SDA-2026-09-01-007  
REGRESSION_RISK: MEDIUM — empty resolved pool becomes melee-only.  
VALIDATION_REQUIRED: Every seeded `spellPoolIds` entry exists in `spellConfigs` and is `usableByEnemy`. Retire toast ≠ delete toast.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-012  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Let achievements and challenges grant spells via explicit ids  
CATEGORY: feat-challenge-rewards  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `AchievementConfig` has only `dokaReward` (`admin.mo` 223–230). `markAchievementUnlocked` / `claimAchievementReward` (`main.mo` 2105+) do not write spells; unlock now rejects `active=false` (2115–2117). Challenges still `{ doka, xp, badge }`. Conditions remain client string keys.  
SYSTEMS_AFFECTED: `AchievementConfig`; AchievementEditor; `markAchievementUnlocked`; challenge persist helpers; recap  
RECOMMENDED_ACTION: Add `spellRewardIds: [Text]` to achievements and `rewards.spellIds` to challenges. Grant on unlock / challenge persist (same lock as XP/Doka). Skip retired ids (001 legacy). Do not infer the reward from the achievement name. Keep `getPlayerAchievements(identity.getPrincipal())`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-010; SDA-2026-09-01-001; SDA-2026-09-01-003  
REGRESSION_RISK: MEDIUM — remount double-grant must be idempotent.  
VALIDATION_REQUIRED: Feat with a spell id grows owned set once; claim still pays Doka. Failed challenge grants neither. Retired reward id: Doka paid, spell skipped.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-013  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Draft / validate / activate / deactivate / rollback / compare / duplicate  
CATEGORY: lifecycle-tooling  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `adminSetSpellConfig` writes the live map immediately after `validateSpellConfig` (`main.mo` 848–858). No revision store. Admin Save is the only write (`AdminDashboard.tsx` 5595–5602). Duplicate/compare do not exist. Combat would read a dirty draft if drafts shared the live map.  
SYSTEMS_AFFECTED: `spellConfigs` + `spellRevisions`; Admin Versions tab; activate gate  
RECOMMENDED_ACTION: Combat reads `activeRevision` only. Editor writes `draftDefinition`. Validate is the shared function from 006. Activate bumps revision (cap 20). Rollback clones a prior revision into a new draft, then activate. Duplicate allocates a new id and does not copy ownership. Deactivate hides from new content without touching owned progress. Do not grow AdminDashboard until this API exists.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-011; SDA-2026-09-01-001; SDA-2026-09-01-006  
REGRESSION_RISK: MEDIUM — a draft leaking into player `getSpellConfigs` shows unfinished spells.  
VALIDATION_REQUIRED: Player hydrate unchanged while a draft is dirty. Rollback restores prior AP/range. Duplicate does not copy ownership.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-09-01-014  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Persist spell-bar ids from ownership, not only from upgrade keys  
CATEGORY: bar-persist  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `setSpellBarOrder` still filters to `character.spellLevelKeys` (`main.mo` 1603–1644). Comments still say this is a workaround for unseeded catalogs. Levels are only written by `upgradeSpell`. Every never-upgraded starter (the entire live bar for a new character) is dropped on save. After 003, the legal set is `ownedSpellIds ∪ spellLevelKeys`, including retired-but-owned ids.  
SYSTEMS_AFFECTED: `main.mo` `setSpellBarOrder`; WX bar save (call-site only)  
RECOMMENDED_ACTION: Accept ids that are owned or have a level row. Drop unknown ids with a debug line. Do not require `lifecycle=active` or `usableByPlayer=true`. Max 8 unchanged.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: SDA-2026-08-31-013; SDA-2026-09-01-003; SDA-2026-09-01-001  
REGRESSION_RISK: MEDIUM — too loose re-allows unknown ids; too tight still strips starters.  
VALIDATION_REQUIRED: New character saves eight never-upgraded innate ids; reload matches. Unknown id dropped. Retired owned id kept.  
STATUS: NEW  
