/**
 * getPlayerAchievements requires the caller's Principal. The Feats panel
 * and checkAndFireAchievement both hydrate from this query. Calling it with
 * no argument throws at Candid encode (caught → []) or, if undefined is
 * encoded, fails the caller==player guard and returns []. Either way every
 * feat stays locked and Claim never renders, so advertised Doka (50–1000)
 * cannot be collected even after markAchievementUnlocked succeeds.
 */

import type { AchievementProgress } from "../types/gameTypes";

export type PlayerAchievementsActor<P> = {
  getPlayerAchievements: (player: P) => Promise<unknown>;
};

export function mapPlayerAchievements(raw: unknown): AchievementProgress[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const p = entry as AchievementProgress;
    return {
      ...p,
      unlockedAt: Number(p.unlockedAt),
    };
  });
}

export async function fetchPlayerAchievements<P>(
  actor: PlayerAchievementsActor<P>,
  player: P,
): Promise<AchievementProgress[]> {
  return mapPlayerAchievements(await actor.getPlayerAchievements(player));
}
