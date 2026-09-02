import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYNTHETIC_CLICK_GUARD_MS,
  isAttackNearestHotkey,
  shouldBlockWorldMoveOntoPortal,
  shouldIgnoreSyntheticClickAfterTouch,
} from "./pointerParity.ts";

describe("shouldIgnoreSyntheticClickAfterTouch", () => {
  it("ignores a click that arrives inside the ghost-click window", () => {
    assert.equal(shouldIgnoreSyntheticClickAfterTouch(1000, 1000 + 50), true);
    assert.equal(
      shouldIgnoreSyntheticClickAfterTouch(
        1000,
        1000 + SYNTHETIC_CLICK_GUARD_MS - 1,
      ),
      true,
    );
  });

  it("allows a later mouse click and a never-touched canvas", () => {
    assert.equal(
      shouldIgnoreSyntheticClickAfterTouch(
        1000,
        1000 + SYNTHETIC_CLICK_GUARD_MS,
      ),
      false,
    );
    assert.equal(shouldIgnoreSyntheticClickAfterTouch(0, 5000), false);
  });
});

describe("shouldBlockWorldMoveOntoPortal", () => {
  const portals = [
    { x: 3, y: 4 },
    { x: 8, y: 1 },
  ];

  it("blocks the same portal tile for mouse and touch while in battle", () => {
    assert.equal(
      shouldBlockWorldMoveOntoPortal(true, portals, { x: 3, y: 4 }),
      true,
    );
    assert.equal(
      shouldBlockWorldMoveOntoPortal(true, portals, { x: 0, y: 0 }),
      false,
    );
  });

  it("never blocks portal walk out of battle", () => {
    assert.equal(
      shouldBlockWorldMoveOntoPortal(false, portals, { x: 3, y: 4 }),
      false,
    );
  });
});

describe("isAttackNearestHotkey", () => {
  it("matches S without modifiers and ignores typing targets", () => {
    assert.equal(isAttackNearestHotkey({ key: "s" }), true);
    assert.equal(isAttackNearestHotkey({ key: "S" }), true);
    assert.equal(isAttackNearestHotkey({ key: "s", ctrlKey: true }), false);
    assert.equal(isAttackNearestHotkey({ key: "a" }), false);
  });
});
