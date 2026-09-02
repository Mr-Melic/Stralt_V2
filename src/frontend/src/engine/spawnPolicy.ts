/**
 * engine/spawnPolicy.ts
 *
 * Pure overworld / dungeon enemy spawn policy extracted from
 * WorldExploration.generateEnemies. WorldExploration still owns placement
 * (quadrants, name pool, computeEnemyStats, Date.now) and the post-family
 * computeAITier re-roll. This module is React-free.
 *
 * Distance metrics are intentionally different — do not merge them:
 *   - portal keep-clear: Manhattan <= 2
 *   - map-spawn keep-clear: Chebyshev <= 3 from (8, 8)
 *   - enemy-to-enemy spacing: Chebyshev >= 4
 *
 * Family catalog `ap` / `mp` fields are unused at spawn (WX never wrote
 * them). Do not start applying them in a modularity run.
 *
 * generateEnemyScaleFactors keeps two unused Math.random draws before the
 * variation roll — they feed the later per-enemy RNG stream (level pick).
 */

import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import type { EnemyFamily } from "../types/gameTypes.ts";

export type Rng = () => number;

/** depth 0 = overworld; 1–5 escalate. Values past 5 clamp to the last slot. */
export const DUNGEON_EXTRA_ENEMIES = [0, 2, 3, 4, 4, 5] as const;
export const DUNGEON_TIER_BOOST = [0, 1, 2, 2, 3, 3] as const;
export const DUNGEON_SPAWN_DEPTH_CAP = 5;

/** `Math.floor(rng() * 8) + 1` → 1..8 before dungeon extras. */
export const OVERWORLD_ENEMY_COUNT_SPAN = 8;

/** Occasional family variant (WX comment: "occasional but noticeable"). */
export const FAMILY_VARIANT_CHANCE = 0.3;

/** Minimum Chebyshev between two overworld spawns. Battle-start uses 2/3. */
export const SPAWN_MIN_CHEBYSHEV = 4;

/** Map generator spawn cell. Not the live player position. */
export const MAP_SPAWN_CELL = { x: 8, y: 8 } as const;

/** Chebyshev radius around MAP_SPAWN_CELL that must stay empty. */
export const MAP_SPAWN_KEEP_CLEAR_CHEBYSHEV = 3;

/** Manhattan radius around each portal that must stay empty. */
export const PORTAL_KEEP_CLEAR_MANHATTAN = 2;

export const FAMILY_TYPES: Exclude<EnemyFamily, "default">[] = [
  "wraith_bishop",
  "iron_golem",
  "plague_rat",
  "ember_knight",
  "tide_shade",
  "bone_scribe",
  "void_mirror",
];

export interface FamilyStatMult {
  hpMult: number;
  dmgMult: number;
  res: number;
  spRes: number;
  /** Catalog only — generateEnemies never wrote these onto the unit. */
  mp: number;
  ap: number;
}

export const FAMILY_STAT_MULTS: Record<
  Exclude<EnemyFamily, "default">,
  FamilyStatMult
> = {
  wraith_bishop: {
    hpMult: 0.6,
    dmgMult: 1.4,
    res: 0.1,
    spRes: 0.2,
    mp: 4,
    ap: 5,
  },
  iron_golem: {
    hpMult: 2.5,
    dmgMult: 0.7,
    res: 0.75,
    spRes: 0.6,
    mp: 1,
    ap: 4,
  },
  plague_rat: {
    hpMult: 0.4,
    dmgMult: 0.6,
    res: 0.05,
    spRes: 0.05,
    mp: 3,
    ap: 3,
  },
  ember_knight: {
    hpMult: 1.1,
    dmgMult: 1.0,
    res: 0.3,
    spRes: 0.15,
    mp: 3,
    ap: 4,
  },
  tide_shade: {
    hpMult: 0.8,
    dmgMult: 0.9,
    res: 0.15,
    spRes: 0.3,
    mp: 5,
    ap: 4,
  },
  bone_scribe: {
    hpMult: 0.7,
    dmgMult: 0.5,
    res: 0.1,
    spRes: 0.4,
    mp: 3,
    ap: 4,
  },
  void_mirror: {
    hpMult: 1.0,
    dmgMult: 0.8,
    res: 0.2,
    spRes: 0.5,
    mp: 2,
    ap: 3,
  },
};

export interface FamilySpawnTarget {
  family: string;
  hp: number;
  maxHp: number;
  damage?: number;
  res: number;
  sp: number;
}

export function dungeonSpawnExtras(dungeonDepth: number): {
  extraEnemies: number;
  tierBoost: number;
} {
  const idx = Math.min(dungeonDepth, DUNGEON_SPAWN_DEPTH_CAP);
  return {
    extraEnemies: DUNGEON_EXTRA_ENEMIES[idx],
    tierBoost: DUNGEON_TIER_BOOST[idx],
  };
}

/**
 * Overworld roll is 1..8, then dungeon extras add on top.
 * Does not cap at MAX_ENEMIES — generateEnemies never did.
 */
