/**
 * bossTypes.ts — All TypeScript types for the Paper Baby Vampires boss system.
 * Imported by useBossSystem.ts, useBossAI.ts, and WorldExploration.tsx.
 */

import type { ChessPieceType, Enemy, SpellConfig } from "./gameTypes";

// ── Boss Ability Tags ─────────────────────────────────────────────────────────

export enum BossAbility {
  REFLECT_SHIELD = "REFLECT_SHIELD",
  SPAWN_MINIONS = "SPAWN_MINIONS",
  LAVA_TRAIL = "LAVA_TRAIL",
  TELEPORT_ADJACENT = "TELEPORT_ADJACENT",
  ILLUSION_SPLIT = "ILLUSION_SPLIT",
  KNIGHT_JUMP_IGNORE_WALLS = "KNIGHT_JUMP_IGNORE_WALLS",
  SPIKE_ON_LAND = "SPIKE_ON_LAND",
  CURSE_ON_HIT = "CURSE_ON_HIT",
  PROMOTE_QUEEN = "PROMOTE_QUEEN",
  ATTACK_ALL_LINES = "ATTACK_ALL_LINES",
  VOID_TILES = "VOID_TILES",
  COMPOUNDING_ROT = "COMPOUNDING_ROT",
  SPLIT_ROOKS = "SPLIT_ROOKS",
  ADVANCE_PER_TURN = "ADVANCE_PER_TURN",
  AP_DRAIN = "AP_DRAIN",
  TWIN_FLANK = "TWIN_FLANK",
  MERGE_BISHOPS = "MERGE_BISHOPS",
  MAGIC_REFLECT = "MAGIC_REFLECT",
  LARVAE_SPAWN = "LARVAE_SPAWN",
  SHELL_ARMOR = "SHELL_ARMOR",
  LARVAE_EXPLODE = "LARVAE_EXPLODE",
  SHOCK_TILES = "SHOCK_TILES",
  CHAIN_LIGHTNING = "CHAIN_LIGHTNING",
  INVINCIBLE_PHASE = "INVINCIBLE_PHASE",
  GHOST_SUMMON = "GHOST_SUMMON",

  // ── New abilities for bosses 13-20 ──
  RESONANCE_SHOCKWAVE = "RESONANCE_SHOCKWAVE",
  BOARD_SHRINK = "BOARD_SHRINK",
  MAP_ROTATE = "MAP_ROTATE",
  MIRROR_INVERT = "MIRROR_INVERT",
  BOARD_CLAIM = "BOARD_CLAIM",
  SPELL_MIRROR = "SPELL_MIRROR",
  COMBO_REPLAY = "COMBO_REPLAY",
  LIFE_DRAIN = "LIFE_DRAIN",
  VAMPIRIC_AOE = "VAMPIRIC_AOE",
  EXSANGUINATED_DEBUFF = "EXSANGUINATED_DEBUFF",
  INK_VEIL = "INK_VEIL",
  SCROLL_SUMMON = "SCROLL_SUMMON",
  GLYPH_TRAP = "GLYPH_TRAP",
  PAGES_OF_DOOM = "PAGES_OF_DOOM",
  DAWN_BUFF = "DAWN_BUFF",
  DUSK_DOT = "DUSK_DOT",
  MONARCH_ABSORB = "MONARCH_ABSORB",
  ANCHOR_TILES = "ANCHOR_TILES",
  PHANTOM_SPAWN = "PHANTOM_SPAWN",
  AP_DRAIN_PASSIVE = "AP_DRAIN_PASSIVE",
  DAMAGE_IMMUNE = "DAMAGE_IMMUNE",
}

// ── Phase config ──────────────────────────────────────────────────────────────

export interface BossPhaseConfig {
  /** Which phase number this config describes (1 or 2). */
  phaseNumber: 1 | 2;
  /** HP fraction threshold to trigger this phase (0–1). Phase 2 triggers when current HP / maxHp <= threshold. */
  hpThreshold: number;
  /** Stat multiplier applied when phase transitions. */
  statMultiplier: number;
  /** Spell pool IDs available in this phase. */
  spellPoolIds: string[];
  /** Special abilities active in this phase. */
  specialAbilities: BossAbility[];
  /** How many minions to summon when a SPAWN_MINIONS ability fires (0 = none). */
  summonCount: number;
}

// ── Static boss definition ────────────────────────────────────────────────────

export interface BossBaseStats {
  hp: number;
  ap: number;
  mp: number;
  atk: number;
  res: number;
  sp: number;
  init: number;
  chc: number;
}

export interface BossConfig {
  id: string;
  name: string;
  pieceType: ChessPieceType;
  baseStats: BossBaseStats;
  phase1: BossPhaseConfig;
  phase2: BossPhaseConfig;
  /** OKLCH color string for the boss map's tile palette. */
  bossMapColor: string;
  /** Portal color that leads to this boss map. */
  portalColor: string;
  /** Doka drop multiplier on boss death (applied to base Doka formula). */
  rewardDokaMultiplier: number;
  /** XP gain multiplier on boss death. */
  rewardXpMultiplier: number;
  /** Emoji used for boss icon in UI and initiative strip. */
  iconEmoji: string;
  /** Flavour description shown in the battle log. */
  loreText: string;
}

