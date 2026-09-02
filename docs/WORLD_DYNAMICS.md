# World Dynamics Catalog

**Role:** World Dynamics Designer  
**Date:** 2026-09-02 (wave 3)  
**Canonical IDs:** `src/frontend/src/engine/worldFeatures.ts`  
**Status:** Designed. Not wired into map generation, the RAF loop, turn advance, or combat damage formulas.  
**ACTION_IDs:** `WDD-2026-08-31-001` (wave 1) · `WDD-2026-09-01-001` (wave 2) · `WDD-2026-09-02-001` (wave 3)

These features exist so a long-lived character still meets new spatial and risk decisions after the 22 live map modifiers and lava / ice / spikes have been seen many times. Variation comes from **rarity weights** and **relative difficulty versus same-tier content**, not from “unlocks at level N”.

## Non-negotiables

Every feature below:

1. **Creates a decision** — skip, path, spend, or engage.
2. **Is visually understandable** — glyph + carved-slate tint + tooltip (not color-only).
3. **Preserves solvability** — `evaluateSolvability` still passes: legal spawn, reachable hostiles, at least one reachable portal, spawn not on an exit.
4. **Obeys combat rules** — AP/MP spends, initiative, occupancy, LoS, explicit spell metadata. No name-based heuristics.
5. **Has counterplay** — a readable way to refuse, delay, or invert the threat.

Hard product rules this catalog must not break:

- Credits (XP / Doka) only through `applyRewards` on `createProgressPersist`.
- Player heals and death penalties through `saveBattleStats` on that same lock.
- Hazard HP through `recordChallengeDamageTaken` (combat) or `recordInBattleChallengeDamage` (in-battle lava-like ticks).
- Death Realm 1.5s guards: no portals and no encounters until the timer fires.
- Run maps: `filterRunPortals` still allows only the progression portal.
- Caps: `MAX_HAZARD_TILES` 50, `MAX_ENEMIES` 20, 16×16 grid.
- Do not place on spawn ±3 or on portal cells (same exclusion as modifier hazard seeding).
- Do not touch RAF, `mapGen.ts` generation, turn logic, or existing damage math to implement this catalog. Place as a post-finalize overlay, then re-run solvability.

## Variation model (indefinite progression)

| Knob | Rule |
| :--- | :--- |
| Rarity weights | common 40 · uncommon 20 · rare 8 · epic 3 · legendary 1 |
| Relative difficulty | soft / medium / hard / extreme versus **same-tier** templates |
| Threat multipliers | 0.6 / 1.0 / 1.35 / 1.75 |
| Reward multipliers | 1.0 / 1.25 / 1.75 / 2.5 on the map’s normal `applyRewards` grant |
| HP taxes | fraction of **current max HP** so a seam still matters at 1000 HP |
| Slots per map | tile 55% · encounter 25% · event 15% · max 3 features |
| Death Realm | no features |
| Dungeon / Boss Rush | no Flicker Gate, no Gambit Chest, no Echo Gate, no Pilgrim Banners, no Latch Gate (portal-filter + run integrity) |
| Live modifiers | the existing 22 still roll on their own two-roll; this catalog does not replace them |

`pickWeightedFeatures` never receives player level.

Elite / invasion bodies are **same-tier spawn config × threat multiplier**. Extra spells are rows with `usableByEnemy === true`.

## Live systems this catalog does not clone

- Hazard types `lava` / `ice` / `spikes` (flat 8–16 / slow / 5–11).
- Map modifiers in `engine/mapModifiers.ts` (including Void Rift’s map-wide tick + displacement).
- Regular, dungeon, boss-rush, death-realm, white, and progression portals.
- Ground Doka coins.

New seams, clouds, and bars use **% max HP** so they stay relevant beside those flat tiles.

## Placement contract (for a later implementer)

1. Generate and finalize the map as today.
2. Roll `pickWeightedFeatures`.
3. For each pick, place only on floor cells that are not spawn±3 and not portals.
4. If `blocksWalk` or `requiresBypass`, skip the feature when `evaluateSolvability` would fail with it present.
5. If `canAddHazardTiles` / `canAddEnemies` is false, skip or shrink the band.
6. Arena maps with no wall-adjacent floor skip Ash Rain (no shelter).
7. Maps that would start with only one living unit skip Isolation Chill (no warm pair).
8. Do not add a second copy of the same `WORLD_FEATURE_ID` on one map.
9. Do not place two `blocksWalk` features on the same cell.

## Visual language

Carved stone, dark slate, crimson accents. Each feature: **inlay glyph + tile wash + hover label**. Motion is slow (ember pulse, ash drift, portcullis rust) so it reads in a turn-based game. Color-blind players get the glyph and the tooltip, not hue alone.

---

## Features

### WF-HAZ-EMBER_VEIN

WORLD_FEATURE_ID: WF-HAZ-EMBER_VEIN  
NAME: Ember Vein  
MECHANIC: A cracked slate seam glows ember-orange. Stepping on it costs 4% of the unit’s current max HP. Walkable. Does not replace lava tiles.  
PLAYER_DECISION: Spend MP to path around the seam, or cut through and pay the HP tax.  
RELATIVE_DIFFICULTY: medium (threat 1.0 — a short-cut tax, not a fight)  
RARITY: common (weight 40)  
VISUAL: Ember inlay, `#8a2a12` wash, flame-dot pulse, tooltip “step tax as % of your max HP”.  
SOLVABILITY: Floor only. Never on spawn±3 or portals. Never the only cell in a corridor (does not block).  
COMBAT_RULES: Challenge HP recorders. Wounded enemy AI avoids it like lava. Counts toward `MAX_HAZARD_TILES` (3–6 tiles).  
COUNTERPLAY: Walk around, teleport (ground/self metadata), or send a summon.

### WF-HAZ-CREEP_MIST

WORLD_FEATURE_ID: WF-HAZ-CREEP_MIST  
NAME: Creeping Ash  
MECHANIC: A 3-tile ash cloud on a painted lane advances one tile at the start of each round. Ending a turn inside it costs 6% max HP.  
PLAYER_DECISION: Move now before it arrives, stand just behind it, or lure an enemy into the next cell.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare (weight 8)  
VISUAL: Grey-violet cloud, lane chevrons, drifting ash.  
SOLVABILITY: Lane on floor only. Cloud never covers the only portal or spawn. A parallel floor path remains.  
COMBAT_RULES: Round-start move only. Tax via in-battle challenge HP. No AP/MP spend, no skipped turns.  
COUNTERPLAY: Read the chevrons; end turns off-lane; push/attract a foe onto the next cell.

### WF-TRP-GLYPH_PLATE

