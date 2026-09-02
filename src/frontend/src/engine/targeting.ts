/**
 * Pure targeting computation extracted from WorldExploration.tsx.
 *
 * `computeTargetableTiles` is the body of `getSpellRangeTiles` (formerly lines
 * 5998-6172 of WorldExploration.tsx) lifted into a React-free, DOM-free pure
 * function. The wrapper in WorldExploration.tsx retains:
 *   - the `useCallback` shell,
 *   - the `spellRangeCacheRef` cache check + set, and
 *   - the `battleOnlyHealBuffSpellsRef.current = false` side-effect (#19 Pacifist Run).
 *
 * What moves here:
 *   - the `self` / `all` early-returns,
 *   - the Manhattan ground branch (ground + isBarrier spells), and
 *   - the Chebyshev area/enemy branch (with Bresenham LoS, area expansion).
 *
 * The wrapper precomputes `effectiveRange` (a number) by calling
 * `getEffectiveSpellRange(baseRange, spell.modifiableRange ? spell.id : undefined)`
 * and passes it in via `gridState.effectiveRange`. The pure function NEVER
 * calls back into React state or callbacks.
 *
 * Canonical targeting rules preserved verbatim:
 *   - ground / barrier spells use MANHATTAN distance (|dx|+|dy| <= range),
 *   - area / enemy spells use CHEBYSHEV distance (max(|dx|,|dy|) <= range).
 * This asymmetry is intentional and is the single source of truth for both the
 * blue preview highlights and the castability check.
 */

import type { Enemy, SpellConfig } from "../types/gameTypes";
import { isActiveHostile } from "./battleSetup.ts";

/**
 * #19 Pacifist Run side-effect: flip the `battleOnlyHealBuffSpellsRef` flag to
 * false the moment the player selects ANY offensive spell. Kept here (next to
 * the targeting geometry it relates to) so the wrapper in WorldExploration.tsx
 * is a single one-line call instead of an inline ~25-line block.
 *
 * The ref is a React ref owned by the component, so it is passed in as a
 * parameter rather than imported — this keeps the helper pure-ish and
 * testable in isolation.
 *
 * Offensive categories mirror the original inline list verbatim.
 */
const OFFENSIVE_SPELL_CATEGORIES = [
  "damage",
  "drain",
  "aoe",
  "dot",
  "pushback",
  "attract",
  "cc",
  "teleport",
] as const;

export function applyHealBuffSideEffect(
  spell: SpellConfig,
  ref: { current: boolean },
): void {
  const targetType = (spell.targetType ?? "enemy") as string;
  const isDrainSpell = (spell.spellType ?? "") === "drain";
  const isPhysical = spell.isPhysical ?? false;
  const effectCat = (spell.effectCategory ?? "").toLowerCase();
  if (
    targetType === "enemy" ||
    targetType === "area" ||
    targetType === "line" ||
    isDrainSpell ||
    isPhysical ||
    OFFENSIVE_SPELL_CATEGORIES.includes(
      effectCat as (typeof OFFENSIVE_SPELL_CATEGORIES)[number],
    )
  ) {
    ref.current = false;
  }
}

/** Tile cell kind used by the world grid. */
export type TileType = "floor" | "wall" | "portal";

/** Barrier occupancy — same key space as `computeTargetableTiles`. */
export type TileKeySet = { has(key: string): boolean };
export type BarrierTiles =
  | ReadonlyMap<string, unknown>
  | ReadonlySet<string>
  | TileKeySet;

function hasBarrierTile(
  barriers: BarrierTiles | undefined,
  x: number,
  y: number,
): boolean {
  return barriers?.has(`${x},${y}`) === true;
}

/**
 * Base range the highlight wrapper feeds into `getEffectiveSpellRange`.
 * Attack Nearest used `Number(spell.range)` alone and silently dropped
 * `maxRange` plus the modifiable-range id — this helper is the single
 * input both preview and execution must start from.
 */
export function spellRangeBase(
  spell: Pick<SpellConfig, "range" | "maxRange">,
): number {
  return spell.maxRange ?? Math.max(1, Number(spell.range));
}

/**
 * Player preview + live gate: LoS only when `spell.lineOfSight` is
 * explicitly truthy. Enemy AI still uses `lineOfSight !== false` (default
 * on) — that is a different policy and is intentionally not unified here.
 */
export function playerSpellRequiresLos(spell: {
  lineOfSight?: boolean;
}): boolean {
  return !!spell.lineOfSight;
}

type LoSCell = { x: number; y: number };

