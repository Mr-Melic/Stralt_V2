/**
 * Shared occupancy / passability engine — the SINGLE source of truth for
 * "is this tile free for a position-changing operation?".
 *
 * Every position-changing code path in the combat engine (enemy AI pathing,
 * summon AI pathing, spawn placement, swap/pushback/attraction resolution)
 * MUST route through `isCellFree` here so that one combatant per tile is
 * enforced consistently. The check is a full passability pass:
 *
 *   1. In-bounds (0..gridSize-1 on both axes)
 *   2. Grid tile is walkable (`tiles[y][x] === true`)
 *   3. Not a barrier tile (spell-placed walls)
 *   4. Not a portal tile
 *   5. Not a void tile
 *   6. Not occupied by any combatant (player, enemy, or summon)
 *
 * This supersedes the occupancy-only `SpellContext.isCellFree` (which only
 * checked combatant positions) and the enemyAI-private `isStepFree` (which
 * duplicated the grid/barrier/portal/void/occupied checks inline).
 *
 * Pure module: no React, no DOM, no side effects. All inputs come through the
 * `OccupancyContext` shape, which the callers build from their live state.
 */

import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";

/** A tile coordinate on the world grid. */
export interface OccCell {
  x: number;
  y: number;
}

/**
 * Everything `isCellFree` and the movement resolvers need to decide whether a
 * tile is free. Callers build this from their live state/refs:
 *
 *   - `tiles`: the walkable grid (`tiles[y][x] === true` ⇒ passable base tile).
 *   - `barriers`: Set of "x,y" keys that are spell-placed barrier walls.
 *   - `voidTiles`: Set of "x,y" keys that are void tiles (impassable).
 *   - `portals`: Set of "x,y" keys that are portals (impassable for pathing).
 *   - `isOccupied`: callback returning true if any combatant (player, enemy,
 *     or summon) currently sits on the cell. This is the occupancy-only
 *     check that `SpellContext.isCellFree` already exposed — wired here as a
 *     callback so the shared check can layer passability on top of it without
 *     the caller having to duplicate the combatant-position scan.
 */
export interface OccupancyContext {
  tiles: boolean[][];
  barriers: Set<string>;
  voidTiles: Set<string>;
  portals: Set<string>;
  /** True if any combatant (player/enemy/summon) currently occupies `cell`. */
  isOccupied: (cell: OccCell) => boolean;
  /**
   * Unique player→exit bridges. Used only by spawn fallback so a summon
   * does not sit on the only legal progression cell. Movement still uses
   * `isCellFree` without this set — enemies must be able to path the bridge.
   */
  reserved?: Set<string>;
}

/** Build the canonical "x,y" key used by the barrier/void/portal sets. */
export function occKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * The ONE shared occupancy + passability check. Returns true iff `cell` is
 * in-bounds, on a walkable grid tile, not a barrier, not a portal, not a void
 * tile, and not occupied by any combatant.
 *
 * This is the function every position-changing code path must call. It
 * replaces:
 *   - `SpellContext.isCellFree` (occupancy-only) for summon AI movement
 *   - `enemyAI.isStepFree` (private duplicate) for enemy AI movement
 *   - any inline occupancy check in spawn placement / swap / pushback / attract
 */
export function isCellFree(cell: OccCell, ctx: OccupancyContext): boolean {
  const { x, y } = cell;
  if (x < 0 || x >= WORLD_GRID_SIZE || y < 0 || y >= WORLD_GRID_SIZE) {
    return false;
  }
  if (!ctx.tiles[y]?.[x]) return false;
  const k = occKey(x, y);
  if (ctx.barriers.has(k)) return false;
  if (ctx.portals.has(k)) return false;
  if (ctx.voidTiles.has(k)) return false;
  if (ctx.isOccupied(cell)) return false;
  return true;
}

/**
 * Find the nearest free cell to `origin` within `maxRadius` (Manhattan). Used
 * by spawn placement so summons/enemies land on the nearest free cell when
 * the requested cell is occupied. Returns `origin` itself if it is free,
 * otherwise scans outward ring-by-ring. Returns `null` if no free cell is
 * found within the radius.
 *
 * Ring order: radius 0 (origin), then radius 1 (4-neighborhood), then radius
 * 2, etc. Within a ring, cells are visited in a deterministic order
 * (top→right→bottom→left sweep) so the result is stable for a given input.
 */
export function findNearestFreeCell(
  origin: OccCell,
  ctx: OccupancyContext,
  maxRadius: number,
  avoid?: Set<string>,
): OccCell | null {
  const ok = (cell: OccCell) =>
    isCellFree(cell, ctx) && !avoid?.has(occKey(cell.x, cell.y));
  if (ok(origin)) return { x: origin.x, y: origin.y };
  for (let r = 1; r <= maxRadius; r++) {
    // Walk the perimeter of the Manhattan ring of radius r.
    for (let dx = -r; dx <= r; dx++) {
      const dy = r - Math.abs(dx);
      // (+dy) row
      const a = { x: origin.x + dx, y: origin.y + dy };
      if (ok(a)) return a;
      if (dy !== 0) {
        // (-dy) row (skip when dy === 0 to avoid double-checking the midline)
        const b = { x: origin.x + dx, y: origin.y - dy };
        if (ok(b)) return b;
      }
    }
  }
  return null;
}

