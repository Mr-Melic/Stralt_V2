import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";
import {
  type DecideEnemyContext,
  decideEnemyAction,
  decideSummonAction,
} from "./enemyAI.ts";
import { enemyCastGeometryOk, hasBresenhamLoS } from "./targeting.ts";

function frost(lineOfSight?: boolean): SpellConfig {
  return {
    id: "starter-frost",
    name: "Frost",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 8n,
    range: 4n,
    effectType: "damage",
    spellType: "damage",
    targetType: "enemy",
    ...(lineOfSight === undefined ? {} : { lineOfSight }),
  };
}

function casterPawn(x: number, y: number): Enemy {
  return {
    id: "bishop",
    x,
    y,
    level: 3,
    hp: 30,
    maxHp: 30,
    res: 0,
    sp: 0,
    chc: 0,
    init: 6,
    pieceType: "bishop",
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
  spell: SpellConfig | SpellConfig[],
  tiles: Array<Array<"floor" | "wall" | "portal">>,
): DecideEnemyContext {
  const spells = Array.isArray(spell) ? spell : [spell];
  const passable = tiles.map((row) => row.map((t) => t !== "wall"));
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
    ],
    grid: passable,
    occupied: new Set([`${player.x},${player.y}`]),
    barriers: new Set(),
    portals: new Set(),
    voidTiles: new Set(),
    hazardTiles: new Map(),
    availableSpells: spells,
    assignedSpells: spells,
    battleTurn: 1,
    allyCount: 0,
    enemyCount: 1,
    enrageMultiplier: 1,
    isSlimeFlood: false,
    rng: () => 0,
    getEffectiveStat: () => 0,
    calcScaledDamage: (base) => base,
    hasLineOfSight: (from, to) => hasBresenhamLoS(tiles, from, to),
    log: () => {},
    focusTargetId: null,
    setFocusTargetId: () => {},
    focusAlreadySet: false,
    markFocusSet: () => {},
  };
}

function wallEastOfOrigin(): {
  tiles: Array<Array<"floor" | "wall" | "portal">>;
  origin: { x: number; y: number };
  player: { x: number; y: number };
} {
  const tiles = Array.from({ length: WORLD_GRID_SIZE }, () =>
    Array.from({ length: WORLD_GRID_SIZE }, () => "floor" as const),
  );
  tiles[2][4] = "wall";
  return { tiles, origin: { x: 2, y: 2 }, player: { x: 6, y: 2 } };
}

function losBolt(): SpellConfig {
  return {
    ...frost(),
    id: "starter-blast",
    name: "Bolt",
    damage: 5n,
    range: 6n,
    lineOfSight: true,
  };
}

function venom(lineOfSight?: boolean): SpellConfig {
  return {
    id: "spell-venom-strike",
    name: "Venom Strike",
    description: "",
    iconEmoji: "",
    apCost: 3n,
    mpCost: 0n,
    damage: 8n,
    range: 2n,
    effectType: "damage",
    spellType: "damage",
    targetType: "enemy",
    ...(lineOfSight === undefined ? {} : { lineOfSight }),
  };
}

function poison(lineOfSight?: boolean): SpellConfig {
  return {
    id: "starter-poison",
    name: "Poison Arrow",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 8n,
    range: 4n,
    effectType: "damage",
    spellType: "damage",
    targetType: "enemy",
    ...(lineOfSight === undefined ? {} : { lineOfSight }),
  };
}

function summonUnit(
  id: string,
  x: number,
  y: number,
  summonAI: "hunter" | "archer",
): Enemy {
  return {
    id,
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
    family: "summon",
    side: "enemy",
    isSummon: true,
    summonAI,
  };
}

describe("enemy AI highlight vs execute geometry", () => {
  it("casts a no-LoS spell through a wall that default-on LoS would block", () => {
    const tiles = Array.from({ length: WORLD_GRID_SIZE }, () =>
      Array.from({ length: WORLD_GRID_SIZE }, () => "floor" as const),
    );
    tiles[2][4] = "wall";
    const enemy = casterPawn(2, 2);
    const player = { x: 6, y: 2 };
    const noLos = frost(false);
    assert.equal(
      enemyCastGeometryOk({
        origin: { x: 2, y: 2 },
        target: player,
        spell: noLos,
        hasLoS: hasBresenhamLoS(tiles, { x: 2, y: 2 }, player),
      }),
      true,
    );
    const action = decideEnemyAction(enemy, ctx(enemy, player, noLos, tiles));
    assert.equal(action.kind, "cast");
    assert.equal(action.targetId, "player");
    assert.equal(action.spell?.id, "starter-frost");
    assert.deepEqual(action.destination, { x: 2, y: 2 });
  });

  it("does not cast a default-LoS spell through that same wall from origin", () => {
    const tiles = Array.from({ length: WORLD_GRID_SIZE }, () =>
      Array.from({ length: WORLD_GRID_SIZE }, () => "floor" as const),
    );
    tiles[2][4] = "wall";
    const enemy = casterPawn(2, 2);
    const player = { x: 6, y: 2 };
    const withLos = frost();
    assert.equal(hasBresenhamLoS(tiles, { x: 2, y: 2 }, player), false);
    const action = decideEnemyAction(enemy, ctx(enemy, player, withLos, tiles));
    const castFromOrigin =
      action.kind === "cast" &&
      action.destination.x === 2 &&
      action.destination.y === 2;
    assert.equal(castFromOrigin, false);
  });

  it("decideCaster casts a no-LoS kit spell through a wall instead of walking", () => {
    // A lone no-LoS frost infers generic (ranged.some(requiresLos) is false).
    // Mixed with a weaker LoS bolt, inferArchetype is caster. The origin
    // check used to require LoS even for lineOfSight === false, then
    // findNearestLegalCastTile returned origin and the fallback walked.
    const { tiles, origin, player } = wallEastOfOrigin();
    const enemy = casterPawn(origin.x, origin.y);
    const noLos = frost(false);
    const action = decideEnemyAction(
      enemy,
      ctx(enemy, player, [noLos, losBolt()], tiles),
    );
    assert.equal(action.archetype, "caster");
    assert.equal(action.kind, "cast");
    assert.equal(action.spell?.id, "starter-frost");
    assert.equal(action.targetId, "player");
    assert.deepEqual(action.destination, origin);
  });

  it("hunter venom and archer poison agree with caster on lineOfSight === false", () => {
    const { tiles, origin, player } = wallEastOfOrigin();
    const hunterTiles = tiles.map((row) => row.slice());
    hunterTiles[2][3] = "wall";
    const hunter = summonUnit("wolf-1", origin.x, origin.y, "hunter");
    const closePlayer = { x: origin.x + 2, y: origin.y };
    const hunterAction = decideSummonAction(
      hunter,
      ctx(hunter, closePlayer, venom(false), hunterTiles),
    );
    assert.equal(hunterAction.kind, "cast");
    assert.equal(hunterAction.spell?.id, "spell-venom-strike");
    assert.deepEqual(hunterAction.destination, origin);

    const archer = summonUnit("archer-1", origin.x, origin.y, "archer");
    const archerAction = decideSummonAction(
      archer,
      ctx(archer, player, poison(false), tiles),
    );
    assert.equal(archerAction.kind, "cast");
    assert.equal(archerAction.spell?.id, "starter-poison");
    assert.deepEqual(archerAction.destination, origin);
  });
});
