# ACTION_IDs — 2026-08-31 Dynamic Spell Discovery & Enemy Spell Evolution

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Dynamic Spell Discovery and Enemy Spell Evolution Designer.  
Design contract: [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md).  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **docs only**.

Sibling ledgers (do not re-open): `SDA-2026-08-31-001`…`013` in PR #116; tactical ids in PR #120; family sheets in PR #136; boss adaptations in PR #137.

---

ACTION_ID: SDE-2026-08-31-001  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Split innate four from the always-owned starter catalog  
CATEGORY: ownership-split  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `WorldExploration.tsx` 2242–2272 forces every `starterSpells` row `isBaseSpell: true` and unions it into `ownedSpells`. Discovery has nothing to discover. Quality audit marked discovery pacing `NO_MEASURABLE_EFFECT`.  
SYSTEMS_AFFECTED: `WorldExploration.tsx` ownedSpells; create-character seed; `SpellbookModal`; later `ownedSpellIds`  
RECOMMENDED_ACTION: Innate seed = `physical_attack`, `starter-shield`, `starter-poison`, `starter-heal` only. Migrate existing characters from `spellLevelKeys ∪ spellBarOrder` plus those four — **not** from the full catalog or `getSpellConfigs()`. Depends on #116 SDA-002 if the canister map exists; otherwise keep a frontend-owned set behind a helper until the actor lands.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-007  
REGRESSION_RISK: HIGH — under-seed bricks the bar; over-seed reintroduces “everyone owns everything.”  
VALIDATION_REQUIRED: New character owns four ids. Reload matches. Admin adding a catalog spell does not grant it. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-002  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Observe on applied hostile cast, never on encounter start  
CATEGORY: discovery-pipeline  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: No `recordSpellObservation`. Combat already applies `kind === "cast"` from `decideEnemyAction` (`enemyAI.ts` 1648+) through WX. `resolveSpellCast` can fizzle after the attempt (`spellEngine.ts` 427–431).  
SYSTEMS_AFFECTED: enemy/summon apply site; persist lock; `main.mo`  
RECOMMENDED_ACTION: On WX-applied hostile `kind: "cast"` that spent AP, enqueue `recordSpellObservation(slot, spellId, encounterId, sourceId)`. Eligible = `PLAYER_LEARNABLE` + `ENEMY_DISCOVERY`/`MULTI_SOURCE` + not owned + id on `assignedSpells`. Player summons never observe. Hostile summons may. Fizzle after AP spend still observes. Preview/AI-consider/encounter-start do not. Extract a helper; do not grow WX.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-001; SDA-2026-08-31-002; SDA-2026-08-31-003  
REGRESSION_RISK: HIGH if observe fires on consider/preview or twice per remount.  
VALIDATION_REQUIRED: Tests in §14 rows 1–3, 9–11 of the design doc.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-003  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Commit discoveries on victory; show recap cards  
CATEGORY: discovery-pipeline  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `PostBattleRecap` `BattleRecapData` has XP/Doka/challenges/boss only (`PostBattleRecap.tsx` 5–31). Victory already funnels through `applyRewards` + root recap (`App.tsx`).  
SYSTEMS_AFFECTED: victory persist; `commitSpellDiscoveries`; `PostBattleRecap`; `rewardResolver` types only  
RECOMMENDED_ACTION: On victory enqueue (same lock as `applyRewards`), call `commitSpellDiscoveries(slot, encounterId)`. Grant is owned-id append only — no Doka/XP, no `upgradeSpell`, no `updateCharacter`. Same-encounter victory default. Defeat never grants. Extend recap with `discoveredSpells` cards (name, role, AP, range, target, key effect, source enemy). One recap. Idempotent on retry.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-002  
REGRESSION_RISK: HIGH if granted twice or if `upgradeSpell` is reused (charges Doka, bumps level).  
VALIDATION_REQUIRED: §14 rows 4–8, 12. Recap mounts at app root only.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-004  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Ship TECHNIQUE OBSERVED as a non-blocking cue  
CATEGORY: discovery-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Achievement path already has a top-centre toast (`WorldExploration.tsx` 2093) and `achievementsShownRef` dedup (2032–2034). Battle log is `logBattleEntry` (1650–1661). No discovery cue exists.  
SYSTEMS_AFFECTED: battle HUD toast; battle log  
RECOMMENDED_ACTION: On first observe of an unknown eligible id this encounter: carved-stone toast `TECHNIQUE OBSERVED` + name, 2.4s, gold/crimson, no focus steal. Dedup `(encounterId, spellId)`. Already-owned silent. `ENEMY_ONLY`/`BOSS_ONLY` may log `UNKNOWN TECHNIQUE` without persist. Match `DESIGN.md` slate/gold.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: SDE-2026-08-31-002  
REGRESSION_RISK: LOW for combat. MEDIUM if the toast pauses input.  
VALIDATION_REQUIRED: Cast while targeting remains possible. Repeat cast silent. Defeat still showed the in-battle toast if observed.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-005  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Resolve kits by generation G, not NaN levelZone  
CATEGORY: pool-evolution  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `buildEnemyKit(pieceType, currentMap.levelZone)` receives a `{ name, minLevel, maxLevel }` object; `Math.floor(levelZone)` is NaN so every kit stays zone 0 (`enemyAI.ts` 187–193; #136). `ENEMY_KITS` is piece-type only.  
SYSTEMS_AFFECTED: `buildEnemyKit` / `resolveEnemyKit`; WX assign site (~12181); family overlay  
RECOMMENDED_ACTION: Pass `G = floor(max(0, R) / T)` (or `floor(enemy.level / T)`). Resolve CORE → ADVANCED → RARE → ELITE → SIGNATURE from an `EnemyKit` (#116 SDA-008). Drop ids whose `AI_REQUIREMENTS` fail. Empty → `[physical_attack]`. Do not retune `pickEnemyLevelFromTiers`. No last generation.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-008; SDE-2026-08-31-006  
REGRESSION_RISK: MEDIUM — empty kit must stay armed.  
VALIDATION_REQUIRED: Peer pawn still has Strike. `R ≥ T` can roll a RARE id that the AI can use. Missing id skipped, no crash.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-006  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Require aiProfile / aiHint before assigning new enemy spells  
CATEGORY: ai-compat  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `inferArchetype` (`enemyAI.ts` 420–424) treats any `healAmount > 0` as healer (Life Drain, Vampire Bite, Lifesteal Nova). `family.includes("berserk")` is a name hint. New support/drain spells are unsafe to assign.  
SYSTEMS_AFFECTED: `enemyAI.ts` infer; kit resolve; summon `inferSummonArchetype` name fallback (196–217)  
RECOMMENDED_ACTION: Explicit `aiProfile` on the enemy. Explicit `aiHint` on each enemy-castable definition. Drop name fallbacks. Until healer profile is explicit, non-healer CORE pools must not include `healAmount`. Do not assign a spell whose hint the profile cannot satisfy.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-006  
REGRESSION_RISK: MEDIUM — a kit missing `aiProfile` must fall back to today’s infer, logged once, not silently heal-bot.  
VALIDATION_REQUIRED: Drain kit is not healer. Summon with `summonAI: healer` and name “Orb” still heals. Glass Shot never assigned to a charger.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-007  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Grant writers for ACHIEVEMENT / CHALLENGE / BOSS / SPECIAL  
CATEGORY: feat-challenge-boss  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Achievements Doka-only (`admin.mo` 309–326). Challenges `{ doka, xp, badge }` (`challengeCompletion.ts` 38–103). Boss kits are AI pools (`bossKits.ts`).  
SYSTEMS_AFFECTED: `AchievementConfig`; challenge persist; boss-clear persist; `unlockOwnedSpell`  
RECOMMENDED_ACTION: `spellRewardIds` on feats; `rewards.spellIds` on challenges; boss-clear grant list; special `encounterId` writer. All call `unlockOwnedSpell` (idempotent, no Doka). Keep `claimAchievementReward` on the persist lock for Doka. `getPlayerAchievements(identity.getPrincipal())`. Wave-1 stamps: Overcast ← `spell_scholar`; Second Wind ← `easy_3`/`hard_3`; Choir Hymn ← Twin Monarchs; False Retreat ← `echo_dummies`; Benediction / Interpose MULTI_SOURCE children.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-001; SDA-2026-08-31-010  
REGRESSION_RISK: MEDIUM — remount must not double-grant; failed challenge grants neither XP nor spell.  
VALIDATION_REQUIRED: Each Wave-1 non-discovery source grants once. Retired reward id skipped.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-008  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Spellbook lists owned ids; recap NEW seal only  
CATEGORY: spell-library-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `SpellbookModal` takes `allSpells` as the full owned union. `setSpellBarOrder` drops ids not in `spellLevelKeys` (`main.mo` 1233–1242).  
SYSTEMS_AFFECTED: `SpellbookModal`; `setSpellBarOrder`; recap `NEW` seal  
RECOMMENDED_ACTION: Library = owned ids only. One-session `NEW` seal after grant. Filter bar saves to `ownedSpellIds ∪ spellLevelKeys` (SDA-013). Carved-stone only.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: SDE-2026-08-31-001; SDE-2026-08-31-003; SDA-2026-08-31-013  
REGRESSION_RISK: MEDIUM — never-upgraded innate ids must stay on the bar.  
VALIDATION_REQUIRED: New character saves eight-or-fewer innate/owned ids; reload matches. Unknown id dropped.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-08-31-009  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Implement Wave-1 proposed definitions as data + AI hints  
CATEGORY: catalog-wave  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: §11 ids are absent from `spellData.ts` / `SPELL_ID_CATALOG`. #120 and #137 already reserved other ids.  
SYSTEMS_AFFECTED: `spellData.ts`; `bossKits.ts` catalog; family `EnemyKit` pools; decide\* hints  
RECOMMENDED_ACTION: Add one id at a time with full metadata (`targetType`, `aiHint`, acquisition flags). Never `if (spell.name === …)`. Do not assign until SDE-006 profiles exist. `spell-martyr-fuse` / `spell-hex-of-silence` never enter `ownedSpellIds`. Formal id for the #136 blink is `spell-phase-slip` (do not also add `spell-phase-step`).  
AUTONOMY: HUMAN_APPROVE — each id is a combat toy.  
DEPENDENCIES: SDE-2026-08-31-005; SDE-2026-08-31-006; SDA-2026-08-31-001  
REGRESSION_RISK: HIGH per id if the effect is wired by name or assigned to the wrong profile.  
VALIDATION_REQUIRED: `validateBossKits()` still passes. Typecheck clean. Each id has a helper test for eligibility, not a WX branch.  
STATUS: NEW  

---
