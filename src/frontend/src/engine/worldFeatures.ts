/**
 * engine/worldFeatures.ts — World Dynamics catalog (data + pure rolls).
 *
 * Design-only contract for tile, encounter, and event features that keep
 * generating decisions across indefinite progression. Uses rarity weights and
 * relative difficulty versus same-tier content — never player-level cutoffs.
 * Wave 1: WDD-2026-08-31-001. Wave 2: WDD-2026-09-01-001.
 * Wave 3: WDD-2026-09-02-001.
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

/** Catalog generation. Omitted `catalogWave` on a feature is wave 1. */
export type CatalogWave = 1 | 2 | 3;

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
  /**
   * Catalog generation. Omitted features are wave 1 (2026-08-31).
   * Later waves add seams; they do not replace earlier ids.
   */
  catalogWave?: CatalogWave;
}

/** Newest designed wave. Overlay wiring still requires a human ACTION_ID pick. */
export const LATEST_CATALOG_WAVE = 3 as const;

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
  {
    id: "WF-HAZ-SALT_CRUST",
    name: "Salt Crust",
    category: "hazard",
    mechanic:
      "Pale salt tiles. The first salt tile entered in a turn is free. Each extra salt tile entered that same turn costs a fraction of current max HP. Walkable. Does not replace ice or lava.",
    playerDecision:
      "Hop on and off after one tile, or pay to traverse a long salt path in a single turn.",
    relativeDifficulty: "medium",
    rarity: "common",
    visual: visual(
      "salt-crust",
      "#5a5648",
      "#e8dcc0",
      "Salt Crust — first salt step free; extra salt steps tax % max HP",
    ),
    solvability:
      "Never on spawn±3 or portals. Never the only walkable cell in a corridor — salt occupies floor but does not block.",
    combatRules:
      "HP via recordChallengeDamageTaken (explore) or recordInBattleChallengeDamage (in battle). Wounded AI treats a second salt step like lava. Counts toward MAX_HAZARD_TILES.",
    counterplay:
      "Step off after one tile, teleport (metadata targetType ground/self), or send a summon to spend the first free step.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.03,
    extraHazardCount: { min: 4, max: 8 },
    catalogWave: 2,
  },
  {
    id: "WF-HAZ-HUNT_LANTERN",
    name: "Hunting Lantern",
    category: "moving_hazard",
    mechanic:
      "A single lantern orb on a floor cell. In battle it steps one tile at round start toward the last unit that spent MP this round (painted facing). Landing on a unit costs a max-HP tax. Out of battle it sits still; walking onto it pays the same tax.",
    playerDecision:
      "Stay still so it does not advance, step off its painted facing, or bait it onto an enemy.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "hunt-lantern",
      "#4a3010",
      "#f0c14a",
      "Hunting Lantern — steps 1 toward the last MP spender each round",
    ),
    solvability:
      "Never starts on spawn±3 or portals. A floor path around the orb always remains. The lantern is not a wall.",
    combatRules:
      "Advances on round start (not mid-turn). Tax uses challenge HP recorders. Does not skip turns or spend AP/MP. Occupies 1 hazard budget.",
    counterplay:
      "Do not spend MP, end off its facing chevron, or push/attract a foe onto its next cell.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.05,
    extraHazardCount: { min: 1, max: 1 },
    catalogWave: 2,
  },
  {
    id: "WF-TRP-PRESSURE_MOSAIC",
    name: "Pressure Mosaic",
    category: "trap",
    mechanic:
      "A visible 2×2 carved mosaic. If two or more units occupy it at the end of a combatant turn, every unit on the mosaic pays a max-HP tax once, then the mosaic cracks into floor.",
    playerDecision:
      "Do not share the mosaic, bait a second body onto it, or detonate it with a summon.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "pressure-mosaic",
      "#3a2418",
      "#c4783a",
      "Pressure Mosaic — two occupants trigger a one-shot %HP crack",
    ),
    solvability:
      "Walkable before and after. Never covers spawn±3 or portals. Does not seal a path.",
    combatRules:
      "End-of-turn occupancy check, once. Uses challenge HP recorders. Always visible — no hidden tiles. Does not change spell damage math.",
    counterplay:
      "Leave before a second unit enters, send a summon to crack it, or shove a foe onto a second cell.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.07,
    extraHazardCount: { min: 4, max: 4 },
    catalogWave: 2,
  },
  {
    id: "WF-TER-CINDER_BARREL",
    name: "Cinder Barrel",
    category: "destructible_terrain",
    mechanic:
      "A barrel blocks walk and LoS. Adjacent: 1 AP to roll it one tile in a chosen cardinal if that cell is empty floor; if the next cell holds a unit the barrel stops and that unit pays a max-HP tax (barrel stays). 2 AP adjacent smashes it to floor.",
    playerDecision:
      "Roll it as a projectile, smash it for the cell, or leave it as cover.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "cinder-barrel",
      "#3a2218",
      "#d4783a",
      "Cinder Barrel — 1 AP roll, 2 AP smash; blocks walk + LoS",
    ),
    solvability:
      "Must not be a cut-vertex with the barrel intact. If a candidate would fail evaluateSolvability, skip the feature. Never on spawn±3 or portals.",
    combatRules:
      "Roll and smash are AP occupancy actions, not spells (no name heuristics). Hit tax uses challenge HP recorders. Does not rewrite combatMath. Counts as a wall for LoS until smashed.",
    counterplay:
      "Ignore it if a bypass exists; smash when the cell is worth 2 AP; roll to tax a stacked foe.",
    rewardPath: "none",
    blocksWalk: true,
    requiresBypass: true,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.05,
    catalogWave: 2,
  },
  {
    id: "WF-OBS-TIDE_DOOR",
    name: "Tide Door",
    category: "temporary_obstacle",
    mechanic:
      "One corridor cell is a wall on odd rounds and floor on even rounds. A painted open/shut glyph flips at round start.",
    playerDecision:
      "Cross on even rounds, wait a round, or spend MP on the always-open long path.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "tide-door",
      "#2a3438",
      "#7eb8c4",
      "Tide Door — shut on odd rounds, open on even; long path always works",
    ),
    solvability:
      "Place only when a second walkable spawn→portal route already exists. Never the only exit. Odd-round block must still leave a path. Never on spawn±3 or portals.",
    combatRules:
      "Wall occupancy while shut. Does not deal damage or spend AP. Flip ticks at round start for everyone. Do not place on the same cell as another blocksWalk feature.",
    counterplay:
      "Wait for even, take the long path, or teleport past if a spell's metadata allows freeCells/ground.",
    rewardPath: "none",
    blocksWalk: true,
    requiresBypass: true,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 2,
  },
  {
    id: "WF-ZON-SECOND_WIND",
    name: "Second Wind",
    category: "heal_buff_zone",
    mechanic:
      "A copper inlay. The first unit to end a turn here this map recovers 1 AP already spent this turn (cannot exceed their max AP). Then the tile dries. Either side may use it.",
    playerDecision:
      "End movement here to cast more this turn, deny the enemy the tile, or ignore it.",
    relativeDifficulty: "soft",
    rarity: "uncommon",
    visual: visual(
      "copper-inlay",
      "#4a3018",
      "#d4a06a",
      "Second Wind — first end-turn here refunds 1 spent AP, then dries",
    ),
    solvability:
      "Walkable floor. Never on spawn or portals. Does not block exits.",
    combatRules:
      "Refunds 1 AP already spent this turn. Not a spell and not a heal — does not call saveBattleStats or applyRewards. Does not raise max AP. Null Field does not strip it (not a buff spell).",
    counterplay:
      "Step on it first, shove the enemy off before their end-turn, or ignore it when you still have AP.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 2,
  },
  {
    id: "WF-TEL-SLIPSTREAM",
    name: "Slipstream",
    category: "teleport_tile",
    mechanic:
      "A one-way pair: cyan arrow A → B. Entering A for 1 MP exits at B. B does not return. If B is occupied, the travelers swap. Either side may use A.",
    playerDecision:
      "Spend 1 MP for a one-way skip, walk the long way, or leave A as an enemy escape toward B.",
    relativeDifficulty: "soft",
    rarity: "uncommon",
    visual: visual(
      "one-way-arrow",
      "#0e3a4a",
      "#3dd6f0",
      "Slipstream — 1 MP A→B only; B does not send you back",
    ),
    solvability:
      "Both tiles on floor, mutually reachable, never on spawn/portals. The pair is optional — the map is solvable without using it.",
    combatRules:
      "Costs 1 MP from the unit's current MP. Occupancy: destination free, or swap with the unit on B. Not a teleport spell — do not key off effectCategory.",
    counterplay:
      "Stand on B to block or force a swap, ignore the pair, or use A to break melee one way.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 2,
  },
  {
    id: "WF-PRT-ECHO_GATE",
    name: "Echo Gate",
    category: "unstable_portal",
    mechanic:
      "An extra portal with a backward-notch rim. Entering returns you to the previous overworld map this session and pays a bonus applyRewards grant at medium multiplier. If there is no previous map, it behaves as a regular portal with no bonus. It is never the only exit.",
    playerDecision:
      "Retreat to the last map for a medium purse, or take the stable forward portal.",
    relativeDifficulty: "medium",
    rarity: "epic",
    visual: visual(
      "echo-portal",
      "#1a2a4a",
      "#7eb8ff",
      "Echo Gate — extra exit; return to the previous map + medium bonus",
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
    catalogWave: 2,
  },
  {
    id: "WF-INV-DUELIST_CIRCLE",
    name: "Duelist Circle",
    category: "rare_invasion",
    mechanic:
      "Two same-tier elites (hard threat) circle a painted ring. Out of battle both lose 8% max HP on each enemy-wander interval. If one hits 0 they vanish. Touching either starts a normal battle at remaining HP. Victory pays hard if both still stood at contact, medium if one already vanished.",
    playerDecision:
      "Wait for a wounded survivor, join early for two purses, or never enter the ring (exploration).",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "duelist-ring",
      "#4a1818",
      "#e06060",
      "Duelist Circle — two elites bleed on the ring; enter or wait",
    ),
    solvability:
      "Ring is floor. Exit reachable without entering the ring. Counts as 2 toward MAX_ENEMIES. Skip if the roster cannot fit 2. In dungeon / boss rush they count as hostiles for map-clear — you cannot ignore them for the progression portal.",
    combatRules:
      "World attrition is not a player fight and does not call applyRewards. Contact starts a normal battle (inBattleRef + death guards). Extra spells from usableByEnemy only. Victory → applyRewards. Their mutual drain does not rewrite combatMath.",
    counterplay:
      "Stay off the ring in exploration; join when one is low; leave the map. In a run, fight the survivor or both.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 2, max: 2 },
    spellSource: "enemyUsableCatalog",
    catalogWave: 2,
  },
  {
    id: "WF-ELT-TOLL_KEEPER",
    name: "Toll Keeper",
    category: "elite_patrol",
    mechanic:
      "One elite (same-tier × hard threat) stands on a painted short-path cell. In exploration: touch to fight, or pay 10% max HP once adjacent to pass this map without combat (the keeper stays non-hostile). A long path bypasses them. In dungeon / boss rush the toll is disabled — they are a normal elite required for map-clear.",
    playerDecision:
      "Fight for the hard purse, pay the toll, or walk the long way.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "toll-keeper",
      "#3a2010",
      "#d4a06a",
      "Toll Keeper — fight, pay 10% max HP to pass, or take the long path",
    ),
    solvability:
      "Place only when a second spawn→portal route already exists. Exit reachable without touching the keeper. Counts as 1 toward MAX_ENEMIES.",
    combatRules:
      "World contact starts a normal battle (inBattleRef + death guards). Toll HP uses challenge recorders, not a spell. Elite spells from usableByEnemy only. Victory → applyRewards. Toll never writes Doka.",
    counterplay:
      "Take the long path, pay the toll when wounded (exploration), or fight when you want the purse.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: true,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 1, max: 1 },
    spellSource: "enemyUsableCatalog",
    catalogWave: 2,
  },
  {
    id: "WF-TRS-SEALED_URN",
    name: "Sealed Urn",
    category: "treasure_encounter",
    mechanic:
      "A sealed urn. Spending 1 AP adjacent opens it: 70% a medium applyRewards grant, 30% a 6% max-HP tax and no grant. No guardian.",
    playerDecision: "Spend 1 AP on a biased coin, or walk past.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "sealed-urn",
      "#3a2a18",
      "#c4a060",
      "Sealed Urn — 1 AP: 70% medium purse, 30% 6% max-HP tax",
    ),
    solvability:
      "Urn occupies a floor cell but is walkable-adjacent, not a wall. Optional. Never on spawn/portals.",
    combatRules:
      "Open cost is AP, not a spell. Success credits only through applyRewards on the persist lock. Fail uses challenge HP recorders. Do not write Doka with updateCharacter.",
    counterplay:
      "Skip the urn, or open it after fights when a 6% miss is cheap.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    hpTaxPctOfMax: 0.06,
    catalogWave: 2,
  },
  {
    id: "WF-SPL-GRIMOIRE_STALKER",
    name: "Grimoire Stalker",
    category: "spell_bearing_enemy",
    mechanic:
      "One same-tier enemy (medium threat) carries 1 extra spell from SpellConfig rows with usableByEnemy === true. On death the player may take that spell id as a single remaining cast this map only — not a full-map attune.",
    playerDecision:
      "Kill the stalker for a one-shot catalog spell, or ignore them.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "grimoire",
      "#241a38",
      "#9b7ae0",
      "Grimoire Stalker — kill for one remaining cast of their extra spell",
    ),
    solvability:
      "Replaces one existing spawn when possible; otherwise +1 if under MAX_ENEMIES. Must remain reachable.",
    combatRules:
      "Spell list is metadata-only (usableByEnemy, targetType, costs). The one-cast does not call upgradeSpell and does not persist spellLevel arrays. Victory rewards still applyRewards.",
    counterplay:
      "Kite and ignore, burst them first, or save the one cast for a key turn.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 0, max: 1 },
    spellSource: "enemyUsableCatalog",
    catalogWave: 2,
  },
  {
    id: "WF-RSK-SCOURGE_COMPACT",
    name: "Scourge Compact",
    category: "risk_reward",
    mechanic:
      "A black inlay. Voluntarily ending a turn on it flags this map: you take +10% of already-computed incoming hits (after existing RES/SR), and the next applyRewards uses the hard multiplier. One flag, this map only. Enemies do not gain the bonus.",
    playerDecision:
      "Accept incoming tax for a fatter purse, or stay unflagged.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "scourge-inlay",
      "#1a1018",
      "#c05070",
      "Scourge Compact — take +10% incoming this map; next rewards × hard",
    ),
    solvability:
      "Optional floor tile. Map remains solvable if never used. Never on spawn/portals.",
    combatRules:
      "The +10% scales the post-formula number — it does not replace combatMath. Multiplier applies to the next applyRewards enqueue only. Death still uses saveBattleStats. Not a buff spell (Null Field does not strip the flag).",
    counterplay:
      "Skip it. Use it only when you can kite, summon a front-liner, or expect a credit worth the incoming tax.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    catalogWave: 2,
  },
  {
    id: "WF-MOD-ECHO_HALL",
    name: "Echoing Halls",
    category: "map_modifier",
    mechanic:
      "Spells with linear === true may continue one extra empty floor cell beyond the first target along the line (metadata range +1 on that axis only). Non-linear spells unchanged. Uses SpellConfig.linear only — never the spell name.",
    playerDecision:
      "Line up shots through empty cells, or hide with your back to a wall so you cannot be echoed.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "echo-teeth",
      "#2a2830",
      "#b8a8c8",
      "Echoing Halls — linear spells reach +1 along empty floor; others unchanged",
    ),
    solvability:
      "Does not alter tiles. Exits unchanged. Melee and non-linear kits remain fully usable.",
    combatRules:
      "Range extension reads explicit linear / maxRange / minRange / targetType. The extra cell must be empty floor. Summons and Attack Nearest are unaffected (they are not spells). Does not rewrite damage.",
    counterplay:
      "Stand with a wall behind you, close to melee, or ignore linear options this map.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    catalogWave: 2,
  },
  {
    id: "WF-EVT-PILGRIM_BANNERS",
    name: "Pilgrim Banners",
    category: "world_event",
    mechanic:
      "This map only: if you leave through a portal without starting any encounter, the portal applyRewards grant uses the medium multiplier. If you start any fight and win, victory uses the hard multiplier. Starting a fight locks the peaceful path.",
    playerDecision:
      "Take a peaceful medium portal purse, or fight for a hard victory purse.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "pilgrim-cloth",
      "#2a2418",
      "#d4c090",
      "Pilgrim Banners — leave in peace for medium, or fight for hard rewards",
    ),
    solvability:
      "No tile blocks. Portals unchanged. Leaving is always legal. Forbidden in dungeon, boss rush, and Death Realm (run maps require a clear).",
    combatRules:
      "Multipliers apply only to persist-lock applyRewards. inBattleRef true locks the peaceful path. Does not rewrite combatMath. Death still uses saveBattleStats.",
    counterplay:
      "Leave immediately, or fight if you want the hard purse. Ignore banners in either case.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: EXPLORATION_ONLY,
    slot: "event",
    catalogWave: 2,
  },
  {
    id: "WF-ENV-GUTTER_STEAM",
    name: "Gutter Steam",
    category: "environmental_combat",
    mechanic:
      "Two painted vent tiles. On even rounds they jet (visible steam); occupying a jetting vent at end of turn costs a max-HP tax. Odd rounds they are inert floor. A painted even/odd pip sits on each vent.",
    playerDecision:
      "Cross vents on odd rounds, hold off them on even, or bait a foe onto a jetting vent.",
    relativeDifficulty: "hard",
    rarity: "uncommon",
    visual: visual(
      "gutter-vent",
      "#2a2820",
      "#c8b090",
      "Gutter Steam — vents jet on even rounds; odd rounds are safe",
    ),
    solvability:
      "Vents never include the only portal or spawn. A floor path around the vents always exists.",
    combatRules:
      "End-of-turn tax when the round is even. Challenge HP recorders. Counts as 2 toward MAX_HAZARD_TILES. Wounded AI avoids vents on even rounds. Does not alter spell damage.",
    counterplay:
      "Read the even/odd pip, stand off on even, or shove a foe onto a jetting vent.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    hpTaxPctOfMax: 0.04,
    extraHazardCount: { min: 2, max: 2 },
    catalogWave: 2,
  },
  {
    id: "WF-HAZ-NEEDLE_GRASS",
    name: "Needle Grass",
    category: "hazard",
    mechanic:
      "Pale-green barbs on floor tiles. Walking through is free. Ending a turn on a needle tile costs a fraction of current max HP. Walkable. Does not replace lava, ice, ember, or salt.",
    playerDecision:
      "Cut through and keep moving, camp on the barbs and pay, or spend MP to end off the grass.",
    relativeDifficulty: "medium",
    rarity: "common",
    visual: visual(
      "needle-grass",
      "#2a3a18",
      "#8cb86a",
      "Needle Grass — walk-through free; ending a turn here taxes % max HP",
    ),
    solvability:
      "Never on spawn±3 or portals. Never the only walkable cell in a corridor — grass occupies floor but does not block.",
    combatRules:
      "HP via recordChallengeDamageTaken (explore) or recordInBattleChallengeDamage (in battle). Wounded AI treats ending a turn on grass like lava. Counts toward MAX_HAZARD_TILES.",
    counterplay:
      "End the turn on adjacent floor, teleport (metadata targetType ground/self), or send a summon to hold the cell.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.04,
    extraHazardCount: { min: 4, max: 8 },
    catalogWave: 3,
  },
  {
    id: "WF-HAZ-ORBIT_CINDER",
    name: "Orbiting Cinder",
    category: "moving_hazard",
    mechanic:
      "A cinder orb occupies one cell of a painted 4-tile square and steps one cell clockwise at each round start. Landing on a unit costs a max-HP tax. Out of battle it still orbits on wander ticks.",
    playerDecision:
      "Stand in the hollow of the square, time a cross after it passes, or bait an enemy onto the next cell.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "orbit-cinder",
      "#5a2810",
      "#f07830",
      "Orbiting Cinder — clockwise on the marked square; landing tax % max HP",
    ),
    solvability:
      "Square is floor only. Never covers spawn±3 or the only portal. A floor path around the square always remains. The cinder is not a wall.",
    combatRules:
      "Advances on round start (not mid-turn). Tax uses challenge HP recorders. Does not skip turns or spend AP/MP. Occupies 1 hazard budget (the orb); painted track is visual only.",
    counterplay:
      "Stand off the painted square, end off the next clockwise cell, or push/attract a foe onto that cell.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.05,
    extraHazardCount: { min: 1, max: 1 },
    catalogWave: 3,
  },
  {
    id: "WF-TRP-CHEVRON_PLATE",
    name: "Chevron Plate",
    category: "trap",
    mechanic:
      "A visible rune plate with a painted chevron. Stepping onto it from the chevron's facing is free. Stepping onto it from any other side costs a max-HP tax once, then the plate becomes floor.",
    playerDecision:
      "Approach from the marked side, spend MP to go around, or bait an enemy from the wrong side.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "chevron-plate",
      "#4a1818",
      "#e06050",
      "Chevron Plate — safe from the chevron; other approaches one-shot %HP",
    ),
    solvability:
      "Walkable before and after. Never on spawn±3 or portals. Does not seal a path. Chevron always visible from adjacent tiles.",
    combatRules:
      "Triggers on step from a non-facing side, once. Uses challenge HP recorders. No hidden tiles. Does not change spell damage math.",
    counterplay:
      "Enter from the chevron, send a summon from the unsafe side, or shove an enemy onto it from a flank.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    hpTaxPctOfMax: 0.08,
    extraHazardCount: { min: 1, max: 2 },
    catalogWave: 3,
  },
  {
    id: "WF-TER-FROST_PANE",
    name: "Frost Pane",
    category: "destructible_terrain",
    mechanic:
      "A sheet of carved ice occupies a cell: units may walk through it, but it blocks line of sight. Adjacent: 1 AP (no spell) smashes it to clear floor.",
    playerDecision:
      "Spend 1 AP for LoS, hide behind the pane, or walk through and accept the blind.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "frost-pane",
      "#2a3a48",
      "#8ec8e0",
      "Frost Pane — walkable LoS block; 1 AP adjacent to smash",
    ),
    solvability:
      "Does not block walk. Never on spawn±3 or portals. Smash is optional — the map is solvable with the pane intact.",
    combatRules:
      "Smash is an AP occupancy action, not a spell (no name heuristics). No damage. Counts as a wall for LoS until smashed. Walk occupancy is floor.",
    counterplay:
      "Ignore it and walk through; smash when a linear shot is worth 1 AP; stand behind it against linear spells.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 3,
  },
  {
    id: "WF-OBS-SPENT_BRIDGE",
    name: "Spent Bridge",
    category: "temporary_obstacle",
    mechanic:
      "A short-path floor cell with three painted pips. Each time a unit leaves the cell, one pip burns. After three crossings the cell becomes a wall for the rest of the map.",
    playerDecision:
      "Burn crossings on the short path now, save pips for a later retreat, or never use it and keep the long path.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "spent-bridge",
      "#3a3020",
      "#c4a070",
      "Spent Bridge — three crossings, then this cell walls off",
    ),
    solvability:
      "Place only when a second spawn→portal route already exists. Evaluate solvability as if the bridge were already a wall. Never the only exit. Never on spawn±3 or portals.",
    combatRules:
      "Walkable until the third leave. Then wall occupancy. No damage. Pip count is shared (any unit's leave spends a pip). Do not place on the same cell as another blocksWalk feature.",
    counterplay:
      "Take the long path, spend the three crossings when tempo matters, or teleport past if metadata allows.",
    rewardPath: "none",
    blocksWalk: true,
    requiresBypass: true,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 3,
  },
  {
    id: "WF-ZON-RALLY_DRUM",
    name: "Rally Drum",
    category: "heal_buff_zone",
    mechanic:
      "A bronze drum inlay. The first unit to end a turn here this map recovers 1 MP already spent this turn (cannot exceed their max MP). Then the tile dries. Either side may use it.",
    playerDecision:
      "End movement here to walk farther this turn, deny the enemy the tile, or ignore it.",
    relativeDifficulty: "soft",
    rarity: "uncommon",
    visual: visual(
      "rally-drum",
      "#3a2810",
      "#d4a06a",
      "Rally Drum — first end-turn here refunds 1 spent MP, then dries",
    ),
    solvability:
      "Walkable floor. Never on spawn or portals. Does not block exits.",
    combatRules:
      "Refunds 1 MP already spent this turn. Not a spell and not a heal — does not call saveBattleStats or applyRewards. Does not raise max MP. Null Field does not strip it (not a buff spell).",
    counterplay:
      "Step on it first, shove the enemy off before their end-turn, or ignore it when you still have MP.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 3,
  },
  {
    id: "WF-TEL-TRIUNE_PADS",
    name: "Triune Pads",
    category: "teleport_tile",
    mechanic:
      "Three linked cyan pads painted 1→2→3→1. Entering a pad for 1 MP exits at the next clockwise pad. If that pad is occupied, the travelers swap. Either side may use any pad.",
    playerDecision:
      "Spend 1 MP to rotate positions, walk, or leave a pad as an enemy carousel.",
    relativeDifficulty: "soft",
    rarity: "uncommon",
    visual: visual(
      "triune-pads",
      "#0e2a42",
      "#4ad4f0",
      "Triune Pads — 1 MP cycles you to the next clockwise pad",
    ),
    solvability:
      "All three on floor, mutually reachable, never on spawn/portals. The trio is optional — the map is solvable without using it.",
    combatRules:
      "Costs 1 MP from the unit's current MP. Occupancy: destination free, or swap with the unit on the next pad. Not a teleport spell — do not key off effectCategory.",
    counterplay:
      "Stand on the next clockwise pad to block or force a swap, ignore the trio, or use it to break melee.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "tile",
    catalogWave: 3,
  },
  {
    id: "WF-PRT-LATCH_GATE",
    name: "Latch Gate",
    category: "unstable_portal",
    mechanic:
      "An extra sealed portal with a latch glyph. Adjacent 1 AP arms it (the glyph flips open). Entering the armed gate rolls a random eligible overworld map and pays a hard applyRewards grant. Unarmed, it is not an exit. It is never the only portal on the map.",
    playerDecision:
      "Spend 1 AP to arm a bonus gamble exit, or take the stable portal you can already see.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "latch-portal",
      "#2a1a38",
      "#c090ff",
      "Latch Gate — 1 AP to arm; then unknown map + hard bonus",
    ),
    solvability:
      "Always in addition to a reachable stable portal. Forbidden in dungeon, boss rush, and Death Realm (portalRules filter). Never at spawn. Unarmed it does not count as an exit.",
    combatRules:
      "Arm cost is AP, not a spell. Entry is a portal transition, not a combat action. Bonus XP/Doka via applyRewards on the persist lock (same as portal +10). Death-realm guards still block entry while armed.",
    counterplay:
      "Ignore it. The stable exit always works. Do not arm or enter while a Death Realm timer is pending.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: true,
    allowedRunModes: EXPLORATION_ONLY,
    slot: "event",
    catalogWave: 3,
  },
  {
    id: "WF-INV-SLEEPING_VANGUARD",
    name: "Sleeping Vanguard",
    category: "rare_invasion",
    mechanic:
      "Two extra same-tier enemies (hard threat) lie on painted cots. They do not wander. Adjacent contact wakes them and starts a normal battle. Victory pays hard reward multiplier. Exploration: you may leave without waking them. Dungeon / boss rush: they count as hostiles for map-clear.",
    playerDecision:
      "Give the cots a wide berth, wake them for the hard purse, or (in a run) clear them because the portal will not open.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "sleeping-cots",
      "#2a2430",
      "#c08090",
      "Sleeping Vanguard — two elites on cots; touch to wake, or leave",
    ),
    solvability:
      "Cots are floor. Exit reachable without stepping adjacent. Counts as 2 toward MAX_ENEMIES. Skip if the roster cannot fit 2.",
    combatRules:
      "World contact starts a normal battle (inBattleRef + death guards). Extra spells from usableByEnemy only. Victory → applyRewards. Sleeping is not a skipped turn and does not rewrite combatMath.",
    counterplay:
      "Stay off the cots in exploration; wake when you want the purse. In a run, fight them — they are required for clear.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 2, max: 2 },
    spellSource: "enemyUsableCatalog",
    catalogWave: 3,
  },
  {
    id: "WF-ELT-CART_GUARD",
    name: "Cart Guard",
    category: "elite_patrol",
    mechanic:
      "One elite (same-tier × hard threat) escorts a painted cart one tile per wander along a 5–7 tile path toward a marked departure cell. Touching the elite starts combat. Kill pays hard reward multiplier. In exploration, if the cart reaches departure both leave (no fight, no purse). In dungeon / boss rush they do not depart — required for map-clear.",
    playerDecision:
      "Intercept before they leave, let them depart (exploration), or fight them as a required hostile in a run.",
    relativeDifficulty: "hard",
    rarity: "rare",
    visual: visual(
      "cart-guard",
      "#3a2818",
      "#d49860",
      "Cart Guard — elite escorts a cart to departure; intercept or let go",
    ),
    solvability:
      "Path is floor. Exit reachable without touching the elite. Counts as 1 toward MAX_ENEMIES. Departure cell is never a portal and never spawn±3.",
    combatRules:
      "World contact starts a normal battle (inBattleRef + death guards). Elite spells from usableByEnemy only. Victory → applyRewards. Departure is exploration-only and does not call applyRewards.",
    counterplay:
      "Stand off the path; intercept when the cart is far from departure; in exploration, let them go. In a run, they cannot leave.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 1, max: 1 },
    spellSource: "enemyUsableCatalog",
    catalogWave: 3,
  },
  {
    id: "WF-TRS-SPLIT_CACHE",
    name: "Split Cache",
    category: "treasure_encounter",
    mechanic:
      "Two adjacent niches. Spending 1 AP adjacent to either opens that niche and collapses the other. Left: soft applyRewards, no guardian. Right: hard applyRewards, 50% chance of one same-tier guardian.",
    playerDecision:
      "Take the sure small purse, gamble the hard niche, or walk past both.",
    relativeDifficulty: "medium",
    rarity: "uncommon",
    visual: visual(
      "split-cache",
      "#3a2e10",
      "#e0c070",
      "Split Cache — pick left (soft, safe) or right (hard, maybe guardian)",
    ),
    solvability:
      "Both niches occupy floor but are walkable-adjacent, not walls. Guardian spawn must be a reachable floor cell; if none, the right niche pays the hard grant with no guardian.",
    combatRules:
      "Open cost is AP, not a spell. Credits via applyRewards on the persist lock. Guardian is a normal hostile. Do not write Doka with updateCharacter. Opening one destroys the other — no double grant.",
    counterplay:
      "Skip both, pick left when wounded, pick right when you can handle a possible extra body.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 0, max: 1 },
    catalogWave: 3,
  },
  {
    id: "WF-SPL-LOANER_MAGE",
    name: "Loaner Mage",
    category: "spell_bearing_enemy",
    mechanic:
      "One same-tier enemy (medium threat) carries 1 extra SpellConfig row with usableByEnemy === true. Adjacent 1 AP loans that spell id as a single remaining cast this map without killing them. Killing them grants the same one-cast if you have not already taken it (does not stack). They stay hostile after a loan.",
    playerDecision:
      "Spend 1 AP to borrow a one-shot without the kill, kill them for the purse plus the same one-cast, or ignore them.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "loaner-mage",
      "#1a2438",
      "#7aa0e0",
      "Loaner Mage — 1 AP adjacent to borrow one cast; they stay hostile",
    ),
    solvability:
      "Replaces one existing spawn when possible; otherwise +1 if under MAX_ENEMIES. Must remain reachable.",
    combatRules:
      "Spell list is metadata-only (usableByEnemy, targetType, costs). Loan and kill-grant do not call upgradeSpell and do not persist spellLevel arrays. Victory rewards still applyRewards. Loan is AP, not a spell.",
    counterplay:
      "Kite and ignore, borrow then leave, or kill for the purse if you already hold the cast.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    extraEnemyCount: { min: 0, max: 1 },
    spellSource: "enemyUsableCatalog",
    catalogWave: 3,
  },
  {
    id: "WF-RSK-STILLNESS_OATH",
    name: "Stillness Oath",
    category: "risk_reward",
    mechanic:
      "A slate inlay. Voluntarily ending a turn on it flags this map. While flagged, any MP spend by the player clears the flag. If the flag is still held at the next applyRewards, that credit uses the hard multiplier. One flag, this map only.",
    playerDecision:
      "Wager that you can win or leave without walking, or stay unflagged and move freely.",
    relativeDifficulty: "hard",
    rarity: "epic",
    visual: visual(
      "stillness-inlay",
      "#1a1a24",
      "#9090c0",
      "Stillness Oath — no MP this map after the flag; next rewards × hard",
    ),
    solvability:
      "Optional floor tile. Map remains solvable if never used. Never on spawn/portals. The map is solvable without standing still.",
    combatRules:
      "Flag is not a buff spell (Null Field does not strip it). MP spends (walk or 1 MP tiles) clear it. Attack Nearest, AP spells, and summons do not clear it. Multiplier applies to the next applyRewards enqueue only. Death still uses saveBattleStats.",
    counterplay:
      "Skip it. Use it only when enemies will come to you, a summon can walk, or a portal is already adjacent.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "encounter",
    catalogWave: 3,
  },
  {
    id: "WF-MOD-SHORT_FUSE",
    name: "Short Fuse",
    category: "map_modifier",
    mechanic:
      "This map only: any spell whose SpellConfig.cooldown is greater than 0 cannot be cast on round 1 (it is already expended). Zero-cooldown spells are unchanged. Uses the cooldown field only — never the spell name.",
    playerDecision:
      "Open with 0-cooldown spells or Attack Nearest, wait a round for cooldowns, or skip the fight.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "short-fuse",
      "#3a2018",
      "#e08050",
      "Short Fuse — cooldown spells locked on round 1; 0-cooldown unchanged",
    ),
    solvability:
      "Does not alter tiles. Exits unchanged. Melee, Attack Nearest, summons, and 0-cooldown kits remain fully usable.",
    combatRules:
      "Reads SpellConfig.cooldown only. Summons and Attack Nearest are unaffected (they are not spells). Does not rewrite damage. Round 2+ uses the spell's normal cooldown clock.",
    counterplay:
      "Cast 0-cooldown spells, close to melee, wait one round, or refuse the fight.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    catalogWave: 3,
  },
  {
    id: "WF-EVT-HARVEST_MOON",
    name: "Harvest Moon",
    category: "world_event",
    mechanic:
      "This map only: if the player's current HP never dropped below 70% of max HP, the next applyRewards uses the hard multiplier. If it did drop below 70%, that credit is unchanged. Announced with a copper corona overlay.",
    playerDecision:
      "Play a clean fight or skip optional trades for a hard purse, or take damage and accept normal rewards.",
    relativeDifficulty: "medium",
    rarity: "rare",
    visual: visual(
      "harvest-moon",
      "#3a1810",
      "#e09050",
      "Harvest Moon — stay at or above 70% HP this map for hard rewards",
    ),
    solvability: "No tile blocks. Portals unchanged. Leaving is always legal.",
    combatRules:
      "HP checks use current/max after challenge recorders and combat. Multiplier applies only to persist-lock applyRewards. Does not rewrite combatMath. Death still uses saveBattleStats. Optional — never forces a fight.",
    counterplay:
      "Leave without fighting (HP never dipped), kite and heal to hold 70%, or ignore the corona and take normal rewards.",
    rewardPath: "applyRewards",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    catalogWave: 3,
  },
  {
    id: "WF-ENV-ISOLATION_CHILL",
    name: "Isolation Chill",
    category: "environmental_combat",
    mechanic:
      "At the end of each combatant turn, if no other living unit is within 3 Chebyshev tiles, they pay 3% max HP. A painted warm ring of radius 3 sits around every living body.",
    playerDecision:
      "Clump to stay warm, summon a body to share the ring, or kite alone and pay.",
    relativeDifficulty: "hard",
    rarity: "uncommon",
    visual: visual(
      "isolation-chill",
      "#1a2838",
      "#80c0d4",
      "Isolation Chill — 3% max HP unless another unit is within 3 tiles",
    ),
    solvability:
      "Does not add walls. Skip if the map would start with only one living unit so a warm pair cannot exist. Rings never cover the only portal as a block (the tax is not a wall).",
    combatRules:
      "End-of-turn tax via challenge HP recorders. Summons count as living units. Does not skip turns. Does not alter spell damage. Wounded AI prefers ending inside a painted ring when a legal move exists.",
    counterplay:
      "End turns inside a ring, summon a front-liner, shove a foe to 3 tiles, or pay to hold a kite.",
    rewardPath: "none",
    blocksWalk: false,
    requiresBypass: false,
    allowedRunModes: ALL_RUNS,
    slot: "event",
    hpTaxPctOfMax: 0.03,
    catalogWave: 3,
  },
];

const FEATURE_BY_ID = new Map<string, WorldFeature>(
  WORLD_FEATURES.map((f) => [f.id, f]),
);

export function getWorldFeature(id: string): WorldFeature | undefined {
  return FEATURE_BY_ID.get(id);
}

/** Omitted `catalogWave` is wave 1. */
export function featureCatalogWave(feature: WorldFeature): CatalogWave {
  return feature.catalogWave ?? 1;
}

export function featuresInCatalogWave(wave: CatalogWave): WorldFeature[] {
  return WORLD_FEATURES.filter((f) => featureCatalogWave(f) === wave);
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
