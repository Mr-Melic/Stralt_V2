/**
 * geometryOverlayState.ts — shared toggle state for the debug geometry overlay.
 *
 * Build #329 — Debug-only module. NEVER shipped to normal players; callers
 * gate invocation behind `import.meta.env.DEV`. This file itself does no
 * gating so it can be unit-tested in isolation — the gating is the caller's
 * responsibility (per the project rule "All admin and debug features must be
 * dev-only/gated and never ship to normal players").
 *
 * ── Purpose ────────────────────────────────────────────────────────────────
 * Tiny shared module that owns the on/off flag for the live geometry overlay
 * drawn on the WorldExploration canvas. ChatPanel's Debug tab toolbar exposes
 * a "Geometry overlay" toggle that calls setGeometryOverlayEnabled; the WX
 * render loop reads getGeometryOverlayEnabled each frame to decide whether to
 * draw the overlay.
 *
 * Kept separate from clickTrace.ts so clickTrace stays a pure recorder with
 * no UI-facing toggle state, and so WX can import the getter without pulling
 * the click-trace ring buffer into its bundle.
 *
 * ── Subscription model ────────────────────────────────────────────────────
 * Mirrors the debugLogger subscribe pattern: a Set of listeners notified on
 * every change. Lets the WX render loop (or any consumer) react to toggle
 * flips without polling.
 */

let _enabled = false;
const _listeners = new Set<(enabled: boolean) => void>();

/** Returns the current geometry-overlay enabled flag. */
export function getGeometryOverlayEnabled(): boolean {
  return _enabled;
}

/** Set the geometry-overlay enabled flag and notify subscribers. */
export function setGeometryOverlayEnabled(enabled: boolean): void {
  if (_enabled === enabled) return;
  _enabled = enabled;
  for (const fn of _listeners) {
    try {
      fn(enabled);
    } catch {
      // listener errors must not break the toggle
    }
  }
}

/** Toggle the flag and return the new value. */
export function toggleGeometryOverlayEnabled(): boolean {
  setGeometryOverlayEnabled(!_enabled);
  return _enabled;
}

/**
 * Subscribe to flag changes. Returns an unsubscribe function. Mirrors the
 * debugLogger subscribe pattern so consumers can wire this into useEffect.
 */
export function subscribeGeometryOverlayEnabled(
  fn: (enabled: boolean) => void,
): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}
