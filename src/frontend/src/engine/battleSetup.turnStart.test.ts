import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CombatantEntry } from "../components/InitiativeStrip";
import type { Enemy } from "../types/gameTypes";
import {
  PLAGUE_ZONE_TICK,
  VOID_RIFT_TICK,
  activeHostilesRemaining,
  enemyHpAfterHazardDamage,
  hpAfterIncomingDamage,
  playerTurnStartModifierTarget,
  shouldAwardVictory,
  shouldContinuePlayerTurnAfterHazard,
  shouldDispatchEnemyAiAfterTurnStart,
} from "./battleSetup.ts";
import {
  initCombatantStore,
  removeCombatant,
  syncCombatants,
  updateCombatant,
} from "./combatantStore.ts";

function enemy(id: string, hp = 40): Enemy {
  return {
    id,
    x: 1,
    y: 1,
    level: 3,
    hp,
    maxHp: 40,
    res: 0,
    sp: 0,
    chc: 0,
    init: 8,
    pieceType: "pawn",
    currentView: "front",
    isMoving: false,
    movementPath: [],
    scaleX: 1,
    scaleY: 1,
    nextMoveTime: 0,
    family: "plague_rat",
  };
}

function store(initial: Enemy[]) {
  const combatantsRef = { current: [] as Enemy[] };
  const enemiesRef = { current: [] as Enemy[] };
  const battleEnemiesRef = { current: [] as Enemy[] };
  const turnOrderRef = { current: [] as CombatantEntry[] };
  const currentTurnIndexRef = { current: 0 };
  const ctx = initCombatantStore(
    combatantsRef,
    enemiesRef,
    battleEnemiesRef,
    turnOrderRef,
    currentTurnIndexRef,
    () => {},
    () => {},
    () => {},
  );
  syncCombatants(ctx, initial, { resetBattle: true });
  return ctx;
}

describe("enemyHpAfterHazardDamage plague tick", () => {
  it("marks plague as lethal so callers must processCombatantDeath", () => {
    assert.deepEqual(enemyHpAfterHazardDamage(2, PLAGUE_ZONE_TICK), {
      newHp: 0,
      lethal: true,
    });
    assert.deepEqual(enemyHpAfterHazardDamage(1, PLAGUE_ZONE_TICK), {
      newHp: 0,
      lethal: true,
    });
    assert.deepEqual(enemyHpAfterHazardDamage(10, PLAGUE_ZONE_TICK), {
      newHp: 8,
      lethal: false,
    });
  });
});

describe("shouldDispatchEnemyAiAfterTurnStart", () => {
  it("blocks AI after a lethal DoT/plague tick so battlePhase cannot stick", () => {
    assert.equal(
      shouldDispatchEnemyAiAfterTurnStart({ stillInStore: false, storeHp: 0 }),
      false,
    );
    assert.equal(
      shouldDispatchEnemyAiAfterTurnStart({ stillInStore: true, storeHp: 0 }),
      false,
    );
    assert.equal(
      shouldDispatchEnemyAiAfterTurnStart({ stillInStore: true, storeHp: 8 }),
      true,
    );
  });
});