WORLD_FEATURE_ID: WF-TRP-GLYPH_PLATE  
NAME: Glyph Plate  
MECHANIC: A carved rune is visible from an adjacent tile. The first unit to step on it takes 8% max HP once; the plate then becomes floor.  
PLAYER_DECISION: Path around, spend the trap yourself, or bait an enemy onto it.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon (weight 20)  
VISUAL: Crimson rune plate, dim until adjacent, bright when armed.  
SOLVABILITY: Walkable before and after. Never hidden. Never on spawn/portals.  
COMBAT_RULES: One-shot step trigger. Challenge HP. No name-based “trap spell” lookup.  
COUNTERPLAY: Approach from a seen side, send a summon first, or shove an enemy on.

### WF-TER-CRUMBLE_PILLAR

WORLD_FEATURE_ID: WF-TER-CRUMBLE_PILLAR  
NAME: Crumble Pillar  
MECHANIC: A cracked column blocks walk and LoS. Any adjacent combatant may spend 2 AP (no spell) to shatter it into floor.  
PLAYER_DECISION: Spend 2 AP for a shortcut / LoS, leave it as cover, or make the enemy break it.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Carved column with crack inlay, chips on break.  
SOLVABILITY: Must not be a cut-vertex. If the pillar would fail `evaluateSolvability`, skip the feature.  
COMBAT_RULES: 2 AP occupancy action. No damage. Counts as a wall for LoS until broken.  
COUNTERPLAY: Ignore when a bypass exists; break when the cell is worth 2 AP; hide from linear spells.

### WF-OBS-FALLEN_GATE

WORLD_FEATURE_ID: WF-OBS-FALLEN_GATE  
NAME: Fallen Gate  
MECHANIC: A rusted portcullis blocks one corridor cell for 2 rounds, then becomes floor. A painted 2→1 timer sits on the tile.  
PLAYER_DECISION: Wait two rounds for the short path, or spend MP on the long way now.  
RELATIVE_DIFFICULTY: medium  
RARITY: common  
VISUAL: Iron portcullis on slate, rusting as the timer drops.  
SOLVABILITY: Place only when a second spawn→portal route already exists. Never the only exit.  
COMBAT_RULES: Wall occupancy while up. No damage. Timer ticks at round end.  
COUNTERPLAY: Take the long path, wait, or teleport past if metadata allows.

### WF-ZON-SHRINE_POOL

WORLD_FEATURE_ID: WF-ZON-SHRINE_POOL  
NAME: Shrine Pool  
MECHANIC: A teal basin heals 8% max HP the first time a unit ends its turn on the tile, then dries. Enemies can drink it.  
PLAYER_DECISION: Contest it this turn, save it, or deny the enemy.  
RELATIVE_DIFFICULTY: soft  
RARITY: common  
VISUAL: Teal water, rising motes, dry stone after use.  
SOLVABILITY: Walkable. Optional. Never on spawn/portals.  
COMBAT_RULES: Zone tick, not a spell. Player HP persist via `saveBattleStats` on the progress lock.  
COUNTERPLAY: Step on first, shove the enemy off, or ignore when healthy.

### WF-ZON-WARD_CIRCLE

WORLD_FEATURE_ID: WF-ZON-WARD_CIRCLE  
NAME: Ward Circle  
MECHANIC: A gold inlay grants +20% RES while a unit stands on it. Lost on leaving. Either side may hold it.  
PLAYER_DECISION: Plant on the ring, pull the fight onto it, or deny the tile.  
RELATIVE_DIFFICULTY: soft  
RARITY: uncommon  
VISUAL: Gold ring inlay on dark slate.  
SOLVABILITY: One walkable cell. Does not seal a path.  
COMBAT_RULES: Standing-zone RES, not a buff spell (Null Field does not strip it). Existing RES mitigation; no new damage formula.  
COUNTERPLAY: Occupy, push the holder off, or fight at range.

### WF-TEL-MIRROR_STEP

WORLD_FEATURE_ID: WF-TEL-MIRROR_STEP  
NAME: Mirror Step  
MECHANIC: Two linked cyan glyphs. Entering one for 1 MP exits the other. If the exit is occupied, the travelers swap. Either side may use the pair.  
PLAYER_DECISION: Spend 1 MP to reposition, walk, or leave the pair as an enemy escape.  
RELATIVE_DIFFICULTY: soft  
RARITY: uncommon  
VISUAL: Paired cyan glyphs that pulse in sync.  
SOLVABILITY: Both on floor, not on spawn/portals. The map is solvable without using them.  
COMBAT_RULES: 1 MP from the unit’s current MP. Not a teleport spell — do not key off `effectCategory`.  
COUNTERPLAY: Stand on the exit to block or force a swap; ignore the pair.

### WF-PRT-FLICKER_GATE

WORLD_FEATURE_ID: WF-PRT-FLICKER_GATE  
NAME: Flicker Gate  
MECHANIC: An extra cracked-rim portal. Entering rolls a random eligible overworld map and pays a bonus `applyRewards` grant at the hard/extreme multiplier. It is never the only exit.  
PLAYER_DECISION: Take the stable portal you can see, or gamble the flicker.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic (weight 3)  
VISUAL: Portal with cracked stone rim, alpha flicker.  
SOLVABILITY: Always in addition to a reachable stable portal. Forbidden in dungeon, boss rush, and Death Realm.  
COMBAT_RULES: Portal transition, not a combat action. Bonus via `applyRewards` on the persist lock. Death-realm guards still block entry.  
COUNTERPLAY: Ignore it. The stable exit always works.

### WF-INV-WARBAND

WORLD_FEATURE_ID: WF-INV-WARBAND  
NAME: Warband Incursion  
MECHANIC: A warhorn announces +3 to +5 extra same-tier enemies (tier spawn config × extreme threat). Clearing them pays extreme reward multiplier.  
PLAYER_DECISION: Fight the packed field for a large grant, or walk to a portal and leave.  
RELATIVE_DIFFICULTY: extreme  
RARITY: legendary (weight 1)  
VISUAL: Extra war banners, crimson announce strip.  
SOLVABILITY: Add enemies only up to `MAX_ENEMIES`, all on the spawn flood-fill. Skip if the roster is already at cap.  
COMBAT_RULES: Normal hostiles. Rewards only through `applyRewards` after victory (no per-kill resolver). Death guards still block encounter start.  
COUNTERPLAY: Leave without engaging; kite with summons; focus a flagged leader.

### WF-ELT-BANNER_PATROL

