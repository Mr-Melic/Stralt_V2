import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldIgnoreWorldInputDuringRecap } from "./recapWorldInput.ts";

describe("shouldIgnoreWorldInputDuringRecap", () => {
  it("allows canvas input when no recap is up and no victory credit is queued", () => {
    assert.equal(shouldIgnoreWorldInputDuringRecap(false), false);
    assert.equal(shouldIgnoreWorldInputDuringRecap(false, false), false);
  });

  it("blocks canvas walk / hazard clicks while the recap is visible", () => {
    assert.equal(shouldIgnoreWorldInputDuringRecap(true), true);
    assert.equal(shouldIgnoreWorldInputDuringRecap(true, false), true);
  });

  it("blocks canvas input while a victory credit is still on the persist lock", () => {
    assert.equal(shouldIgnoreWorldInputDuringRecap(false, true), true);
    assert.equal(shouldIgnoreWorldInputDuringRecap(true, true), true);
  });

  it("does not treat a missing pending flag as a block", () => {
    assert.equal(shouldIgnoreWorldInputDuringRecap(false, undefined), false);
  });
});
