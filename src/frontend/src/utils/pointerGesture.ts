/**
 * Canvas uses both onTouchEnd and onClick. Mobile browsers still dispatch a
 * synthetic click after touchend even when preventDefault() ran. Player AP
 * is synced in the first handler, so leftover AP (4 AP, 2-cost spell) lets
 * one physical tap fire two casts. Summon kit selection is React state, so
 * the follow-up click still sees the spell selected.
 */

export const SYNTHETIC_CLICK_SUPPRESS_MS = 400;

/** Record the touchend clock so the trailing click can be dropped. */
export function rememberTouchEnd(nowMs: number): number {
  return Math.max(0, Math.floor(Number(nowMs) || 0));
}

/**
 * True when `nowMs` is inside the suppress window after the last canvas
 * touchend. A null last-touch (mouse-only) never suppresses.
 */
export function shouldIgnoreClickAfterTouch(
  nowMs: number,
  lastTouchEndMs: number | null,
  windowMs = SYNTHETIC_CLICK_SUPPRESS_MS,
): boolean {
  if (lastTouchEndMs == null) return false;
  const now = Number(nowMs);
  const last = Number(lastTouchEndMs);
  const window = Math.max(0, Math.floor(Number(windowMs) || 0));
  if (!Number.isFinite(now) || !Number.isFinite(last)) return false;
  const dt = now - last;
  return dt >= 0 && dt < window;
}
