/**
 * Pure enemy AI engine — React-free, DOM-free.
 *
 * `decideEnemyAction(enemy, ctx)` returns a single `EnemyAction` describing
 * what the enemy should do this turn (move, cast, melee, or skip). The caller
 * (WorldExploration.tsx) builds the ctx from live component state/refs, calls
 * this function, and applies the returned action through the existing state
 * setters. No React, no DOM, no side effects inside this module — the only
 * observable effect is the intent log line emitted via `ctx.log`.
 *
 * Determinism: given the same `enemy`, `ctx.combatants`, `ctx.grid`, and
 * `ctx.rng` sequence, `decideEnemyAction` always returns the same action.
 *
 * Section 3 — AAA-grade enemy behavior. See AGENTS.md learnings for the
 * baseline thresholds captured from the inline WX region before extraction.
 */

import {
  AI_BACKLINE_GUARD_DISTANCE,
  AI_BACKLINE_PROTECT_ENABLED,
  AI_INTENT_LOG_ENABLED,
  AI_KAMIKAZE_BLAST_RADIUS,
  AI_KAMIKAZE_LOW_HP_PCT,
  AI_KAMIKAZE_MIN_TARGETS,
  AI_LETHAL_LOOKAHEAD_ENABLED,
  AI_LOS_REPOSITION_ENABLED,
  AI_LOS_REPOSITION_STEP_BUDGET,
  AI_OVERKILL_SPILL_ENABLED,
  AI_OVERKILL_SPILL_FRACTION,
  ENEMY_HAZARD_AVOID_HP_PCT,
  ENEMY_HEAL_ALLY_THRESHOLD_PCT,
  ENEMY_REACHABLE_STEP_BUDGET,
  ENEMY_RETREAT_HP_PCT,
  ENEMY_SUMMON_CAP,
  ENEMY_SUMMON_COOLDOWN_TURNS,
  ENEMY_THREAT_VALUES,
  ENEMY_UTILITY_WEIGHTS,
  ENEMY_WOUNDED_SACRIFICE_HP_PCT,
  WORLD_GRID_SIZE,
} from "../data/gameConstants.ts";
import type { ChessPieceType, Enemy, SpellConfig } from "../types/gameTypes";
import { logDebugInfo } from "../utils/debugLogger.ts";
import {
  type OccupancyContext,
  isCellFree as sharedIsCellFree,
} from "./occupancy.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A tile coordinate on the world grid. */
export interface AICell {
  x: number;
  y: number;
}

/** A combatant the AI can see and reason about. */
export interface AICombatant {
  id: string;
  /** "player" | "enemy" | "summon" — used for side resolution. */
  side: "player" | "enemy";
  /** True for summoned units (player or enemy summons). */
  isSummon?: boolean;
  /** Summon archetype key (e.g. "healer", "wisp") used for threat scoring. */
  summonAI?: string;
  /** Display name / piece type for log lines. */
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  /** Effective stat snapshot (post-buff/debuff). Optional; defaults to base. */
  effectiveHp?: number;
}

/** Archetype classification driving behavior branches. */
export type EnemyArchetype =
  | "caster" // ranged spellcaster, keeps distance + LoS
  | "healer" // supports allies, heals the most-wounded
  | "charger" // melee, commits only when it can reach
  | "flanker" // paths to side/rear tiles, avoids tackle zones
  | "berserker" // never retreats, always presses
  | "summoner" // spawns allied summons (wolf/archer) instead of attacking
  | "generic"; // fallback: nearest-target melee/ranged hybrid

/** The decision output consumed by the WX call site. */
export interface EnemyAction {
  /** Archetype the decision was made under (for logging/debug). */
  archetype: EnemyArchetype;
  /** Destination tile the enemy moves to (may equal its current tile). */
  destination: AICell;
  /** Spell to cast this turn, or null for a melee/skip. */
  spell: SpellConfig | null;
  /** Target combatant id for the spell/melee, or null for self/no target. */
  targetId: string | null;
  /** "cast" | "melee" | "move" | "skip" — drives the apply branch in WX. */
  kind: "cast" | "melee" | "move" | "skip";
  /** Short intent line written to the Battle Log via ctx.log. */
  intent: string;
  /** Color for the intent log line (hex). */
  intentColor: string;
  /**
   * True when the enemy is retreating for self-preservation (drives the
   * "falls back, wounded" log variant and retreat hazard avoidance).
   */
  retreating: boolean;
}

// ---------------------------------------------------------------------------
// Summon archetypes (Section 2b) — decideSummonAction
// ---------------------------------------------------------------------------

/**
 * Summon archetype classification. Each maps to a distinct behavior profile
 * in `decideSummonAction`. The five archetypes mirror the kit-spell sets
 * defined in data/spellData.ts (wolf→hunter, golem→guardian, archer→kiter,
 * bomber→kamikaze, wisp→healer).
 */
export type SummonArchetype =
  | "hunter" // wolf — melee + venom strike, presses nearest/lowest-HP foe
  | "guardian" // golem — body-blocks for the player, shields when unshielded
  | "archer" // kiter — keeps 3+ tile range, poison arrow / slow
  | "bomber" // kamikaze — paths to densest cluster, detonates Inferno AoE
  | "healer"; // wisp — heals most-wounded ally, else Rallying Cry

/**
 * Kit-spell ids for each summon archetype. These are the explicit metadata
 * keys (never name-based heuristics) used to look up the summon's spells from
 * `ctx.availableSpells` / `ctx.assignedSpells`. Mirrors the kit arrays in
 * data/spellData.ts (summonUnitDef.summonKit).
 */
const SUMMON_KIT: Record<SummonArchetype, string[]> = {
  hunter: ["physical_attack", "spell-venom-strike"],
  guardian: ["starter-shield", "spell-iron-skin"],
  archer: ["starter-poison", "spell-slow"],
  bomber: ["spell-inferno"],
  healer: ["starter-heal", "spell-rallying-cry"],
};

/**
 * Section 2a — Per-piece enemy spell kits.
 *
 * Maps a chess-piece type to the spell ids an enemy of that piece should know,
 * scaled by `levelZone` (a coarse difficulty band: 0 = early, 1 = mid,
 * 2+ = late). Higher zones unlock the upgraded spell in each kit and, for
 * multi-spell kits, guarantee the full kit is present. Mirrors the real spell
 * ids in data/spellData.ts (physical_attack, starter-frost, starter-poison,
 * spell-venom-strike, spell-iron-skin, spell-inferno, starter-heal,
 * spell-rallying-cry, spell-slow).
 *
 * Used by the enemy-spawner to assign spells to a freshly-created enemy based
 * on its `pieceType` and the current world level zone.
 */
const ENEMY_KITS: Record<ChessPieceType, (levelZone: number) => string[]> = {
  // Pawn: basic melee; gains venom-strike at higher zones.
  pawn: (z) =>
    z >= 1 ? ["physical_attack", "spell-venom-strike"] : ["physical_attack"],
  // Knight: pure melee bruiser.
  knight: () => ["physical_attack"],
  // Bishop: ranged frost + poison control.
  bishop: (z) =>
    z >= 1 ? ["starter-frost", "starter-poison"] : ["starter-frost"],
  // Rook: tanky melee with iron-skin armor.
  rook: (z) =>
    z >= 1 ? ["physical_attack", "spell-iron-skin"] : ["physical_attack"],
  // Queen: premier caster — frost early, inferno late, plus self-heal.
  queen: (z) => {
    const nuke = z >= 2 ? "spell-inferno" : "starter-frost";
    return z >= 1 ? [nuke, "starter-heal"] : [nuke];
  },
  // King / leader: control nuke + team-wide rallying cry.
  king: (z) => {
    const nuke = z >= 2 ? "spell-inferno" : "starter-frost";
    return z >= 1 ? [nuke, "spell-rallying-cry"] : [nuke];
  },
};

/**
 * Build the spell-id kit for an enemy of the given chess-piece type, scaled by
 * the world level zone. Returns the ordered list of spell ids the enemy should
 * have assigned (callers resolve the ids to `SpellConfig` via the spell
 * registry). Kit size grows with `levelZone` so late-game enemies field their
 * full kit.
 */
export function buildEnemyKit(
  pieceType: ChessPieceType,
  levelZone: number,
): string[] {
  const builder = ENEMY_KITS[pieceType] ?? ENEMY_KITS.pawn;
  return builder(Math.max(0, Math.floor(levelZone)));
}

/** Infer the summon archetype from the AICombatant's `summonAI` field. */
function inferSummonArchetype(summon: AICombatant): SummonArchetype {
  const raw = (summon.summonAI ?? "").toLowerCase();
  // Legacy aliases: kiter→archer, kamikaze→bomber (see gameConstants.ts).
  if (raw === "kiter") return "archer";
  if (raw === "kamikaze") return "bomber";
  if (
    raw === "hunter" ||
    raw === "guardian" ||
    raw === "archer" ||
    raw === "bomber" ||
    raw === "healer"
  ) {
    return raw;
  }
  // Piece-type fallback (wolf→hunter, golem→guardian, wisp→healer).
  const pt = (summon.name ?? "").toLowerCase();
  if (pt.includes("wolf")) return "hunter";
  if (pt.includes("golem")) return "guardian";
  if (pt.includes("wisp")) return "healer";
  if (pt.includes("archer")) return "archer";
  if (pt.includes("bomber")) return "bomber";
  return "hunter";
}

/**
 * Context handed to `decideEnemyAction`. Mirrors the SpellContext shape used
 * by `handleSummonTurn` in engine/summonAI.ts: pure callbacks, no React.
 *
 * The WX call site is responsible for wiring every field to live state/refs.
 * `decideEnemyAction` only reads; it never mutates `enemy` or `ctx`.
 */
