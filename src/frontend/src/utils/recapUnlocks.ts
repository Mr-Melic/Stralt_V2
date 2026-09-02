import type { AchievementConfig } from "../types/gameTypes";

/**
 * In-battle unlocks are collected for the root PostBattleRecap. The recap
 * mounts in App.tsx from BattleRecapData, so the snapshot must travel on
 * that payload — a WorldExploration-only useState never reaches the dialog.
 */
export function appendRecapUnlock(
  prev: readonly AchievementConfig[],
  cfg: AchievementConfig,
): AchievementConfig[] {
  if (prev.some((a) => a.id === cfg.id)) return [...prev];
  return [...prev, cfg];
}

export function attachRecapUnlocks<T extends object>(
  recap: T,
  unlocks: readonly AchievementConfig[],
): T & { newlyUnlockedAchievements: AchievementConfig[] } {
  return { ...recap, newlyUnlockedAchievements: [...unlocks] };
}

export function recapUnlocksFromData(
  fromData: readonly AchievementConfig[] | undefined,
  fromProp: readonly AchievementConfig[] = [],
): AchievementConfig[] {
  if (fromProp.length > 0) return [...fromProp];
  return [...(fromData ?? [])];
}