WORLD_FEATURE_ID: WF-ELT-BANNER_PATROL  
NAME: Banner Patrol  
MECHANIC: One elite (same-tier × hard threat) walks a 4–6 tile loop marked by banner dots. Touch starts combat. Kill pays hard reward multiplier.  
PLAYER_DECISION: Intercept the loop, wait until they are far from the exit, or never touch them.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare  
VISUAL: Banner dots on the loop, elite with a pennant.  
SOLVABILITY: Loop is floor. Elite counts as 1 enemy. Exit reachable without crossing the loop.  
COMBAT_RULES: World contact starts a normal battle. Extra spells from `usableByEnemy` only. Victory → `applyRewards`.  
COUNTERPLAY: Stand off the loop; fight when isolated.

### WF-TRS-RELIC_CACHE

WORLD_FEATURE_ID: WF-TRS-RELIC_CACHE  
NAME: Relic Cache  
MECHANIC: A locked chest. 2 AP adjacent opens it: `applyRewards` at medium multiplier, 40% chance of one same-tier guardian.  
PLAYER_DECISION: Spend 2 AP (and maybe fight) or walk past.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Locked chest, gold trim, carved lock.  
SOLVABILITY: Adjacent-open, not a wall. Guardian only on a reachable floor cell.  
COMBAT_RULES: AP cost, not a spell. Credits via persist-lock `applyRewards`. No `updateCharacter` Doka.  
COUNTERPLAY: Skip; open after the map is clear.

### WF-SPL-RUNE_BEARER

WORLD_FEATURE_ID: WF-SPL-RUNE_BEARER  
NAME: Rune Bearer  
MECHANIC: One same-tier enemy carries extra spells from `SpellConfig` rows with `usableByEnemy === true` (1–3 by rarity roll, not level). On death the player may attune one of those ids for the rest of this map.  
PLAYER_DECISION: Focus the bearer to steal a spell, or ignore them.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic  
VISUAL: Enemy with a hovering spell orb.  
SOLVABILITY: Prefer replacing one existing spawn; else +1 if under the enemy cap. Must stay reachable.  
COMBAT_RULES: Metadata only (`usableByEnemy`, `targetType`, costs). Temporary attune does not call `upgradeSpell` and does not persist `spellLevel*` arrays.  
COUNTERPLAY: Kite and ignore, burst first, or steal a utility spell and leave.

### WF-RSK-BLOOD_ALTAR

WORLD_FEATURE_ID: WF-RSK-BLOOD_ALTAR  
NAME: Blood Altar  
MECHANIC: End a turn on the basin to pay 15% max HP once and flag this map’s next `applyRewards` credit with the hard multiplier.  
PLAYER_DECISION: Pay HP for a fatter victory/portal purse, or keep the HP.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic  
VISUAL: Crimson basin, slow drip.  
SOLVABILITY: Optional floor tile. Map is solvable if never used.  
COMBAT_RULES: HP via challenge recorders. Multiplier on the next `applyRewards` enqueue only. Death still uses `saveBattleStats`.  
COUNTERPLAY: Skip unless you can survive the tax and expect a credit.

### WF-RSK-GAMBIT_CHEST

WORLD_FEATURE_ID: WF-RSK-GAMBIT_CHEST  
NAME: Gambit Chest  
MECHANIC: Safe lock: small `applyRewards` (soft). Risk lock: 50% extreme grant, 50% ambush of 2 same-tier enemies and no grant.  
PLAYER_DECISION: Sure purse, coin-flip, or walk away.  
RELATIVE_DIFFICULTY: extreme  
RARITY: legendary  
VISUAL: Two-tone lock (slate / crimson).  
SOLVABILITY: Optional. If two ambush cells cannot be placed under the cap, the risk lock pays the grant instead of soft-locking. Exploration only.  
COMBAT_RULES: Both locks credit only through `applyRewards`. No out-of-lock jackpot mint.  
COUNTERPLAY: Walk away; pick safe when wounded.

### WF-MOD-CROSSWIND

WORLD_FEATURE_ID: WF-MOD-CROSSWIND  
NAME: Crosswind  
MECHANIC: After a unit spends MP to move, if the next cell in the painted wind direction is floor and empty, they slide one extra tile at no MP. Hazards on the slide resolve normally.  
PLAYER_DECISION: Path so the slide helps, or stop short of a dump onto ember / lava / spikes.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Dust streaks, wind chevrons on the rim.  
SOLVABILITY: Slide stays on the walkable graph. A unit can always choose a paid path that does not slide into a wall.  
COMBAT_RULES: Forced step after a legal MP spend. Does not change AP costs or damage formulas. Ice / slime doublers apply to paid steps only.  
COUNTERPLAY: End the paid path so the next wind cell is a wall (no slide).

### WF-MOD-LOW_CEILING

WORLD_FEATURE_ID: WF-MOD-LOW_CEILING  
NAME: Low Ceiling  
MECHANIC: Spells with `linear === true` keep metadata range. All other targeted spells lose 1 `maxRange` (min 1).  
PLAYER_DECISION: Switch to linear spells, walk closer, or accept shorter reach.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Darker vignette, hanging stone teeth.  
SOLVABILITY: No tile change. Melee and linear kits remain usable.  
COMBAT_RULES: Reads `SpellConfig.linear` / `maxRange` / `minRange` only. Attack Nearest and summons are not spells. No damage rewrite.  
COUNTERPLAY: Cast linear, close distance, or ignore ranged options this map.

### WF-EVT-ECLIPSE

WORLD_FEATURE_ID: WF-EVT-ECLIPSE  
NAME: Eclipse Hour  
MECHANIC: This map only: all `maxRange` −1 (min 1), and melee adjacency deals +15% of the **already computed** hit (after existing RES/SR).  
PLAYER_DECISION: Close for the melee bonus, hold a kite at reduced range, or skip fights.  
RELATIVE_DIFFICULTY: extreme  
RARITY: legendary  
VISUAL: Dim field, crimson corona at the horizon.  
SOLVABILITY: No blocks. Leaving is always legal. Exploration only.  
COMBAT_RULES: Range clamp is metadata. The +15% scales the post-formula number — it does not replace `combatMath`. Enemies gain it too.  
COUNTERPLAY: Refuse the fight, summon a front-liner, or lean into melee.

### WF-ENV-ASH_RAIN

WORLD_FEATURE_ID: WF-ENV-ASH_RAIN  
NAME: Ash Rain  
MECHANIC: At the end of each combatant turn, if they are not adjacent to a wall, they pay 3% max HP. Wall-adjacent cells show a shelter hatch.  
PLAYER_DECISION: Hug walls, hold the center and pay, or shove foes off the wall.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare  
VISUAL: Falling ash overlay, hatch marks on shelter cells.  
SOLVABILITY: Skip on maps with no wall-adjacent floor (open arena) so shelter exists.  
COMBAT_RULES: End-of-turn challenge HP. Summons pay it. No skipped turns. No spell-damage change.  
COUNTERPLAY: End turns on hatched cells, or pay to hold an angle.