export interface DecideEnemyContext {
  /** The enemy currently taking its turn. */
  enemy: Enemy;
  /** All living combatants visible to this enemy (players, summons, enemies). */
  combatants: AICombatant[];
  /** Walkable grid: `grid[y][x] === true` means the tile is passable. */
  grid: boolean[][];
  /** Set of "x,y" keys occupied by other combatants (blocks movement). */
  occupied: Set<string>;
  /** Set of "x,y" keys that are barriers (spell-placed walls). */
  barriers: Set<string>;
  /** Set of "x,y" keys that are portals (impassable for pathing). */
  portals: Set<string>;
  /** Set of "x,y" keys that are void tiles (impassable). */
  voidTiles: Set<string>;
  /** Map of "x,y" -> hazard type ("lava" | "ice" | "spikes"). */
  hazardTiles: Map<string, string>;
  /** Spells available to this enemy this turn (cooldowns already filtered). */
  availableSpells: SpellConfig[];
  /** All spells assigned to this enemy (for archetype inference + ranged checks). */
  assignedSpells: SpellConfig[];
  /** Current battle turn number (for focus-fire coordination). */
  battleTurn: number;
  /** Number of living allies (excluding this enemy). */
  allyCount: number;
  /** Total living enemies on this side (including this enemy). */
  enemyCount: number;
  /** Enrage multiplier (1 normally, 6 if enraged). */
  enrageMultiplier: number;
  /** True if the slime-flood flag is active (doubles per-tile path cost). */
  isSlimeFlood: boolean;
  /** Deterministic RNG function (Math.random by default). */
  rng: () => number;
  /** Effective-stat lookup: returns the post-modifier value for a stat. */
  getEffectiveStat: (combatantId: string, stat: string) => number;
  /** Scaled-damage helper (mirrors calcScaledDamage). */
  calcScaledDamage: (base: number, level: number, upgrade: number) => number;
  /** Line-of-sight check between two tiles (Bresenham, wall/blocker aware). */
  hasLineOfSight: (from: AICell, to: AICell) => boolean;
  /** Intent log emitter (no-op safe; WX wires to logBattleEntry). */
  log: (msg: string, color?: string) => void;
  /** Focus-fire coordination: id of the currently-focused target, or null. */
  focusTargetId: string | null;
  /** Set this to the chosen target id so the next enemy can read it. */
  setFocusTargetId: (id: string | null) => void;
  /** True if focus was already set this battle turn. */
  focusAlreadySet: boolean;
  /** Mark focus as set for this turn (prevents every enemy re-choosing). */
  markFocusSet: () => void;
  /**
   * Battle turn on which this summoner last cast a summon spell, or null if
   * it has not summoned yet. Consumed by `decideSummonerAction` to enforce
   * the `ENEMY_SUMMON_COOLDOWN_TURNS` "every other turn" cadence. Only read
   * when `currentTurn` is also provided.
   */
  lastSummonTurn?: number | null;
  /**
   * Current battle turn number. When provided alongside `lastSummonTurn`,
   * `decideSummonerAction` skips casting if the summoner summoned within the
   * last `ENEMY_SUMMON_COOLDOWN_TURNS` turns.
   */
  currentTurn?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers (pure)
// ---------------------------------------------------------------------------

const RETREAT_COLOR = "#ef4444";
const FLANK_COLOR = "#ef4444";
const CAST_COLOR = "#ef4444";
const HEAL_COLOR = "#4ade80";
const SKIP_COLOR = "#9ca3af";
const MOVE_COLOR = "#60a5fa";

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function chebyshev(a: AICell, b: AICell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** HP fraction clamped to [0,1]. */
function hpFrac(c: AICombatant): number {
  const max = Math.max(1, c.maxHp);
  return Math.max(0, Math.min(1, c.hp / max));
}

/** Effective HP for scoring (falls back to current hp). */
function effectiveHp(c: AICombatant): number {
  return c.effectiveHp ?? c.hp;
}

/**
 * BFS reachable tiles from the enemy's position, respecting the step budget
 * and per-tile cost (slime flood doubles cost). Mirrors the inline
 * `reachableTilesAI` computation in the original WX region.
 *
 * Uses the shared `isCellFree` from engine/occupancy.ts for the passability
 * check on each neighbor, so grid walls, barriers, portals, void tiles, and
 * occupied cells are all handled by ONE shared implementation.
 */
function computeReachable(
  origin: AICell,
  ctx: DecideEnemyContext,
): Set<string> {
  const occCtx = toOccupancyContext(ctx);
  const reachable = new Set<string>();
  const visited = new Map<string, number>();
  const queue: { x: number; y: number; steps: number }[] = [
    { x: origin.x, y: origin.y, steps: 0 },
  ];
  visited.set(key(origin.x, origin.y), 0);
  const costPerTile = ctx.isSlimeFlood ? 2 : 1;
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const nextSteps = cur.steps + costPerTile;
    if (nextSteps > ENEMY_REACHABLE_STEP_BUDGET) continue;
    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      const k = key(nx, ny);
      if (nx < 0 || nx >= WORLD_GRID_SIZE || ny < 0 || ny >= WORLD_GRID_SIZE)
        continue;
      // Shared passability check: grid + barriers + portals + void + occupied.
      if (!sharedIsCellFree({ x: nx, y: ny }, occCtx)) continue;
      if ((visited.get(k) ?? Number.POSITIVE_INFINITY) <= nextSteps) continue;
      visited.set(k, nextSteps);
      reachable.add(k);
      queue.push({ x: nx, y: ny, steps: nextSteps });
    }
  }
  return reachable;
}

/**
 * Adapter: build an `OccupancyContext` from the `DecideEnemyContext` the
 * enemy-AI already carries. The `isOccupied` callback delegates to the
 * ctx.occupied Set (which the WX call site populates with every combatant's
 * "x,y" key). This is the single wiring point that lets the shared
 * `isCellFree` see the same grid/barrier/portal/void/occupied state the
 * enemy AI does.
 */
function toOccupancyContext(ctx: DecideEnemyContext): OccupancyContext {
  return {
    tiles: ctx.grid,
    barriers: ctx.barriers,
    voidTiles: ctx.voidTiles,
    portals: ctx.portals,
    isOccupied: (cell) => ctx.occupied.has(key(cell.x, cell.y)),
  };
}

/**
 * True if a tile is passable and unoccupied (single-step move check).
 * Delegates to the shared `isCellFree` from engine/occupancy.ts so the
 * enemy AI, summon AI, spawn placement, and swap/pushback/attract resolvers
 * all use ONE occupancy + passability implementation.
 */
function isStepFree(x: number, y: number, ctx: DecideEnemyContext): boolean {
  return sharedIsCellFree({ x, y }, toOccupancyContext(ctx));
}

/** Filter candidate move tiles to avoid hazards when the enemy is low HP. */
function filterHazardCandidates(
  candidates: AICell[],
  ctx: DecideEnemyContext,
  enemyHpFrac: number,
): AICell[] {
  if (ctx.hazardTiles.size === 0) return candidates;
  const isLowHp = enemyHpFrac < ENEMY_HAZARD_AVOID_HP_PCT;
  if (!isLowHp) return candidates;
  const safe = candidates.filter((c) => {
    const ht = ctx.hazardTiles.get(key(c.x, c.y));
    if (!ht) return true;
    if (ht === "ice") return false;
    if (ht === "lava" || ht === "spikes") return false;
    return true;
  });
  return safe.length > 0 ? safe : candidates;
}

// ---------------------------------------------------------------------------
// Archetype inference
// ---------------------------------------------------------------------------

function inferArchetype(ctx: DecideEnemyContext): EnemyArchetype {
  const spells = ctx.assignedSpells;
  const hasHeal = spells.some(
    (s) => s.spellType === "heal" || (s.healAmount ?? 0) > 0,
  );
  if (hasHeal) return "healer";
  const ranged = spells.filter((s) => Number(s.range) > 1);
  const melee = spells.filter((s) => Number(s.range) <= 1);
  // Caster: majority ranged attack spells with LoS expectation.
  if (
    ranged.length > 0 &&
    ranged.length >= melee.length &&
    ranged.some((s) => s.lineOfSight !== false)
  ) {
    return "caster";
  }
  // Flanker: knight-type piece with melee + mobility (inferred from pieceType).
  const pt = ctx.enemy.pieceType;
  if (pt === "knight") return "flanker";
  // Berserker: family hint or enraged.
  if (
    ctx.enrageMultiplier > 1 ||
    ctx.enemy.family.includes("berserk") ||
    ctx.enemy.aiStrategy === "berserk"
  ) {
    return "berserker";
  }
  // Charger: melee-only kit.
  if (melee.length > 0 && ranged.length === 0) return "charger";
  return "generic";
}

// ---------------------------------------------------------------------------
// Target prioritization (utility scoring)
// ---------------------------------------------------------------------------

interface ScoredTarget {
  combatant: AICombatant;
  score: number;
  killableNow: boolean;
}

/** Estimated damage this enemy can deal to a target this turn (single spell). */
function estimateDamage(
  spell: SpellConfig | null,
  ctx: DecideEnemyContext,
): number {
  if (!spell) {
    // Melee fallback: level-scaled crush.
    return Math.max(
      1,
      Math.round(12 * Math.max(1, ctx.enemy.level / 5) * ctx.enrageMultiplier),
    );
  }
  const base = Number(spell.damage);
  if (base <= 0) return 0;
  return Math.max(
    1,
    Math.round(
      ctx.calcScaledDamage(base, ctx.enemy.level, 0) * ctx.enrageMultiplier,
    ),
  );
}

/** Threat value for a target (healers/summons/Wisp highest). */
function threatValue(c: AICombatant): number {
  if (c.isSummon) {
    const arch = (c.summonAI ?? "").toLowerCase();
    if (arch === "wisp" || arch === "healer") return ENEMY_THREAT_VALUES.wisp;
    return ENEMY_THREAT_VALUES.summon;
  }
  // Healer inference: name/summonAI hint. Players aren't healers by default.
  if (c.summonAI === "healer") return ENEMY_THREAT_VALUES.healer;
  return ENEMY_THREAT_VALUES.default;
}

/**
 * Score every enemy-side opponent of this enemy. Higher = preferred.
 * Score = wKillable*killableNow + wThreat*threat + wLowHp*(1-hp/effHp)
 *       + wProximity*proximity.
 */