/**
 * Bresenham LoS shared by {@link computeTargetableTiles} and
 * {@link isTileCastableLive}. Intermediate walls and active barrier tiles
 * block; the origin and destination cells do not. Void is not a TileType
 * and does not block.
 *
 * Three call shapes are supported so preview, live-cast, AI, and tests
 * can share one helper:
 *   hasBresenhamLoS(x0, y0, x1, y1, tiles, barriers?)
 *   hasBresenhamLoS(tiles, from, to, barriers?)
 *   hasBresenhamLoS(from, to, tiles, barriers?)
 */
export function hasBresenhamLoS(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tiles: TileType[][],
  barrierTiles?: BarrierTiles,
): boolean;
export function hasBresenhamLoS(
  tiles: TileType[][],
  from: LoSCell,
  to: LoSCell,
  barriers?: BarrierTiles,
): boolean;
export function hasBresenhamLoS(
  from: LoSCell,
  to: LoSCell,
  tiles: TileType[][],
  barriers?: BarrierTiles,
): boolean;
export function hasBresenhamLoS(
  a: number | TileType[][] | LoSCell,
  b: number | LoSCell,
  c: number | LoSCell | TileType[][],
  d?: number | LoSCell | BarrierTiles,
  e?: TileType[][],
  f?: BarrierTiles,
): boolean {
  let x0: number;
  let y0: number;
  let x1: number;
  let y1: number;
  let tiles: TileType[][];
  let barrierTiles: BarrierTiles;
  if (typeof a === "number") {
    x0 = a;
    y0 = b as number;
    x1 = c as number;
    y1 = d as number;
    tiles = e ?? [];
    barrierTiles = f ?? new Map();
  } else if (Array.isArray(a)) {
    const from = b as LoSCell;
    const to = c as LoSCell;
    x0 = from.x;
    y0 = from.y;
    x1 = to.x;
    y1 = to.y;
    tiles = a;
    barrierTiles = (d as BarrierTiles | undefined) ?? new Map();
  } else {
    const from = a;
    const to = b as LoSCell;
    x0 = from.x;
    y0 = from.y;
    x1 = to.x;
    y1 = to.y;
    tiles = c as TileType[][];
    barrierTiles = (d as BarrierTiles | undefined) ?? new Map();
  }
  let cx = x0;
  let cy = y0;
  const ddx = Math.abs(x1 - cx);
  const ddy = Math.abs(y1 - cy);
  const sx = cx < x1 ? 1 : -1;
  const sy = cy < y1 ? 1 : -1;
  let err = ddx - ddy;
  while (true) {
    if ((cx !== x0 || cy !== y0) && (cx !== x1 || cy !== y1)) {
      if (tiles[cy]?.[cx] === "wall") return false;
      if (barrierTiles.has(`${cx},${cy}`)) return false;
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -ddy) {
      err -= ddy;
      cx += sx;
    }
    if (e2 < ddx) {
      err += ddx;
      cy += sy;
    }
  }
  return true;
}

/**
 * Grid state snapshot passed into the pure targeting function.
 *
 * Every field is a primitive or a plain data structure — no React refs, no
 * callbacks, no component closures. The wrapper assembles this from live refs
 * before each call.
 */
export interface TargetGridState {
  /** Full world tile grid indexed as `tiles[y][x]`. */
  tiles: TileType[][];
  /** Enemies currently on the map (used for `freeCells` / occupied checks). */
  enemies: Enemy[];
  /** Edge length of the square world grid (WORLD_GRID_SIZE). */
  worldGridSize: number;
  /** Precomputed effective range for THIS spell (level + mod bonuses applied). */
  effectiveRange: number;
  /** Active barrier tiles → turns remaining (impassable, treated as walls). */
  barrierTiles: TileKeySet;
}

/** Caster position on the grid. */
export interface CasterPosition {
  x: number;
  y: number;
}

/**
 * Compute the set of `"x,y"` tile keys that the given spell can target from
 * `casterPos` on the supplied grid.
 *
 * Returns an empty Set for `self`/`all`/`ground`/`area`/`enemy` spells when
 * no tiles qualify. The caller (wrapper) is responsible for cache + the
 * pacifist-flag side-effect; this function only does the geometric work.
 */
