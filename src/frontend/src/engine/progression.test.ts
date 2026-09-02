import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getEnemyBaseStats,
  getPlayerBaseStats,
  getSummonBaseStats,
} from "./progression.ts";

describe("getEnemyBaseStats", () => {
  it("is deterministic for the same level, piece, and seed", () => {
    const a = getEnemyBaseStats(7, "rook", "seed-a");
    const b = getEnemyBaseStats(7, "rook", "seed-a");
    assert.deepEqual(a, b);
    for (const value of Object.values(a)) {
      assert.ok(value >= 1);
    }
  });

  it("derives a stable seed from (level, piece) when seedKey is omitted", () => {
    assert.deepEqual(
      getEnemyBaseStats(4, "pawn"),
      getEnemyBaseStats(4, "pawn"),
    );
    assert.notDeepEqual(
      getEnemyBaseStats(4, "pawn"),
      getEnemyBaseStats(4, "bishop"),
    );
  });

  it("falls back to king multipliers for an unknown piece type", () => {
    const unknown = getEnemyBaseStats(5, "unknown" as "king", 42);
    const king = getEnemyBaseStats(5, "king", 42);
    assert.deepEqual(unknown, king);
  });
});

describe("getPlayerBaseStats", () => {
  it("keeps AP/MP floors and skips growth when no config is passed", () => {
    assert.deepEqual(getPlayerBaseStats(1), { ap: 8, mp: 4, hp: 100 });
    assert.deepEqual(getPlayerBaseStats(40), { ap: 8, mp: 4, hp: 100 });
  });

  it("adds AP/MP every N levels and compounds HP from the config", () => {
    const grown = getPlayerBaseStats(25, {
      statGrowthPercent: 5,
      apMpGrowthEveryNLevels: 25,
      maxSpellRange: 5,
      spellRangeGrowthLevels: 10,
      spellFailBaseChance: 20,
      spellFailReductionPerLevel: 0.1,
    });
    assert.equal(grown.ap, 9);
    assert.equal(grown.mp, 5);
    assert.equal(grown.hp, Math.round(100 * 1.05 ** 24));
  });
});

describe("getSummonBaseStats", () => {
  it("scales AP/MP/lifespan from spell level without reading a name", () => {
    const lv0 = getSummonBaseStats(
      0,
      { pieceType: "pawn", level: 1 },
      "hunter",
    );
    const lv4 = getSummonBaseStats(
      4,
      { pieceType: "pawn", level: 1 },
      "hunter",
    );
    assert.ok(lv4.maxHp > lv0.maxHp);
    assert.ok(lv4.maxAp >= lv0.maxAp);
    assert.ok(lv4.turnsRemaining >= lv0.turnsRemaining);
  });
});
