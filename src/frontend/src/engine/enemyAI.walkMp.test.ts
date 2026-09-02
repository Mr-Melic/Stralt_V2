import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import type { Enemy, SpellConfig } from "../types/gameTypes";
import { type DecideEnemyContext, decideEnemyAction } from "./enemyAI.ts";

function bolt(): SpellConfig {
  return {
    id: "starter-frost",
    name: "Frost Bolt",
    description: "",
    iconEmoji: "",
    apCost: 3n,
    mpCost: 0n,
    damage: 20n,
    range: 4n,
    effectType: "damage",
    spellType: "damage",
    lineOfSight: true,
  };
}

function caster(x: number, y: number): Enemy {
  return {
    id: "bishop",
    x,
    y,
    level: 4,
    hp: 40,
    maxHp: 40,
    res: 0,
    sp: 0,
    chc: 0,
    init: 8,
    pieceType: "bishop",
    currentView: "front",
    isMoving: false,
    movementPath: [],
    scaleX: 1,
    scaleY: 1,
    nextMoveTime: 0,
    family: "wraith_bishop",
    side: "enemy",
  };
}

function ctx(
  enemy: Enemy,
  player: { x: number; y: number },
  opts: { frozenTerrain?: boolean; slimeFlood?: boolean } = {},
): DecideEnemyContext {
  const spell = bolt();
  const grid = Array.from({ length: WORLD_GRID_SIZE }, () =>
    Array.from({ length: WORLD_GRID_SIZE }, () => true),
  );
  const origin = { x: enemy.x, y: enemy.y };
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
        level: 4,
      },
      {
        id: enemy.id,
        side: "enemy",
        name: "bishop",
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
    isSlimeFlood: opts.slimeFlood === true,
    isFrozenTerrain: opts.frozenTerrain === true,
    rng: () => 0,
    getEffectiveStat: () => 0,
    calcScaledDamage: (base) => base,
    // Direct south LoS is blocked until the caster has walked 2 tiles.
    hasLineOfSight: (from) =>
      Math.abs(from.x - origin.x) + Math.abs(from.y - origin.y) >= 2,
    log: () => {},
    focusTargetId: null,
    setFocusTargetId: () => {},
    focusAlreadySet: false,
    markFocusSet: () => {},
  };
}

function chebyshev(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

describe("Frozen Terrain / Slime Flood enemy walk budget", () => {
  it("lets a caster reposition 2 tiles on an unmodified map", () => {
    const enemy = caster(2, 2);
    const action = decideEnemyAction(enemy, ctx(enemy, { x: 2, y: 6 }));
    assert.equal(action.archetype, "caster");
    assert.ok(
      chebyshev(action.destination, { x: 2, y: 2 }) >= 2,
      `unmodified dest ${action.destination.x},${action.destination.y} must use the 3-tile budget`,
    );
  });

  it("caps Frozen Terrain reposition at 1 tile the way Slime Flood already did", () => {
    const enemy = caster(2, 2);
    const frozen = decideEnemyAction(
      enemy,
      ctx(enemy, { x: 2, y: 6 }, { frozenTerrain: true }),
    );
    const slime = decideEnemyAction(
      enemy,
      ctx(enemy, { x: 2, y: 6 }, { slimeFlood: true }),
    );
    assert.equal(
      chebyshev(frozen.destination, { x: 2, y: 2 }),
      1,
      `Frozen dest ${frozen.destination.x},${frozen.destination.y} walked the full budget at cost 1`,
    );
    assert.equal(
      chebyshev(slime.destination, { x: 2, y: 2 }),
      1,
      "Slime Flood is the same 2× cost Frozen Terrain advertises",
    );
  });
});