export function computeTargetableTiles(
  spell: SpellConfig,
  casterPos: CasterPosition,
  gridState: TargetGridState,
): Set<string> {
  const { tiles, enemies, worldGridSize, effectiveRange, barrierTiles } =
    gridState;
  const targetType = (spell.targetType ?? "enemy") as string;
  const range = effectiveRange;
  const minR = spell.minRange ?? 1;

  // ── Self-targeting spells (heals, buffs, shields) only highlight the caster tile
  if (targetType === "self") {
    return new Set([`${casterPos.x},${casterPos.y}`]);
  }

  // ── Ally-targeting spells (Shield/Iron Skin/Haste/Enrage): self tile + allied
  // summon tiles within range. Allied summons are enemies with isSummon=true and
  // side='player'. ADDITIVE branch — does not affect existing branches.
  if (targetType === "ally") {
    const out = new Set<string>();
    out.add(`${casterPos.x},${casterPos.y}`);
    for (const e of enemies) {
      if (!e.isSummon || e.side !== "player" || e.hp <= 0) continue;
      const dx = Math.abs(e.x - casterPos.x);
      const dy = Math.abs(e.y - casterPos.y);
      if (Math.max(dx, dy) <= range) {
        out.add(`${e.x},${e.y}`);
      }
    }
    return out;
  }

  // "all" spells affect every non-wall tile on the map
  if (targetType === "all") {
    const allTiles = new Set<string>();
    for (let y = 0; y < worldGridSize; y++) {
      for (let x = 0; x < worldGridSize; x++) {
        if (tiles[y][x] !== "wall") {
          allTiles.add(`${x},${y}`);
        }
      }
    }
    return allTiles;
  }

  const out = new Set<string>();

  const hasLoS = (tx: number, ty: number): boolean =>
    hasBresenhamLoS(casterPos.x, casterPos.y, tx, ty, tiles, barrierTiles);

  // ── Ground / barrier branch: MANHATTAN distance ─────────────────────────────
  if (targetType === "ground" || spell.isBarrier) {
    const occupied = new Set<string>();
    for (const e of enemies) occupied.add(`${e.x},${e.y}`);
    occupied.add(`${casterPos.x},${casterPos.y}`);
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const nx = casterPos.x + dx;
        const ny = casterPos.y + dy;
        if (nx < 0 || ny < 0 || nx >= worldGridSize || ny >= worldGridSize)
          continue;
        if (Math.abs(dx) + Math.abs(dy) > range && !spell.diagonal) continue;
        if (barrierTiles.has(`${nx},${ny}`)) continue;
        const key = `${nx},${ny}`;
        if (!occupied.has(key) && tiles[ny]?.[nx] !== "wall") {
          // LoS: ground/barrier spells with truthy spell.lineOfSight require
          // an unobstructed ray from caster to target. Spells with falsy
          // spell.lineOfSight (e.g. Barrier, which has no lineOfSight field)
          // bypass this and keep placing on any in-range free tile.
          if (playerSpellRequiresLos(spell) && !hasLoS(nx, ny)) continue;
          out.add(key);
        }
      }
    }
    return out;
  }

  // ── Line branch: tiles in a straight line from caster up to range using
  // Bresenham LoS. Walks every cell the ray passes through; stops at walls,
  // barriers, or grid bounds. ADDITIVE — does not affect existing branches.
  if (targetType === "line") {
    const out = new Set<string>();
    // Cast rays in all 8 directions (cardinal + diagonal) up to `range` tiles.
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [dx, dy] of dirs) {
      for (let step = 1; step <= range; step++) {
        const nx = casterPos.x + dx * step;
        const ny = casterPos.y + dy * step;
        if (nx < 0 || ny < 0 || nx >= worldGridSize || ny >= worldGridSize)
          break;
        if (tiles[ny]?.[nx] === "wall") break;
        if (barrierTiles.has(`${nx},${ny}`)) break;
        // LoS: line spells with truthy spell.lineOfSight require an
        // unobstructed ray. The ray-walk break above already stops at walls
        // and barriers, so hasLoS is satisfied for any tile reached; this
        // explicit guard keeps the line branch consistent with the
        // enemy/area/ground branches. Spells with falsy spell.lineOfSight
        // bypass it.
        if (playerSpellRequiresLos(spell) && !hasLoS(nx, ny)) break;
        if (step < minR) continue;
        out.add(`${nx},${ny}`);
      }
    }
    return out;
  }

  // ── Chain branch: single-target castability (same shape as 'enemy', no area
  // expansion). Bounces are handled in castHelpers, not targeting. ADDITIVE.
  if (targetType === "chain") {
    const out = new Set<string>();
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
        if (chebyshev > range) continue;
        if (chebyshev < minR) continue;
        if (dx === 0 && dy === 0) continue;
        const nx = casterPos.x + dx;
        const ny = casterPos.y + dy;
        if (nx < 0 || nx >= worldGridSize || ny < 0 || ny >= worldGridSize)
          continue;
        if (tiles[ny][nx] === "wall") continue;
        if (barrierTiles.has(`${nx},${ny}`)) continue;
        if (playerSpellRequiresLos(spell) && !hasLoS(nx, ny)) continue;
        out.add(`${nx},${ny}`);
      }
    }
    return out;
  }

  // ── Area / enemy branch: CHEBYSHEV distance ─────────────────────────────────
  const areaRadius = spell.areaRadius ?? 0;
  const targetTiles = new Set<string>();
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
      if (chebyshev > range) continue;
      if (chebyshev < minR) continue;
      if (dx === 0 && dy === 0) continue;
      const nx = casterPos.x + dx;
      const ny = casterPos.y + dy;
      if (nx < 0 || nx >= worldGridSize || ny < 0 || ny >= worldGridSize)
        continue;
      if (tiles[ny][nx] === "wall") continue;

      // Linear: only cardinal directions (dx=0 or dy=0)
      if (spell.linear && dx !== 0 && dy !== 0) continue;
      // Diagonal: only diagonal lines (|dx|===|dy|)
      if (spell.diagonal && Math.abs(dx) !== Math.abs(dy)) continue;
      // Free cells: skip tiles occupied by enemies or player
      if (spell.freeCells) {
        const occupied =
          enemies.some((e) => e.x === nx && e.y === ny) ||
          (nx === casterPos.x && ny === casterPos.y);
        if (occupied) continue;
      }
      // Line of sight check
      if (playerSpellRequiresLos(spell) && !hasLoS(nx, ny)) continue;

      // H3: barrier tiles are impassable (treat as walls for LoS and range)
      if (barrierTiles.has(`${nx},${ny}`)) continue;
      targetTiles.add(`${nx},${ny}`);
    }
  }

  // For area spells, expand each target tile by areaRadius
  if (targetType === "area" && areaRadius > 0) {
    for (const key of targetTiles) {
      const [tx, ty] = key.split(",").map(Number);
      for (let dy = -areaRadius; dy <= areaRadius; dy++) {
        for (let dx = -areaRadius; dx <= areaRadius; dx++) {
          const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
          if (chebyshev > areaRadius) continue;
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || nx >= worldGridSize || ny < 0 || ny >= worldGridSize)
            continue;
          if (tiles[ny][nx] === "wall") continue;
          out.add(`${nx},${ny}`);
        }
      }
    }
  } else {
    for (const key of targetTiles) out.add(key);
  }

  return out;
}

