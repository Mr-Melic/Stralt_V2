/**
 * Static game constants — world dimensions, movement, enemy limits, etc.
 * Extracted from WorldExploration.tsx for modularization.
 */

export const TILE_WIDTH = 80;
export const TILE_HEIGHT = 40;
export const WORLD_GRID_SIZE = 16;
export const MAX_HAZARD_TILES = 50;
export const MAX_ENEMIES = 20;
export const MOVEMENT_DURATION = 600;
export const _CAMERA_DEADZONE = 30;
export const _CAMERA_MAX_OFFSET = 150;
export const CAMERA_SMOOTHING_FACTOR = 0.85;

// Character positioning offset — adjusted for improved visual centering on tiles
export const CHARACTER_Y_OFFSET = -9;

// Enemy movement constants for visible random movement
export const ENEMY_MOVE_INTERVAL_MIN = 2000; // 2 seconds minimum between moves
export const ENEMY_MOVE_INTERVAL_MAX = 5000; // 5 seconds maximum between moves
export const _ENEMY_MOVEMENT_RANGE = 3; // Maximum tiles an enemy can move in one action
export const _ENEMY_MOVEMENT_SPEED = 800; // Duration of enemy movement animation

/**
 * Per-archetype Action Point (AP) and Mana Point (MP) budgets for summoned
 * units. Indexed by the summon's `summonAI` archetype (hunter, guardian,
 * archer/kiter, bomber/kamikaze, healer). Used as the default when a
 * SummonUnitDef does not specify an explicit ap/mp value.
 *
 *   hunter   — 2 AP / 3 MP  (aggressive melee, casts venom strike)
 *   guardian — 2 AP / 2 MP  (defensive, casts shield / iron skin)
 *   archer   — 2 AP / 3 MP  (ranged kiter, casts poison / slow)
 *   bomber   — 1 AP / 4 MP  (single explosive burst, high mana cost)
 *   healer   — 2 AP / 2 MP  (support, casts heal / rallying cry)
 */
export const SUMMON_AP: Record<string, number> = {
  hunter: 2,
  guardian: 2,
  archer: 2,
  kiter: 2,
  bomber: 1,
  kamikaze: 1,
  healer: 2,
};

export const SUMMON_MP: Record<string, number> = {
  hunter: 3,
  guardian: 2,
  archer: 3,
  kiter: 3,
  bomber: 4,
  kamikaze: 4,
  healer: 2,
};

/**
 * Base HP for a summoned unit, indexed by the summon's `summonAI` archetype.
 * `computeEnemyStats` does NOT return an `hp` field, so `spawnSummonUnit` cannot
 * derive maxHp from `stats.hp` (that produced NaN). Instead the base HP comes
 * from this map and is scaled by the spell's `hpScale` and the spell level.
 *
 *   hunter   — 80  (aggressive melee, moderate durability)
 *   guardian — 120 (defensive front-liner, highest HP)
 *   archer   — 60  (ranged kiter, fragile)
 *   bomber   — 50  (single explosive burst, lowest HP)
 *   healer   — 70  (support, moderate durability)
 *
 * `kiter` aliases `archer`; `kamikaze` aliases `bomber` (legacy summonAI keys).
 */
export const SUMMON_BASE_HP: Record<string, number> = {
  hunter: 80,
  guardian: 120,
  archer: 60,
  kiter: 60,
  bomber: 50,
  kamikaze: 50,
  healer: 70,
};

/** Fallback base HP when a summonAI archetype is not in SUMMON_BASE_HP. */
export const SUMMON_BASE_HP_DEFAULT = 80;

/**
 * Summon-spell leveling tuning. Applied in `spawnSummonUnit` and mirrored in
 * the spellbook HP/AP/MP chips (SpellbookModal.tsx).
 *
 *   SUMMON_HP_PER_LEVEL_PCT  — HP gains +10% per spell level (multiplicative
 *                              on baseHp * hpScale).
 *   SUMMON_MP_PER_LEVELS    — MP gains +1 every 2 spell levels.
 *   SUMMON_AP_PER_LEVELS    — AP gains +1 every 3 spell levels.
 *   SUMMON_LIFESPAN_PER_HALF_LEVEL — lifespan gains +1 turn every 2 spell
 *                              levels (formula: base + floor(level/2)).
 *   SUMMON_UPGRADE_COST_MULTIPLIER — summon spells cost 10× the normal base
 *                              (normalBase=10) to upgrade, then double per
 *                              level: cost = MULTIPLIER * 10 * 2^currentLevel.
 */
