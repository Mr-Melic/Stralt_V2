/**
 * engine/worldFeatures.ts — World Dynamics catalog (data + pure rolls).
 *
 * Design-only contract for tile, encounter, and event features that keep
 * generating decisions across indefinite progression. Uses rarity weights and
 * relative difficulty versus same-tier content — never player-level cutoffs.
 *
 * This module does NOT generate maps, advance turns, or change combat damage
 * formulas. Placement must run after `evaluateSolvability` / finalize and
 * re-check reachability. Credits stay on `applyRewards`. Hazard HP stays on
 * `recordChallengeDamageTaken` / `recordInBattleChallengeDamage`.
 *
 * Existing systems this catalog does not replace:
 *  - Hazard tiles: lava / ice / spikes (`HazardTileType`)
 *  - 22 map modifiers in `mapModifiers.ts`
 *  - Portals + run filter in `portalRules.ts`
 *  - Ground Doka pickups
 */

import {
  MAX_ENEMIES,
  MAX_HAZARD_TILES,
  WORLD_GRID_SIZE,
} from "../data/gameConstants.ts";
import type { RunMode } from "./portalRules.ts";

/** Matches WorldExploration's spawn exclusion when seeding modifier hazards. */
export const SPAWN_SAFE_RADIUS = 3;

export const MAX_ROLLED_FEATURES = 3;

export type WorldFeatureCategory =
  | "hazard"
  | "moving_hazard"
  | "trap"
  | "destructible_terrain"
  | "temporary_obstacle"
  | "heal_buff_zone"
  | "teleport_tile"
  | "unstable_portal"
  | "rare_invasion"
  | "elite_patrol"
  | "treasure_encounter"
  | "spell_bearing_enemy"
  | "risk_reward"
  | "map_modifier"
  | "world_event"
  | "environmental_combat";

export type WorldFeatureRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export type RelativeDifficulty = "soft" | "medium" | "hard" | "extreme";

export type WorldFeatureSlot = "tile" | "encounter" | "event";

/** Exploration is `RunMode "none"`. Death Realm is always quiet. */
export type WorldFeatureRunMode = "exploration" | "dungeon" | "bossRush";

export type WorldFeatureRewardPath =
  | "applyRewards"
  | "saveBattleStats"
  | "none";

export interface WorldFeatureVisual {
  /** Tile-center glyph. Always paired with tint + tooltip (not color-only). */
  glyph: string;
  /** Carved-slate tile wash (hex). */
  tileTint: string;
  /** Battle-log / banner color. */
  announceColor: string;
  tooltip: string;
}

export interface WorldFeature {
  id: string;
  name: string;
  category: WorldFeatureCategory;
  mechanic: string;
  playerDecision: string;
  relativeDifficulty: RelativeDifficulty;
  rarity: WorldFeatureRarity;
  visual: WorldFeatureVisual;
  solvability: string;
  combatRules: string;
  counterplay: string;
  rewardPath: WorldFeatureRewardPath;
  blocksWalk: boolean;
  requiresBypass: boolean;
  allowedRunModes: WorldFeatureRunMode[];
  slot: WorldFeatureSlot;
  /** Step / tick HP tax as a fraction of the unit's current max HP. */
  hpTaxPctOfMax?: number;
  extraEnemyCount?: { min: number; max: number };
  extraHazardCount?: { min: number; max: number };
  /** Spell extras must come from `SpellConfig.usableByEnemy`, never names. */
  spellSource?: "enemyUsableCatalog";
}

export const RARITY_WEIGHT: Record<WorldFeatureRarity, number> = {
  common: 40,
  uncommon: 20,
  rare: 8,
  epic: 3,
  legendary: 1,
};

/** Threat vs a same-tier baseline. No level gates. */
export const THREAT_MULT: Record<RelativeDifficulty, number> = {
  soft: 0.6,
  medium: 1.0,
  hard: 1.35,
  extreme: 1.75,
};

/** Reward vs the map's normal applyRewards grant. No level gates. */
export const REWARD_MULT: Record<RelativeDifficulty, number> = {
  soft: 1.0,
  medium: 1.25,
  hard: 1.75,
  extreme: 2.5,
};

