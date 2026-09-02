import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deepNormalizeBigInts } from "./normalizeBigInts.ts";

describe("deepNormalizeBigInts", () => {
  it("converts nested BigInts so character/spell payloads can do number math", () => {
    const raw = {
      hp: 40n,
      nested: { xp: 12n, name: "rook" },
      list: [1n, 2, { ap: 8n }],
    };
    assert.deepEqual(deepNormalizeBigInts(raw), {
      hp: 40,
      nested: { xp: 12, name: "rook" },
      list: [1, 2, { ap: 8 }],
    });
  });

  it("leaves null, undefined, and non-bigint primitives unchanged", () => {
    assert.equal(deepNormalizeBigInts(null), null);
    assert.equal(deepNormalizeBigInts(undefined), undefined);
    assert.equal(deepNormalizeBigInts(7), 7);
    assert.equal(deepNormalizeBigInts("ok"), "ok");
    assert.equal(deepNormalizeBigInts(true), true);
    assert.equal(deepNormalizeBigInts(9n), 9);
  });
});
