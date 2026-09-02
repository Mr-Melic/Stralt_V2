import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLY_REWARDS_MAX_DOKA_DELTA,
  APPLY_REWARDS_MAX_XP_DELTA,
  clampApplyRewardsDeltas,
  persistIncrementalRewards,
} from "./applyRewardsResult.ts";
import { computeRewardDeltas, resolveBattleRewards } from "./rewardResolver.ts";

describe("computeRewardDeltas on a loss", () => {
  it("does not persist base Doka or XP when victory is false", () => {
    const deltas = computeRewardDeltas({
      victory: false,
      enemiesDefeated: [{ name: "rat", level: 4 }],
      completedChallenges: [],
      dungeonMultiplier: 2,
      baseDoka: 100,
      baseXp: 80,
    });
    assert.equal(deltas.dokaDelta, 0);
    assert.equal(deltas.xpDelta, 0);
    assert.equal(deltas.dokaFromChallenges, 0);
  });

  it("still credits accepted challenge rewards after a loss", () => {
    const deltas = computeRewardDeltas({
      victory: false,
      enemiesDefeated: [{ name: "rat", level: 4 }],
      completedChallenges: [
        { name: "Untouchable", dokaReward: 150, xpReward: 400 },
      ],
      dungeonMultiplier: 2,
      baseDoka: 100,
      baseXp: 80,
    });
    assert.equal(deltas.dokaDelta, 150);
    assert.equal(deltas.xpDelta, 400);
    assert.equal(deltas.dokaFromChallenges, 150);
  });

  it("floors negative challenge totals so applyRewards never sees a negative Nat", () => {
    const deltas = computeRewardDeltas({
      victory: false,
      enemiesDefeated: [],
      completedChallenges: [{ name: "broken", dokaReward: -20, xpReward: -8 }],
      dungeonMultiplier: 1,
      baseDoka: 50,
      baseXp: 20,
    });
    assert.equal(deltas.dokaDelta, 0);
    assert.equal(deltas.xpDelta, 0);
  });
});

describe("persistIncrementalRewards Nat floor", () => {
  it("never sends a negative or fractional Nat to applyRewards", async () => {
    const calls: Array<[bigint, bigint, bigint]> = [];
    const actor = {
      applyRewards: async (slot: bigint, doka: bigint, xp: bigint) => {
        calls.push([slot, doka, xp]);
        return { ok: { newDoka: 10, newXp: 4, newLevel: 1 } };
      },
    };

    await persistIncrementalRewards(actor, 1, -5.7, -3.2);
    await persistIncrementalRewards(actor, 1, 1.9, 2.1);

    assert.deepEqual(calls, [
      [1n, 0n, 0n],
      [1n, 1n, 2n],
    ]);
  });
});

describe("persistIncrementalRewards flooring", () => {
  it("floors negatives and fractions so applyRewards never sees a negative Nat", async () => {
    const calls: Array<[bigint, bigint, bigint]> = [];
    const actor = {
      applyRewards: async (slot: bigint, doka: bigint, xp: bigint) => {
        calls.push([slot, doka, xp]);
        return { ok: { newDoka: 1, newXp: 2, newLevel: 1 } };
      },
    };
    await persistIncrementalRewards(actor, 1, -4.7, 3.9);
    assert.deepEqual(calls, [[1n, 0n, 3n]]);
    await persistIncrementalRewards(actor, 1, 2.2, -9);
    assert.deepEqual(calls[1], [1n, 2n, 0n]);
  });

  it("clamps a jackpot-sized credit so the canister cannot reject the call", async () => {
    const calls: Array<[bigint, bigint, bigint]> = [];
    const actor = {
      applyRewards: async (slot: bigint, doka: bigint, xp: bigint) => {
        calls.push([slot, doka, xp]);
        return { ok: { newDoka: 100_000, newXp: 0, newLevel: 1 } };
      },
    };
    await persistIncrementalRewards(actor, 1, 1_000_000_000, 10);
    assert.deepEqual(calls, [[1n, BigInt(APPLY_REWARDS_MAX_DOKA_DELTA), 10n]]);
  });
});