export const SLOT_ROLL_CHANCE: Record<WorldFeatureSlot, number> = {
  tile: 55,
  encounter: 25,
  event: 15,
};

export type WorldFeatureContext = {
  runMode: RunMode | "deathRealm";
};

const EXPLORATION_ONLY: WorldFeatureRunMode[] = ["exploration"];
const ALL_RUNS: WorldFeatureRunMode[] = ["exploration", "dungeon", "bossRush"];

function visual(
  glyph: string,
  tileTint: string,
  announceColor: string,
  tooltip: string,
): WorldFeatureVisual {
  return { glyph, tileTint, announceColor, tooltip };
}

export const WORLD_FEATURES: WorldFeature[] = [
  {
    id: "WF-HAZ-EMBER_VEIN",
    name: "Ember Vein",
    category: "hazard",
    mechanic:
      "A cracked slate seam glows ember-orange. Stepping on it costs a fraction of current max HP (not a flat lava roll). Walkable. Does not replace lava tiles.",
    playerDecision:
      "Spend MP to path around the seam, or cut through and pay the HP tax.",
    relativeDifficulty: "medium",
    rarity: "common",
    visual: visual(
      "embers",
      "#8a2a12",
      "#ff7b4a",
      "Ember Vein — step tax as % of your max HP",
    ),
    solvability:
      "Never on spawn±3 or portals. Never the only walkable cell in a corridor — veins occupy floor but do not block.",
    combatRules:
      "HP via recordChallengeDamageTaken (explore) or recordInBattleChallengeDamage (in battle). Enemy AI treats it like lava when wounded (ENEMY_HAZARD_AVOID_HP_PCT). Counts toward MAX_HAZARD_TILES.",
    counterplay:
      "Walk around, jump with a teleport spell (metadata targetType ground/self), or send a summon to test the tile.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.04,
    extraHazardCount: { min: 3, max: 6 },
  },
  {
    id: "WF-HAZ-CREEP_MIST",
    name: "Creeping Ash",
    category: "moving_hazard",
    mechanic:
      "A 3-tile ash cloud sits on a painted lane and advances one tile along that lane at the start of each round. Ending a turn inside the cloud pays a max-HP tax.",
    playerDecision:
      "Move now before the cloud arrives, stand just behind it, or lure an enemy into its next cell.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "ash-cloud",
      "#4a3a48",
      "#c8b4c4",
      "Creeping Ash — moves 1 tile each round along the marked lane",
    ),
    solvability:
      "Lane is painted on floor only. Cloud never covers the only portal or spawn. A parallel floor path always remains.",
    combatRules:
      "Advances on round start (not mid-turn). Tax uses in-battle challenge HP. Does not skip turns or spend AP/MP. Occupies hazard budget.",
    counterplay:
      "Read the lane arrows, end turns off-lane, or push/attract a foe onto the next cell (pushback/attract metadata).",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.06,
    extraHazardCount: { min: 3, max: 3 },
  },
  {
    id: "WF-TRP-GLYPH_PLATE",
    name: "Glyph Plate",
    category: "trap",
    mechanic:
      "A carved rune plate is visible from an adjacent tile. The first unit to step on it takes an 8% max-HP spike once, then the plate cracks and becomes floor.",
    playerDecision:
      "Path around, step on it yourself to spend the trap, or bait an enemy onto it.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "rune-plate",
      "#5c1a1a",
      "#e74c3c",
      "Glyph Plate — one-shot %HP trap, visible from adjacent tiles",
    ),
    solvability:
      "Walkable before and after trigger. Never on spawn±3 or portals. Does not seal a path.",
    combatRules:
      "Triggers on step, once. Uses challenge HP recorders. No hidden tiles — adjacent reveal is mandatory. Does not change spell damage math.",
    counterplay:
      "Approach from a side you can see, send a summon first, or shove an enemy onto the plate.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.08,
    extraHazardCount: { min: 1, max: 2 },
  },
  {
    id: "WF-TER-CRUMBLE_PILLAR",
    name: "Crumble Pillar",
    category: "destructible_terrain",
    mechanic:
      "A cracked stone column blocks a cell and line of sight. Any combatant can spend 2 AP on an adjacent attack (no spell required) to shatter it into floor.",
    playerDecision:
      "Spend 2 AP to open a shortcut / LoS, leave it as cover, or force the enemy to waste AP breaking it.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "cracked-column",
      "#3d3a36",
      "#c4b8a4",
      "Crumble Pillar — blocks walk + LoS; 2 AP adjacent to break",
    ),
    solvability:
      "Must not be a cut-vertex: spawn must still flood-fill to a portal with the pillar intact. If a candidate would fail evaluateSolvability, skip the feature.",
    combatRules:
      "Break is an AP spend, not a spell (no name heuristics). After break, tile is floor occupancy. Does not deal damage. Counts as a wall for LoS until broken.",
    counterplay:
      "Ignore it if a bypass exists; break it when the shortcut is worth 2 AP; hide behind it from linear spells.",
    rewardPath: "none",
    blocksWalk: true,
    requiresBypass: true,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
  },
  {
    id: "WF-OBS-FALLEN_GATE",
    name: "Fallen Gate",
    category: "temporary_obstacle",
    mechanic:
      "A rusted portcullis blocks one corridor cell for 2 full rounds, then collapses into floor. A painted timer (2, then 1) sits on the tile.",
    playerDecision:
      "Wait two rounds for the short path, or spend MP on the long way now.",
    relativeDifficulty: "medium",
    rarity: "common",
    visual: visual(
      "portcullis",
      "#4a4038",
      "#d4a574",
      "Fallen Gate — blocks this cell for 2 rounds, then opens",
    ),
    solvability:
      "Place only when a second walkable route from spawn to a portal already exists. Never lock the only exit. After 2 rounds it cannot remain blocking.",
    combatRules:
      "Blocks walk and occupancy like a wall while up. Does not deal damage or spend AP. Timer ticks at round end for everyone.",
    counterplay:
      "Take the long path, wait if you can afford the tempo, or teleport past if a spell's metadata allows freeCells/ground.",
    rewardPath: "none",
    blocksWalk: true,
    requiresBypass: true,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
  },
  {
    id: "WF-ZON-SHRINE_POOL",
    name: "Shrine Pool",
    category: "heal_buff_zone",
    mechanic:
      "A teal basin heals 8% max HP the first time a unit ends its turn on the tile, then dries. Enemies can drink it too.",
    playerDecision:
      "Contest the pool this turn, leave it for a later heal, or deny it by occupying / forcing the enemy off.",
    relativeDifficulty: "soft",
    rarity: "common",
    visual: visual(
      "teal-basin",
      "#1a4a48",
      "#56d364",
      "Shrine Pool — first unit to end a turn here heals 8% max HP",
    ),
    solvability:
      "Walkable floor. Never on spawn or portals. Does not block exits.",
    combatRules:
      "Heal is a zone tick, not a spell. If the drinker is the player, persist the new HP through saveBattleStats on the progress lock (heals are absolute snapshots). Does not call applyRewards.",
    counterplay:
      "Step on it first, shove the enemy off before their end-turn, or ignore it when you are already healthy.",
    rewardPath: "saveBattleStats",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: -0.08,
  },
  {
    id: "WF-ZON-WARD_CIRCLE",
    name: "Ward Circle",
    category: "heal_buff_zone",
    mechanic:
      "A gold inlay ring grants +20% RES while a unit stands on it (lost when they leave). Any side may hold the ring.",
    playerDecision:
      "Plant yourself on the ring for RES, pull the fight onto it, or deny the enemy the tile.",
    relativeDifficulty: "soft",
    rarity: "uncommon",
    visual: visual(
      "gold-ring",
      "#4a3a14",
      "#e3b341",
      "Ward Circle — +20% RES while you stand here (enemies too)",
    ),
    solvability: "Walkable. One cell. Never seals a path.",
    combatRules:
      "RES bonus is a standing-zone modifier, not a buff spell — Null Field does not strip it. Does not change the damage formula; RES is the existing mitigator. No duration after leaving.",
    counterplay:
      "Occupy it, push the holder off, or fight from range so the ring is irrelevant.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
  },
  {
    id: "WF-TEL-MIRROR_STEP",
    name: "Mirror Step",
    category: "teleport_tile",
    mechanic:
      "Two linked cyan glyphs. Entering one for 1 MP (or 1 battle MP) exits the other, facing the same heading. Either side may use the pair.",
    playerDecision:
      "Spend 1 MP to reposition, walk the long way, or leave the pair as an enemy escape.",
    relativeDifficulty: "soft",
    rarity: "uncommon",
    visual: visual(
      "paired-glyphs",
      "#0e4a52",
      "#06b6d4",
      "Mirror Step — spend 1 MP to swap to the paired glyph",
    ),
    solvability:
      "Both glyphs on floor, mutually reachable, never on spawn/portals. The pair is optional — the map is solvable without using it.",
    combatRules:
      "Costs 1 MP from the unit's current MP. Occupancy: destination must be free (or the traveler swaps with a unit already on the exit). Not a teleport spell — do not key off effectCategory.",
    counterplay:
      "Stand on the exit to block or force a swap, ignore the pair, or use it to break melee.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
  },
  {
    id: "WF-PRT-FLICKER_GATE",
    name: "Flicker Gate",
    category: "unstable_portal",
    mechanic:
      "An extra portal with a cracked rim. Entering rolls a random eligible overworld map and pays a bonus applyRewards grant at extreme multiplier. It can dump you onto a harder rolled feature set. It is never the only exit.",
    playerDecision:
      "Take the stable portal you can see, or gamble the flicker for bonus XP/Doka and an unknown next map.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "cracked-portal",
      "#3a1a4a",
      "#bc8cff",
      "Flicker Gate — extra exit; unknown map + bonus rewards",
    ),
    solvability:
      "Always in addition to a reachable stable portal. Forbidden in dungeon, boss rush, and Death Realm (portalRules filter). Never at spawn.",
    combatRules:
      "Entry is a portal transition, not a combat action. Bonus XP/Doka via applyRewards on the persist lock (same as portal +10). Death-realm guards still block entry while armed.",
    counterplay:
      "Ignore it. The stable exit always works. Do not enter while a Death Realm timer is pending.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: true,
    allowedRunModes: EXPLORATION_ONLY,
    slot: "event",
  },
  {
    id: "WF-INV-WARBAND",
    name: "Warband Incursion",
    category: "rare_invasion",
    mechanic:
      "A warhorn announces +3 to +5 extra same-tier enemies (tier spawn config, not a level floor). Stats use the extreme threat multiplier. Clearing them pays extreme reward multiplier.",
    playerDecision:
      "Fight the packed field for a large applyRewards grant, or walk to a portal and leave.",
    relativeDifficulty: "extreme",
    rarity: "legendary",
    visual: visual(
      "war-banner",
      "#5a1212",
      "#ff6b6b",
      "Warband Incursion — extra same-tier pack; leave or fight",
    ),
    solvability:
      "Adds enemies only up to MAX_ENEMIES. Every extra spawn must stay on the flood-fill from player spawn. Never blocks portals. Skip the roll if the roster is already at cap.",
    combatRules:
      "Same combat rules as normal hostiles. Rewards only through applyRewards after victory (no per-kill resolver). Death Realm / pending death guards still block the encounter start.",
    counterplay:
      "Leave through a portal without engaging, kite with summons, or focus the leader if one is flagged.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 3, max: 5 },
  },
  {
    id: "WF-ELT-BANNER_PATROL",
    name: "Banner Patrol",
    category: "elite_patrol",
    mechanic:
      "One elite uses a same-tier template × hard threat. Out of battle it walks a 4–6 tile loop marked by banner dots. Touching it starts combat. Killing it pays hard reward multiplier.",
    playerDecision:
      "Intercept the loop for the elite purse, wait until the patrol is far from the exit, or never touch them.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "banner-dot",
      "#4a2010",
      "#f0883e",
      "Banner Patrol — elite loops the marked path; touch to fight",
    ),
    solvability:
      "Loop tiles are floor. Elite counts as 1 toward MAX_ENEMIES. Exit remains reachable without crossing the loop.",
    combatRules:
      "World contact starts a normal battle (inBattleRef + death guards). Elite spells come only from usableByEnemy catalog. Rewards via applyRewards on victory.",
    counterplay:
      "Stand off the loop, fight when the elite is isolated, or use the loop as a moving blocker for other wanderers.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 1, max: 1 },
    spellSource: "enemyUsableCatalog",
  },
  {
    id: "WF-TRS-RELIC_CACHE",
    name: "Relic Cache",
    category: "treasure_encounter",
    mechanic:
      "A locked chest. Spending 2 AP adjacent opens it: applyRewards grant at medium multiplier, and a 40% chance to spawn one same-tier guardian.",
    playerDecision:
      "Spend 2 AP (and maybe fight a guardian) for the purse, or walk past.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "locked-chest",
      "#3a2e14",
      "#e3b341",
      "Relic Cache — 2 AP to open; may spawn a guardian",
    ),
    solvability:
      "Chest occupies a floor cell but is walkable-adjacent, not a wall. Guardian spawn must be a reachable floor cell; if none, skip the guardian.",
    combatRules:
      "Open cost is AP, not a spell. Credits via applyRewards on the persist lock. Guardian is a normal hostile. Do not write Doka with updateCharacter.",
    counterplay:
      "Skip the chest, open it after the map is clear, or open it when you can spend 2 AP and still act.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 0, max: 1 },
  },
  {
    id: "WF-SPL-RUNE_BEARER",
    name: "Rune Bearer",
    category: "spell_bearing_enemy",
    mechanic:
      "One same-tier enemy carries extra spells drawn from SpellConfig rows with usableByEnemy === true (count 1–3 by rarity roll, not level). On death, the player may attune one of those spell ids for the rest of this map only.",
    playerDecision:
      "Focus the bearer to steal a spell for this map, or ignore them and fight the rest of the pack.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "spell-orb",
      "#2a1a4a",
      "#a371f7",
      "Rune Bearer — kill to attune one of their catalog spells this map",
    ),
    solvability:
      "Replaces one existing spawn when possible; otherwise +1 if under MAX_ENEMIES. Must remain reachable.",
    combatRules:
      "Spell list is metadata-only (usableByEnemy, targetType, costs). Temporary attune does not call upgradeSpell and does not persist spellLevel arrays. Victory rewards still applyRewards.",
    counterplay:
      "Kite and ignore, burst them first, or steal a utility spell then leave.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 0, max: 1 },
    spellSource: "enemyUsableCatalog",
  },
  {
    id: "WF-RSK-BLOOD_ALTAR",
    name: "Blood Altar",
    category: "risk_reward",
    mechanic:
      "A crimson basin. Voluntarily ending a turn on it pays 15% current max HP and flags this map's next applyRewards credit with the hard reward multiplier. One use.",
    playerDecision:
      "Pay HP now for a fatter victory/portal purse, or keep the HP and take normal rewards.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "crimson-basin",
      "#4a1018",
      "#ff7b72",
      "Blood Altar — pay 15% max HP once to multiply this map's rewards",
    ),
    solvability:
      "Optional floor tile. Map remains solvable if never used. Never on spawn/portals.",
    combatRules:
      "HP debit uses challenge recorders. Multiplier applies to the next applyRewards enqueue only (victory or portal +10). Cannot subtract Doka via applyRewards. Death still uses saveBattleStats.",
    counterplay:
      "Skip it. Use it only when you can survive the tax and expect a fight or portal credit.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    hpTaxPctOfMax: 0.15,
  },
  {
    id: "WF-RSK-GAMBIT_CHEST",
    name: "Gambit Chest",
    category: "risk_reward",
    mechanic:
      "A two-lock chest. Safe lock: small applyRewards grant (soft). Risk lock: 50% extreme grant, 50% ambush of 2 same-tier enemies (no grant).",
    playerDecision:
      "Take the small sure purse, pull the risk lock, or walk away.",
    relativeDifficulty: "extreme",
    rarity: "legendary",
    visual: visual(
      "two-lock-chest",
      "#2a2010",
      "#f0883e",
      "Gambit Chest — sure small purse, or 50/50 jackpot vs ambush",
    ),
    solvability:
      "Optional. Ambush spawns only if 2 floor cells remain under MAX_ENEMIES and stay reachable; otherwise the risk lock pays the extreme grant (no soft-lock).",
    combatRules:
      "Both locks credit only through applyRewards. Ambush is a normal encounter. No jackpot mint outside the persist lock.",
    counterplay:
      "Walk away. Pick safe when wounded. Pick risk when you can handle two more same-tier bodies.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: EXPLORATION_ONLY,
    slot: "encounter",
    extraEnemyCount: { min: 0, max: 2 },
  },
  {
    id: "WF-MOD-CROSSWIND",
    name: "Crosswind",
    category: "map_modifier",
    mechanic:
      "After a unit spends MP to move, if the next cell in the painted wind direction is floor and empty, they slide one extra tile at no MP. Hazards on the slide cell resolve normally.",
    playerDecision:
      "Path so the slide carries you toward a target, or stop short so you are not dumped onto ember / lava / spikes.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "dust-streaks",
      "#3a4038",
      "#f9e2af",
      "Crosswind — after a move, slide 1 tile with the painted wind",
    ),
    solvability:
      "Slide cannot leave the walkable graph. Wind never points off the map into void as the only option — a unit can always choose a move that does not slide into a wall.",
    combatRules:
      "Slide is forced movement after a legal MP spend, not a bonus action. Does not change AP costs or damage formulas. Existing ice / slime MP doublers still apply to the paid steps only.",
    counterplay:
      "End the paid path so the next wind cell is a wall (no slide), or aim the slide onto a glyph / shrine / enemy.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
  },
  {
    id: "WF-MOD-LOW_CEILING",
    name: "Low Ceiling",
    category: "map_modifier",
    mechanic:
      "Spells with linear === true keep their metadata range. All other targeted spells lose 1 maxRange (min 1). Uses SpellConfig.linear only — never the spell name.",
    playerDecision:
      "Switch to linear spells, walk closer, or spend MP to a cell that restores LoS/range.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "hanging-stones",
      "#2a2a30",
      "#8b949e",
      "Low Ceiling — non-linear spells −1 range; linear spells unchanged",
    ),
    solvability:
      "Does not alter tiles. Exits unchanged. Melee and linear kits remain fully usable.",
    combatRules:
      "Range clamp reads explicit linear / maxRange / minRange. Summons and Attack Nearest are unaffected (they are not spells). Does not rewrite damage.",
    counterplay:
      "Equip or cast linear spells, close distance, or ignore ranged options this map.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
  },
  {
    id: "WF-EVT-ECLIPSE",
    name: "Eclipse Hour",
    category: "world_event",
    mechanic:
      "This map only: all maxRange −1 (min 1) and all melee adjacency deals +15% of the already-computed hit (post existing RES/SR). Announced with a crimson corona overlay.",
    playerDecision:
      "Close for the melee bonus, hold a kite at the reduced range, or skip fights and leave.",
    relativeDifficulty: "extreme",
    rarity: "legendary",
    visual: visual(
      "corona",
      "#1a0a14",
      "#ff6b6b",
      "Eclipse Hour — shorter range, melee hits harder, this map only",
    ),
    solvability: "No tile blocks. Portals unchanged. Leaving is always legal.",
    combatRules:
      "Range clamp is metadata. The +15% applies to the damage number after the existing formula — it does not replace combatMath. Enemies gain it too. Rewards unchanged unless stacked with an altar/chest.",
    counterplay:
      "Refuse the fight, summon a front-liner, or lean into melee while the corona is up.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: EXPLORATION_ONLY,
    slot: "event",
  },
  {
    id: "WF-ENV-ASH_RAIN",
    name: "Ash Rain",
    category: "environmental_combat",
    mechanic:
      "At the end of each combatant turn, if they are not adjacent to a wall, they pay 3% max HP. Wall-adjacent cells show a shelter hatch.",
    playerDecision:
      "Hug walls for shelter, hold the open center and pay the tax, or shove foes off the wall.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "falling-ash",
      "#3a2820",
      "#d4a574",
      "Ash Rain — 3% max HP unless you end the turn next to a wall",
    ),
    solvability:
      "Does not add walls. If a generated map has no wall-adjacent floor (open arena), skip this feature so shelter exists.",
    combatRules:
      "End-of-turn tax via challenge HP recorders. Does not skip turns. Summons pay it too. Does not alter spell damage.",
    counterplay:
      "End turns on hatched shelter cells, or accept the tax to hold a better angle.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    hpTaxPctOfMax: 0.03,
  },
  {
    id: "WF-ENV-TIDE_SPIKE",
    name: "Tide Spikes",
    category: "environmental_combat",
    mechanic:
      "A 3-tile spike bar on a painted lane shifts one cell along the lane at each round start. Standing on the bar when it arrives pays 5% max HP (spike visual, % tax — not the flat 5–11 spike roll).",
    playerDecision:
      "Stand off-lane, time a cross between pulses, or bait an enemy onto the next bar cells.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "spike-bar",
      "#2a2a28",
      "#cc8800",
      "Tide Spikes — the marked bar advances 1 tile each round",
    ),
    solvability:
      "Lane never includes the only portal or spawn. A floor path around the lane always exists.",
    combatRules:
      "Round-start move, then tax anyone on the new cells. Challenge HP recorders. Counts as 3 toward MAX_HAZARD_TILES. Enemy AI avoids the next bar cells when wounded.",
    counterplay:
      "Read the lane chevrons, cross after it passes, or push a foe onto the incoming bar.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    hpTaxPctOfMax: 0.05,
    extraHazardCount: { min: 3, max: 3 },
  },
];

