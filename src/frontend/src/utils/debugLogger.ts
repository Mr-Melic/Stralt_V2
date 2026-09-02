/**
 * DEPRECATED — re-export shim.
 *
 * The canonical location for the debug logger is now
 *   src/frontend/src/debug/debugLogger.ts
 *
 * This file re-exports everything from the new location so existing import
 * sites across the codebase keep working without modification. New code
 * should import from "@/debug/debugLogger" directly.
 *
 * No logic lives here — this is a pure pass-through.
 */

export type {
  LogLevel,
  LogCategory,
  DebugLogEntry,
} from "../debug/debugLogger.ts";
export {
  setDebugPaused,
  isDebugPaused,
  toggleDebugPaused,
  subscribeDebugPaused,
  logDebug,
  logDebugInfo,
  logDebugWarn,
  logDebugError,
  subscribeDebugLogs,
  getDebugLogBuffer,
  clearDebugLogBuffer,
} from "../debug/debugLogger.ts";