describe("player turn-start plague death", () => {
  it("lethal plague must stop the player turn and refuse victory", () => {
    const { newHp, lethal } = hpAfterIncomingDamage(1, PLAGUE_ZONE_TICK);
    assert.deepEqual({ newHp, lethal }, { newHp: 0, lethal: true });
    assert.equal(
      shouldContinuePlayerTurnAfterHazard({
        deathTriggered: lethal,
        liveHp: newHp,
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
      "plague death must set deathTriggered before a last-hostile kill can award",
    );
  });

  it("non-lethal plague still starts the player turn", () => {
    const { newHp, lethal } = hpAfterIncomingDamage(10, PLAGUE_ZONE_TICK);
    assert.deepEqual({ newHp, lethal }, { newHp: 8, lethal: false });
    assert.equal(
      shouldContinuePlayerTurnAfterHazard({
        deathTriggered: false,
        liveHp: newHp,
      }),
      true,
    );
  });
});

describe("playerTurnStartModifierTarget", () => {
  it("does not fall back to the first enemy when player is absent", () => {
    const combatants = [{ id: "rat-1" }, { id: "golem-1" }];
    assert.equal(playerTurnStartModifierTarget(combatants), undefined);
    assert.deepEqual(
      playerTurnStartModifierTarget([{ id: "player" }, { id: "rat-1" }]),
      { id: "player" },
    );
  });
});

describe("turn-start plague store write", () => {
  it("React-only plague HP write leaves a last-hostile enemy summon blocking victory", () => {
    const minion = {
      ...enemy("larva-1", 2),
      isSummon: true,
      side: "enemy" as const,
    };
    const ctx = store([minion]);
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 1);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: activeHostilesRemaining(ctx.combatantsRef.current),
      }),
      false,
      "enemy minions are hostiles — UI 0 HP must not award while store hp > 0",
    );

    const { newHp, lethal } = enemyHpAfterHazardDamage(2, PLAGUE_ZONE_TICK);
    updateCombatant(ctx, "larva-1", { hp: newHp });
    if (lethal) removeCombatant(ctx, "larva-1");
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 0);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      true,
      "summon-ai branch must commit plague like #84 or applyRewards never runs",
    );
    assert.equal(
      shouldDispatchEnemyAiAfterTurnStart({
        stillInStore: false,
        storeHp: 0,
      }),
      false,
      "lethal last-minion tick must not dispatch AI",
    );
  });

  it("React-only plague HP write leaves the last enemy blocking victory", () => {
    const ctx = store([enemy("rat-1", 2)]);
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 1);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: activeHostilesRemaining(ctx.combatantsRef.current),
      }),
      false,
      "UI 0 HP must not award while the store still has a living hostile",
    );

    const { newHp, lethal } = enemyHpAfterHazardDamage(2, PLAGUE_ZONE_TICK);
    updateCombatant(ctx, "rat-1", { hp: newHp });
    if (lethal) removeCombatant(ctx, "rat-1");
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 0);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      true,
      "store write + processCombatantDeath must award so applyRewards can run",
    );
  });
});

describe("turn-start void rift store write", () => {
  it("marks void rift as lethal so callers must processCombatantDeath", () => {
    assert.deepEqual(enemyHpAfterHazardDamage(3, VOID_RIFT_TICK), {
      newHp: 0,
      lethal: true,
    });
    assert.deepEqual(enemyHpAfterHazardDamage(2, VOID_RIFT_TICK), {
      newHp: 0,
      lethal: true,
    });
    assert.deepEqual(enemyHpAfterHazardDamage(10, VOID_RIFT_TICK), {
      newHp: 7,
      lethal: false,
    });
  });

  it("React-only void-rift HP write leaves the last enemy blocking victory", () => {
    const ctx = store([enemy("rat-1", 3)]);
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 1);

    const { newHp, lethal } = enemyHpAfterHazardDamage(3, VOID_RIFT_TICK);
    updateCombatant(ctx, "rat-1", { hp: newHp });
    if (lethal) removeCombatant(ctx, "rat-1");
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 0);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      true,
      "store write + processCombatantDeath must award so applyRewards can run",
    );
  });

  it("player-side summon control must commit Void Rift like enemy summons", () => {
    // Control-mode turn start used to call applyTurnStart only (turn-order
    // entry mutation). Store HP stayed full, so a ≤3 HP Wolf never died and
    // kept acting while enemy minions correctly took the −3 tick.
    const wolf = {
      ...enemy("wolf-1", 3),
      isSummon: true,
      side: "player" as const,
    };
    const ctx = store([wolf]);
    assert.equal(ctx.combatantsRef.current[0]?.hp, 3);

    const { newHp, lethal } = enemyHpAfterHazardDamage(3, VOID_RIFT_TICK);
    updateCombatant(ctx, "wolf-1", { hp: newHp });
    if (lethal) removeCombatant(ctx, "wolf-1");

    assert.equal(lethal, true);
    assert.equal(
      ctx.combatantsRef.current.find((c) => c.id === "wolf-1"),
      undefined,
      "player-summon Void Rift ≤3 HP must processCombatantDeath via store write",
    );
    assert.equal(
      shouldDispatchEnemyAiAfterTurnStart({
        stillInStore: false,
        storeHp: 0,
      }),
      false,
      "lethal Void Rift on a controlled summon must not keep control mode",
    );
  });
});