const FEATURE_BY_ID = new Map<string, WorldFeature>(
  WORLD_FEATURES.map((f) => [f.id, f]),
);

export function getWorldFeature(id: string): WorldFeature | undefined {
  return FEATURE_BY_ID.get(id);
}

export function rarityWeight(rarity: WorldFeatureRarity): number {
  return RARITY_WEIGHT[rarity];
}

export function relativeThreatMultiplier(
  difficulty: RelativeDifficulty,
): number {
  return THREAT_MULT[difficulty];
}

export function relativeRewardMultiplier(
  difficulty: RelativeDifficulty,
): number {
  return REWARD_MULT[difficulty];
}

export function scaleSameTierStat(
  base: number,
  difficulty: RelativeDifficulty,
): number {
  return Math.max(1, Math.round(base * THREAT_MULT[difficulty]));
}

export function scaleReward(
  base: number,
  difficulty: RelativeDifficulty,
): number {
  return Math.max(0, Math.round(base * REWARD_MULT[difficulty]));
}

/**
 * Feature HP/heal tax from current max HP so the pressure stays relevant
 * at any level. Negative pct heals. This does not replace lava/spike rolls.
 */
export function hpTaxFromMax(maxHp: number, pct: number): number {
  if (maxHp <= 0 || pct === 0) return 0;
  const raw = Math.floor(maxHp * pct);
  if (pct > 0) return Math.max(1, raw);
  return Math.min(-1, raw);
}

