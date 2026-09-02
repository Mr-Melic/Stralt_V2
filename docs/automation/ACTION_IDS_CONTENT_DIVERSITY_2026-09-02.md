# ACTION_IDs — Content Diversity & Repetition Auditor 2026-09-02

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Content Diversity & Repetition Auditor.  
Audit: [`CONTENT_DIVERSITY_AUDIT_2026-09-02.md`](./CONTENT_DIVERSITY_AUDIT_2026-09-02.md).  
HEAD: `58302bc`. Gameplay / production code was **not** modified this run.

The 2026-09-01 CDA ledger never landed on `main`. These ids **subsume** that unpublished set. Do not mint twins of SDE / WDEAD / formation / family-sheet ids — those remain the implementer contract for their systems; CDA ids are the diversity gate (what not to clone, which axis must bind, which gap is still empty).

Do not implement combat from this file unless a later human or orchestrator picks an ID.

---

ACTION_ID: CDA-2026-09-02-001  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Bind live families through battle start (chassis + integer stats + unique verb)  
CATEGORY: TEAM_SYNERGY  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Seven `EnemyFamily` ids (`gameTypes.ts` 12–20). 30% overlay (`WorldExploration.tsx` 5862–5953) writes HP/RES/SP then battle start overwrites HP via `calcEnemyMaxHp` (12085–12112) and RES/SP via `computeEnemyStats` (11975–12017). Overlay `mp`/`ap` never assigned. Family RES `0.05–0.75` is the wrong unit vs integer `getEnemyBaseStats` (`progression.ts` 180–186). Only ember melee burn, tide melee MP−1 (`WorldExploration.tsx` 16877–16908), void 25% reflect (`castHelpers.ts` 328–338) exist. Chassis stays a random chess piece (5765–5812).  
SYSTEMS_AFFECTED: `WorldExploration.tsx` generateEnemies + battle start; family pixel hooks; `getEnemyBaseStats`  
RECOMMENDED_ACTION: On family roll, force preferred chassis, persist family HP and integer RES/SP through battle start, and keep exactly one unique verb per family. Do not add Register-only families. NEW PLAYER DECISION: “this body is a golem / rat / mirror — I change target order, damage type, and positioning,” not “same pawn, different tint.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: Existing Wave-1 family sheets (do not rewrite); do not retune `pickEnemyLevelFromTiers`  
REGRESSION_RISK: HIGH if family HP double-applies with `calcEnemyMaxHp`, or if 0–1 RES is persisted on the integer pipeline  
VALIDATION_REQUIRED: After overlay, combatant HP and RES at turn 0 still match the family contract; a `wraith_bishop` is a bishop kit; iron_golem RES is ≥ default integer tank, not 0.75  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-002  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Pass a numeric kit band so relative level actually changes enemy tools  
CATEGORY: SPELL_DISCOVERY  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` at `WorldExploration.tsx` 12035. `levelZone` is `{ name, minLevel, maxLevel }`. `enemyAI.ts` 192 `Math.floor(levelZone)` is NaN → every kit stays band 0. Knight kit is Strike-only (`enemyAI.ts` 161). Queen/king Inferno at z≥2 never appears. `longHorizonSim.ts` 50–57 already names this.  
SYSTEMS_AFFECTED: `WorldExploration.tsx` assignEnemySpells; `enemyAI.ts` `ENEMY_KITS`  
RECOMMENDED_ACTION: Pass a number (0/1/2) derived from relative band or dungeon depth — not the object. Do not grow kits by stuffing more DAMAGE ids into band 0. NEW PLAYER DECISION: “this map’s bishops have Poison; late queens have Inferno — I bring LoS break / Mirror / focus order I did not need on band 0.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-005 / SDE-2026-09-01-002 (kit G); CDA-2026-09-02-001 if family kits replace piece kits  
REGRESSION_RISK: MEDIUM — empty kit must still arm Strike; G=0 must not receive Inferno  
VALIDATION_REQUIRED: Band 0 pawn = `[physical_attack]`; a numeric z≥2 queen includes `spell-inferno`; passing the live object still must not silently NaN after the fix (type the arg as `number`)  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-003  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Add veteran/elite/champion as AI and kit floors, not HP multipliers  
CATEGORY: TEAM_SYNERGY  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: No `isElite` / variant type. Leader = highest level (`WorldExploration.tsx` 12125–12129). `computeAITier` (`combatMath.ts` 36–51) 30% uniform 1–10. `WF-ELT-BANNER_PATROL` / `WF-ELT-TOLL_KEEPER` (`worldFeatures.ts` 448–1028) are unwired.  
SYSTEMS_AFFECTED: spawn overlay; `enemyAI.ts` gates; `worldFeatures.ts` elite_patrol (import only after CDA-001)  
RECOMMENDED_ACTION: Second roll after level pick: BASE / VETERAN / ELITE / CHAMPION raise `aiTier` floor and unlock one extra allowed category — never a flat HP% or damage%. Reuse Wave-1 floors (1 / 3 / 6 / 8). Do not invent new persist stats. NEW PLAYER DECISION: “the banner elite will not retreat and has one extra verb — intercept, pay the toll, or leave,” not “same kit, 1.35× HP.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: CDA-2026-09-02-001; WDEAD-2026-08-31-011; `ENEMY_ELITE_EVOLUTION_*` sheets  
REGRESSION_RISK: MEDIUM if elite is implemented as `hpMult` (repeats the family-sticker failure)  
VALIDATION_REQUIRED: Two same-family same-level bodies can differ by variant floor; champion HP formula equals BASE unless a sheet names a persist-safe integer RES/HP contract  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-004  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Replace quadrant scatter with one named formation per pack  
CATEGORY: POSITIONING  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Live placement is 4-quadrant + Chebyshev ≥ 4 (`WorldExploration.tsx` 5738–5755) then battle-start re-scatter ≥ 2 (`11972–12006`). `docs/design/ENEMY_FORMATIONS_2026-09-01.md` and `worldFeatures.ts` encounter slots are unwired.  
SYSTEMS_AFFECTED: `generateEnemies`; battle-start placement; formation catalogs  
RECOMMENDED_ACTION: Pick one already-specified formation id (protector+artillery, tank+healer, …). Do not design a new formation list. Battle start must not dissolve the shape below the teaching distance. NEW PLAYER DECISION: “the frost bishop is behind the golem — I peel, Swap in, or eat the slow if I punch the tank.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: Formation drop 1/2 docs; CDA-2026-09-02-001 (roles need families/kits)  
REGRESSION_RISK: HIGH if turn-1 surround or sealed pockets appear (formation docs already ban those)  
VALIDATION_REQUIRED: Pack of 3+ is not uniform random tiles; artillery starts Chebyshev ≥ teaching range; solvability flood-fill still reaches a portal  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-005  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Collapse or truly diverge the four clone spell pairs  
CATEGORY: DAMAGE  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Shield ≡ Iron Skin (`spellData.ts` 30–47 vs 293–312: +30% RES / 3, range 3; AP 2 vs 3). Poison ≡ Venom (49–67 vs 394–415: 4×3 DoT). Expose ≈ Shadow Veil (373–393 vs 480–500: damage + `debuffStat: "res_sp"`). Blood Mend ≈ Rallying Cry (84–102 vs 416–436: self heal + +15% CHC / 2). Boss kits reuse Veil (7), Cursed Wound (6), Frost Nova (6), Swap (5).  
SYSTEMS_AFFECTED: `spellData.ts`; `ENEMY_KITS`; `BOSS_KITS`; summon kits (guardian uses both Shield and Iron Skin)  
RECOMMENDED_ACTION: For each pair pick one: retire (`usableByPlayer=false` for unowned) **or** change the verb (e.g. Iron Skin = absorb buffer, Venom = AP-tax DoT, Veil = self stealth, Cry = ally-range heal). Do not add a fifth shred. NEW PLAYER DECISION: after the split, choosing Shield vs Iron Skin answers a different threat (RES% vs absorb expiry); Poison vs Venom answers range vs melee-tax.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE ownership split (do not retire an id the player never owned — AGENTS.md); CDA-2026-09-02-012 if backend Mirror clone is in scope  
REGRESSION_RISK: MEDIUM — guardian summon kit currently lists both Shield and Iron Skin  
VALIDATION_REQUIRED: `validateBossKits()` still passes; no two remaining player-facing ids share the same effectType + stat + duration + magnitude  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-006  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Stop inferring healer from any healAmount; bind family AI explicitly  
CATEGORY: SUPPORT  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `inferArchetype` (`enemyAI.ts` 421–451) returns healer if `spellType === "heal"` **or** `healAmount > 0` (Life Drain, Drain Courage, Lifesteal Nova). Never returns `summoner` (WX uses `isSummoner` instead, 16463–16472). `aiStrategy` is written `""` at WX 16249. No family sets `"berserk"`. Knight → flanker by piece name even when kit is Strike-only.  
SYSTEMS_AFFECTED: `enemyAI.ts` inferArchetype; spawn `aiStrategy` / `aiProfile`; family sheets  
RECOMMENDED_ACTION: Healer only when `spellType === "heal"` and the heal can target an ally (Blood Mend is self — do not use it as pack support). Drain stays caster/charger. Set `aiStrategy` from family/role metadata. Keep `decideSummonerAction` on `isSummoner` but make that flag family- or role-gated (CDA-007). NEW PLAYER DECISION: “the scribe will Drain Courage from range; the wisp-cantor will walk to an ally — I do not treat every healAmount as a medic.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: CDA-2026-09-02-001; SDE-2026-09-01-003 (aiHints)  
REGRESSION_RISK: HIGH if drain bishops start standing in melee because they lost healer kiting without gaining caster kiting  
VALIDATION_REQUIRED: A kit with only `starter-drain` is not archetype healer; a kit with ally Shield and no healAmount is not healer; `aiStrategy: "berserk"` on a test pawn returns berserker  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-007  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Gate enemy summoners by relative zone and family, not raw player level  
CATEGORY: SUMMONING  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `ENEMY_SUMMONER_CHANCE_BASE + characterStats.level * ENEMY_SUMMONER_CHANCE_PER_LEVEL_ZONE` (`gameConstants.ts` 298–299; WX 12047–12057). Hits 1.0 at player level 44. Pets 50/50 wolf or archer only. Sentinel / bomber / wisp stay `usableByEnemy: false`. Comment says “scales with levelZone”; code uses raw level.  
SYSTEMS_AFFECTED: battle-start summoner overlay; `decideSummonerAction`; summon `usableByEnemy` flags  
RECOMMENDED_ACTION: Chance from relative band / dungeon depth, capped well below 100%. Family or role picks the pet (wolf vs archer vs, later, one flag-unlocked bomber). Do not give every late pack a summoner. NEW PLAYER DECISION: “this bone_scribe pack will add a wolf unless I kill the summoner this cadence; a proposed cantor would add a wisp — I change focus, not DPS.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: CDA-2026-09-02-001; WDEAD-2026-08-31-012; `ENEMY_SUMMON_CAP` stays 2  
REGRESSION_RISK: MEDIUM — uncapped bomber + inferno on every pack is a new DAMAGE clone, not depth  
VALIDATION_REQUIRED: Player level 50 exploration pack is not 100% summoners; a family with no summoner sheet never rolls `isSummoner`  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-008  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Execute Boss Rush combinedMechanic; replace weeping_pawn_2 ghost id  
CATEGORY: TEAM_SYNERGY  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `combinedMechanic` exists only as strings on `BOSS_RUSH_ROOMS` (`useBossRush.ts` 19–131). Grep finds no consumer. Room 9 `boss2Id: "weeping_pawn_2"` is not in `BOSS_IDS` (`bossTypes.ts` 390–410). Admin already documents the lie (`AdminDashboard.tsx` 6943–6946). Kits remix Veil/Wound/Nova; phase 2 adds a catalog spell (`bossKits.ts` 90–92).  
SYSTEMS_AFFECTED: `useBossRush.ts`; `useBossAI.ts`; Boss Rush spawn; `BOSS_IDS`  
RECOMMENDED_ACTION: Implement the **printed** room-0 rule first (Archbishop heal / Pawn resurge) as explicit flags, not a name parse. Map `weeping_pawn_2` to `weeping_pawn` or a real second id. Do not write more combinedMechanic fiction. NEW PLAYER DECISION: “I must kill Archbishop first or the Pawn returns at 50% — target order is the fight,” which is currently flavor.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: Do not invent new BossAbility enums for text that already maps to existing tags; WDEAD-2026-08-31-008  
REGRESSION_RISK: HIGH if resurge double-credits `applyRewards` or skips `completeBossRushRoom` index rules  
VALIDATION_REQUIRED: Room 9 loads a `BOSS_IDS` member; killing Pawn first with Archbishop alive triggers the documented resurge once; killing Archbishop first does not  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-009  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Add three challenge kinds; stop shipping tighter numbers of the same verb  
CATEGORY: OBJECTIVE_PLAY  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Nine `DEFAULT_CHALLENGES` (`challengeCompletion.ts` 38–103). Three turn-count clones (15/10/5), three damage clones (50 / 30+no-heal / 0). Unique: `no_healing`, `under_8_ap_per_turn`, `direct_hit`. Honesty patches landed; types did not.  
SYSTEMS_AFFECTED: `challengeCompletion.ts`; challenge recorders in WX; recap  
RECOMMENDED_ACTION: Add at most three new `ChallengeCondition`s, each a different category: OBJECTIVE_PLAY (ward/shrine lives), TEAM_SYNERGY (summoner dead before any pet kill, or leader first), SPELL_DISCOVERY (win after observing a non-base id — blocked until SDE split). Do not add `under_12_turns`. NEW PLAYER DECISION: “I cannot chase the rat because the shrine dies” / “I must spend the turn on the summoner” — not “win faster.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: CDA-2026-09-02-014 for a ward token; SDE-2026-08-31-001 for discovery challenge  
REGRESSION_RISK: MEDIUM — new predicates must use existing recorders (`recordChallengeDamageTaken`, AP spend, etc.), not name heuristics  
VALIDATION_REQUIRED: Existing nine predicates unchanged; new ids fail closed if the objective token is missing  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-010  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Replace grind-twin achievements with learn/observe keys; drop level_10 horizon  
CATEGORY: SPELL_DISCOVERY  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `defaultAchievements()` (`admin.mo` 309–326): `doka_1000` + `doka_10000`; `betrayal_witness` + `double_betrayal`; `level_10` (`unstoppable`) on a game with no level cap; all rewards Doka. WX already fires `level_10` at 10 (3591–3593).  
SYSTEMS_AFFECTED: `admin.mo` defaultAchievements; WX achievement checks; AchievementsPanel  
RECOMMENDED_ACTION: Do not add a 100k Doka twin. Retire or relabel `level_10` as a relative milestone (first time relative-band ≥ N), not a cap. Prefer new keys: observe a live family verb, win a named formation peel, claim a discovered spell (after SDE). Rewards may stay Doka but must not be the only fantasy. NEW PLAYER DECISION: “I go looking for a Void Mirror to learn reflect,” not “I stand in maps until XP hits 10.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE discovery persist; CDA-2026-09-02-001 (family verbs must exist to observe)  
REGRESSION_RISK: LOW for new keys; MEDIUM if `level_10` is deleted while clients still call `markAchievementUnlocked("level_10")`  
VALIDATION_REQUIRED: Existing unlock ids that stay active still claim through `claimAchievementReward`; no achievement grants a spell until SDE commit exists  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-011  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Differentiate slime vs frozen; implement or delist four placeholder modifiers  
CATEGORY: TERRAIN  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `slime_flood` and `frozen_terrain` are identical `onMpCost: ×2` (`mapModifiers.ts` 154–172). `blood_moon`, `mirror_field`, `gravity_well`, `fog_of_war` (260–296) are empty hooks with announce text. Numeric reskins already exist: `titans_vigor`, `glass_realm`, `doka_fever`.  
SYSTEMS_AFFECTED: `mapModifiers.ts`; WX active-id branches (`isBloodMoon` etc. at 2287–2295)  
RECOMMENDED_ACTION: Frozen must be ice tiles / slip, not a second slime. Placeholders: implement one distinct verb each (vision cap, attract-on-move, reflect-next-aoe, lifesteal-on-kill) **or** remove from the two-roll. Do not add another ×2 damage modifier. NEW PLAYER DECISION: “Fog: I cannot snipe, I must walk in; Frozen: standing still is safer than sliding into lava.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: Occupancy `applyAttract` for gravity_well; do not invent damage formulas  
REGRESSION_RISK: MEDIUM if fog hides portals (solvability) or gravity pulls onto void  
VALIDATION_REQUIRED: `slime_flood` and `frozen_terrain` produce different battle-log verbs; a listed modifier with empty hooks cannot roll  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-012  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Unify frontend 32-id catalog and backend defaultSpells / boss seed names  
CATEGORY: SPELL_DISCOVERY  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Frontend `SPELL_ID_CATALOG` (`bossKits.ts` 29–62) = 32 ids, all treated as base (`WorldExploration.tsx` 2356–2368). Backend `defaultSpells()` (`admin.mo` 168–191) = six different ids with `linear`/`diagonal`/`hitTiles`. `defaultBossConfigs()` still lists `fireball`, `cursed_gust`, `entangle`, `mist_form` (admin.mo 349+). Live kits cannot assign those ids.  
SYSTEMS_AFFECTED: `spellData.ts`; `admin.mo` defaultSpells / defaultBossConfigs; hydrate `ownedSpells`  
RECOMMENDED_ACTION: One catalog. Backend seeds must be ids that exist in frontend metadata. Do not append Wave-2 SPELL_PROPOSALS into `starterSpells` (that makes discovery worse). NEW PLAYER DECISION: once innate vs acquired splits, “I do not own Void Collapse yet — this bishop’s frost is information,” which is impossible while 32 ids are pre-owned and six others are a parallel universe.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDE-2026-08-31-001 (innate four); SDA catalog admin; CDA-2026-09-02-005 clone pass  
REGRESSION_RISK: HIGH if hydrate drops ids players already have in `spellLevelKeys`  
VALIDATION_REQUIRED: New character innate set is the intended four (after SDE), not 32; backend seed ids ⊆ frontend catalog  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-013  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Freeze new family / Register rows until the live seven bind  
CATEGORY: TEAM_SYNERGY  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Enemy Register lists Crimson Spawn / Shadow Lurker / Storm Caller (`EnemyRegister.tsx` 65–83) that are not `EnemyFamily`. Wave 1+2 sheets already propose 22+ ids. Shipping another sticker repeats CDA-001’s failure at larger scale.  
SYSTEMS_AFFECTED: `EnemyRegister.tsx`; `gameTypes.ts` EnemyFamily; elite evolution docs  
RECOMMENDED_ACTION: Implementers must not add `EnemyFamily` members or Register monsters until CDA-001 is live. Register extras should be labeled proposed/unwired. Wave-2 families stay docs. NEW PLAYER DECISION: none until 001 exists — this id prevents a fake decision (“new name, same Strike pawn”).  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: CDA-2026-09-02-001 is the gate  
REGRESSION_RISK: LOW (docs/process). HIGH if ignored (content flock adds stickers).  
VALIDATION_REQUIRED: `EnemyFamily` union still the original seven + `default` until 001 ships; Register copy for unwired rows is not worded as live  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-014  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Replace dungeon extra-bodies with one wired encounter object  
CATEGORY: OBJECTIVE_PLAY  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Dungeon only adds `[0,2,3,4,4,5]` enemies and `[0,1,2,2,3,3]` tier steps (`WorldExploration.tsx` 5708–5709). ENC-* catalogs and `worldFeatures.ts` (shrine, teleport, elite patrol, spell-bearing enemy) are unwired. Live fight structure is always kill-all.  
SYSTEMS_AFFECTED: dungeon generateEnemies; `worldFeatures.ts` import; ENC-* (pick one)  
RECOMMENDED_ACTION: Wire **one** existing object: ENC-HOLD / ENC-PROT shrine, ENC-WAVE, or `WF-ELT-TOLL_KEEPER`. Do not write ENC-TEACH-03. Depth may pick which **object**, not how many extra pawns. NEW PLAYER DECISION: “the shrine dies if I tunnel the rat” or “I pay HP, take the long path, or fight the keeper.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: WDEAD-2026-08-31-005 / 007; ENC-PROT-01/02; CDA-2026-09-02-009 if a challenge overlay is added  
REGRESSION_RISK: HIGH if a ward token skips `isCellFree` / challenge HP recorders  
VALIDATION_REQUIRED: A depth-2 dungeon can spawn the chosen object; extra random pawn count does not silently remain the only depth lever for that room  
STATUS: NEW  

---

ACTION_ID: CDA-2026-09-02-015  
SOURCE_AUTOMATION: Content Diversity & Repetition Auditor  
TITLE: Fill POSITIONING / REACTION gaps with unused engine + existing proposed spell ids  
CATEGORY: POSITIONING  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `applyPushback` / `applyAttract` (`occupancy.ts` 462, 517) have tests and no spell caller. Live POSITIONING is Swap only. REACTION is Mirror (player) + void 25% reflect. SPELL_PROPOSALS Wave 1 already reserved push, pull, delayed execute, root, real trap, absorb, redirect.  
SYSTEMS_AFFECTED: `spellData.ts` (one id at a time); occupancy callers; enemy kits only after CDA-002  
RECOMMENDED_ACTION: Consume **one** already-proposed id (push **or** attract, not both in the same drop) as metadata + occupancy call. Do not author a new shred. Do not put it on `starterSpells` (CDA-012 / SDE). NEW PLAYER DECISION: “if I stand on this file they slam me into lava / pull me off the shrine — my tile choice is the counter,” which no current enemy kit asks.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SPELL_PROPOSALS-2026-08-31 push/attract ids; CDA-2026-09-02-012 (do not dual-catalog it); CDA-2026-09-02-002 before enemies get it  
REGRESSION_RISK: HIGH if push ignores occupancy / hazards (MIMA landing-authority class)  
VALIDATION_REQUIRED: Spell resolves via flags not `spell.name`; landing uses `isCellFree`; lava/spike HP goes through challenge recorders  
STATUS: NEW  
