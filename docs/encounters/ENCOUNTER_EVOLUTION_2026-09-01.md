# Encounter Evolution Catalog — 2026-09-01

Status: **PROPOSED** (design only). Do not implement production code from this file unless a later human or orchestrator explicitly picks an `ENCOUNTER_ID`.

Author: Dungeon and Encounter Evolution Designer (cron automation).  
ACTION_ID: `EED-2026-09-01-001`.  
Parent catalog: [`ENCOUNTER_EVOLUTION_2026-08-31.md`](./ENCOUNTER_EVOLUTION_2026-08-31.md) (`EED-2026-08-31-001`). **Do not reuse those IDs.** This file only adds new rooms.

Grounding: `main` @ `dd275aa` plus sibling design — `docs/design/ENEMY_FORMATIONS_2026-08-31.md` (`FSN-*`), `docs/ENEMY_AI_EVOLUTION.md`, `docs/automation/ENEMY_ELITE_EVOLUTION_2026-08-31.md`, `docs/WORLD_DYNAMICS.md` (`WF-*`), `docs/design/BOSS_AND_SPELL_DISCOVERY.md`, `docs/automation/SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`. Live constants: 22 map modifiers in `EXISTING_MAP_MODIFIER_IDS`, lava/ice/spikes, `MAX_HAZARD_TILES = 50`, `MAX_ENEMIES = 20`, `ENEMY_SUMMON_CAP = 2`, `ENEMY_SUMMON_COOLDOWN_TURNS = 2`, 19 `BOSS_IDS`, 10 `BOSS_RUSH_ROOMS`, `ChallengeCondition` overlay, atomic `applyRewards`.

---

## 1. Why a second day

The 2026-08-31 catalog taught the **Ash / Ice skeleton**: frost LoS, waves, escort, lava stones, rest three-exits, and Rush rooms 0 / 3 / 9. After one primer chain those rooms become the new “same shape.” Day-2 rooms keep unbounded progression interesting by changing **the question**, not enemy level.

Gaps this file fills (still unused as scripted rooms):

| Gap | Why it matters at high level |
| :--- | :--- |
| Void / Fog branch | `void_rift`, `fog_of_war`, `null_field`, `enthroned_void` / `void_grandmaster` were named but not paced |
| Unused modifiers | `slime_flood`, `glass_realm`, `time_warp`, `mirror_field`, `plague_zone`, `gravity_well`, `iron_curse`, `vampiric_ground`, `chaos_initiative` |
| Family identity | `ember_knight`, `void_mirror`, `plague_rat`, `iron_golem`, `tide_shade` are spawn overlays, not encounter verbs |
| Formations | `FSN-*` packs exist on paper; no room consumes a named formation |
| World features | `WF-TRP-GLYPH_PLATE`, `WF-ZON-SHRINE_POOL`, `WF-TEL-MIRROR_STEP`, `WF-RSK-BLOOD_ALTAR`, `WF-RSK-GAMBIT_CHEST` |
| Displacement / hold / race | Swap, banner-hold, dual-lane race were missing as objectives |
| Rush rooms 1, 2, 4, 5, 8 | Only 0 / 3 / 9 had variants |

Scaling never uses enemy level as the only lever. Preferred order stays: composition → variants → AI gates → kits → hazards / modifiers / world features → objectives → optional `ChallengeCondition`.

Relative difficulty bands: `TEACH` / `LOW` / `MID` / `HIGH` / `PEAK`.

---

## 2. Live constraints (unchanged)

- Maps stay solvable: walk-reachable spawn, hostiles, and at least one exit; never spawn on an unlocked portal. Re-run `finalizePlayableLayout` / solvability after scripted hazards or `WF-*` overlays.
- Portals stay locked while hostiles remain. Wave / reinforcement / hold rooms keep a living hostile **or** an explicit `holdPortalLocked` flag.
- Rewards go through `applyRewards` only. Death is 20% XP / 40% Doka via `saveBattleStats`. Dungeon depth multipliers already exist (`getDungeonMultiplier`, cap depth 5).
- Spell targeting and encounter rules use **explicit metadata** (`encounterType`, `objectiveKind`, `failureKind`, kit ids, `formationId`). Never infer from display names.
- Do not touch RAF loop, map-generation algorithms, turn logic, or damage math when a later implementer picks an ID.
- Rest maps already expose `normal` / `dungeon` / `boss`. Snapshot dungeon-chain refs **before** `cleanupMap`. White sanctuary portal colocates with spawn.
- Optional challenges stay optional unless `FAILURE_CONDITION` says otherwise.
- CharacterStats stay the 12-field persisted set. No new wp/wr/scp.
- `instantKill` and `betrayal` AI gates stay off for every sheet.
- Enemy summons stay at cap 2. Hazard tiles stay ≤ 50. Living hostiles stay well under `MAX_ENEMIES`.
- Observation/unlock of spells follows the sibling pipeline: use → observe → win → grant. Possession is not observation. `upgradeSpell` remains the only level writer.

---

## 3. Dungeon pacing (Void primer + inserts)

Standard chain (maxDepth 4 or 5):

```
teach mechanic
  → reinforce
  → combine
  → pressure
  → choice / rest
  → mastery
  → boss
```

| Beat | Depth hint | Job | Day-2 IDs |
| :--- | :--- | :--- | :--- |
| Teach | 1 | One new verb (void step, slime, swap telegraph) | ENC-TEACH-02, ENC-SPELL-03, ENC-HAZ-03 |
| Reinforce | 1–2 | Same verb, tighter or a second role | ENC-WAVE-03, ENC-AMBUSH-02 |
| Combine | 2–3 | Two taught verbs | ENC-REINF-02, ENC-DISP-01, ENC-HAZ-04 |
| Pressure | 3 | Clock, hold, shrink, or dual-lane | ENC-SURV-03, ENC-HOLD-01, ENC-PROT-02, ENC-MOVE-02 |
| Choice / rest | mid | Heal vs risk vs three-way branch | ENC-REST-02, ENC-BRANCH-02, ENC-TREAS-02 |
| Mastery | 4 | Prove the verbs | ENC-ELITE-02, ENC-RARE-02, ENC-MAST-02, ENC-PRIO-03 |
| Boss | maxDepth | Capstone using the taught verb + one `BossId` | ENC-MINI-02, ENC-MINI-03, ENC-BOSS-02, ENC-RUSH-* |

Day-1 Ash / Ice chains remain valid. Day-2 **Void primer** is the new default for accounts that already cleared Ash or Ice once. Rare elite and treasure rooms **insert**; they do not replace a beat.

---

## 4. Encounter catalog

Every entry is `STATUS: PROPOSED`.

---

### ENC-TEACH-02

ENCOUNTER_ID: ENC-TEACH-02  
TYPE: teach mechanic / hazard  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 2× pawn (charger, `physical_attack` only). No elites, no families.  
AI_REQUIREMENTS: Generic / charger. Hazard avoidance only below `ENEMY_HAZARD_AVOID_HP_PCT`. No LoS puzzle, no group-tactics, no lethal lookahead.  
SPELL_DISCOVERY_OPPORTUNITIES: None. This is a terrain lesson.  
MAP_REQUIREMENTS: Open court with **3 scripted void-rift tiles** in a diagonal (not a wall). Modifier `void_rift` **off** for the teach version (no map-wide tick). Player spawn opposite the pawns. One locked exit.  
SPECIAL_RULES: `scriptedHazardsOnly`. First step onto a void tile logs a teach line and applies the existing void tick (`MAP_MODIFIER_VOID_RIFT_DAMAGE` / WX tick path) plus `recordInBattleChallengeDamage` while `inBattleRef`. No lava/ice/spikes mixed in.  
OBJECTIVE: Defeat both pawns. Optional: never stand on void.  
FAILURE_CONDITION: Player HP ≤ 0 (Death Realm). Challenge overlay does not fail the room.  
REWARD: Low-band victory XP (`level * 20` sum) + depth Doka via `applyRewards`. Easy overlay `under_50_damage`.  
TACTICAL_PURPOSE: Teach “void is a tax and a displacement hint, not decoration; later rooms will shrink the floor with it.”  
SOLVABILITY_REQUIREMENTS: A void-free path of at least 2 tiles from spawn to both pawns and the exit. Void tiles are floor, not walls, not portals. Flood-fill after placement.  
REPLAYABILITY: Diagonal vs chevron void pattern by seed.  
SCALING_BEHAVIOUR: Do not raise levels. If reused at mid, turn map-wide `void_rift` on (tick + existing displacement) instead of adding enemies. At high, replace one pawn with a `tide_shade` bishop that kites along the void edge.  
STATUS: PROPOSED

---

### ENC-HAZ-03

