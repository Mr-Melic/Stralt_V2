# Stralt expansion catalog — 2026-08-31

**Author:** Expansion Director (cron `0 */24 * * *`)  
**This run:** first catalog (`HEAD` `22503b5`, `fix: keep generated maps solvable across seeds (#110)`)  
**Gameplay / production code:** not modified.

Prior expansion proposals: **none** in-repo, no GitHub issues, no automation memories. This file is the living catalog. Later runs should re-rank against `main` and mark cards `SUPERSEDED` / `SHIPPED` rather than silently rewriting history.

Score used for ranking:

```
SCORE = PLAYER_VALUE + TACTICAL_DEPTH + REPLAYABILITY + NOVELTY
      + INFINITE_PROGRESSION_COMPATIBILITY
      − IMPLEMENTATION_COMPLEXITY − REGRESSION_RISK − BALANCE_RISK
```

Each axis is 1–10. Higher SCORE is a stronger current opportunity. A proposal is only strong if it creates a **new player decision** and multiplies existing axes (family × relative level × variant × AI tier × spell pool × elite × composition × map × modifier) instead of adding another HP-scaled clone.

---

## Current-state inventory (what exists, what is unused)

Read against `AGENTS.md`, `README.md`, `DESIGN.md`, `docs/ARCHITECTURE.md`, live gameplay config, and `docs/automation/QUALITY_AUDIT_2026-08-30.md`.

### Progression (no level cap — except two hidden ones)

- XP curve is unbounded: `100 * 2^(N-1)` (`utils/xpCurve.ts`, `docs/ARCHITECTURE.md` rewards section).
- Enemy levels use `pickEnemyLevelFromTiers` (`engine/combatMath.ts` 54–107): default weights 60% same tier / 20% ±1 / 10% ±2 / 5% ±3+, `tierSize` 10. This **already** produces below / near / equal / above the player. Keep it.
- Hidden cap: `maxTier = Math.floor(999 / ts)` at `combatMath.ts` 58. Past player level ~1000, the distribution stops climbing. That contradicts “no character level cap.”
- `computeAITier` (`combatMath.ts` 36–51) plateaus at 10 after enemy level 900, with a 30% full-random roll. Plateau is acceptable **if** tier 10 keeps unlocking mechanics, not more HP.

### Enemies

