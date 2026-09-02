/**
 * Summon spawn helper — creates a summoned unit from a spell definition and
 * returns it together with its turn-order entry. The caller is responsible for
 * inserting both into the real React state paths (enemies, battleEnemies,
 * turnOrder). Pure function: no React / DOM dependencies, no mutation of
 * caller-owned arrays.
 */

import type { CombatantEntry } from "../components/InitiativeStrip";
import { SUMMON_LIFESPAN_PER_HALF_LEVEL } from "../data/gameConstants.ts";
import type { Enemy } from "../types/gameTypes";
import { logDebugInfo } from "../utils/debugLogger.ts";
import {
  type OccupancyContext,
  findNearestFreeCell,
  progressionSearchRadius,
  isCellFree as sharedIsCellFree,
  unsealProgressionOccupants,
} from "./occupancy.ts";
import { getSummonBaseStats } from "./progression.ts";

export interface SummonUnitDef {
  pieceType: string;
  level: number;
  hpScale?: number;
  damageScale?: number;
  /** Spell ids (from data/spellData.ts) the summon can cast via its AI kit. */
  summonKit?: string[];
  /** Per-turn Action Point budget. Falls back to SUMMON_AP[summonAI]. */
  ap?: number;
  /** Per-turn Mana Point budget. Falls back to SUMMON_MP[summonAI]. */
  mp?: number;
}

export interface SpawnedSummon {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  side: "player" | "enemy";
  isSummon: true;
  summonAI: string;
  ownerId: string;
  turnsRemaining: number;
  level: number;
  pieceType: string;
  effects: any[];
  statusEffects: any[];
  [k: string]: any;
}

export interface TurnOrderEntry {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  /**
   * Player-side summons are "summon" (control panel). Enemy-side summons
   * are "enemy" so the WorldExploration AI effect does not bail.
   */
  type: "player" | "enemy" | "summon";
  isSummon?: boolean;
  summonAI?: string;
  ownerId?: string;
  turnsRemaining?: number;
  side: "player" | "enemy";
  pieceType: string;
  level: number;
  stats: any;
}

/** Chess-piece unicode glyph for a summon's pieceIcon (mirrors InitiativeStrip PIECE_SYMBOLS). */
const SUMMON_PIECE_ICONS: Record<string, string> = {
  king: "\u265A",
  queen: "\u265B",
  rook: "\u265C",
  bishop: "\u265D",
  knight: "\u265E",
  pawn: "\u265F",
};

export interface SpawnSummonResult {
  summon: SpawnedSummon;
  turnOrderEntry: CombatantEntry;
}

