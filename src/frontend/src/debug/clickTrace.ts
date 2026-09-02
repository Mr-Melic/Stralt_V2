/**
 * clickTrace.ts — Pure click-geometry trace recorder + invariant measurer.
 *
 * Build #329 — Debug-only module. NEVER shipped to normal players; callers
 * gate invocation behind `import.meta.env.DEV`. This file itself does no
 * gating so it can be unit-tested in isolation — the gating is the caller's
 * responsibility (per the project rule "All admin and debug features must be
 * dev-only/gated and never ship to normal players").
 *
 * ── Purpose ────────────────────────────────────────────────────────────────
 * Capture the full pointer → tile → combatant → outcome chain on every
 * canvas click so the debug export can show EXACTLY where a click that
 * "should have hit" diverged from where it landed. Four layers per record:
 *
 *   Layer A — pointer chain (client → rect → cssOffset → logical → backing
 *             → dpr → camera → canvas sizes → scaleFactor).
 *   Layer B — tile round-trip (logical → resolvedTile → tileAnchorBack →
 *             roundTripError → roundTripOk).
 *   Layer C — combatant geometry table, one row per living combatant, sorted
 *             by deltaToClick.dist ASC so row 0 is the intended target.
 *   Layer D — spell/targeting state + cast outcome at click time.
 *
 * Four invariants are computed per record (I1 round-trip, I2 rect-anchor,
 * I3 space near-miss, I4 entity-tile). Any failure logs one
 * `[GEOMETRY-INVARIANT]` line via the debug logger with the measured numbers.
 *
 * ── Purity contract ────────────────────────────────────────────────────────
 * This module is PURE with respect to WorldExploration.tsx: it does NOT
 * import from it. All geometry helpers that live in WX
 * (`pointerToRenderSpace`, `screenToGrid`, `gridToScreen`) are INJECTED via
 * the input object so this module can be tested and reasoned about in
 * isolation. Allowed imports:
 *   - debugLogger (sibling: ./debugLogger) — for [GEOMETRY-INVARIANT] lines.
 *   - gameConstants (CHARACTER_Y_OFFSET) — for rectVsTileDelta.
 *   - combatantStore types — for the Enemy row shape (TYPE only).
 *   - targeting types — for the TileType / SpellConfig shapes (TYPE only).
 *
 * ── Ring buffer ────────────────────────────────────────────────────────────
 * Capacity 20. `getClickTraceBuffer()` returns OLDEST-FIRST (index 0 is the
 * oldest record, index length-1 is the newest). When the buffer overflows,
 * the OLDEST record is dropped. This ordering is stable for export builders
 * that want chronological reading; reverse for newest-first display.
 *
 * ── hasLoS absence ─────────────────────────────────────────────────────────
 * The discovery episode established that `hasLoS` is NOT found via grep in
 * the engine. This module treats line-of-sight as OPTIONAL: if the caller
 * does not supply a `hasLoS` function in the input, `losClear` is set to
 * `null` (meaning "unknown") rather than failing or assuming true/false.
 */

import { CHARACTER_Y_OFFSET } from "../data/gameConstants";
import type { Enemy } from "../types/gameTypes";
import type { SpellConfig } from "../types/gameTypes";
import { logDebugWarn } from "./debugLogger";

// ── Ring buffer ────────────────────────────────────────────────────────────

const CLICK_TRACE_CAP = 20;
let _traceBuffer: ClickTraceRecord[] = [];

/**
 * Returns the click-trace ring buffer, OLDEST-FIRST.
 * (index 0 = oldest, index length-1 = newest). Readonly — callers MUST NOT
 * mutate. Capacity 20; overflow drops the oldest record.
 */
export function getClickTraceBuffer(): readonly ClickTraceRecord[] {
  return _traceBuffer;
}

/** Clear the trace buffer (dev-only reset hook). */
export function clearClickTraceBuffer(): void {
  _traceBuffer = [];
}

// ── Shared geometry types ──────────────────────────────────────────────────

/** Integer tile coordinate. */
export interface TileCoord {
  x: number;
  y: number;
}

