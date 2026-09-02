// rewardFeel.ts — Presentation gates for reward IMPACT (sound / banner).
// Does not change XP math, applyRewards, or recap thresholds.

/** True when the recap level is higher than the pre-grant HUD level. */
export function shouldAnnounceLevelUp(
  previousLevel: number,
  recapLevel: number,
): boolean {
  return recapLevel > previousLevel;
}
