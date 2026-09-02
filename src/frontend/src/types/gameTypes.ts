import type { SummonUnitDef } from "../engine/summonSpawn";
// Local game type stubs — used until backend migration generates real types
// These mirror the shape used by CharacterSelection, CharacterCreation, GameFlow, useQueries

export type ChessPieceType =
  | "king"
  | "queen"
  | "pawn"
  | "rook"
  | "bishop"
  | "knight";
export type EnemyFamily =
  | "wraith_bishop"
  | "iron_golem"
  | "plague_rat"
  | "ember_knight"
  | "tide_shade"
  | "bone_scribe"
  | "void_mirror"
  | "default";

export interface CharacterColors {
  primary: string;
  secondary: string;
  accent: string;
}

/** Typed character record — mirrors the backend Character shape. */
export interface Character {
  name: string;
  pieceType: ChessPieceType;
  colors: string[];
  pixelPattern?: string;
  rotation?: bigint;
  level: bigint;
  experience?: bigint;
  /** Single source of truth for Doka — maps to per-principal backend balance */
  dokaBalance?: bigint;
  /** Current XP toward next level (frontend-computed, not backend) */
  xp?: number;
  /** XP required to reach the next level (frontend-computed, not backend) */
  xpToNextLevel?: number;
  /** Current Blood balance (frontend alias for bloodBalance) */
  blood?: number;
  /** Maximum Blood capacity (frontend-computed, not backend) */
  maxBlood?: number;
  stats?: CharacterStatFields;
  spellLevelKeys?: string[];
  spellLevelValues?: (bigint | number)[];
  [key: string]: unknown; // allow extra backend fields without casting
}

export interface CharacterStatFields {
  hp: bigint;
  ap: bigint;
  mp: bigint;
  sp: bigint;
  sr: bigint;
  init: bigint;
  res: bigint;
  chc: bigint;
  atk: bigint;
  resilience: bigint;
  evasion: bigint;
  killCount: bigint;
}

export interface CharacterSlots {
  slot1: Character | null;
  slot2: Character | null;
  slot3: Character | null;
}

/**
 * Frontend UserProfile — aligned to the backend Candid type
 * (declarations/backend.did.d.ts:240 = { name: string; uiLayout: string },
 * both required). `id` is a frontend-only convenience (not in Candid) so it
 * stays optional. The loose `[key: string]: unknown` index signature was
 * removed so a { name }-only object no longer type-checks against this type.
 */
export interface UserProfile {
  id?: string;
  name: string;
  uiLayout: string;
}

// ── Battle log ──────────────────────────────────────────────────────────────────

export interface BattleLogEntry {
  id: string;
  timestamp: string; // HH:MM
  text: string;
  color: string;
  /** True when this entry describes a summon lifecycle event (spawn/action/expiry/death). */
  isSummon?: boolean;
}

// ── Admin / backend config types ───────────────────────────────────────────────

export interface BattleEffect {
  id: string;
  name: string;
  description: string;
  effectType: { damage?: null } | { buff?: null } | { debuff?: null };
  value: bigint;
}

export interface EnemyConfig {
  id: string;
  name: string;
  hp: bigint;
  ap: bigint;
  mp: bigint;
  initStat: bigint;
  levelMin: bigint;
  levelMax: bigint;
  regions: string[];
  spriteUrl: [] | [string];
}

export interface RegionConfig {
  id: string;
  name: string;
  levelMin: bigint;
  levelMax: bigint;
  battleEffects: BattleEffect[];
  backgroundColor: string;
}

export interface PlayerSpriteConfig {
  id: string;
  name: string;
  characterPieceType: string;
  frontUrl: [] | [string];
  rightUrl: [] | [string];
  leftUrl: [] | [string];
  backUrl: [] | [string];
  walkFramesFront: string[];
  walkFramesRight: string[];
  walkFramesLeft: string[];
  walkFramesBack: string[];
}

