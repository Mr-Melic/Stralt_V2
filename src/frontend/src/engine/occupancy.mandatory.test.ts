import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type OccupancyContext,
  applyAttract,
  applyPushback,
  collectMandatoryProgressionCells,
  findNearestFreeCell,
  occKey,
  occupantsSealProgression,
  progressionReserved,
  progressionSearchRadius,
  relocateOffMandatoryCells,
  resolveControlledSummonMoveDest,
  resolveProgressionSafeOccupantCell,
  unsealProgressionOccupants,
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

describe("long unique bridges relocate off-path beyond radius 8", () => {
  it("seed-long-bridge-corpse: a far unique cell still slides into the alcove", () => {
    // 12-tile corridor; alcove at spawn. Manhattan from (10,0) to (0,1) is 11.
    const tiles = [
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["11,0"]);
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
    assert.equal(mandatory.has("10,0"), true);
    const [moved] = relocateOffMandatoryCells(
      [{ x: 10, y: 0 }],
      mandatory,
      ctx,
    );
    assert.equal(mandatory.has(occKey(moved.x, moved.y)), false);
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 0 }, [
        moved,
      ]),
      false,
    );
  });

  it("spawn fallback used to miss the alcove beyond radius 6 on a 16-wide unique corridor", () => {
    // 1-wide floor (0,0)→(15,0), portal at (15,0), alcove at (0,1).
    // Requested cell (14,0) is reserved. Manhattan to the alcove is 15.
    const tiles = [
      Array.from({ length: 16 }, () => true),
      Array.from({ length: 16 }, (_, x) => x === 0),
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["15,0"]);
    const occupied = new Set<string>(["0,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const reserved = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
    );
    const far = { x: 14, y: 0 };
    assert.equal(reserved.has("14,0"), true);
    assert.equal(
      progressionSearchRadius(ctx) >= 16 + 2,
      true,
      "grid radius must cover the far alcove, not a hardcoded 6/8",
    );
    assert.equal(
      findNearestFreeCell(far, ctx, 6, reserved),
      null,
      "radius 6 used to leave the wolf on the only portal path",
    );
    assert.equal(
      findNearestFreeCell(far, ctx, 8, reserved),
      null,
      "radius 8 also misses Manhattan 15",
    );
    assert.deepEqual(
      findNearestFreeCell(far, ctx, progressionSearchRadius(ctx), reserved),
      { x: 0, y: 1 },
    );

    // Omit progressStart so unseal cannot hide a reverted spawn radius.
    const spawned = spawnSummonUnit(
      far,
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
      { ...ctx, reserved },
    );
    assert.deepEqual(
      { x: spawned.summon.x, y: spawned.summon.y },
      { x: 0, y: 1 },
    );
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 0 }, [
        { x: spawned.summon.x, y: spawned.summon.y },
      ]),
      false,
    );
  });

  it("unseal slides a far unique occupant into the spawn alcove", () => {
    const tiles = [
      Array.from({ length: 16 }, () => true),
      Array.from({ length: 16 }, (_, x) => x === 0),
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["15,0"]);
    const occupied = new Set<string>(["0,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const [moved] = unsealProgressionOccupants(
      [{ x: 14, y: 0 }],
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
      ctx,
    );
    assert.notEqual(occKey(moved.x, moved.y), "14,0");
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 0 }, [
        moved,
      ]),
      false,
      "a leftover summon on the 16-wide unique bridge used to seal the portal",
    );
  });
});

