import assert from "node:assert/strict";
import {
  applyXpDelta,
  recapXpAfterGrant,
  xpForNextLevel,
  xpHudProgress,
  xpThresholdBigInt,
} from "./xpCurve.ts";

assert.equal(xpForNextLevel(1), 100);
assert.equal(xpForNextLevel(2), 200);
assert.equal(xpForNextLevel(3), 400);
assert.equal(xpForNextLevel(4), 800);
assert.equal(xpForNextLevel(0), 100, "level 0 clamps to the level-1 threshold");

// The buggy backend used 100 * 2^level (200 at level 1). A level-1
// character with 90 leftover + 10 portal XP must level up, not stay at
// level 1 with 100 XP.
assert.deepEqual(applyXpDelta(90, 1, 10), { newXp: 0, newLevel: 2 });

// 199 leftover at level 1 + 1 XP still levels (threshold is 100, not 200).
assert.deepEqual(applyXpDelta(0, 1, 100), { newXp: 0, newLevel: 2 });
assert.deepEqual(applyXpDelta(0, 1, 99), { newXp: 99, newLevel: 1 });

// Multi-level: 100 + 200 = 300 XP from a fresh level 1 reaches level 3
// with 0 leftover (100 to reach 2, 200 to reach 3).
assert.deepEqual(applyXpDelta(0, 1, 300), { newXp: 0, newLevel: 3 });

// Level 2 leftover 150 + 60 = 210; threshold 200 → level 3 with 10 leftover.
assert.deepEqual(applyXpDelta(150, 2, 60), { newXp: 10, newLevel: 3 });

// Boss-rush room-clear used to write leftover+kill XP unwrapped (480 at
// level 1). applyXpDelta must wrap before setCharacterStats or a lava
// death raiseUi + idle hydrate persists the inflated leftover.
// 80 + 400 = 480 → consume 100 then 200 → level 3 with 180 leftover.
assert.deepEqual(applyXpDelta(80, 1, 400), { newXp: 180, newLevel: 3 });

// Leftover HUD: experience is remainder in the current level, not cumulative.
assert.deepEqual(xpHudProgress(50, 2), {
  leftover: 50,
  needed: 200,
  percent: 25,
});
assert.deepEqual(xpHudProgress(0, 3), {
  leftover: 0,
  needed: 400,
  percent: 0,
});
// The selection screen used to subtract cumulativeXpAtLevel(2)=100 from a
// leftover of 50 and show 0 / 200.
assert.notEqual(xpHudProgress(50, 2).leftover, 0);

// Recap used (level * 100) as the next-level threshold (300 at level 3).
assert.deepEqual(recapXpAfterGrant(90, 1, 20), {
  leftover: 10,
  level: 2,
  needed: 200,
});
assert.equal(xpForNextLevel(3), 400);
assert.notEqual(3 * 100, xpForNextLevel(3));

// Level 48: 100 * 2^47 exceeds MAX_SAFE_INTEGER. The HUD saturates so
// bars stay finite. Persist must consume the bigint threshold — using
// the saturated HUD number as the consume amount false-levels.
assert.equal(xpForNextLevel(47), 7_036_874_417_766_400);
assert.ok(xpThresholdBigInt(48) > BigInt(Number.MAX_SAFE_INTEGER));
assert.equal(xpForNextLevel(48), Number.MAX_SAFE_INTEGER);
assert.equal(Number.isFinite(xpForNextLevel(1019)), true);
assert.equal(xpForNextLevel(1019), Number.MAX_SAFE_INTEGER);
assert.deepEqual(
  applyXpDelta(Number.MAX_SAFE_INTEGER, 48, 0),
  { newXp: Number.MAX_SAFE_INTEGER, newLevel: 48 },
  "saturated leftover must not consume the HUD ceiling and grant a free level",
);
assert.deepEqual(
  applyXpDelta(0, 47, 7_036_874_417_766_400),
  { newXp: 0, newLevel: 48 },
  "exact safe-integer threshold at 47 still levels",
);

console.log("xpCurve.test: ok");
