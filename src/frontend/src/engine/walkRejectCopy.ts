// walkRejectCopy.ts — Player-facing labels for battle-walk rejects.
// Cast rejects already float via rejectCopy.ts. Walk no-MP / wall / out-of-
// reach / over-budget clicks returned with no canvas reason.

import { battleWalkMpCost } from "./battleWalkMp.ts";

export type WalkRejectReason =
  | "no_mp"
  | "blocked"
  | "unreachable"
  | "not_enough_mp";

type KeySet = { has(key: string): boolean };

/**
 * Battle-walk passability shared by the MP highlight BFS, A* `findPath`,
 * and the click/touch blocked check. Void used to glow green (BFS omitted
 * it) while execute rejected it; barriers used to be skipped by the BFS
 * while A* walked through them.
 */
export function isBattleWalkTileBlocked(args: {
  tileKind: string | undefined;
  key: string;
  inBattle: boolean;
  portals: KeySet;
  barriers: KeySet;
  voidTiles?: KeySet | null;
}): boolean {
  if (args.tileKind === "wall") return true;
  if (args.voidTiles?.has(args.key) === true) return true;
  if (args.barriers.has(args.key)) return true;
  if (args.inBattle && args.portals.has(args.key)) return true;
  return false;
}

/**
 * World-mode click: empty `findPath` only auto-steps Chebyshev-adjacent
 * floor. Distant empty paths used to gold-tint with no reason. Self-tile
 * stays quiet (gold is enough). Does not change pathfinding.
 */
export function shouldFloatWorldUnreachable(
  pathLength: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  if (pathLength > 0) return false;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx + dy === 0) return false;
  return !(dx <= 1 && dy <= 1);
}

export function playerFacingWalkReject(reason: WalkRejectReason): string {
  switch (reason) {
    case "no_mp":
      return "No MP";
    case "not_enough_mp":
      return "Not enough MP";
    case "blocked":
    case "unreachable":
      return "Can't reach";
    default:
      return "Can't reach";
  }
}

export function classifyWalkReject(input: {
  currentMp: number;
  isBlocked: boolean;
  reachable: boolean;
  pathLength: number;
  /** Frozen Terrain / Slime Flood tile cost. Default 1 matches unmodified maps. */
  costPerTile?: number;
}): WalkRejectReason | null {
  const mp = Math.max(0, Math.floor(Number(input.currentMp) || 0));
  const pathLength = Math.max(0, Math.floor(Number(input.pathLength) || 0));
  const costPerTile = Math.max(1, Math.floor(Number(input.costPerTile) || 1));
  if (mp <= 0) return "no_mp";
  if (input.isBlocked) return "blocked";
  if (!input.reachable || pathLength === 0) return "unreachable";
  if (battleWalkMpCost(pathLength, costPerTile) > mp) return "not_enough_mp";
  return null;
}

export interface WalkRejectFloatSink {
  spawnFloatText(x: number, y: number, text: string, color?: string): void;
}

/** Float walk-reject copy at a screen point. No-ops if effects are missing. */
export function spawnWalkRejectFloat(
  em: WalkRejectFloatSink | null | undefined,
  screen: { x: number; y: number },
  kind: WalkRejectReason,
): void {
  if (!em) return;
  em.spawnFloatText(screen.x, screen.y, playerFacingWalkReject(kind));
}