ENCOUNTER_ID: ENC-HAZ-03  
TYPE: hazard / teach → combine  
RELATIVE_DIFFICULTY: LOW  
ENEMY_COMPOSITION: 2× `plague_rat` pawns (debuffer overlay, `starter-poison` + `physical_attack`) + 1× bishop (`starter-frost` only).  
AI_REQUIREMENTS: Rats are chargers that apply DoT before a second swing. Bishop kites with LoS reposition budget 2. No kamikaze.  
SPELL_DISCOVERY_OPPORTUNITIES: First observed `starter-poison` from a rat can drop `starter-poison` if missing (`discoverSpellId` on the rat, not a name check).  
MAP_REQUIREMENTS: Corridor plus a 2-tile slime seam (`slime_flood` scripted cells, not a random 20% roll). Exit behind the bishop.  
SPECIAL_RULES: Slime doubles step cost using the existing flood rule. Rats start healthy so they may enter slime once; wounded rats avoid it. Scripted hazards only.  
OBJECTIVE: Clear all.  
FAILURE_CONDITION: Player death (poison + frost + slime tax).  
REWARD: Standard + poison discovery. Overlay `no_healing` is fair (DoT is the tax).  
TACTICAL_PURPOSE: Reinforce “movement has a price” after ENC-TEACH-02, using slime instead of void so the Void primer has two distinct taxes.  
SOLVABILITY_REQUIREMENTS: A slime-free detour of ≥ 1 tile exists. Bishop reachable by frost range from a dry tile.  
REPLAYABILITY: Seam horizontal vs vertical. Rat family can sit on knight chassis at mid (still debuffer kit).  
SCALING_BEHAVIOUR: Mid adds `plague_zone` on the slime cells only. High: bishop gains `starter-poison` (DoT, not burst). Never add a second bishop before the player has Barrier or a dry detour.  
STATUS: PROPOSED

---

### ENC-HAZ-04

ENCOUNTER_ID: ENC-HAZ-04  
TYPE: hazard / combine  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× `iron_golem` rook (`spell-iron-skin` at kit band 1) + 1× `ember_knight` (`physical_attack`; melee already applies 3/turn burn for 3) + 1× bishop (`starter-frost`).  
AI_REQUIREMENTS: Golem camps the choke (`chokepointCamp` if soph ≥ 3 and a side aisle exists). Knight is a charger / berserker-lite — never paints the full floor. Bishop kites.  
SPELL_DISCOVERY_OPPORTUNITIES: Winning without using `starter-heal` can offer `spell-iron-skin` if missing (discipline, not a hit requirement).  
MAP_REQUIREMENTS: Fortress lane + side aisle (`FSN-IRON-BATTERY` map contract). Optional modifier `iron_curse` (RES up, heals ×0.5) **or** `glass_realm` (outgoing ×2) — pick **one**, never both. Two scripted spike tiles on the **flank**, not the only approach.  
SPECIAL_RULES: Scripted hazards only. Ember burn uses the live family hook; do not add a second custom DoT. Inferno stays off until high band.  
OBJECTIVE: Clear all.  
FAILURE_CONDITION: Player death.  
REWARD: Standard. Overlay `no_healing_under_30_damage` if `iron_curse` is on; `under_50_damage` if `glass_realm` is on.  
TACTICAL_PURPOSE: Combine tank-and-burn with a global modifier that changes the *kind* of mistake (over-heal vs over-trade).  
SOLVABILITY_REQUIREMENTS: Side aisle reaches the bishop. Spikes never seal the aisle. Engagement pocket has two walk-off tiles.  
REPLAYABILITY: Modifier coin-flip iron_curse vs glass_realm. Ember can sit on pawn chassis.  
SCALING_BEHAVIOUR: High: bishop may use `spell-inferno` (3-turn cooldown, one tile). Peak: golem is elite (`variant: elite`) with a second iron-skin cycle — still no HP inflation.  
STATUS: PROPOSED

---

### ENC-WAVE-03

ENCOUNTER_ID: ENC-WAVE-03  
TYPE: waves  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: Wave 1: 3× `plague_rat` pawns (DoT pack). Wave 2: `FSN-FROST-KNIFE` (controller bishop + assassin knight). Wave 3: 1× `ember_knight` + leftover rat. Never more than 4 living hostiles.  
AI_REQUIREMENTS: Wave 1 greedy nearest. Wave 2 uses the formation contracts (frost/slow first; knight rear/side, no turn-1 Sacrifice). Wave 3 ember pushes the player onto leftover slime if ENC-HAZ-03 ran this chain (`branchMemory: slime`).  
SPELL_DISCOVERY_OPPORTUNITIES: Wave 2 controller may reveal `spell-slow` if used and the player wins.  
MAP_REQUIREMENTS: Two-lane map with one cross-cut. `waveSpawnCells` in the far lane. Optional leftover 2 slime tiles from teach (explicit `inheritHazardsFrom: ENC-HAZ-03`).  
SPECIAL_RULES: Portal locked until wave 3 is clear. Next wave at the start of the enemy phase after the previous wave is dead. Occupied `waveSpawnCells` spill to nearest free reachable floor. If a wave cannot place any unit, skip and log — never soft-lock.  
OBJECTIVE: Survive and clear all three waves.  
FAILURE_CONDITION: Player death.  
REWARD: Victory XP counts all defeated levels + depth Doka. Overlay `under_10_turns` is tight on purpose.  
TACTICAL_PURPOSE: Family identity as wave verbs — rot, then knife, then ember — without a level ramp.  
SOLVABILITY_REQUIREMENTS: `waveSpawnCells` ⊆ reachable floor. Both lanes connected. Cap 4 living so later summons are not starved.  
REPLAYABILITY: Wave 2 can swap to `FSN-IRON-BATTERY` if the Ash branch was taken this account.  
SCALING_BEHAVIOUR: High: wave 3 ember gains `spell-enrage` (existing id). Peak: wave 2 knight may hold `spell-shadow-veil` if the player already answered ENC-AMBUSH-02. No extra HP.  
STATUS: PROPOSED

---

### ENC-AMBUSH-02

ENCOUNTER_ID: ENC-AMBUSH-02  
TYPE: ambush  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: Visible bait: 1× `bone_scribe` bishop camping a `WF-TRP-GLYPH_PLATE` (looks like loot). Hidden until trigger: 2× `void_mirror` flankers (knight chassis, reflect family hook) + 1× caster bishop (`starter-frost`).  
AI_REQUIREMENTS: Bait plays cowardly (retreats at 50% HP). Ambushers occupy retreat tiles and prefer isolated player (no summon). Reflect is the live 25% pre-crit family hook — not a new stat.  
SPELL_DISCOVERY_OPPORTUNITIES: Observing a void_mirror reflect (enemy used the family hook) can later offer `spell-mirror` at rest if missing — observation, not a forced grant in-room.  
MAP_REQUIREMENTS: `fog_of_war` **or** a wall hook hiding `ambushCells`. Glyph plate is floor, not a portal. Trigger: player steps the plate **or** the bait drops below 50% HP **or** the player crosses the midline.  
SPECIAL_RULES: Ambush units do not exist in the combatant store until trigger (portal locked because bait is alive). Soft: killing the bait with overkill before the midline still fires the ambush (no cheese). Intent log: explicit `ambush: glyph`.  
OBJECTIVE: Defeat bait + ambushers.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + bonus Doka if the player never stepped the glyph (read the trap). Credit through `applyRewards`.  
TACTICAL_PURPOSE: Punish loot-greed and teach that world-feature plates are decisions, not decorations.  
SOLVABILITY_REQUIREMENTS: `ambushCells` reachable after spawn; glyph not on spawn±3 or exit; bait cannot spawn on the portal.  
REPLAYABILITY: Hook left/right. Fog vs wall-hook by seed.  
SCALING_BEHAVIOUR: High: one ambusher is a summoner (wolf, cap 2). Peak: `null_field` on the glyph tile only (anti-heal punish for standing on the plate).  
STATUS: PROPOSED

---

### ENC-REINF-02