export const SUMMON_HP_PER_LEVEL_PCT = 10;
export const SUMMON_MP_PER_LEVELS = 2;
export const SUMMON_AP_PER_LEVELS = 3;
export const SUMMON_LIFESPAN_PER_HALF_LEVEL = 2;
export const SUMMON_UPGRADE_COST_MULTIPLIER = 10;

/**
 * Base lifespan (in turns) for a summoned unit. Replaces the inline literal
 * `3` that previously lived at summonSpawn.ts line 161. The canonical summon
 * lifespan formula is now:
 *
 *   turnsRemaining = SUMMON_BASE_LIFESPAN
 *                  + floor(spellLevel / SUMMON_LIFESPAN_PER_HALF_LEVEL)
 *
 * (computed in engine/progression.ts::getSummonBaseStats). Per-archetype
 * lifespan overrides are intentionally NOT supported — see doNotBuild.
 */
export const SUMMON_BASE_LIFESPAN = 4;

/**
 * Player base Action Point and Mana Point budgets. These are FLOORS — a
 * player's battle-initialized AP/MP is never below 8 / 4 respectively. The
 * canonical player base-stat computation lives in
 * engine/progression.ts::getPlayerBaseStats, which starts from these
 * constants and adds per-level growth from a LevelUpConfig when one is
 * provided. Per the user instruction "Formula wins over persisted character
 * values for battle initialization when they diverge", these constants (and
 * the formula) take precedence over persisted characterStats.ap/mp at battle
 * init time.
 *
 * Runtime editing of these constants is intentionally NOT supported — see
 * doNotBuild.
 */
export const PLAYER_BASE_AP = 8;
export const PLAYER_BASE_MP = 4;

/**
 * JUICE — presentation-only feedback config consumed by engine/effects.ts.
 * Toggles and multipliers for screen shake, hit-stop, hit-flash, damage
 * numbers, and death shatter. Section 4 effects only; does not influence
 * turn logic, damage math, or state flow.
 */
export const JUICE = {
  shake: { enabled: true, multiplier: 1.0 },
  hitstop: { enabled: true, multiplier: 1.0, durationMs: 75 },
  hitFlash: { enabled: true, durationMs: 120 },
  damageNumbers: { enabled: true },
  death: { enabled: true, durationMs: 350, fragments: 5 },
};

// ── ENEMY AI THRESHOLDS (Section 3 — enemyAI.ts) ──────────────────────────────
// All enemy-AI decision thresholds live here so behavior is tunable in one
// place. No new stats are added to Enemy/CharacterStats; these are pure
// tuning knobs consumed by decideEnemyAction in engine/enemyAI.ts.

/** HP fraction (current/max) below which a non-berserk enemy retreats. */
export const ENEMY_RETREAT_HP_PCT = 0.3;

/** HP fraction below which an enemy is considered "wounded" and may sacrifice. */
export const ENEMY_WOUNDED_SACRIFICE_HP_PCT = 0.2;

/** HP fraction below which hazard tiles are avoided during movement. */
export const ENEMY_HAZARD_AVOID_HP_PCT = 0.5;

/** Ally HP fraction below which a healer archetype will heal that ally. */
export const ENEMY_HEAL_ALLY_THRESHOLD_PCT = 0.5;

/** BFS step budget for reachable-tile computation (mirrors the inline `ns > 3` cutoff). */
export const ENEMY_REACHABLE_STEP_BUDGET = 3;