### WF-ENV-TIDE_SPIKE

WORLD_FEATURE_ID: WF-ENV-TIDE_SPIKE  
NAME: Tide Spikes  
MECHANIC: A 3-tile spike bar on a painted lane shifts one cell at each round start. Occupying the bar when it arrives costs 5% max HP (not the flat 5–11 spike roll).  
PLAYER_DECISION: Stand off-lane, time a cross, or bait an enemy onto the next cells.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare  
VISUAL: Charcoal bar, gold chevrons, spike tips.  
SOLVABILITY: Lane never includes the only portal or spawn. A floor path around the lane exists.  
COMBAT_RULES: Round-start move, then tax. Challenge HP. 3 tiles toward the hazard cap. Wounded AI avoids the next bar cells.  
COUNTERPLAY: Read chevrons; cross after it passes; push a foe onto the incoming bar.

---

## Wave 2 (2026-09-01)

Second-wave seams so a long-lived character still meets new decisions after wave 1 has been seen many times. Same rarity weights and relative difficulty. Same overlay contract. Do not clone lava / ice / spikes, the live 22 modifiers, or wave-1 ids.

### WF-HAZ-SALT_CRUST

WORLD_FEATURE_ID: WF-HAZ-SALT_CRUST  
NAME: Salt Crust  
MECHANIC: Pale salt tiles. The first salt tile entered in a turn is free. Each extra salt tile entered that same turn costs 3% max HP. Walkable. Does not replace ice or lava.  
PLAYER_DECISION: Hop on and off after one tile, or pay to traverse a long salt path in a single turn.  
RELATIVE_DIFFICULTY: medium (threat 1.0 — a path tax, not a fight)  
RARITY: common (weight 40)  
VISUAL: Salt inlay, `#5a5648` wash, pale crust glyph, tooltip “first salt step free; extras tax % max HP”.  
SOLVABILITY: Floor only. Never on spawn±3 or portals. Never the only cell in a corridor (does not block).  
COMBAT_RULES: Challenge HP recorders. Wounded AI avoids a second salt step like lava. Counts toward `MAX_HAZARD_TILES` (4–8 tiles).  
COUNTERPLAY: Step off after one tile, teleport (ground/self metadata), or send a summon to spend the free step.

### WF-HAZ-HUNT_LANTERN

WORLD_FEATURE_ID: WF-HAZ-HUNT_LANTERN  
NAME: Hunting Lantern  
MECHANIC: A single lantern orb. In battle it steps one tile at round start toward the last unit that spent MP this round (painted facing). Landing on a unit costs 5% max HP. Out of battle it sits still; walking onto it pays the same tax.  
PLAYER_DECISION: Stay still so it does not advance, step off its painted facing, or bait it onto an enemy.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare (weight 8)  
VISUAL: Lantern glyph, `#4a3010` wash, facing chevron, ember pulse.  
SOLVABILITY: Never starts on spawn/portal. A floor path around the orb remains. Not a wall.  
COMBAT_RULES: Round-start 1-tile step. Challenge HP. No AP/MP spend, no skipped turns. 1 hazard budget.  
COUNTERPLAY: Do not spend MP; end off the chevron; push/attract a foe onto the next cell.

### WF-TRP-PRESSURE_MOSAIC

WORLD_FEATURE_ID: WF-TRP-PRESSURE_MOSAIC  
NAME: Pressure Mosaic  
MECHANIC: A visible 2×2 carved mosaic. If two or more units occupy it at end of a combatant turn, every unit on the mosaic pays 7% max HP once; the mosaic then becomes floor.  
PLAYER_DECISION: Do not share the mosaic, bait a second body onto it, or detonate it with a summon.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon (weight 20)  
VISUAL: Four-tile mosaic, `#3a2418` wash, carved joints, always visible.  
SOLVABILITY: Walkable before and after. Never covers spawn/portals.  
COMBAT_RULES: End-of-turn occupancy check. Challenge HP. No hidden tiles. No name-based trap lookup.  
COUNTERPLAY: Leave before a second unit enters; send a summon; shove a foe onto a second cell.

### WF-TER-CINDER_BARREL

WORLD_FEATURE_ID: WF-TER-CINDER_BARREL  
NAME: Cinder Barrel  
MECHANIC: A barrel blocks walk and LoS. Adjacent: 1 AP to roll it one tile in a chosen cardinal if empty; if the next cell holds a unit the barrel stops and that unit pays 5% max HP. 2 AP adjacent smashes it to floor.  
PLAYER_DECISION: Roll it as a projectile, smash it for the cell, or leave it as cover.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Iron-bound barrel, `#3a2218` wash, crack chips on smash.  
SOLVABILITY: Must not be a cut-vertex. Skip if `evaluateSolvability` would fail with it intact.  
COMBAT_RULES: AP occupancy actions, not spells. Hit tax via challenge HP. Wall LoS until smashed.  
COUNTERPLAY: Ignore when a bypass exists; smash when the cell is worth 2 AP; roll to tax a stacked foe.

### WF-OBS-TIDE_DOOR

WORLD_FEATURE_ID: WF-OBS-TIDE_DOOR  
NAME: Tide Door  
MECHANIC: One corridor cell is a wall on odd rounds and floor on even rounds. A painted open/shut glyph flips at round start.  
PLAYER_DECISION: Cross on even rounds, wait a round, or spend MP on the always-open long path.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Stone sluice, `#2a3438` wash, open/shut glyph.  
SOLVABILITY: Place only when a second spawn→portal route already exists. Never the only exit. Do not share a cell with another `blocksWalk` feature.  
COMBAT_RULES: Wall occupancy while shut. No damage. Flip at round start.  
COUNTERPLAY: Wait for even; take the long path; teleport past if metadata allows.

### WF-ZON-SECOND_WIND

WORLD_FEATURE_ID: WF-ZON-SECOND_WIND  
NAME: Second Wind  
MECHANIC: A copper inlay. The first unit to end a turn here this map recovers 1 AP already spent this turn (cannot exceed max AP), then the tile dries. Enemies can use it.  
PLAYER_DECISION: End movement here to cast more this turn, deny the enemy the tile, or ignore it.  
RELATIVE_DIFFICULTY: soft  
RARITY: uncommon  
VISUAL: Copper inlay, `#4a3018` wash, rising spark, dry stone after use.  
SOLVABILITY: Walkable. Optional. Never on spawn/portals.  
COMBAT_RULES: AP refund, not a spell and not a heal. Does not call `saveBattleStats` or `applyRewards`. Null Field does not strip it.  
COUNTERPLAY: Step on first; shove the enemy off; ignore when you still have AP.

### WF-TEL-SLIPSTREAM

