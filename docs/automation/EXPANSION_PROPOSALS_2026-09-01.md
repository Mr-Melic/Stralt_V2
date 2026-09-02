# Stralt expansion catalog — 2026-09-01

> **Living catalog moved:** [`EXPANSION_PROPOSALS_2026-09-02.md`](./EXPANSION_PROPOSALS_2026-09-02.md). This file is the 2026-09-01 archive. Cards here remain **PROPOSED** (none shipped).

**Author:** Expansion Director (cron `0 */24 * * *`, automation `3f31b18f-a492-11f1-a7d1-d6b4613131ce`)  
**This run:** second catalog. Re-rank against `main` `dd275aa` (`Merge pull request #182` — Caffeine import gates).  
**Prior catalog:** [`EXPANSION_PROPOSALS_2026-08-31.md`](./EXPANSION_PROPOSALS_2026-08-31.md) (`HEAD` then `22503b5`, merged as #118).  
**Gameplay / production code:** not modified.

All twelve 2026-08-31 cards remain **PROPOSED**. None shipped. None superseded. New IDs in this file are additive.

Score used for ranking (unchanged):

```
SCORE = PLAYER_VALUE + TACTICAL_DEPTH + REPLAYABILITY + NOVELTY
      + INFINITE_PROGRESSION_COMPATIBILITY
      − IMPLEMENTATION_COMPLEXITY − REGRESSION_RISK − BALANCE_RISK
```

Each axis is 1–10. A proposal is only strong if it creates a **new player decision** and multiplies existing axes (family × relative level × variant × AI tier × spell pool × elite × composition × map × modifier) instead of adding another HP-scaled clone.

---

## Delta since 2026-08-31

| Fact | Evidence |
| :--- | :--- |
| Integrity / persist / targeting / Caffeine burst landed | `#103`–`#182` on `main`. Official-client wallet, leftover-XP HUD, applyRewards clamp, death-replay, map destack. |
| Expansion **implementation** did not land | Families, kits, discovery, elites, pack recipes, mechanic challenges — still the 08-31 shapes. |
| Sibling **design** sheets landed | See § Sibling designs. Do not re-sheet them. Rank **implementation slices**. |
| `WorldExploration.tsx` grew | 19,619 → **20,063** lines. PREREQ-D still binds. |
| PREREQ-A / B / C still live | Re-read below with current line numbers. |
| New honesty bugs | Family HP overlay is discarded at battle start. `inferArchetype` treats any `healAmount > 0` as healer. |
| Practical XP horizon | [`LONG_HORIZON_2026-08-31.md`](./LONG_HORIZON_2026-08-31.md): mid-teens exhaust intended income; level 25 is ~1.678e9 XP. Not a level cap. Content must work at **1–20** *and* stay valid if someone is still climbing. Do **not** retune `100 * 2^(N-1)` as an expansion. |
| `worldFeatures.ts` exists, unwired | Data + tests only. No WX import. Placement overlay is the WORLD implement path. |
| Open drafts (do not parallel) | #183 death-replay after portal/Doka; #180 leftover Doka/rename/shop; #174 Candid rollback; #173 helper-suite lock. |
| Telemetry | Still none. No live demand claims. |

---

## Sibling designs (owned surfaces — do not duplicate)

| Sheet | Owns | Director card it details |
| :--- | :--- | :--- |
| [`ENEMY_ELITE_EVOLUTION_2026-08-31.md`](./ENEMY_ELITE_EVOLUTION_2026-08-31.md) | Family sheets, variant floors, pack recipes | 001, 002, 004, 014 |
| [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) | Observe → win → unlock; pool generations | 003 |
| [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md) | `ownedSpellIds` / `observedSpellIds` persist types | 003 persist |
| [`SPELL_PROPOSALS_2026-08-31.md`](./SPELL_PROPOSALS_2026-08-31.md) | 16 gap-fill tactical ids | **Hold** until 003 is live |
| [`ENEMY_AI_EVOLUTION.md`](../ENEMY_AI_EVOLUTION.md) | Unbounded AI modules | 005 |
| [`BOSS_AND_SPELL_DISCOVERY.md`](../design/BOSS_AND_SPELL_DISCOVERY.md) | 19 boss sheets + adaptations | 011 |
| [`ENCOUNTER_EVOLUTION_2026-08-31.md`](../encounters/ENCOUNTER_EVOLUTION_2026-08-31.md) | Teach → pressure dungeon beats | 007, 010 |
| [`WORLD_DYNAMICS.md`](../WORLD_DYNAMICS.md) + `engine/worldFeatures.ts` | Rarity / relative-difficulty world overlay | 009, 016 |
| [`ENEMY_FORMATIONS_2026-08-31.md`](../design/ENEMY_FORMATIONS_2026-08-31.md) | Synergy packs | 004 |
| [`MECHANIC_INTERACTION_MATRIX_2026-08-31.md`](./MECHANIC_INTERACTION_MATRIX_2026-08-31.md) | Live join gaps (swap × hazard, unused push/pull) | 013 |
| [`MASTER_ROADMAP.md`](./MASTER_ROADMAP.md) + [`QUALITY_AUDIT_2026-08-30.md`](./QUALITY_AUDIT_2026-08-30.md) | P0 integrity before expansion PRs | Process, not content |

Implementers pick **one** director ID. Follow the sibling sheet for that ID. Do not open a second family / discovery / boss catalog.

---

## Current-state inventory (re-verified on `dd275aa`)

### Progression (no character level cap)

- XP curve is unbounded: `100 * 2^(N-1)` (`utils/xpCurve.ts`, `docs/ARCHITECTURE.md` rewards).
- Enemy levels use `pickEnemyLevelFromTiers` (`engine/combatMath.ts` 54–107): default weights 60% same tier / 20% ±1 / 10% ±2 / leftover ±3..6. This **already** produces below / near / equal / above the player. Keep it.
- Hidden utility clamp: `maxTier = Math.floor(999 / ts)` at `combatMath.ts` 58. Past player level ~1000 the distribution stops climbing. `threeOrMorePercent` is **not read** (leftover fills the bucket). Both contradict “no character level cap” as architecture, even if LONG_HORIZON says those levels are not the live game.
- `computeAITier` (`combatMath.ts` 36–51) plateaus at 10 after enemy level 900, with a 30% full-random roll. Plateau is acceptable **if** tier 10 keeps unlocking mechanics, not more HP.

### Enemies

- Seven families typed (`types/gameTypes.ts` 12–20): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`.
- Spawn still writes `family: "default"` (`WorldExploration.tsx` 6424), then a 30% roll overwrites family **and only multiplies paper HP / damage / RES / SP** (`WorldExploration.tsx` 6448–6537).
- Battle start then sets combat HP from `calcEnemyMaxHp(level)` = `floor(50 * (1 + (level-1) * growthRate))` (`WorldExploration.tsx` 3625–3630, 12533–12538, 12555–12561). **Family HP multipliers never reach the fight.**
- Three live combat hooks only: `ember_knight` melee burn and `tide_shade` melee −1 MP (`WorldExploration.tsx` 17224–17256); `void_mirror` 25% pre-crit reflect (`castHelpers.ts` 327–336). The other four families are art + dead paper.
- Piece-type kits exist (`engine/enemyAI.ts` 156–178) and grow at zone 1 / 2. Battle start calls `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WorldExploration.tsx` 12484). `levelZone` is an **object** `{ name, minLevel, maxLevel }` (`WorldExploration.tsx` 5265–5269). `buildEnemyKit` does `Math.floor(levelZone)` (`enemyAI.ts` 192) → `NaN` → every `z >= 1` check fails. **Every overworld enemy is stuck on the one-spell zone-0 kit.** Comment at 12479 (“10 random spells”) is still stale.
- `inferArchetype` (`enemyAI.ts` 420–425) returns `"healer"` if any assigned spell has `healAmount > 0`. Drain kits become healers. Blocks family support/drain rows.
- Leader death → erratic and 5% betrayal still exist. `ENEMY_AI_TIER_GATES` (`gameConstants.ts` 200–208) names `groupTactics`, `instantKill`, `chokepointCamp`, `escapeRoute`, `bottleneckControl`, `defensiveRetreat`. **Zero references in `enemyAI.ts`.** Master AI toggles (lethal lookahead, LoS reposition, backline protect) are **global on**, not `aiTier`-gated.
- Summoner chance is `0.12 + playerLevel * 0.02` (`WorldExploration.tsx` 12496–12498; constants `gameConstants.ts` 298–299). Saturates by mid-40s. `ENEMY_SUMMON_CAP = 2` contains the board.

### Spells / discovery

- Frontend catalog: 32 ids in `data/bossKits.ts` `SPELL_ID_CATALOG` (29–62) / `data/spellData.ts`.
- `WorldExploration.tsx` 2393–2404 marks **every** `starterSpells` entry `isBaseSpell: true`. No observe / kill / achievement / elite unlock path. `ownedSpells` is base ∪ backend extras (2408–2419).
- Backend `defaultSpells()` (`src/backend/lib/admin.mo` 168–191) is still a **different** six-spell set (`shadow_strike`, `soul_rend`, `vampire_bite`, `reflect_barrier`, `thunder_clap`, `void_collapse`). Dual catalogs.
- Targeting is metadata-driven. New spells must stay on that contract (`AGENTS.md`).

### Combat / world / dungeons / bosses

- 22 map modifiers in `engine/mapModifiers.ts`. Four are announce-only stubs: `blood_moon`, `mirror_field`, `gravity_well`, `fog_of_war` (260–296). `slime_flood` and `frozen_terrain` (155–173) are the same MP-doubler.
- `titans_vigor` still adds **+1000 HP** and 1–5× damage rolls (`mapModifiers.ts` 300+). That is the anti-pattern this brief forbids.
- `engine/worldFeatures.ts` is a rarity / relative-difficulty catalog with tests. **No production caller.**
- Seven map archetypes. Further `mapGen.ts` work stays frozen (`AGENTS.md`; #110 already merged).
- Dungeon chain is still linear 3–5 maps. `types/dungeon.ts` is a tile editor — no special rooms, no forks.
- 19 bosses, two phases. Boss Rush is a fixed 10-room pair table. Level-diff scaling is ±8% per level (`engine/progression.ts`).
- Challenges: nine numeric predicates (`utils/challengeCompletion.ts` 11–20, 38–103). No composition / interrupt / modifier / discovery objectives.
- Achievements: 15 one-shots (`admin.mo` 309–325). `unstoppable` / `level_10` is a capped milestone. Nothing repeats as the player keeps leveling.

### Engineering-health constraints

- No player telemetry. Do not claim live demand.
- New behavior belongs in `src/frontend/src/engine/*` or `src/frontend/src/utils/*` with tests; WX gets one-line wiring.
- Do not touch RAF, **map generation**, turn logic, or damage math (`AGENTS.md`).
- Credits still go through `applyRewards`; spends / death through `saveBattleStats` on `createProgressPersist`. No second reward funnel.
- Discovery that writes ownership must enqueue on the persist lock. Do not invent a third wallet path. Do not race #183 / #180.
- Caffeine import gate is now CI on every PR (`#182`). Expansion PRs must pass `bash scripts/caffeine-import-gate.sh all`.
- Client-trusted canister writes remain an architecture decision (AQA-2026-08-30-008), not an expansion.

---

## Prerequisites (not expansions — fix or respect before shipping content)

| ID | Finding | Why it blocks infinite / combinatorial content | Status |
| :--- | :--- | :--- | :--- |
| PREREQ-A | `buildEnemyKit(..., currentMap.levelZone)` passes `{ name, minLevel, maxLevel }`; kits never leave zone 0 (`WX` 12484, `enemyAI.ts` 192) | Spell-pool depth is implemented and dead. Pass a **number**: `floor((enemy.level-1)/tierSize)` or relative band `R = enemy.level − player.level`. | OPEN |
| PREREQ-B | `pickEnemyLevelFromTiers` clamps at 999 (`combatMath.ts` 58). `threeOrMorePercent` unread | High-level players stop seeing above-level enemies. Remove the 999 ceiling; keep the existing weight math; actually use the fifth percent. | OPEN |
| PREREQ-C | Summoner chance uses raw `characterStats.level` (`WX` 12496–12498) | Saturates by the mid 40s. Use player **tier** and keep `ENEMY_SUMMON_CAP`. Practically less urgent than A (XP dies first) but still collapses variety if anyone gets there. | OPEN |
| PREREQ-D | Do not grow `WorldExploration.tsx` (20,063 lines) | Family / elite / discovery tables must live in engine modules. | OPEN |
| PREREQ-E | Persist drafts still open (#183, #180) | Discovery that writes `spellLevelKeys` / `ownedSpellIds` must enqueue on the persist lock. | OPEN |
| PREREQ-F | `inferArchetype` treats any `healAmount > 0` as healer (`enemyAI.ts` 420–425) | Drain / lifesteal family rows become healers. Gate on `spellType === "heal"` only (or an explicit `aiHint`). | OPEN (new) |
| PREREQ-H | Battle start overwrites family HP via `calcEnemyMaxHp` (`WX` 12533–12561) | The 30% family roll is a lie even as stat flavor. Carry family identity into combat HP **or** stop multiplying paper HP. | OPEN (new) |

PREREQ-G (dual frontend / Motoko spell catalogs) stays a hygiene note, not a ship-blocker for 001/014/006. Align ids when a spell PR actually touches `defaultSpells()`.

---

## Ranked opportunities

| Rank | EXPANSION_ID | Title | Category | SCORE | Priority | vs 08-31 |
| ---: | :--- | :--- | :--- | ---: | :--- | :--- |
| 1 | EXP-2026-08-31-001 | Family role kits (stop using families as HP skins) | ENEMIES | 30 | P0 | same #1 |
| 2 | EXP-2026-08-31-006 | Mechanic challenge catalog | PROGRESSION | 29 | P0 | was #3 |
| 3 | EXP-2026-09-01-014 | Mute-family combat hooks (four families have none) | ENEMIES | 28 | P0 | **new** — first ship slice of 001 |
| 4 | EXP-2026-08-31-002 | Elite / champion modifier tokens | ENEMIES | 28 | P1 | was #4 |
| 5 | EXP-2026-08-31-004 | Pack role composition | ENEMIES / AI | 28 | P1 | was #5 |
| 6 | EXP-2026-08-31-003 | Observed-spell discovery | SPELL DISCOVERY | 27 | P0 | was #2 — persist coupling after merge burst |
| 7 | EXP-2026-08-31-010 | Optional tactical objectives | COMBAT | 24 | P1 | same |
| 8 | EXP-2026-08-31-008 | Uncapped achievement / mastery ladder | PROGRESSION | 23 | P2 | was #10 — real long-term loop once XP income dies |
| 9 | EXP-2026-08-31-013 | Explicit spell-interaction layer | COMBAT | 23 | P2 | same |
| 10 | EXP-2026-09-01-016 | Wire `worldFeatures` overlay (no mapGen rewrite) | WORLD | 23 | P2 | **new** |
| 11 | EXP-2026-08-31-009 | Finish stub modifiers + combo-only world rules | WORLD | 22 | P2 | same |
| 12 | EXP-2026-08-31-005 | AI sophistication ladder (unused gates) | AI | 21 | P2 | same |
| 13 | EXP-2026-08-31-007 | Dungeon room types without rewriting mapGen | DUNGEONS | 21 | P2 | same |
| 14 | EXP-2026-08-31-011 | Boss mechanic-pool scaling (not more HP) | BOSSES | 17 | P3 | same |
| 15 | EXP-2026-09-01-015 | Convert Titan's Vigor off +1000 HP | WORLD | 15 | P3 | **new** |

---

## Proposal cards

### EXP-2026-08-31-001

**TITLE:** Family role kits (stop using families as HP skins)  
**CATEGORY:** ENEMIES  
**PLAYER_OPPORTUNITY:** Choose a kill order and positioning answer for *this* family on *this* board, not “the slightly thicker pawn.”  
**MECHANIC:** Data table `family → { archetype, spellPoolIds by relative band, preferredAI, threatTag }`. The existing 30% family roll (`WX` 6448–6537) keeps firing, but assigns **kits and AI**, not only `hpMult` / `dmgMult`. Piece type remains a variant axis (bishop wraith ≠ pawn wraith).  
**WHY_IT_IMPROVES_STRALT:** Families are already in the type system and art path. After PREREQ-H they create almost no combat decision except three melee hooks. Wiring kits is still the cheapest combinatorial multiplier in the repo.  
**SYSTEMS_AFFECTED:** `engine/enemyAI.ts` (`buildEnemyKit` / new `buildFamilyKit`); spawn assignment extracted from `WX` 6339–6537 into `engine/`; `types/gameTypes.ts` `EnemyFamily` only if a family is added. Follow [`ENEMY_ELITE_EVOLUTION_2026-08-31.md`](./ENEMY_ELITE_EVOLUTION_2026-08-31.md).  
**INFINITE_PROGRESSION_BEHAVIOUR:** Band index from **enemy** level vs player (`R`), no max. New rows unlock at high bands (extra control spell, then a synergy tag). HP stays the existing level roll.  
**IMPLEMENTATION_APPROACH:** After PREREQ-A and PREREQ-F. Pure table next to `ENEMY_KITS`. Example: `void_mirror` → mirror/reflect + swap; `plague_rat` → stacked DoT + sacrifice; `iron_golem` → iron-skin + body-block; `bone_scribe` → mark + weaken; `tide_shade` → attract/push + frost. Resolve ids only through `SpellConfig.id`. Unit-test kit contents per (family, piece, band). 014 can land first as the hook slice.  
**BALANCE_CONSIDERATIONS:** Flatten or drop family stat mults (they already die at battle start). Do not give every family Inferno at band 0.  
**QA_REQUIREMENTS:** Band 0 / 1 / 2 / 20 kits are distinct; `usableByEnemy` honored; no name-based targeting; pack of mixed families still ends via existing death pipeline.  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 | 9 | 9 | 6 | 4 | 4 | 5 | 10 |

**What new decision does this create?** “The golem is the cover; the scribe is the Mark. Who dies first on this terrain?”

---

### EXP-2026-08-31-006

**TITLE:** Mechanic challenge catalog  
**CATEGORY:** PROGRESSION  
**PLAYER_OPPORTUNITY:** Accept a fight objective that changes **how** you spend AP/MP this battle, not only “go faster / take less.”  
**MECHANIC:** Extend `ChallengeCondition` in `utils/challengeCompletion.ts` (11–20) with metadata-driven conditions: `kill_leader_last`, `no_summons`, `no_hazard_steps`, `modifier_survivor`, `only_observed_spell`, `interrupt_channels`. Rewards stay on the existing recap → `applyRewards` funnel and live-ref persist.  
**WHY_IT_IMPROVES_STRALT:** The nine current challenges are all numeric (`under_N_turns`, damage caps, AP cap). They do not interact with family / elite / modifier / discovery. Isolated module; no persist-lock fight with #183. Raised to rank 2 this run because it ships decisions **now** at levels 1–20.  
**SYSTEMS_AFFECTED:** `challengeCompletion.ts` + tests; `ChallengePanel.tsx` copy. No XP-curve change.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Predicates are relative to the live encounter. A high-band elite pack makes `kill_leader_last` harder without a level cap.  
**IMPLEMENTATION_APPROACH:** One condition per PR, with a helper test, same style as `#51`. Do not put predicate logic in `WorldExploration.tsx`.  
**BALANCE_CONSIDERATIONS:** Keep legendary rewards in the current 400–1000 XP band so they do not outrun `2^(N-1)`. No per-kill resolver calls.  
**QA_REQUIREMENTS:** Touch vs mouse hazard parity still feeds `no_hazard_steps`; Untouchable still uses `recordChallengeDamageTaken`; Attack Nearest still records AP; Sacrifice HP still counts (`#` post-08-31).  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 8 | 8 | 6 | 4 | 3 | 3 | 9 |

**What new decision does this create?** “The challenge is kill-leader-last — do I burn the rats first and eat the leader boost, or race the crown?”

---

### EXP-2026-09-01-014

**TITLE:** Mute-family combat hooks  
**CATEGORY:** ENEMIES  
**PLAYER_OPPORTUNITY:** Read four families the way Ember / Tide / Void already force a read — before kits exist.  
**MECHANIC:** Extract the three live hooks into `engine/familyHooks.ts` (`onMeleeHit`, `onSpellTaken`). Add the four mute families using **existing** effect types only: `plague_rat` → venom stack on melee; `bone_scribe` → Weaken on first damaging spell; `iron_golem` → ignore poison/burn, stagger (skip next move) after an AP-dump hit; `wraith_bishop` → first walk through a wall-adjacent tile costs +1 MP (occupancy already has MP hooks). No new damage formula.  
**WHY_IT_IMPROVES_STRALT:** This is the first shippable slice of 001. Three families already teach “family means a rule.” Four families teach nothing. Does **not** wait on PREREQ-A.  
**SYSTEMS_AFFECTED:** New `engine/familyHooks.ts` + tests; one-line calls from the existing melee block (`WX` 17224) and `castHelpers.ts` (void_mirror moves here). Do not add a seventh family.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Hooks are identity, not level. Later 001 rows add spells on top; hooks stay valid at any band.  
**IMPLEMENTATION_APPROACH:** Copy the ember/tide `applyActiveEffect` pattern. Ids, not names. Do not put new `if (family === …)` chains in WX — dispatch from the table.  
**BALANCE_CONSIDERATIONS:** Rat DoT must not outrun Ember’s 3/3. Golem immunity is to **status**, not to damage. No HP mult (PREREQ-H).  
**QA_REQUIREMENTS:** Default-family packs unchanged; mixed-family pack applies only the acting combatant’s hook; challenge damage still records ember/void reflect; death pipeline unchanged.  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 8 | 8 | 6 | 3 | 4 | 4 | 9 |

**What new decision does this create?** “The golem shrugs poison — Inferno it. The rat is a stack race. The scribe’s first hex is the one I interrupt.”

---

### EXP-2026-08-31-002

**TITLE:** Elite / champion modifier tokens  
**CATEGORY:** ENEMIES  
**PLAYER_OPPORTUNITY:** Treat one combatant as a named puzzle (shielded, hexer, coordinator, phase-step) instead of “same kit, more HP.”  
**MECHANIC:** A map-modifier-shaped registry (`engine/eliteModifiers.ts`): tokens with hooks (`onBattleStart`, `onDeath`, `onCast`, `onAllyDeath`). Spawn rolls 0–1 elite per pack; chance scales with **tier**, not raw HP. Tokens are ids (`shielded`, `hexer`, `coordinator`, `echo_cast`, `phase_step`), never name heuristics.  
**WHY_IT_IMPROVES_STRALT:** There is still no elite layer (leader boost + betrayal are the only specials). Tokens multiply family × kit × AI tier without new creature art. Sheet: [`ENEMY_ELITE_EVOLUTION_2026-08-31.md`](./ENEMY_ELITE_EVOLUTION_2026-08-31.md).  
**SYSTEMS_AFFECTED:** New engine registry; spawn extract; initiative / nameplate badge (stone + crimson, `DESIGN.md`); optional observe source for 003.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Higher tiers add a **second** token or a coordinated pair, not +N% HP. Token table is append-only.  
**IMPLEMENTATION_APPROACH:** Copy the hook-union pattern from `engine/mapModifiers.ts` (32–40). Do not apply tokens by multiplying `level * 8 + 20` again.  
**BALANCE_CONSIDERATIONS:** One elite per pack until 004. Coordinator must not grant infinite AP.  
**QA_REQUIREMENTS:** Elite death still goes through `deathPipeline.ts`; leftover-roster XP unchanged; token hooks do not write Doka.  
**PRIORITY:** P1  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 | 9 | 10 | 8 | 6 | 6 | 6 | 10 |

**What new decision does this create?** “The hexer dies first or my AP budget collapses — even if the golem is closer.”

---

### EXP-2026-08-31-004

**TITLE:** Pack role composition  
**CATEGORY:** ENEMIES / AI  
**PLAYER_OPPORTUNITY:** Read a pack as roles (anchor, battery, kiter, summoner) and choose a breach point.  
**MECHANIC:** Replace independent per-enemy rolls with a pack recipe: 1 anchor + 1 battery + N fillers + at most one summoner. Recipes keyed by player **tier**. Uses existing archetypes in `decideEnemyAction` (`caster|healer|charger|flanker|berserker|summoner|generic`).  
**WHY_IT_IMPROVES_STRALT:** Quadrant spawn (`WX` 6323–6446) places bodies, not roles. Summoner chance already exists and is over-firing (PREREQ-C). Formations sheet: [`ENEMY_FORMATIONS_2026-08-31.md`](../design/ENEMY_FORMATIONS_2026-08-31.md).  
**SYSTEMS_AFFECTED:** Extracted spawn helper; `enemyAI.ts` archetype inference from family+piece+role (after PREREQ-F); leader assignment (`isLeader`) stays.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Higher tiers add a **synergy tag** (battery heals only the elite) rather than more bodies (`MAX_ENEMIES` is 20).  
**IMPLEMENTATION_APPROACH:** Pure `buildPack(playerLevel, tierCfg, rng)` returning `{ pieceType, family, role, aiTier }[]`. WX places the returned roster on legal tiles.  
**BALANCE_CONSIDERATIONS:** After PREREQ-C, summoner is a role slot, not a per-enemy coin flip. Do not spawn two healers + two summoners in band 0.  
**QA_REQUIREMENTS:** `shouldAllowBattleTrigger` / last-hostile victory still hold; Chebyshev spacing (`MIN_CHEBYSHEV = 4`) unchanged.  
**PRIORITY:** P1  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 9 | 7 | 5 | 5 | 5 | 10 |

**What new decision does this create?** “Break the battery before the anchor enrages, or kite the kiter off the thorn path?”

---

### EXP-2026-08-31-003

**TITLE:** Observed-spell discovery  
**CATEGORY:** SPELL DISCOVERY  
**PLAYER_OPPORTUNITY:** Stay in a fight, hunt an elite, or finish a boss **in order to learn** a spell you do not already own — then decide whether it earns a bar slot (max 8).  
**MECHANIC:** Shrink the innate set to Strike + a tiny starter trio. Everything else in `starterSpells` becomes **acquirable**. Unlock when the player observes N casts of that `spellId` **and** wins (SDE contract: use → observe → win → unlock). Persist ownership on existing `Character.spellLevelKeys` / `spellLevelValues` **or** the sibling `ownedSpellIds` map — not a third wallet. `upgradeSpell` remains the sole level writer.  
**WHY_IT_IMPROVES_STRALT:** Today every listed spell is already owned (`WX` 2393–2404). Collection, mastery, and loadout tension are empty. After LONG_HORIZON, discovery **is** the long-term loop — XP-to-next is not.  
**SYSTEMS_AFFECTED:** `ownedSpells` derivation via extracted helper; battle-log / death-pipeline hook for “observed id”; spellbook UI; optional achievement conditions. Contract: [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) + [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md).  
**INFINITE_PROGRESSION_BEHAVIOUR:** Eligibility uses relative `R`, family, elite, encounter type — never “reach level CAP.” New kit rows are new drop sources forever.  
**IMPLEMENTATION_APPROACH:** Extract `resolveOwnedSpells`. Do **not** strip Strike. Keep Barrier / Mirror / Timestep as rare observes. Recap shows “Studied: Slow” on the existing root `PostBattleRecap`. **Wait until #183 / #180 settle** (score dropped this run because persist coupling is live risk).  
**BALANCE_CONSIDERATIONS:** Starter kit must still clear band-0 packs after PREREQ-A. Do not auto-equip newly learned spells. Doka cost of upgrades unchanged.  
**QA_REQUIREMENTS:** Reload after observe still owns the spell (backend keys, not only `localStorage`); persist lock used if a write accompanies victory; mock-actor path covered; `getPlayerAchievements` still uses Principal if a feat is added.  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 7 | 9 | 8 | 7 | 6 | 4 | 10 |

**What new decision does this create?** “Do I finish the scribe for Mark, or disengage and keep my HP for the next portal?”

---

### EXP-2026-08-31-010

**TITLE:** Optional tactical objectives  
**CATEGORY:** COMBAT  
**PLAYER_OPPORTUNITY:** Take a side goal on the current map (interrupt a channel, hold a shrine, extract a marked tile) for extra Doka/XP **or** a spell observe.  
**MECHANIC:** Encounter flag on the map (not a new tile generator): `objective: { type, cell?, failOn?, reward }`. Resolution at victory, same recap funnel with `PREAPPLIED_REWARD_MULTIPLIER`. Failure is optional — the fight can still be won. Prefer IDs already listed in [`ENCOUNTER_EVOLUTION_2026-08-31.md`](../encounters/ENCOUNTER_EVOLUTION_2026-08-31.md).  
**WHY_IT_IMPROVES_STRALT:** Overworld fights are “clear hostiles.” Objectives make positioning and tempo matter independent of DPS.  
**SYSTEMS_AFFECTED:** New `engine/tacticalObjectives.ts`; recap fields; challenge overlap must be explicit (do not double-count 006).  
**INFINITE_PROGRESSION_BEHAVIOUR:** Objective **type** rotates with tier; reward uses existing victory formulas, not a level-capped table.  
**IMPLEMENTATION_APPROACH:** Place the objective on an already-walkable floor cell after finalize (do **not** punch new corridors).  
**BALANCE_CONSIDERATIONS:** Optional. Never block the progression portal on a failed side objective.  
**QA_REQUIREMENTS:** Death Realm timer still blocks portals/encounters; dungeon-chain snapshot still happens before `cleanupMap`.  
**PRIORITY:** P1  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 8 | 8 | 7 | 6 | 5 | 9 |

**What new decision does this create?** “Do I spend two MP to contest the shrine, or commit the Inferno on the elite?”

---

### EXP-2026-08-31-008

**TITLE:** Uncapped achievement / mastery ladder  
**CATEGORY:** PROGRESSION  
**PLAYER_OPPORTUNITY:** Chase repeating collection / mastery goals after level 10 instead of a finished feat list.  
**MECHANIC:** Add conditions that **scale or repeat**: family slayer N, modifier survivor N, spells observed N, dungeon best-depth, elite tokens survived. Keep `level_10` as a tutorial feat (`admin.mo` 321); do **not** add `level_50` as an endgame. Rewards via `claimAchievementReward` on the persist lock.  
**WHY_IT_IMPROVES_STRALT:** `unstoppable` implies a destination. LONG_HORIZON makes repeating feats the scoreboard that still matters when XP-to-next is astronomical. Raised this run.  
**SYSTEMS_AFFECTED:** `defaultAchievements()` + frontend condition keys. `getPlayerAchievements` must keep using the caller Principal.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Thresholds are counts, not “reach final level.”  
**IMPLEMENTATION_APPROACH:** Client still calls `markAchievementUnlocked` (known trust issue AQA-008). Do not invent canister proofs in this expansion.  
**BALANCE_CONSIDERATIONS:** Doka on claim only; no XP from feats (avoids fighting the XP curve).  
**QA_REQUIREMENTS:** Claim enqueue + `commit`; empty list when Principal omitted.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 3 | 8 | 4 | 4 | 3 | 3 | 10 |

**What new decision does this create?** Weak alone; strong as the **scoreboard** for 001/003/009 (“one more void_mirror observe”).

---

### EXP-2026-08-31-013

**TITLE:** Explicit spell-interaction layer  
**CATEGORY:** COMBAT  
**PLAYER_OPPORTUNITY:** Sequence spells for a documented combo (Mark → Inferno, Slow → Thorned path, Swap → Barrier trap) instead of isolated buttons.  
**MECHANIC:** `effectParams` / a small `SpellInteraction` table keyed by **ids**, never names. Interactions already hinted: `isMark` (×2 next hit), Swap, Barrier, DoT stacks (`engine/dotStacks.ts`). Publish 6–8 official combos and let enemy kits teach them (feeds 003).  
**WHY_IT_IMPROVES_STRALT:** Catalog is wide but shallow. MIMA also shows `applyPushback` / `applyAttract` unused — those are the first interaction verbs, not 16 new spell ids.  
**SYSTEMS_AFFECTED:** `engine/spellEngine.ts` / `castHelpers.ts` only via metadata; tooltips in spellbook. **No damage-formula rewrite.** Hold [`SPELL_PROPOSALS_2026-08-31.md`](./SPELL_PROPOSALS_2026-08-31.md) until 003 exists.  
**INFINITE_PROGRESSION_BEHAVIOUR:** New spells add rows to the table; old combos stay valid at any level.  
**IMPLEMENTATION_APPROACH:** Start with Mark, Slow, Barrier, Swap — all already flagged on `SpellConfig`. Then wire unused push/pull to those ids (MIMA-005).  
**BALANCE_CONSIDERATIONS:** Do not add silent ×N damage. Mark’s ×2 is enough; document it.  
**QA_REQUIREMENTS:** Preview vs live-cast stay on explicit metadata. Swap × hazard (MIMA-001) must land with any Swap combo.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 10 | 8 | 7 | 6 | 6 | 7 | 9 |

**What new decision does this create?** “Do I spend 2 AP on Mark now so next turn’s Inferno is the kill, or do I need the heal?”

---

### EXP-2026-09-01-016

**TITLE:** Wire `worldFeatures` overlay  
**CATEGORY:** WORLD  
**PLAYER_OPPORTUNITY:** On a map, choose a path that accepts or refuses a rare tile / patrol / event — after the 22 modifiers have been seen many times.  
**MECHANIC:** `engine/worldFeatures.ts` already defines rarity weights, relative difficulty, and feature ids. After `finalizePlayableLayout`, roll ≤3 features (`MAX_ROLLED_FEATURES`), place on legal floor cells (spawn ±3 and portals excluded), re-run solvability. Death Realm stays quiet. Credits stay on `applyRewards`.  
**WHY_IT_IMPROVES_STRALT:** The catalog and tests exist and do nothing. Wiring them is cheaper than inventing a thirteenth modifier. Relative difficulty is vs **same-tier** content — compatible with no level cap.  
**SYSTEMS_AFFECTED:** `worldFeatures.ts` (already); new placement helper; WX one-line after finalize. **`mapGen.ts` stays closed.**  
**INFINITE_PROGRESSION_BEHAVIOUR:** Rarity weights + relative bands, never “unlocks at level N”. Append-only feature table.  
**IMPLEMENTATION_APPROACH:** One slot type first (`tile`), then `encounter`, then `event`. HP taxes are **fractions of current max HP** (already in the module).  
**BALANCE_CONSIDERATIONS:** Do not stack Titan's Vigor + extreme feature + elite on band 0. Reward multipliers on the existing victory grant only.  
**QA_REQUIREMENTS:** `evaluateSolvability` still passes; Death Realm / rest maps do not roll features; dungeon-chain snapshot unchanged; lava/spikes still `recordInBattleChallengeDamage`.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 | 8 | 9 | 7 | 6 | 7 | 5 | 10 |

**What new decision does this create?** “The seam tax is 10% max HP — do I cross for the spell-bearing patrol, or take the long ice walk?”

---

### EXP-2026-08-31-009

**TITLE:** Finish stub modifiers + combo-only world rules  
**CATEGORY:** WORLD  
**PLAYER_OPPORTUNITY:** Read the modifier chip and change pathing / targeting / healing plan before the first turn.  
**MECHANIC:** Implement the four stubs in `engine/mapModifiers.ts` (260–296) as real hooks: `mirror_field` (reflect via existing `onPlayerReflectedDamage`), `gravity_well` (attract 1 toward map center on move), `fog_of_war` (UI vision radius), `blood_moon` (differentiate from `vampiric_ground`: player-only drain, enemy-only enrage, or extra elite roll). Differentiate `slime_flood` vs `frozen_terrain` (155–173).  
**WHY_IT_IMPROVES_STRALT:** 22 ids are advertised; four do nothing; two are duplicates. Fake modifiers train the player to ignore the chip.  
**SYSTEMS_AFFECTED:** `mapModifiers.ts` registry; `MapModifiersPanel.tsx`; challenge `modifier_survivor`.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Second-modifier roll already exists. High tier can allow two **interacting** modifiers (Glass + Iron Curse).  
**IMPLEMENTATION_APPROACH:** One stub per change. 015 handles Titan's Vigor separately.  
**BALANCE_CONSIDERATIONS:** Fog must not soft-lock targeting metadata. Gravity must respect walls / reachability.  
**QA_REQUIREMENTS:** Thorned / Void Rift still debit challenges on mouse **and** touch.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 | 8 | 8 | 6 | 5 | 5 | 6 | 9 |

**What new decision does this create?** “Mirror Field is up — do I even cast this line, or walk in and Strike?”

---

### EXP-2026-08-31-005

**TITLE:** AI sophistication ladder (unused gates)  
**CATEGORY:** AI  
**PLAYER_OPPORTUNITY:** High-tier packs camp chokes, guard the backline, and focus-fire; low-tier packs still telegraph. The player reads `aiTier` from behavior, not from an HP bar.  
**MECHANIC:** Implement unused `ENEMY_AI_TIER_GATES` **inside** `decideEnemyAction` (`engine/enemyAI.ts`), not as more WX branches. Lethal lookahead / LoS reposition / backline protect are **global on** (`gameConstants.ts` 224–258) — gate them by `enemy.aiTier` so low-level fights stay readable. Follow [`ENEMY_AI_EVOLUTION.md`](../ENEMY_AI_EVOLUTION.md); do not rewrite the 2,582-line module in one PR.  
**WHY_IT_IMPROVES_STRALT:** The brief prefers AI sophistication over HP. The knobs exist; they are not a progression curve.  
**SYSTEMS_AFFECTED:** `enemyAI.ts`, `gameConstants.ts` only.  
**INFINITE_PROGRESSION_BEHAVIOUR:** `computeAITier` already maps unbounded level → 1..10. After 900, keep tier 10 and add **pack** coordination (004) instead of a tier 11 damage stat. Do not “fix” the 30% random roll in the first AI PR (master-roadmap hold).  
**IMPLEMENTATION_APPROACH:** One gate per PR, with a deterministic `rng` fixture. Do not edit turn-advance in WX.  
**BALANCE_CONSIDERATIONS:** `instantKill` must use existing lethal lookahead, not a new damage formula. Betrayal 5% at tier 10 is enough.  
**QA_REQUIREMENTS:** Same `(enemy, ctx, rng)` ⇒ same `EnemyAction`. Summon lifespan still decrements on the summon’s own turn.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 8 | 6 | 6 | 8 | 6 | 10 |

**What new decision does this create?** “They will camp the choke — do I Barrier the corridor or Swap the kiter out of it?”

---

### EXP-2026-08-31-007

**TITLE:** Dungeon room types without rewriting mapGen  
**CATEGORY:** DUNGEONS  
**PLAYER_OPPORTUNITY:** At a fork, pick elite / shrine / branch / extract instead of “another 16×16 clear.”  
**MECHANIC:** After `snapshotDungeonChain` / `decideDungeonChainPortal`, tag the **next** map with `roomKind: "gauntlet" | "elite" | "shrine" | "fork" | "extract"`. Placement uses existing floor cells and portal filter (`engine/portalRules.ts`). Follow the teach → pressure beats in [`ENCOUNTER_EVOLUTION_2026-08-31.md`](../encounters/ENCOUNTER_EVOLUTION_2026-08-31.md).  
**WHY_IT_IMPROVES_STRALT:** Chain depth 3–5 is only a multiplier (`1.0 + depth * 0.25`). Room kinds create run-to-run stories.  
**SYSTEMS_AFFECTED:** `portalRules.ts`, dungeon refs, spawn extract. **`mapGen.ts` stays closed.**  
**INFINITE_PROGRESSION_BEHAVIOUR:** Depth has no cap in the **table** even if a given run rolls 3–5. Later, `maxDepth` can grow with player tier.  
**IMPLEMENTATION_APPROACH:** Encounter overlay only. White sanctuary portal rules unchanged.  
**BALANCE_CONSIDERATIONS:** Elite rooms use 002 tokens, not Titan's Vigor +1000 HP. Completion bonus stays `maxDepth * 50` Doka on the lock.  
**QA_REQUIREMENTS:** Snapshot-before-cleanup still required; death/flee must not carry `roomKind`; boss rush still wins `getRunMode`.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 7 | 9 | 7 | 7 | 7 | 5 | 9 |

**What new decision does this create?** “Take the elite fork for a spell observe, or the shrine fork to keep the chain alive?”

---

### EXP-2026-08-31-011

**TITLE:** Boss mechanic-pool scaling (not more HP)  
**CATEGORY:** BOSSES  
**PLAYER_OPPORTUNITY:** A high-level Archbishop fight adds a new arena rule or add pattern, not a thicker HP bar.  
**MECHANIC:** Each boss keeps phase 1/2 kits (`data/bossKits.ts`). A **tier-indexed mechanic slot** pulls from that boss’s `BossAbility` list. `getBossEffectiveStats` ±8% remains for fairness; it must not be the only high-level signal. Sheet: [`BOSS_AND_SPELL_DISCOVERY.md`](../design/BOSS_AND_SPELL_DISCOVERY.md).  
**WHY_IT_IMPROVES_STRALT:** Rush rooms already *describe* combined mechanics that are more interesting than the 8% curve. Reuse those as data.  
**SYSTEMS_AFFECTED:** `useBossAI.ts`, `useBossSystem.ts`, `bossDefaults.ts`. High regression — last in the queue.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Mechanic slots 0..N from an append-only pool. No “final boss level.”  
**IMPLEMENTATION_APPROACH:** One boss, one extra slot, tests on the pure decision fn. Align Motoko `defaultBossConfigs` spell ids with `SPELL_ID_CATALOG` while touching that boss.  
**BALANCE_CONSIDERATIONS:** Do not compose `statMultiplier` × level-diff × Titan’s Vigor. Jackpot room rewards stay the table values.  
**QA_REQUIREMENTS:** Room-clear still writes progress **before** `applyRewards`; lava abort still `resetBossRush`.  
**PRIORITY:** P3  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 7 | 6 | 8 | 8 | 7 | 10 |

**What new decision does this create?** “Phase 2 now drops shock tiles — do I hold the edge or bait the charge onto the brood?”

---

### EXP-2026-09-01-015

**TITLE:** Convert Titan's Vigor off +1000 HP  
**CATEGORY:** WORLD  
**PLAYER_OPPORTUNITY:** A “Titan” map asks a mechanic question, not a thicker HP bar.  
**MECHANIC:** Replace `onBattleStart` +1000 HP / 1–5× damage (`mapModifiers.ts` ~300) with one identity hook: e.g. first lethal hit becomes a wound (survive at 1 HP once per combatant) **or** an extra 002 elite roll. Keep the announce chip.  
**WHY_IT_IMPROVES_STRALT:** This modifier is the live proof of the anti-pattern the brief forbids. Leaving it trains high-level design toward HP.  
**SYSTEMS_AFFECTED:** `mapModifiers.ts` one definition + tests. No WX growth.  
**INFINITE_PROGRESSION_BEHAVIOUR:** The new hook is level-agnostic. Do not scale the +1000 with player level as a “fix.”  
**IMPLEMENTATION_APPROACH:** One PR, one hook. Do not retune other modifiers in the same change.  
**BALANCE_CONSIDERATIONS:** Wound-once must still lose to a second lethal (lava + strike). Do not combine with 016 extreme on band 0.  
**QA_REQUIREMENTS:** Existing Titan maps still announce; challenge damage / death pipeline still fire on the second lethal; no Doka write.  
**PRIORITY:** P3  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 6 | 6 | 4 | 3 | 5 | 6 | 8 |

**What new decision does this create?** “They get one cheat-death — do I save the Inferno for the second hit, or chip first?”

---

## Do not build

- New enemy **ids** that only change HP/ATK. Use family × variant × elite × kit. Do not add Register-lore `Crimson Spawn` / `Shadow Lurker` / `Storm Caller` as stat skins.
- A maximum player level, New Game+, or “endgame bracket.”
- High-level design that is only larger `level * 8 + 20` HP / `level * 2 + 3` damage (`WX` 6416–6418) or Titan’s Vigor +1000.
- Rewrites of `mapGen.ts`, RAF, turn-advance, or `calcScaledDamage`.
- A second recap, a second persist lock, or rewards via `updateCharacter`.
- Name-based spell logic.
- Shipping admin / debug as player UI.
- `level_50`-style achievements that imply a finish line.
- The 16 [`SPELL_PROPOSALS_2026-08-31.md`](./SPELL_PROPOSALS_2026-08-31.md) ids **before** 003 — they would be born already-owned.
- Retuning `100 * 2^(N-1)` as “expansion.” That is a progression-economy decision, not a content card.
- Parallel persist PRs while #183 / #180 are open.

---

## Recommended implementation order

1. **PREREQ-A / F / H** (tiny, unlocks kits and stops family HP from lying). B/C when touching spawn math.
2. **014 Mute-family hooks** — decisions this week, no persist, no kit table.
3. **001 Family role kits** — turns the 30% family roll into kits (after A+F).
4. **006 Mechanic challenges** — cheap, isolated, already has a test home.
5. **003 Observed-spell discovery** — after persist drafts settle; needs 001 so there is something worth observing.
6. **002 Elite tokens** + **004 Pack composition** — once kits exist, elites and roles multiply them.
7. **008** as the scoreboard for 001/003. **016 / 009** next for world variety. **005 / 007 / 011 / 015** last.

Combinatorial target once 001+002+003+004+009/016 are live:

```
family × relative band × piece variant × aiTier × kit band × elite token
  × pack role × map archetype × map modifier × world feature
```

That is still the expansion plan. Not a hundred near-identical enemies.
