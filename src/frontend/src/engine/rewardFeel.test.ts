import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldAnnounceLevelUp } from "./rewardFeel.ts";

describe("shouldAnnounceLevelUp", () => {
  it("is true only when recap level increased", () => {
    assert.equal(shouldAnnounceLevelUp(2, 3), true);
    assert.equal(shouldAnnounceLevelUp(3, 3), false);
    assert.equal(shouldAnnounceLevelUp(4, 3), false);
  });
});
