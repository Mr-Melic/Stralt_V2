# Encounter Evolution Catalog — 2026-08-31

Status: **PROPOSED** (design only). Do not implement production code from this file unless a later human or orchestrator explicitly picks an `ENCOUNTER_ID`.

Author: Dungeon and Encounter Evolution Designer (cron automation).  
Grounding: live Stralt systems as of `main` @ `22503b5` — chess-piece enemies, `engine/enemyAI.ts` archetypes, `buildEnemyKit(pieceType, levelZone)`, map modifiers, lava/ice/spikes/void hazards, rest-map exits (`normal` / `dungeon` / `boss`), dungeon-chain depth 0–5 Doka multipliers, 19-boss catalogue, 10-room Boss Rush, optional `ChallengeCondition` overlay, atomic `applyRewards` funnel.

---

## 1. Why this exists

Unbounded player progression (level, spell upgrades, summons, RES/SP) makes “higher enemy level” a dead lever. After a few bands the fight is the same shape with bigger numbers. These proposals keep rooms interesting by changing **the question the player must answer**, not the size of the answer.

Scaling never uses enemy level as the only lever. Preferred order:

1. Composition (archetype mix, count, roles)
2. Variants (elite tags, promoted pieces, kit swaps)
3. AI sophistication (`ENEMY_AI_TIER_GATES`, lethal lookahead, backline guard, LoS reposition)
4. Spell pools (`buildEnemyKit` zone + explicit extra ids from `SPELL_ID_CATALOG`)
5. Hazards and map modifiers (`lava` / `ice` / `spikes` / void; `thorned_ground`, `fog_of_war`, `void_rift`, …)
6. Objectives and failure clocks
7. Optional challenge overlay (`no_healing`, `under_N_turns`, `no_damage_taken`, `direct_hit`, `under_8_ap_per_turn`)

Relative difficulty is a **band versus current player power**, not an absolute level. Bands: `TEACH` / `LOW` / `MID` / `HIGH` / `PEAK`.

---

## 2. Live constraints every proposal respects

- Maps must stay solvable: walk-reachable player spawn, hostiles, and at least one exit; never spawn on an unlocked portal (`engine/mapGen.ts` finalize / solvability tests).
- Portals stay locked while hostiles remain. Wave / reinforcement rooms must either keep a living hostile until the last wave or use an explicit “hold the portal locked” flag — do not invent name-based heuristics.
- Rewards go through `applyRewards` only. Death still costs 20% XP / 40% Doka via `saveBattleStats`. Dungeon depth multipliers already exist (`getDungeonMultiplier`, cap depth 5).
- Spell targeting and encounter rules use **explicit metadata** (`encounterType`, `objectiveKind`, `failureKind`, kit ids). Never infer from enemy display names.
- Do not touch RAF loop, map-generation algorithms, turn logic, or damage math when a later implementer picks an ID. New rooms compose existing tiles, kits, archetypes, and boss abilities.
- Rest maps already expose three exits: overworld (`normal`), dungeon-chain (`dungeon`), Boss Rush (`boss`). Branching and rest choices should reuse that portal vocabulary.
- Optional challenges stay optional. Failure of a challenge must not fail the room unless `FAILURE_CONDITION` says so.
- CharacterStats stay the 12-field persisted set. No new wp/wr/scp.

---

## 3. Dungeon pacing template

A standard dungeon-chain (maxDepth 4 or 5) should read as:

```
teach mechanic
  → reinforce
  → combine
  → pressure
  → choice / rest
  → mastery
  → boss
```

| Beat | Depth hint | Job | Typical IDs |
| :--- | :--- | :--- | :--- |
| Teach | 1 | One new verb, generous space, low fail cost | ENC-TEACH-01, ENC-HAZ-01, ENC-SPELL-01 |
| Reinforce | 1–2 | Same verb, slightly tighter or a second caster | ENC-WAVE-01, ENC-AMBUSH-01 |
| Combine | 2–3 | Two taught verbs at once | ENC-REINF-01, ENC-PRIO-01, ENC-HAZ-02 |
| Pressure | 3 | Clock, escort, or shrinking board | ENC-SURV-01, ENC-PROT-01, ENC-MOVE-01 |
| Choice / rest | mid | Heal vs risk vs branch; white / rest-exit language | ENC-REST-01, ENC-BRANCH-01, ENC-TREAS-01 |
| Mastery | 4 | Player must prove they learned the verbs | ENC-ELITE-01, ENC-RARE-01, ENC-MAST-01 |
| Boss | maxDepth | Capstone using the taught verbs + one boss kit | ENC-MINI-01, ENC-BOSS-01, ENC-RUSH-* |

Rare elite and treasure rooms **insert**, they do not replace the beat. A rest choice may skip pressure at the cost of a weaker mastery reward.

---

## 4. Encounter catalog

Every entry is `STATUS: PROPOSED`.

---

### ENC-TEACH-01

ENCOUNTER_ID: ENC-TEACH-01  
TYPE: spell-discovery / teach mechanic  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 2× bishop (caster, `starter-frost` only), 1× pawn (charger, `physical_attack`). No elites.  
AI_REQUIREMENTS: Casters keep distance and spend up to `AI_LOS_REPOSITION_STEP_BUDGET` for frost LoS. Chargers commit only when they can reach this turn. No group-tactics, no lethal lookahead.  
SPELL_DISCOVERY_OPPORTUNITIES: First time the player is hit by `starter-frost`, offer a one-battle “borrow” of `starter-frost` if it is not on the bar (explicit flag `discoverSpellId: starter-frost`). Pickup is a ground glyph, not a name check.  
MAP_REQUIREMENTS: Open field or light corridor; 0–2 ice tiles as a visual hint, not a maze. Player spawn opposite the bishops. One locked exit. Solvable flood-fill.  
SPECIAL_RULES: Enemies never use `spell-inferno`. Ice tiles do not stack with Frozen Terrain this room. Discovery glyph despawns if unused when the last enemy dies (player still wins).  
OBJECTIVE: Defeat all hostiles. Optional: pick up the frost glyph before the last kill.  
FAILURE_CONDITION: Player HP ≤ 0 (Death Realm). Challenge overlay does not fail the room.  
REWARD: Standard victory XP (`level * 20` sum) + depth Doka. Optional discovery: grant `starter-frost` to the spellbook (not an auto-bar insert). Easy challenge `under_15_turns` is a natural overlay.  
TACTICAL_PURPOSE: Teach “casters want LoS and range; frost is a kiting tool; pawns punish standing still.”  
SOLVABILITY_REQUIREMENTS: Both bishops and the pawn start on reachable floor. Glyph tile is floor, not a portal, not a wall. Exit remains reachable after any ice placement.  
REPLAYABILITY: Glyph is skipped if the player already owns frost; room then plays as a short caster-and-pawn drill with a different spawn seed.  
SCALING_BEHAVIOUR: Do not raise levels. At mid band, add one ice tile and give bishops `starter-poison` (zone ≥ 1 kit). At high band, swap the pawn for a flanker knight — still no extra HP inflation.  
STATUS: PROPOSED