// ── Spell system ──────────────────────────────────────────────────────────────────

export type SpellEffectCategory =
  | "damage"
  | "heal"
  | "drain"
  | "defense"
  | "pushback"
  | "attract"
  | "teleport"
  | "aoe"
  | "dot"
  | "debuff"
  | "buff"
  | "cc";

export interface SpellConfig {
  id: string;
  name: string;
  description: string;
  iconEmoji: string;
  apCost: bigint;
  mpCost: bigint;
  damage: bigint;
  range: bigint;
  effectType: string;
  // Extended fields (graceful fallback if backend hasn't added them yet)
  spellType?: "damage" | "heal" | "drain" | "summon";
  healAmount?: number;
  isPhysical?: boolean;
  // New fields
  usableByPlayer?: boolean;
  usableByEnemy?: boolean;
  minLevel?: number;
  effectCategory?: SpellEffectCategory;
  effectParams?: string | null;
  // Multi-target spell fields
  hitsMultiple?: boolean;
  /** Bindgen / canister field. Runtime combat still reads `hitsMultiple`. */
  multiTarget?: boolean;
  hitsAllies?: boolean;
  bounces?: number; // for chain lightning type spells
  // Spell property system (DOFUS-inspired)
  modifiableRange?: boolean; // range can be altered by other spells
  lineOfSight?: boolean; // requires clear LoS between caster and target
  linear?: boolean; // can only be cast in straight H/V lines
  diagonal?: boolean; // can only be cast in diagonal lines
  freeCells?: boolean; // must target an unoccupied cell
  aoe?: boolean; // hits multiple cells defined by hitTiles
  hitTiles?: [number, number][]; // relative offsets for AoE pattern (from target)
  minRange?: number; // minimum cast range
  maxRange?: number; // maximum cast range (overrides range if set)
  // Buff/debuff fields
  buffStat?: string;
  buffModifier?: number;
  buffDuration?: number;
  debuffStat?: string;
  debuffModifier?: number;
  debuffDuration?: number;
  // DoT fields
  dotDamage?: number;
  dotDuration?: number;
  /** True if this is a dedicated DoT spell — damage is applied over turns, not upfront */
  isDotSpell?: boolean;
  /** Category of DoT: poison | burn | bleed | venom | other */
  dotType?: "poison" | "burn" | "bleed" | "venom" | "other";
  /** dotDamagePerTurn for the ActiveEffect created when this spell hits */
  dotDamagePerTurn?: number;
  /** Cooldown in turns after casting. 0 = no cooldown. */
  cooldown?: number;
  /** Targeting metadata — single source of truth for preview and cast logic */
  targetType?:
    | "self"
    | "ally"
    | "enemy"
    | "ground"
    | "area"
    | "line"
    | "chain"
    | "all";
  areaShape?: "circle" | "cone" | "line" | "cross" | "single";
  areaRadius?: number;

  /** True if this spell is a base/innate spell that is always owned and never removable */
  isBaseSpell?: boolean;
  // Special mechanic flags
  isSwap?: boolean;
  isMirror?: boolean;
  isTimestep?: boolean;
  isSacrifice?: boolean;
  isBarrier?: boolean;
  isTrap?: boolean;
  isMark?: boolean;
  isSummon?: boolean;
  summonAI?: string;
  summonLifespan?: number;
  summonUnitDef?: SummonUnitDef;
}

// ── Active Effect (buff/debuff/DoT state machine) ──────────────────────────────

export interface ActiveEffect {
  id: string;
  effectName: string;
  type: "buff" | "debuff" | "dot";
  targetId: string; // combatant id: "player" or enemy.id
  stat?: string; // which stat is affected: dmg, res, sp, mp, ap, chc, healRecv
  modifier?: number; // multiplicative for buffs/debuffs, absolute for mp/ap adjustments
  duration: number; // turns remaining
  iconEmoji: string;
  description: string;
  dotDamagePerTurn?: number; // for DoT effects
  /**
   * Unique identifier for a single DoT stack. Same-type DoTs stack
   * additively (each application appends a new stack with its own
   * independent duration) rather than replacing. Assigned by
   * engine/dotStacks.ts::appendDotStack. Absent on non-DoT effects,
   * which retain replace-or-refresh behavior.
   */
  stackId?: string;
}