export function rollOverworldEnemyCount(
  extraEnemies: number,
  rng: Rng = Math.random,
): number {
  return Math.floor(rng() * OVERWORLD_ENEMY_COUNT_SPAN) + 1 + extraEnemies;
}

export function dungeonScaledEnemyLevel(
  baseEnemyLevel: number,
  dungeonTierBoost: number,
  tierSize: number,
): number {
  return dungeonTierBoost > 0
    ? Math.max(1, baseEnemyLevel + dungeonTierBoost * tierSize)
    : baseEnemyLevel;
}

export function isSpawnAdjacentToPortal(
  x: number,
  y: number,
  portals: readonly { x: number; y: number }[],
): boolean {
  return portals.some((portal) => {
    const distance = Math.abs(portal.x - x) + Math.abs(portal.y - y);
    return distance <= PORTAL_KEEP_CLEAR_MANHATTAN;
  });
}

export function isInsideMapSpawnKeepClear(x: number, y: number): boolean {
  return (
    Math.abs(x - MAP_SPAWN_CELL.x) <= MAP_SPAWN_KEEP_CLEAR_CHEBYSHEV &&
    Math.abs(y - MAP_SPAWN_CELL.y) <= MAP_SPAWN_KEEP_CLEAR_CHEBYSHEV
  );
}

/**
 * Floor cells that may host an overworld / dungeon spawn: not a portal
 * neighbor, not the map-spawn keep-clear diamond, not void.
 */
export function collectValidEnemySpawnCells(
  tiles: readonly (readonly string[])[],
  portals: readonly { x: number; y: number }[],
  voidTiles: ReadonlySet<string> = new Set(),
): { x: number; y: number }[] {
  const allValid: { x: number; y: number }[] = [];
  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      if (tiles[y][x] !== "floor") continue;
      if (isSpawnAdjacentToPortal(x, y, portals)) continue;
      if (isInsideMapSpawnKeepClear(x, y)) continue;
      if (voidTiles.has(`${x},${y}`)) continue;
      allValid.push({ x, y });
    }
  }
  return allValid;
}

export function isSpawnFarEnough(
  pos: { x: number; y: number },
  placed: readonly { x: number; y: number }[],
  minChebyshev: number = SPAWN_MIN_CHEBYSHEV,
): boolean {
  return placed.every(
    (e) =>
      Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) >= minChebyshev,
  );
}

/**
 * Visual scale variety. Two unused rng draws before `variation` must stay —
 * they consume the same stream generateEnemies used before pickEnemyLevelFromTiers.
 */
export function generateEnemyScaleFactors(rng: Rng = Math.random): {
  scaleX: number;
  scaleY: number;
} {
  const minScale = 0.6;
  const maxScale = 1.4;

  const _scaleX = rng() * (maxScale - minScale) + minScale;
  const _scaleY = rng() * (maxScale - minScale) + minScale;

  const variation = rng();

  if (variation < 0.3) {
    return {
      scaleX: rng() * 0.3 + 0.6,
      scaleY: rng() * 0.4 + 1.1,
    };
  }
  if (variation < 0.6) {
    return {
      scaleX: rng() * 0.4 + 1.1,
      scaleY: rng() * 0.3 + 0.6,
    };
  }
  const uniformScale = rng() * (maxScale - minScale) + minScale;
  return {
    scaleX: uniformScale,
    scaleY: uniformScale,
  };
}

/**
 * Apply family HP/damage/res/sp. Does not write ap/mp. Does not re-roll aiTier.
 */
export function applyEnemyFamilyStats<T extends FamilySpawnTarget>(
  enemy: T,
  family: Exclude<EnemyFamily, "default">,
): T {
  const m = FAMILY_STAT_MULTS[family];
  enemy.family = family;
  enemy.hp = Math.max(1, Math.round(enemy.hp * m.hpMult));
  enemy.maxHp = enemy.hp;
  enemy.damage = Math.max(1, Math.round((enemy.damage ?? 0) * m.dmgMult));
  enemy.res = m.res;
  enemy.sp = m.spRes;
  return enemy;
}

/**
 * 30% chance to become a random family. Returns true when stats were applied
 * so the caller can re-roll aiTier (WX / combatMath ownership).
 */
export function maybeApplyEnemyFamilyVariant<T extends FamilySpawnTarget>(
  enemy: T,
  rng: Rng = Math.random,
): boolean {
  if (rng() >= FAMILY_VARIANT_CHANCE) return false;
  const fam = FAMILY_TYPES[Math.floor(rng() * FAMILY_TYPES.length)];
  applyEnemyFamilyStats(enemy, fam);
  return true;
}

export function applyFamilyVariantsToRoster<T extends FamilySpawnTarget>(
  enemies: T[],
  rng: Rng = Math.random,
  onApplied?: (enemy: T) => void,
): void {
  for (const en of enemies) {
    if (maybeApplyEnemyFamilyVariant(en, rng)) onApplied?.(en);
  }
}