/** Floating-point logical-space coordinate (pre-DPR canvas pixels). */
export interface Point {
  x: number;
  y: number;
}

/** DOM rect snapshot (getBoundingClientRect values, viewport-relative). */
export interface RectSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Per-frame sprite rect registered in `spriteRectsRef` (WX line 662).
 * Captured by value so the record is stable across frames.
 */
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
  drawOrder: number;
  id: string;
  kind: string;
  logicalX: number;
  logicalY: number;
  isAlive: boolean;
}

// ── Layer A — pointer chain ────────────────────────────────────────────────

export interface LayerAPointerChain {
  /** Raw clientX from the DOM pointer event. */
  clientX: number;
  /** Raw clientY from the DOM pointer event. */
  clientY: number;
  /** getBoundingClientRect snapshot of the canvas at click time. */
  rect: RectSnapshot;
  /**
   * CSS offset = client - rect.origin (i.e. CSS pixels inside the canvas
   * element, before any DPR scaling). This is what `pointerToRenderSpace`
   * receives as input.
   */
  cssOffset: Point;
  /**
   * Logical render-space coordinate, computed by the caller via
   * `pointerToRenderSpace(cssOffset)` (WX line 8664) and passed in. This
   * module does NOT call pointerToRenderSpace itself — it is injected via
   * the input object's `logical` field so the module stays pure w.r.t. WX.
   */
  logical: Point;
  /** Backing-store coordinate = logical * dpr (device pixels in the canvas). */
  backing: Point;
  /** devicePixelRatio at click time. */
  dpr: number;
  /** Camera offset in logical space at click time. */
  camera: Point;
  /** Canvas logical size (CSS pixels). */
  canvasSizeLogical: { w: number; h: number };
  /** Canvas backing-store size (device pixels). */
  canvasBacking: { w: number; h: number };
  /**
   * scaleFactor = canvasSizeLogical.w / rect.width. Should be 1.0 when the
   * canvas is rendered at its CSS size with no internal scaling. Divergence
   * here means the canvas is being stretched by CSS, which breaks the
   * pointerToRenderSpace assumption.
   */
  scaleFactor: number;
}

// ── Layer B — tile round-trip ──────────────────────────────────────────────

export interface LayerBTileRoundTrip {
  /** Tile resolved by screenToGrid(logical) (WX clientToGrid line 8591). */
  resolvedTile: TileCoord;
  /** Tile anchor projected back via gridToScreen(resolvedTile) (WX line 3060). */
  tileAnchorBack: Point;
  /** Euclidean distance between `logical` and `tileAnchorBack` (logical px). */
  roundTripError: number;
  /**
   * True when roundTripError <= effectiveTileH/2, i.e. the click landed
   * within half a tile of the round-tripped anchor — the screenToGrid /
   * gridToScreen pair is internally consistent for this click.
   */
  roundTripOk: boolean;
  /** The effective tile height used for the roundTripOk threshold. */
  effectiveTileH: number;
}

// ── Layer C — combatant geometry row ───────────────────────────────────────