export function contextToRunMode(
  runMode: WorldFeatureContext["runMode"],
): WorldFeatureRunMode | "deathRealm" {
  if (runMode === "deathRealm") return "deathRealm";
  if (runMode === "none") return "exploration";
  return runMode;
}

export function isFeatureAllowedInContext(
  feature: WorldFeature,
  ctx: WorldFeatureContext,
): boolean {
  const mode = contextToRunMode(ctx.runMode);
  if (mode === "deathRealm") return false;
  return feature.allowedRunModes.includes(mode);
}

export function mustRevalidateSolvability(feature: WorldFeature): boolean {
  return feature.blocksWalk || feature.requiresBypass;
}

export function canAddHazardTiles(existing: number, adding: number): boolean {
  if (adding <= 0) return true;
  return existing + adding <= MAX_HAZARD_TILES;
}

export function canAddEnemies(existing: number, adding: number): boolean {
  if (adding <= 0) return true;
  return existing + adding <= MAX_ENEMIES;
}

export function isTileReservedForSpawnOrPortal(
  tile: { x: number; y: number },
  playerSpawn: { x: number; y: number },
  portals: Array<{ x: number; y: number }>,
): boolean {
  if (
    Math.abs(tile.x - playerSpawn.x) <= SPAWN_SAFE_RADIUS &&
    Math.abs(tile.y - playerSpawn.y) <= SPAWN_SAFE_RADIUS
  ) {
    return true;
  }
  return portals.some((p) => p.x === tile.x && p.y === tile.y);
}