---

### ENC-WAVE-01

ENCOUNTER_ID: ENC-WAVE-01  
TYPE: waves  
RELATIVE_DIFFICULTY: LOW  
ENEMY_COMPOSITION: Wave 1: 3× pawn (charger). Wave 2: 2× pawn + 1× bishop (caster, `starter-frost`). Wave 3: 1× rook (generic tank, `physical_attack`) + 1× pawn. Never more than 4 living hostiles.  
AI_REQUIREMENTS: Wave 1 chargers are greedy nearest-target. Wave 2 bishop kites. Wave 3 rook body-blocks the exit corridor (`AI_BACKLINE_PROTECT` off — it camps the choke via `chokepointCamp` gate only if AI tier ≥ 3).  
SPELL_DISCOVERY_OPPORTUNITIES: None required. Optional overlay: a dead bishop drops a `starter-frost` glyph if ENC-TEACH-01 was skipped this chain.  
MAP_REQUIREMENTS: One choke (2-tile corridor) between spawn side and a backline alcove. Wave-entry tiles marked in metadata (`waveSpawnCells`). Exit behind the alcove.  
SPECIAL_RULES: Portal stays locked until wave 3 is clear. Next wave spawns at the start of the enemy phase after the previous wave is dead, on `waveSpawnCells` only (must be free floor). If a cell is occupied, spill to the nearest free reachable floor.  
OBJECTIVE: Survive and clear all three waves.  
FAILURE_CONDITION: Player HP ≤ 0. Soft fail: if a wave cannot place any unit (board full), skip that wave and log it — never soft-lock the portal.  
REWARD: Victory XP counts all three waves’ defeated levels. Depth Doka. Optional hard challenge `under_10_turns` is tight on purpose.  
TACTICAL_PURPOSE: Teach cadence — spend resources on wave 1, conserve for the caster, then break the choke.  
SOLVABILITY_REQUIREMENTS: `waveSpawnCells` ⊆ reachable floor. Choke must not isolate the player from the exit after walls finalize. Cap living hostiles so `ENEMY_SUMMON_CAP` logic is not starved later.  
REPLAYABILITY: Wave 2 caster piece rotates bishop / queen (frost only) by seed. Choke side flips.  
SCALING_BEHAVIOUR: Mid: wave 2 gains `starter-poison`. High: wave 3 rook learns `spell-iron-skin` (zone ≥ 1). Peak: add a 2-pawn “echo” wave only if the player’s kill time on wave 1 was under 2 turns (skill-scaled, not level-scaled).  
STATUS: PROPOSED

---

### ENC-WAVE-02

ENCOUNTER_ID: ENC-WAVE-02  
TYPE: waves / reinforce  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: Wave 1: 1× flanker knight + 2× pawn. Wave 2: 1× healer bishop (`starter-heal`) + 1× caster bishop (`starter-frost`). Wave 3: 1× summoner king (`spell-rallying-cry` if zone ≥ 1, else frost) + 1 leftover pawn.  
AI_REQUIREMENTS: Knight uses flanker pathing (side/rear, avoid tackle). Healer prioritizes the most-wounded ally below `ENEMY_HEAL_ALLY_THRESHOLD_PCT`. King is a backline buffer, not a berserker.  
SPELL_DISCOVERY_OPPORTUNITIES: Killing the healer while it has an active `starter-heal` cast queued can drop `starter-heal` if missing.  
MAP_REQUIREMENTS: Two-lane map (split by a wall spine with one cross-cut). Waves enter from the far lane.  
SPECIAL_RULES: If the healer from wave 2 is still alive when wave 3 starts, the king immediately tries Rallying Cry. Portal locked until all waves done.  
OBJECTIVE: Clear all waves.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + small bonus Doka if the healer dies before wave 3 (priority skill, not a secret). Credit through `applyRewards`.  
TACTICAL_PURPOSE: Reinforce waves while teaching “healers change the clock; split lanes punish single-target tunnel vision.”  
SOLVABILITY_REQUIREMENTS: Both lanes reachable from spawn via the cross-cut. Wave cells in the far lane remain reachable if the spine is intact.  
REPLAYABILITY: Spine orientation H/V by seed. Healer can be a wisp-summoner variant at high band instead of a bishop.  
SCALING_BEHAVIOUR: Add poison to the frost bishop, not HP. At peak, king kit uses inferno (zone ≥ 2) but summon cap stays 2.  
STATUS: PROPOSED

---

### ENC-SURV-01

ENCOUNTER_ID: ENC-SURV-01  
TYPE: survival  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Rotating pressure, never a wipe roster. Start: 2× pawn + 1× bishop. Every 3 enemy-team turns, spawn 1 reinforcement from a pool {pawn charger, knight flanker, bomber-summoner pawn} until the timer ends. Max 4 living.  
AI_REQUIREMENTS: Group tactics if tier ≥ 4. Casters hold LoS. Bomber-summoner respects `ENEMY_SUMMON_CAP` and `ENEMY_SUMMON_COOLDOWN_TURNS`.  
SPELL_DISCOVERY_OPPORTUNITIES: Surviving 8 turns without a heal can reveal `spell-iron-skin` on a pedestal that unlocks only after the timer (risk: standing still).  
MAP_REQUIREMENTS: Arena with a safe ring of 4 tiles (no hazards) and a hazardous outer ring (spikes or thorned_ground). Exit locked until the survive clock completes **and** living hostiles are dead or flee.  
SPECIAL_RULES: Clock is `surviveTurns: 10` player-turns (`challengeTurnCountRef` style, explicit). When the clock hits 0, remaining trash attempts to retreat to their spawn edge; if they leave the board they despawn (do not count as player kills). Portal then unlocks only after the board is empty.  
OBJECTIVE: Be alive after 10 player turns, then clear or let remnants flee.  
FAILURE_CONDITION: Player death before the clock and cleanup. Leaving through a debug portal is not allowed for normal players.  
REWARD: Survival grant (fixed band table, e.g. depth × 40 Doka + 80 XP) plus kill XP only for units actually defeated. Optional legendary overlay `no_damage_taken` is a brag, not required.  
TACTICAL_PURPOSE: Pressure beat — positioning and resource conservation under a clock, not a DPS check.  
SOLVABILITY_REQUIREMENTS: Safe ring reachable; outer hazards never wall off the ring; flee-edge tiles exist and are reachable from the arena.  
REPLAYABILITY: Hazard type rotates lava / spikes / ice. Clock stays 10; density changes, not duration.  
SCALING_BEHAVIOUR: Mid uses only pawns in the pool. High unlocks the flanker. Peak unlocks the bomber-summoner. Never shorten the clock below 8 (that becomes a different encounter).  
STATUS: PROPOSED

---

### ENC-ELITE-01

