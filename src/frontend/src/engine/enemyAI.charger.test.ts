import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import type { Enemy, SpellConfig } from "../types/gameTypes";
import { type DecideEnemyContext, decideEnemyAction } from "./enemyAI.ts";

function meleeSpell(): SpellConfig {
  return {
    id: "physical_attack",
    name: "Strike",
    description: "",
    iconEmoji: "",
    apCost: 1n,
    mpCost: 0n,
    damage: 10n,
    range: 1n,
    effectType: "damage",
    spellType: "damage",
  };
}

function pawn(x: number, y: number): Enemy {
  return {
    id: "charger",
    x,
    y,
    level: 3,
    hp: 30,
    maxHp: 30,
    res: 0,
    sp: 0,
    chc: 0,
    init: 6,
    pieceType: "pawn",
    currentView: "front",
    isMoving: false,
    movementPath: [],
    scaleX: 1,
    scaleY: 1,
    nextMoveTime: 0,
    family: "plague_rat",
    side: "enemy",
  };
}

function ctx(
  enemy: Enemy,
  player: { x: number; y: number },
): DecideEnemyContext {
  const spell = meleeSpell();
  const grid = Array.from({ length: WORLD_GRID_SIZE }, () =>
    Array.from({ length: WORLD_GRID_SIZE }, () => true),
  );
  return {
    enemy,
    combatants: [
      {
        id: "player",
        side: "player",
        name: "hero",
        x: player.x,
        y: player.y,
        hp: 40,
        maxHp: 40,
        level: 3,
      },
      {
        id: enemy.id,
        side: "enemy",
        name: "pawn",
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        level: enemy.level,
      },
    ],
    grid,
    occupied: new Set([`${player.x},${player.y}`]),
    barriers: new Set(),
    portals: new Set(),
    voidTiles: new Set(),
    hazardTiles: new Map(),
    availableSpells: [spell],
    assignedSpells: [spell],
    battleTurn: 1,
    allyCount: 0,
    enemyCount: 1,
    enrageMultiplier: 1,
    isSlimeFlood: false,
    rng: () => 0,
    getEffectiveStat: () => 0,
    calcScaledDamage: (base) => base,
    hasLineOfSight: () => true,
    log: () => {},
    focusTargetId: null,
    setFocusTargetId: () => {},
    focusAlreadySet: false,
    markFocusSet: () => {},
  };
}

describe("decideEnemyAction charger", () => {
  it("holds when the player is beyond the charge budget instead of suicide-advancing", () => {
    const enemy = pawn(2, 2);
    // Chebyshev 6 > ENEMY_REACHABLE_STEP_BUDGET + 1 (4).
    const action = decideEnemyAction(enemy, ctx(enemy, { x: 2, y: 8 }));
    assert.equal(action.archetype, "charger");
    assert.equal(action.kind, "skip");
    assert.equal(action.intent, "wait");
    assert.deepEqual(action.destination, { x: 2, y: 2 });
    assert.equal(action.targetId, null);
  });

  it("advances when the player is inside the charge budget", () => {
    const enemy = pawn(2, 2);
    const action = decideEnemyAction(enemy, ctx(enemy, { x: 2, y: 6 }));
    assert.equal(action.archetype, "charger");
    assert.equal(action.kind, "move");
    assert.equal(action.intent, "advance");
    assert.ok(action.destination.y > 2);
  });

  it("commits to melee when already adjacent", () => {
    const enemy = pawn(2, 2);
    const action = decideEnemyAction(enemy, ctx(enemy, { x: 2, y: 3 }));
    assert.equal(action.archetype, "charger");
    assert.equal(action.kind, "cast");
    assert.equal(action.targetId, "player");
    assert.deepEqual(action.destination, { x: 2, y: 2 });
  });
});