ENCOUNTER_ID: ENC-REINF-02  
TYPE: reinforcements  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× brood-lite rook (`family` presentation only — **not** `broodmother_rook`) + 2× pawn larvae. On each larva death, spawn 1 pawn on `reinfCells` (cap 2 extra, hard-cap 5 living).  
AI_REQUIREMENTS: Rook is a charger that body-blocks the larva huddle (`AI_BACKLINE_PROTECT_ENABLED`, guard distance 1). Larvae are greedy chargers. Rook does not call reinforcements — **death is the horn**.  
SPELL_DISCOVERY_OPPORTUNITIES: Killing the rook first (before any larva death) can drop `spell-rallying-cry` if that id is later enemy-legal; until `usableByEnemy` is reviewed, drop `spell-iron-skin` instead.  
MAP_REQUIREMENTS: Nest alcove + one stair-choke. `reinfCells` adjacent to the rook, reachable floor.  
SPECIAL_RULES: Reinforcement trigger is `onUnitDeath: larva` (explicit). If the rook dies, remaining larvae do **not** spawn more. If living + pending would exceed 5, skip further spawns. Portal locked until the board is empty.  
OBJECTIVE: Clear all. Implicit priority: rook first **or** isolate larvae so deaths happen in a controlled corridor.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + priority bonus if no reinforcement ever spawned.  
TACTICAL_PURPOSE: Combine “kill the source” with a visible on-death rule — a teach for ENC-RUSH-08 / Broodmother without stealing the boss.  
SOLVABILITY_REQUIREMENTS: Alcove reachable; `reinfCells` never on the portal; 5-unit occupancy still leaves a walk-off.  
REPLAYABILITY: Nest north vs south. Larvae can be `plague_rat` if the rot branch is active.  
SCALING_BEHAVIOUR: High: rook gains iron-skin. Peak: one reinforcement is a knight, still capped. Do not raise larva HP.  
STATUS: PROPOSED

---

### ENC-SURV-03

ENCOUNTER_ID: ENC-SURV-03  
TYPE: survival / hazard  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Start: 2× pawn + 1× `tide_shade` bishop. Every 3 enemy-team turns, spawn 1 from {pawn, knight flanker, `void_mirror` bishop} until the clock ends. Max 4 living.  
AI_REQUIREMENTS: Casters hold LoS. Group tactics if soph ≥ 4. Void-mirror casters prefer to stand on the **next** shrink ring so the player is punished for chasing.  
SPELL_DISCOVERY_OPPORTUNITIES: Survive 8 turns without `spell-timestep` → rest shrine may offer timestep (reminder, not a free grant).  
MAP_REQUIREMENTS: Arena. Safe core of 5 tiles. Outer ring starts as floor. Every 2 player-turns, convert the outermost remaining ring to void (scripted, count toward `MAX_HAZARD_TILES`, stop if the next ring would isolate spawn or exit). Optional modifier `time_warp` (15s feel is flavor; the **real** clock is `surviveTurns: 10` player-turns).  
SPECIAL_RULES: Clock `surviveTurns: 10`. When it hits 0, remnants flee to the edge and despawn (not player kills). Portal unlocks only after the board is empty. Shrink never seals the core; if a shrink would fail solvability, skip that ring and log.  
OBJECTIVE: Be alive after 10 player turns, then clear or let remnants flee.  
FAILURE_CONDITION: Player death before clock + cleanup.  
REWARD: Survival table (depth × 50 Doka + 100 XP) plus kill XP only for units actually defeated. Prefer overlay `no_healing` over `no_damage_taken`.  
TACTICAL_PURPOSE: Pressure beat — shrinking board + kite, not a DPS sponge. Distinct from ENC-SURV-01 (hazard ring) and ENC-SURV-02 (overlapping waves).  
SOLVABILITY_REQUIREMENTS: Core always reachable; flee-edge tiles exist; hazard count ≤ 50; never convert the exit cell to void.  
REPLAYABILITY: Shrink clockwise vs counterclockwise. Tide-shade vs void-mirror as the opener caster.  
SCALING_BEHAVIOUR: Mid uses only pawns in the pool and shrinks every 3 turns. High unlocks the flanker. Peak unlocks void-mirror and `time_warp`. Never shorten the clock below 8.  
STATUS: PROPOSED

---

### ENC-ELITE-02

ENCOUNTER_ID: ENC-ELITE-02  
TYPE: elite  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 1× elite `void_mirror` queen (`variant: elite`, kit `starter-frost` + `spell-swap` **only if** a later apply path exists; until then frost + `spell-slow`) + 2× `iron_golem` rook escorts. Elite is not a boss: no phase table, no `BossAbility`.  
AI_REQUIREMENTS: Escorts guard the elite (`AI_BACKLINE_PROTECT`, distance 1). Elite kites and never retreats into void. Swap is legal only onto free, non-void, non-hazard, non-portal floor with two walk-offs (`FSN-MIRROR-SCRIPTORIUM` legality). Until Swap apply exists, elite uses slow + LoS reposition only.  
SPELL_DISCOVERY_OPPORTUNITIES: Elite death can drop `spell-swap` or `spell-mirror` (once per character, explicit unlock table). Observation requires the elite to have **used** the id.  
MAP_REQUIREMENTS: Pillared chapel, two walk-offs after any swap dest. No random extra hazards.  
SPECIAL_RULES: Escorts flee if the elite dies (optional cleanup). Do not inflate elite HP beyond band queen + one slow cycle. Reflect family hook stays on the elite only.  
OBJECTIVE: Defeat the elite. Escorts optional.  
FAILURE_CONDITION: Player death.  
REWARD: 2× victory XP for the elite only + depth Doka. Hard overlay `under_8_ap_per_turn`.  
TACTICAL_PURPOSE: Mastery of “don’t dump into reflect / don’t stand where a swap wants you.”  
SOLVABILITY_REQUIREMENTS: Pillars do not isolate the elite. Escorts spawn adjacent. Swap dests (if any) pass the two-walk-off rule.  
REPLAYABILITY: Elite chassis queen vs bishop. Escort count 2 vs 1+flanker.  
SCALING_BEHAVIOUR: Add `spell-frost-nova` (player-outside-circle required) before any HP bump. Peak: one escort is a summoner, cap 2.  
STATUS: PROPOSED

---

### ENC-ELITE-03

ENCOUNTER_ID: ENC-ELITE-03  
TYPE: elite / formation  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Named pack `FSN-IRON-BATTERY/E-IRON` — elite `iron_golem` protector + junior `wraith_bishop` artillery.  
AI_REQUIREMENTS: Formation contracts: protector camps the lane if a side aisle exists; artillery keeps range ≥ 3; wounded protector retreats **behind** artillery (`ENEMY_RETREAT_HP_PCT`). No group-tactics focus required.  
SPELL_DISCOVERY_OPPORTUNITIES: Artillery death after it used `starter-frost` can complete observation of frost if ENC-TEACH-01 / ENC-SPELL-01 were skipped.  
MAP_REQUIREMENTS: Fortress or corridorMaze with **main lane plus one side aisle**. Reject a single-tile tunnel. No lava on the only approach.  
SPECIAL_RULES: Random 30% family lottery is **off**. Only one elite. Band 0: strike + frost. Band 1: iron-skin on the protector.  
OBJECTIVE: Defeat both. Intended line: artillery first via the aisle.  
FAILURE_CONDITION: Player death.  
REWARD: Elite multiplier on the golem only + standard bishop XP. Overlay `direct_hit` is a joke on a lane fight — prefer `under_15_turns`.  
TACTICAL_PURPOSE: Consume a real formation so “named pack” is a room, not only a design PDF.  
SOLVABILITY_REQUIREMENTS: Side aisle reaches the artillery. Two walk-offs in the engagement pocket.  
REPLAYABILITY: `E-IRON` vs `E-SHOT` (elite artillery, inferno at kit band 2, 3-turn cooldown).  
SCALING_BEHAVIOUR: Promote `E-SHOT` before adding a third body.  
STATUS: PROPOSED

---

### ENC-PROT-02

ENCOUNTER_ID: ENC-PROT-02  
TYPE: protection objective  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 2× charger pawn + 1× `ember_knight` + 1× bishop focusing the **shrine**.  
AI_REQUIREMENTS: All enemies prefer the shrine as target (`protectTargetId` / `wThreat` override). Lethal lookahead against the shrine is on. They do not retreat from it.  
SPELL_DISCOVERY_OPPORTUNITIES: If the shrine survives and the player used `starter-heal` or `summon-wisp` on it, rest may offer `summon-sentinel`.  
MAP_REQUIREMENTS: `WF-ZON-SHRINE_POOL` at the near third of an escort lane (8–10 tiles). Shrine is a non-player allied token (`side: player`, `isWard: true`, low HP, 0 AP, 0 MP — **stationary**, unlike ENC-PROT-01’s walking ward). Player spawns beside it. Enemies from the far end + one side alley.  
SPECIAL_RULES: Shrine is not a summon (no cap, no expiry). It can be healed. Portal unlocks only if the shrine is alive and hostiles are dead. Shrine pool regen (`WF` 5% feel) is **flavor**; if wired, it must go through existing heal writers, not a second HP path.  
OBJECTIVE: Shrine alive and hostiles dead. There is no “walk it to a banner” win — this is a hold.  
FAILURE_CONDITION: Shrine HP ≤ 0 **or** player death.  
REWARD: Protection grant + kill XP. Failed shrine = no room reward; death penalty only if the player also died.  
TACTICAL_PURPOSE: Stationary hold vs ENC-PROT-01 escort. Makes Barrier, body-blocks, and guardian summons the answer.  
SOLVABILITY_REQUIREMENTS: Alley does not spawn on the shrine. If any hazard exists, the shrine is hazard-immune **or** no hazard is adjacent (pick one, explicit).  
REPLAYABILITY: Alley left/right. Ember vs plague_rat as the third melee.  
SCALING_BEHAVIOUR: Add a second alley flanker before raising ATK. Peak: one lava tile the player can Barrier-bridge so melee must path long.  
STATUS: PROPOSED