ENCOUNTER_ID: ENC-ELITE-01  
TYPE: elite  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 1× elite rook (`variant: elite`, kit `physical_attack` + `spell-iron-skin` + `spell-enrage` at high band) + 2× pawn escorts that try to body-block. Elite is not a boss: no phase table, no `BossAbility`.  
AI_REQUIREMENTS: Elite is a charger that **never retreats** (berserker flag). Escorts are guardians: `AI_BACKLINE_PROTECT_ENABLED`, `AI_BACKLINE_GUARD_DISTANCE = 1`, they interpose between the player and the rook. Overkill spill on if the elite can cleave a summon.  
SPELL_DISCOVERY_OPPORTUNITIES: Elite death can drop `spell-iron-skin` (once per character, explicit unlock table).  
MAP_REQUIREMENTS: Tight chamber (smaller usable floor, still `WORLD_GRID_SIZE` outer walls). One pillar for LoS breaks. No random extra hazards — the elite *is* the hazard.  
SPECIAL_RULES: Elite has a `resilience` presentation only (no new persisted stat). Escort pawns flee if the elite dies (optional cleanup). Do not inflate elite HP beyond the band’s rook baseline + one iron-skin cycle.  
OBJECTIVE: Defeat the elite. Escorts are optional kills.  
FAILURE_CONDITION: Player death.  
REWARD: Elite multiplier 2× victory XP for the rook only + depth Doka. Iron-skin unlock if flagged. Hard challenge `under_8_ap_per_turn` teaches discipline against a berserker.  
TACTICAL_PURPOSE: Mastery of focus fire vs body-block; enrage punishes slow fights without needing more HP.  
SOLVABILITY_REQUIREMENTS: Pillar must not isolate the elite. Escorts spawn adjacent to the elite, all reachable.  
REPLAYABILITY: Elite piece rotates rook / knight (knight uses jump-adjacent pressure, still not `KNIGHT_JUMP_IGNORE_WALLS` unless later tagged).  
SCALING_BEHAVIOUR: Add `spell-enrage` then `spell-expose` on the elite. Escorts become flankers before any HP bump.  
STATUS: PROPOSED

---

### ENC-AMBUSH-01

ENCOUNTER_ID: ENC-AMBUSH-01  
TYPE: ambush  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: Visible bait: 1× wounded-looking pawn (charger). Hidden until trigger: 2× flanker knights + 1× caster bishop behind fog / off-spawn cells.  
AI_REQUIREMENTS: Bait pawn plays cowardly (retreats at 50% HP, not 30%). Ambushers use flanker + LoS reposition and try to occupy the player’s retreat tiles.  
SPELL_DISCOVERY_OPPORTUNITIES: Surviving the ambush without using `spell-timestep` can later offer timestep as a rest-shop hint; no forced grant.  
MAP_REQUIREMENTS: Fog of War modifier **or** a wall hook that hides `ambushCells` from the opening camera. Trigger: player crosses a marked midline **or** the bait drops below 50% HP.  
SPECIAL_RULES: Ambush units do not exist in the combatant store until the trigger (portal still locked because bait is alive). After trigger, they spawn on `ambushCells`. If those cells are occupied, spill. Intent log: explicit “Ambush!” — not inferred from names.  
OBJECTIVE: Defeat bait + ambushers.  
FAILURE_CONDITION: Player death. Soft: if the player kills the bait with a single overkill hit before crossing the midline, ambush still fires (no cheese).  
REWARD: Standard. Bonus Doka if no player summon died (escorts matter).  
TACTICAL_PURPOSE: Punish greedy tunnel vision; teach scouting and retreat tiles.  
SOLVABILITY_REQUIREMENTS: `ambushCells` reachable after spawn; midline does not sit on the exit; bait cannot spawn on the portal.  
REPLAYABILITY: Trigger side (left/right hook) by seed. Bishop kit frost vs poison.  
SCALING_BEHAVIOUR: High: one ambusher is a summoner. Peak: fog_of_war + ice tiles on retreat paths. No level bump required.  
STATUS: PROPOSED

---

### ENC-REINF-01

ENCOUNTER_ID: ENC-REINF-01  
TYPE: reinforcements / priority-target  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× king (horn-bearer, `spell-rallying-cry` / frost) + 2× pawn. Reinforcements: 1× pawn every time the king successfully rallies, cap 2 extra.  
AI_REQUIREMENTS: King stays backline and spends AP on Rallying Cry when any ally is below 50% or when a pawn died last turn. Pawns are chargers. If the king is marked/exposed, escorts peel toward the player.  
SPELL_DISCOVERY_OPPORTUNITIES: Killing the king first can drop `spell-rallying-cry`.  
MAP_REQUIREMENTS: Backline balcony or alcove with one stair-choke. Reinforcement cells adjacent to the king.  
SPECIAL_RULES: Rally is the only reinforcement trigger (explicit). If the king dies, the horn stops — remaining pawns do not call more. Portal locked until the board is empty.  
OBJECTIVE: Defeat all. Implicit priority: the king.  
FAILURE_CONDITION: Player death. Soft-lock guard: if living hostiles + pending reinforcements would exceed 6, skip further rallies.  
REWARD: Standard + priority bonus if the king dies before the second rally.  
TACTICAL_PURPOSE: Combine “kill the support first” with a visible spawn rule.  
SOLVABILITY_REQUIREMENTS: Alcove reachable; king cannot be permanently LoS-blocked from the player (at least one frost/rally line).  
REPLAYABILITY: King balcony north vs south. Rally cooldown 1 vs 2 turns by band.  
SCALING_BEHAVIOUR: Mid: rally every other turn. High: king also has `starter-heal`. Peak: one reinforcement is a knight, still capped.  
STATUS: PROPOSED

---

### ENC-PROT-01

ENCOUNTER_ID: ENC-PROT-01  
TYPE: protection objective  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 3× charger pawn + 1× caster bishop focusing the ward. No elite.  
AI_REQUIREMENTS: All enemies prefer the **ward** as target (`wThreat` override via explicit `protectTargetId`). Lethal lookahead against the ward is on. Player summons are secondary. Enemies do not retreat from the ward.  
SPELL_DISCOVERY_OPPORTUNITIES: If the player uses `summon-wisp` to body-block and the ward survives, rest maps may offer `summon-sentinel` as the next discovery.  
MAP_REQUIREMENTS: Escort lane, 8–10 tiles long. Ward is a non-player allied token (`side: player`, `isWard: true`, low HP, 0 AP, 1 MP). Player spawns beside the ward. Enemies spawn at the far end and a side alley.  
SPECIAL_RULES: Ward is not a summon (does not expire, does not count against summon cap). Ward can be healed by `starter-heal` / wisp. Enemies winning melee vs the ward use the same damage path as player-hit (RES applies). Portal unlocks only if the ward is alive and hostiles are dead.  
OBJECTIVE: Ward reaches the banner tile at the far end **or** all hostiles die while the ward is alive (two legal wins).  
FAILURE_CONDITION: Ward HP ≤ 0 **or** player death.  
REWARD: Protection grant (band table) + kill XP. Failed ward = no room reward, death penalty only if the player also died.  
TACTICAL_PURPOSE: Pressure beat that makes Barrier, Swap, and guardian summons matter more than raw DPS.  
SOLVABILITY_REQUIREMENTS: Banner tile reachable for the ward (ward uses player-walk rules, 1 MP). Side alley does not let enemies spawn on the ward. Hazards (if any) must be avoidable by a 1-MP walker or the ward is hazard-immune (pick one, explicit).  
REPLAYABILITY: Banner at opposite edge by seed. Caster can be a slow-bot (`spell-slow`) at high band.  
SCALING_BEHAVIOUR: Add a second alley flanker before raising enemy ATK. Peak: one lava tile the player can Barrier-bridge for the ward.  
STATUS: PROPOSED