export function spawnSummonUnit(
  cell: { x: number; y: number },
  spell: any,
  ownerId: string,
  level: number,
  log: (msg: string, color?: string, isSummon?: boolean) => void,
  computeEnemyStats: (level: number, pieceType: string, seedKey: string) => any,
  spellLevel = 0,
  occupancyCtx?: OccupancyContext,
  /** Hostile summons must pass `"enemy"`. Default is the player kit path. */
  side: "player" | "enemy" = "player",
): SpawnSummonResult {
  const unitDef: SummonUnitDef | undefined = spell.summonUnitDef;
  if (!unitDef) {
    // Caller guards against missing unitDef before invoking; return an empty
    // result shape so the call site's destructure does not throw.
    throw new Error("spawnSummonUnit: spell.summonUnitDef is required");
  }

  // Spawn placement: if an occupancy context is provided and the requested
  // cell is not free (occupied / impassable / barrier / void / portal), fall
  // back to the nearest free cell on this grid. Radius 6 used to miss an
  // off-path alcove at the far end of a 16×16 unique corridor.
  let spawnCell = cell;
  const reserved = occupancyCtx?.reserved;
  const reservedHit = reserved?.has(`${cell.x},${cell.y}`) === true;
  if (occupancyCtx && (!sharedIsCellFree(cell, occupancyCtx) || reservedHit)) {
    const fallback = findNearestFreeCell(
      cell,
      occupancyCtx,
      progressionSearchRadius(occupancyCtx),
      reserved,
    );
    if (fallback) spawnCell = fallback;
  }
  if (occupancyCtx?.progressStart && occupancyCtx.portals.size > 0) {
    const [slid] = unsealProgressionOccupants(
      [spawnCell],
      occupancyCtx.tiles,
      occupancyCtx.voidTiles,
      occupancyCtx.portals,
      occupancyCtx.progressStart,
      occupancyCtx,
    );
    spawnCell = slid;
  }

  const stats = computeEnemyStats(level, unitDef.pieceType, spell.id);
  const summonAI = spell.summonAI || "hunter";
  // HP/AP/MP/lifespan now delegate to progression.ts::getSummonBaseStats — the
  // single source of truth for summon stat budgets. Values are moved VERBATIM
  // (same archetype bases, same scaling factors, same fallback chains). The
  // per-spell summonLifespan override is applied here on top of the canonical
  // base, preserving the legacy `spell.summonLifespan || SUMMON_BASE_LIFESPAN`
  // semantics: when the spell defines a lifespan, it REPLACES the base and
  // still receives the per-half-level scaling bonus.
  const {
    maxHp,
    maxAp,
    maxMp,
    turnsRemaining: baseLifespan,
  } = getSummonBaseStats(spellLevel, unitDef, summonAI);
  const summonId = `summon-${Math.random().toString(36).slice(2)}`;
  // Match the legacy `(spell.summonLifespan || SUMMON_BASE_LIFESPAN) + floor(...)`
  // exactly: a falsy summonLifespan (0/undefined/null) falls back to the
  // canonical base (which already includes the per-half-level scaling), while
  // a truthy summonLifespan replaces the base and re-applies the scaling.
  const turnsRemaining = spell.summonLifespan
    ? (spell.summonLifespan as number) +
      Math.floor(spellLevel / SUMMON_LIFESPAN_PER_HALF_LEVEL)
    : baseLifespan;

  const summon: SpawnedSummon = {
    id: summonId,
    name: spell.name.replace("Summon ", ""),
    x: spawnCell.x,
    y: spawnCell.y,
    hp: maxHp,
    maxHp,
    side,
    isSummon: true,
    summonAI,
    ownerId,
    turnsRemaining,
    level,
    pieceType: unitDef.pieceType,
    // Enemy type requires currentView; summons always face front on spawn.
    currentView: "front",
    // AP/MP budgets — reset to max at the start of each of the summon's turns
    // (see handleSummonTurn in summonIntegration.ts).
    currentAp: maxAp,
    maxAp,
    currentMp: maxMp,
    maxMp,
    ...stats,
    effects: [],
    statusEffects: [],
  };

  const turnOrderEntry: CombatantEntry = {
    id: summonId,
    name: summon.name,
    initiative: stats.init,
    hp: summon.hp,
    maxHp: summon.maxHp,
    level,
    pieceIcon: SUMMON_PIECE_ICONS[unitDef.pieceType] ?? "\u265F",
    // Player-side: "summon" so control mode / summonControlIdAfterAdvance
    // bind. Enemy-side: "enemy" so the AI effect (type !== "enemy") runs.
    type: side === "player" ? "summon" : "enemy",
    isSummon: true,
    summonAI: summon.summonAI,
    ownerId,
    turnsRemaining: summon.turnsRemaining,
    side,
    pieceType: summon.pieceType,
  };

  log(`${summon.name} appears!`, "#5cf08a", true);

  // [SUMMON] link (d): spawnSummonUnit returned a summon.
  logDebugInfo("SUMMON", "spawnSummonUnit returned", {
    summonId,
    name: summon.name,
    pieceType: summon.pieceType,
    hp: summon.hp,
    maxHp: summon.maxHp,
    level: summon.level,
    spellLevel,
    maxAp: summon.maxAp,
    maxMp: summon.maxMp,
    turnsRemaining: summon.turnsRemaining,
    cell: { x: summon.x, y: summon.y },
  });

  return { summon, turnOrderEntry };
}