WORLD_FEATURE_ID: WF-TEL-SLIPSTREAM  
NAME: Slipstream  
MECHANIC: One-way pair: cyan arrow A → B. Entering A for 1 MP exits at B. B does not return. If B is occupied, the travelers swap.  
PLAYER_DECISION: Spend 1 MP for a one-way skip, walk, or leave A as an enemy escape toward B.  
RELATIVE_DIFFICULTY: soft  
RARITY: uncommon  
VISUAL: One-way cyan arrow pair, `#0e3a4a` wash, pulse from A toward B.  
SOLVABILITY: Both on floor, not on spawn/portals. The map is solvable without using them.  
COMBAT_RULES: 1 MP from the unit’s current MP. Not a teleport spell — do not key off `effectCategory`.  
COUNTERPLAY: Stand on B to block or force a swap; ignore the pair.

### WF-PRT-ECHO_GATE

WORLD_FEATURE_ID: WF-PRT-ECHO_GATE  
NAME: Echo Gate  
MECHANIC: An extra backward-notch portal. Entering returns you to the previous overworld map this session and pays a medium `applyRewards` grant. If there is no previous map, it behaves as a regular portal with no bonus. It is never the only exit.  
PLAYER_DECISION: Retreat to the last map for a medium purse, or take the stable forward portal.  
RELATIVE_DIFFICULTY: medium  
RARITY: epic (weight 3)  
VISUAL: Portal with backward notch, `#1a2a4a` wash, blue flicker.  
SOLVABILITY: Always in addition to a reachable stable portal. Forbidden in dungeon, boss rush, and Death Realm.  
COMBAT_RULES: Portal transition, not a combat action. Bonus via `applyRewards` on the persist lock. Death-realm guards still block entry.  
COUNTERPLAY: Ignore it. The stable exit always works.

### WF-INV-DUELIST_CIRCLE

WORLD_FEATURE_ID: WF-INV-DUELIST_CIRCLE  
NAME: Duelist Circle  
MECHANIC: Two same-tier elites (hard threat) circle a painted ring. Out of battle both lose 8% max HP on each enemy-wander interval. If one hits 0 they vanish. Touching either starts a normal battle at remaining HP. Victory pays hard if both still stood at contact, medium if one already vanished.  
PLAYER_DECISION: Wait for a wounded survivor, join early for two purses, or never enter the ring (exploration).  
RELATIVE_DIFFICULTY: hard  
RARITY: epic  
VISUAL: Painted ring, two pennants, `#4a1818` wash.  
SOLVABILITY: Ring is floor. Exit reachable without entering. Counts as 2 toward `MAX_ENEMIES`. In dungeon / boss rush they count as hostiles for map-clear.  
COMBAT_RULES: World attrition does not call `applyRewards`. Contact is a normal battle. Extra spells from `usableByEnemy` only. Victory → `applyRewards`.  
COUNTERPLAY: Stay off the ring in exploration; join when one is low; in a run, fight the survivor or both.

### WF-ELT-TOLL_KEEPER

WORLD_FEATURE_ID: WF-ELT-TOLL_KEEPER  
NAME: Toll Keeper  
MECHANIC: One elite (same-tier × hard) stands on a painted short-path cell. In exploration: touch to fight, or pay 10% max HP once adjacent to pass this map without combat. A long path bypasses them. In dungeon / boss rush the toll is disabled — they are a normal elite required for map-clear.  
PLAYER_DECISION: Fight for the hard purse, pay the toll, or walk the long way.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare  
VISUAL: Stationary elite with a toll staff, `#3a2010` wash, short-path paint.  
SOLVABILITY: Place only when a second spawn→portal route exists. Counts as 1 enemy.  
COMBAT_RULES: World contact starts a normal battle. Toll HP via challenge recorders. Extra spells from `usableByEnemy` only. Victory → `applyRewards`.  
COUNTERPLAY: Long path; pay the toll when wounded (exploration); fight when you want the purse.

### WF-TRS-SEALED_URN

WORLD_FEATURE_ID: WF-TRS-SEALED_URN  
NAME: Sealed Urn  
MECHANIC: A sealed urn. 1 AP adjacent opens it: 70% medium `applyRewards` grant, 30% 6% max-HP tax and no grant. No guardian.  
PLAYER_DECISION: Spend 1 AP on a biased coin, or walk past.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Sealed urn, `#3a2a18` wash, wax cord, gold trim.  
SOLVABILITY: Adjacent-open, not a wall. Optional.  
COMBAT_RULES: AP cost, not a spell. Credits via persist-lock `applyRewards`. Fail uses challenge HP. No `updateCharacter` Doka.  
COUNTERPLAY: Skip; open after fights when a 6% miss is cheap.

### WF-SPL-GRIMOIRE_STALKER

WORLD_FEATURE_ID: WF-SPL-GRIMOIRE_STALKER  
NAME: Grimoire Stalker  
MECHANIC: One same-tier enemy (medium threat) carries 1 extra `usableByEnemy` spell. On death the player may take that spell id as a **single remaining cast** this map — not a full-map attune.  
PLAYER_DECISION: Kill the stalker for a one-shot catalog spell, or ignore them.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Enemy with a hovering book, `#241a38` wash.  
SOLVABILITY: Prefer replacing one existing spawn; else +1 if under the enemy cap. Must stay reachable.  
COMBAT_RULES: Metadata only (`usableByEnemy`, `targetType`, costs). One-cast does not call `upgradeSpell` and does not persist `spellLevel*` arrays.  
COUNTERPLAY: Kite and ignore, burst first, or save the cast for a key turn.

### WF-RSK-SCOURGE_COMPACT

WORLD_FEATURE_ID: WF-RSK-SCOURGE_COMPACT  
NAME: Scourge Compact  
MECHANIC: End a turn on the black inlay to flag this map: you take +10% of already-computed incoming hits (after RES/SR), and the next `applyRewards` uses the hard multiplier. One flag, this map only. Enemies do not gain the bonus.  
PLAYER_DECISION: Accept incoming tax for a fatter purse, or stay unflagged.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic  
VISUAL: Black inlay, `#1a1018` wash, slow crimson tick.  
SOLVABILITY: Optional floor tile. Map is solvable if never used.  
COMBAT_RULES: +10% scales the post-formula number — it does not replace `combatMath`. Multiplier on the next `applyRewards` enqueue only. Death still uses `saveBattleStats`.  
COUNTERPLAY: Skip unless you can kite or out-heal and expect a credit.

### WF-MOD-ECHO_HALL