- Seven families are typed (`types/gameTypes.ts` 12–20): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`.
- Spawn still writes `family: "default"` (`WorldExploration.tsx` 6213), then a 30% roll overwrites family **and only multiplies HP / damage / RES / SP** (`WorldExploration.tsx` 6236–6326). No family spell pool, no family AI, no elite token.
- Piece-type kits exist (`engine/enemyAI.ts` 156–178) and grow at zone 1 / 2. Battle start calls `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WorldExploration.tsx` 12186). `levelZone` is an **object** `{ name, minLevel, maxLevel }` (`WorldExploration.tsx` 5064–5068). `buildEnemyKit` does `Math.floor(levelZone)` (`enemyAI.ts` 192) → `NaN` → every `z >= 1` check fails. **Every overworld enemy is stuck on the one-spell zone-0 kit.** The comment at 12181 (“10 random spells”) is stale.
- Leader death → erratic (`WX` 15506, `aiTier >= 5`) and 5% betrayal (`WX` 15593, `aiTier >= 10`) exist. `ENEMY_AI_TIER_GATES` also names `groupTactics`, `instantKill`, `chokepointCamp`, `escapeRoute`, `bottleneckControl`, `defensiveRetreat` (`gameConstants.ts` 200–208) and are not a family/role system.
- Summoner chance is `0.12 + playerLevel * 0.02` (`WX` 12198–12200). The constant is named per **level zone** (`gameConstants.ts` 298–299). At level 44+ every non-summon is a summoner. `ENEMY_SUMMON_CAP = 2` contains the board, but the roll is already saturated — high-level variety collapses to “everyone summons wolf/archer.”

### Spells / discovery

- Frontend catalog: 31 ids in `data/spellData.ts` / `data/bossKits.ts` `SPELL_ID_CATALOG` (Strike through five summons).
- `WorldExploration.tsx` 2242–2248 marks **every** `starterSpells` entry `isBaseSpell: true`. There is no observe / kill / achievement / elite unlock path. `ownedSpells` is base ∪ backend extras (`WX` 2257–2271). Backend `defaultSpells()` (`src/backend/lib/admin.mo` 168–191) is a **different** six-spell set (`shadow_strike`, `soul_rend`, `vampire_bite`, `reflect_barrier`, `thunder_clap`, `void_collapse`). Motoko boss seeds still name deleted ids (`fireball`, `cursed_gust`, …). Dual catalogs.
- Targeting is metadata-driven (`SpellConfig.targetType`, range, LoS). New spells must stay on that contract (`AGENTS.md`).

### Combat / world / dungeons / bosses

- 22 map modifiers in `engine/mapModifiers.ts`. Four are announce-only stubs: `blood_moon`, `mirror_field`, `gravity_well`, `fog_of_war` (lines 261–296). `slime_flood` and `frozen_terrain` are the same MP-doubler.
- Seven map archetypes (`engine/mapGen.ts` 4–42): openField, corridorMaze, fortress, ruinsIslands, arena, asymmetric, chessboard. `#110` just landed solvability punches. **Do not rewrite `mapGen.ts`.**
- Dungeon chain is linear 3–5 maps (`docs/ARCHITECTURE.md` dungeon-chain table). `types/dungeon.ts` is a tile editor (`floor|wall|trap|access`) — no special rooms, no forks, no dungeon-only modifiers.
- 19 bosses (`types/bossTypes.ts` 390–410) with two phases and a large `BossAbility` enum. Boss Rush is a **fixed** 10-room pair table (`hooks/useBossRush.ts` 23–134). Level-diff scaling is ±8% per level on base stats (`engine/progression.ts` `BOSS_LEVEL_DIFF_STEP`). Combined-mechanic copy is richer than what most rooms actually force.
- Challenges: nine numeric predicates (`utils/challengeCompletion.ts` 38–103). No composition / interrupt / modifier / discovery objectives.
- Achievements: 15 one-shots (`admin.mo` 308–326). `unstoppable` / `level_10` is a **capped milestone**. Nothing repeats as the player keeps leveling.

### Engineering-health constraints (from 2026-08-30 quality audit + current HEAD)

- No player telemetry. Do not claim live demand.
- `WorldExploration.tsx` is the sensitive caller. New behavior belongs in `src/frontend/src/engine/*` or `src/frontend/src/utils/*` with tests; WX gets one-line wiring (`ACTION_IDS` AQA-2026-08-30-007).
- Do not touch RAF, **map generation**, turn logic, or damage math (`AGENTS.md`).
- Credits still go through `applyRewards`; spends / death through `saveBattleStats` on `createProgressPersist`. No second reward funnel.
- Since the audit, `#103` `#104` `#109` `#110` `#111` `#113` have merged. Remaining open drafts at this writing include `#100` `#101` `#105` `#106` `#107` `#108` `#114`. Do not open a parallel persist / targeting / mapGen stack.
- Client-trusted canister writes remain an architecture decision (AQA-2026-08-30-008), not an expansion.

---

## Prerequisites (not expansions — fix or respect before shipping content)

| ID | Finding | Why it blocks infinite / combinatorial content |
| :--- | :--- | :--- |
| PREREQ-A | `buildEnemyKit(..., currentMap.levelZone)` passes an object; kits never leave zone 0 | Spell-pool depth is implemented and dead. Any new kit row will also stay at the shallow set until the call passes a **number** (player tier or `floor((level-1)/tierSize)`). One-line call-site + unit test in `enemyAI.ts`. |
| PREREQ-B | `pickEnemyLevelFromTiers` clamps at level 999 | High-level players stop seeing above-level enemies. Remove the 999 ceiling; keep the existing weight math. |
| PREREQ-C | Summoner chance uses raw `characterStats.level` | Saturates by the mid 40s. Use `levelZone` / player **tier** and keep `ENEMY_SUMMON_CAP`. |
| PREREQ-D | Do not grow `WorldExploration.tsx` | 19k-line caller. Family / elite / discovery tables must live in engine modules. |
| PREREQ-E | Persist / targeting drafts still open | Discovery that writes `spellLevelKeys` must enqueue on the persist lock and must not invent a third wallet path. |

