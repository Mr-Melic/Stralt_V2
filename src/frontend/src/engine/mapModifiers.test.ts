import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAP_MODIFIERS, listAdminModifierTypeOptions } from "./mapModifiers.ts";

describe("listAdminModifierTypeOptions", () => {
  it("lists every live registry id exactly once", () => {
    const options = listAdminModifierTypeOptions();
    const ids = options.map((o) => o.value);
    assert.deepEqual(
      ids,
      MAP_MODIFIERS.map((m) => m.id),
    );
    assert.equal(new Set(ids).size, MAP_MODIFIERS.length);
    assert.ok(ids.includes("doka_fever"));
    assert.ok(ids.includes("titans_vigor"));
    assert.ok(!ids.includes("lava_fields"));
    assert.ok(!ids.includes("custom"));
  });
});