---

### ENC-PRIO-01

ENCOUNTER_ID: ENC-PRIO-01  
TYPE: priority-target  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× chanter queen (caster, `starter-frost` / `spell-slow`) + 2× rook escorts (`spell-iron-skin` at zone ≥ 1) + 1× pawn.  
AI_REQUIREMENTS: Rooks guard the queen (backline protect). Queen kites and slows the closest threat. If the queen dies, rooks become berserkers (explicit `onAllyDeath: berserk`).  
SPELL_DISCOVERY_OPPORTUNITIES: Queen drop `spell-slow` or `spell-expose`.  
MAP_REQUIREMENTS: Cross-shaped room; queen starts on the far arm. Pillars give the player a Mark / LoS puzzle.  
SPECIAL_RULES: While the queen lives, escorts take 30% less damage **from the first hit each turn** (iron-skin cadence — implement as their existing buff, not a new stat). No HP inflation.  
OBJECTIVE: Defeat all. The intended line is queen first.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + “silence the choir” Doka if queen dies before either rook.  
TACTICAL_PURPOSE: Combine target priority with a berserk consequence so the player must finish, not just pick off the caster and linger.  
SOLVABILITY_REQUIREMENTS: All four arms reachable. Queen not trapped in void.  
REPLAYABILITY: Queen kit frost-slow vs poison-weaken.  
SCALING_BEHAVIOUR: High: queen gains `spell-frost-nova` if that id is in the player-facing catalog and enemy-usable. Peak: one escort is a summoner.  
STATUS: PROPOSED

---

### ENC-MOVE-01

ENCOUNTER_ID: ENC-MOVE-01  
TYPE: movement objective / hazard  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 2× kiting bishops on the far bank (`starter-frost`). 0 melee on the starting bank.  
AI_REQUIREMENTS: Bishops hold the far bank and punish standing on the vein. They do not cross lava unless the player is on their bank.  
SPELL_DISCOVERY_OPPORTUNITIES: Crossing without taking lava damage can unlock `spell-haste` or `spell-swap` (pick one per character).  
MAP_REQUIREMENTS: Horizontal lava vein (3-tile-wide hazard band) with 2 safe stepping stones. Stones are floor; vein is lava. Exit on the far bank, locked until the player has stood on the far-bank **objective tile** and hostiles are dead.  
SPECIAL_RULES: Player must occupy `objectiveCell` at least once (flag `touchedObjective`). Stones can be Barrier-extended. Ice is not used here (lava only). Enemy AI already avoids lava when wounded; bishops start healthy so they may stand near edges.  
OBJECTIVE: Touch the far-bank tile and clear the bishops.  
FAILURE_CONDITION: Player death (lava + frost). Standing on lava uses existing hazard debit + `recordInBattleChallengeDamage` while `inBattleRef`.  
REWARD: Standard + discovery. Easy overlay `under_50_damage` rewards clean footing.  
TACTICAL_PURPOSE: Teach MP budgeting, Barrier, Swap, and “don’t tank lava.”  
SOLVABILITY_REQUIREMENTS: At least one lava-free path using stones + adjacent floor; finalize must not relocate stones onto walls. Bishops reachable by frost range from a stone (so the player is never forced into a dead kite).  
REPLAYABILITY: Vein vertical vs horizontal. Stone count 2 or 3.  
SCALING_BEHAVIOUR: Add a third bishop or poison, not thicker lava. Peak: one stone becomes a spike tile (choice of pain).  
STATUS: PROPOSED

---

### ENC-HAZ-01

ENCOUNTER_ID: ENC-HAZ-01  
TYPE: hazard / teach  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 2× pawn that path around ice.  
AI_REQUIREMENTS: Hazard avoidance at `ENEMY_HAZARD_AVOID_HP_PCT` (they start full, so they may step ice once). Generic archetype.  
SPELL_DISCOVERY_OPPORTUNITIES: None. This is a terrain lesson.  
MAP_REQUIREMENTS: Ice field (3–6 ice tiles) plus optional Frozen Terrain modifier (MP ×2) **off** for the teach version. Exit opposite spawn.  
SPECIAL_RULES: First ice step logs a teach line. No spikes/lava mixed in.  
OBJECTIVE: Defeat both pawns.  
FAILURE_CONDITION: Player death (unlikely; still the fail).  
REWARD: Low band victory.  
TACTICAL_PURPOSE: Show that ice is a tax, not decoration; later rooms will combine it.  
SOLVABILITY_REQUIREMENTS: Ice never forms a wall; pawns reachable; existing 15% random-hazard seeder should be **disabled** for scripted teach rooms (explicit `scriptedHazardsOnly`).  
REPLAYABILITY: Ice pattern by seed.  
SCALING_BEHAVIOUR: If reused at mid, turn Frozen Terrain on instead of adding enemies.  
STATUS: PROPOSED

---

### ENC-HAZ-02

