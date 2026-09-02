import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  championForgeVitalsFromStats,
  startingChampionStats,
} from "./startingChampionStats.ts";

describe("startingChampionStats", () => {
  it("includes every CharacterStats field including killCount", () => {
    const stats = startingChampionStats();
    assert.equal(stats.hp, 100n);
    assert.equal(stats.ap, 10n);
    assert.equal(stats.mp, 5n);
    assert.equal(stats.atk, 15n);
    assert.equal(stats.res, 10n);
    assert.equal(stats.evasion, 5n);
    assert.equal(stats.init, 10n);
    assert.equal(stats.sp, 8n);
    assert.equal(stats.sr, 5n);
    assert.equal(stats.resilience, 8n);
    assert.equal(stats.chc, 5n);
    assert.equal(stats.killCount, 0n);
  });
});

describe("championForgeVitalsFromStats", () => {
  it("shows starting HP/AP/MP/INIT when no record is passed", () => {
    assert.deepEqual(championForgeVitalsFromStats(undefined), {
      hp: 100,
      ap: 10,
      mp: 5,
      init: 10,
    });
    assert.deepEqual(championForgeVitalsFromStats(startingChampionStats()), {
      hp: 100,
      ap: 10,
      mp: 5,
      init: 10,
    });
  });

  it("reads persisted stats on edit instead of resetting to the starter row", () => {
    const saved = startingChampionStats();
    saved.hp = 145n;
    saved.ap = 12n;
    saved.mp = 6n;
    saved.init = 18n;
    assert.deepEqual(championForgeVitalsFromStats(saved), {
      hp: 145,
      ap: 12,
      mp: 6,
      init: 18,
    });
  });
});
