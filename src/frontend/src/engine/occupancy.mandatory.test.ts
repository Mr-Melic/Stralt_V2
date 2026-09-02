import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type OccupancyContext,
  applyAttract,
  applyPushback,
  collectMandatoryProgressionCells,
  findNearestFreeCell,
  occKey,
  relocateOffMandatoryCells,
} from "./occupancy.ts";
import { spawnSummonUnit } from "./summonSpawn.ts";

function corridorCtx(): {
  tiles: boolean[][];
  ctx: OccupancyContext;
  mandatory: Set<string>;
} {
  // 1-wide floor corridor (0,0)→(5,0); portal at (5,0).
  const tiles = [
    [true, true, true, true, true, true],
    [false, false, false, false, false, false],
  ];
  const voidTiles = new Set<string>();
  const portals = new Set(["5,0"]);
  const occupied = new Set<string>(["0,0"]);
  const ctx: OccupancyContext = {
    tiles,
    barriers: new Set(),
    voidTiles,
    portals,
    isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
  };
  const mandatory = collectMandatoryProgressionCells(
    tiles,
    voidTiles,
    portals,
    { x: 0, y: 0 },
  );
  return { tiles, ctx, mandatory };
}

describe("collectMandatoryProgressionCells", () => {
  it("marks the unique corridor as mandatory", () => {
    const { mandatory } = corridorCtx();
    assert.equal(mandatory.has("1,0"), true);
    assert.equal(mandatory.has("2,0"), true);
    assert.equal(mandatory.has("4,0"), true);
    assert.equal(mandatory.has("0,0"), false);
    assert.equal(mandatory.has("5,0"), false);
  });

  it("is empty on an open field so summons are not over-constrained", () => {
    const tiles = [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ];
    const mandatory = collectMandatoryProgressionCells(
      tiles,
      new Set(),
      new Set(["2,2"]),
      { x: 0, y: 0 },
    );
    assert.equal(mandatory.size, 0);
  });
});

describe("relocateOffMandatoryCells", () => {
  it("moves a summon/corpse off the only path when another free cell exists", () => {
    // executeSummonAction slides post-move occupants with this helper.
    const tiles = [
      [true, true, true, true, true, true],
      [true, true, false, false, false, false],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["5,0"]);
    const occupied = new Set<string>(["0,0", "2,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const mandatory = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
    );
    assert.equal(mandatory.has("2,0"), true);
    const [moved] = relocateOffMandatoryCells([{ x: 2, y: 0 }], mandatory, ctx);
    assert.equal(mandatory.has(occKey(moved.x, moved.y)), false);
    assert.ok(tiles[moved.y][moved.x]);
  });

  it("slides a pushback off the only exit bridge", () => {
    const tiles = [
      [true, true, true, true, true, true],
      [true, true, false, false, false, false],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["5,0"]);
    const occupied = new Set<string>(["0,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const mandatory = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
    );
    ctx.reserved = mandatory;
    assert.equal(mandatory.has("2,0"), true);
    const landed = applyPushback({ x: 1, y: 0 }, { x: 0, y: 0 }, 1, ctx);
    assert.equal(mandatory.has(occKey(landed.x, landed.y)), false);
  });

  it("slides an attraction off the only exit bridge", () => {
    const tiles = [
      [true, true, true, true, true, true],
      [true, true, false, false, false, false],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["5,0"]);
    const occupied = new Set<string>(["0,0", "5,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const mandatory = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
    );
    ctx.reserved = mandatory;
    const landed = applyAttract({ x: 3, y: 0 }, { x: 0, y: 0 }, 2, ctx);
    assert.equal(mandatory.has(occKey(landed.x, landed.y)), false);
  });
});

describe("summon spawn avoids reserved bridges", () => {
  it("falls back off a reserved corridor cell", () => {
    const tiles = [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ];
    const reserved = new Set(["1,0"]);
    const occupied = new Set<string>(["0,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(["2,0"]),
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
      reserved,
    };
    const spawned = spawnSummonUnit(
      { x: 1, y: 0 },
      {
        id: "summon-wolf",
        name: "Summon Wolf",
        summonUnitDef: { pieceType: "pawn", level: 1 },
        summonAI: "hunter",
      },
      "player",
      1,
      () => {},
      () => ({ init: 4 }),
      0,
      ctx,
    );
    assert.notEqual(`${spawned.summon.x},${spawned.summon.y}`, "1,0");
    assert.equal(
      reserved.has(`${spawned.summon.x},${spawned.summon.y}`),
      false,
    );
  });

  it("findNearestFreeCell honors avoid keys", () => {
    const ctx: OccupancyContext = {
      tiles: [
        [true, true, true],
        [true, true, true],
      ],
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(),
      isOccupied: () => false,
    };
    const found = findNearestFreeCell({ x: 0, y: 0 }, ctx, 2, new Set(["0,0"]));
    assert.ok(found);
    assert.notEqual(occKey(found.x, found.y), "0,0");
  });
});
