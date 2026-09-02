import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processCombatantDeath } from "./deathPipeline.ts";

describe("death pipeline reward attribution", () => {
  it("cannot live-lookup a kill after removeCombatant; snapshot before remove keeps it", () => {
    const roster = [
      { id: "rat-1", pieceType: "plague_rat", level: 5 },
      { id: "golem-1", pieceType: "iron_golem", level: 8 },
    ];
    const attributed: Array<{
      id: string;
      name: string;
      pieceType: string;
      level: number;
    }> = [];
    let pending: (typeof attributed)[number] | null = null;
    const events: string[] = [];

    const ran = processCombatantDeath("rat-1", {
      isCombatantRemoved: (id) => roster.find((c) => c.id === id) === undefined,
      getCombatantName: (id) => {
        const c = roster.find((e) => e.id === id);
        if (c) {
          pending = {
            id,
            name: c.pieceType,
            pieceType: c.pieceType,
            level: c.level,
          };
        }
        return c?.pieceType ?? "Unknown";
      },
      getCombatantPos: () => ({ x: 0, y: 0 }),
      removeCombatant: (id) => {
        const idx = roster.findIndex((c) => c.id === id);
        if (idx >= 0) roster.splice(idx, 1);
      },
      removeFromTurnQueue: () => {},
      removeFromInitiativeStrip: () => {},
      triggerShatter: () => {},
      logDefeated: () => {},
      applyLeaderDeathBoost: () => {},
      recheckVictory: () => {
        events.push("recheck");
      },
      attributeKillReward: (deadId) => {
        events.push("attribute");
        const live = roster.find((e) => e.id === deadId);
        assert.equal(
          live,
          undefined,
          "live roster lookup after remove must miss",
        );
        if (pending?.id === deadId) {
          attributed.push(pending);
          pending = null;
        }
      },
    });

    assert.equal(ran, true);
    assert.deepEqual(events, ["recheck", "attribute"]);
    assert.deepEqual(attributed, [
      {
        id: "rat-1",
        name: "plague_rat",
        pieceType: "plague_rat",
        level: 5,
      },
    ]);
    assert.equal(
      roster.find((c) => c.id === "rat-1"),
      undefined,
    );
  });

  it("same-tick last-hostile + player-summon deaths recheck once per body and attribute only the rat", () => {
    const roster = [
      { id: "rat-1", pieceType: "plague_rat", level: 5, side: "enemy" },
      {
        id: "wolf-1",
        pieceType: "wolf",
        level: 1,
        side: "player",
        isSummon: true,
      },
    ];
    const attributed: string[] = [];
    const events: string[] = [];
    const removed = new Set<string>();

    const ctx = {
      isCombatantRemoved: (id: string) => removed.has(id),
      getCombatantName: (id: string) =>
        roster.find((c) => c.id === id)?.pieceType ?? "Unknown",
      getCombatantPos: () => ({ x: 0, y: 0 }),
      removeCombatant: (id: string) => {
        removed.add(id);
      },
      removeFromTurnQueue: () => {},
      removeFromInitiativeStrip: () => {},
      triggerShatter: () => {},
      logDefeated: () => {},
      applyLeaderDeathBoost: () => {},
      recheckVictory: () => {
        events.push("recheck");
      },
      attributeKillReward: (deadId: string) => {
        events.push(`attribute:${deadId}`);
        const row = roster.find((c) => c.id === deadId);
        if (row && row.side !== "player") attributed.push(deadId);
      },
    };

    assert.equal(processCombatantDeath("rat-1", ctx), true);
    assert.equal(processCombatantDeath("wolf-1", ctx), true);
    assert.deepEqual(events, [
      "recheck",
      "attribute:rat-1",
      "recheck",
      "attribute:wolf-1",
    ]);
    assert.deepEqual(attributed, ["rat-1"]);
  });
});