---

### ENC-HOLD-01

ENCOUNTER_ID: ENC-HOLD-01  
TYPE: movement objective / protection / waves  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Contesting waves while the player holds a banner cell. Wave A: 2× pawn. Wave B: 1× knight + 1× bishop. Max 3 living.  
AI_REQUIREMENTS: Enemies path to the **banner tile** first (`objectiveCell` as move target). If they occupy it at the end of an enemy phase, they score 1 **contest**. Casters still spend frost if the player is in range on the way.  
SPELL_DISCOVERY_OPPORTUNITIES: Holding the banner for the full clock without a summon can later offer `spell-haste`.  
MAP_REQUIREMENTS: Central banner tile (`objectiveCell`, floor). Two spawn alleys. No hazard on the banner. Exit locked until the hold clock completes **and** hostiles are dead or flee.  
SPECIAL_RULES: Clock `holdTurns: 8` player-turns. Player “owns” the banner if they or a player-side summon occupy it at the end of the player turn. If enemy contest count reaches 3, the room fails (lost the field). When the clock ends, remnants flee. `holdPortalLocked` until cleanup.  
OBJECTIVE: Own the banner for 8 player-turns with fewer than 3 enemy contests, then clear or let flee.  
FAILURE_CONDITION: Player death **or** 3 enemy contests.  
REWARD: Hold grant (band table) + kill XP for units actually defeated. Overlay `direct_hit` (stay on the point).  
TACTICAL_PURPOSE: Movement + protection hybrid — the player must stand still *and* deal with waves. Distinct from escort and from survive-anywhere.  
SOLVABILITY_REQUIREMENTS: Banner reachable from spawn and both alleys. Alleys cannot spawn onto the banner. 3 living leave walk-offs.  
REPLAYABILITY: Banner offset one tile N/S by seed. Wave B bishop frost vs poison.  
SCALING_BEHAVIOUR: Mid: clock 6, contest fail at 4. High: clock 8, fail at 3. Peak: wave B includes a void-mirror instead of a longer clock.  
STATUS: PROPOSED

---

### ENC-PRIO-03

ENCOUNTER_ID: ENC-PRIO-03  
TYPE: priority-target / anti-summon  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 1× summoner king (`isSummoner`, `summon-dire-wolf` **or** `summon-archer`, not both) + 1× `ROLE-SUPPORT` queen (`starter-heal` only) + 1× pawn screen. Summon cap 2.  
AI_REQUIREMENTS: Summoner on cooldown 2. Healer keeps the summoner up (`ENEMY_HEAL_ALLY_THRESHOLD_PCT`). Pawns screen. Enemies snipe player wisps (`ENEMY_THREAT_VALUES.wisp`). If the summoner dies, living enemy summons despawn at end of turn (explicit). If the healer dies first, the summoner goes frost-aggressive (no inferno until peak).  
SPELL_DISCOVERY_OPPORTUNITIES: `summon-dire-wolf` or `summon-archer` if missing. Sibling id `spell-sever-tether` (if that catalog lands) is the intended drop for accounts that already own both summons.  
MAP_REQUIREMENTS: Two-depth backline + screen line. No void on summon spawn cells.  
SPECIAL_RULES: `onSummonerDeath: despawnOwnedSummons`. Soft-lock guard: skip summon if cap or no free floor.  
OBJECTIVE: Clear. Intended order: summoner if wolves are up; healer if the king is about to rally a second pair.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + summon / sever drop. Overlay `under_15_turns` rewards deleting the source.  
TACTICAL_PURPOSE: Priority in a summon-cap world; killing the source is cleaner than racing dogs. Distinct from ENC-PRIO-02 by making despawn-on-death the **visible** rule and by sitting on a Void-primer mastery beat.  
SOLVABILITY_REQUIREMENTS: Backline reachable; summons spawn on free reachable floor only.  
REPLAYABILITY: Wolf vs archer kit.  
SCALING_BEHAVIOUR: Healer gains `spell-haste` (on the wolves) before the summoner gains a third spell. Cap stays 2.  
STATUS: PROPOSED

---

### ENC-MOVE-02

ENCOUNTER_ID: ENC-MOVE-02  
TYPE: movement objective / hazard  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 2× kiting `tide_shade` bishops (`starter-frost` + `spell-slow` at band 1). 0 melee on entry.  
AI_REQUIREMENTS: Bishops hold the far third and punish standing on glyphs. They do not cross the mid-hazard unless the player is on their third.  
SPELL_DISCOVERY_OPPORTUNITIES: Tagging all three glyphs without taking hazard damage can unlock `spell-haste` or `spell-swap` (one per character, not both).  
MAP_REQUIREMENTS: Three `objectiveCells` (glyphs) in a triangle. Mid-band is 2 tiles of void **or** `WF-HAZ-EMBER_VEIN` (4% max-HP tax — still a later overlay; until wired, use scripted lava). Two `WF-TER-CRUMBLE_PILLAR` tiles that become floor after the first glyph (open a shortcut). Exit locked until `touchedGlyphs === 3` **and** hostiles are dead.  
SPECIAL_RULES: Player must occupy each glyph at least once (`touchedGlyphs` flags). Pillars do not block the only path — they only shorten a long detour.  
OBJECTIVE: Tag all three glyphs and clear the bishops.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + discovery. Overlay `under_50_damage`.  
TACTICAL_PURPOSE: Multi-point movement (vs ENC-MOVE-01’s single far-bank tile). Teaches MP budget, Barrier, and “void is a seam.”  
SOLVABILITY_REQUIREMENTS: At least one hazard-free path that visits all three glyphs (may be long). Bishops reachable by frost from a glyph so the player is never in a dead kite. Finalize must not relocate glyphs onto walls or portals.  
REPLAYABILITY: Triangle rotation. Ember vein vs void seam.  
SCALING_BEHAVIOUR: Add a third bishop or poison, not a thicker seam. Peak: one glyph sits adjacent to a spike (choice of pain).  
STATUS: PROPOSED

---

### ENC-MOVE-03

ENCOUNTER_ID: ENC-MOVE-03  
TYPE: movement objective / race  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× `ember_knight` in the **enemy lane** (charger) + 1× bishop in the player lane (`starter-frost`, harassment only).  
AI_REQUIREMENTS: Ember knight paths toward `enemyBanner` in its lane and does not leave the lane unless a cross-cut is open. Bishop kites in the player lane.  
SPELL_DISCOVERY_OPPORTUNITIES: Winning the race (player banner before enemy banner) without `spell-haste` can offer haste.  
MAP_REQUIREMENTS: Dual-lane track, 8–10 tiles, one sealed cross-cut that opens if the player tags a mid glyph (`openCrossCut`). Player banner at the far end of lane A; enemy banner at the far end of lane B.  
SPECIAL_RULES: First side to occupy its banner wins the **race flag**. Combat continues until hostiles are dead. If the enemy wins the race, a 2-pawn reinforcement spawns on the player banner (cap 3 living) — pressure, not an instant fail. Portal locked until hostiles are dead.  
OBJECTIVE: Clear hostiles. The race is the intended line, not a second fail.  
FAILURE_CONDITION: Player death only.  
REWARD: Standard + race bonus Doka if the player tagged first.  
TACTICAL_PURPOSE: Split attention — spend MP to win the race or spend AP to delete the knight and accept reinforcements.  
SOLVABILITY_REQUIREMENTS: Both lanes reachable from spawn via a rear connector. Cross-cut, if opened, does not isolate an exit. Reinforcement cells reachable and not on the portal.  
REPLAYABILITY: Player starts in lane A vs B. Ember vs plague_rat as the racer.  
SCALING_BEHAVIOUR: High: bishop also has slow. Peak: losing the race also turns on `thorned_ground` in the player lane (tax, not a wall).  
STATUS: PROPOSED

---

### ENC-DISP-01