/**
 * Result of a live single-tile castability probe. `ok` is true when the tile
 * is a legal target for `spell` from `casterPos` against the CURRENT world
 * (no cache). When `ok` is false, `reason` is a short stable string the click
 * handlers log on rejection.
 */
export interface TileCastableResult {
  ok: boolean;
  reason: string;
}

const EMPTY_BARRIER_TILES: ReadonlyMap<string, number> = new Map();

/**
 * #1A — Live single-tile validation helper (PURE, no cache).
 *
 * Validates range metric + line-of-sight + target rules for ONE tile against
 * the CURRENT world. Reuses the SAME range metric and LoS logic as
 * {@link computeTargetableTiles} so the highlight (precomputed set) and the
 * live gate (this helper) can never disagree on geometry. Pass the same
 * `effectiveRange` the highlight used (level / modifier bonus); the raw
 * `spell.maxRange` fallback is only for callers that have no grown range.
 *   - ground / barrier spells → MANHATTAN distance (|dx|+|dy| <= range),
 *   - area / enemy / chain spells → CHEBYSHEV distance (max(|dx|,|dy|) <= range),
 *   - line spells → Bresenham LoS ray-walk (must reach the tile),
 *   - LoS (when `spell.lineOfSight` is truthy) → Bresenham unobstructed ray.
 *
 * Target rules are honored using EXPLICIT metadata only (the `targetType`
 * field plus `spell.isBarrier` / `spell.lineOfSight` / `spell.freeCells` /
 * `spell.linear` / `spell.diagonal` / `spell.areaRadius` / `spell.minRange`)
 * — never name-based heuristics.
 *
 * `self` / `all` / `ally` are handled inline (self → only the caster tile;
 * all → any non-wall tile; ally → caster tile or a player-side summon tile
 * within Chebyshev range). `ground` / `barrier` use Manhattan. `line` walks
 * the Bresenham ray. `area` / `enemy` / `chain` use Chebyshev (area expands
 * the destination by `areaRadius` so a tile inside the AoE footprint of a
 * legal anchor is itself legal).
 *
 * `liveCombatants` is the live combatant array (typically
 * `getLiveCombatants(combatantStoreCtx)`) used for occupied/free-cell checks.
 * `mapTiles` is the world tile grid. Both are read-only here.
 * `barrierTiles` must be the same active-barrier map the highlight used —
 * omitting it lets sprite-click / Attack Nearest snipe through a mid-ray
 * barrier the blue ring never offered.
 */
