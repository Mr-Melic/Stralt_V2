import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OccupancyContext } from "./occupancy.ts";
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
});
