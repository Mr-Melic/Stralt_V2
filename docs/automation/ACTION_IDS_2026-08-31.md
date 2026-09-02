# ACTION_IDs — 2026-08-31 Spell, Discovery & Achievement Admin Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Spell, Discovery & Achievement Admin Designer.  
Design contract: [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md).  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **docs only**.

---

ACTION_ID: SDA-2026-08-31-001  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Unify SpellDefinition so Admin save round-trips combat metadata  
CATEGORY: spell-contract  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Motoko `SpellConfig` (`src/backend/types/admin.mo` 79–110) and bindgen (`src/frontend/src/backend.ts` 115–145, `to_candid_record_n16` 4050–4141) omit `targetType`, summon block, buff/debuff/DoT, and mechanic flags. Engine reads those fields (`src/frontend/src/engine/spellEngine.ts` 6–13; `types/gameTypes.ts` 160–231). `adminSetSpellConfig` therefore strips them. `defaultSpells()` (`src/backend/lib/admin.mo` 168–191) already literals `isSummon` / `summonUnitDef` that are not on the persist type. Admin `SpellEditor` (`AdminDashboard.tsx` 2146–3178) has **zero** `cooldown` and `targetType` fields; `newSpell()` (57–99) omits both.  
SYSTEMS_AFFECTED: `src/backend/types/admin.mo`; `src/backend/lib/admin.mo`; `src/backend/main.mo` `adminSetSpellConfig`; bindgen `src/frontend/src/backend.ts`; `types/gameTypes.ts`; `AdminDashboard.tsx` SpellEditor; `engine/spellEngine.ts`; `engine/targeting.ts`  
RECOMMENDED_ACTION: Extend the persisted record to the SpellDefinition in the design doc (identity, cost, targeting including required `targetType`, effects list, duration, scaling, statuses, summons, acquisition). Keep a compatibility projection so current engine readers still work. Add the missing editor fields. Reject activate when required metadata is absent. Never key effects off `spell.name`.  
AUTONOMY: HUMAN_APPROVE — Motoko type change needs a canister upgrade; a live actor that lags source will reject new-field saves (same class as the 15-field vs 12-field CharacterStats lesson).  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH — every `adminSetSpellConfig` / `getSpellConfigs` call and every combat read of SpellConfig. Must ship frontend + actor together.  
VALIDATION_REQUIRED: Save a summon + a LoS/minRange spell from Admin, refetch, and confirm `targetType`, `cooldown`, and `summonUnitDef` survive. `pnpm typecheck` + `caffeine check`. Cast preview still uses metadata only.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-002  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Split catalog from ownership; persist owned and observed spell ids  
CATEGORY: ownership-persist  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `ownedSpells` is `starterSpells ∪ filteredBackendSpells` (`WorldExploration.tsx` 2242–2272). Any id that survives `OLD_SPELL_NAMES_SET` is treated as owned. There is no `ownedSpellIds` / `observedSpellIds` store. Character persist has `spellLevelKeys` / `spellLevelValues` (written only by `upgradeSpell`) and `spellBarOrder`. `ARCHITECTURE.md` lists config maps as catalog, not ownership. Adding a spell in Admin therefore grants it to every player on next hydrate.  
SYSTEMS_AFFECTED: `src/backend/main.mo` character / new maps; `WorldExploration.tsx` ownedSpells; `SpellbookModal.tsx`; `setSpellBarOrder`; create-character seed  
RECOMMENDED_ACTION: Add caller-scoped `ownedSpellIds` and `observedSpellIds`. Catalog `getSpellConfigs` stays public and does **not** imply ownership. Seed create with `SYSTEM_ONLY` / `isBaseSpell` ids that exist in the catalog. Migrate existing characters from `spellLevelKeys ∪ spellBarOrder` plus base ids — **not** from the full catalog. Spellbook `allSpells` reads owned ids only.  
AUTONOMY: HUMAN_APPROVE — persist-lock and character-record shape.  
DEPENDENCIES: SDA-2026-08-31-001 (need stable ids); SDA-2026-08-31-007 (starters must exist on canister or upgrade/own will fail)  
REGRESSION_RISK: HIGH — players could lose the bar if migrate under-seeds; over-seed reintroduces “everyone owns everything”.  
VALIDATION_REQUIRED: New character owns only base ids. Admin adding a catalog spell does not change another account’s spellbook until a grant writer runs. Reload keeps owned set (backend wins over localStorage).  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-003  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Add acquisition routes and OBSERVATION / VICTORY / LEARNABLE flags  
CATEGORY: acquisition-model  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `usableByPlayer` / `usableByEnemy` are the only gates (`admin.mo` 104–105; Admin checkboxes 2389–2441). They are cast flags, not learn routes. Achievements reward Doka only (`AchievementConfig` `admin.mo` 206–213). Challenges reward Doka/XP/badge (`challengeCompletion.ts` 38–103). Boss `spellPoolIds` are AI kits, not player grants. No `ENEMY_DISCOVERY` / `ACHIEVEMENT` / `CHALLENGE` / `BOSS` / `ELITE` / `SPECIAL_ENCOUNTER` / `MULTI_SOURCE` / `ENEMY_ONLY` / `BOSS_ONLY` / `SYSTEM_ONLY` field exists.  
SYSTEMS_AFFECTED: SpellDefinition; Admin editor Acquisition section; future grant writers  
RECOMMENDED_ACTION: Persist the closed route enum and the three flags (`OBSERVATION_REQUIRED`, `VICTORY_REQUIRED`, `PLAYER_LEARNABLE`) with the defaults in the design doc. `usableBy*` stay cast-only. Admin must show both “who can cast” and “how a player learns”. Validator rejects `PLAYER_LEARNABLE = true` on `ENEMY_ONLY` / `BOSS_ONLY`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-001  
REGRESSION_RISK: MEDIUM — flags default wrong would either lock starters or leak boss signatures.  
VALIDATION_REQUIRED: Fixture matrix: each route × flag combo; SYSTEM_ONLY base still owned at create; ENEMY_ONLY never enters ownedSpellIds.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-004  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Implement enemy-discovery default (cast → observe → win → unlock)  
CATEGORY: discovery-pipeline  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: No `recordSpellObservation` / `commitSpellDiscoveries` API. Quality audit already marked spell-discovery pacing `NO_MEASURABLE_EFFECT` (`QUALITY_AUDIT_2026-08-30.md` outcome table). Combat already has `assignedSpells` and cast logs (`enemyAI.ts` 941, 1527) so “enemy actually used the spell” is observable at the engine boundary without name matching. Victory already funnels through `applyRewards` + root recap.  
SYSTEMS_AFFECTED: `engine/enemyAI.ts` / `spellEngine.ts` (observe hook only); persist lock; `main.mo`; `PostBattleRecap`; `WorldExploration.tsx` victory path (call-site only)  
RECOMMENDED_ACTION: On successful enemy cast of an eligible id, enqueue `recordSpellObservation(slot, spellId, encounterId)`. On victory persist, `commitSpellDiscoveries` grants observed eligible ids. Same-encounter victory is the default; `allowLaterVictory` is opt-in. Show unlocks on the existing recap. Do not call `updateCharacter` or per-kill grant. Hostile summons may generate observations; player-side summons must not.  
AUTONOMY: HUMAN_APPROVE — touches victory persist; extract helpers, do not grow WorldExploration.  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-003  
REGRESSION_RISK: HIGH if granted off the persist lock or twice (observe + victory). MEDIUM if observation fires on preview/AI-consider rather than a real cast.  
VALIDATION_REQUIRED: Tests: assigned-but-not-cast does not observe; cast then flee keeps observation without unlock; cast then win unlocks once; already-owned is idempotent; ENEMY_ONLY never unlocks. Recap shows the id.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-005  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Soft-retire with dependency-safe delete and legacy owned behaviour  
CATEGORY: dependency-safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `adminDeleteSpellConfig` is `spellConfigs.remove(id)` (`main.mo` 622–627). Admin UI is a single red `×` with no confirm (`AdminDashboard.tsx` 3338–3345, 5217–5221). Same pattern for enemies and achievements (`adminDeleteEnemyConfig`, `adminDeleteAchievementConfig`). `upgradeSpell` then returns `#err("Spell not found")` (684–688). `setSpellBarOrder` drops ids missing from `spellLevelKeys` (1233–1242). Boss seeds still reference purged ids (`admin.mo` 358–451 vs `main.mo` 477–487).  
SYSTEMS_AFFECTED: `main.mo` admin delete/set; Admin lists; `upgradeSpell`; `setSpellBarOrder`; achievement/enemy delete; Spellbook retired seal  
RECOMMENDED_ACTION: Lifecycle `draft | active | inactive | retired`. Hard delete only drafts with zero published revisions and zero character refs; otherwise return `#err` plus a dependency report. Retire must not strip `ownedSpellIds`, levels, or bar slots. Owned retired spells remain castable and upgradeable; new unlocks stop. Achievements already granted stay; new grants skip a retired spell id and still pay Doka. Live kits ignore retired ids at resolve time.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-013 (bar filter)  
REGRESSION_RISK: HIGH if retire wipes levels or if delete stays hard.  
VALIDATION_REQUIRED: Retire a spell that is on a bar and in a boss pool: owner still casts/upgrades; new character cannot learn; boss resolve skips the id; delete returns err.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-006  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Replace name heuristics with id tombstones and explicit summonAI  
CATEGORY: no-heuristics  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `OLD_SPELL_NAMES_SET` filters catalog by **name and id** (`WorldExploration.tsx` 2203–2239). `summonSpawn.ts` 149 sets unit name via `spell.name.replace("Summon ", "")`. `inferSummonArchetype` (`enemyAI.ts` 196–217) falls back to `summon.name` containing wolf/golem/wisp/archer/bomber. Architecture already states `spell.name` is UI/log only (`docs/ARCHITECTURE.md` 356).  
SYSTEMS_AFFECTED: `WorldExploration.tsx` catalog filter; `engine/summonSpawn.ts`; `engine/enemyAI.ts` inferSummonArchetype; Admin summon editor  
RECOMMENDED_ACTION: Tombstone retired ids as an id list (data), not a name set. Require `summonAI` and `displayName` on every summon def. Remove the name fallback; empty `summonAI` is a validation error. Do not add new `includes(spell.name)` branches.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN — mechanical once defs have the fields (depends on 001).  
DEPENDENCIES: SDA-2026-08-31-001  
REGRESSION_RISK: MEDIUM — a summon missing `summonAI` would fall through to hunter today; after this it must fail validation before activate.  
VALIDATION_REQUIRED: Filter tests use ids only. Summon with `summonAI = healer` and name “Orb” still heals. Rename “Summon Dire Wolf” does not change the unit displayName.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-007  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Seed frontend starter ids into the canister catalog  
CATEGORY: catalog-sync  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live combat/spellbook ids live in `spellData.ts` (`physical_attack`, `starter-shield`, `starter-poison`, `spell-swap`, `summon-dire-wolf`, …). Canister seed is a different six (`shadow_strike` … `void_collapse`, `admin.mo` 168–191). `upgradeSpell` requires `spellConfigs.get(spellId)` (`main.mo` 684–688), so upgrading Strike or a summon fails “Spell not found”. `physical_attack` is also in the **purge** list (`main.mo` 478–483), so even a later seed would be deleted on start.  
SYSTEMS_AFFECTED: `AdminLib.defaultSpells`; `main.mo` OLD_SPELL_IDS purge; `upgradeSpell`; Spellbook costs  
RECOMMENDED_ACTION: Insert every player-facing starter/unique/summon id into `spellConfigs` with complete metadata. Remove `physical_attack` from the purge list (purge remains for truly dead ids: `fireball`, `blood_nova`, …). Do not treat seed insertion as unlocking for existing players — ownership still follows 002.  
AUTONOMY: HUMAN_APPROVE — purge-list edit is irreversible on canister start.  
DEPENDENCIES: SDA-2026-08-31-001  
REGRESSION_RISK: HIGH if purge still drops `physical_attack` after seed. MEDIUM if seed is copied without `targetType`.  
VALIDATION_REQUIRED: `upgradeSpell("physical_attack")` and `upgradeSpell("summon-dire-wolf")` return `#ok`. Purge still removes `fireball`.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-008  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Admin-authored enemy pools CORE / ADVANCED / RARE / ELITE / SIGNATURE  
CATEGORY: enemy-pools  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `ENEMY_KITS` is a hardcoded `Record<ChessPieceType, …>` (`enemyAI.ts` 156–193). Admin `EnemyConfig` has no spell fields (`admin.mo` 15–26). Battle start comments “10 random spells” then calls `buildEnemyKit` and may append wolf/archer by hardcoded id (`WorldExploration.tsx` 12181–12208).  
SYSTEMS_AFFECTED: new `enemyKits` store; Admin Kits tab; `buildEnemyKit` / WX assign call site; summoner bonus  
RECOMMENDED_ACTION: Persist `EnemyKit` as in the design doc. `resolveEnemyKit(enemyId, levelZone, tags)` replaces piece-type hardcoding. Chess piece may supply a **template** when creating a new enemy. Summoner extras become `bonusSummonSpellIds`. Pools are id lists only.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-001; SDA-2026-08-31-006  
REGRESSION_RISK: MEDIUM — kit empty-resolve must fall back to `physical_attack` (or kit-defined melee id) so enemies are never unarmed.  
VALIDATION_REQUIRED: Zone 0 pawn kit matches today’s ids; zone ≥1 adds the advanced id; rare/signature only when tagged; missing id is skipped and logged, not a crash.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-009  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Repair boss spellPoolIds that still point at purged spells  
CATEGORY: boss-kits  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `defaultBossConfigs()` (`admin.mo` 350+) lists `fireball`, `cursed_gust`, `entangle`, `mist_form`, `blood_nova`, `obliterate`, `poison_dart`, `ice_shard`, `meteor_strike`, `plague_wave`, `inferno` (old id), `frost_nova` (old id). `main.mo` 477–487 removes those ids from `spellConfigs` on every start. Boss editor chips (`AdminDashboard.tsx` 6810–1833) cannot show unresolved.  
SYSTEMS_AFFECTED: `AdminLib.defaultBossConfigs`; Boss editor; boss AI resolve  
RECOMMENDED_ACTION: Retarget each phase pool to live ids (or newly seeded starters from 007) by **id**. Validator marks unresolved chips crimson. Do not “fix” by matching names.  
AUTONOMY: HUMAN_APPROVE — changes boss encounter identity.  
DEPENDENCIES: SDA-2026-08-31-007  
REGRESSION_RISK: MEDIUM — a boss with an empty resolved pool becomes melee-only.  
VALIDATION_REQUIRED: Every seeded `spellPoolIds` entry exists in `spellConfigs` and is `usableByEnemy`. Admin chip list shows broken vs live.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-010  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Let achievements and challenges grant spells via explicit ids  
CATEGORY: feat-challenge-rewards  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `AchievementConfig` has only `dokaReward` (`admin.mo` 206–213). `markAchievementUnlocked` / `claimAchievementReward` (`main.mo` 1616–1674) do not write spells. `DEFAULT_CHALLENGES` rewards are `{ doka, xp, badge }` (`challengeCompletion.ts` 38–103); `challengeRewards.ts` persists numbers only. Conditions are client string keys (`WorldExploration.tsx` 2071–2074).  
SYSTEMS_AFFECTED: `AchievementConfig`; Admin AchievementEditor; `markAchievementUnlocked`; challenge persist helpers; recap  
RECOMMENDED_ACTION: Add `spellRewardIds: [Text]` to achievements and `rewards.spellIds` to challenges. Grant on unlock (achievement) or on challenge persist (same lock as XP/Doka). Skip retired ids (legacy rule in 005). Do not infer the reward spell from the achievement name. Keep `getPlayerAchievements(identity.getPrincipal())`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-003; SDA-2026-08-31-005  
REGRESSION_RISK: MEDIUM — double-grant on remount must be idempotent; Doka claim stays on the persist lock.  
VALIDATION_REQUIRED: Unlock feat with a spell id → owned set grows once; claim still pays Doka. Failed challenge grants neither XP nor spell. Retired reward id: Doka paid, spell skipped.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-011  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Draft / validate / activate / deactivate / rollback / compare / duplicate  
CATEGORY: lifecycle-tooling  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `adminSetSpellConfig` writes the live map immediately after a few numeric clamps (`main.mo` 600–618). No revision store. No validate endpoint. Admin Save is the only write (`AdminDashboard.tsx` 5194–5200). Duplicate/compare do not exist.  
SYSTEMS_AFFECTED: `spellConfigs` + new `spellRevisions`; Admin Versions tab; activate gate  
RECOMMENDED_ACTION: Combat reads `activeRevision` only. Editor writes `draftDefinition`. Validate is a pure, shared function (required metadata + referential integrity + no name fields used as keys). Activate bumps revision (cap 20). Rollback clones a prior revision into a new draft, then activate. Duplicate allocates a new id. Deactivate hides from new content without touching owned progress.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-001; SDA-2026-08-31-005  
REGRESSION_RISK: MEDIUM — a draft leaking into `getSpellConfigs` for players would show unfinished spells.  
VALIDATION_REQUIRED: Activate rejected without `targetType`. Player hydrate unchanged while a draft is dirty. Rollback restores prior AP/range. Duplicate does not copy ownership.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-012  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Spell Studio UI — complete editor and dependency drawer  
CATEGORY: admin-ui  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Spells / Achievements / Bosses are separate tabs with no graph (`AdminDashboard.tsx` 4834, 5183–5224, 5922+). Spell cards show effectType/AP/DMG/RNG only (3300–3320). Delete is unlabeled `×`. No acquisition, pool, version, or dependent list. UI already uses the carved-stone gold/crimson language — extend it, do not restyle. Admin is lazy-loaded and `#admin`-gated (`ARCHITECTURE.md` 206–208).  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` (new tab cluster only); admin hooks  
RECOMMENDED_ACTION: Add Library / Editor / Discovery / Kits / Feats / Graph / Versions as specified in the design doc. Footer validation strip. Retire modal lists dependents; no Delete on published ids. Keep `isAdmin && onOpenAdmin`. Do not ship on the player HUD.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN — UI can follow 001/003/005 APIs; do not invent client-only persistence.  
DEPENDENCIES: SDA-2026-08-31-001; SDA-2026-08-31-003; SDA-2026-08-31-005; SDA-2026-08-31-008; SDA-2026-08-31-011  
REGRESSION_RISK: LOW for players if still gated. MEDIUM if editor save bypasses activate.  
VALIDATION_REQUIRED: Non-admin build has no studio routes. Admin can open a spell and see enemy/achievement/boss/AI edges. Desktop + the existing ≥768px gate.  
STATUS: NEW  

---

ACTION_ID: SDA-2026-08-31-013  
SOURCE_AUTOMATION: Spell, Discovery & Achievement Admin Designer  
TITLE: Persist spell-bar ids from ownership, not only from upgrade keys  
CATEGORY: bar-persist  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `setSpellBarOrder` filters to `character.spellLevelKeys` (`main.mo` 1233–1242). Levels are written only by `upgradeSpell`. A never-upgraded owned spell (every starter at create) is dropped on save. Comments admit this was a workaround for unseeded catalogs. After 002, the legal set is `ownedSpellIds ∪ spellLevelKeys`, including retired-but-owned ids.  
SYSTEMS_AFFECTED: `main.mo` `setSpellBarOrder`; WX bar save (`WorldExploration.tsx` ~2458, 2759)  
RECOMMENDED_ACTION: Accept ids that are owned or have a level row. Reject (or drop with a debug line) ids that are neither. Do not require `lifecycle = active`. Max 8 unchanged.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-005  
REGRESSION_RISK: MEDIUM — too loose re-allows unknown ids; too tight still strips starters.  
VALIDATION_REQUIRED: New character saves a bar of eight never-upgraded starters; reload matches. Unknown id dropped. Retired owned id kept.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Halt same-hour P2/P3 implementer flock after the 2026-08-30 merge burst  
CATEGORY: automation-coherence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: 25+ automations launched 00:00–00:02 UTC 2026-08-31, including first runs of expansion (`3f31b18f`), enemy AI (`67b03c2f`), spell mechanics (`1330956a`), game feel (`078e61d4`), balance (`3c083a4a`), content diversity (`5acab6fe`), admin visuals (`3089f18d`), spell-discovery admin (`4efa22ec`), telemetry dashboard (`4b026695`), economy hunter (`1e548d83`), invariants (`72eb90fe`), and orchestrator (`68f2958f`). AQA-2026-08-30-001/004/009 already warned that same-hour implementers duplicate persist/combat themes. P0 leftovers (#114, unbounded canister writes, no ADR) are still open.  
SYSTEMS_AFFECTED: all implementer automations; merge queue  
RECOMMENDED_ACTION: First-run and expansion specialists emit ACTION_IDs only. Do not open gameplay PRs this cycle unless the item is unique, display-only, and not already drafted. Pause or stagger crons so they do not share a 2-minute window after a merge burst.  
AUTONOMY: HUMAN_CONFIG — automation schedules / prompts  
DEPENDENCIES: AQA-2026-08-30-001; AQA-2026-08-30-009  
REGRESSION_RISK: LOW — slowing first-run implementers does not remove #114. Residual risk is delayed P2 ideas.  
VALIDATION_REQUIRED: Next director run sees ≤3 new gameplay PRs from this wave, and those PRs do not retouch persist / targeting / mapGen / WX.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Throttle the critical / high-severity bug hunter  
CATEGORY: automation-ops  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Hunter `996df6df` still accounted for 61 of the first 100 listed runs on 2026-08-30. GetAutomation is not visible to this principal. WX still 19,619 lines / 96 recent commits.  
SYSTEMS_AFFECTED: `996df6df-9d7a-11f1-a7d1-d6b4613131ce`; `WorldExploration.tsx`  
RECOMMENDED_ACTION: REDUCE_FREQUENCY to at most once per 12–24 hours; pause 6 hours after a `main` merge that touches `WorldExploration.tsx` or `progressPersist.ts`. Uniqueness check vs last 24h PR titles. Extract helpers instead of WX branches.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: ≤14 hunter runs/week; falling no-PR rate, not zero PRs.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Keep a single critical-bug automation  
CATEGORY: automation-ops  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused. `1aa41c6c` remains enabled and correctly opened unique #114 after the evening merges. A second high-frequency hunter is still the volume problem.  
SYSTEMS_AFFECTED: `1aa41c6c-a483-11f1-a7d1-d6b4613131ce`; `996df6df-9d7a-11f1-a7d1-d6b4613131ce`  
RECOMMENDED_ACTION: MERGE. Keep one hunter at AQA-001 cadence. Fold #114 into the human merge queue as the surviving critical PR.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Only one critical-bug automation ID fires per day.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Human merge queue — #114 then #107 clamp-only rebase  
CATEGORY: merge-hygiene  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: #114 is unique post-merge P0/P1 (plague death vs victory; barrier LoS), +242/−9, 5 files, clean on `22503b5`, 234 engine tests claimed. #107 is still based on `e4abb4c` (pre-#103/#104/#109/#111/#110) and overlaps official-client races already merged in #111. Its unique remaining value is the backend upper clamp on `saveBattleStats` (`main.mo` 1285–1353 still writes unbounded client Doka/XP/level).  
SYSTEMS_AFFECTED: `WorldExploration.tsx`; `targeting.ts`; `battleSetup.ts`; `main.mo`; persist callers  
RECOMMENDED_ACTION: Review/merge #114. Rebase #107 on current `main`; keep clamp + tests; drop shop/heal/jackpot/portal hunks already on `main`; treat `sessionStorage` death replay as optional/high-risk. Close #105. Hold #100/#101/#106.  
AUTONOMY: HUMAN_REVIEW  
DEPENDENCIES: AQA-2026-08-30-004 (superseded merge advice); AQA-2026-08-30-008  
REGRESSION_RISK: HIGH if #107 merges un-rebased; MEDIUM for #114 WX plague wiring (tests cover the helper).  
VALIDATION_REQUIRED: After merge, `pnpm typecheck` / targeted engine tests; plague 1 HP + last hostile does not pay; Attack Nearest cannot snipe through a barrier; `saveBattleStats` cannot raise Doka/XP/level above current store.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-008  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Convert the security 9-finding set into an architecture decision  
CATEGORY: security-architecture  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused and escalated P1→P0 for the unbounded-write subset. `applyRewards` (`main.mo` 1356–1389) and `saveBattleStats` Doka write (`main.mo` 1352) remain unbounded. Finding 3 (“must not write Doka from saveBattleStats”) still contradicts `docs/ARCHITECTURE.md` persist table (heals/spends/death must use that write). `calculateAndAwardDoka` has no official frontend caller. `markAchievementUnlocked` is still client-asserted. `completeBossRushRoom` now ignores client reward amounts. No human ADR. Security automation was not in the 00:00 wave (GetAutomation not visible).  
SYSTEMS_AFFECTED: `src/backend/main.mo`; official persist funnel  
RECOMMENDED_ACTION: Write the ADR in `docs/ARCHITECTURE.md`: (a) official-client trust + store-relative clamps, or (b) canister proofs. Rewrite finding 3 to “absolute Doka/XP/level must be bounded by current store.” Do not reconfirm finding 3 as “Doka write is a bug.” Land clamp via MTD-2026-08-31-002.  
AUTONOMY: HUMAN_DECISION + reviewed PR  
DEPENDENCIES: MTD-2026-08-31-002  
REGRESSION_RISK: HIGH if APIs tighten without a frontend roll.  
VALIDATION_REQUIRED: ADR merged; security findings marked decided; clamp on `main` or explicitly deferred.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: 2026-08-30 overlapping draft stack — post-merge residual  
CATEGORY: merge-hygiene  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Against AQA advice, #103 #109 #112 #113 #104 #111 #110 merged 20:16–20:48 UTC. Residual open drafts: #100 #101 #105 #106 #107 #108 #114.  
SYSTEMS_AFFECTED: merge queue  
RECOMMENDED_ACTION: Follow MTD-2026-08-31-002. Do not re-open merged themes (portal XP, jackpot, white portal, Attack Nearest live hostiles, mapGen solvability).  
AUTONOMY: HUMAN_REVIEW  
DEPENDENCIES: MTD-2026-08-31-002  
REGRESSION_RISK: HIGH if leftovers merge in parallel on stale bases.  
VALIDATION_REQUIRED: At most one open PR per theme.  
STATUS: SUPERSEDED  

---

ACTION_ID: AQA-2026-08-30-006  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze mapGen after #110 merged against AGENTS.md  
CATEGORY: sensitive-code  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. #110 (`22503b5`) legalizes spawn, relocates exits, punches isolated hostiles, adds seed fixtures. `AGENTS.md` line 5 still forbids map generation edits. Further punches will fight CA/void aesthetics and dungeon-chain portals.  
SYSTEMS_AFFECTED: `src/frontend/src/engine/mapGen.ts`; Solvability Guardian `9dcfd122`  
RECOMMENDED_ACTION: UPDATE_PROMPT to report-only (ACTION_IDs + failing seed fixtures) unless a human authorizes a playtested mapGen change. No new mapGen PRs this week.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: None  
REGRESSION_RISK: LOW if frozen. HIGH if another punch lands without playtest.  
VALIDATION_REQUIRED: Next solvability run opens 0 mapGen PRs.  
STATUS: BROKEN  

---

ACTION_ID: AQA-2026-08-30-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze drive-by WorldExploration edits after #114  
CATEGORY: sensitive-code  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. File is 19,619 lines; 96 commits since 2026-08-24. Persist helper had 8. #114 is the last justified WX combat patch in the plague/barrier cluster. Tonight’s feel / AI / expansion / invariant agents are set up to add more WX branches.  
SYSTEMS_AFFECTED: `WorldExploration.tsx`; every implementer  
RECOMMENDED_ACTION: New behavior goes in `engine/*` or `utils/*` with tests; WX-only one-line wiring. Reject PRs whose primary hunk is another WX branch.  
AUTONOMY: HUMAN_CONFIG + review  
DEPENDENCIES: MTD-2026-08-31-002 (#114)  
REGRESSION_RISK: MEDIUM — some remaining defects are still WX closures.  
VALIDATION_REQUIRED: Next week WX commit count under 20.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Controlled extraction of HP and death authority out of WorldExploration  
CATEGORY: architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Recurring cluster: #78 last-kill set, #81/#83/#84/#86 store HP, #87/#88/#89 skip-advance, #98 live DoT, #103 heal/phase HP, #114 plague death. Root cause is dual authority (React maps / `characterStats` / post-paint HP-watch vs `combatantsRef`). Local patches keep leaking the next lethal source.  
SYSTEMS_AFFECTED: `combatantStore.ts`; `deathPipeline.ts`; `battleSetup.ts`; `WorldExploration.tsx`  
RECOMMENDED_ACTION: Controlled intervention — not a big-bang rewrite. One PR: every lethal path calls the same helper (store HP + `deathTriggered` + refuse victory) already sketched by `shouldContinuePlayerTurnAfterHazard` / `hpAfterIncomingDamage`. No RAF, mapGen, turn-order, or damage-formula changes.  
AUTONOMY: IMPLEMENT_AFTER_#114 — single scoped PR  
DEPENDENCIES: MTD-2026-08-31-002; AQA-2026-08-30-007  
REGRESSION_RISK: HIGH if bundled with targeting or persist. MEDIUM if extracted with tests only.  
VALIDATION_REQUIRED: Engine tests for plague / DoT / lava / reflect / phase-2; last-hostile + player-lethal same tick never pays.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-08-31-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze content / AI / feel / admin implementation until P0/P1 settle  
CATEGORY: expansion-gating  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Core rules require observed-spell discovery, dynamic enemy pools, and Draft→Validate→Activate. None are implemented. First-run specialists for those themes launched tonight. `enemyAI.ts` is already 2,582 lines; AdminDashboard 7,322; 32 static spells; `buildEnemyKit` is piece+zone, not observation. Implementing expansion on a dual-HP / unbounded-reward base repeats the persist-patch mill.  
SYSTEMS_AFFECTED: spell discovery; enemy AI; admin dashboard; game feel; balance numbers  
RECOMMENDED_ACTION: Those automations write ACTION_IDs and reports only. No new spells, AI behaviors, admin chrome, or VFX that touch WX / `main.mo` / `enemyAI.ts` this cycle.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-08-31-001; MTD-2026-08-31-003; AQA-2026-08-30-008  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next director run: 0 merged expansion PRs that touch combat persist or WX.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-005  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Stop the test-coverage clone mill  
CATEGORY: automation-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. #100 #101 #106 still open. Coverage automation `81c2e934` running again at 00:00 UTC.  
SYSTEMS_AFFECTED: `4a5a5880`; `81c2e934`  
RECOMMENDED_ACTION: Close or hold #100/#101/#106. Only add cases for *merged* fixes that still lack a helper test. REDUCE_FREQUENCY to 2–3×/week after merge bursts.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-08-31-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next week ≤3 coverage PRs; no occupancy/loss-path reopen.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Adopt an in-repo ACTION_ID ledger all producers write to  
CATEGORY: process  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Ledger now exists (`docs/automation/ACTION_IDS_*.md`) via #112 and this run. GitHub issues still 0. Most implementers still do not write IDs. Orchestrator is running again and previously implemented leftover XP (#108) instead of a ledger.  
SYSTEMS_AFFECTED: orchestrator `68f2958f`; all hunters  
RECOMMENDED_ACTION: UPDATE_PROMPT: append to `docs/automation/ACTION_IDS_*.md`. Refuse a second PR for an ID that is OPEN or matches an open PR theme. Digest also writes `docs/automation/digests/YYYY-MM-DD.md`.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next week’s `docs/automation/` contains IDs from orchestrator, security, and at least one hunter.  
STATUS: PARTIAL  

---

ACTION_ID: AQA-2026-08-30-009  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Stop the orchestrator from implementing gameplay  
CATEGORY: automation-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Orchestrator `68f2958f` is running again (`bc-027328c5`). Yesterday it opened #108 (unique HUD, acceptable) but wrote zero IDs and waited on specialists that “did not exist.” Those specialists exist now and are implementing in parallel.  
SYSTEMS_AFFECTED: `68f2958f-a489-11f1-a7d1-d6b4613131ce`  
RECOMMENDED_ACTION: Primary output = ACTION_ID ledger + merge-order note. Implement only unique display-only items. Point at this roadmap instead of inventing missing reports.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-003; MTD-2026-08-31-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: This cycle’s orchestrator run produces a ledger file and 0 combat/persist PRs.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-010  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Dedup persist-race and economy specialists  
CATEGORY: automation-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. #111 merged. Economy hunter `1e548d83` launched again at 00:02 (`bc-1d1fb1c5`) while #107 is still an un-rebased draft.  
SYSTEMS_AFFECTED: `607e0304`; `1e548d83`; `72eb90fe`  
RECOMMENDED_ACTION: If an open PR already names the race, emit ACTION_ID only. Do not open a second clamp or portal-XP PR.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-08-31-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No new PR that mentions portal XP, jackpot, or saveBattleStats clamp besides the #107 rebase.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-011  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Point implementer prompts at live architecture  
CATEGORY: prompt-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Live truth: 12-field `CharacterStats`; canonical `src/backend/main.mo`; `saveBattleStats` Doka writes are required; `backend_extended` is stale; targeting gate is on `main` (#95/#102/#104) and #114 extends it.  
SYSTEMS_AFFECTED: combat parity; invariants; security; solvability  
RECOMMENDED_ACTION: Cite `docs/ARCHITECTURE.md` + `AGENTS.md` + this roadmap. Do not rediscover `backend_extended` as a live bug. Do not fork the live-cast gate.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-008  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next combat/invariant run no-ops or rebases on #114 without a second Attack Nearest stack.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-012  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Smallest outcome-telemetry hooks — counters before any dashboard  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Still no series. Telemetry *admin dashboard* automation `4b026695` launched 00:01 UTC (`bc-67c06778`) with nothing to plot.  
SYSTEMS_AFFECTED: persist funnel; future admin telemetry UI  
RECOMMENDED_ACTION: Human-designed, backend-authoritative counters only: persist-fail vs persist-ok, death-penalty applied, victory paid, recap opened/dismissed, shop credit committed. Query-only or enqueued on `createProgressPersist`. Dashboard UI waits. Automations must not claim CLEAR_POSITIVE_SIGNAL until then.  
AUTONOMY: DESIGN_THEN_TINY_PR  
DEPENDENCIES: AQA-2026-08-30-008 (do not invent a second wallet path)  
REGRESSION_RISK: MEDIUM if counters write off the persist lock.  
VALIDATION_REQUIRED: Next Quality Auditor can cite persist-ok/fail and victory-paid, or repeat “still no telemetry.” Zero telemetry-dashboard merges before counters.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-005  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Wire saveKillCount or drop kill totals from the leaderboard  
CATEGORY: neglected-system  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `useSaveKillCount` (`useLeaderboardQueries.ts` 43–50) has no UI caller. `TROUBLESHOOTING.md` already records this. `CharacterStats.killCount` is required on every Candid payload and cannot decrease, but world saves only preserve the current value.  
SYSTEMS_AFFECTED: leaderboard; `saveKillCount`; battle victory  
RECOMMENDED_ACTION: After persist freeze, one isolated caller on attributed enemy kills through the existing hook — or remove killCount from the public leaderboard until then. Do not piggyback on a WX combat PR.  
AUTONOMY: IMPLEMENT_LATER  
DEPENDENCIES: MTD-2026-08-31-003; AQA-2026-08-30-007  
REGRESSION_RISK: LOW if isolated; MEDIUM if stuffed into victory persist.  
VALIDATION_REQUIRED: Leaderboard kill totals move after a real victory, once, and survive reload.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-08-31-006  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Do not grow AdminDashboard until Draft → Validate → Activate exists  
CATEGORY: content-pipeline  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `AdminDashboard.tsx` is 7,322 lines. Boss editor uses local React `drafts` state only. No canister Draft → Validate → Activate. Admin visual + feature-drift + spell-discovery-admin automations launched tonight. Core rule requires that pipeline “where appropriate.”  
SYSTEMS_AFFECTED: `AdminDashboard.tsx`; admin mixins; config maps in `main.mo`  
RECOMMENDED_ACTION: Report-only on admin chrome. Design the publish pipeline as ACTION_IDs. Do not add more visual managers on the 7.3k-line file first.  
AUTONOMY: DESIGN_ONLY this cycle  
DEPENDENCIES: MTD-2026-08-31-004; AQA-2026-08-30-008  
REGRESSION_RISK: LOW if frozen. HIGH if live config writes ship without validate.  
VALIDATION_REQUIRED: Next admin PR is either zero or a documented pipeline, not another panel.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-08-31-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Spell discovery and unlocks wait on persist + metadata infrastructure  
CATEGORY: expansion-gating  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: DESIGN/core rules require enemy-observed discovery and achievement/challenge/boss spell unlocks. ENGINEERING: 32 static `spellData.ts` ids; `buildEnemyKit(pieceType, levelZone)`; no observe/unlock persist; `markAchievementUnlocked` is client-trusted; challenges pay Doka/XP only.  
SYSTEMS_AFFECTED: spell catalog; achievements; challenges; bosses; enemy kits  
RECOMMENDED_ACTION: Design unlock records (explicit spell ids, not name heuristics) and a backend-authoritative grant on the persist lock. Do not add spells or discovery UI this cycle.  
AUTONOMY: DESIGN_ONLY this cycle  
DEPENDENCIES: MTD-2026-08-31-004; AQA-2026-08-30-008; AQA-2026-08-30-012  
REGRESSION_RISK: HIGH if discovery writes spell levels through `saveBattleStats` (`upgradeSpell` is the sole writer today).  
VALIDATION_REQUIRED: A written persist shape before any discovery PR.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-08-31-008  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: AI-tier 30% random roll contradicts progressive sophistication  
CATEGORY: design-contradiction  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `computeAITier` (`combatMath.ts` 36–51) uses level bands then a 30% chance to return `random(1..10)`. Core rule: progressively sophisticated, player-relative enemies. This is DESIGN vs ENGINEERING, not measured play.  
SYSTEMS_AFFECTED: `combatMath.ts`; enemy generation; `enemyAI.ts`  
RECOMMENDED_ACTION: Human design decision. Until then, do not rewrite `enemyAI.ts`. A later one-line variance change is enough if the decision is “remove the flat random.”  
AUTONOMY: HUMAN_DECISION  
DEPENDENCIES: MTD-2026-08-31-004  
REGRESSION_RISK: MEDIUM if variance is removed without a playtest of high-level maps.  
VALIDATION_REQUIRED: Written decision in DESIGN or ARCHITECTURE; no first-run AI PR.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-08-31-009  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Leftover XP HUD (#108) is the only safe display merge after #114  
CATEGORY: player-experience  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: #108 leftover XP on selection / top bar / recap is unique among open PRs and does not retouch persist writers. Orchestrator already drafted it.  
SYSTEMS_AFFECTED: character selection; top bar; `PostBattleRecap`  
RECOMMENDED_ACTION: Rebase on post-#114 `main` if needed and merge as display-only. Do not expand into persist.  
AUTONOMY: HUMAN_REVIEW  
DEPENDENCIES: MTD-2026-08-31-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Leftover XP matches `xpCurve` after a level-up; numbers agree on the three surfaces.  
STATUS: NEW

ACTION_ID: TADD-2026-08-31-001  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Ship AQA-012 backend-authoritative outcome counters  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Quality audit 2026-08-30 found no player telemetry (one WX comment). Official client logs persist failures with `logDebugInfo` only (`WorldExploration.tsx` ~12797–12802, ~13097). Debug ring buffer is local (`debug/debugLogger.ts` 105–124). No canister battle/death/recap/persist counters exist. AQA-2026-08-30-012 already approved: persist-ok/fail, death-penalty applied, victory paid, recap opened/dismissed, shop credit committed.  
SYSTEMS_AFFECTED: `utils/progressPersist.ts`; `utils/applyRewardsResult.ts`; `utils/deathPenalty.ts`; `utils/shopPurchase.ts`; `components/PostBattleRecap.tsx`; `src/backend/main.mo` (query-only Nat map or increment on existing writers).  
RECOMMENDED_ACTION: Implement those seven counters only. Backend-authoritative. No gameplay math. Enqueue increments on `createProgressPersist` or store as canister Nats incremented inside the same successful/failed write path. Prefer UTC-day buckets (90-day ring) with no principal. Admin query returns aggregates. Do not add battle-start, flee, turn, or Doka-amount ledgers in this ID.  
AUTONOMY: HUMAN_THEN_IMPLEMENT — AQA-012 already approved the set; persist-lock placement still needs a careful implementer.  
DEPENDENCIES: AQA-2026-08-30-012 (same work; do not open a second counter design).  
REGRESSION_RISK: MEDIUM if counters write off the persist lock or invent a second wallet path.  
VALIDATION_REQUIRED: Admin can read persist-ok, persist-fail, death-penalty applied, victory paid, recap opened, recap dismissed, shop credit committed. Next Quality Auditor can cite weekly persist-ok/fail and victory-paid, or still say “not shipped.”  
STATUS: NEW  

---

ACTION_ID: TADD-2026-08-31-002  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Add owner-only Health tab for snapshot views H1–H11 and H13  
CATEGORY: admin-ui  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `AdminDashboardState.tab` (`gameTypes.ts` 473–488) is config CRUD only. `getAllCharacters` (`main.mo` 369–374) is admin-gated and unused by the dashboard. OQL already exposes `characterSlots`, `dokaBalances`, `dungeonRecords`, `achievementProgress`, `purchaseRecords`, `bossRushStates`, `changelogShownVersions`. Purchases tab already lists IAP rows (with PII). No Health surface.  
SYSTEMS_AFFECTED: `components/AdminDashboard.tsx`; `types/gameTypes.ts` (add `tab: "health"`); read-only hooks.  
RECOMMENDED_ACTION: New Health tab, same admin gate and carved-stone tokens. Implement only views classified LIVE_SNAPSHOT in `TELEMETRY_DASHBOARD_2026-08-31.md` (H1–H11, H13). H12 widgets stay “not shipped” until TADD-001. Every card states data class, n, and the owner decision. Grey out date filters on snapshots. No production gameplay changes.  
AUTONOMY: IMPLEMENT_AFTER_DESIGN — read-only UI; follow the support matrix.  
DEPENDENCIES: TADD-2026-08-31-003 for spell/Boss Rush master fields; TADD-2026-08-31-005 for PII rules.  
REGRESSION_RISK: LOW if read-only and admin-gated. MEDIUM if `getAllCharacters` payloads are stored in React state and rendered as rows (PII leak).  
VALIDATION_REQUIRED: `pnpm typecheck` / `pnpm fix` / `pnpm build` clean. Health hidden when not admin. No principal/email/name on Health. Empty states say “not measured,” not “0 battles.”  
STATUS: NEW  

---

ACTION_ID: TADD-2026-08-31-003  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Expose spell loadout and Boss Rush master on owner aggregates without PII  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: OQL `characterSlots` (`main.mo` 2632–2678) payloads stop at name, pieceType, level, experience, hp, killCount. Spell upgrade keys, `spellBarOrder`, `activeSpells`, and `bossRushMasterComplete` exist on `Character` (`main.mo` 98–121) and on `getAllCharacters` but not on OQL. H3/H4/H9 master-complete cannot be built from OQL today.  
SYSTEMS_AFFECTED: `src/backend/main.mo` OQL entity and/or a new admin aggregate query; Health tab consumers.  
RECOMMENDED_ACTION: Prefer a new `#admin` query that returns **aggregates only** (level histogram, per-spell upgrade counts, bar pair counts, master-complete count). Alternative: extend OQL payloads then aggregate in the client **before** setState, dropping owner/name. Do not add a player-row table to Health.  
AUTONOMY: HUMAN_THEN_IMPLEMENT — schema/OQL change.  
DEPENDENCIES: TADD-2026-08-31-002.  
REGRESSION_RISK: LOW if additive payloads / new query. Do not change `Character` persist shape.  
VALIDATION_REQUIRED: Health H3/H9 can show upgrade coverage and master-complete count with n, and the network/response inspector shows no principal list in the Health render path.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-08-31-004  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Treat requested combat/economy/enemy series as out of scope until new approval  
CATEGORY: process  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: No encounter, turn, flee, duration, elite, AI-archetype, or enemy-spell persist. `saveKillCount` has no UI caller (`useSaveKillCount` unused). Wallet is a current Nat (`dokaBalances`); `applyRewards` / `saveBattleStats` are not a ledger. WorldExploration does not read `spriteUrl`. Pattern fallback is local (`pieceArt.ts` 809–811).  
SYSTEMS_AFFECTED: Future hunters / dashboard implementers; do not touch RAF, map gen, turn logic, or damage math to “add telemetry.”  
RECOMMENDED_ACTION: Refuse charts for battle count, victory/defeat/flee, average turns, encounter frequency, relative enemy level, win/loss, battle duration, elite frequency, advanced AI usage, enemy spell usage, spell cast usage, discovery, acquisition source, combat combinations, Doka earned/spent totals, boss attempts/average attempts/flee, invalid-config events, failed asset loads, and custom-fallback events. Do not wire `saveKillCount` as a battle proxy. Any expansion beyond AQA-012 needs a new human-approved ACTION_ID.  
AUTONOMY: POLICY — no code.  
DEPENDENCIES: None.  
REGRESSION_RISK: LOW. Residual risk is continued blindness on those questions (already true).  
VALIDATION_REQUIRED: Next dashboard PR does not add those series. Next Quality Auditor still marks them INCONCLUSIVE unless TADD-001 shipped.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-08-31-005  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Keep identifiable data off Health; do not reuse the public leaderboard  
CATEGORY: privacy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `getLeaderboard` (`main.mo` 2527–2571) is public and returns `principalId` + `playerName`. Purchases tab advertises “customer data & proof-of-address” (`AdminDashboard.tsx` 5271–5272) with Email/Address columns (5338–5346). OQL `purchaseRecords` and `achievementProgress` include principal and customer fields. Health must answer owner questions from aggregates.  
SYSTEMS_AFFECTED: Health tab; optional later redaction of exports. Purchases fulfillment tab may keep PII.  
RECOMMENDED_ACTION: Health queries aggregate then render. Forbidden on Health: principal, character name, email, address, proof URL. Do not call `getLeaderboard` for Health. `n < 5` hides rates. Purchases fulfillment stays a separate tab.  
AUTONOMY: IMPLEMENT_WITH_TADD-002.  
DEPENDENCIES: TADD-2026-08-31-002.  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Code review + DOM/ocid pass: no principal/email/name nodes under `data-ocid` health.*.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-08-31-006  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Distinguish NORMAL_DEFAULT pixel use from CUSTOM_FALLBACK; do not chart either as errors today  
CATEGORY: visuals-telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Enemy `spriteUrl` and player `*Url` are admin config (OQL + AdminDashboard). `WorldExploration.tsx` has no `spriteUrl` load path; combatants draw via `pieceArt.ts` patterns. Missing pieceType/palette logs `pattern lookup failed` locally and draws `king.front` (`pieceArt.ts` 809–811). Admin preview `onError` only hides the `<img>`. Empty URL means intentional default, not failure.  
SYSTEMS_AFFECTED: Future custom-URL loader only; Health H10 captions.  
RECOMMENDED_ACTION: H10 may count configs with empty vs non-empty custom URLs. Label empty as NORMAL_DEFAULT. Do not increment an error for empty URL or for pattern-lookup-failed. If a custom URL loader is ever added, emit CUSTOM_FALLBACK only when a non-empty URL fails load/decode and pixels are used instead. That event is **not** approved yet (would need a human ID).  
AUTONOMY: POLICY for now; implement captions with TADD-002.  
DEPENDENCIES: TADD-2026-08-31-002; TADD-2026-08-31-004.  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Health has no “pixel fallback errors” series. H10 caption states world does not load custom URLs.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-08-31-007  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Do not design a level-cap or endgame dashboard  
CATEGORY: progression  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: There is no level cap. XP threshold is `100 * 2^(N-1)` with an unbounded while-loop (`docs/ARCHITECTURE.md` Rewards). `Character.level` is Nat. Leaderboard sorts by level with no max.  
SYSTEMS_AFFECTED: Health H1.  
RECOMMENDED_ACTION: Open-ended level histogram. Bands 1–4, 5–9, 10–19, 20–39, 40–79, 80+ with the last edge raised when `max(level)` exceeds 80. Show leftover XP vs next threshold. No “max level reached,” prestige, or endgame completion panel.  
AUTONOMY: IMPLEMENT_WITH_TADD-002.  
DEPENDENCIES: TADD-2026-08-31-002.  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: H1 has no cap chrome; leftover XP uses `xpForNextLevel`, not `level * 100`.  
STATUS: NEW

ACTION_ID: VAL-2026-08-31-001  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Empty-library fallback — custom visuals never required  
CATEGORY: invariant  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Combatants paint via `drawPixelPattern` (`WorldExploration.tsx` 3658–3701, `pixelSize = 3`) and `drawCombatant` (`pieceArt.ts` 825–1011). Zero `ctx.drawImage` in the world renderer. `EnemyConfig.spriteUrl` and `PlayerSpriteConfig` URLs are stored but never consumed by `WorldExploration`. New bosses already fall back to `P.boss_12` (`WorldExploration.tsx` 4146).  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` (new), `data/pieceArt.ts` `drawCombatant`, spawn sites  
RECOMMENDED_ACTION: Implement `resolveRuntimeVisual` so a missing, inactive, invalid, or empty library returns `{ kind: "builtin" }` and the existing pixel path runs unchanged. New enemies/bosses/summons must work with no uploads. Never make artwork upload mandatory.  
AUTONOMY: IMPLEMENT_WITH_TESTS — helper + unit tests only; no RAF / mapGen / combat math.  
DEPENDENCIES: None  
REGRESSION_RISK: LOW if the helper is identity on empty input. HIGH if anyone wires raw `spriteUrl` into draw.  
VALIDATION_REQUIRED: Tests: library `[]`, inactive id, corrupt id → builtin. Manual: new boss portal with empty library matches current pixels.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-002  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Owner-only library metadata on the canonical canister  
CATEGORY: backend-admin  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Admin writes already require `#admin` (`main.mo` 567–579). UI deny at `AdminDashboard.tsx` 4760–4761. `App.tsx` 224 `isAdmin = userRole === "admin"`. `AGENTS.md` forbids shipping admin to players. Canonical actor is `src/backend/main.mo`, not `backend_extended/`.  
SYSTEMS_AFFECTED: `src/backend/main.mo`, bindgen `src/frontend/src/backend.ts`, `AdminDashboard.tsx`  
RECOMMENDED_ACTION: Add a `VisualAsset` / assignment / pool store with the metadata fields in the design doc (`ASSET_ID` … `VALIDATION_STATUS`, plus blob ref and direction refs). CRUD is `#admin` only. Public gameplay must not depend on the store being populated. Do not deploy `backend_extended`.  
AUTONOMY: HUMAN_REVIEW — Candid / migration.  
DEPENDENCIES: VAL-2026-08-31-001  
REGRESSION_RISK: MEDIUM — new persistent maps need a migration module if the live actor cannot add fields silently.  
VALIDATION_REQUIRED: Non-admin caller gets `#err("Unauthorized")`. Empty store does not change `getCharacter` / combat.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-003  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Show derived upload specs before file selection and never silently distort  
CATEGORY: admin-ui  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Recommended 24×24 is 8×8 cells × `pixelSize = 3` (`WorldExploration.tsx` 3672–3674; `pieceArt.ts` 749–751). Boss recommended 34×50 is 8×12 × 3 × spawn scale 1.4 (`getBossPixelPattern` 3728–3740; spawn 6988–6989). Max 80×60 is `TILE_WIDTH` × sprite `drawSize.h` (8479–8497). JPEG/SVG unused; pixel path skips `cell === 0` (transparency).  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` (new library panel), `engine/visualAssets.ts` validation  
RECOMMENDED_ACTION: Before `<input type="file">`, display per-category `RECOMMENDED_*`, `MAX_*`, formats, transparency, anchor, default scale, max safe footprint, animation (4 stills). Validate MIME, decode, width/height, aspect, pixel count, file size, alpha, category, render-safe bounds. Reject corrupt/undecodable. Warn aspect/padding; never auto-stretch/crop.  
AUTONOMY: IMPLEMENT_AFTER 002  
DEPENDENCIES: VAL-2026-08-31-002, VAL-2026-08-31-004  
REGRESSION_RISK: LOW — admin-only.  
VALIDATION_REQUIRED: PNG 24×24 player accepts; JPEG rejects; 200×200 rejects or warns without being drawn stretched; 0-alpha-all-opaque warns.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-004  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Freeze entity-aware render profiles from the live renderer  
CATEGORY: render-contract  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: See design §3. `TILE_WIDTH/HEIGHT` 80×40 (`gameConstants.ts` 6–7). `CHARACTER_Y_OFFSET = -9` (line 17). Draw point = tile top + 9 (`pieceArt.ts` 838–840). Pattern centered (`WorldExploration.tsx` 3677–3678). Mobile zoom 1.75 scales **tiles only** (818–821), not pixel cells. Phones &lt;768 blocked (`App.tsx` 26–28).  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` profile constants, admin spec UI, preview  
RECOMMENDED_ACTION: Check in a typed `RENDER_PROFILES` map (`player_standard`, `enemy_standard`, `enemy_elite`, `boss_large`, `summon_standard`) using only measured numbers from the design doc. Custom default scale = 1. Do not apply `MOBILE_ZOOM` to bitmaps unless a later profile opts in. Do not invent 64×64 / 128×128 as the recommended size.  
AUTONOMY: IMPLEMENT_WITH_TESTS  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unit test: each profile’s recommended box equals the derived cell math (8×3, 12×3×1.4).  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-005  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Bind artwork at spawn — never during React render or rAF  
CATEGORY: assignment-stability  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: No encounter seed exists. Enemy ids are `enemy-${n}-${Date.now()}` (`WorldExploration.tsx` 6183). Boss ids `boss_${id}_${Date.now()}` (6977). Summon ids `summon-${Math.random()…}` (`summonSpawn.ts` 137). Stats already use `seededRng` (`combatMath.ts` 122–128). Instance `scaleX/Y` is stored at spawn (6194–6195) and is the existing “stable random” pattern.  
SYSTEMS_AFFECTED: enemy generate / boss portal / `spawnSummonUnit`, `Enemy` type, `drawCombatant`  
RECOMMENDED_ACTION: Add `visualAssetId` (optional) on the instance. Introduce presentation-only `encounterVisualSeed` on the map ref when the map is committed — do **not** edit `mapGen.ts`. Pick with `seededRng(hash(seed, instanceId, poolId))` once. rAF only reads the stored id. Empty/invalid id → builtin.  
AUTONOMY: IMPLEMENT_AFTER 001 — WX call-site must stay one-line; logic in `engine/`.  
DEPENDENCIES: VAL-2026-08-31-001, VAL-2026-08-31-006  
REGRESSION_RISK: MEDIUM if seed is accidentally used for AI/stats. Keep visual seed isolated.  
VALIDATION_REQUIRED: 100 simulated renders + one React state update keep the same `visualAssetId`. Changing pool after spawn does not reshuffle live instances.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-006  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Weighted pools — active eligible only, else builtin  
CATEGORY: assignment  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Family already rolls 30% at spawn and stores `en.family` (`WorldExploration.tsx` 6236–6326) — that is the template for “pick once, store, never in render.” No pool type exists.  
SYSTEMS_AFFECTED: new pool store, spawn resolver  
RECOMMENDED_ACTION: Pools list `{ assetId, weight }`. Eligible = ACTIVE ∧ VALIDATION_STATUS ok ∧ category ∧ family/tags ∧ elite/boss flags. Weight 0 = direct-assign only. Zero eligible → unset id → pixel default. Do not re-roll when an asset is later deactivated; fall back to builtin for that instance.  
AUTONOMY: IMPLEMENT_WITH_TESTS  
DEPENDENCIES: VAL-2026-08-31-001, VAL-2026-08-31-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Tests: empty pool; all inactive; weights 1/3/6 deterministic under fixed seed; deactivated winner → builtin not a new roll.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-007  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Boss render profile is not a stretched enemy  
CATEGORY: boss-visual  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Bosses use dedicated 8×12 patterns (`getBossPixelPattern`, e.g. `boss_1` 3728–3740) and a **fixed** `scaleX/Y = 1.4` (6988–6989), not `generateEnemyScaleFactors`. `drawCombatant` branch 1 is `isBoss && bossId` (`pieceArt.ts` 843–882). Battle flags `isBoss` only when `id.startsWith("boss_")` (12224–12250).  
SYSTEMS_AFFECTED: `boss_large` profile, boss spawn bind, `drawCombatant`  
RECOMMENDED_ACTION: Assign only `BOSS_ONLY` / `#boss` assets to bosses. Draw at `boss_large` recommended 34×50 with scale 1 (or 24×36 × 1.4 if the owner uploaded a pixel-match sheet). Never take an `enemy_standard` bitmap and scale it to fill the boss box.  
AUTONOMY: IMPLEMENT_AFTER 004  
DEPENDENCIES: VAL-2026-08-31-004, VAL-2026-08-31-005  
REGRESSION_RISK: MEDIUM — double-applying 1.4 on a 34×50 upload.  
VALIDATION_REQUIRED: Preview: enemy 24×24 assigned to a boss is rejected or shown as ineligible. Boss 34×50 does not also multiply by 1.4.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-008  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Visual size must not drive occupancy, movement, range, or hitbox  
CATEGORY: invariant  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `occupancy.ts` 6–15 and 78–89: one combatant per logical tile; no pixel size. Targeting is tile Chebyshev/Manhattan. Sprite rects are a **fixed** `effectiveTileW × effectiveTileH*1.5` box (8479–8498), already decoupled from pattern 24×24.  
SYSTEMS_AFFECTED: `occupancy.ts`, `targeting.ts`, sprite rect registration  
RECOMMENDED_ACTION: Forbid reading image width/height in occupancy, pathing, spell range, or combat hitboxes. Keep sprite-hit rects tile-derived (or document a later change as hit-test-only). Preview should warn when art exceeds the 80×60 rect (missed clicks), not expand the tile.  
AUTONOMY: GUARDRAIL — add a comment + a test that resolver output is unused by occupancy.  
DEPENDENCIES: VAL-2026-08-31-001  
REGRESSION_RISK: HIGH if a later hunter “fixes” click-miss by growing occupancy.  
VALIDATION_REQUIRED: 64×72 boss image still occupies one cell; neighbors remain legal targets.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-009  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Admin preview on a real iso tile at intended scale  
CATEGORY: admin-ui  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Anchor is pattern center at tile top + 9, not tile center (`tileCenter` is top + th/2, 3622–3628). Labels at `screenPos.y − 34` (8516). Current admin sprite preview is a 72×72 `<img object-fit:contain>` (`AdminDashboard.tsx` 1223–1246) — wrong space, wrong anchor, no player/enemy comparison.  
SYSTEMS_AFFECTED: new `engine/visualPreview.ts`, AdminDashboard library panel  
RECOMMENDED_ACTION: Preview canvas: 80×40 diamond, draw point, player pixel dummy, enemy dummy, optional boss dummy, nearest-neighbor. Warn clip (y−34 / summon y−48), padding, scale mismatch, neighbor overlap, tablet 140×70 relative shrink, hit-rect overflow. Do not use the live RAF loop.  
AUTONOMY: IMPLEMENT_AFTER 003  
DEPENDENCIES: VAL-2026-08-31-003, VAL-2026-08-31-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: A 24×24 PNG sits visually comparable to the chess dummy; a 80×80 PNG triggers overlap/clip warnings.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-010  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Admin library CRUD — upload, activate, assign, revert, inspect  
CATEGORY: admin-ui  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Sprite panel already lists/edits URL configs but cannot activate, pool, version, or inspect dependents. Enemy form is a single optional URL (`AdminDashboard.tsx` 602–616). Access already gated (4760).  
SYSTEMS_AFFECTED: `AdminDashboard.tsx`, admin queries/mutations  
RECOMMENDED_ACTION: New carved-stone / crimson admin panel (existing Ankama/Dofus styling) for the operations in design §5. Revert-to-default clears binds. Dependency inspect lists assignments, pools, and best-effort live instance ids. Safe remove = inspect → deactivate → delete when zero dependents.  
AUTONOMY: HUMAN_REVIEW for UX; implement after 002–003.  
DEPENDENCIES: VAL-2026-08-31-002, VAL-2026-08-31-003, VAL-2026-08-31-015  
REGRESSION_RISK: LOW if kept admin-only.  
VALIDATION_REQUIRED: Non-admin cannot open. Activate/deactivate changes resolver without reload. Delete blocked while assigned.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-011  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Optional drawImage branch in drawCombatant with instant builtin fallback  
CATEGORY: renderer  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `drawCombatant` already injects resolvers and falls back to `king.front` on any miss (`pieceArt.ts` 809–811, 852–877). Player is still a separate `drawPixelPattern` call (8709–8720), not `drawCombatant`.  
SYSTEMS_AFFECTED: `data/pieceArt.ts`, player draw call site, image bitmap cache  
RECOMMENDED_ACTION: Add optional `getCustomVisual`. If it returns a decoded bitmap + profile, `drawImage` centered on the same draw point with `imageSmoothingEnabled = false`. On any failure, run existing branches. Cache bitmaps by assetId+version. Do not put decode or pool RNG in the rAF callback. Do not edit RAF loop structure.  
AUTONOMY: IMPLEMENT_AFTER 001+005; WX/player site is wiring only.  
DEPENDENCIES: VAL-2026-08-31-001, VAL-2026-08-31-005, VAL-2026-08-31-004  
REGRESSION_RISK: MEDIUM — wrong anchor or smoothing would shift hit-test perception. Sprite rects stay tile-sized (008).  
VALIDATION_REQUIRED: Custom on, then blob revoked → next frame builtin. Player + enemy + boss + summon each fallback independently.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-012  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Do not treat spriteUrl / PlayerSpriteConfig as the library  
CATEGORY: migration  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `getPlayerSpriteConfigs` / `frontUrl` have **zero** references in `WorldExploration.tsx`. `spriteUrl` is admin text only. `Character.pixelPattern` is saved (`CharacterCreation.tsx` 283) but the world player uses `chessPiecePatterns[pieceType]` (8683). Caffeine `ExternalBlob` is bindgen plumbing, not a sprite pipeline.  
SYSTEMS_AFFECTED: `EnemyConfig`, `PlayerSpriteConfig`, future import  
RECOMMENDED_ACTION: Leave stubs unused for combat. Optionally import existing URL rows as **inactive** library records. Do not `drawImage(spriteUrl)` as a shortcut. Decide later whether to deprecate the old types.  
AUTONOMY: DOCUMENT_THEN_HUMAN — no silent runtime bind.  
DEPENDENCIES: VAL-2026-08-31-002  
REGRESSION_RISK: HIGH if a hunter “completes” the unused URL fields.  
VALIDATION_REQUIRED: Filling `spriteUrl` in today’s admin still does not change world pixels (current behavior preserved until an explicit import).  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-013  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Family pixel patterns are ghost/minion-only — do not assume they are on-screen  
CATEGORY: renderer-gap  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `drawCombatant` branch 3 runs only when `assignedName === "Ghost" || isBossMinion` (`pieceArt.ts` 920–946). Regular enemies with `family: "iron_golem"` still hit branch 4 chess art (977–1010). Family grids exist at `WorldExploration.tsx` 4148–4214 but are unused for those units.  
SYSTEMS_AFFECTED: `drawCombatant` branch 3 vs 4, family assignment  
RECOMMENDED_ACTION: Custom family assignment is a **new** presentation bind, not a repair of this gap. If a later change also paints family pixels for standard enemies, do it as its own ID — do not fold it into custom-upload work. Document this in the admin family-assign UI so owners are not surprised.  
AUTONOMY: DOCUMENT_ONLY unless a human wants family pixels on standard enemies.  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if someone “fixes” family draw as part of the library PR — changes default look for 30% of spawns.  
VALIDATION_REQUIRED: Empty library + family iron_golem still looks like a chess piece (today).  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-014  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Store bytes in object storage, not Motoko Text  
CATEGORY: storage  
PRIORITY: P1  
CONFIDENCE: MEDIUM  
EVIDENCE: Ad boxes and sprite configs store **URL strings** (`main.mo` 2585–2598, `PlayerSpriteConfig` 408–419). `ExternalBlob` is imported in `backend.ts` 54–55 but no visual blob API exists. No in-repo file-size cap. IC ingress / Caffeine limits were not measured in this run.  
SYSTEMS_AFFECTED: canister, Caffeine object storage, admin upload  
RECOMMENDED_ACTION: Metadata on canister; bytes via `ExternalBlob` (or measured equivalent). Record `SOURCE_METADATA.hash`. Starting reject **256 KiB/still** until ingress is measured, then replace the constant. Do not base64-dump into Motoko `Text`. URL-only v1 is acceptable if admin-only and validated at load.  
AUTONOMY: HUMAN_REVIEW — infra.  
DEPENDENCIES: VAL-2026-08-31-002  
REGRESSION_RISK: HIGH if large blobs land in actor stable memory.  
VALIDATION_REQUIRED: Over-cap upload rejected. Hash mismatch → `#invalid` → builtin.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-015  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Versioned replace and safe removal with dependency inspection  
CATEGORY: lifecycle  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `adminDeletePlayerSpriteConfig` is a hard `remove` (`main.mo` 575–579) with no dependency check. Live combatants hold only `pieceType` / `family` / `id`, not an asset id (today).  
SYSTEMS_AFFECTED: admin delete/replace, resolver  
RECOMMENDED_ACTION: Replace increments `VERSION`, keeps `ASSET_ID`, retains previous bytes until prune. Delete is blocked while assignments or known live binds exist; owner can deactivate instead. Deactivated / deleted ids resolve to builtin the next frame (001), no pool re-roll (006).  
AUTONOMY: IMPLEMENT_AFTER 002+010  
DEPENDENCIES: VAL-2026-08-31-002, VAL-2026-08-31-006, VAL-2026-08-31-010  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Delete assigned asset fails; deactivate → builtin; replace keeps binds, new bytes show after reload.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-016  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Future categories stay ineligible until they have a measured profile  
CATEGORY: extensibility  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Portals are procedural whirlpools (`drawPortalWhirlpool` 4234+). Walls use `wallHeight = 28` (4430). Loot/hazards are separate passes. `AGENTS.md` requires explicit metadata, never name heuristics.  
SYSTEMS_AFFECTED: category enum, resolver  
RECOMMENDED_ACTION: `#future(Text)` may be stored. Resolver treats unknown categories as ineligible → current art. Adding a category requires a new render profile derived from that renderer (same method as §3). No matching on display names.  
AUTONOMY: DOCUMENT_THEN_IMPLEMENT when a category is actually needed.  
DEPENDENCIES: VAL-2026-08-31-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Asset tagged `#future("portal")` never replaces the whirlpool.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-017  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Extract visual logic to engine/ — do not grow WorldExploration  
CATEGORY: sensitive-code  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: AQA-2026-08-30-007 / `AGENTS.md`: no drive-by WX / RAF / mapGen / turn / damage edits. `WorldExploration.tsx` already hosts `drawPixelPattern`, boss patterns, family patterns, and spawn. Quality audit: 19k+ lines, heavy automation churn.  
SYSTEMS_AFFECTED: `engine/visualAssets.ts`, `engine/visualPreview.ts`, WX call sites  
RECOMMENDED_ACTION: New behavior lives in `src/frontend/src/engine/*` with tests. WX/admin get wiring only. Reject implementer PRs whose primary hunk is another WX branch for this feature.  
AUTONOMY: PROCESS — apply to every VAL implementer PR.  
DEPENDENCIES: AQA-2026-08-30-007  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Implementer diff: WX line delta small; tests sit beside the helper.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-018  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Defer walk-frame animation — four stills only in v1  
CATEGORY: scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `PlayerSpriteConfig` walk-frame arrays (`admin.mo` 47–50, `AdminDashboard.tsx` 1311–1345) are never drawn. Facing is four stills via `currentView` / `playerView` (11690–11697).  
SYSTEMS_AFFECTED: upload UI, `DIRECTION_REFS`  
RECOMMENDED_ACTION: v1 accepts front/right/left/back stills. Missing side → front → builtin. Do not implement walk cycles, sprite sheets, or RAF frame indexes.  
AUTONOMY: SCOPE_GUARD  
DEPENDENCIES: VAL-2026-08-31-003  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Upload UI does not require walk frames. One-still player works.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-08-31-019  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Elite/large is metadata-only until a real elite type exists  
CATEGORY: category-model  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: No `isElite` field. `generateEnemyScaleFactors` (4928–4954) is random visual squash stored on the instance. `iron_golem` is a family HP multiplier (6265–6271), not elite. Occupancy is always one tile.  
SYSTEMS_AFFECTED: `ELITE_ONLY`, `enemy_elite` profile  
RECOMMENDED_ACTION: Keep `ELITE_ONLY` on the record. Until an explicit elite flag exists, elite-only assets are ineligible for random pools (builtin). Do not infer elite from `scaleY` or HP. Do not grow collision for “large” art.  
AUTONOMY: DOCUMENT_THEN_IMPLEMENT  
DEPENDENCIES: VAL-2026-08-31-004, VAL-2026-08-31-006, VAL-2026-08-31-008  
REGRESSION_RISK: MEDIUM if scale 1.4 is treated as elite gameplay.  
VALIDATION_REQUIRED: `ELITE_ONLY` asset never appears on a default-family pawn while no elite flag exists.  
STATUS: NEW

ACTION_ID: TBC-2026-08-31-001  
SOURCE_AUTOMATION: Telemetry-Driven Balance & Content Analyst  
TITLE: Keep balance/content analysis gated until real telemetry exists  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: 2026-08-31 cron run (`bc-9825c839`) found no telemetry files, no analytics SDK, no event export, and 0 rows in every analysis domain. Quality Auditor 2026-08-30 already recorded “Player telemetry: None.” Inventing win rates or inferring difficulty from combat source would violate this analyst’s activation guard.  
SYSTEMS_AFFECTED: Telemetry-Driven Balance & Content Analyst (`2786666f-a4a0-11f1-a7d1-d6b4613131ce`); Master Technical Director; any Game Balance specialist  
RECOMMENDED_ACTION: Next TBC cron must re-check collectors first. If still empty, emit WAITING_FOR_TELEMETRY only. Master Technical Director must not open balance PRs from a WAITING_FOR_TELEMETRY packet.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next TBC report is either still WAITING_FOR_TELEMETRY with a fresh search, or cites real event counts with sample sizes.  
STATUS: NEW  

---

ACTION_ID: TBC-2026-08-31-002  
SOURCE_AUTOMATION: Telemetry-Driven Balance & Content Analyst  
TITLE: Human-design backend-authoritative gameplay events for balance analysis  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Required domains (enemy win/loss, relative difficulty, battle duration, death causes, spell usage/discovery/sources/combinations, boss and challenge completion, Doka earned/spent, dungeon performance, content usage) all have collector=no and rows=0. Wallet Nat, killCount, leaderboard, spell-bar snapshots, and achievement flags are progress state, not an event series. `AQA-2026-08-30-012` covers persist/victory/recap/shop counters only.  
SYSTEMS_AFFECTED: `src/backend/main.mo` (new query-only or persist-lock-safe counters); optional export; this analyst as consumer  
RECOMMENDED_ACTION: Human-designed event schema matching `docs/automation/TELEMETRY_BALANCE_2026-08-31.md` “Required measurements.” Include playerLevel and content id on every row (no level cap — relative bands only). Do not change damage math, RAF, map gen, or turn logic. Do not start from client-only logs. Extend `AQA-2026-08-30-012`; do not open a second persist-counter PR.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AQA-2026-08-30-012  
REGRESSION_RISK: MEDIUM if events write Doka/XP off `createProgressPersist` or invent a second wallet path. LOW if query-only increment counters that never call `saveBattleStats` / `applyRewards`.  
VALIDATION_REQUIRED: A later TBC run can query ≥1 UTC day of `battle_end` and `spell_cast` (and state sample size). Until then this analyst stays WAITING_FOR_TELEMETRY.  
STATUS: NEW

ACTION_ID: WDEAD-2026-08-31-001  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Remove hard level ceilings from spawn, regions, dungeons, and AI  
CATEGORY: indefinite-progression  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `src/frontend/src/engine/combatMath.ts` lines 54–58 set `maxTier = Math.floor(999 / ts)` so `pickEnemyLevelFromTiers` cannot emit levels above ~999. `computeAITier` (lines 36–51) buckets stop at 900 then hard-tier 10; 30% of rolls are uniform `1..10`. Admin `newEnemy` / `newRegion` default `levelMax: 5` (`AdminDashboard.tsx` 108–118). Region effects apply only when `level <= Number(r.levelMax)` (`WorldExploration.tsx` 3517–3524). Map `levelZone.maxLevel` is the current tier top (WX 5057–5068). Dungeon extra-enemy / tier-boost / Doka tables all `Math.min(depth, 5)` (WX 6082–6083, 1201–1203; `useDungeonState.ts` 10–21; `portalRules.ts` 148–161). Chain length is `3 + floor(random*3)` (WX 6693, 6785). Death Realm rebuilds still stamp `maxLevel: 5` (WX 13567, 13699).  
SYSTEMS_AFFECTED: `combatMath.ts` spawn picker; region matching; dungeon depth curves; admin Enemy/Region forms; Death Realm zone stamps. Not RAF, not damage math.  
RECOMMENDED_ACTION: Replace every required `levelMax` / `999` / `min(depth, 5)` / AI-tier-10 stop with relative offsets and open tails. Regions use `levelMin` + optional preferred band with overflow fade, never reject. Dungeon curves stay defined for depth 6+. AI sophistication becomes a probability, not a 10-bucket ceiling. Keep player XP curve `100 * 2^(N-1)` unchanged.  
AUTONOMY: HUMAN_APPROVE — extract pickers to `engine/spawnPolicy.ts`; do not patch formulas inside WX generate.  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if the 999 cap is deleted without a relative tail — early maps could spawn absurd offsets. Mitigate by porting current 60/20/10/5 weights to equal/adjacent/tail first, then removing the cap.  
VALIDATION_REQUIRED: Unit tests at player levels 1, 100, 1_000, 10_000, 50_000: enemy level is defined, finite, and can exceed 999. Region effects still apply at level 10_000. Dungeon depth 8 still has a multiplier. `pnpm typecheck` clean.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-002  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Relative spawn owner surface — equal-level, above-level, open tail, no max  
CATEGORY: spawn-admin  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Tiers tab (`AdminDashboard.tsx` 3353–3703) exposes `sameTierPercent` / `adjacentTierPercent` / `twoAwayPercent` / `threeOrMorePercent` and requires sum 100. Adjacent and ±2 are split evenly above/below (`combatMath.ts` 82–89). There is no equal-level or above-level knob. `levelVarianceChance` exists on the engine type (`combatMath.ts` 11, 60–69) but not on frontend `TierSpawnConfig` (`gameTypes.ts` 418–424) and is not on the tab. Preview samples only `[1, 10, 25, 50, 100, 200, 500]` (3407). Tier-size input is `max={100}` (3488–3489). Save writes `localStorage` then backend (3393–3398).  
SYSTEMS_AFFECTED: Admin Tiers/Spawn tab; `TierSpawnConfig` Candid; `loadTierConfig` / `pickEnemyLevelFromTiers`.  
RECOMMENDED_ACTION: Owner fields: `equalLevelProbability`, `aboveLevelProbability`, `belowLevelProbability` (or remainder), `aboveOffsetWeights`, `belowOffsetWeights`, `openTail`. Forbid a max-level field on the form. Preview accepts an arbitrary hypothetical level including 50_000. Keep backend-authoritative; localStorage cache only.  
AUTONOMY: HUMAN_APPROVE then implementer. Draft-only until WDEAD-2026-08-31-004 exists.  
DEPENDENCIES: WDEAD-2026-08-31-001 (cap removal); WDEAD-2026-08-31-004 (do not live-save)  
REGRESSION_RISK: MEDIUM — mis-normalized percents can flood above-level packs. Validate-gate must normalize and show the histogram before activate.  
VALIDATION_REQUIRED: Admin preview at level 50_000 shows a defined distribution. Sim (003) reports below/equal/above within 2pp of configured weights at N=5000. No `levelMax` in the spawn payload.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-003  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Non-persistent Simulation Laboratory for hypothetical levels and many encounters  
CATEGORY: simulation-lab  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `engine/mapGen.simulate.ts` is a seeded solvability replica (file header lines 1–5) and does not report families, elites, AI, rare spells, or difficulty. Tiers tab preview is a static percentage table, not a Monte Carlo. No admin tab exists for N-encounter rolls. Live `generateEnemies` (`WorldExploration.tsx` 6073–6330) is a React callback closed over `characterStats` — running it “for science” would use the real character and can be followed by real battles / `applyRewards`. Quality audit AQA-2026-08-30-012 already notes zero encounter telemetry.  
SYSTEMS_AFFECTED: new `engine/encounterSim.ts` (proposed); Admin Simulation tab (dev-only). Must not touch persist lock, `rewardResolver.ts`, `saveBattleStats`, character queries.  
RECOMMENDED_ACTION: Dev-only lab: inputs = hypothetical player level (unbounded), draft pack, N, seed, mode filter. Reports = relative-level histogram, below/equal/above, families, variants, elites, AI bands, rare spells, discovery opportunities, formations, estimated difficulty (display only). Isolation: zero actor updates, zero persist enqueue, zero player `localStorage` writes, zero real map install. Support level 50_000 without clamping to 999.  
AUTONOMY: HUMAN_APPROVE. Lab may be implemented before live spawn cutover if it calls extracted pure pickers only.  
DEPENDENCIES: WDEAD-2026-08-31-001 and 002 for meaningful extreme-level reports; 004 to bind results to a draft.  
REGRESSION_RISK: HIGH if the lab reuses WX `generateEnemies` / portal entry — a single missed branch writes economy. Require an allow-list test that spies actor methods and fails on any `applyRewards` / `saveBattleStats`.  
VALIDATION_REQUIRED: 10_000 simulated encounters at levels 1 and 50_000; wallet, XP, spell levels, dungeonRecords, boss-rush state unchanged. `pnpm typecheck`. Dev-only gate: normal `user` role cannot open the pane.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-004  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Install DRAFT → SIMULATE → VALIDATE → ACTIVATE for world-content packs  
CATEGORY: admin-lifecycle  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Tiers save writes live immediately (`AdminDashboard.tsx` 3387–3403). Boss Rush save writes `localStorage` then `adminSetBossRushConfig(JSON.stringify)` (6383–6393). Enemy/region/spell/modifier CRUD is `adminSet*` with no draft. Architecture (`docs/ARCHITECTURE.md` 206–214) documents live `adminSet*` as the operator path. There is no validate step beyond “percents sum to 100” (Tiers 3375–3380).  
SYSTEMS_AFFECTED: new pack record (backend `#admin`); Admin Drafts tab; hydrate path that currently reads `pbv_tier_spawn_config` / `bossRushConfig`.  
RECOMMENDED_ACTION: Store packs with `status: draft | simulating | validated | active | archived`. Edits land on draft. Simulate attaches a report. Validate runs the gate list in the 2026-08-31 brief §6 (no hard max, normalized probabilities, open tail, id integrity, relative reward curves, no `min(depth,5)`, sim isolation, single reward funnel, `#admin` activate). Activate swaps the pointer; players hydrate **active** only.  
AUTONOMY: HUMAN_APPROVE — canister schema change; do not deploy `backend_extended`.  
DEPENDENCIES: WDEAD-2026-08-31-003 for the simulate stage  
REGRESSION_RISK: MEDIUM — a botched activate could wipe live tier weights. Keep the current `TierSpawnConfig` as the v0 active pack during migrate.  
VALIDATION_REQUIRED: Saving a draft does not change overworld spawn. Activate after failed validate is rejected. After activate, a new session hydrates the new pack from backend (localStorage is cache).  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-005  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Encounter catalog — pools, formations, rarity, objectives, rewards, hazards, rules  
CATEGORY: encounters  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `generateEnemies` (WX 6084–6330) rolls size `1 + rand*8` (+ dungeon table), random chess piece, quadrant scatter, Chebyshev ≥ 4, then 30% family. No formation catalog. No encounter rarity. Objectives are a separate hardcoded `DEFAULT_CHALLENGES` list (`challengeCompletion.ts` 38–103), not bound to a pack. Hazards are map tiles (`HazardTileType` lava/ice/spikes) plus modifiers, not encounter-scoped. No encounter rule metadata (flee, leader-last, timer).  
SYSTEMS_AFFECTED: new `EncounterTemplate` catalog; `engine/encounterFormations.ts` (proposed); challenge bind; hazard/rule ids. WX should only consume a built roster.  
RECOMMENDED_ACTION: Owner CRUD for encounter templates with explicit ids: `enemyPoolIds`, `formationId` (cell dx/dy + role), `rarity` weight, `relativeDifficulty`, `objectiveIds`, `rewardCurve`, `hazardIds`, `ruleIds`. Formations are metadata, never name heuristics. Do not add this as a WX branch.  
AUTONOMY: HUMAN_APPROVE after 001–004. Extract helpers; one-line WX wiring.  
DEPENDENCIES: WDEAD-2026-08-31-006 (pools must be live archetypes); 010 (relative rewards); 004 (draft lifecycle)  
REGRESSION_RISK: MEDIUM — a formation that cannot place on CA maps softlocks a fight. Validate must fall back to current quadrant scatter when a formation is infeasible, and sim must report infeasible rate.  
VALIDATION_REQUIRED: Sim reports formation histogram and infeasible %. Existing challenge predicates still compile. No mapGen edits.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-006  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Replace dead EnemyConfig spawn CRUD with archetypes the roster actually samples  
CATEGORY: encounters  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Backend `EnemyConfig` (`src/backend/types/admin.mo` 15–26) and admin Enemies tab persist `hp/ap/mp/initStat/levelMin/levelMax/regions`. `WorldExploration.tsx` has **zero** `enemyConfigs` / `useGetEnemyConfigs` reads. Roster stats come from `pickEnemyLevelFromTiers` + `computeEnemyStats` / `getEnemyBaseStats` (`progression.ts`). Architecture already warns of two EnemyConfig types (`docs/ARCHITECTURE.md` 29). Admin absolute HP fights the level formula.  
SYSTEMS_AFFECTED: `admin.mo` EnemyConfig; Admin Enemies tab; future spawn sampler.  
RECOMMENDED_ACTION: Stop presenting EnemyConfig as a combat-stat source. Introduce `EnemyArchetype { id, familyId, pieceWeights, statMults, spellPoolIds, eliteCapable }` that `generateEnemies` / sim actually sample. Keep sprite/name fields. Reject absolute combat stats on the owner form (formulas stay in `progression.ts`).  
AUTONOMY: HUMAN_APPROVE — Candid change; carry killCount/12-field stats discipline on any character payload left untouched.  
DEPENDENCIES: WDEAD-2026-08-31-001 (no levelMax on the replacement type); 005  
REGRESSION_RISK: LOW for live play (config is already unused). MEDIUM if a migrate writes absolute HP onto combatants and bypasses `getEnemyBaseStats`.  
VALIDATION_REQUIRED: After cutover, toggling an archetype weight changes sim family histogram. Live spawn no longer ignores the admin pool. Existing 12-field `CharacterStats` path unchanged.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-007  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Dungeon owner policy — room pools, sequencing, rest, branching, bosses, unbounded rewards  
CATEGORY: dungeons  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Dungeon entry is a hardcoded 20% world portal (WX 5229–5257). Chain length is 3–5 (WX 6785). Floors reuse `generateRandomMap` + extra enemies / tier boost clamped at 5 (WX 6080–6085). Rest is a 10% **world** portal (WX 5295–5316), not a dungeon room; rest-exit may arm a chain (WX 6688–6695). Bosses are a separate 15% world portal (WX 5261–5292), not dungeon bosses. No branch graph. Completion bonus is `maxDepth * 50` (`portalRules.ts` 195–197). `dungeonRecords` is Principal-keyed progress only (`ARCHITECTURE.md` 122, 314), not content.  
SYSTEMS_AFFECTED: dungeon entry/length/reward policy; rest-room policy; portalRules snapshot/decide (must keep `snapshotDungeonChain` before `cleanupMap`).  
RECOMMENDED_ACTION: Owner `DungeonPolicy`: entry chance, length or continue-weights (no hidden 5), room-pool ids (archetypes the existing generator may draw — **do not fork mapGen**), sequence / branch graph, special-room weights, rest-room policy, boss-from-depth + relative scale, dungeon-scoped modifiers, unbounded reward + completion curves. Unify multiplier tables first (013).  
AUTONOMY: HUMAN_APPROVE. AGENTS.md forbids map-generation implementation; this ID is policy + call-site wiring only.  
DEPENDENCIES: WDEAD-2026-08-31-013; 001; 004; 010  
REGRESSION_RISK: HIGH if portal snapshot/cleanup order is revisited. Do not touch `cleanupMap` zeroing semantics.  
VALIDATION_REQUIRED: `portalRules.test.ts` still passes. Depth 8 has a defined multiplier. Rest rooms inside a chain do not spawn overworld colored portals (`filterRunPortals`). No `mapGen.ts` hunk.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-008  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Boss Rush — configurable pools, relative scaling, progression, multipliers, sequencing  
CATEGORY: boss-rush  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Runtime rooms are a 10-element const (`useBossRush.ts` 23–134) with flat 500–5000 Doka / 200–2000 XP and hardcoded pairs. Admin tab (WX dashboard 6310–6412) only toggles `room_N_enabled` and a multiplier; pairs are labels, not editors. Entry chance is magic 0.08 (WX 5318–5323). Boss combat HP is absolute (`defaultBossConfigs` in `admin.mo`; battle start uses `bossConf.baseStats.hp` at WX 12235–12240). Config JSON is a string blob (`adminSetBossRushConfig`). Security audit still flags `completeBossRushRoom` as a client-trusted reward write.  
SYSTEMS_AFFECTED: `useBossRush.ts`; Admin Boss Rush tab; boss stat init; persist via `bossRushProgress.ts` / `rewardResolver.ts`.  
RECOMMENDED_ACTION: Owner policy: `bossPoolIds`, pairing, draftable `roomSequence`, `relativeScale = f(playerLevel) * roomCurve`, progression as policy (not a hardcoded 10), `rewardMultiplierCurve`. Pay still goes through the existing persist lock + `applyRewards`. Do not add a second wallet write. Relative scale bosses so a level-5000 player does not one-shot 800 HP.  
AUTONOMY: HUMAN_APPROVE. Do not “fix” canister trust in the same PR.  
DEPENDENCIES: WDEAD-2026-08-31-014 (backend bosses); 004; 010; 001  
REGRESSION_RISK: HIGH on room-0 farm / jackpot resume (`bossRushProgress.ts` already resets after the final room). Sequence edits must keep that guard.  
VALIDATION_REQUIRED: Existing `bossRushProgress.test.ts` stays green. Sim can roll rush rooms at hypothetical level 10_000 without writing `getBossRushState`. Enabled-room disable still shortens a run without leaving a resumable jackpot.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-009  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: World-event catalog — eligibility, rarity, hazards, elites, rare-spell-bearers, rewards, modifiers  
CATEGORY: world-events  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: No event type exists. Closest scraps: map-modifier two-roll (`gameConstants.ts` 306–308; admin Modifiers tab); jackpot heal banner (WX 930–931, 17928+); betrayal gated at AI tier 10 (`gameConstants.ts` 204, `ENEMY_AI_TIER_GATES.betrayal`); leader boost (`AdminGameConfig.leaderBoostPercent`); family 30% including `void_mirror`. Elites are not a flag. Rare spell-bearers are not a flag. Eligibility cannot be expressed without `levelMax` today.  
SYSTEMS_AFFECTED: new `WorldEvent` catalog; modifier roll; elite/rare-spell spawn flags; eligibility vs region/runMode.  
RECOMMENDED_ACTION: Owner events with open-ended eligibility (runMode, region ids, relative band — overflow allowed), rarity weight, hazard ids, `elitePolicy`, `rareSpellBearerPolicy` (explicit `spellPoolIds`, never name heuristics), `rewardCurve`, `modifierIds`. Elite ≠ leader. Jackpot / betrayal can later become event ids; do not reimplement them inside WX while designing the catalog.  
AUTONOMY: HUMAN_APPROVE. Catalog + sim first; live wiring after 004.  
DEPENDENCIES: WDEAD-2026-08-31-011; 012; 010; 004  
REGRESSION_RISK: MEDIUM if jackpot is moved off the persist-safe spend path (AQA jackpot cluster). Keep jackpot on the existing wallet lock until a dedicated migrate.  
VALIDATION_REQUIRED: Sim at level 50_000 still emits elites/rare-spells at configured rates. Event eligibility never uses `levelMax` reject. Modifier roll remains behind `#admin` draft until activate.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-010  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Relative reward curves for challenges, dungeons, rush rooms, and events  
CATEGORY: economy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `DEFAULT_CHALLENGES` pays flat 50–500 Doka and 400–1000 XP (`challengeCompletion.ts` 38–103). Dungeon Doka is a 6-slot table that freezes at 4.0× (`useDungeonState.ts` 10–21). Completion bonus is `maxDepth * 50` (`portalRules.ts` 195–197). Boss Rush rooms pay flat 500–5000 / 200–2000 (`useBossRush.ts`). `applyRewards` is Nat-only and cannot subtract (death penalty stays on `saveBattleStats`). Architecture requires a single atomic funnel + root recap.  
SYSTEMS_AFFECTED: `challengeCompletion.ts` advertised rewards; dungeon multiplier module; rush room rewards; future event rewards; `rewardResolver.ts` (read-only consumer).  
RECOMMENDED_ACTION: Owner `RewardCurve` `{ base, perPlayerLevel, perRelativeDifficulty, perRarity }` (exact shape negotiable) for challenges / dungeon floors / rush rooms / events. Advertise the evaluated amount; persist only through `applyRewards` (credits) or `saveBattleStats` (absolute heals/spends/death). Never call the resolver per kill. Never invent a second wallet write.  
AUTONOMY: HUMAN_APPROVE — economy. Implementer must enqueue on `createProgressPersist`.  
DEPENDENCIES: WDEAD-2026-08-31-004; 007; 008; 005  
REGRESSION_RISK: HIGH if curves are evaluated on the canister from client-supplied level (security findings 2/5/6). Evaluate on the official client from authoritative character level, then persist the delta through the lock; or clamp like the open economy PR. Do not silently raise shop auto-complete.  
VALIDATION_REQUIRED: Recap popup still shows one atomic reward. Death penalty 20% XP / 40% Doka unchanged. Challenge helper tests still pass with curve-evaluated numbers. Sim must not credit.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-011  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Owner knobs for elite, variant, encounter size, family weights, AI sophistication  
CATEGORY: spawn-admin  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Family variant is `if (Math.random() < 0.3)` over seven equal families (WX 6236–6326). Encounter size is `Math.floor(Math.random() * 8) + 1` plus `[0,2,3,4,4,5][min(depth,5)]` (WX 6082–6085). `MAX_ENEMIES = 20` (`gameConstants.ts` 10). No elite flag on `Enemy` (`gameTypes.ts` 259–331 has `isLeader` but not `isElite`). AI uses `computeAITier` 10-bucket + 30% chaos (`combatMath.ts` 34–51) and gates in `ENEMY_AI_TIER_GATES` (`gameConstants.ts` 200–209).  
SYSTEMS_AFFECTED: `generateEnemies` extract; `Enemy` metadata (`isElite`, `isVariant` as explicit flags); admin Spawn tab.  
RECOMMENDED_ACTION: First-class probabilities: elite, variant, family weights, encounter `{min,max,depthCurve}`, AI-sophistication probability (gates stay named constants; the *chance* an enemy is allowed to roll high gates is owner-owned). Size curve must work at dungeon depth 8+. Do not use family name substrings (`family.includes("berserk")` in `enemyAI.ts` 441–442) for new content — add `aiStrategy` metadata.  
AUTONOMY: HUMAN_APPROVE. Extract from WX; do not add another inline roll block.  
DEPENDENCIES: WDEAD-2026-08-31-002; 001; 006  
REGRESSION_RISK: MEDIUM — raising `MAX_ENEMIES` without occupancy tests can break initiative / victory leftover-roster. Cap is a *board* limit, not a player-level cap; keep a safety board cap but do not encode it as a progression ceiling.  
VALIDATION_REQUIRED: Sim family histogram matches weights ±2pp. Elite rate matches. Existing summon hostility / leftover-roster tests still pass at size 8.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-012  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Asymptotic summoner chance and explicit advanced-spell pool (fix NaN levelZone)  
CATEGORY: spawn-admin  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Battle start assigns kits via `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (WX 12186). `buildEnemyKit` types `levelZone: number` (`enemyAI.ts` 187–192) and `ENEMY_KITS` only branch `z >= 1` / `z >= 2` (156–178). `currentMap.levelZone` is a `LevelZone` object (`{ name, minLevel, maxLevel }`, WX 465–470, 5064–5068). `Math.floor(object)` is `NaN`, so kits stay on the early branch — “advanced” spells barely appear. Separately, `ENEMY_SUMMONER_CHANCE = 0.12 + characterStats.level * 0.02` (WX 12198–12200, constants 298–299) is linear and unclamped: by level ~44 every non-summon is a summoner, which is a variety ceiling.  
SYSTEMS_AFFECTED: WX battle-start spell assign; `ENEMY_KITS`; summoner roll; future advanced-spell probability.  
RECOMMENDED_ACTION: Pass an explicit numeric band or, better, an `advancedSpellProbability` + `advancedSpellPoolIds` (usableByEnemy, metadata — no name heuristics). Summoner chance becomes an asymptotic curve `base + (1-base)*(1-exp(-k*level))` or owner-defined, never a linear climb to 100%. Do not expand kit bands as a hidden level cap.  
AUTONOMY: HUMAN_APPROVE. One-line WX fix for the object/number mismatch is in scope for an implementer; do not retune damage.  
DEPENDENCIES: WDEAD-2026-08-31-011; 009 (rare-spell-bearers use the same pool)  
REGRESSION_RISK: MEDIUM — suddenly passing `minLevel` as the number would jump many kits from band 0 to band 2. Ship behind draft/sim so owners see the advanced-spell rate before activate.  
VALIDATION_REQUIRED: Unit test: `buildEnemyKit("queen", { name: "Tier 1", minLevel: 1, maxLevel: 10 })` must not silently NaN (implementer decides the adapter). Sim advanced-spell rate at level 50_000 is not 100% unless the owner set it there. Summoner rate at level 10_000 is < 1.0 for default curve.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-013  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Unify the triplicated dungeon Doka multiplier tables before owner editing  
CATEGORY: dungeons  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Identical clamp-5 tables live in `WorldExploration.tsx` 1201–1203, `useDungeonState.ts` 10–21 (`DUNGEON_DOKA_MULTIPLIERS` + `getDungeonMultiplier`), and `portalRules.ts` 148–161 (`dungeonDokaMultiplierFor`). Comments in `portalRules.ts` 151–154 already warn React state can inflate overworld kills after reset. Owner curves cannot be added three times.  
SYSTEMS_AFFECTED: those three files; reward-time multiplier reads.  
RECOMMENDED_ACTION: One module, one function, depth-unbounded curve (after 001). WX and portalRules call it. Owner later edits that module’s config via the pack (007), not a fourth copy.  
AUTONOMY: IMPLEMENT_WHEN_PICKED — mechanical extract, no gameplay intent change until 007.  
DEPENDENCIES: None to extract; 001/007 to unclamp  
REGRESSION_RISK: MEDIUM if the extract reads stale React depth instead of refs (the bug `dungeonDokaMultiplierFor` was written to prevent). Tests must drive refs, not state.  
VALIDATION_REQUIRED: `portalRules.test.ts` + a helper test that resetRunState returns multiplier 1. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-014  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Backend-authoritative boss configs — stop writing `pbv_boss_configs` as source of truth  
CATEGORY: bosses  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `useAdminQueries.ts` 462–517 documents “localStorage-backed until backend endpoints land” and reads/writes `pbv_boss_configs`. Architecture (`docs/ARCHITECTURE.md` 59) lists that key as a known exception. Backend already has `BossConfig` / `defaultBossConfigs` (`admin.mo` 349+) and architecture CRUD table includes boss (`ARCHITECTURE.md` 214). Admin Bosses tab uses `useSetBossConfig` / `useDeleteBossConfig` / `useGetAllBossConfigs` — the set/delete hooks shown are the localStorage pair.  
SYSTEMS_AFFECTED: `useAdminQueries.ts` boss hooks; Admin Bosses tab; rush pool (008).  
RECOMMENDED_ACTION: Point set/get/delete at backend `adminSet*` / `getAllBossConfigs`. `localStorage` becomes cache only, matching AGENTS.md. Required for a trustworthy rush pool and relative scale.  
AUTONOMY: HUMAN_APPROVE — confirm live canister actually exposes the boss admin methods before cutover (deployed canister can lag source).  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if the live actor lacks the methods — saves would fail closed. Feature-detect and keep cache fallback until upgrade, but mark cache stale.  
VALIDATION_REQUIRED: Admin save + reload (cleared localStorage) still shows the boss. No 15-field stats payload. Canonical actor remains `src/backend/main.mo`.  
STATUS: NEW  

---

ACTION_ID: WDEAD-2026-08-31-015  
SOURCE_AUTOMATION: World, Dungeon & Encounter Admin Designer  
TITLE: Keep admin, drafts, and the simulation lab dev-gated — never a normal-player surface  
CATEGORY: gating  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: AGENTS.md: “All admin and debug features must be dev-only/gated and never ship to normal players.” Architecture (`docs/ARCHITECTURE.md` 206–219): UI lazy-loads when `isAdmin && onOpenAdmin`; first non-anonymous `getUserRole` caller becomes `#admin`. `App.tsx` 361–372 mounts `AdminDashboard` from a LandingPage hidden login as well as the in-game button (427–428). Simulation lab (003) would be a new mint-adjacent surface if visible to that first player in production.  
SYSTEMS_AFFECTED: `App.tsx` admin entry; Admin dashboard; proposed Simulation / Drafts tabs.  
RECOMMENDED_ACTION: Gate Simulation, Drafts, Activate, and spawn inspection behind dev/admin AND a build flag (or equivalent) so a production first-login admin cannot casually activate a draft or run 10_000 sims on a player build. Backend already requires `#admin` on writes — keep that. Do not add player-facing “create encounter” UI.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: WDEAD-2026-08-31-003; 004  
REGRESSION_RISK: LOW for combat. MEDIUM for operators if the flag hides the only admin entry — keep existing CRUD reachable for the true operator, hide lab/activate on player builds.  
VALIDATION_REQUIRED: A `user` role session cannot open Simulation or Activate. Player recap / reward funnel unchanged. Debug overlay remains reachable during load/crash (existing rule).  
STATUS: NEW

ACTION_ID: EED-2026-08-31-001  
SOURCE_AUTOMATION: Dungeon and Encounter Evolution Designer (`73740435-a493-11f1-a7d1-d6b4613131ce`)  
TITLE: Progression-proof encounter catalog (design only)  
CATEGORY: design  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Cron run 2026-08-31. No prior `ENCOUNTER_ID` catalog in-repo. Live systems already have archetypes, kits-by-zone, hazards, rest exits, dungeon-chain depth, 19 bosses, 10-room Boss Rush, and optional challenges — but overworld fights still scale mostly by pack level.  
RECOMMENDED_ACTION: Human or orchestrator picks IDs from `docs/encounters/ENCOUNTER_EVOLUTION_2026-08-31.md`. Do not implement production code from this ACTION_ID. First implementer slice if approved: ENC-TEACH-01, ENC-HAZ-01, ENC-WAVE-01.  
DEPENDENCIES: None  
REGRESSION_RISK: NONE — docs only  
VALIDATION_REQUIRED: Catalog contains all requested types (waves, survival, elite, ambush, reinforcements, protection, priority, movement, hazard, rare elite, treasure/risk, rest, branch, mini-boss, rush variants, spell-discovery) and every entry is STATUS: PROPOSED.  
STATUS: OPEN

ACTION_ID: PXA-2026-08-31-001  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Restore spell discovery — stop granting the full catalog as innate  
CATEGORY: spell-discovery  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `WorldExploration.tsx` 2242–2243 marks every `starterSpells` entry `isBaseSpell` (“always shown, never removable”). `data/spellData.ts` 27–691 is 32 identities (Strike through five summons). The 8-slot bar (`SpellbookModal` / `setSpellBarOrder` max 8) therefore filters a gifted library; it does not unlock one. Backend spells not in `OLD_SPELL_NAMES_SET` (2203–2236) merge into the same owned pool (2257–2271), including `admin.mo` `defaultSpells()` 168–191 (`vampire_bite`, `void_collapse` at minLevel 30, `reflect_barrier`, …). No `discoverSpell` / loot / unlock path exists in `src/frontend`. This is the opposite of the protected “spell-discovery excitement.” A no-cap game can drip tools forever; a gifted 32-spell book cannot.  
SYSTEMS_AFFECTED: spells, spell discovery, spellbook, admin spells, progression  
RECOMMENDED_ACTION: REWORK. Innate set = Strike + at most 2–3 starters (one defend, one reach, one sustain). All other current starters become findable (portal, named enemy, dungeon depth, boss, admin-authored drop) with explicit `SpellConfig` ids. Backend `defaultSpells()` must enter the same unlock table, not the create-time union. Keep the 8-slot bar as the loadout commitment.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-002 (merge clones before locking the unlock table); PXA-2026-08-31-005; PXA-2026-08-31-015  
REGRESSION_RISK: HIGH — existing characters already own the full innate set via `spellBarOrder`. Need a one-time migrate: preserve equipped 8, mark the rest as unlocked-in-book so veterans are not stripped.  
VALIDATION_REQUIRED: New profile owns ≤4 spells. A distinct find event adds exactly one id to owned, not to innate. `pnpm typecheck`. Play: first three maps do not open a 30-row book.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-002  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Merge overlapping spell identities into one tool each  
CATEGORY: spells  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Near-duplicates in `spellData.ts`: Shield (`starter-shield` 30–47) and Iron Skin (`spell-iron-skin` 293–312) are both +30% RES / 3 turns. Poison Arrow (48–67) and Venom Strike (394–415) are both 4 DoT × 3, no upfront. Blood Mend (84–102) and Rallying Cry (416–436) are both self-heal +15% CHC / 2 turns. Expose (373–393) and Shadow Veil (480–500) are both damage + RES+SP shred. Life Drain (103–122), Drain Courage (437–458), and canister `vampire_bite` (`admin.mo` 178–179) are three drains. Mirror (198–214) and `reflect_barrier` (`admin.mo` 181–182) are two reflects. Enrage (273–292) vs Fury Potion (`BuffShop.tsx` 63–71); Haste (313–332) vs Swift Boots (48–55). Summon guardian kit even lists both Shield and Iron Skin (`spellData.ts` 593; `enemyAI.ts` 136).  
SYSTEMS_AFFECTED: spells, summons, enemy kits, boss kits, buff shop  
RECOMMENDED_ACTION: MERGE. One RES shield, one poison DoT, one mend+crit, one expose, one drain family, one reflect. Keep Swap, Mark, Barrier, Mirror, Timestep, Sacrifice, Inferno, Frost Nova, Lifesteal Nova, Cursed Wound, Weaken, Chain Lightning, and the five summons. Retarget `BOSS_KITS` / `ENEMY_KITS` / summon kits onto the survivors. Shop items must not clone the survivors (see PXA-011).  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-001 (unlock table should list survivors only)  
REGRESSION_RISK: MEDIUM — boss kits and summon kits reference the clone ids. `validateBossKits()` will fail until kits are rewritten.  
VALIDATION_REQUIRED: Each remaining spell answers a distinct question (range, timing, positioning, or resource). No two book spells share effect+duration+stat within 10%. Boss rush kits still resolve.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-003  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Honor or delete Boss Rush combined-mechanic copy  
CATEGORY: bosses  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `BOSS_RUSH_ROOMS` (`hooks/useBossRush.ts` 23–134) attaches a unique `combinedMechanic` to each of 10 rooms (“Archbishop heals Pawn every 2 turns…”, “Final Pawn death reveals it was the real Pawn King…”, “Starved Pawn feeds on HP that Weeping Pawn regenerates…”). Repository search: the field is declared on `BossRushRoom` (18) and populated in that table only — no combat, AI, or `useBossSystem` reader. Pair fights therefore run as two independent `BossAbility` scripts. This violates “comprehensible encounter rules”: the UI (if shown) or the table (as design intent) teaches a rule the engine does not run. Solo boss kits remain honest (`bossKits.ts` + `BossAbility` in `bossTypes.ts` 10–58).  
SYSTEMS_AFFECTED: bosses, boss rush, encounter rules, visual feedback  
RECOMMENDED_ACTION: REWORK. Either (a) implement each advertised pair rule as explicit metadata on the room (not name heuristics) and surface it in the pre-fight banner, or (b) delete `combinedMechanic` and describe only abilities the engine already runs. Do not leave flavor that reads as a rule. Room 9 jackpot (5000/2000) stays a reward row, not a fake feed loop, until (a) exists.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-005 if pair spells must exist in the live catalog  
REGRESSION_RISK: HIGH if (a) is bolted into `WorldExploration.tsx` instead of `engine/` + `useBossSystem`. LOW if (b) is copy-only.  
VALIDATION_REQUIRED: For each room, a designer can point at the code path that implements the sentence on screen. Spectate room 0: heal-every-2 either happens or is not claimed.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-004  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Scale challenge, rush, dungeon, and feat grants with encounter threat  
CATEGORY: rewards  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: No level cap. Level N→N+1 is `100 * 2^(N-1)` (`utils/xpCurve.ts` 10–12). Victory XP is `sum(enemy.level * 20)` (`rewardResolver.ts` 82–94). Challenges pay fixed 50–500 Doka and 0–1000 XP (`challengeCompletion.ts` 38–103). Feats pay fixed 50–1000 Doka (`admin.mo` 311–325). Rush rooms pay a fixed table (`useBossRush.ts` 32–132). Dungeon complete is `maxDepth * 50` Doka (ARCHITECTURE dungeon table). Boss *stat* scaling `1.08^diff` (`progression.ts` 290–324) already stays relevant at any level. Flat grants do not: they are a tutorial jackpot, then a rounding error. This is not an endgame-content complaint; the funnels stop answering “what progression fantasy does this support?”  
SYSTEMS_AFFECTED: challenges, achievements, bosses, dungeons, rewards, progression  
RECOMMENDED_ACTION: EXPAND. Express secondary grants as a function of the same threat the combatants already use (enemy/boss level, pack size, dungeon depth, modifier). Example shape: `round(baseTier * threatFactor)` with `threatFactor` from live encounter level, not player vanity level alone. Keep percentage death (`deathPenalty.ts` 9–10) and `2^n` spell upgrades as the unbounded sinks. Do not add a new currency.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-009 (which faucets remain)  
REGRESSION_RISK: MEDIUM — persist path stays `applyRewards`; only the numbers fed in change. Recap copy must show the scaled figure that was advertised.  
VALIDATION_REQUIRED: At player/enemy level 3 and level 30, a completed legendary-tier challenge is still a noticeable leftover-XP slice, not 1000 vs a 2^29 threshold. Death 40% Doka still dwarfs a single feat claim.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-005  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: One live catalog for admin spells and bosses  
CATEGORY: admin-content  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Three truths: (1) live player/enemy book = `data/spellData.ts` + `SPELL_ID_CATALOG` (`bossKits.ts` 29–62); (2) client strips retired names `fireball` / `blood_nova` / `obliterate` / … (`WorldExploration.tsx` 2203–2236); (3) canister `defaultBossConfigs()` (`admin.mo` 350–368+) still seeds `spellPoolIds` like `fireball`, `cursed_gust`, `blood_nova`, and `defaultSpells()` is a different six-id set (`admin.mo` 168–191). Frontend `DEFAULT_BOSS_CONFIGS` (`bossDefaults.ts`) uses `getBossPhase1SpellIds`. Admin CRUD can publish a spell the engine will filter or cast without `targetType`. This is how identity dies without a code review.  
SYSTEMS_AFFECTED: admin-enabled content, spells, bosses, enemies  
RECOMMENDED_ACTION: REWORK. Canister seed + admin forms must offer only ids in the live catalog (or require the full targeting metadata before save). Boss phase pools must be the `bossKits.ts` ids. Delete or migrate retired names in `defaultBossConfigs`. Admin preview should use the same `targeting.ts` gate as a live cast.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-002; PXA-2026-08-31-015  
REGRESSION_RISK: HIGH on a live canister that already stored old boss rows — need a seed repair, not a silent filter.  
VALIDATION_REQUIRED: `getSpellConfigs` ∩ `SPELL_ID_CATALOG` is the combat set. An admin-only id cannot appear in a player book unless it passed the metadata schema.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-006  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Remove Blood from the player HUD until it spends  
CATEGORY: resources  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Top bar always renders BLOOD (`GameFlow.tsx` 307–321) from `selectedCharacterProp?.blood` / `maxBlood` (defaults 0/100). `WorldExploration.tsx` 1118–1130 holds `bloodBalance` / `_bloodBalanceRef` and an unused `_setBloodBalance`. `updateSessionState` persists `bloodBalance` 0–100 (`main.mo` 2290–2305) with `covenantBuff` and `shrineCount`. No combat, shop, or death path spends Blood. DESIGN.md orbs are AP/MP/HP — Blood is a fourth bar with no decision. Unnecessary currency / information overload.  
SYSTEMS_AFFECTED: visual feedback, progression, death (session fields)  
RECOMMENDED_ACTION: DEPRECATE the HUD and the create-time Blood story. Keep the canister fields inert until a designed sink exists (do not invent one in this ID). Hide the bar for normal players.  
AUTONOMY: ORCHESTRATOR_MAY_DRAFT (display-only hide)  
DEPENDENCIES: None for hide; PXA-014 if shrine is later wired to Blood  
REGRESSION_RISK: LOW if only the bar is hidden. MEDIUM if session writes are removed without a migrate.  
VALIDATION_REQUIRED: World top bar shows XP + Doka + HP/AP/MP orbs only. No “BLOOD” label in player chrome. Typecheck clean.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-007  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: One enemy poster — piece kit or family, not both  
CATEGORY: enemies  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Kits key on `ChessPieceType` (`enemyAI.ts` 156–178). Spawn also rolls `EnemyFamily` at 30% (`WorldExploration.tsx` 6236–6298): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror` — HP/dmg/RES mults and pixels (`4150–4222`, `6257+`). Families do not change `buildEnemyKit`. `aiTier` is a fourth number (`gameConstants.ts` 200–208). Player must read chess role, monster name, and erratic/betrayal tier for one unit. Progressive sophistication should be “this bishop now poisons” (`levelZone`), not three taxonomies.  
SYSTEMS_AFFECTED: enemies, AI, visual feedback  
RECOMMENDED_ACTION: SIMPLIFY. Pick piece+kit as the public identity (families become palette aliases of the same kit) *or* replace pieces with families that own kits. Keep `aiTier` as a hidden gate, not a player-facing type. Extend kits past `levelZone` 2 (knight is melee-only forever — line 161).  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-013  
REGRESSION_RISK: MEDIUM — pixel helpers and `EnemyRegister.tsx` copy mention families.  
VALIDATION_REQUIRED: A new player can name what a unit does from one word + one kit. Zone 0 vs zone 2+ kits differ for every piece including knight.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-008  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Slim world-event modifiers to a learnable set  
CATEGORY: world-events  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: 22 modifiers (`engine/mapModifiers.ts` 4, 152+). Slime Flood (154–162) and Frozen Terrain (164–172) are the same `onMpCost * 2`. Gravity Well (280–286) and Fog of War (288–296) are empty (“Mechanism not located. Placeholder.”) but still announce. Titan’s Vigor (299–316) adds **1000** HP and multiplies damage by a 1–5 roll — arbitrary, unscaled, no counterplay. Glass Realm ×2 and Doka Fever ×2 rewards are stat/reward inflation. Thorned Ground, Void Rift, Mirror Field, Arcane Overflow, Time Warp *do* add decisions. Two-roll trigger (20% then 50%) can stack two languages on one map.  
SYSTEMS_AFFECTED: world events, challenges, visual feedback, rewards  
RECOMMENDED_ACTION: MERGE Slime+Frozen into one “heavy ground.” DEPRECATE or implement Gravity Well / Fog of War (no announce until a hook exists). REWORK Titan’s Vigor into a rule (e.g. first strike each turn is amplified) with numbers that scale, not +1000. Cap simultaneous player-facing modifiers at one unless the second is a named dungeon rule.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-010 if dungeon uses a reserved modifier table  
REGRESSION_RISK: MEDIUM — WX still branches on some ids (`isTimeWarp`, `isVoidRift` at 2183–2184). Empty ids can be removed from the roll table first.  
VALIDATION_REQUIRED: Announce text always matches a live hook. No two active names mean the same MP rule. Titan no longer adds a flat 1000 HP at level 1 or level 50.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-009  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Separate feat stamps from in-battle challenges  
CATEGORY: challenges  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Every fight randomly assigns one of 9 challenges, including legendary Untouchable 1000 XP (`WorldExploration.tsx` 12474–12482; `challengeCompletion.ts` 81–86). `easy_1` / `hard_1` and feat `pacifist_run` (`admin.mo` 324) all tax healing. Feat `critical_striker` and challenge `direct_hit` both ask for a combat style. Jackpot/betrayal feats fire from world RNG (`WorldExploration.tsx` 2139–2142, 12848–12854), not a choice. Two UIs (ChallengePanel + Feats) pay the same wallet.  
SYSTEMS_AFFECTED: challenges, achievements, rewards, visual feedback  
RECOMMENDED_ACTION: SIMPLIFY. Challenges = optional, encounter-shaped contracts offered when the room can actually fail them (not Untouchable on a lava-modifier map). Feats = durable stamps, not a second random Doka faucet. Drop or hide spectator feats (betrayal, jackpot) as player-facing mastery. One panel language: “Challenge” in battle, “Feats” in the menu — never both words for the same row.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-004  
REGRESSION_RISK: MEDIUM — persist of challenge deltas is finally correct (`liveBattleChallengePersistEntries`); changing offer rules must not drop that path.  
VALIDATION_REQUIRED: A lava+thorns map does not offer Untouchable. Pacifist exists in one system, not two. Recap still pays only completed, accepted challenges.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-010  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Give the dungeon chain a rule the overworld does not have  
CATEGORY: dungeons  
PRIORITY: P1  
CONFIDENCE: MEDIUM  
EVIDENCE: Chain is depth 3–5, `1.0 + depth * 0.25` Doka, completion `maxDepth * 50` (`docs/ARCHITECTURE.md` 312–334). `filterRunPortals` keeps only `"progression"` when cleared. After `cleanupMap` the flags zero — snapshot is mandatory. Tactically the maps are the same generator + same AI + same modifiers as free roam. A second “dungeon” is the admin room editor (`types/dungeon.ts`, `DungeonCreator.tsx`). Players cannot tell a chain from a lucky overworld path except the HUD depth and a white portal.  
SYSTEMS_AFFECTED: dungeons, world events, bosses, rewards  
RECOMMENDED_ACTION: EXPAND. Reserve a small modifier table and/or a guaranteed boss at final depth. Keep flee/death abort (already true). Rename the editor so “dungeon” means the run. Completion grant must follow PXA-004 (not `* 50`).  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-004; PXA-2026-08-31-008  
REGRESSION_RISK: HIGH if `mapGen.ts` is rewritten (AGENTS.md forbids casual mapGen). Prefer portal + encounter rules, not a new generator.  
VALIDATION_REQUIRED: A player who enters an entry portal can state the extra rule before the first fight. White portal still appears only on successful final depth.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-011  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: One shop authority — align buff catalog and stop cloning spells  
CATEGORY: shops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Player shop is `BUFF_ITEMS` in `BuffShop.tsx` 23–71 with `localStorage` `${principal}_inventory` (77–91). Canister `BUFF_CATALOG` (`main.mo` 1867–1874) uses `greater_potion` not `greater_health_potion`, elixir 200 vs 80, shield 150 vs 100, fury 100 vs 150. `purchaseBuff` / `useBuffItem` have no callers under `src/frontend/src/components`. IAP list is 15 euro SKUs to 1.6M Doka (`admin.mo` 265–282). Fury/Swift/Shield clone Enrage/Haste/Shield. AGENTS.md: backend-authoritative, localStorage cache only.  
SYSTEMS_AFFECTED: shops, spells, rewards, progression  
RECOMMENDED_ACTION: SIMPLIFY. Either wire the modal to `getBuffCatalog` / `purchaseBuff` / `useBuffItem` on the persist lock, or drop the canister catalog. Items that exist as spells should be consumable *timing* (this turn) not permanent clones — or be removed. Treat the 1.6M SKU as an explicit economy decision, not an unnoticed default.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-002  
REGRESSION_RISK: HIGH if inventories exist only in localStorage — a cutover can wipe bought stacks. Migrate or grant a one-time refund.  
VALIDATION_REQUIRED: Buy + use + reload + other device: stack matches canister. UI cost equals `getBuffCatalog`. No item restates a book buff for the rest of the fight without a shorter duration.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-012  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: One word per concept (Feats, resists, spell roles)  
CATEGORY: terminology  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Menu title “Feats” (`AchievementsPanel.tsx` 231) vs `aria-label="Achievements"` (214) vs admin tab `achievements` vs canister `achievementConfigs`. Boss Guide splits SR and RES from one `res` field (`progression.ts` 281–288). `spellType: "damage"` on Shield, Swap, Timestep, Enrage (`spellData.ts` 40, 152, 225, 283). Blood vs Doka vs XP on one top bar. Challenge vs Feat for the same Doka.  
SYSTEMS_AFFECTED: achievements, spells, visual feedback, admin  
RECOMMENDED_ACTION: SIMPLIFY. Player-facing: Feats, Doka, XP, HP, AP, MP, RES (one resist unless combat actually splits). Admin may keep internal ids. `spellType` should match `effectType` for book/admin.  
AUTONOMY: ORCHESTRATOR_MAY_DRAFT (copy-only)  
DEPENDENCIES: PXA-2026-08-31-006 (Blood label); PXA-2026-08-31-009  
REGRESSION_RISK: LOW for UI copy. Do not rename Candid fields in the same change.  
VALIDATION_REQUIRED: A new player glossary of ≤12 terms covers the HUD. No screen says Achievement and Feat for the same row.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-013  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Keep teaching new enemy reads after level-zone 2  
CATEGORY: AI  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `ENEMY_KITS` (`enemyAI.ts` 156–178): pawn adds venom at zone≥1; knight is `["physical_attack"]` forever; bishop frost then +poison; rook +iron-skin; queen/king swap frost→inferno at zone≥2 and add a heal/rally. `levelZone` is a coarse 0/1/2 band, not character level. The AI *engine* can already sacrifice, summon, camp, betray (`ENEMY_AI_TIER_GATES` 200–208). Kits do not unlock those verbs. With no cap, zone 2 is “the rest of the game.”  
SYSTEMS_AFFECTED: enemies, AI, progression  
RECOMMENDED_ACTION: EXPAND kits along the existing engine verbs (summoner flag, healer, flanker, kamikaze) as named piece upgrades at further bands — still explicit ids, not name heuristics. Knight must gain at least one non-Strike tool. Do not add new AI toggles.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-007  
REGRESSION_RISK: MEDIUM — kit size vs AP budgets can stall turns if every pawn gets Inferno.  
VALIDATION_REQUIRED: At three documented bands, a player can name a new thing the enemy might do. Knight is not Strike-only at the highest band.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-014  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Shrine is a Doka tile, not a covenant  
CATEGORY: world-events  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Stepping the altar credits 300 Doka through the persist lock (`WorldExploration.tsx` 11530–11543). If the path was “pure,” `covenantBuffMapsRef.current = 3` is written (11544–11557) and mirrored to `localStorage` `pbv_covenant_buff_*`. Grep of that ref: **init + that write only** — never decremented, never read for damage, AP, or resist. `covenantBuff` on the character (`main.mo` 114, 2295) is unused by the client shop/combat. Feature bloat: a named fantasy with no effect.  
SYSTEMS_AFFECTED: world events, shops, progression, death (session)  
RECOMMENDED_ACTION: SIMPLIFY now — treat shrine as a 300 Doka pickup (or scale via PXA-004) and stop storing a fake 3-map buff. EXPAND later only with a real, announced combat hook and a backend write, not localStorage.  
AUTONOMY: ORCHESTRATOR_MAY_DRAFT (remove write-only buff; keep Doka credit)  
DEPENDENCIES: PXA-2026-08-31-004 if 300 stays as a grant  
REGRESSION_RISK: LOW — nothing reads the buff.  
VALIDATION_REQUIRED: Altar still pays Doka once. No covenant string in battle log or HUD.  
STATUS: NEW  

---

ACTION_ID: PXA-2026-08-31-015  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Admin spells must carry targeting metadata or they do not save  
CATEGORY: admin-content  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Live cast/preview require `SpellConfig.targetType`, min/max range, LoS, linear/diagonal, `freeCells`, `areaRadius`, `isBarrier` (`docs/ARCHITECTURE.md` 356; `engine/targeting.ts`). Admin `newSpell()` (`AdminDashboard.tsx` 57+) and Motoko `SpellConfig` (`admin.mo` default rows) can omit or mismatch those fields. `effectType` / `spellType` / `effectCategory` already disagree on seeded rows (`vampire_bite` is `effectType = "heal"` and `spellType = "drain"`). A published admin spell is public (`getSpellConfigs`) and merges into `ownedSpells` if not in `OLD_SPELL_NAMES_SET`.  
SYSTEMS_AFFECTED: admin-enabled content, spells, spell discovery  
RECOMMENDED_ACTION: REWORK the admin save path: reject spells missing the live targeting schema; preview with the same gate as the canvas. Do not allow name-based fallbacks. Pair with PXA-005 so the dropdown is the live catalog.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-005  
REGRESSION_RISK: MEDIUM — existing admin rows may fail the new validator; quarantine rather than crash combat.  
VALIDATION_REQUIRED: Saving a spell without `targetType` returns an error. A valid admin spell previews and casts like a `spellData` row.  
STATUS: NEW

ACTION_ID: GTAD-2026-08-31-001  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Privacy fence — aggregates only; never chat, purchase PII, or principals on Intelligence  
CATEGORY: privacy  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Mandate forbids individual surveillance. `getLeaderboard` already returns `principalId` (`main.mo` ~2527). OQL `characterSlots` / `userProfiles` are `ownedBy("owner")` (`main.mo` ~2626–2702). `PurchaseRecord` stores email/address (`types/admin.mo` ~185). `chatMessages` is in-memory and must stay out of analytics. Quality audit found zero telemetry and warned against claiming CLEAR_POSITIVE_SIGNAL.  
SYSTEMS_AFFECTED: future telemetry maps; Admin Intelligence tab; OQL (do not add owner-keyed event entities)  
RECOMMENDED_ACTION: Any implementation must allow-list counter key prefixes; strip principals in snapshot queries; never persist chat text, `uiLayout`, pixel patterns, click traces, or purchase customer fields; never reuse `getLeaderboard` as an analytics API.  
AUTONOMY: human-gated (policy)  
DEPENDENCIES: None  
REGRESSION_RISK: LOW if followed; HIGH if someone “just charts OQL rows.”  
VALIDATION_REQUIRED: Intelligence responses contain no principal, display name, email, or message body.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-002  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Fail-open sidecar — never on the persist lock, never authoritative  
CATEGORY: architecture  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `createProgressPersist` serializes `applyRewards` and `saveBattleStats`. AQA-2026-08-30-012 already warned: counters on that lock or a second wallet path are a regression. `handleBattleEnd` already shows recap then persist in a separate `try/catch` (~12736–12802) that logs “non-blocking.” AGENTS.md: telemetry must not block combat, persistence, map load, or rewards.  
SYSTEMS_AFFECTED: `utils/progressPersist.ts`; future `recordTelemetryIncrements`; WorldExploration outcome paths  
RECOMMENDED_ACTION: Implement increments as fire-and-forget after persist functions return. Swallow all sidecar errors. Do not enqueue telemetry on `progressPersistRef`. Do not write HP/XP/Doka/spell levels from telemetry. Missing method on the mock actor = no-op.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-001  
REGRESSION_RISK: HIGH if ignored (wallet races, unpaid victories).  
VALIDATION_REQUIRED: Existing persist unit tests still pass with a throwing/missing increment API; a sidecar throw does not skip `applyRewards`.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-003  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Phase 0 — admin-only snapshot aggregates from existing stores  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `characterSlots`, `dokaBalances`, `achievementProgress`, `dungeonRecords`, `bossRushStates` already persist population signals. No combat write required. Admin dashboard sidebar only shows catalog counts (enemies/regions/sprites/spells). Quality Auditor could not estimate player population.  
SYSTEMS_AFFECTED: `src/backend/main.mo` (new `#admin` query); `AdminDashboard.tsx` (Intelligence tab, read-only)  
RECOMMENDED_ACTION: Add `adminGetProgressionSnapshot` (name flexible) that returns **buckets only**: level histogram, pieceType mix, Doka-size histogram, achievement unlock/claim counts by id, dungeon depth/maps histograms, boss-rush `bestRoom` histogram. Scan maps server-side; never return a principal. Do not use OQL execute from the player client for this.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-001  
REGRESSION_RISK: LOW (query-only). Residual: expensive scan on a large principal map — keep admin-gated and not on the game loop.  
VALIDATION_REQUIRED: Response JSON has no principal-shaped strings; `#user` callers are rejected; `pnpm typecheck` clean after bindgen.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-004  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Phase 1 — smallest outcome + quality increment hooks  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Directly implements the architecture for `AQA-2026-08-30-012`. Existing fail-open sites: reward persist `catch` ~12797; `persistDeathPenalty`; `onShowBattleSummary` ~12731; `creditPendingPurchasesThroughPersist`; battle start ~12363; `_handlePlayerDeath` ~13321.  
SYSTEMS_AFFECTED: new sidecar module; `main.mo` increment map + `recordTelemetryIncrements`; outcome helpers (`rewardResolver`, `deathPenalty`, `shopPurchase`) after they return  
RECOMMENDED_ACTION: Ship lifetime+28-day counters only for: persist ok/fail (`applyRewards`, `saveBattleStats`), victory paid, death-penalty ok/fail, recap opened, shop credit committed, battles started, victories. Fire-and-forget batches of `(Text, Nat)`. Allow-list prefixes. No WorldExploration RAF / damage / mapGen edits.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-001; GTAD-2026-08-31-002  
REGRESSION_RISK: MEDIUM if increments are placed inside persist `enqueue`. LOW if after-return only.  
VALIDATION_REQUIRED: Next Quality Auditor can cite persist-ok/fail and victory-paid counts, or still say “Phase 1 not merged.”  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-005  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Tag flee vs combat death vs lava/spike without changing the penalty  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Flee (`onEndBattle` ~18871) calls `_handlePlayerDeath` — persist and Death Realm are identical to combat death. Lava/spike use the HP-watch path (~13380) and explicitly do **not** call `_handlePlayerDeath`. Death-cause intelligence is impossible until the entry point is tagged. Mandate: do not change death math.  
SYSTEMS_AFFECTED: `_handlePlayerDeath` call sites; HP-watch; future C-003/C-004/C-007 increments  
RECOMMENDED_ACTION: Thread a closed `DeathCause` enum (`combat_melee|combat_spell|dot|lava|spikes|flee|other`) into the two entry points for telemetry only. Keep `persistDeathPenalty` / `resetRunState` / Death Realm timer unchanged.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-002; GTAD-2026-08-31-004 (or same PR)  
REGRESSION_RISK: MEDIUM if someone forks persist or skips the flee→death penalty.  
VALIDATION_REQUIRED: Existing `deathGuards` / `deathPenalty` tests still pass; flee in a dungeon still aborts the run.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-006  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Phase 2 — combat / spell / content aggregate dimensions  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Battle length (`challengeTurnCountRef`), remain HP, roster `pieceType`, `TierSpawnConfig` level gap, `decideDungeonChainPortal`, Boss Rush rooms 0–9, challenge ids, map modifiers, rare refs (jackpot/betrayal/leader) already exist as gameplay signals. Spell usage should flush a **per-battle unique-set** of `SpellConfig.id`, not a cast stream.  
SYSTEMS_AFFECTED: sidecar flush at battle end / portal; Admin Intelligence sections  
RECOMMENDED_ACTION: After Phase 1 is proven fail-open, add bucket increments for turns, remain-HP, death cause, family W/L, level-delta, dungeon/rush/challenge/modifier/rare, spell unique-set + fizzle + enemy unique-set + upgrade. Cap key cardinality to catalog ids and enums.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-004; GTAD-2026-08-31-005  
REGRESSION_RISK: MEDIUM if unique-set flush is done per RAF frame or per targeting preview.  
VALIDATION_REQUIRED: One battle produces a bounded batch (≤32 keys); no increment from `mapGen` / `combatMath` / RAF.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-007  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Admin Intelligence tab — aggregates, carved-stone, `#admin` only  
CATEGORY: admin-ui  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `AdminDashboard.tsx` tabs (~4825) are config CRUD only. Sidebar counts are catalog sizes. Admin is lazy-loaded and must stay gated (`isAdmin && onOpenAdmin`; canister `#admin`). DESIGN.md / AGENTS.md UI language.  
SYSTEMS_AFFECTED: `AdminDashboard.tsx`; `useAdminQueries.ts`  
RECOMMENDED_ACTION: Add an Intelligence tab that charts Phase 0 snapshots and Phase 1+ counters. Empty state if maps are empty. No principal search. Dev raw-key dump only under `import.meta.env.DEV`. Match existing stone/slate/crimson chrome.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-003 (minimum); GTAD-2026-08-31-004 for live counters  
REGRESSION_RISK: LOW. Do not ship the tab to normal players.  
VALIDATION_REQUIRED: Non-admin build path unchanged; `#user` query rejected; browser check of the tab on an admin session when implemented.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-008  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Do not invent a spell-discovery persist path for analytics  
CATEGORY: content-scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `ownedSpells` is starters ∪ all backend configs minus retired names (`WorldExploration.tsx` ~2257–2271). There is no drop / first-seen canister field. `minLevel` is catalog metadata only. Building a discovery system “so we can measure discovery” would be new gameplay.  
SYSTEMS_AFFECTED: spell catalog; Intelligence “reach” panel  
RECOMMENDED_ACTION: Measure reach via Phase 0 (characters with `level >= minLevel`) and Phase 2 first-equip / unique-set use. Do not add a discovery inventory to `Character` for telemetry.  
AUTONOMY: human-gated (product)  
DEPENDENCIES: GTAD-2026-08-31-003; GTAD-2026-08-31-006  
REGRESSION_RISK: HIGH if a fake unlock store desyncs the spell bar.  
VALIDATION_REQUIRED: No new `Character` fields in the Phase 1/2 telemetry PR.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-009  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Defer spell sequences, AI intent text, and visual URL logging  
CATEGORY: privacy  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Pairwise unique-set co-occurrence is enough for combo balance (S-006) and is Phase 3 with a key cap. `decideEnemyAction.intent` is free text for the battle log. Sprite `onerror` URLs may be private. `logPatternLookupFailed` is already throttled — increment on that throttle only (Q-010).  
SYSTEMS_AFFECTED: enemy AI logging; pieceArt; Intelligence  
RECOMMENDED_ACTION: Refuse PRs that upload debug buffers, ordered n-grams, intent strings, or raw image URLs. Allow throttled `pattern_fallback` counters and `quality.visual.load_fail.{kind}` without URLs.  
AUTONOMY: human-gated (review bar)  
DEPENDENCIES: GTAD-2026-08-31-001  
REGRESSION_RISK: LOW (deferral).  
VALIDATION_REQUIRED: Phase 3 design re-read before any pair-key implementation.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-010  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Point the Quality Auditor at Phase 0/1 counters instead of inventing outcomes  
CATEGORY: prompt-architecture  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `QUALITY_AUDIT_2026-08-30.md` classified every gameplay outcome INCONCLUSIVE because no series existed. `AQA-2026-08-30-012` asked for the smallest hooks. This director catalog is the producer spec.  
SYSTEMS_AFFECTED: Automation Quality Auditor prompt (`976261d8-a49f-11f1-a7d1-d6b4613131ce`)  
RECOMMENDED_ACTION: UPDATE_PROMPT: read `docs/automation/TELEMETRY_ARCHITECTURE_2026-08-31.md`; if increment/snapshot APIs are absent, repeat INCONCLUSIVE; if present, cite persist-ok/fail, victory-paid, death-penalty, recap-opened, and snapshot level histogram. Never treat a missing increment as a player regression.  
AUTONOMY: human (prompt edit)  
DEPENDENCIES: GTAD-2026-08-31-003 or GTAD-2026-08-31-004 merged before the next Sunday audit to have numbers  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Next auditor report either cites real counters or explicitly says “still no telemetry.”  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-08-31-011  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Keep increment maps off OQL owner-scoped entities  
CATEGORY: architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: OQL `Expose` at end of `main.mo` is `controllerOrScoped` for player collections. A `telemetryEvents` entity with `owner` would create a per-player log the controller can dump — the surveillance shape this design forbids. Config entities are controller-only and are the wrong place for runtime counters.  
SYSTEMS_AFFECTED: `main.mo` OQL block  
RECOMMENDED_ACTION: Store counters in dedicated `Map<Text, Nat>` queried only via `adminGetTelemetrySnapshot`. Do not `include Expose` those maps as owned entities.  
AUTONOMY: implementer (when picked)  
DEPENDENCIES: GTAD-2026-08-31-001; GTAD-2026-08-31-004  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: `schema()` / `execute` do not list a player-owned telemetry event collection.  
STATUS: NEW

ACTION_ID: UX-HUD-DUPLICATE-TOPBAR
TITLE: GameFlow overlay hid the live world HUD and showed 0/100 XP
CATEGORY: visual-hierarchy
PRIORITY: P0
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/App.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: GameFlow painted a full-width z-9000 stone bar over WorldExploration’s real HUD. XP/Blood read `selectedCharacterProp` from App.tsx, which is never set, so the bar always showed 0/100. Dummy Map/Zone pills and an XP/RWD toggle that never reached WorldExploration sat in the same strip.
DESIRED_BEHAVIOUR: One carved-stone HUD. Live leftover XP, Map #, region, and Doka stay visible. Realm tools (Items, Board, Feats, Bosses) stay reachable without covering that strip.
EVIDENCE: GameFlow.tsx previously lines 278–348; App.tsx selectedCharacter stays null (`_setSelectedCharacter` unused); WorldExploration.tsx ~17461–17819 is the live bar.
RECOMMENDED_ACTION: Keep the under-HUD Items/Board/Feats/Bosses cluster shipped this run. Later, fold those buttons into the WorldExploration header so there is a single bar.
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW — display chrome only; persist and combat untouched. Panel snap still uses a 44px top spacer.
VALIDATION_REQUIRED: Enter the world; confirm leftover XP and region are visible; Items still opens BuffShop; Board/Feats/Bosses still open.
STATUS: IMPLEMENTED_THIS_RUN

---

ACTION_ID: UX-DEATH-DUAL-MODAL
TITLE: Defeat recap and Game Over both claim to be the next step
CATEGORY: modal-conflicts
PRIORITY: P0
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/GameOverModal.tsx; src/frontend/src/components/PostBattleRecap.tsx; src/frontend/src/App.tsx
CURRENT_BEHAVIOUR: Battle death sets showGameOver (unmounts the world, z-200) and onShowBattleSummary (defeat recap at app root, z-9999). Recap CTA said “Respawn →” but only dismissed the overlay. Game Over said “Respawn on New Map” and used gray/purple SaaS chrome. handleRespawn actually loads the Death Realm at half HP.
DESIRED_BEHAVIOUR: One death beat: what you lost, where you are going (Death Realm), what to do next (walk to a portal). Do not unmount the world under a second dialog.
EVIDENCE: _handlePlayerDeath ~13370; lava path recap ~13399–13412; showGameOver early return ~17392; App.tsx recap z-9999; handleRespawn ~13640.
RECOMMENDED_ACTION: Human-approved flow: keep the root recap as the only death UI, then fade into Death Realm without GameOverModal, or keep Game Over and skip the defeat recap. This run only corrected Game Over copy/style and the recap CTA label.
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: HIGH if the unmount / 1.5s Death Realm timer is rewired without deathGuards tests.
VALIDATION_REQUIRED: Battle death and lava death each show one explanation; penalty numbers match persistDeathPenalty; portal exit still works.
STATUS: PARTIAL — copy/style shipped; stack remains

---

ACTION_ID: UX-RECAP-XP-CURVE
TITLE: Recap XP bar uses level×100 instead of 100×2^(N-1)
CATEGORY: reward-clarity
PRIORITY: P0
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/PostBattleRecap.tsx; src/frontend/src/utils/xpCurve.ts; draft PR #108
CURRENT_BEHAVIOUR: Victory, leftover-roster, Boss Rush, and defeat recaps pass `xpForNextLevel: (level || 1) * 100`. From level 2 the bar and “XP until next” are wrong. CharacterSelection also subtracts cumulative XP from leftover `experience` (`#108`).
DESIRED_BEHAVIOUR: Every XP bar uses leftover `experience` over `xpForNextLevel(level)` from `utils/xpCurve.ts`.
EVIDENCE: WorldExploration.tsx 12719, 12891, 13110, 13407; CharacterSelection.tsx 43–51, 392–411; open draft https://github.com/Mr-Melic/stralt/pull/108
RECOMMENDED_ACTION: Let `#108` land, then delete any leftover `level * 100` recap fields. Do not open a second leftover-XP PR.
AUTONOMY: REPORT_ONLY
REGRESSION_RISK: MEDIUM if two PRs rewrite the same recap payload.
VALIDATION_REQUIRED: Level 3 character with 50 leftover shows 50/400, not 50/300 or 0/400.
STATUS: NEW

---

ACTION_ID: UX-ONBOARD-FIRST-MAP
TITLE: First realm visit has no teaching beat
CATEGORY: action-discoverability
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/LandingPage.tsx; src/frontend/src/components/CharacterCreation.tsx
CURRENT_BEHAVIOUR: After Play the player is on an isometric map with unlabeled whirlpools, no “click a tile to walk,” and no mention of AP/MP until a fight starts. Launch and create screens did not say what comes next (a next-step line and Play toast shipped this run).
DESIRED_BEHAVIOUR: One dismissible carved-stone coach on first world enter: walk, portals, Doka, stepping onto enemies starts a fight. Never a SaaS tooltip tour.
EVIDENCE: No tutorial/onboarding/firstVisit strings in WorldExploration.tsx.
RECOMMENDED_ACTION: Human-written 3-line coach, shown once per slot (`localStorage` cache only; backend may store a seen flag later).
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW if it is overlay copy only.
VALIDATION_REQUIRED: First Play shows the coach; second Play does not; it never blocks portals or combat.
STATUS: NEW

---

ACTION_ID: UX-PORTAL-LEGEND
TITLE: Only dungeon portals explain themselves
CATEGORY: portal-clarity
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/engine/portalRules.ts
CURRENT_BEHAVIOUR: Nearby dungeon / chain portals draw “Enter Dungeon Chain” / “Continue Chain (d/max)”. Rest, boss (all `#9333ea`), colored exits, and white sanctuary have no label. GameFlow’s “Map” / “Zone” pills were empty (removed this run).
DESIRED_BEHAVIOUR: When the player is within 3 tiles, each portal kind shows a short carved label: Explore / Rest / Boss / Dungeon / Sanctuary / Death Realm exit.
EVIDENCE: Label block ~8305–8331 is gated on `p.color === "dungeon" || dungeonChainActive`; bossDefaults portalColor is `#9333ea` for every boss.
RECOMMENDED_ACTION: Extend the existing nearby-label path. Do not change map generation or portal spawn rules.
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW if labels are canvas text only.
VALIDATION_REQUIRED: Each kind in a playtest seed shows a distinct label; dungeon chain copy still shows depth.
STATUS: NEW

---

ACTION_ID: UX-CAST-FAIL-FEEDBACK
TITLE: Illegal casts only write the battle log
CATEGORY: invalid-action-explanation
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/BattleUIPanel.tsx; src/frontend/src/components/ChatPanel.tsx
CURRENT_BEHAVIOUR: “Not enough AP/MP” and “invalid target” call `logBattleEntry`. The player who never opens chat gets no reason. This run added button titles; tile clicks still fail silently on the canvas.
DESIRED_BEHAVIOUR: A 1.5s stone whisper on the clicked tile or a toast: Not enough AP, out of range, not your turn, summon is acting.
EVIDENCE: logBattleEntry sites ~10290, 10362, 10559, 10625, 10994, 11175.
RECOMMENDED_ACTION: One shared `explainRejectedCast(reason)` used by click and touch. Do not change targeting math.
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW if it is overlay-only.
VALIDATION_REQUIRED: AP-starved click, out-of-range click, and enemy-turn click each show a reason once.
STATUS: NEW

---

ACTION_ID: UX-VITALS-ORB-MAX
TITLE: Stats-panel jewels use hardcoded HP/AP/MP caps
CATEGORY: ap-mp-clarity
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Jewel fill uses max 100 / 6 / 4 while `characterStats.maxHp/maxAp/maxMp` and battle AP/MP grow. A 10 AP champion reads as overflowing the jewel.
DESIRED_BEHAVIOUR: Jewel fill uses the live max; label shows `current / max`.
EVIDENCE: WorldExploration.tsx ~18222–18240 vs BattleUIPanel.tsx ~413–468 which already uses maxBattleAp/Mp.
RECOMMENDED_ACTION: Three-line bind to characterStats.max*. Do not change combat caps.
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Level 1 jewels fill correctly; after AP growth the fill is current/max ≤ 100%.
STATUS: NEW

---

ACTION_ID: UX-SHOP-TWO-STORES
TITLE: “Shop” means items in one place and IAP Doka in another
CATEGORY: action-discoverability
PRIORITY: P1
CONFIDENCE: MEDIUM
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/BuffShop.tsx
CURRENT_BEHAVIOUR: Top cluster **Items** opens BuffShop. World HUD cart opens a 15-package EUR shop that then asks for identity documents. Players cannot tell which door spends Doka vs real money.
DESIRED_BEHAVIOUR: “Items” (Doka potions) vs “Buy Doka” (IAP), never both labeled Shop. IAP should state it is real-money credit.
EVIDENCE: GameFlow Items → itemShopOpen; WorldExploration ~17780–17804 `title="Buy Doka"` then `Doka Shop` modal ~19112.
RECOMMENDED_ACTION: Keep the Items label. Rename the IAP cart to Buy Doka in the HUD and modal title. Do not change purchase APIs.
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW for copy; HIGH if IAP form/KYC is redesigned.
VALIDATION_REQUIRED: Items still buys buffs; cart still opens packages.
STATUS: NEW

---

ACTION_ID: UX-BLOOD-DEAD-BAR
TITLE: Blood bar never changes
CATEGORY: hud-crowding
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: `bloodBalance` is initialized from localStorage; `_setBloodBalance` is unused, so the bar stays at 100. GameFlow’s second Blood bar (always 0) was removed this run.
DESIRED_BEHAVIOUR: Hide Blood until a live Blood system exists, or drive it from `bloodBalance` on the character.
EVIDENCE: WorldExploration.tsx 1118–1130, 17732–17773.
RECOMMENDED_ACTION: Hide the WX Blood chip. Do not invent a Blood spend path.
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: World HUD still shows leftover XP and Doka.
STATUS: NEW

---

ACTION_ID: UX-CREATE-NO-STATS
TITLE: Champion forge never shows starting combat stats
CATEGORY: action-discoverability
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/CharacterCreation.tsx
CURRENT_BEHAVIOUR: Piece Details lists Type / Pixel Art / 4 Views. Starting 100 HP, 10 AP, 5 MP are applied only on save (`generateDefaultStats`).
DESIRED_BEHAVIOUR: A compact stone row of starting HP/AP/MP/INIT so Play is not a surprise.
EVIDENCE: CharacterCreation.tsx 210–223, 850–893.
RECOMMENDED_ACTION: Display-only stat row using generateDefaultStats. Do not let the player edit persisted stats here.
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Create still writes the 12-field CharacterStats payload including killCount.
STATUS: NEW

---

ACTION_ID: UX-VERSION-FORCE-RELOGIN
TITLE: App version bump wipes local cache and forces re-login
CATEGORY: feedback
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/App.tsx
CURRENT_BEHAVIOUR: `APP_VERSION` mismatch clears localStorage (with a preserve list), reloads, then shows a changelog. The player is kicked to login without being told why until after they sign in again.
DESIRED_BEHAVIOUR: Show the changelog on the landing screen, then ask to sign in. Do not imply a ban or a wipe of canister progress.
EVIDENCE: App.tsx 14–22, 229–267, CHANGELOG_ITEMS still mention “15 milestones” / “AI fully rebuilt.”
RECOMMENDED_ACTION: Human: either stop forcing II re-auth or add landing copy “Game updated to vN — sign in to continue.” Refresh changelog to the real persist/combat week.
AUTONOMY: HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM — version gate also protects stale clients.
VALIDATION_REQUIRED: Bump APP_VERSION in a staging build; canister characters still load.
STATUS: NEW

---

ACTION_ID: UX-SMALL-SCREEN-HARD-BLOCK
TITLE: Viewports under 768px cannot play
CATEGORY: responsive-behaviour
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/App.tsx; src/frontend/src/components/SmallScreenWarning.tsx; DESIGN.md
CURRENT_BEHAVIOUR: `isSmallScreen` returns only the warning. DESIGN.md requires ≥44px targets and a sticky bottom menu.
DESIRED_BEHAVIOUR: Product call: keep the tablet floor, or ship a stacked HUD (orbs + spell dock) for 768-wide tablets in landscape first.
EVIDENCE: App.tsx 26–99, 322–337; DESIGN.md Constraints.
RECOMMENDED_ACTION: Report-only until a human picks a mobile scope. Do not delete the guard in an unattended run.
AUTONOMY: REPORT_ONLY
REGRESSION_RISK: HIGH if the guard is removed without a HUD reflow.
VALIDATION_REQUIRED: 768 and 390-wide viewports after any policy change.
STATUS: NEW

---

ACTION_ID: UX-IDENTITY-FONT-DRIFT
TITLE: Live type and color tokens drift from DESIGN.md
CATEGORY: visual-hierarchy
PRIORITY: P3
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: DESIGN.md; src/frontend/src/index.css; src/frontend/src/components/LandingPage.tsx
CURRENT_BEHAVIOUR: Brief specifies Space Grotesk / Inter / OKLCH-only. CSS uses Baloo 2 / Saira; launch title measures Arial; Game Over was gray-800 / purple-600 (stone-framed this run).
DESIRED_BEHAVIOUR: New chrome uses DESIGN.md tokens. Do not run a repo-wide hex rewrite.
EVIDENCE: DESIGN.md Typography + Constraints; index.css --font-display; LandingPage.tsx font `Arial`.
RECOMMENDED_ACTION: Next new screen only. Forbid shadcn gray/purple on player-facing dialogs.
AUTONOMY: REPORT_ONLY
REGRESSION_RISK: HIGH for a global color sweep.
VALIDATION_REQUIRED: Side-by-side with DESIGN.md palette; gold-on-navy contrast ≥ 4.5:1.
STATUS: NEW

---

ACTION_ID: UX-BOOST-DEAD-CONTROL
TITLE: XP / RWD pill never reached combat rewards
CATEGORY: action-discoverability
PRIORITY: P3
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/App.tsx; src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: App toggled boostMode locally. GameFlow showed the pill. WorldExploration keeps its own `_setBoostMode` at `"xp"`. A 1.5× Doka branch exists but the pill could not reach it. Pill removed from the overlay this run.
DESIRED_BEHAVIOUR: Either wire one boost source into `resolveBattleRewards` with on-HUD copy, or keep it gone.
EVIDENCE: App.tsx 287; WorldExploration.tsx 1958, 12703.
RECOMMENDED_ACTION: Leave hidden until a human wants a boost product.
AUTONOMY: REPORT_ONLY
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: If re-enabled, recap Doka matches the advertised multiplier.
STATUS: IMPLEMENTED_THIS_RUN

---

ACTION_ID: UX-SELECT-ROTATE-LEFT
TITLE: Selection “turn left” advanced the same way as turn right
CATEGORY: action-discoverability
PRIORITY: P3
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/CharacterSelection.tsx
CURRENT_BEHAVIOUR: Both chevrons called `rotatePreview(+1)`.
DESIRED_BEHAVIOUR: Left decrements the view ring.
EVIDENCE: CharacterSelection.tsx SlotCard arrows (now `onRotate(-1)` / `onRotate(1)`).
RECOMMENDED_ACTION: Shipped this run.
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Left and right cycle front → left → back → right.
STATUS: IMPLEMENTED_THIS_RUN

ACTION_ID: AEE-2026-08-31-001  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer (`67b03c2f-a492-11f1-a7d1-d6b4613131ce`)  
TITLE: Replace `computeAITier` level bands with relative module eligibility  
CATEGORY: combat-ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `src/frontend/src/engine/combatMath.ts` lines 36–52 map `enemyLevel` to tiers 1–10 and scramble 30% of rolls. `WorldExploration.tsx` 6197 / 6325 assign `aiTier`. Brief forbids “Level X always equals AI tier Y.”  
RECOMMENDED_ACTION: Implement AI-SYS-01 from `docs/ENEMY_AI_EVOLUTION.md`. Delete behaviour gates on `aiTier >= 5` / `>= 10`.  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM — spawn + WX leader-death / betrayal branches  
VALIDATION_REQUIRED: Same absolute enemy level, different player levels, produce different attach distributions; seeded RNG deterministic.  
STATUS: OPEN  

---

ACTION_ID: AEE-2026-08-31-002  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Apply-layer honesty (Fire Bolt, AP/MP, ally heal)  
CATEGORY: combat-ai  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: WX 16724–16729 fallback Fire Bolt not in kit; `decideEnemyAction` never reads AP/MP; WX 16662 heals only when `spellRange === 0`.  
RECOMMENDED_ACTION: Implement AI-SYS-05 before new roles. Mirror `summonExecutor.ts` spend rules.  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if WX apply is edited without tests  
VALIDATION_REQUIRED: TS-LEGAL, TS-AP, TS-MP, TS-HEAL, TS-BOLT in the design catalog.  
STATUS: OPEN  

---

ACTION_ID: AEE-2026-08-31-003  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Explicit roles + spell score profiles (stop heal-first inference)  
CATEGORY: combat-ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `inferArchetype` 420–425 returns healer if any heal; queen/king kits include `starter-heal` at `levelZone >= 1`. Many enemy-usable spells have no scorer (`damage: 0` DoTs lose `pickBestDamageSpell`).  
RECOMMENDED_ACTION: AI-SYS-02, AI-SYS-04, AI-ROL-08. Do not set `usableByEnemy` without a profile and apply branch.  
DEPENDENCIES: AEE-2026-08-31-002 for apply  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: TS-QUEEN, TS-DOT.  
STATUS: OPEN

ACTION_ID: AFDA-2026-08-31-001  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Spell admin writes used frontend `hitsMultiple` and omitted Candid `cooldown` / `multiTarget`  
CATEGORY: BROKEN  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Bindgen `SpellConfig` (`src/frontend/src/backend.ts` 115–145) requires `multiTarget`, `hitsAllies`, `cooldown` as bigint. Combat reads `hitsMultiple` (`engine/spellEngine.ts`, `engine/castHelpers.ts`). Admin `newSpell()` previously omitted those Candid fields; the checkbox wrote only `hitsMultiple`. This run added defaults at `AdminDashboard.tsx` 84–87, a Cooldown StatRow, checkbox dual-write, and `toBackendSpellConfig` in `useSpellQueries.ts`.  
SYSTEMS_AFFECTED: Admin Spells tab; `adminSetSpellConfig`; player/enemy cast targeting  
CURRENT_BEHAVIOUR: New/edit spell saves now serialize the canister record, including cooldown and multi-target. Runtime still keys off `hitsMultiple` after hydrate.  
AUTHORITATIVE_BEHAVIOUR: One field name on the wire (`multiTarget`); hydrate maps it to `hitsMultiple` for combat.  
RECOMMENDED_ACTION: Keep the adapter. Next: persist frontend-only flags (`isSwap`, `isBarrier`, `targetType`, summon kit) or stop editing them in admin (see AFDA-2026-08-31-018).  
AUTONOMY: HUMAN — remaining work is a schema decision  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if a later change drops the adapter without updating combat  
VALIDATION_REQUIRED: Admin create a new multi-target spell with cooldown 2; confirm Candid save succeeds and combat applies cooldown + multi-hit.  
STATUS: PARTIAL  

---

ACTION_ID: AFDA-2026-08-31-002  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Boss admin and world load `pbv_boss_configs` while the canister already has boss CRUD  
CATEGORY: LEGACY  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `main.mo` 2062–2126: `setBossConfig`, `deleteBossConfig`, `getAllBossConfigs`, portal assignments. Bindgen matches. `useBossQueries.ts` and `useAdminQueries.ts` still read/write `localStorage.pbv_boss_configs`. `WorldExploration.tsx` 6939–6945 loads the same key. Frontend `BossConfig` has `iconEmoji`, `loreText`, `chc`; Motoko has `defeated`, `adminNotes`, no `chc`.  
SYSTEMS_AFFECTED: Admin Bosses tab; boss portals; Boss Rush kits  
CURRENT_BEHAVIOUR: Admin edits are browser-local. Canister boss maps stay empty unless written elsewhere.  
AUTHORITATIVE_BEHAVIOUR: Backend-authoritative configs; localStorage cache only.  
RECOMMENDED_ACTION: Unify schemas, then wire hooks to `getAllBossConfigs` / `setBossConfig`. Do not delete the local fallback until a live canister read succeeds.  
AUTONOMY: HUMAN — schema merge  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if wired without mapping `iconEmoji`/`loreText`  
VALIDATION_REQUIRED: Save a boss in admin on machine A; load on machine B against the same canister.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-003  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Level-up admin still omits canister fields the game and `upgradeSpell` use  
CATEGORY: PARTIAL  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Motoko `LevelUpConfig` (`types/admin.mo` 114–133) has `statGrowthPercent`, `apMpLevelThreshold`, `spellLevelingBaseCost`, `spellLevelingCostMultiplier`, `spellDmgGrowthPercent`, plus the four fail/range fields. Admin Settings only edits the four fail/range fields and seeds localStorage `pbv_levelup_config`. `WorldExploration.tsx` 2158–2166 reads that key, never `getLevelUpConfig()`. `upgradeSpell` uses canister `spellLevelingBaseCost`. This run stopped sending a 4-field `as any` payload (`AdminDashboard.tsx` 3880–3890) and now writes the full Candid record with hardcoded defaults for the five omitted fields.  
SYSTEMS_AFFECTED: Settings tab; spell upgrade cost; HP/AP growth  
CURRENT_BEHAVIOUR: Backend write is complete. Admin cannot edit spell-leveling cost or stat growth. Live combat still hydrates from localStorage.  
AUTHORITATIVE_BEHAVIOUR: Admin edits all nine fields; world hydrates `getLevelUpConfig()`.  
RECOMMENDED_ACTION: Add the five missing inputs; hydrate Settings and WorldExploration from `getLevelUpConfig`.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM — wrong defaults would change upgrade prices  
VALIDATION_REQUIRED: Change `spellLevelingBaseCost` on canister; confirm summon upgrade UI and debit match.  
STATUS: PARTIAL  

---

ACTION_ID: AFDA-2026-08-31-004  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Shop packages are hardcoded in the player shop; admin Shop tab cannot CRUD them  
CATEGORY: MISSING  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `adminSetShopPackage` / `adminDeleteShopPackage` / `getShopPackages` exist (`main.mo` 782–800). Admin Shop tab (`AdminDashboard.tsx` ~6180–6307) is grant-Doka + ban only; “Configure payment links below” has no form. Player shop (`WorldExploration.tsx` 19179–19198) hardcodes 15 packages. `useGetShopPackages` exists and is unused by AdminDashboard.  
SYSTEMS_AFFECTED: Economy; Doka shop; admin Shop tab  
CURRENT_BEHAVIOUR: Players buy a fixed catalog. Canister packages are unused by the UI.  
AUTHORITATIVE_BEHAVIOUR: Player shop lists `getShopPackages`; admin CRUD writes that catalog and payment links.  
RECOMMENDED_ACTION: Add package CRUD to the Shop tab; drive the player shop from `getShopPackages` with the hardcoded list as fallback only.  
AUTONOMY: HUMAN — pricing / payment-link policy  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if the live catalog is emptied  
VALIDATION_REQUIRED: Admin add/edit a package; player shop shows it; `initiatePurchase` still uses nine positional args.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-005  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Purchases tab called non-existent `getPurchaseRecords`  
CATEGORY: BROKEN  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Hook `useGetPurchaseRecords` (`useShopQueries.ts`) called `getPurchaseRecords()`. Bindgen and `main.mo` expose `getPurchases` and `adminGetPurchaseRecords`. Table expected `customerData` / `priceEur` / base64 proof; canister `PurchaseRecord` is flattened names + `proofFileUrl` + ns timestamp. This run maps `getPurchases` `#ok` rows onto the table and opens `http` proof URLs.  
SYSTEMS_AFFECTED: Admin Purchases tab  
CURRENT_BEHAVIOUR: Query hits a live method and maps customer fields. Price column stays empty (no cents on the record).  
AUTHORITATIVE_BEHAVIOUR: Admin list uses `adminGetPurchaseRecords`; display matches canister fields; join package price if needed.  
RECOMMENDED_ACTION: Switch the hook to `adminGetPurchaseRecords(null)` for the filter API; show `priceEuroCents` via package join.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: AFDA-2026-08-31-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: After a real purchase, admin Purchases shows name, email, status `pending`/`completed`, and proof URL.  
STATUS: PARTIAL  

---

ACTION_ID: AFDA-2026-08-31-006  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Admin enemy records are not consumed by encounter spawn  
CATEGORY: MISLEADING  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `useGetEnemyConfigs` is only imported by AdminDashboard. Spawn uses `pickEnemyLevelFromTiers` + `getEnemyBaseStats` (`engine/combatMath.ts` 54–107, `engine/progression.ts`). Admin `EnemyConfig` is hp/ap/mp/initStat/levelMin/levelMax/regions/spriteUrl — not the runtime combat template (`types/common.mo`). `spriteUrl` has no WorldExploration reader.  
SYSTEMS_AFFECTED: Enemies tab; encounters; player-relative tiers  
CURRENT_BEHAVIOUR: Saving an enemy does not change overworld packs. Tiers tab *does* affect spawn.  
AUTHORITATIVE_BEHAVIOUR: Either wire spawn to admin enemy templates (optional visual, default pixel) or label the tab as unused catalog. Do not delete until a caller exists.  
RECOMMENDED_ACTION: Prove whether any map/region path still filters `getEnemyConfigs`. If none, keep CRUD and document; do not delete.  
AUTONOMY: HUMAN  
DEPENDENCIES: AFDA-2026-08-31-013  
REGRESSION_RISK: HIGH if spawn is rewritten  
VALIDATION_REQUIRED: Grep-confirmed no game caller; optional spawn integration playtest.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-007  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Battle challenges have no admin surface  
CATEGORY: MISSING  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Catalog is `DEFAULT_CHALLENGES` in `utils/challengeCompletion.ts` (easy/hard/legendary, 50–500 Doka / 0–1000 XP). AdminDashboard has zero `challenge` matches. Backend has no challenge config map.  
SYSTEMS_AFFECTED: Challenges; recap rewards  
CURRENT_BEHAVIOUR: Operators cannot change conditions or rewards without a code change.  
AUTHORITATIVE_BEHAVIOUR: If challenges stay code-owned, say so in admin. If editable, add a gated catalog that `handleBattleEnd` reads.  
RECOMMENDED_ACTION: Report-only unless product wants operator-tunable rewards.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if rewards move off the persist lock  
VALIDATION_REQUIRED: N/A until a design exists  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-008  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Boss Rush admin enable/reward JSON is ignored by the live 10-room table  
CATEGORY: MISLEADING  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Admin tab writes `room_N_enabled` / `room_N_reward` to localStorage + `adminSetBossRushConfig` (opaque Text). `useBossRush.ts` 233–247 only applies `parsed.rewardMultiplier`. Rooms come from `BOSS_RUSH_ROOMS` (indexes 0–9, jackpot 5000/2000). Admin room 10 lists “Weeping Pawn” again; live room 9 uses `weeping_pawn_2`.  
SYSTEMS_AFFECTED: Boss Rush; admin Boss Rush tab  
CURRENT_BEHAVIOUR: Toggling a room off does not skip it. Reward `x` does not change `dokaReward`/`xpReward`.  
AUTHORITATIVE_BEHAVIOUR: Either consume the JSON (enable + multiplier) or replace the tab with a read-only view of `BOSS_RUSH_ROOMS`.  
RECOMMENDED_ACTION: Do not invent a second room table. Wire or relabel.  
AUTONOMY: HUMAN  
DEPENDENCIES: AFDA-2026-08-31-002  
REGRESSION_RISK: HIGH if rooms are duplicated  
VALIDATION_REQUIRED: Disable room 3 in admin; start a rush; confirm skip or confirm the control is labeled display-only.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-009  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Player sprite walk-frame field names drifted (`walkFramesFront` vs `frontWalkFrames`)  
CATEGORY: BROKEN  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Motoko / bindgen use `frontWalkFrames` etc. Admin `PlayerSpriteConfig` uses `walkFramesFront`. This run maps both directions in `useSpellQueries.ts` get/set. WorldExploration still never reads `getPlayerSpriteConfigs` (AFDA-2026-08-31-017).  
SYSTEMS_AFFECTED: Admin Player Sprites tab  
CURRENT_BEHAVIOUR: Walk-frame arrays can now round-trip the canister. Game still draws built-in pixel pieces.  
AUTHORITATIVE_BEHAVIOUR: Same field names on admin type and Candid; optional custom URL with pixel fallback.  
RECOMMENDED_ACTION: Rename the frontend type to match bindgen; keep the adapter until callers migrate.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: AFDA-2026-08-31-017  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Save walk frames; refetch; arrays still populated.  
STATUS: PARTIAL  

---

ACTION_ID: AFDA-2026-08-31-010  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Visuals tab and world hydrate used different palette cache keys  
CATEGORY: BROKEN  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Admin wrote `paperVertexPalette`. `WorldExploration.tsx` 798–802 hydrates `getColorPalette` into `pbv_color_palette`. This run reads/writes both keys.  
SYSTEMS_AFFECTED: Visuals tab; paper-vertex landscape  
CURRENT_BEHAVIOUR: Admin save updates both caches and the canister.  
AUTHORITATIVE_BEHAVIOUR: Single cache key matching world hydrate.  
RECOMMENDED_ACTION: Drop `paperVertexPalette` after one version-gate cycle.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Save palette in admin; reload world; vertex colors match.  
STATUS: PARTIAL  

---

ACTION_ID: AFDA-2026-08-31-011  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Finite-level defaults and copy contradict “no player level cap”  
CATEGORY: MISLEADING  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `newEnemy` / `newRegion` default `levelMax: 5` (`AdminDashboard.tsx` 109, 118). Region effects only apply when `level <= region.levelMax` (`WorldExploration.tsx` 3519–3521). Settings copy says fail chance “reaches 0% at level 200” (line ~3993). Death Realm `levelZone.maxLevel` is 5 at 13567 and 13699 vs 9999 at 5818. `pickEnemyLevelFromTiers` caps tier index at `floor(999 / tierSize)` (`combatMath.ts` 58).  
SYSTEMS_AFFECTED: Regions; enemies; spell fail; Death Realm; player-relative spawn  
CURRENT_BEHAVIOUR: A level-6+ player can match no region. Fail % copy implies a cap. Spawn math stops climbing after level 999.  
AUTHORITATIVE_BEHAVIOUR: No player level cap. `levelMax` on templates is a band, not a career ceiling. Death Realm must not use maxLevel 5.  
RECOMMENDED_ACTION: Default new region/enemy `levelMax` high or optional; fix Death Realm zone to 9999; reword fail-chance help; lift or document the 999 spawn band.  
AUTONOMY: IMPLEMENT for defaults/copy/Death Realm zone only. Do not touch mapGen.  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if region matching becomes unbounded without a fallback  
VALIDATION_REQUIRED: Level 20 character still gets a region (or an explicit “no region” state). Death Realm HUD does not show 1–5.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-012  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Backend/game systems with no admin management  
CATEGORY: MISSING  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Present in actor or live game, absent from AdminDashboard tabs: dungeon records (`getDungeonRecord` / `updateDungeonProgress`); buff catalog (`getBuffCatalog`); `setAppVersion` / `setChangelog`; `getBannedPrincipals` list; `setBossPortalAssignment`; `getAllCharacters`; enemy AI (`engine/enemyAI.ts`); enemy variants; telemetry (only a comment at WorldExploration 16457).  
SYSTEMS_AFFECTED: Dungeons; economy/buffs; ops; portals; AI; telemetry  
CURRENT_BEHAVIOUR: Operators cannot tune these from the dashboard.  
AUTHORITATIVE_BEHAVIOUR: Admin covers every persisted config map. Code-owned systems (AI, challenges) should be labeled as such.  
RECOMMENDED_ACTION: Add only configs that already have canister CRUD (version, changelog, ban list, portal assignments, shop packages). Do not invent telemetry.  
AUTONOMY: HUMAN — pick which surfaces  
DEPENDENCIES: AFDA-2026-08-31-004  
REGRESSION_RISK: LOW for read-only ops panels  
VALIDATION_REQUIRED: Per surface  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-013  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Custom enemy artwork is optional; admin `spriteUrl` is unused  
CATEGORY: VISUAL_FALLBACK  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `getEnemyFamilyPixelPattern` has a `default` family (`WorldExploration.tsx` 4208–4214). No `spriteUrl` reader in WorldExploration. New enemies/bosses render from piece/family pixel patterns. Admin enemy form still shows Sprite URL as if it were live. Custom art is not mandatory.  
SYSTEMS_AFFECTED: Enemies; bosses; visuals  
CURRENT_BEHAVIOUR: Default pixel visual always works. Admin URL does not appear in combat.  
AUTHORITATIVE_BEHAVIOUR: valid custom visual → custom; otherwise built-in pixel.  
RECOMMENDED_ACTION: Keep pixel fallback. Either hook `spriteUrl` as optional overlay or label the field unused. Do not require artwork for new enemies.  
AUTONOMY: HUMAN  
DEPENDENCIES: AFDA-2026-08-31-006  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Spawn an enemy with empty `spriteUrl`; confirm default pixels draw.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-014  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Spell `minLevel` / discovery is not enforced; every backend spell becomes owned  
CATEGORY: PARTIAL  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Admin edits `minLevel` and usable-by flags. `ownedSpells` (`WorldExploration.tsx` 2259–2272) unions all `filteredBackendSpells` with no `minLevel` check. `spellPool` is the full backend list (2520–2526).  
SYSTEMS_AFFECTED: Spells; spell discovery  
CURRENT_BEHAVIOUR: Saving a player-usable spell grants it to everyone regardless of `minLevel`.  
AUTHORITATIVE_BEHAVIOUR: `minLevel` gates discovery/equip if that field stays in admin.  
RECOMMENDED_ACTION: Enforce `minLevel` at hydrate, or hide the field.  
AUTONOMY: HUMAN  
DEPENDENCIES: AFDA-2026-08-31-001  
REGRESSION_RISK: MEDIUM — locking existing bars  
VALIDATION_REQUIRED: Spell with minLevel 10 hidden from a level-3 character.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-015  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Shop, Ads, and Boss Rush tabs use gray Tailwind instead of carved-stone admin chrome  
CATEGORY: UX-DEGRADED  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: Enemies/Spells/Settings use stone tokens (`C.gold`, carved panels). Shop (`bg-gray-800`), Ads (`#ff4444` / `#aaa`), Boss Rush (`bg-gray-800`) do not.  
SYSTEMS_AFFECTED: Admin Shop / Ads / Boss Rush  
CURRENT_BEHAVIOUR: Three tabs look like a different product.  
AUTHORITATIVE_BEHAVIOUR: Ankama/Dofus carved-stone, dark slate, crimson accents.  
RECOMMENDED_ACTION: Restyle those tabs to match `sectionHeadStyle` / `C` tokens.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Visual compare against Enemies tab.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-016  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Admin modifier type list drifted from the live engine registry  
CATEGORY: OUTDATED  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Admin `MODIFIER_TYPES` (`AdminDashboard.tsx` 4241–4265) includes `lava_fields`, `ice_fields`, `spike_pit`, `custom`. Engine registry (`engine/mapModifiers.ts`) has `titans_vigor`, `arcane_overflow`, `glass_realm`, `mending_mist`, `swift_winds`, `iron_curse`, `vampiric_ground`, `null_field`, `chaos_initiative`, `doka_fever` — none of those hazard-admin ids.  
SYSTEMS_AFFECTED: Map Modifiers tab; portal modifier rolls  
CURRENT_BEHAVIOUR: Admin can save types the registry never applies. Live modifiers cannot be selected.  
AUTHORITATIVE_BEHAVIOUR: Dropdown equals `mapModifierRegistry` ids.  
RECOMMENDED_ACTION: Replace the list from the registry. Keep existing saved rows; do not delete configs.  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if a live modifier id is dropped from the dropdown  
VALIDATION_REQUIRED: Every registry id selectable; a `doka_fever` row triggers in-game.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-017  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Player sprite configs persist but the world never draws them  
CATEGORY: MISLEADING  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `getPlayerSpriteConfigs` is admin-only. WorldExploration has no `playerSprite` / `frontUrl` usage; player draw uses `chessPiecePatterns` / `drawPixelPattern`.  
SYSTEMS_AFFECTED: Player Sprites tab; character visuals  
CURRENT_BEHAVIOUR: Operators can upload URLs that never appear in play. Pixel pieces still work (custom art not mandatory).  
AUTHORITATIVE_BEHAVIOUR: Optional custom sprite with pixel fallback.  
RECOMMENDED_ACTION: Prove no other renderer reads these configs. Then wire optional overlay or mark the tab catalog-only. Do not delete.  
AUTONOMY: HUMAN  
DEPENDENCIES: AFDA-2026-08-31-009  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Grep-confirmed no game caller.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-018  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Admin special-mechanic flags are not on the canister SpellConfig  
CATEGORY: IGNORED_FIELDS  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Editor writes `isSwap`, `isMirror`, `isTimestep`, `isSacrifice`, `isBarrier`, `isTrap`, `isMark`, buff/debuff/DoT numbers, `targetType`. Motoko `SpellConfig` has none of those (`types/admin.mo` 79–110). `toBackendSpellConfig` correctly drops them on save. Combat still uses the frontend flags from `spellData.ts` / in-memory objects.  
SYSTEMS_AFFECTED: Spells  
CURRENT_BEHAVIOUR: Toggling Barrier on an admin spell does not persist. Reloading loses the flag.  
AUTHORITATIVE_BEHAVIOUR: Either extend Motoko SpellConfig / `effectParams` JSON, or remove the toggles.  
RECOMMENDED_ACTION: Persist via `effectParams` (already optional Text) without a Motoko schema break.  
AUTONOMY: HUMAN  
DEPENDENCIES: AFDA-2026-08-31-001  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Save Barrier; reload admin; combat still treats the spell as a barrier.  
STATUS: NEW  

---

ACTION_ID: AFDA-2026-08-31-019  
SOURCE_AUTOMATION: Admin Feature & Drift Auditor  
TITLE: Settings admin-role transfer calls caffeine `assignCallerUserRole`, not `assignUserRole`  
CATEGORY: UNSAFE  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `useAssignUserRole` (`useAdminQueries.ts` 88) calls `assignCallerUserRole(principal, role)` with a string `"admin"`. `main.mo` 1700 implements `assignUserRole(target, role: Text)` with a 30s rate limit. Bindgen also lists `assignCallerUserRole(user, UserRole)` from the caffeine mixin (not in `src/backend/main.mo` source).  
SYSTEMS_AFFECTED: Settings tab; auth  
CURRENT_BEHAVIOUR: Transfer may hit the mixin or fail Candid if the live actor only has `assignUserRole`.  
AUTHORITATIVE_BEHAVIOUR: Admin transfer uses the rate-limited `assignUserRole` in `main.mo`.  
RECOMMENDED_ACTION: Call `assignUserRole` with Text `"admin"`; keep mixin as fallback only after a live probe.  
AUTONOMY: HUMAN — confirm deployed DID  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if the mixin is the only live grant path  
VALIDATION_REQUIRED: Transfer admin on a deployed canister; both principals can open admin.  
STATUS: NEW

ACTION_ID: SDEG-2026-08-31-001  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Wire the live actor to the migration chain before any required-field add  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `mops.toml` `[canisters.backend.migrations] chain = "src/backend/migrations"` and `20260827_000000.mo` exist, but `src/backend/main.mo` line 40 is a plain `actor {` with no `(with migration = Migration.run)`. AGENTS.md / ARCHITECTURE.md already record this. Adding a required Character/stats field (or changing a stable Map value type) will fail the canister upgrade for every yesterday / six-month account. The current module is a pass-through that only drops transients (`BUFF_CATALOG`, `chatMessages`, …).  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `src/backend/migrations/20260827_000000.mo`; `mops.toml`  
RECOMMENDED_ACTION: Before the next required persist field: (1) refresh inlined OldActor/NewActor to the live stable shape (see SDEG-2026-08-31-002); (2) attach `(with migration = Migration.run)` on canonical `main.mo` only; (3) add a one-shot `var migrationGeneration` so a replay cannot re-run a destructive remap. Do not deploy `backend_extended`.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-002  
MIGRATION_REQUIREMENT: YES — attaching the annotation is itself an upgrade; the first wired module must be a no-op copy of player maps.  
REGRESSION_RISK: HIGH if the inlined types do not match the live canister.  
VALIDATION_REQUIRED: `caffeine check` stable-compat against `.old/src/backend/dist/backend.most`; a fixture principal with 12-field Character, Doka, spellLevelKeys, achievements, dungeon, boss rush still loads after upgrade.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-002  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Refresh inlined migration SpellConfig before the chain can be attached  
CATEGORY: persist-schema  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `20260827_000000.mo` inlined `SpellConfig` (lines 117–147) has no `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef`. `src/backend/lib/admin.mo` `defaultSpells()` (lines 172–190) writes those fields. `src/backend/types/admin.mo` `SpellConfig` (lines 79–110) also omits them. Attaching today’s chain as-is will fail the compatibility check or drop summon metadata.  
SYSTEMS_AFFECTED: `src/backend/migrations/20260827_000000.mo`; `src/backend/types/admin.mo`; `src/backend/lib/admin.mo`  
RECOMMENDED_ACTION: Diff every live `let`/`var` in `main.mo` against OldActor/NewActor and AdminTypes. Add missing fields as optional or with defaults. Do not attach the chain until the inlined types match.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: Migration module compiles against the live stable dump; summon spells still round-trip.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-003  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Stop the every-upgrade OLD_SPELL_IDS purge; remap ownership instead  
CATEGORY: content-id-stability  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `src/backend/main.mo` lines 530–537 run `spellConfigs.remove` for `blood_nova`, `fireball`, `heal`, `physical_attack`, … on **every** canister start/upgrade. Frontend `WorldExploration.tsx` lines 2203–2240 also hide the same ids/names from `ownedSpells`. `upgradeSpell` (line 738) errors `Spell not found` if the id is gone. Player `spellLevelKeys` are **not** remapped. A player from before the rename keeps paid levels on orphan ids; a later admin re-add is deleted again on the next deploy. `physical_attack` is a live starter id **and** a purged backend id.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `src/frontend/src/components/WorldExploration.tsx`; `upgradeSpell`; `spellLevelKeys`  
RECOMMENDED_ACTION: Replace the boot purge with a one-shot `var oldSpellIdsPurged : Bool` (or `migrationGeneration`). Persist an alias table `oldId → newId` and remap `spellLevelKeys` once (max level if both exist). Keep retired ids in configs as `usableByPlayer = false` so `upgradeSpell` still resolves. Never delete `physical_attack` from the backend catalog while it is a starter.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES — must be idempotent; replaying must not double-map or zero levels.  
REGRESSION_RISK: HIGH if aliases are wrong.  
VALIDATION_REQUIRED: Fixture character with `spellLevelKeys = ["fireball","physical_attack"]` and levels 3/2 still owns equivalent ids after two upgrades.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-004  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Persist owned spell ids (and discovery) separately from the live catalog  
CATEGORY: spell-discovery  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Official ownership is `starterSpells` UNION `getSpellConfigs()` minus `OLD_SPELL_NAMES_SET` (`WorldExploration.tsx` 2242–2271). `createCharacter` seeds `spellLevelKeys = []` (`CharacterCreation.tsx` 286–289). `setSpellBarOrder` (`main.mo` 1292–1294) **drops** any bar id not in `spellLevelKeys`, so starters never survive the save; load then appends them to the end. There is no discovery history, no achievement→spell grant table, and `minLevel` is not an ownership gate. A player created yesterday instantly “owns” every current catalog spell; a player from before a rename loses the old id in the UI while paid levels remain; a player who owned a now-retired spell cannot upgrade or see it.  
SYSTEMS_AFFECTED: Character `spellLevelKeys`; `setSpellBarOrder`; `starterSpells`; achievement unlocks  
RECOMMENDED_ACTION: Treat `spellLevelKeys` as the ownership set (level 0 = owned/unupgraded). On create, seed starter ids at 0. Filter the bar against that set UNION current starters (not catalog-all). Add optional `discoveredSpellIds` only with a default `[]` and a migration. Achievement unlocks must write a spell id, not a name.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-003  
MIGRATION_REQUIREMENT: YES — empty keys on old characters must mean “starters + any upgraded ids”, not “owns nothing”.  
REGRESSION_RISK: MEDIUM — seeding must not grant the full admin catalog to old accounts.  
VALIDATION_REQUIRED: Old empty-keys character still has starters; bar order of starters persists; retired id with level > 0 remains visible as unusable-or-aliased.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-005  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Hydrate BuffShop from canister inventory; stop paid items living only in localStorage  
CATEGORY: inventory  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Backend `buffInventories` is keyed `"principal#slot"` with `purchaseBuff` / `useBuffItem` / `getBuffInventory`. Official `BuffShop.tsx` lines 77–93 read/write `${principalId}_inventory` only. Version gate (`versionGate.ts` 7–12, `App.tsx` 231–247) preserves those keys across `APP_VERSION` wipes — that is a cache exception, not authority. Cross-device / cleared-except-gate / six-month-old clients lose paid potions while Doka spend already hit `saveBattleStats`. #107 still writes localStorage after a successful debit.  
SYSTEMS_AFFECTED: `BuffShop.tsx`; `buffInventories`; `versionGate.ts`; persist lock  
RECOMMENDED_ACTION: Buy/use through `purchaseBuff` / `useBuffItem` on `createProgressPersist`. Hydrate from `getBuffInventory(slot)`. Keep localStorage as cache only (same rule as spell bar). Slot-scope the cache key (`principal#slot`) so three characters do not share stacks.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: YES — copy localStorage stacks into empty canister slots once; never overwrite a non-empty canister stack with cache.  
REGRESSION_RISK: MEDIUM if a stale cache wins.  
VALIDATION_REQUIRED: Buy on device A, login on device B, stacks match; version bump does not duplicate or wipe canister stacks.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-006  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Add a Character write generation so stale clients cannot clobber newer XP/Doka  
CATEGORY: stale-client  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `saveBattleStats` (`main.mo` 1337–1406 on this HEAD) writes absolute XP/Doka/level with no etag. Death **must** lower XP/Doka, so a monotonic-up clamp is wrong. Draft #107 clamps **upward** mint (`writeDoka/Xp/Level = min(incoming, stored)`) — review that as SDEG-2026-08-31-012; it does not stop a stale heal/death snapshot from writing a **lower** leftover after a later `applyRewards`. `updateCharacter` rejects decreasing level/killCount but still replaced `spellLevelKeys` until SDEG-2026-08-31-009. No `schemaVersion` / `writeGeneration` field exists (grep empty).  
SYSTEMS_AFFECTED: `saveBattleStats`; `applyRewards`; persist lock; Character record  
RECOMMENDED_ACTION: Add optional `writeGeneration : ?Nat` (default 0 for old rows). Each successful persist increments it. Reject absolute writes whose generation is older than stored, except a signed death-penalty path. Do not land this in a second PR if #107 is still the clamp vehicle — extend #107 or wait.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001; open #107  
MIGRATION_REQUIREMENT: YES — new field must be optional or defaulted; attaching requires SDEG-001.  
REGRESSION_RISK: HIGH if death/heal retries use a stale generation.  
VALIDATION_REQUIRED: applyRewards then stale saveBattleStats does not cut leftover; death 20/40 still lands; replay of #107 death sessionStorage still works.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-007  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Make dungeon and Boss Rush progress writes idempotent and slot-scoped  
CATEGORY: progress-idempotency  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `dungeonRecords` is Principal-keyed (`main.mo` 2038–2078). `updateDungeonProgress` always does `totalMapsCompleted + 1` — a retried portal write inflates the counter. Three slots on one account share one chain. `completeBossRushRoom` (`main.mo` 2542) increments `totalBossRushRuns` whenever `roomIndex == 9` with no “already counted this run” guard. `highestRoomCompleted` is max (safe). `create`/`delete` clear rush per slot (good). A player from before 3-slot / before rush just has missing map entries (defaults 0) — safe — but retries and shared-dungeon are not.  
SYSTEMS_AFFECTED: `dungeonRecords`; `bossRushStates`; `completeBossRushRoom`; `updateDungeonProgress`  
RECOMMENDED_ACTION: Key dungeon by `principal#slot` (migrate Principal-only rows onto slot 1). Increment `totalMapsCompleted` only when `depth` increases vs stored `chainDepth`. Increment `totalBossRushRuns` only when `highestRoomCompleted` first reaches 10. Keep `resetDungeonChain` as chainDepth=0 without touching totals/best.  
AUTONOMY: HUMAN  
DEPENDENCIES: SDEG-2026-08-31-001  
MIGRATION_REQUIREMENT: YES — copy Principal record to slot1; do not duplicate on replay.  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Double-call updateDungeonProgress(depth=2) → +1 map; two characters on one principal keep separate chains; double complete room 9 → +1 run.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-008  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Keep achievement progress when a config is retired; never key unlocks by display name  
CATEGORY: achievements  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `adminDeleteAchievementConfig` (`main.mo` 1644–1649) removes the config. `claimAchievementReward` then returns `Unknown achievement` even if `achievementProgress` is unlocked/unclaimed. `active = false` already exists to hide without delete (`admin.mo` 205–212) but delete is also exposed. Conditions are frontend strings (`first_battle_win`, `level_10`). `getPlayerAchievements` requires the caller Principal (good). A player who unlocked yesterday and an admin who deletes/renames the id today loses the claim.  
SYSTEMS_AFFECTED: `achievementConfigs`; `achievementProgress`; `AchievementsPanel`  
RECOMMENDED_ACTION: Soft-delete only (`active = false`). Keep progress rows forever. Claim must succeed on a deactivated config using the stored reward snapshot (add optional `dokaRewardAtUnlock : ?Nat`, default config.dokaReward). Renames keep `id`; names are UI.  
AUTONOMY: HUMAN  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: Optional field only; old rows default to current config reward.  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unlock, deactivate, claim still pays once; second claim still `#err`.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-009  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: updateCharacter merges spell levels (max/union) so stale appearance edits cannot wipe upgrades  
CATEGORY: spell-levels  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Implemented this run. `updateCharacter` used to full-replace `spellLevelKeys`/`spellLevelValues`. `CharacterCreation.tsx` 286–289 sends `existingCharacter?.spellLevelKeys ?? []` — a partial/stale edit payload wrote `[]` and erased paid levels.  
SYSTEMS_AFFECTED: `src/backend/main.mo` `_mergeSpellLevels` 148–187, `updateCharacter` 295–304  
RECOMMENDED_ACTION: Landed. Keep `upgradeSpell` as the only increment path. Do not let `saveBattleStats` write the arrays (already ignored).  
AUTONOMY: IMPLEMENT  
DEPENDENCIES: None  
MIGRATION_REQUIREMENT: None (behavior-only; idempotent union/max).  
REGRESSION_RISK: LOW — cannot drop keys; cannot downgrade a level.  
VALIDATION_REQUIRED: Edit appearance with empty keys → stored keys unchanged; incoming lower level for `shadow_strike` → keep higher store; incoming new id → append.  
STATUS: IMPLEMENTED  

---

ACTION_ID: SDEG-2026-08-31-010  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: XP helpers must not use JS Number as a silent max level  
CATEGORY: unbounded-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Implemented this run in `utils/xpCurve.ts` (`xpThresholdBigInt`). `100 * 2 ** (N-1)` exceeds `MAX_SAFE_INTEGER` at level 48 and is `Infinity` at level 1024+. `CharacterSelection.tsx` and `deathPenalty.ts` now call the shared helper. Motoko `applyRewards` (`main.mo` 1408+) already uses unbounded `Nat`. Remaining Number leaks: `WorldExploration.tsx` ~3064 (`100 * 2 ** (savedLevel - 1)`), recap `xpForNextLevel: (level || 1) * 100` (wrong curve, overlaps #108), enemy HP `getEnemyHPForLevel` Float (`main.mo` 2087–2093), `spellFailReductionPerLevel` comment “reaches 0 at level 200” (floors, not a cap).  
SYSTEMS_AFFECTED: `xpCurve.ts`; `deathPenalty.ts`; `CharacterSelection.tsx`; leftover WX/recap; `getEnemyHPForLevel`  
RECOMMENDED_ACTION: Landed for the shared helper. Orchestrator: one-line WX call sites to `xpForNextLevel` (do not rewrite WX). Do not change `getEnemyHPForLevel` without a human (adjacent to combat math). Keep leftover XP on the wire as `bigint`; stop `Number(experience)` in persist paths (follow-up).  
AUTONOMY: IMPLEMENT (helper); HUMAN (WX / Float HP)  
DEPENDENCIES: #108 for recap leftover display  
MIGRATION_REQUIREMENT: None  
REGRESSION_RISK: LOW for helper; MEDIUM if WX recap formula is changed while #108 is open.  
VALIDATION_REQUIRED: `node --experimental-strip-types src/frontend/src/utils/xpCurve.test.ts`; deathPenalty expToNext still 100/200 at levels 1–2.  
STATUS: IMPLEMENTED  

---

ACTION_ID: SDEG-2026-08-31-011  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Do not deploy dfx.json backend_extended (15-field stats) over the 12-field live actor  
CATEGORY: deploy-hazard  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Live CharacterStats is 12 fields (`main.mo` 123–136). `dfx.json` still points at `src/backend_extended/main.mo` (15-field / wp-wr-scp). Root `declarations/` still have `wp`/`wr`/`scp`. A six-month canister on 15 fields rejects 12-field saves until upgraded; the reverse deploy bricks 12-field clients. Documented in AGENTS.md; still present.  
SYSTEMS_AFFECTED: `dfx.json`; `backend_extended/`; bindgen; live canister  
RECOMMENDED_ACTION: Point dfx at `src/backend/main.mo` only after a planned upgrade. Never “fix” bindgen to 15 fields. Contract Guardian should keep treating this as documented, not a drive-by edit.  
AUTONOMY: HUMAN  
DEPENDENCIES: Live canister upgrade plan  
MIGRATION_REQUIREMENT: YES if the deployed actor is still 15-field  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: After any deploy, `getCharacter` + `updateCharacter` with 12-field payload including `killCount` succeeds.  
STATUS: NEW  

---

ACTION_ID: SDEG-2026-08-31-012  
SOURCE_AUTOMATION: Save/Data Evolution Guardian  
TITLE: Review #107 absolute-write clamp; do not open a second saveBattleStats PR  
CATEGORY: stale-client  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Draft #107 adds `writeDoka/Xp/Level = min(incoming, stored)` on `saveBattleStats`. That blocks stale-UI **mints** and matches architecture (absolute writes may cut for death/shop; credits stay on `applyRewards`). It does **not** replace SDEG-2026-08-31-006 (generation). Quality Auditor AQA-2026-08-30-008/010 already asked to keep the clamp as its own review.  
SYSTEMS_AFFECTED: `saveBattleStats`; #107  
RECOMMENDED_ACTION: Human-review #107 clamp only. Do not clone it. After merge, add generation (006).  
AUTONOMY: HUMAN  
DEPENDENCIES: #107  
MIGRATION_REQUIREMENT: None for the clamp  
REGRESSION_RISK: HIGH if clamp ships without death 20/40 still able to decrease XP/Doka  
VALIDATION_REQUIRED: Death cut still persists; applyRewards then heal snapshot cannot raise Doka.  
STATUS: NEW

ACTION_ID: RAO-2026-08-31-001  
SOURCE_AUTOMATION: Report Action Orchestrator  
TITLE: Leftover XP HUD on select / top bar / recap  
CATEGORY: display  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Independently confirmed on `22503b5`. `applyRewards` stores leftover XP (`100 * 2^(N-1)`). Character select subtracted `cumulativeXpAtLevel` (`CharacterSelection.tsx`). GameFlow top bar read App `selectedCharacter.xp` never written (`_setSelectedCharacter` unused). Recap used `(level * 100)` and `rewardResolver` set `xpForNextLevel: 0`. In-world XP chip already used leftover curve. Stale draft #108 (base `e4abb4c`) covered the same theme before #103–#111 landed.  
RECOMMENDED_ACTION: IMPLEMENT on current main. Supersedes stale #108.  
STATUS: IMPLEMENTED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — display only; persist / RAF / damage / turn logic unchanged.

---

ACTION_ID: RAO-2026-08-31-002  
SOURCE_AUTOMATION: Find Critical Gameplay Bugs  
TITLE: Plague Zone player death deferred until post-paint HP-watch  
CATEGORY: combat-correctness  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Verified on `22503b5` `WorldExploration.tsx` ~14353: player plague is `setCharacterStats` HP-2 only. Enemy plague already commits store HP + `processCombatantDeath`. Open draft #114 is clean against current main.  
RECOMMENDED_ACTION: Human merge #114. Do not re-implement.  
STATUS: OPEN  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if a second agent restacks WX turn-start.

---

ACTION_ID: RAO-2026-08-31-003  
SOURCE_AUTOMATION: Find Critical Gameplay Bugs / Combat Parity  
TITLE: Live cast / Attack Nearest ignore barrier LoS  
CATEGORY: combat-correctness  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `isTileCastableLive` comment still says barrierTiles are not passed (`targeting.ts` ~476). #114 adds the live-gate map. #105 rewrites targeting more broadly (stale/dirty vs #102/#104). Combat Parity cron is running this hour.  
RECOMMENDED_ACTION: Keep #114 barrier hunk. Do not merge stale #105 as-is.  
STATUS: OPEN  
DEPENDENCIES: RAO-2026-08-31-002  
REGRESSION_RISK: HIGH if #105 and #114 both land.

---

ACTION_ID: RAO-2026-08-31-004  
SOURCE_AUTOMATION: Economy & Exploit Hunter / Security Review  
TITLE: Official-client economy clamp and double-submit races  
CATEGORY: economy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: #107 still open, **dirty** vs main after #111. Backend `saveBattleStats` / `applyRewards` remain unbounded client writes (`main.mo` 1285–1388). Shop 60s auto-complete unchanged. Economy hunter cron running this hour.  
RECOMMENDED_ACTION: Human. Rebase #107 clamp only, or wait for the new economy run. Do not autonmerge dirty #107.  
STATUS: NEEDS_HUMAN_DECISION  
DEPENDENCIES: AQA-2026-08-30-008  
REGRESSION_RISK: HIGH if canister APIs tighten without a frontend roll.

---

ACTION_ID: RAO-2026-08-31-005  
SOURCE_AUTOMATION: Weekly Changelog / prior orchestrator  
TITLE: GameFlow boost toggle does not change WX payouts  
CATEGORY: economy  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: App/GameFlow pill flips `boostMode`. WX uses a local `_setBoostMode` unused setter; victory XP always `* 1.5` when mode is default `"xp"`. Wiring it changes payouts.  
RECOMMENDED_ACTION: Human: wire App toggle into WX math, or remove the dead pill. Do not silently change rewards.  
STATUS: NEEDS_HUMAN_DECISION  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH — economy.

---

ACTION_ID: RAO-2026-08-31-006  
SOURCE_AUTOMATION: Application Security Review  
TITLE: Nine client-trusted canister sinks  
CATEGORY: security-architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Unchanged set: shop 60s credit; unbounded `applyRewards` / `saveBattleStats`; `createCharacter` / `updateCharacter` caps; chat impersonation; achievement client unlock; `calculateAndAwardDoka`; `completeBossRushRoom`. Finding 3 (“must not write Doka from saveBattleStats”) is stale vs architecture.  
RECOMMENDED_ACTION: Architecture decision, not an autonomous PR.  
STATUS: NEEDS_HUMAN_DECISION  
DEPENDENCIES: AQA-2026-08-30-008  
REGRESSION_RISK: HIGH

---

ACTION_ID: RAO-2026-08-31-007  
SOURCE_AUTOMATION: prior orchestrator  
TITLE: AdminDashboard.newSpell omits targeting metadata  
CATEGORY: admin  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: `newSpell()` (`AdminDashboard.tsx` 57–99) has no `cooldown`, `hitsAllies`, `hitsMultiple`, `targetType`. Admin visual-management cron running this hour.  
RECOMMENDED_ACTION: Defer. Admin-only; another agent is on that surface.  
STATUS: DEFERRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW

---

## Closed this window (do not re-open)

| Theme | Closed by |
| :--- | :--- |
| Enemy heal / phase HP + dungeon white portal | #103 merged |
| Touch Thorned Ground / Void Rift | #109 merged |
| Portal XP persist + Attack Nearest live gate | #104 / #113 merged |
| Persist races (shop / portal XP / spends) | #111 merged |
| Map solvability punches | #110 merged (AGENTS.md map-gen conflict; human landed it) |
| Quality audit docs | #112 merged |
| Attack Nearest live store | #102 merged (prior run) |

## Open drafts to leave alone

| PR | Note |
| :--- | :--- |
| #114 | Unique P0/P1; merge first |
| #108 | Stale leftover-XP; superseded by RAO-2026-08-31-001 |
| #107 | Dirty; economy |
| #105 | Dirty targeting rewrite; overlaps #114 |
| #100 #101 #106 | Test-coverage clone mill (AQA-2026-08-30-005) |

ACTION_ID: AUX-DEL-NO-CONFIRM  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Confirm before deleting live config entities  
CATEGORY: safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Pre-fix, EnemyList/RegionList/SpellList and inline modifier/achievement/name `×` buttons called delete mutations immediately. Sprites already used a confirm dialog. Save on those entities is canister-live. ConfirmDialog now at AdminDashboard.tsx:236; list confirms at EnemyList/RegionList/SpellList; pendingDelete at ~5096.  
SYSTEMS_AFFECTED: AdminDashboard lists; adminDelete* canister writes  
RECOMMENDED_ACTION: Keep the shared ConfirmDialog. Do not add a second delete path.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — extra click only  
VALIDATION_REQUIRED: Delete enemy/spell/region/modifier/achievement/name requires Cancel/Confirm; Confirm still toasts success.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-SHOP-NO-CONFIRM  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Confirm Doka grant and player ban  
CATEGORY: safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Shop tab (AdminDashboard.tsx ~6481) called adminAddDokaToUser / adminBanAccount with no second step. Ban clears achievement progress (main.mo ~950–963). Confirms now at 5126–5178.  
SYSTEMS_AFFECTED: Shop tab; dokaBalances; bannedPrincipals; achievementProgress  
RECOMMENDED_ACTION: Keep confirms. Separate grant vs ban principal fields (see AUX-SHOP-SHARED-PRINCIPAL).  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: AUX-SHOP-SHARED-PRINCIPAL  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Grant/Ban open ConfirmDialog; Cancel does not write.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-BOSS-LOCALSTORAGE-AS-LIVE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Boss editor must not look canister-live  
CATEGORY: content-lifecycle  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: useBossQueries.ts:1–29 and useAdminQueries.ts:462–502 persist pbv_boss_configs in localStorage. Subtitle previously said changes take effect on the next encounter. Copy at AdminDashboard.tsx:7192 now says browser-local draft.  
SYSTEMS_AFFECTED: Bosses tab; boss encounter load path  
RECOMMENDED_ACTION: HUMAN — add canister adminSetBossConfig, draft vs ACTIVE badge, preview-before-activate. Do not treat localStorage as source of truth.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-LIFE-NO-STATES  
REGRESSION_RISK: HIGH if live encounters switch storage without a migrate  
VALIDATION_REQUIRED: Badge shows DRAFT (this browser) vs ACTIVE (canister); two browsers do not silently diverge.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-DIRTY-UNUSED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Warn before discarding an open editor  
CATEGORY: safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: isDirty is always false (AdminDashboard.tsx:4805; gameTypes.ts AdminDashboardState). This run gates tab/Back on hasOpenEditor (ConfirmDialog 5081). Field-level dirty and beforeunload still missing.  
SYSTEMS_AFFECTED: AdminDashboard navigation  
RECOMMENDED_ACTION: Optionally wire isDirty on form change; keep leave-editor confirm.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Switching tabs with EnemyEditor open shows Leave this editor?; Cancel stays on the form.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-TRANSFER-COPY-MISLEAD  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Transfer-admin copy must match assignUserRole  
CATEGORY: safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Settings said the operator would lose admin access. ARCHITECTURE.md Role row: assignUserRole grants admin only. Copy updated in SettingsTab.  
SYSTEMS_AFFECTED: Settings tab; assignCallerUserRole  
RECOMMENDED_ACTION: Keep honest copy. If product wants a real transfer, that is a separate backend change.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Warning text does not claim self-demotion.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-NAV-FLAT-15  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Group 15 flat tabs; keep sidebar scrollable  
CATEGORY: navigation  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: TABS at AdminDashboard.tsx:5017–5030. Sidebar overflowY auto added at 5262. No groups, no search.  
SYSTEMS_AFFECTED: Admin sidebar  
RECOMMENDED_ACTION: HUMAN — group Content / World / Presentation / Economy / Health. Keep overflow. Do not add player-facing chrome.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM — operators bookmark mental tab order  
VALIDATION_REQUIRED: All 15 destinations still reachable; Shop/Boss Rush visible without clipping.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-VIS-NO-DEFAULT-DISTINCTION  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Distinguish Default Pixel Visual vs Custom Override  
CATEGORY: visual-assets  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Empty spriteUrl is valid. Pre-fix: “No preview” / “Sprite URL (optional)”. Now: enemy status 712–738, list badge, sprite fallback 1398.  
SYSTEMS_AFFECTED: Enemy editor/list; Player Sprites  
RECOMMENDED_ACTION: Keep copy. Later add pools, weights, activate/deactivate, revert-to-default (AUX-ASSET-NO-POOL).  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: AUX-ASSET-NO-POOL  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Empty enemy sprite shows Default Pixel Visual — Active fallback, not an error.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-LIFE-NO-STATES  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Introduce draft vs live content states  
CATEGORY: content-lifecycle  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Achievement/modifier `active` checkboxes only. Other Saves publish live. Boss Save is a local draft that still looks like publish.  
SYSTEMS_AFFECTED: All admin CRUD  
RECOMMENDED_ACTION: HUMAN — DRAFT / VALIDATION FAILED / READY TO ACTIVATE / ACTIVE / INACTIVE / LEGACY. Never show a saved draft as live.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-BOSS-LOCALSTORAGE-AS-LIVE  
REGRESSION_RISK: HIGH — persist model change  
VALIDATION_REQUIRED: Saved draft stays invisible to players until Activate.  
STATUS: NEW  

---

ACTION_ID: AUX-ID-MUTABLE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Lock entity IDs after create  
CATEGORY: safety  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: adminSet* keys by id. Pre-fix ID fields stayed editable. idLocked wired for enemy/region/spell when editing*Id !== "__new__".  
SYSTEMS_AFFECTED: Enemy/Region/Spell editors  
RECOMMENDED_ACTION: Keep lock. Add the same lock to achievements/modifiers.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Existing enemy ID input is disabled; new enemy ID is editable.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-THEME-SPLIT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Restyle Shop, Boss Rush, and Ads to stone tokens  
CATEGORY: visual-identity  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Shop ~6481 uses bg-gray-800 / text-red-400. Ads use #ff4444 / #1a0505. Rest of console uses C.gold / carved stone. DESIGN.md identity.  
SYSTEMS_AFFECTED: Shop, Boss Rush, Ads tabs  
RECOMMENDED_ACTION: HUMAN — restyle with existing PanelCard/Btn/Field; do not invent a second admin theme.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Those tabs match Enemies/Spells chrome; ocids unchanged.  
STATUS: NEW  

---

ACTION_ID: AUX-SPELL-FORM-MONOLITH  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Section the spell editor; add validation summary  
CATEGORY: edit-forms  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: SpellEditor ~2294–3300 is one scroll: identity, stats, type, targeting, AoE, specials, preview.  
SYSTEMS_AFFECTED: Spells tab  
RECOMMENDED_ACTION: HUMAN — in-editor sections (Identity / Cost / Targeting / Effects / Acquisition). Validation summary at top. No name-based effect heuristics.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NO-DEPENDENCY-VIEWS  
REGRESSION_RISK: MEDIUM — easy to drop a hidden flag  
VALIDATION_REQUIRED: Every SpellConfig field still editable; existing spells round-trip.  
STATUS: NEW  

---

ACTION_ID: AUX-ENEMY-STATS-INCOMPLETE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Surface that admin EnemyConfig is a spawn template  
CATEGORY: terminology  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: gameTypes.ts:108–119 vs runtime combat EnemyConfig (ARCHITECTURE.md). Editor only hp/ap/mp/init/level/regions/sprite.  
SYSTEMS_AFFECTED: Enemies tab; combat spawn  
RECOMMENDED_ACTION: HUMAN — banner: “Spawn template — combat ATK/RES/SP/SR/CHC are not edited here.” Later, explicit combat fields if product wants them.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if fields are added without bindgen/canister upgrade  
VALIDATION_REQUIRED: Operators cannot think they set ATK here.  
STATUS: NEW  

---

ACTION_ID: AUX-VALIDATION-EMPTY-SAVE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Block save when ID or name is empty  
CATEGORY: validation  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Save buttons now toast and return on empty id/name for enemy/region/spell/achievement.  
SYSTEMS_AFFECTED: Entity editors  
RECOMMENDED_ACTION: Keep. Add a validation summary for numeric ranges (levelMin ≤ levelMax).  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Empty-name Save does not call mutate.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-PII-PURCHASES  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Filterable purchase table; confirm proof download  
CATEGORY: privacy-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Purchases tab ~5561 lists name, email, address, proof download with no filter. Owner-only, still high error/leak surface.  
SYSTEMS_AFFECTED: Purchases tab  
RECOMMENDED_ACTION: HUMAN — status filter, search by principal/email, confirm before proof download. Do not export PII off-box.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Proof download requires confirm; status filter works.  
STATUS: NEW  

---

ACTION_ID: AUX-NAV-NO-OVERVIEW  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Add an Overview home for operators  
CATEGORY: navigation  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Default tab is enemies (4805). No last-write, draft count, or failed-query strip.  
SYSTEMS_AFFECTED: AdminDashboard  
RECOMMENDED_ACTION: HUMAN — Overview with entity counts, last saves, validation failures, shortcuts.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Overview does not mutate.  
STATUS: NEW  

---

ACTION_ID: AUX-DOMAIN-GAPS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Do not invent tabs for unimplemented domains  
CATEGORY: information-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Challenges are DEFAULT_CHALLENGES (challengeCompletion.ts:38–103). AI knobs live in gameConstants.ts. No formations/encounters/dungeons/spell-discovery/simulation/telemetry/audit admin APIs.  
SYSTEMS_AFFECTED: Future admin IA  
RECOMMENDED_ACTION: HUMAN — add a domain only with a real config API. Until then, Overview can list “hardcoded — not adminable.”  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if empty tabs are shipped  
VALIDATION_REQUIRED: No placeholder tabs.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-DEPENDENCY-VIEWS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Add relationship rails on entity editors  
CATEGORY: dependency-ux  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Boss phase spell chips are the only cross-link. Enemy regions are checkboxes. No spell→boss/achievement/challenge; no asset→usage.  
SYSTEMS_AFFECTED: All editors  
RECOMMENDED_ACTION: HUMAN — read-only dependency badges (SPELL→boss pools; ENEMY→regions/formations; ASSET→enemy/boss).  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-DOMAIN-GAPS  
REGRESSION_RISK: LOW if read-only  
VALIDATION_REQUIRED: Clicking a badge opens that entity; does not mutate.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-GLOBAL-SEARCH  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Add owner-only entity search  
CATEGORY: search  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: No search input in AdminDashboard. Lists are full stacks.  
SYSTEMS_AFFECTED: Admin chrome  
RECOMMENDED_ACTION: HUMAN — quick search over loaded configs (id/name). Not a player feature.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Jump to Enemies/Spells/Bosses by name.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-BULK-OPS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Bulk activate/deactivate when lifecycle exists  
CATEGORY: bulk-operations  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: One-at-a-time Edit/× only.  
SYSTEMS_AFFECTED: Entity lists  
RECOMMENDED_ACTION: HUMAN — after AUX-LIFE-NO-STATES. Confirm on any bulk delete.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-LIFE-NO-STATES; AUX-DEL-NO-CONFIRM  
REGRESSION_RISK: HIGH for bulk delete  
VALIDATION_REQUIRED: Bulk delete uses ConfirmDialog and lists count.  
STATUS: NEW  

---

ACTION_ID: AUX-LIST-NO-FILTER-SORT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Filter and sort entity lists  
CATEGORY: lists  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: EnemyList/SpellList/RegionList map arrays in store order with no controls.  
SYSTEMS_AFFECTED: Entity lists  
RECOMMENDED_ACTION: HUMAN — sort by name/level; filter spells by effectType / usableBy*.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Filter is client-side on already-loaded data.  
STATUS: NEW  

---

ACTION_ID: AUX-SPRITE-FR-LABELS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Use English owner-tool labels  
CATEGORY: terminology  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Sprite editor/delete used ANNULER / UTILISER. Now Cancel / Save Character / ConfirmDialog Cancel.  
SYSTEMS_AFFECTED: Player Sprites  
RECOMMENDED_ACTION: Keep English.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No FR verbs on sprite actions.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-SETTINGS-KITCHEN-SINK  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Split Settings into System Config vs Access  
CATEGORY: information-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: SettingsTab is transfer + dead “use Spells tab” card + partial LevelUpConfigPanel.  
SYSTEMS_AFFECTED: Settings  
RECOMMENDED_ACTION: HUMAN — Access (transfer) vs System Config (full LevelUpConfig). Remove the dead preset card.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-LEVELUP-PARTIAL  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Transfer still requires typing TRANSFER.  
STATUS: NEW  

---

ACTION_ID: AUX-LEVELUP-PARTIAL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Edit the full LevelUpConfig type  
CATEGORY: system-config  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Backend type includes statGrowthPercent, apMpLevelThreshold, spellLevelingBaseCost, multiplier, spellDmgGrowthPercent. UI saves four fields (max range, range growth, fail base, fail reduction) via localStorage then adminSetLevelUpConfig.  
SYSTEMS_AFFECTED: Settings; spell upgrade economy  
RECOMMENDED_ACTION: HUMAN — full field set; backend-authoritative read on mount.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-SETTINGS-KITCHEN-SINK  
REGRESSION_RISK: MEDIUM — costs/fail chance  
VALIDATION_REQUIRED: Loaded values match canister; missing fields do not default-overwrite.  
STATUS: NEW  

---

ACTION_ID: AUX-VISUALS-PALETTE-ONLY  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Do not treat Visuals as the asset studio  
CATEGORY: visual-assets  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: VisualsTab is paper vertex colors only.  
SYSTEMS_AFFECTED: Visuals tab  
RECOMMENDED_ACTION: Rename to “Map palette” or move under World. Put pools in a Visual Assets domain (AUX-ASSET-NO-POOL).  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15; AUX-ASSET-NO-POOL  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Palette save still works.  
STATUS: NEW  

---

ACTION_ID: AUX-BOSS-ABILITY-WALL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Searchable ability picker on bosses  
CATEGORY: edit-forms  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: PhaseEditor maps ALL_ABILITIES as chips (AdminDashboard ~6780+). Easy mis-toggle.  
SYSTEMS_AFFECTED: Bosses tab  
RECOMMENDED_ACTION: HUMAN — filterable picker; selected abilities listed first.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Existing ability arrays round-trip.  
STATUS: NEW  

---

ACTION_ID: AUX-MODIFIER-DOKA-MISPLACED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Move ground Doka / leader boost out of Map Modifiers  
CATEGORY: information-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: gameConfigDraft editor sits at the top of the modifiers tab.  
SYSTEMS_AFFECTED: Modifiers; economy  
RECOMMENDED_ACTION: HUMAN — move to System Config or Economy.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Save Config still writes AdminGameConfig.  
STATUS: NEW  

---

ACTION_ID: AUX-LANDING-EASTER-EGG  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Prefer the in-game Admin button over landing triple-click  
CATEGORY: discoverability  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: LandingPage.tsx ~714–728 triple-click v1.0; GameFlow.tsx 379–388 gated Admin button. Unauthenticated trigger shows Access Denied.  
SYSTEMS_AFFECTED: LandingPage; GameFlow  
RECOMMENDED_ACTION: REPORT_ONLY unless product wants the easter egg removed. Do not advertise admin on the player landing page.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Non-admin still cannot write.  
STATUS: NEW  

---

ACTION_ID: AUX-SHOP-SHARED-PRINCIPAL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Separate Grant and Ban principal fields  
CATEGORY: safety  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: shopPrincipalId is shared by Manual Doka Grant and Ban/Unban (~6488–6560).  
SYSTEMS_AFFECTED: Shop tab  
RECOMMENDED_ACTION: Two fields or an explicit mode toggle. Keep confirms.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-SHOP-NO-CONFIRM  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Granting does not leave Ban pointed at the same principal without a re-type.  
STATUS: NEW  

---

ACTION_ID: AUX-SAVE-FEEDBACK-SPLIT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: One save-feedback language  
CATEGORY: save-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: toast.success, saveStatus hex toast (top-right), “Saved!”, localStorage-only paths.  
SYSTEMS_AFFECTED: All admin writes  
RECOMMENDED_ACTION: HUMAN — toast + inline ● Saving… only. Drop raw #006400/#8B0000 toast.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Failed save is always an error toast with reason.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-SIMULATION  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Do not add a wallet-writing simulator  
CATEGORY: simulation  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: No sim surface. applyRewards / saveBattleStats are live persist funnels.  
SYSTEMS_AFFECTED: Future sim  
RECOMMENDED_ACTION: REPORT_ONLY — if built, read-only combat math preview; never call applyRewards.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if wired to persist  
VALIDATION_REQUIRED: Sim cannot change Doka/XP.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-TELEMETRY  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Owner telemetry is absent  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Quality Auditor AQA-2026-08-30-012. No admin Health tab.  
SYSTEMS_AFFECTED: Future Health tab  
RECOMMENDED_ACTION: HUMAN — backend-authoritative counters only, persist-lock safe. Not a player HUD.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AQA-2026-08-30-012  
REGRESSION_RISK: MEDIUM if counters invent a second wallet path  
VALIDATION_REQUIRED: Counters are query-only or enqueue on createProgressPersist.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-HEALTH-AUDIT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Config linter for orphan references  
CATEGORY: health-audit  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Boss spellPoolIds can name missing spells. Enemies can list deleted regions. No audit view.  
SYSTEMS_AFFECTED: Future Health tab  
RECOMMENDED_ACTION: HUMAN — read-only orphan report.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NO-DEPENDENCY-VIEWS  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Report does not mutate.  
STATUS: NEW  

---

ACTION_ID: AUX-CHALLENGES-HARDCODED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Challenges are not an admin domain yet  
CATEGORY: content-lifecycle  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: DEFAULT_CHALLENGES in challengeCompletion.ts:38–103. WorldExploration picks at random.  
SYSTEMS_AFFECTED: ChallengePanel; reward persist  
RECOMMENDED_ACTION: REPORT_ONLY until a canister ChallengeConfig exists. Do not add a fake tab.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: AUX-DOMAIN-GAPS  
REGRESSION_RISK: HIGH if UI writes challenges the combat predicates do not understand  
VALIDATION_REQUIRED: Any future admin challenge uses explicit condition metadata, not name heuristics.  
STATUS: NEW  

---

ACTION_ID: AUX-SPELL-DISCOVERY-MISSING  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Show acquisition routes on spells  
CATEGORY: dependency-ux  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: usableByPlayer / minLevel exist on SpellConfig; starterSpells is code. No discovery graph.  
SYSTEMS_AFFECTED: Spells  
RECOMMENDED_ACTION: HUMAN — read-only “Acquisition: starter / minLevel / enemy-usable” until a real discovery table exists.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-SPELL-FORM-MONOLITH  
REGRESSION_RISK: LOW if read-only  
VALIDATION_REQUIRED: Does not invent drops.  
STATUS: NEW  

---

ACTION_ID: AUX-ASSET-NO-POOL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Visual pools with weights and revert-to-default  
CATEGORY: visual-assets  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Enemy spriteUrl is [] | [string]. No weights, no activate/deactivate, no pool.  
SYSTEMS_AFFECTED: Enemies; bosses; sprites  
RECOMMENDED_ACTION: HUMAN — after a backend visual-pool type. Empty pool = Default Pixel Visual (valid).  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-VIS-NO-DEFAULT-DISTINCTION  
REGRESSION_RISK: MEDIUM — spawn/render  
VALIDATION_REQUIRED: Empty pool never shows as an error.  
STATUS: NEW  

---

ACTION_ID: AUX-HEX-VS-OKLCH  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Admin tokens are hex, not DESIGN.md OKLCH  
CATEGORY: visual-identity  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: C token object in AdminDashboard.tsx uses #13161f / #f0c44a. DESIGN.md forbids raw hex in components.  
SYSTEMS_AFFECTED: AdminDashboard  
RECOMMENDED_ACTION: REPORT_ONLY unless a shared admin token sheet is approved. Do not restyle the player HUD.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: AUX-THEME-SPLIT  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Player UI tokens unchanged.  
STATUS: NEW  

---

ACTION_ID: AUX-BTN-SMALL-TARGETS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Small delete hits are dense by design  
CATEGORY: responsive  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: Btn small is px-2.5 py-1 text-[10px]. App.tsx blocks width < 768.  
SYSTEMS_AFFECTED: Lists  
RECOMMENDED_ACTION: Keep density on desktop owner tool. Do not shrink player HUD targets.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: AUX-NO-MOBILE-ADMIN  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: None  
STATUS: NEW  

---

ACTION_ID: AUX-NO-BREADCRUMBS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Editor replaces the list with no crumb  
CATEGORY: navigation  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: editingEnemy swaps the whole pane to EnemyEditor.  
SYSTEMS_AFFECTED: Editors  
RECOMMENDED_ACTION: HUMAN — `Enemies / {name}` + Cancel.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Crumb returns to the list without save.  
STATUS: NEW  

---

ACTION_ID: AUX-SIDEBAR-COUNTS-INCOMPLETE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Sidebar counts omit most domains  
CATEGORY: information-density  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: Footer counts Enemies/Regions/Sprites/Spells only.  
SYSTEMS_AFFECTED: Sidebar  
RECOMMENDED_ACTION: HUMAN — after grouping, counts per group.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Counts match loaded query lengths.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-MOBILE-ADMIN  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Viewport guard blocks owner laptops under 768  
CATEGORY: responsive  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: App.tsx:323–336 SmallScreenGuard before any admin overlay.  
SYSTEMS_AFFECTED: App shell  
RECOMMENDED_ACTION: HUMAN — allow admin overlay above the guard for isAdmin, or raise the copy to “owner console needs ≥768.” Do not ship a player mobile HUD.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if the guard is lifted for players  
VALIDATION_REQUIRED: Non-admin still blocked under 768.  
STATUS: NEW

ACTION_ID: WDD-2026-08-31-001  
SOURCE_AUTOMATION: World Dynamics Designer (62dfc3fc-a494-11f1-a7d1-d6b4613131ce)  
TITLE: World feature catalog for indefinite variation  
CATEGORY: design  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Live world already has lava/ice/spikes, 22 map modifiers, Doka coins, and run portals. Long sessions re-roll the same three hazard tints and the same two-roll modifier pair. No rarity-weighted tile/encounter/event overlay exists.  
RECOMMENDED_ACTION: Keep `docs/WORLD_DYNAMICS.md` + `engine/worldFeatures.ts` as the contract. A later implementer may add a post-`finalizePlayableLayout` overlay that calls `pickWeightedFeatures`, then re-runs `evaluateSolvability`. Credits stay on `applyRewards`. Do not add level cutoffs.  
DEPENDENCIES: None  
REGRESSION_RISK: LOW while unwired. HIGH if placed inside `mapGen.ts` or `WorldExploration.tsx` without a solvability re-check.  
VALIDATION_REQUIRED: Catalog tests in `worldFeatures.test.ts` stay green. No feature id collides with `EXISTING_MAP_MODIFIER_IDS`. Death Realm rolls stay empty.  
STATUS: DESIGNED

ACTION_ID: LHIPS-2026-08-31-001  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Exponential XP thresholds vs linear kill XP create a practical progression wall  
CATEGORY: xp  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `xpForNextLevel` is `100 * 2^(N-1)` (`src/frontend/src/utils/xpCurve.ts` lines 10–13; Motoko twin `src/backend/main.mo` lines 1364–1371). Victory XP is `sum(enemy.level * 20)` (`src/frontend/src/utils/rewardResolver.ts` lines 82–94). Portal grant is 10 (`applyRewardsResult.ts` line 35). Legendary challenges are a flat 400–1000 XP (`challengeCompletion.ts` lines 60–101). 4000-sample sim: level 10 → ~78 three-enemy fights; level 25 → ~1.04e6 fights; level 50 → ~2.0e13 fights. Cumulative XP to reach 25 is 1.677e9.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 15–22 (synthetic; wall is obvious by 25)  
CAUSE: Thresholds double every level while kill XP is linear in enemy level (and enemy level itself later caps near 1000).  
PLAYER_EFFECT: After the mid-teens, intended combat/portal/challenge income cannot fund another level in any realistic session count. The game advertises no level cap but playable leveling ends.  
TECHNICAL_EFFECT: Leftover XP stays finite; `applyRewards` still accepts deltas that never wrap.  
SYSTEMS_AFFECTED: xpCurve, applyRewards, rewardResolver, challenge rewards, HUD leftover bar  
RECOMMENDED_ACTION: Do not retune the curve in this run. If a human wants infinite playable leveling, pick a sub-exponential threshold or level-relative kill XP and keep frontend/backend twins identical.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if the curve is changed without a paired Motoko + leftover-HUD update (off-by-one already blocked level-ups once).  
VALIDATION_REQUIRED: Re-run `longHorizonSim` fights-to-next at 10/15/25/50; leftover wrap tests in `xpCurve.test.ts`.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-002  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: IEEE-754 XP threshold becomes Infinity at level 1019 — implicit hard cap  
CATEGORY: technical  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `xpForNextLevel(1018)` is finite (~1.404e308). `xpForNextLevel(1019)` is `Infinity` (`100 * 2**1018`). `applyXpDelta(0, 1018, 1)` stays `{ newXp: 1, newLevel: 1018 }` because `1 >= Infinity` is false. Recap/HUD coerce canister `Nat` through `Number()` (`rewardResolver.ts` lines 204–207; `applyRewardsResult.ts` lines 27–31). Motoko `Nat` + `pow2` stay unbounded (`main.mo` 1367–1377) and can instruction-trap on a huge client `xpDelta`.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1018 (hard stop); Number precision on leftover is exact for `100*2^n` until overflow  
CAUSE: Frontend curve is a JavaScript Number. Canister curve is unbounded Nat. Serialization is Number.  
PLAYER_EFFECT: Even a debug-or-admin level-1018 character can never wrap leftover on the client path. Displayed XP/Doka/level become rounded or `null` once values exceed `Number.MAX_SAFE_INTEGER` / `MAX_VALUE`.  
TECHNICAL_EFFECT: Frontend/backend level disagreement; `JSON.stringify(Infinity)` is `null`; `saveBattleStats` / `applyRewards` payloads can no longer round-trip.  
SYSTEMS_AFFECTED: xpCurve, applyRewards, readApplyRewardsOk, deathPenalty `Number()`, UI leftover bar  
RECOMMENDED_ACTION: Keep BigInt (or decimal text) on the persist/HUD path for XP/level/Doka; add an iteration/size guard on Motoko `applyRewards` without changing the published curve.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-001  
REGRESSION_RISK: HIGH — persist funnel.  
VALIDATION_REQUIRED: `applyXpDelta` at 1018/1019; Candid round-trip of values `> 2^53`.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-003  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Enemy levels hard-stop near 1000 while the player does not  
CATEGORY: enemy-generation  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `pickEnemyLevelFromTiers` sets `maxTier = Math.floor(999 / tierSize)` (`combatMath.ts` lines 54–98). Default `tierSize` 10 → max same-tier band 991–1000. Adjacent / two-away do **not** clamp `maxTier` (lines 85–89), so samples at player 1000 reached 1020. Three-or-more **does** clamp (lines 94–97). At player 2500 and 5000, 100% of 4000 samples were below the player's tier; max stayed 1020. Config field `threeOrMorePercent` (default 5) is unused; leftover weight is 10% (`100-60-20-10`). Level-1 samples reached enemy level 80 (mean ~10.8).  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1 (up-spike to 80); 991+ (player outscales the cap)  
CAUSE: Hard-coded 999 ceiling plus asymmetric clamps and an ignored weight field.  
PLAYER_EFFECT: New characters can meet packs dozens of levels above them. Past ~1000 the overworld is exclusively under-level and no longer tracks the player.  
TECHNICAL_EFFECT: Relative-level stats, AI tier, and kill XP all freeze around the 1000 band.  
SYSTEMS_AFFECTED: combatMath.pickEnemyLevelFromTiers, WorldExploration generateEnemies (~6083–6215), dungeon `+ boost * tierSize`  
RECOMMENDED_ACTION: Do not retune weights here. If a human wants infinite relative encounters, replace the 999 ceiling with a player-relative window and honor `threeOrMorePercent`; clamp every branch the same way.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM — spawn distribution is globally visible.  
VALIDATION_REQUIRED: Monte Carlo at levels 1 / 1000 / 2500 (min/max/pBelow).  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-004  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Enemy RES/SR scale into 100% reduction while player offense stays flat  
CATEGORY: enemy-stats  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Live combat HP is `floor(50 * (1 + (L-1)*0.05))` (`WorldExploration.tsx` 3424–3431). Derived stats are `roll(min, max+k*level) * pieceMult` (`progression.ts` 175–186). Damage applies `max(0, 1 - RES/100)` and the same for SR (`spellEngine.ts` 393–407; player path `WorldExploration.tsx` 3266–3271) then `Math.max(1, round(dmg))`. First level a max roll can hit RES 100: rook 78, knight 84, king 107, pawn 126, queen 143, bishop 154. SR 100: rook 79. Player `getPlayerBaseStats` only grows AP/MP/HP — not SP. Spell upgrades are +3%/level (`combatMath.calcScaledDamage`). Spawn placeholder damage `L*2+3` (6207) is overwritten for HP at battle start (12236–12240) but still describes the linear melee slope.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 78 (rook can roll immunity); chip-to-1 is guaranteed after that  
CAUSE: Percent-as-absolute RES/SR grow linearly with level; player SP does not. Floor of 1 prevents true zero but TTK becomes “chip forever.”  
PLAYER_EFFECT: Mid-high tanks become sponges. Player kits do not grow into them. One-shot risk from scaled enemy melee/SP rises on the same schedule.  
TECHNICAL_EFFECT: Degenerate `resFactor=0` / `srFactor=0`. Family spawn writes (0.05–0.75) are overwritten at battle start (12127–12168) so they do not save this.  
SYSTEMS_AFFECTED: progression.getEnemyBaseStats, spellEngine, WorldExploration playerTakesDamage / calcEnemyMaxHp  
RECOMMENDED_ACTION: Report only. A later design pass must decide whether RES is a 0–100% budget or a flat stat — not both.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-006  
REGRESSION_RISK: HIGH — this is live damage math; do not patch it from this automation.  
VALIDATION_REQUIRED: Rook RES max at 78; frost TTK vs linear enemy HP at 50/100/250.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-005  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Three player-HP formulas diverge; victory floor exceeds max HP at level 10  
CATEGORY: enemy-stats  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Live `maxHp` is linear `floor(100 * (1 + (L-1)*g))` (`WorldExploration.tsx` 3255–3261). Canonical `getPlayerBaseStats` is compounding `round(100 * (1+g)^(L-1))` (`progression.ts` 74–80) and is used for battle AP/MP (12367–12382) but **not** HP. `respawnHpAfterDeath` is 50% of the linear curve (`deathPenalty.ts` 103–113). `victoryResourceFloor.hp` is `50 + level*10` (`deathPenalty.ts` 116–127). Sim: level 10 linear 145 vs victory floor 150; level 100 linear 595 vs exponential 12,524 vs floor 1,050. `updateCharacter` HP cap is `level*200+100` (`main.mo` 216) — linear stays under it; exponential would not.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 10 (floor > maxHp); 100 (formulas already 21× apart)  
CAUSE: “Source of truth” HP was never wired; leftover post-battle floor is a third linear.  
PLAYER_EFFECT: Victory/respawn can write current HP above the HUD max. Debug logs already warn on AP/MP divergence (12384–12398); HP is silently split.  
TECHNICAL_EFFECT: Persist vs battle init disagree; exponential HP at 500 is 3.7e12 and would fail `updateCharacter` if ever used.  
SYSTEMS_AFFECTED: progression.getPlayerBaseStats, WorldExploration maxHp, deathPenalty, saveBattleStats  
RECOMMENDED_ACTION: Pick one HP curve and delete the others. Do not do that in this run.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH — HP persist / Death Realm / recap hydrate.  
VALIDATION_REQUIRED: maxHp vs victory floor vs getPlayerBaseStats.hp at 1/10/50/100.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-006  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: AI tier randomizes 30% into 1–10 at every level and saturates by 900  
CATEGORY: ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `computeAITier` (`combatMath.ts` 34–51) maps level → tier 1..10 then with probability 0.3 replaces it with `floor(random()*10)+1`. WX uses `aiTier >= 5` for post-leader erratic (15505–15517) and `>= 10` for 5% betrayal (15592–15596). `ENEMY_AI_TIER_GATES.instantKill` (9) and most other gates in `gameConstants.ts` 200–209 are unused by `enemyAI.ts`. 4000-sample sim: enemy level 1 is already ~3% betrayal-eligible and ~19% erratic-eligible; level 901+ is ~73% tier 10.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1 (leak); 151 (erratic majority); 901 (betrayal majority)  
CAUSE: Variance is a uniform 1–10 draw, not a ±1 band. Tier table stops at 10.  
PLAYER_EFFECT: Early packs can betray / go erratic. Late packs almost all run max sophistication; 30% still roll down to tier 1. Advanced AI does not keep unlocking after 900.  
TECHNICAL_EFFECT: Extra WX branches on a large fraction of turns; `Math.random` is unseeded (not deterministic).  
SYSTEMS_AFFECTED: computeAITier, WorldExploration enemy-turn erratic/betrayal, unused ENEMY_AI_TIER_GATES  
RECOMMENDED_ACTION: Report only. If tuned later, variance should be a small offset and unused gates should be deleted or wired — not both left live.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: P(tier=10) at enemy levels 1 and 901.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-007  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Enemy kits never leave zone 0 because the call site passes a LevelZone object  
CATEGORY: spell-pools  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `buildEnemyKit(piece, levelZone: number)` (`enemyAI.ts` 156–193) uses `z >= 1` / `z >= 2`. Battle start calls `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WorldExploration.tsx` 12186). `GameMap.levelZone` is `any` (line 456) and is assigned `{ name, minLevel, maxLevel }` (5064–5068). `Math.floor(object)` is `NaN`; every `z >= n` is false. Live-call-site sim at a Tier 25 object returns only the zone-0 kit (queen/king = `starter-frost`, no Inferno). If the object were a number, kits would saturate at zone 2 (player level 21+): every queen/king would hold the same Inferno pair. Comment at 12181 (“10 random spells”) is stale.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1 (bug is current); intended saturate 21  
CAUSE: Object passed where a zone index is required; `any` hides it from tsc.  
PLAYER_EFFECT: High-level enemies never receive the documented advanced kit. Role identity is the zone-0 stub (knight = Strike only) at every progression depth. Rarity cannot collapse because upgrades never fire.  
TECHNICAL_EFFECT: Dead kit branches; Inferno/iron-skin/venom exist in data but are not assigned by the kit path.  
SYSTEMS_AFFECTED: enemyAI.buildEnemyKit, WorldExploration assignEnemySpells  
RECOMMENDED_ACTION: Pass `currentZoneTier` or `playerTier` (a number). Do not implement in this run.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM — fixing it suddenly upgrades every late pack.  
VALIDATION_REQUIRED: `buildEnemyKit("queen", currentMap.levelZone)` vs `buildEnemyKit("queen", 2)`.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-008  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Entire frontend spell catalog is owned at character create — no discovery pacing  
CATEGORY: spell-discovery  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `starterSpells` in `data/spellData.ts` is the full 32-id catalog (Strike through summon-wisp). WX marks every starter as `isBaseSpell` and unions **all** backend spells into `ownedSpells` (2238–2271). There is no drop table, rarity roll, duplicate-discovery handler, or `minLevel` gate on these defs. Admin-authored backend spells become globally owned on the next fetch.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1  
CAUSE: Discovery was never implemented; the catalog is the starter set.  
PLAYER_EFFECT: Nothing left to discover. Rare/advanced identity cannot exist on the player path. Exhaustion is immediate, not a late-game event.  
TECHNICAL_EFFECT: Spell bar init writes the first 8 owned ids (2447). Duplicate ids collapse in the Map.  
SYSTEMS_AFFECTED: spellData, ownedSpells, spellBarOrder  
RECOMMENDED_ACTION: Report only. A discovery system would be a new feature, not a hotfix.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW for a report; HIGH if starters are stripped without a drop path.  
VALIDATION_REQUIRED: `ownedSpells.length` on a fresh character vs `starterSpells.length`.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-009  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Summoner chance hits 100% at player level 44  
CATEGORY: ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `summonerChance = 0.12 + characterStats.level * 0.02` (`WorldExploration.tsx` 12198–12208; constants `gameConstants.ts` 298–301). `0.12 + 44*0.02 = 1`. Sim: level 25 = 62%; level 50+ = 100%. Cap is 2 live summons, cooldown 2 turns. Dungeon depth adds up to +5 extras on a 1–8 base pack.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 44  
CAUSE: Linear chance with no clamp and a per-level (not per-zone) term.  
PLAYER_EFFECT: Every late overworld enemy is a summoner. Board complexity and AI work saturate and stay there forever.  
TECHNICAL_EFFECT: Extra combatants every fight; turn AI + occupancy pressure on a 16×16 grid.  
SYSTEMS_AFFECTED: battle-start summoner roll, summonSpawn, enemyAI summoner archetype  
RECOMMENDED_ACTION: Clamp the chance. Do not implement here.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-006  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: chance at 1 / 44 / 100.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-010  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Boss HP/ATK are static; +5 level and Guide 1.08^diff are not combat  
CATEGORY: bosses  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Boss spawn uses `bossConf.baseStats.hp` (typically 350–400) and `atk` (~35), `res/sp` clamped to 50, `level = playerLevel + 5` (`WorldExploration.tsx` 6990–7018). Battle start re-applies `bossConf.baseStats.hp` (12235–12240). `getBossEffectiveStats` (`progression.ts` 290–338, `1.08^diff`) is Guide-only and at diff +5 shows 514 HP vs combat 350. Dungeon depth extras/tier boosts saturate at depth 5 (`6082–6083`; multipliers `[1,1.5,2,2.5,3,4]`). Reward 3× XP / 5× Doka on a static ~350 HP sponge.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: ~50 (player linear HP ≈ boss HP); trivial as a threat by ~100; still a long chip fight if RES 50%  
CAUSE: Absolute boss stats; relative-level curve never applied in the spawn/combat path.  
PLAYER_EFFECT: Early bosses are lethal. Late bosses are long, low-threat, and pay a flat multiplier that still cannot beat the XP wall (001).  
TECHNICAL_EFFECT: Guide table disagrees with the fight. `setBossConfig` rejects AP > 20 (`main.mo` 2072–2074) while player formula AP exceeds 20 at 325 (013).  
SYSTEMS_AFFECTED: boss spawn, BossGuideModal, portalRules dungeon multipliers  
RECOMMENDED_ACTION: Report only. Do not scale bosses from this automation.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-001, LHIPS-2026-08-31-005  
REGRESSION_RISK: HIGH if Guide and combat are “fixed” independently.  
VALIDATION_REQUIRED: Pale Archbishop HP at player 1 vs 100 vs Guide row +5.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-011  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Flat challenge damage caps become impossible once a single hit exceeds them  
CATEGORY: bosses  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `under_50_damage` / `no_healing_under_30_damage` (`challengeCompletion.ts` 54–65, 114–117). Spawn/melee placeholder `round(L*2+3)` exceeds 30 at level 14 and 50 at level 24. Legendary 1000 XP is already rounding error vs the level-15 threshold (1.64e6).  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 14 (30-damage); 24 (50-damage)  
CAUSE: Absolute damage budgets vs linearly growing hits.  
PLAYER_EFFECT: Hard/legendary “don’t get hit much” objectives disappear for anyone who takes one hit. Easy under-15-turns remains skill-based.  
TECHNICAL_EFFECT: Challenge XP/Doka stop being a progression valve exactly when the XP wall (001) would need them.  
SYSTEMS_AFFECTED: challengeCompletion, handleBattleEnd persist entries  
RECOMMENDED_ACTION: If revisited, scale the cap with `linearPlayerMaxHp` or `% of maxHp`. Not in this run.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: `spawnPlaceholderDamage(14)` and `(24)` vs challenge predicates.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-012  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Jackpot Doka EV dominates the wallet; recap leftover uses the wrong XP curve  
CATEGORY: economy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Victory Doka (`WorldExploration.tsx` 12649–12678): `roll < 0.0001` is a **0.01%** band (comment says 0.0001%) granting `1..1e9 * enemy.level` with no level clamp. Expected jackpot term ≈ `0.0001 * 5e8 * L ≈ 5e4 * L` Doka/enemy — orders of magnitude above the 90% `1–3` band. Backend `calculateAndAwardDoka` clamps level at 200 (`main.mo` 2203) but live persist uses the frontend roll + `applyRewards`. Recap sets `xpForNextLevel: (characterStats.level || 1) * 100` (12719, 12891, 13110, 13407) while the HUD leftover uses `100 * 2^(L-1)`. Death penalty goes through `Number()` (`deathPenalty.ts` 23–26). Dungeon ×4 and Doka Fever ×2 compose on the same roll.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1 (jackpot exists); display lie is visible by 4+  
CAUSE: A near-billion multiplier on a mislabeled 0.01% band; recap still has the pre-curve leftover formula.  
PLAYER_EFFECT: Economy is lottery-driven. Recap bar is wrong (PR #108 is leftover HUD, not these recap literals). Death/UI precision will fail at extreme Nat values (002).  
TECHNICAL_EFFECT: One jackpot can exceed shop/upgrade sinks (`upgradeSpell` doubles from base 10). `Number(newDoka)` loses integers above 2^53.  
SYSTEMS_AFFECTED: handleBattleEnd Doka roll, PostBattleRecap, applyRewards, deathPenalty  
RECOMMENDED_ACTION: Report only. Do not retune jackpot here. Recap leftover literals are a display-only candidate if a human picks this ID.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-002  
REGRESSION_RISK: HIGH for jackpot retune (wallet); LOW for recap leftover text.  
VALIDATION_REQUIRED: EV of the frontend Doka table; recap `xpForNextLevel` vs `xpForNextLevel(level)`.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-013  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Formula AP/MP exceed persist caps; saveBattleStats will write any level  
CATEGORY: technical  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Battle AP/MP = `8 + floor(L/25)` / `4 + floor(L/25)` (`progression.ts` 66–72). `updateCharacter` rejects AP/MP > 20 and HP > `L*200+100` (`main.mo` 216–225). First AP > 20 at level 325. `saveBattleStats` writes client `level` / `xp` / `maxAp` with no curve check and no AP cap (1285–1342). Spell fail hits 0 at 201 (`WorldExploration.tsx` 3464–3468). Spell range is `min(base + floor(L/10), maxSpellRange=5)` (3471–3479) — saturated by the teens.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 201 (fail=0); 325 (AP persist reject); any (unconstrained saveBattleStats.level)  
CAUSE: Persist validators and the live formula were not updated together. Absolute level write bypasses the XP curve, so synthetic extreme levels are a supported persist shape.  
PLAYER_EFFECT: A 325+ character can fight with AP 21+ and fail to save that budget. Fail chance and range stop being progression knobs much earlier.  
TECHNICAL_EFFECT: Official-client trust on `saveBattleStats.level` means the 1000-enemy cap / Infinity XP failures are reachable without grinding 001.  
SYSTEMS_AFFECTED: updateCharacter, saveBattleStats, getPlayerBaseStats, spell fail/range  
RECOMMENDED_ACTION: Architecture decision, not a silent clamp. Do not implement here.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-08-31-002  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: formula AP at 300/325; saveBattleStats with a mismatched level (test-only).  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-08-31-014  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: No player telemetry — model cannot be calibrated  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Same gap as AQA-2026-08-30-012. Leaderboard exposes `level` / `killCount` / `achievementsCompleted` (`main.mo` 2527) but this environment has no populated series, no encounter-relative-level log, no battle-duration, death-rate, discovery, elite, or advanced-AI counters. Elite flags do not exist. Family 30% (`WorldExploration.tsx` 6236–6326) is cosmetic after battle-start overwrite (12127).  
FIRST_APPROXIMATE_PROBLEM_LEVEL: n/a (process)  
CAUSE: No backend-authoritative outcome counters.  
PLAYER_EFFECT: None directly. Future runs will keep treating the synthetic wall at 15–22 as unconfirmed vs live play.  
TECHNICAL_EFFECT: This file must not claim CLEAR_POSITIVE_SIGNAL about real pacing.  
SYSTEMS_AFFECTED: leaderboard query, OQL (no progression events), automations  
RECOMMENDED_ACTION: Human-designed counters only (persist-ok, victory-paid, death-penalty, max/median level). Do not invent gameplay math.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: AQA-2026-08-30-012  
REGRESSION_RISK: MEDIUM if counters leave the persist lock.  
VALIDATION_REQUIRED: Next LHIPS run either cites live max/median level or repeats “still no telemetry.”  
STATUS: NEW

ACTION_ID: MAA-2026-08-31-001  
TITLE: Small-screen overlay hard-locks phones with no continue path  
CATEGORY: mobile-blocker  
PRIORITY: P0  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/App.tsx  
CURRENT_BEHAVIOUR: Width < 768 unmounted the entire game. Landscape→portrait also tore down live battle state.  
DESIRED_BEHAVIOUR: Warn, then Continue. Once a session has rendered at a supported width or the player continues, do not unmount on rotate.  
EVIDENCE: App.tsx SmallScreenGuard had no dismiss; `if (isSmallScreen) return` replaced the game tree.  
RECOMMENDED_ACTION: Keep the Continue + session bypass shipped this run. Do not restore a hard lock.  
AUTONOMY:  
- SAFE_TO_AUTO_IMPLEMENT  
REGRESSION_RISK: LOW — warning still shows on first narrow load.  
VALIDATION_REQUIRED: Phone portrait shows Continue; after Continue the world loads; landscape→portrait does not remount.  
STATUS: IMPLEMENTED  

---

ACTION_ID: MAA-2026-08-31-002  
TITLE: Canvas touchend plus click can double-cast or double-walk  
CATEGORY: combat-parity  
PRIORITY: P0  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/utils/pointerParity.ts  
CURRENT_BEHAVIOUR: Canvas had onClick and onTouchEnd. preventDefault ran after an early return, so a synthetic click could repeat the same cast/walk.  
DESIRED_BEHAVIOUR: Stamp touchend, ignore the following synthetic click for 500ms, preventDefault first.  
EVIDENCE: handleCanvasClick + handleCanvasTouch both called executeCastAttempt / applyBattleWalkHazards.  
RECOMMENDED_ACTION: Keep shouldIgnoreSyntheticClickAfterTouch at the click gate.  
AUTONOMY:  
- SAFE_TO_AUTO_IMPLEMENT  
REGRESSION_RISK: MEDIUM — a real mouse click within 500ms of a touch is ignored; expected on hybrid devices.  
VALIDATION_REQUIRED: One finger tap walks/casts once; mouse click still works after 500ms.  
STATUS: IMPLEMENTED  

---

ACTION_ID: MAA-2026-08-31-003  
TITLE: World-mode portal walk legality differed between mouse and touch  
CATEGORY: combat-parity  
PRIORITY: P1  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/utils/pointerParity.ts  
CURRENT_BEHAVIOUR: Touch blocked portal tiles while inBattleRef was true in the world branch; mouse did not.  
DESIRED_BEHAVIOUR: Identical shouldBlockWorldMoveOntoPortal helper on both paths.  
EVIDENCE: Touch world branch used inBattleRef + portals.some; mouse world branch had no portal check.  
RECOMMENDED_ACTION: Keep the shared helper.  
AUTONOMY:  
- SAFE_TO_AUTO_IMPLEMENT  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: pointerParity tests; in-battle stale-ref portal tile is blocked for both inputs.  
STATUS: IMPLEMENTED  

---

ACTION_ID: MAA-2026-08-31-004  
TITLE: Canvas allowed browser pan/zoom on mobile  
CATEGORY: gestures  
PRIORITY: P1  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/index.css; src/frontend/index.html  
CURRENT_BEHAVIOUR: Canvas lacked touch-none. Media query set touch-action: pan-x pan-y. Viewport had no viewport-fit=cover.  
DESIRED_BEHAVIOUR: Game canvas touch-action none; buttons manipulation; viewport-fit=cover.  
EVIDENCE: index.html viewport; index.css mobile canvas rule; canvas className was only cursor-pointer.  
RECOMMENDED_ACTION: Keep touch-none + inline touchAction none.  
AUTONOMY:  
- SAFE_TO_AUTO_IMPLEMENT  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Finger drag on canvas does not scroll/zoom the page.  
STATUS: IMPLEMENTED  

---

ACTION_ID: MAA-2026-08-31-005  
TITLE: Interactive chrome below 44px  
CATEGORY: touch-targets  
PRIORITY: P1  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/index.css; BattleUIPanel; ChallengePanel; CharacterSelection; PostBattleRecap; GameFlow; DraggablePanel  
CURRENT_BEHAVIOUR: stone-nav-btn 36px; Walk/Attack/Flee/End Turn py-1; challenge Accept 4px padding; recap close 28px; edit/delete 40px.  
DESIRED_BEHAVIOUR: DESIGN.md — interactive targets ≥44px on mobile, without a visual redesign.  
EVIDENCE: DESIGN.md line 74; measured class heights.  
RECOMMENDED_ACTION: Keep mobile min 44px utilities. Do not enlarge desktop chrome further.  
AUTONOMY:  
- SAFE_TO_AUTO_IMPLEMENT  
REGRESSION_RISK: LOW — mobile-only min size.  
VALIDATION_REQUIRED: At 390px width, battle actions and nav buttons measure ≥44px.  
STATUS: IMPLEMENTED  

---

ACTION_ID: MAA-2026-08-31-006  
TITLE: Dual top bars hide Center, Enemies, region, and dungeon chain  
CATEGORY: hud-overlap  
PRIORITY: P1  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx  
CURRENT_BEHAVIOUR: GameFlow stone-top-bar is z-index 9000 and 48px. WorldExploration has its own 44px bar at z-index 100. Unique WX controls sit under the GameFlow bar. Canvas top is 44px so the GameFlow bar overlaps 4px of the map (more with safe-area).  
DESIRED_BEHAVIOUR: One top bar that includes camera-center, enemy register, region, and dungeon-chain, with canvas inset matching the live bar height.  
EVIDENCE: GameFlow.tsx game-mode header; WX top bar at top:0 height 44px and canvas top:44px.  
RECOMMENDED_ACTION: Human-approved merge of the two bars. Do not auto-redesign.  
AUTONOMY:  
- HUMAN_APPROVAL_REQUIRED  
REGRESSION_RISK: HIGH — layout + shop/doka chrome.  
VALIDATION_REQUIRED: Portrait and landscape; Center and Enemies reachable; canvas not under the bar.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-007  
TITLE: Battle footer is a saved DraggablePanel, not a sticky viewport dock  
CATEGORY: sticky-battle-controls  
PRIORITY: P1  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/components/BattleUIPanel.tsx; src/frontend/src/components/DraggablePanel.tsx  
CURRENT_BEHAVIOUR: Battle UI default y is innerHeight-220 and persists. On a short landscape viewport it can cover the map or sit off-screen until this run’s resize clamp. DESIGN.md wants the bottom menu stuck to the viewport.  
DESIRED_BEHAVIOUR: On narrow viewports, pin battle spells/actions to the bottom safe-area and disable drag, or offer a docked mobile layout.  
EVIDENCE: DESIGN.md line 74; BattleUIPanel defaultPosition; no mobile dock branch.  
RECOMMENDED_ACTION: Design a docked mobile battle chrome. Resize clamp from this run is only a stopgap.  
AUTONOMY:  
- HUMAN_APPROVAL_REQUIRED  
REGRESSION_RISK: HIGH — persisted uiLayout.  
VALIDATION_REQUIRED: Portrait and landscape battle; controls remain visible after rotate.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-008  
TITLE: Spell and status details are hover-only title tooltips  
CATEGORY: hover-only  
PRIORITY: P1  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: BattleUIPanel.tsx; StatusEffectBadge.tsx; SpellbookModal.tsx; InitiativeStrip.tsx  
CURRENT_BEHAVIOUR: Spell slots, leader crown, AP/MP, and effect descriptions live in title= / native hover. Touch has no hover; long-press OS tooltip is unreliable.  
DESIRED_BEHAVIOUR: Tap-to-inspect or a persistent detail sheet that works with touch and keyboard.  
EVIDENCE: BattleUIPanel spellTitle title=; StatusEffectBadge title= for description.  
RECOMMENDED_ACTION: Reuse StatPopup / inspect for spells and effects on tap. Do not rely on CSS :hover.  
AUTONOMY:  
- HUMAN_APPROVAL_REQUIRED  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Touch tap shows spell text; keyboard focus shows the same.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-009  
TITLE: Forced inspect via long-press / right-click is documented but missing  
CATEGORY: combat-ux  
PRIORITY: P2  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: BattleUIPanel.tsx comments; WorldExploration.tsx  
CURRENT_BEHAVIOUR: Comments say chip inspect is suppressed when a spell is selected and forced inspect is right-click / long-press. No contextmenu or long-press handler exists.  
DESIRED_BEHAVIOUR: Implement the documented path, or update the comments and provide another inspect path while a spell is selected.  
EVIDENCE: Grep found no onContextMenu / long-press in WorldExploration.  
RECOMMENDED_ACTION: Add pointer-type-aware long-press (≥500ms) and contextmenu inspect that does not cast.  
AUTONOMY:  
- HUMAN_APPROVAL_REQUIRED  
REGRESSION_RISK: MEDIUM — must not steal casts.  
VALIDATION_REQUIRED: Spell selected + long-press opens inspect; tap still casts.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-010  
TITLE: Sprite hit padding is 10px mouse vs 14px touch  
CATEGORY: combat-parity  
PRIORITY: P2  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx  
CURRENT_BEHAVIOUR: hitTestSprite uses 10px on click and 14px on touch. Live cast gates match after a target is chosen, but the chosen entity can differ at the same client point.  
DESIRED_BEHAVIOUR: Same padding, or a documented finger-slop policy that still prefers the front-most legal target.  
EVIDENCE: handleCanvasClick hitTestSprite(..., 10); handleCanvasTouch hitTestSprite(..., 14).  
RECOMMENDED_ACTION: Report-only until a targeting owner picks one padding.  
AUTONOMY:  
- REPORT_ONLY  
REGRESSION_RISK: MEDIUM if unified blindly.  
VALIDATION_REQUIRED: Overlapping sprites at the same client point resolve to the same combatant.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-011  
TITLE: useIsMobile is width-only so landscape phones lose MOBILE_ZOOM  
CATEGORY: viewport-scaling  
PRIORITY: P2  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: src/frontend/src/hooks/use-mobile.tsx; WorldExploration.tsx MOBILE_ZOOM 1.75  
CURRENT_BEHAVIOUR: isMobile is innerWidth < 768. A phone in landscape often becomes “desktop” tiles.  
DESIRED_BEHAVIOUR: Treat coarse pointers / hover:none as mobile for zoom, or use a min(width,height) breakpoint.  
EVIDENCE: use-mobile.tsx; WX effectiveTileW = TILE_WIDTH * MOBILE_ZOOM when isMobile.  
RECOMMENDED_ACTION: Human-approved input-mode heuristic. Do not change tile math in this audit.  
AUTONOMY:  
- HUMAN_APPROVAL_REQUIRED  
REGRESSION_RISK: HIGH — camera / tile size.  
VALIDATION_REQUIRED: Same phone portrait and landscape keep readable tiles.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-012  
TITLE: Hover tile / enemy preview has no touch equivalent  
CATEGORY: hover-only  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
FILES_OR_SYSTEMS: WorldExploration handleCanvasMouseMove  
CURRENT_BEHAVIOUR: hoveredTile and hoveredEnemyId update only on mousemove.  
DESIRED_BEHAVIOUR: Touch-and-hold preview, or rely solely on range highlights (already computed).  
EVIDENCE: handleCanvasMouseMove; no touchmove hover path.  
RECOMMENDED_ACTION: Report-only; range highlights already cover legality.  
AUTONOMY:  
- REPORT_ONLY  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Touch players can see legal tiles without hover.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-013  
TITLE: Initiative HP is color-only; muted gold/dim text may miss 4.5:1  
CATEGORY: contrast-status  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
FILES_OR_SYSTEMS: BattleUIPanel stone-battle-hp-bar; index.css --dofus-text-dim; GameFlow #8a8090  
CURRENT_BEHAVIOUR: Chip HP is a red bar with no numeric text. Dim labels use ~0.45 lightness / #8a8090 on navy. DESIGN.md requires color + text and 4.5:1 gold-on-navy.  
DESIRED_BEHAVIOUR: HP number or percent on chips; raise dim text to a passing pair.  
EVIDENCE: DESIGN.md lines 75–76; chip bar has no text node.  
RECOMMENDED_ACTION: Add compact HP text; audit OKLCH pairs. Not a redesign of the bar.  
AUTONOMY:  
- HUMAN_APPROVAL_REQUIRED  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Contrast checker + screen reader name includes HP.  
STATUS: NEW  

---

ACTION_ID: MAA-2026-08-31-014  
TITLE: Landing and profile still use 100vh  
CATEGORY: viewport-scaling  
PRIORITY: P3  
CONFIDENCE: HIGH  
FILES_OR_SYSTEMS: LandingPage.tsx; ProfileSetup.tsx  
CURRENT_BEHAVIOUR: minHeight 100vh clips under iOS URL bars.  
DESIRED_BEHAVIOUR: 100dvh / 100% of #root.  
EVIDENCE: LandingPage and ProfileSetup style minHeight: 100vh.  
RECOMMENDED_ACTION: Swap to 100dvh with 100vh fallback.  
AUTONOMY:  
- SAFE_TO_AUTO_IMPLEMENT  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: iOS Safari login and profile screens fill the visible viewport.  
STATUS: NEW

ACTION_ID: GFCF-2026-08-31-001  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Anchor damage numbers and death shatter in screen space  
CATEGORY: combat-feedback  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `enemyTakesDamage` and both heal callbacks called `spawnDamageNumber(0, 0, …)` (pre-fix ~3352, ~9570, ~15007). `deathPipeline.triggerShatter` passed board `pos.x/y` straight into `EffectsManager.triggerDeath`. Leader death particles used `tileCenter` but shatter used raw `tileX, tileY`. `EffectsManager.draw()` plots in canvas/CSS space. Post-fix wiring: `spawnDamageAtTile` at WX 3305 / 3371 / 9604 / 15065; `triggerDeathAtTile` at 9449 / 17152.  
SYSTEMS_AFFECTED: `engine/combatJuice.ts`; `engine/effects.ts` (unchanged API); `WorldExploration.tsx` call sites only  
RECOMMENDED_ACTION: IMPLEMENT. Helper `spawnDamageAtTile` / `triggerDeathAtTile` + `tileCenterRef`. Also spawn a player damage number from `playerTakesDamage` when `dmg > 0` (same helper).  
AUTONOMY: IMPLEMENTED_THIS_PR  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — presentation coordinates only. Residual: numbers are screen-space at spawn time and will not track camera mid-float (same as existing float text).  
VALIDATION_REQUIRED: Hit an enemy via DoT/`enemyTakesDamage` and a heal; confirm the floater rises from the sprite. Kill a regular enemy; shatter on the corpse tile, not the HUD corner. `node --test src/frontend/src/engine/combatJuice.test.ts`.  
STATUS: IMPLEMENTED  

---

ACTION_ID: GFCF-2026-08-31-002  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Show player-facing reject copy instead of engine tokens  
CATEGORY: combat-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Sprite-click and live-cast rejects floated `_live.reason` verbatim (`ground_los_blocked`, `line_below_min_range`, …). Entity-first mouse reject used generic `"invalid target"` while the reason was already known. Empty-tile miss (`!spellTiles.has`) returned with **no** float. Post-fix: `playerFacingRejectReason` at WX 10427 / 10505 / 10666 / 11108 / 11162 / 11280; `"Out of range"` at 10727 / 11293.  
SYSTEMS_AFFECTED: `engine/rejectCopy.ts`; float-text call sites in `WorldExploration.tsx`  
RECOMMENDED_ACTION: IMPLEMENT. `playerFacingRejectReason` map; float `"Out of range"` on spell-tile miss. Leave `recordClickOutcome` tokens raw (DEV). Walk-unreachable / no-MP silence is a separate ID.  
AUTONOMY: IMPLEMENTED_THIS_PR  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — copy only. Unknown future tokens fall back to “Invalid target”.  
VALIDATION_REQUIRED: Cast a line spell off-axis and a blocked LoS tile; floats must be English. Click a blue-range-adjacent empty tile; “Out of range”. `node --test src/frontend/src/engine/rejectCopy.test.ts`.  
STATUS: IMPLEMENTED  

---

ACTION_ID: GFCF-2026-08-31-003  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Delegate player-spell IMPACT juice from applyDamageToEnemy  
CATEGORY: combat-feedback  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `resolvePlayerCast` → `applyDamageToEnemy` (`castHelpers.ts` ~265–478) applies HP, log, `critical_hit` / `spell_hit` sounds, bounce via `enemyTakesDamage`. It never calls `spawnDamageNumber`, `triggerHitFlash`, `triggerShake`, or `triggerHitStop`. The fallback `enemyTakesDamage` path *does*. Primary player hits therefore feel quieter than bounces and DoT ticks. Hover preview (`WorldExploration.tsx` ~8570–8611) already shows `-dmg` using non-crit `computeDamage`.  
SYSTEMS_AFFECTED: `engine/castHelpers.ts`; optional juice callback on the existing deps bundle; `EffectsManager`  
RECOMMENDED_ACTION: Add an optional `onDamageJuice({ tileX, tileY, amount, isCrit, targetId })` to `applyDamageToEnemy` deps. WorldExploration implements it with `spawnDamageAtTile` + flash/shake/hitstop. Do not change `calculatePlayerDamage`. Do not add a second HP write.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-001 (screen-space helper now exists)  
REGRESSION_RISK: MEDIUM if the callback re-applies damage or double-spawns on the bounce path (bounces already juice via `enemyTakesDamage`).  
VALIDATION_REQUIRED: Cast a damaging spell and a crit; number + flash on the target. Bounce must not double-number. Playtest vs #105 if still open (do not fork targeting).  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-004  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Draw armed hit-flash on combatant sprites  
CATEGORY: combat-feedback  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `triggerHitFlash` is called for player (~3304) and enemy (~3369). `getHitFlashAlpha` (`effects.ts` ~331–337) has **zero** call sites outside `effects.ts`. 120ms flash is computed and discarded. IMPACT is shake (if wired) without a readable hit on the body.  
SYSTEMS_AFFECTED: entity draw pass in `WorldExploration.tsx`; `EffectsManager.getHitFlashAlpha`  
RECOMMENDED_ACTION: In the existing combatant/player draw (not the RAF scheduler), multiply overlay alpha by `getHitFlashAlpha(id)`. White/crimson tint only. No new particles.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-003 so player spells actually arm flash  
REGRESSION_RISK: LOW–MEDIUM — must not change `requestAnimationFrame` timing (`AGENTS.md` RAF freeze). Overlay only inside the current draw pass.  
VALIDATION_REQUIRED: Hit player and enemy; brief tint, 120ms, no linger.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-005  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Do not consume hit-stop timeScale in this director  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `triggerHitStop` sets `timeScaleRef.current = 0` for 75ms (`effects.ts` ~340–343). RAF uses `effectsManagerRef.current.tick(16)` with no scale (`WorldExploration.tsx` ~9157–9159). Hit-stop is inert. Wiring it requires the RAF loop.  
SYSTEMS_AFFECTED: RAF tick; `EffectsManager.timeScaleRef`  
RECOMMENDED_ACTION: DEFER. Human-only. If ever done: multiply `dt` by `timeScaleRef.current` only; keep 75ms; do not lengthen. Preserve gameplay speed.  
AUTONOMY: DEFER  
DEPENDENCIES: Human exemption from `AGENTS.md` RAF freeze  
REGRESSION_RISK: HIGH — RAF is shared by movement, particles, camera.  
VALIDATION_REQUIRED: Crit feels a single frame of pause, movement duration unchanged after restore.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-006  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Float walk rejects (no MP / unreachable)  
CATEGORY: combat-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Walk branch (`WorldExploration.tsx` ~10805+ mouse, touch mirror): `currentBattleMp <= 0`, wall/void, `!reachable.has`, empty path, `cost > currentBattleMp` all `return` with no float. Occupied already says `"Occupied"`. Player cannot tell *why* the click died or *whether* a nearer tile would work. Hover MP (`~8907–8946`) uses Manhattan `dist`, not `findPath.length`, so anticipation can disagree with the reject.  
SYSTEMS_AFFECTED: walk click/touch handlers; hover MP label  
RECOMMENDED_ACTION: Float `"No MP"` / `"Can't reach"` / `"Not enough MP"` using existing `spawnFloatText` + `tileCenter`. Optionally compute hover cost from the same path helper **outside** the inner render hot path (cache on hover tile id). Do not change `findPath` or `MOVEMENT_DURATION`.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: None  
REGRESSION_RISK: LOW for floats. MEDIUM if hover pathfinding is run every RAF frame.  
VALIDATION_REQUIRED: 0 MP click → “No MP”. Distant tile → “Can't reach”. Hover label matches spend.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-007  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Pass in-battle achievement unlocks into the root recap  
CATEGORY: reward-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `checkAndFireAchievement(..., true)` queues `_newlyUnlockedInBattle` (`WorldExploration.tsx` ~2087–2091). `PostBattleRecap` already renders `newlyUnlockedAchievements` (~520–582). `App.tsx` ~448–454 mounts recap with `data` + `onClose` only. World-mode toast is gated `!inBattle` (~17920). Unlocks during victory checks never appear.  
SYSTEMS_AFFECTED: `App.tsx` / GameFlow recap props; `WorldExploration` onShowBattleSummary payload  
RECOMMENDED_ACTION: Thread the queued list into `BattleRecapData` or a sibling prop. Clear the queue on recap dismiss. Do not toast under the recap.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: None. #116 is admin-design only — not a substitute.  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unlock `first_battle_win` on a victory; recap lists it. World toast still works out of battle.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-008  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Play the existing level_up sound and banner when recap level increases  
CATEGORY: reward-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `level_up` exists in `useSoundHooks.ts` ~16 and `soundEngine.ts` ~312 and is never played. Recap shows `Level {currentLevel}` with no “LEVEL UP” state. `main` recap still uses `xpForNextLevel: (level || 1) * 100` at `WorldExploration.tsx` ~12719, ~12891, ~13110, ~13407 despite importing `xpForNextLevel` from `xpCurve.ts`. Open **#108** already replaces those sites with `recapXpAfterGrant` / `xpHudProgress`.  
SYSTEMS_AFFECTED: `PostBattleRecap.tsx`; persist result `newLevel`; `playSound("level_up")`  
RECOMMENDED_ACTION: After #108 merges, if `newLevel > oldLevel`, play `level_up` once and show a one-line gold “Level N” on the existing recap header. Do not add confetti. Do not reopen the curve math.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: #108 (do not duplicate the threshold fix)  
REGRESSION_RISK: LOW if #108 is the sole curve writer. HIGH if a second PR also edits those four recap literals.  
VALIDATION_REQUIRED: Grant enough XP to cross a level; sound once; bar uses `100 * 2^(N-1)`.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-009  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Reuse the boss-encounter banner for phase 2  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Phase transition applies HP/stats and logs `⚡ {name} PHASE 2!` or Weeping Pawn promote (`WorldExploration.tsx` ~15759–15798). Encounter banner exists (~17984–18013, 1.5s). Phase change has no canvas banner and no dedicated SFX. Easy to miss while watching the board.  
SYSTEMS_AFFECTED: boss AI flush; existing banner component  
RECOMMENDED_ACTION: Fire the same banner pattern with “PHASE 2” / promote copy. 1.5s max. No gameplay pause.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — do not extend the 1.5s Death Realm timer or block input.  
VALIDATION_REQUIRED: Weeping Pawn promote and a generic phase2 boss each show one banner; combat clicks still work.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-010  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Draw a dashed walk-path overlay (no pathfinder change)  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: Movement is 600ms / path length (`MOVEMENT_DURATION`). Only destination gold tint + hover MP. No polyline. Long paths feel delayed because the first step waits `600/n` with no ANTICIPATION trail.  
SYSTEMS_AFFECTED: render pass after MP-reachable fill  
RECOMMENDED_ACTION: Stroke `movementPath` (and optionally hover path if cached) as a dashed stone/gold line. Presentation only.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-006 if hover path is cached  
REGRESSION_RISK: LOW if draw-only. Do not touch mapGen or `findPath`.  
VALIDATION_REQUIRED: Click a 3-step walk; line appears then consumes per step.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-011  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Label non-weapon damage sources (lava, spikes, reflect, shield, DoT)  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `DamageKind` is `"damage" | "heal" | "drain" | "crit"` only (`effects.ts` ~7). Lava/spikes debit HP and log (`WorldExploration.tsx` ~11632–11686) with **no** canvas juice. Void Mirror / Reflect Shield (`castHelpers.ts` ~325–364) log + HP only. Shield absorb logs purple, no float. DoT ticks log `[DOT]` and reuse untyped damage numbers. Player cannot see *why* HP moved when several sources overlap.  
SYSTEMS_AFFECTED: `EffectsManager` kinds or `spawnFloatText`; lava/reflect/DoT call sites  
RECOMMENDED_ACTION: Reuse `spawnFloatText` / existing kinds — e.g. `"Lava"`, `"Spikes"`, `"Reflect"`, `"Shield"`. Do **not** add a `"reflect"` combat formula. Optional typed kind later if stacking gets noisy. Cap still `MAX_LIVE_EFFECTS = 100`.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-001  
REGRESSION_RISK: LOW if float-only. MEDIUM if a new kind changes `spawnDamageNumber` signatures without updating all call sites.  
VALIDATION_REQUIRED: Step on lava; number + “Lava” on the player. Reflect shows on the player, not the boss.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-012  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Show remaining duration on status pills  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: Canvas pills (`WorldExploration.tsx` ~8634–8676, ~8750–8791) draw emoji only. `StatPopup` inspect exists. Effects store `duration`; popup may key `turnsRemaining`. Player cannot see *what changed* after a buff lands or how long Burning has left without opening inspect.  
SYSTEMS_AFFECTED: status pill draw; `StatPopup.tsx`  
RECOMMENDED_ACTION: Tiny turn digit on the pill from the live effect duration field. Align inspect with the same field. No apply-pulse spectacle.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Apply a 3-turn DoT; pill shows 3→2→1 then drops. Inspect matches.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-013  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Visible Death Realm wait (do not change the 1.5s timer)  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: In-battle death: recap then `setTimeout(..., 1500)` (`WorldExploration.tsx` ~13421). Exploration death: cleanup + 1.5s + toast after teleport (~13494–13540). `persistDeathPenalty` restores HP immediately. `armDeathGuards` blocks portals/encounters. The wait is invisible; the body can look alive.  
SYSTEMS_AFFECTED: defeat recap; overlay  
RECOMMENDED_ACTION: Countdown or “Entering the Death Realm…” on the existing defeat recap for 1.5s. No extra delay. Do not change `armDeathGuards` or penalty math.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Die; recap explains the wait; portal still blocked until the timer fires.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-014  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Wire triggerVfx heal (stop the no-op)  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `spellEngine.ts` ~670 calls `ctx.triggerVfx("player", "heal")`. WorldExploration implements `triggerVfx: () => { /* no-op */ }` (~9697). Drain heal is log-only (`castHelpers.ts` ~470–476). This PR already places heal numbers on the player tile when `heal()` runs; VFX is still unused.  
SYSTEMS_AFFECTED: playerSpellContext `triggerVfx`; `EffectsManager`  
RECOMMENDED_ACTION: Map `"heal"` to `triggerHitFlash("player")` plus the existing green number (already in `heal()`). Drain should call the same juice once.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-001; GFCF-2026-08-31-004 for a visible flash  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Cast a heal; green `+N` on the player. Drain shows purple number on enemy and green on player.  
STATUS: NEW  

---

ACTION_ID: GFCF-2026-08-31-015  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Do not add production feel-telemetry in this director  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: AQA-2026-08-30-012 already requested persist-ok/fail, death-penalty, victory-paid, recap open/dismiss, shop credit. This director’s asked signals (cancel, flee, illegal, boss-phase abandon, unused discovered spells) have **no producer**. `recordClickOutcome` is DEV-only. Inventing gameplay counters on the persist lock this week would collide with #107/#111 economy drafts.  
SYSTEMS_AFFECTED: none this PR  
RECOMMENDED_ACTION: DEFER to AQA-2026-08-30-012 / the telemetry-architecture automation. If counters are added later: query-only or enqueue on `createProgressPersist`. Do not tune spells from empty series.  
AUTONOMY: DEFER  
DEPENDENCIES: AQA-2026-08-30-012  
REGRESSION_RISK: MEDIUM if a second wallet path is invented  
VALIDATION_REQUIRED: Next director run either cites real counters or repeats “still no telemetry.”  
STATUS: NEW