// ── Doka Loot (ground pickups) ───────────────────────────────────────────────
// ── Enemy (battle / world combatant) ────────────────────────────────────────
// Exported so InitiativeStrip, BattleUIPanel, and hooks can share a single type.
export interface Enemy {
  id: string;
  x: number;
  y: number;
  level: number;
  hp: number;
  /** Maximum HP seeded at battle start (level * 10 formula) */
  maxHp: number;
  ap?: number;
  mp?: number;
  atk?: number;
  res: number;
  sp: number;
  chc: number;
  init: number;
  sr?: number;
  pieceType: ChessPieceType;
  /** Spells assigned at battle start */
  spells?: SpellConfig[];
  /** True if this enemy has been enraged by a stat boost */
  enraged?: boolean;
  /** Ancient name assigned at spawn from the admin-managed names list */
  assignedName?: string;
  /** True if this enemy is the designated group leader in this battle */
  isLeader?: boolean;
  /** Number of non-leader allies that have died since leadership assigned (each death stacks a stat boost) */
  leaderBoostCount?: number;
  // Movement & rendering fields
  currentView: "front" | "back" | "left" | "right";
  isMoving: boolean;
  movementPath: { x: number; y: number }[];
  scaleX: number;
  scaleY: number;
  nextMoveTime: number;
  lastMoveTime?: number;
  // AI & meta fields
  family: string;
  tier?: string;
  intelligence?: number;
  aiStrategy?: string;
  spellCooldowns?: Record<string, number>;
  activeEffects?: ActiveEffect[];
  wanderTarget?: { x: number; y: number } | null;
  // AP/MP tracking fields (per-turn current/max for combatants)
  currentAp?: number;
  maxAp?: number;
  currentMp?: number;
  maxMp?: number;
  // Summon fields
  isSummon?: boolean;
  isSummoner?: boolean;
  summonAI?: string;
  summonLifespan?: number;
  ownerId?: string;
  turnsRemaining?: number;
  side?: "player" | "enemy";
  // Movement & AI fields
  damage?: number;
  aiTier?: number;
  currentStepIndex?: number;
  movementStartTime?: number;
  movementSpeed?: number;
  isWandering?: boolean;
  movementRange?: number;
  initialDelay?: number;
  // Boss fields
  isBoss?: boolean;
  bossId?: string;
  isBossMinion?: boolean;
  spawnTime?: number;
  campTurnCount?: number;
  escapeRouteTriggered?: boolean;
}

export interface DokaLootItem {
  id: string;
  tileX: number;
  tileY: number;
  value: number;
  collected: boolean;
}

// ── Admin game config (from backend getGameConfig) ─────────────────────────

export interface AdminGameConfig {
  leaderBoostPercent: number;
  dokaSpawnChance: number;
  dokaSpawnBaseValue: number;
}

export const DEFAULT_GAME_CONFIG: AdminGameConfig = {
  leaderBoostPercent: 10,
  dokaSpawnChance: 40,
  dokaSpawnBaseValue: 5,
};

export type AdminResult = { ok: null } | { err: string };

// ── Achievement system ────────────────────────────────────────────────────────

export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  dokaReward: number;
  /** Condition key matched client-side: first_battle_win | survive_1hp | spell_level_5 | doka_1000 | explore_25_maps | betrayal_witness | leader_slayer | jackpot_heal | loot_10_doka | double_betrayal | level_10 | spell_master_8 | critical_5_in_battle | pacifist_run | doka_10000 */
  condition: string;
  active: boolean;
}