WORLD_FEATURE_ID: WF-MOD-ECHO_HALL  
NAME: Echoing Halls  
MECHANIC: Spells with `linear === true` may continue one extra empty floor cell beyond the first target along the line. Non-linear spells unchanged.  
PLAYER_DECISION: Line up shots through empty cells, or hide with your back to a wall so you cannot be echoed.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Hanging stone teeth, `#2a2830` wash, faint echo lines.  
SOLVABILITY: No tile change. Melee and non-linear kits remain usable.  
COMBAT_RULES: Reads `SpellConfig.linear` / `maxRange` / `minRange` / `targetType` only. Extra cell must be empty floor. Attack Nearest and summons are not spells. No damage rewrite.  
COUNTERPLAY: Stand with a wall behind you; close to melee; ignore linear.

### WF-EVT-PILGRIM_BANNERS

WORLD_FEATURE_ID: WF-EVT-PILGRIM_BANNERS  
NAME: Pilgrim Banners  
MECHANIC: This map only: leave through a portal without starting any encounter and the portal `applyRewards` grant uses the medium multiplier. Start any fight and win, and victory uses the hard multiplier. Starting a fight locks the peaceful path.  
PLAYER_DECISION: Take a peaceful medium portal purse, or fight for a hard victory purse.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Hanging pilgrim cloths, `#2a2418` wash, gold thread.  
SOLVABILITY: No blocks. Leaving is always legal. Exploration only (run maps require a clear).  
COMBAT_RULES: Multipliers on persist-lock `applyRewards` only. `inBattleRef` locks the peaceful path.  
COUNTERPLAY: Leave immediately, or fight if you want the hard purse.

### WF-ENV-GUTTER_STEAM

WORLD_FEATURE_ID: WF-ENV-GUTTER_STEAM  
NAME: Gutter Steam  
MECHANIC: Two painted vent tiles. On even rounds they jet; occupying a jetting vent at end of turn costs 4% max HP. Odd rounds they are inert floor. A painted even/odd pip sits on each vent.  
PLAYER_DECISION: Cross vents on odd rounds, hold off them on even, or bait a foe onto a jetting vent.  
RELATIVE_DIFFICULTY: hard  
RARITY: uncommon  
VISUAL: Iron grate, `#2a2820` wash, steam plume on even, pip.  
SOLVABILITY: Vents never include the only portal or spawn. A floor path around the vents exists.  
COMBAT_RULES: End-of-turn tax when even. Challenge HP. 2 tiles toward the hazard cap. Wounded AI avoids vents on even rounds.  
COUNTERPLAY: Read the pip; stand off on even; shove a foe onto a jetting vent.

---

## Wave 3 (2026-09-02)

Third-wave seams so a long-lived character still meets new decisions after waves 1–2 have been seen many times. Same rarity weights and relative difficulty. Same overlay contract. Do not clone lava / ice / spikes, the live 22 modifiers, or wave-1 / wave-2 ids.

### WF-HAZ-NEEDLE_GRASS

WORLD_FEATURE_ID: WF-HAZ-NEEDLE_GRASS  
NAME: Needle Grass  
MECHANIC: Pale-green barbs. Walking through is free. Ending a turn on a needle tile costs 4% max HP. Walkable. Does not replace lava, ice, ember, or salt.  
PLAYER_DECISION: Cut through and keep moving, camp on the barbs and pay, or spend MP to end off the grass.  
RELATIVE_DIFFICULTY: medium (threat 1.0 — a camping tax, not a fight)  
RARITY: common (weight 40)  
VISUAL: Needle inlay, `#2a3a18` wash, barb glyph, tooltip “walk-through free; ending a turn here taxes % max HP”.  
SOLVABILITY: Floor only. Never on spawn±3 or portals. Never the only cell in a corridor (does not block).  
COMBAT_RULES: Challenge HP recorders. Wounded AI avoids ending a turn on grass like lava. Counts toward `MAX_HAZARD_TILES` (4–8 tiles).  
COUNTERPLAY: End on adjacent floor, teleport (ground/self metadata), or send a summon to hold the cell.

### WF-HAZ-ORBIT_CINDER

WORLD_FEATURE_ID: WF-HAZ-ORBIT_CINDER  
NAME: Orbiting Cinder  
MECHANIC: A cinder orb occupies one cell of a painted 4-tile square and steps one cell clockwise at each round start. Landing on a unit costs 5% max HP.  
PLAYER_DECISION: Stand in the hollow of the square, time a cross after it passes, or bait an enemy onto the next cell.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare (weight 8)  
VISUAL: Cinder glyph, `#5a2810` wash, clockwise chevrons on the square.  
SOLVABILITY: Square is floor. Never covers spawn/portal. A path around the square remains. Not a wall.  
COMBAT_RULES: Round-start 1-tile step. Challenge HP. No AP/MP spend, no skipped turns. 1 hazard budget.  
COUNTERPLAY: Stand off the square; end off the next clockwise cell; push/attract a foe onto that cell.

### WF-TRP-CHEVRON_PLATE

WORLD_FEATURE_ID: WF-TRP-CHEVRON_PLATE  
NAME: Chevron Plate  
MECHANIC: A visible rune plate with a painted chevron. Stepping onto it from the chevron’s facing is free. Any other approach costs 8% max HP once; the plate then becomes floor.  
PLAYER_DECISION: Approach from the marked side, spend MP to go around, or bait an enemy from the wrong side.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon (weight 20)  
VISUAL: Crimson plate, `#4a1818` wash, always-visible chevron.  
SOLVABILITY: Walkable before and after. Never hidden. Never on spawn/portals.  
COMBAT_RULES: One-shot step trigger from a non-facing side. Challenge HP. No name-based trap lookup.  
COUNTERPLAY: Enter from the chevron; send a summon from the unsafe side; shove a foe from a flank.

### WF-TER-FROST_PANE

WORLD_FEATURE_ID: WF-TER-FROST_PANE  
NAME: Frost Pane  
MECHANIC: Carved ice occupies a cell: units may walk through it, but it blocks LoS. Adjacent: 1 AP (no spell) smashes it to clear floor.  
PLAYER_DECISION: Spend 1 AP for LoS, hide behind the pane, or walk through and accept the blind.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Ice sheet, `#2a3a48` wash, crack chips on smash.  
SOLVABILITY: Does not block walk. Smash is optional. Never on spawn/portals.  
COMBAT_RULES: 1 AP occupancy action. No damage. Wall for LoS until smashed. Walk occupancy is floor.  
COUNTERPLAY: Walk through; smash when a linear shot is worth 1 AP; stand behind it against linear spells.

### WF-OBS-SPENT_BRIDGE