export function isTileCastableLive(
  spell: SpellConfig,
  casterPos: CasterPosition,
  tile: { x: number; y: number },
  liveCombatants: Enemy[],
  mapTiles: TileType[][],
  effectiveRange?: number,
  barrierTiles: BarrierTiles = EMPTY_BARRIER_TILES,
): TileCastableResult {
  const targetType = (spell.targetType ?? "enemy") as string;
  const worldGridSize = mapTiles.length;
  const range = effectiveRange ?? spellRangeBase(spell);
  const minR = spell.minRange ?? 1;
  const barriers = barrierTiles;
  const destKey = `${tile.x},${tile.y}`;
  const tx = tile.x;
  const ty = tile.y;

  // Bounds check — out-of-grid tiles are never castable.
  if (
    !Number.isFinite(tx) ||
    !Number.isFinite(ty) ||
    tx < 0 ||
    ty < 0 ||
    tx >= worldGridSize ||
    ty >= worldGridSize ||
    mapTiles.length <= ty ||
    mapTiles[ty]?.length <= tx
  ) {
    return { ok: false, reason: "out_of_bounds" };
  }

  // Wall tiles are never castable (every branch rejects them).
  if (mapTiles[ty][tx] === "wall") {
    return { ok: false, reason: "wall_tile" };
  }

  // ── self: only the caster tile.
  if (targetType === "self") {
    if (tx === casterPos.x && ty === casterPos.y) {
      return { ok: true, reason: "self" };
    }
    return { ok: false, reason: "self_other_tile" };
  }

  // ── all: any non-wall tile (wall already rejected above).
  if (targetType === "all") {
    return { ok: true, reason: "all" };
  }

  // ── ally: caster tile OR a player-side summon within Chebyshev range.
  if (targetType === "ally") {
    if (tx === casterPos.x && ty === casterPos.y) {
      return { ok: true, reason: "ally_self" };
    }
    const dx = Math.abs(tx - casterPos.x);
    const dy = Math.abs(ty - casterPos.y);
    if (Math.max(dx, dy) > range) {
      return { ok: false, reason: "ally_out_of_range" };
    }
    const ally = liveCombatants.find(
      (e) =>
        e.x === tx &&
        e.y === ty &&
        e.isSummon === true &&
        e.side === "player" &&
        e.hp > 0,
    );
    if (ally) return { ok: true, reason: "ally_summon" };
    return { ok: false, reason: "ally_no_summon_at_tile" };
  }

  const hasLoS = (lx1: number, ly1: number): boolean =>
    hasBresenhamLoS(casterPos.x, casterPos.y, lx1, ly1, mapTiles, barrierTiles);

  // ── ground / barrier: MANHATTAN distance.
  if (targetType === "ground" || spell.isBarrier) {
    const dx = Math.abs(tx - casterPos.x);
    const dy = Math.abs(ty - casterPos.y);
    if (Math.abs(dx) + Math.abs(dy) > range && !spell.diagonal) {
      return { ok: false, reason: "ground_out_of_range" };
    }
    if (barriers?.has(destKey)) {
      return { ok: false, reason: "ground_barrier" };
    }
    // Occupied tiles (by a combatant or the caster) are not castable ground.
    const occupied =
      liveCombatants.some((e) => e.x === tx && e.y === ty) ||
      (tx === casterPos.x && ty === casterPos.y);
    if (occupied) {
      return { ok: false, reason: "ground_occupied" };
    }
    if (hasBarrierTile(barrierTiles, tx, ty)) {
      return { ok: false, reason: "ground_barrier" };
    }
    if (playerSpellRequiresLos(spell) && !hasLoS(tx, ty)) {
      return { ok: false, reason: "ground_los_blocked" };
    }
    return { ok: true, reason: "ground" };
  }

  // ── line: Bresenham ray-walk from caster toward the tile in the matching
  // direction; the tile is castable iff the ray reaches it before hitting a
  // wall / barrier / grid bound. This mirrors the line branch in
  // computeTargetableTiles exactly.
  if (targetType === "line") {
    const ddx = tx - casterPos.x;
    const ddy = ty - casterPos.y;
    // Line spells only travel along the 8 cardinal/diagonal directions.
    const isCardinal = ddx === 0 || ddy === 0;
    const isDiagonal = Math.abs(ddx) === Math.abs(ddy);
    if (!isCardinal && !isDiagonal) {
      return { ok: false, reason: "line_off_axis" };
    }
    const stepX = ddx === 0 ? 0 : ddx > 0 ? 1 : -1;
    const stepY = ddy === 0 ? 0 : ddy > 0 ? 1 : -1;
    const cheb = Math.max(Math.abs(ddx), Math.abs(ddy));
    if (cheb > range) return { ok: false, reason: "line_out_of_range" };
    if (cheb < minR) return { ok: false, reason: "line_below_min_range" };
    let cx = casterPos.x;
    let cy = casterPos.y;
    for (let step = 1; step <= cheb; step++) {
      cx += stepX;
      cy += stepY;
      if (cx < 0 || cy < 0 || cx >= worldGridSize || cy >= worldGridSize) {
        return { ok: false, reason: "line_blocked_bounds" };
      }
      if (mapTiles[cy]?.[cx] === "wall") {
        return { ok: false, reason: "line_blocked_wall" };
      }
      if (hasBarrierTile(barrierTiles, cx, cy)) {
        return { ok: false, reason: "line_blocked_barrier" };
      }
      if (playerSpellRequiresLos(spell) && !hasLoS(cx, cy)) {
        return { ok: false, reason: "line_los_blocked" };
      }
      if (cx === tx && cy === ty) {
        // Reached the target tile along an unobstructed ray.
        return { ok: true, reason: "line" };
      }
    }
    return { ok: false, reason: "line_not_reached" };
  }

  // ── area / enemy / chain: CHEBYSHEV distance (with area expansion for
  // `area`). The clicked tile is castable when it is within Chebyshev range
  // of the caster (enemy/chain) OR within `areaRadius` of an in-range anchor
  // tile (area). LoS, linear, diagonal, freeCells, and minRange are honored.
  // Preview skips enemy/chain destinations that are active barriers.
  if (targetType !== "area" && barrierTiles.has(`${tx},${ty}`)) {
    return { ok: false, reason: "barrier_tile" };
  }
  const dx = tx - casterPos.x;
  const dy = ty - casterPos.y;
  const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));

  const destBarrier = barrierTiles.has(`${tx},${ty}`);
  const destOccupied =
    liveCombatants.some((e) => e.x === tx && e.y === ty) ||
    (tx === casterPos.x && ty === casterPos.y);

  // Linear: only cardinal directions (dx=0 or dy=0).
  if (spell.linear && dx !== 0 && dy !== 0) {
    // For area spells, the tile may still be inside the AoE footprint of a
    // legal cardinal anchor — check the area expansion path below before
    // rejecting.
    if (targetType !== "area") {
      return { ok: false, reason: "linear_off_axis" };
    }
  }
  // Diagonal: only diagonal lines (|dx|===|dy|).
  if (spell.diagonal && Math.abs(dx) !== Math.abs(dy)) {
    if (targetType !== "area") {
      return { ok: false, reason: "diagonal_off_axis" };
    }
  }

  // freeCells: skip tiles occupied by a combatant or the caster.
  if (spell.freeCells && destOccupied && targetType !== "area") {
    return { ok: false, reason: "free_cells_occupied" };
  }
  if (destBarrier && targetType !== "area") {
    return { ok: false, reason: "barrier_tile" };
  }

  const isLegalAnchorShape =
    !(spell.linear && dx !== 0 && dy !== 0) &&
    !(spell.diagonal && Math.abs(dx) !== Math.abs(dy)) &&
    !(spell.freeCells && destOccupied) &&
    !destBarrier;

  // Direct in-range check (enemy / chain / area anchor). Occupied /
  // barrier tiles are not anchors when freeCells is set — they may still
  // be legal via area expansion, matching computeTargetableTiles.
  if (
    isLegalAnchorShape &&
    chebyshev <= range &&
    chebyshev >= minR &&
    !(dx === 0 && dy === 0)
  ) {
    if (playerSpellRequiresLos(spell) && !hasLoS(tx, ty)) {
      // Fall through to area-expansion check for area spells.
      if (targetType !== "area") {
        return { ok: false, reason: "los_blocked" };
      }
    } else if (destBarrier && targetType !== "area") {
      return { ok: false, reason: "barrier_tile" };
    } else if (!destBarrier) {
      return {
        ok: true,
        reason: targetType === "area" ? "area_anchor" : targetType,
      };
    }
  }

  // Area expansion: the clicked tile is castable when it sits inside the
  // areaRadius footprint of a legal anchor tile. Walk candidate anchors
  // within Chebyshev range of the caster and check whether the clicked tile
  // is within areaRadius of any of them (and that anchor has LoS, etc.).
  if (targetType === "area") {
    const areaRadius = spell.areaRadius ?? 0;
    if (areaRadius <= 0) {
      return { ok: false, reason: "area_no_radius" };
    }
    for (let ay = -range; ay <= range; ay++) {
      for (let ax = -range; ax <= range; ax++) {
        const aCheb = Math.max(Math.abs(ax), Math.abs(ay));
        if (aCheb > range) continue;
        if (aCheb < minR) continue;
        if (ax === 0 && ay === 0) continue;
        const axN = casterPos.x + ax;
        const ayN = casterPos.y + ay;
        if (axN < 0 || ayN < 0 || axN >= worldGridSize || ayN >= worldGridSize)
          continue;
        if (mapTiles[ayN]?.[axN] === "wall") continue;
        if (hasBarrierTile(barrierTiles, axN, ayN)) continue;
        if (spell.linear && ax !== 0 && ay !== 0) continue;
        if (spell.diagonal && Math.abs(ax) !== Math.abs(ay)) continue;
        if (spell.freeCells) {
          const occ =
            liveCombatants.some((e) => e.x === axN && e.y === ayN) ||
            (axN === casterPos.x && ayN === casterPos.y);
          if (occ) continue;
        }
        if (playerSpellRequiresLos(spell) && !hasLoS(axN, ayN)) continue;
        // Is the clicked tile within areaRadius of this anchor?
        const tdx = Math.abs(tx - axN);
        const tdy = Math.abs(ty - ayN);
        if (Math.max(tdx, tdy) <= areaRadius) {
          return { ok: true, reason: "area_expansion" };
        }
      }
    }
    return { ok: false, reason: "area_no_anchor" };
  }

  return { ok: false, reason: "no_matching_branch" };
}