ENCOUNTER_ID: ENC-HAZ-02  
TYPE: hazard / combine  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× bomber-leaning pawn (or enemy that can cast `spell-inferno` at high band) + 2× chargers + 1× bishop.  
AI_REQUIREMENTS: Bomber waits for `AI_KAMIKAZE_MIN_TARGETS` if a summoner-bomber is used; otherwise inferno bishop wants clusters. Chargers push the player onto thorns.  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-barrier` if the player used none and still won (reward discipline).  
MAP_REQUIREMENTS: Thorned Ground (`MAP_MODIFIER_THORN_DAMAGE_PER_TILE`) plus 2–4 spike tiles in the cross.  
SPECIAL_RULES: Scripted hazards only. Inferno / bomber detonation should not be able to hit through walls.  
OBJECTIVE: Clear all.  
FAILURE_CONDITION: Player death (thorns + spikes + blast).  
REWARD: Standard. Hard overlay `no_healing_under_30_damage`.  
TACTICAL_PURPOSE: Combine clustering-punish with thorn tax; Barrier and spread positioning are the answers.  
SOLVABILITY_REQUIREMENTS: A thorn-free lane of at least 2 tiles exists from spawn to a bishop-range tile.  
REPLAYABILITY: Cross vs plus-shaped thorn pattern.  
SCALING_BEHAVIOUR: Unlock inferno on the bishop before adding a second bomber.  
STATUS: PROPOSED

---

### ENC-RARE-01

ENCOUNTER_ID: ENC-RARE-01  
TYPE: rare elite room  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: 1× rare elite knight (`variant: rare_elite`) with a **subset** of Bone Cavalier fantasy — uses `physical_attack` + `spell-haste` + `spell-shadow-veil`. No `BossAbility.KNIGHT_JUMP_IGNORE_WALLS` unless a later implementer adds an explicit elite tag (do not steal the full boss). 1× wisp-like enemy healer (bishop heal kit).  
AI_REQUIREMENTS: Elite flanker with haste: lethal lookahead on, prefers isolated player (no summon). Healer backs the elite.  
SPELL_DISCOVERY_OPPORTUNITIES: Guaranteed one rare drop from {`spell-haste`, `spell-shadow-veil`, `spell-mirror`} not yet owned.  
MAP_REQUIREMENTS: Chapel archetype — dark slate, central aisle, two side pews (low walls). Purple portal chrome only after clear. Insertion chance: small (e.g. 8% on mastery beats, never on teach).  
SPECIAL_RULES: Appears at most once per dungeon-chain. Death here is a normal death (full penalty). No jackpot unless paired with ENC-TREAS rules (do not pair by default).  
OBJECTIVE: Defeat the rare elite (healer optional but recommended).  
FAILURE_CONDITION: Player death.  
REWARD: Rare Doka band (≈ 2.5× depth victory) + the spell drop. Achievement-adjacent: could later feed a `leader_slayer`-style config, not required now.  
TACTICAL_PURPOSE: Optional mastery peak; a reason to stay sharp on “easy” mastery rooms.  
SOLVABILITY_REQUIREMENTS: Aisle and pews connected; elite cannot spawn inside a pew pocket.  
REPLAYABILITY: Rare kit rotates the three discovery spells. Chapel orientation by seed.  
SCALING_BEHAVIOUR: Do not add a second rare elite. Scale the healer’s kit (heal → rally) and the elite’s haste uptime.  
STATUS: PROPOSED

---

### ENC-TREAS-01

ENCOUNTER_ID: ENC-TREAS-01  
TYPE: treasure / risk  
RELATIVE_DIFFICULTY: HIGH (opt-in)  
ENEMY_COMPOSITION: Empty on entry. After the player touches the vault glyph: 2× rook + 1× caster queen **or** the player can leave via a second “coward” portal that is unlocked immediately.  
AI_REQUIREMENTS: Standard high-band kits. Queen may use inferno at zone ≥ 2.  
SPELL_DISCOVERY_OPPORTUNITIES: Vault glyph always shows the **risk reward** before combat: Doka pot + one unknown spell id from a risk table (`spell-sacrifice`, `spell-lifesteal-nova`, `summon-bomber`).  
MAP_REQUIREMENTS: Two portals from the first frame: gold vault tile (center) and white coward exit (near spawn). Combat portal (progress) stays locked until either coward-leave or the vault fight is won.  
SPECIAL_RULES: Choosing the vault locks the coward exit. Losing the vault fight is a normal death. Coward leave grants **no** vault loot and does not count as room failure for the chain (chain may continue at a weaker mastery multiplier). Jackpot-style numbers stay inside `applyRewards` (no localStorage wallet).  
OBJECTIVE: Win the vault fight **or** take the coward exit.  
FAILURE_CONDITION: Player death after committing. Coward exit is success-with-less.  
REWARD: Commit win: high Doka (depth × jackpot-ish band, still additive Nat) + the previewed spell. Coward: 0 extra.  
TACTICAL_PURPOSE: Choice/rest beat — greed vs safety. Makes rest maps and white-portal language meaningful inside a chain.  
SOLVABILITY_REQUIREMENTS: Both portals reachable on entry. After commit, spawn the three hostiles on reachable cells not on the progress portal.  
REPLAYABILITY: Risk table spell rotates. Fight composition rook-pair vs knight-pair.  
SCALING_BEHAVIOUR: Raise the **information** (show exact enemy kits at peak) rather than HP. Mid band can show “2 rooks + queen” as text; peak shows kits.  
STATUS: PROPOSED

---

### ENC-REST-01

ENCOUNTER_ID: ENC-REST-01  
TYPE: rest choice  
RELATIVE_DIFFICULTY: none (safe)  
ENEMY_COMPOSITION: None. `isRestMap: true`.  
AI_REQUIREMENTS: None.  
SPELL_DISCOVERY_OPPORTUNITIES: A shrine pedestals up to one owned spell for a **preview** of `upgradeSpell` cost (`spellLevelingBaseCost * 2^level`, UI may still show 10× — debit must stay `spellUpgradeUiSpend` if they buy). No free upgrades.  
MAP_REQUIREMENTS: Existing rest layout: open floor, three exits — `normal` (overworld), `dungeon` (continue / enter chain), `boss` (Boss Rush). Optional fourth **risk** exit to ENC-TREAS-01 if the chain is mid-beat. Player spawn center. No hazards.  
SPECIAL_RULES: No encounters until a rest-exit is taken (`armDeathGuards` still applies if the player arrived from Death Realm). Do not start world encounters on the rest floor. `uiLayout` unchanged.  
OBJECTIVE: Choose an exit. Optional: open spellbook / shrine.  
FAILURE_CONDITION: None on this map. Leaving into a dungeon/boss room uses that room’s fail.  
REWARD: None on the rest map itself. Continuing a completed chain still uses `decideDungeonChainPortal` + white sanctuary portal rules.  
TACTICAL_PURPOSE: Choice/rest beat — heal via recap/shop flows already in the app, don’t invent a second heal writer.  
SOLVABILITY_REQUIREMENTS: All rest-exits reachable (already tested). New risk exit must pass the same punch-roster / portal reachability rules.  
REPLAYABILITY: Shrine spell offered rotates among under-leveled bar spells.  
SCALING_BEHAVIOUR: Rest does not scale. The **exits** offered can: after depth 3, hide `normal` until the player confirms abandon (prevents accidental chain drop).  
STATUS: PROPOSED

---

### ENC-BRANCH-01

ENCOUNTER_ID: ENC-BRANCH-01  
TYPE: branching paths  
RELATIVE_DIFFICULTY: LOW (the choice is the content)  
ENEMY_COMPOSITION: None on the branch foyer. Each door leads to a **scripted next** encounter.  
AI_REQUIREMENTS: None in-foyer.  
SPELL_DISCOVERY_OPPORTUNITIES: Door inscriptions preview the taught verb and one spell id the next room may drop.  
MAP_REQUIREMENTS: Foyer with two locked-until-step portals: Ash (`ENC-HAZ-02` or lava MOVE) and Ice (`ENC-HAZ-01` upgraded / frost casters). A third sealed door to ENC-RARE-01 opens only if the player already cleared both branches this **account** (long-term, not this run).  
SPECIAL_RULES: Taking Ash marks `branch: ash` on the dungeon snapshot (must be snapshotted **before** `cleanupMap`, same rule as `snapshotDungeonChain`). The other door is gone for this chain. Mastery/boss later reads the flag to pick ENC-BOSS-01 variant.  
OBJECTIVE: Pick a door.  
FAILURE_CONDITION: None in-foyer.  
REWARD: None. The chosen room pays.  
TACTICAL_PURPOSE: Make dungeon memory: the capstone uses lava-trail vs frost-control depending on the door.  
SOLVABILITY_REQUIREMENTS: Both doors reachable; neither sits on spawn.  
REPLAYABILITY: Door positions swap. A third “fog” door can appear at peak account level as ENC-AMBUSH-01.  
SCALING_BEHAVIOUR: Branches do not get harder; **destinations** scale with band.  
STATUS: PROPOSED

---

### ENC-MINI-01

ENCOUNTER_ID: ENC-MINI-01  
TYPE: mini-boss  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Weeping Lieutenant — pawn piece, kit from Weeping Pawn **lite**: `starter-heal` + `physical_attack` + `spell-cursed-wound`. 2× pawn choir. Not in `BOSS_IDS`. No phase-2 table.  
AI_REQUIREMENTS: Lieutenant heals self or choir at 50%. Choir chargers. If lieutenant would die, it tries one cursed-wound on the player (priority).  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-cursed-wound` drop (once).  
MAP_REQUIREMENTS: Small nave, two choir stalls. No lava (save that for Crimson / Countess).  
SPECIAL_RULES: At 30% HP the lieutenant gains a **single** `REFLECT_SHIELD`-like cycle only if the dungeon taught reflect/mirror this chain (ENC-SPELL-02). Otherwise it only heals. This keeps the mini-boss honest to pacing.  
OBJECTIVE: Defeat the lieutenant (choir optional if they flee on his death — pick flee).  
FAILURE_CONDITION: Player death.  
REWARD: Mini-boss XP multiplier 2× on the lieutenant + depth Doka. Not a Boss Rush room.  
TACTICAL_PURPOSE: Capstone-adjacent: healing priority + optional reflect, without a full boss state machine.  
SOLVABILITY_REQUIREMENTS: Stalls connected to the nave.  
REPLAYABILITY: Choir can be bishops (frost) if the ice branch was taken.  
SCALING_BEHAVIOUR: Add cursed-wound duration via existing DoT stacks, not HP. Peak: one choir pawn is a summoner wisp-enemy.  
STATUS: PROPOSED