/**
 * Resolve the unit def for an enemy-side summon cast.
 *
 * Summoner AI / boss kit spells often carry `summonUnitDef` on the spell
 * object. When they only pass an id (starter-kit lookup), fall back to
 * the catalog. Returns undefined so the caller can no-op without throwing.
 */
export function resolveEnemySummonUnitDef(
  spell: { id?: string; summonUnitDef?: SummonUnitDef } | null | undefined,
  catalog: ReadonlyArray<{ id: string; summonUnitDef?: SummonUnitDef }>,
): SummonUnitDef | undefined {
  if (spell?.summonUnitDef) return spell.summonUnitDef;
  if (!spell?.id) return undefined;
  return catalog.find((s) => s.id === spell.id)?.summonUnitDef;
}

/**
 * Spawn a hostile minion. Always passes `side: "enemy"` so the unit is
 * AI-routed and not handed to SummonControlPanel.
 *
 * WorldExploration used to bind this only as a side-effect of the
 * player-summon SpellContext callback. That callback never runs
 * (`type === "summon"` fails the enemy-AI gate), so summoner / boss
 * short-circuits called a null ref and the minion never appeared.
 */
export function spawnEnemySummonUnit(
  cell: { x: number; y: number },
  spell: {
    id?: string;
    summonUnitDef?: SummonUnitDef;
  } | null,
  catalog: ReadonlyArray<{ id: string; summonUnitDef?: SummonUnitDef }>,
  level: number,
  log: (msg: string, color?: string, isSummon?: boolean) => void,
  computeEnemyStats: (level: number, pieceType: string, seedKey: string) => any,
  occupancyCtx?: OccupancyContext,
): SpawnSummonResult | null {
  const unitDef = resolveEnemySummonUnitDef(spell, catalog);
  if (!unitDef) return null;
  return spawnSummonUnit(
    cell,
    {
      id: `enemy-summon-${unitDef.pieceType}`,
      name: `Enemy Summon ${unitDef.pieceType}`,
      summonUnitDef: unitDef,
      summonLifespan: 0,
      summonAI: unitDef.pieceType,
    },
    "enemy",
    level,
    log,
    computeEnemyStats,
    0,
    occupancyCtx,
    "enemy",
  );
}

/**
 * Pure helper that computes the new `enemies` and `turnOrder` arrays after a
 * summon has been spawned. Centralizes the `SpawnedSummon -> Enemy` cast (the
 * summon carries the runtime fields the renderer/AI need; the Enemy interface
 * is wider but the missing fields are optional or unused for summons) and the
 * summoner-adjacent turn-order placement (immediately after the summoner's
 * entry, or appended at the end if the summoner is not found).
 *
 * The caller is responsible for forwarding the returned arrays to its React
 * state setters (setEnemies / setBattleEnemies / setTurnOrder) and for keeping
 * any refs (battleEnemiesRef, turnOrderRef) in sync.
 */
export interface ApplySummonResult {
  enemies: Enemy[];
  turnOrder: CombatantEntry[];
}

export function applySummonResult(
  summon: SpawnedSummon,
  turnOrderEntry: CombatantEntry,
  summonerId: string,
  currentEnemies: Enemy[],
  currentTurnOrder: CombatantEntry[],
): ApplySummonResult {
  // [SUMMON] link (e): entry state for applySummonResult.
  logDebugInfo("SUMMON", "applySummonResult entered", {
    summonId: summon.id,
    summonerId,
    currentEnemiesLength: currentEnemies.length,
    currentTurnOrderLength: currentTurnOrder.length,
  });
  const enemies: Enemy[] = [...currentEnemies, summon as unknown as Enemy];
  const i = currentTurnOrder.findIndex(
    (e) => e.id === summonerId || e.ownerId === summonerId,
  );
  const turnOrder = [...currentTurnOrder];
  turnOrder.splice(
    i === -1 ? currentTurnOrder.length : i + 1,
    0,
    turnOrderEntry,
  );
  // [SUMMON] link (e): returned arrays before exit.
  logDebugInfo("SUMMON", "applySummonResult returning", {
    enemiesLength: enemies.length,
    turnOrderLength: turnOrder.length,
  });
  return { enemies, turnOrder };
}
