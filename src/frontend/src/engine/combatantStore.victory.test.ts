import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CombatantEntry } from "../components/InitiativeStrip";
import type { Enemy } from "../types/gameTypes";
import {
  activeHostilesRemaining,
  countsTowardKillRewards,
  hpAfterBossPhase2,
  hpAfterHeal,
  shouldAdvanceAfterEnemyTurn,
  shouldAwardVictory,
} from "./battleSetup.ts";
import {
  deriveBattleEnemies,
  initCombatantStore,
  removeCombatant,
  resetCombatantStore,
  syncCombatants,
  updateCombatant,
} from "./combatantStore.ts";
import { expireSummonsAtTurnStart } from "./summonLifespan.ts";

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

describe("removeCombatant preserves the battle-start snapshot", () => {
  it("still awards victory after the last hostile is removed", () => {
    const ctx = store([enemy("rat-1"), enemy("golem-1")]);
    assert.equal(ctx.battleStartIds.size, 2);

    removeCombatant(ctx, "rat-1");
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 1);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: activeHostilesRemaining(ctx.combatantsRef.current),
      }),
      false,
      "first kill must not persist rewards",
    );

    removeCombatant(ctx, "golem-1");
    assert.deepEqual(
      [...ctx.battleStartIds].sort(),
      ["golem-1", "rat-1"],
      "last kill must not empty the battle-open snapshot",
    );
    assert.deepEqual(
      deriveBattleEnemies(ctx).map((c) => c.id),
      [],
      "living battle view is empty after the last kill",
    );
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 0);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      true,
      "victory gate must fire so applyRewards / recap can run",
    );
  });

  it("React-only hazard HP write leaves the last enemy blocking victory", () => {
    const ctx = store([enemy("rat-1", 10)]);
    // Simulate the old lava path: enemyHpMap / turnOrder drop to 0, store
    // hp stays 10. Victory reads combatantsRef via isActiveHostile.
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

    updateCombatant(ctx, "rat-1", { hp: 0 });
    removeCombatant(ctx, "rat-1");
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
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: true,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      false,
      "flushSync advanceTurn after last-enemy lava must not run player DoT first — that sets deathTriggered and skips applyRewards",
    );
  });

  it("last hostile and player summon dying in one tick still awards without crediting the wolf", () => {
    const wolf = {
      ...enemy("wolf-1", 10),
      isSummon: true,
      side: "player" as const,
    };
    const ctx = store([enemy("rat-1", 10), wolf]);
    removeCombatant(ctx, "rat-1");
    removeCombatant(ctx, "wolf-1");
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 0);
    assert.equal(
      countsTowardKillRewards(wolf),
      false,
      "player-side corpse must not enter applyRewards",
    );
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      true,
      "allied fade on the killing blow must not block victory",
    );
  });

  it("last-hostile enemy summon lifespan expiry must skip the next dispatch", () => {
    const minion = {
      ...enemy("larva-1", 20),
      isSummon: true,
      side: "enemy" as const,
      name: "Larva",
      turnsRemaining: 1,
    };
    const ctx = store([minion]);
    const expired = expireSummonsAtTurnStart(
      ctx.combatantsRef.current,
      () => {},
      "larva-1",
    );
    for (const id of expired) removeCombatant(ctx, id);
    assert.deepEqual(expired, ["larva-1"]);
    assert.equal(activeHostilesRemaining(ctx.combatantsRef.current), 0);
    assert.equal(
      shouldAdvanceAfterEnemyTurn({
        deathTriggered: false,
        hostilesRemaining: activeHostilesRemaining(ctx.combatantsRef.current),
      }),
      false,
      "advanceTurn expire prelude must not start player DoT after last-minion fade",
    );
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      true,
      "lifespan fade of the last hostile must still persist applyRewards",
    );
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: true,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      false,
      "flushSync player DoT after last-minion expire would refuse applyRewards",
    );
  });

  it("strip-only heal leaves store HP so the next hit kills early", () => {
    const ctx = store([{ ...enemy("healer-1", 100), maxHp: 200 }]);
    // Old enemy/boss heal path: setTurnOrder only. Store stays 100.
    // A 120-damage hit then kills a unit the strip would show at 150.
    const stripHp = 150;
    assert.equal(ctx.combatantsRef.current[0]?.hp, 100);
    assert.equal(
      Math.max(0, (ctx.combatantsRef.current[0]?.hp ?? 0) - 120),
      0,
      "store-authoritative enemyTakesDamage kills from the pre-heal snapshot",
    );
    assert.equal(
      Math.max(0, stripHp - 120),
      30,
      "the initiative strip would have survived the same hit",
    );

    updateCombatant(ctx, "healer-1", { hp: stripHp });
    assert.equal(ctx.combatantsRef.current[0]?.hp, 150);
    assert.equal(
      ctx.turnOrderRef.current.find((c) => c.id === "healer-1")?.hp,
      150,
    );
    assert.equal(
      Math.max(0, (ctx.combatantsRef.current[0]?.hp ?? 0) - 120),
      30,
    );
  });

  it("strip-only phase-2 HP leaves the boss killable at phase-1 store HP", () => {
    const ctx = store([{ ...enemy("boss-1", 200), maxHp: 200, isBoss: true }]);
    const stripHp = 400;
    assert.equal(
      Math.max(0, (ctx.combatantsRef.current[0]?.hp ?? 0) - 250),
      0,
      "a 250 hit kills phase-1 store HP while the strip shows 400",
    );
    assert.equal(Math.max(0, stripHp - 250), 150);

    updateCombatant(ctx, "boss-1", { hp: 400, maxHp: 400 });
    assert.equal(ctx.combatantsRef.current[0]?.hp, 400);
    assert.equal(ctx.combatantsRef.current[0]?.maxHp, 400);
    assert.equal(
      Math.max(0, (ctx.combatantsRef.current[0]?.hp ?? 0) - 250),
      150,
    );
  });

  it("store-commits hpAfterHeal so the next hit uses the healed HP", () => {
    const ctx = store([{ ...enemy("healer-1", 100), maxHp: 200 }]);
    const healed = hpAfterHeal(100, 200, 50);
    updateCombatant(ctx, "healer-1", { hp: healed });
    assert.equal(healed, 150);
    assert.equal(ctx.combatantsRef.current[0]?.hp, 150);
    assert.equal(
      ctx.turnOrderRef.current.find((c) => c.id === "healer-1")?.hp,
      150,
    );
    assert.equal(
      Math.max(0, (ctx.combatantsRef.current[0]?.hp ?? 0) - 120),
      30,
      "a 120 hit must survive after the store-committed heal",
    );
  });

  it("store-commits hpAfterBossPhase2 so a phase-1 hit cannot one-shot the boss", () => {
    const ctx = store([{ ...enemy("boss-1", 200), maxHp: 200, isBoss: true }]);
    const phase = hpAfterBossPhase2(200, 200, 2, false);
    updateCombatant(ctx, "boss-1", phase);
    assert.equal(ctx.combatantsRef.current[0]?.hp, 400);
    assert.equal(ctx.combatantsRef.current[0]?.maxHp, 400);
    assert.equal(
      Math.max(0, (ctx.combatantsRef.current[0]?.hp ?? 0) - 250),
      150,
      "phase-2 store HP must absorb a hit that would kill phase-1 200",
    );
  });

  it("still clears the snapshot on store reset so idle maps cannot award", () => {
    const ctx = store([enemy("rat-1")]);
    removeCombatant(ctx, "rat-1");
    resetCombatantStore(ctx);
    assert.equal(ctx.battleStartIds.size, 0);
    assert.equal(
      shouldAwardVictory({
        inBattle: true,
        deathTriggered: false,
        battleStartIdsSize: ctx.battleStartIds.size,
        hostilesRemaining: 0,
      }),
      false,
    );
  });
});
