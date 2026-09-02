import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { persistIncrementalRewards } from "./applyRewardsResult.ts";
import { computeRewardDeltas } from "./rewardResolver.ts";

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
});