/**
 * Sprite-click Strike (no spell selected) must honor the live gate.
 * `executeCastAttempt` / `resolvePlayerCast` do not re-check caster range —
 * `getAoETargets` includes the occupant of the clicked tile unconditionally.
 * Calling the cast when the gate fails lets melee Strike hit from anywhere.
 */
export function shouldExecuteLiveCast(live: TileCastableResult): boolean {
  return live.ok;
}

/**
 * Caster origin Attack Nearest must pass to the live gate.
 *
 * `getActiveCasterPos()` follows a controlled summon so movement and
 * spell-range *previews* render from that tile. Attack Nearest still
 * casts player spells through `resolvePlayerCast`, which:
 *   - heals only when `gridPos === playerPosition`
 *   - does not re-check range from the player
 *
 * Using the summon tile (7f14ece) therefore (1) spent player AP on a
 * self-heal that never applied and marked `challengeHealUsed`, and
 * (2) let Strike pick a hostile only the summon could reach.
 * Canvas already routes summon-turn clicks to kit casts. Keep LoS /
 * minRange / maxRange / isActiveHostile; do not change origin.
 */
export function attackNearestLiveCasterPos(
  playerPos: CasterPosition,
  _activeCasterPos: CasterPosition,
): CasterPosition {
  return { x: playerPos.x, y: playerPos.y };
}

