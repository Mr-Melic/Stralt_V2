import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import { findBattleStartCell } from "./battleStartPlacement.ts";
import { type OccupancyContext, occKey } from "./occupancy.ts";

function chebyshev(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function openField(occupied: Set<string> = new Set()): OccupancyContext {
  const tiles: boolean[][] = Array.from({ length: WORLD_GRID_SIZE }, () =>
    Array.from({ length: WORLD_GRID_SIZE }, () => true),
  );
  return {
    tiles,
    barriers: new Set(),
    voidTiles: new Set(),
    portals: new Set(),
    isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
  };
}

function island(
  walkable: { x: number; y: number }[],
  occupied: Set<string> = new Set(),
  extras: {
    barriers?: Set<string>;
    voidTiles?: Set<string>;
    portals?: Set<string>;
  } = {},
): OccupancyContext {
  const tiles: boolean[][] = Array.from({ length: WORLD_GRID_SIZE }, () =>
    Array.from({ length: WORLD_GRID_SIZE }, () => false),
  );
  for (const c of walkable) tiles[c.y][c.x] = true;
  return {
    tiles,
    barriers: extras.barriers ?? new Set(),
    voidTiles: extras.voidTiles ?? new Set(),
    portals: extras.portals ?? new Set(),
    isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
  };
}

describe("findBattleStartCell", () => {
  it("picks a max-spacing cell; ties go to scan order when dFromOrigin matches", () => {
    // Avoid (0,0). Every cell's minD equals its Chebyshev from origin, so the
    // max ring is (15,0), (0,15), (15,15) — all minD 15 and dFromOrigin 15.
    // gy→gx scan pushes (15,0) first; the stable sort keeps it.
    const cell = findBattleStartCell(
      { x: 0, y: 0 },
      [{ x: 0, y: 0, minDist: 3 }],
      3,
      openField(),
    );
    assert.deepEqual(cell, { x: 15, y: 0 });
  });

  it("breaks equal max-spacing ties by nearest to origin, then scan order", () => {
    // Avoid origin (7,7). Max Chebyshev on a 16-grid is 8 (the x=15 and y=15
    // rings). Those cells all share minD === dFromOrigin, so the first cell
    // in gy→gx scan order on that ring wins: (15, 0).
    const cell = findBattleStartCell(
      { x: 7, y: 7 },
      [{ x: 7, y: 7, minDist: 3 }],
      3,
      openField(),
    );
    assert.deepEqual(cell, { x: 15, y: 0 });
  });

  it("honors every avoid minDist in one pass (player 3 + enemy 2)", () => {
    // Player at (8,8) wants >= 3; already-placed enemy at (2,2) wants >= 2.
    // Empty avoid list is not the WX contract — both constraints apply.
    const cell = findBattleStartCell(
      { x: 3, y: 3 },
      [
        { x: 8, y: 8, minDist: 3 },
        { x: 2, y: 2, minDist: 2 },
      ],
      2,
      openField(),
    );
    assert.ok(cell);
    assert.ok(chebyshev(cell, { x: 8, y: 8 }) >= 3);
    assert.ok(chebyshev(cell, { x: 2, y: 2 }) >= 2);
    assert.equal(cell.x >= 0 && cell.x < WORLD_GRID_SIZE, true);
    assert.equal(cell.y >= 0 && cell.y < WORLD_GRID_SIZE, true);
  });

  it("never lands on a wall, void, barrier, portal, or occupied cell", () => {
    const walkable = [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 8, y: 4 },
    ];
    const occupied = new Set(["4,4"]);
    const ctx = island(walkable, occupied, {
      barriers: new Set(["6,4"]),
      voidTiles: new Set(["7,4"]),
      portals: new Set(["8,4"]),
    });
    const cell = findBattleStartCell(
      { x: 4, y: 4 },
      [{ x: 4, y: 4, minDist: 2 }],
      2,
      ctx,
    );
    // Spacing cannot be met on this 1-wide strip. Fallback must still be
    // the nearest free walkable cell — (5,4) — never a blocked/occupied tile.
    assert.deepEqual(cell, { x: 5, y: 4 });
  });

  it("falls back to the nearest free cell when spacing cannot be met", () => {
    // 3-wide island; origin occupied; minDist 3 is impossible (island diameter 2).
    const walkable = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];
    const occupied = new Set(["2,1"]);
    const cell = findBattleStartCell(
      { x: 2, y: 1 },
      [{ x: 2, y: 1, minDist: 3 }],
      3,
      island(walkable, occupied),
    );
    // findNearestFreeCell ring-scan: origin occupied, radius-1 hits (1,1)
    // first (dx walks -r..r with +dy then -dy).
    assert.deepEqual(cell, { x: 1, y: 1 });
  });

  it("spreads toward the far corner instead of staying on a legal origin", () => {
    const cell = findBattleStartCell(
      { x: 5, y: 5 },
      [{ x: 12, y: 12, minDist: 3 }],
      3,
      openField(),
    );
    // (5,5) is Chebyshev 7 from (12,12), so it is a legal Pass-1 cell.
    // Among legal cells, max minD is the opposite corner (0,0) — not origin.
    assert.deepEqual(cell, { x: 0, y: 0 });
  });

  it("returns null when every walkable cell is occupied", () => {
    const walkable = [{ x: 0, y: 0 }];
    const occupied = new Set(["0,0"]);
    const cell = findBattleStartCell(
      { x: 0, y: 0 },
      [{ x: 0, y: 0, minDist: 3 }],
      2,
      island(walkable, occupied),
    );
    assert.equal(cell, null);
  });

  it("does not stack a second placement on a cell already in `placed`", () => {
    // Mirrors checkBattleTrigger: seed placed, place player, then an enemy.
    const placed = new Set(["8,8"]);
    const ctx = openField(placed);
    const player = findBattleStartCell(
      { x: 8, y: 8 },
      [{ x: 8, y: 8, minDist: 3 }],
      3,
      ctx,
    );
    assert.ok(player);
    placed.add(occKey(player.x, player.y));
    const enemy = findBattleStartCell(
      { x: 8, y: 8 },
      [
        { x: player.x, y: player.y, minDist: 3 },
        { x: 8, y: 8, minDist: 2 },
      ],
      2,
      ctx,
    );
    assert.ok(enemy);
    assert.notDeepEqual(enemy, player);
    assert.notDeepEqual(enemy, { x: 8, y: 8 });
    assert.ok(chebyshev(enemy, player) >= 3);
  });

  it("does not teleport max-spacing onto a leftover island", () => {
    const main: { x: number; y: number }[] = [];
    for (let x = 6; x <= 10; x++) {
      for (let y = 6; y <= 10; y++) main.push({ x, y });
    }
    const walkable = [...main, { x: 0, y: 0 }, { x: 1, y: 0 }];
    const occupied = new Set(["8,8"]);
    const cell = findBattleStartCell(
      { x: 8, y: 8 },
      [{ x: 8, y: 8, minDist: 3 }],
      3,
      island(walkable, occupied),
    );
    assert.ok(cell);
    assert.notEqual(occKey(cell.x, cell.y), "0,0");
    assert.notEqual(occKey(cell.x, cell.y), "1,0");
    assert.ok(cell.x >= 6 && cell.x <= 10 && cell.y >= 6 && cell.y <= 10);
  });

  it("does not teleport max-spacing across a portal cut-vertex", () => {
    // Main 5×5 room at (6,6)–(10,10), portal at (3,8), far island (0,8)–(1,8).
    // Overworld can walk through the portal; battle cannot. Max-spacing from
    // (8,8) used to land on (0,8) because floodOriginComponent treated the
    // portal tile as floor.
    const main: { x: number; y: number }[] = [];
    for (let x = 6; x <= 10; x++) {
      for (let y = 6; y <= 10; y++) main.push({ x, y });
    }
    const walkable = [
      ...main,
      { x: 4, y: 8 },
      { x: 5, y: 8 },
      { x: 3, y: 8 },
      { x: 2, y: 8 },
      { x: 1, y: 8 },
      { x: 0, y: 8 },
    ];
    const occupied = new Set(["8,8"]);
    const cell = findBattleStartCell(
      { x: 8, y: 8 },
      [{ x: 8, y: 8, minDist: 3 }],
      3,
      island(walkable, occupied, { portals: new Set(["3,8"]) }),
    );
    assert.ok(cell);
    assert.notEqual(occKey(cell.x, cell.y), "0,8");
    assert.notEqual(occKey(cell.x, cell.y), "1,8");
    assert.notEqual(occKey(cell.x, cell.y), "2,8");
    assert.ok(
      (cell.x >= 4 && cell.x <= 10 && cell.y >= 6 && cell.y <= 10) ||
        (cell.x === 5 && cell.y === 8) ||
        (cell.x === 4 && cell.y === 8),
    );
  });

  it("seed-long-corridor-fallback: pass 2 reaches beyond radius 2", () => {
    // 16-wide unique corridor; origin occupied at the far end. Pass 2 used
    // minDistFallback=2 and returned null, so WX's unfiltered ring-scan
    // could leave the unit stacked.
    const walkable: { x: number; y: number }[] = [];
    for (let x = 0; x < WORLD_GRID_SIZE; x++) walkable.push({ x, y: 0 });
    const occupied = new Set(["15,0"]);
    const cell = findBattleStartCell(
      { x: 15, y: 0 },
      [{ x: 15, y: 0, minDist: 3 }],
      2,
      island(walkable, occupied),
    );
    assert.ok(cell);
    assert.notEqual(occKey(cell.x, cell.y), "15,0");
    assert.equal(cell.y, 0);
    assert.equal(cell.x >= 0 && cell.x < WORLD_GRID_SIZE, true);
  });
});
