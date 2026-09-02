import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStarfieldPaused,
  setStarfieldPaused,
  subscribeStarfieldPaused,
} from "./starfieldActivity.ts";

describe("starfieldActivity", () => {
  it("notifies subscribers only when the pause flag actually flips", () => {
    setStarfieldPaused(false);
    assert.equal(isStarfieldPaused(), false);

    let flips = 0;
    const unsub = subscribeStarfieldPaused(() => {
      flips += 1;
    });

    setStarfieldPaused(true);
    setStarfieldPaused(true);
    assert.equal(isStarfieldPaused(), true);
    assert.equal(flips, 1);

    setStarfieldPaused(false);
    assert.equal(isStarfieldPaused(), false);
    assert.equal(flips, 2);

    unsub();
    setStarfieldPaused(true);
    assert.equal(flips, 2);
    setStarfieldPaused(false);
  });
});
