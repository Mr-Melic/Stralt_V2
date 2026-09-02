import assert from "node:assert/strict";
import {
  fetchPlayerAchievements,
  mapPlayerAchievements,
} from "./playerAchievements.ts";

const player = { toText: () => "2vxsx-fae" };

assert.deepEqual(mapPlayerAchievements(undefined), []);
assert.deepEqual(mapPlayerAchievements(null), []);
assert.deepEqual(
  mapPlayerAchievements([
    {
      principalId: "2vxsx-fae",
      achievementId: "first_blood",
      unlocked: true,
      unlockedAt: 1_700_000_000_000n,
      claimed: false,
    },
  ]),
  [
    {
      principalId: "2vxsx-fae",
      achievementId: "first_blood",
      unlocked: true,
      unlockedAt: 1_700_000_000_000,
      claimed: false,
    },
  ],
);

const calls: Array<{ toText(): string }> = [];
const actor = {
  getPlayerAchievements: async (arg: { toText(): string }) => {
    calls.push(arg);
    return [
      {
        principalId: arg.toText(),
        achievementId: "first_blood",
        unlocked: true,
        unlockedAt: 42n,
        claimed: false,
      },
    ];
  },
};

const mapped = await fetchPlayerAchievements(actor, player);
assert.equal(
  calls.length,
  1,
  "must pass the caller Principal, not call with 0 args",
);
assert.equal(calls[0], player);
assert.equal(mapped[0]?.achievementId, "first_blood");
assert.equal(mapped[0]?.unlocked, true);
assert.equal(mapped[0]?.unlockedAt, 42);
assert.equal(mapped[0]?.claimed, false);

console.log("playerAchievements.test: ok");
