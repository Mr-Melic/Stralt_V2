import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PORTAL_TRANSITION_XP,
  persistIncrementalRewards,
  readApplyRewardsOk,
} from "./applyRewardsResult.ts";
import { liveBattleChallengePersistEntries } from "./challengeRewards.ts";
import { createProgressPersist } from "./progressPersist.ts";
import {
  PREAPPLIED_REWARD_MULTIPLIER,
  buildBossRushPersistInput,
  computeRewardDeltas,
  computeVictoryExp,
  selectDefeatedEnemiesForRewards,
} from "./rewardResolver.ts";

describe("boss-rush persist input", () => {
  it("persists the room totals exactly (no extra dungeon multiplier)", () => {
    const defeatedEnemies = [
      { name: "larva", level: 4 },
      { name: "queen", level: 8 },
    ];
    const input = buildBossRushPersistInput({
      defeatedEnemies,
      characterLevel: 5,
      baseDoka: 42,
    });

    assert.equal(input.dungeonMultiplier, PREAPPLIED_REWARD_MULTIPLIER);
    assert.equal(input.victory, true);
    assert.equal(
      input.baseXp,
      computeVictoryExp({ defeatedEnemies, characterLevel: 5 }),
    );

    const deltas = computeRewardDeltas(input);
    assert.equal(deltas.dokaDelta, 42);
    assert.equal(deltas.xpDelta, 240);
    assert.deepEqual(input.completedChallenges, []);
  });

  it("credits accepted hard/legendary panel rewards through applyRewards", () => {
    const defeatedEnemies = [{ name: "larva", level: 4 }];
    const legendary = liveBattleChallengePersistEntries(
      true,
      { rewards: { doka: 500, xp: 1000 } },
      true,
    );
    const input = buildBossRushPersistInput({
      defeatedEnemies,
      characterLevel: 5,
      baseDoka: 42,
      completedChallenges: legendary,
    });
    const deltas = computeRewardDeltas(input);
    // Victory gate skips handleBattleEnd on a run. Empty completedChallenges
    // used to drop the 400–1000 XP / 150–500 Doka the panel advertised.
    assert.equal(deltas.dokaDelta, 542);
    assert.equal(deltas.xpDelta, 1080);
    assert.equal(deltas.dokaFromChallenges, 500);
  });

  it("does not pay the panel when the offer was declined", () => {
    const input = buildBossRushPersistInput({
      defeatedEnemies: [{ name: "larva", level: 4 }],
      characterLevel: 5,
      baseDoka: 42,
      completedChallenges: liveBattleChallengePersistEntries(
        false,
        { rewards: { doka: 500, xp: 1000 } },
        true,
      ),
    });
    const deltas = computeRewardDeltas(input);
    assert.equal(deltas.dokaDelta, 42);
    assert.equal(deltas.xpDelta, 80);
    assert.equal(deltas.dokaFromChallenges, 0);
  });
});

describe("pre-applied dungeon multiplier", () => {
  it("does not square a chain multiplier already baked into the bases", () => {
    const chainMult = 2;
    const rawDoka = 100;
    const recapDoka = rawDoka * chainMult;
    const recapXp = 80;

    const wrong = computeRewardDeltas({
      victory: true,
      enemiesDefeated: [],
      completedChallenges: [],
      dungeonMultiplier: chainMult,
      baseDoka: recapDoka,
      baseXp: recapXp,
    });
    assert.equal(wrong.dokaDelta, 400);
    assert.equal(wrong.xpDelta, 160);

    const correct = computeRewardDeltas({
      victory: true,
      enemiesDefeated: [],
      completedChallenges: [],
      dungeonMultiplier: PREAPPLIED_REWARD_MULTIPLIER,
      baseDoka: recapDoka,
      baseXp: recapXp,
    });
    assert.equal(correct.dokaDelta, recapDoka);
    assert.equal(correct.xpDelta, recapXp);
  });
});