export interface CombatantGeometryRow {
  /** Combatant id (Enemy.id or "player"). */
  id: string;
  /** "player" | "enemy" — combatant side. */
  kind: string;
  /** Same as kind, kept for explicit Layer-C schema clarity. */
  side: "player" | "enemy";
  /** Logical tile the combatant is on (Enemy.x / Enemy.y). */
  logicalTile: TileCoord;
  /** Tile anchor in logical space via gridToScreen(logicalTile). */
  tileAnchor: Point;
  /**
   * This-frame sprite rect from spriteRectsRef, or null if the combatant
   * had no rect registered this frame (a finding — see I2).
   */
  spriteRect: SpriteRect | null;
  /**
   * Where the sprite was actually drawn (spriteRect center). Null when
   * spriteRect is null.
   */
  drawAnchor: Point | null;
  /**
   * Delta from the sprite-rect CENTER to the click logical point.
   * Omitted (null) in the export-time snapshot (no pointer).
   */
  deltaToClick: { dx: number; dy: number; dist: number } | null;
  /**
   * True when the click logical point falls inside the sprite rect expanded
   * by `pad` px on each side. `pad` is supplied in the input (typically a
   * small hit-padding to match the in-game hit-test).
   */
  pointerInRect: boolean;
  /** Chebyshev distance from the PLAYER's logical tile to this row's tile. */
  chebyshevFromPlayer: number;
  /** Manhattan distance from the PLAYER's logical tile to this row's tile. */
  manhattanFromPlayer: number;
  /** True when chebyshevFromPlayer <= spellRange (and spellRange is finite). */
  inSpellRange: boolean;
  /**
   * Line-of-sight clear between player and this combatant. `null` when no
   * `hasLoS` function was supplied in the input (hasLoS is absent in the
   * current engine — see module header).
   */
  losClear: boolean | null;
  /**
   * Delta from sprite-rect center to the draw anchor the renderer actually
   * used (spriteRect.x + w/2, spriteRect.y + h/2). For a correctly
   * registered rect this is (0,0). Used by I2.
   */
  rectVsDrawDelta: { dx: number; dy: number };
  /**
   * Delta from sprite-rect center to (tileAnchor.x, tileAnchor.y -
   * CHARACTER_Y_OFFSET). For a correctly placed sprite this is (0,0).
   * Captures the "sprite drawn off its tile" class of bugs.
   */
  rectVsTileDelta: { dx: number; dy: number };
}

// ── Layer D — state + outcome ──────────────────────────────────────────────

export interface LayerDStateOutcome {
  /** Currently selected spell id, or null if none. */
  selectedSpellId: string | null;
  /** Effective spell range at click time (tiles). Null if no spell selected. */
  spellRange: number | null;
  /** Spell targetType metadata ("self"|"ally"|"enemy"|"ground"|"area"|"line"|"all"). */
  targetType: string | null;
  /** Battle action mode at click time (e.g. "move"|"cast"|"none"). */
  battleActionMode: string | null;
  /** Current turn entry id, or null. */
  currentTurnEntry: string | null;
  /** Current battle AP for the acting combatant. */
  currentBattleAp: number | null;
  /** Current battle MP for the acting combatant. */
  currentBattleMp: number | null;
  /** Number of tiles in the spellTiles set at click time. */
  spellTilesSize: number | null;
  /** True when the resolved tile was in the spellTiles set. */
  tileInSpellTiles: boolean | null;
  /**
   * Which branch the click handler took: "cast" | "move" | "select" |
   * "reject" | "noop" | "unknown". Captured by the caller.
   */
  branchTaken: string;
  /** Cast result if branchTaken === "cast", else null. */
  castResult: string | null;
  /** Reject reason if branchTaken === "reject", else null. */
  rejectReason: string | null;
}

// ── Top-level record ───────────────────────────────────────────────────────

export interface ClickTraceRecord {
  /** Wall-clock ms at click time. */
  ts: number;
  /** Monotonic counter — increments per recorded click, never resets. */
  seq: number;
  layerA: LayerAPointerChain;
  layerB: LayerBTileRoundTrip;
  layerC: CombatantGeometryRow[];
  layerD: LayerDStateOutcome;
  /** Per-record invariant results (I1..I4). */
  invariants: InvariantResults;
}

export interface InvariantResults {
  /** I1 — tile round-trip consistency (Layer B roundTripOk). */
  i1_roundTrip: { pass: boolean; roundTripError: number; threshold: number };
  /**
   * I2 — rect-anchor: |rectVsDrawDelta| <= 2px for the NEAREST combatant
   * (row 0 of Layer C). Measures whether the registered sprite rect is
   * centered on its own draw anchor.
   */
  i2_rectAnchor: {
    pass: boolean;
    nearestId: string | null;
    dx: number;
    dy: number;
    mag: number;
    threshold: number;
  };
  /**
   * I3 — space near-miss: row 0 pointerInRect is FALSE but dist <= half a
   * sprite (spriteRect.w/2 averaged with h/2). Flags the exact dx/dy so a
   * systematic offset can be diagnosed. Only meaningful when a pointer was
   * supplied (deltaToClick non-null on row 0).
   */
  i3_spaceNearMiss: {
    pass: boolean;
    nearestId: string | null;
    dx: number;
    dy: number;
    dist: number;
    halfSprite: number;
  };
  /**
   * I4 — entity-tile: row 0 logicalTile equals the store position for that
   * id. The caller passes the store position map (id → tile) so this module
   * can verify the Layer-C row's logicalTile matches the authoritative
   * combatant-store tile, not just the sprite rect.
   */
  i4_entityTile: {
    pass: boolean;
    nearestId: string | null;
    rowTile: TileCoord | null;
    storeTile: TileCoord | null;
  };
}