---

## Ranked opportunities

| Rank | EXPANSION_ID | Title | Category | SCORE | Priority |
| ---: | :--- | :--- | :--- | ---: | :--- |
| 1 | EXP-2026-08-31-001 | Family role kits (stop using families as HP skins) | ENEMIES | 30 | P0 |
| 2 | EXP-2026-08-31-003 | Observed-spell discovery | SPELL DISCOVERY | 29 | P0 |
| 3 | EXP-2026-08-31-006 | Mechanic challenge catalog | PROGRESSION | 29 | P0 |
| 4 | EXP-2026-08-31-002 | Elite / champion modifier tokens | ENEMIES | 28 | P1 |
| 5 | EXP-2026-08-31-004 | Pack role composition | ENEMIES / AI | 28 | P1 |
| 6 | EXP-2026-08-31-010 | Optional tactical objectives | COMBAT | 24 | P1 |
| 7 | EXP-2026-08-31-013 | Explicit spell-interaction layer | COMBAT | 23 | P2 |
| 8 | EXP-2026-08-31-009 | Finish stub modifiers + combo-only world rules | WORLD | 22 | P2 |
| 9 | EXP-2026-08-31-005 | AI sophistication ladder (unused gates) | AI | 21 | P2 |
| 10 | EXP-2026-08-31-008 | Uncapped achievement / mastery ladder | PROGRESSION | 21 | P2 |
| 11 | EXP-2026-08-31-007 | Dungeon room types without rewriting mapGen | DUNGEONS | 21 | P2 |
| 12 | EXP-2026-08-31-011 | Boss mechanic-pool scaling (not more HP) | BOSSES | 17 | P3 |

---

## Proposal cards

### EXP-2026-08-31-001

**TITLE:** Family role kits (stop using families as HP skins)  
**CATEGORY:** ENEMIES  
**PLAYER_OPPORTUNITY:** Choose a kill order and positioning answer for *this* family on *this* board, not “the slightly thicker pawn.”  
**MECHANIC:** Data table `family → { archetype, spellPoolIds by zone, preferredAI, threatTag }`. The existing 30% family roll (`WX` 6236–6326) keeps firing, but assigns **kits and AI**, not only `hpMult` / `dmgMult`. Piece type remains a variant axis (bishop wraith ≠ pawn wraith).  
**WHY_IT_IMPROVES_STRALT:** Families are already in the type system and art path (`pieceArt.ts` family patterns) and currently create almost no decision. Wiring them is the cheapest combinatorial multiplier in the repo.  
**SYSTEMS_AFFECTED:** `engine/enemyAI.ts` (`buildEnemyKit` / new `buildFamilyKit`), spawn assignment (extract from `WX` 6136–6326 into `engine/`), `types/gameTypes.ts` `EnemyFamily` only if a family is added.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Zone index = `floor((enemyLevel-1)/tierSize)` with **no max**. New rows unlock at high zones (extra control spell, then a synergy tag). HP formula stays the existing level roll.  
**IMPLEMENTATION_APPROACH:** After PREREQ-A, add a pure table next to `ENEMY_KITS`. Example: `void_mirror` → mirror/reflect + swap; `plague_rat` → stacked DoT + sacrifice; `iron_golem` → iron-skin + body-block charger; `bone_scribe` → mark + weaken; `tide_shade` → attract/push + frost. Resolve ids only through `SpellConfig.id`. Unit-test kit contents per (family, piece, zone).  
**BALANCE_CONSIDERATIONS:** Keep family stat mults as light flavor (or flatten them) so the decision is the kit. Do not give every family Inferno at zone 0.  
**QA_REQUIREMENTS:** Zone 0 / 1 / 2 / 20 kits are distinct; `usableByEnemy` honored; no name-based targeting; pack of mixed families still ends via existing death pipeline.  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 | 9 | 9 | 6 | 4 | 4 | 5 | 10 |

