# ACTION_IDs — 2026-09-01 Dynamic Spell Discovery & Enemy Spell Evolution

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Dynamic Spell Discovery and Enemy Spell Evolution Designer.  
Design contract: [`SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md).  
Wave-1 law (still blocking): [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) and `SDE-2026-08-31-001`…`009`.  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **docs only**.

Sibling ledgers (do not re-open): `SDA-2026-08-31-001`…`013`; tactical ids in PR #120; family sheets in PR #136; boss adaptations in PR #137; Wave-1 SDE ids.

---

ACTION_ID: SDE-2026-09-01-001  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Do not land Wave-2 data before Wave-1 ownership split  
CATEGORY: dependency  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `WorldExploration.tsx` 2393–2438 still forces every `starterSpells` row `isBaseSpell: true`. `BattleRecapData` (`PostBattleRecap.tsx` 6–34) has no `discoveredSpells`. Wave-1 P0 (`SDE-2026-08-31-001`…`003`, `006`) is still NEW. Adding 22 ids to the always-owned catalog would make discovery worse.  
SYSTEMS_AFFECTED: hydrate; recap; catalog  
RECOMMENDED_ACTION: Keep Wave-2 definitions `STATUS: PROPOSED` until innate four + observe + `commitSpellDiscoveries` exist. Do not append Wave-2 ids to `starterSpells`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-001; SDE-2026-08-31-002; SDE-2026-08-31-003  
REGRESSION_RISK: HIGH if ignored (catalog pre-own).  
VALIDATION_REQUIRED: New character still owns only the four innate ids after Wave-1 split.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-002  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Resolve a second G≥2 pool slot with generationMin  
CATEGORY: pool-evolution  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` at `WorldExploration.tsx` 12484 still passes a `{ name, minLevel, maxLevel }` object. `enemyAI.ts` 192 `Math.floor(levelZone)` is NaN. Wave-1 SDE-005 asked for `G`; Wave-2 needs `generationMin ≤ G` and a second slot at G≥2.  
SYSTEMS_AFFECTED: `resolveEnemyKit`; family overlays  
RECOMMENDED_ACTION: After SDE-2026-08-31-005, pass numeric `G`. At G≥2 allow one extra ADVANCED/RARE with `generationMin ≤ G`. Never retire CORE. Empty → `[physical_attack]`. Do not retune `pickEnemyLevelFromTiers`. No `G_max`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-005; SDE-2026-08-31-006  
REGRESSION_RISK: MEDIUM — empty kit must stay armed; G=0 Tide must not receive File Lance.  
VALIDATION_REQUIRED: Peer pawn still has Strike. `generationMin: 2` absent at G=0/1.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-003  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Wire Wave-2 aiHints before assigning those ids  
CATEGORY: ai-compat  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `inferArchetype` (`enemyAI.ts` 420–424) still maps any `healAmount > 0` to healer. Summon fallback still uses name (`enemyAI.ts` 210–217). New hints (`rear_or_flank_only`, `overwatch_enter_melee`, `steal_one_buff`, `steal_low_hp_summon`, `loan_ap_to_ally`, …) have no decide\* branch.  
SYSTEMS_AFFECTED: `enemyAI.ts` decide\*; kit resolve  
RECOMMENDED_ACTION: Implement each hint as a predicate on explicit flags / HP% / last-turn MP / facing vector. Drop name fallbacks. Do not assign Loan Tempo until `buffer` exists. Do not assign Rear Cut to chargers. Missing hint → drop id, log once.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-006; SDA-2026-08-31-006  
REGRESSION_RISK: HIGH if Rear Cut is given to a straight-in pawn.  
VALIDATION_REQUIRED: Illegal Rear Cut fizzles. Hold Ground AI skips when already adjacent. Convert skips above 25% HP.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-004  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Implement Wave-2 definitions as data + pool rows  
CATEGORY: catalog-wave  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: §11 ids are absent from `spellData.ts` / `SPELL_ID_CATALOG` (32 live ids). Tombstone in Wave-2 §0.1 must not be reused.  
SYSTEMS_AFFECTED: `spellData.ts`; `bossKits.ts` catalog; family `EnemyKit` pools  
RECOMMENDED_ACTION: Add one id at a time with full metadata (`targetType`, `aiHint`, `generationMin`, acquisition flags, `effectParams` whitelist). Never `if (spell.name === …)`. `spell-pack-howl` / `spell-reliquary-lock` never enter `ownedSpellIds`. Formalize only the remaining #136 one-liners `spell-load-bearing` and `spell-void-glyph`.  
AUTONOMY: HUMAN_APPROVE — each id is a combat toy.  
DEPENDENCIES: SDE-2026-09-01-001; SDE-2026-09-01-002; SDE-2026-09-01-003  
REGRESSION_RISK: HIGH per id if wired by name or assigned to the wrong profile.  
VALIDATION_REQUIRED: `validateBossKits()` still passes. Typecheck clean. Paper Wind + Fog Hood range cut caps at −2.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-005  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Stamp Wave-2 feat / challenge / boss / special grants  
CATEGORY: feat-challenge-boss  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Achievements still Doka-only (`admin.mo` 309–326). Challenges still `{ doka, xp, badge }` (`challengeCompletion.ts` 38–103). Unused doors: `explorer`, `hard_2`, `easy_2`, `chessboard_lich`. Do not use `unstoppable` / `level_10`.  
SYSTEMS_AFFECTED: `AchievementConfig`; challenge persist; boss-clear persist; special `encounterId` writer  
RECOMMENDED_ACTION: Search Dust ← `explorer`; Blood Tithe ← `hard_2`; Self Anchor MULTI ← golem observe+win **or** `easy_2`; Claim Ward ← Chessboard Lich; Fog Hood ← `mist_gallery`. All via `unlockOwnedSpell` (idempotent, no Doka). Keep `claimAchievementReward` on the persist lock for Doka.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-007; SDE-2026-09-01-001  
REGRESSION_RISK: MEDIUM — remount must not double-grant; failed `hard_2` grants neither XP nor Tithe.  
VALIDATION_REQUIRED: Each listed door grants once. First MULTI_SOURCE child wins.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-006  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Add rime_gallery, still_court, mist_gallery as tagged encounters  
CATEGORY: special-encounter  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Wave-1 `echo_dummies` is the only discovery special. Encounter catalog (`ENCOUNTER_EVOLUTION_2026-08-31.md`) has teach rooms but no these three ids. `fog_of_war` modifier is still an announce-only stub — do not implement it to ship Fog Hood.  
SYSTEMS_AFFECTED: encounter tag table; kit overlay  
RECOMMENDED_ACTION: Tag existing solvable layouts. `rime_gallery` / `still_court` teach via observe+win. `mist_gallery` grants Fog Hood on victory without observation. Do not edit `mapGen.ts` algorithms. Do not invent a second recap.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-003; SDE-2026-09-01-005  
REGRESSION_RISK: MEDIUM if a tag seals portals or skips `finalizePlayableLayout`.  
VALIDATION_REQUIRED: Maps stay solvable. Defeat on `mist_gallery` does not grant Fog Hood.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-007  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Observation edge cases for stance, fizzle, and convert  
CATEGORY: discovery-pipeline  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Wave-1 observe is “cast spent AP.” Hold Ground is a stance; Rear Cut / Hex Theft / Convert can fizzle after spend; Pack Howl must never persist.  
SYSTEMS_AFFECTED: observe hook; recap  
RECOMMENDED_ACTION: Observe on Hold Ground **arm**, not snap. Fizzle after AP spend still observes. Convert / theft with no legal target still observes. `ENEMY_ONLY` / `BOSS_ONLY` never write `ownedSpellIds`. Player summons never observe.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-002; SDE-2026-09-01-004  
REGRESSION_RISK: HIGH if snap double-observes or Pack Howl is granted.  
VALIDATION_REQUIRED: Wave-2 QA rows W2-1…W2-7, W2-15.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-01-008  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Recap cards must list Wave-2 fields on the existing popup  
CATEGORY: discovery-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `PostBattleRecap.tsx` 6–34 still has no `discoveredSpells`. Wave-1 SDE-003 owns the field; Wave-2 only requires the same card shape (name, role, AP, range, target, key effect, source enemy).  
SYSTEMS_AFFECTED: `BattleRecapData`; recap chrome  
RECOMMENDED_ACTION: Do not add a second popup. Stack up to 4 cards. Defeat never shows `NEW SPELL DISCOVERED`. Carved-stone / crimson only.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: SDE-2026-08-31-003; SDE-2026-08-31-004  
REGRESSION_RISK: LOW for combat. MEDIUM if a second modal appears.  
VALIDATION_REQUIRED: One recap at `App.tsx` root.  
STATUS: NEW  

---
