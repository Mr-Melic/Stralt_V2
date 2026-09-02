import type { BattleRecapData } from "../components/PostBattleRecap";
import { countsTowardKillRewards } from "../engine/battleSetup.ts";
import {
  clampApplyRewardsDeltas,
  readApplyRewardsOk,
} from "./applyRewardsResult.ts";
import {
  type CompletedChallengeReward,
  addChallengeRewardDeltas,
} from "./challengeRewards.ts";
import { xpForNextLevel } from "./xpCurve.ts";

export type { ApplyRewardsOk } from "./applyRewardsResult.ts";
export {
  APPLY_REWARDS_MAX_DOKA_DELTA,
  APPLY_REWARDS_MAX_XP_DELTA,
  PORTAL_TRANSITION_XP,
  clampApplyRewardsDeltas,
  persistIncrementalRewards,
  readApplyRewardsOk,
} from "./applyRewardsResult.ts";
export {
  addChallengeRewardDeltas,
  battleChallengePersistEntries,
  challengeXpFromEntries,
  liveBattleChallengePersistEntries,
  type CompletedChallengeReward,
} from "./challengeRewards.ts";

export interface RewardInput {
  victory: boolean;
  enemiesDefeated: Array<{ name: string; level: number }>;
  completedChallenges: CompletedChallengeReward[];
  dungeonMultiplier: number;
  bossRushRoomReward?: { doka: number; xp: number };
  baseDoka: number;
  baseXp: number;
}

/**
 * Marker passed as `dungeonMultiplier` to signal that the caller has already
 * multiplied `baseDoka` by the dungeon chain multiplier. When present,
 * `resolveBattleRewards` must NOT multiply the victory Doka again, so the
 * dungeon-chain victory persists exactly once (no double multiplier).
 */
export const PREAPPLIED_REWARD_MULTIPLIER = 1;

export type AttributedKill = {
  name?: string;
  pieceType?: string;
  level?: number;
  isSummon?: boolean;
  side?: "player" | "enemy";
};

/**
 * Picks the defeated roster for victory XP/Doka persist.
 *
 * Death-pipeline `recheckVictory` runs BEFORE `attributeKillReward` and used
 * to call handleBattleEnd with `[]`. The live combatant list is also empty
 * after the last death. Prefer the per-kill attributed roster (complete only
 * after every death has been attributed). Fall back to the caller-supplied
 * list when nothing has been attributed yet.
 */
export function selectDefeatedEnemiesForRewards(
  passed: Array<{ name: string; level: number }> | undefined,
  attributed: AttributedKill[],
): Array<{ name: string; level: number }> {
  if (attributed.length > 0) {
    return attributed.filter(countsTowardKillRewards).map((e) => ({
      name: e.pieceType ?? e.name ?? "unknown",
      level: e.level ?? 1,
    }));
  }
  return passed ?? [];
}

export interface VictoryExpInput {
  /** Explicit positive XP grant; wins over the derived fallbacks when > 0. */
  explicitGrant?: number;
  defeatedEnemies: Array<{ name: string; level: number }>;
  characterLevel: number;
}

/**
 * Derives the XP for a won battle: an explicit positive grant wins, otherwise
 * the sum of defeated enemies' level * 20, falling back to characterLevel * 20.
 */
export function computeVictoryExp({
  explicitGrant,
  defeatedEnemies,
  characterLevel,
}: VictoryExpInput): number {
  if (explicitGrant !== undefined && explicitGrant > 0) {
    return explicitGrant;
  }
  if (defeatedEnemies.length > 0) {
    return defeatedEnemies.reduce((sum, enemy) => sum + enemy.level * 20, 0);
  }
  return characterLevel * 20;
}

export interface BossRushPersistInput {
  defeatedEnemies: Array<{ name: string; level: number }>;
  characterLevel: number;
  baseDoka: number;
  /**
   * Victory gate calls handleBossRushRoomClear instead of handleBattleEnd,
   * so accepted hard/legendary panel rewards must ride this input. Empty
   * means the offer was declined, failed, or never taken.
   */
  completedChallenges?: CompletedChallengeReward[];
}