**What new decision does this create?** “The golem is the cover; the scribe is the Mark. Who dies first on this terrain?”

---

### EXP-2026-08-31-003

**TITLE:** Observed-spell discovery  
**CATEGORY:** SPELL DISCOVERY  
**PLAYER_OPPORTUNITY:** Stay in a fight, hunt an elite, or finish a boss **in order to learn** a spell you do not already own — then decide whether it earns a bar slot (max 8).  
**MECHANIC:** Shrink the innate set to Strike + a tiny starter trio. Everything else in `starterSpells` becomes **acquirable**. Unlock when the player observes N casts of that `spellId` **or** lands the killing blow on a caster who knows it (elites / bosses / family kits). Persist ownership on existing `Character.spellLevelKeys` / `spellLevelValues` (level `0` = owned, unupgraded). `upgradeSpell` remains the sole level writer.  
**WHY_IT_IMPROVES_STRALT:** Today every listed spell is already owned (`WX` 2242–2248). Collection, mastery, and loadout tension are empty. Discovery turns enemy spell pools into a long-term map.  
**SYSTEMS_AFFECTED:** `ownedSpells` derivation (`WX` 2257–2271) via a extracted helper; battle-log / death-pipeline hook for “observed id”; `upgradeSpell` / spellbook UI; optional achievement conditions. No new canister method required if keys already store ownership.  
**INFINITE_PROGRESSION_BEHAVIOUR:** New family / elite / boss / zone kit rows are new drop sources forever. Never gate a spell on “reach level CAP.”  
**IMPLEMENTATION_APPROACH:** Extract `resolveOwnedSpells(baseIds, spellLevelKeys, backendSpells)`. Do **not** strip Strike. Keep Barrier / Mirror / Timestep as rare observes (boss or elite-only) so the bar stays an 8-slot puzzle. Recap can show “Studied: Slow” through the existing root `PostBattleRecap` — do not add a second recap.  
**BALANCE_CONSIDERATIONS:** Starter kit must still clear early zone-0 packs after PREREQ-A. Do not auto-equip newly learned spells (overwrite `spellBarOrder`). Doka cost of upgrades unchanged.  
**QA_REQUIREMENTS:** Reload after observe still owns the spell (backend keys, not only `localStorage`); persist lock used if a write accompanies victory; mock-actor path covered; `getPlayerAchievements` still uses Principal if a feat is added.  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 7 | 9 | 8 | 6 | 5 | 4 | 10 |

**What new decision does this create?** “Do I finish the scribe for Mark, or disengage and keep my HP for the next portal?”

---

### EXP-2026-08-31-006

**TITLE:** Mechanic challenge catalog  
**CATEGORY:** PROGRESSION  
**PLAYER_OPPORTUNITY:** Accept a fight objective that changes **how** you spend AP/MP this battle, not only “go faster / take less.”  
**MECHANIC:** Extend `ChallengeCondition` in `utils/challengeCompletion.ts` (already the authoritative predicate module) with metadata-driven conditions: `kill_leader_last`, `no_summons`, `no_hazard_steps`, `modifier_survivor`, `only_observed_spell`, `interrupt_channels`. Rewards stay on the existing recap → `applyRewards` funnel and live-ref persist (`liveBattleChallengePersistEntries`).  
**WHY_IT_IMPROVES_STRALT:** The nine current challenges are all numeric (`under_N_turns`, damage caps, AP cap). They do not interact with family / elite / modifier / discovery. New conditions ride those axes for free.  
**SYSTEMS_AFFECTED:** `challengeCompletion.ts` + tests; `ChallengePanel.tsx` copy; accumulators already documented in `ARCHITECTURE.md` (damage / AP). No XP-curve change.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Predicates are relative to the live encounter. A level-400 elite pack makes `kill_leader_last` harder without raising a level cap.  
**IMPLEMENTATION_APPROACH:** One condition per PR, with a helper test, same style as `#51`. Do not put predicate logic in `WorldExploration.tsx`.  
**BALANCE_CONSIDERATIONS:** Keep legendary rewards in the current 400–1000 XP band so they do not outrun the `2^(N-1)` curve. No per-kill resolver calls.  
**QA_REQUIREMENTS:** Touch vs mouse hazard parity (`#109`) still feeds `no_hazard_steps`; Untouchable still uses `recordChallengeDamageTaken`; Attack Nearest still records AP.  
**PRIORITY:** P0  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 8 | 8 | 6 | 4 | 3 | 3 | 9 |

