/**
 * pieceArt.ts — single source of truth for pixel-art creature patterns.
 *
 * - Re-exports ChessPieceType from ../types/gameTypes so callers can keep
 *   importing the canonical type.
 * - Defines CreatureKey (the 6 chess pieces + the 5 summon pieceTypes).
 * - Holds chessPiecePatterns (byte-identical to the former inline copies in
 *   WorldExploration.tsx and CharacterCreation.tsx).
 * - Holds creaturePatterns for the 5 summon creatures (wolf/golem/archer/
 *   bomber/wisp). Each creature has 4 GENUINELY DIFFERENT directions —
 *   front/left/right/back are not copy-pasted.
 * - Holds creaturePalettes, OWNER_TINT constants, and the
 *   getCreaturePattern(key, direction) + spawnPixelPuff(ctx, x, y, size)
 *   helpers used by the renderer.
 *
 * Pattern cell values: 0 = transparent, 1 = secondary color, 2 = primary
 * color, 3 = accent color (used by summon creatures).
 */

import type { ChessPieceType } from "../types/gameTypes";
import { logDebugError } from "../utils/debugLogger";

// Re-export so existing call sites can import ChessPieceType from here.
export type { ChessPieceType };

/**
 * Throttle for the pattern-lookup-failed log. The renderer can fire this log
 * per draw call per frame, which floods the debug buffer when a pieceType/view
 * combination has no art. Instead of logging every frame, we track an
 * occurrence counter per unique `${pieceType}|${view}` key and only emit:
 *   - once on the FIRST occurrence (counter === 1) with the full message
 *   - periodically thereafter (every PERIODIC_THRESHOLD occurrences) with the
 *     cumulative count, e.g. "pattern lookup failed (x412): {…}"
 * The log ALWAYS includes the actual pieceType and view values. Fallback
 * drawing behavior is unchanged — only the log is throttled.
 */
const PATTERN_LOOKUP_FAIL_PERIODIC = 500;
const _patternLookupFailCounts = new Map<string, number>();

function logPatternLookupFailed(pieceType: unknown, view: unknown): void {
  const key = `${String(pieceType)}|${String(view)}`;
  const next = (_patternLookupFailCounts.get(key) ?? 0) + 1;
  _patternLookupFailCounts.set(key, next);
  if (next === 1) {
    logDebugError("SUMMON", "pattern lookup failed", {
      pieceType,
      view,
    });
  } else if (next % PATTERN_LOOKUP_FAIL_PERIODIC === 0) {
    logDebugError("SUMMON", `pattern lookup failed (x${next})`, {
      pieceType,
      view,
    });
  }
}

/** The four facing directions a creature can be drawn in. */
export type ViewDirection = "front" | "back" | "left" | "right";

/**
 * Every key the renderer may look up by pieceType string. The 6 chess pieces
 * plus the 5 summon pieceTypes (wolf/golem/archer/bomber/wisp) used by
 * spellData.ts SummonUnitDef.pieceType.
 */
export type CreatureKey =
  | ChessPieceType
  | "wolf"
  | "golem"
  | "archer"
  | "bomber"
  | "wisp";

/** Shape of a single creature's 4-direction pattern set. */
export interface ChessPieceData {
  front: number[][];
  back: number[][];
  left: number[][];
  right: number[][];
}