/**
 * Utility-scoring weights for target prioritization. The score for each
 * candidate target is:
 *   score = wKillable * killableNow + wThreat * threatValue
 *         + wLowHp * (1 - hp/effectiveHp) + wProximity * proximity
 * Higher score = preferred target. Weights are unitless and relative.
 *
 *   wKillable   — bonus when the enemy can finish this target THIS turn
 *   wThreat     — bonus for high-value targets (healers, summons, Wisp highest)
 *   wLowHp      — bonus for the lowest effective-HP target (focus fire)
 *   wProximity  — small bonus for the nearest target (tie-breaker)
 */
export const ENEMY_UTILITY_WEIGHTS = {
  wKillable: 100,
  wThreat: 50,
  wLowHp: 30,
  wProximity: 10,
} as const;

/**
 * Threat values assigned to target archetypes for utility scoring. The Wisp
 * (player's healer summon) is the highest-value harassment target. Healers
 * and summons generally outweigh plain damage dealers.
 */
export const ENEMY_THREAT_VALUES: Record<string, number> = {
  wisp: 1.0,
  healer: 0.8,
  summon: 0.6,
  default: 0.3,
};

/** AI-tier gates (mirror the inline thresholds captured as the baseline). */
export const ENEMY_AI_TIER_GATES = {
  erratic: 5,
  groupTactics: 4,
  instantKill: 9,
  betrayal: 10,
  chokepointCamp: 3,
  escapeRoute: 6,
  bottleneckControl: 8,
  defensiveRetreat: 3,
} as const;

// ── AI SOPHISTICATION THRESHOLDS (Section 3 — enemyAI.ts / summonAI.ts) ────────
// Master toggles and tuning knobs for the higher-order AI behaviors layered on
// top of the baseline ENEMY_* thresholds. Each toggle gates a discrete
// capability so it can be flipped off for tuning or debugging without touching
// the AI module. Consumed by decideEnemyAction (engine/enemyAI.ts) and
// runSummonAI (engine/summonAI.ts). No magic numbers in those modules — every
// threshold below is the single source of truth.

/**
 * Master toggle for one-turn lethal lookahead. When enabled, the AI evaluates
 * whether its full AP/MP action sequence can drop a target to 0 HP this turn
 * and prefers that line of play over greedy single-shot damage.
 */
export const AI_LETHAL_LOOKAHEAD_ENABLED = true;

/**
 * Master toggle for focus-fire overkill spill. When a primary target is killed
 * with excess damage, the leftover fraction spills to a secondary target in
 * range rather than being wasted.
 */
export const AI_OVERKILL_SPILL_ENABLED = true;

/**
 * Fraction of excess damage (damage beyond what drops the primary target to 0)
 * that spills to a secondary target. The remainder is lost. Range 0–1.
 */
export const AI_OVERKILL_SPILL_FRACTION = 0.5;

/**
 * Master toggle for line-of-sight repositioning. When a caster or kiter has a
 * spell queued but no LoS to the target, it will spend up to
 * AI_LOS_REPOSITION_STEP_BUDGET steps repositioning before giving up on the
 * cast and falling back to another action.
 */
export const AI_LOS_REPOSITION_ENABLED = true;

/**
 * Max steps a caster/kiter will spend repositioning for line-of-sight before
 * abandoning the queued cast. Mirrors the ENEMY_REACHABLE_STEP_BUDGET pattern.
 */
export const AI_LOS_REPOSITION_STEP_BUDGET = 2;

/**
 * Master toggle for backline protection. When enabled, guardians and healers
 * position themselves between an incoming threat and the ward they protect
 * (typically the Wisp or another high-value ally).
 */
export const AI_BACKLINE_PROTECT_ENABLED = true;

/**
 * Tiles a guardian keeps between itself and the ward it protects. 1 = adjacent
 * (direct body-block); 2 = one tile of buffer. Used by guardian positioning.
 */
export const AI_BACKLINE_GUARD_DISTANCE = 1;

/**
 * Minimum number of targets within the blast radius required for a kamikaze
 * archetype to detonate. Below this count the kamikaze holds position or
 * repositions to reach a denser cluster.
 */
export const AI_KAMIKAZE_MIN_TARGETS = 2;