WORLD_FEATURE_ID: WF-OBS-SPENT_BRIDGE  
NAME: Spent Bridge  
MECHANIC: A short-path floor cell with three painted pips. Each time a unit leaves the cell, one pip burns. After three crossings the cell becomes a wall for the rest of the map.  
PLAYER_DECISION: Burn crossings on the short path now, save pips for a later retreat, or never use it and keep the long path.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Timber span, `#3a3020` wash, three pips that burn out.  
SOLVABILITY: Place only when a second spawn→portal route already exists. Evaluate solvability as if the bridge were already a wall. Never the only exit.  
COMBAT_RULES: Walkable until the third leave, then wall occupancy. No damage. Any unit’s leave spends a pip.  
COUNTERPLAY: Take the long path; spend the three crossings when tempo matters; teleport past if metadata allows.

### WF-ZON-RALLY_DRUM

WORLD_FEATURE_ID: WF-ZON-RALLY_DRUM  
NAME: Rally Drum  
MECHANIC: A bronze inlay. The first unit to end a turn here this map recovers 1 MP already spent this turn (cannot exceed max MP), then the tile dries. Enemies can use it.  
PLAYER_DECISION: End movement here to walk farther this turn, deny the enemy the tile, or ignore it.  
RELATIVE_DIFFICULTY: soft  
RARITY: uncommon  
VISUAL: Bronze drum, `#3a2810` wash, rising spark, dry stone after use.  
SOLVABILITY: Walkable. Optional. Never on spawn/portals.  
COMBAT_RULES: MP refund, not a spell and not a heal. Does not call `saveBattleStats` or `applyRewards`. Null Field does not strip it.  
COUNTERPLAY: Step on first; shove the enemy off; ignore when you still have MP.

### WF-TEL-TRIUNE_PADS

WORLD_FEATURE_ID: WF-TEL-TRIUNE_PADS  
NAME: Triune Pads  
MECHANIC: Three linked cyan pads painted 1→2→3→1. Entering a pad for 1 MP exits at the next clockwise pad. If occupied, the travelers swap.  
PLAYER_DECISION: Spend 1 MP to rotate positions, walk, or leave a pad as an enemy carousel.  
RELATIVE_DIFFICULTY: soft  
RARITY: uncommon  
VISUAL: Three numbered cyan pads, `#0e2a42` wash, clockwise pulse.  
SOLVABILITY: All three on floor, not on spawn/portals. The map is solvable without using them.  
COMBAT_RULES: 1 MP from the unit’s current MP. Not a teleport spell — do not key off `effectCategory`.  
COUNTERPLAY: Stand on the next clockwise pad to block or force a swap; ignore the trio.

### WF-PRT-LATCH_GATE

WORLD_FEATURE_ID: WF-PRT-LATCH_GATE  
NAME: Latch Gate  
MECHANIC: An extra sealed portal. Adjacent 1 AP arms it. Entering the armed gate rolls a random eligible overworld map and pays a hard `applyRewards` grant. Unarmed, it is not an exit. It is never the only portal.  
PLAYER_DECISION: Spend 1 AP to arm a bonus gamble exit, or take the stable portal you can already see.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic (weight 3)  
VISUAL: Sealed portal with latch glyph, `#2a1a38` wash, glyph flips open when armed.  
SOLVABILITY: Always in addition to a reachable stable portal. Forbidden in dungeon, boss rush, and Death Realm. Unarmed it does not count as an exit.  
COMBAT_RULES: Arm cost is AP. Entry is a portal transition. Bonus via `applyRewards` on the persist lock. Death-realm guards still block entry.  
COUNTERPLAY: Ignore it. The stable exit always works.

### WF-INV-SLEEPING_VANGUARD

WORLD_FEATURE_ID: WF-INV-SLEEPING_VANGUARD  
NAME: Sleeping Vanguard  
MECHANIC: Two extra same-tier elites (hard threat) lie on painted cots. They do not wander. Adjacent contact wakes them and starts a normal battle. Victory pays hard reward multiplier. Exploration: leave without waking. Dungeon / boss rush: they count as hostiles for map-clear.  
PLAYER_DECISION: Give the cots a wide berth, wake them for the hard purse, or (in a run) clear them because the portal will not open.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic  
VISUAL: Two cots, pennants at rest, `#2a2430` wash.  
SOLVABILITY: Cots are floor. Exit reachable without stepping adjacent. Counts as 2 toward `MAX_ENEMIES`.  
COMBAT_RULES: World contact starts a normal battle. Extra spells from `usableByEnemy` only. Victory → `applyRewards`.  
COUNTERPLAY: Stay off the cots in exploration; wake when you want the purse; in a run, fight them.

### WF-ELT-CART_GUARD

WORLD_FEATURE_ID: WF-ELT-CART_GUARD  
NAME: Cart Guard  
MECHANIC: One elite (same-tier × hard) escorts a painted cart one tile per wander along a 5–7 tile path toward a marked departure cell. Touch to fight (hard purse). In exploration, if the cart reaches departure both leave (no fight, no purse). In dungeon / boss rush they do not depart — required for map-clear.  
PLAYER_DECISION: Intercept before they leave, let them depart (exploration), or fight them as a required hostile in a run.  
RELATIVE_DIFFICULTY: hard  
RARITY: rare  
VISUAL: Cart + escort pennant, `#3a2818` wash, departure marker.  
SOLVABILITY: Path is floor. Exit reachable without touching the elite. Counts as 1 enemy. Departure is never a portal and never spawn±3.  
COMBAT_RULES: World contact starts a normal battle. Extra spells from `usableByEnemy` only. Victory → `applyRewards`. Departure does not call `applyRewards`.  
COUNTERPLAY: Stand off the path; intercept far from departure; in exploration, let them go.

### WF-TRS-SPLIT_CACHE

WORLD_FEATURE_ID: WF-TRS-SPLIT_CACHE  
NAME: Split Cache  
MECHANIC: Two adjacent niches. 1 AP opens one and collapses the other. Left: soft `applyRewards`, no guardian. Right: hard `applyRewards`, 50% one same-tier guardian.  
PLAYER_DECISION: Take the sure small purse, gamble the hard niche, or walk past both.  
RELATIVE_DIFFICULTY: medium  
RARITY: uncommon  
VISUAL: Twin niches, `#3a2e10` wash, left slate / right gold trim.  
SOLVABILITY: Adjacent-open, not walls. If no guardian cell, the right niche pays the hard grant with no guardian.  
COMBAT_RULES: AP cost, not a spell. Credits via persist-lock `applyRewards`. Opening one destroys the other — no double grant.  
COUNTERPLAY: Skip both; pick left when wounded; pick right when you can handle a possible extra body.

### WF-SPL-LOANER_MAGE

