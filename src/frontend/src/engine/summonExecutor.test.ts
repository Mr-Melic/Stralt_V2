import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type OccupancyContext,
  occupantsSealProgression,
} from "./occupancy.ts";
import type { SpellContext } from "./spellEngine.ts";
import { executeSummonAction } from "./summonExecutor.ts";

function dummyCtx(): SpellContext {
  return {
    rng: () => 0,
    getEffectiveStat: () => 0,
    dealDamage: () => 0,
    heal: () => {},
    applyEffect: () => {},
    placeBarrier: () => {},
    spawnUnit: () => {},
    log: () => {},
    isCellFree: () => true,
    getCombatantAt: () => null,
  };
}

describe("executeSummonAction mandatory-bridge slide", () => {
  it("slides a summon off the unique player→exit corridor after a move", () => {
    const tiles = [
      [true, true, true, true, true, true],
      [true, true, false, false, false, false],
    ];
    const reserved = new Set(["2,0", "3,0", "4,0"]);
    const occupied = new Set<string>(["0,0"]);
    const occupancyCtx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(["5,0"]),
      reserved,
      isOccupied: (c) => occupied.has(`${c.x},${c.y}`),
    };
    const result = executeSummonAction(
      {
        archetype: "hunter",
        kind: "move",
        destination: { x: 2, y: 0 },
        spell: null,
        targetId: null,
        intent: "closes in",
        intentColor: "#a78bfa",
        retreating: false,
      },
      {
        id: "wolf",
        x: 1,
        y: 1,
        hp: 10,
        maxHp: 10,
        currentAp: 2,
        currentMp: 4,
        maxAp: 2,
        maxMp: 4,
        level: 1,
        pieceType: "pawn",
        summonAI: "hunter",
      } as any,
      dummyCtx(),
      {
        calcScaledDamage: (n) => n,
        occupancyCtx,
        worldGridSize: 6,
        mpCostPerTile: 1,
        meleeApCost: 1,
        getEnemyById: () => undefined,
        getAoEVictims: () => [],
      },
    );
    assert.equal(
      reserved.has(`${result.newPosition.x},${result.newPosition.y}`),
      false,
    );
    assert.ok(tiles[result.newPosition.y][result.newPosition.x]);
  });

  it("vacates the origin tile so a dual-path cut can unseal after a move", () => {
    const tiles = [
      [true, true, true, true, true],
      [true, false, false, false, true],
      [true, true, true, true, true],
    ];
    const occupied = new Set<string>(["0,1", "2,2", "1,0"]);
    const occupancyCtx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(["4,0"]),
      progressStart: { x: 0, y: 1 },
      isOccupied: (c) => occupied.has(`${c.x},${c.y}`),
    };
    const result = executeSummonAction(
      {
        archetype: "hunter",
        kind: "move",
        destination: { x: 2, y: 0 },
        spell: null,
        targetId: null,
        intent: "closes in",
        intentColor: "#a78bfa",
        retreating: false,
      },
      {
        id: "wolf",
        x: 1,
        y: 0,
        hp: 10,
        maxHp: 10,
        currentAp: 2,
        currentMp: 4,
        maxAp: 2,
        maxMp: 4,
        level: 1,
        pieceType: "pawn",
        summonAI: "hunter",
      } as any,
      dummyCtx(),
      {
        calcScaledDamage: (n) => n,
        occupancyCtx,
        worldGridSize: 5,
        mpCostPerTile: 1,
        meleeApCost: 1,
        getEnemyById: () => undefined,
        getAoEVictims: () => [],
      },
    );
    assert.equal(
      occupantsSealProgression(
        tiles,
        new Set(),
        new Set(["4,0"]),
        { x: 0, y: 1 },
        [result.newPosition, { x: 2, y: 2 }],
      ),
      false,
    );
    assert.notEqual(`${result.newPosition.x},${result.newPosition.y}`, "2,0");
  });
});

describe("executeSummonAction Frozen/Slime MP debit", () => {
  it("charges the doubled per-tile cost so leftover MP cannot fund a second stride", () => {
    const occupied = new Set<string>();
    const occupancyCtx: OccupancyContext = {
      tiles: [
        [true, true, true, true],
        [true, true, true, true],
      ],
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(),
      isOccupied: (c) => occupied.has(`${c.x},${c.y}`),
    };
    const result = executeSummonAction(
      {
        archetype: "hunter",
        kind: "move",
        destination: { x: 2, y: 0 },
        spell: null,
        targetId: null,
        intent: "closes in",
        intentColor: "#a78bfa",
        retreating: false,
      },
      {
        id: "wolf",
        x: 1,
        y: 0,
        hp: 10,
        maxHp: 10,
        currentAp: 2,
        currentMp: 3,
        maxAp: 2,
        maxMp: 3,
        level: 1,
        pieceType: "pawn",
        summonAI: "hunter",
      } as any,
      dummyCtx(),
      {
        calcScaledDamage: (n) => n,
        occupancyCtx,
        worldGridSize: 4,
        mpCostPerTile: 2,
        meleeApCost: 1,
        getEnemyById: () => undefined,
        getAoEVictims: () => [],
      },
    );
    assert.equal(result.newPosition.x, 2);
    assert.equal(
      result.currentMp,
      1,
      "1-tile Frozen/Slime stride must spend 2 of 3 MP",
    );
  });

  it("refuses a 2-tile stride when doubled cost exceeds remaining MP", () => {
    const occupied = new Set<string>();
    const occupancyCtx: OccupancyContext = {
      tiles: [
        [true, true, true, true],
        [true, true, true, true],
      ],
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(),
      isOccupied: (c) => occupied.has(`${c.x},${c.y}`),
    };
    const result = executeSummonAction(
      {
        archetype: "hunter",
        kind: "move",
        destination: { x: 3, y: 0 },
        spell: null,
        targetId: null,
        intent: "closes in",
        intentColor: "#a78bfa",
        retreating: false,
      },
      {
        id: "wolf",
        x: 1,
        y: 0,
        hp: 10,
        maxHp: 10,
        currentAp: 2,
        currentMp: 3,
        maxAp: 2,
        maxMp: 3,
        level: 1,
        pieceType: "pawn",
        summonAI: "hunter",
      } as any,
      dummyCtx(),
      {
        calcScaledDamage: (n) => n,
        occupancyCtx,
        worldGridSize: 4,
        mpCostPerTile: 2,
        meleeApCost: 1,
        getEnemyById: () => undefined,
        getAoEVictims: () => [],
      },
    );
    assert.equal(
      result.newPosition.x,
      1,
      "need 4 MP for a 2-tile Frozen stride",
    );
    assert.equal(result.currentMp, 3);
  });
});