ENCOUNTER_ID: ENC-DISP-01  
TYPE: hazard / priority-target / displacement  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: `FSN-MIRROR-SCRIPTORIUM` lite — 1× `void_mirror` displacer (queen **without** heal) + 1× support queen (`starter-heal` only) + 1× assassin knight. Until Swap apply + scorer exist, displacer kit is frost + slow only and the room still teaches **forced reposition** via `WF-TEL-MIRROR_STEP` tiles.  
AI_REQUIREMENTS: Formation contracts. Displacer stays at Chebyshev ≥ 3. Support heals the knight. Knight uses any displaced player tile as a flank. Soph 4–6. Backline protect on the scribe/support.  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-swap` if the displacer used it, or `spell-mirror` if a reflect was observed.  
MAP_REQUIREMENTS: Arena with two pillars + two `WF-TEL-MIRROR_STEP` pads (stepping swaps the unit with the other pad if the dest is legal). No Void Rift tile as a legal Swap / pad dest. Two walk-offs after every legal dest.  
SPECIAL_RULES: Pads are floor. Illegal dest (occupied, void, hazard, portal) = no swap, spend nothing. Enemies may step pads. `inferArchetype` must not see heal on the displacer.  
OBJECTIVE: Clear all. Intended line: support first.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + displacement discovery. Overlay `under_8_ap_per_turn` (don’t panic-dump after a swap).  
TACTICAL_PURPOSE: Combine taught void-tax with “the board can move you.” Prepares ENC-ELITE-02 and Rush room 4.  
SOLVABILITY_REQUIREMENTS: Both pads reachable; dest legality checked; knight cannot spawn adjacent to the player (MIN_CHEBYSHEV).  
REPLAYABILITY: Pad axis H vs V. Assassin ember_knight vs default.  
SCALING_BEHAVIOUR: Unlock real `spell-swap` on the displacer only after apply exists. Peak: `FSN-MIRROR-SCRIPTORIUM/NOVA` if a tile outside radius 2 exists.  
STATUS: PROPOSED

---

### ENC-RARE-02

ENCOUNTER_ID: ENC-RARE-02  
TYPE: rare elite room  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Full `FSN-MIRROR-SCRIPTORIUM` **or**, if Swap is not live, `FSN-CROWN-ESCORT` lite (king mover + 2 golems, no extra controller). Rare elite tag on the displacer / king only (`variant: rare_elite`).  
AI_REQUIREMENTS: CADRE/COURT contracts. `escapeRoute` on the rare elite. `instantKill` / `betrayal` off. Lethal lookahead on.  
SPELL_DISCOVERY_OPPORTUNITIES: Guaranteed one rare drop from {`spell-swap`, `spell-shadow-veil`, `spell-frost-nova`, `spell-haste`} not yet owned.  
MAP_REQUIREMENTS: Ruins-islands with two bridges, or chapel + pads from ENC-DISP-01. Insertion chance: 8% on mastery beats, never on surfaces. At most once per dungeon-chain.  
SPECIAL_RULES: Death is a normal death (full penalty). Do not pair with ENC-TREAS-02 by default. Purple portal chrome only after clear.  
OBJECTIVE: Defeat the rare elite (supports recommended).  
FAILURE_CONDITION: Player death.  
REWARD: Rare Doka band (≈ 2.5× depth victory) + the spell drop.  
TACTICAL_PURPOSE: Optional peak that consumes a COURT/CADRE formation the primer already taught.  
SOLVABILITY_REQUIREMENTS: Bridges connected; elite cannot spawn in a pocket; swap/pad dests legal.  
REPLAYABILITY: Scriptorium vs Crown-Escort by seed if both formations are unlocked for the account.  
SCALING_BEHAVIOUR: Do not add a second rare elite. Scale support kit (heal → haste) and elite uptime.  
STATUS: PROPOSED

---

### ENC-TREAS-02

ENCOUNTER_ID: ENC-TREAS-02  
TYPE: treasure / risk  
RELATIVE_DIFFICULTY: HIGH (opt-in)  
ENEMY_COMPOSITION: Empty on entry. Three chests (`WF-RSK-GAMBIT_CHEST` language, dungeon-legal — the live catalog bans Gambit on Rush, not on dungeon-chain).  

| Chest | Commit fight | Previewed reward |
| :--- | :--- | :--- |
| Copper | 2× pawn | Depth Doka × 1.25 |
| Silver | `FSN-FROST-KNIFE` | Depth Doka × 1.75 + one zone-1 id |
| Gold | `FSN-TRI-BASTION` or 2× rook + queen | Depth Doka × 2.5 + one risk id (`spell-sacrifice`, `spell-lifesteal-nova`, `summon-bomber`) |

AI_REQUIREMENTS: Standard kits for the chosen pack. Queen may use inferno at zone ≥ 2.  
SPELL_DISCOVERY_OPPORTUNITIES: Gold preview is always shown before combat.  
MAP_REQUIREMENTS: Three chest tiles + a white coward exit near spawn (unlocked immediately). Progress portal locked until coward-leave **or** the committed fight is won.  
SPECIAL_RULES: Touching a chest locks the other two and the coward exit. Losing is a normal death. Coward leave grants **no** chest loot and is not a chain failure (weaker mastery multiplier). Jackpot numbers stay inside `applyRewards`.  
OBJECTIVE: Win the committed fight **or** take the coward exit.  
FAILURE_CONDITION: Player death after committing. Coward exit is success-with-less.  
REWARD: Per table. Coward: 0 extra.  
TACTICAL_PURPOSE: Choice/rest beat with **information** — three prices, not one vault. Distinct from ENC-TREAS-01’s binary vault.  
SOLVABILITY_REQUIREMENTS: All chests and the coward exit reachable on entry. After commit, spawn the pack on reachable cells not on the progress portal.  
REPLAYABILITY: Chest positions rotate. Gold pack TRI-BASTION vs rook-pair.  
SCALING_BEHAVIOUR: Raise information (mid: “2 rooks + queen”; peak: show kits) rather than HP.  
STATUS: PROPOSED

---

### ENC-REST-02

ENCOUNTER_ID: ENC-REST-02  
TYPE: rest choice  
RELATIVE_DIFFICULTY: none (safe) — optional altar is HIGH  
ENEMY_COMPOSITION: None on the rest floor. `isRestMap: true`.  
AI_REQUIREMENTS: None.  
SPELL_DISCOVERY_OPPORTUNITIES: Shrine pedestals up to one owned spell and previews `upgradeSpell` cost (`spellLevelingBaseCost * 2^level`). Debit must stay `spellUpgradeUiSpend` if they buy. No free upgrades. If ENC-AMBUSH-02 / ENC-ELITE-02 observed mirror/swap, the shrine **names** the missing id (still not a grant).  
MAP_REQUIREMENTS: Existing rest layout: open floor, exits `normal` / `dungeon` / `boss`. Optional fourth **risk** exit to ENC-TREAS-02. Optional `WF-RSK-BLOOD_ALTAR` tile: pay 10% current HP (`saveBattleStats` / challenge recorder — **not** a new writer) to mark `altar: blood` for the next room (that room uses `vampiric_ground` + a rare insert roll). Optional `WF-EVT-ECLIPSE` tint (visual only).  
SPECIAL_RULES: No encounters until a rest-exit is taken. `armDeathGuards` still applies if the player arrived from Death Realm. Blood altar does not start combat. `uiLayout` unchanged.  
OBJECTIVE: Choose an exit. Optional: shrine, altar, or risk door.  
FAILURE_CONDITION: None on this map.  
REWARD: None on the rest map. Altar is a modifier flag, not a Doka mint.  
TACTICAL_PURPOSE: Choice/rest beat that lets high-level players **opt into** a harder next verb instead of facing a bigger number.  
SOLVABILITY_REQUIREMENTS: All rest-exits reachable. New risk exit and altar pass punch-roster / portal reachability. Altar not on spawn or a portal.  
REPLAYABILITY: Shrine spell rotates among under-leveled bar spells. Eclipse tint on/off.  
SCALING_BEHAVIOUR: Rest does not scale. After depth 3, hide `normal` behind an abandon confirm. After one full Rush clear, shrine can enable day-2 `rushVariant` flags.  
STATUS: PROPOSED

---

### ENC-BRANCH-02

ENCOUNTER_ID: ENC-BRANCH-02  
TYPE: branching paths  
RELATIVE_DIFFICULTY: LOW (the choice is the content)  
ENEMY_COMPOSITION: None on the foyer.  
AI_REQUIREMENTS: None in-foyer.  
SPELL_DISCOVERY_OPPORTUNITIES: Door inscriptions preview the taught verb and one spell id the next room may drop.  
MAP_REQUIREMENTS: Foyer with three portals: Ash (lava / ember → ENC-MOVE-01 or ENC-HAZ-04), Ice (frost / slime → ENC-SPELL-02 or ENC-HAZ-03), Void (rift / swap → ENC-TEACH-02 or ENC-DISP-01). A sealed fourth door to ENC-RARE-02 opens only if the account has cleared all three branches at least once (long-term, not this run).  
SPECIAL_RULES: Taking a door marks `branch: ash | ice | void` on the dungeon snapshot (**before** `cleanupMap`). Other doors are gone for this chain. Mastery/boss later read the flag (ENC-MAST-02 / ENC-BOSS-02).  
OBJECTIVE: Pick a door.  
FAILURE_CONDITION: None in-foyer.  
REWARD: None. The chosen room pays.  
TACTICAL_PURPOSE: Three-way memory. Day-1 `ENC-BRANCH-01` stays two-door; this is the account-upgrade foyer.  
SOLVABILITY_REQUIREMENTS: All three doors reachable; none on spawn.  
REPLAYABILITY: Door order shuffles. Fog door (ENC-AMBUSH-02) can replace Ice for accounts that already finished Ice this week.  
SCALING_BEHAVIOUR: Branches do not get harder; **destinations** scale with band.  
STATUS: PROPOSED

---

### ENC-MINI-02

ENCOUNTER_ID: ENC-MINI-02  
TYPE: mini-boss  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Fetid Lieutenant — rook chassis, kit from Fetid Rook **lite**: `physical_attack` + `starter-poison` + `spell-cursed-wound`. 2× `plague_rat` choir. Not in `BOSS_IDS`. No phase-2 table.  
AI_REQUIREMENTS: Lieutenant applies DoT then cursed-wound. Choir chargers. If the lieutenant would die, it tries one cursed-wound (priority).  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-cursed-wound` drop (once) if used.  
MAP_REQUIREMENTS: Small nave + two stalls. Scripted `plague_zone` on stall floors only. No lava (save that for Countess).  
SPECIAL_RULES: At 30% HP the lieutenant gains **one** extra poison cycle only if the chain taught plague (ENC-HAZ-03 / ENC-WAVE-03). Otherwise it only melee + one wound. Honest to pacing.  
OBJECTIVE: Defeat the lieutenant (choir flees on death).  
FAILURE_CONDITION: Player death.  
REWARD: Mini-boss 2× XP on the lieutenant + depth Doka. Not a Boss Rush room.  
TACTICAL_PURPOSE: Rot-branch capstone-adjacent without `fetid_rook`’s full state machine.  
SOLVABILITY_REQUIREMENTS: Stalls connected to the nave. Plague tiles do not wall the nave.  
REPLAYABILITY: Choir bishops (frost) if Ice was taken; ember knights if Ash.  
SCALING_BEHAVIOUR: Add cursed-wound duration via existing DoT stacks, not HP. Peak: one choir rat is a summoner wisp-enemy (only if `usableByEnemy` is flipped later).  
STATUS: PROPOSED