// ── Runtime illusion state (Void Grandmaster) ─────────────────────────────────

export interface IllusionData {
  id: string;
  x: number;
  y: number;
  /** HP value. Scales with phase 2 stat multiplier for the real copy. */
  hp: number;
  /** Max HP value (same as hp at creation, scales with phase multiplier). */
  maxHp: number;
  /** Only the real Grandmaster takes full damage. */
  isReal: boolean;
}

// ── Shock tile (Lord of Static) ───────────────────────────────────────────────

export interface ShockTile {
  x: number;
  y: number;
  /** Battle turn when this tile was created, for cleanup. */
  turnCreated: number;
  /** When true, chain lightning is spreading from this tile. */
  chainLightningActive: boolean;
}

// ── Void tile (Starborn Queen) ────────────────────────────────────────────────

export interface VoidTile {
  x: number;
  y: number;
}

// ── Larva (Broodmother Rook) ─────────────────────────────────────────────────

export interface LarvaData {
  id: string;
  x: number;
  y: number;
  /** Always 1. Larvae die in one hit. */
  hp: 1;
  /** If true, this larva explodes for poison DoT on contact. */
  poisoned: boolean;
}

// ── Runtime boss state ────────────────────────────────────────────────────────

export interface BossState {
  bossId: string;
  currentPhase: 1 | 2;
  phase2Triggered: boolean;

  // -- Void Grandmaster --
  illusions: IllusionData[];

  // -- Lord of Static --
  activeShockTiles: ShockTile[];
  /** Generation counter incremented whenever shock tiles are wiped — kills stale animations. */
  shockTileGeneration: number;

  // -- Starborn Queen --
  activeVoidTiles: VoidTile[];

  // -- Broodmother Rook --
  larvae: LarvaData[];

  // -- Fetid Rook --
  rotStacks: number;
  splitRooksSpawned: boolean;

  // -- Final Pawn --
  ghostsSpawned: boolean;
  invincibleTurnsLeft: number;

  // -- Eternal Pawn King --
  eternalPawnPosition: { x: number; y: number } | null;

  // -- Pale Archbishop --
  reflectShieldActive: boolean;
  reflectShieldTurnsLeft: number;

  // -- Midnight Bishop (merged state) --
  bishopsMerged: boolean;
  magicReflectActive: boolean;

  // -- Shell Armor (Broodmother Rook) --
  shellArmorActive: boolean;

  // -- Accumulated hazard tiles (lava, spikes, void) — capped at 50 --
  hazardTiles: Array<{
    x: number;
    y: number;
    type: "lava" | "spikes" | "void";
  }>;

  // -- Alabaster Fortress (boss 13) --
  resonanceCounter?: number;
  resonanceDamageAccumulated?: number;

  // -- Mirror Sovereign (boss 16) --
  mirroredSpellBuffer?: Array<{
    spellId: string;
    power: number;
    range: number;
  }>;
  lastThreeTurnsMirror?: Array<Array<{ spellId: string; power: number }>>;

  // -- Enthroned Void (boss 20) --
  anchorsDestroyed?: number;
  glyphedTiles?: Array<{ x: number; y: number; turnsLeft: number }>;

  // -- Chessboard Lich (boss 14) --
  boardClaimZone?: { x: number; y: number } | null;

  // -- Twin Monarchs (boss 19) --
  monarchAbsorbed?: boolean;
  monarchKilledFirst?: "dawn" | "dusk" | null;

  // -- Starved Vampire Pawn (boss 17) --
  vampirePawnStartHP?: number;
  vampirePawnDrainAccumulated?: number;

  // -- Pale Archivist (boss 18) --
  spellSchoolUsageCounts?: Record<string, number>;
  pageOfDoomStacks?: number;

  // -- AP drain passive (boss 20 phase 2) --
  apDrainLastTurn?: number;
}

// ── Combatant lite (avoids importing WorldExploration internal type) ──────────

/** Minimal combatant shape needed by boss hooks. Mirrors WorldExploration's CombatantEntry. */
export interface CombatantEntryLike {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ap: number;
  mp: number;
  atk: number;
  res: number;
  sp: number;
  init: number;
  chc: number;
  x: number;
  y: number;
  isPlayer: boolean;
  pieceType: ChessPieceType;
  spells?: SpellConfig[];
  /** The full Enemy object for non-player combatants, null for the player. */
  enemy?: Enemy | null;
  /** Current phase number (1 or 2) for boss combatants. */
  phaseNumber?: number;
}

// ── Boss ability params / result ──────────────────────────────────────────────

export interface BossAbilityParams {
  bossEntry: CombatantEntryLike;
  playerEntry: CombatantEntryLike;
  allEnemies: CombatantEntryLike[];
  /** 16x16 grid: true = walkable. */
  allTiles: boolean[][];
  currentTurn: number;
  bossState: BossState;
}