describe("dual-path occupants cannot jointly seal the exit", () => {
  // Stem at (0,1) splits into two 1-wide corridors that rejoin at (4,0).
  // Unique-bridge reserve is empty; one summon per path still cuts every route.
  function dualCorridor(extraOccupied: string[] = []) {
    const tiles = [
      [true, true, true, true, true],
      [true, false, false, false, true],
      [true, true, true, true, true],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["4,0"]);
    const occupied = new Set<string>(["0,1", ...extraOccupied]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      progressStart: { x: 0, y: 1 },
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    return { tiles, voidTiles, portals, occupied, ctx };
  }

  it("seed-dual-corridor-occupants: unique bridges miss the joint cut", () => {
    const { tiles, voidTiles, portals } = dualCorridor();
    const unique = collectMandatoryProgressionCells(tiles, voidTiles, portals, {
      x: 0,
      y: 1,
    });
    assert.equal(unique.size, 0, "two routes ⇒ no unique bridge");
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        { x: 2, y: 0 },
        { x: 2, y: 2 },
      ]),
      true,
    );
  });

  it("resolveProgressionSafeOccupantCell slides off a unique corridor", () => {
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
      progressStart: { x: 0, y: 0 },
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const mandatory = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
    );
    ctx.reserved = mandatory;
    const landed = resolveProgressionSafeOccupantCell({ x: 2, y: 0 }, ctx);
    assert.equal(mandatory.has(occKey(landed.x, landed.y)), false);
  });

  it("resolveProgressionSafeOccupantCell unseals a dual-path cut", () => {
    const { tiles, voidTiles, portals, ctx } = dualCorridor(["2,2"]);
    ctx.reserved = collectMandatoryProgressionCells(tiles, voidTiles, portals, {
      x: 0,
      y: 1,
    });
    const landed = resolveProgressionSafeOccupantCell({ x: 2, y: 0 }, ctx);
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        landed,
        { x: 2, y: 2 },
      ]),
      false,
    );
    assert.notEqual(occKey(landed.x, landed.y), "2,0");
  });

  it("resolveProgressionSafeOccupantCell keeps an open-field landing", () => {
    const tiles = [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ];
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles: new Set(),
      portals: new Set(["2,2"]),
      reserved: new Set(),
      progressStart: { x: 0, y: 0 },
      isOccupied: (c) => c.x === 0 && c.y === 0,
    };
    const landed = resolveProgressionSafeOccupantCell({ x: 1, y: 1 }, ctx);
    assert.equal(occKey(landed.x, landed.y), "1,1");
  });

  it("unseals the mover so one player→exit route remains", () => {
    const { tiles, voidTiles, portals, ctx } = dualCorridor(["2,0", "2,2"]);
    const [moved] = unsealProgressionOccupants(
      [{ x: 2, y: 0 }],
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 1 },
      ctx,
    );
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        moved,
        { x: 2, y: 2 },
      ]),
      false,
    );
    assert.notEqual(occKey(moved.x, moved.y), "2,0");
  });

  it("seed-dual-corridor-long-path: unseals a summon on the longer route", () => {
    // Existing occupant sits on the shortest (0,1)→(4,0) corridor.
    // Spawning on the longer bottom corridor used to stay put because
    // unseal only slid movers that sat on the shortest path.
    const { tiles, voidTiles, portals, ctx } = dualCorridor(["2,0"]);
    const [moved] = unsealProgressionOccupants(
      [{ x: 2, y: 2 }],
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 1 },
      ctx,
    );
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        { x: 2, y: 0 },
        moved,
      ]),
      false,
    );
    assert.notEqual(occKey(moved.x, moved.y), "2,2");
  });

  it("seed-barrier-controlled-move: reserved must include barrier-aware unique bridges", () => {
    const { tiles, voidTiles, portals, ctx } = dualCorridor();
    ctx.barriers = new Set(["2,0"]);
    ctx.progressStart = { x: 0, y: 1 };
    ctx.reserved = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 1 },
      // Caller used to omit barriers — progressionReserved must still see them.
    );
    assert.equal(ctx.reserved.size, 0, "barrier-blind reserved misses the cut");
    const live = progressionReserved(ctx, { x: 0, y: 1 });
    assert.equal(live.has("2,2"), true);
    const dest = resolveControlledSummonMoveDest(
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      ctx,
    );
    assert.ok(dest);
    assert.notEqual(occKey(dest.x, dest.y), "2,2");
    assert.equal(
      occupantsSealProgression(
        tiles,
        voidTiles,
        portals,
        { x: 0, y: 1 },
        [dest],
        ctx.barriers,
      ),
      false,
    );
  });

  it("seed-barrier-joint-cut: a barrier on one corridor makes the other mandatory", () => {
    const { tiles, voidTiles, portals, ctx } = dualCorridor();
    ctx.barriers = new Set(["2,0"]);
    const unique = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 1 },
      ctx.barriers,
    );
    assert.equal(unique.has("2,2"), true, "remaining corridor is now unique");
    const spawned = spawnSummonUnit(
      { x: 2, y: 2 },
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
      { ...ctx, reserved: unique },
    );
    assert.equal(
      occupantsSealProgression(
        tiles,
        voidTiles,
        portals,
        { x: 0, y: 1 },
        [{ x: spawned.summon.x, y: spawned.summon.y }],
        ctx.barriers,
      ),
      false,
    );
    assert.notEqual(`${spawned.summon.x},${spawned.summon.y}`, "2,2");
  });

  it("player-controlled walk slides off a unique corridor", () => {
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
      progressStart: { x: 0, y: 0 },
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const mandatory = collectMandatoryProgressionCells(
      tiles,
      voidTiles,
      portals,
      { x: 0, y: 0 },
    );
    ctx.reserved = mandatory;
    const landed = resolveProgressionSafeOccupantCell({ x: 3, y: 0 }, ctx);
    assert.equal(mandatory.has(occKey(landed.x, landed.y)), false);
  });

  it("player-controlled walk unseals a dual-path joint cut", () => {
    const { tiles, voidTiles, portals, ctx } = dualCorridor(["2,2"]);
    ctx.reserved = collectMandatoryProgressionCells(tiles, voidTiles, portals, {
      x: 0,
      y: 1,
    });
    const landed = resolveProgressionSafeOccupantCell({ x: 2, y: 0 }, ctx);
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        landed,
        { x: 2, y: 2 },
      ]),
      false,
    );
    assert.notEqual(occKey(landed.x, landed.y), "2,0");
  });

  it("spawns off a dual-path cut when progressStart is set", () => {
    const { tiles, voidTiles, portals, ctx } = dualCorridor(["2,2"]);
    const spawned = spawnSummonUnit(
      { x: 2, y: 0 },
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
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        { x: spawned.summon.x, y: spawned.summon.y },
        { x: 2, y: 2 },
      ]),
      false,
    );
  });
});