WORLD_FEATURE_ID: WF-SPL-LOANER_MAGE  
NAME: Loaner Mage  
MECHANIC: One same-tier enemy (medium threat) carries 1 extra `usableByEnemy` spell. Adjacent 1 AP loans that spell id as a **single remaining cast** this map without killing them. Killing them grants the same one-cast if you have not already taken it (does not stack). They stay hostile after a loan.  
PLAYER_DECISION: Spend 1 AP to borrow a one-shot without the kill, kill them for the purse plus the same one-cast, or ignore them.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Enemy with an offered orb, `#1a2438` wash.  
SOLVABILITY: Prefer replacing one existing spawn; else +1 if under the enemy cap. Must stay reachable.  
COMBAT_RULES: Metadata only (`usableByEnemy`, `targetType`, costs). Loan and kill-grant do not call `upgradeSpell` and do not persist `spellLevel*` arrays.  
COUNTERPLAY: Kite and ignore; borrow then leave; kill for the purse if you already hold the cast.

### WF-RSK-STILLNESS_OATH

WORLD_FEATURE_ID: WF-RSK-STILLNESS_OATH  
NAME: Stillness Oath  
MECHANIC: End a turn on the slate inlay to flag this map. While flagged, any player MP spend clears the flag. If the flag is still held at the next `applyRewards`, that credit uses the hard multiplier.  
PLAYER_DECISION: Wager that you can win or leave without walking, or stay unflagged and move freely.  
RELATIVE_DIFFICULTY: hard  
RARITY: epic  
VISUAL: Slate inlay, `#1a1a24` wash, still-air glyph.  
SOLVABILITY: Optional floor tile. Map is solvable if never used.  
COMBAT_RULES: Flag is not a buff spell. Walk and 1 MP tiles clear it. Attack Nearest, AP spells, and summons do not. Multiplier on the next `applyRewards` enqueue only. Death still uses `saveBattleStats`.  
COUNTERPLAY: Skip unless enemies will come to you, a summon can walk, or a portal is already adjacent.

### WF-MOD-SHORT_FUSE

WORLD_FEATURE_ID: WF-MOD-SHORT_FUSE  
NAME: Short Fuse  
MECHANIC: Spells with `cooldown > 0` cannot be cast on round 1 (already expended). Zero-cooldown spells are unchanged. Uses `SpellConfig.cooldown` only — never the spell name.  
PLAYER_DECISION: Open with 0-cooldown spells or Attack Nearest, wait a round, or skip the fight.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Ember wick overlay, `#3a2018` wash, spent-fuse glyph on cooldown spells round 1.  
SOLVABILITY: No tile change. Melee, Attack Nearest, summons, and 0-cooldown kits remain usable.  
COMBAT_RULES: Reads `SpellConfig.cooldown` only. Attack Nearest and summons are not spells. No damage rewrite. Round 2+ uses the normal cooldown clock.  
COUNTERPLAY: Cast 0-cooldown; close to melee; wait one round; refuse the fight.

### WF-EVT-HARVEST_MOON

WORLD_FEATURE_ID: WF-EVT-HARVEST_MOON  
NAME: Harvest Moon  
MECHANIC: This map only: if the player’s current HP never dropped below 70% of max HP, the next `applyRewards` uses the hard multiplier. If it did, that credit is unchanged.  
PLAYER_DECISION: Play a clean fight or skip optional trades for a hard purse, or take damage and accept normal rewards.  
RELATIVE_DIFFICULTY: medium  
RARITY: rare  
VISUAL: Copper corona, `#3a1810` wash, harvest disc at the horizon.  
SOLVABILITY: No blocks. Leaving is always legal.  
COMBAT_RULES: HP checks after challenge recorders and combat. Multipliers on persist-lock `applyRewards` only. Does not rewrite `combatMath`. Death still uses `saveBattleStats`.  
COUNTERPLAY: Leave without fighting; kite and heal to hold 70%; ignore the corona.

### WF-ENV-ISOLATION_CHILL

WORLD_FEATURE_ID: WF-ENV-ISOLATION_CHILL  
NAME: Isolation Chill  
MECHANIC: At the end of each combatant turn, if no other living unit is within 3 Chebyshev tiles, they pay 3% max HP. A painted warm ring of radius 3 sits around every living body.  
PLAYER_DECISION: Clump to stay warm, summon a body to share the ring, or kite alone and pay.  
RELATIVE_DIFFICULTY: hard  
RARITY: uncommon  
VISUAL: Cold wash `#1a2838`, warm rings around bodies, frost at the rim.  
SOLVABILITY: Skip if the map would start with only one living unit so a warm pair cannot exist. Tax is not a wall.  
COMBAT_RULES: End-of-turn challenge HP. Summons count as living units. No skipped turns. No spell-damage change.  
COUNTERPLAY: End turns inside a ring; summon a front-liner; shove a foe to 3 tiles; pay to hold a kite.

---

## Composition examples (same level, different maps)

1. Ember Vein + Banner Patrol + Crosswind — path taxes, a moving elite, slides that can dump you onto the seam.  
2. Shrine Pool + Relic Cache + Low Ceiling — contest a heal, optional chest, linear-spell map.  
3. Creeping Ash + Blood Altar + Ash Rain — two timing taxes plus a voluntary HP spend for rewards.  
4. Fallen Gate + Mirror Step — wait vs long path vs 1 MP skip.  
5. Warband + Eclipse — optional packed melee brawl; leaving is legal.  
6. Salt Crust + Toll Keeper + Echoing Halls — hop-tax paths, a short-path elite, linear echo shots.  
7. Hunting Lantern + Second Wind + Gutter Steam — a chasing orb, an AP refund race, even-round vents.  
8. Tide Door + Slipstream — wait vs long path vs 1 MP one-way skip.  
9. Duelist Circle + Scourge Compact — wait-or-join elites plus a voluntary incoming tax.  
10. Sealed Urn + Pilgrim Banners — biased-coin purse, or leave in peace for a medium portal grant.  
11. Needle Grass + Cart Guard + Short Fuse — camping tax, intercept-or-let-go elite, cooldown spells locked round 1.  
12. Orbiting Cinder + Rally Drum + Isolation Chill — clockwise orb, an MP refund race, clump-or-pay cold.  
13. Spent Bridge + Triune Pads — three-crossing shortcut vs 1 MP carousel skip.  
14. Sleeping Vanguard + Stillness Oath — wake-or-leave elites plus a no-walk reward wager.  
15. Split Cache + Harvest Moon — pick a niche, then hold 70% HP for a hard purse.

None of these require a higher character level. The warband is scarier because it is a larger same-tier pack, not because it is “level 40 content”.

## Implementation gate

Do not wire this into `mapGen.ts`, `WorldExploration.tsx` RAF / turn / damage, or the live 22-modifier registry until a human or orchestrator picks **WDD-2026-08-31-001**, **WDD-2026-09-01-001**, or **WDD-2026-09-02-001**. The catalog and `pickWeightedFeatures` are safe to import from tests and future overlay helpers.