---

### ENC-BOSS-01

ENCOUNTER_ID: ENC-BOSS-01  
TYPE: dungeon capstone boss  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: One real `BossId` chosen by branch flag: Ash → `crimson_countess` (lava trail), Ice → `pale_archbishop` (curse / reflect / minions), Fog → `void_grandmaster` (illusions). No dual-boss unless this is a Rush injection.  
AI_REQUIREMENTS: Existing `useBossAI` / `useBossSystem` for that id. Adds **one** pack of 2 trash only in phase 1 if the chain taught waves (ENC-WAVE-*).  
SPELL_DISCOVERY_OPPORTUNITIES: None new; boss kits already use catalog spells. Optional challenge uses existing Boss Guide copy.  
MAP_REQUIREMENTS: Existing boss map color / portal color from `DEFAULT_BOSS_CONFIGS`. Must remain solvable; hazard tiles from the boss ability stay capped at 50.  
SPECIAL_RULES: Depth must be maxDepth. `decideDungeonChainPortal` complete + white portal after win. Do not write rewards via `updateCharacter`.  
OBJECTIVE: Defeat the boss.  
FAILURE_CONDITION: Player death (Death Realm, chain reset via `resetRunState`).  
REWARD: Boss Doka/XP multipliers already on the config, then dungeon completion bonus `maxDepth * 50`. Recap at app root.  
TACTICAL_PURPOSE: Mastery exam: the taught verb is the boss’s main ability.  
SOLVABILITY_REQUIREMENTS: Same as current boss rooms (preferred cells reachable).  
REPLAYABILITY: Three capstones from one foyer.  
SCALING_BEHAVIOUR: Use existing phase 2 (`statMultiplier`, extra spell ids, abilities). Do not add a third phase. Trash pack size is the only dungeon-specific scaler.  
STATUS: PROPOSED

---

### ENC-SPELL-01

ENCOUNTER_ID: ENC-SPELL-01  
TYPE: spell-discovery  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 1× “archivist pawn” that only casts `starter-frost` and tries to stand on a glyph tile. 1× dummy pawn.  
AI_REQUIREMENTS: Archivist camps the glyph (chokepointCamp). Dummy is generic.  
SPELL_DISCOVERY_OPPORTUNITIES: Primary: `starter-frost` or the first missing starter from {frost, poison, shield, heal}. Glyph is metadata `discoverSpellId`.  
MAP_REQUIREMENTS: Single room, central glyph, two pillars.  
SPECIAL_RULES: If the player already owns every starter, convert to ENC-SPELL-02. Discovery does not auto-upgrade (`upgradeSpell` remains the only level writer).  
OBJECTIVE: Defeat hostiles; stepping the glyph is optional but intended.  
FAILURE_CONDITION: Player death.  
REWARD: The spell id into the owned set + tiny Doka. Bar insert is the player’s choice (max 8).  
TACTICAL_PURPOSE: Teach that spells are found, not only bought.  
SOLVABILITY_REQUIREMENTS: Glyph is free floor, not a portal.  
REPLAYABILITY: Which starter is missing drives the room.  
SCALING_BEHAVIOUR: Does not scale; it retires when the player’s starter set is complete.  
STATUS: PROPOSED

---

### ENC-SPELL-02

ENCOUNTER_ID: ENC-SPELL-02  
TYPE: spell-discovery / teach mechanic  
RELATIVE_DIFFICULTY: LOW  
ENEMY_COMPOSITION: 1× bishop that casts a single **telegraphed** `starter-blast` (chain lightning) if the player stands in a 2-bounce line; otherwise frost. 1× pawn.  
AI_REQUIREMENTS: Bishop prefers a line that would bounce pawn → player (teaching spacing).  
SPELL_DISCOVERY_OPPORTUNITIES: `starter-blast` and/or `spell-mirror`. Mirror is offered if the player ate a bounce.  
MAP_REQUIREMENTS: Straight aisle (linear LoS). No extra modifiers.  
SPECIAL_RULES: First blast is damage-reduced by a teach flag (explicit `telegraphMultiplier: 0.5`), then full.  
OBJECTIVE: Clear. Optional: reflect or sidestep a blast.  
FAILURE_CONDITION: Player death.  
REWARD: Discovery + standard.  
TACTICAL_PURPOSE: Teach bounce spacing and Mirror before Alabaster / Static / Archivist.  
SOLVABILITY_REQUIREMENTS: Aisle wide enough to step off the bounce line (at least 3 walkable columns).  
REPLAYABILITY: Bounce direction N-S vs E-W.  
SCALING_BEHAVIOUR: Remove the 0.5 telegraph after the player has owned blast for a chain. Then it is a reinforce room, not a teach.  
STATUS: PROPOSED

---

### ENC-MAST-01