function floodPassable(
  tiles: boolean[][],
  voidTiles: Set<string>,
  blocked: Set<string>,
  start: OccCell,
): Set<string> {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const seen = new Set<string>();
  const walk = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    if (!tiles[y]?.[x]) return false;
    const k = occKey(x, y);
    if (voidTiles.has(k) || blocked.has(k)) return false;
    return true;
  };
  if (!walk(start.x, start.y)) return seen;
  const q: OccCell[] = [start];
  seen.add(occKey(start.x, start.y));
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = occKey(nx, ny);
      if (seen.has(k) || !walk(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/**
 * Unique bridges from the player to every exit. A living summon/corpse on
 * one of these cells permanently seals progression; spawn/relocate must
 * prefer any other free tile.
 */
export function collectMandatoryProgressionCells(
  tiles: boolean[][],
  voidTiles: Set<string>,
  portals: Set<string>,
  start: OccCell,
): Set<string> {
  const mandatory = new Set<string>();
  if (portals.size === 0) return mandatory;
  const open = floodPassable(tiles, voidTiles, new Set(), start);
  const portalReachable = [...portals].some((p) => open.has(p));
  if (!portalReachable) return mandatory;
  const startKey = occKey(start.x, start.y);
  for (const k of open) {
    if (k === startKey || portals.has(k)) continue;
    const blocked = new Set<string>([k]);
    const next = floodPassable(tiles, voidTiles, blocked, start);
    const still = [...portals].some((p) => next.has(p));
    if (!still) mandatory.add(k);
  }
  return mandatory;
}

export function relocateOffMandatoryCells(
  occupants: OccCell[],
  mandatory: Set<string>,
  ctx: OccupancyContext,
): OccCell[] {
  const placed = new Set<string>();
  return occupants.map((o) => {
    const k = occKey(o.x, o.y);
    if (!mandatory.has(k)) {
      placed.add(k);
      return { x: o.x, y: o.y };
    }
    const avoid = new Set<string>([...mandatory, ...placed]);
    const next = findNearestFreeCell(o, ctx, 8, avoid);
    if (next) {
      placed.add(occKey(next.x, next.y));
      return next;
    }
    placed.add(k);
    return { x: o.x, y: o.y };
  });
}

// ---------------------------------------------------------------------------
// Movement resolvers — pushback & attraction
// ---------------------------------------------------------------------------

/**
 * Resolve a pushback: move `target` up to `distance` tiles directly away from
 * `from`, one step at a time, STOPPING before any tile that fails the shared
 * `isCellFree` check (collision rule: a unit never lands on or passes through
 * an occupied / impassable tile). Returns the cell the unit ends on (which
 * may be its starting cell if the very first step is blocked).
 *
 * The step direction is the unit vector from `from` to `target` (the
 * direction the target is being pushed). When the target is exactly on `from`
 * (dx === 0 && dy === 0), the pushback has no defined direction and the
 * target stays put.
 *
 * Distance comes from explicit spell metadata (the caller reads it from the
 * spell config) — never a name-based heuristic.
 */
export function applyPushback(
  target: OccCell,
  from: OccCell,
  distance: number,
  ctx: OccupancyContext,
): OccCell {
  let cur: OccCell = { x: target.x, y: target.y };
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  if (dx === 0 && dy === 0) return cur;
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  for (let step = 0; step < distance; step++) {
    // Push along the dominant axis first, then the secondary, so the unit
    // slides along walls rather than getting stuck on a corner.
    const candidates: OccCell[] = [];
    if (Math.abs(dx) >= Math.abs(dy) && sx !== 0) {
      candidates.push({ x: cur.x + sx, y: cur.y });
      if (sy !== 0) candidates.push({ x: cur.x, y: cur.y + sy });
    } else if (sy !== 0) {
      candidates.push({ x: cur.x, y: cur.y + sy });
      if (sx !== 0) candidates.push({ x: cur.x + sx, y: cur.y });
    }
    let moved = false;
    for (const c of candidates) {
      if (isCellFree(c, ctx)) {
        cur = c;
        moved = true;
        break;
      }
    }
    if (!moved) break; // collision: stop before the blocked tile
  }
  return slideOffReserved(cur, ctx);
}

function slideOffReserved(cell: OccCell, ctx: OccupancyContext): OccCell {
  const reserved = ctx.reserved;
  if (!reserved?.has(occKey(cell.x, cell.y))) return cell;
  const [slid] = relocateOffMandatoryCells([cell], reserved, ctx);
  return slid;
}

/**
 * Resolve an attraction: move `target` up to `distance` tiles directly toward
 * `toward`, one step at a time, STOPPING before any tile that fails the
 * shared `isCellFree` check. Returns the cell the unit ends on. When the
 * target is already adjacent to or on `toward`, it does not move (attraction
 * never stacks two combatants on the same tile).
 *
 * Distance comes from explicit spell metadata — never a name-based heuristic.
 */
export function applyAttract(
  target: OccCell,
  toward: OccCell,
  distance: number,
  ctx: OccupancyContext,
): OccCell {
  let cur: OccCell = { x: target.x, y: target.y };
  const dx = toward.x - target.x;
  const dy = toward.y - target.y;
  if (dx === 0 && dy === 0) return cur;
  const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  for (let step = 0; step < distance; step++) {
    // Stop one tile short of `toward` so we never stack on it.
    if (Math.abs(cur.x - toward.x) + Math.abs(cur.y - toward.y) <= 1) break;
    const candidates: OccCell[] = [];
    if (Math.abs(dx) >= Math.abs(dy) && sx !== 0) {
      candidates.push({ x: cur.x + sx, y: cur.y });
      if (sy !== 0) candidates.push({ x: cur.x, y: cur.y + sy });
    } else if (sy !== 0) {
      candidates.push({ x: cur.x, y: cur.y + sy });
      if (sx !== 0) candidates.push({ x: cur.x + sx, y: cur.y });
    }
    let moved = false;
    for (const c of candidates) {
      if (isCellFree(c, ctx)) {
        cur = c;
        moved = true;
        break;
      }
    }
    if (!moved) break; // collision: stop before the blocked tile
  }
  return slideOffReserved(cur, ctx);
}
