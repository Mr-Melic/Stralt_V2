/**
 * Shared pointer / keyboard helpers so mouse and touch enforce the same
 * combat and world-move legality. WorldExploration wires these at the
 * click/touch call sites; do not fork the rules per input device.
 */

export const SYNTHETIC_CLICK_GUARD_MS = 500;

export function shouldIgnoreSyntheticClickAfterTouch(
  lastTouchEndAt: number,
  now: number = Date.now(),
  windowMs: number = SYNTHETIC_CLICK_GUARD_MS,
): boolean {
  if (lastTouchEndAt <= 0) return false;
  return now - lastTouchEndAt < windowMs;
}

export function shouldBlockWorldMoveOntoPortal(
  inBattle: boolean,
  portals: ReadonlyArray<{ x: number; y: number }>,
  tile: { x: number; y: number },
): boolean {
  return inBattle && portals.some((p) => p.x === tile.x && p.y === tile.y);
}

export function isAttackNearestHotkey(event: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
}): boolean {
  if (event.key !== "s" && event.key !== "S") return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.target;
  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    const tag = target.tagName;
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable
    ) {
      return false;
    }
  }
  return true;
}