---

### ENC-MINI-03

ENCOUNTER_ID: ENC-MINI-03  
TYPE: mini-boss  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Static Adept — bishop chassis, kit from Lord of Static **lite**: `starter-blast` + `starter-frost` + `spell-expose`. 1× pawn conductor. Not in `BOSS_IDS`. No shock-tile storm (that is the real boss).  
AI_REQUIREMENTS: Adept prefers a 2-bounce line (pawn → player) as in ENC-SPELL-02, then expose. Conductor is a charger that **tries to stand in the bounce line**.  
SPELL_DISCOVERY_OPPORTUNITIES: `starter-blast` and/or `spell-expose`.  
MAP_REQUIREMENTS: Straight aisle, at least 3 walkable columns. Two scripted shock-lookalike **floor** tiles that are actually spikes (honest telegraph; do not invent a new hazard type).  
SPECIAL_RULES: First blast uses `telegraphMultiplier: 0.5` if the player has never owned blast; otherwise full. No `BossAbility` lightning immunity.  
OBJECTIVE: Defeat the adept (conductor optional).  
FAILURE_CONDITION: Player death.  
REWARD: Mini-boss 2× XP on the adept + discovery.  
TACTICAL_PURPOSE: Bounce-spacing exam before Rush room 2 / `lord_of_static`.  
SOLVABILITY_REQUIREMENTS: Aisle wide enough to step off the bounce line. Spike tiles not on the only walk column.  
REPLAYABILITY: Bounce N-S vs E-W.  
SCALING_BEHAVIOUR: Remove the 0.5 telegraph after blast is owned. Peak: conductor is a rook with iron-skin (stay in line longer).  
STATUS: PROPOSED

---

### ENC-BOSS-02

ENCOUNTER_ID: ENC-BOSS-02  
TYPE: dungeon capstone boss  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: One real `BossId` by `branch` flag: Void → `void_grandmaster` (illusions) or `enthroned_void` if the chain taught shrink/void tiles (ENC-SURV-03 / ENC-MOVE-02); Ash still `crimson_countess`; Ice still `pale_archbishop`. Rot-leaning Void primer may use `midnight_bishop` if ENC-MINI-03 was skipped and ENC-MINI-02 ran. No dual-boss unless this is a Rush injection.  
AI_REQUIREMENTS: Existing `useBossAI` / `useBossSystem` for that id. Adds **one** pack of 2 trash in phase 1 only if the chain taught waves (ENC-WAVE-03) or on-death larvae (ENC-REINF-02).  
SPELL_DISCOVERY_OPPORTUNITIES: None new; boss kits already use catalog spells. Observation still follows the sibling pipeline if catalog ≠ ownership ever lands.  
MAP_REQUIREMENTS: Existing boss map color / portal color from `DEFAULT_BOSS_CONFIGS`. Hazard tiles from the boss ability stay capped at 50. Must remain solvable.  
SPECIAL_RULES: Depth must be maxDepth. `decideDungeonChainPortal` complete + white portal after win. Do not write rewards via `updateCharacter`. Enrage overlay, if a later boss PR lands, is a turn clock — not HP.  
OBJECTIVE: Defeat the boss.  
FAILURE_CONDITION: Player death (Death Realm, chain reset via `resetRunState`).  
REWARD: Boss Doka/XP multipliers already on the config, then dungeon completion bonus `maxDepth * 50`. Recap at app root.  
TACTICAL_PURPOSE: Mastery exam: the taught verb is the boss’s main ability (void illusions / mist / lava trail / curse).  
SOLVABILITY_REQUIREMENTS: Same as current boss rooms (preferred cells reachable).  
REPLAYABILITY: Four capstones from one three-way foyer + rot insert.  
SCALING_BEHAVIOUR: Use existing phase 2 (`statMultiplier` in 1.15–1.60 per boss design bible — do not add a third phase). Trash pack size is the only dungeon-specific scaler.  
STATUS: PROPOSED

---

### ENC-SPELL-03

ENCOUNTER_ID: ENC-SPELL-03  
TYPE: spell-discovery  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 1× “cartographer pawn” that camps a `WF-TEL-MIRROR_STEP` pad and only casts `starter-frost`. 1× dummy pawn on the far pad.  
AI_REQUIREMENTS: Cartographer camps the near pad (`chokepointCamp`). Dummy is generic and does not leave the far pad unless struck.  
SPELL_DISCOVERY_OPPORTUNITIES: Primary: `spell-swap`. If Swap apply is not live, the **pad** is the teacher and the grant is still `spell-swap` on win-if-tagged. Glyph metadata `discoverSpellId: spell-swap`.  
MAP_REQUIREMENTS: Two pads, two pillars, no extra modifiers. Pads never target void/portal.  
SPECIAL_RULES: If the player already owns swap, convert to ENC-DISP-01. Discovery does not auto-upgrade and does not auto-bar-insert (max 8).  
OBJECTIVE: Defeat hostiles; stepping a pad (or observing an enemy pad-swap) is the intended lesson.  
FAILURE_CONDITION: Player death.  
REWARD: The spell id into the owned set + tiny Doka.  
TACTICAL_PURPOSE: Teach displacement as a found verb, not a shop row.  
SOLVABILITY_REQUIREMENTS: Both pads free floor, not portals. Two walk-offs after a pad swap.  
REPLAYABILITY: Which pad the cartographer camps flips.  
SCALING_BEHAVIOUR: Does not scale; it retires when swap is owned (becomes ENC-DISP-01).  
STATUS: PROPOSED

---

### ENC-SPELL-04