export function isInWorldBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < WORLD_GRID_SIZE && y < WORLD_GRID_SIZE;
}

export function extraEnemyRoll(
  feature: WorldFeature,
  rng: () => number,
): number {
  const band = feature.extraEnemyCount;
  if (!band) return 0;
  if (band.max <= band.min) return band.min;
  return band.min + Math.floor(rng() * (band.max - band.min + 1));
}

export function extraHazardRoll(
  feature: WorldFeature,
  rng: () => number,
): number {
  const band = feature.extraHazardCount;
  if (!band) return 0;
  if (band.max <= band.min) return band.min;
  return band.min + Math.floor(rng() * (band.max - band.min + 1));
}

function featuresForSlot(
  slot: WorldFeatureSlot,
  ctx: WorldFeatureContext,
): WorldFeature[] {
  return WORLD_FEATURES.filter(
    (f) => f.slot === slot && isFeatureAllowedInContext(f, ctx),
  );
}

function pickWeightedFeature(
  pool: WorldFeature[],
  rng: () => number,
): WorldFeature | undefined {
  if (pool.length === 0) return undefined;
  const total = pool.reduce((sum, f) => sum + RARITY_WEIGHT[f.rarity], 0);
  if (total <= 0) return undefined;
  let roll = rng() * total;
  for (const feature of pool) {
    roll -= RARITY_WEIGHT[feature.rarity];
    if (roll < 0) return feature;
  }
  return pool[pool.length - 1];
}

