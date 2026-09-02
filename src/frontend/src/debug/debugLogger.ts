/**
 * Gated debug logger utility.
 * - In development: logs to console AND pushes to the debug-overlay buffer.
 * - In production: silently no-ops so output stays clean.
 *
 * Canonical location: src/frontend/src/debug/debugLogger.ts
 * A re-export shim remains at src/frontend/src/utils/debugLogger.ts for
 * backwards compatibility with existing import sites.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogCategory =
  | "MAP"
  | "BATTLE"
  | "SPELLS"
  | "RENDER"
  | "BACKEND"
  | "ERROR"
  | "CHALLENGE"
  | "BOSS"
  | "UI"
  | "GENERAL"
  | "SUMMON"
  | "TURN"
  | "MODIFIER"
  | "RESOLVER";

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

export interface DebugLogEntry {
  ts: number;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * In-memory ring buffer for the debug overlay.
 * SECTION 1 (build #325): cap raised from 200 to 2000 lines so the export
 * report can include a much larger history window.
 */
const DEBUG_BUFFER_CAP = 2000;
let _buffer: DebugLogEntry[] = [];

/** Subscribers that want to be notified when a new log arrives. */
const _subscribers: Array<(entry: DebugLogEntry) => void> = [];

/**
 * SECTION 2 (build #325): pause/resume toggle. When paused, new log lines are
 * NOT appended to the buffer (they are dropped). Subscribers are still notified
 * so live UIs can show the entry transiently, but the persisted buffer stops
 * growing — useful for capturing a stable snapshot for export.
 */
let _paused = false;
const _pauseSubscribers: Array<(paused: boolean) => void> = [];

export function setDebugPaused(paused: boolean): void {
  if (_paused === paused) return;
  _paused = paused;
  for (const sub of _pauseSubscribers) {
    try {
      sub(_paused);
    } catch {
      /* ignore subscriber errors */
    }
  }
}

export function isDebugPaused(): boolean {
  return _paused;
}

export function toggleDebugPaused(): boolean {
  setDebugPaused(!_paused);
  return _paused;
}

/** Subscribe to pause/resume state changes (used by the Debug tab UI). */
export function subscribeDebugPaused(
  callback: (paused: boolean) => void,
): () => void {
  _pauseSubscribers.push(callback);
  return () => {
    const idx = _pauseSubscribers.indexOf(callback);
    if (idx !== -1) _pauseSubscribers.splice(idx, 1);
  };
}

export function logDebug(
  category: LogCategory,
  level: LogLevel,
  message: string,
  data?: unknown,
): void {
  const entry: DebugLogEntry = {
    ts: Date.now(),
    category,
    level,
    message,
    data,
  };

  // Always keep the buffer so the overlay can show history even in prod.
  // SECTION 2: when paused, drop the new entry from the persisted buffer
  // (subscribers still get the live event for transient display).
  if (!_paused) {
    _buffer.push(entry);
    if (_buffer.length > DEBUG_BUFFER_CAP)
      _buffer = _buffer.slice(-DEBUG_BUFFER_CAP);
  }

  // Notify overlay subscribers
  for (const sub of _subscribers) {
    try {
      sub(entry);
    } catch {
      /* ignore subscriber errors */
    }
  }

  // Console output only in development
  if (!IS_DEV) return;

  const prefix = `[${category}] ${level.toUpperCase()}:`;
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console[level](prefix, message, data);
  } else {
    // eslint-disable-next-line no-console
    console[level](prefix, message);
  }
}

/** Convenience wrappers so callers don't have to pass level every time. */
export function logDebugInfo(
  category: LogCategory,
  message: string,
  data?: unknown,
): void {
  logDebug(category, "info", message, data);
}
export function logDebugWarn(
  category: LogCategory,
  message: string,
  data?: unknown,
): void {
  logDebug(category, "warn", message, data);
}
export function logDebugError(
  category: LogCategory,
  message: string,
  data?: unknown,
): void {
  logDebug(category, "error", message, data);
}

/** Subscribe to new log entries (used by the debug overlay). */
export function subscribeDebugLogs(
  callback: (entry: DebugLogEntry) => void,
): () => void {
  _subscribers.push(callback);
  return () => {
    const idx = _subscribers.indexOf(callback);
    if (idx !== -1) _subscribers.splice(idx, 1);
  };
}

/** Get the current buffer snapshot. */
export function getDebugLogBuffer(): readonly DebugLogEntry[] {
  return _buffer;
}

/** Clear the buffer. */
export function clearDebugLogBuffer(): void {
  _buffer = [];
}