ENCOUNTER_ID: ENC-MAST-01  
TYPE: mastery / waves / priority / hazard  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Wave 1: 2× pawn on thorns. Wave 2: chanter bishop + rook escort. Wave 3: elite pawn (haste) + leftover.  
AI_REQUIREMENTS: Full sophistication allowed (lethal lookahead, overkill spill, LoS reposition, backline guard).  
SPELL_DISCOVERY_OPPORTUNITIES: None — this is the exam.  
MAP_REQUIREMENTS: Combines choke (WAVE-01), thorn cross (HAZ-02), and a far alcove (REINF-01). Scripted hazards only.  
SPECIAL_RULES: Portal locked until wave 3 clear. If the ice branch was taken, thorns become ice + Frozen Terrain. If ash, lava stones as in MOVE-01 (one safe path).  
OBJECTIVE: Clear all waves.  
FAILURE_CONDITION: Player death.  
REWARD: Mastery Doka band + standard XP. Legendary overlay `under_5_turns` is almost always fail — prefer `direct_hit` or `under_8_ap_per_turn`.  
TACTICAL_PURPOSE: Prove the player can sequence waves, delete the chanter, and not stand on taxes.  
SOLVABILITY_REQUIREMENTS: All three wave-cell sets reachable; one safe path exists for the branch hazard.  
REPLAYABILITY: Branch-skinned hazards. Wave 2 chanter kit follows branch (frost vs inferno).  
SCALING_BEHAVIOUR: Change wave 3 elite’s **role** (haste flanker vs iron-skin rook), not its level.  
STATUS: PROPOSED

---

### ENC-RUSH-01

ENCOUNTER_ID: ENC-RUSH-01  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 0 remix: `pale_archbishop` + `weeping_pawn` as today’s `BOSS_RUSH_ROOMS[0]`, plus **one** ENC-WAVE-01-style pawn tide in phase 1 only (cap 2).  
AI_REQUIREMENTS: Existing dual-boss combined mechanic: “Archbishop heals Pawn every 2 turns. Kill Archbishop first or Pawn resurges to 50% HP on death.” Trash uses charger AI and does not receive boss heals.  
SPELL_DISCOVERY_OPPORTUNITIES: None (Rush is a mastery product).  
MAP_REQUIREMENTS: Current Boss Rush preferred-cell solvability. Extra trash cells must be in the reachable set.  
SPECIAL_RULES: Escalation flag `rushVariant: tide`. Trash must not be healable by the Archbishop (explicit exclude list). Persist still goes through `persistBossRushRoomClear` / `completeBossRushRoom`.  
OBJECTIVE: Defeat both bosses; trash optional if they despawn on double-boss death (prefer despawn).  
FAILURE_CONDITION: Player death → abort rush (`resetRunState`).  
REWARD: Existing room 0 table (500 Doka / 200 XP) + small tide bonus only if both trash died before the Archbishop (skill, via `applyRewards`).  
TACTICAL_PURPOSE: Escalation without a new boss pair — add a taught wave verb to a known duo.  
SOLVABILITY_REQUIREMENTS: Preferred cells + tide cells reachable.  
REPLAYABILITY: Tide can be bishops if the player entered Rush from the ice rest-exit.  
SCALING_BEHAVIOUR: Later rooms escalate by **combining more taught verbs**, not by raising the 10-room Doka table. See ENC-RUSH-02/03.  
STATUS: PROPOSED

---

### ENC-RUSH-02

ENCOUNTER_ID: ENC-RUSH-02  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 3 remix: `starborn_queen` + `enthroned_void` plus a **movement** objective — player must tag 2 anchor tiles (`ANCHOR_TILES` already on Void) before phase 2 coalesces “too fast.”  
AI_REQUIREMENTS: Existing combined mechanic (void tiles feed mist). Add: Queen prefers to stand on untagged anchors.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Two extra floor anchors in preferred reachable cells.  
SPECIAL_RULES: `rushVariant: anchors`. If the player tags both anchors, Void phase 2 uses the **normal** coalesce rate. If not, coalesce uses the existing “faster based on Queen void tile count” line plus a documented extra (still existing abilities, tighter timing).  
OBJECTIVE: Defeat both bosses. Anchors are the intended line, not a second fail.  
FAILURE_CONDITION: Player death only.  
REWARD: Existing room 3 table (1250 / 500). Optional challenge `under_15_turns` is fairer than `under_5_turns`.  
TACTICAL_PURPOSE: Escalate Rush by adding a movement verb from ENC-MOVE-01 to a late pair.  
SOLVABILITY_REQUIREMENTS: Anchors reachable without standing in void if the player spends MP.  
REPLAYABILITY: Anchor pairs rotate around the center.  
SCALING_BEHAVIOUR: Do not add a third boss. Tighten tag window via void-tile count, not HP.  
STATUS: PROPOSED

---

### ENC-RUSH-03

ENCOUNTER_ID: ENC-RUSH-03  
TYPE: escalating Boss Rush variant / treasure-risk (jackpot room)  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 9 as now: `starved_vampire_pawn` + `weeping_pawn_2` (“both grow stronger as the other takes damage. JACKPOT ROOM.”). Optional coward-adjacent: a one-time **concede portal** that forfeits the jackpot but keeps prior Rush rooms’ already-persisted rewards (do not claw back).  
AI_REQUIREMENTS: Existing combined feed mechanic.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Current jackpot room + optional white concede cell that unlocks only after the player has taken damage once (prevents instant chicken).  
SPECIAL_RULES: `rushVariant: jackpot_concede`. Concede completes the rush as `complete: true` **without** room 9 Doka/XP (explicit). Death still aborts and applies death penalty. Never write jackpot through anything but `applyRewards` / `persistBossRushRoomClear`.  
OBJECTIVE: Win the pair **or** concede after first blood.  
FAILURE_CONDITION: Death. Concede is a chosen lesser success.  
REWARD: Full 5000 / 2000 on win; 0 for room 9 on concede; prior rooms kept.  
TACTICAL_PURPOSE: Give high-level players a risk room that is not “more HP.”  
SOLVABILITY_REQUIREMENTS: Concede cell reachable and not overlapping a boss preferred cell.  
REPLAYABILITY: Concede available only if the account has already beaten room 9 once (first clears must commit).  
SCALING_BEHAVIOUR: First clear: no concede. Later clears: concede + maybe ENC-RUSH-01 tide trash in the jackpot (only if the player opted into “endless rush” at the rest shrine).  
STATUS: PROPOSED

---

### ENC-SURV-02