export interface SpawnData {
  id: string;
  x: number;
  y: number;
  pieceType: ChessPieceType;
  hp: number;
  maxHp: number;
  ap: number;
  atk: number;
  res: number;
  init: number;
  isBossMinion: boolean;
  /** ID of the parent boss that summoned this minion. */
  parentBossId: string;
}

export interface DebuffData {
  stat: string;
  modifier: number;
  duration: number;
  effectName: string;
  iconEmoji: string;
}

export interface DoTData {
  damage: number;
  duration: number;
  type: "poison" | "burn" | "bleed" | "venom" | "other";
  effectName: string;
  iconEmoji: string;
}

export interface BossAbilityResult {
  /** New boss position if the ability moves the boss. */
  newBossPosition?: { x: number; y: number };
  /** New positions for individual combatants (keyed by combatant id). */
  newPositions?: Record<string, { x: number; y: number }>;
  /** Hazard tiles to place on the map. */
  newHazardTiles?: Array<{
    x: number;
    y: number;
    type: "lava" | "spikes" | "void";
  }>;
  /** New illusions to place. */
  newIllusions?: IllusionData[];
  /** New larvae to place. */
  newLarvae?: LarvaData[];
  /** New shock tiles to place. */
  newShockTiles?: ShockTile[];
  /** New void tiles to place. */
  newVoidTiles?: VoidTile[];
  /** Minions to spawn on the board. */
  spawns?: SpawnData[];
  /** Direct HP damage applied to the player. */
  damageToPlayer?: number;
  /** Damage reflected back to the boss from a player attack. */
  reflectedDamage?: number;
  /** Direct HP damage applied to specific combatants (keyed by id). */
  damageToTargets?: Record<string, number>;
  /** Debuffs applied to the player. */
  debuffsApplied?: DebuffData[];
  /** DoT effects applied to the player. */
  dotApplied?: DoTData[];
  /** AP modification for the player (negative = drain). */
  playerApModifier?: number;
  /** Updated boss state after the ability fires. */
  newBossState?: Partial<BossState>;
  /** Battle log messages to append. */
  logMessages: string[];
  /** True if the ability ended the boss's turn (e.g. promotion). */
  endsTurn?: boolean;
}

// ── AI action types ───────────────────────────────────────────────────────────

export type AIActionType =
  | "move"
  | "attack"
  | "spell"
  | "ability"
  | "skip"
  | "promote"
  | "split"
  | "merge"
  | "summon";

export interface AIAction {
  type: AIActionType;
  targetX?: number;
  targetY?: number;
  targetId?: string;
  spellId?: string;
  ability?: BossAbility;
  /** Result data from applyBossAbility, pre-computed during decision. */
  abilityResult?: BossAbilityResult;
  logMessage?: string;
}

export type BossDecisionFn = (
  bossEntry: CombatantEntryLike,
  playerEntry: CombatantEntryLike,
  allEnemies: CombatantEntryLike[],
  allTiles: boolean[][],
  bossState: BossState,
  config: BossConfig,
  currentTurn: number,
  aiGeneration: number,
) => AIAction;

// ── Boss catalogue: all 19 bosses ─────────────────────────────────────────────────────────

export const BOSS_IDS = [
  "pale_archbishop",
  "crimson_countess",
  "void_grandmaster",
  "bone_cavalier",
  "weeping_pawn",
  "starborn_queen",
  "fetid_rook",
  "eternal_pawn_king",
  "midnight_bishop",
  "broodmother_rook",
  "lord_of_static",
  "final_pawn",
  "alabaster_fortress",
  "chessboard_lich",
  "mirror_sovereign",
  "starved_vampire_pawn",
  "pale_archivist",
  "twin_monarchs",
  "enthroned_void",
] as const;

export type BossId = (typeof BOSS_IDS)[number];

// ── Default phase configs ─────────────────────────────────────────────────────

/** Returns a fresh BossState for a new encounter. */
export function makeFreshBossState(bossId: string): BossState {
  return {
    bossId,
    currentPhase: 1,
    phase2Triggered: false,
    illusions: [],
    activeShockTiles: [],
    shockTileGeneration: 0,
    activeVoidTiles: [],
    larvae: [],
    rotStacks: 0,
    splitRooksSpawned: false,
    ghostsSpawned: false,
    invincibleTurnsLeft: 0,
    eternalPawnPosition: null,
    reflectShieldActive: false,
    reflectShieldTurnsLeft: 0,
    bishopsMerged: false,
    magicReflectActive: false,
    shellArmorActive: false,
    hazardTiles: [],
    // New boss state fields
    resonanceCounter: 0,
    resonanceDamageAccumulated: 0,
    mirroredSpellBuffer: [],
    lastThreeTurnsMirror: [],
    anchorsDestroyed: 0,
    glyphedTiles: [],
    boardClaimZone: null,
    monarchAbsorbed: false,
    monarchKilledFirst: null,
    vampirePawnStartHP: 0,
    vampirePawnDrainAccumulated: 0,
    spellSchoolUsageCounts: {},
    pageOfDoomStacks: 0,
    apDrainLastTurn: 0,
  };
}
