// EXP8: Dungeon chain state hook — state lives in WorldExploration for stable
// canvas-ref access; this hook provides the type shape for external consumers.
export interface DungeonChainState {
  isActive: boolean;
  depth: number;
  maxDepth: number;
  dokaMultiplier: number;
}

export const DUNGEON_DOKA_MULTIPLIERS: Record<number, number> = {
  0: 1,
  1: 1.5,
  2: 2.0,
  3: 2.5,
  4: 3.0,
  5: 4.0,
};

/** Returns a Doka multiplier for the given dungeon depth (0 = normal map). */
export function getDungeonMultiplier(depth: number): number {
  return DUNGEON_DOKA_MULTIPLIERS[Math.min(depth, 5)] ?? 1;
}

// Legacy stub kept for safe imports
export const useDungeonState = () => ({});