/**
 * Range base shared by `getSpellRangeTiles` and Attack Nearest.
 * `maxRange` overrides `range` when set — using raw `spell.range` alone
 * lets Attack Nearest miss a tile the highlight already painted.
 */
export function spellHighlightRangeBase(
  spell: Pick<SpellConfig, "maxRange" | "range">,
): number {
  return spell.maxRange ?? Math.max(1, Number(spell.range));
}

/**
 * Nearest hostile tile that is legal under the same live gate as the
 * highlight set. Chebyshev-only search (raw `spell.range`, no LoS /
 * minRange / linear) used to pick a closer blocked tile — or miss a
 * farther highlighted one — so Attack Nearest and the blue ring disagreed.
 */

export function playerSpellEffectiveRange(
  spell: SpellConfig,
  getEffectiveSpellRange: (baseRange: number, spellId?: string) => number,
): number {
  return getEffectiveSpellRange(
    spellHighlightRangeBase(spell),
    spell.modifiableRange ? spell.id : undefined,
  );
}

export function pickNearestLiveHostileTile(
  spell: SpellConfig,
  caster: CasterPosition,
  hostiles: ReadonlyArray<{ x: number; y: number }>,
  liveCombatants: Enemy[],
  mapTiles: TileType[][],
  effectiveRange: number,
  barrierTiles: BarrierTiles = EMPTY_BARRIER_TILES,
): { x: number; y: number } | null {
  let nearest: { x: number; y: number } | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const hostile of hostiles) {
    const tile = { x: hostile.x, y: hostile.y };
    const live = isTileCastableLive(
      spell,
      caster,
      tile,
      liveCombatants,
      mapTiles,
      effectiveRange,
      barrierTiles,
    );
    if (!shouldExecuteLiveCast(live)) continue;
    const dist = Math.max(
      Math.abs(tile.x - caster.x),
      Math.abs(tile.y - caster.y),
    );
    if (dist < nearestDist) {
      nearest = tile;
      nearestDist = dist;
    }
  }
  return nearest;
}