**What new decision does this create?** “The challenge is kill-leader-last — do I burn the rats first and eat the leader boost, or race the crown?”

---

### EXP-2026-08-31-002

**TITLE:** Elite / champion modifier tokens  
**CATEGORY:** ENEMIES  
**PLAYER_OPPORTUNITY:** Treat one combatant as a named puzzle (shielded, hexer, coordinator, phase-step) instead of “same kit, more HP.”  
**MECHANIC:** A map-modifier-shaped registry (`engine/eliteModifiers.ts`): tokens with hooks (`onBattleStart`, `onDeath`, `onCast`, `onAllyDeath`). Spawn rolls 0–1 elite per pack; chance scales with **tier**, not raw HP. Tokens are ids (`shielded`, `hexer`, `coordinator`, `echo_cast`, `phase_step`), never name heuristics.  
**WHY_IT_IMPROVES_STRALT:** There is no elite layer today (leader boost + betrayal are the only specials). Tokens multiply family × kit × AI tier without new creature art.  
**SYSTEMS_AFFECTED:** New engine registry; spawn extract; initiative / nameplate badge (stone + crimson, `DESIGN.md`); optional observe source for EXP-2026-08-31-003.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Higher tiers add a **second** token or a coordinated pair, not +N% HP. Token table is append-only.  
**IMPLEMENTATION_APPROACH:** Copy the hook-union pattern from `engine/mapModifiers.ts` (lines 32–40). Do not apply tokens by multiplying `level * 8 + 20` again.  
**BALANCE_CONSIDERATIONS:** One elite per pack until packs have role composition (004). Coordinator must not grant infinite AP.  
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
**WHY_IT_IMPROVES_STRALT:** Quadrant spawn (`WX` 6112–6231) places bodies, not roles. Summoner chance already exists and is over-firing (PREREQ-C). Composition is how Dofus-likes stay interesting at high level.  
**SYSTEMS_AFFECTED:** Extracted spawn helper; `enemyAI.ts` archetype inference from family+piece+role; leader assignment (`isLeader`) stays.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Higher tiers add a **synergy tag** (e.g. battery heals only the elite) rather than more bodies (`MAX_ENEMIES` is 20).  
**IMPLEMENTATION_APPROACH:** Pure `buildPack(playerLevel, tierCfg, rng)` returning `{ pieceType, family, role, aiTier }[]`. WX places the returned roster on legal tiles.  
**BALANCE_CONSIDERATIONS:** After PREREQ-C, summoner is a role slot, not a per-enemy coin flip. Do not spawn two healers + two summoners in zone 0.  
**QA_REQUIREMENTS:** `shouldAllowBattleTrigger` / last-hostile victory still hold; Chebyshev spacing (`MIN_CHEBYSHEV = 4`) unchanged.  
**PRIORITY:** P1  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 9 | 7 | 5 | 5 | 5 | 10 |

**What new decision does this create?** “Break the battery before the anchor enrages, or kite the kiter off the thorn path?”

---

### EXP-2026-08-31-010

