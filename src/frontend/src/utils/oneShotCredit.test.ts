import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimGroundDokaAtTile,
  dungeonCompleteCreditId,
  shrineCreditId,
  takeOneShotCredit,
} from "./oneShotCredit.ts";

describe("takeOneShotCredit", () => {
  it("pays a shrine or dungeon bonus only once", () => {
    const claimed = new Set<string>();
    const shrine = shrineCreditId("visit-1");
    const dungeon = dungeonCompleteCreditId("run-4");
    assert.equal(takeOneShotCredit(claimed, shrine), true);
    assert.equal(takeOneShotCredit(claimed, shrine), false);
    assert.equal(takeOneShotCredit(claimed, dungeon), true);
    assert.equal(takeOneShotCredit(claimed, dungeon), false);
    assert.equal(takeOneShotCredit(claimed, ""), false);
  });
});

describe("claimGroundDokaAtTile", () => {
  it("does not applyRewards the same coin twice", () => {
    const claimed = new Set<string>();
    const loot = [
      { id: "doka-1", tileX: 3, tileY: 4, value: 40, collected: false },
      { id: "doka-2", tileX: 5, tileY: 5, value: 12, collected: false },
    ];

    const first = claimGroundDokaAtTile(loot, 3, 4, claimed);
    assert.equal(first.hit?.id, "doka-1");
    assert.equal(first.hit?.value, 40);
    assert.equal(first.next[0]?.collected, true);

    // React may replay the updater with the original uncollected list.
    const replay = claimGroundDokaAtTile(loot, 3, 4, claimed);
    assert.equal(replay.hit, null);
    assert.equal(claimed.size, 1);

    const other = claimGroundDokaAtTile(first.next, 5, 5, claimed);
    assert.equal(other.hit?.id, "doka-2");
  });
});