export interface AchievementProgress {
  principalId: string;
  achievementId: string;
  unlocked: boolean;
  unlockedAt: number; // Unix ms timestamp
  claimed: boolean;
}

// ── Admin dashboard tab list (includes achievements) ──────────────────────────

// ── Map Modifier config ────────────────────────────────────────────────────────

export interface MapModifierConfig {
  id: string;
  name: string;
  description: string;
  /** Key used in code: slime_flood | paper_windstorm | gravity_well | blood_moon | fog_of_war | thorned_ground | arcane_surge | mirror_field | frozen_terrain | plague_zone | time_warp | void_rift */
  modifierType: string;
  active: boolean;
  /** 0-100 weight for this modifier when a modifier triggers. Default 20. */
  triggerChance?: number;
  /** Global chance (0-100) that ANY modifier triggers on portal transition. Default 20. */
  globalTriggerChance?: number;
  /** Chance (0-100) that a SECOND modifier also triggers when the first does. Default 50. */
  secondModifierChance?: number;
}

// ── Level-up config (global settings) ────────────────────────────────────────

export interface LevelUpConfig {
  statGrowthPercent: number; // default 5
  apMpGrowthEveryNLevels: number; // default 25
  maxSpellRange: number; // default 5
  spellRangeGrowthLevels: number; // default 10 — every N levels +1 range
  spellFailBaseChance: number; // default 20 — % at level 1
  spellFailReductionPerLevel: number; // default 0.1 — per level reduction
}

export const DEFAULT_LEVELUP_CONFIG: LevelUpConfig = {
  statGrowthPercent: 5,
  apMpGrowthEveryNLevels: 25,
  maxSpellRange: 5,
  spellRangeGrowthLevels: 10,
  spellFailBaseChance: 20,
  spellFailReductionPerLevel: 0.1,
};

// ── Tier spawn config (editable via admin panel) ───────────────────────────────

export interface TierSpawnConfig {
  tierSize: number;
  sameTierPercent: number;
  adjacentTierPercent: number;
  twoAwayPercent: number;
  threeOrMorePercent: number;
}

// ── EXP5: Hazard tile type ──────────────────────────────────────────────────
export type HazardTileType = "lava" | "ice" | "spikes";

export interface HazardTile {
  x: number;
  y: number;
  type: HazardTileType;
  damage: number; // HP lost per step
  debuff?: string; // e.g. 'frozen', 'burning'
  debuffDuration?: number; // turns
}

// ── EXP6: Consumable item inventory ─────────────────────────────────────────
export type ConsumableItemType =
  | "potion_hp"
  | "potion_ap"
  | "potion_mp"
  | "stat_boost_atk"
  | "stat_boost_res"
  | "shield"
  | "antidote";

export interface ConsumableItem {
  id: string;
  type: ConsumableItemType;
  name: string;
  description: string;
  iconEmoji: string;
  /** Doka purchase price */
  price: number;
  /** Effect magnitude (e.g. HP restored) */
  effectValue: number;
  /** Effect duration in turns (0 = instant) */
  effectDuration: number;
  quantity: number;
}

// ── EXP8: Dungeon chain run depth ────────────────────────────────────────────
export interface DungeonChainState {
  isActive: boolean;
  depth: number;
  maxDepth: number;
  dokaMultiplier: number;
  startedAt: number; // unix ms
}

export interface AdminDashboardState {
  tab:
    | "enemies"
    | "regions"
    | "sprites"
    | "visuals"
    | "spells"
    | "settings"
    | "tiers"
    | "modifiers"
    | "purchases"
    | "achievements"
    | "names"
    | "bosses"
    | "ads"
    | "shop"
    | "bossRush";
  editingEnemyId: string | null;
  editingRegionId: string | null;
  editingSpriteId: string | null;
  editingSpellId: string | null;
  editingModifierId: string | null;
  editingAchievementId: string | null;
  isDirty: boolean;
}