function scoreTargets(
  opponents: AICombatant[],
  ctx: DecideEnemyContext,
  bestSpell: SpellConfig | null,
): ScoredTarget[] {
  const enemyCell: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const maxDist = WORLD_GRID_SIZE * 2;
  const W = ENEMY_UTILITY_WEIGHTS;
  const scored = opponents.map((c) => {
    const dmg = estimateDamage(bestSpell, ctx);
    const killableNow = c.hp <= dmg;
    const threat = threatValue(c);
    const lowHp = 1 - c.hp / Math.max(1, effectiveHp(c));
    const dist = chebyshev(enemyCell, { x: c.x, y: c.y });
    const proximity = 1 - dist / maxDist;
    const score =
      W.wKillable * (killableNow ? 1 : 0) +
      W.wThreat * threat +
      W.wLowHp * lowHp +
      W.wProximity * proximity;
    return { combatant: c, score, killableNow };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Pick the best available damage spell (highest damage, in range). */
function pickBestDamageSpell(
  ctx: DecideEnemyContext,
  target: AICombatant,
): SpellConfig | null {
  const enemyCell: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const dist = chebyshev(enemyCell, { x: target.x, y: target.y });
  const inRange = ctx.availableSpells.filter(
    (s) =>
      Number(s.damage) > 0 &&
      Number(s.range) >= dist &&
      (s.spellType === "damage" ||
        s.effectType === "damage" ||
        s.effectType === "drain"),
  );
  if (inRange.length === 0) return null;
  return inRange.reduce((best, s) =>
    Number(s.damage) > Number(best.damage) ? s : best,
  );
}

// ---------------------------------------------------------------------------
// Movement: approach, retreat, flank, reposition
// ---------------------------------------------------------------------------

/** Step toward a target tile, preferring the axis with the larger gap. */
function stepToward(
  origin: AICell,
  target: AICell,
  ctx: DecideEnemyContext,
  reachable: Set<string>,
): AICell {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const candidates: AICell[] = [];
  if (Math.abs(dx) >= Math.abs(dy) && sx !== 0)
    candidates.push({ x: origin.x + sx, y: origin.y });
  if (Math.abs(dy) >= Math.abs(dx) && sy !== 0)
    candidates.push({ x: origin.x, y: origin.y + sy });
  if (sx !== 0 && sy !== 0)
    candidates.push({ x: origin.x + sx, y: origin.y + sy });
  if (sx !== 0) candidates.push({ x: origin.x + sx, y: origin.y });
  if (sy !== 0) candidates.push({ x: origin.x, y: origin.y + sy });
  for (const c of candidates) {
    if (!isStepFree(c.x, c.y, ctx)) continue;
    if (!reachable.has(key(c.x, c.y))) continue;
    return c;
  }
  // Fallback: any reachable free step.
  for (const k of reachable) {
    const [rx, ry] = k.split(",").map(Number);
    if (rx === origin.x && ry === origin.y) continue;
    return { x: rx, y: ry };
  }
  return origin;
}

/** Step away from a threat tile (retreat). */
function stepAway(
  origin: AICell,
  threat: AICell,
  ctx: DecideEnemyContext,
  reachable: Set<string>,
  enemyHpFrac: number,
): AICell {
  const dx = origin.x - threat.x;
  const dy = origin.y - threat.y;
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const candidates: AICell[] = [];
  if (sx !== 0) candidates.push({ x: origin.x + sx, y: origin.y });
  if (sy !== 0) candidates.push({ x: origin.x, y: origin.y + sy });
  if (sx !== 0 && sy !== 0)
    candidates.push({ x: origin.x + sx, y: origin.y + sy });
  const safe = filterHazardCandidates(candidates, ctx, enemyHpFrac);
  for (const c of safe) {
    if (!isStepFree(c.x, c.y, ctx)) continue;
    if (!reachable.has(key(c.x, c.y))) continue;
    return c;
  }
  return origin;
}

/**
 * Flank: pick a side/rear tile relative to the target (perpendicular axis),
 * avoiding tackle zones (adjacent-to-target tiles already occupied by allies).
 */
function stepFlank(
  origin: AICell,
  target: AICell,
  ctx: DecideEnemyContext,
  reachable: Set<string>,
): AICell {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  // Perpendicular candidates (side approach).
  const perpX = dy !== 0 ? Math.sign(dy) : 0;
  const perpY = dx !== 0 ? Math.sign(dx) : 0;
  const candidates: AICell[] = [];
  if (perpX !== 0) candidates.push({ x: origin.x + perpX, y: origin.y });
  if (perpY !== 0) candidates.push({ x: origin.x, y: origin.y + perpY });
  // Diagonal flank (rear approach).
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  if (sx !== 0 && sy !== 0)
    candidates.push({ x: origin.x + sx, y: origin.y + sy });
  // Avoid tackle zones: tiles adjacent to the target that are occupied.
  const tackleZone = new Set<string>();
  for (const d of [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]) {
    tackleZone.add(key(target.x + d.x, target.y + d.y));
  }
  for (const c of candidates) {
    if (tackleZone.has(key(c.x, c.y))) continue;
    if (!isStepFree(c.x, c.y, ctx)) continue;
    if (!reachable.has(key(c.x, c.y))) continue;
    return c;
  }
  // Fallback: plain approach.
  return stepToward(origin, target, ctx, reachable);
}

// ---------------------------------------------------------------------------
// Coordination-lite + AI sophistication pass (Section 4)
// ---------------------------------------------------------------------------

/**
 * If the focused target would be overkilled (damage >> hp), redirect to a
 * secondary target instead so the excess damage (gated by
 * AI_OVERKILL_SPILL_FRACTION) is not wasted. Returns the chosen target.
 *
 * Section 4(b): focus-fire cap with overkill spill. When the primary target
 * is killed with excess damage exceeding AI_OVERKILL_SPILL_FRACTION of its HP,
 * the AI switches to the next viable target. Gated by AI_OVERKILL_SPILL_ENABLED.
 */
function applyOverkillSpread(
  primary: ScoredTarget,
  allTargets: ScoredTarget[],
  ctx: DecideEnemyContext,
  spell: SpellConfig | null,
): ScoredTarget {
  if (!AI_OVERKILL_SPILL_ENABLED) return primary;
  const dmg = estimateDamage(spell, ctx);
  const overkill = dmg - primary.combatant.hp;
  // Only spill when the primary is actually killed this turn AND the excess
  // exceeds the configured fraction of the target's max HP.
  if (
    primary.killableNow &&
    overkill > primary.combatant.maxHp * AI_OVERKILL_SPILL_FRACTION &&
    allTargets.length > 1
  ) {
    const secondary = allTargets.find(
      (t) =>
        t.combatant.id !== primary.combatant.id &&
        t.combatant.hp <= estimateDamage(spell, ctx),
    );
    if (secondary) return secondary;
  }
  return primary;
}

/**
 * Section 4(a): one-turn lethal lookahead. Given a list of scored targets and
 * the spell the AI would cast, prefer a target that dies THIS turn (hp <= dmg)
 * when AI_LETHAL_LOOKAHEAD_ENABLED. Returns the chosen target, or the top
 * scored target if lookahead is disabled or no target is lethal this turn.
 */
function applyLethalLookahead(
  scored: ScoredTarget[],
  ctx: DecideEnemyContext,
  spell: SpellConfig | null,
): ScoredTarget {
  if (!AI_LETHAL_LOOKAHEAD_ENABLED || scored.length === 0) return scored[0];
  const dmg = estimateDamage(spell, ctx);
  const lethal = scored.find((t) => t.combatant.hp <= dmg);
  return lethal ?? scored[0];
}

/**
 * Section 4(c): LoS repositioning for casters/kiters. When a cast is blocked
 * only by LoS (target is in range but no clear line), spend up to
 * AI_LOS_REPOSITION_STEP_BUDGET steps toward the target searching for a tile
 * that has LoS. Returns the reposition destination, or null if no LoS tile is
 * found within the budget (caller falls back to advancing / holding).
 *
 * Gated by AI_LOS_REPOSITION_ENABLED. Uses the existing `reachable` set so
 * movement respects the same step budget + tackle-aware pathing as
 * `decideEnemyAction`.
 */
function repositionForLOS(
  origin: AICell,
  target: AICell,
  ctx: DecideEnemyContext,
  reachable: Set<string>,
  spell: SpellConfig,
): AICell | null {
  if (!AI_LOS_REPOSITION_ENABLED) return null;
  // Walk up to AI_LOS_REPOSITION_STEP_BUDGET steps along the approach axis,
  // testing each reachable tile for LoS to the target.
  let cur = origin;
  for (let step = 0; step < AI_LOS_REPOSITION_STEP_BUDGET; step++) {
    const next = stepToward(cur, target, ctx, reachable);
    if (next.x === cur.x && next.y === cur.y) break;
    cur = next;
    if (ctx.hasLineOfSight(cur, target)) {
      // Confirm the target is still in spell range from this tile.
      const dist = chebyshev(cur, target);
      if (dist <= Number(spell.range)) return cur;
    }
  }
  return null;
}

/**
 * Section 2a — find the nearest reachable tile from which `spell` is both in
 * range AND has line-of-sight to `target`. Used by the move-then-cast branches
 * of caster/charger/generic: when the chosen ranged spell is out of range or
 * LoS-blocked from the origin, the enemy paths its full MP toward the best
 * legal-cast tile and, if it lands there with AP to spare, casts in the same
 * turn.
 *
 * Implementation: BFS over the `reachable` set (already step-budget- and
 * tackle-aware via `computeReachable`), expanding in chebyshev order from the
 * origin. The first tile that satisfies range + LoS is returned (nearest by
 * movement steps). Returns `null` if no reachable tile grants a legal cast.
 *
 * `spell.range` is a bigint in the data model; converted via `Number()`.
 * `spell.lineOfSight === false` spells skip the LoS check (e.g. AoE auras).
 */
function findNearestLegalCastTile(
  origin: AICell,
  target: AICell,
  ctx: DecideEnemyContext,
  reachable: Set<string>,
  spell: SpellConfig,
): AICell | null {
  const range = Number(spell.range);
  const needsLos = spell.lineOfSight !== false;
  // BFS from the origin over reachable tiles, ordered by step count. The
  // `reachable` set already encodes the per-tile step cost (slime-flood aware),
  // so the first legal-cast tile we hit is the nearest by movement budget.
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const visited = new Set<string>([key(origin.x, origin.y)]);
  // Seed the queue with the origin itself — casting from the current tile is
  // legal if range + LoS already hold (handles the in-range-but-blocked case
  // where a 0-step "move" still lets the cast resolve).
  const queue: AICell[] = [origin];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const dist = chebyshev(cur, target);
    if (dist <= range) {
      if (!needsLos || ctx.hasLineOfSight(cur, target)) {
        return cur;
      }
    }
    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      if (!reachable.has(k)) continue;
      visited.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/**
 * Section 4(d): backline protection cell. Returns the tile the guardian/healer
 * should stand on to interpose itself between the nearest threat and the ward,
 * keeping AI_BACKLINE_GUARD_DISTANCE tiles from the ward. Returns null if
 * backline protection is disabled or no threat/ward exists.
 *
 * The guard cell is the tile on the line from the ward toward the threat, at
 * `guardDistance` tiles from the ward (clamped to reachable + passable).
 */
function backlineGuardCell(
  ward: AICell,
  threat: AICell,
  ctx: DecideEnemyContext,
  reachable: Set<string>,
): AICell | null {
  if (!AI_BACKLINE_PROTECT_ENABLED) return null;
  const dx = threat.x - ward.x;
  const dy = threat.y - ward.y;
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  // Step from the ward toward the threat by guardDistance tiles.
  const gx = ward.x + sx * AI_BACKLINE_GUARD_DISTANCE;
  const gy = ward.y + sy * AI_BACKLINE_GUARD_DISTANCE;
  const guard = { x: gx, y: gy };
  if (!isStepFree(gx, gy, ctx)) {
    // Try the orthogonal neighbor of the ideal guard tile.
    const altA = { x: gx + sy, y: gy + sx };
    const altB = { x: gx - sy, y: gy - sx };
    if (isStepFree(altA.x, altA.y, ctx) && reachable.has(key(altA.x, altA.y)))
      return altA;
    if (isStepFree(altB.x, altB.y, ctx) && reachable.has(key(altB.x, altB.y)))
      return altB;
    return null;
  }
  if (!reachable.has(key(gx, gy))) return null;
  return guard;
}

/**
 * Section 4(e): count the number of enemy combatants within the blast radius
 * of an AoE detonation centered on `center`. Used by the kamikaze profile to
 * gate detonation on AI_KAMIKAZE_MIN_TARGETS.
 */
function countTargetsInBlast(
  center: AICell,
  opponents: AICombatant[],
  radius: number,
): number {
  let count = 0;
  for (const c of opponents) {
    if (chebyshev(center, { x: c.x, y: c.y }) <= radius) count++;
  }
  return count;
}

/**
 * Section 4(f): structured intent log line for readability. Emits a
 * `logDebugInfo('TURN', 'intent', {archetype, action, target, reason})` entry
 * when AI_INTENT_LOG_ENABLED. Readability only — does not influence behavior.
 */
function logIntent(
  archetype: string,
  action: string,
  target: string | null,
  reason: string,
): void {
  if (!AI_INTENT_LOG_ENABLED) return;
  logDebugInfo("TURN", "intent", { archetype, action, target, reason });
}

/** Find the player's healer summon (Wisp) for harassment, if present. */
function findHealerSummon(ctx: DecideEnemyContext): AICombatant | null {
  return (
    ctx.combatants.find(
      (c) =>
        c.side === "player" &&
        c.isSummon &&
        (c.summonAI === "healer" || c.summonAI === "wisp"),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Per-archetype decision functions
// ---------------------------------------------------------------------------

function decideCaster(
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
): EnemyAction {
  const origin: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const hp = hpFrac({
    id: ctx.enemy.id,
    side: "enemy",
    name: ctx.enemy.pieceType,
    x: ctx.enemy.x,
    y: ctx.enemy.y,
    hp: ctx.enemy.hp,
    maxHp: ctx.enemy.maxHp,
    level: ctx.enemy.level,
  });
  // Self-preservation: retreat below 30% HP.
  if (hp < ENEMY_RETREAT_HP_PCT) {
    const nearest = opponents[0];
    const dest = nearest
      ? stepAway(origin, { x: nearest.x, y: nearest.y }, ctx, reachable, hp)
      : origin;
    ctx.log(`${ctx.enemy.pieceType} falls back, wounded`, RETREAT_COLOR);
    return {
      archetype: "caster",
      destination: dest,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "retreat",
      intentColor: RETREAT_COLOR,
      retreating: true,
    };
  }
  // Pick best target + spell, requiring range AND LoS.
  const scored = scoreTargets(opponents, ctx, null);
  for (const t of scored) {
    const spell = pickBestDamageSpell(ctx, t.combatant);
    if (!spell) continue;
    const targetCell = { x: t.combatant.x, y: t.combatant.y };
    const dist = chebyshev(origin, targetCell);
    const inRange = dist <= Number(spell.range);
    const los = ctx.hasLineOfSight(origin, targetCell);
    if (inRange && los) {
      // Section 4(a): prefer a target that dies this turn when lookahead is on.
      const lethal = applyLethalLookahead(scored, ctx, spell);
      const final = applyOverkillSpread(lethal, scored, ctx, spell);
      ctx.setFocusTargetId(final.combatant.id);
      ctx.markFocusSet();
      ctx.log(`${ctx.enemy.pieceType} casts ${spell.name}!`, CAST_COLOR);
      logIntent("caster", "cast", final.combatant.id, "in-range+los");
      return {
        archetype: "caster",
        destination: origin,
        spell,
        targetId: final.combatant.id,
        kind: "cast",
        intent: "cast",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
    // Section 4(c): in range but LoS blocked — reposition for a clear shot.
    if (inRange && !los) {
      const reposition = repositionForLOS(
        origin,
        targetCell,
        ctx,
        reachable,
        spell,
      );
      if (reposition) {
        ctx.log(`${ctx.enemy.pieceType} sidesteps for a shot`, MOVE_COLOR);
        logIntent("caster", "reposition-los", t.combatant.id, "los-blocked");
        return {
          archetype: "caster",
          destination: reposition,
          spell: null,
          targetId: null,
          kind: "skip",
          intent: "reposition-los",
          intentColor: MOVE_COLOR,
          retreating: false,
        };
      }
    }
  }
  // No in-range+LoS spell: reposition to gain LoS / optimal range.
  const target = scored[0];
  if (target) {
    const targetCell = { x: target.combatant.x, y: target.combatant.y };
    // Section 2a — move-then-cast: pick the best damage spell for this target
    // and, if a legal-cast tile is reachable this turn, path toward it and cast
    // from there in the same turn. Falls back to a plain advance if no legal
    // cast tile is reachable.
    const repositionSpell = pickBestDamageSpell(ctx, target.combatant);
    if (repositionSpell) {
      const castTile = findNearestLegalCastTile(
        origin,
        targetCell,
        ctx,
        reachable,
        repositionSpell,
      );
      if (castTile && (castTile.x !== origin.x || castTile.y !== origin.y)) {
        ctx.log(
          `${ctx.enemy.pieceType} closes in and casts ${repositionSpell.name}!`,
          CAST_COLOR,
        );
        logIntent("caster", "closes-in", target.combatant.id, "move-then-cast");
        return {
          archetype: "caster",
          destination: castTile,
          spell: repositionSpell,
          targetId: target.combatant.id,
          kind: "cast",
          intent: "closes-in",
          intentColor: CAST_COLOR,
          retreating: false,
        };
      }
      // Legal-cast tile unreachable this turn: move full MP toward it with
      // intent 'closes-in' so the enemy never idles.
      const dest = stepToward(origin, targetCell, ctx, reachable);
      if (dest.x !== origin.x || dest.y !== origin.y) {
        ctx.log(`${ctx.enemy.pieceType} closes in for a shot`, MOVE_COLOR);
        logIntent("caster", "closes-in", target.combatant.id, "approach-cast");
        return {
          archetype: "caster",
          destination: dest,
          spell: null,
          targetId: null,
          kind: "move",
          intent: "closes-in",
          intentColor: MOVE_COLOR,
          retreating: false,
        };
      }
    }
    const dest = stepToward(
      origin,
      { x: target.combatant.x, y: target.combatant.y },
      ctx,
      reachable,
    );
    if (dest.x !== origin.x || dest.y !== origin.y) {
      ctx.log(`${ctx.enemy.pieceType} repositions for a shot`, MOVE_COLOR);
      logIntent("caster", "reposition", target.combatant.id, "no-in-range");
      return {
        archetype: "caster",
        destination: dest,
        spell: null,
        targetId: null,
        kind: "move",
        intent: "reposition",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
  }
  ctx.log(`${ctx.enemy.pieceType} holds`, SKIP_COLOR);
  logIntent("caster", "hold", null, "no-target-reachable");
  return {
    archetype: "caster",
    destination: origin,
    spell: null,
    targetId: null,
    kind: "skip",
    intent: "hold",
    intentColor: SKIP_COLOR,
    retreating: false,
  };
}

function decideHealer(
  ctx: DecideEnemyContext,
  allies: AICombatant[],
  opponents: AICombatant[],
  reachable: Set<string>,
): EnemyAction {
  const origin: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  // Heal the most-wounded ally below 50% HP (not random).
  const wounded = allies
    .filter((a) => hpFrac(a) < ENEMY_HEAL_ALLY_THRESHOLD_PCT)
    .sort((a, b) => hpFrac(a) - hpFrac(b))[0];
  const healSpell = ctx.availableSpells.find(
    (s) => s.spellType === "heal" || (s.healAmount ?? 0) > 0,
  );
  if (wounded && healSpell) {
    const dist = chebyshev(origin, { x: wounded.x, y: wounded.y });
    if (dist <= Number(healSpell.range)) {
      ctx.log(`${ctx.enemy.pieceType} heals ${wounded.name}`, HEAL_COLOR);
      logIntent("healer", "heal", wounded.id, "wounded-ally-in-range");
      return {
        archetype: "healer",
        destination: origin,
        spell: healSpell,
        targetId: wounded.id,
        kind: "cast",
        intent: "heal",
        intentColor: HEAL_COLOR,
        retreating: false,
      };
    }
    // Move toward the wounded ally.
    const dest = stepToward(
      origin,
      { x: wounded.x, y: wounded.y },
      ctx,
      reachable,
    );
    ctx.log(`${ctx.enemy.pieceType} moves to heal ${wounded.name}`, MOVE_COLOR);
    logIntent("healer", "approach-ally", wounded.id, "wounded-out-of-range");
    return {
      archetype: "healer",
      destination: dest,
      spell: null,
      targetId: null,
      kind: "move",
      intent: "approach-ally",
      intentColor: MOVE_COLOR,
      retreating: false,
    };
  }
  // Section 4(d): no healing needed — interpose between the nearest threat
  // and the most valuable ward (the player, or the lowest-HP ally) so the
  // backline is protected while the healer waits for a wound to appear.
  if (
    AI_BACKLINE_PROTECT_ENABLED &&
    opponents.length > 0 &&
    allies.length > 0
  ) {
    const ward = allies.find((a) => !a.isSummon) ?? allies[0]; // prefer the player
    const threat = opponents[0];
    const guard = backlineGuardCell(
      { x: ward.x, y: ward.y },
      { x: threat.x, y: threat.y },
      ctx,
      reachable,
    );
    if (guard && (guard.x !== origin.x || guard.y !== origin.y)) {
      ctx.log(`${ctx.enemy.pieceType} guards the backline`, MOVE_COLOR);
      logIntent("healer", "backline-guard", ward.id, "interpose");
      return {
        archetype: "healer",
        destination: guard,
        spell: null,
        targetId: null,
        kind: "move",
        intent: "backline-guard",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
  }
  // No healing needed and no guard cell: act as a weak caster on the lowest-HP opponent.
  const fallback = decideCaster(ctx, opponents, reachable);
  logIntent("healer", fallback.intent, fallback.targetId, "fallback-caster");
  return fallback;
}

function decideCharger(
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
): EnemyAction {
  const origin: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const scored = scoreTargets(opponents, ctx, null);
  const target = scored[0];
  if (!target) {
    ctx.log(`${ctx.enemy.pieceType} holds`, SKIP_COLOR);
    logIntent("charger", "hold", null, "no-target");
    return {
      archetype: "charger",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "hold",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  const targetCell = { x: target.combatant.x, y: target.combatant.y };
  const dist = chebyshev(origin, targetCell);
  // Commit only when the charger can REACH the target this turn (dist <= budget).
  const canReach = dist <= ENEMY_REACHABLE_STEP_BUDGET + 1; // +1 for the attack step
  if (dist <= 1) {
    // Adjacent: melee. Section 4(a): prefer a target that dies this turn.
    const spell = pickBestDamageSpell(ctx, target.combatant);
    const lethal = applyLethalLookahead(scored, ctx, spell);
    const finalTarget = lethal.combatant;
    ctx.log(`${ctx.enemy.pieceType} charges ${finalTarget.name}!`, CAST_COLOR);
    logIntent("charger", spell ? "cast" : "melee", finalTarget.id, "adjacent");
    return {
      archetype: "charger",
      destination: origin,
      spell,
      targetId: finalTarget.id,
      kind: spell ? "cast" : "melee",
      intent: "charge",
      intentColor: CAST_COLOR,
      retreating: false,
    };
  }
  if (!canReach) {
    // Out of reach: hold rather than suicide-advance into a bad position.
    ctx.log(`${ctx.enemy.pieceType} waits to charge`, SKIP_COLOR);
    logIntent("charger", "wait", target.combatant.id, "out-of-reach");
    return {
      archetype: "charger",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "wait",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  // Section 2a — move-then-cast: the charger has a ranged option. If a
  // legal-cast tile is reachable this turn, path there and cast from it in the
  // same turn. Otherwise advance toward the target with intent 'closes-in'.
  const chargeSpell = pickBestDamageSpell(ctx, target.combatant);
  if (chargeSpell) {
    const castTile = findNearestLegalCastTile(
      origin,
      targetCell,
      ctx,
      reachable,
      chargeSpell,
    );
    if (castTile && (castTile.x !== origin.x || castTile.y !== origin.y)) {
      ctx.log(
        `${ctx.enemy.pieceType} closes in and casts ${chargeSpell.name}!`,
        CAST_COLOR,
      );
      logIntent("charger", "closes-in", target.combatant.id, "move-then-cast");
      return {
        archetype: "charger",
        destination: castTile,
        spell: chargeSpell,
        targetId: target.combatant.id,
        kind: "cast",
        intent: "closes-in",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
  }
  // Advance toward the target.
  const dest = stepToward(origin, targetCell, ctx, reachable);
  if (dest.x !== origin.x || dest.y !== origin.y) {
    ctx.log(`${ctx.enemy.pieceType} charges forward!`, MOVE_COLOR);
    logIntent("charger", "advance", target.combatant.id, "in-reach");
  } else {
    logIntent("charger", "hold", target.combatant.id, "blocked");
  }
  return {
    archetype: "charger",
    destination: dest,
    spell: null,
    targetId: null,
    kind: "move",
    intent: "advance",
    intentColor: MOVE_COLOR,
    retreating: false,
  };
}

function decideFlanker(
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
): EnemyAction {
  const origin: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const hp = hpFrac({
    id: ctx.enemy.id,
    side: "enemy",
    name: ctx.enemy.pieceType,
    x: ctx.enemy.x,
    y: ctx.enemy.y,
    hp: ctx.enemy.hp,
    maxHp: ctx.enemy.maxHp,
    level: ctx.enemy.level,
  });
  const scored = scoreTargets(opponents, ctx, null);
  const target = scored[0];
  if (!target) {
    ctx.log(`${ctx.enemy.pieceType} holds`, SKIP_COLOR);
    logIntent("flanker", "hold", null, "no-target");
    return {
      archetype: "flanker",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "hold",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  // Self-preservation first.
  if (hp < ENEMY_RETREAT_HP_PCT) {
    const dest = stepAway(
      origin,
      { x: target.combatant.x, y: target.combatant.y },
      ctx,
      reachable,
      hp,
    );
    ctx.log(`${ctx.enemy.pieceType} falls back, wounded`, RETREAT_COLOR);
    logIntent("flanker", "retreat", target.combatant.id, "low-hp");
    return {
      archetype: "flanker",
      destination: dest,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "retreat",
      intentColor: RETREAT_COLOR,
      retreating: true,
    };
  }
  const targetCell = { x: target.combatant.x, y: target.combatant.y };
  const dist = chebyshev(origin, targetCell);
  if (dist <= 1) {
    const spell = pickBestDamageSpell(ctx, target.combatant);
    // Section 4(a): prefer a target that dies this turn.
    const lethal = applyLethalLookahead(scored, ctx, spell);
    const finalTarget = lethal.combatant;
    ctx.log(`${ctx.enemy.pieceType} strikes from the flank!`, CAST_COLOR);
    logIntent(
      "flanker",
      spell ? "cast" : "melee",
      finalTarget.id,
      "flank-strike",
    );
    return {
      archetype: "flanker",
      destination: origin,
      spell,
      targetId: finalTarget.id,
      kind: spell ? "cast" : "melee",
      intent: "flank-strike",
      intentColor: CAST_COLOR,
      retreating: false,
    };
  }
  // Path to a side/rear tile, avoiding tackle zones.
  const dest = stepFlank(origin, targetCell, ctx, reachable);
  if (dest.x !== origin.x || dest.y !== origin.y) {
    // Describe the flank direction succinctly.
    const dir =
      dest.x > origin.x
        ? "right"
        : dest.x < origin.x
          ? "left"
          : dest.y > origin.y
            ? "below"
            : "above";
    ctx.log(`${ctx.enemy.pieceType} flanks your ${dir}!`, FLANK_COLOR);
    logIntent("flanker", "flank", target.combatant.id, `approach-${dir}`);
  } else {
    logIntent("flanker", "hold", target.combatant.id, "blocked");
  }
  return {
    archetype: "flanker",
    destination: dest,
    spell: null,
    targetId: null,
    kind: "move",
    intent: "flank",
    intentColor: FLANK_COLOR,
    retreating: false,
  };
}

function decideBerserker(
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
): EnemyAction {
  const origin: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const hp = hpFrac({
    id: ctx.enemy.id,
    side: "enemy",
    name: ctx.enemy.pieceType,
    x: ctx.enemy.x,
    y: ctx.enemy.y,
    hp: ctx.enemy.hp,
    maxHp: ctx.enemy.maxHp,
    level: ctx.enemy.level,
  });
  const scored = scoreTargets(opponents, ctx, null);
  const target = scored[0];
  if (!target) {
    logIntent("berserker", "rage", null, "no-target");
    return {
      archetype: "berserker",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "rage",
      intentColor: CAST_COLOR,
      retreating: false,
    };
  }
  // Tier-gated wounded sacrifice: when the berserker is below the sacrifice
  // HP threshold, the berserker ignores its wounds and presses the nearest
  // target even harder (no retreat, no hold). Gated purely on
  // ENEMY_WOUNDED_SACRIFICE_HP_PCT — ENEMY_AI_TIER_GATES has no
  // berserkerSacrifice key, so the threshold alone is the gate.
  const sacrificeEligible = hp < ENEMY_WOUNDED_SACRIFICE_HP_PCT;
  const targetCell = { x: target.combatant.x, y: target.combatant.y };
  const dist = chebyshev(origin, targetCell);
  if (dist <= 1) {
    const spell = pickBestDamageSpell(ctx, target.combatant);
    // Section 4(a): prefer a target that dies this turn.
    const lethal = applyLethalLookahead(scored, ctx, spell);
    const finalTarget = lethal.combatant;
    ctx.log(`${ctx.enemy.pieceType} rages on ${finalTarget.name}!`, CAST_COLOR);
    logIntent(
      "berserker",
      spell ? "cast" : "melee",
      finalTarget.id,
      sacrificeEligible ? "wounded-sacrifice" : "adjacent",
    );
    return {
      archetype: "berserker",
      destination: origin,
      spell,
      targetId: finalTarget.id,
      kind: spell ? "cast" : "melee",
      intent: "rage",
      intentColor: CAST_COLOR,
      retreating: false,
    };
  }
  const dest = stepToward(origin, targetCell, ctx, reachable);
  if (sacrificeEligible) {
    ctx.log(`${ctx.enemy.pieceType} rages forward, bleeding!`, RETREAT_COLOR);
    logIntent(
      "berserker",
      "rage-advance",
      target.combatant.id,
      "wounded-sacrifice",
    );
  } else if (dest.x !== origin.x || dest.y !== origin.y) {
    ctx.log(`${ctx.enemy.pieceType} rages forward!`, MOVE_COLOR);
    logIntent("berserker", "rage-advance", target.combatant.id, "advance");
  } else {
    logIntent("berserker", "hold", target.combatant.id, "blocked");
  }
  return {
    archetype: "berserker",
    destination: dest,
    spell: null,
    targetId: null,
    kind: "move",
    intent: "rage-advance",
    intentColor: sacrificeEligible ? RETREAT_COLOR : MOVE_COLOR,
    retreating: false,
  };
}

function decideGeneric(
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
): EnemyAction {
  const origin: AICell = { x: ctx.enemy.x, y: ctx.enemy.y };
  const hp = hpFrac({
    id: ctx.enemy.id,
    side: "enemy",
    name: ctx.enemy.pieceType,
    x: ctx.enemy.x,
    y: ctx.enemy.y,
    hp: ctx.enemy.hp,
    maxHp: ctx.enemy.maxHp,
    level: ctx.enemy.level,
  });
  const scored = scoreTargets(opponents, ctx, null);
  const target = scored[0];
  if (!target) {
    logIntent("generic", "hold", null, "no-target");
    return {
      archetype: "generic",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "hold",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  // Self-preservation for non-berserk generics.
  if (hp < ENEMY_RETREAT_HP_PCT) {
    const dest = stepAway(
      origin,
      { x: target.combatant.x, y: target.combatant.y },
      ctx,
      reachable,
      hp,
    );
    ctx.log(`${ctx.enemy.pieceType} retreats`, RETREAT_COLOR);
    logIntent("generic", "retreat", target.combatant.id, "low-hp");
    return {
      archetype: "generic",
      destination: dest,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "retreat",
      intentColor: RETREAT_COLOR,
      retreating: true,
    };
  }
  const targetCell = { x: target.combatant.x, y: target.combatant.y };
  const dist = chebyshev(origin, targetCell);
  // Try a ranged spell first.
  const spell = pickBestDamageSpell(ctx, target.combatant);
  if (spell && dist <= Number(spell.range)) {
    const los =
      spell.lineOfSight === false
        ? true
        : ctx.hasLineOfSight(origin, targetCell);
    if (los) {
      // Section 4(a): prefer a target that dies this turn when lookahead is on.
      const lethal = applyLethalLookahead(scored, ctx, spell);
      const final = applyOverkillSpread(lethal, scored, ctx, spell);
      ctx.setFocusTargetId(final.combatant.id);
      ctx.markFocusSet();
      ctx.log(`${ctx.enemy.pieceType} casts ${spell.name}!`, CAST_COLOR);
      logIntent("generic", "cast", final.combatant.id, "in-range+los");
      return {
        archetype: "generic",
        destination: origin,
        spell,
        targetId: final.combatant.id,
        kind: "cast",
        intent: "cast",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
    // Section 4(c): in range but LoS blocked — reposition for a clear shot.
    const reposition = repositionForLOS(
      origin,
      targetCell,
      ctx,
      reachable,
      spell,
    );
    if (reposition) {
      ctx.log(`${ctx.enemy.pieceType} sidesteps for a shot`, MOVE_COLOR);
      logIntent(
        "generic",
        "reposition-los",
        target.combatant.id,
        "los-blocked",
      );
      return {
        archetype: "generic",
        destination: reposition,
        spell: null,
        targetId: null,
        kind: "skip",
        intent: "reposition-los",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
  }
  // Melee if adjacent.
  if (dist <= 1) {
    // Section 4(a): prefer a target that dies this turn.
    const lethal = applyLethalLookahead(scored, ctx, spell);
    const finalTarget = lethal.combatant;
    ctx.log(`${ctx.enemy.pieceType} strikes ${finalTarget.name}`, CAST_COLOR);
    logIntent("generic", "melee", finalTarget.id, "adjacent");
    return {
      archetype: "generic",
      destination: origin,
      spell: spell,
      targetId: finalTarget.id,
      kind: spell ? "cast" : "melee",
      intent: "melee",
      intentColor: CAST_COLOR,
      retreating: false,
    };
  }
  // Section 2a — move-then-cast: the generic has a ranged option. If a
  // legal-cast tile is reachable this turn, path there and cast from it in the
  // same turn. Otherwise advance toward the target with intent 'closes-in'.
  const advanceSpell = pickBestDamageSpell(ctx, target.combatant);
  if (advanceSpell) {
    const castTile = findNearestLegalCastTile(
      origin,
      targetCell,
      ctx,
      reachable,
      advanceSpell,
    );
    if (castTile && (castTile.x !== origin.x || castTile.y !== origin.y)) {
      ctx.log(
        `${ctx.enemy.pieceType} closes in and casts ${advanceSpell.name}!`,
        CAST_COLOR,
      );
      logIntent("generic", "closes-in", target.combatant.id, "move-then-cast");
      return {
        archetype: "generic",
        destination: castTile,
        spell: advanceSpell,
        targetId: target.combatant.id,
        kind: "cast",
        intent: "closes-in",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
  }
  // Advance.
  const dest = stepToward(origin, targetCell, ctx, reachable);
  if (dest.x !== origin.x || dest.y !== origin.y) {
    ctx.log(`${ctx.enemy.pieceType} moves toward you`, MOVE_COLOR);
    logIntent("generic", "advance", target.combatant.id, "approach");
  } else {
    logIntent("generic", "hold", target.combatant.id, "blocked");
  }
  return {
    archetype: "generic",
    destination: dest,
    spell: null,
    targetId: null,
    kind: "move",
    intent: "advance",
    intentColor: MOVE_COLOR,
    retreating: false,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Pure enemy-AI decision function. Returns a single `EnemyAction` describing
 * the enemy's move this turn. No React, no DOM, no side effects beyond the
 * intent log line(s) emitted via `ctx.log` and the focus-coordination setters.
 *
 * Determinism: given the same `enemy`, `ctx.combatants`, `ctx.grid`, and
 * `ctx.rng` sequence, the returned action is identical.
 */
export function decideEnemyAction(
  enemy: Enemy,
  ctx: DecideEnemyContext,
): EnemyAction {
  const archetype = inferArchetype(ctx);
  const origin: AICell = { x: enemy.x, y: enemy.y };
  const reachable = computeReachable(origin, ctx);

  // Split combatants into opponents and allies relative to this enemy.
  const opponents: AICombatant[] = ctx.combatants.filter(
    (c) => c.side === "player" && c.id !== enemy.id,
  );
  const allies: AICombatant[] = ctx.combatants.filter(
    (c) => c.side === "enemy" && c.id !== enemy.id,
  );

  // Coordination-lite: one pack member harasses the player's healer summon.
  // If focus isn't set this turn and a Wisp/healer summon exists, a non-healer
  // enemy prioritizes it. We do this by promoting the summon to the front of
  // the opponent list for non-healer archetypes.
  let prioritizedOpponents = opponents;
  if (archetype !== "healer" && !ctx.focusAlreadySet) {
    const healerSummon = findHealerSummon(ctx);
    if (healerSummon) {
      prioritizedOpponents = [
        healerSummon,
        ...opponents.filter((o) => o.id !== healerSummon.id),
      ];
    }
  }

  switch (archetype) {
    case "healer":
      return decideHealer(ctx, allies, prioritizedOpponents, reachable);
    case "caster":
      return decideCaster(ctx, prioritizedOpponents, reachable);
    case "charger":
      return decideCharger(ctx, prioritizedOpponents, reachable);
    case "flanker":
      return decideFlanker(ctx, prioritizedOpponents, reachable);
    case "berserker":
      return decideBerserker(ctx, prioritizedOpponents, reachable);
    default:
      return decideGeneric(ctx, prioritizedOpponents, reachable);
  }
}

// ---------------------------------------------------------------------------
// Summon AI (Section 2b) — decideSummonAction
// ---------------------------------------------------------------------------

/**
 * Build an `AICombatant` view of a summon `Enemy` for archetype inference and
 * shared helper calls. The summon's `side` drives opponent/ally resolution.
 */
function summonToCombatant(summon: Enemy): AICombatant {
  return {
    id: summon.id,
    side: summon.side === "player" ? "player" : "enemy",
    isSummon: true,
    summonAI: summon.summonAI,
    name: summon.pieceType,
    x: summon.x,
    y: summon.y,
    hp: summon.hp,
    maxHp: summon.maxHp,
    level: summon.level,
  };
}

/**
 * Look up a kit spell by id from the summon's available + assigned spells.
 * Returns the first match (available spells take priority so cooldowns are
 * respected), or null if the kit spell is not ready / not present.
 */
function findKitSpell(
  spellId: string,
  ctx: DecideEnemyContext,
): SpellConfig | null {
  const fromAvailable = ctx.availableSpells.find((s) => s.id === spellId);
  if (fromAvailable) return fromAvailable;
  const fromAssigned = ctx.assignedSpells.find((s) => s.id === spellId);
  return fromAssigned ?? null;
}

/**
 * Pure summon-AI decision function. Mirrors `decideEnemyAction` but resolves
 * the archetype via `inferSummonArchetype` and dispatches to one of five
 * summon profiles (hunter, guardian, archer, bomber, healer). Returns the
 * same `EnemyAction` shape so the WX call site can apply it through the
 * existing apply branch.
 *
 * The summon's `side` field ("player" | "enemy") determines opponents and
 * allies: opponents are combatants on the opposite side, allies are combatants
 * on the same side (excluding the summon itself).
 *
 * Determinism: same inputs → same action, like `decideEnemyAction`.
 */
export function decideSummonAction(
  summon: Enemy,
  ctx: DecideEnemyContext,
): EnemyAction {
  const archetype = inferSummonArchetype(summonToCombatant(summon));
  const origin: AICell = { x: summon.x, y: summon.y };
  const reachable = computeReachable(origin, ctx);

  const summonSide = summon.side === "player" ? "player" : "enemy";
  const opponents: AICombatant[] = ctx.combatants.filter(
    (c) => c.side !== summonSide && c.id !== summon.id,
  );
  const allies: AICombatant[] = ctx.combatants.filter(
    (c) => c.side === summonSide && c.id !== summon.id,
  );

  let action: EnemyAction;
  switch (archetype) {
    case "hunter":
      action = decideSummonHunter(summon, ctx, opponents, reachable, origin);
      break;
    case "guardian":
      action = decideSummonGuardian(
        summon,
        ctx,
        allies,
        opponents,
        reachable,
        origin,
      );
      break;
    case "archer":
      action = decideSummonArcher(summon, ctx, opponents, reachable, origin);
      break;
    case "bomber":
      action = decideSummonBomber(summon, ctx, opponents, reachable, origin);
      break;
    case "healer":
      action = decideSummonHealer(
        summon,
        ctx,
        allies,
        opponents,
        reachable,
        origin,
      );
      break;
    default:
      action = decideSummonHunter(summon, ctx, opponents, reachable, origin);
      break;
  }

  logDebugInfo("SUMMON", "SUMMON-DECIDE", {
    archetype,
    kind: action.kind,
    spellId: action.spell?.id ?? "none",
    targetId: action.targetId ?? "none",
  });
  return action;
}

/**
 * Summoner (enemy-only archetype): instead of attacking, the enemy casts one
 * of its assigned summon spells (wolf/archer) on a tile between itself and an
 * ally, mid-way to the player. Skips when no summon spell is assigned, when
 * the enemy-side summon cap is reached, when on cooldown, or when no
 * placement can be derived.
 *
 * The "every other turn" cadence is enforced via `ENEMY_SUMMON_COOLDOWN_TURNS`
 * using `ctx.lastSummonTurn` + `ctx.currentTurn`. The cap (`ENEMY_SUMMON_CAP`)
 * is the other guard, mirroring the player-side `summonCount` gate.
 */
export function decideSummonerAction(
  enemy: AICombatant,
  ctx: DecideEnemyContext,
): EnemyAction {
  const summonSpell =
    (ctx.assignedSpells ?? []).find(
      (s) => s.isSummon === true && s.usableByEnemy !== false,
    ) ?? null;

  if (!summonSpell) {
    return {
      archetype: "summoner",
      kind: "skip",
      spell: null,
      targetId: null,
      destination: { x: enemy.x, y: enemy.y },
      intent: "no summon spell",
      intentColor: "#ef4444",
      retreating: false,
    };
  }

  const existingEnemySummons = ctx.combatants.filter(
    (c) => c.isSummon === true && c.side === "enemy",
  );
  if (existingEnemySummons.length >= ENEMY_SUMMON_CAP) {
    return {
      archetype: "summoner",
      kind: "skip",
      spell: null,
      targetId: null,
      destination: { x: enemy.x, y: enemy.y },
      intent: "summon cap reached",
      intentColor: "#ef4444",
      retreating: false,
    };
  }

  // Cooldown: skip if this summoner cast a summon within the last
  // ENEMY_SUMMON_COOLDOWN_TURNS turns. Only enforced when both ctx.currentTurn
  // and ctx.lastSummonTurn are provided (the WX summoner branch wires both).
  if (
    ctx.currentTurn != null &&
    ctx.lastSummonTurn != null &&
    ctx.currentTurn - ctx.lastSummonTurn < ENEMY_SUMMON_COOLDOWN_TURNS
  ) {
    return {
      archetype: "summoner",
      kind: "skip",
      spell: null,
      targetId: null,
      destination: { x: enemy.x, y: enemy.y },
      intent: "summon cooldown",
      intentColor: "#ef4444",
      retreating: false,
    };
  }

  const player = ctx.combatants.find((c) => c.side === "player" && !c.isSummon);
  const ally = ctx.combatants.find(
    (c) => c.side === "enemy" && c.id !== enemy.id && !c.isSummon,
  );
  const midX = player && ally ? Math.round((player.x + ally.x) / 2) : enemy.x;
  const midY = player && ally ? Math.round((player.y + ally.y) / 2) : enemy.y;

  return {
    archetype: "summoner",
    kind: "cast",
    spell: summonSpell,
    targetId: null,
    destination: { x: midX, y: midY },
    intent: "summon",
    intentColor: "#ef4444",
    retreating: false,
  };
}

/**
 * Hunter (wolf): attack the nearest/lowest-HP opponent with physical_attack or
 * spell-venom-strike. applyLethalLookahead prefers a target that dies this turn.
 */
function decideSummonHunter(
  summon: Enemy,
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
  origin: AICell,
): EnemyAction {
  const kit = SUMMON_KIT.hunter;
  if (opponents.length === 0) {
    logIntent("hunter", "hold", null, "no-target");
    return {
      archetype: "generic",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "hold",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  const venom = findKitSpell(kit[1], ctx);
  const scored = scoreTargets(opponents, ctx, venom);
  const target = scored[0];
  const targetCell = { x: target.combatant.x, y: target.combatant.y };
  const dist = chebyshev(origin, targetCell);
  // Prefer venom strike when in range; fall back to physical_attack (melee).
  if (venom && dist <= Number(venom.range)) {
    const los =
      venom.lineOfSight === false
        ? true
        : ctx.hasLineOfSight(origin, targetCell);
    if (los) {
      const lethal = applyLethalLookahead(scored, ctx, venom);
      ctx.log(
        `${summon.pieceType} venom-strikes ${lethal.combatant.name}!`,
        CAST_COLOR,
      );
      logIntent("hunter", "cast", lethal.combatant.id, "venom-strike");
      return {
        archetype: "generic",
        destination: origin,
        spell: venom,
        targetId: lethal.combatant.id,
        kind: "cast",
        intent: "venom-strike",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
  }
  // Melee (physical_attack) when adjacent.
  if (dist <= 1) {
    const lethal = applyLethalLookahead(scored, ctx, null);
    ctx.log(`${summon.pieceType} bites ${lethal.combatant.name}!`, CAST_COLOR);
    logIntent("hunter", "melee", lethal.combatant.id, "physical-attack");
    return {
      archetype: "generic",
      destination: origin,
      spell: null,
      targetId: lethal.combatant.id,
      kind: "melee",
      intent: "physical-attack",
      intentColor: CAST_COLOR,
      retreating: false,
    };
  }
  // Advance toward the nearest/lowest-HP target.
  const dest = stepToward(origin, targetCell, ctx, reachable);
  if (dest.x !== origin.x || dest.y !== origin.y) {
    ctx.log(`${summon.pieceType} stalks ${target.combatant.name}`, MOVE_COLOR);
    logIntent("hunter", "advance", target.combatant.id, "stalk");
  } else {
    logIntent("hunter", "hold", target.combatant.id, "blocked");
  }
  return {
    archetype: "generic",
    destination: dest,
    spell: null,
    targetId: null,
    kind: "move",
    intent: "advance",
    intentColor: MOVE_COLOR,
    retreating: false,
  };
}

// ---------------------------------------------------------------------------
// Section 5 — Summon→Summon Ally Buffs
//
// Shared ally-scoring helpers used by the guardian (golem) and healer (wisp)
// archetypes so their buff/heal/rally target selection considers the WHOLE
// allied group — the player AND every player-side summon — instead of being
// hard-pinned to the player via a `!a.isSummon` filter.
//
// Scoring reuses the existing ENEMY_UTILITY_WEIGHTS / ENEMY_THREAT_VALUES so
// ally prioritization stays consistent with enemy target scoring:
//   score = wLowHp   * (1 - hpFrac)        // urgency: dying allies first
//         + wThreat  * threatValue         // value: wisp > healer > summon
//         + wProximity * proximity          // closer allies preferred
// Higher score = preferred ally. `wKillable` is intentionally omitted — we
// never want to "finish off" an ally; the urgency term already captures
// "this ally is about to die, save it".
// ---------------------------------------------------------------------------

/**
 * Score an allied combatant for buff/heal/rally target selection. Higher is
 * better. Returns 0 for an absent ally (caller treats null/undefined ward).
 *
 * @param ally       Candidate ally (player or allied summon).
 * @param summon     The acting summon (used for proximity + to skip self).
 * @param archetype  Acting archetype key, surfaced in the ally-target log.
 * @param action     Action label for the log (e.g. "shield", "rally").
 */
function scoreAlly(
  ally: AICombatant,
  summon: Enemy,
  archetype: string,
  action: string,
): number {
  // Urgency: lower hpFrac → higher urgency. (1 - hpFrac) ∈ [0,1].
  const urgency = (1 - hpFrac(ally)) * ENEMY_UTILITY_WEIGHTS.wLowHp;
  // Threat/value: wisp > healer > summon > default. Uses summonAI metadata,
  // never name-based heuristics (per user instruction).
  const threatKey = (ally.summonAI ?? "").toLowerCase() || "default";
  const threatValue =
    ENEMY_THREAT_VALUES[threatKey] ?? ENEMY_THREAT_VALUES.default;
  const threat = threatValue * ENEMY_UTILITY_WEIGHTS.wThreat;
  // Proximity: closer allies are easier to reach this turn. Inverted Chebyshev
  // distance normalized against the grid diagonal so the term stays in [0,1].
  const dist = chebyshev(
    { x: summon.x, y: summon.y },
    { x: ally.x, y: ally.y },
  );
  const maxDist = Math.max(1, WORLD_GRID_SIZE * 2);
  const proximity =
    (1 - Math.min(1, dist / maxDist)) * ENEMY_UTILITY_WEIGHTS.wProximity;
  const score = urgency + threat + proximity;
  emitAllyTargetLog(summon, archetype, ally, action, score);
  return score;
}

/**
 * Emit the ally-target evaluation log line, gated on AI_INTENT_LOG_ENABLED.
 * Produces a single `[SUMMON-AI] summon=X archetype=A → ally-target=Y
 * action=Z score=S` entry via logDebugInfo under the "SUMMON" category (matches
 * the existing SUMMON-DECIDE log at the top of decideSummonAction).
 */
function emitAllyTargetLog(
  summon: Enemy,
  archetype: string,
  allyTarget: AICombatant,
  action: string,
  score: number,
): void {
  if (!AI_INTENT_LOG_ENABLED) return;
  logDebugInfo("SUMMON", "ally-target", {
    summon: summon.pieceType,
    archetype,
    allyTarget: allyTarget.name,
    allyId: allyTarget.id,
    action,
    score: Math.round(score * 100) / 100,
  });
}

/**
 * Pick the best allied buff/heal/rally target from the full allies array using
 * scoreAlly. Returns null when there are no allies. The player is NOT
 * hard-pinned — a low-HP allied summon can outrank a healthy player.
 */
function pickBestAlly(
  allies: AICombatant[],
  summon: Enemy,
  archetype: string,
  action: string,
): AICombatant | null {
  if (allies.length === 0) return null;
  let best: AICombatant | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const ally of allies) {
    const score = scoreAlly(ally, summon, archetype, action);
    if (score > bestScore) {
      bestScore = score;
      best = ally;
    }
  }
  return best;
}

/**
 * Guardian (golem): stay adjacent to the player, cast starter-shield when the
 * player is unshielded, and use backlineGuardCell to interpose between the
 * nearest threat and the ward (the player).
 */
function decideSummonGuardian(
  summon: Enemy,
  ctx: DecideEnemyContext,
  allies: AICombatant[],
  opponents: AICombatant[],
  reachable: Set<string>,
  origin: AICell,
): EnemyAction {
  const kit = SUMMON_KIT.guardian;
  // Ward = best-scored ally across the WHOLE allied group (player + allied
  // summons). Section 5: previously `allies.find(a => !a.isSummon)` hard-pinned
  // the ward to the player, so a golem could never Shield a low-HP allied
  // summon even when the player was already shielded. Now a dying high-value
  // summon (wisp/healer) can outrank a healthy player via scoreAlly's urgency
  // + threat terms. The shield cast below already uses ward.id as targetId, so
  // once ward can be a summon the existing ally-target cast path (#306) fires.
  const ward = pickBestAlly(allies, summon, "guardian", "shield");
  // Cast starter-shield on the ward when it is in range. The ward's shield
  // state is not observable on AICombatant (no activeEffects field), so we
  // gate on the shield spell being ready (cooldown-filtered via
  // availableSpells) and the ward being in range; the apply layer handles
  // buff application / stacking. When the ward is out of range or absent,
  // fall back to Iron Skin (spell-iron-skin) on self so the guardian never
  // silently holds when a valid self-buff cast exists.
  const shield = findKitSpell(kit[0], ctx);
  if (shield && ward) {
    const wardCell = { x: ward.x, y: ward.y };
    const dist = chebyshev(origin, wardCell);
    const inRange = dist <= Number(shield.range);
    if (inRange) {
      ctx.log(`${summon.pieceType} shields ${ward.name}`, HEAL_COLOR);
      logIntent("guardian", "cast", ward.id, "starter-shield");
      return {
        archetype: "generic",
        destination: origin,
        spell: shield,
        targetId: ward.id,
        kind: "cast",
        intent: "starter-shield",
        intentColor: HEAL_COLOR,
        retreating: false,
      };
    }
  }
  // Iron Skin self-buff fallback: harden self when the ward is out of range
  // or no ward exists. spell-iron-skin is targetType "ally" (range 3), so the
  // summon self-casts with targetId = summon.id — the executor gate at
  // summonExecutor.ts line 123 fires on the resolved spell object + id.
  const ironSkin = findKitSpell(kit[1], ctx);
  if (ironSkin) {
    ctx.log(`${summon.pieceType} hardens with Iron Skin`, HEAL_COLOR);
    logIntent("guardian", "cast", summon.id, "spell-iron-skin");
    return {
      archetype: "generic",
      destination: origin,
      spell: ironSkin,
      targetId: summon.id,
      kind: "cast",
      intent: "spell-iron-skin",
      intentColor: HEAL_COLOR,
      retreating: false,
    };
  }
  // Interpose between the nearest threat and the ward.
  if (ward && opponents.length > 0) {
    const threat = opponents[0];
    const guard = backlineGuardCell(
      { x: ward.x, y: ward.y },
      { x: threat.x, y: threat.y },
      ctx,
      reachable,
    );
    if (guard && (guard.x !== origin.x || guard.y !== origin.y)) {
      ctx.log(`${summon.pieceType} body-blocks for ${ward.name}`, MOVE_COLOR);
      logIntent("guardian", "backline-guard", ward.id, "interpose");
      return {
        archetype: "generic",
        destination: guard,
        spell: null,
        targetId: null,
        kind: "move",
        intent: "backline-guard",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
    // Move adjacent to the ward if not already body-blocking.
    const dest = stepToward(origin, { x: ward.x, y: ward.y }, ctx, reachable);
    if (dest.x !== origin.x || dest.y !== origin.y) {
      ctx.log(`${summon.pieceType} stays close to ${ward.name}`, MOVE_COLOR);
      logIntent("guardian", "advance", ward.id, "stay-adjacent");
      return {
        archetype: "generic",
        destination: dest,
        spell: null,
        targetId: null,
        kind: "move",
        intent: "stay-adjacent",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
  }
  logIntent("guardian", "hold", null, "no-ward-or-threat");
  return {
    archetype: "generic",
    destination: origin,
    spell: null,
    targetId: null,
    kind: "skip",
    intent: "hold",
    intentColor: SKIP_COLOR,
    retreating: false,
  };
}

/**
 * Archer (kiter): maintain 3+ tile range, cast starter-poison or spell-slow.
 * repositionForLOS before giving up on a cast.
 */
function decideSummonArcher(
  summon: Enemy,
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
  origin: AICell,
): EnemyAction {
  const kit = SUMMON_KIT.archer;
  if (opponents.length === 0) {
    logIntent("archer", "hold", null, "no-target");
    return {
      archetype: "generic",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "hold",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  const poison = findKitSpell(kit[0], ctx);
  const slow = findKitSpell(kit[1], ctx);
  // Prefer poison for damage, slow as a fallback control.
  const preferred = poison ?? slow;
  const scored = scoreTargets(opponents, ctx, preferred);
  const target = scored[0];
  const targetCell = { x: target.combatant.x, y: target.combatant.y };
  const dist = chebyshev(origin, targetCell);
  if (preferred && dist <= Number(preferred.range)) {
    const los =
      preferred.lineOfSight === false
        ? true
        : ctx.hasLineOfSight(origin, targetCell);
    if (los) {
      ctx.log(
        `${summon.pieceType} looses an arrow at ${target.combatant.name}!`,
        CAST_COLOR,
      );
      logIntent("archer", "cast", target.combatant.id, preferred.id);
      return {
        archetype: "generic",
        destination: origin,
        spell: preferred,
        targetId: target.combatant.id,
        kind: "cast",
        intent: "arrow",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
    // LoS blocked: reposition for a clear shot before giving up.
    const reposition = repositionForLOS(
      origin,
      targetCell,
      ctx,
      reachable,
      preferred,
    );
    if (reposition) {
      ctx.log(`${summon.pieceType} sidesteps for a shot`, MOVE_COLOR);
      logIntent("archer", "reposition-los", target.combatant.id, "los-blocked");
      return {
        archetype: "generic",
        destination: reposition,
        spell: null,
        targetId: null,
        kind: "move",
        intent: "reposition-los",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
  }
  // Slow-on-approaching: when the preferred poison shot was out of range or
  // LoS-blocked with no reposition, but spell-slow is ready and the nearest
  // target is within the slow spell's range with LoS, cast slow to control
  // the approaching enemy before falling back to kiting. spell-slow is
  // targetType "enemy" (range 3); the resolved spell object + target id
  // satisfy the executor gate at summonExecutor.ts line 123.
  if (slow) {
    const slowRange = Number(slow.range);
    const slowScored = scoreTargets(opponents, ctx, slow);
    const slowTarget = slowScored[0];
    if (slowTarget) {
      const slowCell = { x: slowTarget.combatant.x, y: slowTarget.combatant.y };
      const slowDist = chebyshev(origin, slowCell);
      if (slowDist <= slowRange) {
        const slowLos =
          slow.lineOfSight === false
            ? true
            : ctx.hasLineOfSight(origin, slowCell);
        if (slowLos) {
          ctx.log(
            `${summon.pieceType} slows approaching ${slowTarget.combatant.name}`,
            CAST_COLOR,
          );
          logIntent("archer", "cast", slowTarget.combatant.id, "spell-slow");
          return {
            archetype: "generic",
            destination: origin,
            spell: slow,
            targetId: slowTarget.combatant.id,
            kind: "cast",
            intent: "slow-approaching",
            intentColor: CAST_COLOR,
            retreating: false,
          };
        }
      }
    }
  }
  // Maintain 3+ range: step away if too close, step toward if too far.
  const MIN_KITE_RANGE = 3;
  let dest = origin;
  if (dist < MIN_KITE_RANGE) {
    dest = stepAway(origin, targetCell, ctx, reachable, 1);
  } else if (dist > Number(preferred?.range ?? MIN_KITE_RANGE)) {
    dest = stepToward(origin, targetCell, ctx, reachable);
  }
  if (dest.x !== origin.x || dest.y !== origin.y) {
    ctx.log(`${summon.pieceType} kites ${target.combatant.name}`, MOVE_COLOR);
    logIntent("archer", "kite", target.combatant.id, "maintain-range");
  } else {
    logIntent("archer", "hold", target.combatant.id, "in-range");
  }
  return {
    archetype: "generic",
    destination: dest,
    spell: null,
    targetId: null,
    kind: "move",
    intent: "kite",
    intentColor: MOVE_COLOR,
    retreating: false,
  };
}

/**
 * Bomber (kamikaze): path to the densest cluster, then detonate spell-inferno
 * (the bomber dies on detonation). Only detonate when countTargetsInBlast >=
 * AI_KAMIKAZE_MIN_TARGETS OR hp < AI_KAMIKAZE_LOW_HP_PCT.
 */
function decideSummonBomber(
  summon: Enemy,
  ctx: DecideEnemyContext,
  opponents: AICombatant[],
  reachable: Set<string>,
  origin: AICell,
): EnemyAction {
  const kit = SUMMON_KIT.bomber;
  const inferno = findKitSpell(kit[0], ctx);
  const hpFracSummon = hpFrac({
    id: summon.id,
    side: summon.side === "player" ? "player" : "enemy",
    name: summon.pieceType,
    x: summon.x,
    y: summon.y,
    hp: summon.hp,
    maxHp: summon.maxHp,
    level: summon.level,
  });
  if (opponents.length === 0 || !inferno) {
    logIntent("bomber", "hold", null, "no-target-or-spell");
    return {
      archetype: "generic",
      destination: origin,
      spell: null,
      targetId: null,
      kind: "skip",
      intent: "hold",
      intentColor: SKIP_COLOR,
      retreating: false,
    };
  }
  // Find the densest cluster center: the opponent tile with the most
  // opponents within the inferno blast radius. The bomber's detonation is a
  // special kamikaze behavior, not a normal spell cast — use a hardcoded blast
  // radius (AI_KAMIKAZE_BLAST_RADIUS) instead of reading spell-inferno's
  // areaRadius (which is 0, since Inferno is a single-target DoT). This lets
  // the bomber find clusters even though its kit spell is single-target.
  const radius = AI_KAMIKAZE_BLAST_RADIUS;
  let bestCenter: AICombatant | null = null;
  let bestCount = 0;
  for (const c of opponents) {
    const count = countTargetsInBlast({ x: c.x, y: c.y }, opponents, radius);
    if (count > bestCount) {
      bestCount = count;
      bestCenter = c;
    }
  }
  const detonateEligible =
    bestCount >= AI_KAMIKAZE_MIN_TARGETS ||
    hpFracSummon < AI_KAMIKAZE_LOW_HP_PCT;
  if (bestCenter && detonateEligible) {
    const centerCell = { x: bestCenter.x, y: bestCenter.y };
    const dist = chebyshev(origin, centerCell);
    // Detonate when the cluster center is within cast range.
    if (dist <= Number(inferno.range)) {
      ctx.log(
        `${summon.pieceType} detonates Inferno on ${bestCount} foes!`,
        CAST_COLOR,
      );
      logIntent("bomber", "cast", bestCenter.id, `detonate-${bestCount}`);
      return {
        archetype: "generic",
        destination: origin,
        spell: inferno,
        targetId: bestCenter.id,
        kind: "cast",
        intent: "detonate",
        intentColor: CAST_COLOR,
        retreating: false,
      };
    }
    // Path toward the densest cluster.
    const dest = stepToward(origin, centerCell, ctx, reachable);
    if (dest.x !== origin.x || dest.y !== origin.y) {
      ctx.log(`${summon.pieceType} charges the cluster!`, MOVE_COLOR);
      logIntent("bomber", "advance", bestCenter.id, "approach-cluster");
    } else {
      logIntent("bomber", "hold", bestCenter.id, "blocked");
    }
    return {
      archetype: "generic",
      destination: dest,
      spell: null,
      targetId: null,
      kind: "move",
      intent: "approach-cluster",
      intentColor: MOVE_COLOR,
      retreating: false,
    };
  }
  // Not enough targets and not low-HP: hold position and wait for a cluster.
  logIntent("bomber", "hold", null, "await-cluster");
  return {
    archetype: "generic",
    destination: origin,
    spell: null,
    targetId: null,
    kind: "skip",
    intent: "hold",
    intentColor: SKIP_COLOR,
    retreating: false,
  };
}

/**
 * Healer (wisp): heal the most-wounded ally with starter-heal, else cast
 * spell-rallying-cry. backlineGuardCell positions the wisp between the nearest
 * threat and the ward when no healing is needed.
 */
function decideSummonHealer(
  summon: Enemy,
  ctx: DecideEnemyContext,
  allies: AICombatant[],
  opponents: AICombatant[],
  reachable: Set<string>,
  origin: AICell,
): EnemyAction {
  const kit = SUMMON_KIT.healer;
  const healSpell = findKitSpell(kit[0], ctx);
  const rallySpell = findKitSpell(kit[1], ctx);
  // Heal the most-wounded ally below the heal threshold. Section 5: previously
  // a plain hpFrac sort picked the lowest-HP ally, but a dying high-value ally
  // (wisp/healer) should outrank a slightly-more-wounded generic summon. We
  // still gate on the heal threshold, then score the survivors with scoreAlly
  // so urgency + threat + proximity decide the final heal target.
  const woundedCandidates = allies.filter(
    (a) => hpFrac(a) < ENEMY_HEAL_ALLY_THRESHOLD_PCT,
  );
  const wounded = pickBestAlly(woundedCandidates, summon, "healer", "heal");
  if (wounded && healSpell) {
    const dist = chebyshev(origin, { x: wounded.x, y: wounded.y });
    if (dist <= Number(healSpell.range)) {
      ctx.log(`${summon.pieceType} heals ${wounded.name}`, HEAL_COLOR);
      logIntent("healer", "heal", wounded.id, "wounded-ally-in-range");
      return {
        archetype: "generic",
        destination: origin,
        spell: healSpell,
        targetId: wounded.id,
        kind: "cast",
        intent: "heal",
        intentColor: HEAL_COLOR,
        retreating: false,
      };
    }
    // Move toward the wounded ally.
    const dest = stepToward(
      origin,
      { x: wounded.x, y: wounded.y },
      ctx,
      reachable,
    );
    ctx.log(`${summon.pieceType} moves to heal ${wounded.name}`, MOVE_COLOR);
    logIntent("healer", "approach-ally", wounded.id, "wounded-out-of-range");
    return {
      archetype: "generic",
      destination: dest,
      spell: null,
      targetId: null,
      kind: "move",
      intent: "approach-ally",
      intentColor: MOVE_COLOR,
      retreating: false,
    };
  }
  // No wounded ally: cast rallying-cry on the best-scored ally if in range
  // (buff support). Section 5: previously `allies.find(a => !a.isSummon)`
  // hard-pinned the rally ward to the player, so rallying-cry could never
  // target an allied summon. Now the whole allied group is considered — a
  // clustered group of summons can receive the rally buff when the player is
  // out of range or lower-priority.
  const ward = pickBestAlly(allies, summon, "healer", "rally");
  if (rallySpell && ward) {
    const dist = chebyshev(origin, { x: ward.x, y: ward.y });
    if (dist <= Number(rallySpell.range)) {
      ctx.log(`${summon.pieceType} rallies ${ward.name}`, HEAL_COLOR);
      logIntent("healer", "cast", ward.id, "rallying-cry");
      return {
        archetype: "generic",
        destination: origin,
        spell: rallySpell,
        targetId: ward.id,
        kind: "cast",
        intent: "rallying-cry",
        intentColor: HEAL_COLOR,
        retreating: false,
      };
    }
  }
  // No healing / rally: interpose between the nearest threat and the ward.
  if (ward && opponents.length > 0) {
    const threat = opponents[0];
    const guard = backlineGuardCell(
      { x: ward.x, y: ward.y },
      { x: threat.x, y: threat.y },
      ctx,
      reachable,
    );
    if (guard && (guard.x !== origin.x || guard.y !== origin.y)) {
      ctx.log(`${summon.pieceType} guards ${ward.name}`, MOVE_COLOR);
      logIntent("healer", "backline-guard", ward.id, "interpose");
      return {
        archetype: "generic",
        destination: guard,
        spell: null,
        targetId: null,
        kind: "move",
        intent: "backline-guard",
        intentColor: MOVE_COLOR,
        retreating: false,
      };
    }
  }
  logIntent("healer", "hold", null, "nothing-to-do");
  return {
    archetype: "generic",
    destination: origin,
    spell: null,
    targetId: null,
    kind: "skip",
    intent: "hold",
    intentColor: SKIP_COLOR,
    retreating: false,
  };
}