// ── Input shapes ───────────────────────────────────────────────────────────

/**
 * Injected geometry helpers. These live in WorldExploration.tsx and are
 * passed in by the caller so this module stays pure w.r.t. WX.
 */
export interface GeometryHelpers {
  /**
   * Inverse of gridToScreen: logical point → tile. Mirrors WX
   * `clientToGrid` (line 8591). MUST be the SAME function the click handler
   * uses, so Layer B measures the real round-trip.
   */
  screenToGrid: (logical: Point) => TileCoord;
  /**
   * Tile → logical anchor point. Mirrors WX `gridToScreen` (line 3060).
   */
  gridToScreen: (tile: TileCoord) => Point;
  /**
   * OPTIONAL line-of-sight check. When absent, `losClear` is set to `null`
   * on every Layer-C row (hasLoS is not present in the current engine —
   * see module header).
   */
  hasLoS?: (from: TileCoord, to: TileCoord) => boolean;
}

/**
 * Input for {@link recordClickTrace}. Every field the module needs is
 * passed in — it reads no external state.
 */
export interface ClickTraceInput {
  /** Wall-clock timestamp (Date.now()). */
  ts: number;
  /** Injected geometry helpers (see {@link GeometryHelpers}). */
  helpers: GeometryHelpers;
  /** Effective tile height in logical px (TILE_HEIGHT or scaled). */
  effectiveTileH: number;
  /** Hit-padding in logical px applied around sprite rects for pointerInRect. */
  hitPad: number;

  // ── Layer A inputs ──
  clientX: number;
  clientY: number;
  rect: RectSnapshot;
  /** Precomputed logical point (caller ran pointerToRenderSpace already). */
  logical: Point;
  dpr: number;
  camera: Point;
  canvasSizeLogical: { w: number; h: number };
  canvasBacking: { w: number; h: number };

  // ── Layer C inputs ──
  /** Living combatants (typically getLiveCombatants(ctx) — caller's job). */
  combatants: Enemy[];
  /** This-frame sprite rects (spriteRectsRef.current — caller's job). */
  spriteRects: Map<string, SpriteRect>;
  /** Player's logical tile (for chebyshev/manhattan-from-player). */
  playerTile: TileCoord;
  /** Player's id (so the player row gets kind="player"). */
  playerId: string;
  /**
   * Authoritative store position map (id → tile) for I4. The caller builds
   * this from the combatant store; this module does NOT read the store.
   */
  storePositions: Map<string, TileCoord>;

  // ── Layer D inputs ──
  selectedSpell: SpellConfig | null;
  /** Effective spell range at click time (already computed by caller). */
  spellRange: number | null;
  battleActionMode: string | null;
  currentTurnEntry: string | null;
  currentBattleAp: number | null;
  currentBattleMp: number | null;
  /** spellTiles set size at click time. */
  spellTilesSize: number | null;
  /** True when the resolved tile was in the spellTiles set. */
  tileInSpellTiles: boolean | null;
  branchTaken: string;
  castResult: string | null;
  rejectReason: string | null;
}

// ── Geometry snapshot (export-time, pointer-less) ───────────────────────────