/**
 * Independent slot rolls (tile / encounter / event). Rarity-weighted inside
 * each slot. Death Realm returns []. Never uses player level.
 */
export function pickWeightedFeatures(
  rng: () => number,
  ctx: WorldFeatureContext,
  maxCount: number = MAX_ROLLED_FEATURES,
): WorldFeature[] {
  if (ctx.runMode === "deathRealm") return [];
  const picked: WorldFeature[] = [];
  const used = new Set<string>();
  const slots: WorldFeatureSlot[] = ["tile", "encounter", "event"];
  for (const slot of slots) {
    if (picked.length >= maxCount) break;
    if (rng() * 100 >= SLOT_ROLL_CHANCE[slot]) continue;
    const pool = featuresForSlot(slot, ctx).filter((f) => !used.has(f.id));
    const choice = pickWeightedFeature(pool, rng);
    if (!choice) continue;
    picked.push(choice);
    used.add(choice.id);
  }
  return picked;
}

/** Reserved so implementers cannot silently add level gates later. */
export function featureHasLevelCutoff(feature: WorldFeature): boolean {
  const rec = feature as WorldFeature & {
    minLevel?: unknown;
    maxLevel?: unknown;
    levelMin?: unknown;
    levelGate?: unknown;
  };
  return (
    rec.minLevel != null ||
    rec.maxLevel != null ||
    rec.levelMin != null ||
    rec.levelGate != null
  );
}

export const EXISTING_MAP_MODIFIER_IDS = [
  "slime_flood",
  "paper_windstorm",
  "gravity_well",
  "blood_moon",
  "fog_of_war",
  "thorned_ground",
  "arcane_surge",
  "mirror_field",
  "frozen_terrain",
  "plague_zone",
  "time_warp",
  "void_rift",
  "titans_vigor",
  "arcane_overflow",
  "glass_realm",
  "mending_mist",
  "swift_winds",
  "iron_curse",
  "vampiric_ground",
  "null_field",
  "chaos_initiative",
  "doka_fever",
] as const;
