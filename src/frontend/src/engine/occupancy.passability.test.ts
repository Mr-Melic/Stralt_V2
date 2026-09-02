import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import {
  type OccupancyContext,
  applyAttract,
  applyPushback,
  findNearestFreeCell,
  isCellFree,
  occKey,
} from "./occupancy.ts";

function walkableTiles(): boolean[][] {
  return Array.from({ length: WORLD_GRID_SIZE }, () =>
    Array.from({ length: WORLD_GRID_SIZE }, () => true),
  );
}

function ctx(
  overrides: Partial<OccupancyContext> & { occupied?: Set<string> } = {},
): OccupancyContext {
  const occupied = overrides.occupied ?? new Set<string>();
  return {
    tiles: overrides.tiles ?? walkableTiles(),
    barriers: overrides.barriers ?? new Set(),
    voidTiles: overrides.voidTiles ?? new Set(),
    portals: overrides.portals ?? new Set(),
    isOccupied:
      overrides.isOccupied ?? ((cell) => occupied.has(occKey(cell.x, cell.y))),
  };
}

describe("isCellFree", () => {
  it("rejects out-of-bounds, wall, barrier, portal, void, and occupied tiles", () => {
    const tiles = walkableTiles();
    tiles[4][3] = false;
    const occupancy = ctx({
      tiles,
      barriers: new Set(["5,5"]),
      portals: new Set(["6,6"]),
      voidTiles: new Set(["7,7"]),
      occupied: new Set(["8,8"]),
    });

    assert.equal(isCellFree({ x: 2, y: 2 }, occupancy), true);
    assert.equal(isCellFree({ x: -1, y: 0 }, occupancy), false);
    assert.equal(isCellFree({ x: WORLD_GRID_SIZE, y: 0 }, occupancy), false);
    assert.equal(isCellFree({ x: 3, y: 4 }, occupancy), false);
    assert.equal(isCellFree({ x: 5, y: 5 }, occupancy), false);
    assert.equal(isCellFree({ x: 6, y: 6 }, occupancy), false);
    assert.equal(isCellFree({ x: 7, y: 7 }, occupancy), false);
    assert.equal(isCellFree({ x: 8, y: 8 }, occupancy), false);
  });
});

describe("findNearestFreeCell", () => {
  it("returns the origin when it is already free", () => {
    assert.deepEqual(findNearestFreeCell({ x: 4, y: 4 }, ctx(), 3), {
      x: 4,
      y: 4,
    });
  });

  it("starts the first ring at dx = -r (left of origin), not the +y neighbor", () => {
    const origin = { x: 5, y: 5 };
    const occupancy = ctx({ occupied: new Set(["5,5"]) });
    assert.deepEqual(findNearestFreeCell(origin, occupancy, 2), {
      x: 4,
      y: 5,
    });
  });

  it("skips the left cell when it is blocked and keeps the ring order", () => {
    const origin = { x: 5, y: 5 };
    const occupancy = ctx({ occupied: new Set(["5,5", "4,5"]) });
    // After dx=-1 (left), the next r=1 visit is dx=0 with +dy → (5,6).
    assert.deepEqual(findNearestFreeCell(origin, occupancy, 2), {
      x: 5,
      y: 6,
    });
  });

  it("returns null when every cell in the radius is blocked", () => {
    const origin = { x: 5, y: 5 };
    const occupied = new Set<string>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        occupied.add(occKey(origin.x + dx, origin.y + dy));
      }
    }
    assert.equal(findNearestFreeCell(origin, ctx({ occupied }), 1), null);
  });
});

describe("applyAttract / applyPushback", () => {
  it("stops attraction one tile short so two combatants never stack", () => {
    const occupancy = ctx();
    assert.deepEqual(
      applyAttract({ x: 8, y: 4 }, { x: 4, y: 4 }, 5, occupancy),
      { x: 5, y: 4 },
    );
    assert.deepEqual(
      applyAttract({ x: 5, y: 4 }, { x: 4, y: 4 }, 3, occupancy),
      { x: 5, y: 4 },
    );
    assert.deepEqual(
      applyAttract({ x: 4, y: 4 }, { x: 4, y: 4 }, 3, occupancy),
      { x: 4, y: 4 },
    );
  });

  it("stops pushback before a blocked tile and stays put when direction is undefined", () => {
    const wall = ctx({ barriers: new Set(["7,4"]) });
    assert.deepEqual(applyPushback({ x: 5, y: 4 }, { x: 4, y: 4 }, 3, wall), {
      x: 6,
      y: 4,
    });
    assert.deepEqual(applyPushback({ x: 4, y: 4 }, { x: 4, y: 4 }, 3, ctx()), {
      x: 4,
      y: 4,
    });
  });
});

describe("isCellFree", () => {
  it("rejects out-of-bounds, walls, barriers, portals, voids, and occupants", () => {
    const tiles = openGrid();
    tiles[4][4] = false;
    const blocked = ctx({
      tiles,
      barriers: new Set([occKey(5, 5)]),
      portals: new Set([occKey(6, 6)]),
      voidTiles: new Set([occKey(7, 7)]),
      isOccupied: (cell) => cell.x === 8 && cell.y === 8,
    });
    assert.equal(isCellFree({ x: 3, y: 3 }, blocked), true);
    assert.equal(isCellFree({ x: -1, y: 3 }, blocked), false);
    assert.equal(isCellFree({ x: WORLD_GRID_SIZE, y: 3 }, blocked), false);
    assert.equal(isCellFree({ x: 4, y: 4 }, blocked), false);
    assert.equal(isCellFree({ x: 5, y: 5 }, blocked), false);
    assert.equal(isCellFree({ x: 6, y: 6 }, blocked), false);
    assert.equal(isCellFree({ x: 7, y: 7 }, blocked), false);
    assert.equal(isCellFree({ x: 8, y: 8 }, blocked), false);
  });
});

describe("findNearestFreeCell", () => {
  it("visits the left neighbor first, then the +y cell, on ring 1", () => {
    const origin = { x: 8, y: 8 };
    const occupied = new Set([occKey(8, 8), occKey(7, 8)]);
    const found = findNearestFreeCell(
      origin,
      ctx({
        isOccupied: (cell) => occupied.has(occKey(cell.x, cell.y)),
      }),
      2,
    );
    assert.deepEqual(found, { x: 8, y: 9 });
  });
});

describe("applyPushback / applyAttract", () => {
  it("stops pushback before a blocked tile and attract one tile short of the magnet", () => {
    const wall = ctx({
      barriers: new Set([occKey(10, 5)]),
    });
    assert.deepEqual(applyPushback({ x: 8, y: 5 }, { x: 6, y: 5 }, 4, wall), {
      x: 9,
      y: 5,
    });

    const open = ctx();
    assert.deepEqual(applyAttract({ x: 4, y: 4 }, { x: 8, y: 4 }, 6, open), {
      x: 7,
      y: 4,
    });
    assert.deepEqual(applyAttract({ x: 7, y: 4 }, { x: 8, y: 4 }, 3, open), {
      x: 7,
      y: 4,
    });
  });
});
