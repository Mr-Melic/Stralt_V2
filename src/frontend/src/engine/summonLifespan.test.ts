import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expireSummonsAtTurnStart } from "./summonLifespan.ts";

function log() {
  /* test sink */
}

describe("expireSummonsAtTurnStart", () => {
  it("ticks a mid-fight summon that is only on the live store roster", () => {
    // advanceTurn is a long-lived callback and does not list `enemies` in
    // its deps. After a Dire Wolf is summoned, that snapshot is still the
    // pre-summon battle roster (or []). Decrementing it never sees the Wolf.
    const rat = { id: "rat", isSummon: false, hp: 12, name: "Rat" };
    const wolf = {
      id: "wolf",
      isSummon: true,
      hp: 20,
      name: "Wolf",
      turnsRemaining: 4,
    };
    const staleSnapshot = [rat];
    const liveStore = [rat, wolf];

    const staleExpired = expireSummonsAtTurnStart(staleSnapshot, log, "wolf");
    assert.deepEqual(staleExpired, []);
    assert.equal(wolf.turnsRemaining, 4);

    const expired = expireSummonsAtTurnStart(liveStore, log, "wolf");
    assert.deepEqual(expired, []);
    assert.equal(wolf.turnsRemaining, 3);
    assert.equal(wolf.hp, 20);
  });

  it("expires a summon that hits 0 at its own turn start", () => {
    const wolf = {
      id: "wolf",
      isSummon: true,
      hp: 20,
      name: "Wolf",
      turnsRemaining: 1,
    };
    const expired = expireSummonsAtTurnStart([wolf], log, "wolf");
    assert.deepEqual(expired, ["wolf"]);
    assert.equal(wolf.turnsRemaining, 0);
    assert.equal(wolf.hp, 0);
  });

  it("does not decrement other summons when the next combatant is not a summon", () => {
    const wolf = {
      id: "wolf",
      isSummon: true,
      hp: 20,
      name: "Wolf",
      turnsRemaining: 3,
    };
    const expired = expireSummonsAtTurnStart([wolf], log, null);
    assert.deepEqual(expired, []);
    assert.equal(wolf.turnsRemaining, 3);
  });
});
