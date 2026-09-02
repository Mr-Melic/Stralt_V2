import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapModifierRegistry } from "./mapModifiers.ts";

const ctx = {
  log: () => {},
  rng: () => 0,
};

describe("mapModifierRegistry MP/AP chain", () => {
  it("doubles movement cost once per active MP modifier, in registry order", () => {
    assert.equal(
      mapModifierRegistry.applyMpCost(2, new Set(["slime_flood"]), ctx),
      4,
    );
    assert.equal(
      mapModifierRegistry.applyMpCost(
        2,
        new Set(["slime_flood", "frozen_terrain"]),
        ctx,
      ),
      8,
    );
    assert.equal(mapModifierRegistry.applyMpCost(3, new Set(), ctx), 3);
  });

  it("stacks AP discounts and never drops a cost below 1", () => {
    assert.equal(
      mapModifierRegistry.applyApCost(3, new Set(["arcane_surge"]), ctx),
      2,
    );
    assert.equal(
      mapModifierRegistry.applyApCost(
        3,
        new Set(["arcane_surge", "arcane_overflow"]),
        ctx,
      ),
      1,
    );
    assert.equal(
      mapModifierRegistry.applyApCost(1, new Set(["arcane_surge"]), ctx),
      1,
    );
  });

  it("doubles Doka rewards under doka_fever only", () => {
    assert.equal(
      mapModifierRegistry.applyRewardMultiplier(
        10,
        new Set(["doka_fever"]),
        ctx,
      ),
      20,
    );
    assert.equal(
      mapModifierRegistry.applyRewardMultiplier(
        10,
        new Set(["slime_flood"]),
        ctx,
      ),
      10,
    );
  });
});
