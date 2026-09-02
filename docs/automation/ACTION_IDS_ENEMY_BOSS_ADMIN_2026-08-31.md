# ACTION_IDs — 2026-08-31 Enemy & Boss Admin Content Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Enemy & Boss Admin Content Designer.  
Design contract: [`ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md`](./ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md).  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **docs only**.

Sibling IDs to consume, not duplicate: `SDA-2026-08-31-*` (PR #116), `VAL-2026-08-31-*` (PR #121).

---

ACTION_ID: EBA-2026-08-31-001  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Unify EnemyDefinition and drive spawn from active canister documents  
CATEGORY: schema-spawn  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Admin `EnemyConfig` (`src/frontend/src/types/gameTypes.ts` 108–119; `src/backend/types/admin.mo` 15–26; `main.mo` 386–397) is CRUD-complete (`main.mo` 523–541; `AdminDashboard.tsx` 5051–5096) but `generateEnemies` (`WorldExploration.tsx` 6073–6330) never reads `getEnemyConfigs`. A second, unused combat `EnemyConfig` lives in `src/backend/types/common.mo` 97–112. Documented in `docs/TROUBLESHOOTING.md` 164–171 and `docs/ARCHITECTURE.md` 29. Live encounters are random chess pieces + 30% family roll.  
SYSTEMS_AFFECTED: `src/backend/types/admin.mo`; `src/backend/main.mo` enemyConfigs; bindgen `src/frontend/src/backend.ts`; `types/gameTypes.ts`; `WorldExploration.tsx` generateEnemies; new `engine/enemyDefinition.ts`  
RECOMMENDED_ACTION: Persist `EnemyDefinition` (design §3). Spawn loads **active** revisions only. Empty active set keeps today’s procedural fallback (explicit, logged once per map). Do not pass `common.mo` combat `EnemyConfig` into admin APIs. Do not deploy `backend_extended/`.  
AUTONOMY: HUMAN_APPROVE — Motoko persist + spawn wiring.  
DEPENDENCIES: EBA-2026-08-31-002; EBA-2026-08-31-005; EBA-2026-08-31-022  
REGRESSION_RISK: HIGH if empty store is treated as “zero enemies” (silent empty maps). MEDIUM if both types stay overloaded.  
VALIDATION_REQUIRED: With zero active definitions, a new overworld map still spawns 1–8 chess enemies. After activating one definition tagged overworld, that id appears in spawn logs. `pnpm typecheck`; `caffeine check`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-002  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Replace levelMin/levelMax with relative-level eligibility — no character level cap  
CATEGORY: scaling  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Admin template stores `levelMin`/`levelMax` (`gameTypes.ts` 115–116; `admin.mo` 22–23). `newEnemy()` defaults `levelMax: BigInt(5)` (`AdminDashboard.tsx` 108–109). Editor exposes “Level Min/Max” (`AdminDashboard.tsx` 588–598). Region configs repeat the closed band (`gameTypes.ts` 124–125). Product rule: Stralt has **no** character level cap (`xpCurve.ts`; AGENTS.md). Closed ranges silently exclude high-level play.  
SYSTEMS_AFFECTED: EnemyDefinition eligibility; `AdminDashboard.tsx` EnemyEditor; RegionConfig (do not invent region max-level as a world cap); spawn resolver  
RECOMMENDED_ACTION: Persist `RelativeEligibility` (`minOffset`, optional **relative** `maxOffset`, `weightCurve`, dungeon depth, encounter tags). Default `maxOffset = null`. Preview/validate accept any typed player level. Never add a final maximum level field. Region `levelMax` must not be reused as a character cap.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-003  
REGRESSION_RISK: MEDIUM — owners who treated 1–5 as a content gate need a relative offset migration (`minOffset = 1-playerAtAuthoring` is wrong; migrate to inherit-tier curve).  
VALIDATION_REQUIRED: Activate a definition with only `minOffset = -2` and no max. Simulated player levels 1, 80, 800, 8000 all remain eligible. New-enemy draft no longer writes `levelMax = 5`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-003  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Remove the hidden 999 tier cap in pickEnemyLevelFromTiers  
CATEGORY: scaling  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `combatMath.ts` 58: `const maxTier = Math.floor(999 / ts)`. Adjacent / three-or-more branches clamp to `maxTier` (66–68, 94–97). Comment: “cap for reasonable range.” Expansion catalog (#118) already flagged this. `computeAITier` saturates at level 900 → tier 10 (`combatMath.ts` 36–47) — sophistication may plateau; **rolled enemy level must not**.  
SYSTEMS_AFFECTED: `src/frontend/src/engine/combatMath.ts` `pickEnemyLevelFromTiers`; dungeon boost in `WorldExploration.tsx` 6145–6155; admin TierConfigTab preview  
RECOMMENDED_ACTION: Delete `maxTier = floor(999/ts)`. Keep weighted **relative** tier offsets from `TierSpawnConfig` (already admin-editable). AI sophistication may still band; do not clamp the level the curve emits. Extract if the function grows; do not edit damage math.  
AUTONOMY: IMPLEMENT_WITH_TESTS — pure helper; no RAF / mapGen.  
DEPENDENCIES: None  
REGRESSION_RISK: LOW for current mid-level play. HIGH if someone “fixes” overflow by reintroducing a world cap.  
VALIDATION_REQUIRED: Unit tests: playerLevel 1, 50, 200, 1000, 10000 with default weights; emitted enemy level is unbounded and ≥ 1. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-004  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Make boss configs backend-authoritative  
CATEGORY: persistence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `useBossQueries.ts` 1–4, 11–20 reads `localStorage` `pbv_boss_configs`. `useSetBossConfig` (`useAdminQueries.ts` 488–503) writes the same key. Bosses tab (`AdminDashboard.tsx` 6925–6927) tells the owner that localStorage is live. Canister `setBossConfig` / `getAllBossConfigs` (`main.mo` 2062–2096) exist and seed **12** stale bosses (`admin.mo` ~350–568) with purged spell ids. Frontend has **19** `BOSS_IDS` (`bossTypes.ts` 390–410). `ARCHITECTURE.md` 59 already lists `pbv_boss_configs` as a localStorage exception.  
SYSTEMS_AFFECTED: `useBossQueries.ts`; `useAdminQueries.ts`; `AdminDashboard.tsx` BossesTab; `main.mo` bossConfigs; `WorldExploration.tsx` boss portal read (~6938–7026)  
RECOMMENDED_ACTION: Gameplay and Admin read/write `getAllBossConfigs` / `setBossConfig` on `src/backend/main.mo`. One-time import of `DEFAULT_BOSS_CONFIGS` (19) as active revisions; do not let the 12 Motoko seeds overwrite. Stop reading `pbv_boss_configs` after import. Unify schema (`iconEmoji`, `loreText`, `chc`, `adminNotes`). Ship frontend + actor together.  
AUTONOMY: HUMAN_APPROVE — Candid / migration.  
DEPENDENCIES: EBA-2026-08-31-005; SDA-2026-08-31-009  
REGRESSION_RISK: HIGH if the 12-seed map replaces 19 live kits. HIGH if localStorage still wins after hydrate.  
VALIDATION_REQUIRED: After hydrate, mutating a boss in Admin and entering a portal uses the canister document. Non-admin `setBossConfig` returns Unauthorized. Empty localStorage still loads 19 seeded defs from the actor.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-005  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Draft → validate → preview → activate for enemies and bosses  
CATEGORY: lifecycle  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `adminSetEnemyConfig` writes the live map with no checks (`main.mo` 523–528). Enemy Save is immediate (`AdminDashboard.tsx` 5063–5070). Boss “drafts” are in-memory only (`AdminDashboard.tsx` 6856–6868) and Save writes localStorage immediately (`6871–6878`). No revision store. No validate endpoint. SDA-011 specifies the same lifecycle for spells — reuse the pattern, do not invent a third state machine.  
SYSTEMS_AFFECTED: enemy/boss definition maps + revision maps; Admin editor footer; spawn / boss portal (read `activeRevision` only)  
RECOMMENDED_ACTION: Combat and spawn read `activeRevision` only. Editor writes `draftDefinition`. Validate is the shared function in §7. Activate bumps revision (cap 20). Deactivate hides from new content. Rollback clones a prior revision into a new draft, then activate. Immediate live Save is retired.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-004; EBA-2026-08-31-019; SDA-2026-08-31-011  
REGRESSION_RISK: MEDIUM — a draft leaking into `getEnemyConfigs` / boss portal would ship unfinished content.  
VALIDATION_REQUIRED: Dirty draft does not change the next overworld pack or boss portal. Activate without required fields is rejected. Rollback restores prior AP/kit.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-006  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Persist identity fields — name, family, role, lifecycle  
CATEGORY: identity  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Admin form has `id`/`name` only (`AdminDashboard.tsx` 540–553). `family` is assigned at spawn as `"default"` then 30% lore roll (`WorldExploration.tsx` 6213, 6236–6327). `EnemyFamily` is a compile-time union (`gameTypes.ts` 12–20). Boss spawn writes `family: "boss"` (`WorldExploration.tsx` 7021), which is **not** in that union. No `role`, no `active` flag (delete is the only off switch).  
SYSTEMS_AFFECTED: EnemyDefinition / BossDefinition; Admin Identity section; spawn family bind; TypeScript `Enemy.family`  
RECOMMENDED_ACTION: Persist `name` (presentation only), `family` id (seed the seven + `default`; owner-extensible in data), `role` enum (`bruiser|skirmisher|caster|support|controller|leader|summoner`), `lifecycle`. Do not key AI or kits off `name`. Do not put `"boss"` in the enemy family union — bosses use `BossDefinition`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-001  
REGRESSION_RISK: LOW if spawn still accepts `default` family. MEDIUM if existing `family: "boss"` instances are fed into family pixel maps.  
VALIDATION_REQUIRED: Activate rejected without role/family. Rename does not change kit or AI. New family id without art falls back to default pixels.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-007  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Variant records — base, veteran, elite, champion, rare (future via data)  
CATEGORY: variants  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: No variant enum. Closest: 30% family (`WorldExploration.tsx` 6236–6327), pack leader (`12276–12297`), summoner roll (`12198–12208`). `VAL-019` already forbids inferring elite from `scaleY` or `iron_golem` HP. `ENEMY_ONLY` / `ELITE` acquisition routes are specified in SDA-003 but have no elite encounter tag to hang on.  
SYSTEMS_AFFECTED: variant records on EnemyDefinition; spawn resolver; VAL elite eligibility; SDA elite discovery  
RECOMMENDED_ACTION: Persist variant records with `statMult`, `rewardMult`, `kitGate`, `aiSophisticationBias`, `spawnWeightCurve`. Seed `base|veteran|elite|champion|rare`. `#future(Text)` is stored and ineligible until defined. Elite is an explicit flag, never inferred from family or scale. At most one champion per encounter unless the owner overrides.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-008; VAL-2026-08-31-019; SDA-2026-08-31-003  
REGRESSION_RISK: MEDIUM if today’s 30% family roll is silently removed before definitions exist (use fallback path from 001).  
VALIDATION_REQUIRED: Default mix still produces mostly `base`. Elite-only kit ids never assign to `base`. Future variant id does not spawn.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-008  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Data-driven spawn weights, environment tags, dungeon curves, formations, elite chance  
CATEGORY: spawning  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Regions on admin enemies are unused (`AdminDashboard.tsx` 619–677 vs `generateEnemies`). Dungeon extras/boosts are hardcoded arrays (`WorldExploration.tsx` 6082–6083). Placement is quadrant + Chebyshev ≥ 4 (6128–6235), not named formations. Elite chance does not exist. Boss Rush spawn ignores configs (`spawnBossRushRoom`).  
SYSTEMS_AFFECTED: `SpawnRules` on EnemyDefinition; new `engine/spawnFormations.ts`; generateEnemies call site; dungeon depth terms  
RECOMMENDED_ACTION: Persist weights, encounter tags (`overworld|dungeon|boss_rush|elite_pack` + region ids), `depthWeight` curve (default today’s arrays), formation ids (`scatter|pair|frontline|backline_caster|boss_minion_ring`), `eliteChance` as a function of relative offset + depth — **no level cap**. Geometry in `engine/spawnFormations.ts`; do **not** edit `mapGen.ts`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-002; EBA-2026-08-31-007; EBA-2026-08-31-022  
REGRESSION_RISK: MEDIUM — solvability tests (`mapGen.ts` 905–911) reject isolated enemy tiles; formations must still place on valid floors.  
VALIDATION_REQUIRED: `scatter` matches current spacing on a fixture map. Depth 3 uses the default extra-count curve. Tag `dungeon` only definitions do not appear on overworld.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-009  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Author AI profile, sophistication, and tactical modules as explicit metadata  
CATEGORY: ai  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `inferArchetype` (`enemyAI.ts` 420–450) infers healer/caster from spells, flanker from `pieceType === "knight"`, berserker from `family.includes("berserk")` or `aiStrategy === "berserk"` — name/string heuristics forbidden by AGENTS.md. Tactical modules are **global** constants (`gameConstants.ts` 148–301). `computeAITier` is level-banded (`combatMath.ts` 36–52) with a 30% random reroll. Boss AI is one function per id (`useBossAI.ts` DECISION_MAP).  
SYSTEMS_AFFECTED: EnemyDefinition AI block; `engine/enemyAI.ts` inferArchetype; `gameConstants.ts` module ids; boss generic profile  
RECOMMENDED_ACTION: Require `aiProfile`, `sophistication` (`inherit-tier|fixed` + optional relative band), and an allow-list of **existing** module ids. Unknown module → validate fail. Retire `family.includes("berserk")`. Knight may remain a **clone template**, then stored. Global constants become defaults when a definition inherits. Do not change damage math or turn order.  
AUTONOMY: HUMAN_APPROVE — behaviour change if inference is removed before every seed definition has a profile.  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-006; SDA-2026-08-31-006  
REGRESSION_RISK: HIGH if inference is deleted before seeds are written (knights stop flanking). MEDIUM if new modules are invented without engine handlers.  
VALIDATION_REQUIRED: Seeded pawn/knight/bishop/rook/queen/king profiles match today’s inferred behaviour. `family` rename does not change AI. Unknown module id fails activate.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-010  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Formula-based stats and rewards; retire fixed Nat reward fields as the live path  
CATEGORY: rewards-scaling  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Live XP is `enemy.level * 20` (`rewardResolver.ts` `computeVictoryExp` 82–94). Doka is `enemy.level *` a rarity curve in `WorldExploration.tsx` 12643–12678. `common.mo` `xpReward`/`dokaReward` are unused. Admin enemy form has no reward fields. Boss multipliers exist (`rewardDokaMultiplier` / `rewardXpMultiplier`) and are applied (12633–12705). Jackpot tails must not move in this project.  
SYSTEMS_AFFECTED: EnemyDefinition / BossDefinition reward block; `utils/rewardResolver.ts`; victory persist (call site only)  
RECOMMENDED_ACTION: Persist `xpPerResolvedLevel`, `dokaPerResolvedLevel`, optional curve ids defaulting to inherit-global. Pay only through `applyRewards` / root recap. Do not write rewards via `updateCharacter`. Do not use fixed Nats that cannot scale. Do not retune jackpot probabilities here.  
AUTONOMY: HUMAN_APPROVE — persist lock.  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-004  
REGRESSION_RISK: HIGH if a second reward writer appears. LOW if defaults match `* 20` and the existing Doka curve.  
VALIDATION_REQUIRED: Victory with two level-L enemies still grants `2 * L * 20` XP when inheriting. Boss multiplier still applies. Recap is the existing root popup.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-011  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Admin-configurable boss levelOffset and apply getBossEffectiveStats in combat  
CATEGORY: boss-scaling  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Spawn sets `level: characterStats.level + 5` (`WorldExploration.tsx` 6990) and uses raw `baseStats.hp` (6997–7006). `getBossEffectiveStats` (`progression.ts` 308–339) implements unbounded `1.08^(bossLevel-playerLevel)` and is documented as composing with `phase2.statMultiplier` (270–272) but is **UI-only** (Boss Guide). Spawn also `Math.min(50, res/sp)` (7012–7013) — a silent stat cap.  
SYSTEMS_AFFECTED: `engine/progression.ts`; `engine/bossDefinition.ts`; boss portal spawn call site; BossesTab scaling section  
RECOMMENDED_ACTION: Persist `levelOffset` (default +5) and `useLevelDiffScaling` (default true). Combat spawn/init must call `getBossEffectiveStats`. Do not replace the formula with a finite offset table. `BOSS_LEVEL_DIFF_OFFSETS` stays a preview convenience. Make the 50 clamp an explicit field or remove it. Never add a max boss/player level.  
AUTONOMY: HUMAN_APPROVE — changes live boss difficulty. Extract helper; do not grow WX.  
DEPENDENCIES: EBA-2026-08-31-004; EBA-2026-08-31-022  
REGRESSION_RISK: HIGH — turning on 1.08^5 (~1.47×) on top of already-elevated base HP will spike boss HP unless defaults are calibrated to current feel.  
VALIDATION_REQUIRED: Preview at player 10 vs 1000 uses the same offset/formula. Combat HP matches `getBossEffectiveStats` for that pair. Phase 2 still multiplies on top.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-012  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Enemy and boss editors consume SDA kits and discovery chips  
CATEGORY: spell-discovery  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemy admin has **no** spell fields (`admin.mo` 15–26; EnemyEditor 515–697). Kits are `ENEMY_KITS` (`enemyAI.ts` 156–178). SDA-008 specifies CORE/ADVANCED/RARE/ELITE/SIGNATURE. SDA-003 specifies `PLAYER_LEARNABLE`, `OBSERVATION_REQUIRED`, acquisition routes. Boss phase chips (`AdminDashboard.tsx` ~6810) cannot show unresolved or learnability.  
SYSTEMS_AFFECTED: Admin Enemy/Boss spell sections; SDA `EnemyKit` / SpellDefinition; activate gate  
RECOMMENDED_ACTION: Do **not** invent a second kit store. Bind `kitRef` / phase `spellPoolIds` to SDA documents. Show chips: player learnable, observation required, acquisition sources, `usableByEnemy`, resolves. Crimson chip blocks activate. Until SDA-008 merges, show today’s kit ids as read-only plus the zone fix (013).  
AUTONOMY: IMPLEMENT_AFTER SDA-001/003/008  
DEPENDENCIES: SDA-2026-08-31-001; SDA-2026-08-31-003; SDA-2026-08-31-008; SDA-2026-08-31-009; EBA-2026-08-31-013  
REGRESSION_RISK: LOW if chips are read-only. MEDIUM if this studio writes SpellDefinition fields.  
VALIDATION_REQUIRED: Opening a pawn definition shows Strike learnability from SDA flags. Broken boss `fireball` chip is crimson (until SDA-009). No name matching.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-013  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Pass a numeric kit zone into buildEnemyKit (fix object → NaN)  
CATEGORY: kit-resolve  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `buildEnemyKit(pieceType, levelZone: number)` (`enemyAI.ts` 187–193) does `Math.floor(levelZone)`. Battle start passes `currentMap.levelZone` (`WorldExploration.tsx` 12186), which is an object `{ name, minLevel, maxLevel }` (456, 5064, 5613). `Math.floor({})` is `NaN`; `z >= 1` / `z >= 2` are false → **zone-0 kits forever**. Expansion catalog (#118) recorded the same bug. Comment at 12181 still says “10 random spells.”  
SYSTEMS_AFFECTED: `WorldExploration.tsx` assignEnemySpells (call-site only); `engine/enemyAI.ts` or new `engine/enemyKitResolve.ts`  
RECOMMENDED_ACTION: Derive a numeric band from relative player/enemy level or dungeon depth (not from the display object). Keep kit **ids** until SDA-008 replaces `ENEMY_KITS`. Do not invent name-based kit picks. Do not rewrite spawn in the same PR if avoidable — one helper + one call-site.  
AUTONOMY: IMPLEMENT_WITH_TESTS — smallest unique fix; still design-owned so hunters do not “also rewrite kits.”  
DEPENDENCIES: None for the NaN fix; SDA-2026-08-31-008 replaces the table later  
REGRESSION_RISK: MEDIUM — late-game enemies suddenly gain venom/inferno/heal if the numeric band is set ≥ 1. That is restoring intended behaviour.  
VALIDATION_REQUIRED: Unit: `resolveKitZone({name, minLevel, maxLevel})` never returns NaN. High relative offset includes the zone-1 ids in `ENEMY_KITS`. `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-014  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Create and clone bosses without editing BOSS_IDS; register abilities  
CATEGORY: boss-catalogue  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Editor maps `BOSS_IDS` (`AdminDashboard.tsx` 6931; `bossTypes.ts` 390–410). No create control. `useBossAI.ts` requires a `DECISION_MAP` entry. `applyBossAbility` is a closed switch (`useBossSystem.ts`). New boss today = TS + defaults + kit + AI function.  
SYSTEMS_AFFECTED: BossDefinition create/clone; ability registry; optional generic AI profile; `BOSS_IDS` seed  
RECOMMENDED_ACTION: `BOSS_IDS` becomes the seed list, not a ceiling. Create/clone allocate a new id (`draft`). Activate requires every `specialAbilities` tag ∈ registry. Missing custom `decideXAction` is legal if `aiProfile = generic` (`pickBossKitSpell` + tagged abilities). Unknown tag fails validate — no silent no-op.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-004; EBA-2026-08-31-005; EBA-2026-08-31-009  
REGRESSION_RISK: MEDIUM — a cloned boss with copied ability tags but generic AI will play differently from the handwritten original; compare view must say so.  
VALIDATION_REQUIRED: Clone Pale Archbishop → new id, draft, not in overworld until activate. Activate with `NOT_A_REAL_ABILITY` fails. Generic profile still casts phase pool spells.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-015  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Persist Boss Rush rooms as live documents consumed by spawn and rewards  
CATEGORY: boss-rush  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `BOSS_RUSH_ROOMS` (`useBossRush.ts` 23–134) is hardcoded. Room 9 uses `weeping_pawn_2` (126), not in `BOSS_IDS`. Admin tab writes `room_N_enabled` / `room_N_reward` that gameplay never reads. `spawnBossRushRoom` uses 100-HP placeholders. Room-clear persist hardcodes `roomMultiplier = 1`. `dokaReward`/`xpReward` on the table are unused (`rewardResolver.ts` `bossRushRoomReward` never set).  
SYSTEMS_AFFECTED: `useBossRush.ts`; `WorldExploration.tsx` spawnBossRushRoom / handleBossRushRoomClear; `main.mo` boss rush config; Admin Boss Rush tab  
RECOMMENDED_ACTION: Canister room documents: two **active** boss ids, `mechanicIds` (registry) plus optional flavour, enabled flag, reward formulas. Spawn loads real `BossDefinition`s and boss AI. Persist uses the room reward fields through `applyRewards`. Reject unknown ids at validate.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-004; EBA-2026-08-31-014; EBA-2026-08-31-010  
REGRESSION_RISK: HIGH if placeholders are removed before definitions resolve (empty rooms). MEDIUM if reward formulas double-pay with per-boss multipliers.  
VALIDATION_REQUIRED: Room 10 cannot activate with `weeping_pawn_2`. Enabled=false skips the room. Clear pays the document reward once via recap.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-016  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Boss mastery objectives with explicit reward ids  
CATEGORY: mastery  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Repo has **zero** `mastery` fields on bosses. Battle challenges (`challengeCompletion.ts` 38–103) are generic and reward Doka/XP/badge only. SDA-010 adds `spellRewardIds` to achievements/challenges. Boss Guide / EnemyRegister are lore, not objectives.  
SYSTEMS_AFFECTED: BossDefinition `mastery[]`; challenge persist helpers; recap; Admin Boss editor  
RECOMMENDED_ACTION: Optional `BossMasteryObjective` list: `predicateId` (registered), `spellRewardIds`, Doka/XP. Grant on the existing persist lock. Skip retired spell ids (SDA-005). Do not infer the objective from the boss name.  
AUTONOMY: DOCUMENT_THEN_IMPLEMENT after SDA-010  
DEPENDENCIES: EBA-2026-08-31-004; SDA-2026-08-31-010; SDA-2026-08-31-005  
REGRESSION_RISK: LOW if optional and default empty (today’s bosses). MEDIUM if a second recap popup is added — forbidden.  
VALIDATION_REQUIRED: Empty list = current behaviour. One objective with a spell id grants once on success; failure grants nothing. Recap is the root popup.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-017  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Per-entity visual mode NONE / Specific Asset / Asset Pool — default NONE  
CATEGORY: visual  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemy editor is a single optional URL (`AdminDashboard.tsx` 602–616) unused by the renderer (`VAL-012`). Visuals tab is map paper colours (`AdminDashboard.tsx` 4056–4236), not entity art. Bosses use 8×12 patterns + scale 1.4 (`WorldExploration.tsx` 6988–6989). VAL-001/003/004/007/008 specify fallback, specs, `boss_large`, and no gameplay invalidation.  
SYSTEMS_AFFECTED: EnemyDefinition / BossDefinition visual block; Admin Visual section; VAL library / resolver  
RECOMMENDED_ACTION: Persist `visualMode: none|asset|pool` default **none**. Controls: Use Default Pixel Visual, Select Uploaded Visual, Select Visual Pool, Preview, Manage Assets. Show category upload spec beside controls (`enemy_standard` vs `boss_large`). Never let visual bind change stats, AI, occupancy, range, or rewards. Do not re-implement the VAL library or `drawImage(spriteUrl)`.  
AUTONOMY: IMPLEMENT_AFTER VAL-001/003/004/010  
DEPENDENCIES: VAL-2026-08-31-001; VAL-2026-08-31-003; VAL-2026-08-31-004; VAL-2026-08-31-007; VAL-2026-08-31-008; VAL-2026-08-31-010; EBA-2026-08-31-020  
REGRESSION_RISK: HIGH if a hunter wires raw `spriteUrl` into draw. LOW if default NONE is identity.  
VALIDATION_REQUIRED: New enemy/boss with no uploads matches current pixels. Asset mode + deleted asset → builtin next frame. Occupancy stays one tile for a 34×50 boss.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-018  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Clone, compare, deactivate, and rollback  
CATEGORY: lifecycle-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemy presets (`AdminDashboard.tsx` 357–513) are localStorage snapshots of the orphaned template (max 10), not canister clones. Boss Reset writes `DEFAULT_BOSS_CONFIGS` (`6881–6894`), not a prior revision. No compare UI. Delete is hard remove (`main.mo` 531–536, 2080–2085).  
SYSTEMS_AFFECTED: Admin Library actions; revision maps; spawn eligibility  
RECOMMENDED_ACTION: Clone → new id, draft, copy definition, clear portal/rush refs. Compare → field diff (eligibility, kit, AI, visual, rewards). Deactivate → no new spawn. Rollback → prior revision into a new draft, then validate/activate. LocalStorage presets are superseded.  
AUTONOMY: IMPLEMENT_AFTER EBA-005  
DEPENDENCIES: EBA-2026-08-31-005; EBA-2026-08-31-021  
REGRESSION_RISK: LOW. MEDIUM if clone keeps the same id or stays `active`.  
VALIDATION_REQUIRED: Clone does not appear in generateEnemies until activate. Compare highlights a kit id change. Rollback restores prior `levelOffset`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-019  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Unbounded encounter preview and the activate validation suite  
CATEGORY: validation  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: No preview of a spawned enemy at player level N. Boss Guide scaling table uses only offsets -2/0/+2/+5 (`progression.ts` 346–347). Activate checks today: enemies none; bosses empty id/name and `ap > 20` (`main.mo` 2066–2074). `validateBossKits()` (`bossKits.ts` 703–753) is startup-only for defaults. Admin can save invalid spell ids.  
SYSTEMS_AFFECTED: `engine/encounterPreview.ts`; `engine/contentValidate.ts`; Admin footer; activate endpoints  
RECOMMENDED_ACTION: Preview uses the same resolver as spawn: owner-typed player level (no max), seed, tags → stats, variant, kit chips, AI, visual. Validate §7: required fields, AI/spell compatibility, SpellConfig, spawn rules, rewards, visual fallback, render profile, references, encounter compatibility. `ap > 20` stays a **combat AP** clamp, not a level cap.  
AUTONOMY: IMPLEMENT_WITH_TESTS for the pure validator; UI after 020  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-002; EBA-2026-08-31-005; EBA-2026-08-31-012; EBA-2026-08-31-017  
REGRESSION_RISK: LOW for preview (admin-only). MEDIUM if validator rejects all current seeds (import must pre-validate or grandfather as drafts).  
VALIDATION_REQUIRED: Preview playerLevel 1 and 10000 both render. Missing `aiProfile` fails activate. Visual asset fail still previews builtin. No RAF use.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-020  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Owner studio UI — carved-stone, crimson-accent, dev-gated  
CATEGORY: admin-ui  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemies / Bosses / Boss Rush / Visuals / Sprites are separate tabs (`AdminDashboard.tsx` 4056+, 5051+, 6310+, 6849+). Access already gated (`ARCHITECTURE.md` 206–208; `#admin` writes). Styling already matches DESIGN.md (slate, gold dim, crimson delete). AGENTS.md: admin never ships to normal players.  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` tab cluster only; admin hooks  
RECOMMENDED_ACTION: Add Library / Editor / Rush / Compare / Preview / Versions as in design §8. Footer: Validate → Preview → Activate. Keep existing `data-ocid` prefixes and Ankama/Dofus language. Lazy-load stays. No player HUD entry. Do not persist drafts only in the browser.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN — UI follows 001/004/005 APIs.  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-004; EBA-2026-08-31-005; EBA-2026-08-31-017; EBA-2026-08-31-019  
REGRESSION_RISK: LOW for players if still gated. MEDIUM if editor save bypasses activate.  
VALIDATION_REQUIRED: Non-admin build has no studio routes. Desktop + existing ≥768px gate. Keyboard path through Validate → Preview → Activate.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-021  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Soft-retire enemies and bosses; block hard delete of published content  
CATEGORY: dependency-safety  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `adminDeleteEnemyConfig` / `deleteBossConfig` are hard `remove` (`main.mo` 531–536, 2080–2085). UI is a red × (`AdminDashboard.tsx` 5089–5093). SDA-005 specifies the same lifecycle for spells; boss seeds still reference purged ids. Rush rooms and portal assignments would dangle.  
SYSTEMS_AFFECTED: admin delete/set; spawn resolver; rush / portal refs; Admin retire modal  
RECOMMENDED_ACTION: Lifecycle `draft|active|inactive|retired`. Hard delete only drafts with zero published revisions and zero dependents; else `#err` + dependency report (kits, rush rooms, portals, mastery, live instance best-effort). Retired ids: no new spawn; in-flight encounters finish; resolver skips. Mirror SDA-005; do not invent a fourth state machine.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBA-2026-08-31-005; SDA-2026-08-31-005  
REGRESSION_RISK: HIGH if delete stays hard after kits exist.  
VALIDATION_REQUIRED: Retire a boss listed in a rush room: room validate fails; delete returns err; in-progress room still resolves the frozen revision. Draft-only delete succeeds.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-022  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Extract enemy/boss admin behaviour into engine helpers — do not grow WorldExploration  
CATEGORY: sensitive-code  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: AQA-2026-08-30-007 / AGENTS.md: no drive-by WX / RAF / mapGen / turn / damage edits. `WorldExploration.tsx` already owns `generateEnemies` (6073–6330), family pixels (4148–4220), boss spawn (6967–7026), kit assign (12181–12208). Quality audit: 19k+ lines, heavy automation churn. VAL-017 states the same extraction rule for visuals.  
SYSTEMS_AFFECTED: `engine/enemyDefinition.ts`; `engine/enemyKitResolve.ts`; `engine/spawnFormations.ts`; `engine/bossDefinition.ts`; `engine/encounterPreview.ts`; `engine/contentValidate.ts`; WX call sites  
RECOMMENDED_ACTION: New behaviour lives under `src/frontend/src/engine/*` with tests. WX/admin get wiring only. Reject implementer PRs whose primary hunk is another WX branch for this feature. Do not edit `mapGen.ts`.  
AUTONOMY: PROCESS — apply to every EBA implementer PR.  
DEPENDENCIES: AQA-2026-08-30-007; VAL-2026-08-31-017  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Implementer diff: WX line delta small; tests sit beside the helper.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-023  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Honour canister boss portal assignments at world spawn  
CATEGORY: boss-portals  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `setBossPortalAssignment` / `getBossPortalAssignments` (`main.mo` 2098–2116) persist `portalId → bossId`. Frontend `useSetBossPortalAssignment` (`useAdminQueries.ts` 519–534) is a no-op invalidate. World boss portals pick a **random** `BOSS_IDS` entry (~5281–5282).  
SYSTEMS_AFFECTED: `useAdminQueries.ts`; boss portal generation call site; Admin portal picker  
RECOMMENDED_ACTION: Resolve assignment from the canister first, then weighted eligible active bosses, then seed list. Delete the no-op hook. Assigned boss id must be `active` or the portal falls back and logs once. Do not edit mapGen solvability.  
AUTONOMY: IMPLEMENT_AFTER EBA-004  
DEPENDENCIES: EBA-2026-08-31-004; EBA-2026-08-31-014  
REGRESSION_RISK: LOW. MEDIUM if a retired assignment hard-crashes portal entry.  
VALIDATION_REQUIRED: Assigned `pale_archbishop` opens that boss. Retired assignment falls back. Random still works when the map is empty.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-08-31-024  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Point EnemyRegister and Boss Guide at active definitions  
CATEGORY: player-facing-catalog  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `EnemyRegister.tsx` hardcodes `MONSTERS` (22–83) and `BOSSES` (85–207) — lore, not configs. `BossGuideModal.tsx` reads defaults + `getBossScalingRows`. Admin edits never appear.  
SYSTEMS_AFFECTED: `EnemyRegister.tsx`; `BossGuideModal.tsx`; active definition queries  
RECOMMENDED_ACTION: Read **active** EnemyDefinition / BossDefinition for names, lore, discovery chips, and scaling preview. Keep presentation player-facing; do not expose admin/drafts. Empty custom visuals still show builtin pixels. Do not invent a second bestiary store.  
AUTONOMY: IMPLEMENT_AFTER 001/004  
DEPENDENCIES: EBA-2026-08-31-001; EBA-2026-08-31-004; EBA-2026-08-31-011; SDA-2026-08-31-003  
REGRESSION_RISK: LOW if drafts stay hidden. MEDIUM if inactive ids vanish from a player mid-codex — show retired-but-seen as seals (SDA pattern).  
VALIDATION_REQUIRED: Activating a rename updates the register after hydrate. Draft name does not. Scaling table uses the same formula as combat (011).  
STATUS: NEW  