/**
 * Export-time geometry snapshot. Computes the full Layer-C table against
 * the CURRENT pointer-less state (so `deltaToClick` is null on every row),
 * plus the canvas/dpr/camera block and a spriteRects summary.
 *
 * Used by the debug export (ChatPanel.tsx buildDebugReportText/Html) to
 * capture "what the geometry looked like at export time" independent of any
 * specific click.
 */
export interface GeometrySnapshot {
  ts: number;
  /** Canvas/dpr/camera block (Layer-A environment, no pointer). */
  env: {
    dpr: number;
    camera: Point;
    canvasSizeLogical: { w: number; h: number };
    canvasBacking: { w: number; h: number };
  };
  /** Full Layer-C table (deltaToClick = null on every row). */
  combatantRows: CombatantGeometryRow[];
  /**
   * "rects this frame: N [ids]" — the count and ids of the spriteRects map
   * at snapshot time. Zero count or missing ids is a finding (logged via
   * debugLogger when count is 0).
   */
  spriteRectsSummary: { count: number; ids: string[] };
}

/**
 * Input for {@link getGeometrySnapshot}. Pointer-less counterpart of
 * {@link ClickTraceInput}.
 */
export interface GeometrySnapshotInput {
  ts: number;
  helpers: Pick<GeometryHelpers, "gridToScreen" | "hasLoS">;
  combatants: Enemy[];
  spriteRects: Map<string, SpriteRect>;
  playerTile: TileCoord;
  playerId: string;
  spellRange: number | null;
  dpr: number;
  camera: Point;
  canvasSizeLogical: { w: number; h: number };
  canvasBacking: { w: number; h: number };
}

// ── Internal helpers ───────────────────────────────────────────────────────

let _seq = 0;

