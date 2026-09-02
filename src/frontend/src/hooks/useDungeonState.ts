// EXP8: Dungeon chain state hook — state lives in WorldExploration for stable
// canvas-ref access; this hook provides the type shape for external consumers.
import { dungeonDokaMultiplierFor } from "../engine/portalRules.ts";

export interface DungeonChainState {
  isActive: boolean;
  depth: number;
  maxDepth: number;
  dokaMultiplier: number;
}

/**
 * Active-run Doka multiplier for a dungeon depth (0 = 1x).
 * Delegates to `dungeonDokaMultiplierFor` so HUD helpers cannot drift
 * from the victory persist table.
 */
export function getDungeonMultiplier(depth: number): number {
  return dungeonDokaMultiplierFor(true, depth);
}

// Legacy stub kept for safe imports
export const useDungeonState = () => ({});
