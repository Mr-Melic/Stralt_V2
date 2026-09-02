import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  processCombatantDeath,
  shouldApplyLeaderDeathBoost,
} from "./deathPipeline.ts";

describe("shouldApplyLeaderDeathBoost", () => {
  it("applies only when the dead id is the designated leader", () => {
    assert.equal(shouldApplyLeaderDeathBoost("grunt-1", "boss-1"), false);
    assert.equal(shouldApplyLeaderDeathBoost("wolf-summon", "boss-1"), false);
    assert.equal(shouldApplyLeaderDeathBoost("boss-1", "boss-1"), true);
  });

  it("does not apply when no leader was designated", () => {
    assert.equal(shouldApplyLeaderDeathBoost("grunt-1", null), false);
    assert.equal(shouldApplyLeaderDeathBoost("grunt-1", undefined), false);
    assert.equal(shouldApplyLeaderDeathBoost("grunt-1", ""), false);
  });

  it("does not apply twice after the leader already died", () => {
    assert.equal(shouldApplyLeaderDeathBoost("boss-1", "boss-1", true), false);
  });
});

describe("processCombatantDeath leader gate", () => {
  it("passes every dead id to applyLeaderDeathBoost; caller must filter", () => {
    const boosted: string[] = [];
    const removed = new Set<string>();
    const ctx = {
      isCombatantRemoved: (id: string) => removed.has(id),
      getCombatantName: () => "grunt",
      getCombatantPos: () => ({ x: 0, y: 0 }),
      removeCombatant: (id: string) => {
        removed.add(id);
      },
      removeFromTurnQueue: () => {},
      removeFromInitiativeStrip: () => {},
      triggerShatter: () => {},
      logDefeated: () => {},
      applyLeaderDeathBoost: (deadId: string) => {
        if (
          shouldApplyLeaderDeathBoost(deadId, "leader-1", boosted.length > 0)
        ) {
          boosted.push(deadId);
        }
      },
      recheckVictory: () => {},
      attributeKillReward: () => {},
    };

    assert.equal(processCombatantDeath("grunt-1", ctx), true);
    assert.deepEqual(boosted, []);
    assert.equal(processCombatantDeath("leader-1", ctx), true);
    assert.deepEqual(boosted, ["leader-1"]);
  });
});