**TITLE:** Optional tactical objectives  
**CATEGORY:** COMBAT  
**PLAYER_OPPORTUNITY:** Take a side goal on the current map (interrupt a channel, hold a shrine, extract a marked tile) for extra Doka/XP **or** a spell observe.  
**MECHANIC:** Encounter flag on the map (not a new tile generator): `objective: { type, cell?, failOn?, reward }`. Resolution at victory, same recap funnel with `PREAPPLIED_REWARD_MULTIPLIER`. Failure is optional — the fight can still be won.  
**WHY_IT_IMPROVES_STRALT:** Overworld fights are “clear hostiles.” Objectives make positioning and tempo matter independent of DPS.  
**SYSTEMS_AFFECTED:** New `engine/tacticalObjectives.ts`; recap fields; challenge overlap must be explicit (do not double-count).  
**INFINITE_PROGRESSION_BEHAVIOUR:** Objective **type** rotates with tier; reward uses existing victory formulas, not a level-capped table.  
**IMPLEMENTATION_APPROACH:** Place the objective on an already-walkable floor cell after `#110` finalize (do **not** punch new corridors).  
**BALANCE_CONSIDERATIONS:** Optional. Never block the progression portal on a failed side objective.  
**QA_REQUIREMENTS:** Death Realm timer still blocks portals/encounters; dungeon-chain snapshot still happens before `cleanupMap`.  
**PRIORITY:** P1  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 8 | 8 | 7 | 6 | 5 | 9 |

**What new decision does this create?** “Do I spend two MP to contest the shrine, or commit the Inferno on the elite?”

---

### EXP-2026-08-31-013

**TITLE:** Explicit spell-interaction layer  
**CATEGORY:** COMBAT  
**PLAYER_OPPORTUNITY:** Sequence spells for a documented combo (Mark → Inferno, Slow → Thorned path, Swap → Barrier trap) instead of isolated buttons.  
**MECHANIC:** `effectParams` / a small `SpellInteraction` table keyed by **ids**, never names. Interactions already hinted: `isMark` (×2 next hit), Swap, Barrier, DoT stacks (`engine/dotStacks.ts`). Publish 6–8 official combos and let enemy kits teach them (feeds 003).  
**WHY_IT_IMPROVES_STRALT:** Catalog is wide but shallow; players cannot discover “the game’s verbs combo” because nothing says they do.  
**SYSTEMS_AFFECTED:** `engine/spellEngine.ts` / `castHelpers.ts` only via metadata; tooltips in spellbook (DESIGN.md gold-border cards). **No damage-formula rewrite** — interactions compose existing flags.  
**INFINITE_PROGRESSION_BEHAVIOUR:** New spells add rows to the table; old combos stay valid at any level.  
**IMPLEMENTATION_APPROACH:** Start with Mark, Slow, Barrier, Swap — all already flagged on `SpellConfig`.  
**BALANCE_CONSIDERATIONS:** Do not add silent ×N damage. Mark’s ×2 is enough; document it.  
**QA_REQUIREMENTS:** Preview vs live-cast stay on explicit metadata (`#102` / open `#105` — do not fork targeting).  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 10 | 8 | 7 | 6 | 6 | 7 | 9 |

**What new decision does this create?** “Do I spend 2 AP on Mark now so next turn’s Inferno is the kill, or do I need the heal?”

---

### EXP-2026-08-31-009