describe("clampApplyRewardsDeltas", () => {
  it("keeps official payouts at or under the canister per-call maxima", () => {
    assert.deepEqual(clampApplyRewardsDeltas(80, 40), {
      dokaDelta: 80,
      xpDelta: 40,
    });
    assert.deepEqual(
      clampApplyRewardsDeltas(
        APPLY_REWARDS_MAX_DOKA_DELTA,
        APPLY_REWARDS_MAX_XP_DELTA,
      ),
      {
        dokaDelta: APPLY_REWARDS_MAX_DOKA_DELTA,
        xpDelta: APPLY_REWARDS_MAX_XP_DELTA,
      },
    );
    // Victory 0.01% band is level * [1, 1e9]. That product (and a 0.5%
    // band under dungeon 4× + Doka Fever) used to #err the whole persist.
    assert.deepEqual(clampApplyRewardsDeltas(1_000_000_000, 600_000), {
      dokaDelta: APPLY_REWARDS_MAX_DOKA_DELTA,
      xpDelta: APPLY_REWARDS_MAX_XP_DELTA,
    });
  });

  it("clamps computeRewardDeltas so applyRewards cannot reject a jackpot roll", () => {
    const deltas = computeRewardDeltas({
      victory: true,
      enemiesDefeated: [{ name: "rat", level: 4 }],
      completedChallenges: [
        { name: "Untouchable", dokaReward: 500, xpReward: 1000 },
      ],
      dungeonMultiplier: 1,
      baseDoka: 20_000_000,
      baseXp: 80,
    });
    assert.equal(deltas.dokaDelta, APPLY_REWARDS_MAX_DOKA_DELTA);
    assert.equal(deltas.xpDelta, 1080);
    assert.equal(
      deltas.dokaFromChallenges,
      500,
      "challenge share must still land under the persist ceiling",
    );
  });

  it("clamps victory XP so a huge grant cannot #err the whole persist", () => {
    const deltas = computeRewardDeltas({
      victory: true,
      enemiesDefeated: [{ name: "rat", level: 4 }],
      completedChallenges: [
        { name: "Untouchable", dokaReward: 500, xpReward: 1000 },
      ],
      dungeonMultiplier: 1,
      baseDoka: 80,
      baseXp: 600_000,
    });
    assert.equal(deltas.dokaDelta, 580);
    assert.equal(deltas.xpDelta, APPLY_REWARDS_MAX_XP_DELTA);
  });
});

describe("resolveBattleRewards advertised grant", () => {
  it("persists and recaps the clamped jackpot so HUD credit matches the canister", async () => {
    const calls: Array<[bigint, bigint, bigint]> = [];
    const actor = {
      applyRewards: async (slot: bigint, doka: bigint, xp: bigint) => {
        calls.push([slot, doka, xp]);
        return {
          ok: { newDoka: 100_000, newXp: 0, newLevel: 2 },
        };
      },
    };
    const recap = await resolveBattleRewards(actor, 1, {
      victory: true,
      enemiesDefeated: [{ name: "rat", level: 4 }],
      completedChallenges: [],
      dungeonMultiplier: 1,
      baseDoka: 1_000_000_000,
      baseXp: 600_000,
    });
    assert.deepEqual(calls, [
      [
        1n,
        BigInt(APPLY_REWARDS_MAX_DOKA_DELTA),
        BigInt(APPLY_REWARDS_MAX_XP_DELTA),
      ],
    ]);
    assert.equal(recap.dokaEarned, APPLY_REWARDS_MAX_DOKA_DELTA);
    assert.equal(recap.xpEarned, APPLY_REWARDS_MAX_XP_DELTA);
  });
});
