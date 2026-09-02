/**
 * debugExport.ts — debug report assembly (build #329).
 *
 * Canonical location for the ENTIRE export-building code moved out of
 * ChatPanel.tsx: report assembly, PDF/txt generation, and state-dump
 * construction. ChatPanel imports buildDebugReportText / buildDebugReportHtml
 * from here instead of defining them inline.
 *
 * New in build #329:
 *   - APP_BUILD bumped from "#325" to "#329".
 *   - CLICK GEOMETRY TRACES section: renders every buffered click trace record
 *     as tables (Layer A key/value, Layer C full combatant table, invariants
 *     pass/fail list with measured numbers).
 *   - GEOMETRY SNAPSHOT section: ALWAYS included even when no clicks were
 *     recorded — full combatant geometry table (deltaToClick omitted),
 *     canvas/dpr/camera block, spriteRects count + ids.
 *
 * Imports click trace types and getters from ./clickTrace and the debug
 * logger from ./debugLogger (the new canonical locations). Does NOT import
 * from WorldExploration.tsx.
 *
 * Styling: matches the existing Ankama/Dofus-inspired carved-stone dark slate
 * + crimson accent palette used by the prior ChatPanel export (#1d2230 /
 * #13161f / #0f121a slate, #d8463f / #9a221e / #ff7a6e crimson, #8a8090 /
 * #ec8a85 muted text).
 */

import type { ClickTraceRecord, GeometrySnapshot } from "./clickTrace";
import type { DebugLogEntry } from "./debugLogger";

/**
 * App build/version constant for the export report. There is no version file
 * in the workspace, so the build number is sourced from this constant. Bump
 * it here when the build number changes.
 *
 * SECTION 4 (build #329): moved here from ChatPanel.tsx and bumped from
 * "#325" to "#329".
 */
export const APP_BUILD = "#335";

/**
 * Existing debug context fields threaded in from the parent
 * (GameFlow/WorldExploration). When a field is absent, the export report
 * degrades gracefully and reports "N/A". This keeps the prop contract
 * additive — existing callers are unaffected.
 *
 * SECTION 4 (build #325): originally defined inline in ChatPanel.tsx; moved
 * here in build #329 so the export module owns its own context shape.
 */
export interface DebugContext {
  characterName?: string;
  characterLevel?: number | bigint;
  characterSlot?: number;
  currentMapId?: string;
  inBattle?: boolean;
  battlePhase?: string;
  currentTurnEntry?: { id: string; side?: string; isSummon?: boolean } | null;
  combatants?: Array<{
    id: string;
    side?: string;
    isSummon?: boolean;
    hp?: number | bigint;
    pos?: { x: number; y: number };
  }>;
  turnOrderIds?: string[];
}

/**
 * Full export context that ChatPanel constructs from its props/state.
 *
 * Design: the ctx is an object of GETTERS so ChatPanel can pass live
 * references to the debug log buffer, click trace buffer, and geometry
 * snapshot without the export module needing to know how they are wired.
 * The getters are invoked at export time, so the snapshot reflects the
 * state at the moment the user clicks Export.
 *
 * Required getters:
 *   - getDebugLogBuffer: returns the current debug log ring buffer.
 *   - getClickTraceBuffer: returns the current click trace ring buffer
 *     (may be empty).
 *   - getGeometrySnapshot: returns the current geometry snapshot taken with
 *     the pointer-less state (i.e. a snapshot not tied to a specific click).
 *
 * All other fields are the existing DebugContext fields (character, map,
 * battle state). When a getter is absent or returns undefined, the
 * corresponding section degrades gracefully.
 */