**TITLE:** Finish stub modifiers + combo-only world rules  
**CATEGORY:** WORLD  
**PLAYER_OPPORTUNITY:** Read the modifier chip and change pathing / targeting / healing plan before the first turn.  
**MECHANIC:** Implement the four stubs in `engine/mapModifiers.ts` (261–296) as real hooks: `mirror_field` (reflect via existing `onPlayerReflectedDamage`), `gravity_well` (attract 1 toward map center on move — occupancy already has attract), `fog_of_war` (UI vision radius, not a damage change), `blood_moon` (lifesteal already exists as `vampiric_ground` — differentiate: player-only drain, enemy-only enrage, or extra elite roll). Add **dungeon-only** modifiers that only appear in a chain.  
**WHY_IT_IMPROVES_STRALT:** 22 ids are advertised; four do nothing; two are duplicates. Fake modifiers train the player to ignore the chip.  
**SYSTEMS_AFFECTED:** `mapModifiers.ts` registry; `MapModifiersPanel.tsx`; challenge `modifier_survivor`.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Second-modifier roll (`MAP_MODIFIER_SECOND_CHANCE`) already exists. High tier can allow two **interacting** modifiers (Glass + Iron Curse).  
**IMPLEMENTATION_APPROACH:** One stub per change. Do not add Titan’s Vigor-style +1000 HP as the high-level signal.  
**BALANCE_CONSIDERATIONS:** Fog must not soft-lock targeting metadata. Gravity must respect walls / `#110` reachability.  
**QA_REQUIREMENTS:** Thorned / Void Rift still debit challenges on mouse **and** touch; lava/spikes still `recordInBattleChallengeDamage`.  
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
**MECHANIC:** Implement the unused `ENEMY_AI_TIER_GATES` **inside** `decideEnemyAction` (`engine/enemyAI.ts`), not as more WX branches. Lethal lookahead / LoS reposition / backline protect already have master toggles (`gameConstants.ts` 224–258) — gate them by `enemy.aiTier` so low-level fights stay readable.  
**WHY_IT_IMPROVES_STRALT:** The brief prefers AI sophistication over HP. The knobs exist; they are not a progression curve.  
**SYSTEMS_AFFECTED:** `enemyAI.ts`, `gameConstants.ts` only.  
**INFINITE_PROGRESSION_BEHAVIOUR:** `computeAITier` already maps unbounded level → 1..10. After 900, keep tier 10 and add **pack** coordination (004) instead of a tier 11 damage stat.  
**IMPLEMENTATION_APPROACH:** One gate per PR, with a deterministic `rng` fixture. Do not edit turn-advance in WX.  
**BALANCE_CONSIDERATIONS:** `instantKill` must use existing lethal lookahead, not a new damage formula. Betrayal 5% at tier 10 is enough — do not raise it with level.  
**QA_REQUIREMENTS:** Same `(enemy, ctx, rng)` ⇒ same `EnemyAction`. Summon lifespan still decrements on the summon’s own turn.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 8 | 6 | 6 | 8 | 6 | 10 |

**What new decision does this create?** “They will camp the choke — do I Barrier the corridor or Swap the kiter out of it?”

---

### EXP-2026-08-31-008

**TITLE:** Uncapped achievement / mastery ladder  
**CATEGORY:** PROGRESSION  
**PLAYER_OPPORTUNITY:** Chase repeating collection / mastery goals after level 10 instead of a finished feat list.  
**MECHANIC:** Add conditions that **scale or repeat**: family slayer N, modifier survivor N, spells observed N, dungeon best-depth, elite tokens survived. Keep `level_10` as a tutorial feat; do **not** add `level_50` as an endgame. Rewards via `claimAchievementReward` on the persist lock.  
**WHY_IT_IMPROVES_STRALT:** `unstoppable` (`condition = "level_10"`, `admin.mo` 321) is the only level feat and implies a destination. Collection feats make 001/003 visible in the Feats panel.  
**SYSTEMS_AFFECTED:** `defaultAchievements()` + frontend condition keys (`gameTypes.ts` 364 comment). `getPlayerAchievements` must keep using the caller Principal.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Thresholds are counts, not “reach final level.”  
**IMPLEMENTATION_APPROACH:** Client still calls `markAchievementUnlocked` (known trust issue AQA-008). Do not invent canister proofs in this expansion.  
**BALANCE_CONSIDERATIONS:** Doka on claim only; no XP from feats (avoids fighting the XP curve).  
**QA_REQUIREMENTS:** Claim enqueue + `commit`; empty list when Principal omitted.  
**PRIORITY:** P2  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 | 3 | 7 | 4 | 4 | 3 | 3 | 10 |

**What new decision does this create?** Weak alone; strong as the **scoreboard** for 001/003/009 (“one more void_mirror observe”).

---

### EXP-2026-08-31-007