describe("applyRewards result parsing", () => {
  it("reads ok, _ok, and __kind__ payloads and rejects errors", () => {
    assert.deepEqual(
      readApplyRewardsOk({
        ok: { newDoka: 12, newXp: 40, newLevel: 2 },
      }),
      { newDoka: 12, newXp: 40, newLevel: 2 },
    );

    assert.deepEqual(
      readApplyRewardsOk({
        _ok: { newDoka: 1n, newXp: 9n, newLevel: 1n },
      }),
      { newDoka: 1, newXp: 9, newLevel: 1 },
    );

    assert.deepEqual(
      readApplyRewardsOk({
        __kind__: "ok",
        ok: { newDoka: 5, newXp: 15, newLevel: 1 },
      }),
      { newDoka: 5, newXp: 15, newLevel: 1 },
    );

    assert.throws(
      () => readApplyRewardsOk({ err: "Anonymous caller" }),
      /Anonymous caller/,
    );
    assert.throws(
      () => readApplyRewardsOk({ __kind__: "err", err: "Account banned" }),
      /Account banned/,
    );
    assert.throws(() => readApplyRewardsOk(null), /empty result/);
  });

  it("persists incremental XP through applyRewards", async () => {
    const calls: Array<[bigint, bigint, bigint]> = [];
    const actor = {
      applyRewards: async (slot: bigint, doka: bigint, xp: bigint) => {
        calls.push([slot, doka, xp]);
        return { ok: { newDoka: 100, newXp: 30, newLevel: 2 } };
      },
    };
    const persisted = await persistIncrementalRewards(actor, 2, 0, 10);
    assert.deepEqual(calls, [[2n, 0n, 10n]]);
    assert.deepEqual(persisted, { newDoka: 100, newXp: 30, newLevel: 2 });
  });

  it("does not copy optimistic portal XP over committed when persist fails", async () => {
    assert.equal(PORTAL_TRANSITION_XP, 10);
    const lock = createProgressPersist({ doka: 200, xp: 80, level: 4 });
    let uiXp = 80;
    await assert.rejects(
      lock.enqueue(async () => {
        await persistIncrementalRewards(
          {
            applyRewards: async () => ({ err: "Account banned" }),
          },
          1,
          0,
          PORTAL_TRANSITION_XP,
        );
      }),
      /Account banned/,
    );
    // HUD stays at the pre-portal leftover until applyRewards commits.
    assert.equal(uiXp, 80);
    assert.equal(lock.hydrateWhenIdle({ doka: 200, xp: uiXp, level: 4 }), true);
    assert.equal(lock.snapshot().xp, 80);
  });
});

describe("selectDefeatedEnemiesForRewards", () => {
  it("prefers the attributed roster over an empty recheckVictory list", () => {
    assert.deepEqual(
      selectDefeatedEnemiesForRewards(
        [],
        [
          { pieceType: "wraith", level: 4 },
          { name: "golem", level: 6 },
        ],
      ),
      [
        { name: "wraith", level: 4 },
        { name: "golem", level: 6 },
      ],
    );
  });

  it("falls back to the caller-supplied list when nothing was attributed", () => {
    assert.deepEqual(
      selectDefeatedEnemiesForRewards([{ name: "fallback", level: 2 }], []),
      [{ name: "fallback", level: 2 }],
    );
  });

  it("drops player-side summons so allied deaths cannot inflate applyRewards", () => {
    assert.deepEqual(
      selectDefeatedEnemiesForRewards(
        [],
        [
          { pieceType: "rat", level: 3, side: "enemy" },
          { pieceType: "wolf", level: 5, isSummon: true, side: "player" },
          { pieceType: "larva", level: 2, isSummon: true, side: "enemy" },
        ],
      ),
      [
        { name: "rat", level: 3 },
        { name: "larva", level: 2 },
      ],
    );
  });

  it("persists kill XP for hostiles only, not leftover wolf level * 20", () => {
    const defeated = selectDefeatedEnemiesForRewards(
      [],
      [
        { pieceType: "rat", level: 3, side: "enemy" },
        { pieceType: "wolf", level: 5, isSummon: true, side: "player" },
      ],
    );
    const baseXp = computeVictoryExp({
      defeatedEnemies: defeated,
      characterLevel: 4,
    });
    assert.equal(baseXp, 60, "rat 3*20; wolf 5*20 must not be added");
    const deltas = computeRewardDeltas({
      victory: true,
      enemiesDefeated: defeated,
      completedChallenges: [],
      dungeonMultiplier: PREAPPLIED_REWARD_MULTIPLIER,
      baseDoka: defeated.length * 6,
      baseXp,
    });
    assert.equal(deltas.xpDelta, 60);
    assert.equal(deltas.dokaDelta, 6);
    assert.notEqual(
      computeVictoryExp({
        defeatedEnemies: [
          { name: "rat", level: 3 },
          { name: "wolf", level: 5 },
        ],
        characterLevel: 4,
      }),
      60,
      "unfiltered leftover roster used to persist 160 XP",
    );
  });
});