export interface ExportContext extends DebugContext {
  /** Returns the current debug log ring buffer (full history). */
  getDebugLogBuffer?: () => readonly DebugLogEntry[];
  /** Returns the current click trace ring buffer (may be empty). */
  getClickTraceBuffer?: () => readonly ClickTraceRecord[];
  /**
   * Returns the current geometry snapshot taken with the pointer-less state.
   * Used for the ALWAYS-included GEOMETRY SNAPSHOT section.
   */
  getGeometrySnapshot?: () => GeometrySnapshot | undefined;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Shared formatting helpers                                              */
/* ─────────────────────────────────────────────────────────────────────── */

/** HTML-escape a string for safe injection into the report HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render a maybe-undefined value as a string, defaulting to "?". */
function str(v: unknown): string {
  if (v === undefined || v === null) return "?";
  if (
    typeof v === "number" ||
    typeof v === "string" ||
    typeof v === "boolean"
  ) {
    return String(v);
  }
  if (typeof v === "bigint") return v.toString();
  return JSON.stringify(v);
}

/** Format a {x,y} point as "(x,y)" or "(?,?)" when absent (null or undefined). */
function fmtPoint(p: { x: number; y: number } | null | undefined): string {
  if (!p) return "(?,?)";
  return `(${p.x},${p.y})`;
}

/** Format a {x,y} rect as "(x,y w×h)" or "(?,?)" when absent (null or undefined). */
function fmtRect(
  r: { x: number; y: number; w: number; h: number } | null | undefined,
): string {
  if (!r) return "(?,?)";
  return `(${r.x},${r.y} ${r.w}×${r.h})`;
}

/** Format a {dx,dy} delta as "(dx,dy)" or "(?,?)" when absent (null or undefined). */
function fmtDelta(d: { dx: number; dy: number } | null | undefined): string {
  if (!d) return "(?,?)";
  return `(${d.dx},${d.dy})`;
}

/**
 * Format a {dx,dy,dist} deltaToClick as "(dx,dy|dist)" or "(?,?)" when absent
 * (null or undefined — both occur in the clickTrace API: null in the snapshot,
 * undefined when the row had no spriteRect).
 */
function fmtDeltaToClick(
  d: { dx: number; dy: number; dist: number } | null | undefined,
): string {
  if (!d) return "(?,?)";
  return `(${d.dx},${d.dy}|${d.dist.toFixed(2)})`;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Click trace / geometry snapshot rendering (shared by txt + html)       */
/* ─────────────────────────────────────────────────────────────────────── */

/**
 * Layer A key/value rows for a single click trace record. Layer A is the
 * pointer/canvas/camera layer — the raw inputs that produced the click.
 */
interface LayerARow {
  key: string;
  value: string;
}

/** Extract Layer A key/value rows from a click trace record. */
function layerARows(rec: ClickTraceRecord): LayerARow[] {
  const a = rec.layerA;
  const rows: LayerARow[] = [];
  rows.push({ key: "clientX", value: str(a.clientX) });
  rows.push({ key: "clientY", value: str(a.clientY) });
  rows.push({
    key: "rect",
    value: `(${a.rect.left},${a.rect.top} ${a.rect.width}×${a.rect.height})`,
  });
  rows.push({ key: "cssOffset", value: fmtPoint(a.cssOffset) });
  rows.push({ key: "logical", value: fmtPoint(a.logical) });
  rows.push({ key: "backing", value: fmtPoint(a.backing) });
  rows.push({ key: "dpr", value: str(a.dpr) });
  rows.push({ key: "camera", value: fmtPoint(a.camera) });
  rows.push({
    key: "canvasSizeLogical",
    value: `(${a.canvasSizeLogical.w},${a.canvasSizeLogical.h})`,
  });
  rows.push({
    key: "canvasBacking",
    value: `(${a.canvasBacking.w},${a.canvasBacking.h})`,
  });
  rows.push({ key: "scaleFactor", value: str(a.scaleFactor) });
  return rows;
}

/**
 * Layer C combatant row. Layer C is the per-combatant geometry layer — one
 * row per combatant with the full geometry column set required by the spec.
 */
interface LayerCRow {
  id: string;
  kind: string;
  side: string;
  logicalTile: string;
  tileAnchor: string;
  spriteRect: string;
  drawAnchor: string;
  deltaToClick: string;
  pointerInRect: string;
  chebyshevFromPlayer: string;
  manhattanFromPlayer: string;
  inSpellRange: string;
  losClear: string;
  rectVsDrawDelta: string;
  rectVsTileDelta: string;
}

/** Build a Layer C combatant row from a click trace record's combatant. */
function layerCRow(c: ClickTraceRecord["layerC"][number]): LayerCRow {
  return {
    id: str(c.id),
    kind: str(c.kind),
    side: str(c.side),
    logicalTile: fmtPoint(c.logicalTile),
    tileAnchor: fmtPoint(c.tileAnchor),
    spriteRect: fmtRect(c.spriteRect),
    drawAnchor: fmtPoint(c.drawAnchor),
    deltaToClick: fmtDeltaToClick(c.deltaToClick),
    pointerInRect: str(c.pointerInRect),
    chebyshevFromPlayer: str(c.chebyshevFromPlayer),
    manhattanFromPlayer: str(c.manhattanFromPlayer),
    inSpellRange: str(c.inSpellRange),
    losClear: c.losClear === null ? "unknown" : str(c.losClear),
    rectVsDrawDelta: fmtDelta(c.rectVsDrawDelta),
    rectVsTileDelta: fmtDelta(c.rectVsTileDelta),
  };
}

/** Invariant pass/fail row with measured numbers. */
interface InvariantRow {
  id: string;
  name: string;
  pass: boolean | undefined;
  measured: string;
}

/**
 * Extract the four invariants (I1 round-trip, I2 rect-anchor, I3 space
 * near-miss, I4 entity-tile) from a click trace record with their measured
 * numbers.
 *
 * Field names are snake_case per the clickTrace.ts InvariantResults contract:
 *   i1_roundTrip {pass, roundTripError, threshold}
 *   i2_rectAnchor {pass, nearestId, dx, dy, mag, threshold}
 *   i3_spaceNearMiss {pass, nearestId, dx, dy, dist, halfSprite}
 *   i4_entityTile {pass, nearestId, rowTile, storeTile}
 *
 * There is no single `measured` field on the invariant objects; we compose a
 * human-readable measured string from the real sub-fields so the export row
 * shows the numbers that drove the pass/fail decision.
 */
function invariantRows(rec: ClickTraceRecord): InvariantRow[] {
  const inv = rec.invariants;
  const rows: InvariantRow[] = [];

  const i1 = inv.i1_roundTrip;
  rows.push({
    id: "I1",
    name: "round-trip",
    pass: i1.pass,
    measured: `err=${i1.roundTripError.toFixed(2)}px threshold=${i1.threshold.toFixed(2)}px`,
  });

  const i2 = inv.i2_rectAnchor;
  rows.push({
    id: "I2",
    name: "rect-anchor",
    pass: i2.pass,
    measured: `nearest=${i2.nearestId ?? "?"} dx=${i2.dx.toFixed(2)} dy=${i2.dy.toFixed(2)} mag=${i2.mag.toFixed(2)}px threshold=${i2.threshold}px`,
  });

  const i3 = inv.i3_spaceNearMiss;
  rows.push({
    id: "I3",
    name: "space-near-miss",
    pass: i3.pass,
    measured: `nearest=${i3.nearestId ?? "?"} dx=${i3.dx.toFixed(2)} dy=${i3.dy.toFixed(2)} dist=${i3.dist.toFixed(2)}px halfSprite=${i3.halfSprite.toFixed(2)}px`,
  });

  const i4 = inv.i4_entityTile;
  const rt = i4.rowTile ? `(${i4.rowTile.x},${i4.rowTile.y})` : "null";
  const st = i4.storeTile ? `(${i4.storeTile.x},${i4.storeTile.y})` : "null";
  rows.push({
    id: "I4",
    name: "entity-tile",
    pass: i4.pass,
    measured: `nearest=${i4.nearestId ?? "?"} rowTile=${rt} storeTile=${st}`,
  });

  return rows;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Plain-text report                                                     */
/* ─────────────────────────────────────────────────────────────────────── */

/**
 * Builds the plain-text export report body. Includes app build, timestamp,
 * character summary, current map, battle state summary, ALL buffered log
 * lines (full messages + timestamps), the CLICK GEOMETRY TRACES section
 * (one block per buffered click trace), and the ALWAYS-included GEOMETRY
 * SNAPSHOT section.
 *
 * Completeness beats beauty — every log line and every click trace is
 * included.
 */
export function buildDebugReportText(ctx: ExportContext | undefined): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push("=== AESTRALTO DEBUG REPORT ===");
  lines.push(`App build: ${APP_BUILD}`);
  lines.push(`Generated: ${now}`);
  lines.push("");
  lines.push("--- CHARACTER ---");
  lines.push(`Name:  ${ctx?.characterName ?? "N/A"}`);
  lines.push(
    `Level: ${ctx?.characterLevel != null ? String(ctx.characterLevel) : "N/A"}`,
  );
  lines.push(
    `Slot:  ${ctx?.characterSlot != null ? String(ctx.characterSlot) : "N/A"}`,
  );
  lines.push("");
  lines.push("--- CURRENT MAP ---");
  lines.push(`Map ID: ${ctx?.currentMapId ?? "N/A"}`);
  lines.push("");
  lines.push("--- BATTLE STATE ---");
  lines.push(
    `In battle: ${ctx?.inBattle != null ? String(ctx.inBattle) : "N/A"}`,
  );
  lines.push(`Phase: ${ctx?.battlePhase ?? "N/A"}`);
  const turn = ctx?.currentTurnEntry;
  lines.push(
    `Current turn: ${
      turn
        ? `id=${turn.id} side=${turn.side ?? "?"} isSummon=${turn.isSummon ?? false}`
        : "N/A"
    }`,
  );
  const combatants = ctx?.combatants ?? [];
  lines.push(`Combatants (${combatants.length}):`);
  if (combatants.length === 0) {
    lines.push("  (none reported)");
  } else {
    for (const c of combatants) {
      const pos = c.pos ? `(${c.pos.x},${c.pos.y})` : "(?,?)";
      lines.push(
        `  id=${c.id} side=${c.side ?? "?"} isSummon=${c.isSummon ?? false} hp=${
          c.hp != null ? String(c.hp) : "?"
        } pos=${pos}`,
      );
    }
  }
  const turnIds = ctx?.turnOrderIds ?? [];
  lines.push(
    `Turn order ids (${turnIds.length}): ${turnIds.join(", ") || "(none)"}`,
  );
  lines.push("");

  // Debug log buffer
  const buffer = ctx?.getDebugLogBuffer?.() ?? [];
  lines.push("--- DEBUG LOG BUFFER (ALL CATEGORIES) ---");
  lines.push(`Total entries: ${buffer.length}`);
  lines.push("");
  for (const e of buffer) {
    const d = new Date(e.ts);
    const ts = d.toISOString();
    const dataStr =
      e.data !== undefined ? ` data=${JSON.stringify(e.data)}` : "";
    lines.push(
      `[${ts}] [${e.category}] ${e.level.toUpperCase()}: ${e.message}${dataStr}`,
    );
  }
  lines.push("");

  // CLICK GEOMETRY TRACES — one block per buffered click trace record.
  const clickBuffer = ctx?.getClickTraceBuffer?.() ?? [];
  lines.push("--- CLICK GEOMETRY TRACES ---");
  lines.push(`Total click traces: ${clickBuffer.length}`);
  lines.push("");
  if (clickBuffer.length === 0) {
    lines.push("  (none recorded)");
    lines.push("");
  } else {
    for (let i = 0; i < clickBuffer.length; i++) {
      const rec = clickBuffer[i];
      lines.push(`  [trace ${i}] ts=${new Date(rec.ts).toISOString()}`);
      // Layer A
      lines.push("  Layer A (pointer/canvas/camera):");
      for (const row of layerARows(rec)) {
        lines.push(`    ${row.key.padEnd(18)} = ${row.value}`);
      }
      // Layer C — full combatant table
      const layerC = rec.layerC ?? [];
      lines.push(`  Layer C combatants (${layerC.length}):`);
      if (layerC.length === 0) {
        lines.push("    (none)");
      } else {
        for (const c of layerC) {
          const r = layerCRow(c);
          lines.push(
            `    id=${r.id} kind=${r.kind} side=${r.side} logicalTile=${r.logicalTile}`,
          );
          lines.push(
            `      tileAnchor=${r.tileAnchor} spriteRect=${r.spriteRect} drawAnchor=${r.drawAnchor}`,
          );
          lines.push(
            `      deltaToClick=${r.deltaToClick} pointerInRect=${r.pointerInRect}`,
          );
          lines.push(
            `      chebyshev=${r.chebyshevFromPlayer} manhattan=${r.manhattanFromPlayer} inSpellRange=${r.inSpellRange} losClear=${r.losClear}`,
          );
          lines.push(
            `      rectVsDrawDelta=${r.rectVsDrawDelta} rectVsTileDelta=${r.rectVsTileDelta}`,
          );
        }
      }
      // Invariants
      lines.push("  Invariants:");
      for (const inv of invariantRows(rec)) {
        const passStr =
          inv.pass === undefined ? "UNKNOWN" : inv.pass ? "PASS" : "FAIL";
        lines.push(
          `    ${inv.id} ${inv.name}: ${passStr} (measured: ${inv.measured})`,
        );
      }
      lines.push("");
    }
  }

  // GEOMETRY SNAPSHOT — ALWAYS included, even when no clicks were recorded.
  appendGeometrySnapshotText(lines, ctx?.getGeometrySnapshot?.());

  lines.push("=== END REPORT ===");
  return lines.join("\n");
}

/**
 * Append the GEOMETRY SNAPSHOT section to the plain-text report. Always
 * included: full combatant geometry table (deltaToClick omitted),
 * canvas/dpr/camera block, spriteRects count + ids.
 *
 * GeometrySnapshot shape (per clickTrace.ts):
 *   env {dpr, camera, canvasSizeLogical {w,h}, canvasBacking {w,h}}
 *   combatantRows: CombatantGeometryRow[]
 *   spriteRectsSummary {count, ids}
 */
function appendGeometrySnapshotText(
  lines: string[],
  snap: GeometrySnapshot | undefined,
): void {
  lines.push("--- GEOMETRY SNAPSHOT ---");
  if (!snap) {
    lines.push("  (snapshot unavailable)");
    lines.push("");
    return;
  }
  // Canvas / dpr / camera block (env).
  const env = snap.env;
  lines.push("  Canvas / DPR / Camera:");
  lines.push(
    `    canvasSizeLogical = (${env.canvasSizeLogical.w},${env.canvasSizeLogical.h})`,
  );
  lines.push(
    `    canvasBacking     = (${env.canvasBacking.w},${env.canvasBacking.h})`,
  );
  lines.push(`    dpr              = ${str(env.dpr)}`);
  lines.push(`    camera           = ${fmtPoint(env.camera)}`);
  lines.push("");

  // Full combatant geometry table (deltaToClick omitted — no click anchor).
  const combatants = snap.combatantRows;
  lines.push(`  Combatant geometry (${combatants.length}):`);
  if (combatants.length === 0) {
    lines.push("    (none)");
  } else {
    for (const c of combatants) {
      lines.push(
        `    id=${str(c.id)} kind=${str(c.kind)} side=${str(c.side)} logicalTile=${fmtPoint(c.logicalTile)}`,
      );
      lines.push(
        `      tileAnchor=${fmtPoint(c.tileAnchor)} spriteRect=${fmtRect(c.spriteRect)} drawAnchor=${fmtPoint(c.drawAnchor)}`,
      );
      lines.push(
        `      chebyshev=${str(c.chebyshevFromPlayer)} manhattan=${str(c.manhattanFromPlayer)} inSpellRange=${str(c.inSpellRange)} losClear=${c.losClear === null ? "unknown" : str(c.losClear)}`,
      );
      lines.push(
        `      rectVsDrawDelta=${fmtDelta(c.rectVsDrawDelta)} rectVsTileDelta=${fmtDelta(c.rectVsTileDelta)}`,
      );
    }
  }
  lines.push("");

  // spriteRects count + ids.
  const summary = snap.spriteRectsSummary;
  lines.push(
    `  rects this frame: ${summary.count} [${summary.ids.join(", ") || "(none)"}]`,
  );
  lines.push("");
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Styled HTML report (print → PDF)                                      */
/* ─────────────────────────────────────────────────────────────────────── */

/**
 * Carved-stone dark slate + crimson accent stylesheet for the print-optimized
 * HTML export. Matches the existing ChatPanel export aesthetic and extends
 * it to the new CLICK GEOMETRY TRACES and GEOMETRY SNAPSHOT sections.
 *
 * Palette:
 *   - Slate backgrounds: #1d2230 / #13161f / #0f121a
 *   - Crimson accents:   #d8463f / #9a221e / #ff7a6e
 *   - Muted text:       #8a8090 / #ec8a85
 */
const REPORT_CSS = `
  body { font-family: 'Courier New', monospace; color: #e8e6ef; background: #0f121a; margin: 24px; font-size: 11px; }
  h1 { font-size: 16px; border-bottom: 2px solid #d8463f; padding-bottom: 6px; color: #ec8a85; letter-spacing: 0.08em; text-transform: uppercase; }
  h2 { font-size: 13px; color: #ec8a85; margin-top: 18px; border-bottom: 1px solid rgba(216,70,63,0.3); padding-bottom: 3px; letter-spacing: 0.06em; text-transform: uppercase; }
  h3 { font-size: 11px; color: #ff7a6e; margin-top: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
  table { border-collapse: collapse; width: 100%; margin-top: 6px; background: #13161f; }
  th, td { border: 1px solid #3a2a2a; padding: 3px 6px; text-align: left; vertical-align: top; font-size: 10px; color: #e8e6ef; }
  th { background: #2c1820; font-weight: 700; color: #ec8a85; letter-spacing: 0.04em; }
  tr:nth-child(even) td { background: #161922; }
  pre { margin: 2px 0 0 0; white-space: pre-wrap; word-break: break-all; font-size: 9px; color: #8a8090; }
  .meta { color: #8a8090; font-size: 10px; margin-bottom: 4px; }
  .pass { color: #6ee7b7; font-weight: 700; }
  .fail { color: #ef4444; font-weight: 700; }
  .unknown { color: #f59e0b; font-weight: 700; }
  .trace-block { border: 1px solid #3a2a2a; border-radius: 6px; padding: 8px; margin-top: 8px; background: #13161f; }
  .trace-head { color: #ff7a6e; font-weight: 700; font-size: 11px; margin-bottom: 4px; letter-spacing: 0.04em; }
  .kv td:first-child { color: #8a8090; width: 160px; }
  @media print { body { margin: 12px; background: #fff; color: #1a1a1a; } table { background: #fff; } th { background: #f0e0e0; color: #8b1a1a; } td { color: #1a1a1a; } tr:nth-child(even) td { background: #f7f7f7; } .pass { color: #06764a; } .fail { color: #b91c1c; } .unknown { color: #b45309; } }
`;

/**
 * Builds the styled HTML document for the print-optimized PDF export window.
 * Same content as the .txt report but rendered as a print-friendly HTML page,
 * plus the new CLICK GEOMETRY TRACES and GEOMETRY SNAPSHOT sections.
 */
export function buildDebugReportHtml(ctx: ExportContext | undefined): string {
  const now = new Date().toISOString();
  const combatantRows = (ctx?.combatants ?? [])
    .map(
      (c) =>
        `<tr><td>${esc(c.id)}</td><td>${esc(c.side ?? "?")}</td><td>${c.isSummon ?? false}</td><td>${c.hp != null ? esc(String(c.hp)) : "?"}</td><td>${c.pos ? `(${c.pos.x},${c.pos.y})` : "(?,?)"}</td></tr>`,
    )
    .join("");

  const buffer = ctx?.getDebugLogBuffer?.() ?? [];
  const logRows = buffer
    .map(
      (e) =>
        `<tr><td>${esc(new Date(e.ts).toISOString())}</td><td>${esc(e.category)}</td><td>${esc(e.level.toUpperCase())}</td><td>${esc(e.message)}${e.data !== undefined ? ` <pre>${esc(JSON.stringify(e.data))}</pre>` : ""}</td></tr>`,
    )
    .join("");

  const turnIds = (ctx?.turnOrderIds ?? []).join(", ") || "(none)";
  const turn = ctx?.currentTurnEntry;

  // CLICK GEOMETRY TRACES section HTML.
  const clickBuffer = ctx?.getClickTraceBuffer?.() ?? [];
  const clickTracesHtml =
    clickBuffer.length === 0
      ? '<div class="meta">(none recorded)</div>'
      : clickBuffer.map((rec, i) => renderClickTraceHtml(rec, i)).join("");

  // GEOMETRY SNAPSHOT section HTML — always included.
  const geometrySnapshotHtml = renderGeometrySnapshotHtml(
    ctx?.getGeometrySnapshot?.(),
  );

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Aestralto Debug Report ${APP_BUILD}</title>
<style>${REPORT_CSS}</style></head><body>
<h1>Aestralto Debug Report</h1>
<div class="meta">App build: ${APP_BUILD}</div>
<div class="meta">Generated: ${now}</div>
<h2>Character</h2>
<table><tr><th>Name</th><th>Level</th><th>Slot</th></tr>
<tr><td>${esc(ctx?.characterName ?? "N/A")}</td><td>${ctx?.characterLevel != null ? esc(String(ctx.characterLevel)) : "N/A"}</td><td>${ctx?.characterSlot != null ? esc(String(ctx.characterSlot)) : "N/A"}</td></tr></table>
<h2>Current Map</h2>
<div>Map ID: ${esc(ctx?.currentMapId ?? "N/A")}</div>
<h2>Battle State</h2>
<table>
<tr><th>In battle</th><th>Phase</th><th>Current turn</th></tr>
<tr><td>${ctx?.inBattle != null ? String(ctx.inBattle) : "N/A"}</td><td>${esc(ctx?.battlePhase ?? "N/A")}</td><td>${
    turn
      ? `id=${esc(turn.id)} side=${esc(turn.side ?? "?")} isSummon=${turn.isSummon ?? false}`
      : "N/A"
  }</td></tr>
</table>
<h3>Combatants (${(ctx?.combatants ?? []).length})</h3>
<table><tr><th>id</th><th>side</th><th>isSummon</th><th>hp</th><th>pos</th></tr>${combatantRows || '<tr><td colspan="5">(none reported)</td></tr>'}</table>
<h3>Turn order ids</h3>
<div>${esc(turnIds)}</div>
<h2>Debug Log Buffer (ALL categories, ${buffer.length} entries)</h2>
<table><tr><th>Timestamp</th><th>Category</th><th>Level</th><th>Message</th></tr>${logRows || '<tr><td colspan="4">(empty)</td></tr>'}</table>
<h2>Click Geometry Traces (${clickBuffer.length})</h2>
${clickTracesHtml}
<h2>Geometry Snapshot</h2>
${geometrySnapshotHtml}
</body></html>`;
}

/**
 * Render a single click trace record as HTML: Layer A key/value table, Layer C
 * full combatant table, and invariants pass/fail list.
 */
function renderClickTraceHtml(rec: ClickTraceRecord, index: number): string {
  // Layer A — two-column key/value table.
  const aRows = layerARows(rec)
    .map(
      (r) =>
        `<tr class="kv"><td>${esc(r.key)}</td><td>${esc(r.value)}</td></tr>`,
    )
    .join("");

  // Layer C — full combatant table (one row per combatant).
  const layerC = rec.layerC ?? [];
  const cRows =
    layerC.length === 0
      ? '<tr><td colspan="15">(none)</td></tr>'
      : layerC
          .map((c) => {
            const r = layerCRow(c);
            return `<tr><td>${esc(r.id)}</td><td>${esc(r.kind)}</td><td>${esc(r.side)}</td><td>${esc(r.logicalTile)}</td><td>${esc(r.tileAnchor)}</td><td>${esc(r.spriteRect)}</td><td>${esc(r.drawAnchor)}</td><td>${esc(r.deltaToClick)}</td><td>${esc(r.pointerInRect)}</td><td>${esc(r.chebyshevFromPlayer)}</td><td>${esc(r.manhattanFromPlayer)}</td><td>${esc(r.inSpellRange)}</td><td>${esc(r.losClear)}</td><td>${esc(r.rectVsDrawDelta)}</td><td>${esc(r.rectVsTileDelta)}</td></tr>`;
          })
          .join("");

  // Invariants — pass/fail list with measured numbers.
  const invRows = invariantRows(rec)
    .map((inv) => {
      const cls =
        inv.pass === undefined ? "unknown" : inv.pass ? "pass" : "fail";
      const label =
        inv.pass === undefined ? "UNKNOWN" : inv.pass ? "PASS" : "FAIL";
      return `<tr><td>${esc(inv.id)}</td><td>${esc(inv.name)}</td><td class="${cls}">${label}</td><td>${esc(inv.measured)}</td></tr>`;
    })
    .join("");

  return `<div class="trace-block">
<div class="trace-head">[trace ${index}] ts=${esc(new Date(rec.ts).toISOString())}</div>
<h3>Layer A — pointer / canvas / camera</h3>
<table><tr><th>key</th><th>value</th></tr>${aRows}</table>
<h3>Layer C — combatants (${layerC.length})</h3>
<table><tr><th>id</th><th>kind</th><th>side</th><th>logicalTile</th><th>tileAnchor</th><th>spriteRect</th><th>drawAnchor</th><th>deltaToClick</th><th>pointerInRect</th><th>chebyshev</th><th>manhattan</th><th>inSpellRange</th><th>losClear</th><th>rectVsDrawDelta</th><th>rectVsTileDelta</th></tr>${cRows}</table>
<h3>Invariants</h3>
<table><tr><th>id</th><th>name</th><th>result</th><th>measured</th></tr>${invRows}</table>
</div>`;
}

/**
 * Render the ALWAYS-included GEOMETRY SNAPSHOT section as HTML: full
 * combatant geometry table (deltaToClick omitted), canvas/dpr/camera block,
 * and spriteRects count + ids.
 *
 * GeometrySnapshot shape (per clickTrace.ts):
 *   env {dpr, camera, canvasSizeLogical {w,h}, canvasBacking {w,h}}
 *   combatantRows: CombatantGeometryRow[]
 *   spriteRectsSummary {count, ids}
 */
function renderGeometrySnapshotHtml(
  snap: GeometrySnapshot | undefined,
): string {
  if (!snap) {
    return '<div class="meta">(snapshot unavailable)</div>';
  }

  // Canvas / dpr / camera block (env).
  const env = snap.env;
  const canvasRows = [
    [
      "canvasSizeLogical",
      `(${env.canvasSizeLogical.w},${env.canvasSizeLogical.h})`,
    ],
    ["canvasBacking", `(${env.canvasBacking.w},${env.canvasBacking.h})`],
    ["dpr", str(env.dpr)],
    ["camera", fmtPoint(env.camera)],
  ]
    .map(([k, v]) => `<tr class="kv"><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("");

  // Full combatant geometry table (deltaToClick omitted — no click anchor).
  const combatants = snap.combatantRows;
  const cRows =
    combatants.length === 0
      ? '<tr><td colspan="13">(none)</td></tr>'
      : combatants
          .map((c) => {
            const losClear = c.losClear === null ? "unknown" : str(c.losClear);
            return `<tr><td>${esc(str(c.id))}</td><td>${esc(str(c.kind))}</td><td>${esc(str(c.side))}</td><td>${esc(fmtPoint(c.logicalTile))}</td><td>${esc(fmtPoint(c.tileAnchor))}</td><td>${esc(fmtRect(c.spriteRect))}</td><td>${esc(fmtPoint(c.drawAnchor))}</td><td>${esc(str(c.chebyshevFromPlayer))}</td><td>${esc(str(c.manhattanFromPlayer))}</td><td>${esc(str(c.inSpellRange))}</td><td>${esc(losClear)}</td><td>${esc(fmtDelta(c.rectVsDrawDelta))}</td><td>${esc(fmtDelta(c.rectVsTileDelta))}</td></tr>`;
          })
          .join("");

  const summary = snap.spriteRectsSummary;

  return `<h3>Canvas / DPR / Camera</h3>
<table><tr><th>key</th><th>value</th></tr>${canvasRows}</table>
<h3>Combatant geometry (${combatants.length})</h3>
<table><tr><th>id</th><th>kind</th><th>side</th><th>logicalTile</th><th>tileAnchor</th><th>spriteRect</th><th>drawAnchor</th><th>chebyshev</th><th>manhattan</th><th>inSpellRange</th><th>losClear</th><th>rectVsDrawDelta</th><th>rectVsTileDelta</th></tr>${cRows}</table>
<h3>Sprite rects this frame</h3>
<div class="meta">rects this frame: ${summary.count} [${esc(summary.ids.join(", ") || "(none)")}]</div>`;
}
