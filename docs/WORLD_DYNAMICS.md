# World Dynamics Catalog

**Role:** World Dynamics Designer  
**Date:** 2026-08-31  
**Canonical IDs:** `src/frontend/src/engine/worldFeatures.ts`  
**Status:** Designed. Not wired into map generation, the RAF loop, turn advance, or combat damage formulas.

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
| Dungeon / Boss Rush | no Flicker Gate, no Gambit Chest (portal-filter + run integrity) |
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
7. Do not add a second copy of the same `WORLD_FEATURE_ID` on one map.

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

## Composition examples (same level, different maps)

1. Ember Vein + Banner Patrol + Crosswind — path taxes, a moving elite, slides that can dump you onto the seam.  
2. Shrine Pool + Relic Cache + Low Ceiling — contest a heal, optional chest, linear-spell map.  
3. Creeping Ash + Blood Altar + Ash Rain — two timing taxes plus a voluntary HP spend for rewards.  
4. Fallen Gate + Mirror Step — wait vs long path vs 1 MP skip.  
5. Warband + Eclipse — optional packed melee brawl; leaving is legal.

None of these require a higher character level. The warband is scarier because it is a larger same-tier pack, not because it is “level 40 content”.

## Implementation gate

Do not wire this into `mapGen.ts`, `WorldExploration.tsx` RAF / turn / damage, or the live 22-modifier registry until a human or orchestrator picks **WDD-2026-08-31-001**. The catalog and `pickWeightedFeatures` are safe to import from tests and future overlay helpers.
