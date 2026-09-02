import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeHostilesRemaining,
  countsTowardKillRewards,
  despawnSummons,
  enemyHpAfterHazardDamage,
  isActiveHostile,
  liveCombatantHp,
  shouldAdvanceAfterEnemyTurn,
  shouldAwardVictory,
} from "./battleSetup.ts";
import { expireSummonsAtTurnStart } from "./summonLifespan.ts";

describe("isActiveHostile", () => {
  it("treats enemy-side summons as hostiles that still block victory", () => {
    const leftovers = [
      { id: "wolf", hp: 40, isSummon: true, side: "player" as const },
      { id: "larva", hp: 20, isSummon: true, side: "enemy" as const },
    ];
    assert.equal(isActiveHostile(leftovers[0]), false);
    assert.equal(isActiveHostile(leftovers[1]), true);
    assert.equal(activeHostilesRemaining(leftovers), 1);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: 2,
        hostilesRemaining: activeHostilesRemaining(leftovers),
      }),
      false,
    );
  });

  it("does not treat a living player summon as a hostile cast target", () => {
    const wolf = {
      id: "wolf",
      hp: 40,
      isSummon: true,
      side: "player" as const,
      x: 3,
      y: 3,
    };
    const rat = {
      id: "rat",
      hp: 20,
      isSummon: false,
      side: "enemy" as const,
      x: 5,
      y: 3,
    };
    assert.equal(isActiveHostile(wolf), false);
    assert.equal(isActiveHostile(rat), true);
    const nearest = [wolf, rat].filter(isActiveHostile);
    assert.deepEqual(
      nearest.map((e) => e.id),
      ["rat"],
    );
  });

  it("does not let a living player summon block victory", () => {
    const leftovers = [
      { id: "wolf", hp: 40, isSummon: true, side: "player" as const },
    ];
    assert.equal(activeHostilesRemaining(leftovers), 0);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: 2,
        hostilesRemaining: 0,
      }),
      true,
    );
  });

  it("drops summons on victory cleanup so leftovers cannot re-enter the roster", () => {
    const after = despawnSummons([
      { id: "rat", hp: 0, isSummon: false },
      { id: "wolf", hp: 40, isSummon: true, side: "player" as const },
    ]);
    assert.deepEqual(
      after.map((e) => e.id),
      ["rat"],
    );
  });
});

describe("countsTowardKillRewards", () => {
  it("excludes player-side summons even after HP is already 0", () => {
    assert.equal(
      countsTowardKillRewards({
        isSummon: true,
        side: "player",
      }),
      false,
    );
    assert.equal(
      isActiveHostile({
        hp: 0,
        isSummon: true,
        side: "player",
      }),
      false,
    );
  });

  it("still attributes enemy minions and legacy non-summons after a lethal hit", () => {
    assert.equal(
      countsTowardKillRewards({
        isSummon: true,
        side: "enemy",
      }),
      true,
    );
    assert.equal(countsTowardKillRewards({ isSummon: false }), true);
    assert.equal(
      isActiveHostile({
        hp: 0,
        isSummon: false,
        side: "enemy",
      }),
      false,
    );
  });
});

describe("enemyHpAfterHazardDamage", () => {
  it("marks lava/spike as lethal so callers must processCombatantDeath", () => {
    assert.deepEqual(enemyHpAfterHazardDamage(10, 12), {
      newHp: 0,
      lethal: true,
    });
    assert.deepEqual(enemyHpAfterHazardDamage(20, 8), {
      newHp: 12,
      lethal: false,
    });
    assert.deepEqual(enemyHpAfterHazardDamage(0, 8), {
      newHp: 0,
      lethal: true,
    });
  });
});

describe("liveCombatantHp", () => {
  it("prefers store HP so a later lava read cannot undo Mirror reflect", () => {
    const store = [{ id: "caster", hp: 18 }];
    const staleMapHp = 30;
    const baseline = liveCombatantHp(store, "caster", staleMapHp);
    assert.equal(baseline, 18);
    assert.deepEqual(enemyHpAfterHazardDamage(baseline, 10), {
      newHp: 8,
      lethal: false,
    });
    assert.deepEqual(
      enemyHpAfterHazardDamage(staleMapHp, 10),
      { newHp: 20, lethal: false },
      "stale enemyHpMap would heal the attacker after a 12-damage reflect",
    );
  });

  it("falls back when the id is missing from the store", () => {
    assert.equal(liveCombatantHp([], "gone", 22), 22);
  });
});

describe("shouldAdvanceAfterEnemyTurn", () => {
  it("skips the next dispatch after the last hostile dies so player DoT cannot block victory", () => {
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: false,
        hostilesRemaining: 0,
      }),
      false,
    );
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: true,
        battleStartIdsSize: 1,
        hostilesRemaining: 0,
      }),
      false,
      "player DoT death during flushSync advanceTurn would refuse applyRewards",
    );
  });

  it("still advances when other hostiles remain and the player is alive", () => {
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: false,
        hostilesRemaining: 1,
      }),
      true,
    );
  });

  it("does not dispatch after the player already died this turn", () => {
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: true,
        hostilesRemaining: 1,
      }),
      false,
    );
  });

  it("skips dispatch after the last hostile minion fades so player DoT cannot block victory", () => {
    const minion = {
      id: "larva-1",
      isSummon: true,
      side: "enemy" as const,
      hp: 20,
      name: "Larva",
      turnsRemaining: 1,
    };
    const expired = expireSummonsAtTurnStart([minion], () => {}, "larva-1");
    assert.deepEqual(expired, ["larva-1"]);
    assert.equal(isActiveHostile(minion), false);
    assert.equal(activeHostilesRemaining([minion]), 0);
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: false,
        hostilesRemaining: activeHostilesRemaining([minion]),
      }),
      false,
    );
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: true,
        battleStartIdsSize: 1,
        hostilesRemaining: 0,
      }),
      false,
      "player DoT death during flushSync advanceTurn after last-minion fade would refuse applyRewards",
    );
  });

  it("still advances after a player summon fades while hostiles remain", () => {
    const wolf = {
      id: "wolf",
      isSummon: true,
      side: "player" as const,
      hp: 20,
      name: "Wolf",
      turnsRemaining: 1,
    };
    const rat = { id: "rat", isSummon: false, side: "enemy" as const, hp: 12 };
    expireSummonsAtTurnStart([wolf, rat], () => {}, "wolf");
    assert.equal(isActiveHostile(rat), true);
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: false,
        hostilesRemaining: activeHostilesRemaining([wolf, rat]),
      }),
      true,
    );
  });

  it("skips leftover End Turn / timer dispatch after a last-hostile kill with no fade", () => {
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: false,
        hostilesRemaining: 0,
      }),
      false,
      "advanceTurn must not require an expire list — player End Turn and the 30s timer still fire after a last-hit",
    );
  });
});
