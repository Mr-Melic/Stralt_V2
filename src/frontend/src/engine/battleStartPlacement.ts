/**
 * engine/battleStartPlacement.ts
 *
 * Pure battle-start spacing. WorldExploration.checkBattleTrigger builds an
 * OccupancyContext (mutable `placed` set) and calls this for the player
 * (>= 3 Chebyshev from every enemy) then each enemy (>= 3 from the player,
 * >= 2 from already-placed enemies).
 *
 * Pass 1: every free cell that meets ALL per-position minDist constraints;
 *         pick highest min Chebyshev, then nearest to origin.
 * Pass 2: cramped map — findNearestFreeCell (no spacing), never overlap.
 *
 * React-free. Callers own refs/setters and the OccupancyContext.
 */

import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import {
  type OccupancyContext,
  findNearestFreeCell,
  isCellFree,
} from "./occupancy.ts";

/** A cell other combatants must stay at least `minDist` Chebyshev from. */
export interface BattleStartAvoid {
  x: number;
  y: number;
  minDist: number;
}

/**
 * Pick a unique passable battle-start cell near `origin`.
 *
 * Pass 1 collects every `isCellFree` cell that satisfies every avoid
 * constraint (Chebyshev(cell, p) >= p.minDist). Among those, prefer the
 * largest min-distance to any avoided cell, then the nearest to origin so
 * units spread around the player instead of stacking on one far corner.
 *
 * Pass 2 (no cell meets spacing): `findNearestFreeCell` ring-scan from
 * origin using `minDistFallback` as the radius. That fallback does not
 * re-apply spacing — it only guarantees a free tile when the map is cramped.
 *
 * Returns null only when the fallback also finds no free cell.
 */
export function findBattleStartCell(
  origin: { x: number; y: number },
  avoid: BattleStartAvoid[],
  minDistFallback: number,
  ctx: OccupancyContext,
): { x: number; y: number } | null {
  // Pass 1: collect every cell that is free AND meets EVERY per-position
  // spacing target. A cell qualifies iff for each avoided position p,
  // Chebyshev(cell, p) >= p.minDist. This lets the caller demand, e.g.,
  // >= 3 from the player AND >= 2 from each already-placed enemy in one pass.
  const spaced: {
    x: number;
    y: number;
    minD: number;
    dFromOrigin: number;
  }[] = [];
  for (let gy = 0; gy < WORLD_GRID_SIZE; gy++) {
    for (let gx = 0; gx < WORLD_GRID_SIZE; gx++) {
      const cell = { x: gx, y: gy };
      if (!isCellFree(cell, ctx)) continue;
      let ok = true;
      let minD = Number.POSITIVE_INFINITY;
      for (const p of avoid) {
        const d = Math.max(Math.abs(gx - p.x), Math.abs(gy - p.y));
        if (d < minD) minD = d;
        if (d < p.minDist) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const dFromOrigin = Math.max(
          Math.abs(gx - origin.x),
          Math.abs(gy - origin.y),
        );
        spaced.push({ x: gx, y: gy, minD, dFromOrigin });
      }
    }
  }
  if (spaced.length > 0) {
    // Pick the best-spaced cell; break ties by NEAREST to origin so
    // multiple enemies spread around the player instead of piling on one
    // far corner. Stable sort: highest minD first, then lowest dFromOrigin.
    spaced.sort((a, b) =>
      a.minD !== b.minD ? b.minD - a.minD : a.dFromOrigin - b.dFromOrigin,
    );
    return { x: spaced[0].x, y: spaced[0].y };
  }
  // Pass 2 (cramped map): fall back to the nearest free cell to origin.
  // findNearestFreeCell uses isCellFree under the hood, so the result is
  // guaranteed unique + passable (it cannot overlap any combatant that
  // ctx.isOccupied already knows about, including the ones we just placed).
  // minDistFallback is the ring-scan radius used here (typically the
  // loosest spacing target so the fallback still tries to respect spacing).
  return findNearestFreeCell(origin, ctx, minDistFallback);
}