// ── Chess piece patterns (byte-identical to the former inline copies) ──────────
// These are kept verbatim so existing rendering behavior is unchanged.
export const chessPiecePatterns: Record<ChessPieceType, ChessPieceData> = {
  king: {
    front: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  queen: {
    front: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  pawn: {
    front: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  rook: {
    front: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  bishop: {
    front: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  knight: {
    front: [
      [0, 0, 1, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [1, 2, 2, 1, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 0, 1, 2, 1, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 1, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 1, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [1, 2, 2, 1, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 1, 2, 1, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 1, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
};

// ── Summon creature patterns (5 creatures, 4 GENUINELY DIFFERENT directions) ────
// Each creature's front/left/right/back are hand-drawn to differ — no
// copy-pasting. Cell value 3 = accent color (eyes/trim/glow).
export const creaturePatterns: Record<
  Exclude<CreatureKey, ChessPieceType>,
  ChessPieceData
> = {
  // WOLF — quadruped predator. Front: snarling face. Back: raised tail.
  // Left: head turned left with body profile. Right: mirror of left.
  wolf: {
    front: [
      [0, 0, 0, 3, 3, 0, 0, 0],
      [0, 2, 1, 2, 2, 1, 2, 0],
      [0, 2, 3, 2, 2, 3, 2, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 0, 2, 2, 0, 1, 2],
    ],
    back: [
      [0, 0, 0, 2, 2, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [3, 2, 0, 2, 2, 0, 2, 3],
    ],
    left: [
      [0, 0, 0, 3, 2, 1, 0, 0],
      [0, 0, 2, 2, 2, 1, 1, 0],
      [0, 1, 2, 3, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 0, 2, 2, 0, 0, 0],
    ],
    right: [
      [0, 0, 1, 2, 3, 0, 0, 0],
      [0, 1, 1, 2, 2, 2, 0, 0],
      [0, 1, 2, 2, 3, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [0, 0, 0, 2, 2, 0, 1, 2],
    ],
  },
  // GOLEM — hulking stone sentinel. Front: broad chest with crystal core.
  // Back: cracked stone slabs. Left: shoulder spike + side profile.
  // Right: opposite shoulder spike.
  golem: {
    front: [
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 3, 3, 3, 2, 1],
      [1, 2, 3, 2, 2, 3, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 1, 1, 1, 1, 2, 2],
    ],
    back: [
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 1, 1, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 1, 1, 1, 1, 2, 2],
    ],
    left: [
      [0, 0, 1, 1, 1, 1, 1, 0],
      [0, 3, 2, 2, 2, 2, 2, 1],
      [3, 2, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [0, 2, 2, 2, 2, 2, 2, 2],
      [0, 2, 1, 1, 1, 1, 2, 2],
    ],
    right: [
      [0, 1, 1, 1, 1, 1, 0, 0],
      [1, 2, 2, 2, 2, 2, 3, 0],
      [1, 2, 2, 2, 2, 2, 2, 3],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 0],
      [2, 2, 1, 1, 1, 1, 2, 0],
    ],
  },
  // ARCHER — ranged marksman. Front: drawn bow facing viewer.
  // Back: quiver of arrows. Left: bow arm extended left.
  // Right: bow arm extended right.
  archer: {
    front: [
      [0, 0, 1, 3, 3, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [3, 1, 2, 2, 2, 2, 1, 3],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 2, 2, 2, 2, 2, 2, 0],
      [0, 2, 0, 2, 2, 0, 2, 0],
    ],
    back: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 3, 3, 2, 1, 0],
      [0, 1, 2, 3, 3, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 2, 2, 2, 2, 2, 2, 0],
      [0, 2, 0, 2, 2, 0, 2, 0],
    ],
    left: [
      [0, 0, 1, 3, 1, 0, 0, 0],
      [0, 1, 2, 1, 2, 1, 0, 0],
      [3, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [0, 2, 2, 2, 2, 2, 0, 0],
      [0, 2, 0, 2, 2, 0, 0, 0],
    ],
    right: [
      [0, 0, 0, 1, 3, 1, 0, 0],
      [0, 0, 1, 2, 1, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 3],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 0, 2, 2, 2, 2, 2, 0],
      [0, 0, 0, 2, 2, 0, 2, 0],
    ],
  },
  // BOMBER — volatile pyromaniac. Front: lit fuse + round bomb body.
  // Back: smoldering fuse. Left: fuse trailing left.
  // Right: fuse trailing right.
  bomber: {
    front: [
      [0, 0, 0, 3, 3, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 3, 3, 2, 2, 1],
      [1, 2, 2, 3, 3, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 3, 1, 1, 3, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [3, 0, 0, 1, 1, 0, 0, 0],
      [1, 0, 0, 1, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [0, 2, 2, 2, 2, 2, 2, 2],
      [0, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 1, 1, 0, 0, 3],
      [0, 0, 0, 1, 1, 0, 0, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 2, 0],
      [2, 2, 2, 2, 2, 2, 2, 0],
    ],
  },
  // WISP — floating spirit orb. Front: bright core with two eyes.
  // Back: dim trailing wisps. Left: orb tilted left with trailing tail.
  // Right: orb tilted right with trailing tail.
  wisp: {
    front: [
      [0, 0, 1, 3, 3, 1, 0, 0],
      [0, 1, 3, 2, 2, 3, 1, 0],
      [0, 1, 3, 3, 3, 3, 1, 0],
      [0, 1, 2, 3, 3, 2, 1, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    back: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    left: [
      [0, 0, 0, 1, 3, 1, 0, 0],
      [0, 0, 1, 3, 2, 3, 1, 0],
      [0, 1, 2, 3, 3, 2, 1, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    right: [
      [0, 0, 1, 3, 1, 0, 0, 0],
      [0, 1, 3, 2, 3, 1, 0, 0],
      [0, 1, 2, 3, 3, 2, 1, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
};

// ── Summon creature palettes ───────────────────────────────────────────────────
// Each creature's [primary, secondary, accent] colors. Index 0 = primary
// (cell value 2), index 1 = secondary (cell value 1), index 2 = accent
// (cell value 3).
export const creaturePalettes: Record<
  Exclude<CreatureKey, ChessPieceType>,
  { primary: string; secondary: string; accent: string }
> = {
  // WOLF — steel-blue body, amber eyes (accent = eyes/trim).
  wolf: { primary: "#4a6a8a", secondary: "#2f4458", accent: "#ffb347" },
  // GOLEM — stone-gray body, gold crystal core (accent = core).
  golem: { primary: "#8a8a86", secondary: "#56564f", accent: "#ffd24a" },
  // ARCHER — forest-green body, brown bow (accent = bow/trim).
  archer: { primary: "#2f6b3f", secondary: "#1c4527", accent: "#7a4a22" },
  // BOMBER — charcoal body, orange fuse glow (accent = fuse).
  bomber: { primary: "#3a3a3e", secondary: "#1f1f22", accent: "#ff7a1a" },
  // WISP — cyan-white glow (primary = cyan body, accent = white core).
  wisp: { primary: "#5fd8e8", secondary: "#2a8fa8", accent: "#f0fbff" },
};

// ── Chess-piece palettes ───────────────────────────────────────────────────────
// Distinct carved-stone / dark-slate + crimson-accent palette per chess piece so
// normal chess-piece enemies render DISTINCTLY per pieceType instead of all
// collapsing to the gray king fallback. Each entry: primary = body stone,
// secondary = deep shadow, accent = trim/glow. Index 0 = primary (cell value 2),
// index 1 = secondary (cell value 1), index 2 = accent (cell value 3).
export const chessPiecePalettes: Record<
  ChessPieceType,
  { primary: string; secondary: string; accent: string }
> = {
  // KING — deep crimson stone body, gold crown/trim.
  king: { primary: "#7a1f2b", secondary: "#3d0f16", accent: "#d4a017" },
  // QUEEN — royal violet body, silver filigree.
  queen: { primary: "#5a3a7a", secondary: "#2e1d44", accent: "#c8c2d6" },
  // ROOK — cold stone-gray body, iron banding.
  rook: { primary: "#6b6b66", secondary: "#3a3a36", accent: "#8a8a82" },
  // BISHOP — dark teal stone, bronze mitre.
  bishop: { primary: "#1f5a5a", secondary: "#103535", accent: "#b8732a" },
  // KNIGHT — dark amber stone, steel blade.
  knight: { primary: "#7a4a1f", secondary: "#3d2410", accent: "#9aa0a8" },
  // PAWN — muted slate body, copper base.
  pawn: { primary: "#4a4a52", secondary: "#2a2a30", accent: "#a8651f" },
};

// ── Owner tint constants ───────────────────────────────────────────────────────
// Player-side summons get a green tint; enemy-side summons get a red tint.
// Applied as a translucent overlay by the renderer.
export const OWNER_TINT = {
  player: "rgba(80, 220, 120, 0.18)",
  enemy: "rgba(220, 70, 70, 0.18)",
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Look up a creature's pixel pattern for the given direction. Dispatches to
 * chessPiecePatterns for the 6 chess pieces and creaturePatterns for the 5
 * summon creatures. Returns the king front pattern as a safe fallback so the
 * renderer never receives undefined.
 */
export function getCreaturePattern(
  key: CreatureKey,
  direction: ViewDirection | undefined,
): number[][] {
  // Harden against undefined/null direction — fall back to "front" so the
  // renderer never indexes a pattern map with an undefined key.
  const dir: ViewDirection =
    direction === undefined || direction === null ? "front" : direction;
  if (key in chessPiecePatterns) {
    return chessPiecePatterns[key as ChessPieceType][dir];
  }
  if (key in creaturePatterns) {
    return creaturePatterns[key as Exclude<CreatureKey, ChessPieceType>][dir];
  }
  return chessPiecePatterns.king.front;
}

// ── Unified combatant draw dispatch ───────────────────────────────────────────

/**
 * Color triple passed to a drawPattern callback. Mirrors the shape that
 * WorldExploration.tsx's drawPixelPattern expects ({primary, secondary,
 * accent, extra?}) so a caller can hand its own drawPixelPattern straight
 * through.
 */
export interface PatternColors {
  primary: string;
  secondary: string;
  accent: string;
  extra?: string;
}

/**
 * Result of resolving a combatant's pixel art: the pattern grid plus the
 * color triple the renderer should paint it with. Matches the return shape of
 * getBossPixelPattern in WorldExploration.tsx so the same drawPixelPattern
 * call site works for every branch.
 */
export interface PatternResult {
  pattern: number[][];
  colors: PatternColors;
}

/**
 * A combatant entity that drawCombatant can render. Fields are deliberately a
 * structural subset of the enemy/summon objects in WorldExploration.tsx so the
 * dispatch does not import WX types — callers pass whatever combatant they
 * have and only the listed fields are read.
 */
export interface CombatantEntity {
  isBoss?: boolean;
  bossId?: string;
  isSummon?: boolean;
  side?: "player" | "enemy";
  pieceType: CreatureKey | string;
  currentView?: ViewDirection;
  family?: string;
  assignedName?: string;
  isBossMinion?: boolean;
  scaleX?: number;
  scaleY?: number;
}

/**
 * Optional resolvers/injection so drawCombatant does not hard-depend on
 * WorldExploration.tsx internals (getBossPixelPattern,
 * getEnemyFamilyPixelPattern, getEnemyFamilyColors, drawPixelPattern,
 * CHARACTER_Y_OFFSET). Callers wire their own implementations in; the
 * dispatch falls back to getCreaturePattern + a minimal inline pixel renderer
 * when a resolver is omitted.
 */
export interface DrawCombatantOptions {
  /** Resolve a boss pattern by bossId. Falls back to getCreaturePattern. */
  getBossPattern?: (bossId: string) => PatternResult;
  /**
   * Resolve a family pattern by family key. Returns the pattern grid only;
   * colors come from getFamilyColors. Falls back to getCreaturePattern.
   */
  getFamilyPattern?: (family: string) => number[][];
  /** Resolve a family's color map (cell value → hex). */
  getFamilyColors?: (family: string) => Record<number, string>;
  /**
   * The renderer that paints a pattern grid onto the canvas. If omitted,
   * drawCombatant uses a minimal inline pixel renderer that mirrors WX's
   * centering math (3px cells, Math.round centering) so the function is
   * usable standalone.
   */
  drawPattern?: (
    ctx: CanvasRenderingContext2D,
    pattern: number[][],
    x: number,
    y: number,
    colors: PatternColors,
    scale: { x: number; y: number },
  ) => void;
  /**
   * Vertical offset applied to screenPos.y before drawing, mirroring
   * CHARACTER_Y_OFFSET in gameConstants.ts (-9). Defaults to 0 so the
   * dispatch is self-contained; WX passes its own value.
   */
  characterYOffset?: number;
}

/**
 * Minimal inline pixel renderer used when no drawPattern callback is supplied.
 * Mirrors WorldExploration.tsx drawPixelPattern's centering math (3px cells,
 * Math.round centering) and cell-value → color mapping (1→secondary, 2→accent,
 * 3→extra) so standalone callers get the same visual footprint. Does NOT call
 * ctx.save()/ctx.restore() — the caller owns canvas state.
 */
function drawPatternInline(
  ctx: CanvasRenderingContext2D,
  pattern: number[][],
  x: number,
  y: number,
  colors: PatternColors,
  scale: { x: number; y: number },
): void {
  const pixelSize = 3;
  const patternWidth = pattern[0].length * pixelSize * scale.x;
  const patternHeight = pattern.length * pixelSize * scale.y;
  const startX = Math.round(x - patternWidth / 2);
  const startY = Math.round(y - patternHeight / 2);
  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      const pixelValue = pattern[row][col];
      if (pixelValue === 0) continue;
      let color = colors.primary;
      if (pixelValue === 1) color = colors.secondary;
      if (pixelValue === 2) color = colors.accent;
      if (pixelValue === 3 && colors.extra) color = colors.extra;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(startX + col * pixelSize * scale.x),
        Math.round(startY + row * pixelSize * scale.y),
        Math.ceil(pixelSize * scale.x),
        Math.ceil(pixelSize * scale.y),
      );
    }
  }
}

/**
 * Stroke an owner-tinted outline around a creature's pixel footprint. This
 * REPLACES the old renderSummonAura green rectangle: player-side summons get
 * a green tint, enemy-side summons get a red tint, drawn as part of the
 * unified dispatch instead of a separate call site.
 */
function strokeOwnerTint(
  ctx: CanvasRenderingContext2D,
  pattern: number[][],
  x: number,
  y: number,
  tint: string,
  scale: { x: number; y: number },
): void {
  const pixelSize = 3;
  const patternWidth = pattern[0].length * pixelSize * scale.x;
  const patternHeight = pattern.length * pixelSize * scale.y;
  const startX = Math.round(x - patternWidth / 2);
  const startY = Math.round(y - patternHeight / 2);
  ctx.save();
  ctx.strokeStyle = tint;
  ctx.lineWidth = 2;
  ctx.shadowColor = tint;
  ctx.shadowBlur = 8;
  ctx.strokeRect(startX - 1, startY - 1, patternWidth + 2, patternHeight + 2);
  ctx.restore();
}

/**
 * ONE ENTITY-DRAW DISPATCH. Routes every combatant draw through a single
 * function that switches on entity kind:
 *   1. isBoss && bossId → getBossPattern(bossId) (or getCreaturePattern fallback)
 *   2. isSummon         → getCreaturePattern + creaturePalettes + OWNER_TINT outline
 *   3. Ghost / isBossMinion → family pattern (or getCreaturePattern fallback)
 *   4. default          → getCreaturePattern + creaturePalettes (chess-piece path)
 *
 * On ANY pattern lookup failure (pattern null/undefined, or palette missing)
 * the fallback king.front pattern is drawn AND logDebugError('SUMMON',
 * 'pattern lookup failed', {pieceType, view}) is called — NEVER silent.
 *
 * The function is pure with respect to React: it takes the canvas ctx, the
 * combatant entity, a screen position, an optional view override, and an
 * optional options object for injected resolvers. It does not import or call
 * any WorldExploration.tsx internal directly.
 *
 * @param ctx        The 2D canvas context to draw into.
 * @param entity     The combatant to render (boss / summon / ghost / minion / default).
 * @param screenPos  Screen-space center to draw at ({x, y}).
 * @param view       Optional facing override; defaults to entity.currentView ?? "front".
 * @param options    Optional injected resolvers (getBossPattern, getFamilyPattern,
 *                   getFamilyColors, drawPattern, characterYOffset).
 */
export function drawCombatant(
  ctx: CanvasRenderingContext2D,
  entity: CombatantEntity,
  screenPos: { x: number; y: number },
  view?: ViewDirection,
  options?: DrawCombatantOptions,
): void {
  const opts = options ?? {};
  const resolvedView: ViewDirection = view ?? entity.currentView ?? "front";
  const scale = {
    x: entity.scaleX ?? 1,
    y: entity.scaleY ?? 1,
  };
  const yOffset = opts.characterYOffset ?? 0;
  const drawX = screenPos.x;
  const drawY = screenPos.y - yOffset;
  const draw = opts.drawPattern ?? drawPatternInline;

  // Branch 1 — BOSS.
  if (entity.isBoss && entity.bossId) {
    let bossResult: PatternResult | null = null;
    if (opts.getBossPattern) {
      const resolved = opts.getBossPattern(entity.bossId);
      if (resolved?.pattern && resolved.colors) {
        bossResult = resolved;
      }
    }
    if (!bossResult) {
      // No boss resolver or it returned nothing — fall back to the creature
      // pattern for the boss's pieceType so art is always present.
      const fallbackPattern = getCreaturePattern(
        entity.pieceType as CreatureKey,
        resolvedView,
      );
      const fallbackPalette =
        creaturePalettes[
          entity.pieceType as Exclude<CreatureKey, ChessPieceType>
        ];
      if (!fallbackPalette) {
        logPatternLookupFailed(entity.pieceType, resolvedView);
        draw(
          ctx,
          chessPiecePatterns.king.front,
          drawX,
          drawY,
          {
            primary: "#888888",
            secondary: "#555555",
            accent: "#aaaaaa",
          },
          scale,
        );
        return;
      }
      bossResult = { pattern: fallbackPattern, colors: fallbackPalette };
    }
    draw(ctx, bossResult.pattern, drawX, drawY, bossResult.colors, scale);
    return;
  }

  // Branch 2 — SUMMON. Creature pattern + palette + OWNER_TINT outline.
  if (entity.isSummon) {
    const summonPattern = getCreaturePattern(
      entity.pieceType as CreatureKey,
      resolvedView,
    );
    const summonPalette =
      creaturePalettes[
        entity.pieceType as Exclude<CreatureKey, ChessPieceType>
      ];
    if (!summonPattern || !summonPalette) {
      logPatternLookupFailed(entity.pieceType, resolvedView);
      draw(
        ctx,
        chessPiecePatterns.king.front,
        drawX,
        drawY,
        {
          primary: "#888888",
          secondary: "#555555",
          accent: "#aaaaaa",
        },
        scale,
      );
      return;
    }
    draw(ctx, summonPattern, drawX, drawY, summonPalette, scale);
    // Owner-tinted outline REPLACES the old renderSummonAura green rectangle.
    const tint = OWNER_TINT[entity.side ?? "enemy"] ?? OWNER_TINT.enemy;
    strokeOwnerTint(ctx, summonPattern, drawX, drawY, tint, scale);
    return;
  }

  // Branch 3 — GHOST / BOSS MINION. Family pattern via injected resolver,
  // falling back to getCreaturePattern when no resolver is supplied.
  if (entity.assignedName === "Ghost" || entity.isBossMinion) {
    if (opts.getFamilyPattern && opts.getFamilyColors) {
      const familyPattern = opts.getFamilyPattern(entity.family ?? "default");
      const familyColorMap = opts.getFamilyColors(entity.family ?? "default");
      if (!familyPattern) {
        logPatternLookupFailed(entity.pieceType, resolvedView);
        draw(
          ctx,
          chessPiecePatterns.king.front,
          drawX,
          drawY,
          {
            primary: "#888888",
            secondary: "#555555",
            accent: "#aaaaaa",
          },
          scale,
        );
        return;
      }
      const familyColors: PatternColors = {
        primary: familyColorMap[1] ?? "#888888",
        secondary: familyColorMap[2] ?? "#555555",
        accent: familyColorMap[3] ?? "#aaaaaa",
      };
      draw(ctx, familyPattern, drawX, drawY, familyColors, scale);
      return;
    }
    // No family resolver — fall through to the default creature path.
    const ghostPattern = getCreaturePattern(
      entity.pieceType as CreatureKey,
      resolvedView,
    );
    const ghostPalette =
      creaturePalettes[
        entity.pieceType as Exclude<CreatureKey, ChessPieceType>
      ];
    if (!ghostPattern || !ghostPalette) {
      logPatternLookupFailed(entity.pieceType, resolvedView);
      draw(
        ctx,
        chessPiecePatterns.king.front,
        drawX,
        drawY,
        {
          primary: "#888888",
          secondary: "#555555",
          accent: "#aaaaaa",
        },
        scale,
      );
      return;
    }
    draw(ctx, ghostPattern, drawX, drawY, ghostPalette, scale);
    return;
  }

  // Branch 4 — DEFAULT (chess-piece / generic enemy).
  const defaultPattern = getCreaturePattern(
    entity.pieceType as CreatureKey,
    resolvedView,
  );
  // Chess-piece pieceTypes resolve their palette from chessPiecePalettes (each
  // piece has a distinct carved-stone + crimson-accent palette). Summon-creature
  // pieceTypes (wolf/golem/archer/bomber/wisp) keep using creaturePalettes. The
  // guard only fires for genuinely unknown pieceTypes where BOTH pattern AND
  // palette are missing — a valid chess-piece pattern with a valid chess-piece
  // palette now renders the real piece instead of collapsing to king.front.
  const isChessPiece = (entity.pieceType as string) in chessPiecePatterns;
  const defaultPalette: PatternColors | undefined = isChessPiece
    ? chessPiecePalettes[entity.pieceType as ChessPieceType]
    : creaturePalettes[
        entity.pieceType as Exclude<CreatureKey, ChessPieceType>
      ];
  if (!defaultPattern || !defaultPalette) {
    logPatternLookupFailed(entity.pieceType, resolvedView);
    draw(
      ctx,
      chessPiecePatterns.king.front,
      drawX,
      drawY,
      {
        primary: "#888888",
        secondary: "#555555",
        accent: "#aaaaaa",
      },
      scale,
    );
    return;
  }
  draw(ctx, defaultPattern, drawX, drawY, defaultPalette, scale);
}

/**
 * Draw a pixel-puff spawn effect at (x, y). Used when a summon creature
 * appears — emits a brief burst of expanding pixels through the SAME canvas
 * context the renderer uses for all combatants, so summons share the draw
 * path with every other on-tile entity.
 *
 * @param ctx     The 2D canvas context the renderer is drawing into.
 * @param x       Screen-space center X of the spawn point.
 * @param y       Screen-space center Y of the spawn point.
 * @param size    Base pixel size of the puff (e.g. effectiveTileW * 0.18).
 */
export function spawnPixelPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const particles = 10;
  const colors = ["#ffffff", "#ffe9a8", "#a8e8ff", "#d4a8ff"];
  ctx.save();
  for (let i = 0; i < particles; i++) {
    const angle = (i / particles) * Math.PI * 2;
    const dist = size * (0.6 + (0.4 * ((i * 37) % 10)) / 10);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const psize = Math.max(1, Math.floor(size * 0.35));
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.7;
    ctx.fillRect(
      Math.floor(px - psize / 2),
      Math.floor(py - psize / 2),
      psize,
      psize,
    );
  }
  ctx.restore();
}
