import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBossPixelPattern,
  getEnemyFamilyColors,
  getEnemyFamilyPixelPattern,
} from "./enemyPixelPatterns.ts";

describe("enemyPixelPatterns", () => {
  it("returns the same table object on repeated boss lookups", () => {
    const a = getBossPixelPattern("boss_1");
    const b = getBossPixelPattern("boss_1");
    assert.equal(a, b);
    assert.equal(a.colors.primary, "#f5f0e8");
  });

  it("falls back to boss_12 for an unknown id", () => {
    const fallback = getBossPixelPattern("not_a_real_boss");
    assert.equal(fallback, getBossPixelPattern("boss_12"));
  });

  it("returns stable family pattern and color maps", () => {
    assert.equal(
      getEnemyFamilyPixelPattern("ember_knight"),
      getEnemyFamilyPixelPattern("ember_knight"),
    );
    assert.equal(
      getEnemyFamilyColors("plague_rat"),
      getEnemyFamilyColors("plague_rat"),
    );
    assert.equal(
      getEnemyFamilyPixelPattern("unknown_family"),
      getEnemyFamilyPixelPattern("default"),
    );
  });
});
