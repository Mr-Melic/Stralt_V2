# ACTION_IDs — 2026-09-02 Dynamic Spell Discovery & Enemy Spell Evolution

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Dynamic Spell Discovery and Enemy Spell Evolution Designer.  
Design contract: [`SPELL_DISCOVERY_ECOSYSTEM_2026-09-02.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-09-02.md).  
Wave-1 law (still blocking): [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) and `SDE-2026-08-31-001`…`009`.  
Wave-2 generation stamp (still blocking): [`SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md) and `SDE-2026-09-01-001`…`008`.  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **docs only**.

Sibling ledgers (do not re-open): `SDA-2026-08-31-001`…`013`; tactical ids in PRs #120 / #185; family sheets in PR #136; boss adaptations in PRs #137 / #197; Wave-1 and Wave-2 SDE ids.

---

ACTION_ID: SDE-2026-09-02-001  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Do not land Wave-3 data before Wave-1 ownership split and Wave-2 G resolve  
CATEGORY: dependency  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `WorldExploration.tsx` 2356–2401 still forces every `starterSpells` row `isBaseSpell: true`. `BattleRecapData` (`PostBattleRecap.tsx` 6–34) has no `discoveredSpells`. `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` at WX 12035 still passes a `{ name, minLevel, maxLevel }` object. Wave-1 P0 (`SDE-2026-08-31-001`…`003`, `006`) and Wave-2 P0 (`SDE-2026-09-01-001`, `003`) are still NEW. Adding 23 ids to the always-owned catalog would make discovery worse.  
SYSTEMS_AFFECTED: hydrate; recap; catalog; kit resolve  
RECOMMENDED_ACTION: Keep Wave-3 definitions `STATUS: PROPOSED` until innate four + observe + `commitSpellDiscoveries` + numeric `G` exist. Do not append Wave-3 ids to `starterSpells`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-001; SDE-2026-08-31-002; SDE-2026-08-31-003; SDE-2026-09-01-001; SDE-2026-09-01-002  
REGRESSION_RISK: HIGH if ignored (catalog pre-own; G3 verbs on G=0 kits).  
VALIDATION_REQUIRED: New character still owns only the four innate ids after Wave-1 split. `generationMin: 3` absent at G=0/1/2.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-002  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Resolve a G≥3 extra pool slot with generationMin  
CATEGORY: pool-evolution  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Wave-2 SDE-2026-09-01-002 asked for a G≥2 extra slot. Wave 3 stamps `generationMin: 3` on family verbs. `Math.floor(levelZone)` is still NaN (`enemyAI.ts` 187–193; WX 12035). `computeAITier` still plateaus at label 10 (`combatMath.ts` 36–51).  
SYSTEMS_AFFECTED: `resolveEnemyKit`; family overlays  
RECOMMENDED_ACTION: After SDE-2026-09-01-002, at G≥3 allow one extra ADVANCED/RARE/ELITE with `generationMin ≤ G`. Never retire CORE or G2. Empty → `[physical_attack]`. Do not retune `pickEnemyLevelFromTiers`. No `G_max`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-09-01-002; SDE-2026-08-31-005; SDE-2026-08-31-006  
REGRESSION_RISK: MEDIUM — G=2 Tide must not receive Undertow; empty kit must stay armed.  
VALIDATION_REQUIRED: Peer pawn still has Strike. `generationMin: 3` absent at G≤2.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-003  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Wire Wave-3 aiHints before assigning those ids  
CATEGORY: ai-compat  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `inferArchetype` (`enemyAI.ts` 421–426) still maps any `healAmount > 0` to healer. Summon fallback still uses name (`enemyAI.ts` 210–217). New hints (`spend_walk_mp_to_cast`, `swap_two_other_hostiles`, `melee_then_recoil`, `paint_portal_pair`, `knight_leap_poke`, `fold_two_player_side`, …) have no decide\* branch.  
SYSTEMS_AFFECTED: `enemyAI.ts` decide\*; kit resolve  
RECOMMENDED_ACTION: Implement each hint as a predicate on explicit flags / leftover AP-MP / knight (2,1) / pair cells / HP%. Drop name fallbacks. Do not assign Undertow to chargers. Do not assign Twin Gate until the AI can pick two cells. Do not assign Kennel Lock without `summonAI`. Missing hint → drop id, log once.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-006; SDE-2026-09-01-003; SDA-2026-08-31-006  
REGRESSION_RISK: HIGH if Recoil lands a golem on lava every turn or Pawn Trade is given to a straight-in pawn.  
VALIDATION_REQUIRED: Undertow skipped at 0 MP. Knight Pierce fizzles off-(2,1). Pack Tempo never owned.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-004  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Implement Wave-3 definitions as data + pool rows  
CATEGORY: catalog-wave  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Unique §11 ids are absent from `spellData.ts` / `SPELL_ID_CATALOG` (32 live ids). Same-day #282 already reserved `spell-pawn-trade`, `spell-twin-gate`, Ley Toll, Fan Bolt, Back Step, Sidestep Ward, Far Sting, Soul Sip. Tombstone in Wave-3 §0.1 must not be reused. Every frontend `mpCost` is still 0 except the two sibling spenders once they land.  
SYSTEMS_AFFECTED: `spellData.ts`; `bossKits.ts` catalog; family `EnemyKit` pools  
RECOMMENDED_ACTION: Add unique SDE ids one at a time with full metadata. **Stamp** #282 ids onto families in §12 — do not clone them. Undertow is this document’s only new `mpCost > 0` id (Ley Toll is #282’s). `spell-pack-tempo` / `spell-sovereign-fold` never enter `ownedSpellIds`. Never `if (spell.name === …)`. Twin Gate pads are #282 `gatePads`, not `map.portals`.  
AUTONOMY: HUMAN_APPROVE — each id is a combat toy.  
DEPENDENCIES: SDE-2026-09-02-001; SDE-2026-09-02-002; SDE-2026-09-02-003  
REGRESSION_RISK: HIGH per id if wired by name, assigned to the wrong profile, or if Twin Gate reuses `map.portals`.  
VALIDATION_REQUIRED: `validateBossKits()` still passes. Typecheck clean. G=2 Tide has no Undertow. Twin Gate is not a world portal.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-005  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Stamp Wave-3 feat / challenge / boss / special grants  
CATEGORY: feat-challenge-boss  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Achievements still Doka-only (`admin.mo` 309–326). Challenges still `{ doka, xp, badge }` (`challengeCompletion.ts` 38–103). Unused doors: `pacifist_run`, `easy_1`, `crimson_countess`, `legendary_3`. Do not use `unstoppable` / `level_10`. Do not restamp `spell_scholar`, `explorer`, Twin Monarchs, `chessboard_lich`.  
SYSTEMS_AFFECTED: `AchievementConfig`; challenge persist; boss-clear persist; special `encounterId` writer  
RECOMMENDED_ACTION: Mercy Hex ← `pacifist_run`; Bloodless Plate ← `easy_1`; Back Step MULTI ← rust_reaver observe+win **or** `legendary_3` (**not** `easy_3`); Crimson Pact ← Countess first win; Gate Sight ← `gate_gallery`; Twin Gate MULTI child ← Void Mirror observe+win beside #282 `void_grandmaster`; Sidestep Ward MULTI child ← lurker observe beside #282 `critical_striker`. All via `unlockOwnedSpell` (idempotent, no Doka). Keep `claimAchievementReward` on the persist lock for Doka. Failed `easy_1` (including BuffShop heal) grants neither XP nor Plate.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-007; SDE-2026-09-01-005; SDE-2026-09-02-001  
REGRESSION_RISK: MEDIUM — remount must not double-grant; first MULTI child wins.  
VALIDATION_REQUIRED: Each listed door grants once. Non-Countess boss win does not grant Pact.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-006  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Add undertow_channel, ember_fan, rift_twins, long_gallery, gate_gallery as tagged encounters  
CATEGORY: special-encounter  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Wave-1 `echo_dummies` and Wave-2 `rime_gallery` / `still_court` / `mist_gallery` are the only discovery specials. `fog_of_war` is still an announce-only stub — do not implement it to ship Gate Sight.  
SYSTEMS_AFFECTED: encounter tag table; kit overlay  
RECOMMENDED_ACTION: Tag existing solvable layouts. First four teach via observe+win (Undertow / Fan Bolt / Pawn Trade / Far Sting). `gate_gallery` grants Gate Sight on victory without observation. Twin Gate stays #282 BOSS + Void Mirror observe child, not a second `gate_gallery` copy. Do not edit `mapGen.ts` algorithms. Do not invent a second recap. World portals stay locked while hostiles live.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-003; SDE-2026-09-01-006; SDE-2026-09-02-005  
REGRESSION_RISK: MEDIUM if a tag seals portals, skips `finalizePlayableLayout`, or treats Twin Gate cells as `map.portals`.  
VALIDATION_REQUIRED: Maps stay solvable. Defeat on `gate_gallery` does not grant Gate Sight.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-007  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Observation edge cases for mpCost, pair paint, recoil, fold, and fizzle  
CATEGORY: discovery-pipeline  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Wave-1 observe is “cast spent AP.” Undertow is illegal at 0 MP (no observe) but a forced fizzle after AP spend still observes. Twin Gate / Far Watch observe on paint/arm, not transit/snap. Recoil lava is environmental, not a second observe. Pack Tempo / Sovereign Fold never persist.  
SYSTEMS_AFFECTED: observe hook; recap; challenge HP/AP helpers  
RECOMMENDED_ACTION: Observe on Twin Gate **paint** and Far Watch **arm**. Fizzle after AP spend still observes (Pawn Trade, Knight Pierce, Planted Stance, Rip Current empty). Illegal Undertow (no AP) does not. Recoil landing uses existing hazard ticks (`recordInBattleChallengeDamage` if lava/spikes while `inBattleRef`). Crimson Pact HP pay uses `recordChallengeSelfHpLoss` (floor 1). `ENEMY_ONLY` / `BOSS_ONLY` never write `ownedSpellIds`. Player summons never observe.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-002; SDE-2026-09-01-007; SDE-2026-09-02-004  
REGRESSION_RISK: HIGH if transit double-observes, Pack Tempo is granted, or Twin Gate breaks portal lock-while-hostile.  
VALIDATION_REQUIRED: Wave-3 QA rows W3-1…W3-10, W3-15, W3-20.  
STATUS: NEW  

---

ACTION_ID: SDE-2026-09-02-008  
SOURCE_AUTOMATION: Dynamic Spell Discovery and Enemy Spell Evolution Designer  
TITLE: Recap cards must list Wave-3 fields on the existing popup  
CATEGORY: discovery-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `PostBattleRecap.tsx` 6–34 still has no `discoveredSpells`. Wave-1 SDE-003 owns the field; Wave-3 only requires the same card shape (name, role, AP, range, target, key effect, source enemy).  
SYSTEMS_AFFECTED: `BattleRecapData`; recap chrome  
RECOMMENDED_ACTION: Do not add a second popup. Stack up to 4 cards. Defeat never shows `NEW SPELL DISCOVERED`. Carved-stone / crimson only. Undertow’s MP spend is not a second cue.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: SDE-2026-08-31-003; SDE-2026-08-31-004; SDE-2026-09-01-008  
REGRESSION_RISK: LOW for combat. MEDIUM if a second modal appears.  
VALIDATION_REQUIRED: One recap at `App.tsx` root.  
STATUS: NEW  
