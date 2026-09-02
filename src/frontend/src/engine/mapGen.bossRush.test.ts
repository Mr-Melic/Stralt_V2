import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOSS_RUSH_PREFERRED_CELLS, placeBossRushSpawns } from "./mapGen.ts";

function flood(
  tiles: string[][],
  voidTiles: Set<string>,
  start: { x: number; y: number },
): Set<string> {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const seen = new Set<string>();
  const walkable = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < w &&
    y < h &&
    tiles[y][x] !== "wall" &&
    !voidTiles.has(`${x},${y}`);
  if (!walkable(start.x, start.y)) return seen;
  const q = [start];
  seen.add(`${start.x},${start.y}`);
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || !walkable(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

describe("placeBossRushSpawns", () => {
  it("relocates or carves so a wall at (4,5) cannot seal the portal", () => {
    // WORLD_GRID_SIZE=16, center 8; Phase 4 only floors x/y 5–11.
    // (4,5) is the first hardcoded Boss Rush cell and stays a CA wall.
    const W = "wall";
    const F = "floor";
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
    ];
    const spawn = { x: 1, y: 1 };
    const portal = { x: 2, y: 1 };
    const preferred = [...BOSS_RUSH_PREFERRED_CELLS].map((c) => ({
      x: Math.min(c.x, 7),
      y: Math.min(c.y, 7),
    }));
    // Force the first preferred cell onto an isolated wall (4,5 → clamp 4,5
    // is out of this 8×8 fixture; use the real (4,5) wall in-bounds).
    preferred[0] = { x: 4, y: 5 };
    tiles[5][4] = W;
    assert.equal(
      flood(tiles, new Set(), spawn).has("4,5"),
      false,
      "fixture must start unreachable",
    );

    const placed = placeBossRushSpawns(
      tiles,
      new Set(),
      preferred,
      spawn,
      portal,
      8,
      8,
    );
    const reachable = flood(placed.tiles, new Set(), spawn);
    const first = placed.spawns[0];
    assert.equal(
      reachable.has(`${first.x},${first.y}`),
      true,
      "Boss Rush hostiles must be walk-reachable or the progression portal stays sealed",
    );
    assert.notEqual(placed.tiles[first.y][first.x], "wall");
  });

  it("relocates a void-pocket boss onto the walkable graph", () => {
    const F = "floor";
    const W = "wall";
    const tiles = [
      [F, F, F, W, W],
      [F, F, F, W, W],
      [F, F, F, W, W],
      [W, W, W, W, W],
      [W, W, W, W, F],
    ];
    const voidTiles = new Set(["4,4"]);
    const placed = placeBossRushSpawns(
      tiles,
      voidTiles,
      [{ x: 4, y: 4 }],
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      5,
      5,
    );
    const reachable = flood(placed.tiles, voidTiles, { x: 0, y: 0 });
    const boss = placed.spawns[0];
    assert.equal(reachable.has(`${boss.x},${boss.y}`), true);
    assert.equal(voidTiles.has(`${boss.x},${boss.y}`), false);
  });

  it("is a no-op when the Boss Rush room has no bosses", () => {
    const tiles = [
      ["floor", "floor"],
      ["floor", "wall"],
    ];
    const placed = placeBossRushSpawns(
      tiles,
      undefined,
      [],
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      2,
      2,
    );
    assert.equal(placed.spawns.length, 0);
    assert.equal(placed.tiles[1][1], "wall");
  });
});
