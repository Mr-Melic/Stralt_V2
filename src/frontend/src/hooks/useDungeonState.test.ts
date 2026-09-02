import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDungeonMultiplier } from "./useDungeonState.ts";

describe("getDungeonMultiplier", () => {
  it("uses the depth table 0..5 and clamps deeper rooms at 4x", () => {
    assert.equal(getDungeonMultiplier(0), 1);
    assert.equal(getDungeonMultiplier(1), 1.5);
    assert.equal(getDungeonMultiplier(2), 2);
    assert.equal(getDungeonMultiplier(3), 2.5);
    assert.equal(getDungeonMultiplier(4), 3);
    assert.equal(getDungeonMultiplier(5), 4);
    assert.equal(getDungeonMultiplier(6), 4);
    assert.equal(getDungeonMultiplier(99), 4);
  });

  it("returns 1x for invalid depth so a bad ref cannot invent a credit", () => {
    assert.equal(getDungeonMultiplier(-1), 1);
    assert.equal(getDungeonMultiplier(Number.NaN), 1);
  });
});