/** Attack Nearest button: same legal set as the live execute path. */
export function canAttackNearestLive(
  spell: SpellConfig,
  caster: CasterPosition,
  hostiles: ReadonlyArray<{ x: number; y: number }>,
  liveCombatants: Enemy[],
  mapTiles: TileType[][],
  effectiveRange: number,
  barrierTiles: BarrierTiles = EMPTY_BARRIER_TILES,
): boolean {
  if (spell.targetType === "self" && spell.effectType === "heal") {
    return shouldExecuteLiveCast(
      isTileCastableLive(
        spell,
        caster,
        { x: caster.x, y: caster.y },
        liveCombatants,
        mapTiles,
        effectiveRange,
        barrierTiles,
      ),
    );
  }
  return (
    pickNearestLiveHostileTile(
      spell,
      caster,
      hostiles,
      liveCombatants,
      mapTiles,
      effectiveRange,
      barrierTiles,
    ) != null
  );
}

/**
 * Attack Nearest must search the live store, then drop dead / allied /
 * leftover-wolf rows before the live gate. Passing React `enemies` or the
 * raw combatant list used to snipe a corpse or a player summon.
 */
export function liveHostilesForAttackNearest<
  T extends {
    x: number;
    y: number;
    hp?: number;
    side?: "player" | "enemy";
    isSummon?: boolean;
  },
>(combatants: readonly T[]): T[] {
  return combatants.filter((c) =>
    isActiveHostile({
      hp: c.hp ?? 0,
      side: c.side,
      isSummon: c.isSummon,
    }),
  );
}

/**
 * Mouse / sprite / touch / Attack Nearest share this probe so a highlighted
 * tile and a live click cannot disagree on geometry.
 */
export function probeLiveCast(
  spell: SpellConfig,
  casterPos: CasterPosition,
  tile: { x: number; y: number },
  liveCombatants: Enemy[],
  mapTiles: TileType[][],
  effectiveRange: number,
  barrierTiles: BarrierTiles = EMPTY_BARRIER_TILES,
): TileCastableResult {
  return isTileCastableLive(
    spell,
    casterPos,
    tile,
    liveCombatants,
    mapTiles,
    effectiveRange,
    barrierTiles,
  );
}

/**
 * Entity-first hostile clicks already passed the live gate. Skip the
 * cached highlight membership check so a just-moved enemy is still
 * clickable when geometry says yes (the documented WX bypass).
 */
export function shouldBypassHighlightForLiveHostile(
  occupantIsLiveHostile: boolean,
  live: TileCastableResult,
): boolean {
  return occupantIsLiveHostile && shouldExecuteLiveCast(live);
}

/** Execute path: live store + hostility filter + highlight live gate. */
export function pickNearestAttackableHostile(
  spell: SpellConfig,
  caster: CasterPosition,
  liveCombatants: Enemy[],
  mapTiles: TileType[][],
  effectiveRange: number,
  barrierTiles: BarrierTiles = EMPTY_BARRIER_TILES,
): { x: number; y: number } | null {
  return pickNearestLiveHostileTile(
    spell,
    caster,
    liveHostilesForAttackNearest(liveCombatants),
    liveCombatants,
    mapTiles,
    effectiveRange,
    barrierTiles,
  );
}

/** Button enable: same filter + gate as {@link pickNearestAttackableHostile}. */
export function canAttackNearestAgainstLive(
  spell: SpellConfig,
  caster: CasterPosition,
  liveCombatants: Enemy[],
  mapTiles: TileType[][],
  effectiveRange: number,
  barrierTiles: BarrierTiles = EMPTY_BARRIER_TILES,
): boolean {
  return canAttackNearestLive(
    spell,
    caster,
    liveHostilesForAttackNearest(liveCombatants),
    liveCombatants,
    mapTiles,
    effectiveRange,
    barrierTiles,
  );
}