describe("resolveControlledSummonMoveDest", () => {
  it("rejects stacking on the player or another combatant", () => {
    const { ctx } = corridorCtx();
    assert.equal(
      resolveControlledSummonMoveDest({ x: 1, y: 0 }, { x: 0, y: 0 }, ctx),
      null,
      "findPath used to walk the controlled summon onto the player tile",
    );
  });

  it("slides a player-controlled summon off the unique exit bridge", () => {
    const tiles = [
      [true, true, true, true, true, true],
      [true, true, false, false, false, false],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["5,0"]);
    const occupied = new Set<string>(["0,0", "1,1"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      progressStart: { x: 0, y: 0 },
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    ctx.reserved = collectMandatoryProgressionCells(tiles, voidTiles, portals, {
      x: 0,
      y: 0,
    });
    assert.equal(ctx.reserved.has("2,0"), true);
    const dest = resolveControlledSummonMoveDest(
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      ctx,
    );
    assert.ok(dest);
    assert.equal(ctx.reserved.has(occKey(dest.x, dest.y)), false);
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 0 }, [
        dest,
      ]),
      false,
    );
  });

  it("unseals a dual-path cut the same way AI executeSummonAction does", () => {
    // Occupied still lists the mover at `from` (1,0) — the live store has
    // not committed yet. Unseal must vacate that ghost or (1,0)+(2,2)
    // keep every route sealed and relocate is a no-op.
    const tiles = [
      [true, true, true, true, true],
      [true, false, false, false, true],
      [true, true, true, true, true],
    ];
    const voidTiles = new Set<string>();
    const portals = new Set(["4,0"]);
    const occupied = new Set<string>(["0,1", "2,2", "1,0"]);
    const ctx: OccupancyContext = {
      tiles,
      barriers: new Set(),
      voidTiles,
      portals,
      progressStart: { x: 0, y: 1 },
      isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
    };
    const dest = resolveControlledSummonMoveDest(
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      ctx,
    );
    assert.ok(dest);
    assert.equal(
      occupantsSealProgression(tiles, voidTiles, portals, { x: 0, y: 1 }, [
        dest,
        { x: 2, y: 2 },
      ]),
      false,
    );
    assert.notEqual(occKey(dest.x, dest.y), "2,0");
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