/**
 * Builds the reward input for a Boss Rush room clear with multiplier 1,
 * reading the defeated list so mid-battle minion kills count toward XP.
 * Challenge XP/Doka go through completedChallenges — the same funnel as
 * a normal victory — so they are not baked into baseDoka (which would
 * drop advertised XP).
 */
export function buildBossRushPersistInput({
  defeatedEnemies,
  characterLevel,
  baseDoka,
  completedChallenges = [],
}: BossRushPersistInput): RewardInput {
  return {
    victory: true,
    enemiesDefeated: defeatedEnemies,
    completedChallenges,
    dungeonMultiplier: PREAPPLIED_REWARD_MULTIPLIER,
    baseDoka,
    baseXp: computeVictoryExp({ defeatedEnemies, characterLevel }),
  };
}

export function computeRewardDeltas(input: RewardInput): {
  dokaDelta: number;
  xpDelta: number;
  dokaFromChallenges: number;
} {
  let dokaDelta = 0;
  let xpDelta = 0;

  if (input.victory) {
    const dokaAlreadyApplied =
      input.dungeonMultiplier === PREAPPLIED_REWARD_MULTIPLIER;
    dokaDelta += dokaAlreadyApplied
      ? input.baseDoka
      : Math.floor(input.baseDoka * input.dungeonMultiplier);
    xpDelta += Math.floor(input.baseXp * input.dungeonMultiplier);
  }

  const withChallenges = addChallengeRewardDeltas(
    dokaDelta,
    xpDelta,
    input.completedChallenges,
  );
  dokaDelta = withChallenges.dokaDelta;
  xpDelta = withChallenges.xpDelta;
  const dokaFromChallenges = withChallenges.dokaFromChallenges;

  if (input.bossRushRoomReward) {
    dokaDelta += input.bossRushRoomReward.doka;
    xpDelta += input.bossRushRoomReward.xp;
  }

  const clamped = clampApplyRewardsDeltas(dokaDelta, xpDelta);
  return {
    dokaDelta: clamped.dokaDelta,
    xpDelta: clamped.xpDelta,
    dokaFromChallenges: Math.min(
      clamped.dokaDelta,
      Math.max(0, dokaFromChallenges),
    ),
  };
}

export async function resolveBattleRewards(
  actor: any,
  selectedSlot: number,
  input: RewardInput,
): Promise<BattleRecapData> {
  const {
    victory,
    enemiesDefeated,
    completedChallenges,
    dungeonMultiplier,
    baseDoka,
  } = input;
  const { dokaDelta, xpDelta, dokaFromChallenges } = computeRewardDeltas(input);

  // Call backend atomic applyRewards
  const result = await actor.applyRewards(
    BigInt(selectedSlot),
    BigInt(dokaDelta),
    BigInt(xpDelta),
  );

  const { newDoka, newXp, newLevel } = readApplyRewardsOk(result);

  // Build recap data
  const recap: BattleRecapData = {
    xpEarned: xpDelta,
    dokaEarned: dokaDelta,
    dokaFromVictory: victory
      ? dungeonMultiplier === PREAPPLIED_REWARD_MULTIPLIER
        ? baseDoka
        : Math.floor(baseDoka * dungeonMultiplier)
      : 0,
    dokaFromChallenges: dokaFromChallenges,
    completedChallenges: completedChallenges.map((c) => c.name),
    enemiesDefeated: enemiesDefeated,
    currentLevel: Number(newLevel),
    currentXP: Number(newXp),
    newDoka: Number(newDoka),
    newXp: Number(newXp),
    xpForNextLevel: xpForNextLevel(Number(newLevel)),
    mapTitle: "",
    hitsDealt: 0,
    dokaBreakdown: [],
  };

  return recap;
}
