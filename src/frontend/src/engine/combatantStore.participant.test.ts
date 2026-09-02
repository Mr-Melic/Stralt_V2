import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CombatantEntry } from "../components/InitiativeStrip";
import type { Enemy } from "../types/gameTypes";
import {
  addCombatant,
  deriveBattleEnemies,
  initCombatantStore,
  syncCombatants,
} from "./combatantStore.ts";

function enemy(id: string, extra: Partial<Enemy> = {}): Enemy {
  return {
    id,
    x: 1,
    y: 1,
    level: 3,
    hp: 40,
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
    ...extra,
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

describe("addCombatant battle participation", () => {
  it("keeps a mid-battle minion on the roster only when battleParticipant is set", () => {
    const ctx = store([enemy("rat-1")]);
    addCombatant(ctx, enemy("larva-1", { isSummon: true, side: "enemy" }));

    assert.deepEqual(
      ctx.combatantsRef.current.map((c) => c.id),
      ["rat-1", "larva-1"],
    );
    assert.equal(ctx.battleStartIds.has("larva-1"), false);
    assert.deepEqual(
      deriveBattleEnemies(ctx).map((c) => c.id),
      ["rat-1"],
    );
    // addCombatant always appends to the live queue; the flag only seeds ids.
    assert.deepEqual(
      ctx.turnOrderRef.current.map((c) => c.id),
      ["rat-1", "larva-1"],
    );

    addCombatant(ctx, enemy("larva-2", { isSummon: true, side: "enemy" }), {
      battleParticipant: true,
    });
    assert.equal(ctx.battleStartIds.has("larva-2"), true);
    assert.deepEqual(
      deriveBattleEnemies(ctx).map((c) => c.id),
      ["rat-1", "larva-2"],
    );
  });

  it("places a summon immediately after its owner via insertAfterId", () => {
    const ctx = store([enemy("owner"), enemy("rat-1")]);
    addCombatant(ctx, enemy("wolf-1", { isSummon: true, side: "player" }), {
      battleParticipant: true,
      insertAfterId: "owner",
    });
    assert.deepEqual(
      ctx.turnOrderRef.current.map((c) => c.id),
      ["owner", "wolf-1", "rat-1"],
    );
  });

  it("appends when insertAfterId is missing so the queue still receives the unit", () => {
    const ctx = store([enemy("owner"), enemy("rat-1")]);
    addCombatant(ctx, enemy("wolf-1"), {
      battleParticipant: true,
      insertAfterId: "missing",
    });
    assert.deepEqual(
      ctx.turnOrderRef.current.map((c) => c.id),
      ["owner", "rat-1", "wolf-1"],
    );
  });
});

describe("syncCombatants preserves the battle-start snapshot", () => {
  it("drops unflagged minions from the battle view on a later world sync", () => {
    const ctx = store([enemy("rat-1")]);
    addCombatant(ctx, enemy("larva-1", { isSummon: true, side: "enemy" }), {
      battleParticipant: true,
    });
    addCombatant(ctx, enemy("wanderer"));

    syncCombatants(ctx, ctx.combatantsRef.current, { resetBattle: false });

    assert.deepEqual(
      ctx.combatantsRef.current.map((c) => c.id),
      ["rat-1", "larva-1", "wanderer"],
    );
    assert.deepEqual([...ctx.battleStartIds].sort(), ["larva-1", "rat-1"]);
    assert.deepEqual(
      deriveBattleEnemies(ctx).map((c) => c.id),
      ["rat-1", "larva-1"],
    );
    assert.deepEqual(
      ctx.turnOrderRef.current.map((c) => c.id),
      ["rat-1", "larva-1"],
      "unflagged wanderer must leave the live queue on world sync",
    );
  });
});

describe("addCombatant battleParticipant", () => {
  it("keeps a mid-battle unit off the roster unless battleParticipant is set", () => {
    const { ctx } = emptyStore();
    addCombatant(ctx, enemy("wanderer"));
    assert.equal(ctx.battleStartIds.has("wanderer"), false);
    assert.equal(deriveBattleEnemies(ctx).length, 0);
    assert.equal(
      ctx.turnOrderRef.current.map((e) => e.id).join(","),
      "wanderer",
    );

    addCombatant(ctx, enemy("rat"), { battleParticipant: true });
    assert.equal(ctx.battleStartIds.has("rat"), true);
    assert.deepEqual(
      deriveBattleEnemies(ctx).map((e) => e.id),
      ["rat"],
    );
  });

  it("inserts a summon immediately after its owner in the live queue", () => {
    const { ctx } = emptyStore();
    addCombatant(ctx, enemy("player", { side: "player" }), {
      battleParticipant: true,
    });
    addCombatant(ctx, enemy("rat"), { battleParticipant: true });
    addCombatant(
      ctx,
      enemy("wolf", { isSummon: true, side: "player", ownerId: "player" }),
      { battleParticipant: true, insertAfterId: "player" },
    );
    assert.deepEqual(
      ctx.turnOrderRef.current.map((e) => e.id),
      ["player", "wolf", "rat"],
    );
  });
});

describe("syncCombatants resetBattle: false", () => {
  it("drops unflagged units from the battle view and queue", () => {
    const { ctx } = emptyStore();
    const player = enemy("player", { side: "player" });
    const rat = enemy("rat");
    syncCombatants(ctx, [player, rat], { resetBattle: true });
    assert.deepEqual(
      ctx.turnOrderRef.current.map((e) => e.id),
      ["player", "rat"],
    );

    const wanderer = enemy("wanderer");
    addCombatant(ctx, wanderer);
    syncCombatants(ctx, [player, rat, wanderer], { resetBattle: false });
    assert.deepEqual(
      deriveBattleEnemies(ctx).map((e) => e.id),
      ["player", "rat"],
    );
    assert.deepEqual(
      ctx.turnOrderRef.current.map((e) => e.id),
      ["player", "rat"],
    );
  });
});
