import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampSaveBattleStatsWrite } from "./absoluteStatsClamp.ts";

describe("clampSaveBattleStatsWrite", () => {
  it("lets death and heals cut Doka/XP but refuses a mint or level rewrite", () => {
    const stored = { doka: 200, xp: 80, level: 4 };

    assert.deepEqual(
      clampSaveBattleStatsWrite(stored, { doka: 120, xp: 64, level: 4 }),
      { doka: 120, xp: 64, level: 4 },
    );

    assert.deepEqual(
      clampSaveBattleStatsWrite(stored, { doka: 900, xp: 400, level: 99 }),
      { doka: 200, xp: 80, level: 4 },
    );
  });
});
