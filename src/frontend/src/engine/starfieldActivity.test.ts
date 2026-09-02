import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStarfieldPaused,
  planStarfieldLoop,
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

  it("releases GPU while the world canvas is covering the starfield", () => {
    assert.equal(
      planStarfieldLoop({ worldPaused: true, documentHidden: false }),
      "pause_release_gpu",
    );
    assert.equal(
      planStarfieldLoop({ worldPaused: true, documentHidden: true }),
      "pause_release_gpu",
    );
  });

  it("keeps the star buffer when only the tab is hidden", () => {
    assert.equal(
      planStarfieldLoop({ worldPaused: false, documentHidden: true }),
      "pause_keep_buffer",
    );
  });

  it("runs the loop when visible and not covered by the world canvas", () => {
    assert.equal(
      planStarfieldLoop({ worldPaused: false, documentHidden: false }),
      "run",
    );
  });
});