ENCOUNTER_ID: ENC-SPELL-04  
TYPE: spell-discovery / teach mechanic  
RELATIVE_DIFFICULTY: LOW  
ENEMY_COMPOSITION: 1× bishop that telegraphs `starter-blast` down an aisle + 1× pawn. After the first blast resolves, a **barrier glyph** appears on a side tile (`discoverSpellId: spell-barrier`).  
AI_REQUIREMENTS: Bishop prefers the bounce line. Does not walk onto the glyph.  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-barrier` (primary). If the player already owns barrier, glyph is `spell-timestep` instead. Mirror is **not** on this glyph (that is ENC-SPELL-02 / ENC-AMBUSH-02).  
MAP_REQUIREMENTS: Straight aisle + one side alcove for the glyph.  
SPECIAL_RULES: First blast `telegraphMultiplier: 0.5` if blast is new. Glyph despawns if unused when the last enemy dies (player still wins). `usableByEnemy` stays false for barrier / timestep.  
OBJECTIVE: Clear. Optional: pick up the glyph and use it before the second blast.  
FAILURE_CONDITION: Player death.  
REWARD: Discovery + standard.  
TACTICAL_PURPOSE: Teach Barrier as a LoS/hazard tool and Timestep as a “I already have Barrier” upgrade — without giving those ids to enemies.  
SOLVABILITY_REQUIREMENTS: Alcove reachable; glyph not on the aisle’s only walk column.  
REPLAYABILITY: Alcove left/right.  
SCALING_BEHAVIOUR: After both ids are owned, convert to ENC-MINI-03 (exam).  
STATUS: PROPOSED

---

### ENC-MAST-02

ENCOUNTER_ID: ENC-MAST-02  
TYPE: mastery / waves / hold / hazard  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Wave 1: 2× pawn on a void seam. Wave 2: `FSN-FROST-KNIFE`. Wave 3: elite `void_mirror` pawn (haste if owned by the kit band) + leftover.  
AI_REQUIREMENTS: Full sophistication allowed (lethal lookahead, overkill spill, LoS reposition, backline guard). Wave 3 elite camps the safest non-void tile.  
SPELL_DISCOVERY_OPPORTUNITIES: None — this is the exam.  
MAP_REQUIREMENTS: Combines void seam (TEACH-02), dual-lane (WAVE-03), and a central banner (HOLD-01) that is **optional** — tagging it once silences wave-2 slow for 2 turns (explicit buff, not a new stat). Scripted hazards only.  
SPECIAL_RULES: Portal locked until wave 3 clear. Branch skins: Void keeps void; Ash swaps the seam to ember vein / lava stones (one safe path); Ice swaps to slime + Frozen Terrain.  
OBJECTIVE: Clear all waves.  
FAILURE_CONDITION: Player death.  
REWARD: Mastery Doka band + standard XP. Overlay `under_8_ap_per_turn` or `direct_hit`. Avoid `under_5_turns`.  
TACTICAL_PURPOSE: Prove the player can sequence waves, refuse void, and optionally spend MP on the banner.  
SOLVABILITY_REQUIREMENTS: All wave-cell sets reachable; one safe path for the branch hazard; banner not on a portal.  
REPLAYABILITY: Branch-skinned hazards. Wave 2 can be IRON-BATTERY on Ash.  
SCALING_BEHAVIOUR: Change wave 3 elite’s **role** (mirror kiter vs iron-skin rook), not its level.  
STATUS: PROPOSED

---

### ENC-RUSH-04

ENCOUNTER_ID: ENC-RUSH-04  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 1 remix: `crimson_countess` + `fetid_rook` as `BOSS_RUSH_ROOMS[1]`, plus **one** scripted ember-vein or lava stepping-stone lane from ENC-MOVE-01 (cap 4 extra hazard tiles).  
AI_REQUIREMENTS: Existing combined mechanic: “Countess lava trails deal poison (not burn) while Rook lives. Both enrage at 50% HP simultaneously.” Trails prefer the stone-lane edges, not the only walk path.  
SPELL_DISCOVERY_OPPORTUNITIES: None (Rush is a mastery product).  
MAP_REQUIREMENTS: Current Rush preferred-cell solvability. Stones / vein ⊆ reachable floor.  
SPECIAL_RULES: `rushVariant: ember_lane`. Persist still goes through `persistBossRushRoomClear` / `completeBossRushRoom` (client `dokaReward`/`xpReward` ignored).  
OBJECTIVE: Defeat both bosses.  
FAILURE_CONDITION: Player death → abort rush (`resetRunState`).  
REWARD: Existing room 1 table (750 Doka / 300 XP) + small lane bonus if the player never stood on lava/vein (via `applyRewards`).  
TACTICAL_PURPOSE: Escalate room 1 by adding the taught movement-tax verb, not more HP.  
SOLVABILITY_REQUIREMENTS: Preferred cells + a lava-free path using stones. Hazard total ≤ 50.  
REPLAYABILITY: Vein H vs V.  
SCALING_BEHAVIOUR: Later accounts that opted into “endless rush” at ENC-REST-02 may add ENC-WAVE-03 rats in phase 1 (cap 2), never a third boss.  
STATUS: PROPOSED

---

### ENC-RUSH-05

ENCOUNTER_ID: ENC-RUSH-05  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 2 remix: `bone_cavalier` + `lord_of_static` as `BOSS_RUSH_ROOMS[2]`, plus one **conductor pawn** from ENC-MINI-03 (despawns when Static dies).  
AI_REQUIREMENTS: Existing combined mechanic: “Cavalier charge gains chain lightning from Static. Static channels through Cavalier granting temporary physical immunity.” Conductor tries to stand in the bounce line. Trash does not receive Static’s immunity.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Aisle-wide preferred cells (3 walkable columns). Conductor spawn in the reachable set.  
SPECIAL_RULES: `rushVariant: conductor`. Conductor is not a boss and does not count toward `completeBossRushRoom` until both bosses are dead (prefer despawn).  
OBJECTIVE: Defeat both bosses; conductor optional.  
FAILURE_CONDITION: Player death.  
REWARD: Existing room 2 table (1000 / 400) + tiny bonus if the conductor died before Static (skill).  
TACTICAL_PURPOSE: Add the bounce-spacing verb from the Static primer to a known duo.  
SOLVABILITY_REQUIREMENTS: Preferred cells + conductor cell reachable; aisle steppable.  
REPLAYABILITY: Conductor pawn vs rook (iron-skin) for accounts that already beat room 2 once.  
SCALING_BEHAVIOUR: Do not add a third boss. Tighten bounce by conductor iron-skin, not HP.  
STATUS: PROPOSED

---

### ENC-RUSH-06

ENCOUNTER_ID: ENC-RUSH-06  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 4 remix: `void_grandmaster` + `mirror_sovereign` as `BOSS_RUSH_ROOMS[4]`, plus two `WF-TEL-MIRROR_STEP` pads from ENC-DISP-01.  
AI_REQUIREMENTS: Existing combined mechanic: “Grandmaster ghost copies are reflected by Sovereign. Player must identify the real one. Sovereign mirrors 30% of all damage.” Pads may swap the player into a ghost’s melee — legal, escapable.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Two pads on reachable floor, never as a legal dest into void or a boss preferred cell. Two walk-offs after each dest.  
SPECIAL_RULES: `rushVariant: pads`. Pads never soft-lock occupancy (if dest illegal, no swap).  
OBJECTIVE: Defeat both bosses. Identifying the real Grandmaster remains the intended line.  
FAILURE_CONDITION: Player death only.  
REWARD: Existing room 4 table (1500 / 600). Overlay `under_15_turns` is fairer than `under_5_turns`.  
TACTICAL_PURPOSE: Escalate room 4 by adding the displacement verb the Void primer taught.  
SOLVABILITY_REQUIREMENTS: Pads reachable; dest legality; preferred cells free.  
REPLAYABILITY: Pad axis H vs V.  
SCALING_BEHAVIOUR: Do not add a third boss. Extra ghost is already the boss kit — do not double it.  
STATUS: PROPOSED

---

### ENC-RUSH-07

ENCOUNTER_ID: ENC-RUSH-07  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 5 remix: `chessboard_lich` + `pale_archivist` as `BOSS_RUSH_ROOMS[5]`, plus **one** ENC-HOLD-01 banner tile. Standing on the banner at end of player turn **clears one marked curse zone** (uses existing zone-clear language; do not invent a new damage formula).  
AI_REQUIREMENTS: Existing combined mechanic: “Lich curse zones are marked by Archivist scrolls. Stepping on a marked zone triggers both curse and scroll attack simultaneously.” Archivist prefers to stand off the banner.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Banner on reachable floor, not overlapping a preferred boss cell or a marked-zone seed cell.  
SPECIAL_RULES: `rushVariant: banner_ward`. Banner is optional — the room can be won without it. It is the intended line for accounts that learned HOLD-01.  
OBJECTIVE: Defeat both bosses.  
FAILURE_CONDITION: Player death only.  
REWARD: Existing room 5 table (2000 / 800).  
TACTICAL_PURPOSE: Escalate by adding a hold verb to a zone-control pair.  
SOLVABILITY_REQUIREMENTS: Banner reachable without standing in a marked zone if the player spends MP.  
REPLAYABILITY: Banner N vs S of center.  
SCALING_BEHAVIOUR: Do not add a third boss. Marked-zone count stays on the existing boss ability cap.  
STATUS: PROPOSED

---

### ENC-RUSH-08

ENCOUNTER_ID: ENC-RUSH-08  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 8 remix: `alabaster_fortress` + `broodmother_rook` as `BOSS_RUSH_ROOMS[8]`, plus ENC-REINF-02’s **on-death larva cap** made explicit: larvae from walls still honor `ENEMY_SUMMON_CAP` / living-hostile soft-cap 6 for **trash** (bosses excluded).  
AI_REQUIREMENTS: Existing combined mechanic: “Fortress walls spawn on larva positions. Larvae use walls as cover. Destroying a wall releases a burst of larvae.” Burst that would exceed the trash cap **spills** (skip extras, log) — never soft-lock the portal.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Current room 8 preferred cells. One extra “kill corridor” (2-tile aisle) so on-death spawns have a controlled spill.  
SPECIAL_RULES: `rushVariant: brood_cap`. Death still aborts the rush. Do not claw back prior rooms’ persisted rewards.  
OBJECTIVE: Defeat both bosses. Trash despawns on double-boss death (prefer despawn).  
FAILURE_CONDITION: Player death.  
REWARD: Existing room 8 table (3500 / 1500).  
TACTICAL_PURPOSE: Make the Broodmother burst readable using the on-death rule the dungeon already taught, instead of a bigger HP pool.  
SOLVABILITY_REQUIREMENTS: Preferred cells + kill corridor reachable; spill never occupies the exit.  
REPLAYABILITY: Corridor N vs E.  
SCALING_BEHAVIOUR: First clear uses the live uncapped-feel but still skips illegal placements. Later clears advertise the cap in the Rush recap line.  
STATUS: PROPOSED

---

### ENC-SURV-04

ENCOUNTER_ID: ENC-SURV-04  
TYPE: survival / optional challenge  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Clock 8. Wave A: `plague_rat` pair. Wave B overlaps at turn 3: `FSN-FROST-KNIFE`. Wave C at turn 6: elite golem. Overlap allowed; hard-cap 5 living.  
AI_REQUIREMENTS: Full gates except instantKill / betrayal. Elite golem camps the last non-void tile as ENC-SURV-03 shrinks (if this room is inserted after a shrink map, inherit 1 ring only).  
SPELL_DISCOVERY_OPPORTUNITIES: Hold to last turn without Timestep → shrine reminder only.  
MAP_REQUIREMENTS: Arena + one `gravity_well` or `chaos_initiative` modifier (pick one). Gravity well sits on a **flank** (longer clean path exists).  
SPECIAL_RULES: Overlap + one unused modifier is the escalation vs ENC-SURV-02/03. Flee remnants when the clock ends.  
OBJECTIVE: Survive the clock, then clean or let flee.  
FAILURE_CONDITION: Player death.  
REWARD: Higher survival table than ENC-SURV-03.  
TACTICAL_PURPOSE: Peak pressure that spends leftover modifiers so late-game maps are not “void again.”  
SOLVABILITY_REQUIREMENTS: 5-unit occupancy leaves a walkable ring; well/chaos never seals spawn or exit.  
REPLAYABILITY: gravity_well vs chaos_initiative. Wave C golem vs void-mirror elite.  
SCALING_BEHAVIOUR: Overlap timing (wave B at 3 vs 4) is the scaler.  
STATUS: PROPOSED

---

## 5. Sample chains (composition, not code)

### Chain C — “Void Primer” (maxDepth 5)

| Depth | Beat | ID |
| ---: | :--- | :--- |
| 1 | Teach | ENC-TEACH-02 then ENC-SPELL-03 (or ENC-SPELL-04 if swap already owned) |
| 2 | Reinforce | ENC-WAVE-03 |
| 3 | Combine | ENC-DISP-01 |
| 3 insert | Choice | ENC-BRANCH-02 → Void stays; Ash/Ice divert to day-1 rooms |
| 4 | Pressure | ENC-SURV-03 **or** ENC-HOLD-01 **or** skip via ENC-REST-02 |
| 4 | Mastery | ENC-MAST-02 (void skin) |
| 5 | Boss | ENC-BOSS-02 (`void_grandmaster` or `enthroned_void`) |

Rare: 8% on depth 4 to **insert** ENC-RARE-02 before mastery.  
Treasure: rest may offer ENC-TREAS-02 instead of HOLD-01.  
Rot side-story: replace combine with ENC-REINF-02 and mini-boss ENC-MINI-02; capstone may become `midnight_bishop`.

### Chain D — “Static Primer” (maxDepth 4)

ENC-SPELL-04 → ENC-HAZ-04 → ENC-MINI-03 → ENC-REST-02 → ENC-BOSS-02 (`lord_of_static` only if a later human allows a non-branch boss; default is still a catalog `BossId` already in the foyer table). Prefer inserting ENC-MINI-03 as mastery on Ice/Void mixed accounts, then Rush room 2 via rest `boss` exit.

### Rush injection (day-2)

After one full Rush clear, ENC-REST-02 shrine can enable: room 1 → ENC-RUSH-04, room 2 → ENC-RUSH-05, room 4 → ENC-RUSH-06, room 5 → ENC-RUSH-07, room 8 → ENC-RUSH-08. Day-1 flags for rooms 0 / 3 / 9 remain.

---

## 6. Optional challenge overlay

Existing `ChallengeCondition` values only. Do not invent predicates until a human asks.

| Encounter | Suggested overlay |
| :--- | :--- |
| ENC-TEACH-02, ENC-SPELL-03 | `under_50_damage` / `under_15_turns` |
| ENC-HAZ-03 | `no_healing` |
| ENC-HAZ-04 | `no_healing_under_30_damage` or `under_50_damage` |
| ENC-WAVE-03 | `under_10_turns` |
| ENC-HOLD-01, ENC-PROT-02 | `direct_hit` |
| ENC-ELITE-02, ENC-MAST-02, ENC-DISP-01 | `under_8_ap_per_turn` |
| ENC-SURV-03, ENC-SURV-04 | `no_healing` (not `no_damage_taken`) |
| ENC-MOVE-02, ENC-MOVE-03 | `under_50_damage` |
| ENC-TREAS-02 / ENC-REST-02 altar | no overlay (the risk *is* the challenge) |

All overlay Doka/XP still go through `liveBattleChallengePersistEntries` → `applyRewards`.

---

## 7. Scaling tables (no level-only ramps)

| Band | Composition | AI | Kits / families | Hazards / modifiers | Objectives |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TEACH | 2 roles, one verb | no lookahead | zone 0, no family | 2–3 scripted tiles | kill |
| LOW | +1 family role | LoS reposition | zone 0–1 | one seam (slime/void) | kill + optional glyph |
| MID | named `FSN-*` or waves | backline guard | zone 1 + one family | one modifier **or** one `WF-*` | clock / tags / race |
| HIGH | elite or hold | lethal lookahead | zone 1–2 + elite tag | two taxes | protect / hold / shrink |
| PEAK | overlap or boss | full gates except 9/10 | formation + rare | branch-skinned | mastery / rush variant |

If a live player is over-levelled for a band, **promote the band’s verb** (add a role, enable a kit spell, tighten contest count, inherit one shrink ring) rather than multiplying enemy HP.

---

## 8. Explicit metadata sketch (for a later implementer)

Not production code. Compose day-1 fields plus:

```
encounterId
encounterType        // + hold | race | displace | formation_elite
formationId?         // FSN-* 
familyLock[]         // disable 30% lottery
worldFeatureIds[]    // WF-* placed after finalize
inheritHazardsFrom?
branchFlag?          // ash | ice | void
holdPortalLocked?
objectiveKind        // + hold_banner | tag_glyphs | win_race | choose_chest
failureKind          // + contest_limit
chestTable[]
rushVariant?         // ember_lane | conductor | pads | banner_ward | brood_cap
rewardPolicy         // applyRewards only
```

---

## 9. Out of scope

- Implementing any of the above in `WorldExploration.tsx`, `mapGen.ts`, or AI.
- New damage formulas, new CharacterStats fields, new persist writers.
- Name-based targeting or “if they are called Lieutenant” logic.
- Shipping admin tools to configure these rooms for normal players.
- Rewriting or renumbering 2026-08-31 IDs.
- Enabling `usableByEnemy` on barrier / mirror / timestep / rallying-cry without the AI honesty work in `docs/ENEMY_AI_EVOLUTION.md`.

---

## 10. Pick order (day-2, after day-1 verbs exist)

Day-1 pick order still wins if nothing from 2026-08-31 is live: ENC-TEACH-01 + ENC-HAZ-01 → ENC-WAVE-01 → ENC-REST-01 / ENC-BRANCH-01.

Once those exist, implementers should pick:

1. ENC-TEACH-02 + ENC-SPELL-03 (void / swap verbs)  
2. ENC-WAVE-03 (family waves + `formationId`)  
3. ENC-HOLD-01 or ENC-SURV-03 (new pressure objects)  
4. ENC-BRANCH-02 (`branch: void` snapshot-before-cleanup)  
5. ENC-BOSS-02 branch read  
6. Rush variants 04–08 one room at a time  

Uniqueness: this file is the **second** dated catalog. Later designers add `ENCOUNTER_EVOLUTION_YYYY-MM-DD.md` or append IDs. Do not silently rewrite these sheets.