function euclid(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

function chebyshev(a: TileCoord, b: TileCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function manhattan(a: TileCoord, b: TileCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Build a single Layer-C row for a combatant. `clickLogical` is null in the
 * export-time snapshot (no pointer) — when null, `deltaToClick` and
 * `pointerInRect` are nulled/false.
 */
function buildCombatantRow(
  combatant: Enemy,
  isPlayer: boolean,
  spriteRects: Map<string, SpriteRect>,
  playerTile: TileCoord,
  spellRange: number | null,
  hasLoS: ((from: TileCoord, to: TileCoord) => boolean) | undefined,
  gridToScreen: (tile: TileCoord) => Point,
  clickLogical: Point | null,
  hitPad: number,
): CombatantGeometryRow {
  const id = combatant.id;
  const side: "player" | "enemy" = isPlayer ? "player" : "enemy";
  const kind = isPlayer ? "player" : "enemy";
  const logicalTile: TileCoord = { x: combatant.x, y: combatant.y };
  const tileAnchor = gridToScreen(logicalTile);
  const spriteRect = spriteRects.get(id) ?? null;

  let drawAnchor: Point | null = null;
  let rectVsDrawDelta: { dx: number; dy: number } = { dx: 0, dy: 0 };
  let rectVsTileDelta: { dx: number; dy: number } = { dx: 0, dy: 0 };

  if (spriteRect) {
    const cx = spriteRect.x + spriteRect.w / 2;
    const cy = spriteRect.y + spriteRect.h / 2;
    drawAnchor = { x: cx, y: cy };
    // rectVsDrawDelta: rect center vs the draw anchor the renderer used.
    // The renderer draws at (spriteRect.x, spriteRect.y) so the rect's own
    // center IS the draw anchor → (0,0) for a self-consistent rect.
    rectVsDrawDelta = { dx: 0, dy: 0 };
    // rectVsTileDelta: rect center vs (tileAnchor.x, tileAnchor.y - CHARACTER_Y_OFFSET).
    // CHARACTER_Y_OFFSET is negative (-9), so subtracting it raises the anchor.
    const expectedX = tileAnchor.x;
    const expectedY = tileAnchor.y - CHARACTER_Y_OFFSET;
    rectVsTileDelta = { dx: cx - expectedX, dy: cy - expectedY };
  }

  let deltaToClick: { dx: number; dy: number; dist: number } | null = null;
  let pointerInRect = false;
  if (clickLogical && spriteRect) {
    const cx = spriteRect.x + spriteRect.w / 2;
    const cy = spriteRect.y + spriteRect.h / 2;
    const dx = clickLogical.x - cx;
    const dy = clickLogical.y - cy;
    deltaToClick = { dx, dy, dist: euclid(dx, dy) };
    pointerInRect =
      clickLogical.x >= spriteRect.x - hitPad &&
      clickLogical.x <= spriteRect.x + spriteRect.w + hitPad &&
      clickLogical.y >= spriteRect.y - hitPad &&
      clickLogical.y <= spriteRect.y + spriteRect.h + hitPad;
  }

  const cheby = chebyshev(playerTile, logicalTile);
  const manh = manhattan(playerTile, logicalTile);
  const inSpellRange =
    spellRange != null && Number.isFinite(spellRange) && cheby <= spellRange;
  const losClear = hasLoS ? hasLoS(playerTile, logicalTile) : null;

  return {
    id,
    kind,
    side,
    logicalTile,
    tileAnchor,
    spriteRect,
    drawAnchor,
    deltaToClick,
    pointerInRect,
    chebyshevFromPlayer: cheby,
    manhattanFromPlayer: manh,
    inSpellRange,
    losClear,
    rectVsDrawDelta,
    rectVsTileDelta,
  };
}

/**
 * Sort rows by deltaToClick.dist ASC so row 0 is the intended target.
 * Rows with null deltaToClick (no pointer / no rect) sort to the end.
 */
function sortRowsByDelta(rows: CombatantGeometryRow[]): CombatantGeometryRow[] {
  return [...rows].sort((a, b) => {
    const da = a.deltaToClick?.dist ?? Number.POSITIVE_INFINITY;
    const db = b.deltaToClick?.dist ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

// ── Invariant evaluation ───────────────────────────────────────────────────

const I2_THRESHOLD_PX = 2;

function evaluateInvariants(
  layerB: LayerBTileRoundTrip,
  layerC: CombatantGeometryRow[],
  storePositions: Map<string, TileCoord>,
): InvariantResults {
  // I1 — round-trip (Layer B).
  const i1 = {
    pass: layerB.roundTripOk,
    roundTripError: layerB.roundTripError,
    threshold: layerB.effectiveTileH / 2,
  };

  // I2 — rect-anchor: nearest combatant's |rectVsDrawDelta| <= 2px.
  // rectVsDrawDelta is always (0,0) for a self-consistent rect (see
  // buildCombatantRow), so this invariant currently measures self-consistency
  // of the registered rect. It is kept as a structural slot so future
  // render-anchor divergence (when drawAnchor is sourced from the actual
  // draw call rather than the rect) lights up here.
  const nearest = layerC[0] ?? null;
  const i2NearestId = nearest?.id ?? null;
  const i2Dx = nearest?.rectVsDrawDelta.dx ?? 0;
  const i2Dy = nearest?.rectVsDrawDelta.dy ?? 0;
  const i2Mag = nearest ? euclid(i2Dx, i2Dy) : 0;
  const i2 = {
    pass: nearest != null && i2Mag <= I2_THRESHOLD_PX,
    nearestId: i2NearestId,
    dx: i2Dx,
    dy: i2Dy,
    mag: i2Mag,
    threshold: I2_THRESHOLD_PX,
  };

  // I3 — space near-miss: row 0 pointerInRect FALSE but dist <= half a sprite.
  let i3 = {
    pass: true,
    nearestId: i2NearestId,
    dx: 0,
    dy: 0,
    dist: 0,
    halfSprite: 0,
  };
  if (nearest?.deltaToClick && nearest.spriteRect) {
    const halfSprite =
      (nearest.spriteRect.w / 2 + nearest.spriteRect.h / 2) / 2;
    const dist = nearest.deltaToClick.dist;
    const nearMiss = !nearest.pointerInRect && dist <= halfSprite;
    i3 = {
      pass: !nearMiss,
      nearestId: nearest.id,
      dx: nearest.deltaToClick.dx,
      dy: nearest.deltaToClick.dy,
      dist,
      halfSprite,
    };
  }

  // I4 — entity-tile: row 0 logicalTile equals store position for that id.
  let i4 = {
    pass: true,
    nearestId: i2NearestId,
    rowTile: nearest?.logicalTile ?? null,
    storeTile: null as TileCoord | null,
  };
  if (nearest) {
    const storeTile = storePositions.get(nearest.id) ?? null;
    const pass =
      storeTile != null &&
      storeTile.x === nearest.logicalTile.x &&
      storeTile.y === nearest.logicalTile.y;
    i4 = {
      pass,
      nearestId: nearest.id,
      rowTile: nearest.logicalTile,
      storeTile,
    };
  }

  return {
    i1_roundTrip: i1,
    i2_rectAnchor: i2,
    i3_spaceNearMiss: i3,
    i4_entityTile: i4,
  };
}

function logInvariantFailures(inv: InvariantResults): void {
  if (!inv.i1_roundTrip.pass) {
    logDebugWarn(
      "RENDER",
      `[GEOMETRY-INVARIANT] I1 round-trip FAIL: error=${inv.i1_roundTrip.roundTripError.toFixed(2)}px threshold=${inv.i1_roundTrip.threshold.toFixed(2)}px`,
    );
  }
  if (!inv.i2_rectAnchor.pass) {
    logDebugWarn(
      "RENDER",
      `[GEOMETRY-INVARIANT] I2 rect-anchor FAIL: nearest=${inv.i2_rectAnchor.nearestId} dx=${inv.i2_rectAnchor.dx.toFixed(2)} dy=${inv.i2_rectAnchor.dy.toFixed(2)} mag=${inv.i2_rectAnchor.mag.toFixed(2)}px threshold=${inv.i2_rectAnchor.threshold}px`,
    );
  }
  if (!inv.i3_spaceNearMiss.pass) {
    logDebugWarn(
      "RENDER",
      `[GEOMETRY-INVARIANT] I3 space near-miss: nearest=${inv.i3_spaceNearMiss.nearestId} dx=${inv.i3_spaceNearMiss.dx.toFixed(2)} dy=${inv.i3_spaceNearMiss.dy.toFixed(2)} dist=${inv.i3_spaceNearMiss.dist.toFixed(2)}px halfSprite=${inv.i3_spaceNearMiss.halfSprite.toFixed(2)}px`,
    );
  }
  if (!inv.i4_entityTile.pass) {
    const rt = inv.i4_entityTile.rowTile;
    const st = inv.i4_entityTile.storeTile;
    logDebugWarn(
      "RENDER",
      `[GEOMETRY-INVARIANT] I4 entity-tile FAIL: nearest=${inv.i4_entityTile.nearestId} rowTile=${rt ? `(${rt.x},${rt.y})` : "null"} storeTile=${st ? `(${st.x},${st.y})` : "null"}`,
    );
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a click trace. Returns the assembled record (also pushed into the
 * ring buffer). Pure w.r.t. WorldExploration.tsx — all inputs come via
 * `input`. Logs one `[GEOMETRY-INVARIANT]` line per failed invariant.
 */
export function recordClickTrace(input: ClickTraceInput): ClickTraceRecord {
  const {
    helpers,
    effectiveTileH,
    hitPad,
    clientX,
    clientY,
    rect,
    logical,
    dpr,
    camera,
    canvasSizeLogical,
    canvasBacking,
    combatants,
    spriteRects,
    playerTile,
    playerId,
    storePositions,
    selectedSpell,
    spellRange,
    battleActionMode,
    currentTurnEntry,
    currentBattleAp,
    currentBattleMp,
    spellTilesSize,
    tileInSpellTiles,
    branchTaken,
    castResult,
    rejectReason,
  } = input;

  // ── Layer A ──
  const cssOffset: Point = {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
  const backing: Point = { x: logical.x * dpr, y: logical.y * dpr };
  const scaleFactor = rect.width > 0 ? canvasSizeLogical.w / rect.width : 0;
  const layerA: LayerAPointerChain = {
    clientX,
    clientY,
    rect,
    cssOffset,
    logical,
    backing,
    dpr,
    camera,
    canvasSizeLogical,
    canvasBacking,
    scaleFactor,
  };

  // ── Layer B ──
  const resolvedTile = helpers.screenToGrid(logical);
  const tileAnchorBack = helpers.gridToScreen(resolvedTile);
  const rtdx = logical.x - tileAnchorBack.x;
  const rtdy = logical.y - tileAnchorBack.y;
  const roundTripError = euclid(rtdx, rtdy);
  const threshold = effectiveTileH / 2;
  const layerB: LayerBTileRoundTrip = {
    resolvedTile,
    tileAnchorBack,
    roundTripError,
    roundTripOk: roundTripError <= threshold,
    effectiveTileH,
  };

  // ── Layer C ──
  const rawRows = combatants.map((c) =>
    buildCombatantRow(
      c,
      c.id === playerId,
      spriteRects,
      playerTile,
      spellRange,
      helpers.hasLoS,
      helpers.gridToScreen,
      logical,
      hitPad,
    ),
  );
  const layerC = sortRowsByDelta(rawRows);

  // ── Layer D ──
  const layerD: LayerDStateOutcome = {
    selectedSpellId: selectedSpell?.id ?? null,
    spellRange,
    targetType: selectedSpell?.targetType ?? null,
    battleActionMode,
    currentTurnEntry,
    currentBattleAp,
    currentBattleMp,
    spellTilesSize,
    tileInSpellTiles,
    branchTaken,
    castResult,
    rejectReason,
  };

  // ── Invariants ──
  const invariants = evaluateInvariants(layerB, layerC, storePositions);
  logInvariantFailures(invariants);

  const record: ClickTraceRecord = {
    ts: input.ts,
    seq: _seq++,
    layerA,
    layerB,
    layerC,
    layerD,
    invariants,
  };

  // Push into ring buffer (oldest-first; drop oldest on overflow).
  _traceBuffer.push(record);
  if (_traceBuffer.length > CLICK_TRACE_CAP) {
    _traceBuffer = _traceBuffer.slice(-CLICK_TRACE_CAP);
  }

  return record;
}

/**
 * Compute a pointer-less geometry snapshot at export time. Builds the full
 * Layer-C table (deltaToClick = null on every row), the canvas/dpr/camera
 * env block, and the spriteRects summary ("rects this frame: N [ids]").
 *
 * Logs a `[GEOMETRY-INVARIANT]` finding when the spriteRects count is 0 or
 * when ids are missing — both indicate the renderer did not register rects
 * this frame, which would silently break click hit-testing.
 */
export function getGeometrySnapshot(
  input: GeometrySnapshotInput,
): GeometrySnapshot {
  const {
    ts,
    helpers,
    combatants,
    spriteRects,
    playerTile,
    playerId,
    spellRange,
    dpr,
    camera,
    canvasSizeLogical,
    canvasBacking,
  } = input;

  const rows = combatants.map((c) =>
    buildCombatantRow(
      c,
      c.id === playerId,
      spriteRects,
      playerTile,
      spellRange,
      helpers.hasLoS,
      helpers.gridToScreen,
      null, // no pointer at export time
      0, // hitPad unused when clickLogical is null
    ),
  );

  const ids: string[] = [];
  for (const id of spriteRects.keys()) ids.push(id);
  const count = spriteRects.size;

  if (count === 0) {
    logDebugWarn(
      "RENDER",
      "[GEOMETRY-INVARIANT] snapshot finding: rects this frame: 0 [] — spriteRectsRef empty at export time; click hit-testing would have nothing to test against",
    );
  } else if (ids.length === 0) {
    logDebugWarn(
      "RENDER",
      `[GEOMETRY-INVARIANT] snapshot finding: rects this frame: ${count} [] — spriteRects map has entries but no ids iterable`,
    );
  }

  return {
    ts,
    env: { dpr, camera, canvasSizeLogical, canvasBacking },
    combatantRows: rows,
    spriteRectsSummary: { count, ids },
  };
}
