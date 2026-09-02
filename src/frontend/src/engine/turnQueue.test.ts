import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CombatantEntry } from "../components/InitiativeStrip";
import {
  liveTurnOrder,
  nextTurnIndex,
  removeCombatantFromTurnQueue,
} from "./turnQueue.ts";

function entry(id: string): CombatantEntry {
  return {
    id,
    type: id === "player" ? "player" : "enemy",
    initiative: 1,
    name: id,
    pieceIcon: "P",
    hp: 10,
    maxHp: 10,
    level: 1,
  };
}

function queue(ids: string[], currentIdx: number) {
  const order = ids.map(entry);
  const turnOrderRef = { current: [...order] };
  const currentTurnIndexRef = { current: currentIdx };
  let reactOrder = [...order];
  const setTurnOrder = (
    updater: (prev: CombatantEntry[]) => CombatantEntry[],
  ) => {
    reactOrder = updater(reactOrder);
  };
  return {
    turnOrderRef,
    currentTurnIndexRef,
    reactOrder: () => reactOrder,
    setTurnOrder,
  };
}

/** Same formula advanceTurn used: React index + (possibly live) order. */
function staleReactAdvance(reactIdx: number, order: { id: string }[]) {
  return order[(reactIdx + 1) % order.length]?.id;
}

function liveAdvance(
  reactOrder: CombatantEntry[],
  turnOrderRef: { current: CombatantEntry[] },
  currentTurnIndexRef: { current: number },
) {
  const order = liveTurnOrder(reactOrder, turnOrderRef.current);
  const nextIdx = nextTurnIndex(currentTurnIndexRef.current, order.length);
  return order[nextIdx]?.id;
}

describe("nextTurnIndex after removeCombatantFromTurnQueue", () => {
  it("hands off to the next living enemy after killing the initiative-first foe", () => {
    // [E1, Player, E2], player to move. E1 already acted. Kill E1, End Turn.
    const q = queue(["e1", "player", "e2"], 1);
    removeCombatantFromTurnQueue(
      q.turnOrderRef.current,
      q.turnOrderRef,
      q.currentTurnIndexRef,
      "e1",
      q.setTurnOrder,
    );
    assert.deepEqual(
      q.turnOrderRef.current.map((c) => c.id),
      ["player", "e2"],
    );
    assert.equal(q.currentTurnIndexRef.current, 0);

    // React currentTurnIndex is still 1 (remove never writes it).
    const reactIdx = 1;
    assert.equal(staleReactAdvance(reactIdx, q.turnOrderRef.current), "player");
    assert.equal(
      liveAdvance(q.reactOrder(), q.turnOrderRef, q.currentTurnIndexRef),
      "e2",
    );
  });

  it("does not repeat the last combatant when a wrap-around summon expires at index 0", () => {
    // [Wolf, Player, Rat], Rat just ended. Next is Wolf, who fades.
    // After remove, order is [Player, Rat] and the ref still points at Rat.
    const q = queue(["wolf", "player", "rat"], 2);
    removeCombatantFromTurnQueue(
      q.turnOrderRef.current,
      q.turnOrderRef,
      q.currentTurnIndexRef,
      "wolf",
      q.setTurnOrder,
    );
    assert.deepEqual(
      q.turnOrderRef.current.map((c) => c.id),
      ["player", "rat"],
    );
    assert.equal(q.currentTurnIndexRef.current, 1);

    const reactIdx = 2;
    assert.equal(staleReactAdvance(reactIdx, q.turnOrderRef.current), "rat");
    assert.equal(
      liveAdvance(q.reactOrder(), q.turnOrderRef, q.currentTurnIndexRef),
      "player",
    );
  });

  it("leaves the index on the predecessor so own-turn death does not skip the next unit", () => {
    // [Player, Wolf, Rat], Wolf is acting and fades. Advance must land on Rat.
    const q = queue(["player", "wolf", "rat"], 1);
    removeCombatantFromTurnQueue(
      q.turnOrderRef.current,
      q.turnOrderRef,
      q.currentTurnIndexRef,
      "wolf",
      q.setTurnOrder,
    );
    assert.deepEqual(
      q.turnOrderRef.current.map((c) => c.id),
      ["player", "rat"],
    );
    assert.equal(q.currentTurnIndexRef.current, 0);
    assert.equal(
      liveAdvance(q.reactOrder(), q.turnOrderRef, q.currentTurnIndexRef),
      "rat",
    );
  });

  it("advances player → next summon when nothing was removed", () => {
    const q = queue(["player", "wolf", "rat"], 0);
    assert.equal(
      liveAdvance(q.reactOrder(), q.turnOrderRef, q.currentTurnIndexRef),
      "wolf",
    );
    assert.equal(nextTurnIndex(0, 3), 1);
    assert.equal(nextTurnIndex(2, 3), 0);
    assert.equal(nextTurnIndex(0, 0), 0);
  });
});