/**
 * HP fraction (current/max) below which a kamikaze detonates regardless of the
 * target count in blast radius — it has nothing left to lose. Mirrors the
 * ENEMY_RETREAT_HP_PCT convention.
 */
export const AI_KAMIKAZE_LOW_HP_PCT = 0.3;

/**
 * Chebyshev blast radius for the bomber kamikaze detonation. Hardcoded (not
 * read from spell-inferno.areaRadius which is 0) because detonation is a
 * special behavior.
 */
export const AI_KAMIKAZE_BLAST_RADIUS = 2;

/**
 * Master toggle for intent log lines. When enabled, the AI emits human-readable
 * intent lines (e.g. "Caster repositions for LoS on Wisp") to the debug logger
 * for readability. Readability only — does not influence behavior.
 */
export const AI_INTENT_LOG_ENABLED = true;

// ── Enemy summoners (Section: enemy-side summon pipeline) ───────────────────
// ~12% of packs get one summoner enemy; chance scales with levelZone.
// Enemy summons are capped at ENEMY_SUMMON_CAP alive and fire every other
// turn (ENEMY_SUMMON_COOLDOWN_TURNS) to avoid runaway board complexity.
export const ENEMY_SUMMONER_CHANCE_BASE = 0.12;
export const ENEMY_SUMMONER_CHANCE_PER_LEVEL_ZONE = 0.02;
export const ENEMY_SUMMON_CAP = 2;
export const ENEMY_SUMMON_COOLDOWN_TURNS = 2;

// ═══ Map Modifier Constants (Section 3) ═══

// Two-roll trigger defaults
export const MAP_MODIFIER_GLOBAL_TRIGGER_CHANCE = 20;
export const MAP_MODIFIER_TRIGGER_WEIGHT = 20;
export const MAP_MODIFIER_SECOND_CHANCE = 50;

// Slime Flood / Frozen Terrain
export const MAP_MODIFIER_MP_COST_MULTIPLIER = 2;

// Thorned Ground
export const MAP_MODIFIER_THORN_DAMAGE_PER_TILE = 5;
export const MAP_MODIFIER_THORN_THRESHOLD = 2;

// Void Rift
export const MAP_MODIFIER_VOID_RIFT_DAMAGE = 3;

// Arcane Surge
export const MAP_MODIFIER_ARCANE_SURGE_AP_DISCOUNT = 1;

// Time Warp
export const MAP_MODIFIER_TIME_WARP_TIMER = 15;
export const MAP_MODIFIER_NORMAL_TIMER = 30;

// Paper Windstorm
export const MAP_MODIFIER_PAPER_WINDSTORM_RANGE_REDUCTION = 0.5;

// Titan's Vigor
export const MAP_MODIFIER_TITANS_VIGOR_HP_BONUS = 1000;
export const MAP_MODIFIER_TITANS_VIGOR_MIN_MULTIPLIER = 1;
export const MAP_MODIFIER_TITANS_VIGOR_MAX_MULTIPLIER = 5;

// Arcane Overflow
export const MAP_MODIFIER_ARCANE_OVERFLOW_AP_DISCOUNT = 1;
export const MAP_MODIFIER_ARCANE_OVERFLOW_FAIL_BONUS = 10;

// Glass Realm
export const MAP_MODIFIER_GLASS_REALM_DAMAGE_MULTIPLIER = 2;

// Mending Mist
export const MAP_MODIFIER_MENDING_MIST_REGEN_PERCENT = 0.05;

// Swift Winds
export const MAP_MODIFIER_SWIFT_WINDS_MP_BONUS = 2;

// Iron Curse
export const MAP_MODIFIER_IRON_CURSE_RES_BONUS = 0.3;
export const MAP_MODIFIER_IRON_CURSE_HEALING_MULTIPLIER = 0.5;

// Vampiric Ground
export const MAP_MODIFIER_VAMPIRIC_GROUND_LIFESTEAL_PERCENT = 0.15;

// Doka Fever
export const MAP_MODIFIER_DOKA_FEVER_ENEMY_HP_BONUS = 0.25;
export const MAP_MODIFIER_DOKA_FEVER_REWARD_MULTIPLIER = 2;