**TITLE:** Dungeon room types without rewriting mapGen  
**CATEGORY:** DUNGEONS  
**PLAYER_OPPORTUNITY:** At a fork, pick elite / shrine / branch / extract instead of “another 16×16 clear.”  
**MECHANIC:** After `snapshotDungeonChain` / `decideDungeonChainPortal`, tag the **next** map with `roomKind: "gauntlet" | "elite" | "shrine" | "fork" | "extract"`. Placement uses existing floor cells and portal filter (`engine/portalRules.ts`). Fork = two progression portals with different tags. Shrine = optional heal/spend already on the persist lock.  
**WHY_IT_IMPROVES_STRALT:** Chain depth 3–5 is only a multiplier (`1.0 + depth * 0.25`). Room kinds create run-to-run stories.  
**SYSTEMS_AFFECTED:** `portalRules.ts`, dungeon refs, spawn extract. **`mapGen.ts` stays closed** (AQA-2026-08-30-006; `#110` already merged).  
**INFINITE_PROGRESSION_BEHAVIOUR:** Depth has no cap in the **table** even if a given run rolls 3–5. Later, `maxDepth` can grow with player tier.  
**IMPLEMENTATION_APPROACH:** Encounter overlay only. White sanctuary portal rules unchanged.  
**BALANCE_CONSIDERATIONS:** Elite rooms use 002 tokens, not Titan’s Vigor +1000 HP. Completion bonus stays `maxDepth * 50` Doka on the lock.  
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
**MECHANIC:** Each boss keeps phase 1/2 kits (`data/bossKits.ts`). A **tier-indexed mechanic slot** pulls from that boss’s `BossAbility` list (already large in `bossTypes.ts`). `getBossEffectiveStats` ±8% remains for fairness; it must not be the only high-level signal.  
**WHY_IT_IMPROVES_STRALT:** Rush rooms already *describe* combined mechanics (`useBossRush.ts`) that are more interesting than the 8% curve. Reuse those as data.  
**SYSTEMS_AFFECTED:** `useBossAI.ts`, `useBossSystem.ts`, `bossDefaults.ts`. High regression — last in the queue.  
**INFINITE_PROGRESSION_BEHAVIOUR:** Mechanic slots 0..N from an append-only pool. No “final boss level.”  
**IMPLEMENTATION_APPROACH:** One boss, one extra slot, tests on the pure decision fn. Align Motoko `defaultBossConfigs` spell ids with `SPELL_ID_CATALOG` while touching that boss (stale `fireball` etc.).  
**BALANCE_CONSIDERATIONS:** Do not compose `statMultiplier` × level-diff × Titan’s Vigor. Jackpot room rewards stay the table values; persist via existing rush helpers.  
**QA_REQUIREMENTS:** Room-clear still writes progress **before** `applyRewards`; lava abort still `resetBossRush`.  
**PRIORITY:** P3  
**STATUS:** PROPOSED  

| PLAYER_VALUE | TACTICAL_DEPTH | REPLAYABILITY | NOVELTY | IMPLEMENTATION_COMPLEXITY | REGRESSION_RISK | BALANCE_RISK | INFINITE_PROGRESSION_COMPATIBILITY |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 9 | 7 | 6 | 8 | 8 | 7 | 10 |

**What new decision does this create?** “Phase 2 now drops shock tiles — do I hold the edge or bait the charge onto the brood?”

---

## Do not build

- New enemy **ids** that only change HP/ATK. Use family × variant × elite × kit.
- A maximum player level, New Game+, or “endgame bracket.”
- High-level design that is only larger `level * 8 + 20` HP / `level * 2 + 3` damage (`WX` 6205–6207).
- Rewrites of `mapGen.ts`, RAF, turn-advance, or `calcScaledDamage`.
- A second recap, a second persist lock, or rewards via `updateCharacter`.
- Name-based spell logic.
- Shipping admin / debug as player UI.
- `level_50`-style achievements that imply a finish line.

---

## Recommended implementation order

1. **PREREQ-A / B / C** (tiny, unlocks every card above). Not expansions; they make the existing architecture honest.
2. **001 Family role kits** — turns the 30% family roll into decisions.
3. **003 Observed-spell discovery** — needs 001 so there is something worth observing.
4. **006 Mechanic challenges** — cheap, isolated, already has a test home.
5. **002 Elite tokens** + **004 Pack composition** — once kits exist, elites and roles multiply them.
6. Everything else only after the persist / targeting draft pile is human-resolved.

Combinatorial target once 001+002+003+004+009 are live:

```
family × relative tier × piece variant × aiTier × kit zone × elite token
  × pack role × map archetype × map modifier
```

That is the expansion plan. Not a hundred near-identical enemies.