ENCOUNTER_ID: ENC-SURV-02  
TYPE: survival / waves  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Three named waves on a clock (8 player turns). Wave A pawns, Wave B flankers + frost, Wave C one elite rook. Overlap allowed (a new wave can start while leftovers live) but hard-cap 5 living.  
AI_REQUIREMENTS: Full gates. Elite rook camps the safest (non-hazard) tile.  
SPELL_DISCOVERY_OPPORTUNITIES: Hold to the last turn without Timestep → rest shrine offers timestep reminder, not a free grant.  
MAP_REQUIREMENTS: Arena + one hazard ring (spikes). Exit after clock **and** empty board (same cleanup as ENC-SURV-01).  
SPECIAL_RULES: Overlap is the escalation vs ENC-SURV-01. Flee remnants when the clock ends.  
OBJECTIVE: Survive the clock, then clean or let flee.  
FAILURE_CONDITION: Player death.  
REWARD: Higher survival table than ENC-SURV-01.  
TACTICAL_PURPOSE: Peak pressure: overlapping waves without turning into a DPS sponge.  
SOLVABILITY_REQUIREMENTS: Same as SURV-01 plus 5-unit occupancy must still leave a walkable ring.  
REPLAYABILITY: Wave C elite rook vs elite knight.  
SCALING_BEHAVIOUR: Overlap timing (wave B at turn 3 vs 4) is the scaler.  
STATUS: PROPOSED

---

### ENC-PRIO-02

ENCOUNTER_ID: ENC-PRIO-02  
TYPE: priority-target / reinforcements  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 1× summoner king (`summon-dire-wolf` / archer kit via enemy summon pipeline) + 1× healer + 2× pawns. Summons cap 2.  
AI_REQUIREMENTS: Summoner on cooldown 2. Healer keeps the summoner up. Pawns screen. Player’s wisp is high threat (`ENEMY_THREAT_VALUES.wisp`) — they will snipe it.  
SPELL_DISCOVERY_OPPORTUNITIES: `summon-dire-wolf` or `summon-archer` if missing.  
MAP_REQUIREMENTS: Two-depth backline (summoner + healer) and a screen line.  
SPECIAL_RULES: If the summoner dies, living enemy summons despawn at end of turn (explicit). If the healer dies first, the summoner goes inferno/frost aggressive.  
OBJECTIVE: Clear. Intended order: summoner or healer first depending on whether wolves are already down.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + summon spell drop.  
TACTICAL_PURPOSE: Priority in a summon-cap world; teaches that killing the source is cleaner than racing dogs.  
SOLVABILITY_REQUIREMENTS: Backline reachable; summons spawn on free floor only.  
REPLAYABILITY: Wolf vs archer summon kit.  
SCALING_BEHAVIOUR: Healer gains rally before the summoner gains a third spell. Cap stays 2.  
STATUS: PROPOSED

---

## 5. Sample chains (composition, not code)

### Chain A — “Ash Primer” (maxDepth 5)

| Depth | Beat | ID |
| ---: | :--- | :--- |
| 1 | Teach | ENC-HAZ-01 then ENC-TEACH-01 (or SPELL-01 if starters missing) |
| 2 | Reinforce | ENC-WAVE-01 |
| 3 | Combine | ENC-REINF-01 |
| 3 insert | Choice | ENC-BRANCH-01 → Ash → ENC-MOVE-01 |
| 4 | Pressure | ENC-PROT-01 **or** skip via ENC-REST-01 |
| 4 | Mastery | ENC-MAST-01 (ash skin) |
| 5 | Boss | ENC-BOSS-01 (`crimson_countess`) |

Rare: 8% on depth 4 to replace nothing — **insert** ENC-RARE-01 before mastery.  
Treasure: rest may offer ENC-TREAS-01 instead of PROT-01.

### Chain B — “Ice Primer”

Same skeleton; branch Ice → ENC-SPELL-02 → ENC-PRIO-01 → ENC-BOSS-01 (`pale_archbishop`). Mini-boss ENC-MINI-01 can replace mastery for shorter maxDepth 4 runs.

### Rush injection

Rest `boss` exit starts current 10-room Rush. After the account has one full clear, rest shrine can enable `rushVariant` flags: room 0 → ENC-RUSH-01, room 3 → ENC-RUSH-02, room 9 → ENC-RUSH-03.

---

## 6. Optional challenge overlay

Existing conditions are enough for v1 overlays. Do not invent predicates in production until a human asks.

| Encounter | Suggested overlay |
| :--- | :--- |
| ENC-TEACH-01, ENC-HAZ-01 | `under_15_turns` / `under_50_damage` |
| ENC-WAVE-01 | `under_10_turns` (hard) |
| ENC-ELITE-01, ENC-MAST-01 | `under_8_ap_per_turn` |
| ENC-MOVE-01 | `under_50_damage` |
| ENC-SURV-01 | `no_healing` (not `no_damage_taken`) |
| ENC-PROT-01 | `direct_hit` (stay near the ward) |
| ENC-TREAS-01 / ENC-RUSH-03 | no overlay (the risk *is* the challenge) |

All overlay Doka/XP still go through `liveBattleChallengePersistEntries` → `applyRewards`.

---

## 7. Scaling tables (no level-only ramps)

| Band | Composition | AI | Kits (`levelZone`) | Hazards | Objectives |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TEACH | 2–3 roles, one verb | no lookahead | zone 0 | 0–2 scripted | kill |
| LOW | +1 role or 1 wave | LoS reposition | zone 0–1 | one type | kill + optional glyph |
| MID | waves or priority | backline guard | zone 1 | one modifier | clock or priority |
| HIGH | elite or escort | lethal lookahead | zone 1–2 | two taxes | protect / move |
| PEAK | overlap waves or boss | full gates | zone 2 + boss kits | branch-skinned | mastery / rush |

If a live player is over-levelled for a band, **promote the band’s verb** (add a role, enable a kit spell, tighten the clock by 1 turn) rather than multiplying enemy HP.

---

## 8. Explicit metadata sketch (for a later implementer)

Not production code. A room definition should look like data, not like `if (enemy.name.includes("King"))`.

```
encounterId
encounterType        // wave | survival | elite | ambush | reinforce | protect | priority | move | hazard | rare_elite | treasure | rest | branch | mini_boss | boss | rush_variant | spell_discover
relativeBand
roster[]             // pieceType, archetype, variant?, kitSpellIds[], aiFlags
waves[]              // spawnCells, roster, startRule
hazards[]            // cell, type, scriptedHazardsOnly
objectiveKind        // wipe | survive_turns | escort | touch_cell | choose_portal | boss_id
failureKind          // player_death | ward_death
discoverSpellId?
branchFlag?
rushVariant?
optionalChallengeId?
rewardPolicy         // applyRewards deltas + depth multiplier + existing boss/rush tables
```

---

## 9. Out of scope

- Implementing any of the above in `WorldExploration.tsx` or mapGen.
- New damage formulas, new CharacterStats fields, new persist writers.
- Name-based targeting or “if they are called Chanter” logic.
- Shipping admin tools to configure these rooms for normal players.

---

## 10. Pick order if this catalog is implemented later

1. ENC-TEACH-01 + ENC-HAZ-01 (verbs)  
2. ENC-WAVE-01 (lock-until-waves metadata)  
3. ENC-REST-01 / ENC-BRANCH-01 (foyer flags + snapshot-before-cleanup)  
4. ENC-BOSS-01 branch read  
5. Everything else by beat  

Uniqueness: this file is the first `docs/encounters/` catalog in-repo as of 2026-08-31. Later designers should add dated files or append IDs rather than silently rewriting these.
