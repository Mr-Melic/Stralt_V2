import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processCombatantDeath } from "./deathPipeline.ts";

describe("processCombatantDeath idempotency", () => {
  it("is a no-op on a second call so a kill cannot be attributed twice", () => {
    const removed = new Set<string>();
    let attributed = 0;
    const ctx = {
      isCombatantRemoved: (id: string) => removed.has(id),
      getCombatantName: () => "rat",
      getCombatantPos: () => ({ x: 1, y: 2 }),
      removeCombatant: (id: string) => {
        removed.add(id);
      },
      removeFromTurnQueue: () => {},
      removeFromInitiativeStrip: () => {},
      triggerShatter: () => {},
      logDefeated: () => {},
      applyLeaderDeathBoost: () => {},
      recheckVictory: () => {},
      attributeKillReward: () => {
        attributed += 1;
      },
    };

    assert.equal(processCombatantDeath("rat-1", ctx), true);
    assert.equal(processCombatantDeath("rat-1", ctx), false);
    assert.equal(attributed, 1);
  });
});
