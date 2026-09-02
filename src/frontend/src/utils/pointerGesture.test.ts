import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYNTHETIC_CLICK_SUPPRESS_MS,
  rememberTouchEnd,
  shouldIgnoreClickAfterTouch,
} from "./pointerGesture.ts";

describe("shouldIgnoreClickAfterTouch", () => {
  it("never suppresses a mouse-only click", () => {
    assert.equal(shouldIgnoreClickAfterTouch(1_000, null), false);
  });

  it("drops the synthetic click that follows one physical tap", () => {
    const touchAt = rememberTouchEnd(10_000);
    assert.equal(
      shouldIgnoreClickAfterTouch(10_000 + 16, touchAt),
      true,
      "same-gesture click ~one frame later must not recast",
    );
    assert.equal(
      shouldIgnoreClickAfterTouch(
        10_000 + SYNTHETIC_CLICK_SUPPRESS_MS - 1,
        touchAt,
      ),
      true,
    );
    assert.equal(
      shouldIgnoreClickAfterTouch(
        10_000 + SYNTHETIC_CLICK_SUPPRESS_MS,
        touchAt,
      ),
      false,
      "a later distinct click is still legal",
    );
  });

  it("does not suppress a click that happened before the touch", () => {
    assert.equal(shouldIgnoreClickAfterTouch(9_000, 10_000), false);
  });
});
